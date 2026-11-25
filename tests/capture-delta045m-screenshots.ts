import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const PROJECT_DIR = path.resolve(process.cwd(), "screenshots", "delta045m");
const ARTIFACT_DIR = "C:\\Users\\tomas\\.gemini\\antigravity\\brain\\2fbf42b8-e0dc-44a8-9e00-27c9753d6eef";

fs.mkdirSync(PROJECT_DIR, { recursive: true });

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
  const projPath = path.join(PROJECT_DIR, name);
  const artPath = path.join(ARTIFACT_DIR, name);
  fs.writeFileSync(projPath, buffer);
  fs.writeFileSync(artPath, buffer);
  console.log(`  Saved: ${name} -> [${projPath}] & [${artPath}]`);
}

async function run() {
  console.log("=== DELTA-045M: CAPTURING PREMIUM VISUAL SCREENSHOTS ===");
  console.log(`Target project directory: ${PROJECT_DIR}`);
  console.log(`Target artifact directory: ${ARTIFACT_DIR}`);

  // 1. Get Supabase SSR cookies for Parent A
  console.log("\n[1] Authenticating Parent A on Supabase Staging...");
  const cookieMap = new Map<string, string>();
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value }) => cookieMap.set(name, value)),
    },
  });

  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: "parentA.test@delta.staging",
    password: "TestPassword123!",
  });
  if (authError || !authData.session) {
    throw new Error(`Failed to sign in Parent A: ${authError?.message}`);
  }
  console.log("  ✔ Parent A authenticated successfully");

  const parentCookies = Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));

  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // 2. DEMO Road to Glory screenshots
  console.log("\n[2] Capturing DEMO Road to Glory (/preview/dashboard-ui4/road-to-glory)...");
  const demoViewports = [
    { width: 1440, height: 900, label: "1440" },
    { width: 390, height: 844, label: "390" },
    { width: 360, height: 740, label: "360" },
  ];

  for (const vp of demoViewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto("http://localhost:3015/preview/dashboard-ui4/road-to-glory", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // Check overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  DEMO @ ${vp.width}px - horizontal overflow: ${overflow}`);

    // Full page screenshot
    const fullBuffer = await page.screenshot({ fullPage: true });
    await saveImage(`delta045m-demo-${vp.label}-full.png`, fullBuffer);

    // Carousel close-up
    const rosterSection = page.locator("#rtg-team-roster");
    if (await rosterSection.count() > 0) {
      await rosterSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const carouselBuffer = await rosterSection.screenshot();
      await saveImage(`delta045m-demo-${vp.label}-carousel.png`, carouselBuffer);
    }
    await page.close();
  }

  // 3. REAL-DATA Road to Glory screenshots (Authenticated as Parent A)
  console.log("\n[3] Capturing REAL-DATA Road to Glory (/preview/dashboard-ui4/real-data?view=road-to-glory)...");
  const realViewports = [
    { width: 1440, height: 900, label: "1440" },
    { width: 390, height: 844, label: "390" },
    { width: 360, height: 740, label: "360" },
  ];

  for (const vp of realViewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addCookies(parentCookies);
    const page = await context.newPage();
    await page.goto("http://localhost:3015/preview/dashboard-ui4/real-data?view=road-to-glory", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`  REAL-DATA @ ${vp.width}px - horizontal overflow: ${overflow}`);

    // Full page
    const fullBuffer = await page.screenshot({ fullPage: true });
    await saveImage(`delta045m-realdata-${vp.label}-full.png`, fullBuffer);

    // Carousel close-up
    const rosterSection = page.locator("#rtg-team-roster");
    if (await rosterSection.count() > 0) {
      await rosterSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const carouselBuffer = await rosterSection.screenshot();
      await saveImage(`delta045m-realdata-${vp.label}-carousel.png`, carouselBuffer);
    }
    await context.close();
  }

  // 4. REAL-DATA Unauthenticated Lock Screen
  console.log("\n[4] Capturing REAL-DATA Unauthenticated Lock Screen (Zero demo leak)...");
  const unauthContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const unauthPage = await unauthContext.newPage();
  await unauthPage.goto("http://localhost:3015/preview/dashboard-ui4/real-data?view=road-to-glory", { waitUntil: "networkidle" });
  await unauthPage.waitForTimeout(500);
  const unauthBuffer = await unauthPage.screenshot({ fullPage: false });
  await saveImage("delta045m-realdata-unauth-1440.png", unauthBuffer);
  await unauthContext.close();

  await browser.close();
  console.log("\n🎉 ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
