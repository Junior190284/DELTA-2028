import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeltaSystemEvent } from "@/lib/events/types";
import {
  isEventEligibleForPush,
  getDeepLinkForEvent,
  type PushSubscriptionRecord,
  type PushEligibilityContext
} from "@/lib/events/push-eligibility";

export interface DispatchResult {
  sent: number;
  failed: number;
  skipped: number;
  deliveries: Array<{
    subscriptionId: string;
    status: "SENT" | "FAILED" | "GONE" | "SKIPPED";
    reason?: string;
  }>;
}

/**
 * Reads server configuration for push notifications.
 */
export function getPushServerConfig(): PushEligibilityContext & {
  hasVapid: boolean;
  subject?: string;
  publicKey?: string;
  privateKey?: string;
} {
  const pushEnabled = process.env.PUSH_ENABLED === "true";
  const activationCutoffIso = process.env.PUSH_ACTIVATION_CUTOFF_ISO || "2026-10-09T18:00:00.000Z";

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const hasVapid = Boolean(subject && publicKey && privateKey);

  return {
    pushEnabled,
    activationCutoffIso,
    hasVapid,
    subject,
    publicKey,
    privateKey
  };
}

/**
 * Dispatches push notifications for a batch of system events with storm protection / digest support.
 */
export async function dispatchPushBatch(
  events: DeltaSystemEvent[],
  options?: { adminClient?: any }
): Promise<DispatchResult> {
  const config = getPushServerConfig();
  const result: DispatchResult = { sent: 0, failed: 0, skipped: 0, deliveries: [] };

  if (events.length === 0) return result;

  // 1. Feature Flag Guard
  if (!config.pushEnabled || !config.hasVapid) {
    return {
      sent: 0,
      failed: 0,
      skipped: events.length,
      deliveries: events.map(() => ({
        subscriptionId: "all",
        status: "SKIPPED",
        reason: !config.pushEnabled ? "PUSH_FEATURE_DISABLED" : "VAPID_CONFIG_MISSING"
      }))
    };
  }

  try {
    webpush.setVapidDetails(config.subject!, config.publicKey!, config.privateKey!);
  } catch (err: any) {
    return {
      sent: 0,
      failed: events.length,
      skipped: 0,
      deliveries: [{ subscriptionId: "all", status: "FAILED", reason: `VAPID_INIT_ERROR: ${err?.message}` }]
    };
  }

  const admin = options?.adminClient || createAdminClient();

  // Load all active subscriptions
  const { data: subscriptions, error: subErr } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, enabled, preferences, last_used_at, created_at")
    .eq("enabled", true);

  if (subErr || !subscriptions || subscriptions.length === 0) {
    return result;
  }

  // Load user profiles for audience checks
  const userIds = [...new Set(subscriptions.map((s: any) => s.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, player_id")
    .in("id", userIds);

  const profileMap = new Map<string, { id: string; role?: string; player_id?: string | null }>(
    (profiles || []).map((p: any) => [p.id, p])
  );

  // Check for multi-item DELTA Sync news storm (batching)
  const clubNewsEvents = events.filter(e => e.type === "CLUB_NEWS");
  const isNewsStorm = clubNewsEvents.length >= 2;

  for (const sub of subscriptions as PushSubscriptionRecord[]) {
    const profile = profileMap.get(sub.user_id);

    if (isNewsStorm) {
      // BATCHING / STORM PROTECTION: Send 1 single digest push for multiple news
      const sampleEvent = clubNewsEvents[0];
      const eligibility = isEventEligibleForPush(sampleEvent, sub, profile, config);

      if (!eligibility.eligible) {
        result.skipped++;
        result.deliveries.push({
          subscriptionId: sub.id,
          status: "SKIPPED",
          reason: eligibility.reason
        });
        continue;
      }

      const digestPayload = JSON.stringify({
        title: "K.S. Delta Warszawa",
        body: `Opublikowano ${clubNewsEvents.length} nowe komunikaty na stronie klubu.`,
        url: "/dashboard?view=club",
        tag: "delta-news-digest",
        category: "club_news",
        eventId: sampleEvent.id
      });

      const outcome = await sendSinglePush(sub, digestPayload, sampleEvent.id, admin);
      if (outcome.status === "SENT") result.sent++;
      else if (outcome.status === "FAILED") result.failed++;
      else if (outcome.status === "GONE") result.failed++;
      result.deliveries.push(outcome);

    } else {
      // Individual event dispatch
      for (const event of events) {
        const eligibility = isEventEligibleForPush(event, sub, profile, config);

        if (!eligibility.eligible) {
          result.skipped++;
          result.deliveries.push({
            subscriptionId: sub.id,
            status: "SKIPPED",
            reason: eligibility.reason
          });
          continue;
        }

        const deepLink = getDeepLinkForEvent(event);
        const payload = JSON.stringify({
          title: event.title,
          body: event.message,
          url: deepLink,
          tag: `delta-${event.id}`,
          category: event.type,
          eventId: event.id,
          importance: event.importance
        });

        const outcome = await sendSinglePush(sub, payload, event.id, admin);
        if (outcome.status === "SENT") result.sent++;
        else if (outcome.status === "FAILED") result.failed++;
        else if (outcome.status === "GONE") result.failed++;
        result.deliveries.push(outcome);
      }
    }
  }

  return result;
}

/**
 * Sends a single WebPush message with exactly-once ledger reservation and dead endpoint handling.
 */
async function sendSinglePush(
  subscription: PushSubscriptionRecord,
  payload: string,
  eventId: string,
  admin: any
): Promise<{ subscriptionId: string; status: "SENT" | "FAILED" | "GONE" | "SKIPPED"; reason?: string }> {
  // Check if push_deliveries ledger is active in DB
  let ledgerActive = false;
  try {
    const { data: claim, error: claimErr } = await admin
      .from("push_deliveries")
      .insert({
        event_id: eventId,
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        status: "PENDING",
        attempt_count: 1,
        attempted_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (!claimErr && claim) {
      ledgerActive = true;
    } else if (claimErr && claimErr.code === "23505") {
      // UNIQUE constraint violation: already dispatched or claimed
      return { subscriptionId: subscription.id, status: "SKIPPED", reason: "ALREADY_DELIVERED" };
    }
  } catch {
    // Ledger table not yet applied in production (graceful fallback)
  }

  try {
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth }
    }, payload, {
      TTL: 60 * 60 // 1 hour
    });

    if (ledgerActive) {
      await admin
        .from("push_deliveries")
        .update({
          status: "SENT",
          delivered_at: new Date().toISOString(),
          provider_status: 201
        })
        .match({ event_id: eventId, subscription_id: subscription.id });
    }

    return { subscriptionId: subscription.id, status: "SENT" };
  } catch (err: any) {
    const statusCode = Number(err?.statusCode || 0);

    if (statusCode === 404 || statusCode === 410) {
      // Dead endpoint: disable subscription to prevent future attempts
      await admin
        .from("push_subscriptions")
        .update({ enabled: false, last_used_at: new Date().toISOString() })
        .eq("id", subscription.id);

      if (ledgerActive) {
        await admin
          .from("push_deliveries")
          .update({
            status: "GONE",
            error_code: String(statusCode),
            provider_status: statusCode
          })
          .match({ event_id: eventId, subscription_id: subscription.id });
      }

      return { subscriptionId: subscription.id, status: "GONE", reason: `DEAD_ENDPOINT_${statusCode}` };
    }

    if (ledgerActive) {
      await admin
        .from("push_deliveries")
        .update({
          status: "FAILED",
          error_code: String(statusCode || "NETWORK_ERROR"),
          provider_status: statusCode || null
        })
        .match({ event_id: eventId, subscription_id: subscription.id });
    }

    return { subscriptionId: subscription.id, status: "FAILED", reason: `SEND_ERROR_${statusCode || "NET"}` };
  }
}
