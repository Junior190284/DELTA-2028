import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.DELTA_QA_BASE_URL || "http://127.0.0.1:3100";
const artifacts = path.join(process.cwd(), ".artifacts", "DELTA-048");
await fs.mkdir(artifacts, { recursive: true });

const candidates = [
  process.env.DELTA_QA_BROWSER,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
let executablePath;
for (const candidate of candidates) {
  try {
    await fs.access(candidate);
    executablePath = candidate;
    break;
  } catch {}
}

const browser = await chromium.launch({ headless: true, executablePath });
const results = [];

async function runViewport(width, height, filename) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", colorScheme: "dark" });
  const page = await context.newPage();
  const response = await page.goto(`${baseURL}/preview/dashboard-ui4/football`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert.equal(response?.status(), 200);
  await page.locator(".delta-app-shell").waitFor({ state: "visible" });
  await page.locator(".delta-match-card").waitFor({ state: "visible" });

  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  assert.ok(geometry.page <= geometry.viewport + 1, `horizontal overflow at ${width}px`);

  const visual = await page.evaluate(() => {
    const shell = document.querySelector(".delta-app-shell");
    const card = document.querySelector(".delta-match-card");
    const main = document.querySelector(".v8-main");
    if (!shell || !card || !main) return null;
    const shellStyle = getComputedStyle(shell);
    const cardStyle = getComputedStyle(card);
    const mainStyle = getComputedStyle(main);
    return {
      shellBackground: shellStyle.backgroundImage,
      cardBorder: cardStyle.borderColor,
      mainMarginLeft: mainStyle.marginLeft,
      mainWidth: main.getBoundingClientRect().width,
    };
  });
  assert.ok(visual, "football dashboard elements should render");
  assert.match(visual.shellBackground, /dashboard-football-command-v1\.webp/);
  assert.equal(visual.mainMarginLeft, "0px");
  assert.ok(visual.mainWidth > Math.min(320, width * 0.55));

  await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
  results.push({ width, ...geometry, visual });
  await context.close();
}

try {
  await runViewport(1440, 1000, "dashboard-football-desktop-1440.png");
  await runViewport(1028, 900, "dashboard-football-tablet-1028.png");
  await runViewport(390, 844, "dashboard-football-mobile-390.png");
  console.log(JSON.stringify({ ok: true, artifacts, results }, null, 2));
} finally {
  await browser.close();
}
