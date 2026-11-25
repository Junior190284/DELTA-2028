import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.DELTA_QA_BASE_URL || "http://127.0.0.1:3100";
const artifacts = path.join(process.cwd(), ".artifacts", "DELTA-046");
await fs.mkdir(artifacts, { recursive: true });

const systemBrowsers = [
  process.env.DELTA_QA_BROWSER,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
let executablePath;
for (const candidate of systemBrowsers) {
  try {
    await fs.access(candidate);
    executablePath = candidate;
    break;
  } catch {}
}

const browser = await chromium.launch({ headless: true, executablePath });
const results = [];

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  assert.ok(geometry.page <= geometry.viewport + 1, `${label}: horizontal overflow ${geometry.page}px > ${geometry.viewport}px`);
  return geometry;
}

async function warmLazyContent(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function publicExperience(width, height, filename) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const started = Date.now();
  const response = await page.goto(`${baseURL}/preview/public-experience`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await page.getByRole("heading", { name: /NASTĘPNY GWIZDEK/ }).waitFor();
  assert.equal(await page.getByText("DEMO PREVIEW").count(), 1);
  const geometry = await assertNoHorizontalOverflow(page, `public-${width}`);

  if (width <= 760) {
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("navigation", { name: "Mobilna nawigacja" }).getByText("Kalendarz").waitFor();
    await page.getByRole("button", { name: "Zamknij menu" }).click();
  } else {
    await page.getByRole("button", { name: "ZOBACZ INTRO" }).click();
    const video = page.locator("video");
    await video.waitFor();
    assert.equal(await video.getAttribute("controls"), "");
    await page.keyboard.press("Escape");
  }

  await warmLazyContent(page);
  await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
  results.push({ route: "public", width, loadMs: Date.now() - started, ...geometry });
  await context.close();
}

async function showcase(width, height, filename) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const response = await page.goto(`${baseURL}/preview/dashboard-ui4/road-to-glory`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await page.getByTestId("team-showcase-2").waitFor();
  const geometry = await assertNoHorizontalOverflow(page, `showcase-${width}`);
  const separation = await page.locator(".ts2-card.is-active").evaluate((card) => {
    const media = card.querySelector(".ts2-card-media")?.getBoundingClientRect();
    const identity = card.querySelector(".ts2-card-identity")?.getBoundingClientRect();
    if (!media || !identity) return null;
    return {
      mediaBottom: media.bottom,
      identityTop: identity.top,
      identityHeight: identity.height,
      overflow: getComputedStyle(card.querySelector(".ts2-card-media")).overflow,
    };
  });
  assert.ok(separation, "active showcase card geometry is available");
  assert.ok(separation.mediaBottom <= separation.identityTop + 1, "player media does not overlap the identity zone");
  const expectedIdentityHeight = width <= 700 ? 74 : 84;
  assert.ok(
    separation.identityHeight >= expectedIdentityHeight,
    `identity zone preserves its ${expectedIdentityHeight}px minimum height (actual ${separation.identityHeight}px)`,
  );
  assert.equal(separation.overflow, "hidden");
  const cardCount = await page.locator(".ts2-card").count();
  if (cardCount === 1) {
    assert.equal(await page.locator(".ts2-controls").count(), 0, "single-player carousel hides controls");
  } else {
    await page.getByTestId("team-showcase-counter").waitFor();
  }

  await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
  results.push({ route: "showcase", width, cardCount, ...geometry, separation });
  await context.close();
}

try {
  await publicExperience(1440, 1000, "public-desktop-1440.png");
  await publicExperience(390, 844, "public-mobile-390.png");
  await showcase(1440, 1000, "showcase-desktop-1440.png");
  await showcase(390, 844, "showcase-mobile-390.png");
  console.log(JSON.stringify({ ok: true, artifacts, results }, null, 2));
} finally {
  await browser.close();
}
