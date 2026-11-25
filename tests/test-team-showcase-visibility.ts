import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const LOCAL_URL = "http://localhost:3015";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots", "visibility_fix");
const ARTIFACT_DIR = "C:\\Users\\tomas\\.gemini\\antigravity\\brain\\2fbf42b8-e0dc-44a8-9e00-27c9753d6eef";

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
function parseEnv(key: string): string {
  const line = envContent.split(/\r?\n/).find((l) => l.trim().startsWith(key + "="));
  if (!line) return "";
  const idx = line.indexOf("=");
  return line.slice(idx + 1).trim();
}
const supabaseUrl = parseEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = parseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || parseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

async function saveImage(name: string, buffer: Buffer) {
  const pPath = path.join(SCREENSHOT_DIR, name);
  const aPath = path.join(ARTIFACT_DIR, name);
  fs.writeFileSync(pPath, buffer);
  fs.writeFileSync(aPath, buffer);
  console.log(`  Saved screenshot: ${name}`);
}

async function getAuthCookies(email: string, password = "TestPassword123!") {
  const cookieMap = new Map<string, string>();
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value }) => cookieMap.set(name, value)),
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Auth failed: ${error?.message}`);
  return Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
}

async function run() {
  console.log("=== VERIFYING TEAM SHOWCASE PLAYER NAME VISIBILITY & STACKING FIX ===");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const authCookies = await getAuthCookies("parentA.test@delta.staging");

  const desktopViewports = [1920, 1440, 1280];
  const mobileViewports = [430, 390, 375, 320];

  // 1. TEST REAL-DATA ROAD TO GLORY (DELTA 2018 GM ROSTER)
  console.log("\n--- Testing Real Data Road to Glory ---");
  for (const w of [...desktopViewports, ...mobileViewports]) {
    console.log(`\nTesting Real Data at viewport: ${w}px...`);
    const context = await browser.newContext({ viewport: { width: w, height: w > 640 ? 900 : 800 } });
    await context.addCookies(authCookies);
    const page = await context.newPage();

    await page.goto(`${LOCAL_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const rosterSection = page.locator("#rtg-team-roster");
    assert.ok((await rosterSection.count()) > 0, "Roster section must exist");
    await rosterSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // Validate Stacking Layers on cards
    const cards = page.locator(".ts2-card");
    const count = await cards.count();
    assert.ok(count >= 2, "Must render real-data cards");

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const isVisible = await card.isVisible();
      if (!isVisible) continue;

      const layerStyles = await card.evaluate((el) => {
        const inner = el.querySelector(".ts2-card-inner");
        const photoSlot = el.querySelector(".ts2-photo-slot");
        const scrim = el.querySelector(".ts2-card-scrim");
        const nameplate = el.querySelector(".ts2-nameplate");
        const dim = el.querySelector(".ts2-card-dim");
        const num = el.querySelector(".ts2-card-number");
        const pos = el.querySelector(".ts2-card-pos");
        const nameFirst = el.querySelector(".ts2-name-first");
        const nameLast = el.querySelector(".ts2-name-last");

        return {
          innerIsolation: inner ? window.getComputedStyle(inner).isolation : null,
          photoSlotZ: photoSlot ? window.getComputedStyle(photoSlot).zIndex : null,
          photoSlotIsolation: photoSlot ? window.getComputedStyle(photoSlot).isolation : null,
          scrimZ: scrim ? window.getComputedStyle(scrim).zIndex : null,
          nameplateZ: nameplate ? window.getComputedStyle(nameplate).zIndex : null,
          dimZ: dim ? window.getComputedStyle(dim).zIndex : null,
          numZ: num ? window.getComputedStyle(num).zIndex : null,
          posZ: pos ? window.getComputedStyle(pos).zIndex : null,
          nameplateHeight: nameplate ? (nameplate as HTMLElement).offsetHeight : 0,
          firstText: nameFirst ? (nameFirst as HTMLElement).innerText : "",
          lastText: nameLast ? (nameLast as HTMLElement).innerText : "",
        };
      });

      // Verify exact layer ordering
      assert.equal(layerStyles.innerIsolation, "isolate", "Card inner must isolate stacking context");
      assert.equal(layerStyles.photoSlotZ, "2", "Photo slot must be on Layer 2");
      assert.equal(layerStyles.photoSlotIsolation, "isolate", "Photo slot must isolate local children");
      assert.equal(layerStyles.scrimZ, "5", "Scrim gradient must be on Layer 5");
      assert.equal(layerStyles.nameplateZ, "10", "Nameplate must be on Layer 10 (above scrim & photo)");
      assert.equal(layerStyles.numZ, "10", "Number badge must be on Layer 10");
      assert.equal(layerStyles.posZ, "10", "Position badge must be on Layer 10");
      assert.equal(layerStyles.dimZ, "4", "Dim overlay must be on Layer 4 (below nameplate & scrim)");
      assert.ok(layerStyles.nameplateHeight >= 45, `Nameplate height (${layerStyles.nameplateHeight}px) must be >= 45px`);
    }

    // Capture close-up of showcase stage
    const stage = page.locator(".ts2-stage");
    const stageBuf = await stage.screenshot();
    await saveImage(`visibility-realdata-${w}px.png`, stageBuf);

    await context.close();
  }

  // 2. TEST DEDICATED SHOWCASE /preview/team-showcase?demo=1 (VARIED PLAYERS, LONG NAMES, PHOTOS & SILHOUETTES)
  console.log("\n--- Testing Showcase /preview/team-showcase?demo=1 with Varied Players ---");
  for (const w of [1440, 390, 320]) {
    console.log(`\nTesting Demo Showcase at ${w}px...`);
    const context = await browser.newContext({ viewport: { width: w, height: w > 640 ? 900 : 800 } });
    const page = await context.newPage();

    await page.goto(`${LOCAL_URL}/preview/team-showcase?demo=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // Verify presence of cards and navigation
    const stage = page.locator(".ts2-stage");
    assert.ok((await stage.count()) > 0);

    // Capture active card
    const stageBuf = await stage.screenshot();
    await saveImage(`visibility-demo-${w}px-active.png`, stageBuf);

    // Click NEXT to verify animation and navigation readability
    const nextBtn = page.locator("[data-testid='team-showcase-next']");
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      const stageBufNext = await stage.screenshot();
      await saveImage(`visibility-demo-${w}px-next.png`, stageBufNext);
    }

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 ALL VISIBILITY AUDIT & LAYER ORDERING TESTS PASSED!");
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
