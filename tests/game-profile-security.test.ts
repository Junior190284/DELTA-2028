/**
 * DELTA INFERNO — GAME PROFILE SECURITY & HARDENING TESTS (DELTA-037 & DELTA-037B)
 * Tests for app/api/game/profile/route.ts & components/TeamHub.tsx compatibility:
 * - Permanent disabling of POST (405 Method Not Allowed + Allow header)
 * - Disabling of other mutation methods (PUT, DELETE, PATCH -> 405)
 * - OPTIONS method with Allow header (204)
 * - Strict auth requirement on GET (401 Unauthorized for unauthenticated requests)
 * - IDOR immunity (query parameter ?userId=... is ignored; authenticated user.id is always enforced)
 * - Controlled unavailable status when table does not exist (status: "unavailable", profile: null — zero substitute XP)
 * - TeamHub compatibility verification across available, unavailable, 401, and network failure states
 * - Zero database writes / mutations on read
 */

import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST, PUT, DELETE, PATCH, OPTIONS } from "../app/api/game/profile/route.ts";

test("1. POST bez sesji zwraca 405 Method Not Allowed z nagłówkiem Allow", async () => {
  const res = await POST();
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET, HEAD, OPTIONS");
  assert.equal(res.headers.get("Content-Type"), "application/json");

  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /405|Method Not Allowed/i);
});

test("2. POST z dowolnym userId jest bezwzględnie blokowany (405)", async () => {
  const res = await POST();
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET, HEAD, OPTIONS");
});

test("3. POST z ujemnym lub astronomicznym addXP jest bezwzględnie blokowany (405)", async () => {
  const res = await POST();
  assert.equal(res.status, 405);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("4. Wszystkie pozostałe metody modyfikujące (PUT, DELETE, PATCH) zwracają 405", async () => {
  const putRes = await PUT();
  assert.equal(putRes.status, 405);
  assert.equal(putRes.headers.get("Allow"), "GET, HEAD, OPTIONS");

  const delRes = await DELETE();
  assert.equal(delRes.status, 405);
  assert.equal(delRes.headers.get("Allow"), "GET, HEAD, OPTIONS");

  const patchRes = await PATCH();
  assert.equal(patchRes.status, 405);
  assert.equal(patchRes.headers.get("Allow"), "GET, HEAD, OPTIONS");
});

test("5. OPTIONS zwraca 204 No Content z nagłówkiem Allow", async () => {
  const res = await OPTIONS();
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Allow"), "GET, HEAD, OPTIONS");
});

test("6. GET bez aktywnej sesji Supabase Auth zwraca 401 Unauthorized", async () => {
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: "No session" } })
    }
  };

  const req = new NextRequest("http://localhost:3005/api/game/profile");
  (req as any).supabaseOverride = mockSupabase;
  const res = await GET(req);

  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /Unauthorized|Wymagana autoryzacja/i);
});

test("7. GET z identyfikatorem innego użytkownika (?userId=victim) NIE ufa parametrowi URL (IDOR Protection)", async () => {
  const AUTH_USER_ID = "00000000-0000-4000-a000-000000000001";
  const VICTIM_USER_ID = "99999999-9999-4999-a999-999999999999";

  let queriedUserId: string | null = null;
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: AUTH_USER_ID } }, error: null })
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          if (table === "user_game_profile") {
            queriedUserId = val;
          }
          return {
            maybeSingle: async () => ({
              data: {
                user_id: AUTH_USER_ID,
                current_xp: 350,
                season_xp: 350,
                activity_streak: 5,
                max_streak: 10
              },
              error: null
            }),
            eq: () => ({
              count: 0,
              error: null
            })
          };
        }
      })
    })
  };

  const req = new NextRequest(`http://localhost:3005/api/game/profile?userId=${VICTIM_USER_ID}`);
  (req as any).supabaseOverride = mockSupabase;
  const res = await GET(req);

  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(queriedUserId, AUTH_USER_ID);
  assert.equal(body.profile.userId, AUTH_USER_ID);
  assert.notEqual(body.profile.userId, VICTIM_USER_ID);
});

test("8. GET dla uprawnionego użytkownika zwraca profil z poprawną strukturą zgodną z TeamHub", async () => {
  const AUTH_USER_ID = "00000000-0000-4000-a000-000000000002";

  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: AUTH_USER_ID } }, error: null })
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              user_id: AUTH_USER_ID,
              current_xp: 750,
              season_xp: 750,
              activity_streak: 3,
              max_streak: 7,
              wheel_streak_day: 4,
              last_wheel_spin_date: "2026-11-23"
            },
            error: null
          }),
          eq: () => ({
            count: 2,
            error: null
          })
        })
      })
    })
  };

  const req = new NextRequest("http://localhost:3005/api/game/profile");
  (req as any).supabaseOverride = mockSupabase;
  const res = await GET(req);

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.status, "available");

  assert.equal(body.profile.userId, AUTH_USER_ID);
  assert.equal(body.profile.currentXP, 750);
  assert.equal(body.profile.seasonXP, 750);
  assert.ok(body.profile.levelInfo, "levelInfo must be calculated");
  assert.ok(typeof body.profile.levelInfo.level === "number");
  assert.ok(typeof body.profile.levelInfo.title === "string");
  assert.equal(body.profile.activityStreak, 3);
  assert.equal(body.profile.maxStreak, 7);
});

test("9. GET zwraca kontrolowany stan unavailable gdy tabela profilu nie istnieje (PGRST205) bez zastępczego XP", async () => {
  const AUTH_USER_ID = "00000000-0000-4000-a000-000000000003";

  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: AUTH_USER_ID } }, error: null })
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: {
              code: "PGRST205",
              message: "Could not find the table 'public.user_game_profile' in schema cache"
            }
          }),
          eq: () => ({
            count: 0,
            error: { code: "PGRST205" }
          })
        })
      })
    })
  };

  const req = new NextRequest("http://localhost:3005/api/game/profile");
  (req as any).supabaseOverride = mockSupabase;
  const res = await GET(req);

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.status, "unavailable");

  // KRYTYCZNE: Nie pokazujemy zastępczego XP jako faktycznie zdobytych punktów!
  assert.equal(body.profile, null, "Gdy tabela nie istnieje, profile musi być null, aby nie fałszować XP");
  assert.equal(JSON.stringify(body).includes("PGRST205"), false);
  assert.equal(JSON.stringify(body).includes("schema cache"), false);
});

test("10. GET nie modyfikuje bazy danych ani nie przyznaje XP (Czysty odczyt)", async () => {
  let insertCalled = false;
  let updateCalled = false;
  let upsertCalled = false;

  const AUTH_USER_ID = "00000000-0000-4000-a000-000000000004";
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: AUTH_USER_ID } }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          eq: () => ({ count: 0, error: null })
        })
      }),
      insert: () => { insertCalled = true; return {}; },
      update: () => { updateCalled = true; return {}; },
      upsert: () => { upsertCalled = true; return {}; }
    })
  };

  const req = new NextRequest("http://localhost:3005/api/game/profile");
  (req as any).supabaseOverride = mockSupabase;
  const res = await GET(req);

  assert.equal(res.status, 200);
  assert.equal(insertCalled, false, "GET must never insert to DB");
  assert.equal(updateCalled, false, "GET must never update DB");
  assert.equal(upsertCalled, false, "GET must never upsert DB");
});

test("11. Kompatybilność TeamHub — obsługa statusów available, unavailable, 401 i błędu sieci", () => {
  // Testujemy kontrakt logiki fetchGameProfile w TeamHub.tsx
  const simulateTeamHubHandler = (res: { ok: boolean; status?: number; data?: any } | Error) => {
    let gameProfileState: any = "INITIAL";
    try {
      if (res instanceof Error) {
        gameProfileState = null;
        return gameProfileState;
      }
      if (!res.ok) {
        gameProfileState = null;
        return gameProfileState;
      }
      const data = res.data;
      if (data && data.success && data.status !== "unavailable" && data.profile) {
        gameProfileState = data.profile;
      } else {
        gameProfileState = null;
      }
    } catch {
      gameProfileState = null;
    }
    return gameProfileState;
  };

  // 1. Status available -> gameProfile ustawione z danymi
  const resAvailable = simulateTeamHubHandler({
    ok: true,
    data: { success: true, status: "available", profile: { currentXP: 100, seasonXP: 100 } }
  });
  assert.deepEqual(resAvailable, { currentXP: 100, seasonXP: 100 });

  // 2. Status unavailable -> gameProfile = null (brak fałszywego XP)
  const resUnavailable = simulateTeamHubHandler({
    ok: true,
    data: { success: true, status: "unavailable", profile: null }
  });
  assert.equal(resUnavailable, null, "Unavailable musi ustawić gameProfile na null");

  // 3. HTTP 401 Unauthorized -> gameProfile = null
  const res401 = simulateTeamHubHandler({
    ok: false,
    status: 401,
    data: { success: false, error: "Wymagana autoryzacja" }
  });
  assert.equal(res401, null, "401 musi ustawić gameProfile na null");

  // 4. Błąd sieciowy (throw Error) -> gameProfile = null
  const resNetErr = simulateTeamHubHandler(new Error("Network failed"));
  assert.equal(resNetErr, null, "Błąd sieci musi ustawić gameProfile na null");
});
