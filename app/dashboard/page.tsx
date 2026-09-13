import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-profile";
import TeamHub from "@/components/TeamHub";
import { EMPTY_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { user, profile, error: profileError } = await getCurrentProfile();
  if (!user) redirect("/login");

  if (!profile) {
    console.error("Profile load failed:", profileError);
    redirect("/login?error=profile_missing");
  }

  const supabase = await createClient();

  const [
    { data: players, error: playersError },
    { data: matches, error: matchesError },
    { data: attendance },
    { data: lineup },
    { data: events },
    { data: news },
    { data: clubUpdates },
    { data: teamEvents },
    { data: trainingSessions },
    { data: trainingAttendance },
    { data: trainingGames },
    { data: trainingGamePlayers },
    { data: trainingEvents },
    { data: matchMedia },
    { data: parentLinks },
    { data: permissions }
  ] = await Promise.all([
    supabase.from("players").select("id,display_name,shirt_number,position,photo_path,active").eq("active",true).order("display_name"),
    supabase.from("matches").select("id,round_no,match_date,match_time,venue,home_team,away_team,home_score,away_score,status").order("match_date"),
    supabase.from("match_attendance").select("match_id,player_id,status"),
    supabase.from("match_lineup").select("match_id,player_id,is_starter,is_captain"),
    supabase.from("match_events").select("id,match_id,event_type,player_id,assist_player_id,minute,created_at").order("created_at"),
    supabase.from("news").select("id,type,title,body,published_at").order("published_at",{ascending:false}),
    supabase.from("club_updates").select("id,source_key,source_name,source_url,title,body,priority,published_at,synced_at").order("published_at",{ascending:false}).limit(30),
    supabase.from("team_events").select("id,title,event_type,event_date,start_time,end_time,location,details,important,player_id,created_at").order("event_date").order("start_time"),
    supabase.from("training_sessions").select("id,training_date,start_time,end_time,location,title,notes,created_at").order("training_date",{ascending:false}),
    supabase.from("training_attendance").select("training_id,player_id,status"),
    supabase.from("training_games").select("id,training_id,team_a_name,team_b_name,team_a_score,team_b_score,created_at"),
    supabase.from("training_game_players").select("game_id,player_id,team"),
    supabase.from("training_events").select("id,game_id,event_type,player_id,assist_player_id,created_at"),
    supabase.from("match_media").select("id,match_id,storage_path,caption,created_at").order("created_at"),
    supabase.from("parent_players").select("player_id").eq("parent_id", user.id),
    supabase.from("user_permissions").select("role_label,can_manage_matches,can_edit_match_events,can_manage_training,can_manage_training_attendance,can_manage_calendar,can_manage_news,can_manage_players").eq("user_id",user.id).maybeSingle(),
  ]);

  if (playersError) console.error("Players load error:", playersError.message);
  if (matchesError) console.error("Matches load error:", matchesError.message);

  return (
    <TeamHub
      profile={profile}
      initialPlayers={players || []}
      initialMatches={matches || []}
      initialAttendance={attendance || []}
      initialLineup={lineup || []}
      initialEvents={events || []}
      initialNews={news || []}
      initialClubUpdates={clubUpdates || []}
      initialTeamEvents={teamEvents || []}
      initialTrainingSessions={trainingSessions || []}
      initialTrainingAttendance={trainingAttendance || []}
      initialTrainingGames={trainingGames || []}
      initialTrainingGamePlayers={trainingGamePlayers || []}
      initialTrainingEvents={trainingEvents || []}
      initialMatchMedia={matchMedia || []}
      parentPlayerIds={(parentLinks || []).map((x:any)=>x.player_id)}
      userPermissions={permissions || EMPTY_PERMISSIONS}
    />
  );
}
