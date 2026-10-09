-- DELTA 2018 GM — ETAP 14D: BALANCED PACK PRICES MIGRATION
-- Migration updates server-side authoritative pack prices in purchase_pack_atomic to SCENARIO B.
-- SCENARIO B PRICES:
--   standard_pack: 60 DP
--   matchday_booster: 100 DP
--   gold_booster: 150 DP
--   inferno_booster: 300 DP
--   legend_pack: 450 DP
--   legend_booster: 450 DP
--
-- Preserves: auth.uid() binding, SECURITY DEFINER, search_path = public, FOR UPDATE locking,
-- idempotency, atomic ledger recording, and tight execute grants.

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
    -- 1. Auth UID Binding: Nigdy nie ufa parametrowi klienta
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wymagana autoryzacja'
        );
    END IF;

    -- 2. Authoritative server-side price lookup (SCENARIO B - BALANCED)
    CASE p_pack_type_id
        WHEN 'standard_pack' THEN v_price := 60;
        WHEN 'matchday_booster' THEN v_price := 100;
        WHEN 'gold_booster' THEN v_price := 150;
        WHEN 'inferno_booster' THEN v_price := 300;
        WHEN 'legend_pack' THEN v_price := 450;
        WHEN 'legend_booster' THEN v_price := 450;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Nieprawidłowy typ paczki'
            );
    END CASE;

    -- 3. Idempotency Check
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

    -- 4. Row Locking: Blokada wiersza salda na czas transakcji (ochrona przed race conditions)
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

    -- 5. Odejmujemy punkty
    UPDATE public.user_delta_points
    SET points_balance = v_new_balance,
        total_spent = v_total_spent,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    -- 6. Przyznajemy paczkę atomowo
    INSERT INTO public.user_unopened_packs (
        user_id, pack_type_id, source_reason, is_opened
    )
    VALUES (
        v_user_id, p_pack_type_id, v_source_reason, false
    )
    RETURNING id INTO v_pack_id;

    -- 7. Rejestrujemy wpis w ledgerze transakcji
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
        'new_balance', v_new_balance,
        'pack_id', v_pack_id,
        'transaction_id', v_tx_id
    );
END;
$$;

-- Security Grants: Dostęp wyłącznie dla authenticated i service_role
REVOKE ALL ON FUNCTION public.purchase_pack_atomic(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_pack_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_pack_atomic(TEXT, TEXT) TO service_role;
