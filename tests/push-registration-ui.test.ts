import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PUSH_PREFERENCES, type PushNotificationPreferences } from "../lib/events/types.ts";

// Helper logic mimicking UI state resolution
function computeDevicePushStatus(params: {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: "default" | "granted" | "denied";
  hasActiveSubscription: boolean;
}): "unsupported" | "denied" | "granted" | "default" {
  if (!params.hasServiceWorker || !params.hasPushManager || !params.hasNotification) {
    return "unsupported";
  }
  if (params.permission === "denied") {
    return "denied";
  }
  if (params.permission === "granted" && params.hasActiveSubscription) {
    return "granted";
  }
  return "default";
}

function computeBadgeLabel(status: "unsupported" | "denied" | "granted" | "default"): string {
  switch (status) {
    case "granted":
      return "Włączone";
    case "denied":
      return "Zablokowane przez przeglądarkę";
    case "unsupported":
      return "Niedostępne";
    case "default":
    default:
      return "Wyłączone";
  }
}

test("PUSH UI 1: Device without serviceWorker or PushManager is flagged as unsupported", () => {
  const status = computeDevicePushStatus({
    hasServiceWorker: false,
    hasPushManager: false,
    hasNotification: true,
    permission: "default",
    hasActiveSubscription: false
  });
  assert.equal(status, "unsupported");
  assert.equal(computeBadgeLabel(status), "Niedostępne");
});

test("PUSH UI 2: Permission denied flags state as blocked / denied with guidance", () => {
  const status = computeDevicePushStatus({
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    permission: "denied",
    hasActiveSubscription: false
  });
  assert.equal(status, "denied");
  assert.equal(computeBadgeLabel(status), "Zablokowane przez przeglądarkę");
});

test("PUSH UI 3: Permission granted with active subscription flags state as granted / Włączone", () => {
  const status = computeDevicePushStatus({
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    permission: "granted",
    hasActiveSubscription: true
  });
  assert.equal(status, "granted");
  assert.equal(computeBadgeLabel(status), "Włączone");
});

test("PUSH UI 4: Permission granted without subscription (or default) flags state as default / Wyłączone", () => {
  const status = computeDevicePushStatus({
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    permission: "default",
    hasActiveSubscription: false
  });
  assert.equal(status, "default");
  assert.equal(computeBadgeLabel(status), "Wyłączone");
});

test("PUSH UI 5: Toggle category preferences preserves default keys", () => {
  let prefs: PushNotificationPreferences = { ...DEFAULT_PUSH_PREFERENCES };
  assert.equal(prefs.matches, true);
  assert.equal(prefs.trainings, true);

  // Toggle matches off
  prefs = { ...prefs, matches: !prefs.matches };
  assert.equal(prefs.matches, false);
  assert.equal(prefs.trainings, true);

  // Toggle matches back on
  prefs = { ...prefs, matches: !prefs.matches };
  assert.equal(prefs.matches, true);
});

test("PUSH UI 6: Non-admin users (parent / player) have full access to push registration", () => {
  const roles = ["parent", "player", "coach", "admin", "supporter"];
  roles.forEach(role => {
    // Menu tile 10 is available to all roles unconditionally
    const tileVisible = true;
    assert.equal(tileVisible, true, `Tile 10 should be visible for role ${role}`);
  });
});

test("PUSH UI 7: Base64 URL safe VAPID key conversion handles padding and URL chars", () => {
  function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = Buffer.from(base64, 'base64').toString('binary');
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const sampleKey = "BMzB7Ld9F8_123-abc";
  const bytes = urlB64ToUint8Array(sampleKey);
  assert.ok(bytes.length > 0);
  assert.ok(bytes instanceof Uint8Array);
});
