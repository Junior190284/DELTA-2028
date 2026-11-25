import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  INTRO_CREST_SRC,
  INTRO_PRELOAD_CAP_MS,
  INTRO_TIMELINE,
  CALM_INTRO_MS,
  BOOT_FALLBACK_MS,
  MAX_DEMO_PLAYERS,
  demoRosterRows,
  parseDemoCount,
  waitForImages,
} from "../lib/team/teamShowcaseV3.ts";
import { carouselSlots } from "../lib/team/teamShowcase.ts";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const css = () => strip(read("components/team-showcase-v3/team-showcase-v3.css"));
const comp = () => strip(read("components/team-showcase-v3/TeamShowcaseV3.tsx"));

test("P15E root cause 1: the intro crest is a light asset (≤ 80 KB), not the 1.65 MB PNG", () => {
  assert.equal(INTRO_CREST_SRC, "/teamlogos/gm-crest.webp");
  const size = fs.statSync(path.join(root, "public", INTRO_CREST_SRC)).size;
  assert.ok(size > 5_000 && size <= 80_000, `gm-crest.webp = ${size} B`);
  assert.match(comp(), /const CREST = INTRO_CREST_SRC;/);
  assert.doesNotMatch(comp(), /teamlogos\/gm\.png/, "the heavy crest is no longer used by the showcase");
  assert.match(comp(), /preload\(CREST, \{ as: "image" \}\)/, "preload hint in the SSR <head>");
});

test("P15E root cause 2: ONE clock — SSR starts in 'boot', the intro starts after mount, and its end is timed from the intro start", () => {
  const c = comp();
  assert.match(c, /useState<IntroPhase>\("boot"\)/);
  assert.match(c, /await waitForImages\(urls, INTRO_PRELOAD_CAP_MS\)/);
  assert.match(c, /setIntroRun\(\(n\) => n \+ 1\);\s*setPhase\("intro"\);/);
  assert.match(c, /if \(phase !== "intro"\) return;\s*const t = window\.setTimeout\(\(\) => setPhase\("ready"\), reduced \? CALM_INTRO_MS : INTRO_TIMELINE\.done\);/);
  assert.match(c, /className=\{`dc-root is-\$\{phase\}/);
  assert.ok(INTRO_PRELOAD_CAP_MS <= 1500, "never waits long for images");
  assert.ok(CALM_INTRO_MS < INTRO_TIMELINE.done);
});

test("P15E: boot never leaves a blank page — CSS fallback after 6 s, own keyframe names (do not collide with the intro)", () => {
  const s = css();
  assert.equal(BOOT_FALLBACK_MS, 6000);
  assert.match(s, /\.dc-root\.is-boot :is\(\.dc-header, \.dc-stage, \.dc-info, \.dc-footer, \.dc-lights, \.dc-hero-type\) \{\s*opacity: 0; animation: dcBootReveal 0\.6s ease-out 6s both;/);
  assert.match(s, /\.dc-root\.is-boot \.dc-bg \{ opacity: 0\.08; animation: dcBootBg/);
  // an animation-name shared by .is-boot and .is-intro would NOT restart when the class changes
  const names = (sel: string) => new Set([...s.matchAll(new RegExp(`\\.dc-root\\.${sel}[^{]*\\{[^}]*animation:\\s*([\\w-]+)`, "g"))].map((m) => m[1]));
  const boot = names("is-boot"), intro = names("is-intro");
  for (const n of boot) assert.equal(intro.has(n), false, `keyframes ${n} shared by boot and intro`);
  // Reduced Motion before hydration: shown at once
  assert.match(s, /prefers-reduced-motion: reduce\)[\s\S]*\.dc-root\.is-boot :is\([^)]*\) \{ opacity: 1; \}/);
});

test("P15E: 'Pomiń intro' (boot + intro) and 'Obejrzyj intro ponownie' (ready) — replay restarts keyed elements", () => {
  const c = comp();
  assert.match(c, /\{phase !== "ready" && hydrated && \(\s*<button[^>]*onClick=\{skipIntro\}[^>]*data-testid="team-showcase-v3-skip"/);
  assert.match(c, /data-testid="team-showcase-v3-replay"/);
  assert.match(c, /Obejrzyj intro ponownie/);
  assert.match(c, /key=\{`crest-\$\{introRun\}`\}/);
  assert.match(c, /key=\{`type-\$\{current\.id\}-\$\{introRun\}`\}/);
  assert.match(c, /key=\{`info-\$\{current\.id\}-\$\{introRun\}`\}/);
  assert.match(c, /tookOver\.current = true; setPhase\("ready"\)/, "skip during boot = the intro does not start later");
  assert.doesNotMatch(css(), /\.dc-skip \{[^}]*top:/, "the skip button no longer covers the DEMO pill (top right)");
});

test("P15E surname: higher (under the header), readable 2 px outline, light sweep on change, always behind the cards", () => {
  const s = css();
  assert.match(s, /--dc-type-top: calc\(max\(12px, env\(safe-area-inset-top\)\) \+ 38px\)/);
  assert.match(s, /\[data-variant="champions"\] \.dc-hero-type \{ flex-direction: column-reverse; top: var\(--dc-type-top\); \}/);
  assert.match(s, /-webkit-text-stroke: 2px color-mix\(in srgb, var\(--dc-accent\) 78%, white 22%\)/);
  assert.match(s, /\.dc-hero-sweep \{[\s\S]*?animation: dcSweep/);
  assert.match(s, /\.dc-hero-type \{\s*position: absolute; left: 0; right: 0; top: 13%; z-index: -1;/, "behind the stage (z-index 4)");
  assert.match(comp(), /<span className="dc-hero-sweep" \/>/);
});

test("P15E Reduced Motion: no intro on entry; replay = static crest (no movement); sweep and flare hidden", () => {
  const s = css();
  assert.match(s, /\.dc-root\.is-reduced \*, \.dc-root\.is-reduced \*::before, \.dc-root\.is-reduced \*::after \{ animation: none !important; transition: none !important; \}/);
  assert.match(s, /\.dc-root\.is-reduced \.dc-flare, \.dc-root\.is-reduced \.dc-hero-sweep \{ display: none !important; \}/);
  assert.match(s, /\.dc-root\.is-reduced\.is-intro \.dc-crest-intro \{ background:/);
  assert.match(comp(), /if \(reducedNow\(\)\) \{ setPhase\("ready"\); return; \}/);
});

test("P15E roster 1–30: DEMO up to 30, unique, no duplicates in the carousel", () => {
  assert.equal(MAX_DEMO_PLAYERS, 30);
  assert.equal(parseDemoCount("30"), 30);
  const rows = demoRosterRows(30);
  assert.equal(new Set(rows.map((r) => r.id)).size, 30);
  assert.equal(new Set(rows.map((r) => r.shirt_number)).size, 30);
  for (const r of rows.slice(7)) assert.match(String(r.display_name), /^Demo [A-Z][a-z]+$/);
  for (const n of [1, 2, 7, 18, 30]) for (const slots of [1, 2, 3]) for (let a = 0; a < n; a += 1) {
    const vis = carouselSlots(n, a, slots).map((v) => v.index);
    assert.equal(new Set(vis).size, vis.length);
  }
});

test("P15E waitForImages: resolves without DOM, and never waits longer than the cap", async () => {
  assert.equal(await waitForImages([], 50), "loaded");
  const g = globalThis as unknown as { Image?: unknown };
  const prev = g.Image;
  g.Image = class { onload: (() => void) | null = null; onerror: (() => void) | null = null; complete = false; set src(_v: string) { /* never loads */ } };
  const t0 = Date.now();
  assert.equal(await waitForImages(["/slow.png"], 60), "timeout");
  assert.ok(Date.now() - t0 < 1000);
  g.Image = prev;
});
