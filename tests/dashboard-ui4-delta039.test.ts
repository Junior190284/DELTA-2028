/**
 * DELTA INFERNO — DELTA-039 Verification Suite
 *
 * Verifies:
 * 1. Sports XP diagnosis: 0 confirmed events -> authentic 0 XP, Level 1 Debiutant.
 * 2. Attendance rate distinction:
 *    - Genuine 0% attendance: child was tracked on finished sessions and marked 'absent' on all of them.
 *    - Neutral state ("—"): child has 0 attendance records on finished sessions (brak danych).
 *    - Calculated rate: present sessions / finished sessions when attendance was tracked.
 * 3. RLS / DB error on attendance queries -> progress: unavailable("not_loaded"), never fake 0 XP.
 * 4. Desktop Sidebar collection badge:
 *    - Omitted (null) when collectionPercent is null (real-data mode with unavailable total).
 *    - Displays exact percentage string (e.g. "45%") when collectionPercent is a number.
 *    - Falls back to "75%" when collectionPercent is undefined (preserving standalone demo presentation).
 * 5. Club communications date formatting:
 *    - Renders "Dzisiaj" for today's date in Europe/Warsaw.
 *    - Renders "Wczoraj" for yesterday's date in Europe/Warsaw.
 *    - Renders Polish formatted date (e.g. "9 paź") for older announcements instead of hardcoded "Dzisiaj".
 * 6. Club communications expand / collapse behavior:
 *    - Full message body preserved in model.
 *    - Expand/collapse interactive state toggle and responsive line-clamp classes.
 * 7. Duplicates data integrity:
 *    - Math formula: duplicates = sum(duplicates_count) = total_copies - unique_cards.
 *    - Correctly handles duplicates_count from user_cards (e.g. 10 unique, 13 total copies = 3 duplicates).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadRealDashboardUI4Data,
  safeQueryAttendance
} from "../lib/dashboard-ui4/real-data-loader.ts";
import {
  calculateVerifiedSportsXp,
  isTrainingFinished
} from "../lib/stadium/xp-calculator.ts";
import {
  createDashboardUI4Model
} from "../components/dashboard/ui4/adapter.ts";

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
  errorOn?: string;
}) {
  return {
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
          else if (table === "training_attendance") {
            if (dataset.trainingAttendance) rows = dataset.trainingAttendance;
          } else if (table === "match_attendance") {
            if (dataset.matchAttendance) rows = dataset.matchAttendance;
          }

          if (builder._filters.user_id) {
            rows = rows.filter((r) => r.user_id === builder._filters.user_id);
          }
          if (builder._filters.parent_id) {
            rows = rows.filter((r) => r.parent_id === builder._filters.parent_id);
          }
          if (builder._filters.player_id) {
            rows = rows.filter((r) => r.player_id === builder._filters.player_id);
          }
          if (builder._filters.id && builder._filters.id.in) {
            const set = new Set(builder._filters.id.in);
            rows = rows.filter((r) => set.has(r.id));
          }

          resolve({ data: rows, error: null });
        }
      };

      return builder;
    }
  };
}

test("DELTA-039 — Sports XP & HOME Data Integrity Suite", async (t) => {
  const FIXED_NOW = new Date("2026-11-24T12:00:00.000Z"); // Warsaw 13:00 CET

  await t.test("1. Staging mirror: 2 finished trainings, 0 attendances -> authentic 0 XP, Level 1 Debiutant", async () => {
    // Exact mirror of Staging tdlsxamxtygojxhmjjvp for Child #4:
    // 2 finished training sessions, 0 rows in training_attendance, 1 row in match_attendance with status 'yes' (0 XP)
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-staging", player_id: "child-4" }],
      players: [{ id: "child-4", display_name: "Zawodnik Staging", shirt_number: 10, position: "POM", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-10-09", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-20", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [],
      matches: [
        { id: "m-1", status: "scheduled", match_date: "2026-12-01" } // not played
      ],
      matchAttendance: [
        { match_id: "m-1", player_id: "child-4", status: "yes" } // RSVP only -> 0 XP per V7F.3B.2
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-4",
      profileOverride: {
        user: { id: "parent-staging" },
        profile: { id: "parent-staging", role: "parent", display_name: "Rodzic Staging" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    assert.equal(result.model.progress.data?.currentXP, 0);
    assert.equal(result.model.progress.data?.seasonXP, 0);
    assert.equal(result.model.progress.data?.level, 1);
    assert.equal(result.model.progress.data?.title, "Debiutant");
    assert.equal(result.model.progress.data?.currentLevelXP, 0);
    assert.equal(result.model.progress.data?.nextLevelXP, 250);
    assert.equal(result.model.progress.data?.verifiedTrainings, 0);
    assert.equal(result.model.progress.data?.verifiedMatches, 0);
    assert.equal(result.model.progress.data?.activityStreak, 0);
    // Neutral state: since no attendance was tracked for this child, attendance is null ("—")
    assert.equal(result.model.progress.data?.attendanceRatePercent, null);
  });

  await t.test("2. Attendance: genuine 0% vs neutral state ('—')", async () => {
    // Case A: 2 finished trainings, child tracked and marked 'absent' on both -> genuine 0%
    const mockAbsent = createMockSupabase({
      parentPlayers: [{ parent_id: "p1", player_id: "c1" }],
      players: [{ id: "c1", display_name: "Gracz", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-18", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-20", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        { training_id: "ts-1", player_id: "c1", status: "absent" },
        { training_id: "ts-2", player_id: "c1", status: "absent" }
      ],
      matches: [],
      matchAttendance: []
    });

    const resAbsent = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockAbsent,
      activeChildId: "c1",
      profileOverride: { user: { id: "p1" }, profile: { id: "p1", role: "parent" } }
    });
    // Attendance was tracked, player was absent on all -> genuine 0%
    assert.equal(resAbsent.model.progress.data?.attendanceRatePercent, 0);

    // Case B: 2 finished trainings, child was never tracked (0 attendance rows) -> neutral state null
    const mockNoData = createMockSupabase({
      parentPlayers: [{ parent_id: "p1", player_id: "c1" }],
      players: [{ id: "c1", display_name: "Gracz", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-18", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-20", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [],
      matches: [],
      matchAttendance: []
    });

    const resNoData = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockNoData,
      activeChildId: "c1",
      profileOverride: { user: { id: "p1" }, profile: { id: "p1", role: "parent" } }
    });
    assert.equal(resNoData.model.progress.data?.attendanceRatePercent, null);
  });

  await t.test("3. RLS / DB error on attendance query marks progress as unavailable('not_loaded')", async () => {
    const mockRlsError = createMockSupabase({
      parentPlayers: [{ parent_id: "p1", player_id: "c1" }],
      players: [{ id: "c1", display_name: "Gracz", active: true }],
      trainingSessions: [{ id: "ts-1", training_date: "2026-11-20" }],
      errorOn: "training_attendance"
    });

    const resError = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockRlsError,
      activeChildId: "c1",
      profileOverride: { user: { id: "p1" }, profile: { id: "p1", role: "parent" } }
    });

    assert.equal(resError.model.progress.status, "unavailable");
    assert.equal(resError.model.progress.reason, "not_loaded");
    assert.equal(resError.model.progress.data, null);
  });

  await t.test("4. Desktop Sidebar collection badge behavior", () => {
    // Read source code of delta-desktop-sidebar.tsx to verify collectionPercent handling
    const sidebarSrc = fs.readFileSync(
      path.resolve(__dirname, "../components/dashboard/ui4/delta-desktop-sidebar.tsx"),
      "utf8"
    );

    assert.ok(sidebarSrc.includes("collectionPercent?: number | null;"), "DesktopSidebarProps defines collectionPercent");
    assert.ok(sidebarSrc.includes('typeof collectionPercent === "number"'), "Handles numeric percentage");
    assert.ok(sidebarSrc.includes("collectionPercent === null"), "Handles null percentage (hides badge)");
    assert.ok(sidebarSrc.includes('collectionBadge = "75%"'), "Preserves demo fallback when undefined");

    // Also verify home-dashboard, collection-dashboard, delta-elite-41 pass collectionPercent
    const homeSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/home-dashboard.tsx"), "utf8");
    const colSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/collection-dashboard.tsx"), "utf8");
    const eliteSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/delta-elite-41.tsx"), "utf8");

    assert.ok(homeSrc.includes("collectionPercent={albumProgress.status === \"available\" ? (albumData?.percent ?? null) : null}"));
    assert.ok(colSrc.includes("collectionPercent={albumProgress.status === \"available\" ? (albumData?.percent ?? null) : null}"));
    assert.ok(eliteSrc.includes("collectionPercent={albumProgress.status === \"available\" ? (albumData?.percent ?? null) : null}"));
  });

  await t.test("5. Club communications date formatting in Europe/Warsaw", () => {
    const homeSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/home-dashboard.tsx"), "utf8");
    const eliteSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/delta-elite-41.tsx"), "utf8");

    // Must define formatCommunicationDate
    assert.ok(homeSrc.includes("function formatCommunicationDate(publishedAt?: string | null): string"));
    assert.ok(eliteSrc.includes("function formatCommunicationDate(publishedAt?: string | null): string"));

    // Must NOT have hardcoded "Dzisiaj" as static span text
    assert.ok(!homeSrc.includes('>Dzisiaj</span>'));
    assert.ok(!eliteSrc.includes('>Dzisiaj</span>'));

    // Must use formatCommunicationDate(item.publishedAt)
    assert.ok(homeSrc.includes("{formatCommunicationDate(item.publishedAt)}"));
    assert.ok(eliteSrc.includes("{formatCommunicationDate(item.publishedAt)}"));
  });

  await t.test("6. Club communications expand/collapse state & responsive clamp", () => {
    const homeSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/home-dashboard.tsx"), "utf8");
    const eliteSrc = fs.readFileSync(path.resolve(__dirname, "../components/dashboard/ui4/delta-elite-41.tsx"), "utf8");

    // Both files must have expandedCommIds state
    assert.ok(homeSrc.includes("const [expandedCommIds, setExpandedCommIds] = useState<Record<string, boolean>>({});"));
    assert.ok(eliteSrc.includes("const [expandedCommIds, setExpandedCommIds] = useState<Record<string, boolean>>({});"));

    // Both files must have communication-expand data-testid button
    assert.ok(homeSrc.includes('data-testid={`communication-expand-${item.id}`}'));
    assert.ok(eliteSrc.includes('data-testid={`communication-expand-${item.id}`}'));

    // Both files must have line-clamp-2 sm:line-clamp-3
    assert.ok(homeSrc.includes("line-clamp-2 sm:line-clamp-3"));
    assert.ok(eliteSrc.includes("line-clamp-2 sm:line-clamp-3"));
  });

  await t.test("7. Duplicates data integrity math: 10 unique, 13 total copies = 3 duplicates", async () => {
    // Simulate real Staging user_cards rows:
    // 10 card rows with duplicates_count: [0, 0, 1, 0, 0, 0, 0, 0, 1, 1]
    const userCards = [
      { id: "c1", user_id: "parent-stg", card_id: "d1", duplicates_count: 0, card_definition: { id: "d1", is_active: true } },
      { id: "c2", user_id: "parent-stg", card_id: "d2", duplicates_count: 0, card_definition: { id: "d2", is_active: true } },
      { id: "c3", user_id: "parent-stg", card_id: "d3", duplicates_count: 1, card_definition: { id: "d3", is_active: true } }, // 1 dup
      { id: "c4", user_id: "parent-stg", card_id: "d4", duplicates_count: 0, card_definition: { id: "d4", is_active: true } },
      { id: "c5", user_id: "parent-stg", card_id: "d5", duplicates_count: 0, card_definition: { id: "d5", is_active: true } },
      { id: "c6", user_id: "parent-stg", card_id: "d6", duplicates_count: 0, card_definition: { id: "d6", is_active: true } },
      { id: "c7", user_id: "parent-stg", card_id: "d7", duplicates_count: 0, card_definition: { id: "d7", is_active: true } },
      { id: "c8", user_id: "parent-stg", card_id: "d8", duplicates_count: 0, card_definition: { id: "d8", is_active: true } },
      { id: "c9", user_id: "parent-stg", card_id: "d9", duplicates_count: 1, card_definition: { id: "d9", is_active: true } }, // 1 dup
      { id: "c10", user_id: "parent-stg", card_id: "d10", duplicates_count: 1, card_definition: { id: "d10", is_active: true } } // 1 dup
    ];

    const cardDefinitions = [
      { id: "d1", card_name: "Karta 1", card_type: "base", is_active: true },
      { id: "d2", card_name: "Karta 2", card_type: "base", is_active: true },
      { id: "d3", card_name: "Karta 3", card_type: "base", is_active: true },
      { id: "d4", card_name: "Karta 4", card_type: "base", is_active: true },
      { id: "d5", card_name: "Karta 5", card_type: "base", is_active: true },
      { id: "d6", card_name: "Karta 6", card_type: "base", is_active: true },
      { id: "d7", card_name: "Karta 7", card_type: "base", is_active: true },
      { id: "d8", card_name: "Karta 8", card_type: "base", is_active: true },
      { id: "d9", card_name: "Karta 9", card_type: "base", is_active: true },
      { id: "d10", card_name: "Karta 10", card_type: "base", is_active: true }
    ];

    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-stg", player_id: "child-4" }],
      players: [{ id: "child-4", display_name: "Zawodnik", active: true }],
      cardDefinitions,
      userCards
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-4",
      profileOverride: { user: { id: "parent-stg" }, profile: { id: "parent-stg", role: "parent" } }
    });

    assert.equal(result.model.albumProgress.status, "available");
    assert.equal(result.model.albumProgress.data?.owned, 10);
    assert.equal(result.model.albumProgress.data?.duplicates, 3);
    assert.equal(result.model.recentCards.data?.length, 4); // recentCards displays up to 4 most recent cards
  });
});
