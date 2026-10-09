import type { DeltaSystemEvent, PushNotificationPreferences, SystemEventType, EventImportance, EventAudienceType } from "./types";

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
  preferences?: Partial<PushNotificationPreferences>;
  last_used_at?: string;
  created_at?: string;
}

export interface PushEligibilityContext {
  pushEnabled: boolean; // Server feature flag
  activationCutoffIso: string; // Cutoff timestamp e.g. "2026-10-09T16:00:00Z"
  nowIso?: string;
  maxAgeMinutes?: Record<string, number>;
}

export const DEFAULT_MAX_AGE_MINUTES: Record<string, number> = {
  CLUB_NEWS: 120, // 2 hours
  MATCH_UPDATED: 360, // 6 hours
  MATCH_CREATED: 720, // 12 hours
  MATCH_CANCELLED: 360, // 6 hours
  MATCH_RESULT_UPDATED: 180, // 3 hours
  TRAINING_CREATED: 720, // 12 hours
  TRAINING_UPDATED: 360, // 6 hours
  TRAINING_CANCELLED: 360, // 6 hours
  PLAYER_ACHIEVEMENT: 60, // 1 hour
  PLAYER_CARD_UNLOCKED: 60, // 1 hour
  GALLERY_CREATED: 1440, // 24 hours
  GALLERY_UPDATED: 1440, // 24 hours
  VIDEO_PUBLISHED: 1440, // 24 hours
  DEFAULT: 180 // 3 hours default
};

export interface PushEligibilityResult {
  eligible: boolean;
  reason: string;
}

/**
 * Evaluates whether a given system event is eligible to be dispatched as a Web Push notification
 * to a specific user subscription.
 */
export function isEventEligibleForPush(
  event: DeltaSystemEvent,
  subscription: PushSubscriptionRecord,
  userProfile?: { id: string; role?: string; player_id?: string | null },
  context?: Partial<PushEligibilityContext>
): PushEligibilityResult {
  const pushEnabled = context?.pushEnabled ?? false;
  if (!pushEnabled) {
    return { eligible: false, reason: "PUSH_FEATURE_DISABLED" };
  }

  if (subscription.enabled === false) {
    return { eligible: false, reason: "SUBSCRIPTION_DISABLED" };
  }

  // Backfill protection: event must be created AFTER activation cutoff
  if (context?.activationCutoffIso) {
    const eventTime = new Date(event.created_at).getTime();
    const cutoffTime = new Date(context.activationCutoffIso).getTime();
    if (isNaN(eventTime) || isNaN(cutoffTime) || eventTime <= cutoffTime) {
      return { eligible: false, reason: "EVENT_PREDATES_ACTIVATION_CUTOFF" };
    }
  }

  // Stale check: event age
  const now = context?.nowIso ? new Date(context.nowIso).getTime() : Date.now();
  const eventTime = new Date(event.created_at).getTime();
  const maxAgeMins = context?.maxAgeMinutes?.[event.type] ?? DEFAULT_MAX_AGE_MINUTES[event.type] ?? DEFAULT_MAX_AGE_MINUTES.DEFAULT;
  if (!isNaN(eventTime) && now - eventTime > maxAgeMins * 60 * 1000) {
    return { eligible: false, reason: "EVENT_IS_STALE" };
  }

  // Importance check: LOW/INFO events never send push
  const importance = (event.importance || "NORMAL").toUpperCase();
  if (importance === "LOW" || importance === "INFO") {
    return { eligible: false, reason: "IMPORTANCE_TOO_LOW_FOR_PUSH" };
  }

  // Audience check
  const audience = event.audience_type || "TEAM";
  const userId = subscription.user_id;

  if (audience === "ADMIN") {
    if (userProfile?.role !== "admin" && userProfile?.role !== "coach") {
      return { eligible: false, reason: "AUDIENCE_MISMATCH_ADMIN_REQUIRED" };
    }
  } else if (audience === "USER") {
    if (event.target_user_id && event.target_user_id !== userId) {
      return { eligible: false, reason: "AUDIENCE_MISMATCH_USER_ID" };
    }
  } else if (audience === "PLAYER") {
    if (event.target_player_id && userProfile?.player_id && event.target_player_id !== userProfile.player_id) {
      return { eligible: false, reason: "AUDIENCE_MISMATCH_PLAYER_ID" };
    }
  }

  // Category preferences check
  const prefs = subscription.preferences || {};
  if (event.type.startsWith("MATCH")) {
    if (prefs.matches === false) return { eligible: false, reason: "PREFERENCE_MATCHES_DISABLED" };
    if (event.type === "MATCH_UPDATED" && prefs.schedule_changes === false) {
      return { eligible: false, reason: "PREFERENCE_SCHEDULE_CHANGES_DISABLED" };
    }
  } else if (event.type.startsWith("TRAINING")) {
    if (prefs.trainings === false) return { eligible: false, reason: "PREFERENCE_TRAININGS_DISABLED" };
    if (event.type === "TRAINING_UPDATED" && prefs.schedule_changes === false) {
      return { eligible: false, reason: "PREFERENCE_SCHEDULE_CHANGES_DISABLED" };
    }
  } else if (event.type === "LINEUP_PUBLISHED") {
    if (prefs.lineup === false) return { eligible: false, reason: "PREFERENCE_LINEUP_DISABLED" };
  } else if (event.type === "PLAYER_ACHIEVEMENT") {
    if (prefs.achievements === false) return { eligible: false, reason: "PREFERENCE_ACHIEVEMENTS_DISABLED" };
  } else if (event.type === "CLUB_NEWS") {
    if (prefs.club_news === false) return { eligible: false, reason: "PREFERENCE_CLUB_NEWS_DISABLED" };
  } else if (event.type === "GALLERY_CREATED" || event.type === "GALLERY_UPDATED" || event.type === "VIDEO_PUBLISHED") {
    if (prefs.gallery === false) return { eligible: false, reason: "PREFERENCE_GALLERY_DISABLED" };
  }

  return { eligible: true, reason: "ELIGIBLE" };
}

/**
 * Computes deterministic deep link route for system event.
 */
export function getDeepLinkForEvent(event: Pick<DeltaSystemEvent, "type" | "related_entity_type" | "related_entity_id">): string {
  if (event.type.startsWith("MATCH")) {
    return "/dashboard?view=matches";
  }
  if (event.type.startsWith("TRAINING")) {
    return "/dashboard?view=training";
  }
  if (event.type === "PLAYER_CARD_UNLOCKED") {
    return "/dashboard?view=collection";
  }
  if (event.type === "PLAYER_ACHIEVEMENT") {
    return "/dashboard?view=achievements";
  }
  if (event.type === "GALLERY_CREATED" || event.type === "GALLERY_UPDATED" || event.type === "VIDEO_PUBLISHED") {
    return "/dashboard?view=gallery";
  }
  if (event.type === "CLUB_NEWS") {
    return "/dashboard?view=club";
  }
  return "/dashboard";
}
