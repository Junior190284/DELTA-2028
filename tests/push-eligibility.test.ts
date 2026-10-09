import assert from "node:assert/strict";
import test from "node:test";
import { isEventEligibleForPush, getDeepLinkForEvent, type PushSubscriptionRecord } from "../lib/events/push-eligibility.ts";
import type { DeltaSystemEvent } from "../lib/events/types.ts";

const MOCK_SUB: PushSubscriptionRecord = {
  id: "sub-123",
  user_id: "user-456",
  endpoint: "https://push.example.com/endpoint/123",
  p256dh: "key-p256dh",
  auth: "auth-secret",
  enabled: true,
  preferences: {
    matches: true,
    schedule_changes: true,
    trainings: true,
    lineup: true,
    results: true,
    fantasy: true,
    achievements: true,
    gallery: true,
    tv: true,
    club_news: true
  }
};

const ACTIVATION_CUTOFF = "2026-10-09T16:00:00.000Z";

function makeEvent(overrides: Partial<DeltaSystemEvent> = {}): DeltaSystemEvent {
  return {
    id: "evt-1",
    type: "CLUB_NEWS",
    title: "Powołania 2018 Górny Mokotów",
    message: "Nowe powołania na mecz ligowy",
    source: "DELTA_SYNC",
    importance: "NORMAL",
    audience_type: "TEAM",
    target_user_id: null,
    target_player_id: null,
    related_entity_type: "club_update",
    related_entity_id: "src-key-1",
    created_at: "2026-10-09T16:15:00.000Z",
    ...overrides
  };
}

test("1. Backfill Protection: Historical event created BEFORE activation cutoff is strictly rejected", () => {
  const historicalEvent = makeEvent({
    created_at: "2026-10-09T12:00:00.000Z" // 4 hours before cutoff
  });

  const result = isEventEligibleForPush(historicalEvent, MOCK_SUB, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:30:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "EVENT_PREDATES_ACTIVATION_CUTOFF");
});

test("2. New event created AFTER activation cutoff is accepted", () => {
  const newEvent = makeEvent({
    created_at: "2026-10-09T16:05:00.000Z" // 5 mins after cutoff
  });

  const result = isEventEligibleForPush(newEvent, MOCK_SUB, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:10:00.000Z"
  });

  assert.equal(result.eligible, true);
  assert.equal(result.reason, "ELIGIBLE");
});

test("3. Feature Flag OFF: When pushEnabled=false, all events are rejected", () => {
  const newEvent = makeEvent({
    created_at: "2026-10-09T16:05:00.000Z"
  });

  const result = isEventEligibleForPush(newEvent, MOCK_SUB, { id: "user-456" }, {
    pushEnabled: false,
    activationCutoffIso: ACTIVATION_CUTOFF
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "PUSH_FEATURE_DISABLED");
});

test("4. Disabled Subscription: When subscription.enabled=false, push is rejected", () => {
  const disabledSub = { ...MOCK_SUB, enabled: false };
  const newEvent = makeEvent({ created_at: "2026-10-09T16:05:00.000Z" });

  const result = isEventEligibleForPush(newEvent, disabledSub, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:10:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "SUBSCRIPTION_DISABLED");
});

test("5. Category Preference OFF: When user turned off club_news, CLUB_NEWS is rejected", () => {
  const optOutSub: PushSubscriptionRecord = {
    ...MOCK_SUB,
    preferences: { ...MOCK_SUB.preferences, club_news: false }
  };
  const newEvent = makeEvent({ created_at: "2026-10-09T16:05:00.000Z" });

  const result = isEventEligibleForPush(newEvent, optOutSub, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:10:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "PREFERENCE_CLUB_NEWS_DISABLED");
});

test("6. Low Importance: LOW / INFO importance events never generate push", () => {
  const lowEvent = makeEvent({
    importance: "LOW",
    created_at: "2026-10-09T16:05:00.000Z"
  });

  const result = isEventEligibleForPush(lowEvent, MOCK_SUB, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:10:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "IMPORTANCE_TOO_LOW_FOR_PUSH");
});

test("7. Audience Mismatch: Event targeted to another user is rejected", () => {
  const targetedEvent = makeEvent({
    audience_type: "USER",
    target_user_id: "other-user-789",
    created_at: "2026-10-09T16:05:00.000Z"
  });

  const result = isEventEligibleForPush(targetedEvent, MOCK_SUB, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:10:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "AUDIENCE_MISMATCH_USER_ID");
});

test("8. Admin Audience: Non-admin user rejected for admin events", () => {
  const adminEvent = makeEvent({
    type: "SYNC_ERROR",
    audience_type: "ADMIN",
    importance: "URGENT",
    created_at: "2026-10-09T16:05:00.000Z"
  });

  const result = isEventEligibleForPush(adminEvent, MOCK_SUB, { id: "user-456", role: "parent" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T16:10:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "AUDIENCE_MISMATCH_ADMIN_REQUIRED");
});

test("9. Stale Event: Event older than TTL is rejected", () => {
  const staleEvent = makeEvent({
    type: "CLUB_NEWS",
    created_at: "2026-10-09T16:01:00.000Z"
  });

  // CLUB_NEWS TTL is 120 minutes. Now is 300 minutes later.
  const result = isEventEligibleForPush(staleEvent, MOCK_SUB, { id: "user-456" }, {
    pushEnabled: true,
    activationCutoffIso: ACTIVATION_CUTOFF,
    nowIso: "2026-10-09T21:05:00.000Z"
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "EVENT_IS_STALE");
});

test("10. Deep Link generation returns correct routes for known event types", () => {
  assert.equal(getDeepLinkForEvent({ type: "CLUB_NEWS" }), "/dashboard?view=club");
  assert.equal(getDeepLinkForEvent({ type: "MATCH_UPDATED" }), "/dashboard?view=matches");
  assert.equal(getDeepLinkForEvent({ type: "TRAINING_CREATED" }), "/dashboard?view=training");
  assert.equal(getDeepLinkForEvent({ type: "PLAYER_ACHIEVEMENT" }), "/dashboard?view=achievements");
  assert.equal(getDeepLinkForEvent({ type: "PLAYER_CARD_UNLOCKED" }), "/dashboard?view=collection");
  assert.equal(getDeepLinkForEvent({ type: "GALLERY_CREATED" }), "/dashboard?view=gallery");
});
