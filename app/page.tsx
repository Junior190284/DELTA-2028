import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicTeamSite from "@/components/PublicTeamSite";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // Server-side service client is used only to build a sanitized public view.
  // No player records, attendance, lineups, training-game data or parent links
  // are passed to the browser.
  const admin=createAdminClient();

  const [
    {data:matches},
    {data:news},
    {data:clubUpdates},
    {data:teamEvents},
    {data:attendanceRows},
    {count:activePlayerCount}
  ]=await Promise.all([
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
      .limit(12),
    admin.from("match_attendance")
      .select("match_id,status"),
    admin.from("players")
      .select("id",{count:"exact",head:true})
      .eq("active",true)
  ]);

  const attendanceSummary=Object.values((attendanceRows||[]).reduce((acc:any,row:any)=>{
    const item=acc[row.match_id]||{match_id:row.match_id,responses:0,present:0};
    item.responses+=1;
    if(["present","yes"].includes(String(row.status)))item.present+=1;
    acc[row.match_id]=item;
    return acc;
  },{}));

  return <PublicTeamSite
    matches={matches||[]}
    news={news||[]}
    clubUpdates={clubUpdates||[]}
    teamEvents={(teamEvents||[]).map(({player_id,...event})=>event)}
    attendanceSummary={attendanceSummary as any}
    rosterCount={activePlayerCount||0}
  />;
}
