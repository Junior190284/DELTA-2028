-- ==============================================================================
-- DELTA INFERNO 3.0 — ANIM-1A.5 FIX (FAZA C)
-- ŚCISŁE UTWARDZENIE RLS ORAZ UPRAWNIEŃ TABEL EKONOMII
--
-- Plik: supabase/migrations/20261111_anim1a5_c_rls_hardening.sql
-- KRYTYCZNA KOLEJNOŚĆ WDROŻENIA:
--   1. Faza A (20261111_anim1a5_a_missing_tables_and_deps.sql)
--   2. Faza B (20261111_anim1a5_b_economy_rpcs.sql)
--   3. Deploy kodu aplikacji ANIM-1A.5 + pozytywne testy integracyjne API na Stagingu
--   4. [TEN PLIK] 20261111_anim1a5_c_rls_hardening.sql
--
-- Zasada działania:
-- - Blokuje wszelki bezpośredni zapis (INSERT/UPDATE/DELETE) przez `authenticated`,
--   `anon` oraz `PUBLIC` na tabelach ekonomii i logach otwierania paczek.
-- - Zostawia `authenticated` wyłącznie odczyt (SELECT) własnych wierszy (lub `is_admin()`).
-- - Przed zmianą polityk weryfikuje istnienie wszystkich wymaganych funkcji RPC oraz
--   rzeczywistej kolumny `user_id` na każdej docelowej tabeli.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PRE-FLIGHT WERYFIKUJĄCY GOTOWOŚĆ WSZYSTKICH RPC PRZED ODEBRANIEM ZAPISU
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    v_missing := array_append(v_missing, 'public.is_admin()');
  END IF;
  IF to_regprocedure('public.open_pack_atomic(uuid,uuid,text,text[],text)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.open_pack_atomic(...)');
  END IF;
  IF to_regprocedure('public.apply_delta_points_transaction(uuid,integer,text,text,text,text,jsonb)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.apply_delta_points_transaction(...)');
  END IF;
  IF to_regprocedure('public.purchase_pack_atomic(uuid,text,text)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.purchase_pack_atomic(...)');
  END IF;
  IF to_regprocedure('public.claim_daily_spin_atomic(uuid,text,text,integer,text,text)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.claim_daily_spin_atomic(...)');
  END IF;
  IF to_regprocedure('public.claim_challenge_reward_atomic(uuid,text,integer,text,text,jsonb)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.claim_challenge_reward_atomic(...)');
  END IF;
  IF to_regprocedure('public.grant_sync_reward_packs_atomic(uuid,jsonb)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.grant_sync_reward_packs_atomic(...)');
  END IF;
  IF to_regprocedure('public.claim_achievement_reward_atomic(uuid,uuid,integer,text,text)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.claim_achievement_reward_atomic(...)');
  END IF;
  IF to_regprocedure('public.complete_quiz_reward_atomic(uuid,text,integer,integer,jsonb)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.complete_quiz_reward_atomic(...)');
  END IF;
  IF to_regprocedure('public.claim_reward_once_atomic(uuid,text,text,integer,text,text,jsonb)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.claim_reward_once_atomic(...)');
  END IF;
  IF to_regprocedure('public.grant_user_card_atomic(uuid,text,boolean,text,uuid,text)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.grant_user_card_atomic(...)');
  END IF;
  IF to_regprocedure('public.admin_set_delta_points_atomic(uuid,uuid,integer,integer,text)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.admin_set_delta_points_atomic(...)');
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'ABORT RLS HARDENING: Brak wymaganych funkcji RPC (uruchom najpierw Fazy A i B): %',
      array_to_string(v_missing, ', ');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. UTWARDZENIE RLS ORAZ REVOKE/GRANT NA TABELACH EKONOMII UŻYTKOWNIKA
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
  v_pol RECORD;
  v_has_user_id BOOLEAN;
  v_protected_tables TEXT[] := ARRAY[
    'user_cards',
    'user_unopened_packs',
    'user_delta_points',
    'pack_opening_logs',
    'delta_points_transactions',
    'user_daily_spins',
    'user_quiz_completions',
    'user_claimed_challenges',
    'user_claimed_rewards',
    'admin_card_grants'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_protected_tables
  LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Brak wymaganej tabeli public.% (uruchom najpierw Fazę A).', v_table;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'user_id'
    ) INTO v_has_user_id;

    IF NOT v_has_user_id THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Tabela public.% nie posiada oczekiwanej kolumny user_id.', v_table;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

    -- Usunięcie wszystkich starych polityk na tabeli (w tym modify_own / for all)
    FOR v_pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
    END LOOP;

    -- Odebranie przywilejów zapisu dla PUBLIC, anon i authenticated
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', v_table);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);

    -- Polityka odczytu: wyłącznie własne wiersze lub administrator
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR public.is_admin())',
      v_table || '_select_own_or_admin',
      v_table
    );

    -- Polityka zapisu/zarządzania wyłącznie przez serwer (service_role)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      v_table || '_service_role_all',
      v_table
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. UTWARDZENIE KATALOGÓW DEFINICJI (card_definitions, pack_definitions, pack_types)
-- Odczyt publiczny dla aplikacji i albumu; zapis wyłącznie po stronie serwera (service_role)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_def_table TEXT;
  v_pol RECORD;
  v_def_tables TEXT[] := ARRAY['card_definitions', 'pack_definitions', 'pack_types'];
BEGIN
  FOREACH v_def_table IN ARRAY v_def_tables
  LOOP
    IF to_regclass('public.' || v_def_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_def_table);

      FOR v_pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_def_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_def_table);
      END LOOP;

      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_def_table);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', v_def_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_def_table);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        v_def_table || '_read_public',
        v_def_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        v_def_table || '_service_role_all',
        v_def_table
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
