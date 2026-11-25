/**
 * DELTA INFERNO 3.0 — ANIM-1A.5 E2E.3 / E2E.5
 * Testy bezpieczeństwa i regresji izolowanego testera HTTP (tests/staging-preview-e2e-http.ts):
 * - zły project ref Supabase oraz spoofing query/path,
 * - adres produkcyjny (Supabase + Vercel/custom domain + VERCEL_ENV=production),
 * - zakaz przekazywania kluczy/sekretów w argumentach CLI + curl stdin,
 * - brak sesji @supabase/ssr i błąd logowania signInWithPassword,
 * - nieudane tworzenie konta (zero prób czyszczenia),
 * - SIGINT w trakcie in-flight createUser (brak race condition, usunięcie konta i zdjęcie listenerów),
 * - fail-fast przy błędzie zakupu, błędzie otwierania oraz braku card_definitions,
 * - cleanup jako twardy warunek PASS (awaria jednej tabeli, nieudane deleteUser, pozostałe wiersze),
 * - kolejność FK cleanup (pack_opening_logs przed user_unopened_packs oraz przed profiles/auth.users),
 * - idempotentne sprzątanie (SIGINT + finally bez duplikacji i bez ruszania obcych kont),
 * - tryb --dry-run i redakcja sekretów.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openPackServerSide } from "../lib/cards/engine.ts";
import {
  E2E_TEST_CARD_IDS,
  E2E_TEST_PLAYER_ID,
  E2E_TEST_PLAYER_NAME,
  USER_CLEANUP_STEPS,
  applySsrCookiesToJar,
  assertNoSecretsInCliArgs,
  buildCurlStdinConfig,
  buildNetscapeCookieJar,
  buildVercelCurlArgs,
  cleanupIsolatedTestUser,
  redactSecrets,
  runPreviewHttpE2ESuite,
  validatePreviewUrl,
  validateSupabaseStagingUrl,
  type CreatedSyntheticUser
} from "./staging-preview-e2e-http.ts";

const VALID_PREVIEW_URL = "https://delta-2028-amzu0zdpp-tomaszrybacki-3187s-projects.vercel.app";
const VALID_STAGING_URL = "https://tdlsxamxtygojxhmjjvp.supabase.co";
const SECRET_SERVICE = "sb_secret_SUPER_SECRET_KEY_123456";
const SECRET_PUB = "sb_publishable_PUBLIC_KEY_123456";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const REAL_OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";
const REAL_PLAYER_1_ID = "aaaa1111-1111-4111-8111-111111111111";
const REAL_PLAYER_2_ID = "aaaa2222-2222-4222-8222-222222222222";
const REAL_PLAYER_3_ID = "aaaa3333-3333-4333-8333-333333333333";

function createSyntheticAllCards() {
  const rarities = ["common", "rare", "epic", "legendary", "inferno"] as const;
  return E2E_TEST_CARD_IDS.map((id, idx) => ({
    id,
    player_id: E2E_TEST_PLAYER_ID,
    season: "2026/27",
    card_type: ["base", "matchday", "goal_hunter", "mvp", "inferno"][idx],
    card_name: `${E2E_TEST_PLAYER_NAME} — ${rarities[idx].toUpperCase()}`,
    title: rarities[idx].toUpperCase(),
    rarity: rarities[idx],
    is_active: true,
    player: {
      id: E2E_TEST_PLAYER_ID,
      display_name: E2E_TEST_PLAYER_NAME,
      shirt_number: null,
      position: null,
      photo_path: null
    }
  }));
}

function createMockStagingDb(options?: {
  failCreateUser?: boolean;
  failOneDeleteTable?: string;
  failDeleteUser?: boolean;
  residualTable?: string;
  activeCardDefinitionsCount?: number;
  missingSyntheticPlayer?: boolean;
  wrongSyntheticPlayerName?: boolean;
  onCreateUserPending?: () => Promise<void>;
}) {
  const users = new Map<string, { id: string; email: string }>([
    [REAL_OTHER_USER_ID, { id: REAL_OTHER_USER_ID, email: "real.parent@delta.pl" }]
  ]);
  const players = [
    { id: REAL_PLAYER_1_ID, display_name: "REAL PLAYER 1", active: true },
    { id: REAL_PLAYER_2_ID, display_name: "REAL PLAYER 2", active: true },
    { id: REAL_PLAYER_3_ID, display_name: "REAL PLAYER 3", active: true },
    ...(options?.missingSyntheticPlayer
      ? []
      : [
          {
            id: E2E_TEST_PLAYER_ID,
            display_name: options?.wrongSyntheticPlayerName ? "WRONG NAME" : E2E_TEST_PLAYER_NAME,
            active: false
          }
        ])
  ];
  const parentPlayers: Array<{ parent_id: string; player_id: string }> = [
    { parent_id: REAL_OTHER_USER_ID, player_id: REAL_PLAYER_1_ID }
  ];
  const upsertCalls: Array<{ table: string; payload: any }> = [];
  const deleteCalls: Array<{
    table: string;
    column: string;
    value: string;
    filters: Array<{ column: string; value: string }>;
  }> = [];
  let deleteUserCalls = 0;

  const admin = {
    auth: {
      admin: {
        async createUser({ email }: { email: string }) {
          if (options?.onCreateUserPending) {
            await options.onCreateUserPending();
          }
          if (options?.failCreateUser) {
            return { data: { user: null }, error: { message: "Auth createUser failed" } };
          }
          users.set(TEST_USER_ID, { id: TEST_USER_ID, email });
          return { data: { user: { id: TEST_USER_ID, email } }, error: null };
        },
        async deleteUser(id: string) {
          deleteUserCalls++;
          if (options?.failDeleteUser) {
            return { data: null, error: { message: "Simulated deleteUser failure" } };
          }
          users.delete(id);
          return { data: {}, error: null };
        },
        async getUserById(id: string) {
          const hit = users.get(id) || null;
          return { data: { user: hit }, error: hit ? null : { message: "User not found" } };
        }
      }
    },
    from(table: string) {
      return {
        async upsert(payload: any) {
          upsertCalls.push({ table, payload });
          if (table === "parent_players" && payload?.parent_id && payload?.player_id) {
            const exists = parentPlayers.some(
              r => r.parent_id === payload.parent_id && r.player_id === payload.player_id
            );
            if (!exists) {
              parentPlayers.push({ parent_id: payload.parent_id, player_id: payload.player_id });
            }
          }
          return { error: null };
        },
        select(_col: string, _opts?: any) {
          const eqFilters: Array<{ col: string; val: string }> = [];
          const runSelect = async () => {
            if (table === "players") {
              const idFilter = eqFilters.find(f => f.col === "id")?.val;
              const matched = idFilter ? players.filter(p => p.id === idFilter) : players;
              return { data: matched, count: matched.length, error: null };
            }
            if (table === "card_definitions") {
              const cnt = options?.activeCardDefinitionsCount ?? 5;
              const rows = cnt > 0 ? createSyntheticAllCards().slice(0, cnt) : [];
              return { data: rows, count: cnt, error: null };
            }
            if (table === "parent_players") {
              const remaining = parentPlayers.filter(row =>
                eqFilters.every(f => (row as any)[f.col] === f.val)
              );
              const forcedResidual =
                options?.residualTable === "parent_players" &&
                eqFilters.some(f => f.val === TEST_USER_ID)
                  ? 1
                  : 0;
              return {
                data: remaining,
                count: Math.max(remaining.length, forcedResidual),
                error: null
              };
            }
            const firstVal = eqFilters[0]?.val;
            const residual =
              options?.residualTable === table && firstVal === TEST_USER_ID ? 1 : 0;
            return { data: [], count: residual, error: null };
          };
          const builder: any = {
            eq(filterCol: string, filterVal: string) {
              eqFilters.push({ col: filterCol, val: filterVal });
              return builder;
            },
            async maybeSingle() {
              const res = await runSelect();
              return { data: res.data[0] ?? null, error: res.error };
            },
            then(onFulfilled: any, onRejected: any) {
              return runSelect().then(onFulfilled, onRejected);
            }
          };
          return builder;
        },
        delete() {
          const filters: Array<{ column: string; value: string }> = [];
          let committed = false;
          const commitDelete = async () => {
            if (!committed) {
              committed = true;
              deleteCalls.push({
                table,
                column: filters[0]?.column || "",
                value: filters[0]?.value || "",
                filters: [...filters]
              });
              if (options?.failOneDeleteTable === table) {
                return { error: { message: `Simulated delete failure on ${table}` } };
              }
              if (table === "parent_players" && options?.residualTable !== "parent_players") {
                for (let i = parentPlayers.length - 1; i >= 0; i--) {
                  const row = parentPlayers[i];
                  if (filters.every(f => (row as any)[f.column] === f.value)) {
                    parentPlayers.splice(i, 1);
                  }
                }
              }
            }
            return { error: null };
          };
          const builder: any = {
            eq(column: string, value: string) {
              filters.push({ column, value });
              return builder;
            },
            then(onFulfilled: any, onRejected: any) {
              return commitDelete().then(onFulfilled, onRejected);
            }
          };
          return builder;
        }
      };
    }
  };

  return {
    admin,
    users,
    players,
    parentPlayers,
    upsertCalls,
    deleteCalls,
    getDeleteUserCalls: () => deleteUserCalls
  };
}

function createWorkingSsrMock(
  db?: ReturnType<typeof createMockStagingDb>,
  options?: { hidePlayersFromRls?: boolean; leakForeignPlayerInRls?: boolean }
) {
  return (_u: string, _k: string, adapter: any) => ({
    auth: {
      async signInWithPassword() {
        adapter.setAll([{ name: "sb-tdlsxamxtygojxhmjjvp-auth-token", value: "base64-mocktoken" }]);
        return { data: { session: {} }, error: null };
      }
    },
    from(table: string) {
      const runSsrSelect = async () => {
        if (table === "players") {
          if (options?.hidePlayersFromRls) {
            return { data: [], error: null };
          }
          if (options?.leakForeignPlayerInRls) {
            return {
              data: [
                { id: E2E_TEST_PLAYER_ID, display_name: E2E_TEST_PLAYER_NAME, active: false },
                { id: REAL_PLAYER_1_ID, display_name: "REAL PLAYER 1", active: true }
              ],
              error: null
            };
          }
          if (db) {
            // Symulacja rzeczywistej polityki RLS players: SELECT USING (is_parent_of(id))
            const linked = db.players.filter(p =>
              db.parentPlayers.some(link => link.parent_id === TEST_USER_ID && link.player_id === p.id)
            );
            return { data: linked, error: null };
          }
          return {
            data: [{ id: E2E_TEST_PLAYER_ID, display_name: E2E_TEST_PLAYER_NAME, active: false }],
            error: null
          };
        }
        if (table === "card_definitions") {
          return { data: createSyntheticAllCards(), error: null };
        }
        return { data: [], error: null };
      };
      const builder: any = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        then(onFulfilled: any, onRejected: any) {
          return runSsrSelect().then(onFulfilled, onRejected);
        }
      };
      return builder;
    }
  });
}

function baseEnv() {
  return {
    PREVIEW_URL: VALID_PREVIEW_URL,
    NEXT_PUBLIC_SUPABASE_URL: VALID_STAGING_URL,
    SUPABASE_SECRET_KEY: SECRET_SERVICE,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
  };
}

test("1. Zły project ref oraz spoofing query/path są odrzucane z CRITICAL ABORT", () => {
  assert.throws(
    () => validateSupabaseStagingUrl("https://otherprojectref.supabase.co"),
    /CRITICAL ABORT/
  );
  assert.throws(
    () => validateSupabaseStagingUrl("https://evil.example.com/tdlsxamxtygojxhmjjvp"),
    /CRITICAL ABORT/
  );
  assert.throws(
    () => validateSupabaseStagingUrl("http://tdlsxamxtygojxhmjjvp.supabase.co"),
    /HTTPS/
  );
  assert.throws(
    () => validateSupabaseStagingUrl("https://fctgruvciakhohfxkdzp.supabase.co?ref=tdlsxamxtygojxhmjjvp"),
    /CRITICAL ABORT/
  );
  assert.equal(validateSupabaseStagingUrl(VALID_STAGING_URL).projectRef, "tdlsxamxtygojxhmjjvp");
});

test("2. Adres produkcyjny (Supabase, custom domain, bare prod vercel alias, VERCEL_ENV=production) jest blokowany", async () => {
  assert.throws(() => validatePreviewUrl("https://delta-2028.vercel.app"), /CRITICAL ABORT/);
  assert.throws(() => validatePreviewUrl("https://delta.warszawa.pl"), /CRITICAL ABORT/);
  assert.throws(() => validatePreviewUrl("https://fctgruvciakhohfxkdzp.vercel.app"), /CRITICAL ABORT/);
  assert.throws(() => validatePreviewUrl("http://delta-2028-git-test.vercel.app"), /HTTPS/);

  let networkCalled = false;
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: {
          ...baseEnv(),
          NEXT_PUBLIC_SUPABASE_URL: "https://fctgruvciakhohfxkdzp.supabase.co"
        },
        sendRequestFn: async () => {
          networkCalled = true;
          return { status: 200, data: {}, rawText: "" };
        }
      }),
    /fctgruvciakhohfxkdzp/
  );
  assert.equal(networkCalled, false);

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: { ...baseEnv(), VERCEL_ENV: "production" }
      }),
    /VERCEL_ENV=production/
  );
});

test("3. Zakaz przekazywania kluczy API w argumentach CLI oraz przekazywanie cookies/body poza argv vercel curl", () => {
  assert.throws(
    () => assertNoSecretsInCliArgs(["node", "s.ts", `--secret=${SECRET_SERVICE}`]),
    /CRITICAL ABORT/
  );
  assert.throws(
    () => assertNoSecretsInCliArgs(["node", "s.ts", "--protection-bypass", "abc"]),
    /CRITICAL ABORT/
  );
  assert.throws(
    () => assertNoSecretsInCliArgs(["node", "s.ts", "eyJhbGciOiJIUzI1NiJ9.payload12345.sig"]),
    /CRITICAL ABORT/
  );

  const jar = new Map<string, string>([["sb-test", "base64-abc"]]);
  const netscape = buildNetscapeCookieJar(new URL(VALID_PREVIEW_URL), jar);
  assert.match(netscape, /^delta-2028-amzu0zdpp-tomaszrybacki-3187s-projects\.vercel\.app\tFALSE\t\/\tTRUE\t0\tsb-test\tbase64-abc/m);

  const args = buildVercelCurlArgs({
    targetUrl: `${VALID_PREVIEW_URL}/api/cards/open-pack`,
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "sb-test=base64-abc" },
    cookieFilePath: "/tmp/e2e-cookie.txt",
    hasPostBody: true,
    timeoutMs: 30_000
  });
  assert.equal(args.includes("--config"), false);
  assert.equal(args.includes("-K"), false);
  assert.equal(args.some(a => a.includes("base64-abc")), false);
  assert.ok(args.includes("-b") && args.includes("/tmp/e2e-cookie.txt"));
  assert.ok(args.includes("--data-binary") && args.includes("@-"));

  const cfg = buildCurlStdinConfig({
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "sb-test=base64-abc" },
    body: { pack_type_id: "standard_pack" },
    timeoutMs: 30_000
  });
  assert.match(cfg, /header = "Cookie: sb-test=base64-abc"/);
  assert.match(cfg, /data-raw = "\{\\"pack_type_id\\":\\"standard_pack\\"\}"/);
});

test("4. Brak sesji @supabase/ssr i błąd logowania przerywają przed testami HTTP i sprzątają konto", async () => {
  // 4A. Brak wyemitowanych ciasteczek
  const db1 = createMockStagingDb();
  let requestsSent = 0;

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => db1.admin,
        createSsrClientFn: () => ({
          auth: {
            async signInWithPassword() {
              return { data: null, error: null };
            }
          }
        }),
        sendRequestFn: async () => {
          requestsSent++;
          return { status: 200, data: {}, rawText: "" };
        }
      }),
    /ciasteczka sesji/
  );

  assert.equal(requestsSent, 0);
  assert.equal(db1.users.has(TEST_USER_ID), false);
  assert.equal(db1.users.has(REAL_OTHER_USER_ID), true);
  assert.ok(db1.deleteCalls.every(c => c.value === TEST_USER_ID));

  // 4B. Jawny błąd logowania signInWithPassword
  const db2 = createMockStagingDb();
  let requestsOnSignInErr = 0;
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => db2.admin,
        createSsrClientFn: () => ({
          auth: {
            async signInWithPassword() {
              return { data: null, error: { message: `Auth error key=${SECRET_SERVICE}` } };
            }
          }
        }),
        sendRequestFn: async () => {
          requestsOnSignInErr++;
          return { status: 200, data: {}, rawText: "" };
        }
      }),
    /Nie udało się zalogować konta testowego/
  );
  assert.equal(requestsOnSignInErr, 0);
  assert.equal(db2.users.has(TEST_USER_ID), false);
  assert.equal(db2.users.has(REAL_OTHER_USER_ID), true);
});

test("5. Nieudane tworzenie konta przerywa natychmiast bez wykonywania jakichkolwiek zapytań DELETE", async () => {
  const db = createMockStagingDb({ failCreateUser: true });

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => db.admin
      }),
    /Auth createUser failed/
  );

  assert.equal(db.deleteCalls.length, 0);
  assert.equal(db.getDeleteUserCalls(), 0);
  assert.equal(db.users.has(REAL_OTHER_USER_ID), true);
});

test("6. SIGINT w trakcie in-flight createUser czeka na utworzenie konta, sprząta je raz i usuwa listenery", async () => {
  const initialSigintCount = process.listenerCount("SIGINT");
  const initialSigtermCount = process.listenerCount("SIGTERM");

  let resolveCreate!: () => void;
  const pendingCreate = new Promise<void>(r => {
    resolveCreate = r;
  });

  const db = createMockStagingDb({
    onCreateUserPending: () => pendingCreate
  });

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: true,
        createAdminClientFn: () => db.admin,
        onBeforeCreateUser: () => {
          // Sygnał przychodzi dokładnie wtedy, gdy createUser() jest w locie w sieci
          setTimeout(() => {
            process.emit("SIGINT", "SIGINT");
            // Po wysłaniu SIGINT serwer Supabase kończy tworzyć konto
            setTimeout(() => resolveCreate(), 10);
          }, 10);
        }
      }),
    /Przerwano test sygnałem SIGINT/
  );

  // Krytyczny inwariant: konto zdążyło powstać i zostało wykryte + posprzątane!
  assert.equal(db.users.has(TEST_USER_ID), false);
  assert.equal(db.users.has(REAL_OTHER_USER_ID), true);
  assert.equal(db.getDeleteUserCalls(), 1);
  assert.equal(db.deleteCalls.length, USER_CLEANUP_STEPS.length);
  assert.ok(db.deleteCalls.every(c => c.value === TEST_USER_ID));
  assert.equal(process.listenerCount("SIGINT"), initialSigintCount);
  assert.equal(process.listenerCount("SIGTERM"), initialSigtermCount);
});

test("7. Kolejność FK cleanup, odmowa dla kont obcych oraz brak duplikacji przy ponownym cleanup", async () => {
  const idxLogs = USER_CLEANUP_STEPS.findIndex(s => s.table === "pack_opening_logs");
  const idxPacks = USER_CLEANUP_STEPS.findIndex(s => s.table === "user_unopened_packs");
  const idxProfiles = USER_CLEANUP_STEPS.findIndex(s => s.table === "profiles");
  assert.ok(idxLogs !== -1 && idxPacks !== -1 && idxProfiles !== -1);
  assert.ok(idxLogs < idxPacks, "pack_opening_logs (FK bez CASCADE) musi być usuwane przed user_unopened_packs");
  assert.ok(idxPacks < idxProfiles, "user_unopened_packs musi być usuwane przed profiles");

  const db = createMockStagingDb();
  const foreignUser = {
    id: REAL_OTHER_USER_ID,
    email: "real.parent@delta.pl",
    createdByThisRun: true
  } as CreatedSyntheticUser;

  const blocked = await cleanupIsolatedTestUser({ admin: db.admin, createdUser: foreignUser });
  assert.equal(blocked.executed, false);
  assert.match(blocked.errors[0], /ABORT_CLEANUP/);
  assert.equal(db.deleteCalls.length, 0);
  assert.equal(db.users.has(REAL_OTHER_USER_ID), true);

  // Idempotentność ponownego cleanup (SIGINT podczas testów HTTP + blok finally wykonują delete tylko 1 raz)
  const dbIdem = createMockStagingDb();
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: true,
        createAdminClientFn: () => dbIdem.admin,
        createSsrClientFn: createWorkingSsrMock(),
        sendRequestFn: async () => {
          process.emit("SIGINT", "SIGINT");
          return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
        }
      }),
    /Przerwano test sygnałem/
  );
  assert.equal(dbIdem.getDeleteUserCalls(), 1);
  assert.equal(dbIdem.deleteCalls.length, USER_CLEANUP_STEPS.length);
});

test("8. FAIL-FAST: błąd zakupu, błąd otwierania i brak card_definitions przerywają testy zależne i uruchamiają cleanup", async () => {
  // 8A. Brak card_definitions -> FAIL_FAST przed buy-pack i open-pack
  const dbNoCards = createMockStagingDb({ activeCardDefinitionsCount: 0 });
  const calledPathsNoCards: string[] = [];

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbNoCards.admin,
        createSsrClientFn: createWorkingSsrMock(),
        sendRequestFn: async ({ path, method }) => {
          calledPathsNoCards.push(`${method} ${path}`);
          if (path === "/api/admin/health-check") {
            return {
              status: 200,
              data: { status: "DEGRADED", environment: "preview", checks: { database: { status: "OK" }, auth: { status: "OK" } } },
              rawText: "{}"
            };
          }
          if (path === "/api/cards/collection") {
            return { status: 200, data: { userCards: [], unopenedPacks: [], deltaPoints: 0 }, rawText: "{}" };
          }
          if (path === "/api/auth/status") {
            return { status: 200, data: { authenticated: true, user_id: TEST_USER_ID }, rawText: "{}" };
          }
          return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
        }
      }),
    /FAIL_FAST.*card_definitions/
  );
  assert.equal(calledPathsNoCards.some(p => p.includes("buy-pack") && !p.startsWith("POST /api/cards/buy-pack") ? false : false), false);
  assert.equal(calledPathsNoCards.filter(p => p.includes("/buy-pack") || p.includes("/open-pack")).length, 2); // wyłącznie 2 unauth POST
  assert.equal(dbNoCards.users.has(TEST_USER_ID), false);
  assert.equal(dbNoCards.getDeleteUserCalls(), 1);

  // 8B. Błąd zakupu -> FAIL_FAST pomija replay/conflict/open-pack i sprząta
  const dbBuyFail = createMockStagingDb();
  const buyFailPaths: string[] = [];
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbBuyFail.admin,
        createSsrClientFn: createWorkingSsrMock(),
        sendRequestFn: async ({ path, body, supabaseCookies }) => {
          const isAuth = Boolean(supabaseCookies && supabaseCookies.size > 0);
          if (isAuth) buyFailPaths.push(path);
          if (!isAuth && path.startsWith("/api/cards/") && path !== "/api/cards/collection") {
            return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
          }
          if (!isAuth && (path.startsWith("/api/quests/") || path.startsWith("/api/knowledge/"))) {
            return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
          }
          if (path === "/api/admin/health-check") {
            return { status: 200, data: { status: "DEGRADED", environment: "preview", checks: { database: { status: "OK" }, auth: { status: "OK" } } }, rawText: "{}" };
          }
          if (path === "/api/auth/status") {
            return { status: 200, data: { authenticated: true, user_id: TEST_USER_ID }, rawText: "{}" };
          }
          if (path === "/api/cards/collection") {
            return {
              status: 200,
              data: {
                userCards: [],
                unopenedPacks: [],
                deltaPoints: 0,
                packDefinitions: [1, 2, 3, 4, 5, 6],
                allCards: createSyntheticAllCards(),
                players: []
              },
              rawText: "{}"
            };
          }
          if (path === "/api/cards/buy-pack") {
            const p = (body as any)?.pack_type_id;
            if (p === "gold_booster") {
              return { status: 400, data: { code: "INSUFFICIENT_BALANCE" }, rawText: "{}" };
            }
            return { status: 500, data: { error: "Purchase DB failure" }, rawText: "{}" };
          }
          return { status: 200, data: {}, rawText: "{}" };
        }
      }),
    /FAIL_FAST.*buy-pack/
  );
  assert.equal(buyFailPaths.includes("/api/cards/open-pack"), false);
  assert.equal(buyFailPaths.includes("/api/cards/daily-spin"), false);
  assert.equal(dbBuyFail.users.has(TEST_USER_ID), false);
  assert.equal(dbBuyFail.getDeleteUserCalls(), 1);

  // 8C. Błąd otwierania -> FAIL_FAST pomija replay/ALREADY_OPENED/NO_UNOPENED_PACK/rewards i sprząta
  const dbOpenFail = createMockStagingDb();
  const openFailPaths: string[] = [];
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbOpenFail.admin,
        createSsrClientFn: createWorkingSsrMock(),
        sendRequestFn: async ({ path, body, supabaseCookies }) => {
          const isAuth = Boolean(supabaseCookies && supabaseCookies.size > 0);
          if (isAuth) openFailPaths.push(path);
          if (!isAuth && path.startsWith("/api/cards/") && path !== "/api/cards/collection") {
            return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
          }
          if (!isAuth && (path.startsWith("/api/quests/") || path.startsWith("/api/knowledge/"))) {
            return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
          }
          if (path === "/api/admin/health-check") {
            return { status: 200, data: { status: "DEGRADED", environment: "preview", checks: { database: { status: "OK" }, auth: { status: "OK" } } }, rawText: "{}" };
          }
          if (path === "/api/auth/status") {
            return { status: 200, data: { authenticated: true, user_id: TEST_USER_ID }, rawText: "{}" };
          }
          if (path === "/api/cards/collection") {
            return {
              status: 200,
              data: {
                userCards: [],
                unopenedPacks: [],
                deltaPoints: 0,
                packDefinitions: [1, 2, 3, 4, 5, 6],
                allCards: createSyntheticAllCards(),
                players: []
              },
              rawText: "{}"
            };
          }
          if (path === "/api/cards/buy-pack") {
            const p = (body as any)?.pack_type_id;
            if (p === "gold_booster") return { status: 400, data: { code: "INSUFFICIENT_BALANCE" }, rawText: "{}" };
            if (p === "matchday_booster") return { status: 409, data: { code: "IDEMPOTENCY_CONFLICT" }, rawText: "{}" };
            return {
              status: 200,
              data: {
                success: true,
                remainingPoints: 40,
                already_processed: openFailPaths.filter(x => x === "/api/cards/buy-pack").length > 2,
                grantedPack: { id: "pack-1", user_id: TEST_USER_ID }
              },
              rawText: "{}"
            };
          }
          if (path === "/api/cards/open-pack") {
            return { status: 500, data: { error: "NO_AVAILABLE_CARDS" }, rawText: "{}" };
          }
          return { status: 200, data: {}, rawText: "{}" };
        }
      }),
    /FAIL_FAST.*open-pack/
  );
  assert.equal(openFailPaths.filter(p => p === "/api/cards/open-pack").length, 1);
  assert.equal(openFailPaths.includes("/api/cards/daily-spin"), false);
  assert.equal(dbOpenFail.users.has(TEST_USER_ID), false);
});

function createFullPassMock() {
  let buySuccessCount = 0;
  let openCount = 0;
  let spinCount = 0;
  let questCount = 0;
  let quizPassCount = 0;

  return async ({ path, body, supabaseCookies }: any) => {
    const isAuth = Boolean(supabaseCookies && supabaseCookies.size > 0);
    if (!isAuth && path !== "/api/admin/health-check" && path !== "/api/cards/collection") {
      return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
    }
    if (path === "/api/admin/health-check") {
      return { status: 200, data: { status: "DEGRADED", environment: "preview", checks: { database: { status: "OK" }, auth: { status: "OK" } } }, rawText: "{}" };
    }
    if (path === "/api/auth/status") {
      return { status: 200, data: { authenticated: true, user_id: TEST_USER_ID }, rawText: "{}" };
    }
    if (path === "/api/cards/collection") {
      return {
        status: 200,
        data: {
          userCards: isAuth ? [{ id: "uc1", card_definition: { player: { id: E2E_TEST_PLAYER_ID, display_name: E2E_TEST_PLAYER_NAME } } }] : [],
          unopenedPacks: [],
          deltaPoints: 0,
          packDefinitions: [1, 2, 3, 4, 5, 6],
          allCards: createSyntheticAllCards(),
          players: []
        },
        rawText: "{}"
      };
    }
    if (path === "/api/cards/buy-pack") {
      if (body?.pack_type_id === "gold_booster") return { status: 400, data: { code: "INSUFFICIENT_BALANCE" }, rawText: "{}" };
      if (body?.pack_type_id === "matchday_booster") return { status: 409, data: { code: "IDEMPOTENCY_CONFLICT" }, rawText: "{}" };
      buySuccessCount++;
      return {
        status: 200,
        data: { success: true, remainingPoints: 40, already_processed: buySuccessCount > 1, grantedPack: { id: "pack-1", user_id: TEST_USER_ID } },
        rawText: "{}"
      };
    }
    if (path === "/api/cards/open-pack") {
      openCount++;
      if (openCount <= 2) return { status: 200, data: { cards: [{ id: "c1" }, { id: "c2" }, { id: "c3" }] }, rawText: "{}" };
      if (openCount === 3) return { status: 409, data: { code: "ALREADY_OPENED" }, rawText: "{}" };
      return { status: 400, data: { code: "NO_UNOPENED_PACK" }, rawText: "{}" };
    }
    if (path === "/api/cards/daily-spin") {
      spinCount++;
      return spinCount === 1
        ? { status: 200, data: { success: true }, rawText: "{}" }
        : { status: 429, data: { canSpin: false }, rawText: "{}" };
    }
    if (path === "/api/cards/challenges") {
      return body?.challengeId === "challenge-five-one-player"
        ? { status: 400, data: { error: "Unmet" }, rawText: "{}" }
        : { status: 404, data: { error: "Not found" }, rawText: "{}" };
    }
    if (path === "/api/quests/claim-reward") {
      questCount++;
      return questCount === 1
        ? { status: 200, data: { success: true, pointsAwarded: 30 }, rawText: "{}" }
        : { status: 409, data: { code: "ALREADY_CLAIMED" }, rawText: "{}" };
    }
    if (path === "/api/knowledge/complete-quiz") {
      if ((body?.scorePercent ?? 0) < 75) return { status: 200, data: { passed: false, pointsAwarded: 0 }, rawText: "{}" };
      quizPassCount++;
      return quizPassCount === 1
        ? { status: 200, data: { passed: true, pointsAwarded: 50 }, rawText: "{}" }
        : { status: 200, data: { passed: true, alreadyClaimed: true, pointsAwarded: 0 }, rawText: "{}" };
    }
    if (path === "/api/cards/grant-special") {
      return { status: 403, data: { code: "FORBIDDEN" }, rawText: "{}" };
    }
    return { status: 200, data: {}, rawText: "{}" };
  };
}

test("9. Cleanup jako twardy warunek PASS: awaria tabeli, nieudane deleteUser i pozostałe rekordy kończą E2E błędem", async () => {
  // 9A. Awaria jednej tabeli cleanup -> wszystkie testy HTTP PASS, a mimo to E2E odrzuca przez CLEANUP_VERIFICATION_FAILED
  const dbOneFail = createMockStagingDb({ failOneDeleteTable: "user_cards" });
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbOneFail.admin,
        createSsrClientFn: createWorkingSsrMock(dbOneFail),
        sendRequestFn: createFullPassMock()
      }),
    /CLEANUP_VERIFICATION_FAILED/
  );
  assert.equal(dbOneFail.deleteCalls.length, USER_CLEANUP_STEPS.length);
  assert.equal(dbOneFail.getDeleteUserCalls(), 1);
  assert.equal(dbOneFail.users.has(REAL_OTHER_USER_ID), true);

  // 9B. Nieudane auth.admin.deleteUser -> E2E odrzuca z CLEANUP_VERIFICATION_FAILED
  const dbDeleteUserFail = createMockStagingDb({ failDeleteUser: true });
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbDeleteUserFail.admin,
        createSsrClientFn: createWorkingSsrMock(dbDeleteUserFail),
        sendRequestFn: createFullPassMock()
      }),
    /CLEANUP_VERIFICATION_FAILED/
  );
  assert.equal(dbDeleteUserFail.deleteCalls.length, USER_CLEANUP_STEPS.length);

  // 9C. Pozostałe wiersze po DELETE wykryte przez weryfikację końcową -> E2E odrzuca z CLEANUP_VERIFICATION_FAILED
  const dbResidual = createMockStagingDb({ residualTable: "user_unopened_packs" });
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbResidual.admin,
        createSsrClientFn: createWorkingSsrMock(dbResidual),
        sendRequestFn: createFullPassMock()
      }),
    /CLEANUP_VERIFICATION_FAILED.*residualRowsFound=1/
  );
});

test("10. Tryb --dry-run, redakcja sekretów i obsługa chunkowanych ciasteczek @supabase/ssr", async () => {
  let adminCalled = false;
  let httpCalled = false;

  const res = await runPreviewHttpE2ESuite({
    argv: [
      "node",
      "script.ts",
      "--dry-run",
      `--preview-url=${VALID_PREVIEW_URL}`,
      `--supabase-url=${VALID_STAGING_URL}`
    ],
    env: {},
    createAdminClientFn: () => {
      adminCalled = true;
      return {};
    },
    sendRequestFn: async () => {
      httpCalled = true;
      return { status: 200, data: {}, rawText: "" };
    }
  });

  assert.equal(res.mode, "dry-run");
  assert.equal(res.dryRunReport?.createdUsers, 0);
  assert.equal(res.dryRunReport?.writesExecuted, 0);
  assert.equal(res.dryRunReport?.deletesExecuted, 0);
  assert.equal(res.dryRunReport?.httpRequestsExecuted, 0);
  assert.equal(adminCalled, false);
  assert.equal(httpCalled, false);

  const jar = new Map<string, string>();
  applySsrCookiesToJar(jar, [
    { name: "sb-tdlsxamxtygojxhmjjvp-auth-token.0", value: "base64-chunk0" },
    { name: "sb-tdlsxamxtygojxhmjjvp-auth-token.1", value: "chunk1" }
  ]);
  assert.equal(jar.size, 2);

  applySsrCookiesToJar(jar, [
    { name: "sb-tdlsxamxtygojxhmjjvp-auth-token.1", value: "", options: { maxAge: 0 } }
  ]);
  assert.equal(jar.size, 1);

  const redacted = redactSecrets(
    `Error auth key=${SECRET_SERVICE} pub=${SECRET_PUB} jwt=eyJhbGciOiJIUzI1NiJ9.abcdef123456.sig123`,
    [SECRET_SERVICE, SECRET_PUB]
  );
  assert.equal(redacted.includes(SECRET_SERVICE), false);
  assert.equal(redacted.includes(SECRET_PUB), false);
  assert.equal(redacted.includes("abcdef123456"), false);
});

test("11. parent_players: wiąże wyłącznie (testUserId, E2E_TEST_PLAYER_ID), nie rusza istniejących kont i bezpiecznie sprząta przed profiles", async () => {
  // 11A. Poprawny przebieg: dodaje dokładnie 1 relację parent_players (testUserId -> E2E_TEST_PLAYER_ID),
  // zachowuje relację realnego rodzica i usuwa wyłącznie parę (testUserId, E2E_TEST_PLAYER_ID) przed profiles
  const db = createMockStagingDb();
  const res = await runPreviewHttpE2ESuite({
    argv: ["node", "script.ts", "--execute-preview-http"],
    env: baseEnv(),
    registerSignalHandlers: false,
    createAdminClientFn: () => db.admin,
    createSsrClientFn: createWorkingSsrMock(db),
    sendRequestFn: createFullPassMock()
  });

  assert.equal(res.failed, 0);
  assert.ok(res.passed >= 25);
  assert.equal(res.cleanup?.authUserDeleted, true);
  assert.equal(res.cleanup?.residualRowsFound, 0);

  const linkUpserts = db.upsertCalls.filter(u => u.table === "parent_players");
  assert.equal(linkUpserts.length, 1);
  assert.deepEqual(linkUpserts[0].payload, {
    parent_id: TEST_USER_ID,
    player_id: E2E_TEST_PLAYER_ID
  });

  const idxParentPlayers = USER_CLEANUP_STEPS.findIndex(s => s.table === "parent_players");
  const idxProfiles = USER_CLEANUP_STEPS.findIndex(s => s.table === "profiles");
  assert.ok(idxParentPlayers !== -1 && idxParentPlayers < idxProfiles);

  const parentDelCall = db.deleteCalls.find(d => d.table === "parent_players");
  assert.ok(parentDelCall);
  assert.deepEqual(parentDelCall.filters, [
    { column: "parent_id", value: TEST_USER_ID },
    { column: "player_id", value: E2E_TEST_PLAYER_ID }
  ]);
  assert.deepEqual(db.parentPlayers, [{ parent_id: REAL_OTHER_USER_ID, player_id: REAL_PLAYER_1_ID }]);

  // 11B. Brak fikcyjnego gracza E2E TEST PLAYER -> przerywa bez dopisywania parent_players i sprząta konto
  const dbMissingPlayer = createMockStagingDb({ missingSyntheticPlayer: true });
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbMissingPlayer.admin
      }),
    /SYNTHETIC_PLAYER_MISSING/
  );
  assert.equal(dbMissingPlayer.upsertCalls.filter(u => u.table === "parent_players").length, 0);
  assert.equal(dbMissingPlayer.users.has(TEST_USER_ID), false);
  assert.deepEqual(dbMissingPlayer.parentPlayers, [
    { parent_id: REAL_OTHER_USER_ID, player_id: REAL_PLAYER_1_ID }
  ]);

  // 11C. Pozostały rekord w parent_players po cleanupie -> FAIL przez CLEANUP_VERIFICATION_FAILED
  const dbResidualLink = createMockStagingDb({ residualTable: "parent_players" });
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbResidualLink.admin,
        createSsrClientFn: createWorkingSsrMock(dbResidualLink),
        sendRequestFn: createFullPassMock()
      }),
    /CLEANUP_VERIFICATION_FAILED.*residualRowsFound=1/
  );
});

test("12. RLS players (is_parent_of): zalogowany tester widzi wyłącznie E2E TEST PLAYER i jego karty, a wyciek/brak powoduje FAIL-FAST", async () => {
  // 12A. Brak widoczności E2E TEST PLAYER w RLS players -> FAIL_FAST przed buy-pack/open-pack
  const dbHidden = createMockStagingDb();
  const calledPathsHidden: string[] = [];
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbHidden.admin,
        createSsrClientFn: createWorkingSsrMock(dbHidden, { hidePlayersFromRls: true }),
        sendRequestFn: async ({ path, supabaseCookies }) => {
          if (supabaseCookies && supabaseCookies.size > 0) calledPathsHidden.push(path);
          if (path === "/api/admin/health-check") {
            return { status: 200, data: { status: "DEGRADED", environment: "preview", checks: { database: { status: "OK" }, auth: { status: "OK" } } }, rawText: "{}" };
          }
          if (path === "/api/auth/status") {
            return { status: 200, data: { authenticated: true, user_id: TEST_USER_ID }, rawText: "{}" };
          }
          if (path === "/api/cards/collection") {
            return { status: 200, data: { userCards: [], unopenedPacks: [], deltaPoints: 0, packDefinitions: [1, 2, 3, 4, 5, 6], allCards: createSyntheticAllCards(), players: [] }, rawText: "{}" };
          }
          return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
        }
      }),
    /FAIL_FAST.*AUTH RLS players/
  );
  assert.equal(calledPathsHidden.includes("/api/cards/buy-pack"), false);
  assert.equal(dbHidden.users.has(TEST_USER_ID), false);

  // 12B. Wyciek prawdziwego zawodnika w RLS players -> FAIL_FAST i cleanup
  const dbLeak = createMockStagingDb();
  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: baseEnv(),
        registerSignalHandlers: false,
        createAdminClientFn: () => dbLeak.admin,
        createSsrClientFn: createWorkingSsrMock(dbLeak, { leakForeignPlayerInRls: true }),
        sendRequestFn: createFullPassMock()
      }),
    /FAIL_FAST.*AUTH RLS players/
  );
  assert.equal(dbLeak.users.has(TEST_USER_ID), false);
});

test("13. players.active = false nie wyklucza kart z losowania openPackServerSide ani open_pack_atomic i nie uruchamia auto-seed", async () => {
  const synthCards = createSyntheticAllCards();
  let playersTableQueried = false;
  const rpcInvocations: Array<{ packTypeId: string; drawnIds: string[] }> = [];

  const mockEngineClient: any = {
    from(table: string) {
      if (table === "players") {
        playersTableQueried = true;
      }
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        in(_col: string, ids: string[]) {
          return Promise.resolve({
            data: synthCards.filter(c => ids.includes(c.id)),
            error: null
          });
        },
        limit() {
          return this;
        },
        order() {
          return this;
        },
        async maybeSingle() {
          if (table === "user_unopened_packs") {
            return {
              data: { id: "pack-e2e-1", user_id: TEST_USER_ID, pack_type_id: "legend_pack", is_opened: false },
              error: null
            };
          }
          return { data: null, error: null };
        },
        then(onFulfilled: any, onRejected: any) {
          if (table === "card_definitions") {
            return Promise.resolve({ data: synthCards, error: null }).then(onFulfilled, onRejected);
          }
          return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
        }
      };
    },
    async rpc(fnName: string, args: any) {
      assert.equal(fnName, "open_pack_atomic");
      rpcInvocations.push({
        packTypeId: args.p_pack_type_id,
        drawnIds: args.p_drawn_card_ids
      });
      return {
        data: {
          success: true,
          already_processed: false,
          response_payload: {
            cards_meta: (args.p_drawn_card_ids as string[]).map((cardId, idx) => ({
              card_id: cardId,
              is_duplicate: idx > 0 && cardId === args.p_drawn_card_ids[0],
              duplicate_points: 0
            })),
            total_delta_points_earned: 0,
            new_points_balance: 100,
            pack_type_id: args.p_pack_type_id,
            consumed_pack_id: "pack-e2e-1",
            remaining_unopened_packs_count: 0
          }
        },
        error: null
      };
    }
  };

  // Symulacja otwarcia paczki z gwarantowaną legendą (legend_pack = 6 kart, min_rarity = legendary)
  const opened = await openPackServerSide(mockEngineClient, TEST_USER_ID, "pack-e2e-1", "legend_pack");
  assert.equal(playersTableQueried, false, "resolveActiveCardPool nie może wywoływać auto-seed przy 5 aktywnych kartach.");
  assert.equal(rpcInvocations.length, 1);
  assert.equal(opened.cards.length, 6);
  assert.ok(
    opened.cards.every(entry => (E2E_TEST_CARD_IDS as readonly string[]).includes(entry.card.id)),
    "Wszystkie wylosowane karty muszą pochodzić z puli 5 syntetycznych kart mimo players.active=false."
  );
  assert.ok(
    opened.cards.some(entry => entry.card.rarity === "legendary" || entry.card.rarity === "inferno"),
    "Paczka legend_pack musi wylosować gwarantowaną kartę >= legendary mimo players.active=false."
  );
  assert.ok(
    opened.cards.every(entry => entry.card.player?.display_name === E2E_TEST_PLAYER_NAME),
    "Zwrócone karty zachowują relację player do E2E TEST PLAYER."
  );
});

test("14. E2E.6 FINAL SQL: walidacja składni, UUID (w tym Rare ...000002), UNIQUE, FK/JSONB i ścisłego rollbacku bez zapisu na Staging", () => {
  const insertSqlPath = path.resolve(process.cwd(), "supabase/ETAP_ANIM1A5_E2E6_insert_synthetic.sql");
  const rollbackSqlPath = path.resolve(process.cwd(), "supabase/ETAP_ANIM1A5_E2E6_rollback_synthetic.sql");
  const insertSql = fs.readFileSync(insertSqlPath, "utf8");
  const rollbackSql = fs.readFileSync(rollbackSqlPath, "utf8");

  const assertBalancedSqlLexemes = (sqlText: string, label: string) => {
    let inLineComment = false;
    let inBlockComment = false;
    let inSingleQuote = false;
    let dollarTag: string | null = null;
    let parenDepth = 0;

    for (let i = 0; i < sqlText.length; i++) {
      const ch = sqlText[i];
      const next = sqlText[i + 1] ?? "";

      if (inLineComment) {
        if (ch === "\n") inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inSingleQuote) {
        if (ch === "'" && next === "'") {
          i++;
        } else if (ch === "'") {
          inSingleQuote = false;
        }
        continue;
      }
      if (dollarTag) {
        if (sqlText.startsWith(dollarTag, i)) {
          i += dollarTag.length - 1;
          dollarTag = null;
        }
        continue;
      }

      if (ch === "-" && next === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === "'") {
        inSingleQuote = true;
        continue;
      }
      if (ch === "$") {
        const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sqlText.slice(i));
        if (match) {
          dollarTag = match[0];
          i += dollarTag.length - 1;
          continue;
        }
      }
      if (ch === "(") parenDepth++;
      if (ch === ")") {
        parenDepth--;
        assert.ok(parenDepth >= 0, `${label}: niezbalansowany nawias zamykający ')' na pozycji ${i}`);
      }
    }

    assert.equal(inSingleQuote, false, `${label}: niezamknięty literał '...'`);
    assert.equal(dollarTag, null, `${label}: niezamknięty blok dollar-quote ${dollarTag}`);
    assert.equal(inBlockComment, false, `${label}: niezamknięty komentarz /* ... */`);
    assert.equal(parenDepth, 0, `${label}: niezbalansowane nawiasy (depth=${parenDepth})`);
    assert.match(sqlText, /\bBEGIN;/);
    assert.match(sqlText, /\bCOMMIT;/);
    assert.equal(/\b(DROP|TRUNCATE)\b/i.test(sqlText), false, `${label}: niedozwolone DROP/TRUNCATE`);
  };

  assertBalancedSqlLexemes(insertSql, "INSERT SQL");
  assertBalancedSqlLexemes(rollbackSql, "ROLLBACK SQL");

  // Sprawdzenie INSERT INTO public.players
  const playerInsertMatch =
    /INSERT INTO public\.players\s*\(\s*id,\s*display_name,\s*active\s*\)\s*VALUES\s*\(\s*'([0-9a-f-]+)'::uuid,\s*'([^']+)',\s*(true|false)\s*\)/i.exec(
      insertSql
    );
  assert.ok(playerInsertMatch, "Brak poprawnego INSERT INTO public.players.");
  assert.equal(playerInsertMatch[1], E2E_TEST_PLAYER_ID);
  assert.equal(playerInsertMatch[2], E2E_TEST_PLAYER_NAME);
  assert.equal(playerInsertMatch[3].toLowerCase(), "false");

  // Sprawdzenie dokładnych 5 krotek INSERT INTO public.card_definitions
  const cardsSectionMatch =
    /INSERT INTO public\.card_definitions\s*\(\s*id,\s*player_id,\s*season,\s*card_type,\s*card_name,\s*title,\s*rarity,\s*is_active\s*\)\s*VALUES([\s\S]*?);/i.exec(
      insertSql
    );
  assert.ok(cardsSectionMatch, "Brak poprawnego INSERT INTO public.card_definitions.");

  const rowRe =
    /\(\s*'([0-9a-f-]+)'::uuid,\s*'([0-9a-f-]+)'::uuid,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(true|false)\s*\)/gi;
  const parsedRows = Array.from(cardsSectionMatch[1].matchAll(rowRe)).map(m => ({
    id: m[1],
    player_id: m[2],
    season: m[3],
    card_type: m[4],
    card_name: m[5],
    title: m[6],
    rarity: m[7],
    is_active: m[8].toLowerCase() === "true"
  }));

  assert.equal(parsedRows.length, 5, "INSERT card_definitions musi mieć dokładnie 5 wierszy.");
  assert.deepEqual(
    parsedRows.map(r => r.id),
    Array.from(E2E_TEST_CARD_IDS),
    "UUID kart w INSERT muszą dokładnie odpowiadać E2E_TEST_CARD_IDS."
  );

  const rareRow = parsedRows.find(r => r.rarity === "rare");
  assert.ok(rareRow, "Brak wiersza o rarity='rare'.");
  assert.equal(rareRow.id, "e2e57000-0002-4e2e-8000-000000000002");

  const uniqueTuples = new Set(parsedRows.map(r => `${r.player_id}::${r.season}::${r.card_type}`));
  assert.equal(uniqueTuples.size, 5, "Wszystkie krotki (player_id, season, card_type) muszą być unikalne.");
  assert.ok(parsedRows.every(r => r.player_id === E2E_TEST_PLAYER_ID && r.is_active === true));
  assert.deepEqual(
    parsedRows.map(r => r.rarity),
    ["common", "rare", "epic", "legendary", "inferno"]
  );

  // Sprawdzenie wymogów ROLLBACK SQL
  for (const cardId of E2E_TEST_CARD_IDS) {
    assert.ok(rollbackSql.includes(`'${cardId}'`), `ROLLBACK musi zawierać UUID karty ${cardId}.`);
  }
  assert.ok(rollbackSql.includes(`'${E2E_TEST_PLAYER_ID}'`), "ROLLBACK musi zawierać UUID gracza E2E.");
  assert.match(rollbackSql, /FROM\s+pg_constraint\s+c[\s\S]*confrelid\s+IN\s*\('public\.card_definitions'::regclass,\s*'public\.players'::regclass\)/i);
  assert.match(rollbackSql, /FROM\s+public\.parent_players\s+WHERE\s+player_id\s*=\s*v_player_id/i);
  assert.match(rollbackSql, /pack_opening_logs[\s\S]*jsonb_array_elements[\s\S]*ROLLBACK_ABORTED/i);
  assert.match(rollbackSql, /IF\s+v_deleted_cards\s*<>\s*5\s+THEN[\s\S]*RAISE EXCEPTION 'ROLLBACK_ABORTED/i);
  assert.match(rollbackSql, /IF\s+v_deleted_players\s*<>\s*1\s+THEN[\s\S]*RAISE EXCEPTION 'ROLLBACK_ABORTED/i);
  assert.match(rollbackSql, /v_remaining_players\s*<>\s*3/i);
  assert.match(rollbackSql, /DELETE FROM public\.card_definitions\s+WHERE id IN/i);
  assert.match(rollbackSql, /DELETE FROM public\.players\s+WHERE id = v_player_id/i);
});
