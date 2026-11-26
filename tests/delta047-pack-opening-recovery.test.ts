import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolveCanonicalPackTheme,
  getPackImageUrl,
  getPackCutoutUrl,
  getPackStadiumUrl,
  CANONICAL_PACK_CONFIGS
} from "../lib/cards/types.ts";
import {
  buildFallbackPackDefinition,
  resolvePackDefinitionForUnopenedPack
} from "../lib/cards/packOpeningAlbumBridge.ts";

test("DELTA-047 Audit 1: Pack Canonical Themes and 3-card standard pack guarantee", () => {
  // Standard Pack must never resolve to gold theme or 5 cards
  assert.equal(resolveCanonicalPackTheme("standard_pack"), "standard");
  assert.equal(resolveCanonicalPackTheme("standard_pack", "gold"), "standard");
  assert.equal(CANONICAL_PACK_CONFIGS.standard_pack.cardsCount, 3);
  assert.equal(CANONICAL_PACK_CONFIGS.standard_pack.theme, "standard");
  assert.equal(getPackCutoutUrl("standard_pack"), "/media/walkouts/delta-standard-pack-cutout.webp");
  assert.equal(getPackStadiumUrl("standard_pack"), "/media/walkouts/delta-standard-stadium.webp");
  assert.equal(getPackImageUrl("standard_pack"), "/assets/packs/pack-standard.jpg");

  // Fallback builder must produce 3 cards for standard_pack
  const fallbackStandard = buildFallbackPackDefinition("standard_pack");
  assert.equal(fallbackStandard.cards_count, 3);
  assert.equal(fallbackStandard.theme, "standard");

  // Legacy database pack definition polluted with gold theme must be sanitized
  const sanitized = resolvePackDefinitionForUnopenedPack(
    {
      id: "uop-1",
      user_id: "user-1",
      pack_type_id: "standard_pack",
      is_opened: false,
      source_reason: "test",
      opened_at: null,
      created_at: new Date().toISOString(),
      pack_definition: {
        id: "standard_pack",
        name: "Paczka Standardowa",
        cards_count: 5, // Legacy mistake
        theme: "gold"    // Legacy mistake
      } as any
    },
    []
  );
  assert.ok(sanitized);
  assert.equal(sanitized?.cards_count, 3);
  assert.equal(sanitized?.theme, "standard");
});

test("DELTA-047 Audit 2: All 5 booster packs have valid assets, cutouts, stadiums, and cards count", () => {
  const packs = [
    { id: "standard_pack", count: 3, theme: "standard" },
    { id: "matchday_booster", count: 4, theme: "matchday" },
    { id: "gold_booster", count: 5, theme: "gold" },
    { id: "inferno_booster", count: 5, theme: "inferno" },
    { id: "legend_pack", count: 6, theme: "legend" }
  ];

  for (const p of packs) {
    const config = CANONICAL_PACK_CONFIGS[p.id as keyof typeof CANONICAL_PACK_CONFIGS];
    assert.ok(config, `Config exists for ${p.id}`);
    assert.equal(config.cardsCount, p.count);
    assert.equal(config.theme, p.theme);

    const cutout = getPackCutoutUrl(p.id);
    const stadium = getPackStadiumUrl(p.id);
    const image = getPackImageUrl(p.id);

    // Verify assets exist on disk in public directory
    const publicDir = path.resolve(process.cwd(), "public");
    const cutoutPath = path.join(publicDir, cutout.replace(/^\//, ""));
    const stadiumPath = path.join(publicDir, stadium.replace(/^\//, ""));

    assert.ok(fs.existsSync(cutoutPath), `Cutout asset exists on disk: ${cutoutPath}`);
    assert.ok(fs.existsSync(stadiumPath), `Stadium asset exists on disk: ${stadiumPath}`);
  }
});

test("DELTA-047 Audit 3: Cinematic CSS has decoupled stadium background and zero horizontal overflow", () => {
  const cssPath = path.resolve(process.cwd(), "components/pack-opening-v2/cinematic-pack.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  // Backdrop must be defined for all themes
  assert.ok(css.includes(".v2-cinematic-prelude-backdrop"));
  assert.ok(css.includes("var(--arena-stadium-image"));
  assert.ok(css.includes("--arena-stadium-image: url('/media/walkouts/delta-standard-stadium.webp')"));
  assert.ok(css.includes("url('/media/walkouts/delta-inferno-red-stadium.webp')"));

  // Check overflow safety
  assert.ok(css.includes("overflow: clip") || css.includes("overflow: hidden"));
});

test("DELTA-047 Audit 4: CinematicPackExperience unconditionally mounts backdrop and defaults enableStadiumFilm=true", () => {
  const tsxPath = path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx");
  const tsx = fs.readFileSync(tsxPath, "utf-8");

  assert.ok(tsx.includes("enableStadiumFilm = true"));
  assert.ok(tsx.includes('data-testid="cinematic-stadium-backdrop"'));
  assert.ok(tsx.includes("resolveCanonicalPackTheme(pack.id, pack.theme)"));
  assert.ok(tsx.includes("getPackCutoutUrl(pack.id, canonicalTheme)"));
});

test("DELTA-047 Audit 5: Supabase migration file exists and provides idempotent cleanup", () => {
  const sqlPath = path.resolve(process.cwd(), "supabase/migrations/20261125_delta047_pack_definitions_cleanup.sql");
  assert.ok(fs.existsSync(sqlPath));
  const sql = fs.readFileSync(sqlPath, "utf-8");
  assert.ok(sql.includes("UPDATE pack_definitions"));
  assert.ok(sql.includes("theme = 'standard'"));
  assert.ok(sql.includes("cards_count = 3"));
});
