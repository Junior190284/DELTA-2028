import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// P12E: guards against regressions that made 3D cards black/empty on phones during
// HERO_REVEAL / CARD_REVEAL (excessive compositor layers + filters above the 3D scene).
const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

test("P12E: Card3DEngine renders only the face turned to the viewer", () => {
  const src = read("components/collection-3d/Card3DEngine.tsx");
  // P12G: the face decision lives in the shared lib/cards/revealPresentation (also covered by unit tests)
  assert.match(src, /faceForRotation\(effectiveYaw, pitch\)/, "visible face must be computed from the normalised yaw");
  assert.match(src, /is-face-hidden/, "the face turned away must get the is-face-hidden class");
  assert.match(src, /data-visible-face=\{settledFace\}/, "card object must expose data-visible-face");
  // hiding follows the actually rendered transform (no timers that could get ahead of the animation)
  assert.match(src, /new window\.DOMMatrix\(t\)\.m33/);
  assert.match(src, /faceForFacingFactor\(m33\) === targetFace/);
  assert.doesNotMatch(src, /isRevealing \? 1300 : 900/, "timer-based hiding was the source of the black slab");
});

test("P12E: cached player photo is detected even if onLoad fired before hydration", () => {
  const src = read("components/collection-3d/Card3DEngine.tsx");
  assert.match(src, /ref=\{playerImgRef\}/);
  assert.match(src, /img\.complete/);
  assert.match(src, /naturalWidth > 0/);
});

test("P12E: silhouette is never removed before the decoded photo is visible (no empty card centre)", () => {
  const src = read("components/collection-3d/Card3DEngine.tsx");
  assert.match(src, /img\.decode\(\)\.then\(done, done\)/, "photo counts as ready only after decode()");
  assert.match(src, /onLoad=\{\(e\) => markPlayerImgReady\(e\.currentTarget\)\}/);
  assert.match(src, /!playerPhotoFadeDone/, "silhouette unmounts only after the photo's fade ends");
  assert.match(src, /setPlayerPhotoFadeDone\(true\)/);
  assert.match(src, /data-testid="card3d-silhouette-layer"/);
  assert.doesNotMatch(src, /onLoad=\{\(\) => setPlayerImgLoaded\(true\)\}/);
});

test("P12E: phone/touch CSS flattens card faces and removes filter from the 3D viewport", () => {
  const css = read("components/collection-3d/collection-3d.css");
  assert.match(css, /\.collection-card-theme \.inferno-card-face\.is-face-hidden\s*\{\s*visibility:\s*hidden;/);
  const block = css.slice(css.indexOf("@media (max-width: 820px), (pointer: coarse)"));
  assert.ok(block.length > 0, "P12E mobile block must exist");
  assert.match(block, /\.collection-card-theme\.inferno-scene-viewport\s*\{\s*filter:\s*none;/);
  assert.match(block, /\.inferno-card-face\s*\{\s*transform-style:\s*flat;/);
  assert.match(block, /\.inferno-card-face > \*\s*\{\s*transform:\s*none;/);
});

test("P12E: no filter or rotateY in card enter/exit keyframes; entering uses 'backwards'", () => {
  const css = read("components/pack-opening-v2/cinematic-pack.css");
  for (const name of ["v2CardSlideEnter", "v2CardSlideExit"]) {
    const start = css.indexOf(`@keyframes ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    const rest = css.slice(start);
    const end = rest.search(/\r?\n\}\r?\n/); // CRLF-safe (Windows checkout)
    assert.ok(end > 0, `${name} block end not found`);
    const body = rest.slice(0, end);
    assert.doesNotMatch(body, /filter\s*:/, `${name} must not animate filter`);
    assert.doesNotMatch(body, /rotateY/, `${name} must stay 2D`);
  }
  assert.match(css, /\.v2-card-entering-anim\s*\{\s*animation:\s*v2CardSlideEnter[^;]*backwards;/);
});

test("P12E: film-path wrapper around Card3DEngine has no filter", () => {
  const src = read("components/pack-opening-v2/CinematicPackExperience.tsx");
  const i = src.indexOf('data-testid="stadium-film-real-card"');
  const j = src.indexOf("<Card3DEngine", i);
  assert.ok(i > 0 && j > i);
  assert.doesNotMatch(src.slice(i, j), /filter:\s*`drop-shadow/);
});

test("P12E: neutral silhouette medallion uses no backdrop-filter", () => {
  const src = read("components/cards/NeutralPlayerSilhouette.tsx");
  assert.doesNotMatch(src, /backdropFilter|WebkitBackdropFilter/);
  // identity: number + DELTA crest are still rendered
  assert.match(src, /cleanNumber/);
  assert.match(src, /DELTA Crest/);
});

test("P12E: demo still never assigns Ryszard's photo to other children", () => {
  const src = read("app/preview/pack-demo/page.tsx");
  assert.match(src, /artwork_url: !withRyszardPhoto\s*\?\s*null/);
  assert.match(src, /photo_path: null/);
});
