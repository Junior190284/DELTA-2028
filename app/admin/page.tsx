import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-profile";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (!profile || !["admin","coach"].includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();

  const [
    { data: players },
    { data: matches },
    { data: attendance },
    { data: lineup },
    { data: events },
    { data: news },
    { data: profiles },
    { data: teamEvents },
    { data: parentLinks }
  ] = await Promise.all([
    supabase.from("players").select("*").order("display_name"),
    supabase.from("matches").select("*").order("match_date"),
    supabase.from("match_attendance").select("*"),
    supabase.from("match_lineup").select("*"),
    supabase.from("match_events").select("*").order("created_at"),
    supabase.from("news").select("*").order("published_at",{ascending:false}),
    supabase.from("profiles").select("id,display_name,role").order("display_name"),
    supabase.from("team_events").select("*").order("event_date").order("start_time"),
    supabase.from("parent_players").select("*")
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
    allProfiles={profiles || []}
    initialParentLinks={parentLinks || []}
  />;
}
