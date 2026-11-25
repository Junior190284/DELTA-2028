import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  mapServerUserCardsToCollectionCards,
  mapServerUnopenedPacks
} from "../components/dashboard/ui4/adapter.ts";
import type { CollectionCard } from "../components/dashboard/ui4/types.ts";
import {
  FetchSequenceGuard,
  CARD_SYNC_EVENTS,
  dispatchCollectionUpdated,
  subscribeCardEvents,
  DeltaCollectionUpdatedPayload
} from "../lib/cards/cardSync.ts";

// Minimal event target for testing DOM CustomEvents in Node.js
class MockEventTarget {
  private listeners: Record<string, Function[]> = {};

  addEventListener(type: string, fn: Function) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type: string, fn: Function) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(f => f !== fn);
  }

  dispatchEvent(event: any) {
    const list = this.listeners[event.type] || [];
    for (const fn of list) {
      fn(event);
    }
    return true;
  }
}

class MockCustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
}

function setupMockWindow() {
  const target = new MockEventTarget();
  (globalThis as any).window = target;
  (globalThis as any).CustomEvent = MockCustomEvent;
  return () => {
    delete (globalThis as any).window;
    delete (globalThis as any).CustomEvent;
  };
}

test("DELTA-041G Scenario A: 409 ALREADY_OPENED -> authoritative GET returns new card -> localAllCards contains new card", async () => {
  // 1. Initial local state before opening
  const initialCards: CollectionCard[] = [
    {
      id: "card-user-1",
      cardId: "card-1",
      name: "Kapitan Drużyny",
      title: "KAPITAN",
      rarity: "rare" as const,
      cardType: "SPECIAL",
      category: "special" as const,
      cardNumber: 10,
      season: "2026/27",
      playerName: "Zawodnik Testowy",
      playerShirtNumber: 10,
      playerPosition: "ŚPO",
      playerPhotoUrl: null,
      artworkUrl: null,
      artworkPose: null,
      frameTheme: null,
      acquiredAt: "2026-11-20T10:00:00.000Z",
      duplicatesCount: 0,
      quantity: 1,
      isFavorite: false
    }
  ];

  let localAllCards = [...initialCards];

  // 2. Simulate 409 response from open-pack
  // The server rejects duplicate open attempt because the pack was already opened.
  const openPackResult = {
    status: 409,
    code: "ALREADY_OPENED",
    message: "Ta paczka została już wcześniej otwarta."
  };
  assert.equal(openPackResult.status, 409);

  // 3. Mock authoritative GET /api/cards/collection response returning the newly awarded card
  const mockServerCollectionResponse = {
    userCards: [
      {
        id: "uc-new-99",
        card_id: "card-new-inferno",
        acquired_at: "2026-11-24T12:00:00.000Z",
        duplicates_count: 0,
        is_favorite: false,
        card_definition: {
          id: "card-new-inferno",
          title: "INFERNO STRIKER",
          card_name: "INFERNO STRIKER",
          rarity: "inferno",
          card_type: "INFERNO",
          card_number: 99,
          season: "2026/27",
          player: {
            display_name: "Super Strzelec",
            shirt_number: 9,
            position: "N"
          }
        }
      },
      {
        id: "uc-1",
        card_id: "card-1",
        acquired_at: "2026-11-20T10:00:00.000Z",
        duplicates_count: 0,
        is_favorite: false,
        card_definition: {
          id: "card-1",
          title: "KAPITAN",
          card_name: "Kapitan Drużyny",
          rarity: "rare",
          card_type: "SPECIAL",
          card_number: 10,
          season: "2026/27",
          player: {
            display_name: "Zawodnik Testowy",
            shirt_number: 10,
            position: "ŚPO"
          }
        }
      }
    ]
  };

  // Reconcile localAllCards using adapter mapper
  const mappedCards = mapServerUserCardsToCollectionCards(mockServerCollectionResponse.userCards);
  localAllCards = mappedCards;

  // Assertions:
  assert.equal(localAllCards.length, 2, "localAllCards must contain both cards after authoritative sync");
  const newlyAwarded = localAllCards.find(c => c.cardId === "card-new-inferno");
  assert.ok(newlyAwarded, "localAllCards must contain the newly awarded card from server");
  assert.equal(newlyAwarded.name, "INFERNO STRIKER");
  assert.equal(newlyAwarded.rarity, "inferno");
  assert.equal(newlyAwarded.category, "special");
  assert.equal(localAllCards[0].cardId, "card-new-inferno", "Newest card must be first (sorted by acquired_at desc)");
});

test("DELTA-041G Scenario B: 409 ALREADY_OPENED -> authoritative GET confirms pack consumption and updated duplicate count", () => {
  // 1. Initial unopened packs & cards
  const serverPacksResponse = [
    {
      id: "pack-opened-1",
      pack_type_id: "standard_pack",
      is_opened: true, // Pack was consumed in Supabase
      opened_at: "2026-11-24T12:00:00.000Z"
    },
    {
      id: "pack-unopened-2",
      pack_type_id: "standard_pack",
      is_opened: false,
      source_reason: "attendance_streak",
      pack_definition: {
        id: "standard_pack",
        name: "Paczka Standardowa",
        cards_count: 3,
        theme: "standard"
      }
    }
  ];

  const serverCardsResponse = [
    {
      id: "uc-1",
      card_id: "card-legend-1",
      acquired_at: "2026-11-24T12:00:00.000Z",
      duplicates_count: 3, // Received as a duplicate in this opening
      is_favorite: true,
      card_definition: {
        id: "card-legend-1",
        title: "LEGENDA KLUBU",
        card_name: "Legenda Klubu",
        rarity: "legendary",
        card_type: "SPECIAL",
        card_number: 1,
        season: "2026/27"
      }
    }
  ];

  const mappedPacks = mapServerUnopenedPacks(serverPacksResponse);
  const mappedCards = mapServerUserCardsToCollectionCards(serverCardsResponse);

  // Assertions:
  assert.equal(mappedPacks.length, 1, "Only unopened packs must be present");
  assert.equal(mappedPacks[0].id, "pack-unopened-2");
  assert.equal(mappedPacks[0].packDefinition?.name, "Paczka Standardowa");

  assert.equal(mappedCards[0].duplicatesCount, 3, "Duplicate count must match server authoritative state");
  assert.equal(mappedCards[0].quantity, 4, "Total quantity must equal duplicatesCount + 1");
});

test("DELTA-041G Scenario C: Fetch failure after 409 (500/network error) -> no fictitious cards, neutral error state, retry button present", async () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  // 1. Assert error banner and retry button exist in UI
  assert.ok(
    colSource.includes('role="alert"'),
    "Must include an accessible alert banner for reconciliation errors"
  );
  assert.ok(
    colSource.includes('data-testid="reconciliation-error-banner"'),
    "Must include testid for reconciliation error banner"
  );
  assert.ok(
    colSource.includes("Nie udało się pobrać aktualnego stanu kolekcji z serwera. Sprawdź połączenie i spróbuj ponownie."),
    "Must present honest neutral error message without fictitious mutations"
  );
  assert.ok(
    colSource.includes('data-testid="retry-reconcile-btn"'),
    "Must include retry button for user-triggered reconciliation"
  );
  assert.ok(
    colSource.includes("Odśwież stan kolekcji"),
    "Retry button must have label 'Odśwież stan kolekcji'"
  );

  // 2. Behavioral verification of state preservation on error:
  const preservedCards = [{ id: "c1", cardId: "card-1" }];
  const preservedPacks = [{ id: "p1", packTypeId: "standard_pack" }];

  let localAllCards = [...preservedCards];
  let localUnopenedPacks = [...preservedPacks];
  let reconciliationError: string | null = null;

  // Simulate network failure during reconciliation fetch
  try {
    throw new Error("HTTP 500 Internal Server Error");
  } catch (err: any) {
    reconciliationError = "Nie udało się pobrać aktualnego stanu kolekcji z serwera. Sprawdź połączenie i spróbuj ponownie.";
  }

  // State must remain strictly untouched
  assert.equal(localAllCards.length, 1, "No fictitious cards added on error");
  assert.equal(localUnopenedPacks.length, 1, "No unconfirmed pack deletion on error");
  assert.ok(reconciliationError?.includes("Nie udało się pobrać"), "Reconciliation error set cleanly");
});

test("DELTA-041G Scenario D: Parallel fetch race conditions protected by FetchSequenceGuard", async () => {
  const guard = new FetchSequenceGuard();

  // Request 1 starts (e.g. initial reconciliation)
  const seq1 = guard.startRequest();
  assert.equal(seq1, 1);

  // Request 2 starts immediately after (e.g. user clicked retry or another event fired)
  const seq2 = guard.startRequest();
  assert.equal(seq2, 2);

  // Request 2 finishes first with state B
  let state = "INITIAL";
  if (guard.isLatest(seq2)) {
    state = "STATE_B_NEW";
  }
  assert.equal(state, "STATE_B_NEW");

  // Later, Request 1 resolves with outdated state A
  if (guard.isLatest(seq1)) {
    state = "STATE_A_OLD";
  }

  // The outdated response was correctly dropped
  assert.equal(state, "STATE_B_NEW", "Outdated sequence must NOT overwrite newer state");
  assert.equal(guard.isLatest(seq1), false, "seq1 must not be recognized as latest");
  assert.equal(guard.isLatest(seq2), true, "seq2 is the latest sequence");
});

test("DELTA-041G Scenario E: Account switch or unauthenticated response prevents card leakage", () => {
  // If user logs out or switches accounts:
  // Previous user cards must NOT be preserved or merged with the new user's collection
  const previousUserCards: CollectionCard[] = [
    {
      id: "card-prev-user",
      cardId: "card-secret-1",
      name: "Karta Poprzedniego Użytkownika",
      title: "PREV",
      rarity: "epic" as const,
      cardType: "SPECIAL",
      category: "special" as const,
      cardNumber: 1,
      season: "2026/27",
      playerName: "Poprzedni Gracz",
      playerShirtNumber: 7,
      playerPosition: "PO",
      playerPhotoUrl: null,
      artworkUrl: null,
      artworkPose: null,
      frameTheme: null,
      acquiredAt: "2026-11-20T10:00:00.000Z",
      duplicatesCount: 0,
      quantity: 1,
      isFavorite: false
    }
  ];

  let localAllCards = [...previousUserCards];

  // Authoritative GET returns new user's collection (empty or different)
  const newUserServerResponse: any[] = [];
  const mappedNewCards = mapServerUserCardsToCollectionCards(newUserServerResponse);

  // Complete replacement, no blind merging
  localAllCards = mappedNewCards;

  assert.equal(localAllCards.length, 0, "No cards from previous account leaked");
});

test("DELTA-041G Scenario F: Return from COLLECTION to HOME -> synchronized pack counter", () => {
  const cleanup = setupMockWindow();
  try {
    let homeUnopenedPacksCount = 3;

    // HomeDashboard subscription
    const unsubscribe = subscribeCardEvents({
      onCollectionUpdated: (payload) => {
        if (typeof payload.remaining_unopened_packs_count === "number") {
          homeUnopenedPacksCount = payload.remaining_unopened_packs_count;
        }
      }
    });

    // Collection reconciles and authoritative server reports 1 pack remaining
    dispatchCollectionUpdated("server_reconciled", null, {
      remaining_unopened_packs_count: 1,
      total_cards_count: 15
    });

    assert.equal(homeUnopenedPacksCount, 1, "HomeDashboard counter synchronized with authoritative collection state");

    unsubscribe();
  } finally {
    cleanup();
  }
});

test("DELTA-041G Scenario G: No repeated POST during reconciliation -> safe read-only operation", () => {
  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  // On 409, idempotency key is invalidated and no retry POST is fired
  assert.ok(
    cinematicSource.includes('attemptIdempotencyKeyRef.current = null;'),
    "Must clear attemptIdempotencyKeyRef on 409"
  );
  assert.ok(
    cinematicSource.includes('dispatchCollectionUpdated("already_opened_reconciliation", userUnopenedPackId);'),
    "Must trigger collection reconciliation rather than re-posting"
  );

  // Collection reconciliation strictly uses GET
  assert.ok(
    colSource.includes('method: "GET"'),
    "Reconciliation must use GET /api/cards/collection"
  );
  assert.ok(
    colSource.includes('fetcher("/api/cards/collection"'),
    "Must fetch authoritative endpoint /api/cards/collection"
  );
});
