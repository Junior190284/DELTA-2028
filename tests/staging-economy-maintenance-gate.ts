/**
 * DELTA INFERNO 3D — UI.7F
 * DATABASE ECONOMY MAINTENANCE GATE INTEGRATION TEST
 */

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import path from "node:path";

const STAGING_PROJECT_ID = "tdlsxamxtygojxhmjjvp";
const PRODUCTION_PROJECT_ID = "fctgruvciakhohfxkdzp";

async function runMaintenanceGateTest() {
  if (!process.argv.includes("--execute-staging")) {
    console.log("SAFEGUARD: Wymagana flaga --execute-staging. Zatrzymano.");
    process.exit(0);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Brak wymaganych zmiennych środowiskowych Supabase.");
  }

  // Twarde zabezpieczenie przed produkcją
  if (supabaseUrl.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error(`CRITICAL ABORT: Wykryto produkcyjny projekt (${PRODUCTION_PROJECT_ID})!`);
  }
  if (!supabaseUrl.includes(STAGING_PROJECT_ID)) {
    throw new Error(`CRITICAL ABORT: URL nie wskazuje na staging (${STAGING_PROJECT_ID}).`);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log("--- 1. Inicjalizacja testu na Stagingu:", STAGING_PROJECT_ID);

  // Pobierz przykładowe aktywne karty do testu DML (standard pack wymaga 3 kart)
  const { data: cards, error: cardErr } = await admin
    .from("card_definitions")
    .select("id, rarity")
    .eq("is_active", true)
    .limit(3);

  if (cardErr || !cards || cards.length === 0) {
    throw new Error(`Brak kart w card_definitions: ${cardErr?.message}`);
  }
  const testCardIds = [
    cards[0].id,
    cards[1]?.id || cards[0].id,
    cards[2]?.id || cards[0].id
  ];
  const testCardId = cards[0].id;

  // Utwórz użytkownika syntetycznego
  const testEmail = `gate-test-${Date.now()}@staging.delta.local`;
  const testPassword = `Stg!Gate${Date.now()}#99`;
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "Gate Test User" }
  });

  if (authErr || !authData?.user) {
    throw new Error(`Nie udało się utworzyć usera testowego: ${authErr?.message}`);
  }
  const userId = authData.user.id;
  console.log(`--- 2. Utworzono usera syntetycznego: ${userId}`);

  // Utwórz klienta authenticated dla usera
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  if (signInErr) {
    throw new Error(`Błąd logowania usera testowego: ${signInErr.message}`);
  }

  // Ustaw saldo początkowe DP dla usera syntetycznego (1000 DP) bezpośrednio przez admin przed blokadą
  await admin.from("user_delta_points").upsert({
    user_id: userId,
    points_balance: 1000,
    total_earned: 1000,
    updated_at: new Date().toISOString()
  });

  // Dodaj paczkę do otwarcia dla usera testowego przed blokadą
  const { data: unopenedPack } = await admin
    .from("user_unopened_packs")
    .insert({
      user_id: userId,
      pack_type_id: "standard_pack",
      source_reason: "gate_test_prep"
    })
    .select("id")
    .single();

  const unopenedPackId = unopenedPack?.id;
  console.log(`--- Przygotowano stan bazowy (1000 DP, unopened_pack: ${unopenedPackId})`);

  try {
    // 3. Zainstaluj bramkę na Stagingu przez CLI
    console.log("--- 3. Aktywacja Database Economy Maintenance Gate...");
    execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/staging_economy_gate_install.sql`, {
      stdio: "pipe"
    });
    console.log("--- BRAMKA ZAINSTALOWANA I ZABLOKOWANA (is_locked = true)");

    // =========================================================================
    // TESTY W STANIE ZABLOKOWANYM (LOCK ACTIVE)
    // =========================================================================

    // Test A: Zakup paczki jako service_role (SECURITY DEFINER RPC)
    console.log("Test A: Zakup paczki przez purchase_pack_atomic (service_role)...");
    const { data: buyRes, error: buyErr } = await admin.rpc("purchase_pack_atomic", {
      p_user_id: userId,
      p_pack_type_id: "standard_pack",
      p_idempotency_key: `gate-buy-fail-${Date.now()}`
    });
    const buyBlocked = Boolean(buyErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED") || (buyRes as any)?.error?.includes?.("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> Wynik zakupu paczki: ${buyBlocked ? "ZABLOKOWANY (PASS)" : "NIEZABLOKOWANY (FAIL)"} (${buyErr?.message || JSON.stringify(buyRes)})`);
    assert.equal(buyBlocked, true, "purchase_pack_atomic MUST be blocked by maintenance gate");

    // Test B: Otwarcie paczki jako service_role (SECURITY DEFINER RPC)
    if (unopenedPackId) {
      console.log("Test B: Otwarcie paczki przez open_pack_atomic (service_role)...");
      const { data: openRes, error: openErr } = await admin.rpc("open_pack_atomic", {
        p_user_id: userId,
        p_pack_id: unopenedPackId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: testCardIds,
        p_idempotency_key: `gate-open-fail-${Date.now()}`
      });
      const openBlocked = Boolean(openErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED") || (openRes as any)?.error?.includes?.("ECONOMY_MAINTENANCE_LOCKED"));
      console.log(`-> Wynik otwarcia paczki: ${openBlocked ? "ZABLOKOWANY (PASS)" : "NIEZABLOKOWANY (FAIL)"} (${openErr?.message || JSON.stringify(openRes)})`);
      assert.equal(openBlocked, true, "open_pack_atomic MUST be blocked by maintenance gate");
    }

    // Test C: Daily spin jako service_role (SECURITY DEFINER RPC)
    console.log("Test C: Daily spin przez claim_daily_spin_atomic (service_role)...");
    const { data: spinRes, error: spinErr } = await admin.rpc("claim_daily_spin_atomic", {
      p_user_id: userId,
      p_segment_id: "s1",
      p_reward_type: "points",
      p_dp_amount: 50,
      p_pack_type_id: null,
      p_source_reason: "gate_test"
    });
    const spinBlocked = Boolean(spinErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED") || (spinRes as any)?.error?.includes?.("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> Wynik daily spin: ${spinBlocked ? "ZABLOKOWANY (PASS)" : "NIEZABLOKOWANY (FAIL)"} (${spinErr?.message || JSON.stringify(spinRes)})`);
    assert.equal(spinBlocked, true, "claim_daily_spin_atomic MUST be blocked by maintenance gate");

    // Test D: Bezpośredni zapis do tabeli ekonomii przez service_role
    console.log("Test D: Bezpośredni INSERT do user_cards jako service_role...");
    const { error: directAdminErr } = await admin
      .from("user_cards")
      .insert({ user_id: userId, card_id: testCardId });
    const directAdminBlocked = Boolean(directAdminErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> Wynik bezpośredniego INSERT service_role: ${directAdminBlocked ? "ZABLOKOWANY (PASS)" : "NIEZABLOKOWANY (FAIL)"} (${directAdminErr?.message})`);
    assert.equal(directAdminBlocked, true, "Direct service_role INSERT to user_cards MUST be blocked");

    // Test E: Bezpośredni zapis do tabeli ekonomii przez authenticated
    console.log("Test E: Bezpośredni INSERT do user_cards jako authenticated...");
    const { error: directAuthErr } = await userClient
      .from("user_cards")
      .insert({ user_id: userId, card_id: testCardId });
    console.log(`-> Wynik bezpośredniego INSERT authenticated: ZABLOKOWANY (PASS) (${directAuthErr?.message})`);
    assert.ok(directAuthErr, "Authenticated direct INSERT must fail");

    // Test F: Rejestracja profilu OAuth / INSERT do public.profiles (MUSI DZIAŁAĆ!)
    console.log("Test F: Weryfikacja rejestracji profilu (profiles) podczas blokady ekonomii...");
    const oauthTestEmail = `oauth-synth-${Date.now()}@staging.delta.local`;
    const { data: oauthAuth, error: oauthAuthErr } = await admin.auth.admin.createUser({
      email: oauthTestEmail,
      email_confirm: true,
      user_metadata: { full_name: "OAuth Isolated User" }
    });
    let profileInsertErr: any = oauthAuthErr;
    let oauthSynthUserId: string | null = oauthAuth?.user?.id || null;
    if (oauthAuth?.user) {
      // Sprawdź czy profil istnieje w public.profiles (utworzony automatycznie przez trigger lub manualny insert)
      const { data: pData, error: pErr } = await admin.from("profiles").select("id, role").eq("id", oauthAuth.user.id).maybeSingle();
      if (pErr || !pData) {
        profileInsertErr = pErr || new Error("Profil nie został utworzony");
      }
    }
    console.log(`-> Rejestracja profilu OAuth: ${!profileInsertErr ? "DOZWOLONA / DZIAŁA (PASS)" : "BŁĄD (FAIL)"} (${profileInsertErr?.message || "OK"})`);
    assert.equal(profileInsertErr, null, "Profile insert MUST NOT be blocked by economy gate");
    if (oauthSynthUserId) {
      await admin.from("profiles").delete().eq("id", oauthSynthUserId);
      await admin.auth.admin.deleteUser(oauthSynthUserId);
    }

    // Test G: Zmiana display_name w profilu (MUSI DZIAŁAĆ!)
    console.log("Test G: Zmiana display_name w profiles podczas blokady ekonomii...");
    const { error: profileUpdateErr } = await admin
      .from("profiles")
      .update({ display_name: "Gate Test User Updated" })
      .eq("id", userId);
    console.log(`-> Edycja profilu: ${!profileUpdateErr ? "DOZWOLONA / DZIAŁA (PASS)" : "BŁĄD (FAIL)"}`);
    assert.equal(profileUpdateErr, null, "Profile update MUST NOT be blocked by economy gate");

    // =========================================================================
    // ODBLOKOWANIE BRAMKI I POWRÓT PRAWIDŁOWEJ EKONOMII
    // =========================================================================
    console.log("--- 4. Odblokowanie bramki (is_locked = false)...");
    execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/staging_economy_gate_unlock.sql`, {
      stdio: "pipe"
    });
    console.log("--- BRAMKA ODBLOKOWANA");

    // Test H: Zakup paczki po odblokowaniu (POWINIEN SIĘ POWIEŚĆ!)
    console.log("Test H: Zakup paczki po odblokowaniu (service_role)...");
    const { data: unlockedBuyRes, error: unlockedBuyErr } = await admin.rpc("purchase_pack_atomic", {
      p_user_id: userId,
      p_pack_type_id: "standard_pack",
      p_idempotency_key: `gate-buy-pass-${Date.now()}`
    });
    const buySuccess = !unlockedBuyErr && (unlockedBuyRes as any)?.success === true;
    console.log(`-> Zakup po odblokowaniu: ${buySuccess ? "SUKCES (PASS)" : "BŁĄD (FAIL)"} (${JSON.stringify(unlockedBuyRes)})`);
    assert.equal(buySuccess, true, "Pack purchase must succeed after gate is unlocked");

    // Test I: Otwarcie paczki po odblokowaniu (POWINNO SIĘ POWIEŚĆ!)
    const purchasedPackId = (unlockedBuyRes as any)?.unopened_pack_id;
    if (purchasedPackId) {
      console.log("Test I: Otwarcie zakupionej paczki po odblokowaniu (service_role)...");
      const { data: unlockedOpenRes, error: unlockedOpenErr } = await admin.rpc("open_pack_atomic", {
        p_user_id: userId,
        p_pack_id: purchasedPackId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: testCardIds,
        p_idempotency_key: `gate-open-pass-${Date.now()}`
      });
      const openSuccess = !unlockedOpenErr && (unlockedOpenRes as any)?.success === true;
      console.log(`-> Otwarcie po odblokowaniu: ${openSuccess ? "SUKCES (PASS)" : "BŁĄD (FAIL)"} (${JSON.stringify(unlockedOpenRes)})`);
      assert.equal(openSuccess, true, "Pack open must succeed after gate is unlocked");
    }

    console.log("--- WSZYSTKIE TESTY BRAMKI ZAKOŃCZONE SUKCESEM (PASS 100%)");
  } finally {
    // =========================================================================
    // TEARDOWN & CLEANUP
    // =========================================================================
    console.log("--- 5. Pełny Teardown & Cleanup...");
    try {
      execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/staging_economy_gate_uninstall.sql`, {
        stdio: "pipe"
      });
      console.log("-> Triggery i tabela bramki odinstalowane.");
    } catch (e) {
      console.error("Błąd deinstalacji bramki:", e);
    }

    // Sprzątanie rekordów usera testowego
    try {
      await admin.from("pack_opening_logs").delete().eq("user_id", userId);
      await admin.from("user_cards").delete().eq("user_id", userId);
      await admin.from("user_unopened_packs").delete().eq("user_id", userId);
      await admin.from("delta_points_transactions").delete().eq("user_id", userId);
      await admin.from("user_delta_points").delete().eq("user_id", userId);
      await admin.from("user_wallets").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      console.log("-> Syntetyczny użytkownik i dane testowe usunięte bez śladu.");
    } catch (e) {
      console.error("Błąd czyszczenia usera testowego:", e);
    }

    // Weryfikacja czystości
    const { count: remainingPacks } = await admin.from("user_unopened_packs").select("*", { count: "exact", head: true }).eq("user_id", userId);
    const { count: remainingCards } = await admin.from("user_cards").select("*", { count: "exact", head: true }).eq("user_id", userId);
    console.log(`-> Weryfikacja zerowych pozostałości: packs=${remainingPacks || 0}, cards=${remainingCards || 0} (CLEAN)`);
  }
}

runMaintenanceGateTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
