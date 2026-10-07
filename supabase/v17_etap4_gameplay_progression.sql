-- ==============================================================================
-- DELTA WARSZAWA 2018 - ETAP 4: GAMEPLAY, PROGRESJA I GRYWALIZACJA
-- Safe additive migration for User Game Profiles, Missions, Battles, Notifications, and Rewards
-- ==============================================================================

-- 1. USER GAME PROFILE (Central XP, Level, Activity Streak, Spin Wheel)
CREATE TABLE IF NOT EXISTS public.user_game_profile (
    user_id TEXT PRIMARY KEY,
    current_level INTEGER NOT NULL DEFAULT 1,
    current_xp INTEGER NOT NULL DEFAULT 0,
    season_xp INTEGER NOT NULL DEFAULT 0,
    activity_streak INTEGER NOT NULL DEFAULT 1,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    max_streak INTEGER NOT NULL DEFAULT 1,
    wheel_streak_day INTEGER NOT NULL DEFAULT 1,
    last_wheel_spin_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER DAILY MISSIONS
CREATE TABLE IF NOT EXISTS public.user_daily_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    missions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_daily_missions_user_date_uniq UNIQUE(user_id, mission_date)
);

-- 3. USER WEEKLY MISSIONS
CREATE TABLE IF NOT EXISTS public.user_weekly_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    missions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_weekly_missions_user_week_uniq UNIQUE(user_id, week_start_date)
);

-- 4. BATTLE PASS CLAIMS
CREATE TABLE IF NOT EXISTS public.user_battlepass_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    tier_level INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_value JSONB,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_bp_claim_uniq UNIQUE(user_id, season_id, tier_level)
);

-- 5. MINIGAME SCORES & ANTI-FARMING
CREATE TABLE IF NOT EXISTS public.minigame_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    best_score INTEGER NOT NULL DEFAULT 0,
    total_plays INTEGER NOT NULL DEFAULT 1,
    daily_plays_count INTEGER NOT NULL DEFAULT 1,
    last_daily_play_date DATE DEFAULT CURRENT_DATE,
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT minigame_scores_user_game_uniq UNIQUE(user_id, game_id)
);

-- 6. CARD BATTLES HISTORY (1v1 & 3v3 PvE)
CREATE TABLE IF NOT EXISTS public.card_battles_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    battle_mode TEXT NOT NULL, -- '1v1' | '3v3'
    difficulty TEXT NOT NULL,  -- 'easy' | 'medium' | 'hard'
    result TEXT NOT NULL,      -- 'win' | 'loss' | 'draw'
    player_score INTEGER NOT NULL DEFAULT 0,
    cpu_score INTEGER NOT NULL DEFAULT 0,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. NOTIFICATION CENTER
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'SYSTEM', -- 'REWARD' | 'MISSION' | 'MATCH' | 'TRAINING' | 'BATTLE' | 'SYSTEM'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CENTRAL REWARD LOGS
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    reward_type TEXT NOT NULL, -- 'XP' | 'PACK' | 'CARD' | 'BADGE' | 'SPIN'
    reward_value JSONB NOT NULL,
    source_type TEXT NOT NULL, -- 'TRAINING' | 'MATCH' | 'CHALLENGE' | 'MINIGAME' | 'MISSION' | 'BATTLE' | 'STREAK' | 'BATTLEPASS' | 'ADMIN'
    source_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid lookup
CREATE INDEX IF NOT EXISTS idx_user_game_profile_level ON public.user_game_profile(current_level);
CREATE INDEX IF NOT EXISTS idx_user_daily_missions_date ON public.user_daily_missions(user_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user ON public.reward_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_card_battles_user ON public.card_battles_history(user_id, created_at);
