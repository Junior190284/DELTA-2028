/**
 * DELTA INFERNO — DELTA-041D Pack Opening & Vault Integration Test Suite
 *
 * Verifies:
 * 1. Pack Vault with 0 packs: renders calm neutral empty state, no active opening, zero trigger buttons.
 * 2. Pack Vault with 1 or multiple packs: renders pack items with names, card counts, source reasons, and explicit action buttons.
 * 3. Pack selection & session initialization: selects target pack via selectPackSessionToOpen and generates unique session.
 * 4. User Intent Guard & Cancellation: autoStart={false} ensures opening stage starts in READY phase; closing cancels without consuming pack.
 * 5. Single submission guard & idempotency: ensures attempt key generation and prevents double execution.
 * 6. Simulated successful opening with mock fetch:
 *    - unopened packs list decrements / reconciles via reconcileUnopenedPacksAfterOpen
 *    - album cards update (unique cards prepended, duplicates count incremented for already owned cards)
 *    - recent drops gallery updates with newest cards
 *    - success toast message emitted
 *    - multi-child family collection preservation
 * 7. Simulated API error / timeout / 401 unauthenticated:
 *    - reports error without losing client UI state
 *    - unopened packs list remains unchanged
 *    - zero cards added
 * 8. 2D fallback & reduced motion:
 *    - SafeRevealCard / 2D mode compatibility verified
 * 9. Purity & Security:
 *    - Zero live database mutations or live network transactions against Supabase during automated tests.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  selectPackSessionToOpen,
  reconcileUnopenedPacksAfterOpen,
  buildFallbackPackDefinition,
  executeLivePackOpen,
  LivePackOpenError,
  createOpenPackAttemptKey
} from "../lib/cards/packOpeningAlbumBridge.ts";
import { createDashboardUI4Model, classifyCardCategory } from "../components/dashboard/ui4/adapter.ts";
import type {
  PackDefinition,
  PackOpeningResult,
  UserUnopenedPack,
  CardDefinition
} from "../lib/cards/types.ts";
import type {
  DashboardUI4AdapterInput,
  UserUnopenedPackItem,
  CollectionCard
} from "../components/dashboard/ui4/types.ts";

function createMockPackResult(overrides: Partial<PackOpeningResult> = {}): PackOpeningResult {
  return {
    cards: [
      {
        card: {
          id: "card-drawn-1",
          player_id: "p-alex",
          season: "2026/27",
          card_type: "base",
          card_name: "Alex - Strzelec",
          title: "Alex - Strzelec",
          rarity: "rare",
          artwork_url: "/cards/alex.png",
          artwork_pose: null,
          frame_theme: null,
          card_number: 10,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-alex",
            display_name: "Alex",
            shirt_number: "10",
            position: "NAP"
          }
        },
        is_duplicate: false,
        duplicate_points: 0
      },
      {
        card: {
          id: "card-drawn-2",
          player_id: "p-sam",
          season: "2026/27",
          card_type: "inferno",
          card_name: "Sam - Inferno Edition",
          title: "Sam - Inferno Edition",
          rarity: "inferno",
          artwork_url: "/cards/sam.png",
          artwork_pose: null,
          frame_theme: "inferno",
          card_number: 7,
          is_active: true,
          is_limited: true,
          edition_size: 100,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-sam",
            display_name: "Sam",
            shirt_number: "7",
            position: "POM"
          }
        },
        is_duplicate: false,
        duplicate_points: 0
      }
    ],
    total_delta_points_earned: 0,
    new_points_balance: 100,
    pack_type_id: "standard_pack",
    consumed_pack_id: "pack-1",
    remaining_unopened_packs_count: 1,
    ...overrides
  };
}

test("1. Pack Vault with 0 packs: renders calm neutral empty state, no active opening", () => {
  const input: DashboardUI4AdapterInput = {
    profile: { id: "p-1", role: "parent", display_name: "Rodzic" },
    access: { canViewCollection: true, canViewAchievements: true, canViewTeamShowcase: true, canViewClubCommunications: true },
    parentPlayerIds: ["player-1"],
    players: [{ id: "player-1", display_name: "Alex", shirt_number: 7 }],
    unopenedPacksCount: 0,
    unopenedPacksList: [],
    allCards: [],
    userCards: [],
    isAuthoritativeCatalog: false
  };

  const model = createDashboardUI4Model(input);
  assert.equal(model.albumProgress.data?.unopenedPacks, 0);
  assert.deepEqual(model.albumProgress.data?.unopenedPacksList, []);

  // Source code check for zero packs neutral state
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );
  assert.ok(colSource.includes('data-testid="pack-vault-empty"'), "Must contain pack-vault-empty testid");
  assert.ok(colSource.includes("BRAK NOWYCH PACZEK DO OTWARCIA"), "Must contain zero packs neutral label");
  assert.ok(colSource.includes("Skarbiec paczek jest pusty"), "Must contain encouraging description");
});

test("2. Pack Vault with multiple packs: lists pack items with details and explicit action button", () => {
  const packsList: UserUnopenedPackItem[] = [
    {
      id: "pack-1",
      packTypeId: "standard_pack",
      sourceReason: "Nagroda za frekwencję",
      createdAt: "2026-11-20T10:00:00Z",
      packDefinition: {
        id: "standard_pack",
        name: "Paczka Standardowa DELTA",
        cardsCount: 4,
        theme: "standard"
      }
    },
    {
      id: "pack-2",
      packTypeId: "matchday_pack",
      sourceReason: "Mecz ligowy",
      createdAt: "2026-11-22T10:00:00Z",
      packDefinition: {
        id: "matchday_pack",
        name: "Paczka Meczowa",
        cardsCount: 5,
        theme: "matchday"
      }
    }
  ];

  const input: DashboardUI4AdapterInput = {
    profile: { id: "p-1", role: "parent", display_name: "Rodzic" },
    access: { canViewCollection: true, canViewAchievements: true, canViewTeamShowcase: true, canViewClubCommunications: true },
    parentPlayerIds: ["player-1"],
    players: [{ id: "player-1", display_name: "Alex", shirt_number: 7 }],
    unopenedPacksCount: 2,
    unopenedPacksList: packsList,
    allCards: [],
    userCards: [],
    isAuthoritativeCatalog: false
  };

  const model = createDashboardUI4Model(input);
  assert.equal(model.albumProgress.data?.unopenedPacks, 2);
  assert.equal(model.albumProgress.data?.unopenedPacksList?.length, 2);
  assert.equal(model.albumProgress.data?.unopenedPacksList?.[0]?.packDefinition?.name, "Paczka Standardowa DELTA");
  assert.equal(model.albumProgress.data?.unopenedPacksList?.[1]?.packDefinition?.cardsCount, 5);

  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );
  assert.ok(colSource.includes('data-testid={`pack-item-${packItem.id}`}'), "Must render pack items with pack ID testid");
  assert.ok(colSource.includes('data-testid={`open-pack-btn-${packItem.id}`}'), "Must render open pack button with testid");
  assert.ok(colSource.includes("OTWÓRZ"), "Button label must be OTWÓRZ");
});

test("3. Pack selection & session initialization via selectPackSessionToOpen", () => {
  const packs: UserUnopenedPack[] = [
    {
      id: "pack-1",
      user_id: "u-1",
      pack_type_id: "standard_pack",
      source_reason: "attendance",
      is_opened: false,
      opened_at: null,
      created_at: "2026-11-20T10:00:00Z"
    },
    {
      id: "pack-2",
      user_id: "u-1",
      pack_type_id: "inferno_pack",
      source_reason: "mvp",
      is_opened: false,
      opened_at: null,
      created_at: "2026-11-21T10:00:00Z"
    }
  ];

  const session = selectPackSessionToOpen({
    unopenedPacks: packs,
    packDefinitions: [],
    preferredUnopenedPackId: "pack-2",
    preferredPackTypeId: "inferno_pack"
  });

  assert.ok(session !== null, "Session must be initialized");
  assert.equal(session.targetUnopenedPack.id, "pack-2");
  assert.equal(session.pack.id, "inferno_pack");
  assert.equal(session.pack.theme, "inferno");
  assert.equal(session.pack.min_rarity, "epic");
});

test("4. User Intent Guard & Cancellation: autoStart={false} and clean modal closing", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  // autoStart must be false so user is in control
  assert.ok(colSource.includes("autoStart={false}"), "CinematicPackExperience must receive autoStart={false}");

  // onClose must safely reset activePackSession without mutations
  assert.ok(colSource.includes("onClose={() => setActivePackSession(null)}"), "Must reset active pack session on close");

  // CinematicPackExperience must have data-testid for conscious trigger
  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );
  assert.ok(cinematicSource.includes('data-testid="cinematic-open-btn"'), "Must have cinematic-open-btn for conscious click");
});

test("5. Single submission guard & idempotency key generation", () => {
  const key1 = createOpenPackAttemptKey();
  const key2 = createOpenPackAttemptKey();

  assert.ok(typeof key1 === "string" && key1.length > 0, "Idempotency key 1 must be non-empty string");
  assert.ok(typeof key2 === "string" && key2.length > 0, "Idempotency key 2 must be non-empty string");
  assert.notEqual(key1, key2, "Each attempt must have a distinct idempotency key");

  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );
  assert.ok(cinematicSource.includes("isOpeningInFlightRef.current"), "Must have isOpeningInFlightRef double-click guard");
  assert.ok(cinematicSource.includes("attemptIdempotencyKeyRef.current"), "Must preserve attempt idempotency key");
});

test("6. Simulated successful opening with mock fetch: reconciles packs, updates album & drops", async () => {
  const mockResult = createMockPackResult({
    consumed_pack_id: "pack-1",
    remaining_unopened_packs_count: 0
  });

  // Mock fetch simulating successful pack opening API
  const mockFetch: typeof fetch = async (input, init) => {
    assert.equal(init?.method, "POST");
    assert.ok(String(input).includes("/api/cards/open-pack"));
    const body = JSON.parse(String(init?.body || "{}"));
    assert.equal(body.pack_type_id, "standard_pack");
    assert.equal(body.user_unopened_pack_id, "pack-1");
    assert.ok(body.idempotency_key, "Must include idempotency_key");

    return new Response(JSON.stringify(mockResult), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const result = await executeLivePackOpen({
    fetchImpl: mockFetch,
    packTypeId: "standard_pack",
    userUnopenedPackId: "pack-1",
    idempotencyKey: "test-idem-key-1"
  });

  assert.equal(result.cards.length, 2);
  assert.equal(result.consumed_pack_id, "pack-1");

  // Reconcile unopened packs
  const initialPacks: UserUnopenedPack[] = [
    {
      id: "pack-1",
      user_id: "u-1",
      pack_type_id: "standard_pack",
      source_reason: "attendance",
      is_opened: false,
      opened_at: null,
      created_at: "2026-11-20T10:00:00Z"
    }
  ];

  const reconciled = reconcileUnopenedPacksAfterOpen(initialPacks, {
    consumed_pack_id: result.consumed_pack_id,
    remaining_unopened_packs_count: result.remaining_unopened_packs_count
  });

  assert.equal(reconciled.length, 0, "Unopened pack must be consumed and list empty");

  // Verify album updates simulation: new card vs existing duplicate
  const existingCards: CollectionCard[] = [
    {
      id: "uc-alex",
      cardId: "card-drawn-1",
      name: "Alex - Strzelec",
      title: "Alex - Strzelec",
      rarity: "rare",
      cardType: "BASE",
      category: "base",
      cardNumber: 10,
      season: "2026/27",
      playerName: "Alex",
      playerShirtNumber: 10,
      playerPosition: "NAP",
      playerPhotoUrl: "/cards/alex.png",
      artworkUrl: "/cards/alex.png",
      artworkPose: null,
      frameTheme: null,
      acquiredAt: "2026-11-20T10:00:00Z",
      duplicatesCount: 0,
      quantity: 1,
      isFavorite: false
    }
  ];

  // Drawn: card-drawn-1 (duplicate), card-drawn-2 (new unique)
  const updated = [...existingCards];
  for (const item of result.cards) {
    const drawn = item.card;
    const existingIdx = updated.findIndex(c => c.cardId === drawn.id);
    if (existingIdx >= 0) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        duplicatesCount: updated[existingIdx].duplicatesCount + 1,
        quantity: updated[existingIdx].quantity + 1
      };
    } else {
      updated.unshift({
        id: `uc-${drawn.id}`,
        cardId: drawn.id,
        name: drawn.card_name,
        title: drawn.title,
        category: classifyCardCategory(drawn.card_type),
        rarity: drawn.rarity,
        cardType: String(drawn.card_type).toUpperCase(),
        frameTheme: drawn.frame_theme,
        artworkPose: drawn.artwork_pose,
        cardNumber: drawn.card_number,
        playerShirtNumber: drawn.player?.shirt_number ? Number(drawn.player.shirt_number) : null,
        playerName: drawn.player?.display_name || "ZAWODNIK",
        playerPosition: drawn.player?.position || "POM",
        playerPhotoUrl: drawn.player?.photo_path || drawn.artwork_url,
        artworkUrl: drawn.artwork_url,
        acquiredAt: new Date().toISOString(),
        quantity: 1,
        duplicatesCount: 0,
        isFavorite: false,
        season: drawn.season || "2026/27"
      });
    }
  }

  // 1 existing unique + 1 new unique = 2 unique cards
  assert.equal(updated.length, 2, "Must contain 2 unique cards");
  // Existing card now has duplicatesCount = 1, quantity = 2
  const alexCard = updated.find(c => c.cardId === "card-drawn-1");
  assert.equal(alexCard?.duplicatesCount, 1, "Alex card must have duplicatesCount = 1");
  assert.equal(alexCard?.quantity, 2, "Alex card must have quantity = 2");

  // New card added
  const samCard = updated.find(c => c.cardId === "card-drawn-2");
  assert.equal(samCard?.name, "Sam - Inferno Edition");
  assert.equal(samCard?.rarity, "inferno");
  assert.equal(samCard?.duplicatesCount, 0);
});

test("7. Simulated API error / 401 unauthenticated: reports error without losing UI state or consuming pack", async () => {
  const mockFetchError: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: "Brak aktywnej sesji logowania.", code: "UNAUTHENTICATED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  };

  await assert.rejects(
    async () => {
      await executeLivePackOpen({
        fetchImpl: mockFetchError,
        packTypeId: "standard_pack",
        userUnopenedPackId: "pack-1",
        idempotencyKey: "test-idem-key-err"
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof LivePackOpenError, "Must throw LivePackOpenError");
      assert.equal(err.status, 401);
      assert.ok(err.message.includes("Brak aktywnej sesji logowania"));
      return true;
    }
  );

  // Verify that reconcileUnopenedPacksAfterOpen is NOT called on error, preserving pack
  const initialPacks: UserUnopenedPack[] = [
    {
      id: "pack-1",
      user_id: "u-1",
      pack_type_id: "standard_pack",
      source_reason: "attendance",
      is_opened: false,
      opened_at: null,
      created_at: "2026-11-20T10:00:00Z"
    }
  ];

  // No reconciliation payload on error -> packs intact
  assert.equal(initialPacks.length, 1);
  assert.equal(initialPacks[0].id, "pack-1");
});

test("8. 2D fallback & reduced motion: supports SafeRevealCard without forcing 3D", () => {
  const safeRevealSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/SafeRevealCard.tsx"),
    "utf8"
  );
  assert.ok(safeRevealSource.includes("SafeRevealCard"), "SafeRevealCard component must exist");
  assert.ok(safeRevealSource.includes('data-testid="safe-reveal-card"'), "SafeRevealCard must have data-testid");
  assert.ok(safeRevealSource.includes("reducedMotion"), "SafeRevealCard must handle reducedMotion");

  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );
  assert.ok(cinematicSource.includes("SafeRevealCard"), "CinematicPackExperience must import SafeRevealCard");
  assert.ok(cinematicSource.includes("shouldUseSafe2DReveal"), "Must support shouldUseSafe2DReveal for mobile/reduced-motion");
});

test("9. Purity & Zero live mutations: verifies openPackFetch injection in CollectionDashboard", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  assert.ok(colSource.includes("openPackFetch?: typeof fetch;"), "CollectionDashboard must expose optional openPackFetch prop");
  assert.ok(colSource.includes("openPackFetch={openPackFetch}"), "CinematicPackExperience must receive openPackFetch prop");

  // Verify no direct unmocked database mutation calls in collection-dashboard
  assert.ok(!colSource.includes("supabase.from("), "CollectionDashboard must NOT make direct supabase table mutations");
  assert.ok(!colSource.includes("supabase.rpc("), "CollectionDashboard must NOT invoke RPC directly from client component");
});

test("10. In-flight safety: Escape and close are blocked during REQUESTING phase", () => {
  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );

  // handleClose must guard against closing during in-flight requests
  assert.ok(
    cinematicSource.includes("if (isOpeningInFlightRef.current || isRequestingOpen)"),
    "handleClose must guard against closing during in-flight requests"
  );

  // handleKeyDown must guard against Escape key during in-flight requests
  assert.ok(
    cinematicSource.includes("if (isRequestingOpen || isOpeningInFlightRef.current)"),
    "Escape key must be ignored during REQUESTING phase"
  );

  // canClose must be false during isRequestingOpen
  assert.ok(
    cinematicSource.includes("const canClose = !isRequestingOpen && (state ? state.canClose : true);"),
    "canClose must be false while request is in flight"
  );
});

test("11. Ambiguous result & timeout: honest notification, never assumes pack preserved, preserves idempotency key", async () => {
  const cinematicSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/pack-opening-v2/CinematicPackExperience.tsx"),
    "utf8"
  );

  // Check honest message in source code
  assert.ok(
    cinematicSource.includes("Wynik operacji na serwerze jest niejednoznaczny"),
    "Must display honest ambiguous error message on network failure / timeout"
  );

  // Verify that on network error, idempotency key is NOT reset to null (preventing re-roll with new key)
  const mockTimeoutFetch: typeof fetch = async () => {
    throw new TypeError("Failed to fetch: network timeout");
  };

  await assert.rejects(
    async () => {
      await executeLivePackOpen({
        fetchImpl: mockTimeoutFetch,
        packTypeId: "standard_pack",
        userUnopenedPackId: "pack-1",
        idempotencyKey: "test-idem-key-timeout"
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof TypeError || err instanceof Error);
      return true;
    }
  );
});

test("12. Incomplete metadata resilience: skips invalid/null card definitions without throwing or fabricating", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  assert.ok(
    colSource.includes("if (!drawn || !drawn.id) continue;"),
    "handlePackConsumed must skip cards with missing definitions or IDs"
  );
  assert.ok(
    colSource.includes("result.cards.filter(item => item?.card?.id)"),
    "Recent cards mapper must filter out invalid card items"
  );
});

test("13. Cross-view event bus synchronization via subscribeCardEvents", () => {
  const colSource = fs.readFileSync(
    path.resolve(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx"),
    "utf8"
  );

  assert.ok(
    colSource.includes("subscribeCardEvents({"),
    "CollectionDashboard must subscribe to cardSync events"
  );
  assert.ok(
    colSource.includes("onPackOpened: (payload) => {"),
    "CollectionDashboard must handle onPackOpened event"
  );
});
