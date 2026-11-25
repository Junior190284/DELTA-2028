import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import PublicTeamSite from "@/components/PublicTeamSite";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Server-side service client is used only to build a sanitized public view.
  // No player records, attendance, lineups, training-game data or parent links
  // are passed to the browser.
  const admin=createAdminClient();
  const auth=await createClient();

  const [
    {data:{user}},
    {data:matches},
    {data:news},
    {data:clubUpdates},
    {data:teamEvents}
  ]=await Promise.all([
    auth.auth.getUser(),
    admin.from("matches")
      .select("id,round_no,match_date,match_time,venue,home_team,away_team,home_score,away_score,status")
      .order("match_date"),
    admin.from("news")
      .select("id,type,title,body,published_at")
      .order("published_at",{ascending:false})
      .limit(10),
    admin.from("club_updates")
      .select("id,source_key,source_name,source_url,title,body,priority,published_at")
      .order("published_at",{ascending:false})
      .limit(10),
    admin.from("team_events")
      .select("id,title,event_type,event_date,start_time,end_time,location,details,important,player_id")
      .is("player_id",null)
      .neq("event_type","birthday")
      .order("event_date")
      .limit(12)
  ]);

  return <PublicTeamSite
    matches={matches||[]}
    news={news||[]}
    clubUpdates={clubUpdates||[]}
    teamEvents={(teamEvents||[]).map(({player_id,...event})=>event)}
    signedIn={Boolean(user)}
  />;
}
