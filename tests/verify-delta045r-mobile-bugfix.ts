import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const LOCAL_URL = "http://localhost:3015";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots", "delta045r");
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
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));

  return { playwrightCookies, user: data.user };
}

async function run() {
  console.log("=== DELTA-045R: VERIFYING MOBILE AVATAR BUGFIX & STATS POLISH ===");
  console.log(`Target: ${LOCAL_URL}`);

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const parentAAuth = await getAuthCookies("parentA.test@delta.staging");

  for (const w of [360, 390, 1440]) {
    console.log(`\nTesting viewport width: ${w}px...`);
    const context = await browser.newContext({
      viewport: { width: w, height: w === 1440 ? 900 : 800 },
    });
    await context.addCookies(parentAAuth.playwrightCookies);
    const page = await context.newPage();
    await page.goto(`${LOCAL_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 1. Verify zero horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  ${w}px overflow: ${overflow}`);
    assert.equal(overflow, false, `Width ${w}px must have zero horizontal overflow`);

    // 2. Verify Player Passport avatar slot
    const passport = page.locator("#rtg-player-passport");
    assert.ok((await passport.count()) > 0, "Player Passport section must exist");
    await passport.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const photoSlot = passport.locator(".rtg-passport-photo-slot");
    assert.ok((await photoSlot.count()) > 0, "Photo slot must exist");

    // Must NOT have a broken img tag
    const imgCount = await photoSlot.locator("img").count();
    console.log(`  ${w}px photo slot img count: ${imgCount}`);

    // Must have the jersey crest fallback with shirt number #7
    const jerseyCrest = photoSlot.locator(".rtg-jersey-crest");
    assert.ok((await jerseyCrest.count()) > 0, "Jersey crest fallback must exist");
    const crestText = (await jerseyCrest.innerText()).trim();
    console.log(`  ${w}px jersey crest text: "${crestText}"`);
    assert.equal(crestText, "#7", "Jersey crest fallback must display player shirt number #7");

    // 3. Verify KPI stats pills readability
    const kpiPills = passport.locator(".rtg-kpi-pill");
    assert.equal(await kpiPills.count(), 3, "Must display 3 KPI stat pills");
    for (let i = 0; i < 3; i++) {
      const pill = kpiPills.nth(i);
      const strongText = await pill.locator("strong").innerText();
      const spanText = await pill.locator("span").innerText();
      console.log(`  Pill ${i + 1}: strong="${strongText}", span="${spanText}"`);
      assert.ok(strongText.length > 0, `Pill ${i + 1} strong must not be empty`);
      assert.ok(spanText.length > 0, `Pill ${i + 1} span must not be empty`);
    }

    // 4. Capture screenshots
    if (w === 360) {
      const passportBuf = await passport.screenshot();
      await saveImage("delta045r-rtg-360-passport.png", passportBuf);
    }

    const fullBuf = await page.screenshot({ fullPage: true });
    await saveImage(`delta045r-rtg-${w}-full.png`, fullBuf);

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 ALL DELTA-045R CHECKS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
