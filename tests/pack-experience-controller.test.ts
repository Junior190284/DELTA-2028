import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PackExperienceController,
  type PackAudioCue,
  type PackExperienceState
} from "../lib/cards/packExperienceController.ts";
import type { PackOpeningResult, CardDefinition } from "../lib/cards/types.ts";

// Helper to create test cards
function makeTestCard(id: string, theme: string, rarity: string, name: string): CardDefinition {
  return {
    id,
    player_id: `p_${id}`,
    season: "2026/27",
    card_type: theme,
    card_name: name,
    title: theme.toUpperCase(),
    rarity: rarity as any,
    artwork_url: `/assets/players/${id}.png`,
    artwork_pose: "standard",
    frame_theme: theme,
    card_number: 1,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: "Karta testowa",
    lore: null,
    match_id: null,
    special_event_id: null
  };
}

// Helper to create standard pack results
function makeTestResult(
  cards: { id: string; theme: string; rarity: string; name: string; is_dup?: boolean; dp?: number }[],
  totalDp = 0
): PackOpeningResult {
  return {
    cards: cards.map((c) => ({
      card: makeTestCard(c.id, c.theme, c.rarity, c.name),
      is_duplicate: c.is_dup ?? false,
      duplicate_points: c.dp ?? 0
    })),
    total_delta_points_earned: totalDp,
    new_points_balance: 500 + totalDp,
    pack_type_id: "test_pack",
    remaining_unopened_packs_count: 2
  };
}

test("1. Full sequential flow with walkout card", () => {
  const audioCues: PackAudioCue[] = [];
  const result = makeTestResult([
    { id: "c_inf", theme: "inferno", rarity: "inferno", name: "Ryszard Inferno" },
    { id: "c_base1", theme: "base", rarity: "common", name: "Zawodnik 1" },
    { id: "c_base2", theme: "base", rarity: "common", name: "Zawodnik 2" }
  ]);

  const controller = new PackExperienceController({
    result,
    timings: { openingTearMs: 10000, transitionMs: 10000 }, // Manual advance in test
    onAudioCue: (cue) => audioCues.push(cue)
  });

  assert.equal(controller.getState().phase, "READY");
  assert.equal(controller.getState().hasWalkout, true);
  assert.equal(controller.getState().heroCard?.card.id, "c_inf");
  assert.equal(controller.getState().revealCards.length, 2);

  // 1. PLAY -> OPENING
  assert.equal(controller.dispatch("PLAY"), true);
  assert.equal(controller.getState().phase, "OPENING");
  assert.ok(audioCues.includes("TEAR"));

  // 2. MEDIA_ENDED -> TRANSITION
  assert.equal(controller.dispatch("MEDIA_ENDED"), true);
  assert.equal(controller.getState().phase, "TRANSITION");
  assert.ok(audioCues.includes("TRANSITION_FLASH"));

  // 3. NEXT in transition -> WALKOUT
  assert.equal(controller.dispatch("NEXT"), true);
  assert.equal(controller.getState().phase, "WALKOUT");
  assert.ok(audioCues.includes("TEASER_HIT"));

  // 4. MEDIA_ENDED in walkout -> HERO_REVEAL
  assert.equal(controller.dispatch("MEDIA_ENDED"), true);
  assert.equal(controller.getState().phase, "HERO_REVEAL");
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_inf");
  assert.ok(audioCues.includes("HERO_FANFARE"));
  assert.ok(audioCues.includes("STADIUM_CHEER"));

  // 5. NEXT in HERO_REVEAL -> CARD_REVEAL (first non-hero card)
  assert.equal(controller.dispatch("NEXT"), true);
  assert.equal(controller.getState().phase, "CARD_REVEAL");
  assert.equal(controller.getState().currentRevealIndex, 0);
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_base1");
  assert.ok(audioCues.includes("CARD_FLIP"));

  // 6. NEXT in CARD_REVEAL -> advances to second card
  assert.equal(controller.dispatch("NEXT"), true);
  assert.equal(controller.getState().phase, "CARD_REVEAL");
  assert.equal(controller.getState().currentRevealIndex, 1);
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_base2");

  // 7. NEXT on last card -> SUMMARY
  assert.equal(controller.dispatch("NEXT"), true);
  assert.equal(controller.getState().phase, "SUMMARY");
  assert.equal(controller.getState().summaryCards.length, 3);
  assert.ok(audioCues.includes("SUMMARY_CHIME"));

  // 8. NEXT in SUMMARY -> COMPLETE
  assert.equal(controller.dispatch("NEXT"), true);
  assert.equal(controller.getState().phase, "COMPLETE");
  assert.equal(controller.getState().isComplete, true);
});

test("2. Pack without walkout-eligible card skips WALKOUT and HERO_REVEAL", () => {
  const result = makeTestResult([
    { id: "c_b1", theme: "base", rarity: "common", name: "Zawodnik 1" },
    { id: "c_b2", theme: "base", rarity: "common", name: "Zawodnik 2" }
  ]);

  const controller = new PackExperienceController({ result });
  assert.equal(controller.getState().hasWalkout, false);
  assert.equal(controller.getState().heroCard, null);
  assert.equal(controller.getState().revealCards.length, 2);

  controller.dispatch("PLAY");
  assert.equal(controller.getState().phase, "OPENING");

  controller.dispatch("MEDIA_ENDED");
  assert.equal(controller.getState().phase, "TRANSITION");

  // In transition, NEXT leads directly to CARD_REVEAL since heroCard is null
  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "CARD_REVEAL");
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_b1");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_b2");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "SUMMARY");
  assert.equal(controller.getState().summaryCards.length, 2);
});

test("3. Single-card pack with walkout transitions directly from HERO_REVEAL to SUMMARY", () => {
  const result = makeTestResult([
    { id: "c_gold", theme: "gold_master", rarity: "epic", name: "Ryszard Gold" }
  ]);

  const controller = new PackExperienceController({ result });
  assert.equal(controller.getState().hasWalkout, true);
  assert.equal(controller.getState().revealCards.length, 0); // Excluded heroCard leaves 0 reveal cards

  controller.dispatch("PLAY");
  controller.dispatch("MEDIA_ENDED");
  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "WALKOUT");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "HERO_REVEAL");

  // NEXT from HERO_REVEAL with 0 revealCards moves straight to SUMMARY
  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "SUMMARY");
  assert.equal(controller.getState().summaryCards.length, 1);
});

test("4. Multi-card pack with multiple eligible cards picks highest priority and reveals the rest", () => {
  const result = makeTestResult([
    { id: "c_match", theme: "matchday_hero", rarity: "rare", name: "Zawodnik Matchday" }, // Priority 40
    { id: "c_inf", theme: "inferno", rarity: "inferno", name: "Zawodnik Inferno" },         // Priority 100
    { id: "c_gold", theme: "gold_master", rarity: "epic", name: "Zawodnik Gold" }          // Priority 60
  ]);

  const controller = new PackExperienceController({ result });
  // INFERNO (100) must be selected over GOLD (60) and MATCHDAY (40)
  assert.equal(controller.getState().heroCard?.card.id, "c_inf");

  // The other 2 eligible cards must remain in revealCards in original order without duplication
  assert.equal(controller.getState().revealCards.length, 2);
  assert.equal(controller.getState().revealCards[0].card.id, "c_match");
  assert.equal(controller.getState().revealCards[1].card.id, "c_gold");

  // Check that c_inf is NEVER inside revealCards
  const containsHeroInReveal = controller.getState().revealCards.some((c) => c.card.id === "c_inf");
  assert.equal(containsHeroInReveal, false);

  // Check that summary contains all 3 cards
  assert.equal(controller.getState().summaryCards.length, 3);
});

test("5. Non-duplication invariant: All cards accounted for exactly once across presentation and summary", () => {
  const result = makeTestResult([
    { id: "c1", theme: "inferno", rarity: "inferno", name: "Card 1" },
    { id: "c2", theme: "base", rarity: "common", name: "Card 2", is_dup: true, dp: 25 },
    { id: "c3", theme: "base", rarity: "common", name: "Card 3", is_dup: true, dp: 10 },
    { id: "c4", theme: "gold_master", rarity: "epic", name: "Card 4" },
    { id: "c5", theme: "matchday_hero", rarity: "rare", name: "Card 5" }
  ], 35);

  const controller = new PackExperienceController({ result });
  const heroCard = controller.getState().heroCard;
  const revealCards = controller.getState().revealCards;
  const summaryCards = controller.getState().summaryCards;

  assert.ok(heroCard);
  assert.equal(heroCard.card.id, "c1");
  assert.equal(revealCards.length, 4);
  assert.equal(summaryCards.length, 5);

  // Total unique IDs across heroCard + revealCards must equal total cards
  const presentedIds = new Set([heroCard.card.id, ...revealCards.map((c) => c.card.id)]);
  assert.equal(presentedIds.size, 5);

  // Summary must preserve all original duplicates and DP values
  const dupCards = summaryCards.filter((c) => c.is_duplicate);
  assert.equal(dupCards.length, 2);
  const totalEarnedDp = dupCards.reduce((acc, c) => acc + c.duplicate_points, 0);
  assert.equal(totalEarnedDp, 35);
});

test("6. SKIP from any active phase immediately lands in SUMMARY with complete card list", () => {
  const phasesToTest: ("OPENING" | "TRANSITION" | "WALKOUT" | "HERO_REVEAL" | "CARD_REVEAL")[] = [
    "OPENING",
    "TRANSITION",
    "WALKOUT",
    "HERO_REVEAL",
    "CARD_REVEAL"
  ];

  for (const startPhase of phasesToTest) {
    const result = makeTestResult([
      { id: "c_inf", theme: "inferno", rarity: "inferno", name: "Card" },
      { id: "c_base", theme: "base", rarity: "common", name: "Card 2" }
    ]);
    const controller = new PackExperienceController({ result });

    // Advance to desired phase
    controller.dispatch("PLAY");
    if (startPhase !== "OPENING") controller.dispatch("MEDIA_ENDED"); // -> TRANSITION
    if (startPhase === "WALKOUT" || startPhase === "HERO_REVEAL" || startPhase === "CARD_REVEAL") {
      controller.dispatch("NEXT"); // -> WALKOUT
    }
    if (startPhase === "HERO_REVEAL" || startPhase === "CARD_REVEAL") {
      controller.dispatch("MEDIA_ENDED"); // -> HERO_REVEAL
    }
    if (startPhase === "CARD_REVEAL") {
      controller.dispatch("NEXT"); // -> CARD_REVEAL
    }

    assert.equal(controller.getState().phase, startPhase);

    // Call SKIP
    assert.equal(controller.dispatch("SKIP"), true);
    assert.equal(controller.getState().phase, "SUMMARY");
    assert.equal(controller.getState().summaryCards.length, 2);
  }
});

test("7. CLOSE immediately transitions to COMPLETE, cancels timers and emits STOP_ALL audio", () => {
  const audioCues: PackAudioCue[] = [];
  const result = makeTestResult([{ id: "c1", theme: "base", rarity: "common", name: "C1" }]);

  const controller = new PackExperienceController({
    result,
    onAudioCue: (cue) => audioCues.push(cue)
  });

  controller.dispatch("PLAY");
  assert.equal(controller.getState().phase, "OPENING");

  assert.equal(controller.dispatch("CLOSE"), true);
  assert.equal(controller.getState().phase, "COMPLETE");
  assert.equal(controller.getState().isComplete, true);
  assert.ok(audioCues.includes("STOP_ALL"));

  // Subsequent events are blocked
  assert.equal(controller.dispatch("PLAY"), false);
  assert.equal(controller.dispatch("NEXT"), false);
  assert.equal(controller.dispatch("SKIP"), false);
});

test("8. MEDIA_ERROR and TIMEOUT smoothly advance OPENING to TRANSITION fallback", () => {
  // Test MEDIA_ERROR
  const res1 = makeTestResult([{ id: "c1", theme: "base", rarity: "common", name: "C1" }]);
  const c1 = new PackExperienceController({ result: res1 });
  c1.dispatch("PLAY");
  assert.equal(c1.getState().phase, "OPENING");
  assert.equal(c1.dispatch("MEDIA_ERROR"), true);
  assert.equal(c1.getState().phase, "TRANSITION");

  // Test TIMEOUT
  const res2 = makeTestResult([{ id: "c2", theme: "base", rarity: "common", name: "C2" }]);
  const c2 = new PackExperienceController({ result: res2 });
  c2.dispatch("PLAY");
  assert.equal(c2.getState().phase, "OPENING");
  assert.equal(c2.dispatch("TIMEOUT"), true);
  assert.equal(c2.getState().phase, "TRANSITION");
});

test("9. Idempotence: Duplicate rapid events do not cause illegal phase skips", () => {
  const result = makeTestResult([{ id: "c1", theme: "base", rarity: "common", name: "C1" }]);
  const controller = new PackExperienceController({ result });

  // Multiple PLAY events while in READY: only first succeeds
  assert.equal(controller.dispatch("PLAY"), true);
  assert.equal(controller.dispatch("PLAY"), false);
  assert.equal(controller.getState().phase, "OPENING");

  // Multiple SKIP calls: only first performs transition
  assert.equal(controller.dispatch("SKIP"), true);
  assert.equal(controller.getState().phase, "SUMMARY");
  assert.equal(controller.dispatch("SKIP"), false); // In SUMMARY, SKIP is false
  assert.equal(controller.getState().phase, "SUMMARY");
});

test("10. Reduced Motion directly bypasses opening animations into SUMMARY", () => {
  const result = makeTestResult([
    { id: "c_inf", theme: "inferno", rarity: "inferno", name: "Inferno Hero" }
  ]);
  const controller = new PackExperienceController({
    result,
    reducedMotion: true
  });

  assert.equal(controller.dispatch("PLAY"), true);
  assert.equal(controller.getState().phase, "SUMMARY");
  assert.equal(controller.getState().summaryCards.length, 1);
});

test("11. Audio Mute control properly suppresses audio cues", () => {
  const audioCues: PackAudioCue[] = [];
  const result = makeTestResult([{ id: "c1", theme: "base", rarity: "common", name: "C1" }]);
  const controller = new PackExperienceController({
    result,
    initialMuted: true,
    onAudioCue: (cue) => audioCues.push(cue)
  });

  assert.equal(controller.getState().isMuted, true);

  controller.dispatch("PLAY");
  // Audio cues must be suppressed when isMuted = true
  assert.equal(audioCues.length, 0);

  // Unmuting and dispatching next
  controller.setMuted(false);
  assert.equal(controller.getState().isMuted, false);

  controller.dispatch("MEDIA_ENDED");
  assert.ok(audioCues.includes("TRANSITION_FLASH"));
});

test("12. enable_3d_walkout flag and STOP_ALL audio on SKIP", () => {
  const audioCues: PackAudioCue[] = [];
  const resTrue = makeTestResult([{ id: "c1", theme: "inferno", rarity: "inferno", name: "Inf" }]);
  resTrue.enable_3d_walkout = true;
  const cTrue = new PackExperienceController({
    result: resTrue,
    onAudioCue: (cue) => audioCues.push(cue)
  });
  assert.equal(cTrue.getState().is3DWalkoutEnabled, true);

  cTrue.dispatch("PLAY");
  cTrue.dispatch("SKIP");
  // SKIP must stop any playing media before summary chime
  assert.ok(audioCues.includes("STOP_ALL"));
  assert.ok(audioCues.includes("SUMMARY_CHIME"));

  const resFalse = makeTestResult([{ id: "c2", theme: "inferno", rarity: "inferno", name: "Inf2" }]);
  resFalse.enable_3d_walkout = false;
  const cFalse = new PackExperienceController({ result: resFalse });
  assert.equal(cFalse.getState().is3DWalkoutEnabled, false);
});

test("13. Manual NEXT in TRANSITION schedules WALKOUT timer and auto-advances to HERO_REVEAL", async () => {
  const result = makeTestResult([
    { id: "c_gold", theme: "gold_master", rarity: "epic", name: "Gold Hero" },
    { id: "c_base", theme: "base", rarity: "common", name: "Base Card" }
  ]);
  result.enable_3d_walkout = true;

  const controller = new PackExperienceController({
    result,
    timings: { openingTearMs: 5000, transitionMs: 5000, walkoutStandardMs: 35, walkoutInfernoMs: 50 }
  });

  controller.dispatch("PLAY");
  assert.equal(controller.getState().phase, "OPENING");

  controller.dispatch("MEDIA_ENDED");
  assert.equal(controller.getState().phase, "TRANSITION");

  // Manual NEXT from TRANSITION must still schedule the WALKOUT timer
  assert.equal(controller.dispatch("NEXT"), true);
  assert.equal(controller.getState().phase, "WALKOUT");

  await new Promise((resolve) => setTimeout(resolve, 75));
  assert.equal(controller.getState().phase, "HERO_REVEAL");
  controller.dispose();
});

test("14. enable_3d_walkout=false bypasses WALKOUT/HERO_REVEAL and keeps all cards in CARD_REVEAL", () => {
  const result = makeTestResult([
    { id: "c_inf", theme: "inferno", rarity: "inferno", name: "Inferno Card" },
    { id: "c_gold", theme: "gold_master", rarity: "epic", name: "Gold Card" },
    { id: "c_base", theme: "base", rarity: "common", name: "Base Card" }
  ]);
  result.enable_3d_walkout = false;

  const controller = new PackExperienceController({ result });
  const initState = controller.getState();

  assert.equal(initState.is3DWalkoutEnabled, false);
  assert.equal(initState.hasWalkout, false);
  assert.equal(initState.heroCard, null);
  assert.equal(initState.walkoutDurationMs, 0);
  assert.deepEqual(
    initState.revealCards.map((c) => c.card.id),
    ["c_inf", "c_gold", "c_base"]
  );

  controller.dispatch("PLAY");
  controller.dispatch("MEDIA_ENDED");
  assert.equal(controller.getState().phase, "TRANSITION");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "CARD_REVEAL");
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_inf");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_gold");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().currentDisplayCard?.card.id, "c_base");

  controller.dispatch("NEXT");
  assert.equal(controller.getState().phase, "SUMMARY");
  assert.equal(controller.getState().summaryCards.length, 3);
  controller.dispose();
});

test("15. walkoutDurationMs exposes exact controller timing for RAF synchronization", () => {
  const resInferno = makeTestResult([{ id: "c_inf", theme: "inferno", rarity: "inferno", name: "Inf" }]);
  resInferno.enable_3d_walkout = true;
  const cInferno = new PackExperienceController({
    result: resInferno,
    timings: { walkoutInfernoMs: 4800, walkoutStandardMs: 3200 }
  });
  assert.equal(cInferno.getState().walkoutDurationMs, 4800);
  assert.equal(cInferno.getWalkoutDurationMs(), 4800);

  const resMatchday = makeTestResult([{ id: "c_m", theme: "matchday_hero", rarity: "rare", name: "M" }]);
  resMatchday.enable_3d_walkout = true;
  const cMatchday = new PackExperienceController({
    result: resMatchday,
    timings: { walkoutInfernoMs: 4800, walkoutStandardMs: 3200 }
  });
  assert.equal(cMatchday.getState().walkoutDurationMs, 3200);

  const resNoWalkout = makeTestResult([{ id: "c_b", theme: "base", rarity: "common", name: "B" }]);
  const cBase = new PackExperienceController({ result: resNoWalkout });
  assert.equal(cBase.getState().walkoutDurationMs, 0);
});

test("16. dispose() cancels active timers cleanly and blocks stale transitions/audio cues", async () => {
  const cues: PackAudioCue[] = [];
  const states: PackExperienceState[] = [];
  const result = makeTestResult([{ id: "c_inf", theme: "inferno", rarity: "inferno", name: "Inf" }]);
  result.enable_3d_walkout = true;

  const controller = new PackExperienceController({
    result,
    timings: { openingTearMs: 25, transitionMs: 25, walkoutInfernoMs: 25 },
    onAudioCue: (cue) => cues.push(cue)
  });
  controller.subscribe((s) => states.push(s));

  controller.dispatch("PLAY");
  assert.equal(controller.getState().phase, "OPENING");

  const statesCountBeforeDispose = states.length;
  controller.dispose();
  assert.equal(controller.getState().isComplete, true);
  assert.ok(cues.includes("STOP_ALL"));

  const cuesCountAfterDispose = cues.length;
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(states.length, statesCountBeforeDispose, "Disposed controller must not notify subscribers later");
  assert.equal(cues.length, cuesCountAfterDispose, "Disposed timers must not emit delayed audio cues");
});

test("17. CinematicPackExperience V2 integrates controller lifecycle cleanup, synced RAF, keyboard controls, and bounded stage geometry", () => {
  const v2Path = path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx");
  const cssPath = path.resolve(process.cwd(), "components/pack-opening-v2/cinematic-pack.css");
  const code = fs.readFileSync(v2Path, "utf-8");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.match(code, /nextController\.dispose\(\)/, "Cleanup must dispose PackExperienceController");
  assert.match(code, /state\.walkoutDurationMs/, "RAF walkout animation must synchronize with controller walkoutDurationMs");
  assert.match(code, /e\.key === "Escape"/, "Escape key handler must exist");
  assert.match(code, /currentPhase === "READY"/, "Enter/Space must support starting from READY");
  assert.match(code, /data-testid="cinematic-card-stage-slot"/, "Safe padded stage slot must wrap 3D card");
  assert.match(code, /size="responsive"/, "SUMMARY cards must use size=responsive inside flex-wrap boxes");
  assert.match(css, /\.cinematic-v2-arena\s+\.universal-stage-scene/, "Stage height must be scoped inside modal container");
});

test("18. ETAP UI.3 guarantees continuous Stage3DEngine into CARD_REVEAL, Card3DEngine usage, zero fake OVR 88, and Tailwind-free badges", () => {
  const v2Path = path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx");
  const card3dPath = path.resolve(process.cwd(), "components/collection-3d/Card3DEngine.tsx");
  const badgePath = path.resolve(process.cwd(), "components/cards/CardBadgeHeader.tsx");
  const nameplatePath = path.resolve(process.cwd(), "components/cards/CardNameplate.tsx");

  const v2 = fs.readFileSync(v2Path, "utf-8");
  const card3d = fs.readFileSync(card3dPath, "utf-8");
  const badge = fs.readFileSync(badgePath, "utf-8");
  const nameplate = fs.readFileSync(nameplatePath, "utf-8");

  assert.match(v2, /activeStagePhase === "CARD_REVEAL"/, "Stage3DEngine must stay active across CARD_REVEAL");
  assert.match(v2, /toUnifiedCardShowcase/, "CinematicPackExperience must use unified card mapping");
  assert.match(v2, /v2-card-exiting-layer/, "Smooth outgoing card transition layer must exist");
  assert.match(v2, /v2-card-entering-anim/, "Smooth incoming card transition animation must exist");

  assert.doesNotMatch(card3d, /data\.ovr\s*\|\|\s*88/, "Card3DEngine must not invent fallback OVR 88");
  assert.doesNotMatch(card3d, /data\.position\s*\|\|\s*"FWD"/, "Card3DEngine must not invent fallback FWD position");
  assert.match(card3d, /inferno-front-series-bar/, "Card3DEngine must render real metadata bar when FIFA stats are null");

  assert.doesNotMatch(badge, /cqw\]|inset-x|text-\[/, "CardBadgeHeader must not depend on missing Tailwind classes");
  assert.doesNotMatch(nameplate, /cqw\]/, "CardNameplate must use explicit inline styles instead of missing Tailwind cqw classes");
});
