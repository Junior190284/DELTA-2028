const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.resolve(__dirname, "..", ".artifacts", "screenshots");
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
const getArtifactPath = (filename) => path.join(ARTIFACTS_DIR, filename);

(async () => {
  console.log("Launching browser...");
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

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  console.log("Navigating to http://localhost:3000/dev/pack-opening...");
  await page.goto("http://localhost:3000/dev/pack-opening", { waitUntil: "networkidle" });

  console.log("Taking screenshot of /dev/pack-opening page...");
  await page.screenshot({ path: getArtifactPath("checkpoint_repro_dev_page.png") });

  console.log("Looking for INFERNO CLIMAX button...");
  // Find button for INFERNO CLIMAX
  const infernoButton = page.locator("button:has-text('Uruchom Test Otwarcia')").first();
  await infernoButton.click();

  console.log("Clicked! Waiting 1s...");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: getArtifactPath("checkpoint_repro_1s.png") });

  // Inspect the rendered DOM & styles
  const inspection = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { error: "No dialog found" };

    const imgs = Array.from(dialog.querySelectorAll("img")).map(img => {
      const rect = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      return {
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        offsetWidth: img.offsetWidth,
        offsetHeight: img.offsetHeight,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        computedWidth: style.width,
        computedHeight: style.height,
        maxWidth: style.maxWidth,
        maxHeight: style.maxHeight,
        className: img.className,
        parentTag: img.parentElement?.tagName,
        parentClass: img.parentElement?.className,
        parentRect: img.parentElement?.getBoundingClientRect()
      };
    });

    const header = dialog.querySelector("div.relative.z-30") || dialog.firstElementChild;
    const headerStyle = header ? window.getComputedStyle(header) : null;
    const headerRect = header ? header.getBoundingClientRect() : null;

    return {
      dialogClasses: dialog.className,
      headerRect,
      headerComputedHeight: headerStyle?.height,
      imgs
    };
  });

  console.log("DOM Inspection:", JSON.stringify(inspection, null, 2));

  await page.waitForTimeout(2000);
  await page.screenshot({ path: getArtifactPath("checkpoint_repro_3s.png") });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: getArtifactPath("checkpoint_repro_6s.png") });

  await browser.close();
  console.log("Reproduction script finished.");
})();
