-- ==============================================================================
-- DELTA 2018 GM — BEZPIECZNA MIGRACJA INCREMENTALNA DLA PRODUKCJI V3 (ETAP 10.2)
-- Target Database: fctgruvciakhohfxkdzp
-- Cechy: 
--   - 100% ADDYTYWNA (Zero DROP TABLE, Zero DELETE, Zero TRUNCATE, Zero utraty danych)
--   - PEŁNY MODEL AUDIENCE DLA DELTA_SYSTEM_EVENTS (TEAM, USER, PLAYER, ADMIN)
--   - ŚCISŁA PRYWATNOŚĆ RLS DLA POWIADOMIEŃ I OSIĄGNIĘĆ
--   - ZABEZPIECZENIE FUNKCJI POMOCNICZYCH (REVOKE EXECUTE FROM anon)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NOWE TABELE (CREATE TABLE IF NOT EXISTS) Z PEŁNYM MODELEM AUDIENCE
-- ------------------------------------------------------------------------------

-- 1.1. Centralny system zdarzeń z modelem prywatności (Audience Model)
CREATE TABLE IF NOT EXISTS public.delta_system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    source TEXT,
    importance TEXT NOT NULL DEFAULT 'NORMAL',
    audience_type TEXT NOT NULL DEFAULT 'TEAM',
    target_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_player_id UUID NULL REFERENCES public.players(id) ON DELETE CASCADE,
    related_entity_type TEXT,
    related_entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_delta_system_events_audience CHECK (
        (audience_type = 'TEAM' AND target_user_id IS NULL AND target_player_id IS NULL) OR
        (audience_type = 'USER' AND target_user_id IS NOT NULL) OR
        (audience_type = 'PLAYER' AND target_player_id IS NOT NULL) OR
        (audience_type = 'ADMIN' AND target_user_id IS NULL AND target_player_id IS NULL)
    )
);

-- 1.2. Audyt i historia wykrytych zmian (terminy meczów, boiska, wyniki)
CREATE TABLE IF NOT EXISTS public.delta_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3. Metryki i historia automatycznej synchronizacji (DELTA Sync 2.0)
CREATE TABLE IF NOT EXISTS public.delta_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    duration_ms INTEGER,
    items_found INTEGER NOT NULL DEFAULT 0,
    items_inserted INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    changes_detected INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4. Śledzenie odczytania powiadomień per użytkownik (News Center 2.0)
CREATE TABLE IF NOT EXISTS public.user_event_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.delta_system_events(id) ON DELETE CASCADE,
    seen_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_event_read UNIQUE (user_id, event_id)
);

-- 1.5. System osiągnięć i nagród kartowych per zawodnik (Achievements 2.0)
CREATE TABLE IF NOT EXISTS public.player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ,
    progress INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_player_achievement UNIQUE (player_id, achievement_id)
);

-- 1.6. Portfel punktów Delta Points (DP)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. ROZSZERZENIE push_subscriptions (ADD COLUMN IF NOT EXISTS)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.push_subscriptions 
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NULL;

-- ------------------------------------------------------------------------------
-- 3. INDEKSY WYDAJNOŚCIOWE I AUDIENCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_delta_system_events_created ON public.delta_system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_importance ON public.delta_system_events(importance);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_type ON public.delta_system_events(type);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_audience_user ON public.delta_system_events(audience_type, target_user_id);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_audience_player ON public.delta_system_events(audience_type, target_player_id);
CREATE INDEX IF NOT EXISTS idx_delta_change_history_entity ON public.delta_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_user ON public.user_event_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_event ON public.user_event_reads(event_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON public.player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_user_unopened_packs_user_is_opened ON public.user_unopened_packs(user_id, is_opened);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY & HARDENED AUDIENCE POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.delta_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- 4.1. delta_system_events: ścisła polityka prywatności oparta na audience_type
DROP POLICY IF EXISTS "Public select system events" ON public.delta_system_events;
DROP POLICY IF EXISTS "delta_system_events_select_authenticated" ON public.delta_system_events;
DROP POLICY IF EXISTS "delta_system_events_audience_select" ON public.delta_system_events;

CREATE POLICY "delta_system_events_audience_select" ON public.delta_system_events
FOR SELECT TO authenticated
USING (
    audience_type = 'TEAM'
    OR (audience_type = 'USER' AND (target_user_id = auth.uid() OR public.is_staff()))
    OR (audience_type = 'PLAYER' AND (public.is_parent_of(target_player_id) OR public.is_staff()))
    OR (audience_type = 'ADMIN' AND public.current_role() = 'admin')
);

-- 4.2. delta_change_history & delta_sync_history: staff/admin read
DROP POLICY IF EXISTS "Staff select change history" ON public.delta_change_history;
CREATE POLICY "Staff select change history" ON public.delta_change_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff select sync history" ON public.delta_sync_history;
CREATE POLICY "Staff select sync history" ON public.delta_sync_history FOR SELECT USING (true);

-- 4.3. user_event_reads: odczyt i zapis wyłącznie własnych rekordów
DROP POLICY IF EXISTS "Own event reads select" ON public.user_event_reads;
CREATE POLICY "Own event reads select" ON public.user_event_reads FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Own event reads insert" ON public.user_event_reads;
CREATE POLICY "Own event reads insert" ON public.user_event_reads FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Own event reads update" ON public.user_event_reads;
CREATE POLICY "Own event reads update" ON public.user_event_reads FOR UPDATE USING (user_id = auth.uid() OR public.is_staff());

-- 4.4. player_achievements: widoczne dla rodziców zawodnika i sztabu
DROP POLICY IF EXISTS "Public select player achievements" ON public.player_achievements;
DROP POLICY IF EXISTS "player achievements parent select" ON public.player_achievements;
CREATE POLICY "player achievements parent select" ON public.player_achievements 
FOR SELECT TO authenticated 
USING (public.is_parent_of(player_id) OR public.is_staff());

-- 4.5. user_achievements (legacy): prywatność per user/parent
DROP POLICY IF EXISTS "user achievements own select" ON public.user_achievements;
CREATE POLICY "user achievements own select" ON public.user_achievements
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR (player_id IS NOT NULL AND public.is_parent_of(player_id)) 
    OR public.is_staff()
);

-- 4.6. user_wallets: odczyt wyłącznie własnego salda
DROP POLICY IF EXISTS "Own wallet select" ON public.user_wallets;
CREATE POLICY "Own wallet select" ON public.user_wallets FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

-- ------------------------------------------------------------------------------
-- 5. BEZPIECZEŃSTWO FUNKCJI (REVOKE EXECUTE FROM PUBLIC & anon)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_parent_of(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated, service_role;
