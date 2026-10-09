-- ==============================================================================
-- DELTA WARSZAWA 2018 - ETAP 6: DELTA SYNC 2.0 + EVENT SYSTEM + LIVE ALERTS + PUSH
-- ==============================================================================

-- 1. CENTRAL SYSTEM EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.delta_system_events (
    id TEXT PRIMARY KEY, -- Deterministic dedupe key or UUID
    type TEXT NOT NULL, -- 'MATCH_CREATED' | 'MATCH_UPDATED' | 'MATCH_CANCELLED' | 'MATCH_RESULT_UPDATED' | 'TRAINING_CREATED' | 'TRAINING_UPDATED' | 'TRAINING_CANCELLED' | 'LINEUP_PUBLISHED' | 'GALLERY_CREATED' | 'VIDEO_PUBLISHED' | 'PLAYER_ACHIEVEMENT' | 'PLAYER_CARD_UNLOCKED' | 'CLUB_NEWS' | 'SYSTEM_MESSAGE' | 'SYNC_ERROR'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'DELTA_SYSTEM',
    importance TEXT NOT NULL DEFAULT 'NORMAL', -- 'INFO' | 'NORMAL' | 'IMPORTANT' | 'URGENT'
    related_entity_type TEXT, -- 'match' | 'training' | 'lineup' | 'player' | 'achievement' | 'card' | 'club_update' | 'sync'
    related_entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delta_system_events_created ON public.delta_system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_importance ON public.delta_system_events(importance);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_type ON public.delta_system_events(type);

-- 2. CHANGE HISTORY TABLE (Wykrywanie zmian w czasie: boiska, godziny, wyniki)
CREATE TABLE IF NOT EXISTS public.delta_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'match' | 'training' | 'lineup' | 'club_update'
    entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL, -- 'match_time' | 'venue' | 'status' | 'home_score' | 'away_score'
    old_value TEXT,
    new_value TEXT,
    source TEXT NOT NULL DEFAULT 'DELTA_SYNC',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delta_change_history_entity ON public.delta_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_delta_change_history_created ON public.delta_change_history(created_at DESC);

-- 3. USER READ & SEEN STATE (Przechowywanie stanu przeczytania per użytkownik)
CREATE TABLE IF NOT EXISTS public.user_event_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_event_read UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_reads_user ON public.user_event_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_event ON public.user_event_reads(event_id);

-- 4. PUSH SUBSCRIPTIONS & PREFERENCES EXPANSION
ALTER TABLE IF EXISTS public.push_subscriptions 
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"matches":true,"schedule_changes":true,"trainings":true,"lineup":true,"results":true,"fantasy":true,"achievements":true,"gallery":true,"tv":true,"club_news":true}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- 5. UNIFIED SYNC LOGS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.delta_sync_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status TEXT NOT NULL, -- 'SUCCESS' | 'WARNING' | 'ERROR' | 'TIMEOUT' | 'PARSER_ERROR'
    items_found INT NOT NULL DEFAULT 0,
    items_inserted INT NOT NULL DEFAULT 0,
    items_updated INT NOT NULL DEFAULT 0,
    changes_detected INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS & Permissions
ALTER TABLE public.delta_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_sync_log ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Public select system events" ON public.delta_system_events;
CREATE POLICY "Public select system events" ON public.delta_system_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own event reads select" ON public.user_event_reads;
CREATE POLICY "Own event reads select" ON public.user_event_reads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own event reads insert" ON public.user_event_reads;
CREATE POLICY "Own event reads insert" ON public.user_event_reads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Own event reads update" ON public.user_event_reads;
CREATE POLICY "Own event reads update" ON public.user_event_reads FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Staff select sync logs" ON public.delta_sync_log;
CREATE POLICY "Staff select sync logs" ON public.delta_sync_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff select change history" ON public.delta_change_history;
CREATE POLICY "Staff select change history" ON public.delta_change_history FOR SELECT USING (true);
