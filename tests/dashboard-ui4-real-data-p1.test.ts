import test from "node:test";
import assert from "node:assert/strict";
import {
  loadRealDashboardUI4Data,
  selectNearestEvent,
  parseWarsawDateTime,
  formatWarsawCountdown,
  isGenuineLocalEnvironment
} from "../lib/dashboard-ui4/real-data-loader.ts";

/**
 * Mock Supabase factory for deterministic, safe read-only tests.
 * Zero database writes, zero external network calls.
 */
function createMockSupabase(dataset: {
  parentPlayers?: Array<{ parent_id: string; player_id: string }>;
  players?: Array<{ id: string; display_name: string; shirt_number?: number | null; position?: string | null; active?: boolean }>;
  matches?: any[];
  trainingSessions?: any[];
  news?: any[];
  clubUpdates?: any[];
  cardDefinitions?: any[];
  userCards?: any[];
  unopenedPacks?: any[];
  errorOn?: string;
}) {
  return {
    from: (table: string) => {
      if (dataset.errorOn === table) {
        return {
          select: () => {
            const errPromise = Promise.resolve({ data: null, error: new Error(`Simulated DB failure on ${table}`) });
            return {
              eq: () => ({
                eq: () => errPromise,
                order: () => errPromise,
                in: () => errPromise,
                maybeSingle: () => errPromise,
                then: (fn: any) => errPromise.then(fn)
              }),
              in: () => ({
                eq: () => errPromise,
                order: () => errPromise
              }),
              order: () => errPromise,
              maybeSingle: () => errPromise,
              then: (fn: any) => errPromise.then(fn)
            };
          }
        };
      }

      if (table === "parent_players") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => {
              const rows = (dataset.parentPlayers || []).filter(r => r.parent_id === val);
              return Promise.resolve({ data: rows, error: null });
            }
          })
        };
      }

      if (table === "players") {
        return {
          select: () => ({
            in: (_col: string, vals: string[]) => ({
              eq: (_col2: string, val2: any) => {
                const rows = (dataset.players || []).filter(r => vals.includes(r.id) && (r.active ?? true) === val2);
                return Promise.resolve({ data: rows, error: null });
              }
            }),
            eq: (_col: string, val: any) => ({
              eq: (_col2: string, val2: any) => ({
                maybeSingle: () => {
                  const row = (dataset.players || []).find(r => r.id === val && (r.active ?? true) === val2);
                  return Promise.resolve({ data: row || null, error: null });
                }
              }),
              order: () => ({
                limit: (limit: number) => {
                  const rows = (dataset.players || []).filter(r => (r.active ?? true) === val).slice(0, limit);
                  return Promise.resolve({ data: rows, error: null });
                }
              })
            }),
            order: () => ({
              limit: (limit: number) => {
                const rows = (dataset.players || []).slice(0, limit);
                return Promise.resolve({ data: rows, error: null });
              }
            })
          })
        };
      }

      if (table === "matches") {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: dataset.matches || [], error: null })
          })
        };
      }

      if (table === "training_sessions") {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: dataset.trainingSessions || [], error: null })
          })
        };
      }

      if (table === "news") {
        return {
          select: () => ({
            order: () => ({
              limit: (limit: number) => Promise.resolve({ data: (dataset.news || []).slice(0, limit), error: null })
            })
          })
        };
      }

      if (table === "club_updates") {
        return {
          select: () => ({
            order: () => ({
              limit: (limit: number) => Promise.resolve({ data: (dataset.clubUpdates || []).slice(0, limit), error: null })
            })
          })
        };
      }

      if (table === "card_definitions") {
        return {
          select: () => ({
            eq: (_col: string, _val: any) => ({
              order: () => Promise.resolve({ data: dataset.cardDefinitions || [], error: null })
            }),
            order: () => Promise.resolve({ data: dataset.cardDefinitions || [], error: null })
          })
        };
      }

      if (table === "user_cards") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              order: (_orderCol: string, _orderOpts?: any) => {
                const rows = (dataset.userCards || []).filter(c => !c.user_id || c.user_id === val);
                return Promise.resolve({ data: rows, error: null });
              }
            })
          })
        };
      }

      if (table === "user_unopened_packs") {
        return {
          select: () => ({
            eq: (_col1: string, val1: string) => ({
              eq: (_col2: string, val2: any) => {
                const rows = (dataset.unopenedPacks || []).filter(
                  p => (!p.user_id || p.user_id === val1) && (p.is_opened ?? false) === val2
                );
                return Promise.resolve({ data: rows, error: null });
              }
            })
          })
        };
      }

      return {
        select: () => Promise.resolve({ data: [], error: null })
      };
    }
  };
}

test("DELTA-028 — P1 Schema Alignment & P2 Collection Suite", async (t) => {
  const FIXED_NOW = new Date("2026-11-24T10:00:00.000Z"); // Warsaw 11:00 CET

  // =========================================================================
  // 1. USER -> PLAYER RESOLUTION & IDENTITY CHECKS (ETAP A SCHEMA ALIGNMENT)
  // =========================================================================

  await t.test("1.1. Parent with distinct user ID resolved via parent_players link (never assumes players.id = auth.users.id)", async () => {
    // In Delta schema: user account has id 'auth-user-99', player card has id 'player-row-42'
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "auth-user-99", player_id: "player-row-42" }],
      players: [
        { id: "player-row-42", display_name: "Zawodnik Alfa", shirt_number: 14, position: "NAP", active: true }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "auth-user-99" },
        profile: { id: "auth-user-99", role: "parent", display_name: "Opiekun Alfa" }
      }
    });

    assert.equal(result.actor.isAuthenticated, true);
    assert.equal(result.actor.actorKind, "parent");
    assert.equal(result.actor.activeChildId, "player-row-42");
    assert.equal(result.model.profile.player.status, "available");
    assert.equal(result.model.profile.player.data?.id, "player-row-42");
    assert.equal(result.model.profile.player.data?.displayName, "Zawodnik Alfa");
  });

  await t.test("1.2. User without parent_players link NEVER falls back to players.id = auth.users.id", async () => {
    // Even if players table has a row matching authUser.id, parent_players must strictly be the only identity source
    const mockClient = createMockSupabase({
      parentPlayers: [],
      players: [
        { id: "direct-user-id", display_name: "Niepowiazany Zawodnik", shirt_number: 10, position: "POM", active: true }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "direct-user-id" },
        profile: { id: "direct-user-id", role: "parent", display_name: "Opiekun Beta" }
      }
    });

    assert.equal(result.actor.actorKind, "parent");
    assert.equal(result.actor.activeChildId, null);
    assert.equal(result.model.profile.player.status, "unavailable");
    assert.equal(result.model.profile.player.reason, "no_linked_player");
  });

  await t.test("1.3. Parent with broken / invalid link returns unavailable(no_linked_player)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "orphaned-user", player_id: "deleted-player-id" }],
      players: [] // Player deleted or inactive
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "orphaned-user" },
        profile: { id: "orphaned-user", role: "parent", display_name: "Opiekun Gamma" }
      }
    });

    assert.equal(result.actor.actorKind, "parent");
    assert.equal(result.model.profile.player.status, "unavailable");
    assert.equal(result.model.profile.player.reason, "no_linked_player");
  });

  await t.test("1.4. Parent with 1 child maps strictly to authorized child", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-solo", player_id: "child-solo" }],
      players: [
        { id: "child-solo", display_name: "Zawodnik Alfa", shirt_number: 7, position: "POM", active: true },
        { id: "stranger-child", display_name: "Obce Dziecko", shirt_number: 9, position: "NAP", active: true }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-solo" },
        profile: { id: "parent-solo", role: "parent", display_name: "Opiekun Demo" }
      }
    });

    assert.equal(result.actor.actorKind, "parent");
    assert.equal(result.model.profile.player.status, "available");
    assert.equal(result.model.profile.player.data?.id, "child-solo");
    assert.equal(result.model.profile.player.data?.displayName, "Zawodnik Alfa");
    assert.deepEqual(result.actor.linkedChildIds, ["child-solo"]);
  });

  await t.test("1.5. Parent with multiple children allows switching without leaking unlinked children", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [
        { parent_id: "parent-multi", player_id: "child-1" },
        { parent_id: "parent-multi", player_id: "child-2" }
      ],
      players: [
        { id: "child-1", display_name: "Zawodnik Alfa", shirt_number: 4, position: "OBR", active: true },
        { id: "child-2", display_name: "Zawodnik Beta", shirt_number: 9, position: "NAP", active: true },
        { id: "child-unauthorized", display_name: "Obcy Zawodnik", shirt_number: 99, position: "BR", active: true }
      ]
    });

    // Request child-2
    const resChild2 = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-2",
      profileOverride: {
        user: { id: "parent-multi" },
        profile: { id: "parent-multi", role: "parent", display_name: "Opiekun Testowy" }
      }
    });
    assert.equal(resChild2.actor.activeChildId, "child-2");
    assert.equal(resChild2.model.profile.player.data?.displayName, "Zawodnik Beta");

    // Attempt to access unauthorized child-unauthorized
    const resUnauthorized = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-unauthorized",
      profileOverride: {
        user: { id: "parent-multi" },
        profile: { id: "parent-multi", role: "parent", display_name: "Opiekun Testowy" }
      }
    });
    // Must strictly fallback to first authorized child and never expose child-unauthorized
    assert.equal(resUnauthorized.actor.activeChildId, "child-1");
    assert.equal(resUnauthorized.model.profile.player.data?.displayName, "Zawodnik Alfa");
    assert.notEqual(resUnauthorized.model.profile.player.data?.displayName, "Obcy Zawodnik");
  });

  await t.test("1.6. Parent without linked children returns unavailable(no_linked_player)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [],
      players: [{ id: "unlinked", display_name: "Zawodnik Alfa", active: true }]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-no-children" },
        profile: { id: "parent-no-children", role: "parent", display_name: "Nowy Rodzic" }
      }
    });

    assert.equal(result.model.profile.player.status, "unavailable");
    assert.equal(result.model.profile.player.reason, "no_linked_player");
  });

  await t.test("1.7. Staff user (coach/admin) can view showcase players and is not required to be a parent", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [],
      players: [
        { id: "p1", display_name: "Zawodnik Alfa", shirt_number: 1, position: "BR", active: true },
        { id: "p2", display_name: "Zawodnik Beta", shirt_number: 2, position: "OBR", active: true }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "staff-1" },
        profile: { id: "staff-1", role: "coach", display_name: "Trener Sztab" }
      }
    });

    assert.equal(result.actor.actorKind, "staff");
    assert.equal(result.model.teamShowcase.status, "available");
    assert.equal(result.model.teamShowcase.data?.playerCount, 2);
  });

  // =========================================================================
  // 2. COLLECTION READ-ONLY INTEGRATION & DATA INTEGRITY (ETAP C & ETAP E)
  // =========================================================================

  await t.test("2.1. Unauthenticated request: collection sections safely blocked (not_authorized)", async () => {
    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      profileOverride: null
    });

    assert.equal(result.actor.isAuthenticated, false);
    assert.equal(result.model.recentCards.status, "unavailable");
    assert.equal(result.model.recentCards.reason, "not_authorized");
    assert.equal(result.model.albumProgress.status, "unavailable");
    assert.equal(result.model.albumProgress.reason, "not_authorized");
  });

  await t.test("2.2. Parent with cards: correct mapping of owned, total, percent, duplicates, unopenedPacks and recentCards", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-cards", player_id: "child-cards" }],
      players: [{ id: "child-cards", display_name: "Zawodnik Alfa", shirt_number: 7, position: "POM", active: true }],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", rarity: "GOLD", card_number: 1, is_active: true },
        { id: "def-2", card_name: "Karta Beta", rarity: "SILVER", card_number: 2, is_active: true },
        { id: "def-3", card_name: "Karta Gamma", rarity: "INFERNO", card_number: 3, is_active: true },
        { id: "def-4", card_name: "Karta Delta", rarity: "COMMON", card_number: 4, is_active: true }
      ],
      userCards: [
        {
          id: "uc-1",
          user_id: "parent-cards",
          card_id: "def-1",
          duplicates_count: 2, // 1 base + 2 duplicates = 3 copies
          acquired_at: "2026-11-20T10:00:00Z",
          card_definition: { id: "def-1", card_name: "Karta Alfa", rarity: "GOLD" }
        },
        {
          id: "uc-2",
          user_id: "parent-cards",
          card_id: "def-3",
          duplicates_count: 0, // 1 base = 1 copy
          acquired_at: "2026-11-23T15:00:00Z",
          card_definition: { id: "def-3", card_name: "Karta Gamma", rarity: "INFERNO" }
        }
      ],
      unopenedPacks: [
        { id: "pack-1", user_id: "parent-cards", is_opened: false },
        { id: "pack-2", user_id: "parent-cards", is_opened: false },
        { id: "pack-3", user_id: "parent-cards", is_opened: true } // opened pack should be ignored
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-cards" },
        profile: { id: "parent-cards", role: "parent", display_name: "Opiekun Kart" }
      }
    });

    // Album calculations:
    // Total definitions: 4
    // Unique owned: 2 (def-1, def-3)
    // Percent: Math.round(2 / 4 * 100) = 50%
    // Total copies: (1+2) + (1+0) = 4
    // Duplicates: 4 - 2 = 2
    // Unopened packs: 2 (only is_opened === false)
    assert.equal(result.model.albumProgress.status, "available");
    assert.equal(result.model.albumProgress.data?.owned, 2);
    assert.equal(result.model.albumProgress.data?.total, 4);
    assert.equal(result.model.albumProgress.data?.percent, 50);
    assert.equal(result.model.albumProgress.data?.duplicates, 2);
    assert.equal(result.model.albumProgress.data?.unopenedPacks, 2);

    // Recent drops: sorted by acquired_at desc (uc-2 is Nov 23, uc-1 is Nov 20)
    assert.equal(result.model.recentCards.status, "available");
    assert.equal(result.model.recentCards.data?.length, 2);
    assert.equal(result.model.recentCards.data?.[0].userCardId, "uc-2");
    assert.equal(result.model.recentCards.data?.[0].definitionId, "def-3");
    assert.equal(result.model.recentCards.data?.[0].name, "Karta Gamma");
    assert.equal(result.model.recentCards.data?.[1].userCardId, "uc-1");
  });

  await t.test("2.3. Parent without cards: empty collection state without synthetic data", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-empty", player_id: "child-empty" }],
      players: [{ id: "child-empty", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true },
        { id: "def-2", card_name: "Karta Beta", card_number: 2, is_active: true }
      ],
      userCards: [],
      unopenedPacks: [
        { id: "pack-1", user_id: "parent-empty", is_opened: false }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-empty" },
        profile: { id: "parent-empty", role: "parent", display_name: "Opiekun Bez Kart" }
      }
    });

    assert.equal(result.model.recentCards.status, "empty");
    assert.deepEqual(result.model.recentCards.data, []);
    assert.equal(result.model.albumProgress.status, "available");
    assert.equal(result.model.albumProgress.data?.owned, 0);
    assert.equal(result.model.albumProgress.data?.total, 2);
    assert.equal(result.model.albumProgress.data?.percent, 0);
    assert.equal(result.model.albumProgress.data?.duplicates, 0);
    assert.equal(result.model.albumProgress.data?.unopenedPacks, 1);
  });

  await t.test("2.4. Zero unopened packs represented accurately as 0", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-no-packs", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true }],
      userCards: [],
      unopenedPacks: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-no-packs" },
        profile: { id: "parent-no-packs", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.data?.unopenedPacks, 0);
  });

  await t.test("2.5. Duplicates calculation with multiple extra copies", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "p-dups", player_id: "c-1" }],
      players: [{ id: "c-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true }],
      userCards: [
        {
          id: "uc-1",
          user_id: "p-dups",
          card_id: "def-1",
          duplicates_count: 5, // 1 base + 5 duplicates = 6 copies
          acquired_at: "2026-11-20T10:00:00Z",
          card_definition: { id: "def-1", card_name: "Karta Alfa" }
        }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "p-dups" },
        profile: { id: "p-dups", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.data?.owned, 1);
    assert.equal(result.model.albumProgress.data?.duplicates, 5);
  });

  await t.test("2.6. User card referencing non-existent card definition is safely skipped in album progress", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "p-orphan-card", player_id: "c-1" }],
      players: [{ id: "c-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true }],
      userCards: [
        {
          id: "uc-ghost",
          user_id: "p-orphan-card",
          card_id: "def-deleted-or-inactive",
          duplicates_count: 0,
          acquired_at: "2026-11-20T10:00:00Z"
        }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "p-orphan-card" },
        profile: { id: "p-orphan-card", role: "parent", display_name: "Opiekun" }
      }
    });

    // Ghost card is ignored because its ID is not in active cardDefinitions
    assert.equal(result.model.albumProgress.data?.owned, 0);
    assert.equal(result.model.albumProgress.data?.duplicates, 0);
  });

  await t.test("2.7. User card missing definition object is filtered out of recentCards", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "p-missing-def", player_id: "c-1" }],
      players: [{ id: "c-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true }],
      userCards: [
        {
          id: "uc-no-def",
          user_id: "p-missing-def",
          card_id: "def-1",
          card_definition: null, // missing definition
          acquired_at: "2026-11-20T10:00:00Z"
        }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "p-missing-def" },
        profile: { id: "p-missing-def", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.recentCards.status, "empty");
    assert.deepEqual(result.model.recentCards.data, []);
  });

  await t.test("2.8. Database error on card_definitions or user_cards returns unavailable(not_loaded) without throwing", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "p-err", player_id: "c-1" }],
      players: [{ id: "c-1", display_name: "Zawodnik Alfa", active: true }],
      errorOn: "user_cards"
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "p-err" },
        profile: { id: "p-err", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.recentCards.status, "unavailable");
    assert.equal(result.model.recentCards.reason, "not_loaded");
    assert.equal(result.model.albumProgress.status, "unavailable");
    assert.equal(result.model.albumProgress.reason, "not_loaded");
  });

  await t.test("2.9. Database error on user_unopened_packs safely defaults unopenedPacks to 0", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "p-packs-err", player_id: "c-1" }],
      players: [{ id: "c-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true }],
      userCards: [],
      errorOn: "user_unopened_packs"
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "p-packs-err" },
        profile: { id: "p-packs-err", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.status, "available");
    assert.equal(result.model.albumProgress.data?.unopenedPacks, 0);
  });

  await t.test("2.10. Recent cards gallery sorts latest drops first and limits to 3", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "p-order", player_id: "c-1" }],
      players: [{ id: "c-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [
        { id: "d1", card_name: "Karta 1", card_number: 1, is_active: true },
        { id: "d2", card_name: "Karta 2", card_number: 2, is_active: true },
        { id: "d3", card_name: "Karta 3", card_number: 3, is_active: true },
        { id: "d4", card_name: "Karta 4", card_number: 4, is_active: true }
      ],
      userCards: [
        { id: "c-old", user_id: "p-order", card_id: "d1", acquired_at: "2026-11-01T10:00:00Z", card_definition: { id: "d1", card_name: "Karta 1" } },
        { id: "c-newest", user_id: "p-order", card_id: "d4", acquired_at: "2026-11-23T10:00:00Z", card_definition: { id: "d4", card_name: "Karta 4" } },
        { id: "c-mid", user_id: "p-order", card_id: "d2", acquired_at: "2026-11-15T10:00:00Z", card_definition: { id: "d2", card_name: "Karta 2" } },
        { id: "c-second-newest", user_id: "p-order", card_id: "d3", acquired_at: "2026-11-20T10:00:00Z", card_definition: { id: "d3", card_name: "Karta 3" } }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "p-order" },
        profile: { id: "p-order", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.recentCards.data?.length, 3);
    assert.equal(result.model.recentCards.data?.[0].userCardId, "c-newest");
    assert.equal(result.model.recentCards.data?.[1].userCardId, "c-second-newest");
    assert.equal(result.model.recentCards.data?.[2].userCardId, "c-mid");
  });

  await t.test("2.11. Data purity: progress and achievements remain unavailable(not_loaded) in real-data mode", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-real", player_id: "child-real" }],
      players: [{ id: "child-real", display_name: "Zawodnik Alfa", shirt_number: 11, position: "POM", active: true }]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-real" },
        profile: { id: "parent-real", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.progress.status, "unavailable");
    assert.equal(result.model.progress.reason, "not_loaded");
    assert.equal(result.model.recentAchievements.status, "unavailable");
    assert.equal(result.model.recentAchievements.reason, "not_loaded");
  });

  await t.test("2.12. Multi-child family: switching activeChildId switches child sports profile, but preserves exact same collection (shared parent album)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [
        { parent_id: "parent-fam", player_id: "child-1" },
        { parent_id: "parent-fam", player_id: "child-2" }
      ],
      players: [
        { id: "child-1", display_name: "Zawodnik Alfa", shirt_number: 4, position: "OBR", active: true },
        { id: "child-2", display_name: "Zawodnik Beta", shirt_number: 9, position: "NAP", active: true }
      ],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true },
        { id: "def-2", card_name: "Karta Beta", card_number: 2, is_active: true },
        { id: "def-3", card_name: "Karta Gamma", card_number: 3, is_active: true }
      ],
      userCards: [
        { id: "uc-1", user_id: "parent-fam", card_id: "def-1", duplicates_count: 1, acquired_at: "2026-11-20T10:00:00Z", card_definition: { id: "def-1", card_name: "Karta Alfa" } },
        { id: "uc-2", user_id: "parent-fam", card_id: "def-2", duplicates_count: 0, acquired_at: "2026-11-21T10:00:00Z", card_definition: { id: "def-2", card_name: "Karta Beta" } }
      ],
      unopenedPacks: [
        { id: "pack-1", user_id: "parent-fam", is_opened: false },
        { id: "pack-2", user_id: "parent-fam", is_opened: false }
      ]
    });

    // 1st request: active child is child-1
    const resChild1 = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-fam" },
        profile: { id: "parent-fam", role: "parent", display_name: "Opiekun Rodzinny" }
      }
    });

    // 2nd request: active child is child-2
    const resChild2 = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-2",
      profileOverride: {
        user: { id: "parent-fam" },
        profile: { id: "parent-fam", role: "parent", display_name: "Opiekun Rodzinny" }
      }
    });

    // Sports profiles are independent and accurately reflect the respective child:
    assert.equal(resChild1.model.profile.player.data?.id, "child-1");
    assert.equal(resChild1.model.profile.player.data?.displayName, "Zawodnik Alfa");
    assert.equal(resChild1.model.profile.player.data?.shirtNumber, 4);

    assert.equal(resChild2.model.profile.player.data?.id, "child-2");
    assert.equal(resChild2.model.profile.player.data?.displayName, "Zawodnik Beta");
    assert.equal(resChild2.model.profile.player.data?.shirtNumber, 9);

    // Collection metrics remain identical and shared across the family account:
    assert.deepEqual(resChild1.model.albumProgress.data, {
      owned: 2,
      total: 3,
      percent: 67,
      duplicates: 1,
      unopenedPacks: 2
    });
    assert.deepEqual(resChild2.model.albumProgress.data, {
      owned: 2,
      total: 3,
      percent: 67,
      duplicates: 1,
      unopenedPacks: 2
    });
    assert.equal(resChild1.model.recentCards.data?.length, 2);
    assert.equal(resChild2.model.recentCards.data?.length, 2);
  });

  await t.test("2.13. Cross-account collection isolation: User A cannot see User B cards or packs", async () => {
    const mockClient = createMockSupabase({
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", card_number: 1, is_active: true },
        { id: "def-2", card_name: "Karta Beta", card_number: 2, is_active: true }
      ],
      userCards: [
        { id: "uc-a", user_id: "user-alpha", card_id: "def-1", duplicates_count: 0, acquired_at: "2026-11-20T10:00:00Z", card_definition: { id: "def-1", card_name: "Karta Alfa" } },
        { id: "uc-b", user_id: "user-beta", card_id: "def-2", duplicates_count: 2, acquired_at: "2026-11-22T10:00:00Z", card_definition: { id: "def-2", card_name: "Karta Beta" } }
      ],
      unopenedPacks: [
        { id: "pack-a1", user_id: "user-alpha", is_opened: false },
        { id: "pack-a2", user_id: "user-alpha", is_opened: false }
        // user-beta has 0 unopened packs
      ]
    });

    const resUserA = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "user-alpha" },
        profile: { id: "user-alpha", role: "parent", display_name: "Opiekun Alpha" }
      }
    });

    const resUserB = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "user-beta" },
        profile: { id: "user-beta", role: "parent", display_name: "Opiekun Beta" }
      }
    });

    // User A sees only their own card and packs:
    assert.equal(resUserA.model.albumProgress.data?.owned, 1);
    assert.equal(resUserA.model.albumProgress.data?.duplicates, 0);
    assert.equal(resUserA.model.albumProgress.data?.unopenedPacks, 2);
    assert.equal(resUserA.model.recentCards.data?.[0]?.userCardId, "uc-a");

    // User B sees only their own card and duplicates, and 0 packs:
    assert.equal(resUserB.model.albumProgress.data?.owned, 1);
    assert.equal(resUserB.model.albumProgress.data?.duplicates, 2);
    assert.equal(resUserB.model.albumProgress.data?.unopenedPacks, 0);
    assert.equal(resUserB.model.recentCards.data?.[0]?.userCardId, "uc-b");
  });

  // =========================================================================
  // 3. TIMEZONE & SCHEDULE ENGINE (EUROPE/WARSAW)
  // =========================================================================

  await t.test("3.1. Europe/Warsaw Summer Time (CEST UTC+2) parsing", () => {
    // July 15 at 12:00 in Warsaw is UTC+2 (10:00:00 UTC)
    const parsed = parseWarsawDateTime("2026-07-15", "12:00:00");
    assert.ok(parsed);
    assert.equal(parsed.hasTime, true);
    assert.equal(parsed.date.toISOString(), "2026-07-15T10:00:00.000Z");
  });

  await t.test("3.2. Europe/Warsaw Winter Time (CET UTC+1) parsing", () => {
    // January 15 at 12:00 in Warsaw is UTC+1 (11:00:00 UTC)
    const parsed = parseWarsawDateTime("2026-01-15", "12:00:00");
    assert.ok(parsed);
    assert.equal(parsed.hasTime, true);
    assert.equal(parsed.date.toISOString(), "2026-01-15T11:00:00.000Z");
  });

  await t.test("3.3. DST Spring Transition non-existent hour handled safely without throwing", () => {
    // On 2026-03-29, 02:30 does not exist locally (clocks jump 02:00 -> 03:00)
    const parsed = parseWarsawDateTime("2026-03-29", "02:30:00");
    assert.ok(parsed);
    assert.equal(Number.isNaN(parsed.date.getTime()), false);
  });

  await t.test("3.4. DST Autumn Transition ambiguous hour handled safely without throwing", () => {
    // On 2026-10-25, 02:30 occurs twice (clocks fall back 03:00 -> 02:00)
    const parsed = parseWarsawDateTime("2026-10-25", "02:30:00");
    assert.ok(parsed);
    assert.equal(Number.isNaN(parsed.date.getTime()), false);
  });

  await t.test("3.5. Match without time has hasTime:false and null countdown (no fake countdown)", () => {
    const matches = [
      {
        id: "m-no-time",
        match_date: "2026-11-28",
        match_time: null,
        status: "scheduled",
        home_team: "Delta",
        away_team: "Legia"
      }
    ];

    const selected = selectNearestEvent(matches, [], FIXED_NOW);
    assert.equal(selected.eventContext.nextEventType, "match");
    assert.equal(selected.eventContext.hasTime, false);
    assert.equal(selected.nextMatchCountdown, null);
  });

  await t.test("3.6. Canceled match strictly excluded from nearest event candidate selection", () => {
    const matches = [
      {
        id: "m-cancelled",
        match_date: "2026-11-25",
        match_time: "10:00:00",
        status: "cancelled",
        home_team: "Delta",
        away_team: "Polonia"
      },
      {
        id: "m-valid",
        match_date: "2026-11-29",
        match_time: "11:00:00",
        status: "scheduled",
        home_team: "Delta",
        away_team: "Hutnik"
      }
    ];

    const selected = selectNearestEvent(matches, [], FIXED_NOW);
    assert.equal(selected.eventContext.eventId, "m-valid");
  });

  await t.test("3.7. Chronological ordering correctly picks training before subsequent match", () => {
    const matches = [
      {
        id: "m-saturday",
        match_date: "2026-11-28",
        match_time: "11:00:00",
        status: "scheduled",
        home_team: "Delta",
        away_team: "Znicz"
      }
    ];
    const trainings = [
      {
        id: "t-friday",
        training_date: "2026-11-27",
        start_time: "17:00:00",
        title: "Trening taktyczny"
      }
    ];

    const selected = selectNearestEvent(matches, trainings, FIXED_NOW);
    assert.equal(selected.eventContext.nextEventType, "training");
    assert.equal(selected.eventContext.eventId, "t-friday");
    assert.equal(selected.nextMatch, null);
  });

  // =========================================================================
  // 4. ROUTE SECURITY & ENVIRONMENT ISOLATION (DELTA-027)
  // =========================================================================

  await t.test("4.1. isGenuineLocalEnvironment unconditionally rejects Vercel runtime", () => {
    const oldVercel = process.env.VERCEL;
    const oldVercelEnv = process.env.VERCEL_ENV;

    try {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "preview";

      // Even if spoofed header sends localhost, it MUST reject on Vercel
      assert.equal(isGenuineLocalEnvironment("localhost:3000"), false);
      assert.equal(isGenuineLocalEnvironment("127.0.0.1"), false);
      assert.equal(isGenuineLocalEnvironment("delta-2028-preview.vercel.app"), false);
    } finally {
      if (oldVercel !== undefined) process.env.VERCEL = oldVercel;
      else delete process.env.VERCEL;
      if (oldVercelEnv !== undefined) process.env.VERCEL_ENV = oldVercelEnv;
      else delete process.env.VERCEL_ENV;
    }
  });

  await t.test("4.2. isGenuineLocalEnvironment rejects remote production hostnames", () => {
    assert.equal(isGenuineLocalEnvironment("gm2018.pl"), false);
    assert.equal(isGenuineLocalEnvironment("delta-2028.vercel.app"), false);
    assert.equal(isGenuineLocalEnvironment("preview.gm2018.pl"), false);
  });

  await t.test("4.3. isGenuineLocalEnvironment accepts genuine local loopback when not on Vercel", () => {
    const oldVercel = process.env.VERCEL;
    const oldVercelEnv = process.env.VERCEL_ENV;

    try {
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;

      assert.equal(isGenuineLocalEnvironment("localhost:3005"), true);
      assert.equal(isGenuineLocalEnvironment("127.0.0.1:3000"), true);
      assert.equal(isGenuineLocalEnvironment("::1"), true);
    } finally {
      if (oldVercel !== undefined) process.env.VERCEL = oldVercel;
      else delete process.env.VERCEL;
      if (oldVercelEnv !== undefined) process.env.VERCEL_ENV = oldVercelEnv;
      else delete process.env.VERCEL_ENV;
    }
  });
});
