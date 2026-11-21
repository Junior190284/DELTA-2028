import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sanitizePlayerPhotoCandidate, resolveSafePlayerImageUrl, isRyszardPlayer } from "../lib/cards/playerVisuals.ts";
import { toUnifiedCardShowcase, fromProductionCard } from "../components/collection-3d/adapter.ts";
import type { CardDefinition } from "../lib/cards/types.ts";

test("Card 3D & Summary Visual Fallback (P12B): prevents blank/black card centers and preserves player identity", async (t) => {
  const rootDir = "D:/DELTA/DELTA_INTEGRATION_20";
  const silhouettePath = path.join(rootDir, "components/cards/NeutralPlayerSilhouette.tsx");
  const card3DPath = path.join(rootDir, "components/collection-3d/Card3DEngine.tsx");
  const inferno3DPath = path.join(rootDir, "components/inferno-3d/InfernoCard3D.tsx");
  const cutoutPath = path.join(rootDir, "components/cards/CardCutout.tsx");
  const playerCardPath = path.join(rootDir, "components/PlayerCard.tsx");
  const cinematicExpPath = path.join(rootDir, "components/pack-opening-v2/CinematicPackExperience.tsx");
  const demoPagePath = path.join(rootDir, "app/preview/pack-demo/page.tsx");
  const infernoCssPath = path.join(rootDir, "components/inferno-3d/inferno-card.css");

  assert.ok(fs.existsSync(silhouettePath), "NeutralPlayerSilhouette.tsx must exist");
  assert.ok(fs.existsSync(card3DPath), "Card3DEngine.tsx must exist");
  assert.ok(fs.existsSync(inferno3DPath), "InfernoCard3D.tsx must exist");
  assert.ok(fs.existsSync(cutoutPath), "CardCutout.tsx must exist");
  assert.ok(fs.existsSync(playerCardPath), "PlayerCard.tsx must exist");
  assert.ok(fs.existsSync(cinematicExpPath), "CinematicPackExperience.tsx must exist");
  assert.ok(fs.existsSync(demoPagePath), "pack-demo/page.tsx must exist");
  assert.ok(fs.existsSync(infernoCssPath), "inferno-card.css must exist");

  const silhouetteCode = fs.readFileSync(silhouettePath, "utf-8");
  const card3DCode = fs.readFileSync(card3DPath, "utf-8");
  const inferno3DCode = fs.readFileSync(inferno3DPath, "utf-8");
  const cutoutCode = fs.readFileSync(cutoutPath, "utf-8");
  const playerCardCode = fs.readFileSync(playerCardPath, "utf-8");
  const cinematicExpCode = fs.readFileSync(cinematicExpPath, "utf-8");
  const demoPageCode = fs.readFileSync(demoPagePath, "utf-8");
  const infernoCssCode = fs.readFileSync(infernoCssPath, "utf-8");

  await t.test("1. NeutralPlayerSilhouette uses dynamic unique IDs and luminous athletic styling (never pitch black)", () => {
    assert.match(
      silhouetteCode,
      /useId\(\)/,
      "Must use React useId() to prevent gradient ID collisions across SVG instances in WebKit/Safari"
    );
    assert.match(
      silhouetteCode,
      /data-testid="neutral-silhouette-medallion"/,
      "Must render high-contrast centered medallion badge with crest and jersey number"
    );
    assert.match(
      silhouetteCode,
      /radial-gradient\(circle at 50% 46%/,
      "Must include luminous radial energy aura behind silhouette"
    );
    assert.doesNotMatch(
      silhouetteCode,
      /stopColor="rgba\(2,\s*6,\s*23,\s*0\.98\)"/,
      "Must NOT use pitch-black opaque gradient fill that turns silhouette into an empty black void"
    );
  });

  await t.test("2. Card3DEngine & InfernoCard3D suppress floor contact shadows when player photo is absent or loading", () => {
    assert.match(
      card3DCode,
      /safePlayerSrc\s*&&\s*!playerImgError(?:\s*&&\s*playerImgLoaded)?\s*&&\s*\(\s*<>\s*<div className="inferno-player-ambient-shadow"/,
      "Card3DEngine must ONLY render black contact/ambient shadows when real athlete cutout is present and loaded"
    );
    assert.match(
      inferno3DCode,
      /safePlayerSrc\s*&&\s*!playerImgError(?:\s*&&\s*playerImgLoaded)?\s*&&\s*\(\s*<>\s*<div className="inferno-player-ambient-shadow"/,
      "InfernoCard3D must ONLY render black contact/ambient shadows when real athlete cutout is present and loaded"
    );
  });

  await t.test("3. inferno-card.css scopes player slot img selector so nested silhouette crest is not distorted", () => {
    assert.match(
      infernoCssCode,
      /\.inferno-player-slot\s*>\s*img/,
      "Must use direct child selector .inferno-player-slot > img so inner crest icons are not stretched to 100%"
    );
  });

  await t.test("4. CinematicPackExperience never clamps reveal opacity to 0 during CARD_REVEAL", () => {
    assert.match(
      cinematicExpCode,
      /opacity:\s*state\.phase\s*===\s*"WALKOUT"\s*\?\s*\(preparedCardAssets\s*\?\s*stadiumFilmEntranceEase\s*:\s*0\)\s*:\s*1/,
      "During HERO_REVEAL and CARD_REVEAL, card opacity must be 1 (never hidden by background asset preloader)"
    );
    assert.match(
      cinematicExpCode,
      /yaw=\{state\.phase\s*===\s*"WALKOUT"\s*\?\s*stadiumFilmYaw\s*:\s*walkoutYaw\}/,
      "Must pass interactive walkoutYaw during CARD_REVEAL so cards can be inspected in 3D"
    );
  });

  await t.test("5. CardCutout & PlayerCard unify with NeutralPlayerSilhouette for 100% reveal-summary consistency", () => {
    assert.match(
      cutoutCode,
      /<NeutralPlayerSilhouette/,
      "CardCutout (2D summary) must render NeutralPlayerSilhouette when photo is absent"
    );
    assert.match(
      playerCardCode,
      /<NeutralPlayerSilhouette/,
      "PlayerCard must render NeutralPlayerSilhouette when photo is absent"
    );
  });

  await t.test("6. Identity and privacy invariants: Ryszard photo only for Ryszard, zero fake child photos", () => {
    // A player named Kowalczyk must NEVER receive Ryszard's photo
    const sanitizedKowalczyk = sanitizePlayerPhotoCandidate(
      "/assets/players/ryszard-inferno.png",
      "MATEUSZ KOWALCZYK",
      "KARTA MECZOWA"
    );
    assert.equal(
      sanitizedKowalczyk,
      null,
      "sanitizePlayerPhotoCandidate must reject Ryszard photo candidate for non-Ryszard players"
    );

    // Ryszard must receive his valid photo
    const sanitizedRyszard = sanitizePlayerPhotoCandidate(
      "/assets/players/ryszard-inferno.png",
      "RYSZARD RYBACKI",
      "INFERNO ULTRA"
    );
    assert.equal(
      sanitizedRyszard,
      "/assets/players/ryszard-inferno.png",
      "Ryszard must retain his genuine photo"
    );

    // Card adapter with missing artwork must produce valid models with null imageUrl
    const mockCardNoPhoto: CardDefinition = {
      id: "demo-test-1",
      player_id: "p_kowalczyk",
      season: "2026/27",
      card_type: "gold_master",
      card_name: "MATEUSZ KOWALCZYK",
      title: "GOLD MASTER",
      rarity: "epic",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "gold",
      card_number: 10,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Test card",
      lore: null,
      match_id: null,
      special_event_id: null,
      player: {
        id: "p_kowalczyk",
        display_name: "MATEUSZ KOWALCZYK",
        shirt_number: "10",
        position: "POM",
        photo_path: null
      }
    };

    const unified = toUnifiedCardShowcase(mockCardNoPhoto);
    assert.equal(unified.card3D.imageUrl, null, "card3D.imageUrl must be null for player without photo");
    assert.equal(unified.card3D.shirtNumber, "10", "card3D must retain correct shirt number 10");
    assert.equal(unified.card3D.position, "POM", "card3D must retain correct position POM");
    assert.equal(unified.card3D.surname, "KOWALCZYK", "card3D must retain surname KOWALCZYK");
    assert.equal(unified.deltaCard.playerImage, null, "deltaCard.playerImage must be null for player without photo");
  });

  await t.test("7. All four demo packs in pack-demo define valid, diverse rosters with exact card counts", () => {
    assert.match(demoPageCode, /"demo_standard"/, "STANDARD pack configured");
    assert.match(demoPageCode, /"demo_matchday"/, "MATCHDAY pack configured");
    assert.match(demoPageCode, /"demo_legend"/, "LEGEND pack configured");
    assert.match(demoPageCode, /"demo_inferno"/, "INFERNO pack configured");

    // Exact card counts: STANDARD=3, MATCHDAY=4, LEGEND=5, INFERNO=5
    const stdMatches = demoPageCode.match(/createDemoCard\("std_\d+/g);
    const mMatches = demoPageCode.match(/createDemoCard\("m_\d+/g);
    const legMatches = demoPageCode.match(/createDemoCard\("leg_\d+/g);
    const infMatches = demoPageCode.match(/createDemoCard\("inf_\d+/g);

    assert.equal(stdMatches?.length, 3, "STANDARD demo pack must contain exactly 3 cards");
    assert.equal(mMatches?.length, 4, "MATCHDAY demo pack must contain exactly 4 cards");
    assert.equal(legMatches?.length, 5, "LEGEND demo pack must contain exactly 5 cards");
    assert.equal(infMatches?.length, 5, "INFERNO demo pack must contain exactly 5 cards");

    // Ensure Ryszard's photo is NEVER assigned to any other athlete
    const cardLines = demoPageCode
      .split("\n")
      .filter((line) => line.includes("createDemoCard("));

    for (const line of cardLines) {
      const hasRyszardPhoto = line.includes("true");
      const isRyszard = line.includes("RYSZARD RYBACKI");
      if (hasRyszardPhoto) {
        assert.ok(
          isRyszard,
          `withRyszardPhoto=true can ONLY be set for Ryszard Rybacki, violated in: ${line.trim()}`
        );
      } else {
        assert.ok(
          !isRyszard,
          `Ryszard Rybacki should have withRyszardPhoto=true, violated in: ${line.trim()}`
        );
      }
    }
  });

  await t.test("8. Progressive image loading: immediate fallback silhouette while in-flight, real photo displays with opacity 1 on load", () => {
    // Card3DEngine progressive load assertions
    assert.match(
      card3DCode,
      /const \[playerImgLoaded,\s*setPlayerImgLoaded\]\s*=\s*useState\(false\)/,
      "Card3DEngine must track playerImgLoaded state"
    );
    assert.match(
      card3DCode,
      /\(!safePlayerSrc\s*\|\|\s*playerImgError\s*\|\|\s*!playerImgLoaded\)\s*&&\s*\(\s*<NeutralPlayerSilhouette/,
      "Card3DEngine must immediately show NeutralPlayerSilhouette while photo is in-flight"
    );
    assert.match(
      card3DCode,
      /onLoad=\{\(\)\s*=>\s*setPlayerImgLoaded\(true\)\}/,
      "Card3DEngine must flip playerImgLoaded on successful image load"
    );

    // InfernoCard3D progressive load assertions
    assert.match(
      inferno3DCode,
      /const \[playerImgLoaded,\s*setPlayerImgLoaded\]\s*=\s*useState\(false\)/,
      "InfernoCard3D must track playerImgLoaded state"
    );
    assert.match(
      inferno3DCode,
      /\(!safePlayerSrc\s*\|\|\s*playerImgError\s*\|\|\s*!playerImgLoaded\)\s*&&\s*\(\s*<NeutralPlayerSilhouette/,
      "InfernoCard3D must immediately show NeutralPlayerSilhouette while photo is in-flight"
    );

    // CardCutout progressive load assertions
    assert.match(
      cutoutCode,
      /!imageLoaded\s*&&\s*\(\s*<div className="absolute inset-0 flex items-center justify-center">\s*<NeutralPlayerSilhouette/,
      "CardCutout must render NeutralPlayerSilhouette while photo is loading"
    );
    assert.match(
      cutoutCode,
      /onLoad=\{\(\)\s*=>\s*setImageLoaded\(true\)\}/,
      "CardCutout must set imageLoaded on image load"
    );
  });
});
