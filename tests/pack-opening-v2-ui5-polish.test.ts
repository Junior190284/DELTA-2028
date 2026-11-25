import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getRarityPresentation,
  normalizeCanonicalRarity
} from "../lib/cards/rarityPresentation.ts";
import { normalizeCardTheme } from "../lib/cards/walkout-config.ts";

test("UI.5.1 Rarity presentation distinguishes Common, Rare, Epic, Legendary, and Inferno monotonically", () => {
  const common = getRarityPresentation("common");
  const rare = getRarityPresentation("rare");
  const epic = getRarityPresentation("epic");
  const legendary = getRarityPresentation("legendary");
  const inferno = getRarityPresentation("inferno");

  assert.equal(common.intensityLevel, 1);
  assert.equal(rare.intensityLevel, 2);
  assert.equal(epic.intensityLevel, 3);
  assert.equal(legendary.intensityLevel, 4);
  assert.equal(inferno.intensityLevel, 5);

  // Distinct kickers & colors
  const kickers = new Set([
    common.walkoutKicker,
    rare.walkoutKicker,
    epic.walkoutKicker,
    legendary.walkoutKicker,
    inferno.walkoutKicker
  ]);
  assert.equal(kickers.size, 5, "All 5 rarities must have unique pre-walkout dramaturgy kickers");

  // Behavior per tier
  assert.equal(common.enableParticles, false);
  assert.equal(common.enableShockwave, false);
  assert.equal(common.enableFlash, false);
  assert.equal(common.enableScreenShake, false);

  assert.equal(rare.enableParticles, true);
  assert.equal(rare.enableShockwave, true);
  assert.equal(rare.enableFlash, false);

  assert.equal(epic.stageParticlesTheme, "epic");
  assert.equal(epic.enableFlash, true);
  assert.equal(epic.enableScreenShake, false);

  assert.equal(legendary.stageParticlesTheme, "gold");
  assert.equal(legendary.enableScreenShake, true);

  assert.equal(inferno.stageParticlesTheme, "inferno");
  assert.equal(inferno.enableScreenShake, true);

  assert.equal(normalizeCanonicalRarity("LEGEND"), "legendary");
  assert.equal(normalizeCanonicalRarity("unknown"), "common");
  assert.equal(normalizeCardTheme("legend"), "DELTA_ICON");
});

test("UI.5.2 Stage3DEngine, stage.css, and CanvasParticles implement rarity lighting, mobile throttling, and reduced-motion", () => {
  const stageCode = fs.readFileSync(
    path.resolve(process.cwd(), "components/collection-3d/Stage3DEngine.tsx"),
    "utf8"
  );
  const stageCss = fs.readFileSync(
    path.resolve(process.cwd(), "components/collection-3d/stage.css"),
    "utf8"
  );
  const particlesCode = fs.readFileSync(
    path.resolve(process.cwd(), "components/CanvasParticles.tsx"),
    "utf8"
  );

  assert.match(stageCode, /data-rarity=\{rarityProfile\.tier\}/);
  assert.match(stageCode, /universal-stage-corona/);
  assert.match(stageCode, /reducedMotion=\{reducedMotion\}[\s\S]*isMobile=\{isMobile\}/s);
  assert.match(stageCode, /!rarity \|\| rarityProfile\.enableParticles/);

  for (const tier of ["common", "rare", "epic", "legendary", "inferno"]) {
    assert.match(stageCss, new RegExp(`data-rarity="${tier}"`));
  }
  assert.match(stageCss, /is-reduced-motion/);
  assert.match(stageCss, /@media \(prefers-reduced-motion: reduce\)/);

  assert.match(particlesCode, /theme === "common"/);
  assert.match(particlesCode, /reducedMotion \|\| mqReduce/);
  assert.match(particlesCode, /theme === "epic"/);
  assert.match(particlesCode, /minFrameMs = isMobile \? 32 : 0/);
});

test("UI.5.3 Card3DEngine and collection-3d.css polish specular glare, legibility, interactive drag, and mobile ember limits", () => {
  const cardCode = fs.readFileSync(
    path.resolve(process.cwd(), "components/collection-3d/Card3DEngine.tsx"),
    "utf8"
  );
  const cardCss = fs.readFileSync(
    path.resolve(process.cwd(), "components/collection-3d/collection-3d.css"),
    "utf8"
  );

  assert.match(cardCode, /--glare-x/);
  assert.match(cardCode, /--glare-y/);
  assert.match(cardCode, /--glare-opacity/);
  assert.match(cardCode, /inferno-specular-glare/);
  assert.match(cardCode, /isNarrow \? 14 : 34/);
  assert.match(cardCode, /interactive \? "is-interactive" : "is-static"/);

  assert.match(cardCss, /\.inferno-scene-viewport\.is-interactive/);
  assert.match(cardCss, /\.inferno-scene-viewport\.is-static/);
  assert.match(cardCss, /\.inferno-specular-glare/);
  assert.match(cardCss, /\.collection-card-theme \.inferno-front-namebar/);
});

test("UI.5.4 CinematicPackExperience and cinematic-pack.css refine opening dramaturgy, SUMMARY clarity, safe-area, and avoid heavy libraries", () => {
  const modalCode = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );
  const modalCss = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/cinematic-pack.css"),
    "utf8"
  );
  const pkgJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
  );

  // Opening/Transition/Walkout dramaturgy + unified Stage3DEngine retained
  assert.match(modalCode, /v2-opening-aura/);
  assert.match(modalCode, /v2-opening-ring/);
  assert.match(modalCode, /v2-transition-streak/);
  assert.match(modalCode, /"stealth"/);
  assert.match(modalCode, /data-testid="walkout-rarity-teaser"/);
  assert.match(modalCode, /data-rarity=\{activeStageRarityProfile\.tier\}/);

  // SUMMARY hierarchy + flip preview + Skip/Close safety preserved
  assert.match(modalCode, /v2-dup-row/);
  assert.match(modalCode, /v2-dup-dp-badge/);
  assert.match(modalCode, /data-testid="summary-preview-flip-btn"/);
  assert.match(modalCode, /data-testid="cinematic-skip-btn"/);
  assert.match(modalCode, /data-testid="cinematic-close-btn"/);
  assert.doesNotMatch(modalCode, /<video\b/i, "No heavy <video> assets introduced in CinematicPackExperience");

  // Safe-area & mobile optimization & reduced-motion CSS
  assert.match(modalCss, /env\(safe-area-inset-top\)/);
  assert.match(modalCss, /env\(safe-area-inset-bottom\)/);
  assert.match(modalCss, /is-mobile-viewport/);
  assert.match(modalCss, /is-reduced-motion/);

  // Zero bloated 3D/animation packages added
  const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  for (const heavyPkg of ["three", "gsap", "framer-motion", "lottie-web"]) {
    assert.equal(Boolean(deps[heavyPkg]), false, `Must NOT add heavy dependency ${heavyPkg}`);
  }
});
