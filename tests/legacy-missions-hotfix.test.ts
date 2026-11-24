import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/game/missions/route.ts";
import { NextRequest } from "next/server";

// In-memory mock database for Supabase
function createMockSupabase(initialTables: Record<string, any[]>, authUser: any = null) {
  const tables: Record<string, any[]> = {};
  for (const [k, v] of Object.entries(initialTables)) {
    tables[k] = JSON.parse(JSON.stringify(v));
  }

  return {
    tables,
    auth: {
      getUser: async () => ({
        data: { user: authUser },
        error: authUser ? null : new Error("No session")
      })
    },
    from: (tableName: string) => {
      if (!tables[tableName]) {
        tables[tableName] = [];
      }
      let currentData = tables[tableName];
      let pendingFilters: Array<(row: any) => boolean> = [];

      const queryBuilder: any = {
        select: () => queryBuilder,
        eq: (col: string, val: any) => {
          pendingFilters.push(row => row[col] === val);
          return queryBuilder;
        },
        order: () => queryBuilder,
        limit: () => queryBuilder,
        maybeSingle: async () => {
          let filtered = currentData;
          for (const f of pendingFilters) {
            filtered = filtered.filter(f);
          }
          return { data: filtered.length > 0 ? { ...filtered[0] } : null, error: null };
        },
        single: async () => {
          let filtered = currentData;
          for (const f of pendingFilters) {
            filtered = filtered.filter(f);
          }
          return {
            data: filtered.length > 0 ? { ...filtered[0] } : null,
            error: filtered.length > 0 ? null : new Error("Not found")
          };
        },
        update: (values: any) => {
          return {
            eq: (col: string, val: any) => {
              for (let i = 0; i < tables[tableName].length; i++) {
                if (tables[tableName][i][col] === val) {
                  tables[tableName][i] = { ...tables[tableName][i], ...values };
                }
              }
              return Promise.resolve({ data: null, error: null });
            }
          };
        },
        upsert: async (row: any) => {
          const idx = tables[tableName].findIndex(r => r.user_id === row.user_id && (r.mission_date ? r.mission_date === row.mission_date : true));
          if (idx >= 0) {
            tables[tableName][idx] = { ...tables[tableName][idx], ...row };
          } else {
            tables[tableName].push({ id: `gen-${Date.now()}`, ...row });
          }
          return { data: row, error: null };
        },
        insert: async (row: any) => {
          tables[tableName].push({ id: `log-${Date.now()}-${Math.random()}`, ...row });
          return { data: row, error: null };
        },
        then: (resolve: any) => {
          let filtered = currentData;
          for (const f of pendingFilters) {
            filtered = filtered.filter(f);
          }
          resolve({ data: filtered, error: null });
        }
      };

      return queryBuilder;
    }
  };
}

describe("DELTA-043SEC.1: Legacy Missions Safety & Atomicity Gate", () => {
  const aliceUser = { id: "user-alice", email: "alice@example.com" };
  const todayStr = new Date().toISOString().slice(0, 10);

  const getBaseDb = () => ({
    user_game_profile: [
      { user_id: "user-alice", current_xp: 100, season_xp: 100, current_level: 2 }
    ],
    reward_logs: [],
    user_daily_missions: [
      {
        id: "udm-alice-1",
        user_id: "user-alice",
        mission_date: todayStr,
        missions: [
          {
            id: `daily_spin_${todayStr}`,
            title: "Dzienny Spin",
            category: "DAILY",
            targetCount: 1,
            currentCount: 1,
            completed: true,
            claimed: false,
            xpReward: 35
          }
        ]
      }
    ],
    user_weekly_missions: []
  });

  // 1. Brak sesji -> 401
  test("1. Brak aktywnej sesji użytkownika zwraca HTTP 401 UNAUTHORIZED", async () => {
    const mockDb = createMockSupabase(getBaseDb(), null);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: `daily_spin_${todayStr}`, category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error, "Wymagane logowanie");
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // 2. IDOR: obcy użytkownik -> 403
  test("2. Próba manipulacji obcym userId (IDOR) zwraca HTTP 403 FORBIDDEN", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-bob", missionId: `daily_spin_${todayStr}`, category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error, "Brak uprawnień do konta innego użytkownika");
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // 3. Walidacja danych wejściowych -> 400
  test("3. Nieprawidłowe dane żądania (brak missionId lub category) zwraca HTTP 400", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error, "Nieprawidłowe dane żądania");
  });

  // 4. Bezpieczne zablokowanie mutacji legacy claim (brak atomowości w JSONB/reward_logs) -> 410
  test("4. Próba claimu zostaje bezpiecznie zablokowana (HTTP 410 GONE) bez mutacji XP", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: `daily_spin_${todayStr}`, category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 410);
    assert.equal(body.success, false);
    assert.equal(body.code, "LEGACY_CLAIM_DISABLED");
    assert.ok(body.error.includes("wyłączone ze względów bezpieczeństwa"));

    // Bezwzględny brak mutacji w bazie
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100, "XP nie może wzrosnąć");
    assert.equal(mockDb.tables.user_game_profile[0].season_xp, 100, "Season XP nie może wzrosnąć");
    assert.equal(mockDb.tables.reward_logs.length, 0, "Brak nowych wpisów w reward_logs");
  });

  // 5. Równoczesny claim: całkowita odporność na race conditions
  test("5. Równoczesne żądania nie mogą spowodować naliczenia XP ani wyścigu", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);

    const makeReq = () => {
      const r = new NextRequest("http://localhost:3000/api/game/missions", {
        method: "POST",
        body: JSON.stringify({ userId: "user-alice", missionId: `daily_spin_${todayStr}`, category: "DAILY" })
      });
      (r as any).supabaseClient = mockDb;
      return POST(r);
    };

    // Dwa równoległe żądania
    const [res1, res2] = await Promise.all([makeReq(), makeReq()]);
    assert.equal(res1.status, 410);
    assert.equal(res2.status, 410);

    // XP nadal niezmienione
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // 6. Odczyt GET dla zalogowanego użytkownika działa prawidłowo
  test("6. GET /api/game/missions dla zalogowanego użytkownika zwraca misje bez mutacji", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions?userId=user-alice");
    (req as any).supabaseClient = mockDb;

    const res = await GET(req);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.dailyMissions));
    assert.ok(Array.isArray(body.weeklyMissions));
  });

  // 7. Odczyt GET dla gościa (guest_user) nie zanieczyszcza bazy danych
  test("7. GET /api/game/missions dla gościa zwraca in-memory strukturę bez zapisu do bazy", async () => {
    const unauthDb = createMockSupabase({ user_daily_missions: [], user_weekly_missions: [] }, null);
    const req = new NextRequest("http://localhost:3000/api/game/missions?userId=guest_user");
    (req as any).supabaseClient = unauthDb;

    const res = await GET(req);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(unauthDb.tables.user_daily_missions.length, 0);
    assert.equal(unauthDb.tables.user_weekly_missions.length, 0);
  });
});
