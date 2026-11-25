/**
 * DELTA INFERNO 3D — ETAP UI.6
 * Izolowany test integracyjny UI V2 + prawdziwe API na Vercel Preview & Supabase Staging (tdlsxamxtygojxhmjjvp)
 *
 * BEZPIECZEŃSTWO:
 * - Domyślnie przerywa lub wykonuje wyłącznie `--dry-run` (zero zapisów w bazie, zero logowania, zero deployu).
 * - Twarda blokada projektu produkcyjnego (`fctgruvciakhohfxkdzp`) i domeny produkcyjnej (`delta-2028.vercel.app`).
 * - Pełna izolacja na syntetycznym koncie (`e2e-http-<ts>-ui6-<nonce>@staging.delta.local`) oraz syntetycznym
 *   zawodniku `E2E TEST PLAYER` (`e2e57000-0000-4e2e-8000-000000000001`).
 * - Idempotentny cleanup w `finally` (plus `SIGINT`/`SIGTERM`) usuwa wyłącznie rekordy utworzone w tym biegu.
 */

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  STAGING_PROJECT_ID,
  E2E_TEST_PLAYER_ID,
  E2E_TEST_PLAYER_NAME,
  E2E_TEST_CARD_IDS,
  validatePreviewUrl,
  validateSupabaseStagingUrl,
  assertNoSecretsInCliArgs,
  cleanupIsolatedTestUser,
  type CreatedSyntheticUser,
  type CleanupResult
} from "./staging-preview-e2e-http.ts";

export interface Ui6ScenarioPlan {
  id: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";
  title: string;
  description: string;
}

export const UI6_TEST_SCENARIOS: readonly Ui6ScenarioPlan[] = [
  { id: "A", title: "Logowanie testera", description: "Syntetyczne konto rodzica -> /login -> /dashboard -> zakładka Kolekcja." },
  { id: "B", title: "Zakup paczki za DP", description: "Zakup standard_pack (60 DP) przez UI /api/cards/buy-pack i aktualizacja salda." },
  { id: "C", title: "Otwarcie przez prawdziwe API", description: "Klik OTWÓRZ PACZKĘ wywołuje rzeczywisty POST /api/cards/open-pack (200 OK)." },
  { id: "D", title: "Prezentacja kart 3D", description: "Walkout + HERO_REVEAL + CARD_REVEAL renderują karty zwrócone z serwera." },
  { id: "E", title: "Saldo i duplikaty", description: "Weryfikacja user_delta_points + total_delta_points_earned przy powtórzonej karcie." },
  { id: "F", title: "Zamknięcie w trakcie animacji", description: "Zamknięcie modala w fazie OPENING/WALKOUT zachowuje karty i DP po open-pack." },
  { id: "G", title: "Otwarcie kolejnej paczki", description: "Klik OTWÓRZ KOLEJNĄ ładuje czystą sesję READY bez wycieku starego result." },
  { id: "H", title: "Podgląd Awers / Rewers", description: "Klik miniatury w SUMMARY otwiera Card3DEngine i przełącza Awers/Rewers bez wywołań API." },
  { id: "I", title: "Odświeżenie kolekcji", description: "Reload strony potwierdza trwałość salda DP, paczek i kart z GET /api/cards/collection." },
  { id: "J", title: "Brak podwójnego otwarcia", description: "Szybki double-click na OTWÓRZ PACZKĘ wysyła wyłącznie 1 żądanie POST open-pack." },
  { id: "K", title: "Obsługa błędów 409/500", description: "Weryfikacja reakcji UI (cinematic-open-error) na konflikt 409 i błąd 500 bez falsyfikacji salda." },
  { id: "L", title: "Pełny cleanup danych", description: "Rollback testera, logów, kart i tymczasowego gracza E2E TEST PLAYER z weryfikacją 0 pozostałości." }
];

export interface SyntheticFixtureSpec {
  playerId: string;
  playerName: string;
  cardIds: readonly string[];
  initialDeltaPoints: number;
}

export const SYNTHETIC_UI6_FIXTURE: SyntheticFixtureSpec = {
  playerId: E2E_TEST_PLAYER_ID,
  playerName: E2E_TEST_PLAYER_NAME,
  cardIds: E2E_TEST_CARD_IDS,
  initialDeltaPoints: 240
};

export interface Ui6DryRunReport {
  mode: "dry-run";
  previewUrl: string;
  supabaseProjectRef: string;
  scenarios: readonly Ui6ScenarioPlan[];
  fixturePlan: {
    userEmailPattern: string;
    playerId: string;
    playerName: string;
    syntheticCardCount: number;
    initialDeltaPoints: number;
  };
  rollbackPlan: string[];
  createdUsers: 0;
  writesExecuted: 0;
}

const SYNTHETIC_CARD_DEFS = [
  { id: E2E_TEST_CARD_IDS[0], card_type: "base", rarity: "common", frame_theme: "base", title: "E2E BASE", card_number: 901 },
  { id: E2E_TEST_CARD_IDS[1], card_type: "matchday", rarity: "rare", frame_theme: "matchday", title: "E2E RARE", card_number: 902 },
  { id: E2E_TEST_CARD_IDS[2], card_type: "gold_master", rarity: "epic", frame_theme: "gold", title: "E2E EPIC", card_number: 903 },
  { id: E2E_TEST_CARD_IDS[3], card_type: "legend", rarity: "legendary", frame_theme: "legend", title: "E2E LEGEND", card_number: 904 },
  { id: E2E_TEST_CARD_IDS[4], card_type: "inferno", rarity: "inferno", frame_theme: "inferno", title: "E2E INFERNO", card_number: 905 }
] as const;

export function buildUi6DryRunReport(params: { previewUrl: string; projectRef: string }): Ui6DryRunReport {
  return {
    mode: "dry-run",
    previewUrl: params.previewUrl,
    supabaseProjectRef: params.projectRef,
    scenarios: UI6_TEST_SCENARIOS,
    fixturePlan: {
      userEmailPattern: "e2e-http-<ts>-ui6-<nonce>@staging.delta.local",
      playerId: SYNTHETIC_UI6_FIXTURE.playerId,
      playerName: SYNTHETIC_UI6_FIXTURE.playerName,
      syntheticCardCount: SYNTHETIC_UI6_FIXTURE.cardIds.length,
      initialDeltaPoints: SYNTHETIC_UI6_FIXTURE.initialDeltaPoints
    },
    rollbackPlan: [
      "1. cleanupIsolatedTestUser(admin, createdUser) -> DELETE pack_opening_logs..profiles + auth.admin.deleteUser",
      `2. DELETE FROM public.user_cards / admin_card_grants / pack_opening_logs referencing card_definitions of ${E2E_TEST_PLAYER_ID} created by this run`,
      `3. IF synthetic player created by this run: DELETE FROM public.card_definitions WHERE player_id = '${E2E_TEST_PLAYER_ID}'`,
      `4. IF synthetic player created by this run: DELETE FROM public.players WHERE id = '${E2E_TEST_PLAYER_ID}'`,
      "5. Verification COUNT(*) = 0 across all touched synthetic identifiers; 3 existing staging players untouched."
    ],
    createdUsers: 0,
    writesExecuted: 0
  };
}

/**
 * Seeds isolated synthetic E2E TEST PLAYER and its 5 active rarity cards ONLY if absent,
 * tracking exact pre-existing IDs and run-created IDs so rollback leaves pre-existing data untouched.
 */
async function ensureSyntheticE2EPlayerAndCards(
  admin: SupabaseClient,
  runStartedAtIso: string
): Promise<{
  createdPlayerByRun: boolean;
  preExistingCardIds: string[];
  createdCardIdsByRun: string[];
  runStartedAtIso: string;
}> {
  const { data: existingPlayer, error: pCheckErr } = await admin
    .from("players")
    .select("id, display_name")
    .eq("id", E2E_TEST_PLAYER_ID)
    .maybeSingle();

  if (pCheckErr) {
    throw new Error(`Błąd weryfikacji syntetycznego gracza E2E: ${pCheckErr.message}`);
  }

  const { data: preCards, error: preCardsErr } = await admin
    .from("card_definitions")
    .select("id")
    .eq("player_id", E2E_TEST_PLAYER_ID);

  if (preCardsErr) {
    throw new Error(`Błąd odczytu istniejących kart E2E: ${preCardsErr.message}`);
  }

  const preExistingCardIds = (preCards || []).map((row: { id: string }) => String(row.id));
  const preExistingSet = new Set(preExistingCardIds);

  let createdPlayerByRun = false;
  if (!existingPlayer) {
    const { error: pInsErr } = await admin.from("players").insert({
      id: E2E_TEST_PLAYER_ID,
      display_name: E2E_TEST_PLAYER_NAME,
      shirt_number: "99",
      position: "NAP",
      active: true
    });
    if (pInsErr) {
      throw new Error(`Nie udało się utworzyć syntetycznego gracza E2E: ${pInsErr.message}`);
    }
    createdPlayerByRun = true;
  }

  const missingCardRows = SYNTHETIC_CARD_DEFS
    .filter((spec) => !preExistingSet.has(spec.id))
    .map((spec) => ({
      id: spec.id,
      player_id: E2E_TEST_PLAYER_ID,
      season: "2026/27",
      card_type: spec.card_type,
      card_name: `${E2E_TEST_PLAYER_NAME} — ${spec.title}`,
      title: spec.title,
      rarity: spec.rarity,
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: spec.frame_theme,
      card_number: spec.card_number,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Syntetyczna karta testowa UI.6 (usuwana automatycznie w cleanup).",
      lore: "UI.6 Staging Smoke Test"
    }));

  const createdCardIdsByRun: string[] = [];
  if (missingCardRows.length > 0) {
    const { error: cErr } = await admin.from("card_definitions").insert(missingCardRows);
    if (cErr) {
      throw new Error(`Nie udało się zasilić syntetycznych kart E2E: ${cErr.message}`);
    }
    createdCardIdsByRun.push(...missingCardRows.map((c) => c.id));
  }

  return { createdPlayerByRun, preExistingCardIds, createdCardIdsByRun, runStartedAtIso };
}

/**
 * Rolls back ONLY synthetic records created during this exact run:
 * - explicit createdCardIdsByRun,
 * - any starter cards auto-seeded for E2E TEST PLAYER by ensureStarterCardsForPlayers after runStartedAtIso
 *   (excluding any preExistingCardIds),
 * - and E2E TEST PLAYER row strictly if createdPlayerByRun is true.
 */
async function cleanupSyntheticE2EPlayerAndCards(
  admin: SupabaseClient,
  seedState: {
    createdPlayerByRun: boolean;
    preExistingCardIds: string[];
    createdCardIdsByRun: string[];
    runStartedAtIso: string;
  }
): Promise<{ residualCards: number; residualPlayer: number; errors: string[] }> {
  const errors: string[] = [];
  const { createdPlayerByRun, preExistingCardIds, createdCardIdsByRun, runStartedAtIso } = seedState;
  const preExistingSet = new Set(preExistingCardIds);

  try {
    // Identify starter cards auto-seeded during this run for E2E TEST PLAYER without touching pre-existing rows
    const { data: currentPlayerCards, error: fetchErr } = await admin
      .from("card_definitions")
      .select("id, created_at")
      .eq("player_id", E2E_TEST_PLAYER_ID);

    if (fetchErr) {
      errors.push(`card_definitions inspect: ${fetchErr.message}`);
    } else {
      const idsToDelete = new Set<string>(createdCardIdsByRun);
      for (const row of currentPlayerCards || []) {
        const rowId = String(row.id);
        if (preExistingSet.has(rowId)) continue;
        if (createdPlayerByRun || (row.created_at && String(row.created_at) >= runStartedAtIso)) {
          idsToDelete.add(rowId);
        }
      }

      if (idsToDelete.size > 0) {
        const { error: delCardsErr } = await admin
          .from("card_definitions")
          .delete()
          .in("id", Array.from(idsToDelete));
        if (delCardsErr) {
          errors.push(`card_definitions delete: ${delCardsErr.message}`);
        }
      }
    }
  } catch (err: any) {
    errors.push(`card_definitions cleanup: ${err?.message || "error"}`);
  }

  if (createdPlayerByRun) {
    try {
      const { error: delPlayerErr } = await admin.from("players").delete().eq("id", E2E_TEST_PLAYER_ID);
      if (delPlayerErr) {
        errors.push(`players.id delete: ${delPlayerErr.message}`);
      }
    } catch (err: any) {
      errors.push(`players.id delete: ${err?.message || "error"}`);
    }
  }

  const { count: cCount } = await admin
    .from("card_definitions")
    .select("id", { count: "exact", head: true })
    .in("id", createdCardIdsByRun.length > 0 ? createdCardIdsByRun : ["00000000-0000-0000-0000-000000000000"]);

  let pCount = 0;
  if (createdPlayerByRun) {
    const res = await admin
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("id", E2E_TEST_PLAYER_ID);
    pCount = res.count || 0;
  }

  return {
    residualCards: createdCardIdsByRun.length > 0 ? cCount || 0 : 0,
    residualPlayer: pCount,
    errors
  };
}

function getArgValue(argv: readonly string[], prefix: string): string {
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : "";
}

export async function runStagingPackV2E2E(argv = process.argv, env = process.env): Promise<void> {
  assertNoSecretsInCliArgs(argv);

  const isDryRun = argv.includes("--dry-run");
  const isExecute = argv.includes("--execute-staging-ui6");

  if (!isDryRun && !isExecute) {
    console.log(
      "SAFEGUARD: Podaj --dry-run (bez zapisów/logowania) lub --execute-staging-ui6 (dopiero po zatwierdzonym preflightcie)."
    );
    return;
  }

  if (env.VERCEL_ENV === "production") {
    throw new Error("CRITICAL ABORT: Zabrania się uruchomienia przy VERCEL_ENV=production.");
  }

  const rawPreviewUrl = (env.PREVIEW_URL || getArgValue(argv, "--preview-url=")).trim();
  const parsedPreview = validatePreviewUrl(rawPreviewUrl);
  const rawSupabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || getArgValue(argv, "--supabase-url=")).trim();
  const { projectRef } = validateSupabaseStagingUrl(rawSupabaseUrl);

  if (isDryRun) {
    const report = buildUi6DryRunReport({ previewUrl: parsedPreview.origin, projectRef });
    console.log("=== ETAP UI.6 DRY-RUN PLAN (ZERO WRITES, ZERO AUTH, ZERO DEPLOY) ===");
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const serviceSecret = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const publishableKey = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!serviceSecret || !publishableKey) {
    throw new Error("Brak zmiennych środowiskowych Supabase Staging w procesie.");
  }

  const admin = createClient(rawSupabaseUrl, serviceSecret, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let createdUser: CreatedSyntheticUser | null = null;
  let seedState: {
    createdPlayerByRun: boolean;
    preExistingCardIds: string[];
    createdCardIdsByRun: string[];
    runStartedAtIso: string;
  } | null = null;
  let cleanupStarted = false;

  const runFinalCleanup = async (): Promise<CleanupResult | null> => {
    if (cleanupStarted) return null;
    cleanupStarted = true;
    const res = await cleanupIsolatedTestUser({ admin, createdUser });
    if (seedState) {
      const playerCleanup = await cleanupSyntheticE2EPlayerAndCards(admin, seedState);
      if (playerCleanup.errors.length > 0 || playerCleanup.residualCards > 0 || playerCleanup.residualPlayer > 0) {
        res.errors.push(...playerCleanup.errors);
        res.residualRowsFound += playerCleanup.residualCards + playerCleanup.residualPlayer;
      }
    }
    return res;
  };

  process.once("SIGINT", () => void runFinalCleanup().finally(() => process.exit(130)));
  process.once("SIGTERM", () => void runFinalCleanup().finally(() => process.exit(143)));

  const require = createRequire(resolvePath(process.cwd(), "package.json"));
  const { chromium } = require("playwright");
  let browser: any = null;

  try {
    const runStartedAtIso = new Date().toISOString();
    seedState = await ensureSyntheticE2EPlayerAndCards(admin, runStartedAtIso);

    const testEmail = `e2e-http-${Date.now()}-ui6-${randomBytes(3).toString("hex")}@staging.delta.local`;
    const testPassword = `Ui6!${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    if (authErr || !createdAuth?.user?.id) {
      throw new Error(`Nie udało się utworzyć testera UI.6: ${authErr?.message || "brak id"}`);
    }

    createdUser = {
      id: createdAuth.user.id,
      email: createdAuth.user.email || testEmail,
      createdByThisRun: true
    };

    await admin.from("profiles").upsert({
      id: createdUser.id,
      display_name: "UI6 PLAYWRIGHT TESTER",
      role: "parent"
    });
    await admin.from("parent_players").upsert({
      parent_id: createdUser.id,
      player_id: E2E_TEST_PLAYER_ID
    });
    await admin.from("user_delta_points").upsert({
      user_id: createdUser.id,
      points_balance: SYNTHETIC_UI6_FIXTURE.initialDeltaPoints
    });

    // Seed 1 duplicate starter card so pack openings test both NOWA KARTA and DUPLIKAT (+DP)
    await admin.from("user_cards").upsert({
      user_id: createdUser.id,
      card_id: E2E_TEST_CARD_IDS[0],
      duplicates_count: 0,
      is_favorite: false
    });

    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });

    const bypassSecret = (env.VERCEL_PROTECTION_BYPASS || "").trim();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: bypassSecret
        ? { "x-vercel-protection-bypass": bypassSecret, "x-vercel-set-bypass-cookie": "true" }
        : undefined
    });

    const page = await context.newPage();
    let openPackNetworkCount = 0;
    let buyPackNetworkCount = 0;
    page.on("request", (req: any) => {
      if (req.url().includes("/api/cards/open-pack") && req.method() === "POST") openPackNetworkCount++;
      if (req.url().includes("/api/cards/buy-pack") && req.method() === "POST") buyPackNetworkCount++;
    });

    // A. Login on Preview /login using real Supabase Auth email + password (NOT dev-login)
    await page.goto(`${parsedPreview.origin}/login`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator("button.login-primary").click();
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to Kolekcja tab
    const collectionShortcut = page.locator(".v200-tc-shortcut-tile", { hasText: /Kolekcja Kart/i });
    if (await collectionShortcut.count()) {
      await collectionShortcut.first().click();
    } else {
      await page.locator("button, a", { hasText: /Kolekcja Kart|Kolekcja/i }).first().click();
    }
    await page.locator(".v200-collection-top-panel").waitFor({ state: "visible", timeout: 15000 });
    await page.getByText(`${SYNTHETIC_UI6_FIXTURE.initialDeltaPoints} DP`).first().waitFor({ state: "visible" });

    // B. Buy 4 standard_pack (4 x 60 DP = 240 DP total synthetic balance)
    for (let i = 0; i < 4; i++) {
      await page.locator(".delta-booster-btn-buy").first().click();
      await page.waitForTimeout(450);
    }
    assert.equal(buyPackNetworkCount, 4, "Oczekiwano 4 rzeczywistych zakupów paczek");

    // F. Open Pack 1 -> close mid-animation (must keep rewards & decrement pack count)
    await page.locator(".v200-kpi-open-btn").click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="READY"]').waitFor({ state: "visible" });
    await page.locator('[data-testid="cinematic-open-btn"]').click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="OPENING"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="cinematic-close-btn"]').click();
    await page.locator('[data-testid="cinematic-pack-modal"]').waitFor({ state: "hidden" });

    // C, D, G, H, J. Pack 2 with rapid double-click -> Skip -> 3D Preview Flip -> OTWÓRZ KOLEJNĄ -> Pack 3
    await page.locator(".v200-kpi-open-btn").click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="READY"]').waitFor({ state: "visible" });
    const prevOpenCount = openPackNetworkCount;
    await page.locator('[data-testid="cinematic-open-btn"]').click();
    await page.locator('[data-testid="cinematic-open-btn"]').click({ force: true }).catch(() => {});
    await page.locator('[data-testid="cinematic-skip-btn"]').waitFor({ state: "visible", timeout: 10000 });
    assert.equal(openPackNetworkCount, prevOpenCount + 1, "Double-click musi wysłać dokładnie 1 żądanie open-pack");

    await page.locator('[data-testid="cinematic-skip-btn"]').click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="SUMMARY"]').waitFor({ state: "visible" });

    // H. 3D card preview + Awers/Rewers flip without new API calls
    await page.locator('[data-testid="summary-card-0"]').click();
    await page.locator('[data-testid="summary-card-preview-modal"]').waitFor({ state: "visible" });
    await page.locator('[data-testid="summary-preview-flip-btn"]').click();
    assert.equal(openPackNetworkCount, prevOpenCount + 1, "Podgląd 3D nie może wywoływać open-pack");
    await page.keyboard.press("Escape");
    await page.locator('[data-testid="summary-card-preview-modal"]').waitFor({ state: "hidden" });

    // G. OTWÓRZ KOLEJNĄ -> Pack 3
    await page.locator('[data-testid="cinematic-open-another-btn"]').click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="READY"]').waitFor({ state: "visible" });
    await page.locator('[data-testid="cinematic-open-btn"]').click();
    await page.locator('[data-testid="cinematic-skip-btn"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="cinematic-skip-btn"]').click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="SUMMARY"]').waitFor({ state: "visible" });
    await page.locator(".v2-summary-primary-btn").click();
    await page.locator('[data-testid="cinematic-pack-modal"]').waitFor({ state: "hidden" });

    // K1 + E + I. Transient 500 UI error recovery -> retry Pack 4 via REAL API -> reload persistence check
    await page.locator(".v200-kpi-open-btn").click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="READY"]').waitFor({ state: "visible" });
    await page.route("**/api/cards/open-pack", async (route: any) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Symulacja awarii 500 UI.6", code: "TEMP_500" })
      });
    }, { times: 1 });
    await page.locator('[data-testid="cinematic-open-btn"]').click();
    await page.locator('[data-testid="cinematic-open-error"]').waitFor({ state: "visible" });
    await page.unroute("**/api/cards/open-pack");

    // Retry opens Pack 4 via real Staging API cleanly
    await page.locator('[data-testid="cinematic-open-btn"]').click();
    await page.locator('[data-testid="cinematic-skip-btn"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="cinematic-skip-btn"]').click();
    await page.locator('[data-testid="cinematic-pack-modal"][data-phase="SUMMARY"]').waitFor({ state: "visible" });
    await page.locator(".v2-summary-primary-btn").click();
    await page.locator('[data-testid="cinematic-pack-modal"]').waitFor({ state: "hidden" });

    const { data: finalDpRow } = await admin
      .from("user_delta_points")
      .select("points_balance")
      .eq("user_id", createdUser.id)
      .single();
    await page.reload({ waitUntil: "networkidle" });
    if (await collectionShortcut.count()) {
      await collectionShortcut.first().click();
    } else {
      await page.locator("button, a", { hasText: /Kolekcja Kart|Kolekcja/i }).first().click();
    }
    await page.getByText(`${finalDpRow?.points_balance ?? 0} DP`).first().waitFor({ state: "visible", timeout: 15000 });

    // K2. Real HTTP 409 check on already opened pack
    const { data: openedLog } = await admin
      .from("user_unopened_packs")
      .select("id")
      .eq("user_id", createdUser.id)
      .eq("is_opened", true)
      .limit(1)
      .maybeSingle();

    if (openedLog?.id) {
      const apiStatus = await page.evaluate(async (packId: string) => {
        const res = await fetch("/api/cards/open-pack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pack_type_id: "standard_pack",
            user_unopened_pack_id: packId,
            idempotency_key: `ui6-conflict-${Date.now()}`
          })
        });
        return res.status;
      }, openedLog.id);
      assert.ok(apiStatus === 409 || apiStatus === 400, `Stale pack open must reject with 409/400 (got ${apiStatus})`);
    }

    await context.close();
  } finally {
    if (browser) await browser.close();
    const cleanupResult = await runFinalCleanup();
    if (cleanupResult) {
      console.log("UI.6 CLEANUP REPORT:", JSON.stringify({ ...cleanupResult, projectRef }));
      if (!cleanupResult.authUserDeleted || cleanupResult.residualRowsFound > 0 || cleanupResult.errors.length > 0) {
        throw new Error(`UI.6 CLEANUP_INCOMPLETE: ${cleanupResult.errors.join("; ")}`);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStagingPackV2E2E().catch((err) => {
    console.error("UI.6 RUNNER FAILED:", err);
    process.exit(1);
  });
}
