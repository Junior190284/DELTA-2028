const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.resolve(__dirname, "..", ".artifacts", "screenshots");
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
const getArtifactPath = (filename) => path.join(ARTIFACTS_DIR, filename);

(async () => {
  console.log("=== STARTING FULL PACK OPENING VERIFICATION ===");
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch (e) {
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
    }
  }

  // 1. DESKTOP RUN (1280 x 800)
  console.log("\n--- TEST 1: DESKTOP (1280x800) ---");
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktopPage.goto("http://localhost:3000/dev/pack-opening", { waitUntil: "networkidle" });

  const infernoBtn = desktopPage.locator("button:has-text('Uruchom Test Otwarcia')").first();
  await infernoBtn.click();

  // 1 Second Screenshot & Metrics
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: getArtifactPath("checkpoint_inferno_1s.png") });

  const metrics1s = await desktopPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const crestImg = dialog?.querySelector('img[src*="/teamlogos/gm.png"]');
    const crestRect = crestImg ? crestImg.getBoundingClientRect() : null;
    const crestStyle = crestImg ? window.getComputedStyle(crestImg) : null;
    const header = dialog?.querySelector('div.relative.z-30') || dialog?.firstElementChild;
    const headerRect = header ? header.getBoundingClientRect() : null;
    const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;

    return {
      crestWidth: crestRect?.width,
      crestHeight: crestRect?.height,
      crestNaturalWidth: crestImg?.naturalWidth,
      crestNaturalHeight: crestImg?.naturalHeight,
      crestComputedWidth: crestStyle?.width,
      crestComputedHeight: crestStyle?.height,
      crestMaxWidth: crestStyle?.maxWidth,
      crestMaxHeight: crestStyle?.maxHeight,
      headerHeight: headerRect?.height,
      hasHorizontalScroll,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  console.log("Desktop 1s Metrics:", JSON.stringify(metrics1s, null, 2));

  // 3 Seconds Screenshot
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: getArtifactPath("checkpoint_inferno_3s.png") });

  // 6 Seconds Screenshot
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ path: getArtifactPath("checkpoint_inferno_6s.png") });

  // Test Skip Button
  console.log("Testing Skip Button on Desktop...");
  const skipBtn = desktopPage.locator("button:has-text('Pomiń')").first();
  if (await skipBtn.isVisible()) {
    await skipBtn.click({ force: true });
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: getArtifactPath("checkpoint_inferno_skip.png") });
    console.log("Skip button clicked successfully! Captured checkpoint_inferno_skip.png in .artifacts/screenshots/");
  }

  // Test Close Button
  console.log("Testing Close Button on Desktop...");
  const closeBtn = desktopPage.locator("button[aria-label='Zamknij']").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click({ force: true });
    await desktopPage.waitForTimeout(500);
    const dialogClosed = (await desktopPage.locator('[role="dialog"]').count()) === 0;
    console.log("Close button clicked! Dialog closed:", dialogClosed);
  }
  await desktopPage.close();

  // 2. MOBILE RUN (390 x 844 - iPhone 14 / Pixel 7)
  console.log("\n--- TEST 2: MOBILE VIEWPORT (390x844) ---");
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto("http://localhost:3000/dev/pack-opening", { waitUntil: "networkidle" });

  const mobileInfernoBtn = mobilePage.locator("button:has-text('Uruchom Test Otwarcia')").first();
  await mobileInfernoBtn.click();

  // Mobile 1s
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: getArtifactPath("checkpoint_inferno_mobile_1s.png") });

  const mobileMetrics = await mobilePage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const crestImg = dialog?.querySelector('img[src*="/teamlogos/gm.png"]');
    const crestRect = crestImg ? crestImg.getBoundingClientRect() : null;
    const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;

    return {
      crestWidth: crestRect?.width,
      crestHeight: crestRect?.height,
      hasHorizontalScroll,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  console.log("Mobile 1s Metrics:", JSON.stringify(mobileMetrics, null, 2));

  // Mobile 3s
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: getArtifactPath("checkpoint_inferno_mobile_3s.png") });

  // Mobile 6s
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: getArtifactPath("checkpoint_inferno_mobile_6s.png") });

  // Test Mobile Skip
  const mobileSkipBtn = mobilePage.locator("button:has-text('Pomiń')").first();
  if (await mobileSkipBtn.isVisible()) {
    await mobileSkipBtn.click({ force: true });
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: getArtifactPath("checkpoint_inferno_mobile_skip.png") });
    console.log("Mobile skip clicked! Captured checkpoint_inferno_mobile_skip.png in .artifacts/screenshots/");
  }

  // Test Mobile Close
  const mobileCloseBtn = mobilePage.locator("button[aria-label='Zamknij']").first();
  if (await mobileCloseBtn.isVisible()) {
    await mobileCloseBtn.click({ force: true });
    await mobilePage.waitForTimeout(500);
    const mobileDialogClosed = (await mobilePage.locator('[role="dialog"]').count()) === 0;
    console.log("Mobile close clicked! Dialog closed:", mobileDialogClosed);
  }
  await mobilePage.close();

  await browser.close();
  console.log("\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ===");
})();
