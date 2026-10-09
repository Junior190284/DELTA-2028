import React from "react";
import { notFound } from "next/navigation";
import { DeltaCard } from "@/components/cards";
import { DeltaCardTheme, DeltaCardModel, DELTA_THEME_CONFIGS } from "@/lib/cards/deltaCardModel";

export const metadata = {
  title: "DELTA Core Card Engine — Visual Preview (/dev/cards)",
  robots: { index: false, follow: false }
};

export default function DevCardsPage() {
  // Gate: Non-production only
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_DEV_PAGES !== "true") {
    notFound();
  }

  const allThemes: DeltaCardTheme[] = [
    "STANDARD",
    "TRAINING_HERO",
    "GOAL_MACHINE",
    "CAPTAIN",
    "MATCHDAY_HERO",
    "DELTA_ICON",
    "GOLD_MASTER",
    "INFERNO",
    "SEASONAL_EVENT"
  ];

  const mockPlayer = {
    id: "dev-p1",
    display_name: "RYSZARD RYBACKI",
    shirt_number: "7",
    photo_path: "/assets/players/ryszard-rybacki.png"
  };

  const sampleCardModel = (theme: DeltaCardTheme): DeltaCardModel => {
    const config = DELTA_THEME_CONFIGS[theme];
    return {
      id: `dev-${theme.toLowerCase()}`,
      playerId: mockPlayer.id,
      playerName: mockPlayer.display_name,
      shirtNumber: mockPlayer.shirt_number,
      playerImage: mockPlayer.photo_path,
      cardType: theme,
      rarity: theme === "INFERNO" ? "inferno" : theme === "DELTA_ICON" ? "legendary" : theme === "GOLD_MASTER" ? "epic" : theme === "MATCHDAY_HERO" ? "rare" : "common",
      stats: [
        { key: "matches", label: "MECZE", value: 34, icon: "🏟️" },
        { key: "goals", label: "GOLE", value: 48, icon: "⚽" },
        { key: "trainings", label: "TRENINGI", value: 96, icon: "⚡" },
        { key: "attendance", label: "FREKW.", value: "98%", icon: "📈" }
      ],
      duplicatesCount: theme === "INFERNO" ? 1 : 0,
      isFavorite: theme === "INFERNO" || theme === "DELTA_ICON",
      backData: {
        season: "2026/27",
        seriesName: config.label,
        seriesCode: config.seriesCode,
        cardId: `${config.seriesCode}-26-RR-007`,
        obtainedAt: "2026-10-09T10:00:00.000Z",
        milestoneBadge: theme === "INFERNO" ? { label: "KLUB 50 GOLI", icon: "⚽", color: "#ff4d5a" } : null
      }
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-red-500 selection:text-white">
      {/* Dev Header */}
      <div className="max-w-7xl mx-auto mb-8 border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider">
                DEV / STAGING ONLY
              </span>
              <span className="text-xs font-mono text-slate-400">BRANCH: gemini/card-collection-overhaul</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              DELTA Core Card Engine Preview (ETAP 13A.1)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Standard 2:3 aspect ratio, authentic DELTA stats, zero fake FIFA/OVR/Flags, modular layers, 3D tilt, and fallback testing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400">
              9 Themes • 6 Size Scales • Real DELTA Data
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section 1: All 9 Themes in MD Size */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
              <span>1. All Theme Variants</span>
              <span className="text-xs font-normal text-slate-400">(Size: md — 180x270px)</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm">
            {allThemes.map((theme) => (
              <div key={theme} className="flex flex-col items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-white/5">
                <DeltaCard card={sampleCardModel(theme)} size="md" />
                <span className="text-xs font-mono font-bold text-slate-300">{theme}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Size Scales (xs, sm, md, lg, hero) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
            <span>2. Standard 2:3 Size System</span>
            <span className="text-xs font-normal text-slate-400">(Hero, LG, MD, SM, XS)</span>
          </h2>

          <div className="flex flex-wrap items-end gap-6 p-6 rounded-2xl bg-slate-900/60 border border-white/5 overflow-x-auto">
            <div className="flex flex-col items-center gap-2">
              <DeltaCard card={sampleCardModel("INFERNO")} size="hero" />
              <span className="text-xs font-mono text-slate-400">hero (360x540)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DeltaCard card={sampleCardModel("DELTA_ICON")} size="lg" />
              <span className="text-xs font-mono text-slate-400">lg (260x390)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DeltaCard card={sampleCardModel("GOLD_MASTER")} size="md" />
              <span className="text-xs font-mono text-slate-400">md (180x270)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DeltaCard card={sampleCardModel("MATCHDAY_HERO")} size="sm" />
              <span className="text-xs font-mono text-slate-400">sm (120x180)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DeltaCard card={sampleCardModel("STANDARD")} size="xs" />
              <span className="text-xs font-mono text-slate-400">xs (64x96)</span>
            </div>
          </div>
        </section>

        {/* Section 3: Edge Cases & Fallbacks */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
            <span>3. Edge Cases & Resilience Tests</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-slate-900/60 border border-white/5">
            {/* Edge Case 1: Missing Photo Fallback */}
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <DeltaCard
                card={{
                  ...sampleCardModel("TRAINING_HERO"),
                  playerName: "JAN KOWALSKI",
                  playerImage: null
                }}
                size="md"
              />
              <span className="text-xs font-mono text-slate-400">Missing Photo (Neon Fallback)</span>
            </div>

            {/* Edge Case 2: Very Long Name */}
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <DeltaCard
                card={{
                  ...sampleCardModel("CAPTAIN"),
                  playerName: "BARTŁOMIEJ SZCZEPAŃSKI-KOWALSKI"
                }}
                size="md"
              />
              <span className="text-xs font-mono text-slate-400">Long Player Name (Auto Clamp)</span>
            </div>

            {/* Edge Case 3: Locked Card */}
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <DeltaCard
                card={{
                  ...sampleCardModel("INFERNO"),
                  isLocked: true
                }}
                size="md"
              />
              <span className="text-xs font-mono text-slate-400">Locked State (Security Cover)</span>
            </div>

            {/* Edge Case 4: Reverse Face / Backside */}
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <DeltaCard
                card={sampleCardModel("DELTA_ICON")}
                size="md"
                isFlipped={true}
              />
              <span className="text-xs font-mono text-slate-400">Back Dossier (Controlled Flip)</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
