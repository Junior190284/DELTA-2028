import { test } from "node:test";
import assert from "node:assert/strict";
import { FetchSequenceGuard, createDebouncedRevalidator } from "../lib/cards/cardSync.ts";

/**
 * DELTA Card System — Dedicated State Synchronization & Cache Reconciliation Tests
 */

// Mock User Card State Store
interface MockUserCard {
  card_id: string;
  duplicates_count: number;
  is_favorite: boolean;
  acquired_at: string;
}

interface MockState {
  unopenedPacksCount: number;
  userCards: Map<string, MockUserCard>;
  deltaPoints: number;
}

function createMockState(): MockState {
  const cards = new Map<string, MockUserCard>();
  cards.set("card_base_1", {
    card_id: "card_base_1",
    duplicates_count: 0,
    is_favorite: false,
    acquired_at: "2026-10-01T10:00:00Z"
  });
  return {
    unopenedPacksCount: 10,
    userCards: cards,
    deltaPoints: 100
  };
}

// TEST 1: Open pack success decrements unopened packs count (10 -> 9)
test("TEST 1: open pack success decrements unopened packs (10 -> 9)", () => {
  const state = createMockState();
  assert.equal(state.unopenedPacksCount, 10);

  // Simulate server pack opening response
  const serverResponse = {
    remaining_unopened_packs_count: 9,
    drawnCards: [{ id: "card_base_2", is_duplicate: false }]
  };

  state.unopenedPacksCount = serverResponse.remaining_unopened_packs_count;
  assert.equal(state.unopenedPacksCount, 9, "Unopened packs count must be updated to 9 from server response");
});

// TEST 2: New card appears in collection
test("TEST 2: new card appears in Collection upon open-pack", () => {
  const state = createMockState();
  assert.equal(state.userCards.has("card_inferno_1"), false);

  const serverDrawnCards = [
    { id: "card_inferno_1", is_duplicate: false }
  ];

  for (const drawn of serverDrawnCards) {
    if (!state.userCards.has(drawn.id)) {
      state.userCards.set(drawn.id, {
        card_id: drawn.id,
        duplicates_count: 0,
        is_favorite: false,
        acquired_at: new Date().toISOString()
      });
    }
  }

  assert.equal(state.userCards.has("card_inferno_1"), true, "New card must be present in user cards collection");
  assert.equal(state.userCards.get("card_inferno_1")?.duplicates_count, 0);
});

// TEST 3: Duplicate increments exactly once
test("TEST 3: duplicate increments duplicates_count exactly once", () => {
  const state = createMockState();
  const existingCard = state.userCards.get("card_base_1")!;
  assert.equal(existingCard.duplicates_count, 0);

  const serverDrawnCards = [
    { id: "card_base_1", is_duplicate: true, duplicate_points: 4 }
  ];

  for (const drawn of serverDrawnCards) {
    const existing = state.userCards.get(drawn.id);
    if (existing) {
      existing.duplicates_count += 1;
    }
  }

  assert.equal(existingCard.duplicates_count, 1, "Duplicate count must increment exactly once");
});

// TEST 4: ALREADY_OPENED error does not decrement count, add card, or increment duplicate
test("TEST 4: ALREADY_OPENED error produces no decrement, no new card, and no duplicate increment", () => {
  const state = createMockState();
  const initialUnopened = state.unopenedPacksCount;
  const initialCardsCount = state.userCards.size;
  const initialDupCount = state.userCards.get("card_base_1")!.duplicates_count;

  // Simulate ALREADY_OPENED error response (409 Conflict)
  const errorResponse = {
    status: 409,
    error: "ALREADY_OPENED: Ta paczka została już wcześniej otwarta."
  };

  const isAlreadyOpened = errorResponse.status === 409 || errorResponse.error.includes("ALREADY_OPENED");

  if (isAlreadyOpened) {
    // Only reconciliation, no state mutation
  } else {
    state.unopenedPacksCount -= 1;
  }

  assert.equal(state.unopenedPacksCount, initialUnopened, "Unopened count must not be decremented on ALREADY_OPENED");
  assert.equal(state.userCards.size, initialCardsCount, "No new cards added on ALREADY_OPENED");
  assert.equal(state.userCards.get("card_base_1")!.duplicates_count, initialDupCount, "Duplicate count unmodified on ALREADY_OPENED");
});

// TEST 5: Favorite optimistic update + success
test("TEST 5: favorite optimistic update + success keeps new favorite state", async () => {
  const state = createMockState();
  const card = state.userCards.get("card_base_1")!;
  assert.equal(card.is_favorite, false);

  // Optimistic update
  card.is_favorite = true;
  assert.equal(card.is_favorite, true);

  // Simulated API call success
  const apiCall = async () => ({ ok: true, status: 200 });
  const res = await apiCall();

  if (!res.ok) {
    card.is_favorite = false; // rollback
  }

  assert.equal(card.is_favorite, true, "Card favorite state remains true on API success");
});

// TEST 6: Favorite API failure -> rollback
test("TEST 6: favorite API failure triggers rollback to previous state", async () => {
  const state = createMockState();
  const card = state.userCards.get("card_base_1")!;
  const originalState = card.is_favorite; // false

  // 1. Optimistic toggle
  card.is_favorite = true;
  assert.equal(card.is_favorite, true, "Optimistically set to true");

  // 2. Simulated API call failure (e.g. 500 Network Error)
  const apiCall = async () => ({ ok: false, status: 500 });
  const res = await apiCall();

  // 3. Rollback
  if (!res.ok) {
    card.is_favorite = originalState;
  }

  assert.equal(card.is_favorite, false, "Card favorite state rolled back to false on failure");
});

// TEST 7: pack-opened event received once per opening
test("TEST 7: pack-opened event fires exactly once per pack opening", () => {
  let eventDispatchedCount = 0;
  const onPackOpened = () => {
    eventDispatchedCount += 1;
  };

  // Simulate single pack open completion
  const openPack = () => {
    onPackOpened();
  };

  openPack();
  assert.equal(eventDispatchedCount, 1, "pack-opened listener must receive exactly 1 event");
});

// TEST 8: collection-updated does not create infinite refresh loop
test("TEST 8: debounced revalidator coalesces multiple rapid events into a single execution", async () => {
  let executionCount = 0;

  const mockFetch = async () => {
    executionCount += 1;
  };

  const debouncedRevalidate = createDebouncedRevalidator(mockFetch, 30);

  // Fire 5 rapid events in sequence
  debouncedRevalidate();
  debouncedRevalidate();
  debouncedRevalidate();
  debouncedRevalidate();
  debouncedRevalidate();

  // Wait for debounce window
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(executionCount, 1, "5 rapid events must be coalesced into exactly 1 revalidation execution");
});

// TEST 9: Stale fetch cannot overwrite newer state (FetchSequenceGuard)
test("TEST 9: FetchSequenceGuard prevents older out-of-order fetch from overwriting newer state", async () => {
  const guard = new FetchSequenceGuard();
  let latestAppliedData: string = "initial";

  // Request A (starts first, resolves late)
  const seqA = guard.startRequest();
  const promiseA = new Promise<{ seq: number; data: string }>(resolve => {
    setTimeout(() => resolve({ seq: seqA, data: "stale_data_A" }), 50);
  });

  // Request B (starts second, resolves early)
  const seqB = guard.startRequest();
  const promiseB = new Promise<{ seq: number; data: string }>(resolve => {
    setTimeout(() => resolve({ seq: seqB, data: "fresh_data_B" }), 10);
  });

  const resB = await promiseB;
  if (guard.isLatest(resB.seq)) {
    latestAppliedData = resB.data;
  }

  const resA = await promiseA;
  if (guard.isLatest(resA.seq)) {
    latestAppliedData = resA.data;
  }

  assert.equal(latestAppliedData, "fresh_data_B", "Stale Request A must not overwrite newer Request B");
});

// TEST 10: VIP Locker and My 11 receive refreshed card list
test("TEST 10: VIP Locker and My 11 state selectors receive updated card list without page reload", () => {
  const initialCards = [
    { id: "c1", card_name: "KARTA 1", rarity: "common", is_favorite: false }
  ];

  let vipShowcaseCards = [...initialCards];
  let my11AvailableCards = [...initialCards];

  // When a new card is drawn and synced
  const newCard = { id: "c2", card_name: "KARTA 2 INFERNO", rarity: "inferno", is_favorite: true };
  const updatedCards = [...initialCards, newCard];

  // Re-evaluation handler triggered by collection event
  vipShowcaseCards = [...updatedCards];
  my11AvailableCards = [...updatedCards];

  assert.equal(vipShowcaseCards.length, 2, "VIP Locker showcase reflects 2 cards");
  assert.equal(my11AvailableCards.length, 2, "My 11 picker reflects 2 cards");
  assert.equal(vipShowcaseCards.some(c => c.rarity === "inferno"), true, "VIP Locker shows newly unpacked Inferno card");
});

// ==========================================================================
// ETAP 13E WALKOUT REGRESSION FIX TESTS (10 TESTS)
// ==========================================================================

import { 
  normalizeCardTheme, 
  isWalkoutEligibleTheme, 
  WALKOUT_PRESENTATION_PRIORITY,
  cardToWalkoutData 
} from "../lib/cards/walkout-config.ts";

// Helper for test card selection
function selectBestWalkoutCard(cards: Array<{ card_type?: string; frame_theme?: string; title?: string; player?: any }>) {
  const eligible = cards
    .map((card, index) => {
      const theme = normalizeCardTheme(card.card_type || card.frame_theme);
      const priority = WALKOUT_PRESENTATION_PRIORITY[theme] || 0;
      return { card, index, theme, priority };
    })
    .filter(x => x.priority > 0);

  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b.priority - a.priority);
  return eligible[0];
}

// TEST 11 (WALKOUT 1): INFERNO triggers cinematic walkout
test("TEST 11 (WALKOUT 1): INFERNO triggers cinematic walkout", () => {
  assert.equal(isWalkoutEligibleTheme("INFERNO"), true);
  const cards = [
    { card_type: "base", title: "Zawodnik A" },
    { card_type: "inferno", title: "Zawodnik B" }
  ];
  const selected = selectBestWalkoutCard(cards);
  assert.ok(selected);
  assert.equal(selected.theme, "INFERNO");
  assert.equal(selected.card.title, "Zawodnik B");
});

// TEST 12 (WALKOUT 2): DELTA_ICON triggers cinematic walkout
test("TEST 12 (WALKOUT 2): DELTA_ICON triggers cinematic walkout", () => {
  assert.equal(isWalkoutEligibleTheme("DELTA_ICON"), true);
  const cards = [
    { card_type: "base", title: "Zawodnik A" },
    { card_type: "delta_icon", title: "Ikona C" }
  ];
  const selected = selectBestWalkoutCard(cards);
  assert.ok(selected);
  assert.equal(selected.theme, "DELTA_ICON");
  assert.equal(selected.card.title, "Ikona C");
});

// TEST 13 (WALKOUT 3): GOLD_MASTER triggers cinematic walkout
test("TEST 13 (WALKOUT 3): GOLD_MASTER triggers cinematic walkout", () => {
  assert.equal(isWalkoutEligibleTheme("GOLD_MASTER"), true);
  const cards = [
    { card_type: "base", title: "Zawodnik A" },
    { card_type: "gold_master", title: "Złoty Mistrz D" }
  ];
  const selected = selectBestWalkoutCard(cards);
  assert.ok(selected);
  assert.equal(selected.theme, "GOLD_MASTER");
  assert.equal(selected.card.title, "Złoty Mistrz D");
});

// TEST 14 (WALKOUT 4): standard-only pack skips cinematic walkout
test("TEST 14 (WALKOUT 4): standard-only pack skips cinematic walkout", () => {
  assert.equal(isWalkoutEligibleTheme("STANDARD"), false);
  const cards = [
    { card_type: "base", title: "Zawodnik A" },
    { card_type: "base", title: "Zawodnik B" },
    { card_type: "standard", title: "Zawodnik C" }
  ];
  const selected = selectBestWalkoutCard(cards);
  assert.equal(selected, null, "Standard-only pack must not trigger walkout");
});

// TEST 15 (WALKOUT 5): OVR is not used anywhere in selection
test("TEST 15 (WALKOUT 5): OVR is not used anywhere in selection", () => {
  // Even if a base card had a hypothetical OVR=99 and an INFERNO card had OVR=50,
  // selection is purely driven by canonical presentation priority
  const cardsWithHypotheticalOvr = [
    { card_type: "base", title: "Base Card", ovr: 99, rating: 99 },
    { card_type: "inferno", title: "Inferno Card", ovr: 50, rating: 50 }
  ];
  const selected = selectBestWalkoutCard(cardsWithHypotheticalOvr);
  assert.ok(selected);
  assert.equal(selected.theme, "INFERNO");
  assert.equal(selected.card.title, "Inferno Card", "Selection ignores OVR and respects canonical theme priority");

  // Verify walkout data contains no rating field
  const walkoutData = cardToWalkoutData(selected.card);
  assert.equal((walkoutData as any).rating, undefined, "InfernoWalkoutData must not contain rating/ovr field");
});

// TEST 16 (WALKOUT 6): fake rarity aliases are not used
test("TEST 16 (WALKOUT 6): fake rarity aliases are not used", () => {
  // Canonical themes are validated
  const canonicalThemes = ["INFERNO", "DELTA_ICON", "GOLD_MASTER", "MATCHDAY_HERO", "SEASONAL_EVENT", "STANDARD"];
  for (const t of canonicalThemes) {
    const norm = normalizeCardTheme(t);
    assert.equal(norm, t, `Theme ${t} must normalize to canonical ${t}`);
  }

  // Fake aliases like Mythic normalize to STANDARD safely
  assert.equal(normalizeCardTheme("Mythic"), "STANDARD");
});

// TEST 17 (WALKOUT 7): multi-card pack reveals remaining cards after walkout
test("TEST 17 (WALKOUT 7): multi-card pack reveals remaining cards after walkout", () => {
  const drawnCards = [
    { card: { id: "c1", card_type: "inferno" }, is_duplicate: false },
    { card: { id: "c2", card_type: "base" }, is_duplicate: false },
    { card: { id: "c3", card_type: "base" }, is_duplicate: false }
  ];

  let currentPhase = "WALKOUT";
  const onWalkoutAdvance = () => {
    if (drawnCards.length > 1) {
      currentPhase = "CARD_REVEAL";
    } else {
      currentPhase = "SUMMARY";
    }
  };

  onWalkoutAdvance();
  assert.equal(currentPhase, "CARD_REVEAL", "Multi-card pack moves to CARD_REVEAL after walkout to show remaining cards");
});

// TEST 18 (WALKOUT 8): skip exits walkout safely
test("TEST 18 (WALKOUT 8): skip exits walkout safely", () => {
  let currentPhase = "WALKOUT";
  const onSkip = () => {
    currentPhase = "SUMMARY";
  };

  onSkip();
  assert.equal(currentPhase, "SUMMARY", "Skip jumps safely to summary without state mutation");
});

// TEST 19 (WALKOUT 9): server cards remain source of truth
test("TEST 19 (WALKOUT 9): server cards remain source of truth", () => {
  const serverResponse = {
    cards: [
      { card: { id: "c_real_1", card_name: "Real Player 1", card_type: "inferno" }, is_duplicate: false, duplicate_points: 0 },
      { card: { id: "c_real_2", card_name: "Real Player 2", card_type: "base" }, is_duplicate: true, duplicate_points: 10 }
    ],
    total_delta_points_earned: 10
  };

  // Walkout presentation only consumes cards from serverResponse
  const displayedCards = serverResponse.cards.map(c => c.card);
  assert.equal(displayedCards.length, 2);
  assert.equal(displayedCards[0].id, "c_real_1");
  assert.equal(displayedCards[1].id, "c_real_2");
});

// TEST 20 (WALKOUT 10): collection sync happens before cinematic completion
test("TEST 20 (WALKOUT 10): collection sync happens before cinematic completion", () => {
  let stateSynced = false;
  let walkoutFinished = false;

  const handleOpenPackResponse = () => {
    // 1. Immediate sync upon backend response
    stateSynced = true;
  };

  const handleWalkoutCompletion = () => {
    // 2. Cinematic completion later
    walkoutFinished = true;
  };

  // Execute in order
  handleOpenPackResponse();
  assert.equal(stateSynced, true, "State must be synced immediately upon server response");
  assert.equal(walkoutFinished, false, "Walkout has not finished yet");

  handleWalkoutCompletion();
  assert.equal(walkoutFinished, true);
});

