import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const PREVIEW_URL = "https://delta-2028-onc6phcq9-tomaszrybacki-3187s-projects.vercel.app";
const PREVIEW_DOMAIN = "delta-2028-onc6phcq9-tomaszrybacki-3187s-projects.vercel.app";
const VERCEL_BYPASS_TOKEN = "BXoDTakmomkFW9QV4LV7tdinlnoSxM5A";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots", "delta045q");
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
  console.log("=== DELTA-045Q: CAPTURING POLISHED PREVIEW SCREENSHOTS ===");
  console.log(`Target Preview: ${PREVIEW_URL}`);

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const parentAAuth = await getAuthCookies("parentA.test@delta.staging");

  for (const w of [1440, 390, 360]) {
    console.log(`\nCapturing viewport width: ${w}px...`);
    const context = await browser.newContext({
      viewport: { width: w, height: w === 1440 ? 900 : 800 },
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context.addCookies(parentAAuth.playwrightCookies);
    const page = await context.newPage();
    await page.goto(`${PREVIEW_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Verify zero horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  ${w}px overflow: ${overflow}`);
    assert.equal(overflow, false, `Width ${w}px must have zero horizontal overflow`);

    // Verify unified team name
    const bodyText = await page.locator("body").innerText();
    assert.ok(bodyText.includes("DELTA 2018 GM"), "Must display authoritative team name DELTA 2018 GM");
    assert.ok(!bodyText.includes("DELTA 2018 GM — Rocznik 2018"), "Must NOT display redundant cohort suffix");

    // Capture full page
    const fullBuf = await page.screenshot({ fullPage: true });
    await saveImage(`delta045q-rtg-${w}-full.png`, fullBuf);

    // Scroll to team showcase and capture close-up
    const rosterSection = page.locator("#rtg-team-roster");
    assert.ok((await rosterSection.count()) > 0);
    await rosterSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const rosterBuf = await rosterSection.screenshot();
    await saveImage(`delta045q-rtg-${w}-roster.png`, rosterBuf);

    // On mobile, verify DeltaMobileBottomNav stays fixed at bottom during scroll
    if (w <= 640) {
      const bottomNav = page.locator("[data-testid='delta-mobile-bottom-nav']");
      assert.ok((await bottomNav.count()) > 0, "BottomNav must exist on mobile");
      const isVisible = await bottomNav.isVisible();
      assert.equal(isVisible, true, "BottomNav must be visible on mobile");

      // Verify position: fixed
      const position = await bottomNav.evaluate((el) => window.getComputedStyle(el).position);
      assert.equal(position, "fixed", "BottomNav must be position: fixed");

      const boundingBox = await bottomNav.boundingBox();
      console.log(`  ${w}px BottomNav bounding box:`, boundingBox);
      assert.ok(boundingBox !== null && boundingBox.y > 700, "BottomNav must be pinned near bottom of viewport");
    }

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 ALL POLISHED SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
