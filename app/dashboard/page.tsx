import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-profile";
import TeamHub from "@/components/TeamHub";

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
    { data: parentLinks }
  ] = await Promise.all([
    supabase.from("players").select("id,display_name,shirt_number,position,photo_path,active").eq("active",true).order("display_name"),
    supabase.from("matches").select("id,round_no,match_date,match_time,venue,home_team,away_team,home_score,away_score,status").order("match_date"),
    supabase.from("match_attendance").select("match_id,player_id,status"),
    supabase.from("match_lineup").select("match_id,player_id,is_starter,is_captain"),
    supabase.from("match_events").select("id,match_id,event_type,player_id,assist_player_id,minute,created_at").order("created_at"),
    supabase.from("news").select("id,type,title,body,published_at").order("published_at",{ascending:false}),
    supabase.from("club_updates").select("id,source_key,source_name,source_url,title,body,priority,published_at,synced_at").order("published_at",{ascending:false}).limit(30),
    supabase.from("parent_players").select("player_id").eq("parent_id", user.id),
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
      parentPlayerIds={(parentLinks || []).map(x=>x.player_id)}
    />
  );
}
