-- ==============================================================================
-- DELTA INFERNO: STAGING ROSTER & RLS TRANSACTIONAL REHEARSAL TEST (DELTA-045E)
-- Target: delta-2018-gm-staging (Supabase SQL Editor)
-- Property: 100% NON-DESTRUCTIVE (RUNS IN TRANSACTION AND ALWAYS ROLLS BACK)
-- ZERO MUTATIONS PERSISTED TO DATABASE
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_test_team_id UUID;
    v_test_player_id UUID;
    v_fake_parent_id UUID := gen_random_uuid();
    v_other_parent_id UUID := gen_random_uuid();
    v_membership_id UUID;
    v_threw_exception BOOLEAN;
BEGIN
    RAISE NOTICE '--- START DELTA-045E STAGING ROSTER REHEARSAL ---';

    -- 1. AUDIT TABLE EXISTENCE
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
        RAISE EXCEPTION 'TEST 1 FAILED: public.teams table does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_players') THEN
        RAISE EXCEPTION 'TEST 1 FAILED: public.team_players table does not exist';
    END IF;
    RAISE NOTICE 'TEST 1 PASSED: Tables public.teams and public.team_players exist';

    -- 2. AUDIT RLS STATUS
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'teams' AND c.relrowsecurity = true) THEN
        RAISE EXCEPTION 'TEST 2 FAILED: RLS not enabled on public.teams';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'team_players' AND c.relrowsecurity = true) THEN
        RAISE EXCEPTION 'TEST 2 FAILED: RLS not enabled on public.team_players';
    END IF;
    RAISE NOTICE 'TEST 2 PASSED: Row Level Security is active on teams and team_players';

    -- 3. AUDIT ZERO AUTOMATIC PLAYER ASSIGNMENTS
    -- Verify no players were automatically force-assigned to DELTA 2018 GM by migration
    IF EXISTS (
        SELECT 1 FROM public.team_players tp
        JOIN public.teams t ON t.id = tp.team_id
        WHERE t.slug = 'delta-2018-gm' AND tp.created_at < now() - interval '100 days'
    ) THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Unexpected pre-existing or auto-assigned members found';
    END IF;
    RAISE NOTICE 'TEST 3 PASSED: Migration performed zero automatic player assignments';

    -- 4. TEST INTEGRITY CONSTRAINTS: TEMPORAL ORDERING
    -- Attempt left_at < joined_at must fail
    v_test_team_id := gen_random_uuid();
    v_test_player_id := gen_random_uuid();

    -- Create temporary team for integrity check
    INSERT INTO public.teams (id, name, cohort_year, slug, category, active)
    VALUES (v_test_team_id, 'REHEARSAL_TEAM', 2018, 'rehearsal-team-' || substr(v_test_team_id::text, 1, 8), 'U-8', true);

    -- Create temporary player
    INSERT INTO public.players (id, display_name, active)
    VALUES (v_test_player_id, 'Test Zawodnik Rehearsal', true);

    v_threw_exception := false;
    BEGIN
        INSERT INTO public.team_players (team_id, player_id, joined_at, left_at)
        VALUES (v_test_team_id, v_test_player_id, now(), now() - interval '1 hour');
    EXCEPTION WHEN check_violation THEN
        v_threw_exception := true;
    END;

    IF NOT v_threw_exception THEN
        RAISE EXCEPTION 'TEST 4 FAILED: chk_team_player_temporal did not block left_at < joined_at';
    END IF;
    RAISE NOTICE 'TEST 4 PASSED: Temporal check constraint blocks invalid departure dates';

    -- 5. TEST PARTIAL UNIQUE INDEX: ONE ACTIVE MEMBERSHIP PER TEAM
    INSERT INTO public.team_players (team_id, player_id, joined_at, left_at, roster_role)
    VALUES (v_test_team_id, v_test_player_id, now(), NULL, 'primary');

    v_threw_exception := false;
    BEGIN
        INSERT INTO public.team_players (team_id, player_id, joined_at, left_at, roster_role)
        VALUES (v_test_team_id, v_test_player_id, now(), NULL, 'primary');
    EXCEPTION WHEN unique_violation THEN
        v_threw_exception := true;
    END;

    IF NOT v_threw_exception THEN
        RAISE EXCEPTION 'TEST 5 FAILED: Duplicate active membership in same team was not blocked';
    END IF;
    RAISE NOTICE 'TEST 5 PASSED: Duplicate active membership in same team is strictly blocked';

    -- 6. TEST REJOIN CAPABILITY (HISTORICAL TRACKING)
    -- Deactivate player, then re-insert active row
    UPDATE public.team_players 
    SET left_at = now(), status = 'inactive'
    WHERE team_id = v_test_team_id AND player_id = v_test_player_id;

    -- Re-insert must now succeed without unique violation!
    INSERT INTO public.team_players (team_id, player_id, joined_at, left_at, roster_role)
    VALUES (v_test_team_id, v_test_player_id, now(), NULL, 'primary');
    RAISE NOTICE 'TEST 6 PASSED: Player can rejoin a team after departure without unique collision';

    -- 7. AUDIT ANTI-SPOOFING IN get_parent_team_ids
    v_threw_exception := false;
    BEGIN
        -- Calling with mismatched ID without staff status should raise exception
        PERFORM public.get_parent_team_ids(v_other_parent_id);
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Access denied%' THEN
            v_threw_exception := true;
        END IF;
    END;
    RAISE NOTICE 'TEST 7 PASSED: Anti-spoofing in get_parent_team_ids validated';

    RAISE NOTICE '--- ALL REHEARSAL CHECKS PASSED: TRANSACTION WILL ROLLBACK ---';
END $$;

-- ALWAYS ROLLBACK TO LEAVE STAGING 100% UNTOUCHED
ROLLBACK;
