import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  faceForRotation,
  restingRotationAfterRelease,
  restingFaceAfterRelease,
  resolveRevealForce,
  isProductionHost,
  parseRevealForce,
  shouldUseSafe2DReveal
} from "../lib/cards/revealPresentation.ts";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

// ---------- 1. Return of the 3D card after the gesture ----------

test("P12G.1 return: after any gesture the card shows the FRONT, unless the back was chosen deliberately", () => {
  // states a swipe can lead to (0.55°/px): edge, back, several turns
  for (const dragYaw of [90, 164 * 0.55, 180, 327 * 0.55, -200, 450, 630]) {
    assert.notEqual(faceForRotation(dragYaw), "front", `precondition: ${dragYaw}° does not show the front`);
  }
  assert.equal(restingFaceAfterRelease(false), "front", "no deliberate choice -> front");
  assert.equal(restingFaceAfterRelease(true), "back", "after the 'Rewers' button -> back (choice preserved)");
  assert.deepEqual(restingRotationAfterRelease(), { yaw: 0, pitch: 0 });
});

test("P12G.1 return: Card3DEngine resets only the drag offset; isFlipped (+180°) is applied separately", () => {
  const src = read("components/collection-3d/Card3DEngine.tsx");
  assert.match(src, /const effectiveYaw = yaw \+ \(isFlipped \? 180 : 0\);/);
  assert.match(src, /if \(snapBackOnRelease\) \{\s*const rest = restingRotationAfterRelease\(\);/);
  // the return happens in pointerup (also pointercancel, the same handler)
  assert.match(src, /onPointerCancel=\{handlePointerUp\}/);
});

test("P12G.1 return: every interactive Card3DEngine in the pack experience has snapBackOnRelease", () => {
  const src = read("components/pack-opening-v2/CinematicPackExperience.tsx");
  const blocks = src.split("<Card3DEngine").slice(1).map((b) => b.slice(0, b.indexOf("/>")));
  const interactive = blocks.filter((b) => /interactive=\{(true|isCardInteractive)\}/.test(b));
  assert.ok(interactive.length >= 3, "reveal (film + stadium) and the summary preview");
  for (const b of interactive) assert.match(b, /snapBackOnRelease=\{(true|isCardInteractive)\}/);
});

// ---------- 2. Enlarged preview from SUMMARY ----------

test("P12G.1 preview: on touch screens 2D (one static face), on desktop 3D with a return", () => {
  const src = read("components/pack-opening-v2/CinematicPackExperience.tsx");
  const i = src.indexOf('data-testid="summary-card-preview-modal"');
  assert.ok(i > 0);
  const modal = src.slice(i, src.indexOf("</div>,", i) > 0 ? src.indexOf("</div>,", i) : undefined);
  assert.match(modal, /\{useSafe2DReveal \? \(/);
  assert.match(modal, /data-testid="summary-preview-card-2d"/);
  assert.match(modal, /staticFace=\{isPreviewFlipped \? "back" : "front"\}/);
  assert.match(modal, /<Card3DEngine[\s\S]*?isFlipped=\{isPreviewFlipped\}[\s\S]*?snapBackOnRelease=\{true\}/);
});

test("P12G.1 preview: the back in 2D is a flat face (CardBack flat), with no rotateY trick", () => {
  const back = read("components/cards/CardBack.tsx");
  assert.match(back, /flat = false/, "default unchanged");
  assert.match(back, /flat\s*\?\s*\{ transform: "none", backfaceVisibility: "visible"/);
  const deltaCard = read("components/cards/DeltaCard.tsx");
  assert.match(deltaCard, /flat=\{staticFace === "back"\}/);
  const css = read("components/pack-opening-v2/cinematic-pack.css");
  const blk = css.slice(css.indexOf("P12G.1 — 2D summary preview"));
  assert.ok(blk.length > 50);
  assert.doesNotMatch(blk.replace(/\/\*[\s\S]*?\*\//g, ""), /rotateY|preserve-3d|backface|perspective/);
  assert.match(blk, /is-reduced-motion \.v2-safe-preview-card \{ animation: none !important; \}/);
});

// ---------- 3. Safety of the test switch ----------

test("P12G.1 switch: ?cardReveal is ignored in production (Vercel production or a production domain)", () => {
  const force3d = parseRevealForce("?cardReveal=3d");
  assert.equal(resolveRevealForce(force3d, { vercelEnv: "production", host: "delta-preview-xyz.vercel.app" }), null);
  assert.equal(resolveRevealForce(force3d, { vercelEnv: null, host: "gm2018.pl" }), null);
  assert.equal(resolveRevealForce(force3d, { vercelEnv: undefined, host: "www.gm2018.pl" }), null);
  assert.equal(resolveRevealForce(force3d, { host: "delta-2028.vercel.app" }), null);
  assert.equal(resolveRevealForce("2d", { vercelEnv: "production" }), null, "in production the switch is fully inactive");
  // production phone: always the automatic, safe mode
  const forced = resolveRevealForce(force3d, { vercelEnv: "production", host: "gm2018.pl" });
  assert.equal(shouldUseSafe2DReveal({ viewportWidth: 390, coarsePointer: true, reducedMotion: false, force: forced }), true);
});

test("P12G.1 switch: works on Vercel Preview and locally", () => {
  assert.equal(resolveRevealForce("3d", { vercelEnv: "preview", host: "delta-2028-git-fix-mobile-card-reveal-p12g-x.vercel.app" }), "3d");
  assert.equal(resolveRevealForce("2d", { vercelEnv: "development", host: "localhost" }), "2d");
  assert.equal(resolveRevealForce("3d", { host: "127.0.0.1:3100" }), "3d");
  assert.equal(resolveRevealForce(null, { host: "localhost" }), null);
  assert.equal(isProductionHost("GM2018.PL:443"), true);
  assert.equal(isProductionHost("delta-2028-abc.vercel.app"), false);
});

test("P12G.1 switch: the production domain list matches the /preview route guard", () => {
  const layout = read("app/preview/layout.tsx");
  assert.match(layout, /host\.includes\("gm2018\.pl"\)/);
  assert.match(layout, /host === "delta-2028\.vercel\.app"/);
  const src = read("components/pack-opening-v2/CinematicPackExperience.tsx");
  assert.match(src, /resolveRevealForce\(parseRevealForce\(window\.location\.search\), \{/);
  assert.match(src, /vercelEnv: process\.env\.NEXT_PUBLIC_VERCEL_ENV \?\? null/);
  assert.doesNotMatch(src, /force: parseRevealForce\(/, "the raw switch must not go to shouldUseSafe2DReveal");
});
