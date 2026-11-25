import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PACK_PRICES } from "../lib/economy/security.ts";
import { getRarityTier } from "../lib/cards/rarityTiers.ts";
import type { CardDefinition } from "../lib/cards/types.ts";

test("V5.1 - Official Booster Shop Configuration & Prices match Economy Security", () => {
  const albumSource = fs.readFileSync(path.resolve("components/DeltaCollectionAlbum.tsx"), "utf8");

  // Verify all 5 official packs are defined in DeltaCollectionAlbum
  assert.ok(albumSource.includes('id: "standard_pack"'), "Standard pack missing");
  assert.ok(albumSource.includes('id: "matchday_booster"'), "Matchday booster missing");
  assert.ok(albumSource.includes('id: "gold_booster"'), "Gold booster missing");
  assert.ok(albumSource.includes('id: "inferno_booster"'), "Inferno booster missing");
  assert.ok(albumSource.includes('id: "legend_pack"'), "Legend pack missing");

  // Verify prices match authoritative PACK_PRICES exactly
  assert.equal(PACK_PRICES.standard_pack, 60);
  assert.equal(PACK_PRICES.matchday_booster, 100);
  assert.equal(PACK_PRICES.gold_booster, 150);
  assert.equal(PACK_PRICES.inferno_booster, 300);
  assert.equal(PACK_PRICES.legend_pack, 450);

  // Verify client-side check prevents purchase when DP is insufficient without API fetch
  assert.ok(
    albumSource.includes("if (deltaPoints < price)") &&
    albumSource.includes("Niewystarczająca liczba Punktów DELTA"),
    "Client-side DP check missing or doesn't prevent fetch"
  );
});

test("V5.2 - Demo cards are watermarked WZÓR and strictly isolated from user ownership", () => {
  const albumSource = fs.readFileSync(path.resolve("components/DeltaCollectionAlbum.tsx"), "utf8");

  // Verify demo patterns exist in empty showcase
  assert.ok(albumSource.includes("WZÓR"), "Demo watermark WZÓR missing");
  assert.ok(albumSource.includes("DO ZDOBYCIA W PACZKACH"), "Demo explanation badge missing");
  assert.ok(albumSource.includes("delta-card-watermark-demo"), "Demo watermark CSS class missing");

  // Verify demo patterns are never mixed into userCards
  assert.ok(
    !albumSource.includes("userCards.push") &&
    albumSource.includes("ownedCardsMap.get"),
    "Demo cards must never pollute userCards or ownedCardsMap"
  );
});

test("V5.3 - 6 Rarity Tiers and Decoupling Invariants", () => {
  // Test getRarityTier helper
  const commonCard: Partial<CardDefinition> = { rarity: "common", card_type: "base" };
  const rareCard: Partial<CardDefinition> = { rarity: "rare", card_type: "base" };
  const matchdayCard: Partial<CardDefinition> = { rarity: "rare", card_type: "matchday" };
  const goldCard: Partial<CardDefinition> = { rarity: "epic", card_type: "gold_master" };
  const infernoCard: Partial<CardDefinition> = { rarity: "inferno", card_type: "inferno" };
  const legendCard: Partial<CardDefinition> = { rarity: "legendary", card_type: "legend" };

  assert.equal(getRarityTier(commonCard as CardDefinition).id, "common");
  assert.equal(getRarityTier(rareCard as CardDefinition).id, "rare");
  assert.equal(getRarityTier(matchdayCard as CardDefinition).id, "matchday");
  assert.equal(getRarityTier(goldCard as CardDefinition).id, "gold");
  assert.equal(getRarityTier(infernoCard as CardDefinition).id, "inferno");
  assert.equal(getRarityTier(legendCard as CardDefinition).id, "legend");
});

test("V5.4 - Dedicated Stylesheet and Touch Targets", () => {
  const cssSource = fs.readFileSync(path.resolve("styles/delta-inferno-collection.css"), "utf8");
  const packCss = fs.readFileSync(path.resolve("components/pack-opening-v2/cinematic-pack.css"), "utf8");

  // Verify stadium theme classes
  assert.ok(cssSource.includes(".delta-collection-hero-panel"), "Hero panel class missing");
  assert.ok(cssSource.includes(".delta-booster-card-v5"), "Booster card class missing");
  assert.ok(cssSource.includes(".delta-inspect-modal-card"), "Inspect modal class missing");

  // Verify mobile touch targets (>= 44px)
  assert.ok(packCss.includes("min-height: 44px"), "Cinematic pack mobile touch target missing");
  assert.ok(cssSource.includes("min-height: 44px") || cssSource.includes("height: 44px"), "Collection button touch target missing");
});

test("V5.5 - CinematicPackExperience Integration & Invariants Preserved", () => {
  const albumSource = fs.readFileSync(path.resolve("components/DeltaCollectionAlbum.tsx"), "utf8");

  // Invariants required by pack opening bridge & regression tests
  assert.ok(albumSource.includes("CinematicPackExperience"), "CinematicPackExperience not imported");
  assert.ok(albumSource.includes("hasConsumedCurrentPack"), "hasConsumedCurrentPack guard missing");
  assert.ok(albumSource.includes("reconcileUnopenedPacksAfterOpen"), "reconcileUnopenedPacksAfterOpen missing");
  assert.ok(albumSource.includes("sessionKey={activePackSession.sessionKey}"), "sessionKey prop missing");
});
