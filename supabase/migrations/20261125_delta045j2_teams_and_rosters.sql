-- ==============================================================================
-- DELTA INFERNO: SECURE TEAMS & TEAM PLAYERS MIGRATION (DELTA-045J.2 HARDENED)
-- Target: delta-2018-gm-staging / production
-- Status: PREPARED FOR REVIEW (DO NOT APPLY TO PRODUCTION)
--
-- FIXES APPLIED IN DELTA-045J.2:
-- 1. DO NOT OVERWRITE public.is_staff(): Uses existing function and permissions.
-- 2. SECURE MINIMAL ROSTER DTO: public.get_team_roster(UUID) SECURITY DEFINER
--    allows teammates' display names to be safely fetched without opening
--    the entire public.players table or exposing photo_path / PII.
-- ==============================================================================

-- 1. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cohort_year INTEGER NOT NULL CHECK (cohort_year BETWEEN 2000 AND 2100),
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Junior',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.teams IS 'Delta Academy squads and cohort groups (e.g. DELTA 2018 GM)';
COMMENT ON COLUMN public.teams.cohort_year IS 'Birth year of the cohort (e.g. 2018)';

-- 3. TEAM_PLAYERS JUNCTION TABLE (MEMBERSHIP & HISTORY)
CREATE TABLE IF NOT EXISTS public.team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    roster_role TEXT NOT NULL DEFAULT 'primary' CHECK (roster_role IN ('primary', 'guest', 'reserve')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'injured', 'inactive')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_team_player_temporal CHECK (left_at IS NULL OR left_at >= joined_at)
);

COMMENT ON TABLE public.team_players IS 'Player team assignments with full historical tracking';
COMMENT ON COLUMN public.team_players.left_at IS 'Timestamp when player left the team; NULL indicates active current membership';

-- 4. INTEGRITY INDEXES
-- At most one active membership per player in the SAME team (allows rejoin after left_at is set)
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_player_active_membership 
    ON public.team_players (team_id, player_id) 
    WHERE left_at IS NULL;

-- At most one active PRIMARY team per player across the entire academy
CREATE UNIQUE INDEX IF NOT EXISTS uq_player_single_primary_team 
    ON public.team_players (player_id) 
    WHERE left_at IS NULL AND roster_role = 'primary';

-- Lookup performance indexes
CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON public.team_players (team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player_id ON public.team_players (player_id);
CREATE INDEX IF NOT EXISTS idx_teams_cohort_active ON public.teams (cohort_year, active);

-- 5. RLS RECURSION PREVENTION & SECURITY DEFINER HELPERS (ANTI-SPOOFING HARDENED)
-- Helper function to resolve accessible team IDs without RLS recursion.
-- Anti-spoofing check: Prevents caller from querying other parents' IDs unless caller is staff.
CREATE OR REPLACE FUNCTION public.get_parent_team_ids(p_parent_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Anti-spoofing enforcement:
    IF p_parent_id IS DISTINCT FROM auth.uid() AND NOT public.is_staff() THEN
        RAISE EXCEPTION 'Access denied: cannot inspect team IDs of another user';
    END IF;

    RETURN QUERY
    SELECT DISTINCT tp.team_id
    FROM public.team_players tp
    JOIN public.parent_players pp ON pp.player_id = tp.player_id
    WHERE pp.parent_id = p_parent_id
      AND tp.left_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.get_parent_team_ids IS 'Returns team IDs accessible to a parent via their active children with anti-spoofing checks';

-- Revoke execute on get_parent_team_ids from PUBLIC and anon; grant only to authenticated
REVOKE ALL ON FUNCTION public.get_parent_team_ids(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_parent_team_ids(UUID) TO authenticated;

-- NOTE: public.is_staff() is NOT overwritten here. It is preserved from existing database configuration.

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR TEAMS
-- Select: staff see all teams; parents see only teams containing their active children
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT TO authenticated
    USING (
        public.is_staff()
        OR id IN (SELECT public.get_parent_team_ids(auth.uid()))
    );

-- Insert/Update/Delete: staff only
DROP POLICY IF EXISTS "teams_staff_insert" ON public.teams;
CREATE POLICY "teams_staff_insert" ON public.teams
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "teams_staff_update" ON public.teams;
CREATE POLICY "teams_staff_update" ON public.teams
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "teams_staff_delete" ON public.teams;
CREATE POLICY "teams_staff_delete" ON public.teams
    FOR DELETE TO authenticated
    USING (public.is_staff());

-- 8. RLS POLICIES FOR TEAM_PLAYERS
-- Select: staff see all assignments; parents see only roster of their child's team
DROP POLICY IF EXISTS "team_players_select_policy" ON public.team_players;
CREATE POLICY "team_players_select_policy" ON public.team_players
    FOR SELECT TO authenticated
    USING (
        public.is_staff()
        OR team_id IN (SELECT public.get_parent_team_ids(auth.uid()))
    );

-- Insert/Update/Delete: staff only (strictly blocks parents from self-assigning or altering rosters)
DROP POLICY IF EXISTS "team_players_staff_insert" ON public.team_players;
CREATE POLICY "team_players_staff_insert" ON public.team_players
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "team_players_staff_update" ON public.team_players;
CREATE POLICY "team_players_staff_update" ON public.team_players
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "team_players_staff_delete" ON public.team_players;
CREATE POLICY "team_players_staff_delete" ON public.team_players
    FOR DELETE TO authenticated
    USING (public.is_staff());

-- 9. AUDITED MINIMAL ROSTER DTO FUNCTION (SECURITY DEFINER)
-- Solves RLS blocker: Allows authorized parents and staff to retrieve the team roster
-- containing ONLY safe presentation fields (display_name, shirt_number, position, status)
-- WITHOUT exposing the full public.players table, contact info, notes, or photo_path.
CREATE OR REPLACE FUNCTION public.get_team_roster(p_team_id UUID)
RETURNS TABLE (
    membership_id UUID,
    team_id UUID,
    team_name TEXT,
    cohort_year INTEGER,
    player_id UUID,
    display_name TEXT,
    shirt_number TEXT,
    "position" TEXT,
    roster_role TEXT,
    status TEXT,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Authentication check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to inspect team roster';
    END IF;

    -- 2. Authorization check: Must be staff OR parent of an active child in this team
    IF NOT (
        public.is_staff()
        OR p_team_id IN (SELECT public.get_parent_team_ids(auth.uid()))
    ) THEN
        RAISE EXCEPTION 'Access denied: caller is not authorized to inspect roster for team %', p_team_id;
    END IF;

    -- 3. Return sanitized presentation projection
    RETURN QUERY
    SELECT 
        tp.id AS membership_id,
        tp.team_id,
        t.name AS team_name,
        t.cohort_year,
        tp.player_id,
        p.display_name,
        p.shirt_number,
        p.position,
        tp.roster_role,
        tp.status,
        tp.joined_at
    FROM public.team_players tp
    JOIN public.teams t ON t.id = tp.team_id
    JOIN public.players p ON p.id = tp.player_id
    WHERE tp.team_id = p_team_id
      AND tp.left_at IS NULL
      AND t.active = true
      AND p.active = true
    ORDER BY p.shirt_number NULLS LAST, p.display_name;
END;
$$;

COMMENT ON FUNCTION public.get_team_roster IS 'Audited, secure minimal roster DTO provider for Team Showcase. Verifies parent authorization and completely omits photo_path and PII.';

REVOKE ALL ON FUNCTION public.get_team_roster(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_roster(UUID) TO authenticated;

-- 10. PRIVACY PRESERVING PRESENTATION VIEW (ZERO PII / ZERO STATS / ZERO PHOTO_PATH)
CREATE OR REPLACE VIEW public.v_team_roster_presentation
WITH (security_invoker = true) AS
SELECT 
    tp.id AS membership_id,
    tp.team_id,
    t.name AS team_name,
    t.cohort_year,
    tp.player_id,
    p.display_name,
    p.shirt_number,
    p.position,
    tp.roster_role,
    tp.status,
    tp.joined_at
FROM public.team_players tp
JOIN public.teams t ON t.id = tp.team_id
JOIN public.players p ON p.id = tp.player_id
WHERE tp.left_at IS NULL
  AND t.active = true
  AND p.active = true;

COMMENT ON VIEW public.v_team_roster_presentation IS 'Clean presentation DTO view with security invoker. Omits photos, contacts, and personal stats.';

-- 11. AUDIT VIEW: UNASSIGNED ACTIVE PLAYERS (RESTRICTED TO STAFF)
CREATE OR REPLACE VIEW public.v_unassigned_players
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.display_name,
    p.shirt_number,
    p.position,
    p.created_at
FROM public.players p
WHERE p.active = true
  AND public.is_staff() -- Staff-only gate: parents cannot inspect unassigned player lists
  AND NOT EXISTS (
      SELECT 1 FROM public.team_players tp
      WHERE tp.player_id = p.id 
        AND tp.left_at IS NULL
  );

COMMENT ON VIEW public.v_unassigned_players IS 'Active players not yet assigned to any active team roster. Restricted to staff.';

-- 12. AUDITABLE MANAGEMENT PROCEDURES (STAFF ONLY)
-- Assign player to team
CREATE OR REPLACE FUNCTION public.assign_player_to_team(
    p_team_id UUID,
    p_player_id UUID,
    p_role TEXT DEFAULT 'primary'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_active UUID;
    v_new_id UUID;
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Access denied: only staff can modify team rosters';
    END IF;

    -- Prevent duplicate active membership in the same team
    SELECT id INTO v_existing_active
    FROM public.team_players
    WHERE team_id = p_team_id 
      AND player_id = p_player_id 
      AND left_at IS NULL;

    IF v_existing_active IS NOT NULL THEN
        RAISE EXCEPTION 'Player % is already actively assigned to team %', p_player_id, p_team_id;
    END IF;

    INSERT INTO public.team_players (team_id, player_id, roster_role, status, joined_at)
    VALUES (p_team_id, p_player_id, p_role, 'active', timezone('utc'::text, now()))
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- Deactivate player membership (preserving history)
CREATE OR REPLACE FUNCTION public.remove_player_from_team(
    p_team_id UUID,
    p_player_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Access denied: only staff can modify team rosters';
    END IF;

    UPDATE public.team_players
    SET left_at = timezone('utc'::text, now()),
        status = 'inactive',
        updated_at = timezone('utc'::text, now())
    WHERE team_id = p_team_id 
      AND player_id = p_player_id 
      AND left_at IS NULL;
END;
$$;

-- Safe transfer between teams (atomic deactivation and new assignment)
CREATE OR REPLACE FUNCTION public.transfer_player_team(
    p_source_team_id UUID,
    p_target_team_id UUID,
    p_player_id UUID,
    p_new_role TEXT DEFAULT 'primary'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id UUID;
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Access denied: only staff can transfer players';
    END IF;

    -- Deactivate old membership
    UPDATE public.team_players
    SET left_at = timezone('utc'::text, now()),
        status = 'inactive',
        updated_at = timezone('utc'::text, now())
    WHERE team_id = p_source_team_id 
      AND player_id = p_player_id 
      AND left_at IS NULL;

    -- Create new membership
    INSERT INTO public.team_players (team_id, player_id, roster_role, status, joined_at)
    VALUES (p_target_team_id, p_player_id, p_new_role, 'active', timezone('utc'::text, now()))
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- Revoke execute on management procedures from PUBLIC and anon; grant only to authenticated
REVOKE ALL ON FUNCTION public.assign_player_to_team(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_player_to_team(UUID, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.remove_player_from_team(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_player_from_team(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.transfer_player_team(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_player_team(UUID, UUID, UUID, TEXT) TO authenticated;

-- 13. INITIAL SEED (TEAM DEFINITION ONLY — NO AUTOMATIC PLAYER ASSIGNMENTS)
INSERT INTO public.teams (name, cohort_year, slug, category, active)
VALUES ('DELTA 2018 GM', 2018, 'delta-2018-gm', 'U-8', true)
ON CONFLICT (slug) DO NOTHING;

-- DELTA-045J.2 security hardening: disable TRUNCATE and other non-RLS actions
-- Postgres RLS does not restrict TRUNCATE.
REVOKE ALL PRIVILEGES ON TABLE public.teams, public.team_players FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teams, public.team_players TO authenticated;

-- Verification notice
SELECT 'DELTA-045J.2 SCHEMA HARDENED & READY FOR REVIEW' AS status;
