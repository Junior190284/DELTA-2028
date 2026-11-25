import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normalizeAngle,
  frontFacingFactor,
  faceForRotation,
  faceForFacingFactor,
  shouldUseSafe2DReveal,
  parseRevealForce,
  isFinalRevealPhase,
  restingRotationAfterRelease,
  SAFE_REVEAL_MAX_WIDTH
} from "../lib/cards/revealPresentation.ts";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

// ---------- Card orientation ----------

test("P12G orientation: yaw 0 = front, 180 = back, 90 = edge (in any representation of the angle)", () => {
  assert.equal(faceForRotation(0), "front");
  assert.equal(faceForRotation(360), "front");
  assert.equal(faceForRotation(-720), "front");
  assert.equal(faceForRotation(180), "back");
  assert.equal(faceForRotation(-180), "back");
  assert.equal(faceForRotation(540), "back");
  assert.equal(faceForRotation(90), "edge");
  assert.equal(faceForRotation(-90), "edge");
  assert.equal(faceForRotation(270), "edge");
});

test("P12G orientation: ±60° thresholds, pitch reduces the front's visibility", () => {
  assert.equal(faceForRotation(59.9), "front");
  assert.equal(faceForRotation(60.1), "edge");
  assert.equal(faceForRotation(119.9), "edge");
  assert.equal(faceForRotation(120.1), "back");
  // a strong pitch with a small yaw: the front is no longer "clearly visible"
  assert.equal(faceForRotation(50, 50), "edge");
  assert.equal(faceForRotation(0, 28), "front"); // maximum tilt allowed in Card3DEngine
});

test("P12G orientation: m33 matches the CSS matrix for rotateX(p) rotateY(y)", () => {
  for (const [y, p] of [[0, 0], [30, 10], [-45, -20], [170, 5], [95, 0]]) {
    const expected = Math.cos((y * Math.PI) / 180) * Math.cos((p * Math.PI) / 180);
    assert.ok(Math.abs(frontFacingFactor(y, p) - expected) < 1e-9);
  }
  assert.equal(faceForFacingFactor(1), "front");
  assert.equal(faceForFacingFactor(-1), "back");
  assert.equal(faceForFacingFactor(0), "edge");
  assert.equal(faceForFacingFactor(Number.NaN), "edge");
  assert.equal(normalizeAngle(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizeAngle(-180), 180);
});

test("P12G orientation: a swipe that rotates the card to 90° or 180° ends at the front after release", () => {
  // Card3DEngine: 0.55°/px -> ~164 px = edge, ~327 px = back (state from before P12G)
  assert.equal(faceForRotation(164 * 0.55), "edge");
  assert.equal(faceForRotation(327 * 0.55), "back");
  const rest = restingRotationAfterRelease();
  assert.deepEqual(rest, { yaw: 0, pitch: 0 });
  assert.equal(faceForRotation(rest.yaw, rest.pitch), "front");
});

// ---------- Presentation mode selection ----------

test("P12G mode: phone/touch/narrow screen/Reduced Motion -> 2D; desktop with a mouse -> 3D", () => {
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 390, coarsePointer: true, reducedMotion: false }), true);
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 1024, coarsePointer: true, reducedMotion: false }), true, "tablet");
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 390, coarsePointer: false, reducedMotion: false }), true, "narrow window");
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: SAFE_REVEAL_MAX_WIDTH, coarsePointer: false, reducedMotion: false }), true);
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: SAFE_REVEAL_MAX_WIDTH + 1, coarsePointer: false, reducedMotion: false }), false);
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 1440, coarsePointer: false, reducedMotion: true }), true, "Reduced Motion");
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 1440, coarsePointer: false, reducedMotion: false }), false, "desktop");
});

test("P12G mode: ?cardReveal=2d|3d forces the mode; other values are ignored", () => {
  assert.equal(parseRevealForce("?cardReveal=2d"), "2d");
  assert.equal(parseRevealForce("?a=1&cardReveal=3d"), "3d");
  assert.equal(parseRevealForce("?cardReveal=4d"), null);
  assert.equal(parseRevealForce(""), null);
  assert.equal(parseRevealForce(undefined), null);
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 1440, coarsePointer: false, reducedMotion: false, force: "2d" }), true);
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 390, coarsePointer: true, reducedMotion: true, force: "3d" }), false);
});

test("P12G mode: 2D applies only to the final reveal phases; the film turn (WALKOUT) stays 3D", () => {
  assert.equal(isFinalRevealPhase("HERO_REVEAL"), true);
  assert.equal(isFinalRevealPhase("CARD_REVEAL"), true);
  for (const p of ["READY", "OPENING", "TRANSITION", "WALKOUT", "SUMMARY", "COMPLETE", null, undefined]) {
    assert.equal(isFinalRevealPhase(p as string | null | undefined), false, String(p));
  }
});

// ---------- Integration in the code ----------

test("P12G: SafeRevealCard is 2D only (no rotateY / preserve-3d / backface-visibility) and uses the summary's DeltaCard", () => {
  // check code, not comments (the comments list on purpose what is NOT used)
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const src = read("components/pack-opening-v2/SafeRevealCard.tsx");
  assert.match(src, /<DeltaCard card=\{miniCard\} size="responsive" interactive=\{false\} showFlip=\{false\} staticFace="front" /);
  // staticFace="front": no back face at all, and the front does not depend on backface-visibility
  const deltaCard = read("components/cards/DeltaCard.tsx");
  assert.match(deltaCard, /\r?\n\s*staticFace\r?\n\}: DeltaCardProps/, "no default = unchanged behaviour (summary and the rest of the app)");
  assert.match(deltaCard, /\{staticFace !== "front" && \(\s*<CardBack/);
  assert.match(deltaCard, /\{staticFace !== "back" && \(/);
  assert.match(deltaCard, /backfaceVisibility: staticFace \? "visible" : "hidden"/);
  assert.doesNotMatch(stripComments(src), /rotateY|preserve-3d|backface|transformStyle|perspective/i);
  assert.match(src, /data-testid="safe-reveal-card"/);
  assert.match(src, /data-face=\{face\}/);
  const css = read("components/pack-opening-v2/cinematic-pack.css");
  const start = css.indexOf("P12G — SAFE 2D CARD");
  assert.ok(start > 0, "P12G CSS block must exist");
  const block = stripComments(css.slice(css.lastIndexOf("/*", start)));
  assert.ok(block.length > 100);
  assert.doesNotMatch(block, /rotateY|preserve-3d|backface-visibility|perspective/);
  assert.match(block, /scaleX\(0\)/);
  assert.match(block, /is-reduced-motion \.v2-safe-reveal-front/);
  assert.match(block, /prefers-reduced-motion: reduce/);
});

test("P12G: CinematicPackExperience swaps in the 2D card only in the final reveal; WALKOUT keeps Card3DEngine; desktop 3D springs back", () => {
  const src = read("components/pack-opening-v2/CinematicPackExperience.tsx");
  const uses = src.match(/useSafe2DReveal && isFinalRevealPhase\(state\.phase\) \?/g) || [];
  assert.equal(uses.length, 2, "film path and stadium path");
  assert.match(src, /shouldUseSafe2DReveal\(\{/);
  assert.match(src, /reducedMotion: effectiveReducedMotion/);
  assert.match(src, /yaw=\{state\.phase === "WALKOUT" \? stadiumFilmYaw : walkoutYaw\}/, "the film turn stays unchanged");
  const snaps = src.match(/snapBackOnRelease=\{isCardInteractive\}/g) || [];
  assert.equal(snaps.length, 2);
  assert.match(src, /data-testid="safe-reveal-exiting-card"/);
});

test("P12G: Card3DEngine springs back to the front after release and uses the shared orientation logic", () => {
  const src = read("components/collection-3d/Card3DEngine.tsx");
  assert.match(src, /snapBackOnRelease = false/);
  assert.match(src, /if \(snapBackOnRelease\) \{/);
  assert.match(src, /restingRotationAfterRelease\(\)/);
  assert.match(src, /faceForRotation\(effectiveYaw, pitch\)/);
});

test("P12G: films, card counts in the demo and pack definitions untouched (static check)", () => {
  const film = read("components/pack-opening-v2/StadiumFilmBackdrop.tsx");
  assert.match(film, /delta-inferno-stadium-v2\.mp4/);
  assert.match(film, /delta-legend-stadium-mobile-v2\.mp4/);
  const demo = read("app/preview/pack-demo/page.tsx");
  for (const n of [3, 4, 5]) assert.match(demo, new RegExp(`cards_count: ${n}`));
});
