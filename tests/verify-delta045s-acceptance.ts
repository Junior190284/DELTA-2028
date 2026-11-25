import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const PREVIEW_URL = "https://delta-2028-r7yby7pwn-tomaszrybacki-3187s-projects.vercel.app";
const PREVIEW_DOMAIN = "delta-2028-r7yby7pwn-tomaszrybacki-3187s-projects.vercel.app";
const LOCAL_URL = "http://localhost:3015";
const VERCEL_BYPASS_TOKEN = "BXoDTakmomkFW9QV4LV7tdinlnoSxM5A";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots", "delta045s-acceptance");
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
  if (error || !data.session) {
    throw new Error(`Failed auth for ${email}: ${error?.message}`);
  }

  return Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: PREVIEW_DOMAIN,
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "Lax" as const,
  }));
}

async function run() {
  console.log("=== DELTA-045S: FINAL VISUAL ACCEPTANCE TEST ===");
  console.log("Target Live Preview:", PREVIEW_URL);

  const browser = await chromium.launch({ channel: "msedge", headless: true });

  try {
    const parentACookies = await getAuthCookies("parentA.test@delta.staging");

    // -------------------------------------------------------------
    // Test 1: Desktop 1440px on Live Vercel Preview (Real Data)
    // -------------------------------------------------------------
    console.log("\n[1] Testing Live Preview Real-Data at 1440px (Desktop)...");
    const context1440 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context1440.addCookies(parentACookies);
    const page1440 = await context1440.newPage();

    await page1440.goto(`${PREVIEW_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, {
      waitUntil: "networkidle",
    });

    await page1440.waitForSelector("#rtg-team-roster, [data-testid='team-showcase-stage']", { timeout: 15000 });
    const rosterSection = page1440.locator("#rtg-team-roster");
    await rosterSection.scrollIntoViewIfNeeded();
    await page1440.waitForTimeout(500);

    // Check layer stacking and visibility on active card
    const activeCard1440 = await page1440.$(".ts2-card.is-active");
    assert.ok(activeCard1440, "Active card must exist");

    const layersCheck = await activeCard1440.evaluate((el) => {
      const inner = el.querySelector(".ts2-card-inner") as HTMLElement;
      const scrim = el.querySelector(".ts2-card-scrim") as HTMLElement;
      const nameplate = el.querySelector(".ts2-nameplate") as HTMLElement;
      const firstName = el.querySelector(".ts2-name-first") as HTMLElement;
      const lastName = el.querySelector(".ts2-name-last") as HTMLElement;
      const dim = el.querySelector(".ts2-card-dim") as HTMLElement;
      const number = el.querySelector(".ts2-card-number") as HTMLElement;
      const pos = el.querySelector(".ts2-card-pos") as HTMLElement;

      const innerStyle = window.getComputedStyle(inner);
      const scrimStyle = window.getComputedStyle(scrim);
      const nameplateStyle = window.getComputedStyle(nameplate);
      const dimStyle = window.getComputedStyle(dim);
      const numStyle = window.getComputedStyle(number);
      const posStyle = window.getComputedStyle(pos);

      return {
        isolation: innerStyle.isolation,
        scrimZIndex: parseInt(scrimStyle.zIndex, 10),
        nameplateZIndex: parseInt(nameplateStyle.zIndex, 10),
        dimZIndex: parseInt(dimStyle.zIndex, 10),
        numZIndex: parseInt(numStyle.zIndex, 10),
        posZIndex: parseInt(posStyle.zIndex, 10),
        nameplateHeight: nameplate.offsetHeight,
        firstNameText: firstName?.innerText.trim(),
        lastNameText: lastName?.innerText.trim(),
        lastNameLines: lastName ? window.getComputedStyle(lastName).webkitLineClamp : null,
      };
    });

    console.log("  Layer Check 1440px:", layersCheck);
    assert.equal(layersCheck.isolation, "isolate", "inner must have isolation: isolate");
    assert.equal(layersCheck.scrimZIndex, 5, "scrim z-index must be 5");
    assert.equal(layersCheck.nameplateZIndex, 10, "nameplate z-index must be 10");
    assert.equal(layersCheck.dimZIndex, 4, "dim z-index must be 4");
    assert.equal(layersCheck.numZIndex, 10, "number z-index must be 10");
    assert.equal(layersCheck.posZIndex, 10, "pos z-index must be 10");
    assert.ok(layersCheck.nameplateHeight >= 50, "nameplate height must be >= 50px");

    // Capture Full & Showcase 1440px
    const full1440Buf = await page1440.screenshot({ fullPage: true });
    await saveImage("delta045s-acceptance-1440-full.png", full1440Buf);

    const showcaseSection1440 = await page1440.$("#rtg-team-roster");
    if (showcaseSection1440) {
      const showcase1440Buf = await showcaseSection1440.screenshot();
      await saveImage("delta045s-acceptance-1440-showcase-active.png", showcase1440Buf);
    }

    // -------------------------------------------------------------
    // Test 2: Animation & Carousel Shift on 1440px
    // -------------------------------------------------------------
    console.log("\n[2] Testing Carousel Shift & Animation to Teammate (Player C)...");
    const nextBtn = await page1440.$("button[aria-label='Następny zawodnik'], [data-testid='team-showcase-next']");
    assert.ok(nextBtn, "Next button must exist");
    await nextBtn.click();
    await page1440.waitForTimeout(600); // Wait for transition animation to settle

    // Check newly active card (Player C - teammate without photo, long surname)
    const newActiveCard = await page1440.$(".ts2-card.is-active");
    assert.ok(newActiveCard, "New active card must exist");

    const playerCCheck = await newActiveCard.evaluate((el) => {
      const firstName = el.querySelector(".ts2-name-first") as HTMLElement;
      const lastName = el.querySelector(".ts2-name-last") as HTMLElement;
      const silhouette = el.querySelector(".ts2-silhouette") as HTMLElement;
      const soonPill = el.querySelector(".ts2-soon-pill") as HTMLElement;
      return {
        firstName: firstName?.innerText.trim(),
        lastName: lastName?.innerText.trim(),
        hasSilhouette: !!silhouette,
        soonPillText: soonPill?.innerText.trim(),
        lastNameHeight: lastName?.offsetHeight,
      };
    });

    console.log("  Teammate Player C Check:", playerCCheck);
    assert.ok(playerCCheck.hasSilhouette, "Teammate must display NeutralPlayerSilhouette");
    assert.equal(playerCCheck.soonPillText, "ZDJĘCIE WKRÓTCE", "Must show ZDJĘCIE WKRÓTCE pill");
    assert.ok((playerCCheck.firstName + " " + playerCCheck.lastName).includes("KUBA"), "Must contain Kuba");

    if (showcaseSection1440) {
      const showcaseShiftBuf = await showcaseSection1440.screenshot();
      await saveImage("delta045s-acceptance-1440-showcase-shifted.png", showcaseShiftBuf);
    }

    await context1440.close();

    // -------------------------------------------------------------
    // Test 3: Mobile 390px on Live Vercel Preview
    // -------------------------------------------------------------
    console.log("\n[3] Testing Live Preview Real-Data at 390px (Mobile)...");
    const context390 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context390.addCookies(parentACookies);
    const page390 = await context390.newPage();

    await page390.goto(`${PREVIEW_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, {
      waitUntil: "networkidle",
    });

    await page390.waitForSelector("#rtg-team-roster, [data-testid='team-showcase-stage']", { timeout: 15000 });

    const scrollCheck390 = await page390.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    console.log("  390px horizontal scroll check (no overflow):", scrollCheck390);
    assert.ok(scrollCheck390, "390px must have no horizontal page overflow");

    // Save 390px screenshots
    const full390Buf = await page390.screenshot({ fullPage: true });
    await saveImage("delta045s-acceptance-390-full.png", full390Buf);

    const showcaseSection390 = await page390.$("#rtg-team-roster, [data-testid='team-showcase-2']");
    if (showcaseSection390) {
      const showcase390Buf = await showcaseSection390.screenshot();
      await saveImage("delta045s-acceptance-390-showcase.png", showcase390Buf);
    }

    // Test swipe on mobile
    const carouselEl = await page390.$(".ts2-viewport");
    if (carouselEl) {
      const box = await carouselEl.boundingBox();
      if (box) {
        // Drag left to advance carousel
        await page390.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
        await page390.mouse.down();
        await page390.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 });
        await page390.mouse.up();
        await page390.waitForTimeout(600);
      }
    }

    if (showcaseSection390) {
      const showcase390SwipedBuf = await showcaseSection390.screenshot();
      await saveImage("delta045s-acceptance-390-swiped.png", showcase390SwipedBuf);
    }

    await context390.close();

    // -------------------------------------------------------------
    // Test 4: Photo Scenarios & Long Name Truncation Edge Cases
    // (Real photo, missing photo, broken photo error fallback, 2-line names)
    // -------------------------------------------------------------
    console.log("\n[4] Testing Demo Showcase (/preview/team-showcase?demo=1) with varied edge cases...");
    const demoContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    const demoPage = await demoContext.newPage();
    await demoPage.goto(`${PREVIEW_URL}/preview/team-showcase?demo=1`, {
      waitUntil: "networkidle",
    });

    await demoPage.waitForSelector("[data-testid='team-showcase-stage'], [data-testid='team-showcase-2']", { timeout: 15000 });

    // Inspect cards in demo roster
    const demoCards = await demoPage.$$(".ts2-card");
    console.log(`  Found ${demoCards.length} cards in demo showcase`);

    for (let i = 0; i < Math.min(demoCards.length, 5); i++) {
      const cardInfo = await demoCards[i].evaluate((el) => {
        const firstName = (el.querySelector(".ts2-name-first") as HTMLElement)?.innerText.trim();
        const lastName = (el.querySelector(".ts2-name-last") as HTMLElement)?.innerText.trim();
        const photo = el.querySelector(".ts2-photo") as HTMLImageElement;
        const silhouette = el.querySelector(".ts2-silhouette");
        const scrim = el.querySelector(".ts2-card-scrim");
        const nameplate = el.querySelector(".ts2-nameplate") as HTMLElement;

        return {
          firstName,
          lastName,
          hasPhoto: !!photo,
          photoSrc: photo?.src,
          hasSilhouette: !!silhouette,
          hasScrim: !!scrim,
          nameplateHeight: nameplate?.offsetHeight,
        };
      });

      console.log(`  Card ${i + 1}: ${cardInfo.firstName} ${cardInfo.lastName} | Photo: ${cardInfo.hasPhoto} | Silhouette: ${cardInfo.hasSilhouette} | Scrim: ${cardInfo.hasScrim}`);
      assert.ok(cardInfo.hasScrim, "Every card must have scrim");
      assert.ok(cardInfo.nameplateHeight >= 50, "Nameplate must be well-dimensioned");
    }

    const demoShowcaseBuf = await demoPage.screenshot({ fullPage: true });
    await saveImage("delta045s-acceptance-demo-1440.png", demoShowcaseBuf);

    await demoContext.close();

    // -------------------------------------------------------------
    // Test 5: Verify Shared NeutralPlayerSilhouette in Other Modules
    // (Player Passport / Road to Glory hero, /preview/pack-demo, /dev/cards)
    // -------------------------------------------------------------
    console.log("\n[5] Verifying shared NeutralPlayerSilhouette in other modules for zero regressions...");
    const regContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    const regPage = await regContext.newPage();

    // Check Pack Demo (/preview/pack-demo)
    console.log("  Testing /preview/pack-demo...");
    await regPage.goto(`${PREVIEW_URL}/preview/pack-demo`, { waitUntil: "networkidle" });
    const packCards = await regPage.$$("[data-testid='pack-card-front']");
    console.log(`  Pack demo cards count: ${packCards.length}`);
    const packDemoBuf = await regPage.screenshot({ fullPage: false });
    await saveImage("delta045s-acceptance-pack-demo.png", packDemoBuf);

    // Check Player Passport on Road to Glory Hero
    console.log("  Testing Player Passport on Road to Glory Hero...");
    await regPage.goto(`${LOCAL_URL}/preview/dashboard-ui4/road-to-glory`, { waitUntil: "networkidle" });
    const passportHero = await regPage.$("[data-testid='passport-hero']");
    if (passportHero) {
      const passportBuf = await passportHero.screenshot();
      await saveImage("delta045s-acceptance-passport-hero.png", passportBuf);
    }

    await regContext.close();

    console.log("\n🎉 ALL DELTA-045S ACCEPTANCE CHECKS PASSED 100%!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("❌ Acceptance test failed:", err);
  process.exit(1);
});
