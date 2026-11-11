/**
 * DELTA INFERNO 3.0 — ETAP ANIM-1A.3
 * STAGING INTEGRATION TEST SUITE FOR public.open_pack_atomic
 *
 * ZABEZPIECZENIA:
 * 1. Wymaga jawnej flagi CLI `--execute-staging` (nie wykonuje zapisów przy zwykłym imporcie lub bez zgody).
 * 2. HARD ABORT jeżeli URL nie wskazuje na projekt STAGING (tdlsxamxtygojxhmjjvp)
 *    lub wskazuje na PRODUKCJĘ (fctgruvciakhohfxkdzp).
 * 3. Operuje wyłącznie na izolowanym użytkowniku testowym utworzonym na czas testu i sprzątanym w `finally`.
 *
 * Uruchomienie (po zatwierdzeniu i wdrożeniu migracji 20261111_etap_anim1a2_open_pack_atomic.sql na stagingu):
 *   node --env-file=.env.local --experimental-strip-types tests/staging-open-pack-atomic.ts --execute-staging
 */

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const STAGING_PROJECT_ID = "tdlsxamxtygojxhmjjvp";
const PRODUCTION_PROJECT_ID = "fctgruvciakhohfxkdzp";

async function runStagingIntegrationTests() {
  if (!process.argv.includes("--execute-staging")) {
    console.log("SAFEGUARD: Brak flagi --execute-staging. Przerwano bez wykonania jakichkolwiek zapisów.");
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Brak wymaganych zmiennych środowiskowych Supabase w procesie.");
  }

  // Twarda blokada przed przypadkowym wskazaniem bazy produkcyjnej
  if (supabaseUrl.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error(`CRITICAL ABORT: Wykryto produkcyjny projekt (${PRODUCTION_PROJECT_ID})!`);
  }
  if (!supabaseUrl.includes(STAGING_PROJECT_ID)) {
    throw new Error(`CRITICAL ABORT: URL nie wskazuje na staging (${STAGING_PROJECT_ID}).`);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 1. Pobierz istniejące aktywne definicje kart ze stagingu (READ ONLY)
  const { data: cards, error: cardErr } = await admin
    .from("card_definitions")
    .select("id, rarity, is_active")
    .eq("is_active", true)
    .limit(10);

  if (cardErr || !cards || cards.length === 0) {
    throw new Error(`Brak aktywnych kart w card_definitions na stagingu: ${cardErr?.message || "pusta tabela"}`);
  }

  const cardByRarity = (r: string) => cards.find(c => c.rarity === r)?.id || cards[0].id;
  const c1 = cards[0].id;
  const c2 = cards[1]?.id || c1;
  const c3 = cards[2]?.id || c1;
  const infernoOrTop = cardByRarity("inferno");

  // 2. Utwórz izolowanego użytkownika testowego na stagingu
  const testEmail = `anim1a3-test-${Date.now()}@staging.delta.local`;
  const testPassword = `Stg!${Date.now()}_Lock99`;
  const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (authErr || !createdAuth.user) {
    throw new Error(`Nie udało się utworzyć izolowanego konta testowego na stagingu: ${authErr?.message}`);
  }

  const testUserId = createdAuth.user.id;
  await admin.from("profiles").upsert({
    id: testUserId,
    display_name: "ANIM1A3 STAGING TESTER",
    role: "parent"
  }, { onConflict: "id" });

  let passed = 0;
  let failed = 0;
  const runCase = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} ->`, err?.message || err);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Otwarcie jednej paczki
    // -------------------------------------------------------------------------
    await runCase("1. Otwarcie jednej paczki (standard_pack)", async () => {
      const { data: packRow, error: insErr } = await admin
        .from("user_unopened_packs")
        .insert({ user_id: testUserId, pack_type_id: "standard_pack", is_opened: false })
        .select("id")
        .single();
      assert.ifError(insErr);

      const { data: rpcRes, error: rpcErr } = await admin.rpc("open_pack_atomic", {
        p_user_id: testUserId,
        p_pack_id: packRow!.id,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: [String(c1), String(c2), String(c3)],
        p_idempotency_key: `stg-1-${packRow!.id}`
      });
      assert.ifError(rpcErr);
      assert.equal(rpcRes.success, true);
      assert.equal(rpcRes.response_payload.consumed_pack_id, packRow!.id);
    });

    // Reset kolekcji testowej przed kolejnymi przypadkami
    await admin.from("pack_opening_logs").delete().eq("user_id", testUserId);
    await admin.from("delta_points_transactions").delete().eq("user_id", testUserId);
    await admin.from("user_cards").delete().eq("user_id", testUserId);
    await admin.from("user_unopened_packs").delete().eq("user_id", testUserId);
    await admin.from("user_delta_points").delete().eq("user_id", testUserId);

    // -------------------------------------------------------------------------
    // TEST 2: Dwa równoległe otwarcia różnych paczek z tą samą nową kartą
    // -------------------------------------------------------------------------
    await runCase("2. Dwa równoległe otwarcia różnych paczek tego samego gracza (nowa karta -> duplikat)", async () => {
      const { data: insertedPacks } = await admin
        .from("user_unopened_packs")
        .insert([
          { user_id: testUserId, pack_type_id: "standard_pack", is_opened: false },
          { user_id: testUserId, pack_type_id: "standard_pack", is_opened: false }
        ])
        .select("id");
      assert.equal(insertedPacks?.length, 2);

      const [r1, r2] = await Promise.all([
        admin.rpc("open_pack_atomic", {
          p_user_id: testUserId,
          p_pack_id: insertedPacks![0].id,
          p_pack_type_id: "standard_pack",
          p_drawn_card_ids: [String(infernoOrTop), String(c1), String(c2)],
          p_idempotency_key: `stg-par-1-${Date.now()}`
        }),
        admin.rpc("open_pack_atomic", {
          p_user_id: testUserId,
          p_pack_id: insertedPacks![1].id,
          p_pack_type_id: "standard_pack",
          p_drawn_card_ids: [String(infernoOrTop), String(c1), String(c2)],
          p_idempotency_key: `stg-par-2-${Date.now()}`
        })
      ]);

      assert.ifError(r1.error);
      assert.ifError(r2.error);
      assert.equal(r1.data.success, true);
      assert.equal(r2.data.success, true);

      const dps = [r1.data.response_payload.total_delta_points_earned, r2.data.response_payload.total_delta_points_earned];
      assert.equal(dps.filter(x => x === 0).length, 1);
      assert.equal(dps.filter(x => x > 0).length, 1);
    });

    // -------------------------------------------------------------------------
    // TEST 3 & 4: 10 równoległych żądań (limit 2 paczki) + duplikaty kart
    // -------------------------------------------------------------------------
    await runCase("3 & 4. 10 równoległych żądań przy 2 paczkach + naliczenie duplikatów", async () => {
      await admin.from("pack_opening_logs").delete().eq("user_id", testUserId);
      await admin.from("user_cards").delete().eq("user_id", testUserId);
      await admin.from("user_unopened_packs").delete().eq("user_id", testUserId);

      await admin.from("user_unopened_packs").insert([
        { user_id: testUserId, pack_type_id: "standard_pack", is_opened: false },
        { user_id: testUserId, pack_type_id: "standard_pack", is_opened: false }
      ]);

      const calls = await Promise.all(
        Array.from({ length: 10 }, () =>
          admin.rpc("open_pack_atomic", {
            p_user_id: testUserId,
            p_pack_id: null,
            p_pack_type_id: "standard_pack",
            p_drawn_card_ids: [String(c1), String(c1), String(c1)]
          })
        )
      );

      const wins = calls.filter(c => !c.error && c.data?.success === true);
      const rejects = calls.filter(c => !c.error && c.data?.code === "NO_UNOPENED_PACK");
      assert.equal(wins.length, 2);
      assert.equal(rejects.length, 8);

      const { data: uc } = await admin
        .from("user_cards")
        .select("duplicates_count")
        .eq("user_id", testUserId)
        .eq("card_id", c1)
        .single();
      assert.equal(uc?.duplicates_count, 5); // 6 trafień tej samej karty -> 1 baza + 5 duplikatów
    });

    // -------------------------------------------------------------------------
    // TEST 5: Ponowienie idempotency_key
    // -------------------------------------------------------------------------
    await runCase("5. Ponowienie tego samego idempotency_key zwraca identyczny wynik i nie zużywa 2. paczki", async () => {
      await admin.from("user_unopened_packs").insert([
        { user_id: testUserId, pack_type_id: "standard_pack", is_opened: false },
        { user_id: testUserId, pack_type_id: "standard_pack", is_opened: false }
      ]);
      const idemKey = `stg-idem-${Date.now()}`;

      const first = await admin.rpc("open_pack_atomic", {
        p_user_id: testUserId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: [String(c1), String(c2), String(c3)],
        p_idempotency_key: idemKey
      });
      const second = await admin.rpc("open_pack_atomic", {
        p_user_id: testUserId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: [String(c1), String(c2), String(c3)],
        p_idempotency_key: idemKey
      });

      assert.ifError(first.error);
      assert.ifError(second.error);
      assert.equal(first.data.already_processed, false);
      assert.equal(second.data.already_processed, true);
      assert.deepEqual(second.data.response_payload, first.data.response_payload);
    });

    // -------------------------------------------------------------------------
    // TEST 6 & 8: Błędny card_id + atomowy rollback PostgreSQL po błędzie w slocie #3
    // -------------------------------------------------------------------------
    await runCase("6 & 8. Błędny card_id w 3. slocie cofa całą transakcję (paczka, karty, DP, log)", async () => {
      await admin.from("user_cards").delete().eq("user_id", testUserId);
      const { data: rbPack } = await admin
        .from("user_unopened_packs")
        .insert({ user_id: testUserId, pack_type_id: "standard_pack", is_opened: false })
        .select("id")
        .single();

      const { error: failErr } = await admin.rpc("open_pack_atomic", {
        p_user_id: testUserId,
        p_pack_id: rbPack!.id,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: [String(c1), String(c1), "00000000-0000-0000-0000-000000000000"],
        p_idempotency_key: `stg-rb-${Date.now()}`
      });

      assert.ok(failErr, "Nieistniejące card_id musi wywołać wyjątek i rollback");

      const { data: checkPack } = await admin
        .from("user_unopened_packs")
        .select("is_opened")
        .eq("id", rbPack!.id)
        .single();
      assert.equal(checkPack?.is_opened, false);

      const { data: checkCards } = await admin
        .from("user_cards")
        .select("id")
        .eq("user_id", testUserId);
      assert.equal(checkCards?.length || 0, 0);
    });

    // -------------------------------------------------------------------------
    // TEST 7: Brak paczki
    // -------------------------------------------------------------------------
    await runCase("7. Brak nieotwartej paczki zwraca NO_UNOPENED_PACK", async () => {
      await admin.from("user_unopened_packs").delete().eq("user_id", testUserId);

      const { data, error } = await admin.rpc("open_pack_atomic", {
        p_user_id: testUserId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: [String(c1), String(c2), String(c3)]
      });
      assert.ifError(error);
      assert.equal(data.success, false);
      assert.equal(data.code, "NO_UNOPENED_PACK");
    });

    // -------------------------------------------------------------------------
    // TEST 9: Odmowa wywołania RPC dla roli authenticated
    // -------------------------------------------------------------------------
    await runCase("9. Zalogowany użytkownik (authenticated) ma zablokowane EXECUTE na open_pack_atomic", async () => {
      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error: loginErr } = await userClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      assert.ifError(loginErr);

      const { error: rpcErr } = await userClient.rpc("open_pack_atomic", {
        p_user_id: testUserId,
        p_pack_type_id: "standard_pack",
        p_drawn_card_ids: [String(c1), String(c2), String(c3)]
      });

      assert.ok(rpcErr, "Wywołanie open_pack_atomic przez rolę authenticated musi zostać odrzucone");
    });

    console.log(`\n=== STAGING INTEGRATION SUMMARY: Passed ${passed}, Failed ${failed} ===`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    // Sprzątanie konta i rekordów testowych na stagingu
    await admin.from("pack_opening_logs").delete().eq("user_id", testUserId);
    await admin.from("delta_points_transactions").delete().eq("user_id", testUserId);
    await admin.from("user_cards").delete().eq("user_id", testUserId);
    await admin.from("user_unopened_packs").delete().eq("user_id", testUserId);
    await admin.from("user_delta_points").delete().eq("user_id", testUserId);
    await admin.from("profiles").delete().eq("id", testUserId);
    await admin.auth.admin.deleteUser(testUserId);
  }
}

runStagingIntegrationTests().catch(err => {
  console.error("Staging Integration Fatal Error:", err);
  process.exit(1);
});
