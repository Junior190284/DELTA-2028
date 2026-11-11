-- ==============================================================================
-- DELTA INFERNO 3.0 — ANIM-1A.5 FIX (FAZA B)
-- JEDNOLITE KSIĘGOWANIE DP (apply_delta_points_transaction) ORAZ ATOMOWE RPC EKONOMII
--
-- Plik: supabase/migrations/20261111_anim1a5_b_economy_rpcs.sql
-- WYMAGANIE WSTĘPNE: Wcześniejsze wykonanie Fazy A:
--   20261111_anim1a5_a_missing_tables_and_deps.sql
-- NASTĘPNY KROK: Testy integracyjne API -> Faza C (20261111_anim1a5_c_rls_hardening.sql)
--
-- Cechy:
-- - Definiuje kanoniczną funkcję public.apply_delta_points_transaction(...) zgodną z
--   open_pack_atomic (ETAP ANIM-1A.2) — jeden system księgowania salda i historii DP.
-- - Definiuje purchase_pack_atomic (ceny Scenario B: 60/100/150/300/450) delegującą
--   rozliczenie portfela do apply_delta_points_transaction.
-- - Definiuje wszystkie 8 RPC wymaganych przez backend ANIM-1A.5 z twardym
--   REVOKE ALL FROM PUBLIC, anon, authenticated oraz GRANT EXECUTE TO service_role.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FUNKCJA WERYFIKACJI ROLI ADMINISTRATORA
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. JEDYNY KANONICZNY SYSTEM KSIĘGOWANIA DELTA POINTS (SERVICE_ROLE ONLY)
-- Zgodny z sygnaturą wywoływaną przez open_pack_atomic z ETAP ANIM-1A.2:
--   public.apply_delta_points_transaction(uuid, integer, text, text, text, text, jsonb)
-- Kolejność blokad (DAG bez ryzyka deadlocków):
--   open_pack_atomic ('open_pack_user:') -> apply_delta_points_transaction ('economy_user:')
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_delta_points_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_clean_idem_key TEXT := NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '');
  v_current_balance INTEGER;
  v_total_earned INTEGER;
  v_total_spent INTEGER;
  v_new_balance INTEGER;
  v_new_total_earned INTEGER;
  v_new_total_spent INTEGER;
  v_existing_tx RECORD;
  v_tx_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brak identyfikatora użytkownika');
  END IF;

  IF p_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brak kwoty transakcji');
  END IF;

  IF COALESCE(p_transaction_type, '') NOT IN ('EARN', 'SPEND', 'REFUND', 'ADJUSTMENT') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nieprawidłowy typ transakcji DP');
  END IF;

  IF (p_transaction_type = 'EARN' OR p_transaction_type = 'REFUND') AND p_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transakcja EARN/REFUND wymaga nieujemnej kwoty');
  END IF;

  IF p_transaction_type = 'SPEND' AND p_amount > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transakcja SPEND wymaga niedodatniej kwoty');
  END IF;

  -- Serializacja wszystkich operacji portfela per user_id
  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Idempotencja po kluczu (pełna kontrola: user_id, amount, transaction_type, source_type, source_id)
  IF v_clean_idem_key IS NOT NULL THEN
    SELECT id, user_id, amount, transaction_type, source_type, source_id, balance_after
    INTO v_existing_tx
    FROM public.delta_points_transactions
    WHERE idempotency_key = v_clean_idem_key;

    IF FOUND THEN
      IF v_existing_tx.user_id <> p_user_id
         OR v_existing_tx.amount <> p_amount
         OR v_existing_tx.transaction_type IS DISTINCT FROM p_transaction_type
         OR v_existing_tx.source_type IS DISTINCT FROM p_source_type
         OR v_existing_tx.source_id IS DISTINCT FROM p_source_id
      THEN
        RETURN jsonb_build_object(
          'success', false,
          'code', 'IDEMPOTENCY_CONFLICT',
          'status', 409,
          'error', 'Konflikt klucza idempotencji: niezgodne parametry ponowionej transakcji'
        );
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'transaction_id', v_existing_tx.id,
        'new_balance', v_existing_tx.balance_after,
        'amount', v_existing_tx.amount
      );
    END IF;
  END IF;

  -- Bezpieczne zapewnienie wiersza portfela przed blokadą FOR UPDATE (chroni przed równoległym 1. zapisem)
  INSERT INTO public.user_delta_points (user_id, points_balance, total_earned, total_spent, updated_at)
  VALUES (p_user_id, 0, 0, 0, timezone('utc'::text, now()))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(points_balance, 0), COALESCE(total_earned, 0), COALESCE(total_spent, 0)
  INTO v_current_balance, v_total_earned, v_total_spent
  FROM public.user_delta_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Niewystarczające saldo Delta Points',
      'current_balance', v_current_balance
    );
  END IF;

  IF p_amount > 0 THEN
    v_new_total_earned := v_total_earned + p_amount;
    v_new_total_spent := v_total_spent;
  ELSE
    v_new_total_earned := v_total_earned;
    v_new_total_spent := v_total_spent + ABS(p_amount);
  END IF;

  UPDATE public.user_delta_points
  SET points_balance = v_new_balance,
      total_earned = v_new_total_earned,
      total_spent = v_new_total_spent,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  INSERT INTO public.delta_points_transactions (
    user_id, amount, balance_after, transaction_type, source_type, source_id, idempotency_key, metadata
  )
  VALUES (
    p_user_id,
    p_amount,
    v_new_balance,
    p_transaction_type,
    p_source_type,
    p_source_id,
    v_clean_idem_key,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'amount', p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_delta_points_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_delta_points_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO service_role;

-- ------------------------------------------------------------------------------
-- 3. ZAKUP PACZKI W SKARBcu (SCENARIO B: 60/100/150/300/450, SERVICE_ROLE + p_user_id)
-- Wywoływane wyłącznie przez serwerowy createAdminClient() z user.id sesji.
-- Nie udostępnia się rolom anon/authenticated (brak możliwości podszycia p_user_id).
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.purchase_pack_atomic(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.purchase_pack_atomic(
  p_user_id UUID,
  p_pack_type_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_clean_idem TEXT := NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '');
  v_scoped_idem TEXT;
  v_price INTEGER;
  v_current_balance INTEGER;
  v_existing_tx RECORD;
  v_pack_id UUID;
  v_source_reason TEXT;
  v_dp_res JSONB;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Wymagana autoryzacja');
  END IF;

  CASE p_pack_type_id
    WHEN 'standard_pack' THEN v_price := 60;
    WHEN 'matchday_booster' THEN v_price := 100;
    WHEN 'gold_booster' THEN v_price := 150;
    WHEN 'inferno_booster' THEN v_price := 300;
    WHEN 'legend_pack' THEN v_price := 450;
    WHEN 'legend_booster' THEN v_price := 450;
    ELSE
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_PACK_TYPE', 'status', 400, 'error', 'Nieprawidłowy typ paczki');
  END CASE;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF v_clean_idem IS NOT NULL THEN
    v_scoped_idem := 'buy_' || p_user_id::TEXT || '_' || v_clean_idem;

    SELECT id, user_id, amount, transaction_type, source_type, source_id, balance_after, metadata
    INTO v_existing_tx
    FROM public.delta_points_transactions
    WHERE idempotency_key = v_scoped_idem
    LIMIT 1;

    IF FOUND THEN
      IF v_existing_tx.user_id <> p_user_id
         OR v_existing_tx.amount <> -v_price
         OR v_existing_tx.transaction_type IS DISTINCT FROM 'SPEND'
         OR v_existing_tx.source_type IS DISTINCT FROM 'PACK_PURCHASE'
         OR v_existing_tx.source_id IS DISTINCT FROM p_pack_type_id
      THEN
        RETURN jsonb_build_object(
          'success', false,
          'code', 'IDEMPOTENCY_CONFLICT',
          'status', 409,
          'error', 'Konflikt klucza idempotencji: niezgodny typ paczki lub kwota dla ponowionego zakupu'
        );
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'new_balance', v_existing_tx.balance_after,
        'pack_id', v_existing_tx.metadata->>'pack_id'
      );
    END IF;
  ELSE
    v_scoped_idem := NULL;
  END IF;

  SELECT COALESCE(points_balance, 0) INTO v_current_balance
  FROM public.user_delta_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_current_balance < v_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INSUFFICIENT_BALANCE',
      'status', 400,
      'error', 'Niewystarczająca liczba Delta Points',
      'current_balance', COALESCE(v_current_balance, 0),
      'required_price', v_price
    );
  END IF;

  v_source_reason := 'Zakup w Skarbcu za ' || v_price || ' Delta Points';

  INSERT INTO public.user_unopened_packs (user_id, pack_type_id, source_reason, is_opened)
  VALUES (p_user_id, p_pack_type_id, v_source_reason, false)
  RETURNING id INTO v_pack_id;

  v_dp_res := public.apply_delta_points_transaction(
    p_user_id,
    -v_price,
    'SPEND',
    'PACK_PURCHASE',
    p_pack_type_id,
    v_scoped_idem,
    jsonb_build_object('pack_id', v_pack_id, 'pack_type_id', p_pack_type_id, 'price', v_price)
  );

  IF COALESCE((v_dp_res->>'success')::BOOLEAN, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'PURCHASE_PACK_DP_FAILED: %', COALESCE(v_dp_res->>'error', 'unknown');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'new_balance', COALESCE((v_dp_res->>'new_balance')::INTEGER, 0),
    'pack_id', v_pack_id,
    'transaction_id', v_dp_res->>'transaction_id'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_pack_atomic(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_pack_atomic(UUID, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. ATOMOWE FUNKCJE RPC NAGRÓD I ADMINISTRACJI (WYŁĄCZNIE SERVICE_ROLE)
-- ------------------------------------------------------------------------------

-- 4.1. Koło Fortuny (Daily Spin)
CREATE OR REPLACE FUNCTION public.claim_daily_spin_atomic(
  p_user_id UUID,
  p_segment_id TEXT,
  p_reward_type TEXT,
  p_dp_amount INTEGER DEFAULT 0,
  p_pack_type_id TEXT DEFAULT NULL,
  p_source_reason TEXT DEFAULT 'Nagroda z Koła Fortuny DELTA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_today DATE := (timezone('utc'::text, now()))::DATE;
  v_today_str TEXT := to_char((timezone('utc'::text, now()))::DATE, 'YYYY-MM-DD');
  v_spin RECORD;
  v_new_streak INTEGER := 1;
  v_total_spins INTEGER := 1;
  v_last_spin_date DATE;
  v_dp_res JSONB;
  v_new_balance INTEGER := 0;
  v_pack_id UUID := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Wymagane logowanie');
  END IF;

  IF p_reward_type NOT IN ('points', 'pack') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Nieprawidłowy typ nagrody');
  END IF;

  IF p_reward_type = 'points' AND p_dp_amount NOT IN (25, 50, 100, 200) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Niedozwolona stawka punktów DP');
  END IF;

  IF p_reward_type = 'pack' AND COALESCE(p_pack_type_id, '') NOT IN (
    'standard_pack', 'matchday_booster', 'gold_booster', 'inferno_booster', 'legend_pack', 'legend_booster'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_PACK_TYPE', 'status', 400, 'error', 'Nieprawidłowy typ paczki');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT last_spin_at, streak_count, total_spins INTO v_spin
  FROM public.user_daily_spins
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF FOUND AND v_spin.last_spin_at IS NOT NULL THEN
    v_last_spin_date := (v_spin.last_spin_at AT TIME ZONE 'UTC')::DATE;
    IF v_last_spin_date = v_today THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'DAILY_LIMIT_REACHED',
        'status', 429,
        'error', 'Dzienny limit wykorzystany. Kolejny obrót dostępny po północy!'
      );
    END IF;

    IF v_today - v_last_spin_date = 1 THEN
      v_new_streak := CASE WHEN COALESCE(v_spin.streak_count, 1) >= 7 THEN 1 ELSE COALESCE(v_spin.streak_count, 1) + 1 END;
    ELSE
      v_new_streak := 1;
    END IF;
    v_total_spins := COALESCE(v_spin.total_spins, 0) + 1;
  END IF;

  IF p_reward_type = 'points' THEN
    v_dp_res := public.apply_delta_points_transaction(
      p_user_id,
      p_dp_amount,
      'EARN',
      'DAILY_SPIN',
      p_segment_id,
      'spin_' || p_user_id::TEXT || '_' || v_today_str,
      jsonb_build_object('segmentId', p_segment_id, 'streak', v_new_streak)
    );
    IF COALESCE((v_dp_res->>'success')::BOOLEAN, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'DAILY_SPIN_DP_FAILED: %', COALESCE(v_dp_res->>'error', 'unknown');
    END IF;
    v_new_balance := COALESCE((v_dp_res->>'new_balance')::INTEGER, 0);
  ELSE
    INSERT INTO public.user_unopened_packs (user_id, pack_type_id, source_reason, is_opened)
    VALUES (
      p_user_id,
      p_pack_type_id,
      COALESCE(p_source_reason, 'Nagroda z Koła Fortuny DELTA') || ' (Dzień ' || v_new_streak || '/7)',
      false
    )
    RETURNING id INTO v_pack_id;

    SELECT COALESCE(points_balance, 0) INTO v_new_balance
    FROM public.user_delta_points
    WHERE user_id = p_user_id;
    v_new_balance := COALESCE(v_new_balance, 0);
  END IF;

  INSERT INTO public.user_daily_spins (
    user_id, last_spin_at, last_streak_date, streak_count, total_spins, updated_at
  )
  VALUES (
    p_user_id, timezone('utc'::text, now()), v_today, v_new_streak, v_total_spins, timezone('utc'::text, now())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_spin_at = timezone('utc'::text, now()),
    last_streak_date = v_today,
    streak_count = v_new_streak,
    total_spins = v_total_spins,
    updated_at = timezone('utc'::text, now());

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'granted_pack_id', v_pack_id,
    'streak', v_new_streak,
    'total_spins', v_total_spins
  );
END;
$$;

-- 4.2. Wyzwania Panini
CREATE OR REPLACE FUNCTION public.claim_challenge_reward_atomic(
  p_user_id UUID,
  p_challenge_id TEXT,
  p_dp_amount INTEGER DEFAULT 0,
  p_pack_type_id TEXT DEFAULT NULL,
  p_source_reason TEXT DEFAULT 'Nagroda za wyzwanie DELTA',
  p_reward_summary JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_dp_res JSONB;
  v_new_balance INTEGER := 0;
  v_pack_id UUID := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Unauthorized');
  END IF;

  IF p_dp_amount < 0 OR p_dp_amount > 1000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Nieprawidłowa kwota DP');
  END IF;

  IF p_pack_type_id IS NOT NULL AND p_pack_type_id NOT IN (
    'standard_pack', 'matchday_booster', 'gold_booster', 'inferno_booster', 'legend_pack', 'legend_booster'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_PACK_TYPE', 'status', 400, 'error', 'Nieprawidłowy typ paczki');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  BEGIN
    INSERT INTO public.user_claimed_challenges (user_id, challenge_id, reward_summary)
    VALUES (p_user_id, p_challenge_id, COALESCE(p_reward_summary, '{}'::jsonb));
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_CLAIMED',
        'status', 409,
        'error', 'Nagroda za to wyzwanie została już wcześniej odebrana!'
      );
  END;

  IF p_dp_amount > 0 THEN
    v_dp_res := public.apply_delta_points_transaction(
      p_user_id,
      p_dp_amount,
      'EARN',
      'CHALLENGE',
      p_challenge_id,
      'challenge_' || p_user_id::TEXT || '_' || p_challenge_id,
      COALESCE(p_reward_summary, '{}'::jsonb)
    );
    IF COALESCE((v_dp_res->>'success')::BOOLEAN, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'CHALLENGE_DP_FAILED: %', COALESCE(v_dp_res->>'error', 'unknown');
    END IF;
    v_new_balance := COALESCE((v_dp_res->>'new_balance')::INTEGER, 0);
  ELSE
    SELECT COALESCE(points_balance, 0) INTO v_new_balance FROM public.user_delta_points WHERE user_id = p_user_id;
    v_new_balance := COALESCE(v_new_balance, 0);
  END IF;

  IF p_pack_type_id IS NOT NULL THEN
    INSERT INTO public.user_unopened_packs (user_id, pack_type_id, source_reason, is_opened)
    VALUES (p_user_id, p_pack_type_id, p_source_reason, false)
    RETURNING id INTO v_pack_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'granted_pack_id', v_pack_id
  );
END;
$$;

-- 4.3. Synchronizacja paczek za obecności i osiągnięcia meczowe
CREATE OR REPLACE FUNCTION public.grant_sync_reward_packs_atomic(
  p_user_id UUID,
  p_packs JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_item JSONB;
  v_pack_type TEXT;
  v_reason TEXT;
  v_inserted RECORD;
  v_granted JSONB := '[]'::jsonb;
  v_count INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Wymagane logowanie');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_packs, '[]'::jsonb))
  LOOP
    v_pack_type := v_item->>'pack_type_id';
    v_reason := v_item->>'source_reason';

    IF v_pack_type NOT IN (
      'standard_pack', 'matchday_booster', 'gold_booster', 'inferno_booster', 'legend_pack', 'legend_booster'
    ) THEN
      CONTINUE;
    END IF;

    IF NULLIF(TRIM(COALESCE(v_reason, '')), '') IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_unopened_packs
      WHERE user_id = p_user_id AND source_reason = v_reason
    ) THEN
      INSERT INTO public.user_unopened_packs (user_id, pack_type_id, source_reason, is_opened)
      VALUES (p_user_id, v_pack_type, v_reason, false)
      RETURNING * INTO v_inserted;

      v_granted := v_granted || jsonb_build_array(to_jsonb(v_inserted));
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'granted_count', v_count,
    'granted_packs', v_granted
  );
END;
$$;

-- 4.4. Odbiór nagrody za osiągnięcie
CREATE OR REPLACE FUNCTION public.claim_achievement_reward_atomic(
  p_user_id UUID,
  p_user_achievement_id UUID,
  p_reward_dp INTEGER DEFAULT 0,
  p_pack_type_id TEXT DEFAULT NULL,
  p_source_reason TEXT DEFAULT 'Nagroda za osiągnięcie'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_ach RECORD;
  v_dp_res JSONB;
  v_new_balance INTEGER := 0;
  v_pack_id UUID := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Wymagane logowanie');
  END IF;

  IF p_reward_dp < 0 OR p_reward_dp > 2000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Nieprawidłowa kwota DP');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_ach
  FROM public.user_achievements
  WHERE id = p_user_achievement_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'status', 404, 'error', 'Nie znaleziono osiągnięcia użytkownika.');
  END IF;

  IF COALESCE(v_ach.is_unlocked, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_UNLOCKED', 'status', 400, 'error', 'To osiągnięcie nie zostało jeszcze odblokowane!');
  END IF;

  IF COALESCE(v_ach.claimed_reward, false) IS TRUE THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_CLAIMED', 'status', 409, 'error', 'Nagroda za to osiągnięcie została już odebrana!');
  END IF;

  UPDATE public.user_achievements
  SET claimed_reward = true,
      claimed_at = timezone('utc'::text, now())
  WHERE id = v_ach.id;

  IF p_reward_dp > 0 THEN
    v_dp_res := public.apply_delta_points_transaction(
      p_user_id,
      p_reward_dp,
      'EARN',
      'ACHIEVEMENT',
      v_ach.achievement_id,
      'ach_' || p_user_id::TEXT || '_' || v_ach.id::TEXT,
      jsonb_build_object('achievement_id', v_ach.achievement_id, 'player_id', v_ach.player_id)
    );
    IF COALESCE((v_dp_res->>'success')::BOOLEAN, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'ACHIEVEMENT_DP_FAILED: %', COALESCE(v_dp_res->>'error', 'unknown');
    END IF;
    v_new_balance := COALESCE((v_dp_res->>'new_balance')::INTEGER, 0);
  ELSE
    SELECT COALESCE(points_balance, 0) INTO v_new_balance FROM public.user_delta_points WHERE user_id = p_user_id;
    v_new_balance := COALESCE(v_new_balance, 0);
  END IF;

  IF p_pack_type_id IS NOT NULL AND p_pack_type_id IN (
    'standard_pack', 'matchday_booster', 'gold_booster', 'inferno_booster', 'legend_pack', 'legend_booster'
  ) THEN
    INSERT INTO public.user_unopened_packs (user_id, pack_type_id, source_reason, is_opened)
    VALUES (p_user_id, p_pack_type_id, p_source_reason, false)
    RETURNING id INTO v_pack_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'granted_pack_id', v_pack_id
  );
END;
$$;

-- 4.5. Quiz Kącika Wiedzy
CREATE OR REPLACE FUNCTION public.complete_quiz_reward_atomic(
  p_user_id UUID,
  p_quiz_id TEXT,
  p_score INTEGER,
  p_reward_dp INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_completion_id UUID;
  v_dp_res JSONB;
  v_new_balance INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Wymagane logowanie');
  END IF;

  IF p_score < 75 OR p_score > 100 OR p_reward_dp <= 0 OR p_reward_dp > 500 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Nieprawidłowe parametry quizu');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.user_quiz_completions (user_id, quiz_id, score, points_awarded)
  VALUES (p_user_id, p_quiz_id, p_score, p_reward_dp)
  ON CONFLICT (user_id, quiz_id) DO NOTHING
  RETURNING id INTO v_completion_id;

  IF v_completion_id IS NULL THEN
    SELECT COALESCE(points_balance, 0) INTO v_new_balance
    FROM public.user_delta_points WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'points_awarded', 0,
      'new_balance', COALESCE(v_new_balance, 0)
    );
  END IF;

  v_dp_res := public.apply_delta_points_transaction(
    p_user_id,
    p_reward_dp,
    'EARN',
    'QUIZ_COMPLETION',
    p_quiz_id,
    'quiz_' || p_user_id::TEXT || '_' || p_quiz_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
  IF COALESCE((v_dp_res->>'success')::BOOLEAN, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'QUIZ_DP_FAILED: %', COALESCE(v_dp_res->>'error', 'unknown');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'points_awarded', p_reward_dp,
    'new_balance', COALESCE((v_dp_res->>'new_balance')::INTEGER, 0)
  );
END;
$$;

-- 4.6. Jednorazowe / okresowe nagrody (Quests, Birthday, Season Pass)
CREATE OR REPLACE FUNCTION public.claim_reward_once_atomic(
  p_user_id UUID,
  p_reward_key TEXT,
  p_reward_type TEXT,
  p_dp_amount INTEGER DEFAULT 0,
  p_pack_type_id TEXT DEFAULT NULL,
  p_source_reason TEXT DEFAULT 'Nagroda DELTA',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_claim_id UUID;
  v_dp_res JSONB;
  v_new_balance INTEGER := 0;
  v_pack_id UUID := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Wymagane logowanie');
  END IF;

  IF p_dp_amount < 0 OR p_dp_amount > 1000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Nieprawidłowa kwota DP');
  END IF;

  IF p_pack_type_id IS NOT NULL AND p_pack_type_id NOT IN (
    'standard_pack', 'matchday_booster', 'gold_booster', 'inferno_booster', 'legend_pack', 'legend_booster'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_PACK_TYPE', 'status', 400, 'error', 'Nieprawidłowy typ paczki');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.user_claimed_rewards (
    user_id, reward_key, reward_type, points_awarded, pack_type_id, metadata
  )
  VALUES (
    p_user_id, p_reward_key, p_reward_type, p_dp_amount, p_pack_type_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, reward_key) DO NOTHING
  RETURNING id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CLAIMED',
      'status', 409,
      'error', 'Ta nagroda została już wcześniej odebrana!'
    );
  END IF;

  IF p_dp_amount > 0 THEN
    v_dp_res := public.apply_delta_points_transaction(
      p_user_id,
      p_dp_amount,
      'EARN',
      p_reward_type,
      p_reward_key,
      'reward_' || p_user_id::TEXT || '_' || p_reward_key,
      COALESCE(p_metadata, '{}'::jsonb)
    );
    IF COALESCE((v_dp_res->>'success')::BOOLEAN, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'CLAIM_REWARD_DP_FAILED: %', COALESCE(v_dp_res->>'error', 'unknown');
    END IF;
    v_new_balance := COALESCE((v_dp_res->>'new_balance')::INTEGER, 0);
  ELSE
    SELECT COALESCE(points_balance, 0) INTO v_new_balance FROM public.user_delta_points WHERE user_id = p_user_id;
    v_new_balance := COALESCE(v_new_balance, 0);
  END IF;

  IF p_pack_type_id IS NOT NULL THEN
    INSERT INTO public.user_unopened_packs (user_id, pack_type_id, source_reason, is_opened)
    VALUES (p_user_id, p_pack_type_id, p_source_reason, false)
    RETURNING id INTO v_pack_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'granted_pack_id', v_pack_id
  );
END;
$$;

-- 4.7. Atomowe przyznanie karty (achievements/sync, admin-manage, grant-special)
CREATE OR REPLACE FUNCTION public.grant_user_card_atomic(
  p_user_id UUID,
  p_card_id TEXT,
  p_increment_duplicate BOOLEAN DEFAULT true,
  p_acquisition_source TEXT DEFAULT 'admin',
  p_admin_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_typed_card_id public.user_cards.card_id%TYPE;
  v_existing_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'status', 401, 'error', 'Brak user_id');
  END IF;

  SELECT cd.id INTO v_typed_card_id
  FROM public.card_definitions cd
  WHERE cd.id::TEXT = p_card_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'status', 404, 'error', 'Karta nie istnieje');
  END IF;

  v_lock_key := ('x' || substr(md5('open_pack_user:' || p_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT id INTO v_existing_id
  FROM public.user_cards
  WHERE user_id = p_user_id AND card_id = v_typed_card_id
  FOR UPDATE;

  IF FOUND THEN
    IF p_increment_duplicate THEN
      UPDATE public.user_cards
      SET duplicates_count = COALESCE(duplicates_count, 0) + 1,
          acquisition_source = COALESCE(p_acquisition_source, acquisition_source)
      WHERE id = v_existing_id;
    END IF;
  ELSE
    BEGIN
      INSERT INTO public.user_cards (user_id, card_id, duplicates_count, acquisition_source)
      VALUES (p_user_id, v_typed_card_id, 0, COALESCE(p_acquisition_source, 'admin'));
    EXCEPTION
      WHEN unique_violation THEN
        IF p_increment_duplicate THEN
          UPDATE public.user_cards
          SET duplicates_count = COALESCE(duplicates_count, 0) + 1,
              acquisition_source = COALESCE(p_acquisition_source, acquisition_source)
          WHERE user_id = p_user_id AND card_id = v_typed_card_id;
        END IF;
    END;
  END IF;

  IF p_admin_id IS NOT NULL AND to_regclass('public.admin_card_grants') IS NOT NULL THEN
    INSERT INTO public.admin_card_grants (admin_id, user_id, card_id, reason)
    VALUES (p_admin_id, p_user_id, v_typed_card_id, COALESCE(p_reason, 'Przyznanie administratora'));
  END IF;

  RETURN jsonb_build_object('success', true, 'card_id', v_typed_card_id::TEXT);
END;
$$;

-- 4.8. Atomowa korekta/ustawienie salda DP przez administratora (z wspólnym ledgerem)
CREATE OR REPLACE FUNCTION public.admin_set_delta_points_atomic(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_new_balance INTEGER,
  p_new_total_earned INTEGER DEFAULT NULL,
  p_reason TEXT DEFAULT 'Korekta administratora'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_old_balance INTEGER := 0;
  v_target_earned INTEGER;
  v_diff INTEGER;
BEGIN
  IF p_admin_id IS NULL OR p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'BAD_REQUEST', 'status', 400, 'error', 'Brak wymaganych identyfikatorów');
  END IF;

  IF p_new_balance IS NULL OR p_new_balance < 0 OR p_new_balance > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_AMOUNT', 'status', 400, 'error', 'Nieprawidłowa kwota DP');
  END IF;

  v_lock_key := ('x' || substr(md5('economy_user:' || p_target_user_id::TEXT), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  INSERT INTO public.user_delta_points (user_id, points_balance, total_earned, total_spent, updated_at)
  VALUES (p_target_user_id, 0, 0, 0, timezone('utc'::text, now()))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(points_balance, 0) INTO v_old_balance
  FROM public.user_delta_points
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  v_target_earned := GREATEST(0, COALESCE(p_new_total_earned, p_new_balance));
  v_diff := p_new_balance - v_old_balance;

  UPDATE public.user_delta_points
  SET points_balance = p_new_balance,
      total_earned = v_target_earned,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_target_user_id;

  INSERT INTO public.delta_points_transactions (
    user_id, amount, balance_after, transaction_type, source_type, source_id, metadata
  )
  VALUES (
    p_target_user_id,
    v_diff,
    p_new_balance,
    'ADJUSTMENT',
    'ADMIN',
    p_admin_id::TEXT,
    jsonb_build_object(
      'admin_id', p_admin_id,
      'reason', COALESCE(p_reason, 'Korekta administratora'),
      'previous_balance', v_old_balance
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', p_new_balance,
    'previous_balance', v_old_balance
  );
END;
$$;

-- Uprawnienia EXECUTE wyłącznie dla service_role dla wszystkich 8 nowych RPC
REVOKE ALL ON FUNCTION public.claim_daily_spin_atomic(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_spin_atomic(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.claim_challenge_reward_atomic(UUID, TEXT, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_challenge_reward_atomic(UUID, TEXT, INTEGER, TEXT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.grant_sync_reward_packs_atomic(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_sync_reward_packs_atomic(UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.claim_achievement_reward_atomic(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_achievement_reward_atomic(UUID, UUID, INTEGER, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.complete_quiz_reward_atomic(UUID, TEXT, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_quiz_reward_atomic(UUID, TEXT, INTEGER, INTEGER, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.claim_reward_once_atomic(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reward_once_atomic(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.grant_user_card_atomic(UUID, TEXT, BOOLEAN, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_user_card_atomic(UUID, TEXT, BOOLEAN, TEXT, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.admin_set_delta_points_atomic(UUID, UUID, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_delta_points_atomic(UUID, UUID, INTEGER, INTEGER, TEXT) TO service_role;

COMMIT;
