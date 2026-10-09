import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeltaSystemEvent, SystemEventType, EventImportance, DeltaChangeRecord, PushNotificationPreferences } from "./types";
import webpush from "web-push";

/**
 * Generates a deterministic deduplication key for an event
 */
export function generateEventDedupeKey(type: SystemEventType, entityId: string, discriminator?: string): string {
  const raw = `${type}:${entityId}:${discriminator || ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Emits a central system event, stores it in `delta_system_events`, and optionally dispatches push notifications.
 */
export async function emitSystemEvent(eventData: {
  id?: string;
  type: SystemEventType;
  title: string;
  message: string;
  source?: string;
  importance?: EventImportance;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
}): Promise<{ event: DeltaSystemEvent; created: boolean }> {
  const admin = createAdminClient();
  const source = eventData.source || "DELTA_SYSTEM";
  const importance = eventData.importance || "NORMAL";
  
  // Use provided ID or generate a deterministic dedupe ID
  const eventId = eventData.id || generateEventDedupeKey(
    eventData.type,
    eventData.related_entity_id || "global",
    eventData.title + (eventData.metadata?.version || "")
  );

  const eventPayload: DeltaSystemEvent = {
    id: eventId,
    type: eventData.type,
    title: eventData.title,
    message: eventData.message,
    source,
    importance,
    related_entity_type: eventData.related_entity_type,
    related_entity_id: eventData.related_entity_id,
    metadata: eventData.metadata || {},
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await admin
      .from("delta_system_events")
      .upsert(eventPayload, { onConflict: "id" });

    if (error) {
      console.error("Error inserting system event:", error);
    }

    // Trigger push notification if importance is IMPORTANT or URGENT
    if (importance === "IMPORTANT" || importance === "URGENT") {
      void dispatchPushForEvent(eventPayload);
    }

    return { event: eventPayload, created: !error };
  } catch (err) {
    console.error("Failed to emit system event:", err);
    return { event: eventPayload, created: false };
  }
}

/**
 * Records a state change to the change history table.
 */
export async function recordChangeHistory(record: DeltaChangeRecord): Promise<void> {
  const admin = createAdminClient();
  try {
    await admin.from("delta_change_history").insert({
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      field_name: record.field_name,
      old_value: record.old_value,
      new_value: record.new_value,
      source: record.source || "DELTA_SYSTEM",
      metadata: record.metadata || {},
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error recording change history:", err);
  }
}

/**
 * Dispatches web push notifications to eligible subscribers based on category preferences.
 */
export async function dispatchPushForEvent(event: DeltaSystemEvent): Promise<{ sent: number; failed: number }> {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    return { sent: 0, failed: 0 };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    return { sent: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,preferences,enabled");

  if (error || !subscriptions) return { sent: 0, failed: 0 };

  // Determine deep link URL
  let deepLink = "/dashboard?view=news";
  if (event.type.startsWith("MATCH")) {
    deepLink = "/dashboard?view=matches";
  } else if (event.type.startsWith("TRAINING")) {
    deepLink = "/dashboard?view=training";
  } else if (event.type === "PLAYER_CARD_UNLOCKED") {
    deepLink = "/dashboard?view=collection";
  } else if (event.type === "PLAYER_ACHIEVEMENT") {
    deepLink = "/dashboard?view=achievements";
  } else if (event.type === "GALLERY_CREATED" || event.type === "VIDEO_PUBLISHED") {
    deepLink = "/dashboard?view=gallery";
  }

  const pushPayload = JSON.stringify({
    title: event.title,
    body: event.message,
    url: deepLink,
    tag: `delta-${event.id}`,
    importance: event.importance
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    if (sub.enabled === false) continue;

    // Check user preference category
    const prefs: PushNotificationPreferences = sub.preferences || {};
    if (event.type.startsWith("MATCH") && prefs.matches === false) continue;
    if (event.type === "MATCH_UPDATED" && prefs.schedule_changes === false) continue;
    if (event.type.startsWith("TRAINING") && prefs.trainings === false) continue;
    if (event.type === "LINEUP_PUBLISHED" && prefs.lineup === false) continue;
    if (event.type === "PLAYER_ACHIEVEMENT" && prefs.achievements === false) continue;
    if (event.type === "CLUB_NEWS" && prefs.club_news === false) continue;

    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, pushPayload);
      sent++;
    } catch (err: any) {
      failed++;
      const statusCode = Number(err?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return { sent, failed };
}
