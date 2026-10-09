import crypto from "node:crypto";
import { createAdminClient } from "../supabase/admin.ts";
import type { DeltaSystemEvent, SystemEventType, EventImportance, DeltaChangeRecord, PushNotificationPreferences } from "./types.ts";
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
  audience_type?: "TEAM" | "USER" | "PLAYER" | "ADMIN";
  target_user_id?: string | null;
  target_player_id?: string | null;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
}): Promise<{ event: DeltaSystemEvent; created: boolean }> {
  const admin = createAdminClient();
  const source = eventData.source || "DELTA_SYSTEM";
  const importance = eventData.importance || "NORMAL";

  // Determine audience type & targets
  let audienceType: "TEAM" | "USER" | "PLAYER" | "ADMIN" = eventData.audience_type || "TEAM";
  let targetUserId = eventData.target_user_id || null;
  let targetPlayerId = eventData.target_player_id || null;

  if (!eventData.audience_type) {
    if (eventData.type === "SYNC_ERROR") {
      audienceType = "ADMIN";
      targetUserId = null;
      targetPlayerId = null;
    } else if (eventData.type === "PLAYER_ACHIEVEMENT" || eventData.type === "PLAYER_CARD_UNLOCKED") {
      audienceType = "PLAYER";
      targetPlayerId = targetPlayerId || eventData.related_entity_id || null;
    } else if (targetUserId) {
      audienceType = "USER";
    }
  }
  
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
    audience_type: audienceType,
    target_user_id: targetUserId,
    target_player_id: targetPlayerId,
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
  const { dispatchPushBatch } = await import("@/lib/push/dispatcher");
  const res = await dispatchPushBatch([event]);
  return { sent: res.sent, failed: res.failed };
}

