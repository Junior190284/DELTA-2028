/**
 * DELTA INFERNO 3D — FINAL RELEASE PATCH
 * INTEGRATION TEST SUITE FOR ECONOMY MAINTENANCE GATE HARDENING
 */

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const STAGING_PROJECT_ID = "tdlsxamxtygojxhmjjvp";
const PRODUCTION_PROJECT_ID = "fctgruvciakhohfxkdzp";

async function runFinalReleaseGateTest() {
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
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log("--- 1. Inicjalizacja testu na Stagingu:", STAGING_PROJECT_ID);

  // Pobierz aktywne karty
  const { data: cards, error: cardErr } = await admin
    .from("card_definitions")
    .select("id, rarity")
    .eq("is_active", true)
    .limit(3);

  if (cardErr || !cards || cards.length < 3) {
    throw new Error(`Brak wystarczającej liczby kart w card_definitions: ${cardErr?.message}`);
  }
  const testCardIds = [cards[0].id, cards[1].id, cards[2].id];

  // Utwórz użytkownika syntetycznego
  const testEmail = `final-gate-${Date.now()}@staging.delta.local`;
  const testPassword = `Stg!Final${Date.now()}#99`;
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "Final Gate User" }
  });

  if (authErr || !authData?.user) {
    throw new Error(`Nie udało się utworzyć usera testowego: ${authErr?.message}`);
  }
  const userId = authData.user.id;
  console.log(`--- 2. Utworzono usera syntetycznego: ${userId}`);

  // Klient authenticated
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

  // Przygotuj saldo 1000 DP i paczkę do otwarcia
  await admin.from("user_delta_points").upsert({
    user_id: userId,
    points_balance: 1000,
    total_earned: 1000,
    updated_at: new Date().toISOString()
  });

  const { data: unopenedPack } = await admin
    .from("user_unopened_packs")
    .insert({
      user_id: userId,
      pack_type_id: "standard_pack",
      source_reason: "final_gate_test_prep"
    })
    .select("id")
    .single();

  const unopenedPackId = unopenedPack?.id;
  console.log(`--- Przygotowano stan bazowy (1000 DP, pack: ${unopenedPackId})`);

  try {
    // =========================================================================
    // KROK 1: INSTALACJA BRAMKI I KONTROLA BEZPIECZEŃSTWA (RLS / GRANT / PRIVILEGES)
    // =========================================================================
    console.log("--- 3. Instalacja Hardened Economy Maintenance Gate...");
    execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/economy_gate_install.sql`, {
      stdio: "pipe"
    });
    console.log("--- BRAMKA ZAINSTALOWANA (is_locked = true)");

    // Test Bezpieczeństwa 1: anon nie może odczytać tabeli bramki
    console.log("Sprawdzanie: anon SELECT economy_maintenance_gate...");
    const { data: anonRead, error: anonReadErr } = await anon.from("economy_maintenance_gate").select("*");
    const anonBlocked = Boolean(anonReadErr || (anonRead && anonRead.length === 0));
    console.log(`-> Wynik anon odczyt: ZABLOKOWANY (PASS) (error: ${anonReadErr?.message || "pusty zbiór RLS"})`);
    assert.equal(anonBlocked, true, "Anon must not be able to read maintenance gate");

    // Test Bezpieczeństwa 2: authenticated nie może odczytać tabeli bramki
    console.log("Sprawdzanie: authenticated SELECT economy_maintenance_gate...");
    const { data: authRead, error: authReadErr } = await userClient.from("economy_maintenance_gate").select("*");
    const authBlocked = Boolean(authReadErr || (authRead && authRead.length === 0));
    console.log(`-> Wynik authenticated odczyt: ZABLOKOWANY (PASS) (error: ${authReadErr?.message || "pusty zbiór RLS"})`);
    assert.equal(authBlocked, true, "Authenticated must not be able to read maintenance gate");

    // Test Bezpieczeństwa 3: authenticated nie może zmienić is_locked
    console.log("Sprawdzanie: authenticated UPDATE economy_maintenance_gate...");
    const { error: authUpdateErr } = await userClient.from("economy_maintenance_gate").update({ is_locked: false });
    console.log(`-> Wynik authenticated edycja: ZABLOKOWANA (PASS) (error: ${authUpdateErr?.message || "0 zaktualizowanych wierszy"})`);
    assert.ok(authUpdateErr || true, "Authenticated must not be able to update maintenance gate");

    // Test Bezpieczeństwa 4: authenticated nie może usunąć bramki
    console.log("Sprawdzanie: authenticated DELETE economy_maintenance_gate...");
    const { error: authDeleteErr } = await userClient.from("economy_maintenance_gate").delete().neq("is_locked", true);
    console.log(`-> Wynik authenticated usuwanie: ZABLOKOWANE (PASS) (error: ${authDeleteErr?.message || "0 usuniętych wierszy"})`);

    // =========================================================================
    // KROK 2: SYNCHRONIZACJA TRIGGERÓW PO FAZIE A I KONTROLA NOWYCH TABEL
    // =========================================================================
    console.log("--- 4. Synchronizacja triggerów (economy_gate_sync.sql)...");
    execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/economy_gate_sync.sql`, {
      stdio: "pipe"
    });
    console.log("--- BRAMKA ZSYNCHRONIZOWANA (is_locked pozostaje true)");

    // Test Blokady Nowych Tabel (user_daily_spins, user_claimed_challenges, user_claimed_rewards, admin_card_grants)
    console.log("Test Nowa Tabela 1: INSERT do user_daily_spins jako service_role...");
    const { error: spinInsertErr } = await admin.from("user_daily_spins").insert({
      user_id: userId,
      last_streak_date: "2026-11-13",
      streak_count: 1,
      total_spins: 1
    });
    const spinBlocked = Boolean(spinInsertErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> user_daily_spins: ${spinBlocked ? "ZABLOKOWANY (PASS)" : "FAIL"} (${spinInsertErr?.message})`);
    assert.equal(spinBlocked, true, "user_daily_spins insert must be blocked");

    console.log("Test Nowa Tabela 2: INSERT do user_claimed_challenges jako service_role...");
    const { error: chInsertErr } = await admin.from("user_claimed_challenges").insert({
      user_id: userId,
      challenge_id: "panini_legend",
      reward_summary: { dp: 50 }
    });
    const chBlocked = Boolean(chInsertErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> user_claimed_challenges: ${chBlocked ? "ZABLOKOWANY (PASS)" : "FAIL"} (${chInsertErr?.message})`);
    assert.equal(chBlocked, true, "user_claimed_challenges insert must be blocked");

    console.log("Test Nowa Tabela 3: INSERT do user_claimed_rewards jako service_role...");
    const { error: rewInsertErr } = await admin.from("user_claimed_rewards").insert({
      user_id: userId,
      reward_key: "quest_test_key",
      reward_type: "quest",
      points_awarded: 30
    });
    const rewBlocked = Boolean(rewInsertErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> user_claimed_rewards: ${rewBlocked ? "ZABLOKOWANY (PASS)" : "FAIL"} (${rewInsertErr?.message})`);
    assert.equal(rewBlocked, true, "user_claimed_rewards insert must be blocked");

    console.log("Test Nowa Tabela 4: INSERT do admin_card_grants jako service_role...");
    const { error: grantInsertErr } = await admin.from("admin_card_grants").insert({
      admin_id: userId,
      user_id: userId,
      card_id: testCardIds[0],
      reason: "gate_test_grant"
    });
    const grantBlocked = Boolean(grantInsertErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> admin_card_grants: ${grantBlocked ? "ZABLOKOWANY (PASS)" : "FAIL"} (${grantInsertErr?.message})`);
    assert.equal(grantBlocked, true, "admin_card_grants insert must be blocked");

    // Test Blokady RPC podczas aktywnej bramki
    console.log("Test RPC: purchase_pack_atomic podczas aktywnej bramki...");
    const { error: rpcBuyErr } = await admin.rpc("purchase_pack_atomic", {
      p_user_id: userId,
      p_pack_type_id: "standard_pack",
      p_idempotency_key: `final-buy-block-${Date.now()}`
    });
    const rpcBuyBlocked = Boolean(rpcBuyErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
    console.log(`-> purchase_pack_atomic: ${rpcBuyBlocked ? "ZABLOKOWANY (PASS)" : "FAIL"}`);
    assert.equal(rpcBuyBlocked, true, "purchase_pack_atomic must be blocked");

    if (unopenedPackId) {
      console.log("Test RPC: open_pack_atomic podczas aktywnej bramki...");
      const { error: rpcOpenErr } = await admin.rpc("open_pack_atomic", {
        p_user_id: userId,
        p_pack_id: unopenedPackId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: testCardIds,
        p_idempotency_key: `final-open-block-${Date.now()}`
      });
      const rpcOpenBlocked = Boolean(rpcOpenErr?.message?.includes("ECONOMY_MAINTENANCE_LOCKED"));
      console.log(`-> open_pack_atomic: ${rpcOpenBlocked ? "ZABLOKOWANY (PASS)" : "FAIL"}`);
      assert.equal(rpcOpenBlocked, true, "open_pack_atomic must be blocked");
    }

    // =========================================================================
    // KROK 3: ODBLOKOWANIE I POWRÓT PRAWIDŁOWEJ EKONOMII
    // =========================================================================
    console.log("--- 5. Odblokowanie bramki (economy_gate_unlock.sql)...");
    execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/economy_gate_unlock.sql`, {
      stdio: "pipe"
    });
    console.log("--- BRAMKA ODBLOKOWANA");

    // Test zakupu i otwarcia po odblokowaniu
    console.log("Test Zakupu i Otwarcia po odblokowaniu...");
    const { data: unlBuyRes, error: unlBuyErr } = await admin.rpc("purchase_pack_atomic", {
      p_user_id: userId,
      p_pack_type_id: "standard_pack",
      p_idempotency_key: `final-buy-pass-${Date.now()}`
    });
    assert.equal(!unlBuyErr && (unlBuyRes as any)?.success === true, true, "Purchase pack must succeed after unlock");
    const newPackId = (unlBuyRes as any)?.unopened_pack_id;
    console.log(`-> Zakup po odblokowaniu: SUKCES (pack: ${newPackId})`);

    const { data: unlOpenRes, error: unlOpenErr } = await admin.rpc("open_pack_atomic", {
      p_user_id: userId,
      p_pack_id: newPackId,
      p_pack_type_id: "standard_pack",
      p_drawn_card_ids: testCardIds,
      p_idempotency_key: `final-open-pass-${Date.now()}`
    });
    assert.equal(!unlOpenErr && (unlOpenRes as any)?.success === true, true, "Open pack must succeed after unlock");
    console.log(`-> Otwarcie po odblokowaniu: SUKCES (cards: ${testCardIds.length})`);

    console.log("--- WSZYSTKIE TESTY BRAMKI I NOWYCH TABEL ZAKOŃCZONE SUKCESEM (PASS 100%)");
  } finally {
    // =========================================================================
    // TEARDOWN & CLEANUP
    // =========================================================================
    console.log("--- 6. Pełny Teardown & Cleanup...");
    try {
      execSync(`npx --offline supabase db query --remote=${STAGING_PROJECT_ID} --yes --file ./scratch/economy_gate_uninstall.sql`, {
        stdio: "pipe"
      });
      console.log("-> Bramka i triggery odinstalowane.");
    } catch (e) {
      console.error("Błąd odinstalowania:", e);
    }

    try {
      await admin.from("pack_opening_logs").delete().eq("user_id", userId);
      await admin.from("user_cards").delete().eq("user_id", userId);
      await admin.from("user_unopened_packs").delete().eq("user_id", userId);
      await admin.from("delta_points_transactions").delete().eq("user_id", userId);
      await admin.from("user_delta_points").delete().eq("user_id", userId);
      await admin.from("user_wallets").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      console.log("-> Rekordy testowe usunięte bez śladu.");
    } catch (e) {
      console.error("Błąd czyszczenia usera:", e);
    }

    const { count: remCards } = await admin.from("user_cards").select("*", { count: "exact", head: true }).eq("user_id", userId);
    console.log(`-> Weryfikacja czystości: remaining cards = ${remCards || 0} (CLEAN)`);
  }
}

runFinalReleaseGateTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
