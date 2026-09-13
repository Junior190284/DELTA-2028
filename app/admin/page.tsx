import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-profile";
import AdminPanel from "@/components/AdminPanel";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPTY_PERMISSIONS, hasDelegatedAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/dashboard");

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const {data:ownPermissions}=await adminClient
    .from("user_permissions")
    .select("role_label,can_manage_matches,can_edit_match_events,can_manage_training,can_manage_training_attendance,can_manage_calendar,can_manage_news,can_manage_players")
    .eq("user_id",user.id)
    .maybeSingle();
  const permissions=ownPermissions || EMPTY_PERMISSIONS;
  const coreStaff=["admin","coach"].includes(profile.role);
  if (!coreStaff && !hasDelegatedAccess(permissions)) redirect("/dashboard");

  const [
    { data: players },
    { data: matches },
    { data: attendance },
    { data: lineup },
    { data: events },
    { data: news },
    { data: profiles },
    { data: teamEvents },
    { data: trainingSessions },
    { data: trainingAttendance },
    { data: trainingGames },
    { data: trainingGamePlayers },
    { data: trainingEvents },
    { data: matchMedia },
    { data: parentLinks },
    { data: allPermissions }
  ] = await Promise.all([
    supabase.from("players").select("*").order("display_name"),
    supabase.from("matches").select("*").order("match_date"),
    supabase.from("match_attendance").select("*"),
    supabase.from("match_lineup").select("*"),
    supabase.from("match_events").select("*").order("created_at"),
    supabase.from("news").select("*").order("published_at",{ascending:false}),
    coreStaff ? adminClient.from("profiles").select("id,display_name,role").order("display_name") : Promise.resolve({data:[profile]} as any),
    supabase.from("team_events").select("*").order("event_date").order("start_time"),
    supabase.from("training_sessions").select("*").order("training_date",{ascending:false}),
    supabase.from("training_attendance").select("*"),
    supabase.from("training_games").select("*").order("created_at",{ascending:false}),
    supabase.from("training_game_players").select("*"),
    supabase.from("training_events").select("*").order("created_at"),
    supabase.from("match_media").select("*").order("created_at"),
    supabase.from("parent_players").select("*"),
    coreStaff ? adminClient.from("user_permissions").select("*") : Promise.resolve({data:[]} as any)
  ]);

  return <AdminPanel
    currentUser={profile}
    initialPlayers={players || []}
    initialMatches={matches || []}
    initialAttendance={attendance || []}
    initialLineup={lineup || []}
    initialEvents={events || []}
    initialNews={news || []}
    initialTeamEvents={teamEvents || []}
    initialTrainingSessions={trainingSessions || []}
    initialTrainingAttendance={trainingAttendance || []}
    initialTrainingGames={trainingGames || []}
    initialTrainingGamePlayers={trainingGamePlayers || []}
    initialTrainingEvents={trainingEvents || []}
    initialMatchMedia={matchMedia || []}
    allProfiles={profiles || []}
    initialParentLinks={parentLinks || []}
    initialPermissions={allPermissions || []}
    currentPermissions={permissions}
  />;
}
