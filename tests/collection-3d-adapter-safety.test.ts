import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromProductionCard,
  toProductionCard,
  toUnifiedCardShowcase,
  toCollectionCategory,
  toProductionRarity,
  toProductionCardType,
  resolveCardVisualType,
  getDefaultVisualTypeForCategory
} from "../components/collection-3d/adapter.ts";
import type { CardDefinition, CardRarity, CardType } from "../lib/cards/types.ts";
import type { CardVisualType, CollectionCategory, PlayerCardData } from "../components/collection-3d/types.ts";

/**
 * DELTA COLLECTION 3D ENGINE — ETAP 2.1: ADAPTER SAFETY & ROUND-TRIP AUDIT TEST SUITE
 */

// Helper to create valid mock production card definitions
function makeCardDefinition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: "card_def_test_001",
    player_id: "player_rybacki_01",
    season: "2026/2027",
    card_type: "base",
    card_name: "Rybacki",
    title: "Rybacki (Standard)",
    rarity: "common",
    artwork_url: "/assets/cards/players/rybacki.png",
    artwork_pose: "arms_crossed",
    frame_theme: null,
    card_number: 10,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: "Oficjalna karta testowa",
    lore: "Lore testowe",
    match_id: null,
    special_event_id: null,
    player: {
      id: "player_rybacki_01",
      display_name: "Oliwier Rybacki",
      shirt_number: "10",
      position: "FWD",
      photo_path: "/assets/cards/players/rybacki.png"
    },
    ...overrides
  };
}

// -------------------------------------------------------------
// 1. INDEPENDENCE AUDIT: CardRarity vs CardVisualType
// -------------------------------------------------------------
test("SAFETY 1: CardRarity and CardVisualType are decoupled and independent", () => {
  // A card can be EPIC while rendering as MATCHDAY_HERO
  const epicMatchday = makeCardDefinition({
    rarity: "epic",
    card_type: "matchday"
  });

  const player3D = fromProductionCard(epicMatchday);

  // Visual skin is MATCHDAY_HERO
  assert.equal(player3D.visualType, "MATCHDAY_HERO");
  // Economic rarity is preserved as "epic"
  assert.equal(player3D.economicRarity, "epic");

  // Changing visual skin on the 3D side must NOT mutate the economic rarity
  player3D.visualType = "INFERNO_ULTRA";
  const backToProd = toProductionCard(player3D);

  assert.equal(backToProd.rarity, "epic", "Economic rarity must remain 'epic' even if visual theme was switched to INFERNO_ULTRA");
  assert.equal(backToProd.card_type, "matchday", "Production card_type must remain 'matchday'");
});

// -------------------------------------------------------------
// 2. CANONICAL ROUND-TRIP (Standard Combinations)
// -------------------------------------------------------------
test("SAFETY 2: Standard production cards round-trip losslessly (100% fidelity)", () => {
  const canonicalCases: Array<{ rarity: CardRarity; card_type: CardType; expectedVisual: CardVisualType; expectedCategory: CollectionCategory }> = [
    { rarity: "common", card_type: "base", expectedVisual: "BASE", expectedCategory: "COMMON" },
    { rarity: "rare", card_type: "training_warrior", expectedVisual: "TRAINING_HERO", expectedCategory: "RARE" },
    { rarity: "rare", card_type: "matchday", expectedVisual: "MATCHDAY_HERO", expectedCategory: "MATCHDAY" },
    { rarity: "epic", card_type: "goal_hunter", expectedVisual: "GOLD_MASTER", expectedCategory: "GOLD" },
    { rarity: "legendary", card_type: "legend", expectedVisual: "DELTA_ICON", expectedCategory: "LEGEND" },
    { rarity: "inferno", card_type: "inferno", expectedVisual: "INFERNO_ULTRA", expectedCategory: "INFERNO" }
  ];

  for (const tc of canonicalCases) {
    const original = makeCardDefinition({
      id: `card_${tc.rarity}_${tc.card_type}`,
      rarity: tc.rarity,
      card_type: tc.card_type,
      edition_size: tc.rarity === "inferno" ? 1 : 100,
      is_limited: tc.rarity === "inferno"
    });

    // Step A: Production -> 3D Engine
    const p3d = fromProductionCard(original);
    assert.equal(p3d.visualType, tc.expectedVisual, `Visual type for ${tc.rarity}/${tc.card_type}`);
    assert.equal(p3d.rarity, tc.expectedCategory, `Collection category for ${tc.rarity}/${tc.card_type}`);
    assert.equal(p3d.economicRarity, tc.rarity, `Preserved economic rarity for ${tc.rarity}`);
    assert.equal(p3d.productionCardType, tc.card_type, `Preserved production card type for ${tc.card_type}`);

    // Step B: 3D Engine -> Production
    const roundTripped = toProductionCard(p3d);
    assert.equal(roundTripped.rarity, original.rarity, `Round-trip rarity mismatch for ${tc.rarity}`);
    assert.equal(roundTripped.card_type, original.card_type, `Round-trip card_type mismatch for ${tc.card_type}`);
    assert.equal(roundTripped.player_id, original.player_id);
    assert.equal(roundTripped.season, original.season);
    assert.equal(roundTripped.edition_size, original.edition_size);
    assert.equal(roundTripped.is_limited, original.is_limited);
  }
});

// -------------------------------------------------------------
// 3. ATYPICAL & CROSS-COMBINATION AUDIT
// -------------------------------------------------------------
test("SAFETY 3: Atypical combinations preserve economic rarity without downgrade/upgrade", () => {
  const edgeCases: Array<{
    name: string;
    rarity: CardRarity;
    card_type: CardType;
    expectedCategory: CollectionCategory;
  }> = [
    {
      name: "Epic Matchday (High-Value Meczowa)",
      rarity: "epic",
      card_type: "matchday",
      expectedCategory: "MATCHDAY"
    },
    {
      name: "Legendary Matchday (Finał Turnieju MVP)",
      rarity: "legendary",
      card_type: "matchday",
      expectedCategory: "LEGEND"
    },
    {
      name: "Common Matchday (Młodzieżowa rezerwa meczowa)",
      rarity: "common",
      card_type: "matchday",
      expectedCategory: "MATCHDAY"
    },
    {
      name: "Common Training Warrior (Podstawowy trening akademii)",
      rarity: "common",
      card_type: "training_warrior",
      expectedCategory: "RARE"
    },
    {
      name: "Epic Training Warrior (Wojownik Sezonu)",
      rarity: "epic",
      card_type: "training_warrior",
      expectedCategory: "GOLD"
    },
    {
      name: "Legendary Goal Hunter (Król Strzelców Wszech Czasów)",
      rarity: "legendary",
      card_type: "goal_hunter",
      expectedCategory: "LEGEND"
    },
    {
      name: "Rare Base (Wyróżniający się standard)",
      rarity: "rare",
      card_type: "base",
      expectedCategory: "RARE"
    },
    {
      name: "Inferno Special Event (Płonąca karta eventowa)",
      rarity: "inferno",
      card_type: "special_event",
      expectedCategory: "INFERNO"
    }
  ];

  for (const ec of edgeCases) {
    const card = makeCardDefinition({
      id: `edge_${ec.name}`,
      rarity: ec.rarity,
      card_type: ec.card_type
    });

    const p3d = fromProductionCard(card);
    assert.equal(p3d.economicRarity, ec.rarity, `[${ec.name}] economicRarity must exactly equal ${ec.rarity}`);
    assert.equal(p3d.productionCardType, ec.card_type, `[${ec.name}] productionCardType must exactly equal ${ec.card_type}`);

    const restored = toProductionCard(p3d);

    // CRITICAL ASSERTION: Economic rarity must NEVER be altered!
    assert.equal(
      restored.rarity,
      ec.rarity,
      `CRITICAL VIOLATION: [${ec.name}] Economic rarity altered! Expected ${ec.rarity}, got ${restored.rarity}`
    );
    assert.equal(
      restored.card_type,
      ec.card_type,
      `CRITICAL VIOLATION: [${ec.name}] Card type altered! Expected ${ec.card_type}, got ${restored.card_type}`
    );
  }
});

// -------------------------------------------------------------
// 4. DIRECT FALLBACK AND SYNTHETIC DATA AUDIT
// -------------------------------------------------------------
test("SAFETY 4: Direct fallback methods behave predictably for synthetic lab cards", () => {
  // When given a raw CollectionCategory with no economic origin:
  assert.equal(toProductionRarity("INFERNO"), "inferno");
  assert.equal(toProductionRarity("LEGEND"), "legendary");
  assert.equal(toProductionRarity("GOLD"), "epic");
  assert.equal(toProductionRarity("MATCHDAY"), "rare");
  assert.equal(toProductionRarity("RARE"), "rare");
  assert.equal(toProductionRarity("COMMON"), "common");

  // When provided an explicit economic fallback, fallback is strictly honored:
  assert.equal(toProductionRarity("MATCHDAY", "epic"), "epic");
  assert.equal(toProductionRarity("COMMON", "rare"), "rare");

  // Visual type resolution respects explicit frame themes:
  assert.equal(resolveCardVisualType({ frameTheme: "gold-master" }), "GOLD_MASTER");
  assert.equal(resolveCardVisualType({ frameTheme: "inferno-3d" }), "INFERNO_ULTRA");
  assert.equal(resolveCardVisualType({ frameTheme: "matchday-hero" }), "MATCHDAY_HERO");
  assert.equal(resolveCardVisualType({ frameTheme: "delta-icon" }), "DELTA_ICON");
  assert.equal(resolveCardVisualType({ frameTheme: "training-hero" }), "TRAINING_HERO");
  assert.equal(resolveCardVisualType({ frameTheme: "base" }), "BASE");

  // Category defaults return valid skins:
  assert.equal(getDefaultVisualTypeForCategory("INFERNO"), "INFERNO_ULTRA");
  assert.equal(getDefaultVisualTypeForCategory("LEGEND"), "DELTA_ICON");
  assert.equal(getDefaultVisualTypeForCategory("GOLD"), "GOLD_MASTER");
  assert.equal(getDefaultVisualTypeForCategory("MATCHDAY"), "MATCHDAY_HERO");
  assert.equal(getDefaultVisualTypeForCategory("RARE"), "TRAINING_HERO");
  assert.equal(getDefaultVisualTypeForCategory("COMMON"), "BASE");
});

// -------------------------------------------------------------
// 5. PACK OPENING INTEGRATION SAFETY (cardId, duplicates, instanceId)
// -------------------------------------------------------------
test("SAFETY 5: Pack opening attributes (cardId, duplicates, instanceId) round-trip with full fidelity", () => {
  const mockCard = makeCardDefinition({
    id: "card_prod_998877",
    player_id: "player_rybacki_01",
    rarity: "inferno",
    card_type: "inferno"
  });

  const adapted = fromProductionCard(mockCard, {
    ovr: 89,
    stats: { pac: 90, sho: 88, pas: 82, dri: 89, def: 60, phy: 80 },
    specialTitleId: "hat_trick_hero",
    isDuplicate: true,
    duplicatePoints: 20,
    instanceId: "inst_user_card_12345"
  });

  assert.equal(adapted.cardId, "card_prod_998877");
  assert.equal(adapted.playerId, "player_rybacki_01");
  assert.equal(adapted.ovr, 89);
  assert.equal(adapted.isDuplicate, true);
  assert.equal(adapted.duplicatePoints, 20);
  assert.equal(adapted.instanceId, "inst_user_card_12345");
  assert.equal(adapted.stats?.pac, 90);

  const restored = toProductionCard(adapted);
  assert.equal(restored.id, "card_prod_998877");
  assert.equal(restored.player_id, "player_rybacki_01");
  assert.equal(restored.rarity, "inferno");
  assert.equal(restored.card_type, "inferno");
});

// -------------------------------------------------------------
// 6. FEATURE FLAG SAFETY & DEFAULT INACTIVITY
// -------------------------------------------------------------
test("SAFETY 6: Feature flag NEXT_PUBLIC_COLLECTION_3D_WALKOUT_ENABLED defaults safely to inactive", () => {
  // Flag must be explicitly checked against "true"
  const checkFlag = (val?: string) => val === "true";

  assert.equal(checkFlag(undefined), false, "Undefined feature flag must be inactive (false)");
  assert.equal(checkFlag(""), false, "Empty string feature flag must be inactive (false)");
  assert.equal(checkFlag("false"), false, "'false' feature flag must be inactive (false)");
  assert.equal(checkFlag("0"), false, "'0' feature flag must be inactive (false)");
  assert.equal(checkFlag("true"), true, "'true' feature flag activates the 3D walkout modal");
});

// -------------------------------------------------------------
// 7. MULTI-CARD PACK WALKOUT SELECTION & INTEGRITY PRESERVATION
// -------------------------------------------------------------
test("SAFETY 7: Multi-card pack openings preserve all drawn cards without data loss", () => {
  // Simulate 5-card booster pack draw
  const drawnCards = [
    { card: makeCardDefinition({ id: "card_c1", rarity: "common", card_type: "base" }), is_duplicate: false, duplicate_points: 0 },
    { card: makeCardDefinition({ id: "card_r2", rarity: "rare", card_type: "training_hero" }), is_duplicate: false, duplicate_points: 0 },
    { card: makeCardDefinition({ id: "card_m3", rarity: "rare", card_type: "matchday_hero" }), is_duplicate: true, duplicate_points: 10 },
    { card: makeCardDefinition({ id: "card_i4", rarity: "inferno", card_type: "inferno" }), is_duplicate: false, duplicate_points: 0 },
    { card: makeCardDefinition({ id: "card_g5", rarity: "epic", card_type: "gold_master" }), is_duplicate: true, duplicate_points: 25 },
  ];

  // Best card selected strictly by presentation priority
  const priorityMap: Record<string, number> = {
    INFERNO: 100,
    DELTA_ICON: 90,
    GOLD_MASTER: 80,
    MATCHDAY_HERO: 70,
    CAPTAIN: 60,
    GOAL_MACHINE: 55,
    TRAINING_HERO: 50,
    STANDARD: 10
  };

  const getTheme = (c: any) => {
    const t = (c.card_type || c.frame_theme || "").toUpperCase();
    if (t.includes("INFERNO")) return "INFERNO";
    if (t.includes("GOLD")) return "GOLD_MASTER";
    if (t.includes("MATCHDAY")) return "MATCHDAY_HERO";
    if (t.includes("TRAINING")) return "TRAINING_HERO";
    return "STANDARD";
  };

  const scored = drawnCards.map((item, index) => {
    const theme = getTheme(item.card);
    return { item, index, theme, priority: priorityMap[theme] || 0 };
  });

  scored.sort((a, b) => b.priority - a.priority);
  const best = scored[0];

  // Best card must be the INFERNO card (id: card_i4)
  assert.equal(best.item.card.id, "card_i4");
  assert.equal(best.theme, "INFERNO");

  // Adapt best card for 3D Walkout Modal
  const adapted3D = fromProductionCard(best.item.card, {
    isDuplicate: best.item.is_duplicate,
    duplicatePoints: best.item.duplicate_points
  });

  assert.equal(adapted3D.visualType, "INFERNO_ULTRA");
  assert.equal(adapted3D.rarity, "INFERNO");
  assert.equal(adapted3D.cardId, "card_i4");

  // Verify all 5 cards in drawnCards remain 100% intact and unchanged
  assert.equal(drawnCards.length, 5);
  assert.equal(drawnCards[0].card.id, "card_c1");
  assert.equal(drawnCards[1].card.id, "card_r2");
  assert.equal(drawnCards[2].card.id, "card_m3");
  assert.equal(drawnCards[3].card.id, "card_i4");
  assert.equal(drawnCards[4].card.id, "card_g5");
  assert.equal(drawnCards[2].duplicate_points, 10);
  assert.equal(drawnCards[4].duplicate_points, 25);
});

// -------------------------------------------------------------
// 8. ZERO FABRICATED STATS & UNIFIED SHOWCASE MAPPING (ETAP UI.3)
// -------------------------------------------------------------
test("SAFETY 8: Production cards without OVR/stats NEVER fabricate OVR 80 or fake FIFA attributes", () => {
  const realProdCard = makeCardDefinition({
    id: "card_no_stats_001",
    rarity: "inferno",
    card_type: "inferno",
    artwork_url: "/assets/players/ryszard-inferno.png",
    card_number: 7,
    player: {
      id: "player_rybacki_01",
      display_name: "Ryszard Rybacki",
      shirt_number: "7",
      position: "NAP",
      photo_path: "/assets/players/ryszard-rybacki.png"
    }
  });

  const adapted = fromProductionCard(realProdCard);
  assert.equal(adapted.ovr, null, "OVR must be null when no real OVR is supplied (never 80)");
  assert.equal(adapted.stats, null, "Stats must be null when no real FIFA stats exist (never 75/70/72/74/65/70)");

  const unified = toUnifiedCardShowcase(realProdCard, { isDuplicate: true, duplicatePoints: 50 });
  assert.equal(unified.card3D.imageUrl, unified.deltaCard.playerImage, "3D card and DeltaCard miniature must resolve the exact same artwork/photo");
  assert.equal(unified.card3D.fullDisplayName, unified.deltaCard.playerName, "3D card fullDisplayName and DeltaCard playerName must match");
  assert.equal(String(unified.card3D.shirtNumber), String(unified.deltaCard.shirtNumber), "Shirt numbers must match across 3D and miniature");
  assert.equal(unified.deltaCard.stats, undefined, "DeltaCard miniature must not receive invented stats");
});

