-- ==============================================================================
-- DELTA 2018 GM — LIVE STAGING SECURITY FIX V3 (ETAP 10.2A)
-- Target Database: tdlsxamxtygojxhmjjvp (STAGING ONLY)
-- ==============================================================================

-- 1. ADD COLUMNS TO delta_system_events
ALTER TABLE IF EXISTS public.delta_system_events 
    ADD COLUMN IF NOT EXISTS audience_type TEXT NOT NULL DEFAULT 'TEAM',
    ADD COLUMN IF NOT EXISTS target_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_player_id UUID NULL REFERENCES public.players(id) ON DELETE CASCADE;

-- 2. AUDIENCE CHECK CONSTRAINT
ALTER TABLE public.delta_system_events DROP CONSTRAINT IF EXISTS chk_delta_system_events_audience;
ALTER TABLE public.delta_system_events ADD CONSTRAINT chk_delta_system_events_audience 
    CHECK (
        (audience_type = 'TEAM' AND target_user_id IS NULL AND target_player_id IS NULL) OR
        (audience_type = 'USER' AND target_user_id IS NOT NULL) OR
        (audience_type = 'PLAYER' AND target_player_id IS NOT NULL) OR
        (audience_type = 'ADMIN' AND target_user_id IS NULL AND target_player_id IS NULL)
    );

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_delta_system_events_audience_user ON public.delta_system_events(audience_type, target_user_id);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_audience_player ON public.delta_system_events(audience_type, target_player_id);

-- 4. RLS ON delta_system_events
ALTER TABLE public.delta_system_events ENABLE ROW LEVEL SECURITY;
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

-- 5. RLS ON user_achievements
DROP POLICY IF EXISTS "user achievements own select" ON public.user_achievements;
CREATE POLICY "user achievements own select" ON public.user_achievements
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR (player_id IS NOT NULL AND public.is_parent_of(player_id)) 
    OR public.is_staff()
);

-- 6. SECURITY DEFINER EXECUTE REVOKE FROM PUBLIC & anon
REVOKE EXECUTE ON FUNCTION public.current_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_parent_of(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated, service_role;
