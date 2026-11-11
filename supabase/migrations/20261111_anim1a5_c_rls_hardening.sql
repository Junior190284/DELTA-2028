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
-- - Chroni prywatność dzieci w `card_definitions`: brak dostępu dla `anon` i `PUBLIC`,
--   dla `authenticated` wyłącznie karty powiązanego dziecka (`is_parent_of`), posiadane
--   w `user_cards` lub dla sztabu (`is_admin()` / `is_staff()`).
-- - Przed zmianą polityk weryfikuje istnienie wszystkich RPC, brak nieznanych
--   przeciążeń w `pg_proc`, bezpieczeństwo `EXECUTE` oraz brak `attacl` zapisu.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PRE-FLIGHT WERYFIKUJĄCY GOTOWOŚĆ RPC, PRZECIĄŻENIA, EXECUTE ORAZ ATTACL
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_expected_oids OID[] := ARRAY[]::OID[];
  v_mutating_sigs TEXT[] := ARRAY[
    'public.open_pack_atomic(uuid,uuid,text,text[],text)',
    'public.apply_delta_points_transaction(uuid,integer,text,text,text,text,jsonb)',
    'public.purchase_pack_atomic(uuid,text,text)',
    'public.claim_daily_spin_atomic(uuid,text,text,integer,text,text)',
    'public.claim_challenge_reward_atomic(uuid,text,integer,text,text,jsonb)',
    'public.grant_sync_reward_packs_atomic(uuid,jsonb)',
    'public.claim_achievement_reward_atomic(uuid,uuid,integer,text,text)',
    'public.complete_quiz_reward_atomic(uuid,text,integer,integer,jsonb)',
    'public.claim_reward_once_atomic(uuid,text,text,integer,text,text,jsonb)',
    'public.grant_user_card_atomic(uuid,text,boolean,text,uuid,text)',
    'public.admin_set_delta_points_atomic(uuid,uuid,integer,integer,text)'
  ];
  v_helper_sigs TEXT[] := ARRAY[
    'public.is_admin()',
    'public.is_staff()',
    'public.is_parent_of(uuid)'
  ];
  v_checked_names TEXT[] := ARRAY[
    'is_admin',
    'is_staff',
    'is_parent_of',
    'open_pack_atomic',
    'apply_delta_points_transaction',
    'purchase_pack_atomic',
    'claim_daily_spin_atomic',
    'claim_challenge_reward_atomic',
    'grant_sync_reward_packs_atomic',
    'claim_achievement_reward_atomic',
    'complete_quiz_reward_atomic',
    'claim_reward_once_atomic',
    'grant_user_card_atomic',
    'admin_set_delta_points_atomic'
  ];
  v_target_tables TEXT[] := ARRAY[
    'user_cards',
    'user_unopened_packs',
    'user_delta_points',
    'pack_opening_logs',
    'delta_points_transactions',
    'user_daily_spins',
    'user_quiz_completions',
    'user_claimed_challenges',
    'user_claimed_rewards',
    'admin_card_grants',
    'card_definitions',
    'pack_definitions',
    'pack_types'
  ];
  v_sig TEXT;
  v_oid OID;
  v_proc RECORD;
  v_extra RECORD;
  v_col_acl RECORD;
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    v_missing := array_append(v_missing, 'public.is_admin()');
  END IF;
  IF to_regprocedure('public.is_staff()') IS NULL THEN
    v_missing := array_append(v_missing, 'public.is_staff()');
  END IF;
  IF to_regprocedure('public.is_parent_of(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'public.is_parent_of(uuid)');
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

  IF to_regprocedure('public.purchase_pack_atomic(text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT RLS HARDENING: Wykryto przestarzałe przeciążenie public.purchase_pack_atomic(text, text).';
  END IF;

  -- Zbiór oczekiwanych OID i twarda blokada nieznanych przeciążeń w pg_proc
  FOREACH v_sig IN ARRAY (v_mutating_sigs || v_helper_sigs) LOOP
    v_expected_oids := array_append(v_expected_oids, to_regprocedure(v_sig)::oid);
  END LOOP;

  FOR v_extra IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(v_checked_names)
      AND p.oid <> ALL(v_expected_oids)
  LOOP
    RAISE EXCEPTION 'ABORT RLS HARDENING: Wykryto nieznane lub przestarzałe przeciążenie funkcji RPC: %', v_extra.sig;
  END LOOP;

  -- Kontrola 11 mutujących RPC ekonomii: wyłącznie SECURITY DEFINER, przypięty search_path, zero EXECUTE dla PUBLIC/anon/authenticated
  FOREACH v_sig IN ARRAY v_mutating_sigs LOOP
    v_oid := to_regprocedure(v_sig)::oid;
    SELECT p.prosecdef, p.proconfig, p.proacl
    INTO v_proc
    FROM pg_proc p
    WHERE p.oid = v_oid;

    IF v_proc.prosecdef IS NOT TRUE THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Funkcja % nie ma atrybutu SECURITY DEFINER.', v_sig;
    END IF;

    IF v_proc.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(v_proc.proconfig) cfg WHERE cfg ~ '^search_path='
    ) THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Funkcja % nie ma jawnie ustawionego search_path.', v_sig;
    END IF;

    IF v_proc.proacl IS NULL OR EXISTS (
      SELECT 1 FROM aclexplode(v_proc.proacl) acl
      WHERE acl.grantee = 0::oid AND acl.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Niebezpieczne uprawnienie EXECUTE dla PUBLIC na mutującej funkcji %.', v_sig;
    END IF;

    IF has_function_privilege('anon', v_oid, 'EXECUTE')
       OR has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Niebezpieczne uprawnienie EXECUTE dla anon/authenticated na mutującej funkcji %.', v_sig;
    END IF;
  END LOOP;

  -- Kontrola 3 funkcji pomocniczych RLS (is_admin, is_staff, is_parent_of): brak EXECUTE dla PUBLIC i anon
  FOREACH v_sig IN ARRAY v_helper_sigs LOOP
    v_oid := to_regprocedure(v_sig)::oid;
    SELECT p.prosecdef, p.proconfig, p.proacl
    INTO v_proc
    FROM pg_proc p
    WHERE p.oid = v_oid;

    IF v_proc.prosecdef IS NOT TRUE THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Funkcja pomocnicza % nie ma atrybutu SECURITY DEFINER.', v_sig;
    END IF;

    IF v_sig = 'public.is_admin()' AND (
      v_proc.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(v_proc.proconfig) cfg WHERE cfg ~ '^search_path='
      )
    ) THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Funkcja % nie ma jawnie ustawionego search_path.', v_sig;
    END IF;

    IF v_proc.proacl IS NULL OR EXISTS (
      SELECT 1 FROM aclexplode(v_proc.proacl) acl
      WHERE acl.grantee = 0::oid AND acl.privilege_type = 'EXECUTE'
    ) OR has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'ABORT RLS HARDENING: Niebezpieczne uprawnienie EXECUTE dla PUBLIC/anon na funkcji pomocniczej %.', v_sig;
    END IF;
  END LOOP;

  -- Kontrola pozostałości uprawnień kolumnowych (pg_attribute.attacl) na docelowych tabelach
  FOR v_col_acl IN
    SELECT c.relname, a.attname
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY(v_target_tables)
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attacl IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM aclexplode(a.attacl) acl
        WHERE acl.grantee = 0::oid
           OR acl.grantee IN (
             SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
           )
      )
  LOOP
    RAISE EXCEPTION 'ABORT RLS HARDENING: Wykryto nieoczekiwane uprawnienia kolumnowe (attacl) na %.%.',
      v_col_acl.relname, v_col_acl.attname;
  END LOOP;
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
-- 3. UTWARDZENIE KATALOGU KART (card_definitions — OCHRONA PRYWATNOŚCI DZIECI)
-- `card_definitions` zawiera `player_id` oraz `card_name` (imię i nazwisko dziecka).
-- - `anon` i `PUBLIC`: CAŁKOWITY BRAK DOSTĘPU (`REVOKE ALL`, brak polityki `anon`).
-- - `authenticated`: wyłącznie aktywne karty powiązanych dzieci (`is_parent_of`),
--   karty posiadane już przez użytkownika w `user_cards`, lub sztab (`is_admin()` / `is_staff()`).
-- - `service_role`: pełny dostęp serwerowy (losowanie z całej puli w `open_pack_atomic` i seed).
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_pol RECORD;
  v_has_is_active BOOLEAN := false;
  v_has_player_id BOOLEAN := false;
  v_cd_player_type TEXT;
  v_cd_id_type TEXT;
  v_uc_card_type TEXT;
  v_parent_expr TEXT;
  v_card_match_expr TEXT;
  v_active_prefix TEXT;
  v_select_using TEXT;
BEGIN
  IF to_regclass('public.card_definitions') IS NULL THEN
    RAISE EXCEPTION 'ABORT RLS HARDENING: Brak wymaganej tabeli public.card_definitions.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'card_definitions' AND column_name = 'is_active'
  ) INTO v_has_is_active;

  SELECT data_type
  INTO v_cd_player_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'card_definitions' AND column_name = 'player_id';

  v_has_player_id := v_cd_player_type IS NOT NULL;
  IF NOT v_has_player_id THEN
    RAISE EXCEPTION 'ABORT RLS HARDENING: Tabela public.card_definitions nie posiada oczekiwanej kolumny player_id.';
  END IF;

  SELECT data_type INTO v_cd_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'card_definitions' AND column_name = 'id';

  SELECT data_type INTO v_uc_card_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user_cards' AND column_name = 'card_id';

  IF v_cd_player_type = 'uuid' THEN
    v_parent_expr := '(player_id IS NOT NULL AND public.is_parent_of(player_id))';
  ELSE
    v_parent_expr := '(player_id IS NOT NULL AND player_id::text ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' AND public.is_parent_of(player_id::uuid))';
  END IF;

  IF v_cd_id_type IS NOT NULL AND v_uc_card_type IS NOT NULL AND v_cd_id_type = v_uc_card_type THEN
    v_card_match_expr := 'uc.card_id = card_definitions.id';
  ELSE
    v_card_match_expr := 'uc.card_id::text = card_definitions.id::text';
  END IF;

  v_active_prefix := CASE WHEN v_has_is_active THEN 'is_active = true AND ' ELSE '' END;

  v_select_using := format(
    'public.is_admin() OR public.is_staff() OR (%s%s) OR EXISTS (SELECT 1 FROM public.user_cards uc WHERE uc.user_id = (SELECT auth.uid()) AND %s)',
    v_active_prefix,
    v_parent_expr,
    v_card_match_expr
  );

  EXECUTE 'ALTER TABLE public.card_definitions ENABLE ROW LEVEL SECURITY';

  FOR v_pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'card_definitions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.card_definitions', v_pol.policyname);
  END LOOP;

  EXECUTE 'REVOKE ALL ON TABLE public.card_definitions FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT SELECT ON TABLE public.card_definitions TO authenticated';
  EXECUTE 'GRANT ALL ON TABLE public.card_definitions TO service_role';

  EXECUTE format(
    'CREATE POLICY card_definitions_select_authenticated ON public.card_definitions FOR SELECT TO authenticated USING (%s)',
    v_select_using
  );

  EXECUTE 'CREATE POLICY card_definitions_service_role_all ON public.card_definitions FOR ALL TO service_role USING (true) WITH CHECK (true)';
END $$;

-- ------------------------------------------------------------------------------
-- 4. UTWARDZENIE KATALOGU PACZEK (pack_definitions, pack_types)
-- Katalog paczek nie zawiera danych osobowych zawodników (brak PII dzieci).
-- Odczyt publiczny dla sklepu/kolekcji; zapis wyłącznie po stronie serwera (service_role).
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_pack_table TEXT;
  v_pol RECORD;
  v_pack_tables TEXT[] := ARRAY['pack_definitions', 'pack_types'];
BEGIN
  FOREACH v_pack_table IN ARRAY v_pack_tables
  LOOP
    IF to_regclass('public.' || v_pack_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_pack_table);

      FOR v_pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_pack_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_pack_table);
      END LOOP;

      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_pack_table);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', v_pack_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_pack_table);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        v_pack_table || '_read_public',
        v_pack_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        v_pack_table || '_service_role_all',
        v_pack_table
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
