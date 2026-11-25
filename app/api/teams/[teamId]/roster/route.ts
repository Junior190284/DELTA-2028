import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeTeamRosterPlayer,
  type TeamRosterResponse,
  type TeamRosterErrorResponse,
} from "@/lib/team/roster-contract";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse<TeamRosterResponse | TeamRosterErrorResponse>> {
  const { teamId } = await params;
  if (!teamId) {
    return NextResponse.json(
      { success: false, error: "Missing teamId parameter", code: "NOT_FOUND" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // 1. Resolve caller profile and role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole: "admin" | "coach" | "parent" =
    profile?.role === "admin" || profile?.role === "coach"
      ? profile.role
      : "parent";

  const isStaff = userRole === "admin" || userRole === "coach";

  // 2. Resolve parent's children
  const { data: parentLinks } = await supabase
    .from("parent_players")
    .select("player_id")
    .eq("parent_id", user.id);

  const callerChildIds: string[] = (parentLinks || []).map(
    (row: { player_id: string }) => row.player_id
  );

  // Parse activeChildId from query params if supplied
  const { searchParams } = new URL(request.url);
  const activeChildId = searchParams.get("activeChildId");

  // 3. Access Authorization Gate:
  // Staff has global academy access.
  // Parent MUST have at least one child assigned to this team.
  if (!isStaff) {
    const { data: membershipCheck } = await supabase
      .from("team_players")
      .select("id")
      .eq("team_id", teamId)
      .in("player_id", callerChildIds.length > 0 ? callerChildIds : ["00000000-0000-0000-0000-000000000000"])
      .is("left_at", null)
      .limit(1);

    if (!membershipCheck || membershipCheck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have an active child in this team roster.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }
  }

  // 4. Fetch team info (authorized)
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, cohort_year, slug, category, active")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    return NextResponse.json(
      { success: false, error: "Team not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // 5. Query roster via audited minimal DTO provider (SECURITY DEFINER RPC or direct table query)
  let rawRoster: any[] = [];
  const { data: rpcRows, error: rpcError } = await supabase
    .rpc("get_team_roster", { p_team_id: teamId });

  if (!rpcError && Array.isArray(rpcRows)) {
    rawRoster = rpcRows.map((r: any) => ({
      id: r.membership_id,
      roster_role: r.roster_role,
      status: r.status,
      player: {
        id: r.player_id,
        display_name: r.display_name,
        shirt_number: r.shirt_number,
        position: r.position,
      },
    }));
  } else {
    // Fallback direct table query (compatible with environments before get_team_roster or unit test harness)
    const { data: rosterRows, error: rosterError } = await supabase
      .from("team_players")
      .select(`
        id,
        roster_role,
        status,
        player:players (
          id,
          display_name,
          shirt_number,
          position
        )
      `)
      .eq("team_id", teamId)
      .is("left_at", null);

    if (rosterError || !rosterRows) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch team roster", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
    rawRoster = rosterRows;
  }

  // 6. Build sanitized players list
  const sanitizedPlayers = rawRoster
    .map((row: any) => {
      const p = row.player;
      if (!p) return null;
      return sanitizeTeamRosterPlayer(
        {
          id: p.id,
          display_name: p.display_name,
          shirt_number: p.shirt_number,
          position: p.position,
          roster_role: row.roster_role,
          status: row.status,
        },
        callerChildIds,
        activeChildId
      );
    })
    .filter(Boolean) as any[];

  return NextResponse.json({
    success: true,
    team: {
      id: team.id,
      name: team.name,
      cohortYear: team.cohort_year,
      slug: team.slug,
      category: team.category,
      active: team.active,
    },
    callerActiveChildId: activeChildId,
    callerRole: userRole,
    players: sanitizedPlayers,
  });
}
