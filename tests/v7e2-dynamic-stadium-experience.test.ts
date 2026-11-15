import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7E.2 Stadium Experience Assets — Original PNGs and optimized WebP exist", () => {
  const assetsDir = path.join(rootDir, "public/assets/stadium-experience");
  assert.ok(fs.existsSync(assetsDir), "stadium-experience directory must exist");

  const requiredPngs = [
    "stadium_debiutant.png",
    "stadium_mlody_talent.png",
    "player_red_uniform_transparent.png"
  ];

  for (const png of requiredPngs) {
    const fullPath = path.join(assetsDir, png);
    assert.ok(fs.existsSync(fullPath), `Asset ${png} must exist`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 100000, `Asset ${png} must be non-empty valid graphic`);
  }

  const requiredWebps = [
    "stadium_debiutant.webp",
    "stadium_mlody_talent.webp",
    "player_red_uniform_transparent.webp"
  ];

  for (const webp of requiredWebps) {
    const fullPath = path.join(assetsDir, webp);
    assert.ok(fs.existsSync(fullPath), `Optimized WebP asset ${webp} must exist`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 10000, `WebP asset ${webp} must be non-empty`);
  }
});

test("V7E.2 DynamicStadiumExperience Component — Architecture and Stadium Variants", () => {
  const compPath = path.join(rootDir, "components/player/DynamicStadiumExperience.tsx");
  assert.ok(fs.existsSync(compPath), "DynamicStadiumExperience.tsx must exist");

  const code = fs.readFileSync(compPath, "utf8");

  // Exported component and configurations
  assert.ok(
    code.includes("export function DynamicStadiumExperience") || code.includes("export default DynamicStadiumExperience"),
    "Must export DynamicStadiumExperience"
  );
  assert.ok(
    code.includes("STADIUM_CONFIGS"),
    "Must define STADIUM_CONFIGS dictionary"
  );

  // Both variants: DEBIUTANT and MŁODY TALENT
  assert.ok(
    code.includes("debiutant:") && code.includes("mlody_talent:"),
    "Must configure both 'debiutant' and 'mlody_talent' variants"
  );
  assert.ok(
    code.includes("stadium_debiutant.png") && code.includes("stadium_mlody_talent.png"),
    "Must reference official stadium background assets"
  );

  // Real attendance XP milestones
  assert.ok(
    code.includes("+40 XP") && code.includes("+60 XP"),
    "Must strictly reflect real attendance XP (+40 trening, +60 mecz)"
  );
});

test("V7E.2 Player Layer & Dynamic Shirt Number", () => {
  const compCode = fs.readFileSync(path.join(rootDir, "components/player/DynamicStadiumExperience.tsx"), "utf8");

  // Dedicated player PNG cutout
  assert.ok(
    compCode.includes("player_red_uniform_transparent"),
    "Must use player_red_uniform_transparent asset for athletic figure"
  );

  // Dynamic shirt number derived from player.shirt_number
  assert.ok(
    compCode.includes("player.shirt_number"),
    "Must derive shirt number dynamically from player data"
  );
  assert.ok(
    compCode.includes("v7e2-jersey-dynamic-num") || compCode.includes("v7e2-dynamic-shirt-num"),
    "Must render dynamic jersey shirt number layer"
  );
});

test("V7E.2 Demo Switcher & 'MOJA DROGA DO MISTRZOSTWA' Button Integration", () => {
  const expPath = path.join(rootDir, "components/player/PlayerExperience3D.tsx");
  const expCode = fs.readFileSync(expPath, "utf8");

  // Integration of DynamicStadiumExperience
  assert.ok(
    expCode.includes("DynamicStadiumExperience"),
    "PlayerExperience3D must integrate DynamicStadiumExperience"
  );

  // Interactive Demo Switcher in Hero
  assert.ok(
    expCode.includes("v7e2-hero-switcher"),
    "Hero must feature stadium switcher .v7e2-hero-switcher"
  );
  assert.ok(
    expCode.includes("DEBIUTANT") && expCode.includes("MŁODY TALENT"),
    "Switcher must feature DEBIUTANT and MŁODY TALENT options"
  );

  // Road to mastery button
  assert.ok(
    expCode.includes("v7e2-btn-road-to-mastery") && expCode.includes("MOJA DROGA DO MISTRZOSTWA"),
    "Hero must feature prominent 'MOJA DROGA DO MISTRZOSTWA' button"
  );

  // Dynamic stadium background layer in Hero
  assert.ok(
    expCode.includes("v7e2-hero-stadium-bg"),
    "Hero must contain dynamic stadium background layer .v7e2-hero-stadium-bg"
  );
});

test("V7E.2 CSS Styling, Animations and Accessibility", () => {
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");
  const cssCode = fs.readFileSync(cssPath, "utf8");

  // Styles defined
  assert.ok(cssCode.includes(".v7e2-fullscreen-overlay"), "CSS must style .v7e2-fullscreen-overlay");
  assert.ok(cssCode.includes(".v7e2-btn-road-to-mastery"), "CSS must style .v7e2-btn-road-to-mastery");
  assert.ok(cssCode.includes(".v7e2-hero-stadium-bg"), "CSS must style .v7e2-hero-stadium-bg");
  assert.ok(cssCode.includes(".v7e2-athlete-stage"), "CSS must style .v7e2-athlete-stage");

  // Lightweight entrance animation
  assert.ok(
    cssCode.includes("@keyframes v7e2PlayerEntrance"),
    "CSS must define @keyframes v7e2PlayerEntrance for smooth reveal"
  );

  // Reduced motion support
  assert.ok(
    cssCode.includes("@media (prefers-reduced-motion: reduce)"),
    "CSS must support prefers-reduced-motion"
  );

  // Responsive breakpoints
  assert.ok(cssCode.includes("@media (min-width: 1920px)"), "Must support 1920px");
  assert.ok(cssCode.includes("@media (max-width: 1024px)"), "Must support 1024px");
  assert.ok(cssCode.includes("@media (max-width: 768px)"), "Must support 768px");
  assert.ok(cssCode.includes("@media (max-width: 480px)"), "Must support 390px mobile");
  assert.ok(cssCode.includes("@media (max-width: 360px)"), "Must support 320px mobile");
});

test("V7E.3 Stadium Visual Polish — Jersey Back Number, Subdued Watermark, and Athlete Glow", () => {
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");
  const compPath = path.join(rootDir, "components/player/DynamicStadiumExperience.tsx");

  const cssCode = fs.readFileSync(cssPath, "utf8");
  const compCode = fs.readFileSync(compPath, "utf8");

  // 1. Jersey back number position (moved up from hips ~42% to back ~29.5%)
  assert.ok(
    cssCode.includes("top: 29.5%"),
    "Jersey number must be positioned on the upper back (top: 29.5%)"
  );
  assert.ok(
    compCode.includes("single-digit") && compCode.includes("double-digit"),
    "DynamicStadiumExperience must support tailored styling for single and double digit shirt numbers"
  );
  assert.ok(
    compCode.includes("rawShirtNumber ?"),
    "When player has no shirt number, number on jersey must be safely omitted"
  );

  // 2. Subdued background watermark (reduced size and opacity)
  assert.ok(
    cssCode.includes("opacity: 0.035"),
    "Watermark number opacity must be reduced to ~0.035 to avoid competing with athlete"
  );

  // 3. Athlete lighting & golden stadium rim glow
  assert.ok(
    cssCode.includes("brightness(1.12)") || cssCode.includes("brightness(1.1)"),
    "Athlete image must be subtly brightened"
  );
  assert.ok(
    cssCode.includes("rgba(246, 201, 82,"),
    "Athlete and pedestal must feature golden stadium rim lighting"
  );
});

