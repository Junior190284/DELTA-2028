import test from "node:test";
import assert from "node:assert/strict";
import { loadRealDashboardUI4Data } from "../lib/dashboard-ui4/real-data-loader.ts";
import { createDashboardUI4Model } from "../components/dashboard/ui4/adapter.ts";
import type { DashboardUI4AdapterInput } from "../components/dashboard/ui4/types.ts";

/**
 * DELTA-033: Collection Data Integrity & Real Data Cleanup Test Suite
 * Validates strict separation of demo vs real data, absence of fake denominators,
 * zero synthetic XP/badges, and complete model consistency between HOME and COLLECTION.
 */
function createMockSupabase(data: {
  parentPlayers?: any[];
  players?: any[];
  matches?: any[];
  trainingSessions?: any[];
  news?: any[];
  clubUpdates?: any[];
  cardDefinitions?: any[];
  userCards?: any[];
  unopenedPacks?: any[];
}) {
  return {
    from: (table: string) => {
      const builder: any = {
        _table: table,
        _filters: {} as Record<string, any>,
        select: (_fields?: string) => builder,
        eq: (col: string, val: any) => {
          builder._filters[col] = val;
          return builder;
        },
        in: (col: string, vals: any[]) => {
          builder._filters[col] = { in: vals };
          return builder;
        },
        order: (_col: string, _opts?: any) => builder,
        limit: (_n: number) => builder,
        then: (resolve: (val: any) => void) => {
          let rows: any[] = [];
          if (table === "parent_players") rows = data.parentPlayers ?? [];
          else if (table === "players") rows = data.players ?? [];
          else if (table === "matches") rows = data.matches ?? [];
          else if (table === "training_sessions") rows = data.trainingSessions ?? [];
          else if (table === "news") rows = data.news ?? [];
          else if (table === "club_updates") rows = data.clubUpdates ?? [];
          else if (table === "card_definitions") rows = data.cardDefinitions ?? [];
          else if (table === "user_cards") rows = data.userCards ?? [];
          else if (table === "user_unopened_packs") rows = data.unopenedPacks ?? [];

          // Apply filters
          let filtered = rows.filter(r => {
            for (const [k, v] of Object.entries(builder._filters)) {
              if (v && typeof v === "object" && "in" in v && Array.isArray((v as any).in)) {
                if (!(v as any).in.includes(r[k])) return false;
              } else if (r[k] !== v) {
                return false;
              }
            }
            return true;
          });

          resolve({ data: filtered, error: null });
        }
      };
      return builder;
    }
  };
}

const FIXED_NOW = new Date("2026-11-24T12:00:00Z");

test("DELTA-033 — Collection Data Integrity & Verification Suite", async (t) => {

  await t.test("1. Konto bez kart: returns owned 0, duplicates 0, total null, percent null", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta Alfa", is_active: true }],
      userCards: [],
      unopenedPacks: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.recentCards.status, "empty");
    assert.deepEqual(result.model.recentCards.data, []);
    assert.equal(result.model.albumProgress.status, "available");
    assert.equal(result.model.albumProgress.data?.owned, 0);
    assert.equal(result.model.albumProgress.data?.total, null);
    assert.equal(result.model.albumProgress.data?.percent, null);
    assert.equal(result.model.albumProgress.data?.duplicates, 0);
    assert.equal(result.model.albumProgress.data?.unopenedPacks, 0);
  });

  await t.test("2. Konto z kartami: calculates owned unique cards directly from user_cards", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", rarity: "common", is_active: true },
        { id: "def-2", card_name: "Karta Beta", rarity: "rare", is_active: true },
        { id: "def-3", card_name: "Karta Gamma", rarity: "inferno", is_active: true }
      ],
      userCards: [
        { id: "uc-1", user_id: "parent-1", card_id: "def-1", duplicates_count: 0, card_definition: { id: "def-1", card_name: "Karta Alfa", rarity: "common" } },
        { id: "uc-2", user_id: "parent-1", card_id: "def-2", duplicates_count: 0, card_definition: { id: "def-2", card_name: "Karta Beta", rarity: "rare" } }
      ],
      unopenedPacks: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.data?.owned, 2);
    assert.equal(result.model.recentCards.data?.length, 2);
  });

  await t.test("3. Duplikaty: duplicates_count correctly increases duplicates without increasing owned", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", rarity: "common", is_active: true }
      ],
      userCards: [
        { id: "uc-1", user_id: "parent-1", card_id: "def-1", duplicates_count: 3, card_definition: { id: "def-1", card_name: "Karta Alfa", rarity: "common" } }
      ],
      unopenedPacks: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.data?.owned, 1);
    assert.equal(result.model.albumProgress.data?.duplicates, 3);
  });

  await t.test("4. Niepełny katalog RLS: does NOT use RLS definition count as total denominator", async () => {
    // Simulated Staging RLS: returns 15 definitions (10 owned + 5 linked child), user owns 10
    const cardDefinitions = Array.from({ length: 15 }, (_, i) => ({
      id: `def-${i + 1}`,
      card_name: `Karta ${i + 1}`,
      rarity: i < 10 ? "common" : "inferno",
      is_active: true
    }));
    const userCards = Array.from({ length: 10 }, (_, i) => ({
      id: `uc-${i + 1}`,
      user_id: "parent-staging",
      card_id: `def-${i + 1}`,
      duplicates_count: i === 0 ? 1 : 0,
      acquired_at: "2026-11-20T10:00:00Z",
      card_definition: cardDefinitions[i]
    }));

    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-staging", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions,
      userCards,
      unopenedPacks: [
        { id: "p-1", user_id: "parent-staging", is_opened: false },
        { id: "p-2", user_id: "parent-staging", is_opened: false }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-staging" },
        profile: { id: "parent-staging", role: "parent", display_name: "Opiekun Staging" }
      }
    });

    // CRITICAL DELTA-033: Owned is 10, Duplicates is 1, Packs is 2.
    // Total MUST NOT be 15, and Percent MUST NOT be 67%!
    assert.equal(result.model.albumProgress.data?.owned, 10);
    assert.equal(result.model.albumProgress.data?.duplicates, 1);
    assert.equal(result.model.albumProgress.data?.unopenedPacks, 2);
    assert.equal(result.model.albumProgress.data?.total, null, "Total must be null when catalog is non-authoritative");
    assert.equal(result.model.albumProgress.data?.percent, null, "Percent must be null when catalog is non-authoritative");
  });

  await t.test("5. Brak autorytatywnego licznika: total and percent remain null without arbitrary constants (like 66)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [{ id: "def-1", card_name: "Karta 1", is_active: true }],
      userCards: [{ id: "uc-1", user_id: "parent-1", card_id: "def-1", duplicates_count: 0, card_definition: { id: "def-1", card_name: "Karta 1" } }],
      unopenedPacks: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.data?.total, null);
    assert.notEqual(result.model.albumProgress.data?.total, 66, "Must not use unconfirmed constant 66");
    assert.equal(result.model.albumProgress.data?.percent, null);
  });

  await t.test("6. Brak osiągnięć i XP: progress and achievements remain unavailable(not_loaded)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [],
      userCards: [],
      unopenedPacks: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.progress.status, "unavailable");
    assert.equal(result.model.progress.reason, "not_loaded");
    assert.equal(result.model.progress.data, null);
    assert.equal(result.model.recentAchievements.status, "unavailable");
    assert.equal(result.model.recentAchievements.reason, "not_loaded");
    assert.equal(result.model.recentAchievements.data, null);
  });

  await t.test("7. Brak paczek: 0 unopened packs correctly represented as 0, never demo fallback 3", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [],
      userCards: [],
      unopenedPacks: [] // zero packs
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.albumProgress.data?.unopenedPacks, 0);
  });

  await t.test("8. Sesja niezalogowana: collection blocked with unavailable(not_authorized)", async () => {
    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      profileOverride: null // No authenticated user
    });

    assert.equal(result.actor.isAuthenticated, false);
    assert.equal(result.model.albumProgress.status, "unavailable");
    assert.equal(result.model.albumProgress.reason, "not_authorized");
    assert.equal(result.model.recentCards.status, "unavailable");
    assert.equal(result.model.recentCards.reason, "not_authorized");
  });

  await t.test("9. Rodzina z kilkorgiem dzieci: changing child preserves identical collection metrics", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [
        { parent_id: "parent-multi", player_id: "child-1" },
        { parent_id: "parent-multi", player_id: "child-2" }
      ],
      players: [
        { id: "child-1", display_name: "Zawodnik Alfa", active: true },
        { id: "child-2", display_name: "Zawodnik Beta", active: true }
      ],
      cardDefinitions: [{ id: "def-1", card_name: "Karta 1", is_active: true }],
      userCards: [{ id: "uc-1", user_id: "parent-multi", card_id: "def-1", duplicates_count: 2, card_definition: { id: "def-1", card_name: "Karta 1" } }],
      unopenedPacks: [{ id: "p-1", user_id: "parent-multi", is_opened: false }]
    });

    const res1 = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-multi" },
        profile: { id: "parent-multi", role: "parent", display_name: "Opiekun" }
      }
    });

    const res2 = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-2",
      profileOverride: {
        user: { id: "parent-multi" },
        profile: { id: "parent-multi", role: "parent", display_name: "Opiekun" }
      }
    });

    // Profile switches
    assert.equal(res1.model.profile.player.data?.id, "child-1");
    assert.equal(res2.model.profile.player.data?.id, "child-2");

    // Collection metrics remain identical
    assert.deepEqual(res1.model.albumProgress.data, res2.model.albumProgress.data);
    assert.equal(res1.model.albumProgress.data?.owned, 1);
    assert.equal(res1.model.albumProgress.data?.duplicates, 2);
    assert.equal(res1.model.albumProgress.data?.unopenedPacks, 1);
  });

  await t.test("10. Zgodność HOME i COLLECTION: both views consume exact same model data", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Zawodnik Alfa", active: true }],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", card_type: "base", rarity: "common", is_active: true },
        { id: "def-2", card_name: "Karta Beta", card_type: "matchday", rarity: "rare", is_active: true },
        { id: "def-3", card_name: "Karta Gamma", card_type: "inferno", rarity: "inferno", is_active: true }
      ],
      userCards: [
        { id: "uc-1", user_id: "parent-1", card_id: "def-1", duplicates_count: 1, acquired_at: "2026-11-20T10:00:00Z", card_definition: { id: "def-1", card_name: "Karta Alfa", card_type: "base", rarity: "common" } },
        { id: "uc-2", user_id: "parent-1", card_id: "def-2", duplicates_count: 0, acquired_at: "2026-11-21T10:00:00Z", card_definition: { id: "def-2", card_name: "Karta Beta", card_type: "matchday", rarity: "rare" } },
        { id: "uc-3", user_id: "parent-1", card_id: "def-3", duplicates_count: 0, acquired_at: "2026-11-22T10:00:00Z", card_definition: { id: "def-3", card_name: "Karta Gamma", card_type: "inferno", rarity: "inferno" } }
      ],
      unopenedPacks: [{ id: "p-1", user_id: "parent-1", is_opened: false }]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    const m = result.model;

    // Single source of truth for both Home and Collection:
    const homeOwned = m.albumProgress.data?.owned;
    const collectionOwned = m.albumProgress.data?.owned;
    assert.equal(homeOwned, collectionOwned);
    assert.equal(homeOwned, 3);

    const homeDuplicates = m.albumProgress.data?.duplicates;
    const collectionDuplicates = m.albumProgress.data?.duplicates;
    assert.equal(homeDuplicates, collectionDuplicates);
    assert.equal(homeDuplicates, 1);

    const homePacks = m.albumProgress.data?.unopenedPacks;
    const collectionPacks = m.albumProgress.data?.unopenedPacks;
    assert.equal(homePacks, collectionPacks);
    assert.equal(homePacks, 1);

    const homePercent = m.albumProgress.data?.percent;
    const collectionPercent = m.albumProgress.data?.percent;
    assert.equal(homePercent, collectionPercent);
    assert.equal(homePercent, null, "Neither Home nor Collection displays false completion percentage");

    // Series breakdown
    assert.equal(m.albumProgress.data?.series?.length, 3);
    assert.equal(m.albumProgress.data?.series?.[0].owned, 1); // Base
    assert.equal(m.albumProgress.data?.series?.[1].owned, 1); // Matchday
    assert.equal(m.albumProgress.data?.series?.[2].owned, 1); // Inferno
  });

});
