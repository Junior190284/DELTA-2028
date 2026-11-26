import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("1. Collection Route & Fallback Recovery (DELTA-048C)", () => {
  // Verify app/preview/pack-demo/page.tsx points to valid collection view
  const packDemoPath = path.join(rootDir, "app/preview/pack-demo/page.tsx");
  const packDemoSrc = fs.readFileSync(packDemoPath, "utf-8");
  assert.ok(
    packDemoSrc.includes('href="/preview/dashboard-ui4?view=collection"'),
    "Pack demo header must link directly to active Preview Collection view"
  );
  assert.ok(
    !packDemoSrc.includes('href="/collection"'),
    "Pack demo must not contain dead link to non-existent /collection"
  );

  // Verify app/collection/page.tsx exists and provides redirect fallback
  const collectionRedirectPath = path.join(rootDir, "app/collection/page.tsx");
  assert.ok(fs.existsSync(collectionRedirectPath), "app/collection/page.tsx must exist as safety redirect");
  const collectionRedirectSrc = fs.readFileSync(collectionRedirectPath, "utf-8");
  assert.ok(
    collectionRedirectSrc.includes("redirect("),
    "Fallback route must perform server redirect"
  );
});

test("2. Global Navigation & Missing Modals (DELTA-048 / Section 5)", () => {
  const teamHubPath = path.join(rootDir, "components/TeamHub.tsx");
  const teamHubSrc = fs.readFileSync(teamHubPath, "utf-8");

  // Verify /game dead link is removed and replaced by modal
  assert.ok(
    !teamHubSrc.includes('window.location.href = "/game"'),
    "TeamHub must not navigate to non-existent /game path"
  );
  assert.ok(
    teamHubSrc.includes("setSkillGamesModalOpen(true)"),
    "TeamHub must open DeltaSkillMiniGamesModal on game tab navigation"
  );
  assert.ok(
    teamHubSrc.includes("DeltaSkillMiniGamesModal"),
    "TeamHub must import and mount DeltaSkillMiniGamesModal"
  );

  // Verify tactics modal integration
  assert.ok(
    teamHubSrc.includes('targetTab === "tactics"'),
    "TeamHub must handle tactics tab navigation"
  );
  assert.ok(
    teamHubSrc.includes("setTacticsModalOpen(true)"),
    "TeamHub must open tactics board on tactics tab navigation"
  );

  // Verify DeltaMoreMenuSheet contains Tablica Taktyczna
  const moreMenuPath = path.join(rootDir, "components/DeltaMoreMenuSheet.tsx");
  const moreMenuSrc = fs.readFileSync(moreMenuPath, "utf-8");
  assert.ok(
    moreMenuSrc.includes('handleTileClick("tactics")'),
    "DeltaMoreMenuSheet must have a tile triggering tactics"
  );
  assert.ok(
    moreMenuSrc.includes("TABLICA TAKTYCZNA"),
    "DeltaMoreMenuSheet must display TABLICA TAKTYCZNA"
  );
});

test("3. Mobile Session & OAuth Resilience (DELTA-048B)", () => {
  const callbackPath = path.join(rootDir, "app/auth/callback/route.ts");
  const callbackSrc = fs.readFileSync(callbackPath, "utf-8");

  assert.ok(
    callbackSrc.includes("sanitizeSafeRedirectPath"),
    "OAuth callback must sanitize next path to prevent open redirect or invalid routes"
  );
  assert.ok(
    callbackSrc.includes("exchangeCodeForSession"),
    "OAuth callback must exchange PKCE code for session"
  );
  assert.ok(
    callbackSrc.includes("ensureUserProfileExists"),
    "OAuth callback must idempotently bootstrap user profile"
  );

  const proxyPath = path.join(rootDir, "proxy.ts");
  const proxySrc = fs.readFileSync(proxyPath, "utf-8");
  assert.ok(
    proxySrc.includes("supabase.auth.getUser()"),
    "Proxy middleware must refresh Supabase auth user on protected requests"
  );
});
