import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  sanitizeTeamRosterPlayer,
  type TeamRosterPlayerDto,
} from "../lib/team/roster-contract.ts";

const root = process.cwd();
const migrationSql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261125_delta045j2_teams_and_rosters.sql"),
  "utf8"
);
const rollbackSql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261125_delta045j2_teams_and_rosters_rollback.sql"),
  "utf8"
);
const apiRouteCode = fs.readFileSync(
  path.join(root, "app/api/teams/[teamId]/roster/route.ts"),
  "utf8"
);

// ==============================================================================
// 1. DO NOT OVERWRITE public.is_staff() AUDIT
// ==============================================================================
test("DELTA-045J.2: Migration does NOT redefine or overwrite public.is_staff()", () => {
  // Confirm CREATE OR REPLACE FUNCTION public.is_staff() is completely absent
  assert.doesNotMatch(
    migrationSql,
    /CREATE OR REPLACE FUNCTION public\.is_staff/i,
    "Migration must not overwrite public.is_staff()"
  );

  // Confirm REVOKE/GRANT on is_staff() is absent so existing grants are preserved
  assert.doesNotMatch(
    migrationSql,
    /REVOKE ALL ON FUNCTION public\.is_staff/i,
    "Migration must not revoke existing public.is_staff() permissions"
  );

  // Rollback must NOT drop public.is_staff()
  assert.doesNotMatch(
    rollbackSql,
    /DROP FUNCTION IF EXISTS public\.is_staff/i,
    "Rollback must not drop shared public.is_staff()"
  );
});

// ==============================================================================
// 2. AUDITED MINIMAL ROSTER DTO FUNCTION (SECURITY DEFINER)
// ==============================================================================
test("DELTA-045J.2: public.get_team_roster provides secure minimal DTO with database authorization", () => {
  // Function signature and security properties
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.get_team_roster\(p_team_id UUID\)/);
  assert.match(migrationSql, /SECURITY DEFINER/);
  assert.match(migrationSql, /SET search_path = public/);
  assert.match(migrationSql, /STABLE/);

  // Authentication check
  assert.match(migrationSql, /IF auth\.uid\(\) IS NULL THEN/);
  assert.match(migrationSql, /RAISE EXCEPTION 'Authentication required to inspect team roster';/);

  // Authorization check (staff or parent of active child in team)
  assert.match(
    migrationSql,
    /public\.is_staff\(\)\s*OR p_team_id IN \(SELECT public\.get_parent_team_ids\(auth\.uid\(\)\)\)/
  );

  // Strictly typed return table with minimal columns
  assert.match(migrationSql, /RETURNS TABLE \(/);
  assert.match(migrationSql, /display_name TEXT/);
  assert.match(migrationSql, /shirt_number TEXT/);
  assert.match(migrationSql, /("position"|position) TEXT/);
  assert.match(migrationSql, /roster_role TEXT/);
  assert.match(migrationSql, /status TEXT/);

  // ZERO photo_path or PII columns
  assert.doesNotMatch(migrationSql, /photo_path TEXT/);
  assert.doesNotMatch(migrationSql, /contact_phone/);
  assert.doesNotMatch(migrationSql, /email/);

  // Privileges strictly managed
  assert.match(migrationSql, /REVOKE ALL ON FUNCTION public\.get_team_roster\(UUID\) FROM PUBLIC, anon;/);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.get_team_roster\(UUID\) TO authenticated;/);
});

// ==============================================================================
// 3. TABLE INTEGRITY & PARTIAL UNIQUE INDEXES
// ==============================================================================
test("DELTA-045J.2: Tables and temporal integrity checks are defined", () => {
  assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS public\.teams/);
  assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS public\.team_players/);
  assert.match(migrationSql, /chk_team_player_temporal CHECK \(left_at IS NULL OR left_at >= joined_at\)/);

  assert.match(
    migrationSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS uq_team_player_active_membership\s+ON public\.team_players\s*\(team_id,\s*player_id\)\s+WHERE left_at IS NULL;/
  );
  assert.match(
    migrationSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS uq_player_single_primary_team\s+ON public\.team_players\s*\(player_id\)\s+WHERE left_at IS NULL AND roster_role = 'primary';/
  );
});

// ==============================================================================
// 4. ANTI-SPOOFING IN get_parent_team_ids
// ==============================================================================
test("DELTA-045J.2: get_parent_team_ids enforces anti-spoofing and non-recursive RLS", () => {
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.get_parent_team_ids\(p_parent_id UUID DEFAULT auth\.uid\(\)\)/);
  assert.match(migrationSql, /IF p_parent_id IS DISTINCT FROM auth\.uid\(\) AND NOT public\.is_staff\(\) THEN/);
  assert.match(migrationSql, /RAISE EXCEPTION 'Access denied: cannot inspect team IDs of another user';/);

  assert.match(migrationSql, /REVOKE ALL ON FUNCTION public\.get_parent_team_ids\(UUID\) FROM PUBLIC, anon;/);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.get_parent_team_ids\(UUID\) TO authenticated;/);
});

// ==============================================================================
// 5. API ROUTE INTEGRATION WITH get_team_roster RPC
// ==============================================================================
test("DELTA-045J.2: /api/teams/[teamId]/roster calls get_team_roster with fallback", () => {
  // Route calls RPC get_team_roster
  assert.match(apiRouteCode, /\.rpc\("get_team_roster",\s*\{\s*p_team_id:\s*teamId\s*\}\)/);
  // Route maintains sanitizeTeamRosterPlayer to protect own photo vs teammates
  assert.match(apiRouteCode, /sanitizeTeamRosterPlayer/);
});

// ==============================================================================
// 6. SANITIZER PII SHIELD
// ==============================================================================
test("DELTA-045J.2: sanitizeTeamRosterPlayer grants photo only to own child", () => {
  const ownChild = sanitizeTeamRosterPlayer(
    {
      id: "child-own-1",
      display_name: "Własne Dziecko",
      shirt_number: "7",
      position: "POM",
      roster_role: "primary",
      status: "active",
    },
    ["child-own-1"],
    "child-own-1",
    "/api/player-photo/child-own-1"
  );
  assert.equal(ownChild.isCurrentPlayer, true);
  assert.equal(ownChild.canAccessPhoto, true);
  assert.equal(ownChild.photoUrl, "/api/player-photo/child-own-1");

  const teammate = sanitizeTeamRosterPlayer(
    {
      id: "child-teammate-2",
      display_name: "Zawodnik Kolega",
      shirt_number: "10",
      position: "NAP",
      roster_role: "primary",
      status: "active",
    },
    ["child-own-1"],
    "child-own-1"
  );
  assert.equal(teammate.isCurrentPlayer, false);
  assert.equal(teammate.canAccessPhoto, false);
  assert.equal(teammate.photoUrl, null, "Teammate photoUrl must always be null");
});

// ==============================================================================
// 7. INITIAL SEED: ZERO AUTOMATIC ASSIGNMENTS
// ==============================================================================
test("DELTA-045J.2: Migration seeds team DELTA 2018 GM with zero automatic player assignments", () => {
  const seedBlock = migrationSql.slice(migrationSql.indexOf("-- 13. INITIAL SEED"));
  assert.match(seedBlock, /INSERT INTO public\.teams \(name, cohort_year, slug, category, active\)/);
  assert.match(seedBlock, /VALUES \('DELTA 2018 GM', 2018, 'delta-2018-gm', 'U-8', true\)/);
  assert.doesNotMatch(seedBlock, /INSERT INTO public\.team_players/);
});
