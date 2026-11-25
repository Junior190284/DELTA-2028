import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
function parseEnv(key: string): string {
  const line = envContent.split(/\r?\n/).find((l) => l.trim().startsWith(key + "="));
  if (!line) return "";
  const idx = line.indexOf("=");
  return line.slice(idx + 1).trim();
}

const supabaseUrl = parseEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = parseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || parseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

async function test() {
  console.log("Signing in Parent A via @supabase/ssr...");
  const cookieMap = new Map<string, string>();
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value }) => cookieMap.set(name, value)),
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: "parentA.test@delta.staging",
    password: "TestPassword123!",
  });

  if (error || !data.session) {
    throw new Error(`Sign in failed: ${error?.message}`);
  }
  console.log("Parent A signed in successfully!");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const cookies = Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
  await context.addCookies(cookies);

  const page = await context.newPage();
  console.log("Navigating to real-data Road to Glory...");
  await page.goto("http://localhost:3015/preview/dashboard-ui4/real-data?view=road-to-glory", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const bannerText = await page.locator("body").innerText();
  const isAuth = bannerText.includes("Real Data P1/P2") && bannerText.includes("PARENT");
  const rosterHead = page.locator("#rtg-team-roster");
  const rosterCount = await rosterHead.count();
  const rosterText = rosterCount > 0 ? await rosterHead.innerText() : "NOT_FOUND";

  console.log("Is Authenticated in UI:", isAuth);
  console.log("Roster section present:", rosterCount > 0);
  console.log("Roster section preview:\n", rosterText.slice(0, 300));

  await browser.close();
}

test().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
