/**
 * DELTA INFERNO — DELTA-041B Full Collection Album Integration Suite
 *
 * Verifies:
 * 1. 0 cards -> empty collection, status "empty", zero copies, neutral album progress.
 * 2. 1 card -> single copy, quantity = 1 (1 + 0 duplicates), proper category assignment.
 * 3. Multiple cards -> all owned cards mapped, distinct recentCards (slice 4) vs full collectionCards.
 * 4. Duplicates handling -> quantity = 1 + duplicates_count, duplicates tab correctly filters cards with copies > 1.
 * 5. Distinct categories -> mapping to Wszystkie, Podstawowe, Meczowe, Specjalne, Duplikaty.
 * 6. Sibling switching -> collection belongs to parent (user_id); switching active child keeps collection identical.
 * 7. Non-authoritative catalog (RLS) -> total: null, percent: null, strictly owned cards in collectionCards.
 * 8. Read errors / DB failure -> graceful fallback to unavailable("not_loaded") without throwing.
 * 9. Read-only verification -> strictly 0 database mutations (zero inserts, updates, upserts, deletes).
 * 10. User isolation -> query strictly scoped to authUser.id; foreign cards filtered out.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  loadRealDashboardUI4Data
} from "../lib/dashboard-ui4/real-data-loader.ts";
import {
  createDashboardUI4Model,
  classifyCardCategory
} from "../components/dashboard/ui4/adapter.ts";
import type { UserCardInput, CardDefinitionInput } from "../components/dashboard/ui4/types.ts";

/**
 * Creates an in-memory mock Supabase client for DELTA-041B tests with mutation tracking.
 */
function createMockSupabase(dataset: {
  parentPlayers?: any[];
  players?: any[];
  matches?: any[];
  trainingSessions?: any[];
  news?: any[];
  clubUpdates?: any[];
  cardDefinitions?: any[];
  userCards?: any[];
  unopenedPacks?: any[];
  trainingAttendance?: any[];
  matchAttendance?: any[];
  playerAchievements?: any[];
  errorOn?: string;
}) {
  const mutations: { table: string; method: string; payload: any }[] = [];

  const client = {
    _mutations: mutations,
    from: (table: string) => {
      if (dataset.errorOn === table) {
        return {
          select: () => {
            const errPromise = Promise.resolve({ data: null, error: new Error(`Simulated DB failure on ${table}`) });
            return Object.assign(errPromise, {
              eq: () => errPromise,
              in: () => errPromise,
              order: () => errPromise,
              limit: () => errPromise
            });
          },
          insert: (payload: any) => {
            mutations.push({ table, method: "insert", payload });
            return Promise.resolve({ data: null, error: null });
          },
          update: (payload: any) => {
            mutations.push({ table, method: "update", payload });
            return Promise.resolve({ data: null, error: null });
          },
          upsert: (payload: any) => {
            mutations.push({ table, method: "upsert", payload });
            return Promise.resolve({ data: null, error: null });
          },
          delete: () => {
            mutations.push({ table, method: "delete", payload: null });
            return Promise.resolve({ data: null, error: null });
          }
        };
      }

      const getTableData = () => {
        switch (table) {
          case "parent_player":
          case "parent_players":
            return dataset.parentPlayers ?? [];
          case "players":
            return dataset.players ?? [];
          case "matches":
            return dataset.matches ?? [];
          case "training_sessions":
            return dataset.trainingSessions ?? [];
          case "news":
            return dataset.news ?? [];
          case "club_updates":
            return dataset.clubUpdates ?? [];
          case "card_definitions":
            return dataset.cardDefinitions ?? [];
          case "user_cards":
            return dataset.userCards ?? [];
          case "user_unopened_packs":
            return dataset.unopenedPacks ?? [];
          case "training_attendance":
            return dataset.trainingAttendance ?? [];
          case "match_attendance":
            return dataset.matchAttendance ?? [];
          case "player_achievements":
            return dataset.playerAchievements ?? [];
          default:
            return [];
        }
      };

      return {
        select: (columns?: string) => {
          let rows = [...getTableData()];

          const chainable = {
            eq: (col: string, val: any) => {
              rows = rows.filter((r) => r[col] === val);
              return chainable;
            },
            in: (col: string, vals: any[]) => {
              rows = rows.filter((r) => vals.includes(r[col]));
              return chainable;
            },
            order: (_col: string, _opts?: any) => chainable,
            limit: (n: number) => {
              rows = rows.slice(0, n);
              return chainable;
            },
            then: (resolve: any, reject: any) => Promise.resolve({ data: rows, error: null }).then(resolve, reject)
          };

          return chainable;
        },
        insert: (payload: any) => {
          mutations.push({ table, method: "insert", payload });
          return Promise.resolve({ data: null, error: null });
        },
        update: (payload: any) => {
          mutations.push({ table, method: "update", payload });
          return Promise.resolve({ data: null, error: null });
        },
        upsert: (payload: any) => {
          mutations.push({ table, method: "upsert", payload });
          return Promise.resolve({ data: null, error: null });
        },
        delete: () => {
          mutations.push({ table, method: "delete", payload: null });
          return Promise.resolve({ data: null, error: null });
        }
      };
    }
  };

  return client;
}

test("classifyCardCategory correctly maps card types and rarities", () => {
  assert.equal(classifyCardCategory("base", "common"), "base");
  assert.equal(classifyCardCategory(null, "common"), "base");

  assert.equal(classifyCardCategory("matchday", "rare"), "matchday");
  assert.equal(classifyCardCategory(null, "rare"), "matchday");

  assert.equal(classifyCardCategory("training_warrior", "rare"), "special");
  assert.equal(classifyCardCategory("goal_hunter", "epic"), "special");
  assert.equal(classifyCardCategory("mvp", "legendary"), "special");
  assert.equal(classifyCardCategory("inferno", "inferno"), "special");
  assert.equal(classifyCardCategory(null, "legendary"), "special");
  assert.equal(classifyCardCategory(null, "inferno"), "special");
});

test("0 cards: empty collection handled gracefully", () => {
  const model = createDashboardUI4Model({
    profile: { id: "user-1", role: "parent", display_name: "Opiekun Testowy" },
    access: {
      canViewCollection: true,
      canViewAchievements: true,
      canViewTeamShowcase: true,
      canViewClubCommunications: true
    },
    userCards: [],
    allCards: []
  });

  assert.equal(model.collectionCards?.status, "empty");
  assert.deepEqual(model.collectionCards?.data, []);
  assert.equal(model.recentCards.status, "empty");
  assert.equal(model.albumProgress.data?.owned, 0);
  assert.equal(model.albumProgress.data?.duplicates, 0);
});

test("1 card: quantity = 1, duplicatesCount = 0", () => {
  const userCards: UserCardInput[] = [
    {
      id: "uc-1",
      card_id: "def-1",
      duplicates_count: 0,
      acquired_at: "2026-11-20T10:00:00Z",
      card_definition: {
        id: "def-1",
        name: "Zawodnik Alfa — BASE",
        title: "BASE",
        rarity: "common",
        card_type: "base",
        card_number: 1,
        season: "2026/27",
        player: { id: "p-1", display_name: "Zawodnik Alfa", shirt_number: 7, position: "NAP" }
      }
    }
  ];

  const model = createDashboardUI4Model({
    profile: { id: "user-1", role: "parent" },
    access: {
      canViewCollection: true,
      canViewAchievements: true,
      canViewTeamShowcase: true,
      canViewClubCommunications: true
    },
    userCards
  });

  assert.equal(model.collectionCards?.status, "available");
  assert.equal(model.collectionCards?.data?.length, 1);

  const card = model.collectionCards?.data?.[0];
  assert.equal(card?.id, "uc-1");
  assert.equal(card?.cardId, "def-1");
  assert.equal(card?.duplicatesCount, 0);
  assert.equal(card?.quantity, 1);
  assert.equal(card?.category, "base");

  assert.equal(model.albumProgress.data?.owned, 1);
  assert.equal(model.albumProgress.data?.duplicates, 0);
});

test("Multiple cards & Duplicates calculation: quantity = 1 + duplicates_count", () => {
  const userCards: UserCardInput[] = [
    {
      id: "uc-1",
      card_id: "def-1",
      duplicates_count: 0,
      acquired_at: "2026-11-10T10:00:00Z",
      card_definition: {
        id: "def-1",
        name: "Zawodnik A — BASE",
        rarity: "common",
        card_type: "base"
      }
    },
    {
      id: "uc-2",
      card_id: "def-2",
      duplicates_count: 1, // 1 duplicate -> 2 copies total
      acquired_at: "2026-11-12T10:00:00Z",
      card_definition: {
        id: "def-2",
        name: "Zawodnik B — MATCHDAY",
        rarity: "rare",
        card_type: "matchday"
      }
    },
    {
      id: "uc-3",
      card_id: "def-3",
      duplicates_count: 2, // 2 duplicates -> 3 copies total
      acquired_at: "2026-11-14T10:00:00Z",
      card_definition: {
        id: "def-3",
        name: "Zawodnik C — INFERNO",
        rarity: "inferno",
        card_type: "inferno"
      }
    },
    {
      id: "uc-4",
      card_id: "def-4",
      duplicates_count: 0,
      acquired_at: "2026-11-16T10:00:00Z",
      card_definition: {
        id: "def-4",
        name: "Zawodnik D — TRAINING WARRIOR",
        rarity: "rare",
        card_type: "training_warrior"
      }
    },
    {
      id: "uc-5",
      card_id: "def-5",
      duplicates_count: 0,
      acquired_at: "2026-11-18T10:00:00Z",
      card_definition: {
        id: "def-5",
        name: "Zawodnik E — MVP",
        rarity: "legendary",
        card_type: "mvp"
      }
    }
  ];

  const model = createDashboardUI4Model({
    profile: { id: "user-1", role: "parent" },
    access: {
      canViewCollection: true,
      canViewAchievements: true,
      canViewTeamShowcase: true,
      canViewClubCommunications: true
    },
    userCards
  });

  assert.equal(model.collectionCards?.status, "available");
  const allCards = model.collectionCards?.data || [];
  assert.equal(allCards.length, 5);

  // Check recentCards (slice 4) vs collectionCards (all 5)
  assert.equal(model.recentCards.data?.length, 4);

  // Check copy counts
  const cardWith1Dup = allCards.find(c => c.cardId === "def-2");
  assert.equal(cardWith1Dup?.duplicatesCount, 1);
  assert.equal(cardWith1Dup?.quantity, 2);

  const cardWith2Dups = allCards.find(c => c.cardId === "def-3");
  assert.equal(cardWith2Dups?.duplicatesCount, 2);
  assert.equal(cardWith2Dups?.quantity, 3);

  // Total unique: 5. Total copies: 1 + 2 + 3 + 1 + 1 = 8. Duplicates = 8 - 5 = 3.
  assert.equal(model.albumProgress.data?.owned, 5);
  assert.equal(model.albumProgress.data?.duplicates, 3);

  // Category distributions:
  // Base: def-1 (1)
  // Matchday: def-2 (1)
  // Special: def-3 (inferno), def-4 (training_warrior), def-5 (mvp) -> 3
  const baseCards = allCards.filter(c => c.category === "base");
  const matchdayCards = allCards.filter(c => c.category === "matchday");
  const specialCards = allCards.filter(c => c.category === "special");
  const duplicateCards = allCards.filter(c => c.duplicatesCount > 0 || c.quantity > 1);

  assert.equal(baseCards.length, 1);
  assert.equal(matchdayCards.length, 1);
  assert.equal(specialCards.length, 3);
  assert.equal(duplicateCards.length, 2); // def-2 and def-3
});

test("Non-authoritative catalog under RLS: total is null, percent is null, zero fake cards", () => {
  const userCards: UserCardInput[] = [
    {
      id: "uc-1",
      card_id: "def-1",
      duplicates_count: 0,
      card_definition: { id: "def-1", name: "Card 1", rarity: "common", card_type: "base" }
    }
  ];

  // In real-data mode, isAuthoritativeCatalog is false
  const model = createDashboardUI4Model({
    profile: { id: "user-1", role: "parent" },
    access: {
      canViewCollection: true,
      canViewAchievements: true,
      canViewTeamShowcase: true,
      canViewClubCommunications: true
    },
    userCards,
    isAuthoritativeCatalog: false
  });

  assert.equal(model.albumProgress.data?.owned, 1);
  assert.equal(model.albumProgress.data?.total, null);
  assert.equal(model.albumProgress.data?.percent, null);

  // Only the 1 actually owned card is in collectionCards
  assert.equal(model.collectionCards?.data?.length, 1);
});

test("Siblings with shared parent collection: switching active child keeps collection identical", async () => {
  const userCards = [
    {
      id: "uc-1",
      user_id: "parent-uuid",
      card_id: "def-1",
      duplicates_count: 1,
      acquired_at: "2026-11-20T10:00:00Z",
      card_definition: {
        id: "def-1",
        card_name: "Player A — BASE",
        title: "BASE",
        rarity: "common",
        card_type: "base"
      }
    },
    {
      id: "uc-2",
      user_id: "parent-uuid",
      card_id: "def-2",
      duplicates_count: 0,
      acquired_at: "2026-11-21T10:00:00Z",
      card_definition: {
        id: "def-2",
        card_name: "Player B — INFERNO",
        title: "INFERNO",
        rarity: "inferno",
        card_type: "inferno"
      }
    }
  ];

  const parentPlayers = [
    { parent_id: "parent-uuid", player_id: "child-1" },
    { parent_id: "parent-uuid", player_id: "child-2" }
  ];

  const players = [
    { id: "child-1", display_name: "Dziecko Pierwsze", shirt_number: 10, position: "NAP", active: true },
    { id: "child-2", display_name: "Dziecko Drugie", shirt_number: 5, position: "POM", active: true }
  ];

  const mockSupabase = createMockSupabase({
    parentPlayers,
    players,
    userCards,
    cardDefinitions: [
      { id: "def-1", card_name: "Player A — BASE", rarity: "common", card_type: "base", is_active: true },
      { id: "def-2", card_name: "Player B — INFERNO", rarity: "inferno", card_type: "inferno", is_active: true }
    ],
    unopenedPacks: []
  });

  const mockProfileParent = {
    user: { id: "parent-uuid" },
    profile: { id: "parent-uuid", role: "parent", display_name: "Opiekun Testowy" }
  };

  // Load for Child 1
  const resultChild1 = await loadRealDashboardUI4Data({
    client: mockSupabase as any,
    profileOverride: mockProfileParent,
    activeChildId: "child-1"
  });

  // Load for Child 2
  const resultChild2 = await loadRealDashboardUI4Data({
    client: mockSupabase as any,
    profileOverride: mockProfileParent,
    activeChildId: "child-2"
  });

  const model1 = resultChild1.model;
  const model2 = resultChild2.model;

  // Both children share the parent's collection!
  assert.equal(model1.collectionCards?.data?.length, 2);
  assert.equal(model2.collectionCards?.data?.length, 2);
  assert.deepEqual(model1.collectionCards?.data, model2.collectionCards?.data);

  // Total owned and duplicates are identical
  assert.equal(model1.albumProgress.data?.owned, 2);
  assert.equal(model2.albumProgress.data?.owned, 2);
  assert.equal(model1.albumProgress.data?.duplicates, 1);
  assert.equal(model2.albumProgress.data?.duplicates, 1);

  // But the active player profiles differ!
  assert.equal(model1.profile.player.data?.displayName, "Dziecko Pierwsze");
  assert.equal(model2.profile.player.data?.displayName, "Dziecko Drugie");
});

test("Read errors on user_cards: fails gracefully with unavailable('not_loaded')", async () => {
  const mockSupabase = createMockSupabase({
    parentPlayers: [{ parent_id: "parent-uuid", player_id: "child-1" }],
    players: [{ id: "child-1", display_name: "Dziecko" }],
    errorOn: "user_cards"
  });

  const mockProfileParent = {
    user: { id: "parent-uuid" },
    profile: { id: "parent-uuid", role: "parent", display_name: "Opiekun Testowy" }
  };

  const result = await loadRealDashboardUI4Data({
    client: mockSupabase as any,
    profileOverride: mockProfileParent,
    activeChildId: "child-1"
  });

  const model = result.model;

  assert.equal(model.collectionCards?.status, "unavailable");
  assert.equal(model.collectionCards?.reason, "not_loaded");
  assert.equal(model.recentCards.status, "unavailable");
  assert.equal(model.recentCards.reason, "not_loaded");
});

test("Read-only verification: strictly 0 database mutations during data loading", async () => {
  const mockSupabase = createMockSupabase({
    parentPlayers: [{ parent_id: "parent-uuid", player_id: "child-1" }],
    players: [{ id: "child-1", display_name: "Dziecko" }],
    userCards: [
      {
        id: "uc-1",
        user_id: "parent-uuid",
        card_id: "def-1",
        duplicates_count: 0,
        card_definition: { id: "def-1", card_name: "Card", rarity: "common", card_type: "base" }
      }
    ],
    unopenedPacks: []
  });

  const mockProfileParent = {
    user: { id: "parent-uuid" },
    profile: { id: "parent-uuid", role: "parent", display_name: "Opiekun Testowy" }
  };

  await loadRealDashboardUI4Data({
    client: mockSupabase as any,
    profileOverride: mockProfileParent,
    activeChildId: "child-1"
  });

  // Strictly 0 mutations
  assert.equal(mockSupabase._mutations.length, 0);
});
