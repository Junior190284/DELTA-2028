/**
 * DELTA INFERNO — DELTA-038 Real Sports XP & Attendance HOME Integration Suite
 *
 * Verifies:
 * 1. 0 confirmed events -> 0 XP, level 1, 0% to next level, Stadium Tier 0 ("PIASKOWNICA").
 * 2. Confirmed finished trainings -> exact multiple of +40 XP per session.
 * 3. Confirmed played matches -> exact multiple of +60 XP per match.
 * 4. Combined progression & stadium tier unlocking (level = 1 + floor(XP/250)).
 * 5. RSVP 'yes'/'maybe'/'undecided'/'absent' without coach confirmation -> 0 XP.
 * 6. Future trainings with premature 'present' status -> 0 XP (unit not finished).
 * 7. Deduplication of attendance rows -> exactly 1 reward per unique event.
 * 8. Status update from present to absent -> deterministic XP reduction.
 * 9. Sibling switching (Child A vs Child B):
 *    - Updates passport (XP, level, progress bar, attendance rate, stadium progression)
 *    - Completely preserves family collection, cards, unopened packs, and DP wallet.
 * 10. Attempt to access unauthorized / alien child data -> safe fallback, zero data leakage.
 * 11. Database fetch error on attendance -> progress: unavailable("not_loaded"), never fake 0 XP.
 * 12. Unlinked parent account -> progress: unavailable("no_linked_player").
 * 13. Seasonal attendance calculation:
 *     - Finished trainings denominator > 0 -> exact percentage
 *     - Denominator = 0 -> null (neutral state, rendered as "—")
 *     - Verified present = 0 -> 0%
 * 14. UI Component rendering check: HomeDashboard renders dynamic attendance without hardcoded 94%.
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

/**
 * Creates an in-memory mock Supabase client adhering to the PostgREST query builder pattern.
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
            else {
              resolve({ data: null, error: new Error(`Table ${table} not loaded`) });
              return;
            }
          } else if (table === "match_attendance") {
            if (dataset.matchAttendance) rows = dataset.matchAttendance;
            else {
              resolve({ data: null, error: new Error(`Table ${table} not loaded`) });
              return;
            }
          } else {
            resolve({ data: null, error: new Error(`Table ${table} not found`) });
            return;
          }

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

test("DELTA-038 — Real Sports XP & Attendance HOME Integration Suite", async (t) => {
  const FIXED_NOW = new Date("2026-11-24T12:00:00.000Z"); // Warsaw 13:00 CET

  await t.test("1. 0 confirmed events -> 0 XP, level 1, 0% to next level, stadium tier Debiutant", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-20", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [],
      matches: [
        { id: "m-1", status: "played", match_date: "2026-11-21" }
      ],
      matchAttendance: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    assert.ok(result.model.progress.data);
    assert.equal(result.model.progress.data?.currentXP, 0);
    assert.equal(result.model.progress.data?.seasonXP, 0);
    assert.equal(result.model.progress.data?.level, 1);
    assert.equal(result.model.progress.data?.currentLevelXP, 0);
    assert.equal(result.model.progress.data?.nextLevelXP, 250);
    assert.equal(result.model.progress.data?.progressPercent, 0);
    assert.equal(result.model.progress.data?.title, "Debiutant");
    assert.equal(result.model.progress.data?.verifiedTrainings, 0);
    assert.equal(result.model.progress.data?.verifiedMatches, 0);
    // 1 finished training, 0 attended -> 0% attendance
    assert.equal(result.model.progress.data?.attendanceRatePercent, 0);
  });

  await t.test("2. Confirmed finished trainings -> exact multiple of +40 XP per session", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-18", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-20", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-3", training_date: "2026-11-22", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        { training_id: "ts-1", player_id: "child-1", status: "present" },
        { training_id: "ts-2", player_id: "child-1", status: "present" },
        { training_id: "ts-3", player_id: "child-1", status: "present" }
      ],
      matches: [],
      matchAttendance: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    assert.equal(result.model.progress.data?.currentXP, 120); // 3 * 40 XP
    assert.equal(result.model.progress.data?.level, 1);
    assert.equal(result.model.progress.data?.currentLevelXP, 120);
    assert.equal(result.model.progress.data?.nextLevelXP, 250);
    assert.equal(result.model.progress.data?.progressPercent, 48); // Math.round(120 / 250 * 100) = 48%
    assert.equal(result.model.progress.data?.verifiedTrainings, 3);
    assert.equal(result.model.progress.data?.verifiedMatches, 0);
    assert.equal(result.model.progress.data?.attendanceRatePercent, 100); // 3/3 = 100%
  });

  await t.test("3. Confirmed played matches -> exact multiple of +60 XP per match", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [],
      trainingAttendance: [],
      matches: [
        { id: "m-1", status: "played", match_date: "2026-11-15" },
        { id: "m-2", status: "played", match_date: "2026-11-22" }
      ],
      matchAttendance: [
        { match_id: "m-1", player_id: "child-1", status: "present" },
        { match_id: "m-2", player_id: "child-1", status: "present" }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    assert.equal(result.model.progress.data?.currentXP, 120); // 2 * 60 XP
    assert.equal(result.model.progress.data?.verifiedMatches, 2);
    assert.equal(result.model.progress.data?.verifiedTrainings, 0);
    // Denominator of finished trainings is 0 -> attendanceRatePercent is null
    assert.equal(result.model.progress.data?.attendanceRatePercent, null);
  });

  await t.test("4. Combined progression & stadium tier unlocking (5 trainings + 2 matches = 320 XP -> Level 2, BOISKO OSIEDLOWE)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-10", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-12", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-3", training_date: "2026-11-15", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-4", training_date: "2026-11-17", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-5", training_date: "2026-11-19", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        { training_id: "ts-1", player_id: "child-1", status: "present" },
        { training_id: "ts-2", player_id: "child-1", status: "present" },
        { training_id: "ts-3", player_id: "child-1", status: "present" },
        { training_id: "ts-4", player_id: "child-1", status: "present" },
        { training_id: "ts-5", player_id: "child-1", status: "present" }
      ],
      matches: [
        { id: "m-1", status: "played", match_date: "2026-11-14" },
        { id: "m-2", status: "played", match_date: "2026-11-21" }
      ],
      matchAttendance: [
        { match_id: "m-1", player_id: "child-1", status: "present" },
        { match_id: "m-2", player_id: "child-1", status: "present" }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    // 5 * 40 + 2 * 60 = 200 + 120 = 320 XP
    assert.equal(result.model.progress.data?.currentXP, 320);
    // Level: 1 + floor(320 / 250) = 2
    assert.equal(result.model.progress.data?.level, 2);
    // Current level XP: 320 % 250 = 70
    assert.equal(result.model.progress.data?.currentLevelXP, 70);
    assert.equal(result.model.progress.data?.nextLevelXP, 250);
    // Progress percent: Math.round(70 / 250 * 100) = 28%
    assert.equal(result.model.progress.data?.progressPercent, 28);
    // Stadium Tier 0 (0-399 XP) -> Debiutant (Tier 1 is at 400 XP)
    assert.equal(result.model.progress.data?.title, "Debiutant");
    assert.equal(result.model.progress.data?.verifiedTrainings, 5);
    assert.equal(result.model.progress.data?.verifiedMatches, 2);
    assert.equal(result.model.progress.data?.attendanceRatePercent, 100);

    // Progression reaching 400 XP unlocks Stadium Tier 1: Młody Talent
    const tier1Result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: createMockSupabase({
        parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
        players: [{ id: "child-1", display_name: "Tymek", active: true }],
        trainingSessions: [
          { id: "ts-1", training_date: "2026-11-01", start_time: "17:00:00", end_time: "18:30:00" },
          { id: "ts-2", training_date: "2026-11-03", start_time: "17:00:00", end_time: "18:30:00" },
          { id: "ts-3", training_date: "2026-11-05", start_time: "17:00:00", end_time: "18:30:00" },
          { id: "ts-4", training_date: "2026-11-07", start_time: "17:00:00", end_time: "18:30:00" }
        ],
        trainingAttendance: [
          { training_id: "ts-1", player_id: "child-1", status: "present" },
          { training_id: "ts-2", player_id: "child-1", status: "present" },
          { training_id: "ts-3", player_id: "child-1", status: "present" },
          { training_id: "ts-4", player_id: "child-1", status: "present" }
        ],
        matches: [
          { id: "m-1", status: "played", match_date: "2026-11-02" },
          { id: "m-2", status: "played", match_date: "2026-11-04" },
          { id: "m-3", status: "played", match_date: "2026-11-06" },
          { id: "m-4", status: "played", match_date: "2026-11-08" }
        ],
        matchAttendance: [
          { match_id: "m-1", player_id: "child-1", status: "present" },
          { match_id: "m-2", player_id: "child-1", status: "present" },
          { match_id: "m-3", player_id: "child-1", status: "present" },
          { match_id: "m-4", player_id: "child-1", status: "present" }
        ]
      }),
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent" }
      }
    });

    // 4 * 40 + 4 * 60 = 160 + 240 = 400 XP -> Level 2, Stadium Tier 1: Młody Talent
    assert.equal(tier1Result.model.progress.data?.currentXP, 400);
    assert.equal(tier1Result.model.progress.data?.level, 2);
    assert.equal(tier1Result.model.progress.data?.title, "Młody Talent");
  });

  await t.test("5. RSVP 'yes'/'maybe'/'undecided'/'absent' without coach confirmation -> 0 XP", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-18", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-19", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-3", training_date: "2026-11-20", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-4", training_date: "2026-11-21", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        { training_id: "ts-1", player_id: "child-1", status: "yes" },
        { training_id: "ts-2", player_id: "child-1", status: "maybe" },
        { training_id: "ts-3", player_id: "child-1", status: "undecided" },
        { training_id: "ts-4", player_id: "child-1", status: "absent" }
      ],
      matches: [
        { id: "m-1", status: "played", match_date: "2026-11-15" },
        { id: "m-2", status: "scheduled", match_date: "2026-11-20" }
      ],
      matchAttendance: [
        { match_id: "m-1", player_id: "child-1", status: "yes" }, // Unverified match RSVP -> 0 XP
        { match_id: "m-2", player_id: "child-1", status: "present" } // Match not played -> 0 XP
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    assert.equal(result.model.progress.data?.currentXP, 0);
    assert.equal(result.model.progress.data?.verifiedTrainings, 0);
    assert.equal(result.model.progress.data?.verifiedMatches, 0);
  });

  await t.test("6. Future trainings with premature 'present' status -> 0 XP (unit not finished)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [
        // Future training tomorrow
        { id: "ts-future", training_date: "2026-11-25", start_time: "17:00:00", end_time: "18:30:00" },
        // Training today but start time is in the future (18:00 Warsaw, ref date is 13:00 Warsaw)
        { id: "ts-today-future", training_date: "2026-11-24", start_time: "18:00:00", end_time: "19:30:00" }
      ],
      trainingAttendance: [
        { training_id: "ts-future", player_id: "child-1", status: "present" },
        { training_id: "ts-today-future", player_id: "child-1", status: "present" }
      ],
      matches: [],
      matchAttendance: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW, // 2026-11-24 13:00 Warsaw
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    assert.equal(result.model.progress.data?.currentXP, 0);
    assert.equal(result.model.progress.data?.verifiedTrainings, 0);
    // Denominator of finished trainings is 0 -> attendanceRatePercent is null
    assert.equal(result.model.progress.data?.attendanceRatePercent, null);
  });

  await t.test("7. Deduplication of attendance rows -> exactly 1 reward per unique event", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, position: "NAP", active: true }],
      trainingSessions: [
        { id: "ts-dup", training_date: "2026-11-18", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        // Duplicate attendance rows for the same session
        { training_id: "ts-dup", player_id: "child-1", status: "present" },
        { training_id: "ts-dup", player_id: "child-1", status: "present" },
        { training_id: "ts-dup", player_id: "child-1", status: "present" }
      ],
      matches: [
        { id: "m-dup", status: "played", match_date: "2026-11-15" }
      ],
      matchAttendance: [
        // Duplicate attendance rows for the same match
        { match_id: "m-dup", player_id: "child-1", status: "present" },
        { match_id: "m-dup", player_id: "child-1", status: "present" }
      ]
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun Testowy" }
      }
    });

    assert.equal(result.model.progress.status, "available");
    // 1 training (40 XP) + 1 match (60 XP) = exactly 100 XP, never 240 XP
    assert.equal(result.model.progress.data?.currentXP, 100);
    assert.equal(result.model.progress.data?.verifiedTrainings, 1);
    assert.equal(result.model.progress.data?.verifiedMatches, 1);
  });

  await t.test("8. Status update from present to absent -> deterministic XP reduction", async () => {
    const session = { id: "ts-1", training_date: "2026-11-18", start_time: "17:00:00", end_time: "18:30:00" };

    const xpPresent = calculateVerifiedSportsXp("child-1", {
      trainingSessions: [session],
      trainingAttendance: [{ training_id: "ts-1", player_id: "child-1", status: "present" }],
      referenceDate: FIXED_NOW
    });

    const xpAbsent = calculateVerifiedSportsXp("child-1", {
      trainingSessions: [session],
      trainingAttendance: [{ training_id: "ts-1", player_id: "child-1", status: "absent" }],
      referenceDate: FIXED_NOW
    });

    assert.equal(xpPresent.sportsXp, 40);
    assert.equal(xpAbsent.sportsXp, 0);
  });

  await t.test("9. Sibling switching (Child A vs Child B): updates passport, preserves family collection", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [
        { parent_id: "parent-fam", player_id: "child-alpha" },
        { parent_id: "parent-fam", player_id: "child-beta" }
      ],
      players: [
        { id: "child-alpha", display_name: "Jaś", shirt_number: 7, position: "POM", active: true },
        { id: "child-beta", display_name: "Staś", shirt_number: 10, position: "NAP", active: true }
      ],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-10", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-2", training_date: "2026-11-12", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-3", training_date: "2026-11-15", start_time: "17:00:00", end_time: "18:30:00" },
        { id: "ts-4", training_date: "2026-11-17", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        // Jaś attended 1 training (ts-1) -> 40 XP
        { training_id: "ts-1", player_id: "child-alpha", status: "present" },
        // Staś attended 3 trainings (ts-1, ts-2, ts-3) -> 120 XP
        { training_id: "ts-1", player_id: "child-beta", status: "present" },
        { training_id: "ts-2", player_id: "child-beta", status: "present" },
        { training_id: "ts-3", player_id: "child-beta", status: "present" }
      ],
      matches: [
        { id: "m-1", status: "played", match_date: "2026-11-14" }
      ],
      matchAttendance: [
        // Only Staś played match m-1 -> +60 XP
        { match_id: "m-1", player_id: "child-beta", status: "present" }
      ],
      cardDefinitions: [
        { id: "def-1", card_name: "Karta Alfa", card_type: "base", rarity: "common", is_active: true },
        { id: "def-2", card_name: "Karta Beta", card_type: "inferno", rarity: "legendary", is_active: true }
      ],
      userCards: [
        { id: "uc-1", user_id: "parent-fam", card_id: "def-1", duplicates_count: 0, acquired_at: "2026-11-01", card_definition: { id: "def-1", card_name: "Karta Alfa", rarity: "common", card_type: "base" } },
        { id: "uc-2", user_id: "parent-fam", card_id: "def-2", duplicates_count: 1, acquired_at: "2026-11-05", card_definition: { id: "def-2", card_name: "Karta Beta", rarity: "legendary", card_type: "inferno" } }
      ],
      unopenedPacks: [
        { id: "pack-1", user_id: "parent-fam", pack_type_id: "booster_gold", is_opened: false }
      ]
    });

    // Request for Child A (Jaś)
    const resA = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-alpha",
      profileOverride: {
        user: { id: "parent-fam" },
        profile: { id: "parent-fam", role: "parent", display_name: "Opiekun Rodzinny" }
      }
    });

    // Request for Child B (Staś)
    const resB = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-beta",
      profileOverride: {
        user: { id: "parent-fam" },
        profile: { id: "parent-fam", role: "parent", display_name: "Opiekun Rodzinny" }
      }
    });

    // Sports Passport is isolated per child:
    assert.equal(resA.actor.activeChildId, "child-alpha");
    assert.equal(resA.model.profile.player.data?.displayName, "Jaś");
    assert.equal(resA.model.progress.data?.currentXP, 40); // 1 training = 40 XP
    assert.equal(resA.model.progress.data?.verifiedTrainings, 1);
    assert.equal(resA.model.progress.data?.verifiedMatches, 0);
    assert.equal(resA.model.progress.data?.attendanceRatePercent, 25); // 1/4 = 25%

    assert.equal(resB.actor.activeChildId, "child-beta");
    assert.equal(resB.model.profile.player.data?.displayName, "Staś");
    assert.equal(resB.model.progress.data?.currentXP, 180); // 3 trainings (120) + 1 match (60) = 180 XP
    assert.equal(resB.model.progress.data?.verifiedTrainings, 3);
    assert.equal(resB.model.progress.data?.verifiedMatches, 1);
    assert.equal(resB.model.progress.data?.attendanceRatePercent, 75); // 3/4 = 75%

    // Family collection is identical for both:
    assert.equal(resA.model.albumProgress.data?.owned, 2);
    assert.equal(resB.model.albumProgress.data?.owned, 2);
    assert.equal(resA.model.albumProgress.data?.duplicates, 1);
    assert.equal(resB.model.albumProgress.data?.duplicates, 1);
    assert.equal(resA.model.albumProgress.data?.unopenedPacks, 1);
    assert.equal(resB.model.albumProgress.data?.unopenedPacks, 1);
    assert.equal(resA.model.recentCards.data?.length, 2);
    assert.equal(resB.model.recentCards.data?.length, 2);
  });

  await t.test("10. Attempt to access unauthorized child data -> safe fallback, zero leakage", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [
        { parent_id: "parent-auth", player_id: "child-own" }
      ],
      players: [
        { id: "child-own", display_name: "Moje Dziecko", shirt_number: 5, active: true },
        { id: "child-alien", display_name: "Obce Dziecko", shirt_number: 99, active: true }
      ],
      trainingSessions: [
        { id: "ts-1", training_date: "2026-11-10", start_time: "17:00:00", end_time: "18:30:00" }
      ],
      trainingAttendance: [
        { training_id: "ts-1", player_id: "child-own", status: "present" },
        { training_id: "ts-1", player_id: "child-alien", status: "present" }
      ],
      matches: [],
      matchAttendance: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-alien", // Unauthorized child ID attempt
      profileOverride: {
        user: { id: "parent-auth" },
        profile: { id: "parent-auth", role: "parent", display_name: "Opiekun" }
      }
    });

    // Must safely fall back to authorized child
    assert.equal(result.actor.activeChildId, "child-own");
    assert.equal(result.model.profile.player.data?.displayName, "Moje Dziecko");
    assert.notEqual(result.model.profile.player.data?.displayName, "Obce Dziecko");
  });

  await t.test("11. Database fetch error on attendance -> progress: unavailable(not_loaded), never fake 0 XP", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [{ parent_id: "parent-1", player_id: "child-1" }],
      players: [{ id: "child-1", display_name: "Tymek", shirt_number: 9, active: true }],
      errorOn: "training_attendance" // Simulated database error
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      activeChildId: "child-1",
      profileOverride: {
        user: { id: "parent-1" },
        profile: { id: "parent-1", role: "parent", display_name: "Opiekun" }
      }
    });

    assert.equal(result.model.progress.status, "unavailable");
    assert.equal(result.model.progress.reason, "not_loaded");
    assert.equal(result.model.progress.data, null);
  });

  await t.test("12. Unlinked parent account -> progress: unavailable(no_linked_player)", async () => {
    const mockClient = createMockSupabase({
      parentPlayers: [], // No linked players
      players: []
    });

    const result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: mockClient,
      profileOverride: {
        user: { id: "parent-unlinked" },
        profile: { id: "parent-unlinked", role: "parent", display_name: "Opiekun Bez Dziecka" }
      }
    });

    assert.equal(result.model.progress.status, "unavailable");
    assert.equal(result.model.progress.reason, "no_linked_player");
    assert.equal(result.model.progress.data, null);
  });

  await t.test("13. Seasonal attendance calculation formula and edge cases", async () => {
    // Edge case 1: 0 finished trainings -> attendanceRatePercent is null
    const noTrainingsResult = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: createMockSupabase({
        parentPlayers: [{ parent_id: "p1", player_id: "c1" }],
        players: [{ id: "c1", display_name: "Gracz", active: true }],
        trainingSessions: [],
        trainingAttendance: [],
        matches: [],
        matchAttendance: []
      }),
      activeChildId: "c1",
      profileOverride: {
        user: { id: "p1" },
        profile: { id: "p1", role: "parent" }
      }
    });
    assert.equal(noTrainingsResult.model.progress.data?.attendanceRatePercent, null);

    // Edge case 2: 4 finished trainings, 1 attended -> 25%
    const rate25Result = await loadRealDashboardUI4Data({
      now: FIXED_NOW,
      client: createMockSupabase({
        parentPlayers: [{ parent_id: "p1", player_id: "c1" }],
        players: [{ id: "c1", display_name: "Gracz", active: true }],
        trainingSessions: [
          { id: "t1", training_date: "2026-11-10", start_time: "17:00:00", end_time: "18:30:00" },
          { id: "t2", training_date: "2026-11-12", start_time: "17:00:00", end_time: "18:30:00" },
          { id: "t3", training_date: "2026-11-14", start_time: "17:00:00", end_time: "18:30:00" },
          { id: "t4", training_date: "2026-11-16", start_time: "17:00:00", end_time: "18:30:00" }
        ],
        trainingAttendance: [
          { training_id: "t1", player_id: "c1", status: "present" }
        ],
        matches: [],
        matchAttendance: []
      }),
      activeChildId: "c1",
      profileOverride: {
        user: { id: "p1" },
        profile: { id: "p1", role: "parent" }
      }
    });
    assert.equal(rate25Result.model.progress.data?.attendanceRatePercent, 25);
  });

  await t.test("14. HomeDashboard & DeltaElite41 source code verification: dynamic attendance without hardcoded 94%", () => {
    const homePath = path.resolve(process.cwd(), "components/dashboard/ui4/home-dashboard.tsx");
    const elitePath = path.resolve(process.cwd(), "components/dashboard/ui4/delta-elite-41.tsx");

    const homeSrc = fs.readFileSync(homePath, "utf-8");
    const eliteSrc = fs.readFileSync(elitePath, "utf-8");

    // Must NOT have hardcoded '94%' in the frekwencja badge
    assert.ok(!homeSrc.includes('>94%<'), "HomeDashboard must not contain hardcoded 94%");
    assert.ok(!eliteSrc.includes('>94%<'), "DeltaElite41 must not contain hardcoded 94%");

    // Must reference dynamic attendanceRatePercent
    assert.ok(homeSrc.includes("attendanceRatePercent"), "HomeDashboard must render attendanceRatePercent");
    assert.ok(eliteSrc.includes("attendanceRatePercent"), "DeltaElite41 must render attendanceRatePercent");

    // Must have neutral fallback indicator '—'
    assert.ok(homeSrc.includes('"—"'), "HomeDashboard must include neutral state '—'");
    assert.ok(eliteSrc.includes('"—"'), "DeltaElite41 must include neutral state '—'");
  });
});
