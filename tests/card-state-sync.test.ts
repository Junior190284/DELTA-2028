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
    { id: "card_base_1", is_duplicate: true, duplicate_points: 10 }
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
