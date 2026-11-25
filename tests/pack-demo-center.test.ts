import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Pack Demo Center (P10C.1): verifies demo route, banner, 4 configurations and safety invariants", async (t) => {
  const rootDir = "D:/DELTA/DELTA_INTEGRATION_20";
  const demoPagePath = path.join(rootDir, "app/preview/pack-demo/page.tsx");
  const collectionAlbumPath = path.join(rootDir, "components/DeltaCollectionAlbum.tsx");
  const previewLayoutPath = path.join(rootDir, "app/preview/layout.tsx");

  assert.ok(fs.existsSync(demoPagePath), "app/preview/pack-demo/page.tsx must exist");
  assert.ok(fs.existsSync(collectionAlbumPath), "components/DeltaCollectionAlbum.tsx must exist");
  assert.ok(fs.existsSync(previewLayoutPath), "app/preview/layout.tsx must exist");

  const demoPageCode = fs.readFileSync(demoPagePath, "utf-8");
  const collectionCode = fs.readFileSync(collectionAlbumPath, "utf-8");
  const layoutCode = fs.readFileSync(previewLayoutPath, "utf-8");

  await t.test("1. Required DEMO banner copy is present", () => {
    const requiredBanner = "TRYB DEMO — karty, XP i DP nie są przyznawane";
    assert.ok(
      demoPageCode.includes(requiredBanner),
      `Demo page must contain mandatory banner text: "${requiredBanner}"`
    );
    assert.match(
      demoPageCode,
      /data-testid="pack-demo-top-banner"/,
      "Top banner must have data-testid='pack-demo-top-banner'"
    );
    assert.match(
      demoPageCode,
      /data-testid="demo-floating-banner"/,
      "Floating watermark pill must be present during active experience"
    );
  });

  await t.test("2. Four distinct demonstrations exist: STANDARD, MATCHDAY, LEGEND, INFERNO", () => {
    assert.match(demoPageCode, /theme:\s*"standard"/, "Must define STANDARD pack theme");
    assert.match(demoPageCode, /theme:\s*"matchday"/, "Must define MATCHDAY pack theme");
    assert.match(demoPageCode, /theme:\s*"legend"/, "Must define LEGEND pack theme");
    assert.match(demoPageCode, /theme:\s*"inferno"/, "Must define INFERNO pack theme");

    assert.match(demoPageCode, /cards_count:\s*3/, "Standard pack must have 3 cards");
    assert.match(demoPageCode, /cards_count:\s*4/, "Matchday pack must have 4 cards");
    assert.match(demoPageCode, /cards_count:\s*5/, "Legend and Inferno packs must have 5 cards");
  });

  await t.test("3. Zero database mutations and mock data safety invariants", () => {
    assert.doesNotMatch(
      demoPageCode,
      /fetch\(\s*["']\/api\/cards\/open-pack/i,
      "Must NOT call /api/cards/open-pack via fetch in pack demo center"
    );
    assert.doesNotMatch(
      demoPageCode,
      /createClient|supabase\./i,
      "Must NOT create or invoke Supabase client in pack demo center"
    );
    assert.match(
      demoPageCode,
      /total_delta_points_earned:\s*0/,
      "Must not grant delta points"
    );
    assert.match(
      demoPageCode,
      /new_points_balance:\s*0/,
      "Must not mutate points balance"
    );
  });

  await t.test("4. Replay and return to pack selection capabilities", () => {
    assert.ok(
      demoPageCode.includes("setLaunchNonce((n) => n + 1)"),
      "onOpenAnother must refresh sessionKey via setLaunchNonce to restart animation"
    );
    assert.ok(
      demoPageCode.includes("setActivePack(null)"),
      "onClose must reset activePack to return to pack selection"
    );
  });

  await t.test("5. Collection Album links to /preview/pack-demo strictly in non-production", () => {
    assert.match(
      collectionCode,
      /href="\/preview\/pack-demo"/,
      "Collection must have Link to /preview/pack-demo"
    );
    assert.match(
      collectionCode,
      /gm2018\.pl/,
      "Collection must guard against production domain gm2018.pl"
    );
    assert.match(
      collectionCode,
      /delta-2028\.vercel\.app/,
      "Collection must guard against production domain delta-2028.vercel.app"
    );
    assert.match(
      collectionCode,
      /NEXT_PUBLIC_VERCEL_ENV === "production"/,
      "Collection must guard against NEXT_PUBLIC_VERCEL_ENV=production"
    );
  });

  await t.test("6. PreviewLayout strictly blocks production access", () => {
    assert.match(
      layoutCode,
      /process\.env\.VERCEL_ENV === "production"/,
      "PreviewLayout must block VERCEL_ENV=production"
    );
    assert.match(
      layoutCode,
      /gm2018\.pl/,
      "PreviewLayout must block gm2018.pl"
    );
    assert.match(
      layoutCode,
      /delta-2028\.vercel\.app/,
      "PreviewLayout must block delta-2028.vercel.app"
    );
  });
});
