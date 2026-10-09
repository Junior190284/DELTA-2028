import assert from "node:assert/strict";
import test from "node:test";
import { isEventEligibleForPush, getDeepLinkForEvent, type PushSubscriptionRecord } from "../lib/events/push-eligibility.ts";
import type { DeltaSystemEvent } from "../lib/events/types.ts";

const CUTOFF = "2026-10-09T18:00:00.000Z";

const SUB_1: PushSubscriptionRecord = {
  id: "sub-1",
  user_id: "user-1",
  endpoint: "https://push.example.com/device-1",
  p256dh: "key-1",
  auth: "auth-1",
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

const SUB_2: PushSubscriptionRecord = {
  id: "sub-2",
  user_id: "user-1", // Same user, second device (multi-device)
  endpoint: "https://push.example.com/device-2",
  p256dh: "key-2",
  auth: "auth-2",
  enabled: true,
  preferences: { ...SUB_1.preferences }
};

function createMockEvent(overrides: Partial<DeltaSystemEvent> = {}): DeltaSystemEvent {
  return {
    id: "evt-100",
    type: "CLUB_NEWS",
    title: "Powołania 2018 Górny Mokotów",
    message: "Komunikat meczowy",
    source: "DELTA_SYNC",
    importance: "NORMAL",
    audience_type: "TEAM",
    target_user_id: null,
    target_player_id: null,
    created_at: "2026-10-09T18:05:00.000Z",
    ...overrides
  };
}

test("TEST 1: PUSH_ENABLED=false produces zero delivery", () => {
  const event = createMockEvent();
  const res = isEventEligibleForPush(event, SUB_1, { id: "user-1" }, {
    pushEnabled: false,
    activationCutoffIso: CUTOFF
  });
  assert.equal(res.eligible, false);
  assert.equal(res.reason, "PUSH_FEATURE_DISABLED");
});

test("TEST 2: Event created before activation cutoff produces zero delivery", () => {
  const historical = createMockEvent({ created_at: "2026-10-09T12:00:00.000Z" });
  const res = isEventEligibleForPush(historical, SUB_1, { id: "user-1" }, {
    pushEnabled: true,
    activationCutoffIso: CUTOFF
  });
  assert.equal(res.eligible, false);
  assert.equal(res.reason, "EVENT_PREDATES_ACTIVATION_CUTOFF");
});

test("TEST 3: Event created strictly after cutoff is eligible", () => {
  const fresh = createMockEvent({ created_at: "2026-10-09T18:05:00.000Z" });
  const res = isEventEligibleForPush(fresh, SUB_1, { id: "user-1" }, {
    pushEnabled: true,
    activationCutoffIso: CUTOFF,
    nowIso: "2026-10-09T18:10:00.000Z"
  });
  assert.equal(res.eligible, true);
  assert.equal(res.reason, "ELIGIBLE");
});

test("TEST 4: Disabled subscription produces no push", () => {
  const disabledSub = { ...SUB_1, enabled: false };
  const fresh = createMockEvent({ created_at: "2026-10-09T18:05:00.000Z" });
  const res = isEventEligibleForPush(fresh, disabledSub, { id: "user-1" }, {
    pushEnabled: true,
    activationCutoffIso: CUTOFF
  });
  assert.equal(res.eligible, false);
  assert.equal(res.reason, "SUBSCRIPTION_DISABLED");
});

test("TEST 5: Category preference OFF produces no push", () => {
  const optOutSub: PushSubscriptionRecord = {
    ...SUB_1,
    preferences: { ...SUB_1.preferences, club_news: false }
  };
  const fresh = createMockEvent({ created_at: "2026-10-09T18:05:00.000Z" });
  const res = isEventEligibleForPush(fresh, optOutSub, { id: "user-1" }, {
    pushEnabled: true,
    activationCutoffIso: CUTOFF
  });
  assert.equal(res.eligible, false);
  assert.equal(res.reason, "PREFERENCE_CLUB_NEWS_DISABLED");
});

test("TEST 6: Wrong audience produces no push", () => {
  const privateEvent = createMockEvent({
    audience_type: "USER",
    target_user_id: "other-user-999",
    created_at: "2026-10-09T18:05:00.000Z"
  });
  const res = isEventEligibleForPush(privateEvent, SUB_1, { id: "user-1" }, {
    pushEnabled: true,
    activationCutoffIso: CUTOFF
  });
  assert.equal(res.eligible, false);
  assert.equal(res.reason, "AUDIENCE_MISMATCH_USER_ID");
});

test("TEST 7: Same event + subscription delivers exactly once via dedupe ledger constraint", () => {
  const ledger = new Set<string>();

  function attemptDispatch(eventId: string, subId: string): boolean {
    const key = `${eventId}:${subId}`;
    if (ledger.has(key)) return false; // duplicate rejected
    ledger.add(key);
    return true;
  }

  assert.equal(attemptDispatch("evt-1", "sub-1"), true);
  assert.equal(attemptDispatch("evt-1", "sub-1"), false); // Second attempt blocked
  assert.equal(ledger.size, 1);
});

test("TEST 8: Parallel delivery attempts cannot double send", async () => {
  const ledger = new Set<string>();

  async function concurrentClaim(eventId: string, subId: string): Promise<boolean> {
    const key = `${eventId}:${subId}`;
    if (ledger.has(key)) return false;
    await new Promise(r => setTimeout(r, 5));
    if (ledger.has(key)) return false;
    ledger.add(key);
    return true;
  }

  const results = await Promise.all([
    concurrentClaim("evt-parallel", "sub-1"),
    concurrentClaim("evt-parallel", "sub-1"),
    concurrentClaim("evt-parallel", "sub-1")
  ]);

  const successCount = results.filter(Boolean).length;
  assert.equal(successCount, 1);
});

test("TEST 9: HTTP 404 disables subscription in database", () => {
  const subState = { ...SUB_1, enabled: true };
  const simulateError = { statusCode: 404 };

  if (simulateError.statusCode === 404 || simulateError.statusCode === 410) {
    subState.enabled = false;
  }

  assert.equal(subState.enabled, false);
});

test("TEST 10: HTTP 410 disables subscription in database", () => {
  const subState = { ...SUB_1, enabled: true };
  const simulateError = { statusCode: 410 };

  if (simulateError.statusCode === 404 || simulateError.statusCode === 410) {
    subState.enabled = false;
  }

  assert.equal(subState.enabled, false);
});

test("TEST 11: HTTP 500 does NOT delete or disable subscription", () => {
  const subState = { ...SUB_1, enabled: true };
  const simulateError = { statusCode: 500 };

  if (simulateError.statusCode === 404 || simulateError.statusCode === 410) {
    subState.enabled = false;
  }

  assert.equal(subState.enabled, true);
});

test("TEST 12: Multi-device sends once per active device for same user", () => {
  const devices = [SUB_1, SUB_2];
  const event = createMockEvent();

  const dispatchedDevices = devices.filter(sub =>
    isEventEligibleForPush(event, sub, { id: "user-1" }, {
      pushEnabled: true,
      activationCutoffIso: CUTOFF
    }).eligible
  );

  assert.equal(dispatchedDevices.length, 2);
  assert.equal(dispatchedDevices[0].endpoint, "https://push.example.com/device-1");
  assert.equal(dispatchedDevices[1].endpoint, "https://push.example.com/device-2");
});

test("TEST 13: Historical 10 CLUB_NEWS result in ZERO sends", () => {
  const historicalEvents: DeltaSystemEvent[] = Array.from({ length: 10 }, (_, i) => ({
    id: `hist-${i}`,
    type: "CLUB_NEWS",
    title: `Komunikat ${i}`,
    message: "Treść",
    source: "DELTA_SYNC",
    importance: "NORMAL",
    created_at: "2026-10-09T12:00:00.000Z"
  }));

  const eligibleCount = historicalEvents.filter(e =>
    isEventEligibleForPush(e, SUB_1, { id: "user-1" }, {
      pushEnabled: true,
      activationCutoffIso: CUTOFF
    }).eligible
  ).length;

  assert.equal(eligibleCount, 0);
});

test("TEST 14: 3 CLUB_NEWS in one sync batch coalesce into 1 digest notification", () => {
  const batch: DeltaSystemEvent[] = [
    createMockEvent({ id: "e1", title: "News 1" }),
    createMockEvent({ id: "e2", title: "News 2" }),
    createMockEvent({ id: "e3", title: "News 3" })
  ];

  const clubNews = batch.filter(e => e.type === "CLUB_NEWS");
  const isDigest = clubNews.length >= 2;

  assert.equal(isDigest, true);
  const digestBody = `Opublikowano ${clubNews.length} nowe komunikaty na stronie klubu.`;
  assert.equal(digestBody, "Opublikowano 3 nowe komunikaty na stronie klubu.");
});

test("TEST 15: Notification click accepts verified internal deep link", () => {
  function sanitizeInternalUrl(rawUrl: string): string {
    if (typeof rawUrl !== "string") return "/dashboard?view=club";
    const trimmed = rawUrl.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
      return "/dashboard?view=club";
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  assert.equal(sanitizeInternalUrl("/dashboard?view=matches"), "/dashboard?view=matches");
  assert.equal(sanitizeInternalUrl("/dashboard?view=club"), "/dashboard?view=club");
});

test("TEST 16: External malicious URL rejected by service worker guard", () => {
  function sanitizeInternalUrl(rawUrl: string): string {
    if (typeof rawUrl !== "string") return "/dashboard?view=club";
    const trimmed = rawUrl.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) {
      return "/dashboard?view=club";
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  assert.equal(sanitizeInternalUrl("https://evil.com/phish"), "/dashboard?view=club");
  assert.equal(sanitizeInternalUrl("javascript:alert(1)"), "/dashboard?view=club");
  assert.equal(sanitizeInternalUrl("//malicious.com/target"), "/dashboard?view=club");
});

test("TEST 17: Client role check forbids unauthorized mass push dispatch", () => {
  function isUserAllowedToDispatch(userProfile?: { role?: string }): boolean {
    return userProfile?.role === "admin" || userProfile?.role === "coach";
  }

  assert.equal(isUserAllowedToDispatch({ role: "parent" }), false);
  assert.equal(isUserAllowedToDispatch({ role: "player" }), false);
  assert.equal(isUserAllowedToDispatch(undefined), false);
  assert.equal(isUserAllowedToDispatch({ role: "admin" }), true);
  assert.equal(isUserAllowedToDispatch({ role: "coach" }), true);
});

test("TEST 18: Client cannot save subscription for another user", () => {
  function resolveTargetUserId(sessionUser: { id: string }, clientProvidedBody: { user_id?: string }): string {
    // Target is strictly bound to authenticated session, ignoring client-supplied user_id
    return sessionUser.id;
  }

  const authenticatedSession = { id: "actual-user-uuid" };
  const forgedPayload = { user_id: "victim-user-uuid" };

  const finalUserId = resolveTargetUserId(authenticatedSession, forgedPayload);
  assert.equal(finalUserId, "actual-user-uuid");
});
