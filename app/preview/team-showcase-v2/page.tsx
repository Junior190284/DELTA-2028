import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TeamShowcaseV2 from "@/components/team-showcase/TeamShowcaseV2";
import {
  buildRoster,
  classifyAuthResult,
  resolveRosterState,
  type AuthOutcome,
  type RosterPlayerRow,
  type RosterState,
} from "@/lib/team/teamShowcase";
import { DEMO_ROSTER, DEMO_STATIC_PHOTOS } from "@/lib/team/teamShowcaseDemo";

/**
 * P14A: Team Showcase 2.0 (prototype). The /preview route is blocked in production
 * by app/preview/layout.tsx (404 on Vercel production and production domains).
 *
 * Authentication (P14A.2): the existing DELTA Supabase SSR client (lib/supabase/server).
 * Identity is confirmed ONLY by supabase.auth.getUser(): the auth server verifies the
 * token (and refreshes an expired session when a refresh token exists). Cookie presence
 * or names are NOT checked. Token values are not read or logged.
 * The shared request handling (proxy.ts) is NOT modified by this prototype.
 *
 * States:
 *  - verified user                                  -> real roster (RLS)
 *  - an explicit auth error (rejected token) or
 *    the session cannot be checked (network/5xx)     -> message + "Spróbuj ponownie"
 *  - no verified user and no error                  -> DEMO (clearly marked)
 * Known limitation: supabase-js reports a revoked session or a failed refresh of an
 * expired session the same way as "no session" (it removes the session, see
 * classifyAuthResult). Such a user sees the DEMO (never real data); distinguishing it
 * would require changing proxy.ts, which is deliberately not done.
 *
 * Data: READ-ONLY, only for a verified user, through the same client with their session
 * (publishable key + user token), so the RLS of the `players` table applies; no service
 * key. The page does not pass photo_path to the browser: photos only through the existing
 * /api/player-photo/[id] (also getUser + RLS + a signed URL for 30 minutes).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DELTA 2018 GM — Prezentacja składu 2.0 (PREVIEW)",
  description: "Prototyp filmowej prezentacji zawodników DELTA Warszawa 2018 GM",
};

async function loadRosterState(): Promise<RosterState> {
  let auth: AuthOutcome = "auth-unavailable";
  let queryFailed = false;
  let rows: RosterPlayerRow[] | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    // classification by error type/status only (no message, no token)
    auth = classifyAuthResult(Boolean(data?.user), error ? { name: error.name, status: error.status, code: error.code } : null);
    if (auth === "user") {
      const res = await supabase
        .from("players")
        .select("id,display_name,shirt_number,position,photo_path,active")
        .eq("active", true)
        .order("display_name");
      queryFailed = Boolean(res.error);
      rows = res.error ? null : ((res.data ?? []) as RosterPlayerRow[]);
    }
  } catch {
    // an exception before the identity is confirmed means the session cannot be checked;
    // after confirmation it is a read error
    if (auth === "user") queryFailed = true;
    else auth = "auth-unavailable";
  }
  return resolveRosterState({ auth, queryFailed, rows });
}

export default async function TeamShowcaseV2Page() {
  const state = await loadRosterState();
  if (state.kind === "demo") {
    return <TeamShowcaseV2 view={{ kind: "roster", source: "demo", players: buildRoster(DEMO_ROSTER, DEMO_STATIC_PHOTOS) }} />;
  }
  if (state.kind === "live") {
    return <TeamShowcaseV2 view={{ kind: "roster", source: "live", players: buildRoster(state.rows) }} />;
  }
  if (state.kind === "empty") return <TeamShowcaseV2 view={{ kind: "empty" }} />;
  return <TeamShowcaseV2 view={{ kind: "error", reason: state.reason }} />;
}
