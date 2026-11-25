import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const PREVIEW_URL = "https://delta-2028-6q6d27uiy-tomaszrybacki-3187s-projects.vercel.app";
const PREVIEW_DOMAIN = "delta-2028-6q6d27uiy-tomaszrybacki-3187s-projects.vercel.app";
const VERCEL_BYPASS_TOKEN = "BXoDTakmomkFW9QV4LV7tdinlnoSxM5A";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots", "delta045o");
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

  const playwrightCookies = Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: PREVIEW_DOMAIN,
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "Lax" as const,
  }));

  return { playwrightCookies, user: data.user };
}

async function run() {
  console.log("=== DELTA-045O: FINAL PREVIEW ACCEPTANCE ===");
  console.log(`Target URL: ${PREVIEW_URL}`);

  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // --------------------------------------------------------------------------
  // 1. PARENT A ACCEPTANCE ON REAL-DATA ROAD TO GLORY
  // --------------------------------------------------------------------------
  console.log("\n[1] Testing Parent A on /preview/dashboard-ui4/real-data?view=road-to-glory...");
  const parentAAuth = await getAuthCookies("parentA.test@delta.staging");
  console.log("  ✔ Parent A authenticated via Supabase Staging:", parentAAuth.user.id);

  // 1.1 Desktop 1440px
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context.addCookies(parentAAuth.playwrightCookies);
    const page = await context.newPage();
    await page.goto(`${PREVIEW_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").innerText();
    
    // Check 1: Real Profile
    console.log("  Validating real profile display...");
    assert.ok(
      bodyText.includes("Player A (Jan)") || bodyText.includes("Jan") || bodyText.includes("Player A"),
      "Must display real profile of child"
    );

    // Check 2: Team Showcase Section
    console.log("  Validating Team Showcase section...");
    const rosterSection = page.locator("#rtg-team-roster");
    assert.ok((await rosterSection.count()) > 0, "Team Showcase section must exist");
    await rosterSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check 3: Team title & 2 players
    assert.ok(bodyText.includes("DELTA 2018 GM"), "Must display team name DELTA 2018 GM");
    const lowerBody = bodyText.toLowerCase();
    assert.ok(lowerBody.includes("player a") && lowerBody.includes("player c"), "Must include exactly both players from Staging");
    assert.ok(bodyText.includes("2 zawodników"), "Must indicate 2 zawodników");

    // Check 4: Proper ward highlighted
    assert.ok(bodyText.includes("TWÓJ PODOPIECZNY"), "Must highlight proper child as TWÓJ PODOPIECZNY");

    // Check 5: No DEMO data substitution
    assert.ok(!bodyText.includes("Drużyna Testowa U-9"), "Must NOT display demo team name");
    assert.ok(!bodyText.includes("Zawodnik Alfa"), "Must NOT display demo player Alfa");

    console.log("  ✔ Parent A 1440px passed all assertions!");

    // Capture Full & Close-up screenshots
    const fullBuf = await page.screenshot({ fullPage: true });
    await saveImage("delta045o-realdata-parentA-1440-full.png", fullBuf);

    const rosterBuf = await rosterSection.screenshot();
    await saveImage("delta045o-realdata-parentA-1440-roster.png", rosterBuf);

    await context.close();
  }

  // 1.2 Mobile 390px
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context.addCookies(parentAAuth.playwrightCookies);
    const page = await context.newPage();
    await page.goto(`${PREVIEW_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  Parent A mobile 390px - overflow: ${overflow}`);
    assert.equal(overflow, false, "Mobile 390px must have zero overflow");

    const rosterSection = page.locator("#rtg-team-roster");
    await rosterSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const mobileBuf = await page.screenshot({ fullPage: true });
    await saveImage("delta045o-realdata-parentA-390-full.png", mobileBuf);

    const rosterBuf = await rosterSection.screenshot();
    await saveImage("delta045o-realdata-parentA-390-roster.png", rosterBuf);

    await context.close();
  }

  // --------------------------------------------------------------------------
  // 2. PARENT B CONTROL (CROSS-TEAM ISOLATION)
  // --------------------------------------------------------------------------
  console.log("\n[2] Testing Parent B cross-team isolation on /preview/dashboard-ui4/real-data?view=road-to-glory...");
  const parentBAuth = await getAuthCookies("parentB.test@delta.staging");
  console.log("  ✔ Parent B authenticated via Supabase Staging:", parentBAuth.user.id);

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context.addCookies(parentBAuth.playwrightCookies);
    const page = await context.newPage();
    await page.goto(`${PREVIEW_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").innerText();
    
    // Parent B must not see DELTA 2018 GM roster
    assert.ok(
      bodyText.includes("Nie masz dostępu do składu tej drużyny") ||
      bodyText.includes("Dostęp do składu drużyny ograniczony"),
      "Parent B must see clear access denied message"
    );
    assert.ok(!bodyText.includes("Brak tabeli teams"), "Parent B must NOT see 'Brak tabeli teams' error");
    assert.ok(!bodyText.includes("Player C (Kuba - Brat)"), "Parent B must NOT have access to DELTA 2018 GM roster");

    console.log("  ✔ Parent B correctly blocked from viewing DELTA 2018 GM roster!");

    const pBBuf = await page.screenshot({ fullPage: true });
    await saveImage("delta045o-realdata-parentB-1440.png", pBBuf);

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 DELTA-045O FINAL ACCEPTANCE PASSED 100%!");
}

run().catch((err) => {
  console.error("DELTA-045O Acceptance Failed:", err);
  process.exit(1);
});
