import type { Metadata } from "next";
import TeamShowcaseV3 from "@/components/team-showcase-v3/TeamShowcaseV3";
import { demoRoster, parseDemoCount, parseVariant } from "@/lib/team/teamShowcaseV3";

/**
 * P15B: TEAM SHOWCASE 3.0 — DELTA CHAMPIONS (prototype).
 * The /preview route is blocked in production by app/preview/layout.tsx (404).
 * DEMO DATA ONLY: no Supabase connection or player queries (no production children's database).
 * Test parameters (Preview): ?variant=champions|stadium|ultimate|barca, ?count=1|2|7|18.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DELTA Champions — Team Showcase 3.0 (PREVIEW)",
  description: "Prototyp filmowej prezentacji zawodników DELTA (dane DEMO)",
};

export default async function TeamShowcaseV3Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const players = demoRoster(parseDemoCount(sp.count));
  return <TeamShowcaseV3 players={players} initialVariant={parseVariant(sp.variant)} />;
}
