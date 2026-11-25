-- ==============================================================================
-- DELTA INFERNO: ROLLBACK FOR DELTA-045J.2 (TEAMS & TEAM PLAYERS)
-- Target: delta-2018-gm-staging / production
-- Status: PREPARED FOR ROLLBACK / EMERGENCY USE
-- ==============================================================================

BEGIN;

-- 1. DROP MANAGEMENT PROCEDURES
DROP FUNCTION IF EXISTS public.transfer_player_team(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.remove_player_from_team(UUID, UUID);
DROP FUNCTION IF EXISTS public.assign_player_to_team(UUID, UUID, TEXT);

-- 2. DROP PRESENTATION & AUDIT VIEWS
DROP VIEW IF EXISTS public.v_unassigned_players;
DROP VIEW IF EXISTS public.v_team_roster_presentation;

-- 3. DROP AUDITED MINIMAL ROSTER DTO FUNCTION
DROP FUNCTION IF EXISTS public.get_team_roster(UUID);

-- 4. DROP RLS HELPER FUNCTION
DROP FUNCTION IF EXISTS public.get_parent_team_ids(UUID);

-- NOTE: public.is_staff() is INTENTIONALLY PRESERVED because it is shared across the entire DELTA system!

-- 5. DROP POLICIES ON TEAM_PLAYERS
DROP POLICY IF EXISTS "team_players_staff_delete" ON public.team_players;
DROP POLICY IF EXISTS "team_players_staff_update" ON public.team_players;
DROP POLICY IF EXISTS "team_players_staff_insert" ON public.team_players;
DROP POLICY IF EXISTS "team_players_select_policy" ON public.team_players;

-- 6. DROP POLICIES ON TEAMS
DROP POLICY IF EXISTS "teams_staff_delete" ON public.teams;
DROP POLICY IF EXISTS "teams_staff_update" ON public.teams;
DROP POLICY IF EXISTS "teams_staff_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;

-- 7. DROP TABLES
DROP TABLE IF EXISTS public.team_players CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

COMMIT;

SELECT 'DELTA-045J.2 ROLLBACK COMPLETED SUCCESSFULLY' AS status;
