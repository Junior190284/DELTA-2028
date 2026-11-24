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
        limit: (n: number) => {
          return queryBuilder;
        },
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

describe("DELTA-043SEC: Legacy Missions Security Hotfix", () => {
  const aliceUser = { id: "user-alice", email: "alice@example.com" };
  const bobUser = { id: "user-bob", email: "bob@example.com" };
  const todayStr = new Date().toISOString().slice(0, 10);

  const getBaseDb = () => ({
    user_game_profile: [
      { user_id: "user-alice", current_xp: 100, season_xp: 100, current_level: 2 }
    ],
    reward_logs: [],
    user_daily_spins: [
      { user_id: "user-alice", last_spin_at: `${todayStr}T10:00:00Z` }
    ],
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
            currentCount: 0,
            completed: false,
            claimed: false,
            xpReward: 35
          },
          {
            id: "m_battle_1",
            title: "Pojedynek 1v1",
            category: "DAILY",
            targetCount: 1,
            currentCount: 1,
            completed: true,
            claimed: false,
            xpReward: 50
          },
          {
            id: "m_uncompleted_1",
            title: "Nieukończony trening",
            category: "DAILY",
            targetCount: 5,
            currentCount: 1,
            completed: false,
            claimed: false,
            xpReward: 40
          },
          {
            id: "m_already_claimed",
            title: "Odebrany bonus",
            category: "DAILY",
            targetCount: 1,
            currentCount: 1,
            completed: true,
            claimed: true,
            xpReward: 50
          }
        ]
      }
    ],
    user_weekly_missions: []
  });

  // --------------------------------------------------------------------------
  // TEST 1: 401 bez sesji
  // --------------------------------------------------------------------------
  test("1. Brak aktywnej sesji użytkownika zwraca HTTP 401 UNAUTHORIZED", async () => {
    const mockDb = createMockSupabase(getBaseDb(), null);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "m_battle_1", category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error, "Wymagane logowanie");
    // Brak modyfikacji profilu
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 2: 403 dla obcego użytkownika (IDOR)
  // --------------------------------------------------------------------------
  test("2. Próba manipulacji obcym userId (IDOR) zwraca HTTP 403 FORBIDDEN", async () => {
    // Zalogowana Alice próbuje wykonać claim na koncie Boba
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-bob", missionId: "m_battle_1", category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error, "Brak uprawnień do konta innego użytkownika");
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Brak możliwości sfałszowania ukończenia
  // --------------------------------------------------------------------------
  test("3. Próba odebrania nieukończonej misji zwraca HTTP 400 z blokadą", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "m_uncompleted_1", category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error, "Misja nie została jeszcze ukończona");

    // Sprawdź czy stan misji w bazie nie został zmieniony
    const missionInDb = mockDb.tables.user_daily_missions[0].missions.find((m: any) => m.id === "m_uncompleted_1");
    assert.equal(missionInDb.completed, false);
    assert.equal(missionInDb.claimed, false);
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Brak wielokrotnego claimu (already claimed)
  // --------------------------------------------------------------------------
  test("4. Próba ponownego odebrania już odebranej misji zwraca HTTP 409 CONFLICT", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "m_already_claimed", category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.error, "Nagroda została już odebrana");
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Równoczesny claim / ochrona idempotencji przez reward_logs
  // --------------------------------------------------------------------------
  test("5. Równoczesny claim: obecność wpisu w reward_logs blokuje duplikat z HTTP 409", async () => {
    const dbWithLog = getBaseDb();
    (dbWithLog.reward_logs as any[]).push({
      id: "log-existing-1",
      user_id: "user-alice",
      reward_type: "XP",
      source_type: "MISSION",
      source_id: "m_battle_1"
    });

    const mockDb = createMockSupabase(dbWithLog, aliceUser);
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "m_battle_1", category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.error, "Nagroda została już odebrana");
    // Brak powtórnego naliczenia XP
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Brak niezamierzonych zmian w XP
  // --------------------------------------------------------------------------
  test("6. Brak niezamierzonych zmian w XP przy nieprawidłowych żądaniach", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    
    // Nieistniejąca misja
    const reqNotFound = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "non_existent_mission_id", category: "DAILY" })
    });
    (reqNotFound as any).supabaseClient = mockDb;

    const res = await POST(reqNotFound);
    assert.equal(res.status, 404);

    // XP nie uległo zmianie
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 100);
    assert.equal(mockDb.tables.user_game_profile[0].season_xp, 100);
    assert.equal(mockDb.tables.reward_logs.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Zgodność z istniejącymi uprawnionymi konsumentami API
  // --------------------------------------------------------------------------
  test("7. Uprawniony konsument z ukończoną misją pomyślnie odbiera nagrodę", async () => {
    const mockDb = createMockSupabase(getBaseDb(), aliceUser);
    
    // 7A: Legalny claim ukończonej misji bitewnej (m_battle_1)
    const req = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: "m_battle_1", category: "DAILY" })
    });
    (req as any).supabaseClient = mockDb;

    const res = await POST(req);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.xpAwarded, 50);

    // XP zostało prawidłowo powiększone z 100 do 150
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 150);
    assert.equal(mockDb.tables.user_game_profile[0].season_xp, 150);

    // Misja oznaczona jako claimed
    const battleMission = mockDb.tables.user_daily_missions[0].missions.find((m: any) => m.id === "m_battle_1");
    assert.equal(battleMission.claimed, true);

    // Wpis reward_log został utworzony
    assert.equal(mockDb.tables.reward_logs.length, 1);
    assert.equal(mockDb.tables.reward_logs[0].source_id, "m_battle_1");

    // 7B: Legalny claim dziennego spinu (daily_spin_${todayStr}) weryfikowany z tabeli user_daily_spins
    const reqSpin = new NextRequest("http://localhost:3000/api/game/missions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-alice", missionId: `daily_spin_${todayStr}`, category: "DAILY" })
    });
    (reqSpin as any).supabaseClient = mockDb;

    const resSpin = await POST(reqSpin);
    const bodySpin = await resSpin.json();

    assert.equal(resSpin.status, 200);
    assert.equal(bodySpin.success, true);
    assert.equal(bodySpin.xpAwarded, 35);
    assert.equal(mockDb.tables.user_game_profile[0].current_xp, 185);

    // 7C: GET dla zalogowanego użytkownika zwraca misje
    const reqGetAuth = new NextRequest("http://localhost:3000/api/game/missions?userId=user-alice");
    (reqGetAuth as any).supabaseClient = mockDb;
    const resGetAuth = await GET(reqGetAuth);
    const bodyGetAuth = await resGetAuth.json();
    assert.equal(resGetAuth.status, 200);
    assert.equal(bodyGetAuth.success, true);
    assert.ok(bodyGetAuth.dailyMissions.length > 0);

    // 7D: GET dla gościa (guest_user) zwraca strukturę in-memory bez zanieczyszczania bazy
    const unauthDb = createMockSupabase({ user_daily_missions: [], user_weekly_missions: [] }, null);
    const reqGetGuest = new NextRequest("http://localhost:3000/api/game/missions?userId=guest_user");
    (reqGetGuest as any).supabaseClient = unauthDb;
    const resGetGuest = await GET(reqGetGuest);
    const bodyGetGuest = await resGetGuest.json();
    assert.equal(resGetGuest.status, 200);
    assert.equal(bodyGetGuest.success, true);
    assert.equal(unauthDb.tables.user_daily_missions.length, 0, "Baza nie powinna być zanieczyszczana żądaniami gości");
  });
});
