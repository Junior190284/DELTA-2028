-- ==============================================================================
-- DELTA INFERNO 3.0 — ANIM-1A.5 FIX (FAZA A)
-- BRAKUJĄCE TABELE, KOLUMNY, INDEKSY UNIQUE ORAZ ZALEŻNOŚCI SCHEMATU
--
-- Plik: supabase/migrations/20261111_anim1a5_a_missing_tables_and_deps.sql
-- KOLEJNOŚĆ WDROŻENIA:
--   1. 20261111_etap_anim1a2_open_pack_atomic.sql (już obecne na Stagingu)
--   2. [TEN PLIK] 20261111_anim1a5_a_missing_tables_and_deps.sql
--   3. 20261111_anim1a5_b_economy_rpcs.sql
--   4. Testy API i autoryzacji -> dopiero potem 20261111_anim1a5_c_rls_hardening.sql
--
-- Cechy:
-- - W 100% addytywna i idempotentna (brak DROP TABLE, brak DELETE, brak TRUNCATE).
-- - Zgodna ze schematem Staging (card_definitions.id = TEXT, pack_types) i Prod (UUID, pack_definitions).
-- - Nie zamyka jeszcze zapisu RLS dla istniejących tabel user_cards / user_unopened_packs / user_delta_points.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. WYRÓWNANIE KOLUMN I OGRANICZEŃ NA ISTNIEJĄCYCH TABELACH EKONOMII
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.user_delta_points
  ADD COLUMN IF NOT EXISTS total_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF to_regclass('public.user_delta_points') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_delta_points_balance_non_negative'
     ) THEN
    IF EXISTS (SELECT 1 FROM public.user_delta_points WHERE points_balance < 0) THEN
      RAISE EXCEPTION 'Znaleziono ujemne saldo w public.user_delta_points przed dodaniem constraintu CHECK.';
    END IF;
    ALTER TABLE public.user_delta_points
      ADD CONSTRAINT chk_user_delta_points_balance_non_negative CHECK (points_balance >= 0);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.user_unopened_packs
  ADD COLUMN IF NOT EXISTS source_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_opened BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_unopened_packs_user
  ON public.user_unopened_packs(user_id, is_opened);

ALTER TABLE IF EXISTS public.user_cards
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

DO $$
BEGIN
  IF to_regclass('public.user_cards') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_cards_duplicates_non_negative'
     ) THEN
    ALTER TABLE public.user_cards
      ADD CONSTRAINT chk_user_cards_duplicates_non_negative CHECK (duplicates_count >= 0);
  END IF;

  IF to_regclass('public.user_cards') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.user_cards'::regclass
         AND contype = 'u'
     ) THEN
    ALTER TABLE public.user_cards
      ADD CONSTRAINT uq_user_card UNIQUE (user_id, card_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.user_achievements
  ADD COLUMN IF NOT EXISTS claimed_reward BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 2. BRAKUJĄCA TABELA HISTORII TRANSAKCJI DELTA POINTS (delta_points_transactions)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delta_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'EARN', 'SPEND', 'REFUND', 'ADJUSTMENT'
  source_type TEXT NOT NULL,      -- 'DAILY_SPIN', 'QUIZ_COMPLETION', 'PACK_PURCHASE', 'PACK_DUPLICATE', 'ADMIN', itd.
  source_id TEXT,
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.delta_points_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_dp_tx_user_created
  ON public.delta_points_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dp_tx_source
  ON public.delta_points_transactions(source_type, source_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dp_tx_idempotency_key_not_null
  ON public.delta_points_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.delta_points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own delta points transactions" ON public.delta_points_transactions;
CREATE POLICY "Users can view their own delta points transactions"
  ON public.delta_points_transactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 3. BRAKUJĄCA TABELA KOŁA FORTUNY (user_daily_spins)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_daily_spins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_spin_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_streak_date DATE NOT NULL DEFAULT (timezone('utc'::text, now()))::DATE,
  streak_count INTEGER NOT NULL DEFAULT 1 CHECK (streak_count BETWEEN 1 AND 7),
  total_spins INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_daily_spins_user
  ON public.user_daily_spins(user_id);

ALTER TABLE public.user_daily_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily spin status" ON public.user_daily_spins;
CREATE POLICY "Users can view their own daily spin status"
  ON public.user_daily_spins FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 4. TABELE REJESTRU ZALICZEŃ I NAGRÓD (REPLAY PREVENTION)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_quiz_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_quiz UNIQUE (user_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_comp_user
  ON public.user_quiz_completions(user_id);

ALTER TABLE public.user_quiz_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quiz completions" ON public.user_quiz_completions;
CREATE POLICY "Users can view their own quiz completions"
  ON public.user_quiz_completions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.user_claimed_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reward_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_user_claimed_challenge UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_claimed_challenges_user
  ON public.user_claimed_challenges(user_id);

ALTER TABLE public.user_claimed_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenges_read_own ON public.user_claimed_challenges;
CREATE POLICY challenges_read_own
  ON public.user_claimed_challenges FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.user_claimed_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  pack_type_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_claimed_reward UNIQUE (user_id, reward_key)
);

CREATE INDEX IF NOT EXISTS idx_user_claimed_rewards_user
  ON public.user_claimed_rewards(user_id, reward_type);

ALTER TABLE public.user_claimed_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_claimed_rewards_select_own ON public.user_claimed_rewards;
CREATE POLICY user_claimed_rewards_select_own
  ON public.user_claimed_rewards FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 5. BRAKUJĄCA TABELA AUDYTU NADAŃ KART (admin_card_grants)
-- KRYTYCZNE: Typ kolumny card_id jest dynamicznie dopasowany do card_definitions.id
-- (TEXT na Stagingu vs UUID na Produkcji), aby uniknąć błędu klucza obcego.
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_card_id_type TEXT := 'text';
BEGIN
  IF to_regclass('public.admin_card_grants') IS NULL THEN
    IF to_regclass('public.card_definitions') IS NOT NULL THEN
      SELECT format_type(a.atttypid, a.atttypmod)
      INTO v_card_id_type
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = 'card_definitions'
        AND a.attname = 'id'
        AND NOT a.attisdropped;
    END IF;

    v_card_id_type := COALESCE(v_card_id_type, 'text');

    IF to_regclass('public.card_definitions') IS NOT NULL THEN
      EXECUTE format(
        $sql$
        CREATE TABLE public.admin_card_grants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          card_id %s NOT NULL REFERENCES public.card_definitions(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
        $sql$,
        v_card_id_type
      );
    ELSE
      EXECUTE format(
        $sql$
        CREATE TABLE public.admin_card_grants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          card_id %s NOT NULL,
          reason TEXT NOT NULL,
          granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
        $sql$,
        v_card_id_type
      );
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_card_grants_user
  ON public.admin_card_grants(user_id, granted_at DESC);

ALTER TABLE public.admin_card_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS card_grants_read ON public.admin_card_grants;
CREATE POLICY card_grants_read
  ON public.admin_card_grants FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_staff());

-- ------------------------------------------------------------------------------
-- 6. SPÓJNOŚĆ TYPÓW PACZEK (pack_types na Stagingu + pack_definitions)
-- Zapobiega błędom FK przy insertach do user_unopened_packs we wszystkich ścieżkach.
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.pack_types') IS NOT NULL THEN
    INSERT INTO public.pack_types (id, name, description, cards_count, cost_dp, guaranteed_rarity, drop_rates, is_available)
    VALUES
      ('standard_pack', 'Paczka Standardowa', '3 karty zawodników DELTA GM.', 3, 60, 'common', '{"common": 70, "rare": 22, "epic": 6, "legendary": 1.8, "inferno": 0.2}'::jsonb, true),
      ('matchday_booster', 'Matchday Booster', '4 karty meczowe DELTA GM.', 4, 100, 'rare', '{"common": 50, "rare": 35, "epic": 11, "legendary": 3.5, "inferno": 0.5}'::jsonb, true),
      ('gold_booster', 'Gold Booster', '5 kart w złotej folii.', 5, 150, 'rare', '{"common": 35, "rare": 45, "epic": 15, "legendary": 4.5, "inferno": 0.5}'::jsonb, true),
      ('inferno_booster', '🔥 Inferno Booster', '5 kart z podwyższoną szansą na INFERNO.', 5, 300, 'epic', '{"common": 20, "rare": 40, "epic": 28, "legendary": 9, "inferno": 3}'::jsonb, true),
      ('legend_pack', '👑 Legend Pack', '6 kart mistrzowskich.', 6, 450, 'legendary', '{"common": 10, "rare": 35, "epic": 35, "legendary": 17, "inferno": 3}'::jsonb, true),
      ('legend_booster', '👑 Legend Booster', '6 kart mistrzowskich.', 6, 450, 'legendary', '{"common": 10, "rare": 35, "epic": 35, "legendary": 17, "inferno": 3}'::jsonb, true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.pack_definitions') IS NOT NULL THEN
    INSERT INTO public.pack_definitions (id, name, description, cards_count, drop_rates, min_rarity, theme, is_active)
    VALUES
      ('standard_pack', 'Paczka Standardowa', '3 karty zawodników DELTA GM.', 3, '{"common": 70, "rare": 22, "epic": 6, "legendary": 1.8, "inferno": 0.2}'::jsonb, 'common', 'standard', true),
      ('matchday_booster', 'Matchday Booster', '4 karty meczowe DELTA GM.', 4, '{"common": 50, "rare": 35, "epic": 11, "legendary": 3.5, "inferno": 0.5}'::jsonb, 'rare', 'matchday', true),
      ('gold_booster', 'Gold Booster', '5 kart w złotej folii.', 5, '{"common": 35, "rare": 45, "epic": 15, "legendary": 4.5, "inferno": 0.5}'::jsonb, 'rare', 'gold', true),
      ('inferno_booster', '🔥 Inferno Booster', '5 kart z podwyższoną szansą na INFERNO.', 5, '{"common": 20, "rare": 40, "epic": 28, "legendary": 9, "inferno": 3}'::jsonb, 'epic', 'inferno', true),
      ('legend_pack', '👑 Legend Pack', '6 kart mistrzowskich.', 6, '{"common": 10, "rare": 35, "epic": 35, "legendary": 17, "inferno": 3}'::jsonb, 'legendary', 'legend', true),
      ('legend_booster', '👑 Legend Booster', '6 kart mistrzowskich.', 6, '{"common": 10, "rare": 35, "epic": 35, "legendary": 17, "inferno": 3}'::jsonb, 'legendary', 'legend', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

COMMIT;
