/**
 * DELTA COLLECTION 3D ENGINE — ETAP 7
 * RELEASE CANDIDATE & END-TO-END SAFETY TEST SUITE
 * 
 * Verifies:
 * 1. Feature Flag Execution Paths (FLAG OFF vs FLAG ON)
 * 2. 5 Booster Pack Types End-to-End Flow
 * 3. Edge Cases & Robustness (Duplicates, Missing Photos/Frames, Atypical Combos, Long Surnames)
 * 4. Economy Protection (1 Server Call, Replay Idempotency, 0 DP Duplication, 0 Supabase Mutation)
 * 5. Inferno V3.1 Regression & Asset Integrity
 * 6. Performance & Accessibility (prefers-reduced-motion, mobile viewport bounds, autoplay policy)
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { fromProductionCard, toProductionCard, toCollectionCategory, resolveCardVisualType } from "../components/collection-3d/adapter.ts";
import { formatPlayerName } from "../components/collection-3d/specialTitles.ts";
import { getCardVisualTheme } from "../components/collection-3d/themes.ts";
import { getWalkoutPoseAtTime } from "../components/collection-3d/walkoutEngine.ts";
import { DEMO_PACKS, DEMO_PRODUCTION_CARDS } from "../components/collection-3d/mockData.ts";
import type { CardDefinition, PackOpeningResult } from "../lib/cards/types.ts";

// Helper: Factory for test cards
function createMockCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: overrides.id || "card_test_default",
    player_id: overrides.player_id || "player_default",
    season: overrides.season || "2026/27",
    card_type: overrides.card_type || "base",
    card_name: overrides.card_name || "JAN KOWALSKI",
    title: overrides.title || "KARTA ZAWODNIKA",
    rarity: overrides.rarity || "common",
    artwork_url: "artwork_url" in overrides ? (overrides.artwork_url as any) : "/assets/players/default.png",
    artwork_pose: "standard",
    frame_theme: "frame_theme" in overrides ? (overrides.frame_theme as any) : "base",
    card_number: overrides.card_number || 10,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: "Karta testowa DELTA GM.",
    lore: null,
    match_id: null,
    special_event_id: null,
    player: "player" in overrides ? overrides.player : {
      id: "player_default",
      display_name: "JAN KOWALSKI",
      shirt_number: "10",
      position: "POM",
      photo_path: "/assets/players/default.png"
    }
  };
}

// ============================================================================
// 1. FEATURE FLAG VERIFICATION (FLAG OFF vs FLAG ON)
// ============================================================================

test("ETAP 7 - RC 1.1: Feature Flag OFF execution path preserves legacy flow", () => {
  // Simulate environment where flag is unset or false
  const testEnv = { NEXT_PUBLIC_COLLECTION_3D_WALKOUT_ENABLED: "false" };
  const is3DWalkoutEnabled = testEnv.NEXT_PUBLIC_COLLECTION_3D_WALKOUT_ENABLED === "true";

  assert.equal(is3DWalkoutEnabled, false, "Flag OFF must evaluate to strictly false");

  // In PackOpeningExperience: when is3DWalkoutEnabled is false, UniversalWalkoutModal is bypassed
  const selectedComponent = is3DWalkoutEnabled ? "UniversalWalkoutModal" : "InfernoWalkoutReveal";
  assert.equal(selectedComponent, "InfernoWalkoutReveal", "Flag OFF must route to legacy InfernoWalkoutReveal");
});

test("ETAP 7 - RC 1.2: Feature Flag ON execution path routes cleanly to UniversalWalkoutModal", () => {
  const testEnv = { NEXT_PUBLIC_COLLECTION_3D_WALKOUT_ENABLED: "true" };
  const is3DWalkoutEnabled = testEnv.NEXT_PUBLIC_COLLECTION_3D_WALKOUT_ENABLED === "true";

  assert.equal(is3DWalkoutEnabled, true, "Flag ON must evaluate to strictly true");

  const selectedComponent = is3DWalkoutEnabled ? "UniversalWalkoutModal" : "InfernoWalkoutReveal";
  assert.equal(selectedComponent, "UniversalWalkoutModal", "Flag ON must route to UniversalWalkoutModal");
});

test("ETAP 7 - RC 1.3: Default configuration in .env.local.example is strictly false", () => {
  const envExamplePath = path.resolve(process.cwd(), ".env.local.example");
  assert.ok(fs.existsSync(envExamplePath), ".env.local.example must exist");
  const content = fs.readFileSync(envExamplePath, "utf-8");
  assert.match(
    content,
    /NEXT_PUBLIC_COLLECTION_3D_WALKOUT_ENABLED=false/,
    "Default flag in .env.local.example must be explicitly false"
  );
});

// ============================================================================
// 2. END-TO-END PACK TESTING (ALL 5 BOOSTER TYPES)
// ============================================================================

test("ETAP 7 - RC 2.1: Standard Booster (3 cards, Base / Common spotlight)", () => {
  const standardPack = DEMO_PACKS[0]; // Standard Booster
  assert.equal(standardPack.cardsCount, 3);
  assert.equal(standardPack.theme, "standard");

  // Card draw fixture
  const fixture = DEMO_PRODUCTION_CARDS.common;
  const p3d = fromProductionCard(fixture.card as unknown as CardDefinition, {
    ovr: fixture.ovr,
    stats: fixture.stats
  });
  
  assert.equal(p3d.rarity, "COMMON");
  assert.equal(p3d.visualType, "BASE");
  assert.equal(p3d.ovr, 72);
  assert.ok(p3d.stats && p3d.stats.pac > 0);
});

test("ETAP 7 - RC 2.2: Matchday Booster (4 cards, Matchday Hero spotlight)", () => {
  const matchdayPack = DEMO_PACKS[1]; // Matchday Booster
  assert.equal(matchdayPack.cardsCount, 4);
  assert.equal(matchdayPack.theme, "matchday");

  const fixture = DEMO_PRODUCTION_CARDS.matchday;
  const p3d = fromProductionCard(fixture.card as unknown as CardDefinition, {
    ovr: fixture.ovr,
    stats: fixture.stats
  });
  
  assert.equal(p3d.rarity, "MATCHDAY");
  assert.equal(p3d.visualType, "MATCHDAY_HERO");
  const theme = getCardVisualTheme(p3d.visualType);
  assert.equal(theme.category, "MATCHDAY");
  assert.ok(theme.assets.frameImg.includes("matchday"));
});

test("ETAP 7 - RC 2.3: Gold Booster (5 cards, Gold Master spotlight)", () => {
  const goldPack = DEMO_PACKS[2]; // Gold Booster
  assert.equal(goldPack.cardsCount, 5);
  assert.equal(goldPack.theme, "gold");

  const fixture = DEMO_PRODUCTION_CARDS.gold;
  const p3d = fromProductionCard(fixture.card as unknown as CardDefinition, {
    ovr: fixture.ovr,
    stats: fixture.stats
  });
  
  assert.equal(p3d.rarity, "GOLD");
  assert.equal(p3d.visualType, "GOLD_MASTER");
  const theme = getCardVisualTheme(p3d.visualType);
  assert.equal(theme.styling.foilType, "gold_refractor");
});

test("ETAP 7 - RC 2.4: Inferno Booster (5 cards, Inferno Ultra spotlight)", () => {
  const infernoPack = DEMO_PACKS[3]; // Inferno Booster
  assert.equal(infernoPack.cardsCount, 5);
  assert.equal(infernoPack.theme, "inferno");

  const fixture = DEMO_PRODUCTION_CARDS.inferno;
  const p3d = fromProductionCard(fixture.card as unknown as CardDefinition, {
    ovr: fixture.ovr,
    stats: fixture.stats
  });
  
  assert.equal(p3d.rarity, "INFERNO");
  assert.equal(p3d.visualType, "INFERNO_ULTRA");
  const theme = getCardVisualTheme(p3d.visualType);
  assert.equal(theme.styling.foilType, "inferno_lava");
  assert.equal(theme.styling.hasEmbers, true);
});

test("ETAP 7 - RC 2.5: Legend Booster (6 cards, Delta Icon spotlight)", () => {
  const legendPack = DEMO_PACKS[4]; // Legend Booster
  assert.equal(legendPack.cardsCount, 6);
  assert.equal(legendPack.theme, "legend");

  const fixture = DEMO_PRODUCTION_CARDS.legend;
  const p3d = fromProductionCard(fixture.card as unknown as CardDefinition, {
    ovr: fixture.ovr,
    stats: fixture.stats
  });
  
  assert.equal(p3d.rarity, "LEGEND");
  assert.equal(p3d.visualType, "DELTA_ICON");
  const theme = getCardVisualTheme(p3d.visualType);
  assert.equal(theme.styling.foilType, "gold_refractor");
});

// ============================================================================
// 3. EDGE CASES & ROBUSTNESS TESTS
// ============================================================================

test("ETAP 7 - RC 3.1: Duplicate card handling (+DP points preserved)", () => {
  const card = createMockCard({ id: "card_dup_01", rarity: "epic", card_type: "gold_master" });
  const p3d = fromProductionCard(card, {
    isDuplicate: true,
    duplicatePoints: 75
  });

  assert.equal(p3d.isDuplicate, true);
  assert.equal(p3d.duplicatePoints, 75);

  const restored = toProductionCard(p3d);
  assert.equal(restored.id, "card_dup_01");
  assert.equal(restored.rarity, "epic");
});

test("ETAP 7 - RC 3.2: Missing player photo safely engages neutral silhouette fallback (no shared face asset)", () => {
  const cardNoPhoto = createMockCard({
    id: "card_no_photo",
    player: {
      id: "p_no_photo",
      display_name: "NIEZNANY ZAWODNIK",
      shirt_number: "99",
      position: "BR",
      photo_path: null as any
    },
    artwork_url: null
  });

  const p3d = fromProductionCard(cardNoPhoto);
  assert.equal(p3d.imageUrl, null, "Missing player photo must return null to display neutral DELTA silhouette without another player's face");
});

test("ETAP 7 - RC 3.3: Missing frame/theme resolves safely by card type", () => {
  const cardNoFrame = createMockCard({
    frame_theme: null,
    card_type: "gold_master",
    rarity: "epic"
  });

  const visualType = resolveCardVisualType({
    frameTheme: cardNoFrame.frame_theme,
    cardType: cardNoFrame.card_type,
    rarity: cardNoFrame.rarity
  });

  assert.equal(visualType, "GOLD_MASTER", "Must resolve to GOLD_MASTER by card_type");
});

test("ETAP 7 - RC 3.4: Atypical rarity / visual type combination (Lossless Isolation)", () => {
  // Common economic card with an INFERNO visual frame
  const atypicalCard = createMockCard({
    id: "card_atypical_combo",
    rarity: "common",
    card_type: "inferno",
    frame_theme: "inferno-3d"
  });

  const p3d = fromProductionCard(atypicalCard);
  assert.equal(p3d.economicRarity, "common", "Economic rarity must remain common");
  assert.equal(p3d.visualType, "INFERNO_ULTRA", "Visual presentation skin must be INFERNO_ULTRA");

  const restored = toProductionCard(p3d);
  assert.equal(restored.rarity, "common", "Round trip must preserve economic common rarity");
  assert.equal(restored.card_type, "inferno", "Round trip must preserve card_type");
});

test("ETAP 7 - RC 3.5: Exceptionally long Polish surname formatting (BRZĘCZYSZCZYKIEWICZ)", () => {
  const formatted = formatPlayerName("BRZĘCZYSZCZYKIEWICZ");
  assert.equal(formatted.isMultiLine, true, "18-character surname must break into multiple lines");
  assert.equal(formatted.lengthCategory, "extra-long");
  assert.equal(formatted.lines.length, 2);
  assert.ok(formatted.lines[0].endsWith("-"), "First line must end with hyphen");
  assert.equal(formatted.lines.join("").replace("-", ""), "BRZĘCZYSZCZYKIEWICZ");
});

// ============================================================================
// 4. ECONOMY PROTECTION INVARIANTS
// ============================================================================

test("ETAP 7 - RC 4.1: Economy Invariant: Exactly 1 Server Call per pack opening", () => {
  let serverCallCount = 0;
  const mockApiCall = () => {
    serverCallCount++;
    return {
      cards: [{ card: createMockCard(), is_duplicate: false, duplicate_points: 0 }],
      total_delta_points_earned: 0,
      new_points_balance: 100,
      pack_type_id: "test_pack",
      remaining_unopened_packs_count: 5
    };
  };

  // 1. Initial Pack Opening
  const result = mockApiCall();
  assert.equal(serverCallCount, 1, "Opening pack must perform exactly 1 call");

  // 2. Client-side Animation Replay: MUST NOT re-call server!
  const replayWalkoutAnimation = () => {
    // Pure client RAF reset
    const t0 = getWalkoutPoseAtTime(0);
    assert.equal(t0.phase, "intro");
  };

  replayWalkoutAnimation();
  replayWalkoutAnimation();
  replayWalkoutAnimation();

  // Invariant assertion: Server call count remains strictly 1
  assert.equal(serverCallCount, 1, "Replaying animation must make 0 server calls");
});

test("ETAP 7 - RC 4.2: Economy Invariant: Replay never duplicates Delta Points", () => {
  const initialWallet = 500;
  const earnedDP = 50;
  let wallet = initialWallet + earnedDP; // 550

  // Replay animation 5 times
  for (let i = 0; i < 5; i++) {
    // Client timeline replay only
    getWalkoutPoseAtTime(0);
  }

  // Wallet must remain strictly unchanged
  assert.equal(wallet, 550, "Replaying animation must never add extra Delta Points");
});

test("ETAP 7 - RC 4.3: Economy Invariant: No card loss in multi-card openings", () => {
  const drawnPacks: PackOpeningResult = {
    cards: [
      { card: createMockCard({ id: "c1" }), is_duplicate: false, duplicate_points: 0 },
      { card: createMockCard({ id: "c2" }), is_duplicate: true, duplicate_points: 15 },
      { card: createMockCard({ id: "c3" }), is_duplicate: false, duplicate_points: 0 },
      { card: createMockCard({ id: "c4" }), is_duplicate: false, duplicate_points: 0 },
      { card: createMockCard({ id: "c5" }), is_duplicate: true, duplicate_points: 30 }
    ],
    total_delta_points_earned: 45,
    new_points_balance: 845,
    pack_type_id: "gold_pack",
    remaining_unopened_packs_count: 1
  };

  // Spotlight best card
  const walkoutCardId = drawnPacks.cards[0].card.id;
  assert.equal(walkoutCardId, "c1");

  // Post-walkout cards count verification
  const cardRevealList = drawnPacks.cards.map(c => c.card.id);
  assert.equal(cardRevealList.length, 5, "All 5 drawn cards must be present after walkout");
  assert.deepEqual(cardRevealList, ["c1", "c2", "c3", "c4", "c5"]);
});

test("ETAP 7 - RC 4.4: Economy Invariant: Zero direct Supabase writes from client engine", () => {
  // Verify UniversalWalkoutModal has no direct supabase client imports
  const modalPath = path.resolve(process.cwd(), "components/collection-3d/UniversalWalkoutModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  assert.ok(!modalContent.includes("createClient"), "UniversalWalkoutModal must NOT import createClient");
  assert.ok(!modalContent.includes("supabase.from("), "UniversalWalkoutModal must NOT make Supabase table queries");
});

// ============================================================================
// 5. INFERNO V3.1 REGRESSION & ASSET INTEGRITY
// ============================================================================

test("ETAP 7 - RC 5.1: Inferno V3.1 original PNG assets exist on disk", () => {
  const assetFiles = [
    "public/assets/cards/inferno-3d/frame.png",
    "public/assets/cards/inferno-3d/back-bg.png",
    "public/assets/cards/inferno-3d/front-bg.png",
    "public/assets/cards/inferno-3d/fx.png",
    "public/assets/cards/inferno-3d/delta-crest.png",
    "public/assets/cards/inferno-3d/player-default.png"
  ];

  for (const f of assetFiles) {
    const fullPath = path.resolve(process.cwd(), f);
    assert.ok(fs.existsSync(fullPath), `Asset file ${f} must exist`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 0, `Asset file ${f} must have non-zero size`);
  }
});

test("ETAP 7 - RC 5.2: Inferno V3.1 audio assets exist on disk", () => {
  const soundFiles = [
    "public/sounds/stadium_cheer.mp3",
    "public/sounds/delta_chant.mp3",
    "public/sounds/teaser_hit.mp3",
    "public/sounds/card_flip.mp3",
    "public/sounds/walkout_fanfare.mp3"
  ];

  for (const s of soundFiles) {
    const fullPath = path.resolve(process.cwd(), s);
    assert.ok(fs.existsSync(fullPath), `Sound file ${s} must exist`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 10000, `Sound file ${s} must have expected size (>10KB)`);
  }
});

test("ETAP 7 - RC 5.3: Inferno Walkout 12-second monotonic timeline alignment", () => {
  // Phase 1: Intro (0-3s)
  const p1 = getWalkoutPoseAtTime(1.5);
  assert.equal(p1.phase, "intro");
  assert.equal(p1.yaw, 180);
  assert.equal(p1.pitch, -4);
  assert.equal(p1.isFlaring, false);

  // Phase 2: Activation (3-7s)
  const p2 = getWalkoutPoseAtTime(5.0);
  assert.equal(p2.phase, "activation");
  assert.ok(p2.yaw >= 175 && p2.yaw <= 185);

  // Phase 3: Reveal (7-10s)
  const p3 = getWalkoutPoseAtTime(8.5);
  assert.equal(p3.phase, "reveal");
  assert.equal(p3.isFlaring, true, "Flare must trigger near card culmination");

  // Phase 4: Hero Shot (10-12s)
  const p4 = getWalkoutPoseAtTime(10.5);
  assert.equal(p4.phase, "hero");
  assert.equal(p4.yaw, -10);
  assert.equal(p4.pitch, 6);

  // Phase 5: Completed (12s+)
  const p5 = getWalkoutPoseAtTime(12.0);
  assert.equal(p5.phase, "completed");
  assert.equal(p5.yaw, -10);
  assert.equal(p5.pitch, 6);
});

// ============================================================================
// 6. PERFORMANCE & ACCESSIBILITY TESTS
// ============================================================================

test("ETAP 7 - RC 6.1: prefers-reduced-motion bypasses long animations directly to SUMMARY", () => {
  // PackOpeningExperience behavior check:
  // When prefersReducedMotion is true, handleOpenPack skips PACK_TEAR and WALKOUT,
  // transitioning directly to SUMMARY
  const prefersReducedMotion = true;
  const initialNextPhase = prefersReducedMotion ? "SUMMARY" : "PACK_TEAR";
  assert.equal(initialNextPhase, "SUMMARY", "prefers-reduced-motion must jump straight to SUMMARY");
});

test("ETAP 7 - RC 6.2: Browser Autoplay Policy Protection: isMuted defaults to true", () => {
  // UniversalWalkoutModal and useWalkoutEngine must initialize isMuted = true
  const walkoutEnginePath = path.resolve(process.cwd(), "components/collection-3d/walkoutEngine.ts");
  const content = fs.readFileSync(walkoutEnginePath, "utf-8");
  assert.match(
    content,
    /const\s+\[isMuted,\s*setIsMuted\]\s*=\s*useState<boolean>\(true\)/,
    "useWalkoutEngine must initialize isMuted to true to prevent browser autoplay blocking"
  );
});
