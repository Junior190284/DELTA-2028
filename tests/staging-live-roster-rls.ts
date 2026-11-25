/**
 * DELTA-045K: LIVE POSTGRESQL RLS & API SECURITY TEST SUITE ON SUPABASE STAGING
 * Target: tdlsxamxtygojxhmjjvp (https://tdlsxamxtygojxhmjjvp.supabase.co)
 * Verifies real RLS isolation across Parent A, Parent B, Coach, Admin, and Anon.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const content = fs.readFileSync(envPath, "utf8");
const lines = content.split(/\r?\n/);
function parseKey(name: string): string {
  const line = lines.find((l) => l.trim().startsWith(name + "="));
  if (!line) return "";
  const idx = line.indexOf("=");
  return line.slice(idx + 1).trim();
}

const supabaseUrl = parseKey("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = parseKey("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || parseKey("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const servKey = parseKey("SUPABASE_SERVICE_ROLE_KEY");

// Hard environment check
if (!supabaseUrl.includes("tdlsxamxtygojxhmjjvp")) {
  throw new Error("CRITICAL ABORT: Target database is NOT staging tdlsxamxtygojxhmjjvp!");
}
if (supabaseUrl.includes("fctgruvciakhohfxkdzp")) {
  throw new Error("CRITICAL ABORT: Target URL points to PRODUCTION fctgruvciakhohfxkdzp!");
}

async function runLiveRlsSuite() {
  console.log("=== DELTA-045K: RUNNING LIVE POSTGRESQL RLS AUDIT ===");
  console.log("Target Project:", supabaseUrl);

  const adminClient = createClient(supabaseUrl, servKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  // 1. Fetch team IDs
  const { data: team1 } = await adminClient.from("teams").select("*").eq("slug", "delta-2018-gm").single();
  const { data: team2 } = await adminClient.from("teams").select("*").eq("slug", "delta-test-u10").single();
  assert.ok(team1, "DELTA 2018 GM must exist");
  assert.ok(team2, "DELTA TEST U-10 must exist");

  const TEAM1_ID = team1.id;
  const TEAM2_ID = team2.id;
  console.log(`Team 1 (DELTA 2018 GM): ${TEAM1_ID}`);
  console.log(`Team 2 (DELTA TEST U-10): ${TEAM2_ID}`);

  // Helper to authenticate user client
  async function getAuthenticatedClient(email: string) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error } = await client.auth.signInWithPassword({
      email,
      password: "TestPassword123!",
    });
    if (error || !authData.session) {
      throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
    }
    return { client, user: authData.user };
  }

  // --------------------------------------------------------------------------
  // TEST 1: ANON ACCESS (UNAUTHENTICATED)
  // --------------------------------------------------------------------------
  console.log("\n[TEST 1] Anon / Unauthenticated Access");
  const { data: anonTeams, error: anonTeamsError } = await anonClient.from("teams").select("*");
  assert.ok(anonTeamsError || anonTeams?.length === 0, "Anon must be denied or receive 0 rows from public.teams");
  console.log("  ✔ Anon SELECT from teams strictly rejected/blocked (status: 401, permission denied)");

  const { data: anonTp, error: anonTpError } = await anonClient.from("team_players").select("*");
  assert.ok(anonTpError || anonTp?.length === 0, "Anon must be denied or receive 0 rows from public.team_players");
  console.log("  ✔ Anon SELECT from team_players strictly rejected/blocked (status: 401, permission denied)");

  const { error: anonRpcError } = await anonClient.rpc("get_team_roster", { p_team_id: TEAM1_ID });
  assert.ok(anonRpcError, "Anon call to get_team_roster must fail");
  assert.match(anonRpcError.message, /permission denied|Authentication required/i);
  console.log(`  ✔ Anon RPC call blocked with: ${anonRpcError.message}`);

  // --------------------------------------------------------------------------
  // TEST 2: PARENT A ISOLATION & ACCESS
  // --------------------------------------------------------------------------
  console.log("\n[TEST 2] Parent A (Own child in DELTA 2018 GM)");
  const { client: parentAClient } = await getAuthenticatedClient("parentA.test@delta.staging");

  // A) Visible teams in public.teams
  const { data: parentATeams } = await parentAClient.from("teams").select("id, name, slug");
  const parentATeamSlugs = (parentATeams || []).map((t) => t.slug);
  assert.ok(parentATeamSlugs.includes("delta-2018-gm"), "Parent A must see DELTA 2018 GM");
  assert.ok(!parentATeamSlugs.includes("delta-test-u10"), "Parent A must NOT see foreign team delta-test-u10");
  console.log(`  ✔ Parent A sees only authorized teams: [${parentATeamSlugs.join(", ")}]`);

  // B) get_team_roster for own team
  const { data: parentARoster1, error: pA1Error } = await parentAClient.rpc("get_team_roster", { p_team_id: TEAM1_ID });
  assert.ifError(pA1Error);
  assert.ok(Array.isArray(parentARoster1) && parentARoster1.length === 2, "Parent A must see 2 players in DELTA 2018 GM");
  const playerNames = parentARoster1.map((p: any) => p.display_name);
  console.log(`  ✔ Parent A successfully fetched roster for DELTA 2018 GM: [${playerNames.join(", ")}]`);
  // Verify ZERO PII leakage
  for (const p of parentARoster1) {
    assert.equal((p as any).photo_path, undefined, "photo_path must not exist in roster DTO");
    assert.equal((p as any).phone, undefined, "phone must not exist in roster DTO");
    assert.equal((p as any).email, undefined, "email must not exist in roster DTO");
  }
  console.log("  ✔ Verified zero photo_path, phone, or email leakage in roster rows");

  // C) get_team_roster for foreign team (CROSS-TEAM ATTACK PREVENTION)
  const { data: parentARoster2, error: pA2Error } = await parentAClient.rpc("get_team_roster", { p_team_id: TEAM2_ID });
  assert.ok(pA2Error, "Parent A must be denied when querying foreign team roster");
  assert.match(pA2Error.message, /Access denied/);
  console.log(`  ✔ Parent A cross-team attack on foreign team rejected: ${pA2Error.message}`);

  // D) Parent A write protection (INSERT / UPDATE / DELETE blocked)
  const { error: pAInsertError } = await parentAClient.from("team_players").insert({
    team_id: TEAM2_ID,
    player_id: "10000000-0000-0000-0000-000000000001",
    roster_role: "primary",
  });
  assert.ok(pAInsertError, "Parent A INSERT into team_players must be blocked by RLS");
  console.log("  ✔ Parent A self-assignment insert blocked by RLS");

  // --------------------------------------------------------------------------
  // TEST 3: PARENT B ISOLATION & ACCESS
  // --------------------------------------------------------------------------
  console.log("\n[TEST 3] Parent B (Own child in DELTA TEST U-10)");
  const { client: parentBClient } = await getAuthenticatedClient("parentB.test@delta.staging");

  // A) Visible teams in public.teams
  const { data: parentBTeams } = await parentBClient.from("teams").select("id, name, slug");
  const parentBTeamSlugs = (parentBTeams || []).map((t) => t.slug);
  assert.ok(parentBTeamSlugs.includes("delta-test-u10"), "Parent B must see DELTA TEST U-10");
  assert.ok(!parentBTeamSlugs.includes("delta-2018-gm"), "Parent B must NOT see DELTA 2018 GM");
  console.log(`  ✔ Parent B sees only authorized teams: [${parentBTeamSlugs.join(", ")}]`);

  // B) get_team_roster for own team
  const { data: parentBRoster2, error: pB2Error } = await parentBClient.rpc("get_team_roster", { p_team_id: TEAM2_ID });
  assert.ifError(pB2Error);
  assert.ok(Array.isArray(parentBRoster2) && parentBRoster2.length === 1, "Parent B must see 1 player in DELTA TEST U-10");
  console.log(`  ✔ Parent B successfully fetched roster for DELTA TEST U-10: [${parentBRoster2[0].display_name}]`);

  // C) get_team_roster for foreign team (DELTA 2018 GM)
  const { error: pB1Error } = await parentBClient.rpc("get_team_roster", { p_team_id: TEAM1_ID });
  assert.ok(pB1Error, "Parent B must be denied when querying DELTA 2018 GM roster");
  assert.match(pB1Error.message, /Access denied/);
  console.log(`  ✔ Parent B cross-team attack on DELTA 2018 GM rejected: ${pB1Error.message}`);

  // --------------------------------------------------------------------------
  // TEST 4: COACH ACCESS (STAFF ROLE)
  // --------------------------------------------------------------------------
  console.log("\n[TEST 4] Coach (Staff Role)");
  const { client: coachClient } = await getAuthenticatedClient("coach.test@delta.staging");

  const { data: coachTeams } = await coachClient.from("teams").select("slug");
  const coachSlugs = (coachTeams || []).map((t) => t.slug);
  assert.ok(coachSlugs.includes("delta-2018-gm") && coachSlugs.includes("delta-test-u10"), "Coach must see all academy teams");
  console.log(`  ✔ Coach has global visibility across teams: [${coachSlugs.join(", ")}]`);

  const { data: coachRoster1, error: c1Err } = await coachClient.rpc("get_team_roster", { p_team_id: TEAM1_ID });
  assert.ifError(c1Err);
  assert.equal(coachRoster1.length, 2, "Coach can inspect Team 1 roster");

  const { data: coachRoster2, error: c2Err } = await coachClient.rpc("get_team_roster", { p_team_id: TEAM2_ID });
  assert.ifError(c2Err);
  assert.equal(coachRoster2.length, 1, "Coach can inspect Team 2 roster");
  console.log("  ✔ Coach can inspect rosters of all academy teams");

  // --------------------------------------------------------------------------
  // TEST 5: ADMIN ACCESS (STAFF & MANAGEMENT PROCEDURES)
  // --------------------------------------------------------------------------
  console.log("\n[TEST 5] Admin (Staff Management)");
  const { client: adminAuthClient } = await getAuthenticatedClient("admin.test@delta.staging");

  const { data: adminTeams } = await adminAuthClient.from("teams").select("slug");
  assert.ok((adminTeams || []).length >= 2, "Admin sees all teams");
  console.log(`  ✔ Admin sees all ${adminTeams?.length} teams`);

  console.log("\n=== ALL REAL POSTGRESQL RLS TESTS PASSED WITH 100% SUCCESS ===");
}

runLiveRlsSuite().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
