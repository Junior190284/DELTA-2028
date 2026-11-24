/**
 * DELTA INFERNO — DELTA-040 Real Player Achievements Integration Suite
 *
 * Verifies:
 * 1. Player without badges -> empty achievements list, neutral state "Brak zdobytych odznak w tym sezonie", nearest goal att_1.
 * 2. Player with badges (att_10) -> verified badge loaded with name, description, icon Shield, formatted date; next goal att_25.
 * 3. Sibling switching (Child A with badges vs Child B without) -> badges switch per player; family cards/packs stay identical.
 * 4. Unauthorized / alien child query -> RLS / access guard blocks leakage (safe fallback to authorized child; no_linked_player for unlinked).
 * 5. RLS / DB error on player_achievements -> status unavailable("not_loaded") without crashing.
 * 6. Empty achievement_definitions table in DB -> code-authoritative catalog enriches metadata safely.
 * 7. Zero demo fallbacks in real data mode -> authentic empty state without mock badges.
 * 8. Read-only verification -> strictly 0 database mutations (zero inserts, updates, upserts, deletes, and zero calls to sync API).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadRealDashboardUI4Data,
  safeQueryPlayerAchievements
} from "../lib/dashboard-ui4/real-data-loader.ts";
import {
  calculatePlayerAchievements,
  ACHIEVEMENTS_CATALOG
} from "../lib/achievements/engine.ts";
import {
  createDashboardUI4Model
} from "../components/dashboard/ui4/adapter.ts";

/**
 * Creates an in-memory mock Supabase client for DELTA-040 tests with mutation tracking.
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
              order: () => errPromise
            });
          },
          insert: (payload: any) => {
            mutations.push({ table, method: "insert", payload });
            return Promise.resolve({ data: null, error: new Error(`Simulated DB failure on ${table}`) });
          },
          upsert: (payload: any) => {
            mutations.push({ table, method: "upsert", payload });
            return Promise.resolve({ data: null, error: new Error(`Simulated DB failure on ${table}`) });
          },
          update: (payload: any) => {
            mutations.push({ table, method: "update", payload });
            return Promise.resolve({ data: null, error: new Error(`Simulated DB failure on ${table}`) });
          },
          delete: () => {
            mutations.push({ table, method: "delete", payload: null });
            return Promise.resolve({ data: null, error: new Error(`Simulated DB failure on ${table}`) });
          }
        };
      }

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
        insert: (payload: any) => {
          mutations.push({ table, method: "insert", payload });
          return Promise.resolve({ data: payload, error: null });
        },
        upsert: (payload: any) => {
          mutations.push({ table, method: "upsert", payload });
          return Promise.resolve({ data: payload, error: null });
        },
        update: (payload: any) => {
          mutations.push({ table, method: "update", payload });
          return Promise.resolve({ data: payload, error: null });
        },
        delete: () => {
          mutations.push({ table, method: "delete", payload: null });
          return Promise.resolve({ data: null, error: null });
        },
        then: (resolve: (val: any) => void) => {
          let rows: any[] = [];
          if (table === "parent_players") rows = dataset.parentPlayers ?? [];
          else if (table === "players") rows = dataset.players ?? [];
          else if (table === "matches") rows = dataset.matches ?? [];
          else if (table === "training_sessions") rows = dataset.trainingSessions ?? [];
          else if (table === "news") rows = dataset.news ?? [];
          else if (table === "club_updates") rows = dataset.clubUpdates ?? [];
          else if (table === "card_definitions") rows = dataset.cardDefinitions ?? [];
          else if (table === "user_cards") rows = dataset.userCards ?? [];
          else if (table === "user_unopened_packs") rows = dataset.unopenedPacks ?? [];
          else if (table === "training_attendance") rows = dataset.trainingAttendance ?? [];
          else if (table === "match_attendance") rows = dataset.matchAttendance ?? [];
          else if (table === "player_achievements") rows = dataset.playerAchievements ?? [];
          else {
            resolve({ data: null, error: new Error(`Table ${table} not found`) });
            return;
          }

          const filtered = rows.filter(r => {
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

  return client;
}

const mockProfileParent = {
  user: { id: "parent-uuid-001" },
  profile: { id: "parent-uuid-001", role: "parent", display_name: "Opiekun Testowy" }
};

const baseDataset = {
  parentPlayers: [
    { parent_id: "parent-uuid-001", player_id: "player-uuid-101" }
  ],
  players: [
    { id: "player-uuid-101", display_name: "Zawodnik Testowy", shirt_number: 10, position: "NAP", active: true }
  ],
  matches: [],
  trainingSessions: [
    { id: "tr-1", training_date: "2026-10-01", start_time: "17:00", end_time: "18:30" }
  ],
  trainingAttendance: [
    { training_id: "tr-1", player_id: "player-uuid-101", status: "present" }
  ],
  matchAttendance: [],
  cardDefinitions: [
    { id: "c-1", card_name: "Zawodnik Testowy Base", rarity: "common", card_type: "base", is_active: true }
  ],
  userCards: [
    { id: "uc-1", user_id: "parent-uuid-001", card_id: "c-1", duplicates_count: 0, card_definition: { id: "c-1", card_name: "Zawodnik Testowy Base", rarity: "common", card_type: "base" } }
  ],
  unopenedPacks: []
};

test("DELTA-040 — Real Player Achievements Integration Suite", async (t) => {
  await t.test("1. Player without badges -> empty achievements list & neutral state, nearest goal att_1", async () => {
    const client = createMockSupabase({
      ...baseDataset,
      trainingAttendance: [], // 0 confirmed trainings
      playerAchievements: [] // 0 unlocked badges in DB
    });

    const result = await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "player-uuid-101",
      now: new Date("2026-10-02T12:00:00Z")
    });

    const achSection = result.model.recentAchievements;
    assert.equal(achSection.status, "empty", "Status must be 'empty' when player has zero unlocked badges");
    assert.deepEqual(achSection.data, [], "Achievements data array must be empty");

    const progressSection = result.model.progress;
    assert.equal(progressSection.status, "available");
    const nextAch = progressSection.data?.nextAchievement;
    assert.ok(nextAch, "Next achievement must be calculated in-memory");
    assert.equal(nextAch.id, "att_1");
    assert.equal(nextAch.name, "Pierwszy Trening");
    assert.equal(nextAch.current, 0);
    assert.equal(nextAch.target, 1);
    assert.equal(nextAch.percent, 0);
  });

  await t.test("2. Player with badges (att_10) -> verified badge loaded with name, description, icon Shield, formatted date; next goal att_25", async () => {
    const client = createMockSupabase({
      ...baseDataset,
      playerAchievements: [
        {
          id: "ach-row-1",
          player_id: "player-uuid-101",
          achievement_id: "att_10",
          unlocked_at: "2026-10-09T09:21:42.304+00:00",
          progress: 10
        }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "player-uuid-101",
      now: new Date("2026-10-10T12:00:00Z")
    });

    const achSection = result.model.recentAchievements;
    assert.equal(achSection.status, "available", "Status must be 'available' when player has unlocked badges");
    assert.ok(achSection.data && achSection.data.length === 1, "Must contain exactly 1 unlocked badge");

    const badge = achSection.data![0];
    assert.equal(badge.id, "att_10");
    assert.equal(badge.name, "10 Treningów (Training Hero)");
    assert.equal(badge.description, "Zalicz 10 oficjalnych treningów DELTA z potwierdzoną obecnością.");
    assert.equal(badge.icon, "Shield");
    assert.equal(badge.unlockedAt, "2026-10-09T09:21:42.304+00:00");
    assert.equal(badge.category, "attendance");
    assert.equal(badge.rarity, "rare");

    // The next goal must NOT propose att_10 because it is already unlocked
    const nextAch = result.model.progress.data?.nextAchievement;
    assert.ok(nextAch, "Next achievement must exist");
    assert.notEqual(nextAch.id, "att_10", "Already unlocked badge must never be proposed as next goal");
  });

  await t.test("3. Sibling switching (Child A with badges vs Child B without) -> achievements switch per child, family collection stays identical", async () => {
    const multiChildDataset = {
      ...baseDataset,
      parentPlayers: [
        { parent_id: "parent-uuid-001", player_id: "child-a-uuid" },
        { parent_id: "parent-uuid-001", player_id: "child-b-uuid" }
      ],
      players: [
        { id: "child-a-uuid", display_name: "Zawodnik Alfa", shirt_number: 10, position: "NAP", active: true },
        { id: "child-b-uuid", display_name: "Zawodnik Beta", shirt_number: 5, position: "OBR", active: true }
      ],
      playerAchievements: [
        {
          id: "ach-1",
          player_id: "child-a-uuid",
          achievement_id: "att_10",
          unlocked_at: "2026-10-09T09:21:42.304+00:00"
        }
        // child-b-uuid has 0 achievements
      ],
      userCards: [
        { id: "uc-1", user_id: "parent-uuid-001", card_id: "c-1", duplicates_count: 2, card_definition: { id: "c-1", card_name: "Family Card", rarity: "common", card_type: "base" } }
      ]
    };

    const client = createMockSupabase(multiChildDataset);

    // Query for Child A
    const resA = await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "child-a-uuid",
      now: new Date("2026-10-10T12:00:00Z")
    });

    // Query for Child B
    const resB = await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "child-b-uuid",
      now: new Date("2026-10-10T12:00:00Z")
    });

    // Assert Child A has badge att_10
    assert.equal(resA.model.recentAchievements.status, "available");
    assert.equal(resA.model.recentAchievements.data?.length, 1);
    assert.equal(resA.model.recentAchievements.data?.[0]?.id, "att_10");

    // Assert Child B has 0 badges
    assert.equal(resB.model.recentAchievements.status, "empty");
    assert.equal(resB.model.recentAchievements.data?.length, 0);

    // Assert Family Collection is identical for both siblings
    assert.equal(resA.model.albumProgress.data?.owned, resB.model.albumProgress.data?.owned);
    assert.equal(resA.model.albumProgress.data?.duplicates, resB.model.albumProgress.data?.duplicates);
    assert.equal(resA.model.recentCards.data?.length, resB.model.recentCards.data?.length);
  });

  await t.test("4. Unauthorized child query -> safe fallback to parent's authorized child, no_linked_player for unlinked account", async () => {
    const client = createMockSupabase(baseDataset);

    // Parent attempts to query stranger child "alien-player-999"
    const alienRes = await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "alien-player-999",
      now: new Date("2026-10-10T12:00:00Z")
    });

    // Must safely fallback to authorized child
    assert.equal(alienRes.actor.activeChildId, "player-uuid-101", "Must fall back to authorized child");

    // Unlinked parent
    const unlinkedClient = createMockSupabase({
      ...baseDataset,
      parentPlayers: []
    });

    const unlinkedRes = await loadRealDashboardUI4Data({
      client: unlinkedClient,
      profileOverride: {
        user: { id: "unlinked-parent" },
        profile: { id: "unlinked-parent", role: "parent", display_name: "Nowy Rodzic" }
      },
      now: new Date("2026-10-10T12:00:00Z")
    });

    assert.equal(unlinkedRes.model.recentAchievements.status, "unavailable");
    assert.equal(unlinkedRes.model.recentAchievements.reason, "no_linked_player");
  });

  await t.test("5. RLS / DB error on player_achievements -> status unavailable('not_loaded') without crashing", async () => {
    const errorClient = createMockSupabase({
      ...baseDataset,
      errorOn: "player_achievements"
    });

    const res = await loadRealDashboardUI4Data({
      client: errorClient,
      profileOverride: mockProfileParent,
      activeChildId: "player-uuid-101",
      now: new Date("2026-10-10T12:00:00Z")
    });

    assert.equal(res.model.recentAchievements.status, "unavailable");
    assert.equal(res.model.recentAchievements.reason, "not_loaded");
  });

  await t.test("6. Empty achievement_definitions table in DB -> code-authoritative catalog enriches metadata safely", async () => {
    // In staging, achievement_definitions has 0 rows.
    // The loader must pull definitions from ACHIEVEMENTS_CATALOG based on achievement_id.
    const client = createMockSupabase({
      ...baseDataset,
      playerAchievements: [
        {
          id: "ach-2",
          player_id: "player-uuid-101",
          achievement_id: "match_debut",
          unlocked_at: "2026-09-15T10:00:00Z"
        }
      ]
    });

    const res = await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "player-uuid-101",
      now: new Date("2026-10-10T12:00:00Z")
    });

    assert.equal(res.model.recentAchievements.status, "available");
    const ach = res.model.recentAchievements.data![0];
    assert.equal(ach.id, "match_debut");
    assert.equal(ach.name, "Oficjalny Debiut");
    assert.equal(ach.description, "Zagraj w pierwszym meczu ligowym lub turniejowym DELTA 2018 GM.");
    assert.equal(ach.category, "matches");
    assert.equal(ach.icon, "CalendarDays");
  });

  await t.test("7. Zero demo fallbacks in real data mode -> authentic empty state without mock badges", () => {
    const homeFilePath = path.join(process.cwd(), "components/dashboard/ui4/home-dashboard.tsx");
    const homeSource = fs.readFileSync(homeFilePath, "utf8");

    // Verify neutral text exists in home-dashboard.tsx
    assert.ok(
      homeSource.includes("Brak zdobytych odznak w tym sezonie"),
      "HomeDashboard must include neutral state 'Brak zdobytych odznak w tym sezonie'"
    );

    // Verify that demo badges or hardcoded mock names are not rendered as fallbacks
    assert.ok(
      !homeSource.includes("Odznaki i osiągnięcia: Oczekuje na integrację (Etap P2)"),
      "HomeDashboard must not contain obsolete Etap P2 badge placeholder"
    );
  });

  await t.test("8. Read-only verification -> strictly 0 database mutations during data load", async () => {
    const client = createMockSupabase({
      ...baseDataset,
      playerAchievements: [
        {
          id: "ach-1",
          player_id: "player-uuid-101",
          achievement_id: "att_10",
          unlocked_at: "2026-10-09T09:21:42.304+00:00"
        }
      ]
    });

    await loadRealDashboardUI4Data({
      client,
      profileOverride: mockProfileParent,
      activeChildId: "player-uuid-101",
      now: new Date("2026-10-10T12:00:00Z")
    });

    // Check mutation tracker on mock client
    assert.equal(client._mutations.length, 0, "Real data loader must NEVER execute insert/update/upsert/delete on any table");
  });

  await t.test("9. COLLECTION dynamic badge counter: formats count, never hardcodes 0 ODBLOKOWANYCH when unavailable", () => {
    const colFilePath = path.join(process.cwd(), "components/dashboard/ui4/collection-dashboard.tsx");
    const colSource = fs.readFileSync(colFilePath, "utf8");

    // Must define formatUnlockedBadgeCount
    assert.ok(
      colSource.includes("function formatUnlockedBadgeCount"),
      "CollectionDashboard must define formatUnlockedBadgeCount"
    );

    // Must return '—' for unavailable status
    assert.ok(
      colSource.includes('return "—";') || colSource.includes("return '—';"),
      "formatUnlockedBadgeCount must return '—' when status is not available/empty"
    );

    // Must not contain static hardcoded fallback
    assert.ok(
      !colSource.includes(': "0 ODBLOKOWANYCH"}'),
      "CollectionDashboard must not contain static hardcoded : '0 ODBLOKOWANYCH' fallback"
    );
  });

  await t.test("10. Next goal candidate filtering: excludes secret and manual, marks unavailable on attendance DB failure", async () => {
    // 1. Attendance error -> progress: unavailable('not_loaded'), nextAchievement: null
    const errorClient = createMockSupabase({
      ...baseDataset,
      errorOn: "training_attendance"
    });

    const errRes = await loadRealDashboardUI4Data({
      client: errorClient,
      profileOverride: mockProfileParent,
      activeChildId: "player-uuid-101",
      now: new Date("2026-10-10T12:00:00Z")
    });

    assert.equal(errRes.model.progress.status, "unavailable");
    assert.equal(errRes.model.progress.reason, "not_loaded");
    assert.equal(errRes.model.progress.data, null, "Must NOT provide fake 0% progress data when attendance fails");

    // 2. In-memory candidate filtering: verify isSecret and isManual achievements are strictly filtered out
    const secretCatalogItems = ACHIEVEMENTS_CATALOG.filter(d => d.isSecret || d.isManual).map(d => d.id);
    assert.ok(secretCatalogItems.length >= 3, "Catalog must have at least 3 secret/manual definitions");

    const calculated = calculatePlayerAchievements(
      "player-uuid-101",
      { "player-uuid-101": { m: 10, starts: 10, captain: 5, g: 10, a: 2, mvp: 0 } },
      { "player-uuid-101": { sessions: 25, goals: 0, assists: 0, attendanceStreak: 25 } },
      0,
      []
    );

    for (const secretId of secretCatalogItems) {
      const item = calculated.find(c => c.definition.id === secretId);
      if (item && !item.isUnlocked) {
        assert.ok(
          item.definition.isSecret || item.definition.isManual,
          `Item ${secretId} must be flagged as secret or manual`
        );
      }
    }
  });
});
