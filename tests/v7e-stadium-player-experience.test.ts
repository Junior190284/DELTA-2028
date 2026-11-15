import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("V7E Stadium Hero — Cinematic stage, floodlights, stands and mist layers", () => {
  const expPath = path.join(rootDir, "components/player/PlayerExperience3D.tsx");
  const cssPath = path.join(rootDir, "components/player/player-career-hub.css");

  assert.ok(fs.existsSync(expPath), "PlayerExperience3D.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "player-career-hub.css must exist");

  const expCode = fs.readFileSync(expPath, "utf8");
  const cssCode = fs.readFileSync(cssPath, "utf8");

  // Stadium Hero class
  assert.ok(
    expCode.includes("v7e-stadium-hero"),
    "PlayerExperience3D must feature .v7e-stadium-hero"
  );
  assert.ok(
    cssCode.includes(".v7e-stadium-hero"),
    "CSS must define .v7e-stadium-hero"
  );

  // Atmospheric floodlight spotlights and stands
  assert.ok(
    expCode.includes("v7e-spotlight-beam") && expCode.includes("v7e-pitch-glow-ring"),
    "Hero must feature stadium spotlight beams and pitch turf glow ring"
  );
  assert.ok(
    cssCode.includes(".v7e-spotlight-beam") && cssCode.includes(".v7e-pitch-glow-ring"),
    "CSS must define dual floodlights and ground turf spotlight"
  );

  // Mist / fog layer
  assert.ok(
    expCode.includes("v7e-mist-layer"),
    "Hero must feature atmospheric mist/fog layer"
  );
  assert.ok(
    cssCode.includes(".v7e-mist-layer"),
    "CSS must style .v7e-mist-layer with subtle atmospheric diffusion"
  );

  // Animated sweep effect and prefers-reduced-motion
  assert.ok(
    cssCode.includes("@keyframes v7eSpotlightSweep") || cssCode.includes("@keyframes v7eLightSweep"),
    "CSS must include stadium light sweep keyframe animation"
  );
  assert.ok(
    cssCode.includes("@media (prefers-reduced-motion: reduce)"),
    "CSS must support prefers-reduced-motion to disable intensive animations"
  );
});

test("V7E Dominant Name, Number Watermark, Crest and Back Button", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");
  const cssCode = fs.readFileSync(cssPath(), "utf8");

  // Dominant championship typography for name
  assert.ok(
    expCode.includes("v7e-hero-name"),
    "Hero must feature dominant championship typography .v7e-hero-name"
  );
  assert.ok(
    cssCode.includes(".v7e-hero-name"),
    "CSS must style .v7e-hero-name with clamp typography and stadium text shadow"
  );

  // Giant shirt number watermark in background
  assert.ok(
    expCode.includes("v7e-hero-watermark-num"),
    "Hero must feature background watermark number"
  );
  assert.ok(
    cssCode.includes(".v7e-hero-watermark-num"),
    "CSS must style giant background shirt number with high-impact stencil font"
  );

  // DELTA crest in Hero
  assert.ok(
    expCode.includes("/teamlogos/gm.png"),
    "Hero must display official DELTA GM crest"
  );

  // Clear Back to team button in Hero
  assert.ok(
    expCode.includes("v7e-hero-back-btn") && expCode.includes("Wróć do drużyny"),
    "Hero must feature prominent 'Wróć do drużyny' button"
  );
});

test("V7E Athletic Player Figure & Silhouette Safety", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");
  const photoCode = fs.readFileSync(path.join(rootDir, "components/PlayerPhoto.tsx"), "utf8");
  const cssCode = fs.readFileSync(cssPath(), "utf8");

  // Large athletic figure stage on the pitch
  assert.ok(
    expCode.includes("v7e-stadium-figure-col") || expCode.includes("v7e-stadium-figure-stage"),
    "Hero must feature dedicated athletic figure stage"
  );
  assert.ok(
    cssCode.includes(".v7e-stadium-figure-stage") || cssCode.includes(".v7e-stadium-figure-col"),
    "CSS must define athletic figure column standing on glowing turf"
  );

  // Silhouette fallback when photo is unavailable
  assert.ok(
    photoCode.includes("NeutralPlayerSilhouette"),
    "PlayerPhoto must use NeutralPlayerSilhouette"
  );
  assert.ok(
    photoCode.includes('data-testid="player-photo-silhouette-fallback"'),
    "PlayerPhoto must have player-photo-silhouette-fallback testid"
  );

  // Never use fake photos of other children
  assert.ok(
    !expCode.includes("sample-face") && !expCode.includes("random-avatar"),
    "Must never use sample faces or pictures of other children"
  );
});

test("V7E Real Attendance XP & 3D Card Showcase", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");

  // Attendance XP formula (+40 / +60)
  assert.ok(
    expCode.includes("(presentTrainings * 40) + (presentMatches * 60)"),
    "Attendance XP must strictly use real formula: 40 per training, 60 per match"
  );

  // Level calculation
  assert.ok(
    expCode.includes("Math.floor(individualAttendanceXp / 250) + 1"),
    "Player level must be calculated as Math.floor(XP / 250) + 1"
  );

  // 3D Card Presentation button & Card3DEngine modal
  assert.ok(
    expCode.includes("v7c-btn-inspect-3d") && expCode.includes("PODGLĄD KARTY"),
    "Must feature 3D card inspect button with 'PODGLĄD KARTY' label"
  );
  assert.ok(
    expCode.includes("Card3DEngine"),
    "Must use Card3DEngine for 3D inspection"
  );

  // Unowned card status
  assert.ok(
    expCode.includes("isFeaturedCardOwned ?"),
    "Must clearly differentiate between owned card and unowned preview"
  );
});

test("V7E Compact Inspirational Skills Empty State & 4 Stats Strip", () => {
  const expCode = fs.readFileSync(path.join(rootDir, "components/player/PlayerExperience3D.tsx"), "utf8");
  const cssCode = fs.readFileSync(cssPath(), "utf8");

  // Compact inspirational empty state
  assert.ok(
    expCode.includes("v7e-skills-compact-empty") && expCode.includes("Brak oceny umiejętności"),
    "Empty state must be compact, inspirational and preserve 'Brak oceny umiejętności' label"
  );
  assert.ok(
    expCode.includes("v7e-empty-milestones-grid"),
    "Empty state must present real developmental milestones (+40 XP trainings, +60 XP matches)"
  );
  assert.ok(
    cssCode.includes(".v7e-skills-compact-empty"),
    "CSS must style compact empty state to prevent occupying excessive screen height"
  );

  // 4 Core KPIs directly under Hero
  assert.ok(
    expCode.includes("v7c-quick-stats-strip"),
    "Must render 4-stat panel directly under Hero"
  );
});

test("V7E Responsive Breakpoints & PWA Bottom Clearance", () => {
  const cssCode = fs.readFileSync(cssPath(), "utf8");

  // Breakpoints
  assert.ok(cssCode.includes("@media (min-width: 1920px)"), "Must support 1920px desktop");
  assert.ok(cssCode.includes("max-width: 1440px"), "Must support 1440px desktop");
  assert.ok(cssCode.includes("@media (max-width: 1024px)"), "Must support tablet breakpoint");
  assert.ok(cssCode.includes("@media (max-width: 480px)"), "Must support 390px mobile");
  assert.ok(cssCode.includes("@media (max-width: 360px)"), "Must support 320px ultra-compact mobile");

  // PWA Bottom Clearance on mobile
  assert.ok(
    cssCode.includes("padding-bottom: 110px") || cssCode.includes("padding: 0 2px 110px"),
    "Container on mobile must have ample bottom padding to clear floating PWA install prompt"
  );
});

function cssPath() {
  return path.join(rootDir, "components/player/player-career-hub.css");
}
