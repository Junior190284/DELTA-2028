-- ==============================================================================
-- DELTA WARSZAWA 2018 - ETAP 7: SOCIAL, RYWALIZACJA & DŁUGOTERMINOWA GRYWALIZACJA
-- Safe additive migration for Card Leagues, Challenges, Tournaments, Team Goals, Feed & Safe Trading
-- ==============================================================================

-- 1. CARD LEAGUE SEASONS
CREATE TABLE IF NOT EXISTS public.card_leagues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    season_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'ARCHIVED'
    rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CARD LEAGUE STANDINGS
CREATE TABLE IF NOT EXISTS public.card_league_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    played INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    drawn INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    form TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g. ['W', 'W', 'D', 'L', 'W']
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT card_league_user_uniq UNIQUE(league_id, user_id)
);

-- 3. FRIENDLY CHALLENGES (Async 1v1 & 3v3)
CREATE TABLE IF NOT EXISTS public.friendly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id TEXT NOT NULL,
    challenger_name TEXT NOT NULL,
    challenged_id TEXT NOT NULL,
    challenged_name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT '1v1', -- '1v1' | '3v3'
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'EXPIRED'
    challenger_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    challenged_cards JSONB DEFAULT '[]'::jsonb,
    result_details JSONB DEFAULT '{}'::jsonb,
    winner_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. KNOCKOUT TOURNAMENTS
CREATE TABLE IF NOT EXISTS public.tournaments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    bracket_size INTEGER NOT NULL DEFAULT 8, -- 4, 8, 16
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
    bracket_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    reward_value JSONB DEFAULT '{"xp": 250, "pack": "GOLD_PACK"}'::jsonb,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TEAM GOALS & REWARDS
CREATE TABLE IF NOT EXISTS public.team_goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    metric TEXT NOT NULL, -- 'ATTENDANCE' | 'MINIGAMES' | 'XP' | 'LESSONS'
    reward_value JSONB NOT NULL DEFAULT '{"xp": 100, "badge": "TEAM_HERO"}'::jsonb,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TEAM GOALS CLAIMS (1 per user per completed goal)
CREATE TABLE IF NOT EXISTS public.team_goals_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT team_goal_user_claim_uniq UNIQUE(goal_id, user_id)
);

-- 7. PLAYER OF THE WEEK & HONORS ARCHIVE
CREATE TABLE IF NOT EXISTS public.player_of_the_week (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_label TEXT NOT NULL,
    player_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'PLAYER_OF_THE_WEEK' | 'TRAINING_WARRIOR' | 'BIGGEST_PROGRESS' | 'GOALKEEPER_OF_WEEK' | 'FAIR_PLAY'
    reason TEXT NOT NULL,
    awarded_by TEXT DEFAULT 'Sztab Szkoleniowy',
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CONTROLLED SOCIAL FEED & POSITIVE REACTIONS
CREATE TABLE IF NOT EXISTS public.social_feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'SYSTEM', -- 'ADMIN' | 'COACH' | 'SYSTEM'
    post_type TEXT NOT NULL DEFAULT 'ANNOUNCEMENT', -- 'ANNOUNCEMENT' | 'ACHIEVEMENT' | 'GOAL_COMPLETED' | 'MVP_SPOTLIGHT'
    reactions JSONB NOT NULL DEFAULT '{"applause": 0, "fire": 0, "ball": 0, "heart": 0}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. USER PROFILE CUSTOMIZATION & TROPHY CABINET
CREATE TABLE IF NOT EXISTS public.user_profile_customization (
    user_id TEXT PRIMARY KEY,
    active_title TEXT DEFAULT 'Młody Wilczek',
    active_badge_id TEXT DEFAULT 'badge_starter',
    active_main_card_id TEXT,
    profile_frame TEXT DEFAULT 'inferno_red',
    trophies JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SAFE CARD TRADING (Atomic 1-to-1 card swaps)
CREATE TABLE IF NOT EXISTS public.safe_card_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id TEXT NOT NULL,
    sender_user_name TEXT NOT NULL,
    receiver_user_id TEXT NOT NULL,
    receiver_user_name TEXT NOT NULL,
    offered_card JSONB NOT NULL,
    requested_card JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_card_league_standings_pts ON public.card_league_standings(league_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_friendly_challenges_users ON public.friendly_challenges(challenged_id, status);
CREATE INDEX IF NOT EXISTS idx_social_feed_posts_date ON public.social_feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safe_card_trades_users ON public.safe_card_trades(receiver_user_id, status);
