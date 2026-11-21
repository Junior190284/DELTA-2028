import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  holdStage,
  ambientKind,
  shouldMountAmbientVideo,
  shouldPlayAmbientVideo,
  shouldReleaseFilm,
  activeDecoders,
  legendParticles,
  AMBIENT_VIDEO_SRC,
  HOLD_STILL_SRC,
  HOLD_CROSSFADE_MS,
  AMBIENT_PRELOAD_FROM_S
} from "../lib/cards/cinematicHold.ts";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ---------- Transition film -> ambient (lifecycle) ----------

test("P13A lifecycle: the film plays in WALKOUT; after its end the hold covers HERO_REVEAL and CARD_REVEAL", () => {
  const seq: Array<[string, boolean, string]> = [
    ["READY", false, "off"],
    ["OPENING", false, "off"],
    ["TRANSITION", false, "off"],
    ["WALKOUT", false, "intro"],
    ["WALKOUT", true, "hold"],      // the film ended a moment before MEDIA_ENDED changes the phase
    ["HERO_REVEAL", true, "hold"],
    ["CARD_REVEAL", true, "hold"],
    ["SUMMARY", true, "off"],
    ["COMPLETE", true, "off"],
  ];
  for (const [phase, filmEnded, expected] of seq) {
    assert.equal(holdStage({ phase, hasFilm: true, filmEnded }), expected, `${phase} filmEnded=${filmEnded}`);
  }
});

test("P13A: early 'Reveal card' (HERO before the film ends) does not restart the film or cut it; hold comes after the end", () => {
  assert.equal(holdStage({ phase: "HERO_REVEAL", hasFilm: true, filmEnded: false }), "intro");
  assert.equal(holdStage({ phase: "HERO_REVEAL", hasFilm: true, filmEnded: true }), "hold");
});

test("P13A: no film (STANDARD/MATCHDAY, film error, Reduced Motion) -> no hold layer", () => {
  for (const phase of ["WALKOUT", "HERO_REVEAL", "CARD_REVEAL"]) {
    assert.equal(holdStage({ phase, hasFilm: false, filmEnded: true }), "off");
  }
  assert.equal(holdStage({ phase: null, hasFilm: true, filmEnded: true }), "off");
});

test("P13A: the hold has no time limit, only the phase decides (no time input)", () => {
  // holdStage has no clock/timer input: a card shown for hours keeps the hold
  assert.equal(holdStage.length, 1);
  assert.equal(holdStage({ phase: "CARD_REVEAL", hasFilm: true, filmEnded: true }), "hold");
});

// ---------- Ambient kind ----------

test("P13A: INFERNO = loop of inferno-bg.mp4; LEGEND = CSS (no video); Reduced Motion = static", () => {
  assert.equal(ambientKind("inferno", false), "inferno-video");
  assert.equal(ambientKind("legend", false), "legend-css");
  assert.equal(ambientKind("inferno", true), "static");
  assert.equal(ambientKind("legend", true), "static");
  assert.equal(AMBIENT_VIDEO_SRC.inferno, "/media/walkouts/inferno-bg.mp4");
  assert.equal(AMBIENT_VIDEO_SRC.legend, null);
  assert.ok(fs.existsSync(path.join(root, "public", AMBIENT_VIDEO_SRC.inferno as string)), "inferno-bg.mp4 exists");
  for (const t of ["inferno", "legend"] as const) assert.ok(fs.existsSync(path.join(root, "public", HOLD_STILL_SRC[t])), `still ${t} exists`);
});

// ---------- Limiting simultaneous decoding ----------

test("P13A decoding: the ambient video is mounted only near the film's end or during hold; it plays only during hold", () => {
  const kind = "inferno-video" as const;
  assert.equal(shouldMountAmbientVideo({ stage: "intro", kind, filmTime: 2 }), false);
  assert.equal(shouldMountAmbientVideo({ stage: "intro", kind, filmTime: AMBIENT_PRELOAD_FROM_S }), true);
  assert.equal(shouldMountAmbientVideo({ stage: "hold", kind, filmTime: 0 }), true);
  assert.equal(shouldMountAmbientVideo({ stage: "off", kind, filmTime: 11 }), false);
  assert.equal(shouldMountAmbientVideo({ stage: "hold", kind: "legend-css", filmTime: 11 }), false);
  assert.equal(shouldMountAmbientVideo({ stage: "hold", kind: "static", filmTime: 11 }), false);
  assert.equal(shouldPlayAmbientVideo({ stage: "intro", kind, documentHidden: false }), false, "does not play while the film plays");
  assert.equal(shouldPlayAmbientVideo({ stage: "hold", kind, documentHidden: false }), true);
  assert.equal(shouldPlayAmbientVideo({ stage: "hold", kind, documentHidden: true }), false, "hidden tab");
});

test("P13A decoding: at most 1 video decodes at a time in every stage", () => {
  for (const stage of ["off", "intro", "hold"] as const) {
    for (const kind of ["inferno-video", "legend-css", "static"] as const) {
      for (const documentHidden of [false, true]) {
        assert.ok(activeDecoders({ stage, kind, documentHidden }) <= 1, `${stage}/${kind}/${documentHidden}`);
      }
    }
  }
  assert.equal(activeDecoders({ stage: "hold", kind: "legend-css" }), 0, "LEGEND hold: no video at all");
});

test("P13A: the film is unloaded only after its end AND full coverage; it stays unloaded until a new session", () => {
  assert.equal(shouldReleaseFilm({ filmEnded: false, holdOpaque: false }), false);
  assert.equal(shouldReleaseFilm({ filmEnded: true, holdOpaque: false }), false, "during the crossfade the film still shows underneath");
  assert.equal(shouldReleaseFilm({ filmEnded: true, holdOpaque: true }), true);
  assert.ok(HOLD_CROSSFADE_MS >= 600 && HOLD_CROSSFADE_MS <= 1500);
});

test("P13A LEGEND particles: deterministic, within the screen, varied", () => {
  const a = legendParticles(18), b = legendParticles(18);
  assert.deepEqual(a, b, "no randomness");
  assert.equal(a.length, 18);
  for (const p of a) {
    assert.ok(p.left >= 0 && p.left <= 100);
    assert.ok(p.size >= 2 && p.size <= 5);
    assert.ok(p.duration >= 6 && p.duration <= 11);
    assert.ok(p.delay <= 0);
  }
  assert.ok(new Set(a.map((p) => p.left)).size >= 16);
});

// ---------- Integration in the code ----------

test("P13A StadiumFilmBackdrop: an ended film is never restarted; released = no src + load()", () => {
  const src = read("components/pack-opening-v2/StadiumFilmBackdrop.tsx");
  assert.match(src, /if \(video\.ended\) return;/);
  assert.match(src, /if \(released\) \{\s*\/\/[^\n]*\n\s*video\.pause\(\);\s*return;/);
  assert.match(src, /src=\{released \? undefined : theme === "legend"/);
  assert.match(src, /\}, \[theme, desktop, released\]\);/, "load() also after release / a new session");
  assert.match(src, /onError=\{\(\) => \{ if \(!releasedRef\.current\) onError\(\); \}\}/, "the empty src after release does not trigger the fallback");
  // films unchanged
  for (const f of ["delta-inferno-stadium-v2.mp4", "delta-inferno-stadium-desktop-v2.mp4", "delta-legend-stadium-mobile-v2.mp4", "delta-legend-stadium-v2.mp4"]) {
    assert.match(src, new RegExp(f.replace(/\./g, "\\.")));
  }
});

test("P13A CinematicHoldBackdrop: looped muted inline video, pauses on a hidden tab, unloaded after unmount", () => {
  const src = read("components/pack-opening-v2/CinematicHoldBackdrop.tsx");
  assert.match(src, /muted\s+loop\s+playsInline/);
  assert.match(src, /visibilitychange/);
  assert.match(src, /v\.removeAttribute\("src"\);\s*v\.load\(\);/);
  assert.match(src, /if \(stage === "off"\) return null;/, "SUMMARY/closing: the layer and its animations disappear");
  assert.match(src, /onOpaque/);
});

test("P13A CinematicPackExperience: hold between the film and the card; flags reset on a new session", () => {
  const src = read("components/pack-opening-v2/CinematicPackExperience.tsx");
  const a = src.indexOf("<StadiumFilmBackdrop"), b = src.indexOf("<CinematicHoldBackdrop"), c = src.indexOf('data-testid="stadium-film-real-card"');
  assert.ok(a > 0 && b > a && c > b, "order: film -> hold -> card");
  assert.match(src, /setStadiumFilmEnded\(true\);/);
  assert.match(src, /released=\{shouldReleaseFilm\(\{ filmEnded: stadiumFilmEnded, holdOpaque \}\)\}/);
  assert.match(src, /setStadiumFilmEnded\(false\);\s*setHoldOpaque\(false\);/);
  // SafeRevealCard (P12G) untouched in the film path
  assert.match(src, /useSafe2DReveal && isFinalRevealPhase\(state\.phase\) \?/);
});

test("P13A CSS: hold below the card (z-index 0), only opacity/transform animations, Reduced Motion turns them off", () => {
  const css = read("components/pack-opening-v2/cinematic-pack.css");
  const start = css.lastIndexOf("/*", css.indexOf("P13A — CINEMATIC HOLD"));
  const blk = strip(css.slice(start));
  assert.match(blk, /\.cinematic-v2-arena \.v2-hold \{[^}]*z-index: 0;/);
  const keyframes = blk.match(/@keyframes v2Hold\w+ \{[\s\S]*?\n\}/g) || [];
  assert.ok(keyframes.length >= 2);
  for (const k of keyframes) {
    const props = [...k.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    for (const p of props) assert.ok(["transform", "opacity"].includes(p), `keyframes animate only transform/opacity, found: ${p}`);
  }
  assert.match(blk, /\.v2-hold-ambient-video\.is-playing \{ opacity: \.42; \}/, "damped inferno-bg");
  assert.match(blk, /prefers-reduced-motion: reduce/);
  assert.match(blk, /is-reduced-motion \.v2-hold-particles/);
});
