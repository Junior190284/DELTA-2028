import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const PREVIEW_BASE_URL = "https://delta-2028-29ipahl80-tomaszrybacki-3187s-projects.vercel.app";
const PREVIEW_DOMAIN = "delta-2028-29ipahl80-tomaszrybacki-3187s-projects.vercel.app";
const VERCEL_BYPASS_TOKEN = "BXoDTakmomkFW9QV4LV7tdinlnoSxM5A";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots", "delta045n-preview");
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

  const cookieHeader = Array.from(cookieMap.entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("; ");

  const playwrightCookies = Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: PREVIEW_DOMAIN,
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "Lax" as const,
  }));

  return { cookieHeader, playwrightCookies };
}

async function run() {
  console.log("=== DELTA-045N: VERIFYING LIVE VERCEL PREVIEW DEPLOYMENT ===");
  console.log(`Preview URL: ${PREVIEW_BASE_URL}`);

  const TEAM1_ID = "b57594d3-6f39-4f06-87dc-d8b571e8ffc0"; // DELTA 2018 GM

  // --------------------------------------------------------------------------
  // 1. HTTP API ENDPOINT VERIFICATION ON VERCEL PREVIEW
  // --------------------------------------------------------------------------
  console.log("\n[1] Testing /api/teams/[teamId]/roster HTTP API on Vercel Preview...");

  // 1.1 Anon API call
  const anonApiRes = await fetch(`${PREVIEW_BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
  });
  console.log(`  Anon status: ${anonApiRes.status}`);
  assert.equal(anonApiRes.status, 401, "Anon request to Preview API must return 401");
  console.log("  ✔ Anon rejected with HTTP 401");

  // 1.2 Parent A API call
  const parentAAuth = await getAuthCookies("parentA.test@delta.staging");
  const pAApiRes = await fetch(`${PREVIEW_BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: {
      "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN,
      Cookie: parentAAuth.cookieHeader,
    },
  });
  console.log(`  Parent A status: ${pAApiRes.status}`);
  assert.equal(pAApiRes.status, 200, "Parent A request to Preview API must return 200");
  const pAApiBody = await pAApiRes.json();
  assert.equal(pAApiBody.success, true);
  assert.equal(pAApiBody.players.length, 2, "Parent A must receive 2 players in DELTA 2018 GM");
  console.log(`  ✔ Parent A received ${pAApiBody.players.length} players from Staging:`, pAApiBody.players.map((p: any) => p.displayName));

  // 1.3 Parent B API call (Cross-team unauthorized)
  const parentBAuth = await getAuthCookies("parentB.test@delta.staging");
  const pBApiRes = await fetch(`${PREVIEW_BASE_URL}/api/teams/${TEAM1_ID}/roster`, {
    headers: {
      "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN,
      Cookie: parentBAuth.cookieHeader,
    },
  });
  console.log(`  Parent B status: ${pBApiRes.status}`);
  assert.equal(pBApiRes.status, 403, "Parent B cross-team access must return 403");
  console.log("  ✔ Parent B rejected with HTTP 403 FORBIDDEN");

  // --------------------------------------------------------------------------
  // 2. BROWSER VISUAL & UI CHECKS WITH PLAYWRIGHT
  // --------------------------------------------------------------------------
  console.log("\n[2] Launching Playwright browser for UI verification on Vercel Preview...");
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // 2.1 Road to Glory DEMO on 1440, 390, 360 px
  console.log("\n[2.1] Road to Glory DEMO (/preview/dashboard-ui4/road-to-glory)...");
  for (const w of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width: w, height: w === 1440 ? 900 : 800 },
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    const page = await context.newPage();
    await page.goto(`${PREVIEW_BASE_URL}/preview/dashboard-ui4/road-to-glory`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  DEMO @ ${w}px - overflow: ${overflow}`);
    assert.equal(overflow, false, `DEMO at ${w}px must have zero horizontal overflow`);

    const rosterSection = page.locator("#rtg-team-roster");
    assert.ok(await rosterSection.count() > 0, "Roster section must exist in Road to Glory DEMO");
    await rosterSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const buf = await page.screenshot({ fullPage: false });
    await saveImage(`delta045n-preview-demo-${w}.png`, buf);
    await context.close();
  }

  // 2.2 Road to Glory REAL-DATA Unauthenticated Lock Screen
  console.log("\n[2.2] Road to Glory REAL-DATA Unauthenticated Lock Screen (/preview/dashboard-ui4/real-data?view=road-to-glory)...");
  const unauthContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
  });
  const unauthPage = await unauthContext.newPage();
  await unauthPage.goto(`${PREVIEW_BASE_URL}/preview/dashboard-ui4/real-data?view=road-to-glory`, { waitUntil: "networkidle" });
  await unauthPage.waitForTimeout(500);
  const unauthText = await unauthPage.locator("body").innerText();
  assert.ok(unauthText.includes("Środowisko Izolowane") || unauthText.includes("Wymagana autoryzacja"), "Real-data must require auth");
  const unauthBuf = await unauthPage.screenshot({ fullPage: false });
  await saveImage("delta045n-preview-realdata-unauth-1440.png", unauthBuf);
  await unauthContext.close();

  // 2.3 Team Showcase LIVE with Parent A on Staging (1440, 390, 360 px)
  console.log("\n[2.3] Team Showcase LIVE (/preview/team-showcase) with Parent A...");
  for (const w of [1440, 390, 360]) {
    const context = await browser.newContext({
      viewport: { width: w, height: w === 1440 ? 900 : 800 },
      extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
    });
    await context.addCookies(parentAAuth.playwrightCookies);
    const page = await context.newPage();
    await page.goto(`${PREVIEW_BASE_URL}/preview/team-showcase`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const bodyText = await page.locator("body").innerText();
    assert.ok(bodyText.includes("DELTA 2018 GM"), "Team Showcase LIVE must display DELTA 2018 GM");
    assert.ok(bodyText.includes("Player A"), "Parent A must see their child");
    assert.ok(bodyText.includes("TWÓJ PODOPIECZNY"), "Parent A child must be marked as TWÓJ PODOPIECZNY");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  Team Showcase LIVE Parent A @ ${w}px - overflow: ${overflow}`);
    assert.equal(overflow, false, `Team Showcase at ${w}px must have zero horizontal overflow`);

    const buf = await page.screenshot({ fullPage: false });
    await saveImage(`delta045n-preview-showcase-parentA-${w}.png`, buf);
    await context.close();
  }

  // 2.4 Team Showcase LIVE with Parent B on Staging (Access Blocked)
  console.log("\n[2.4] Team Showcase LIVE (/preview/team-showcase) with Parent B (Access Gate)...");
  const parentBContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
  });
  await parentBContext.addCookies(parentBAuth.playwrightCookies);
  const pBPage = await parentBContext.newPage();
  await pBPage.goto(`${PREVIEW_BASE_URL}/preview/team-showcase`, { waitUntil: "networkidle" });
  await pBPage.waitForTimeout(800);

  const pBText = await pBPage.locator("body").innerText();
  assert.ok(
    pBText.includes("Skład Rzeczywisty Zablokowany") ||
    pBText.includes("LIVE zablokowany") ||
    pBText.includes("Brak przypisania do drużyny") ||
    pBText.includes("Brak uprawnień"),
    "Parent B must be blocked from foreign team"
  );
  console.log("  ✔ Parent B correctly saw security gate on foreign team");
  const pBBuf = await pBPage.screenshot({ fullPage: false });
  await saveImage("delta045n-preview-showcase-parentB-1440.png", pBBuf);
  await parentBContext.close();

  // 2.5 Team Showcase LIVE Anon Access (Login Required)
  console.log("\n[2.5] Team Showcase LIVE Anon Access (Login Required)...");
  const anonShowcaseContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "x-vercel-protection-bypass": VERCEL_BYPASS_TOKEN },
  });
  const anonShowcasePage = await anonShowcaseContext.newPage();
  await anonShowcasePage.goto(`${PREVIEW_BASE_URL}/preview/team-showcase`, { waitUntil: "networkidle" });
  await anonShowcasePage.waitForTimeout(500);
  const anonShowcaseText = await anonShowcasePage.locator("body").innerText();
  assert.ok(anonShowcaseText.includes("Wymagane logowanie rodzica"), "Anon must be prompted to log in");
  console.log("  ✔ Anon correctly saw login required screen");
  const anonShowcaseBuf = await anonShowcasePage.screenshot({ fullPage: false });
  await saveImage("delta045n-preview-showcase-anon-1440.png", anonShowcaseBuf);
  await anonShowcaseContext.close();

  await browser.close();
  console.log("\n🎉 ALL LIVE VERCEL PREVIEW VERIFICATIONS PASSED 100%!");
}

run().catch((err) => {
  console.error("Preview verification failed:", err);
  process.exit(1);
});
