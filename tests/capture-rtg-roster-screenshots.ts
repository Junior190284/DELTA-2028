import { chromium } from "playwright";
import path from "node:path";

const ARTIFACT_DIR = "C:\\Users\\tomas\\.gemini\\antigravity\\brain\\2fbf42b8-e0dc-44a8-9e00-27c9753d6eef";
const TARGET_URL = "http://localhost:3015/preview/dashboard-ui4/road-to-glory";

async function capture() {
  console.log("Launching Chromium (msedge channel) for visual screenshots...");
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  const viewports = [
    { width: 1440, height: 900, name: "delta045l-rtg-roster-1440.png" },
    { width: 390, height: 844, name: "delta045l-rtg-roster-390.png" },
    { width: 360, height: 740, name: "delta045l-rtg-roster-360.png" },
  ];

  for (const vp of viewports) {
    console.log(`Navigating at viewport ${vp.width}x${vp.height}...`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(TARGET_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Scroll to #rtg-team-roster
    const rosterSection = page.locator("#rtg-team-roster");
    if (await rosterSection.count() > 0) {
      await rosterSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    // Check horizontal scroll / overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`Viewport ${vp.width}px - horizontal overflow detected: ${hasHorizontalOverflow}`);

    const savePath = path.join(ARTIFACT_DIR, vp.name);
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`Saved screenshot: ${savePath}`);
    await page.close();
  }

  await browser.close();
  console.log("Screenshot capture complete!");
}

capture().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
