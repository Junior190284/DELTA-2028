-- ==============================================================================
-- DELTA INFERNO 3.0 — ETAP ANIM-1A.2: ATOMIC PACK OPENING & IDEMPOTENCY MIGRATION
-- FAZA 1 (ADDYTYWNA, BEZ ZMIAN RLS BLOKUJĄCYCH ISTNIEJĄCE API)
-- ==============================================================================
-- OGRANICZENIE: NIE URUCHAMIAĆ AUTOMATYCZNIE NA PRODUKCJI.
-- Najpierw przetestować i wdrożyć na środowisku STAGING, a następnie na PROD.
-- FAZA 2 (zaostrzenie RLS na user_cards, user_unopened_packs, user_delta_points)
-- może zostać uruchomiona dopiero po migracji pozostałych endpointów API i AdminPanel.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ZGODNOŚĆ SCHEMATU STAGING <-> PRODUKCJA (ADDYTYWNIE)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.card_definitions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.pack_opening_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_type_id TEXT NOT NULL,
  cards_drawn JSONB NOT NULL,
  delta_points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.pack_opening_logs
  ADD COLUMN IF NOT EXISTS unopened_pack_id UUID REFERENCES public.user_unopened_packs(id),
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS response_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_pack_opening_logs_user
  ON public.pack_opening_logs(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pack_opening_logs_unopened_pack
  ON public.pack_opening_logs(unopened_pack_id)
  WHERE unopened_pack_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pack_opening_logs_user_idempotency
  ON public.pack_opening_logs(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Zabezpieczenie minimalnego constraintu duplicates_count >= 0
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_cards'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_cards_duplicates_non_negative'
  ) THEN
    ALTER TABLE public.user_cards
      ADD CONSTRAINT chk_user_cards_duplicates_non_negative CHECK (duplicates_count >= 0);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ATOMOWA FUNKCJA OTWIERANIA PACZKI (SERVICE_ROLE ONLY, SERIALIZACJA PER USER_ID)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_pack_atomic(
  p_user_id UUID,
  p_pack_id UUID DEFAULT NULL,
  p_pack_type_id TEXT DEFAULT NULL,
  p_drawn_card_ids TEXT[] DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_idem_key TEXT := NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '');
  v_user_lock_key BIGINT;
  v_existing_log RECORD;
  v_pack RECORD;
  v_expected_count INTEGER;
  v_raw_card_id TEXT;
  v_matched_card_text TEXT;
  v_typed_card_id public.user_cards.card_id%TYPE;
  v_card_rarity TEXT;
  v_dup_points INTEGER;
  v_is_dup BOOLEAN;
  v_curr_dup_count INTEGER;
  v_total_dp INTEGER := 0;
  v_cards_result JSONB := '[]'::jsonb;
  v_cards_drawn_log JSONB := '[]'::jsonb;
  v_dp_result JSONB;
  v_new_balance INTEGER := 0;
  v_prev_earned INTEGER := 0;
  v_remaining INTEGER := 0;
  v_final_payload JSONB;
BEGIN
  -- 1. Walidacja tożsamości i parametrów wejściowych
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'UNAUTHORIZED',
      'status', 401,
      'error', 'Wymagana autoryzacja użytkownika.'
    );
  END IF;

  IF p_drawn_card_ids IS NULL OR COALESCE(array_length(p_drawn_card_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'NO_AVAILABLE_CARDS',
      'status', 400,
      'error', 'Brak wylosowanych kart.'
    );
  END IF;

  -- 2. KRYTYCZNE: Transakcyjny advisory lock per user_id (64-bit MD5 hash)
  -- Serializuje równoległe otwarcia paczek TEGO SAMEGO gracza (w tym różne paczki),
  -- zapobiegając wyścigom przy zapisie nowej karty, wyliczaniu duplikatów i DP,
  -- bez blokowania innych użytkowników systemu.
  v_user_lock_key := ('x' || substr(md5('open_pack_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_user_lock_key);

  -- 3. Trwała idempotencja po (user_id, idempotency_key) już PO nabyciu locka użytkownika
  IF v_clean_idem_key IS NOT NULL THEN
    SELECT id, response_payload INTO v_existing_log
    FROM public.pack_opening_logs
    WHERE user_id = p_user_id AND idempotency_key = v_clean_idem_key;

    IF FOUND AND v_existing_log.response_payload IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'response_payload', v_existing_log.response_payload
      );
    END IF;
  END IF;

  -- 4. Pobranie i atomowe zablokowanie konkretnej lub najstarszej uprawnionej paczki
  IF p_pack_id IS NOT NULL THEN
    SELECT id, pack_type_id, is_opened INTO v_pack
    FROM public.user_unopened_packs
    WHERE id = p_pack_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'PACK_NOT_FOUND',
        'status', 404,
        'error', 'Nie znaleziono paczki do otwarcia.'
      );
    END IF;

    IF v_pack.is_opened THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_OPENED',
        'status', 409,
        'error', 'ALREADY_OPENED: Ta paczka została już otwarta.'
      );
    END IF;

    IF NULLIF(TRIM(COALESCE(p_pack_type_id, '')), '') IS NOT NULL
       AND v_pack.pack_type_id <> p_pack_type_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'PACK_TYPE_MISMATCH',
        'status', 400,
        'error', 'Niezgodny typ wskazanej paczki.'
      );
    END IF;
  ELSE
    IF NULLIF(TRIM(COALESCE(p_pack_type_id, '')), '') IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'NO_UNOPENED_PACK',
        'status', 400,
        'error', 'Brak typu paczki.'
      );
    END IF;

    SELECT id, pack_type_id, is_opened INTO v_pack
    FROM public.user_unopened_packs
    WHERE user_id = p_user_id
      AND pack_type_id = p_pack_type_id
      AND is_opened = false
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'NO_UNOPENED_PACK',
        'status', 400,
        'error', 'Brak dostępnej paczki tego typu do otwarcia.'
      );
    END IF;
  END IF;

  -- 5. Walidacja liczby kart z definicji paczki (z obsługą pack_definitions i pack_types)
  IF to_regclass('public.pack_definitions') IS NOT NULL THEN
    SELECT cards_count INTO v_expected_count
    FROM public.pack_definitions
    WHERE id = v_pack.pack_type_id;
  END IF;

  IF v_expected_count IS NULL AND to_regclass('public.pack_types') IS NOT NULL THEN
    SELECT cards_count INTO v_expected_count
    FROM public.pack_types
    WHERE id = v_pack.pack_type_id;
  END IF;

  IF v_expected_count IS NULL THEN
    v_expected_count := CASE v_pack.pack_type_id
      WHEN 'standard_pack' THEN 3
      WHEN 'matchday_booster' THEN 4
      WHEN 'gold_booster' THEN 5
      WHEN 'inferno_booster' THEN 5
      WHEN 'legend_pack' THEN 6
      WHEN 'legend_booster' THEN 6
      ELSE 3
    END;
  END IF;

  IF array_length(p_drawn_card_ids, 1) <> v_expected_count THEN
    RAISE EXCEPTION 'INVALID_CARDS_COUNT: oczekiwano %, otrzymano %',
      v_expected_count, array_length(p_drawn_card_ids, 1);
  END IF;

  -- 6. Oznaczenie paczki jako otwartej wewnątrz transakcji
  UPDATE public.user_unopened_packs
  SET is_opened = true,
      opened_at = timezone('utc'::text, now())
  WHERE id = v_pack.id;

  -- 7. Atomowe przetwarzanie każdego wylosowanego slotu w kolejności losowania
  -- Używa typu %TYPE (kompatybilnego z UUID na produkcji i TEXT na stagingu)
  -- oraz obsługi unique_violation chroniącej przed zapisami z innych ścieżek (np. achievements/sync, admin grant).
  FOREACH v_raw_card_id IN ARRAY p_drawn_card_ids
  LOOP
    SELECT cd.id, cd.id::TEXT, cd.rarity
    INTO v_typed_card_id, v_matched_card_text, v_card_rarity
    FROM public.card_definitions cd
    WHERE cd.id::TEXT = v_raw_card_id
      AND COALESCE(cd.is_active, true) = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_OR_INACTIVE_CARD: %', v_raw_card_id;
    END IF;

    SELECT duplicates_count INTO v_curr_dup_count
    FROM public.user_cards
    WHERE user_id = p_user_id AND card_id = v_typed_card_id
    FOR UPDATE;

    IF FOUND THEN
      v_is_dup := true;
      UPDATE public.user_cards
      SET duplicates_count = duplicates_count + 1
      WHERE user_id = p_user_id AND card_id = v_typed_card_id;
    ELSE
      BEGIN
        INSERT INTO public.user_cards (user_id, card_id, duplicates_count)
        VALUES (p_user_id, v_typed_card_id, 0);
        v_is_dup := false;
      EXCEPTION
        WHEN unique_violation THEN
          -- Zewnętrzna równoległa ścieżka (np. achievements/sync, grant-special) wstawiła wiersz
          -- dokładnie między naszym SELECT a INSERT -> bezpiecznie konwertujemy na duplikat.
          UPDATE public.user_cards
          SET duplicates_count = duplicates_count + 1
          WHERE user_id = p_user_id AND card_id = v_typed_card_id;
          v_is_dup := true;
      END;
    END IF;

    IF v_is_dup THEN
      v_dup_points := CASE LOWER(COALESCE(v_card_rarity, 'common'))
        WHEN 'inferno' THEN 120
        WHEN 'legendary' THEN 60
        WHEN 'epic' THEN 25
        WHEN 'rare' THEN 10
        ELSE 4
      END;
      v_total_dp := v_total_dp + v_dup_points;
    ELSE
      v_dup_points := 0;
    END IF;

    v_cards_result := v_cards_result || jsonb_build_array(
      jsonb_build_object(
        'card_id', v_matched_card_text,
        'is_duplicate', v_is_dup,
        'duplicate_points', v_dup_points
      )
    );

    v_cards_drawn_log := v_cards_drawn_log || jsonb_build_array(
      jsonb_build_object(
        'card_id', v_matched_card_text,
        'rarity', v_card_rarity,
        'is_duplicate', v_is_dup,
        'points', v_dup_points
      )
    );
  END LOOP;

  -- 8. Atomowe księgowanie Delta Points za duplikaty
  IF v_total_dp > 0 THEN
    IF to_regprocedure('public.apply_delta_points_transaction(uuid,integer,text,text,text,text,jsonb)') IS NOT NULL THEN
      v_dp_result := public.apply_delta_points_transaction(
        p_user_id,
        v_total_dp,
        'EARN',
        'PACK_DUPLICATE',
        v_pack.id::TEXT,
        'pack_dp_' || v_pack.id::TEXT,
        jsonb_build_object('pack_id', v_pack.id, 'pack_type_id', v_pack.pack_type_id)
      );

      IF COALESCE((v_dp_result->>'success')::BOOLEAN, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'DP_TRANSACTION_FAILED: %', COALESCE(v_dp_result->>'error', 'unknown');
      END IF;

      v_new_balance := COALESCE((v_dp_result->>'new_balance')::INTEGER, 0);
    ELSE
      SELECT points_balance, COALESCE(total_earned, 0)
      INTO v_new_balance, v_prev_earned
      FROM public.user_delta_points
      WHERE user_id = p_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        v_new_balance := v_total_dp;
        INSERT INTO public.user_delta_points (user_id, points_balance, total_earned, updated_at)
        VALUES (p_user_id, v_new_balance, v_total_dp, timezone('utc'::text, now()));
      ELSE
        v_new_balance := COALESCE(v_new_balance, 0) + v_total_dp;
        UPDATE public.user_delta_points
        SET points_balance = v_new_balance,
            total_earned = v_prev_earned + v_total_dp,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = p_user_id;
      END IF;
    END IF;
  ELSE
    SELECT COALESCE(points_balance, 0) INTO v_new_balance
    FROM public.user_delta_points
    WHERE user_id = p_user_id;
  END IF;

  -- 9. Policzenie pozostałych paczek oraz finalny zapis rejestru + payloadu idempotentnego
  SELECT COUNT(*) INTO v_remaining
  FROM public.user_unopened_packs
  WHERE user_id = p_user_id AND is_opened = false;

  v_final_payload := jsonb_build_object(
    'cards_meta', v_cards_result,
    'total_delta_points_earned', v_total_dp,
    'new_points_balance', COALESCE(v_new_balance, 0),
    'pack_type_id', v_pack.pack_type_id,
    'consumed_pack_id', v_pack.id,
    'remaining_unopened_packs_count', COALESCE(v_remaining, 0)
  );

  INSERT INTO public.pack_opening_logs (
    user_id,
    pack_type_id,
    cards_drawn,
    delta_points_awarded,
    unopened_pack_id,
    idempotency_key,
    response_payload
  )
  VALUES (
    p_user_id,
    v_pack.pack_type_id,
    v_cards_drawn_log,
    v_total_dp,
    v_pack.id,
    v_clean_idem_key,
    v_final_payload
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'response_payload', v_final_payload
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. UPRAWNIENIA FUNKCJI (STRICT SERVICE_ROLE ONLY)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.open_pack_atomic(UUID, UUID, TEXT, TEXT[], TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_pack_atomic(UUID, UUID, TEXT, TEXT[], TEXT)
  TO service_role;

COMMIT;
