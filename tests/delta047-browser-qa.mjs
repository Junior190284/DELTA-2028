import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.DELTA_QA_BASE_URL || "http://127.0.0.1:3100";
const artifacts = path.join(process.cwd(), ".artifacts", "DELTA-047");
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

async function warmLazyContent(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(500, window.innerHeight * 0.8)) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

async function runViewport(width, height, filename) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", colorScheme: "dark" });
  const page = await context.newPage();
  const response = await page.goto(`${baseURL}/preview/public-experience`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  await page.getByRole("heading", { name: /NASTĘPNY GWIZDEK/ }).waitFor();
  await warmLazyContent(page);

  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  assert.ok(geometry.page <= geometry.viewport + 1, `horizontal overflow at ${width}px`);

  const matchCard = page.locator('[class*="matchCard"]').first();
  await matchCard.getByText("GÓRNY MOKOTÓW", { exact: true }).waitFor();
  await matchCard.getByText("WILANÓW", { exact: true }).waitFor();

  const featureCards = page.locator('[data-feature]');
  assert.equal(await featureCards.count(), 9);
  await page.getByText("DLA ZAWODNIKA", { exact: true }).first().waitFor();
  await page.getByText("DLA RODZICA", { exact: true }).waitFor();
  await page.getByText("DLA DRUŻYNY", { exact: true }).first().waitFor();

  const imageState = await featureCards.locator("img").evaluateAll((images) => images.map((image) => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
  })));
  assert.equal(imageState.length, 9);
  assert.ok(imageState.every((image) => image.complete && image.naturalWidth > 0), "all feature artwork must load");

  await page.screenshot({ path: path.join(artifacts, filename), fullPage: true });
  results.push({ width, ...geometry, featureImages: imageState.length });
  await context.close();
}

try {
  await runViewport(1440, 1000, "public-premium-desktop-1440.png");
  await runViewport(1028, 900, "public-premium-tablet-1028.png");
  await runViewport(390, 844, "public-premium-mobile-390.png");
  console.log(JSON.stringify({ ok: true, artifacts, results }, null, 2));
} finally {
  await browser.close();
}
