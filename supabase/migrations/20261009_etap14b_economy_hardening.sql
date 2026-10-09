-- ==============================================================================
-- DELTA 2018 GM — ETAP 14B.2: CONTROLLED ECONOMY DATABASE MIGRATION
-- Target Database: fctgruvciakhohfxkdzp (Production)
-- Cechy: W 100% ADDYTYWNA (Zero DROP, Zero DELETE, Zero TRUNCATE, Zero utraty danych)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROZSZERZENIE user_delta_points (ADD COLUMN IF NOT EXISTS + CHECK CONSTRAINT)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_delta_points 
    ADD COLUMN IF NOT EXISTS total_spent INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_delta_points_balance_non_negative'
    ) THEN
        ALTER TABLE public.user_delta_points 
        ADD CONSTRAINT chk_user_delta_points_balance_non_negative CHECK (points_balance >= 0);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA AUDYTU I HISTORII TRANSAKCJI (delta_points_transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delta_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'EARN', 'SPEND', 'REFUND', 'ADJUSTMENT'
    source_type TEXT NOT NULL,      -- 'DAILY_SPIN', 'QUIZ_COMPLETION', 'PACK_PURCHASE', 'ADMIN'
    source_id TEXT,                 -- quiz_id, pack_type_id, etc.
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dp_tx_user_created ON public.delta_points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dp_tx_source ON public.delta_points_transactions(source_type, source_id);

ALTER TABLE public.delta_points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own delta points transactions" ON public.delta_points_transactions;
CREATE POLICY "Users can view their own delta points transactions"
ON public.delta_points_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. TABELA ZALICZEŃ QUIZÓW (user_quiz_completions - Replay Prevention)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_quiz_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_quiz UNIQUE (user_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_comp_user ON public.user_quiz_completions(user_id);

ALTER TABLE public.user_quiz_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quiz completions" ON public.user_quiz_completions;
CREATE POLICY "Users can view their own quiz completions"
ON public.user_quiz_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. UNIWERSALNA FUNKCJA ATOMOWEJ TRANSAKCJI DELTA POINTS (SERVICE_ROLE ONLY)
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
    v_current_balance INTEGER;
    v_total_earned INTEGER;
    v_total_spent INTEGER;
    v_new_balance INTEGER;
    v_new_total_earned INTEGER;
    v_new_total_spent INTEGER;
    v_existing_tx RECORD;
    v_tx_id UUID;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, amount, balance_after INTO v_existing_tx
        FROM public.delta_points_transactions
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'transaction_id', v_existing_tx.id,
                'new_balance', v_existing_tx.balance_after,
                'amount', v_existing_tx.amount
            );
        END IF;
    END IF;

    -- Row Locking on wallet
    SELECT points_balance, COALESCE(total_earned, 0), COALESCE(total_spent, 0)
    INTO v_current_balance, v_total_earned, v_total_spent
    FROM public.user_delta_points
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_delta_points (user_id, points_balance, total_earned, total_spent, updated_at)
        VALUES (p_user_id, 0, 0, 0, timezone('utc'::text, now()))
        RETURNING points_balance, total_earned, total_spent
        INTO v_current_balance, v_total_earned, v_total_spent;
    END IF;

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
        p_user_id, p_amount, v_new_balance, p_transaction_type, p_source_type, p_source_id, p_idempotency_key, p_metadata
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

-- ------------------------------------------------------------------------------
-- 5. ATOMOWY ZAKUP PACZKI POWIĄZANY Z AUTH.UID() (AUTHENTICATED & SERVICE_ROLE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_pack_atomic(
    p_pack_type_id TEXT,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_price INTEGER;
    v_current_balance INTEGER;
    v_total_spent INTEGER;
    v_new_balance INTEGER;
    v_pack_id UUID;
    v_existing_tx RECORD;
    v_tx_id UUID;
    v_source_reason TEXT;
BEGIN
    -- Auth UID Binding: Nigdy nie ufa parametrowi klienta
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wymagana autoryzacja'
        );
    END IF;

    -- Authoritative server-side price lookup
    CASE p_pack_type_id
        WHEN 'standard_pack' THEN v_price := 50;
        WHEN 'matchday_booster' THEN v_price := 80;
        WHEN 'gold_booster' THEN v_price := 120;
        WHEN 'inferno_booster' THEN v_price := 250;
        WHEN 'legend_pack' THEN v_price := 350;
        WHEN 'legend_booster' THEN v_price := 350;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Nieprawidłowy typ paczki'
            );
    END CASE;

    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, balance_after, metadata INTO v_existing_tx
        FROM public.delta_points_transactions
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'new_balance', v_existing_tx.balance_after,
                'pack_id', v_existing_tx.metadata->>'pack_id'
            );
        END IF;
    END IF;

    -- Row Locking
    SELECT points_balance, COALESCE(total_spent, 0)
    INTO v_current_balance, v_total_spent
    FROM public.user_delta_points
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND OR v_current_balance < v_price THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Niewystarczająca liczba Delta Points',
            'current_balance', COALESCE(v_current_balance, 0),
            'required_price', v_price
        );
    END IF;

    v_new_balance := v_current_balance - v_price;
    v_total_spent := v_total_spent + v_price;
    v_source_reason := 'Zakup w Skarbcu za ' || v_price || ' Delta Points';

    -- Odejmujemy punkty
    UPDATE public.user_delta_points
    SET points_balance = v_new_balance,
        total_spent = v_total_spent,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    -- Przyznajemy paczkę
    INSERT INTO public.user_unopened_packs (
        user_id, pack_type_id, source_reason, is_opened
    )
    VALUES (
        v_user_id, p_pack_type_id, v_source_reason, false
    )
    RETURNING id INTO v_pack_id;

    -- Rejestrujemy w ledgerze
    INSERT INTO public.delta_points_transactions (
        user_id, amount, balance_after, transaction_type, source_type, source_id, idempotency_key, metadata
    )
    VALUES (
        v_user_id, -v_price, v_new_balance, 'SPEND', 'PACK_PURCHASE', p_pack_type_id, p_idempotency_key,
        jsonb_build_object('pack_id', v_pack_id, 'pack_type_id', p_pack_type_id, 'price', v_price)
    )
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'new_balance', v_new_balance,
        'pack_id', v_pack_id,
        'transaction_id', v_tx_id
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. AUDYT UPRAWNIEŃ (SECURITY GRANTS)
-- ------------------------------------------------------------------------------
-- apply_delta_points_transaction: Dostępna WYŁĄCZNIE dla service_role (blokada dla authenticated i anon)
REVOKE ALL ON FUNCTION public.apply_delta_points_transaction FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_delta_points_transaction TO service_role;

-- purchase_pack_atomic: Dostępna dla authenticated i service_role (blokada dla anon i PUBLIC)
REVOKE ALL ON FUNCTION public.purchase_pack_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_pack_atomic TO authenticated, service_role;
