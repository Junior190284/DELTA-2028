import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SHOWCASE_VARIANTS,
  DEFAULT_VARIANT,
  parseVariant,
  parseDemoCount,
  demoRosterRows,
  demoRoster,
  lightRigFor,
  INTRO_TIMELINE,
  MAX_DEMO_PLAYERS,
  DEMO_STATIC_PHOTOS_V3
} from "../lib/team/teamShowcaseV3.ts";
import { carouselSlots, showNavigation } from "../lib/team/teamShowcase.ts";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("P15B variants: A/B/C + the recommended blend; default = champions; unknown -> default", () => {
  assert.deepEqual(SHOWCASE_VARIANTS.map((v) => v.id), ["champions", "stadium", "ultimate", "barca"]);
  assert.deepEqual(SHOWCASE_VARIANTS.map((v) => v.letter), ["★", "A", "B", "C"]);
  assert.equal(DEFAULT_VARIANT, "champions");
  assert.equal(parseVariant("barca"), "barca");
  assert.equal(parseVariant(["ultimate", "x"]), "ultimate");
  assert.equal(parseVariant("javascript:alert(1)"), "champions");
  assert.equal(parseVariant(undefined), "champions");
});

test("P15B DEMO: roster sizes 1/2/7/18, unique ids and numbers, beyond 7 only obvious placeholders", () => {
  for (const n of [0, 1, 2, 3, 7, 18, MAX_DEMO_PLAYERS]) {
    const rows = demoRosterRows(n);
    assert.equal(rows.length, n);
    assert.equal(new Set(rows.map((r) => r.id)).size, n, "unique ids");
    assert.equal(new Set(rows.map((r) => r.shirt_number)).size, n, "unique numbers");
  }
  const extra = demoRosterRows(18).slice(7);
  for (const r of extra) assert.match(String(r.display_name), /^Demo [A-Z][a-z]+$/, "placeholder clearly marked 'Demo ...'");
  assert.equal(parseDemoCount("18"), 18);
  assert.equal(parseDemoCount("999"), MAX_DEMO_PLAYERS);
  assert.equal(parseDemoCount("abc"), 7);
  assert.equal(parseDemoCount(undefined), 7);
});

test("P15B DEMO photos: ONLY Ryszard (his own file), everyone else silhouette + 'ZDJĘCIE WKRÓTCE'", () => {
  const roster = demoRoster(18);
  const withPhoto = roster.filter((p) => p.photo.kind !== "none");
  assert.equal(withPhoto.length, 1);
  assert.equal(withPhoto[0].fullName, "Ryszard Rybacki");
  assert.deepEqual(Object.keys(DEMO_STATIC_PHOTOS_V3), ["demo-p7"]);
});

test("P15B carousel: for the DEMO 1/2/7/18 and every width no person is duplicated", () => {
  for (const n of [1, 2, 7, 18]) {
    for (const slots of [1, 2, 3]) {
      for (let a = 0; a < n; a += 1) {
        const vis = carouselSlots(n, a, slots).map((v) => v.index);
        assert.equal(new Set(vis).size, vis.length);
      }
    }
  }
  assert.equal(showNavigation(1), false);
  assert.equal(showNavigation(2), true);
});

test("P15B dynamic lights: by position, deterministic, different for different positions", () => {
  assert.equal(lightRigFor({ id: "x", positionCode: "BR" }).key, "white");
  assert.equal(lightRigFor({ id: "x", positionCode: "OBR" }).key, "gold");
  assert.equal(lightRigFor({ id: "x", positionCode: "POM" }).key, "ember");
  assert.equal(lightRigFor({ id: "x", positionCode: "NAP" }).key, "red");
  const a = lightRigFor({ id: "demo-p14", positionCode: null });
  assert.deepEqual(a, lightRigFor({ id: "demo-p14", positionCode: null }), "the same player = the same light");
  const keys = new Set(demoRoster(18).map((p) => lightRigFor(p).key));
  assert.ok(keys.size >= 3, "beams change between players");
});

test("P15B intro: the order crest -> lights -> hero -> typography -> sides -> end (≤ 3.5 s)", () => {
  const t = INTRO_TIMELINE;
  assert.ok(t.crestIn < t.lightsOn && t.lightsOn < t.heroIn && t.heroIn < t.typeIn && t.typeIn < t.sidesIn && t.sidesIn < t.done);
  assert.ok(t.done <= 3500);
  const css = read("components/team-showcase-v3/team-showcase-v3.css");
  assert.match(css, /\.dc-root\.is-intro \.dc-card\.is-active \.dc-card-inner \{ animation: dcHeroIn [^;]* 1\.5s both; \}/);
  assert.match(css, /\.dc-root\.is-intro \.dc-hero-type \{ animation: dcTypeIn [^;]* 1\.9s both; \}/);
  assert.match(css, /calc\(2\.3s \+ var\(--dc-side-delay, 0ms\)\)/);
});

test("P15B route: /preview (404 in production), DEMO only — no Supabase or player queries", () => {
  const page = strip(read("app/preview/team-showcase-v3/page.tsx"));
  assert.doesNotMatch(page, /supabase|from\("players"\)|createClient|createAdminClient|team_roster/);
  assert.match(page, /demoRoster\(parseDemoCount\(sp\.count\)\)/);
  const comp = strip(read("components/team-showcase-v3/TeamShowcaseV3.tsx"));
  assert.doesNotMatch(comp, /supabase|fetch\(|\/api\//, "the prototype makes no network calls");
  assert.match(comp, /data-testid="team-showcase-v3-demo-pill"/);
  const layout = read("app/preview/layout.tsx");
  assert.match(layout, /VERCEL_ENV === "production"/);
});

test("P15B performance: no 3D, no video, no libraries; keyframes only transform/opacity; Reduced Motion", () => {
  const css = strip(read("components/team-showcase-v3/team-showcase-v3.css"));
  const comp = strip(read("components/team-showcase-v3/TeamShowcaseV3.tsx"));
  for (const s of [css, comp]) assert.doesNotMatch(s, /rotateY|rotateX|preserve-3d|backface-visibility|perspective|backdrop-filter|<video/);
  // @keyframes blocks extracted by brace counting (works for one-line and multi-line ones)
  const blocks: string[] = [];
  for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
    let depth = 1, i = (m.index ?? 0) + m[0].length;
    while (i < css.length && depth > 0) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
    blocks.push(css.slice(m.index, i));
  }
  assert.ok(blocks.length >= 8, `found ${blocks.length} @keyframes`);
  for (const k of blocks) {
    const body = k.slice(k.indexOf("{") + 1);
    for (const m of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(["transform", "opacity"].includes(m[1]), `keyframes: ${m[1]} in ${k.slice(0, 40)}`);
  }
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.dc-root\.is-reduced \*/);
  assert.match(comp, /if \(reducedNow\(\)\) \{ setPhase\("ready"\); return; \}/, "Reduced Motion skips the intro (P15E: read synchronously at mount)");
  const pkg = JSON.parse(read("package.json"));
  for (const heavy of ["framer-motion", "gsap", "swiper", "embla-carousel", "lottie-web"]) {
    assert.equal(Boolean({ ...pkg.dependencies, ...pkg.devDependencies }[heavy]), false, heavy);
  }
});

test("P15B: Team Showcase 2.0 and the roster module untouched (files exist; v3 only imports the v2 logic)", () => {
  for (const f of ["app/preview/team-showcase-v2/page.tsx", "components/team-showcase/TeamShowcaseV2.tsx", "lib/team/teamShowcase.ts"]) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  }
  const comp = read("components/team-showcase-v3/TeamShowcaseV3.tsx");
  assert.match(comp, /from "@\/lib\/team\/teamShowcase"/);
  assert.match(comp, /<NeutralPlayerSilhouette shirtNumber=\{null\}/, "the number once (card corner)");
  assert.match(comp, /ZDJĘCIE WKRÓTCE/);
});
