-- ==============================================================================
-- DELTA 2018 GM — BEZPIECZNA MIGRACJA INCREMENTALNA DLA PRODUKCJI (ETAP 10)
-- Target Database: fctgruvciakhohfxkdzp
-- Cechy: W 100% ADDYTYWNA (Zero DROP, Zero DELETE, Zero TRUNCATE, Zero utraty danych)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NOWE TABELE (CREATE TABLE IF NOT EXISTS)
-- ------------------------------------------------------------------------------

-- Centralny system zdarzeń i powiadomień klubowych
CREATE TABLE IF NOT EXISTS public.delta_system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'DELTA_SYSTEM',
    importance TEXT NOT NULL DEFAULT 'NORMAL',
    related_entity_type TEXT,
    related_entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    dedupe_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audyt i historia wykrytych zmian (terminy meczów, boiska, wyniki)
CREATE TABLE IF NOT EXISTS public.delta_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source TEXT NOT NULL DEFAULT 'DELTA_SYNC',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Śledzenie odczytania powiadomień per użytkownik (News Center 2.0)
CREATE TABLE IF NOT EXISTS public.user_event_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_event_read UNIQUE(user_id, event_id)
);

-- Metryki i historia automatycznej synchronizacji (DELTA Sync 2.0)
CREATE TABLE IF NOT EXISTS public.delta_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    duration_ms INT NOT NULL DEFAULT 0,
    items_found INT NOT NULL DEFAULT 0,
    items_inserted INT NOT NULL DEFAULT 0,
    items_updated INT NOT NULL DEFAULT 0,
    changes_detected INT NOT NULL DEFAULT 0,
    errors_count INT NOT NULL DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System osiągnięć i kart specjalnych per zawodnik (Achievements 2.0)
CREATE TABLE IF NOT EXISTS public.player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress INT NOT NULL DEFAULT 100,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_achievement UNIQUE (player_id, achievement_id)
);

-- Portfel punktów Delta Points (DP)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_balance INT NOT NULL DEFAULT 0,
    total_earned INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. ROZSZERZENIE ISTNIEJĄCYCH TABEL (ADD COLUMN IF NOT EXISTS)
-- ------------------------------------------------------------------------------

-- Rozszerzenie subskrypcji Web Push o preferencje użytkownika
ALTER TABLE IF EXISTS public.push_subscriptions 
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"matches":true,"schedule_changes":true,"trainings":true,"lineup":true,"results":true,"fantasy":true,"achievements":true,"gallery":true,"tv":true,"club_news":true}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- Rozszerzenie paczek o status otwarcia i timestamp
ALTER TABLE IF EXISTS public.user_unopened_packs 
    ADD COLUMN IF NOT EXISTS is_opened BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- Rozszerzenie definicji kart o pose, motyw ramki i lore
ALTER TABLE IF EXISTS public.card_definitions 
    ADD COLUMN IF NOT EXISTS artwork_pose TEXT DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS frame_theme TEXT DEFAULT 'gold',
    ADD COLUMN IF NOT EXISTS lore TEXT;

-- Rozszerzenie kart użytkownika o duplikaty i ulubione
ALTER TABLE IF EXISTS public.user_cards 
    ADD COLUMN IF NOT EXISTS duplicates_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------------------------
-- 3. INDEKSY WYDAJNOŚCIOWE (CREATE INDEX IF NOT EXISTS)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_delta_system_events_created ON public.delta_system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_importance ON public.delta_system_events(importance);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_type ON public.delta_system_events(type);
CREATE INDEX IF NOT EXISTS idx_delta_change_history_entity ON public.delta_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_user ON public.user_event_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_event ON public.user_event_reads(event_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON public.player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_user_unopened_packs_user_is_opened ON public.user_unopened_packs(user_id, is_opened);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY & POLICIES (ADDITIVE RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.delta_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Public select system events" ON public.delta_system_events;
CREATE POLICY "Public select system events" ON public.delta_system_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff select change history" ON public.delta_change_history;
CREATE POLICY "Staff select change history" ON public.delta_change_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff select sync history" ON public.delta_sync_history;
CREATE POLICY "Staff select sync history" ON public.delta_sync_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own event reads select" ON public.user_event_reads;
CREATE POLICY "Own event reads select" ON public.user_event_reads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own event reads insert" ON public.user_event_reads;
CREATE POLICY "Own event reads insert" ON public.user_event_reads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Own event reads update" ON public.user_event_reads;
CREATE POLICY "Own event reads update" ON public.user_event_reads FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public select player achievements" ON public.player_achievements;
CREATE POLICY "Public select player achievements" ON public.player_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own wallet select" ON public.user_wallets;
CREATE POLICY "Own wallet select" ON public.user_wallets FOR SELECT USING (true);
