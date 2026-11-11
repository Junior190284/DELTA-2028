-- ==============================================================================
-- DELTA INFERNO 3.0 — ANIM-1A.5 E2E.6 FINAL: ROLLBACK DANYCH SYNTETYCZNYCH (STAGING)
-- ==============================================================================
-- Docelowe środowisko: WYŁĄCZNIE Supabase Staging (tdlsxamxtygojxhmjjvp).
-- Funkcje bezpieczeństwa:
--   1. Weryfikacja założeń stanu przed usunięciem (4 graczy, w tym 1 E2E TEST PLAYER, i 5 kart).
--   2. Audyt WSZYSTKICH FK w pg_constraint wskazujących na card_definitions lub players.
--   3. Jawna kontrola parent_players, user_cards, admin_card_grants, user_squads,
--      user_profile_customization oraz odwołań JSONB w pack_opening_logs.
--   4. Bezwzględna blokada rollbacku (RAISE EXCEPTION) przy jakichkolwiek powiązaniach.
--   5. Wymóg ścisłych liczników usunięć: v_deleted_cards = 5 oraz v_deleted_players = 1.
--   6. Ochrona 3 istniejących zawodników przed jakąkolwiek modyfikacją lub usunięciem.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_player_id UUID := 'e2e57000-0000-4e2e-8000-000000000001'::uuid;
  v_card_ids TEXT[] := ARRAY[
    'e2e57000-0001-4e2e-8000-000000000001',
    'e2e57000-0002-4e2e-8000-000000000002',
    'e2e57000-0003-4e2e-8000-000000000003',
    'e2e57000-0004-4e2e-8000-000000000004',
    'e2e57000-0005-4e2e-8000-000000000005'
  ];
  v_uuid_like_patterns TEXT[] := ARRAY[
    '%e2e57000-0001-4e2e-8000-000000000001%',
    '%e2e57000-0002-4e2e-8000-000000000002%',
    '%e2e57000-0003-4e2e-8000-000000000003%',
    '%e2e57000-0004-4e2e-8000-000000000004%',
    '%e2e57000-0005-4e2e-8000-000000000005%',
    '%e2e57000-0000-4e2e-8000-000000000001%'
  ];
  v_pre_total_players INTEGER := 0;
  v_pre_synth_player INTEGER := 0;
  v_pre_synth_cards INTEGER := 0;
  v_pre_total_cards INTEGER := 0;
  v_fk RECORD;
  v_ref_cnt INTEGER := 0;
  v_deleted_cards INTEGER := 0;
  v_deleted_players INTEGER := 0;
  v_remaining_players INTEGER := 0;
  v_remaining_cards INTEGER := 0;
BEGIN
  -- 1. Kontrola założeń bazowych przed rollbackiem
  SELECT COUNT(*) INTO v_pre_total_players FROM public.players;
  SELECT COUNT(*) INTO v_pre_synth_player
  FROM public.players
  WHERE id = v_player_id
    AND display_name = 'E2E TEST PLAYER';

  SELECT COUNT(*) INTO v_pre_total_cards FROM public.card_definitions;
  SELECT COUNT(*) INTO v_pre_synth_cards
  FROM public.card_definitions
  WHERE id = ANY(ARRAY[
    'e2e57000-0001-4e2e-8000-000000000001'::uuid,
    'e2e57000-0002-4e2e-8000-000000000002'::uuid,
    'e2e57000-0003-4e2e-8000-000000000003'::uuid,
    'e2e57000-0004-4e2e-8000-000000000004'::uuid,
    'e2e57000-0005-4e2e-8000-000000000005'::uuid
  ])
    AND player_id = v_player_id;

  IF v_pre_synth_player <> 1 OR v_pre_total_players <> 4 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Stan tabeli players odbiega od założeń (synth=%, total=%; oczekiwano 1 i 4).',
      v_pre_synth_player, v_pre_total_players;
  END IF;

  IF v_pre_synth_cards <> 5 OR v_pre_total_cards <> 5 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Stan tabeli card_definitions odbiega od założeń (synth=%, total=%; oczekiwano 5 i 5).',
      v_pre_synth_cards, v_pre_total_cards;
  END IF;

  -- 2. Dynamiczny audyt WSZYSTKICH FK w pg_constraint wskazujących na card_definitions(id) lub players(id)
  FOR v_fk IN
    SELECT
      c.conname AS constraint_name,
      ns.nspname AS schema_name,
      cls.relname AS table_name,
      a.attname AS col_name,
      (c.conrelid = 'public.card_definitions'::regclass) AS is_card_defs,
      (c.confrelid = 'public.card_definitions'::regclass) AS targets_card_defs
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS fk_col(attnum, ord) ON true
    JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS ref_col(attnum, ord) ON fk_col.ord = ref_col.ord
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = fk_col.attnum AND NOT a.attisdropped
    JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = ref_col.attnum AND NOT ra.attisdropped
    WHERE c.contype = 'f'
      AND c.confrelid IN ('public.card_definitions'::regclass, 'public.players'::regclass)
      AND ra.attname = 'id'
  LOOP
    IF v_fk.is_card_defs AND NOT v_fk.targets_card_defs THEN
      SELECT COUNT(*) INTO v_ref_cnt
      FROM public.card_definitions
      WHERE player_id = v_player_id
        AND id::text <> ALL(v_card_ids);
      IF v_ref_cnt > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_ABORTED: card_definitions posiada % nieoczekiwanych kart dla testowego gracza.', v_ref_cnt;
      END IF;
    ELSIF v_fk.targets_card_defs THEN
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE %I::text = ANY($1)', v_fk.schema_name, v_fk.table_name, v_fk.col_name)
        INTO v_ref_cnt USING v_card_ids;
      IF v_ref_cnt > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela %.%.% (FK %) posiada % powiązań do syntetycznych kart.',
          v_fk.schema_name, v_fk.table_name, v_fk.col_name, v_fk.constraint_name, v_ref_cnt;
      END IF;
    ELSE
      EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE %I::text = $1', v_fk.schema_name, v_fk.table_name, v_fk.col_name)
        INTO v_ref_cnt USING v_player_id::text;
      IF v_ref_cnt > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela %.%.% (FK %) posiada % powiązań do testowego gracza.',
          v_fk.schema_name, v_fk.table_name, v_fk.col_name, v_fk.constraint_name, v_ref_cnt;
      END IF;
    END IF;
  END LOOP;

  -- 3. Jawna kontrola kluczowych relacji (nawet gdyby brakowało formalnego FK na Stagingu)
  SELECT COUNT(*) INTO v_ref_cnt
  FROM public.parent_players
  WHERE player_id = v_player_id;
  IF v_ref_cnt > 0 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela parent_players wciąż zawiera % powiązań z testowym graczem.', v_ref_cnt;
  END IF;

  SELECT COUNT(*) INTO v_ref_cnt
  FROM public.user_cards
  WHERE card_id::text = ANY(v_card_ids);
  IF v_ref_cnt > 0 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela user_cards wciąż zawiera % syntetycznych kart należących do kont.', v_ref_cnt;
  END IF;

  IF to_regclass('public.admin_card_grants') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.admin_card_grants WHERE card_id::text = ANY($1)'
      INTO v_ref_cnt USING v_card_ids;
    IF v_ref_cnt > 0 THEN
      RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela admin_card_grants wciąż zawiera % wpisów z kartami E2E.', v_ref_cnt;
    END IF;
  END IF;

  IF to_regclass('public.user_squads') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_squads' AND column_name = 'captain_card_id'
     ) THEN
    EXECUTE 'SELECT COUNT(*) FROM public.user_squads
             WHERE captain_card_id::text = ANY($1)
                OR coach_card_id::text = ANY($1)
                OR stadium_card_id::text = ANY($1)
                OR crest_card_id::text = ANY($1)'
      INTO v_ref_cnt USING v_card_ids;
    IF v_ref_cnt > 0 THEN
      RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela user_squads wciąż odwołuje się do syntetycznych kart (%).', v_ref_cnt;
    END IF;
  END IF;

  IF to_regclass('public.user_profile_customization') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_profile_customization' AND column_name = 'active_main_card_id'
     ) THEN
    EXECUTE 'SELECT COUNT(*) FROM public.user_profile_customization WHERE active_main_card_id = ANY($1)'
      INTO v_ref_cnt USING v_card_ids;
    IF v_ref_cnt > 0 THEN
      RAISE EXCEPTION 'ROLLBACK_ABORTED: user_profile_customization wskazuje na syntetyczną kartę (%).', v_ref_cnt;
    END IF;
  END IF;

  -- 4. Kontrola odwołań JSONB (cards_drawn / response_payload w pack_opening_logs)
  IF to_regclass('public.pack_opening_logs') IS NOT NULL THEN
    EXECUTE $json_chk$
      SELECT COUNT(*)
      FROM public.pack_opening_logs pol
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(pol.cards_drawn) = 'array' THEN pol.cards_drawn ELSE '[]'::jsonb END
        ) AS elem
        WHERE elem->>'card_id' = ANY($1)
      )
      OR pol.cards_drawn::text ILIKE ANY($2)
      OR to_jsonb(pol)::text ILIKE ANY($2)
    $json_chk$
    INTO v_ref_cnt USING v_card_ids, v_uuid_like_patterns;
    IF v_ref_cnt > 0 THEN
      RAISE EXCEPTION 'ROLLBACK_ABORTED: Tabela pack_opening_logs zawiera % wpisów JSONB z kartami lub graczem E2E.', v_ref_cnt;
    END IF;
  END IF;

  -- 5. Usunięcie WYŁĄCZNIE 5 konkretnych UUID kart
  DELETE FROM public.card_definitions
  WHERE id IN (
    'e2e57000-0001-4e2e-8000-000000000001'::uuid,
    'e2e57000-0002-4e2e-8000-000000000002'::uuid,
    'e2e57000-0003-4e2e-8000-000000000003'::uuid,
    'e2e57000-0004-4e2e-8000-000000000004'::uuid,
    'e2e57000-0005-4e2e-8000-000000000005'::uuid
  )
    AND player_id = v_player_id;
  GET DIAGNOSTICS v_deleted_cards = ROW_COUNT;

  IF v_deleted_cards <> 5 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Wymagano usunięcia dokładnie 5 kart, usunięto %.', v_deleted_cards;
  END IF;

  -- 6. Usunięcie WYŁĄCZNIE konkretnego UUID testowego gracza
  DELETE FROM public.players
  WHERE id = v_player_id
    AND display_name = 'E2E TEST PLAYER';
  GET DIAGNOSTICS v_deleted_players = ROW_COUNT;

  IF v_deleted_players <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Wymagano usunięcia dokładnie 1 gracza, usunięto %.', v_deleted_players;
  END IF;

  -- 7. Weryfikacja końcowa przywrócenia stanu wyjściowego (3 graczy, 0 kart)
  SELECT COUNT(*) INTO v_remaining_players FROM public.players;
  SELECT COUNT(*) INTO v_remaining_cards FROM public.card_definitions;

  IF v_remaining_players <> 3 OR v_remaining_cards <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK_ABORTED: Stan końcowy po usunięciu nie zgadza się z bazowym (players=%, cards=%; oczekiwano 3 i 0).',
      v_remaining_players, v_remaining_cards;
  END IF;
END $$;

COMMIT;
