-- ==============================================================================
-- DELTA 2018 GM — MIGRACJA INCREMENTALNA DLA STAGINGU (ETAPY 2–6)
-- Target Project ID: tdlsxamxtygojxhmjjvp
-- Target URL: https://tdlsxamxtygojxhmjjvp.supabase.co
-- Cechy: Bezpieczna, addytywna, idempotentna (IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ETAP 2 & 3: KARTY, PACZKI I DEFINICJE (v11 + v16)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pack_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cards_count INT NOT NULL DEFAULT 4,
    drop_rates JSONB NOT NULL DEFAULT '{"common": 50, "rare": 35, "epic": 11, "legendary": 3.5, "inferno": 0.5}'::jsonb,
    min_rarity TEXT NOT NULL DEFAULT 'rare',
    theme TEXT NOT NULL DEFAULT 'standard',
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.card_definitions (
    id TEXT PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    season TEXT NOT NULL DEFAULT '2026/27',
    card_type TEXT NOT NULL,
    card_name TEXT NOT NULL,
    title TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'inferno')),
    artwork_url TEXT,
    artwork_pose TEXT DEFAULT 'standard',
    frame_theme TEXT DEFAULT 'gold',
    card_number INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_limited BOOLEAN NOT NULL DEFAULT FALSE,
    edition_size INT,
    description TEXT,
    lore TEXT,
    match_id TEXT,
    special_event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_season_type UNIQUE(player_id, season, card_type)
);

CREATE TABLE IF NOT EXISTS public.user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES public.card_definitions(id) ON DELETE CASCADE,
    duplicates_count INT NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_card UNIQUE(user_id, card_id)
);

CREATE TABLE IF NOT EXISTS public.user_unopened_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pack_type_id TEXT NOT NULL,
    source_reason TEXT,
    is_opened BOOLEAN NOT NULL DEFAULT FALSE,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    delta_points INT NOT NULL DEFAULT 0,
    total_earned_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. ETAP 4: OSIĄGNIĘCIA I ODBLOKOWYWANIE KART (v12 + v19)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('match', 'training', 'collection', 'parent', 'special', 'attendance', 'goals', 'team', 'inferno')),
    tier TEXT NOT NULL DEFAULT 'bronze',
    target_value INT NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'szt',
    icon_name TEXT NOT NULL DEFAULT 'Award',
    reward_dp INT NOT NULL DEFAULT 50,
    reward_pack_type TEXT,
    reward_card_type TEXT,
    for_entity TEXT NOT NULL DEFAULT 'player',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reward_card_name TEXT,
    reward_card_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_achievement UNIQUE (player_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
    current_value INT NOT NULL DEFAULT 0,
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    claimed_reward BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_player_achievement UNIQUE (user_id, player_id, achievement_id)
);

-- ------------------------------------------------------------------------------
-- 3. ETAP 5 & 6: CENTRALNY SYSTEM ZDARZEŃ, DELTA SYNC 2.0, READ-STATE, PUSH (v20)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delta_system_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'DELTA_SYSTEM',
    importance TEXT NOT NULL DEFAULT 'NORMAL',
    related_entity_type TEXT,
    related_entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.user_event_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_event_read UNIQUE(user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.delta_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    sync_status TEXT NOT NULL,
    items_synced INT NOT NULL DEFAULT 0,
    new_matches_count INT NOT NULL DEFAULT 0,
    new_articles_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    duration_ms INT NOT NULL DEFAULT 0,
    triggered_by TEXT NOT NULL DEFAULT 'cron',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delta_sync_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status TEXT NOT NULL,
    items_found INT NOT NULL DEFAULT 0,
    items_inserted INT NOT NULL DEFAULT 0,
    items_updated INT NOT NULL DEFAULT 0,
    changes_detected INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rozszerzenie push_subscriptions o kolumny preferencji i aktywności
ALTER TABLE IF EXISTS public.push_subscriptions 
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"matches":true,"schedule_changes":true,"trainings":true,"lineup":true,"results":true,"fantasy":true,"achievements":true,"gallery":true,"tv":true,"club_news":true}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 4. INDEKSY WYDAJNOŚCIOWE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_delta_system_events_created ON public.delta_system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_importance ON public.delta_system_events(importance);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_type ON public.delta_system_events(type);
CREATE INDEX IF NOT EXISTS idx_delta_change_history_entity ON public.delta_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_delta_change_history_created ON public.delta_change_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_user ON public.user_event_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_reads_event ON public.user_event_reads(event_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON public.player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_user ON public.user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unopened_packs_user ON public.user_unopened_packs(user_id, is_opened);

-- ------------------------------------------------------------------------------
-- 5. RLS & POLITYKI BEZPIECZEŃSTWA
-- ------------------------------------------------------------------------------
ALTER TABLE public.card_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unopened_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_sync_log ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Public select card defs" ON public.card_definitions;
CREATE POLICY "Public select card defs" ON public.card_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select pack defs" ON public.pack_definitions;
CREATE POLICY "Public select pack defs" ON public.pack_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select system events" ON public.delta_system_events;
CREATE POLICY "Public select system events" ON public.delta_system_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own cards select" ON public.user_cards;
CREATE POLICY "Own cards select" ON public.user_cards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own packs select" ON public.user_unopened_packs;
CREATE POLICY "Own packs select" ON public.user_unopened_packs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own event reads select" ON public.user_event_reads;
CREATE POLICY "Own event reads select" ON public.user_event_reads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own event reads insert" ON public.user_event_reads;
CREATE POLICY "Own event reads insert" ON public.user_event_reads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Own event reads update" ON public.user_event_reads;
CREATE POLICY "Own event reads update" ON public.user_event_reads FOR UPDATE USING (true);
