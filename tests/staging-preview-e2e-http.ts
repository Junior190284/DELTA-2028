/**
 * DELTA INFERNO 3.0 — ANIM-1A.5 E2E HTTP STAGING TESTER (HARDENED)
 * Izolowane testy HTTP przeciwko chronionemu wdrożeniu Vercel Preview
 * z rzeczywistą sesją Supabase Staging (tdlsxamxtygojxhmjjvp).
 *
 * ZABEZPIECZENIA:
 * 1. Domyślnie przerywa bez operacji, chyba że jawnie podano `--dry-run` lub `--execute-preview-http`.
 * 2. Twarda walidacja hosta Supabase (`^tdlsxamxtygojxhmjjvp\.supabase\.co$`, blokada `fctgruvciakhohfxkdzp`).
 * 3. Twarda walidacja `PREVIEW_URL` (HTTPS na preview `delta-2028-*.vercel.app` lub loopback, blokada domeny prod).
 * 4. Zakaz przekazywania kluczy API/tokenów w argumentach CLI; odczyt wyłącznie z `process.env`.
 * 5. Ciasteczka `@supabase/ssr` i JSON body w `--use-vercel-curl` przekazywane przez `stdin` (`curl --config -`).
 * 6. Idempotentne, odporne na przerwania (`finally` + `SIGINT`/`SIGTERM`) czyszczenie WYŁĄCZNIE konta
 *    utworzonego w tym przebiegu (`^e2e-http-\d+-[a-z0-9-]+@staging\.delta\.local$`).
 *
 * Przykłady użycia:
 *   Dry-run (bez logowania/zapisów):
 *     node --experimental-strip-types tests/staging-preview-e2e-http.ts --dry-run --preview-url=https://delta-2028-amzu0zdpp-tomaszrybacki-3187s-projects.vercel.app --supabase-url=https://tdlsxamxtygojxhmjjvp.supabase.co
 *
 *   Wykonanie E2E (z autoryzowanym `vercel login`):
 *     node --env-file=.env.local --experimental-strip-types tests/staging-preview-e2e-http.ts --execute-preview-http --use-vercel-curl --preview-url=https://delta-2028-amzu0zdpp-tomaszrybacki-3187s-projects.vercel.app
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const STAGING_PROJECT_ID = "tdlsxamxtygojxhmjjvp";
export const PRODUCTION_PROJECT_ID = "fctgruvciakhohfxkdzp";
export const DEFAULT_HTTP_TIMEOUT_MS = 30_000;
export const SYNTHETIC_TEST_EMAIL_RE = /^e2e-http-\d+-[a-z0-9-]+@staging\.delta\.local$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DISALLOWED_CLI_SECRET_FLAGS = [
  "--secret",
  "--service-role",
  "--service-key",
  "--supabase-key",
  "--anon-key",
  "--publishable-key",
  "--apikey",
  "--api-key",
  "--password",
  "--token",
  "--protection-bypass",
  "--cookie"
];

export interface HttpResponse {
  status: number;
  data: any;
  rawText: string;
}

export interface CreatedSyntheticUser {
  id: string;
  email: string;
  createdByThisRun: true;
}

export interface CleanupTableSpec {
  table: string;
  column: "user_id" | "admin_id" | "id";
}

export const USER_CLEANUP_STEPS: readonly CleanupTableSpec[] = [
  { table: "pack_opening_logs", column: "user_id" },
  { table: "delta_points_transactions", column: "user_id" },
  { table: "user_cards", column: "user_id" },
  { table: "user_unopened_packs", column: "user_id" },
  { table: "user_delta_points", column: "user_id" },
  { table: "user_daily_spins", column: "user_id" },
  { table: "user_quiz_completions", column: "user_id" },
  { table: "user_claimed_challenges", column: "user_id" },
  { table: "user_claimed_rewards", column: "user_id" },
  { table: "admin_card_grants", column: "user_id" },
  { table: "admin_card_grants", column: "admin_id" },
  { table: "profiles", column: "id" }
];

export interface CleanupResult {
  executed: boolean;
  deletedUserId: string | null;
  stepsExecuted: number;
  authUserDeleted: boolean;
  errors: string[];
}

export interface DryRunReport {
  mode: "dry-run";
  previewUrl: string;
  supabaseProjectRef: string;
  useVercelCurl: boolean;
  envStatus: {
    NEXT_PUBLIC_SUPABASE_URL: "SET" | "MISSING";
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "SET" | "MISSING";
    SUPABASE_SECRET_KEY_OR_SERVICE_ROLE: "SET" | "MISSING";
    VERCEL_PROTECTION_BYPASS: "SET" | "UNSET";
  };
  createdUsers: 0;
  writesExecuted: 0;
  deletesExecuted: 0;
  httpRequestsExecuted: 0;
  plannedOperations: string[];
  plannedCleanupQueries: string[];
}

export interface E2ERunResult {
  mode: "execute" | "dry-run" | "safeguard";
  passed: number;
  failed: number;
  cleanup?: CleanupResult;
  dryRunReport?: DryRunReport;
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function redactSecrets(text: string, secrets: Array<string | undefined | null>): string {
  let out = text;
  for (const s of secrets) {
    if (typeof s === "string" && s.length >= 6) {
      out = out.split(s).join("[REDACTED]");
    }
  }
  out = out.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(\.[A-Za-z0-9_-]*)?/g, "[REDACTED_JWT]");
  out = out.replace(/sb_(secret|publishable)_[A-Za-z0-9_-]+/gi, "[REDACTED_SB_KEY]");
  return out;
}

export function assertNoSecretsInCliArgs(argv: readonly string[]): void {
  for (const rawArg of argv) {
    const arg = String(rawArg || "");
    const lower = arg.toLowerCase();
    for (const forbidden of DISALLOWED_CLI_SECRET_FLAGS) {
      if (lower === forbidden || lower.startsWith(`${forbidden}=`)) {
        throw new Error(
          `CRITICAL ABORT: Zabronione przekazywanie sekretów/kluczy w argumentach CLI (${forbidden}). Używaj wyłącznie zmiennych środowiskowych.`
        );
      }
    }
    if (/eyJ[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]+/i.test(arg)) {
      throw new Error(
        "CRITICAL ABORT: Wykryto surowy token lub klucz API w argumentach wiersza poleceń."
      );
    }
  }
}

export function validateSupabaseStagingUrl(rawUrl: string): { normalizedOrigin: string; projectRef: string } {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL w procesie.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("CRITICAL ABORT: Niepoprawny format URL Supabase.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`CRITICAL ABORT: Supabase URL musi używać HTTPS (otrzymano ${parsed.protocol}).`);
  }
  if (parsed.username || parsed.password) {
    throw new Error("CRITICAL ABORT: Supabase URL nie może zawierać poświadczeń.");
  }
  if (trimmed.includes(PRODUCTION_PROJECT_ID) || parsed.hostname.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error(`CRITICAL ABORT: Wykryto projekt produkcyjny (${PRODUCTION_PROJECT_ID})!`);
  }

  const hostMatch = /^([a-z0-9-]+)\.supabase\.co$/i.exec(parsed.hostname);
  if (!hostMatch) {
    throw new Error(`CRITICAL ABORT: Host '${parsed.hostname}' nie jest prawidłową domeną *.supabase.co.`);
  }

  const projectRef = hostMatch[1].toLowerCase();
  if (projectRef !== STAGING_PROJECT_ID) {
    throw new Error(
      `CRITICAL ABORT: Nieprawidłowy project ref '${projectRef}'. Oczekiwano wyłącznie Staging (${STAGING_PROJECT_ID}).`
    );
  }

  return { normalizedOrigin: parsed.origin, projectRef };
}

export function validatePreviewUrl(rawUrl: string): URL {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    throw new Error("Wymagany adres PREVIEW_URL (np. https://delta-2028-...vercel.app).");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("CRITICAL ABORT: Niepoprawny format PREVIEW_URL.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("CRITICAL ABORT: PREVIEW_URL nie może zawierać poświadczeń.");
  }

  const host = parsed.hostname.toLowerCase();
  if (host.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error(`CRITICAL ABORT: Host '${host}' wskazuje projekt produkcyjny.`);
  }

  const isLoopback = host === "localhost" || host === "127.0.0.1";
  if (isLoopback) {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`CRITICAL ABORT: Nieobsługiwany protokół dla localhost: ${parsed.protocol}`);
    }
    return parsed;
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`CRITICAL ABORT: Zdalny PREVIEW_URL musi używać HTTPS (otrzymano ${parsed.protocol}).`);
  }

  if (!host.endsWith(".vercel.app")) {
    throw new Error(
      `CRITICAL ABORT: Host '${host}' może być domeną produkcyjną (dozwolone wyłącznie preview *.vercel.app lub localhost).`
    );
  }

  if (host === "delta-2028.vercel.app" || !/^delta-2028-[a-z0-9.-]+\.vercel\.app$/.test(host)) {
    throw new Error(
      `CRITICAL ABORT: Host '${host}' nie odpowiada wdrożeniu Preview delta-2028-<hash>.vercel.app.`
    );
  }

  return parsed;
}

export function buildCookieHeader(cookieMap: Map<string, string>): string {
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function applySsrCookiesToJar(
  cookieJar: Map<string, string>,
  cookiesToSet: Array<{ name: string; value: string; options?: { maxAge?: number } }>
): void {
  for (const { name, value, options } of cookiesToSet) {
    if (!name) continue;
    if (value === "" || options?.maxAge === 0) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
}

export function escapeCurlConfigValue(val: string): string {
  return val
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

export function buildCurlStdinConfig(options: {
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
}): string {
  const lines: string[] = [
    `request = "${options.method}"`,
    `max-time = "${Math.max(1, Math.ceil(options.timeoutMs / 1000))}"`,
    `write-out = "\\n__HTTP_STATUS__:%{http_code}"`
  ];
  for (const [k, v] of Object.entries(options.headers)) {
    lines.push(`header = "${escapeCurlConfigValue(`${k}: ${v}`)}"`);
  }
  if (options.method === "POST" && options.body !== undefined) {
    lines.push(`data-raw = "${escapeCurlConfigValue(JSON.stringify(options.body))}"`);
  }
  return `${lines.join("\n")}\n`;
}

function resolveVercelCmd(env: Record<string, string | undefined>): string {
  if (env.VERCEL_BIN && env.VERCEL_BIN.trim()) {
    return env.VERCEL_BIN.trim();
  }
  return process.platform === "win32" ? "vercel.cmd" : "vercel";
}

export function parseHttpStatusAndBody(stdout: string): HttpResponse {
  const marker = "\n__HTTP_STATUS__:";
  const idx = stdout.lastIndexOf(marker);
  if (idx === -1) {
    throw new Error("Brak statusu HTTP w odpowiedzi transportu Preview.");
  }
  const rawText = stdout.slice(0, idx);
  const statusStr = stdout.slice(idx + marker.length).trim();
  const status = Number.parseInt(statusStr, 10);
  assert.ok(Number.isFinite(status), `Nieprawidłowy kod HTTP: ${statusStr}`);

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }
  return { status, data, rawText };
}

export async function cleanupIsolatedTestUser(params: {
  admin: any;
  createdUser: CreatedSyntheticUser | null;
}): Promise<CleanupResult> {
  const { admin, createdUser } = params;
  const result: CleanupResult = {
    executed: false,
    deletedUserId: null,
    stepsExecuted: 0,
    authUserDeleted: false,
    errors: []
  };

  if (!createdUser) {
    return result;
  }

  if (createdUser.createdByThisRun !== true) {
    result.errors.push("ABORT_CLEANUP: Konto nie zostało utworzone w bieżącym przebiegu testowym.");
    return result;
  }
  if (!isValidUuid(createdUser.id)) {
    result.errors.push("ABORT_CLEANUP: Nieprawidłowy identyfikator UUID konta testowego.");
    return result;
  }
  if (!SYNTHETIC_TEST_EMAIL_RE.test(createdUser.email)) {
    result.errors.push("ABORT_CLEANUP: Adres e-mail konta nie pasuje do syntetycznego wzorca testowego.");
    return result;
  }

  result.executed = true;
  result.deletedUserId = createdUser.id;

  for (const step of USER_CLEANUP_STEPS) {
    try {
      const res = await admin
        .from(step.table)
        .delete()
        .eq(step.column, createdUser.id);
      result.stepsExecuted++;
      if (res?.error) {
        result.errors.push(`${step.table}.${step.column}: ${res.error.message || "delete error"}`);
      }
    } catch (err: any) {
      result.errors.push(`${step.table}.${step.column}: ${err?.message || "unexpected error"}`);
    }
  }

  try {
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(createdUser.id);
    if (delAuthErr) {
      result.errors.push(`auth.users: ${delAuthErr.message || "deleteUser failed"}`);
    } else {
      result.authUserDeleted = true;
    }
  } catch (err: any) {
    result.errors.push(`auth.users: ${err?.message || "deleteUser threw"}`);
  }

  return result;
}

export interface StagingPreviewDeps {
  argv?: readonly string[];
  env?: Record<string, string | undefined>;
  createAdminClientFn?: (url: string, key: string) => any;
  createSsrClientFn?: (url: string, key: string, cookiesAdapter: any) => any;
  sendRequestFn?: (options: {
    previewUrl: string;
    path: string;
    method: "GET" | "POST";
    body?: unknown;
    useVercelCurl: boolean;
    supabaseCookies?: Map<string, string>;
    extraHeaders?: Record<string, string>;
    timeoutMs?: number;
  }) => Promise<HttpResponse>;
  fetchFn?: typeof fetch;
  spawnSyncFn?: typeof spawnSync;
  timeoutMs?: number;
  registerSignalHandlers?: boolean;
}

function getArgValue(argv: readonly string[], prefix: string): string {
  const hit = argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : "";
}

export function buildDryRunReport(params: {
  previewUrl: string;
  projectRef: string;
  useVercelCurl: boolean;
  env: Record<string, string | undefined>;
}): DryRunReport {
  const hasSecret = Boolean(
    (params.env.SUPABASE_SECRET_KEY || params.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  );
  return {
    mode: "dry-run",
    previewUrl: params.previewUrl,
    supabaseProjectRef: params.projectRef,
    useVercelCurl: params.useVercelCurl,
    envStatus: {
      NEXT_PUBLIC_SUPABASE_URL: params.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        params.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || params.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? "SET"
          : "MISSING",
      SUPABASE_SECRET_KEY_OR_SERVICE_ROLE: hasSecret ? "SET" : "MISSING",
      VERCEL_PROTECTION_BYPASS: params.env.VERCEL_PROTECTION_BYPASS ? "SET" : "UNSET"
    },
    createdUsers: 0,
    writesExecuted: 0,
    deletesExecuted: 0,
    httpRequestsExecuted: 0,
    plannedOperations: [
      "1. Walidacja targetu (Supabase ref === tdlsxamxtygojxhmjjvp, Preview HTTPS delta-2028-*.vercel.app lub localhost).",
      "2. Utworzenie wyłącznie syntetycznego konta testowego e2e-http-<ts>-<nonce>@staging.delta.local + profilu parent.",
      "3. Logowanie przez @supabase/ssr signInWithPassword -> zapis ciasteczek wyłącznie w pamięci (cookieJar).",
      "4. Testy POST bez sesji Supabase (oczekiwane 401): open-pack, buy-pack, daily-spin, challenges, quests, quiz.",
      "5. Preflight GET /api/admin/health-check (database=OK, auth=OK, environment=preview) + GET /api/cards/collection (anon=0 kart/paczek).",
      "6. Testy z sesją: GET /api/auth/status, GET /api/cards/collection (6 packDefinitions), POST buy-pack (400 brak salda, 200 zakup 60 DP, 200 replay, 409 konflikt idempotencji).",
      "7. Testy otwierania: POST open-pack (200 otwarcie, 200 replay przy 0 paczek, 409 ALREADY_OPENED z nowym kluczem, 400 NO_UNOPENED_PACK), weryfikacja GET /api/cards/collection.",
      "8. Testy nagród i uprawnień: POST daily-spin (200 -> 429), challenges (400/404), quests (200 30 DP -> 409), quiz (<75% 0 DP, 100% 50 DP, replay alreadyClaimed), grant-special (403).",
      "9. Idempotentne czyszczenie w finally (oraz przy SIGINT/SIGTERM) powiązane wyłącznie z testUserId."
    ],
    plannedCleanupQueries: [
      ...USER_CLEANUP_STEPS.map(s => `DELETE FROM public.${s.table} WHERE ${s.column} = <testUserId>`),
      "auth.admin.deleteUser(<testUserId>)"
    ]
  };
}

export async function runPreviewHttpE2ESuite(deps: StagingPreviewDeps = {}): Promise<E2ERunResult> {
  const argv = deps.argv ?? process.argv;
  const env = deps.env ?? process.env;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;

  assertNoSecretsInCliArgs(argv);

  const isDryRun = argv.includes("--dry-run");
  const isExecute = argv.includes("--execute-preview-http");

  if (!isDryRun && !isExecute) {
    console.log(
      "SAFEGUARD: Podaj --dry-run (podgląd planu bez zapisów) lub --execute-preview-http (uruchomienie E2E). Przerwano."
    );
    return { mode: "safeguard", passed: 0, failed: 0 };
  }

  if (env.VERCEL_ENV === "production") {
    throw new Error("CRITICAL ABORT: Skrypt nie może zostać uruchomiony w środowisku VERCEL_ENV=production.");
  }

  const useVercelCurl = argv.includes("--use-vercel-curl");
  const rawPreviewUrl = (env.PREVIEW_URL || getArgValue(argv, "--preview-url=")).trim();
  const parsedPreview = validatePreviewUrl(rawPreviewUrl);

  const rawSupabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || getArgValue(argv, "--supabase-url=")).trim();
  const { normalizedOrigin: supabaseOrigin, projectRef } = validateSupabaseStagingUrl(rawSupabaseUrl);

  if (isDryRun) {
    const report = buildDryRunReport({
      previewUrl: parsedPreview.origin,
      projectRef,
      useVercelCurl,
      env
    });
    console.log("=== DRY-RUN REPORT (NO USERS CREATED, NO WRITES, NO DELETES) ===");
    console.log(JSON.stringify(report, null, 2));
    return { mode: "dry-run", passed: 0, failed: 0, dryRunReport: report };
  }

  const serviceSecret = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const publishableKey = (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!serviceSecret || !publishableKey) {
    throw new Error("Brak wymaganych zmiennych środowiskowych Supabase w procesie.");
  }

  const secretBag: Array<string | undefined> = [
    serviceSecret,
    publishableKey,
    env.VERCEL_PROTECTION_BYPASS
  ];

  const extraHeaders: Record<string, string> = {};
  if (env.VERCEL_PROTECTION_BYPASS) {
    extraHeaders["x-vercel-protection-bypass"] = env.VERCEL_PROTECTION_BYPASS;
  }

  const defaultFetch = deps.fetchFn ?? fetch;
  const defaultSpawn = deps.spawnSyncFn ?? spawnSync;

  const sendPreviewRequest =
    deps.sendRequestFn ??
    (async (options: {
      previewUrl: string;
      path: string;
      method: "GET" | "POST";
      body?: unknown;
      useVercelCurl: boolean;
      supabaseCookies?: Map<string, string>;
      extraHeaders?: Record<string, string>;
      timeoutMs?: number;
    }): Promise<HttpResponse> => {
      const targetUrl = new URL(options.path, options.previewUrl).toString();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.extraHeaders || {})
      };

      if (options.supabaseCookies && options.supabaseCookies.size > 0) {
        headers["Cookie"] = buildCookieHeader(options.supabaseCookies);
      }

      const reqTimeout = options.timeoutMs ?? timeoutMs;

      if (options.useVercelCurl) {
        const curlConfig = buildCurlStdinConfig({
          method: options.method,
          headers,
          body: options.body,
          timeoutMs: reqTimeout
        });

        const res = defaultSpawn(
          resolveVercelCmd(env),
          ["curl", targetUrl, "--", "-sS", "--config", "-"],
          {
            encoding: "utf8",
            shell: process.platform === "win32",
            input: curlConfig,
            timeout: reqTimeout + 5_000
          }
        );

        if (res.error) {
          const isTimeout = (res.error as NodeJS.ErrnoException).code === "ETIMEDOUT";
          throw new Error(
            isTimeout
              ? `Przekroczono limit czasu (${reqTimeout}ms) podczas wywołania vercel curl.`
              : `Nie udało się uruchomić vercel curl: ${redactSecrets(res.error.message, secretBag)}`
          );
        }
        if (res.status !== 0) {
          throw new Error(
            `vercel curl zakończył się kodem ${res.status} (sprawdź autoryzację vercel login lub ważność sesji Preview).`
          );
        }
        return parseHttpStatusAndBody(res.stdout || "");
      }

      try {
        const resp = await defaultFetch(targetUrl, {
          method: options.method,
          headers,
          body: options.method === "POST" && options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(reqTimeout)
        });
        const rawText = await resp.text();
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }
        return { status: resp.status, data, rawText };
      } catch (err: any) {
        if (err?.name === "TimeoutError" || err?.name === "AbortError") {
          throw new Error(`HTTP timeout (${reqTimeout}ms) dla ${options.method} ${options.path}.`);
        }
        throw new Error(redactSecrets(err?.message || "Błąd sieciowy żądania Preview", secretBag));
      }
    });

  const admin =
    deps.createAdminClientFn?.(supabaseOrigin, serviceSecret) ??
    createClient(supabaseOrigin, serviceSecret, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

  const cookieJar = new Map<string, string>();
  const ssrClient =
    deps.createSsrClientFn?.(supabaseOrigin, publishableKey, {
      getAll() {
        return Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: { maxAge?: number } }>) {
        applySsrCookiesToJar(cookieJar, cookiesToSet);
      }
    }) ??
    createServerClient(supabaseOrigin, publishableKey, {
      cookies: {
        getAll() {
          return Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          applySsrCookiesToJar(cookieJar, cookiesToSet);
        }
      }
    });

  let createdUser: CreatedSyntheticUser | null = null;
  let cleanupPromise: Promise<CleanupResult> | null = null;
  let abortedBySignal = false;
  const controller = new AbortController();

  const runCleanupOnce = (): Promise<CleanupResult> => {
    if (!cleanupPromise) {
      cleanupPromise = cleanupIsolatedTestUser({ admin, createdUser }).finally(() => {
        cookieJar.clear();
      });
    }
    return cleanupPromise;
  };

  const onSignal = (sig: string) => {
    abortedBySignal = true;
    controller.abort(new Error(`Przerwano test sygnałem ${sig}`));
    void runCleanupOnce();
  };

  if (deps.registerSignalHandlers !== false) {
    process.once("SIGINT", () => onSignal("SIGINT"));
    process.once("SIGTERM", () => onSignal("SIGTERM"));
  }

  let passed = 0;
  let failed = 0;
  const previewOrigin = parsedPreview.origin;

  const runCase = async (label: string, fn: () => Promise<void>) => {
    if (abortedBySignal || controller.signal.aborted) {
      throw new Error("Test przerwany sygnałem użytkownika.");
    }
    try {
      await fn();
      console.log(`PASS: ${label}`);
      passed++;
    } catch (err: any) {
      const safeMsg = redactSecrets(err?.message || String(err), secretBag);
      console.error(`FAIL: ${label} ->`, safeMsg);
      failed++;
    }
  };

  let finalCleanup: CleanupResult | undefined;

  try {
    // 1. Utworzenie wyłącznie izolowanego użytkownika testowego na Stagingu
    const testEmail = `e2e-http-${Date.now()}-${randomUUID().slice(0, 8)}@staging.delta.local`;
    const testPassword = `${randomBytes(18).toString("base64url")}!9Aa`;
    secretBag.push(testPassword);

    const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (authErr || !createdAuth?.user?.id) {
      throw new Error(
        `Nie udało się utworzyć izolowanego konta na stagingu: ${redactSecrets(
          authErr?.message || "brak user.id",
          secretBag
        )}`
      );
    }

    if (!isValidUuid(createdAuth.user.id)) {
      throw new Error("CRITICAL ABORT: Utworzone konto testowe ma nieprawidłowe UUID.");
    }

    createdUser = {
      id: createdAuth.user.id,
      email: createdAuth.user.email || testEmail,
      createdByThisRun: true
    };
    const testUserId = createdUser.id;

    const { error: profErr } = await admin.from("profiles").upsert(
      { id: testUserId, display_name: "E2E HTTP TESTER", role: "parent" },
      { onConflict: "id" }
    );
    if (profErr) {
      throw new Error(`Nie udało się utworzyć profilu testowego: ${profErr.message}`);
    }

    // 2. Rzeczywista sesja Supabase SSR i weryfikacja obecności ciasteczek w cookieJar
    const { error: signInErr } = await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    if (signInErr) {
      throw new Error(`Nie udało się zalogować konta testowego: ${redactSecrets(signInErr.message, secretBag)}`);
    }

    // @supabase/ssr zapisuje ciasteczka w asynchronicznym callbacku onAuthStateChange
    if (cookieJar.size === 0) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.ok(cookieJar.size > 0, "Klient @supabase/ssr musi wygenerować ciasteczka sesji.");
    for (const cookieVal of cookieJar.values()) {
      secretBag.push(cookieVal);
    }

    // A. Żądania POST bez sesji Supabase -> odmowy 401 z warstwy Next.js
    const unauthEndpoints: Array<[string, Record<string, unknown>]> = [
      ["/api/cards/open-pack", {}],
      ["/api/cards/buy-pack", { pack_type_id: "standard_pack" }],
      ["/api/cards/daily-spin", {}],
      ["/api/cards/challenges", { challengeId: "challenge-five-one-player" }],
      ["/api/quests/claim-reward", { questId: "q-knowledge" }],
      ["/api/knowledge/complete-quiz", { lessonId: "rules-orlik", scorePercent: 100 }]
    ];

    for (const [ep, payload] of unauthEndpoints) {
      await runCase(`UNAUTH POST ${ep} -> 401 z Next.js`, async () => {
        const res = await sendPreviewRequest({
          previewUrl: previewOrigin,
          path: ep,
          method: "POST",
          body: payload,
          useVercelCurl,
          extraHeaders
        });
        assert.equal(res.status, 401, `Oczekiwano 401 na ${ep}, otrzymano ${res.status}`);
        assert.ok(res.data && typeof res.data.error === "string", `Brak pola error w JSON dla ${ep}`);
      });
    }

    // B. Preflight GET /api/admin/health-check, /api/cards/collection (anon vs auth) i /api/auth/status
    await runCase("PREFLIGHT GET /api/admin/health-check sprawdza środowisko i bazę", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/admin/health-check",
        method: "GET",
        useVercelCurl,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.ok(
        res.data?.status === "HEALTHY" || res.data?.status === "DEGRADED",
        `Nieoczekiwany status health-check: ${res.data?.status}`
      );
      assert.equal(res.data?.checks?.database?.status, "OK");
      assert.equal(res.data?.checks?.auth?.status, "OK");
      if (parsedPreview.hostname.endsWith(".vercel.app")) {
        assert.equal(res.data?.environment, "preview");
      }
    });

    await runCase("UNAUTH GET /api/cards/collection zwraca puste dane gracza", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/collection",
        method: "GET",
        useVercelCurl,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.equal(res.data?.userCards?.length ?? -1, 0);
      assert.equal(res.data?.unopenedPacks?.length ?? -1, 0);
      assert.equal(res.data?.deltaPoints, 0);
    });

    await runCase("AUTH GET /api/auth/status potwierdza zalogowaną sesję izolowanego testera", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/auth/status",
        method: "GET",
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.equal(res.data?.authenticated, true);
      assert.equal(res.data?.user_id, testUserId);
    });

    await runCase("AUTH GET /api/cards/collection odczytuje 6 aktywnych pack_definitions i karty ze Stagingu", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/collection",
        method: "GET",
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data?.packDefinitions) && res.data.packDefinitions.length === 6);
      assert.ok(Array.isArray(res.data?.allCards) && res.data.allCards.length > 0);
    });

    // C. Zakup paczek: brak środków, zakup 60 DP, replay i konflikt 409
    const { error: dpErr } = await admin.from("user_delta_points").upsert(
      { user_id: testUserId, points_balance: 100, total_earned: 100, total_spent: 0 },
      { onConflict: "user_id" }
    );
    if (dpErr) {
      throw new Error(`Nie udało się zainicjalizować salda testowego: ${dpErr.message}`);
    }

    const idemBuyKey = `e2e-buy-${Date.now()}`;
    let purchasedPackId = "";

    await runCase("AUTH POST /api/cards/buy-pack odrzuca zakup powyżej salda (150 > 100 DP)", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/buy-pack",
        method: "POST",
        body: { pack_type_id: "gold_booster", idempotency_key: `low-${idemBuyKey}` },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 400);
      assert.equal(res.data?.code, "INSUFFICIENT_BALANCE");
    });

    await runCase("AUTH POST /api/cards/buy-pack realizuje zakup standard_pack (60 DP -> saldo 40)", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/buy-pack",
        method: "POST",
        body: {
          pack_type_id: "standard_pack",
          idempotency_key: idemBuyKey,
          user_id: "00000000-0000-0000-0000-000000000000"
        },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.equal(res.data?.success, true);
      assert.equal(res.data?.remainingPoints, 40);
      assert.equal(res.data?.already_processed, false);
      assert.equal(res.data?.grantedPack?.user_id, testUserId);
      purchasedPackId = res.data?.grantedPack?.id;
      assert.ok(purchasedPackId);
    });

    await runCase("AUTH POST /api/cards/buy-pack ponowiony klucz zwraca already_processed bez podwójnego pobrania", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/buy-pack",
        method: "POST",
        body: { pack_type_id: "standard_pack", idempotency_key: idemBuyKey },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.equal(res.data?.already_processed, true);
      assert.equal(res.data?.remainingPoints, 40);
    });

    await runCase("AUTH POST /api/cards/buy-pack konflikt idempotencji zwraca 409 IDEMPOTENCY_CONFLICT", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/buy-pack",
        method: "POST",
        body: { pack_type_id: "matchday_booster", idempotency_key: idemBuyKey },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 409);
      assert.equal(res.data?.code, "IDEMPOTENCY_CONFLICT");
    });

    // D. Otwarcie kupionej paczki + ponowienie idempotentne + blokady powtórnego otwarcia
    const idemOpenKey = `e2e-open-${Date.now()}`;
    let firstOpenPayload: any = null;

    await runCase("AUTH POST /api/cards/open-pack otwiera kupioną paczkę i zwraca wylosowane karty", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/open-pack",
        method: "POST",
        body: {
          user_unopened_pack_id: purchasedPackId,
          pack_type_id: "standard_pack",
          idempotency_key: idemOpenKey
        },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data?.cards) && res.data.cards.length >= 1);
      firstOpenPayload = res.data;
    });

    await runCase("AUTH POST /api/cards/open-pack ponowny idempotency_key nie otwiera ponownie przy 0 paczek", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/open-pack",
        method: "POST",
        body: {
          user_unopened_pack_id: purchasedPackId,
          pack_type_id: "standard_pack",
          idempotency_key: idemOpenKey
        },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.equal(res.data?.cards?.length, firstOpenPayload?.cards?.length);
    });

    await runCase("AUTH POST /api/cards/open-pack blokuje ponownie tę samą paczkę nowym kluczem (409 ALREADY_OPENED)", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/open-pack",
        method: "POST",
        body: {
          user_unopened_pack_id: purchasedPackId,
          pack_type_id: "standard_pack",
          idempotency_key: `${idemOpenKey}-retry`
        },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 409);
      assert.equal(res.data?.code, "ALREADY_OPENED");
    });

    await runCase("AUTH POST /api/cards/open-pack bez dostępnej paczki zwraca 400 NO_UNOPENED_PACK", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/open-pack",
        method: "POST",
        body: {
          pack_type_id: "standard_pack",
          idempotency_key: `${idemOpenKey}-empty`
        },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 400);
      assert.equal(res.data?.code, "NO_UNOPENED_PACK");
    });

    await runCase("AUTH GET /api/cards/collection widzi zapisane karty po otwarciu paczki", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/collection",
        method: "GET",
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data?.userCards) && res.data.userCards.length >= 1);
      assert.equal(res.data?.unopenedPacks?.length, 0);
    });

    // E. Nagrody i kontrola uprawnień: daily-spin, challenges, quests, quiz, grant-special
    await runCase("AUTH POST /api/cards/daily-spin działa raz dziennie i blokuje 2. próbę kodem 429", async () => {
      const firstSpin = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/daily-spin",
        method: "POST",
        body: {},
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(firstSpin.status, 200);

      const secondSpin = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/daily-spin",
        method: "POST",
        body: {},
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(secondSpin.status, 429);
      assert.equal(secondSpin.data?.canSpin, false);
    });

    await runCase("AUTH POST /api/cards/challenges odrzuca niespełnione wyzwanie (400) oraz nieznane (404)", async () => {
      const unmet = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/challenges",
        method: "POST",
        body: { challengeId: "challenge-five-one-player" },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(unmet.status, 400);

      const unknown = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/challenges",
        method: "POST",
        body: { challengeId: "non-existent-challenge" },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(unknown.status, 404);
    });

    await runCase("AUTH POST /api/quests/claim-reward ignoruje kwotę klienta (30 DP) i blokuje powtórkę (409)", async () => {
      const firstClaim = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/quests/claim-reward",
        method: "POST",
        body: { questId: "q-knowledge", rewardPoints: 99999 },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(firstClaim.status, 200);
      assert.equal(firstClaim.data?.pointsAwarded, 30);

      const secondClaim = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/quests/claim-reward",
        method: "POST",
        body: { questId: "q-knowledge", rewardPoints: 99999 },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(secondClaim.status, 409);
      assert.equal(secondClaim.data?.code, "ALREADY_CLAIMED");
    });

    await runCase("AUTH POST /api/knowledge/complete-quiz płaci stawkę serwerową raz (50 DP) i blokuje powtórkę", async () => {
      const failQuiz = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/knowledge/complete-quiz",
        method: "POST",
        body: { lessonId: "nutrition-power", scorePercent: 50, pointsAwarded: 9999 },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(failQuiz.status, 200);
      assert.equal(failQuiz.data?.passed, false);
      assert.equal(failQuiz.data?.pointsAwarded, 0);

      const passQuiz = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/knowledge/complete-quiz",
        method: "POST",
        body: { lessonId: "rules-orlik", scorePercent: 100, pointsAwarded: 9999 },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(passQuiz.status, 200);
      assert.equal(passQuiz.data?.passed, true);
      assert.equal(passQuiz.data?.pointsAwarded, 50);

      const replayQuiz = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/knowledge/complete-quiz",
        method: "POST",
        body: { lessonId: "rules-orlik", scorePercent: 100 },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(replayQuiz.status, 200);
      assert.equal(replayQuiz.data?.alreadyClaimed, true);
      assert.equal(replayQuiz.data?.pointsAwarded, 0);
    });

    await runCase("AUTH POST /api/cards/grant-special odrzuca zwykłego gracza (403 FORBIDDEN)", async () => {
      const res = await sendPreviewRequest({
        previewUrl: previewOrigin,
        path: "/api/cards/grant-special",
        method: "POST",
        body: { targetUserId: testUserId, cardId: "non-existent", reason: "test" },
        useVercelCurl,
        supabaseCookies: cookieJar,
        extraHeaders
      });
      assert.equal(res.status, 403);
      assert.equal(res.data?.code, "FORBIDDEN");
    });

    console.log(`\n=== PREVIEW HTTP E2E SUMMARY: Passed ${passed}, Failed ${failed} ===`);
    if (failed > 0 && deps.argv === undefined) {
      process.exitCode = 1;
    }
  } finally {
    finalCleanup = await runCleanupOnce();
    if (finalCleanup.errors.length > 0) {
      console.error("CLEANUP WARNINGS:", redactSecrets(finalCleanup.errors.join("; "), secretBag));
    }
  }

  return {
    mode: "execute",
    passed,
    failed,
    cleanup: finalCleanup
  };
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  pathToFileURL(resolvePath(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  runPreviewHttpE2ESuite().catch(err => {
    console.error("Preview HTTP E2E Fatal Error:", redactSecrets(err?.message || String(err), [
      process.env.SUPABASE_SECRET_KEY,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.VERCEL_PROTECTION_BYPASS
    ]));
    process.exit(1);
  });
}
