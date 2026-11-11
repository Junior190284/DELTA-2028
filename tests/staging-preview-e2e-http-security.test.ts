/**
 * DELTA INFERNO 3.0 — ANIM-1A.5 E2E.3
 * Testy zabezpieczeń izolowanego testera HTTP (tests/staging-preview-e2e-http.ts):
 * - zły project ref Supabase oraz spoofing query/path,
 * - adres produkcyjny (Supabase + Vercel/custom domain + VERCEL_ENV=production),
 * - zakaz przekazywania kluczy/sekretów w argumentach CLI,
 * - brak sesji @supabase/ssr,
 * - nieudane tworzenie konta (zero prób czyszczenia),
 * - przerwany test / awaria w połowie przebiegu (wyłączne sprzątanie konta testowego),
 * - bezpieczne i odporne na błędy sprzątanie (zachowanie danych innych kont),
 * - tryb --dry-run (zero utworzeń, zapisów i usunięć),
 * - brak wycieku sekretów w logach oraz przekazywanie cookies/body przez stdin config w curl.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  applySsrCookiesToJar,
  assertNoSecretsInCliArgs,
  buildCurlStdinConfig,
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
const REAL_OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";

function createMockStagingDb(options?: {
  failCreateUser?: boolean;
  failOneDeleteTable?: string;
}) {
  const users = new Map<string, { id: string; email: string }>([
    [REAL_OTHER_USER_ID, { id: REAL_OTHER_USER_ID, email: "real.parent@delta.pl" }]
  ]);
  const deleteCalls: Array<{ table: string; column: string; value: string }> = [];
  const otherUserPreserved = { cards: 5, packs: 2, dp: 450 };

  const admin = {
    auth: {
      admin: {
        async createUser({ email }: { email: string }) {
          if (options?.failCreateUser) {
            return { data: { user: null }, error: { message: "Auth createUser failed" } };
          }
          const id = "11111111-1111-4111-8111-111111111111";
          users.set(id, { id, email });
          return { data: { user: { id, email } }, error: null };
        },
        async deleteUser(id: string) {
          users.delete(id);
          return { data: {}, error: null };
        }
      }
    },
    from(table: string) {
      return {
        async upsert() {
          return { error: null };
        },
        delete() {
          return {
            async eq(column: string, value: string) {
              deleteCalls.push({ table, column, value });
              if (options?.failOneDeleteTable === table) {
                return { error: { message: `Simulated delete failure on ${table}` } };
              }
              return { error: null };
            }
          };
        }
      };
    }
  };

  return { admin, users, deleteCalls, otherUserPreserved };
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
          PREVIEW_URL: VALID_PREVIEW_URL,
          NEXT_PUBLIC_SUPABASE_URL: "https://fctgruvciakhohfxkdzp.supabase.co",
          SUPABASE_SECRET_KEY: SECRET_SERVICE,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
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
        env: {
          VERCEL_ENV: "production",
          PREVIEW_URL: VALID_PREVIEW_URL,
          NEXT_PUBLIC_SUPABASE_URL: VALID_STAGING_URL,
          SUPABASE_SECRET_KEY: SECRET_SERVICE,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
        }
      }),
    /VERCEL_ENV=production/
  );
});

test("3. Zakaz przekazywania kluczy API w argumentach CLI oraz przekazywanie cookies przez stdin config", () => {
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

  const cfg = buildCurlStdinConfig({
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "sb-test=base64-abc" },
    body: { pack_type_id: "standard_pack" },
    timeoutMs: 30_000
  });
  assert.match(cfg, /header = "Cookie: sb-test=base64-abc"/);
  assert.match(cfg, /data-raw = "\{\\"pack_type_id\\":\\"standard_pack\\"\}"/);
});

test("4. Brak sesji @supabase/ssr przerywa test przed wysłaniem requestów i sprząta utworzone konto", async () => {
  const { admin, users, deleteCalls } = createMockStagingDb();
  let requestsSent = 0;

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: {
          PREVIEW_URL: VALID_PREVIEW_URL,
          NEXT_PUBLIC_SUPABASE_URL: VALID_STAGING_URL,
          SUPABASE_SECRET_KEY: SECRET_SERVICE,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
        },
        registerSignalHandlers: false,
        createAdminClientFn: () => admin,
        createSsrClientFn: () => ({
          auth: {
            async signInWithPassword() {
              // Symuluje brak wyemitowania ciasteczka przez SSR
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
  assert.equal(users.has("11111111-1111-4111-8111-111111111111"), false);
  assert.equal(users.has(REAL_OTHER_USER_ID), true);
  assert.ok(deleteCalls.length > 0);
  assert.ok(deleteCalls.every(c => c.value === "11111111-1111-4111-8111-111111111111"));
});

test("5. Nieudane tworzenie konta przerywa natychmiast bez wykonywania jakichkolwiek zapytań DELETE", async () => {
  const { admin, users, deleteCalls } = createMockStagingDb({ failCreateUser: true });

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: {
          PREVIEW_URL: VALID_PREVIEW_URL,
          NEXT_PUBLIC_SUPABASE_URL: VALID_STAGING_URL,
          SUPABASE_SECRET_KEY: SECRET_SERVICE,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
        },
        registerSignalHandlers: false,
        createAdminClientFn: () => admin
      }),
    /Auth createUser failed/
  );

  assert.equal(deleteCalls.length, 0);
  assert.equal(users.has(REAL_OTHER_USER_ID), true);
});

test("6. Przerwany test (błąd krytyczny lub sieciowy w trakcie) nadal bezpiecznie sprząta WYŁĄCZNIE konto testowe", async () => {
  // Wariant A: wyjątek krytyczny przerywający cały przebieg (awaria inicjalizacji po utworzeniu konta i testach UNAUTH)
  const dbFatal = createMockStagingDb({ failOneDeleteTable: "user_cards" });
  const origFrom = dbFatal.admin.from.bind(dbFatal.admin);
  dbFatal.admin.from = (table: string) => {
    if (table === "user_delta_points") {
      return {
        async upsert() {
          throw new Error(`Fatal network interruption mid-run secret=${SECRET_SERVICE}`);
        },
        delete: origFrom(table).delete
      };
    }
    return origFrom(table);
  };

  await assert.rejects(
    () =>
      runPreviewHttpE2ESuite({
        argv: ["node", "script.ts", "--execute-preview-http"],
        env: {
          PREVIEW_URL: VALID_PREVIEW_URL,
          NEXT_PUBLIC_SUPABASE_URL: VALID_STAGING_URL,
          SUPABASE_SECRET_KEY: SECRET_SERVICE,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
        },
        registerSignalHandlers: false,
        createAdminClientFn: () => dbFatal.admin,
        createSsrClientFn: (_u, _k, adapter) => ({
          auth: {
            async signInWithPassword() {
              adapter.setAll([{ name: "sb-tdlsxamxtygojxhmjjvp-auth-token", value: "base64-mocktoken" }]);
              return { data: { session: {} }, error: null };
            }
          }
        }),
        sendRequestFn: async () => ({ status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" })
      }),
    /Fatal network interruption mid-run/
  );
  assert.equal(dbFatal.users.has("11111111-1111-4111-8111-111111111111"), false);
  assert.equal(dbFatal.users.has(REAL_OTHER_USER_ID), true);
  assert.ok(dbFatal.deleteCalls.length > 0);
  assert.ok(dbFatal.deleteCalls.every(c => c.value === "11111111-1111-4111-8111-111111111111"));

  // Wariant B: błąd/timeout żądania HTTP w trakcie przypadków testowych oraz awaria jednej tabeli w cleanup
  const db2 = createMockStagingDb({ failOneDeleteTable: "user_cards" });
  const result = await runPreviewHttpE2ESuite({
    argv: ["node", "script.ts", "--execute-preview-http"],
    env: {
      PREVIEW_URL: VALID_PREVIEW_URL,
      NEXT_PUBLIC_SUPABASE_URL: VALID_STAGING_URL,
      SUPABASE_SECRET_KEY: SECRET_SERVICE,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SECRET_PUB
    },
    registerSignalHandlers: false,
    createAdminClientFn: () => db2.admin,
    createSsrClientFn: (_u, _k, adapter) => ({
      auth: {
        async signInWithPassword() {
          adapter.setAll([{ name: "sb-tdlsxamxtygojxhmjjvp-auth-token", value: "base64-mocktoken" }]);
          return { data: { session: {} }, error: null };
        }
      }
    }),
    sendRequestFn: async ({ path }) => {
      if (path === "/api/cards/buy-pack") {
        throw new Error(`timeout hitting ${path} key=${SECRET_SERVICE}`);
      }
      return { status: 401, data: { error: "Wymagane logowanie" }, rawText: "{}" };
    }
  });

  assert.ok(result.failed > 0);
  assert.equal(result.cleanup?.executed, true);
  assert.equal(result.cleanup?.authUserDeleted, true);
  assert.equal(db2.users.has("11111111-1111-4111-8111-111111111111"), false);
  assert.equal(db2.users.has(REAL_OTHER_USER_ID), true);
  assert.ok(db2.deleteCalls.every(c => c.value === "11111111-1111-4111-8111-111111111111"));
  assert.ok(db2.deleteCalls.some(c => c.table === "profiles" && c.column === "id"));

  // Dodatkowa weryfikacja odmowy czyszczenia konta niesyntetycznego:
  const foreignUser = {
    id: REAL_OTHER_USER_ID,
    email: "real.parent@delta.pl",
    createdByThisRun: true
  } as CreatedSyntheticUser;
  const blockedCleanup = await cleanupIsolatedTestUser({ admin: db2.admin, createdUser: foreignUser });
  assert.equal(blockedCleanup.executed, false);
  assert.match(blockedCleanup.errors[0], /ABORT_CLEANUP/);
  assert.equal(db2.users.has(REAL_OTHER_USER_ID), true);
});

test("7. Tryb --dry-run nie tworzy użytkownika, nie wykonuje zapisów/usunięć/HTTP i zwraca plan", async () => {
  let adminCalled = false;
  let ssrCalled = false;
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
    createSsrClientFn: () => {
      ssrCalled = true;
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
  assert.equal(ssrCalled, false);
  assert.equal(httpCalled, false);
  assert.ok((res.dryRunReport?.plannedOperations.length || 0) >= 8);
  assert.ok(res.dryRunReport?.plannedCleanupQueries.every(q => q.includes("<testUserId>")));
});

test("8. Redakcja sekretów i obsługa usuwania/aktualizacji chunkowanych ciasteczek @supabase/ssr", () => {
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
