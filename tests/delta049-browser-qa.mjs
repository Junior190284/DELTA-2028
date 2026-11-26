import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.DELTA_QA_BASE_URL || "http://127.0.0.1:3100";
const artifacts = path.join(process.cwd(), ".artifacts", "DELTA-049");
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

async function openRoster(page) {
  const response = await page.goto(`${baseURL}/preview/dashboard-ui4/football`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  assert.equal(response?.status(), 200);
  await page.locator(".delta-app-shell").waitFor({ state: "visible" });
  const rosterButton = page.locator("button", { hasText: "Skład Drużyny" }).first();
  await rosterButton.waitFor({ state: "attached" });
  await rosterButton.evaluate((element) => element.click());
  await page.locator(".v205-team-hero").waitFor({ state: "visible" });
}

async function runViewport(width, height, filename) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await openRoster(page);

  const geometry = await page.evaluate(() => {
    const hero = document.querySelector(".v205-team-hero");
    const crest = document.querySelector(".v205-team-hero .v871-team-crest");
    const players = document.querySelector(".v205-team-hero .v108-team-players");
    const banner = document.querySelector(".v205-team-active .delta-sticky-live-bar");
    const showcase = document.querySelector(".v871-team-page > .v119-showcase");
    if (!hero || !crest || !players || !showcase) return null;
    const heroBox = hero.getBoundingClientRect();
    const crestBox = crest.getBoundingClientRect();
    const playerBox = players.getBoundingClientRect();
    const bannerBox = banner?.getBoundingClientRect();
    const showcaseBox = showcase.getBoundingClientRect();
    return {
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      hero: { top: heroBox.top, bottom: heroBox.bottom, height: heroBox.height },
      crest: { top: crestBox.top, left: crestBox.left, right: crestBox.right, bottom: crestBox.bottom },
      players: { top: playerBox.top, bottom: playerBox.bottom, width: playerBox.width },
      banner: bannerBox ? { top: bannerBox.top, bottom: bannerBox.bottom, position: getComputedStyle(banner).position } : null,
      showcase: { top: showcaseBox.top },
      heroBackground: getComputedStyle(hero).backgroundImage,
    };
  });

  assert.ok(geometry, "roster composition should render");
  assert.ok(geometry.page <= geometry.viewport + 1, `horizontal overflow at ${width}px`);
  assert.match(geometry.heroBackground, /dashboard-football-command-v1\.webp/);
  assert.ok(geometry.crest.top >= geometry.hero.top - 1, "crest top should stay inside hero");
  assert.ok(geometry.crest.bottom <= geometry.hero.bottom + 1, "crest bottom should stay inside hero");
  assert.ok(geometry.showcase.top > geometry.hero.bottom, "showcase should follow the hero");
  assert.ok(geometry.players.width > 190, "team artwork should remain visually present");
  if (geometry.banner) {
    assert.equal(geometry.banner.position, "relative");
    assert.ok(geometry.banner.bottom <= geometry.hero.top + 1, "live banner must not overlap the roster hero");
  }

  await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
  results.push({ width, ...geometry });
  await context.close();
}

try {
  await runViewport(1440, 1000, "team-roster-desktop-1440.png");
  await runViewport(1028, 900, "team-roster-tablet-1028.png");
  await runViewport(390, 844, "team-roster-mobile-390.png");
  console.log(JSON.stringify({ ok: true, artifacts, results }, null, 2));
} finally {
  await browser.close();
}
