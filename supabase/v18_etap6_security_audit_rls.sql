-- ==============================================================================
-- DELTA WARSZAWA 2018 - ETAP 6: PRODUCTION READINESS, SECURITY & AUDIT
-- Safe additive migration for RLS Policies, Audit Logs, Settings, Sync & Notifications
-- ==============================================================================

-- 1. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_email TEXT,
    user_role TEXT NOT NULL DEFAULT 'user',
    action TEXT NOT NULL, -- 'MATCH_EDIT' | 'CARD_GRANT' | 'ACHIEVEMENT_RESET' | 'EVENT_EDIT' | 'SETTINGS_CHANGE' | 'DELETE'
    resource_type TEXT NOT NULL, -- 'match' | 'card' | 'player' | 'event' | 'achievement' | 'settings'
    resource_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. APP SETTINGS & FEATURE FLAGS & MAINTENANCE MODE
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- Insert default feature flags if not existing
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('maintenance_mode', '{"enabled": false, "message": "Trwają planowane prace serwisowe. Zapraszamy wkrótce."}'::jsonb, 'Tryb serwisowy aplikacji'),
    ('feature_flags', '{"card_battles": true, "cinematic_walkouts": true, "typer": true, "daily_missions": true, "knowledge_corner": true, "photo_booth": true}'::jsonb, 'Flagi modułów gry i funkcji')
ON CONFLICT (key) DO NOTHING;

-- 3. USER NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id TEXT PRIMARY KEY,
    matches BOOLEAN NOT NULL DEFAULT TRUE,
    trainings BOOLEAN NOT NULL DEFAULT TRUE,
    events BOOLEAN NOT NULL DEFAULT TRUE,
    gameplay BOOLEAN NOT NULL DEFAULT TRUE,
    collection BOOLEAN NOT NULL DEFAULT TRUE,
    important BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SYNC LOGS & CONFLICT MANAGEMENT
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'delta.warszawa.pl',
    status TEXT NOT NULL, -- 'SUCCESS' | 'WARNING' | 'ERROR' | 'CONFLICT'
    records_synced INTEGER NOT NULL DEFAULT 0,
    conflicts_count INTEGER NOT NULL DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs(user_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON public.sync_logs(synced_at DESC);
