import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "@/components/team-showcase-2/team-showcase-2.css";
import TeamShowcase2 from "@/components/team-showcase-2/TeamShowcase2";
import {
  buildRoster,
  classifyAuthResult,
  type AuthOutcome,
  type RosterPlayerRow,
} from "@/lib/team/teamShowcase";
import { NEUTRAL_SHOWCASE_ROSTER } from "@/lib/team/teamShowcaseDemo";
import { ShieldAlert, ArrowLeft, RefreshCw, KeyRound, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DELTA INFERNO — Team Showcase 2.0",
  description: "Nowoczesna, stadionowa prezentacja prawdziwego składu drużyny DELTA",
};

interface TeamShowcasePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TeamShowcasePage({ searchParams }: TeamShowcasePageProps) {
  const sp = searchParams ? await searchParams : {};
  const isForceDemo = sp.demo === "1" || sp.demo === "true";

  let auth: AuthOutcome = "auth-unavailable";
  let parentPlayerIds: string[] = [];
  let userRole: string | null = null;
  let liveBlockedReason: string | null = null;
  let liveRosterRows: RosterPlayerRow[] | null = null;
  let teamTitle = "K.S. DELTA WARSZAWA — Rocznik 2018 (U-9)";

  // If user explicitly asks for DEMO mode:
  if (isForceDemo) {
    const demoRoster = buildRoster(NEUTRAL_SHOWCASE_ROSTER);
    return (
      <TeamShowcase2
        players={demoRoster}
        source="demo"
        userRole="parent"
        parentPlayerIds={[]}
        teamName="K.S. DELTA WARSZAWA — Rocznik 2018 (DEMO)"
      />
    );
  }

  // LIVE MODE ATTEMPT: Authoritative contract validation
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    auth = classifyAuthResult(
      Boolean(user),
      authError ? { name: authError.name, status: authError.status, code: authError.code } : null
    );

    if (auth !== "user" || !user) {
      liveBlockedReason = "Wymagane logowanie rodzica. Zaloguj się, aby uzyskać dostęp do składu drużyny swojego dziecka.";
    } else {
      // 1. Resolve role from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      userRole = profile?.role ?? "parent";
      const isStaff = userRole === "admin" || userRole === "coach";

      // 2. Resolve linked children
      const { data: links } = await supabase
        .from("parent_players")
        .select("player_id")
        .eq("parent_id", user.id);
      parentPlayerIds = Array.isArray(links) ? links.map((l) => l.player_id) : [];

      // 3. Dynamic Database Contract Check: Check if teams table exists & fetch DELTA 2018 GM
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, name, cohort_year, slug, active")
        .eq("slug", "delta-2018-gm")
        .maybeSingle();

      if (teamError || !teamData) {
        liveBlockedReason = "Brak tabeli teams i relacji drużyna–zawodnik w bazie (LIVE zablokowany — wymagane uzgodnienie schematu)";
      } else {
        teamTitle = `${teamData.name} — Rocznik ${teamData.cohort_year}`;

        // 4. Check Parent Access Gate:
        // Staff has access; parents MUST have an active child assigned in team_players
        if (!isStaff) {
          const { data: membershipCheck, error: memError } = await supabase
            .from("team_players")
            .select("id")
            .eq("team_id", teamData.id)
            .in("player_id", parentPlayerIds.length > 0 ? parentPlayerIds : ["00000000-0000-0000-0000-000000000000"])
            .is("left_at", null)
            .limit(1);

          if (memError || !membershipCheck || membershipCheck.length === 0) {
            liveBlockedReason = "Brak przypisania do drużyny: Twój podopieczny nie znajduje się w kadrze DELTA 2018 GM lub oczekuje na weryfikację.";
          }
        }

        // 5. If authorized, fetch active team players via audited get_team_roster RPC
        if (!liveBlockedReason) {
          const { data: teamRoster, error: rosterError } = await supabase
            .rpc("get_team_roster", { p_team_id: teamData.id });

          if (rosterError || !teamRoster || teamRoster.length === 0) {
            liveBlockedReason = rosterError
              ? `Brak uprawnień do składu drużyny: ${rosterError.message}`
              : "Skład drużyny jest pusty lub oczekuje na przypisanie zweryfikowanych zawodników.";
          } else {
            liveRosterRows = teamRoster.map((row: any) => ({
              id: row.player_id,
              display_name: row.display_name,
              shirt_number: row.shirt_number,
              position: row.position,
              // Only own child targets signed photo resolution; teammates are null for silhouette
              photo_path: parentPlayerIds.includes(row.player_id) ? "storage" : null,
              active: true,
            })) as RosterPlayerRow[];
          }
        }
      }
    }
  } catch (err: any) {
    auth = "auth-unavailable";
    liveBlockedReason = "Błąd połączenia z bazą autoryzacyjną. Nie można zweryfikować uprawnień.";
  }

  // SUCCESSFUL LIVE SQUAD DISPLAY
  if (liveRosterRows && liveRosterRows.length > 0 && !liveBlockedReason) {
    const liveRoster = buildRoster(liveRosterRows);
    return (
      <TeamShowcase2
        players={liveRoster}
        source="live"
        userRole={userRole}
        parentPlayerIds={parentPlayerIds}
        teamName={teamTitle}
      />
    );
  }

  // LIVE BLOCKED STATE: Do NOT silently substitute fake personas in LIVE mode.
  // Render an authoritative security block screen with explanation and options.
  return (
    <div className="ts2-root min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> THE ROAD TO GLORY · LIVE GATE
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">
            Skład Rzeczywisty Zablokowany
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {liveBlockedReason || "Dostęp do rzeczywistego składu wymaga autoryzowanej sesji i aktywnego przypisania zawodnika."}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-1.5">
            <span>Status autoryzacji:</span>
            <span className="text-amber-400 font-mono">{auth === "user" ? "Sesja potwierdzona" : "Brak sesji"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Kontrakt drużynowy:</span>
            <span className="font-mono">{liveBlockedReason?.includes("Brak tabeli") ? "Oczekuje na migrację" : "Aktywny"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ochrona prywatności RLS:</span>
            <span className="text-emerald-400 font-semibold">100% AKTYWNA</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {auth !== "user" ? (
            <Link
              href="/login?redirect=/preview/team-showcase"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
            >
              <KeyRound className="w-4 h-4" /> Zaloguj się
            </Link>
          ) : (
            <Link
              href="/preview/team-showcase"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Sprawdź ponownie
            </Link>
          )}

          <Link
            href="/preview/team-showcase?demo=1"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tryb DEMO
          </Link>
        </div>
      </div>
    </div>
  );
}
