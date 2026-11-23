"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "@/components/dashboard/ui4/dashboard-ui4.css";
import "@/components/dashboard/ui4/variants/variants.css";
import "@/components/dashboard/ui4/delta-elite-41.css";
import {
  createDashboardUI4Model,
  HybridPlayerHeader,
  NextActionHero,
  PlayerProgressStrip,
  RecentCardsPanel,
  AlbumProgressPanel,
  RecentAchievementsPanel,
  TeamShowcaseGateway,
  ClubCommunicationsPanel,
  VariantSport,
  VariantCollector,
  VariantHybrid,
  DeltaElite41,
  type DashboardUI4AdapterInput
} from "@/components/dashboard/ui4";

// ============================================================================
// SYNTHETIC DEMO FIXTURES (100% SAFE — ZERO DB MUTATIONS)
// Rocznik 2018 w sezonie 2026/27 to kategoria U-9 (Żaki)
// ============================================================================

const fullAccess = {
  canViewCollection: true,
  canViewAchievements: true,
  canViewTeamShowcase: true,
  canViewClubCommunications: true
};

const elitePlayerFixture: DashboardUI4AdapterInput = {
  profile: {
    id: "demo-player-ryszard",
    role: "player",
    display_name: "Ryszard Rybacki"
  },
  teamName: "DELTA 2018 (U-9)",
  access: fullAccess,
  players: [
    { id: "demo-player-ryszard", display_name: "Ryszard Rybacki", shirt_number: 7, position: "NAP", active: true },
    { id: "p-2", display_name: "Mateusz Kowalczyk", shirt_number: 10, position: "POM", active: true },
    { id: "p-3", display_name: "Aleksander Zieliński", shirt_number: 4, position: "OBR", active: true },
    { id: "p-4", display_name: "Bartosz Wiśniewski", shirt_number: 19, position: "POM", active: true },
    { id: "p-5", display_name: "Jakub Kamiński", shirt_number: 9, position: "NAP", active: true }
  ],
  nextMatch: {
    id: "match-derby",
    title: "DELTA WARSZAWA vs KS URSUS",
    starts_at: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
    location: "Stadion Główny DELTA Arena (Boisko A)",
    opponent: "KS URSUS Warszawa U-9"
  },
  nextMatchCountdown: "ZA 2 DNI 4 GODZ",
  gameProfile: {
    currentXP: 2450,
    seasonXP: 1120,
    levelInfo: {
      level: 12,
      currentLevelXP: 350,
      nextLevelXP: 600,
      progressPercent: 58,
      title: "Kapitan Elity"
    },
    activityStreak: 7,
    maxStreak: 14,
    unopenedPacks: 3
  },
  allCards: [
    { id: "c-1", name: "Ryszard Rybacki (Inferno Ultra)", rarity: "inferno" },
    { id: "c-2", name: "Ryszard Rybacki (Ikona Klubu)", rarity: "legendary" },
    { id: "c-3", name: "Ryszard Rybacki (Matchday Hero)", rarity: "rare" },
    { id: "c-4", name: "Mateusz Kowalczyk (Gold Master)", rarity: "rare" },
    { id: "c-5", name: "Aleksander Zieliński (Warrior)", rarity: "rare" },
    { id: "c-6", name: "Karta Bazowa 2026/27", rarity: "common" }
  ],
  userCards: [
    {
      id: "uc-1",
      card_definition_id: "c-1",
      quantity: 1,
      acquired_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      card_definition: {
        id: "c-1",
        name: "Ryszard Rybacki (INFERNO)",
        rarity: "inferno",
        player: { id: "demo-player-ryszard", display_name: "Ryszard Rybacki" }
      }
    },
    {
      id: "uc-2",
      card_definition_id: "c-2",
      quantity: 1,
      acquired_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      card_definition: {
        id: "c-2",
        name: "Ryszard Rybacki (IKONA)",
        rarity: "legendary",
        player: { id: "demo-player-ryszard", display_name: "Ryszard Rybacki" }
      }
    },
    {
      id: "uc-3",
      card_definition_id: "c-3",
      quantity: 2,
      acquired_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      card_definition: {
        id: "c-3",
        name: "Ryszard Rybacki (MATCHDAY)",
        rarity: "rare",
        player: { id: "demo-player-ryszard", display_name: "Ryszard Rybacki" }
      }
    }
  ],
  achievements: [
    {
      achievement_id: "ach-1",
      isUnlocked: true,
      unlockedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      achievement: {
        id: "ach-1",
        name: "Snajper Derbów",
        description: "Zdobycie 3 bramek w oficjalnym meczu ligowym DELTA."
      }
    },
    {
      achievement_id: "ach-2",
      isUnlocked: true,
      unlockedAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
      achievement: {
        id: "ach-2",
        name: "Mistrzowska Frekwencja",
        description: "100% obecności na treningach w bieżącym miesiącu."
      }
    },
    {
      achievement_id: "ach-3",
      isUnlocked: true,
      unlockedAt: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
      achievement: {
        id: "ach-3",
        name: "Inferno Legend",
        description: "Odblokowanie karty o statusie INFERNO w paczce."
      }
    }
  ],
  news: [
    {
      id: "news-1",
      title: "Wielki Finał Turnieju o Puchar DELTA 2026",
      summary: "W najbliższą sobotę na Stadionie Głównym odbędzie się finał rozgrywek młodzieżowych.",
      published_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      urgent: true
    },
    {
      id: "news-2",
      title: "Nowa kolekcja kart DELTA INFERNO w aplikacji",
      summary: "Sprawdź nowe karty 3D, animacje walkoutu oraz limitowane edycje zawodników.",
      published_at: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
      urgent: false
    }
  ],
  clubUpdates: [
    {
      id: "upd-1",
      title: "Zmiana godziny zbiórki na mecz wyjazdowy",
      summary: "Autokar wyjeżdża z klubu punktualnie o godz. 08:30 spod bramy nr 2.",
      published_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
      urgent: true
    }
  ]
};

const parentFixture: DashboardUI4AdapterInput = {
  ...elitePlayerFixture,
  profile: {
    id: "demo-parent-1",
    role: "parent",
    display_name: "Tomasz Rybacki (Rodzic)"
  },
  parentPlayerIds: ["demo-player-ryszard"]
};

const emptyFixture: DashboardUI4AdapterInput = {
  profile: {
    id: "demo-new-user",
    role: "player",
    display_name: "Nowy Zawodnik"
  },
  teamName: "Akademia DELTA — Grupa Naborowa",
  access: fullAccess,
  players: [],
  nextMatch: null,
  nextTraining: null,
  gameProfile: {
    currentXP: 0,
    seasonXP: 0,
    levelInfo: {
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: 100,
      progressPercent: 0,
      title: "Nowicjusz"
    },
    activityStreak: 0,
    maxStreak: 0,
    unopenedPacks: 0
  },
  allCards: [],
  userCards: [],
  achievements: [],
  news: [],
  clubUpdates: []
};

const restrictedFixture: DashboardUI4AdapterInput = {
  profile: {
    id: "demo-restricted-user",
    role: "user",
    display_name: "Gość / Ograniczony Dostęp"
  },
  access: {
    canViewCollection: false,
    canViewAchievements: false,
    canViewTeamShowcase: false,
    canViewClubCommunications: false
  }
};

type ScenarioKey = "elite" | "parent" | "empty" | "restricted";
type VariantKey = "elite41" | "sport" | "collector" | "hybrid" | "baseline";

function DashboardUI4PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialVariant = useMemo<VariantKey>(() => {
    const v = searchParams.get("variant");
    if (v === "elite41" || v === "sport" || v === "collector" || v === "hybrid" || v === "baseline") {
      return v;
    }
    return "elite41"; // Default to new DELTA ELITE 4.1
  }, [searchParams]);

  const initialScenario = useMemo<ScenarioKey>(() => {
    const s = searchParams.get("scenario");
    if (s === "elite" || s === "parent" || s === "empty" || s === "restricted") {
      return s;
    }
    return "elite";
  }, [searchParams]);

  const isClean = searchParams.get("clean") === "1";
  const [activeVariant, setActiveVariant] = useState<VariantKey>(initialVariant);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>(initialScenario);
  const [qaMode, setQaMode] = useState<boolean>(() => !isClean && searchParams.get("qa") === "1");

  // Keep URL query param synced smoothly
  const handleVariantChange = (variant: VariantKey) => {
    setActiveVariant(variant);
    const params = new URLSearchParams(window.location.search);
    params.set("variant", variant);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const activeInput = useMemo(() => {
    switch (activeScenario) {
      case "elite":
        return elitePlayerFixture;
      case "parent":
        return parentFixture;
      case "empty":
        return emptyFixture;
      case "restricted":
        return restrictedFixture;
    }
  }, [activeScenario]);

  const model = useMemo(() => {
    return createDashboardUI4Model(activeInput);
  }, [activeInput]);

  return (
    <div className="d4-root">
      {/* Stadium Ambient Background Lights */}
      <div className="d4-stadium-glow" />
      <div className="d4-stadium-mesh" />

      {/* Discreet QA Toggle Pill in Bottom Corner (Hidden in clean mode) */}
      {!qaMode && !isClean && (
        <button
          type="button"
          onClick={() => setQaMode(true)}
          className="e41-qa-toggle"
          title="Otwórz panel testowy QA"
        >
          ⚙ QA Panel
        </button>
      )}

      {/* Floating QA Mode & Variant Selector Bar (Only visible when QA mode is enabled) */}
      {qaMode && (
        <div className="sticky top-0 z-50 bg-slate-950/98 backdrop-blur-md border-b border-amber-500/50 px-3 py-2 shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col gap-2">
            {/* Top Row: Variant Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  TRYB DEMO — DELTA UI 4.0 HYBRID ELITE · PANEL QA:
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
                <button
                  type="button"
                  onClick={() => handleVariantChange("elite41")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    activeVariant === "elite41"
                      ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 font-black scale-105"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/60"
                  }`}
                >
                  <span>⭐ DELTA ELITE 4.1</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVariantChange("sport")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeVariant === "sport"
                      ? "bg-sky-500 text-slate-950 shadow-md"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/60"
                  }`}
                >
                  <span>Sport A</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVariantChange("collector")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeVariant === "collector"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/60"
                  }`}
                >
                  <span>Collector B</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVariantChange("hybrid")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeVariant === "hybrid"
                      ? "bg-sky-400 text-slate-950 shadow-md"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/60"
                  }`}
                >
                  <span>Hybrid C</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVariantChange("baseline")}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeVariant === "baseline"
                      ? "bg-slate-200 text-slate-950 shadow"
                      : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  <span>Bazowy</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQaMode(false)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold ml-1 cursor-pointer"
                  title="Ukryj panel QA"
                >
                  ✕ Zamknij
                </button>
              </div>
            </div>

            {/* Bottom Row: Data Scenario Selector */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 flex-wrap gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Scenariusz danych:
              </span>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveScenario("elite")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    activeScenario === "elite"
                      ? "bg-amber-400 text-slate-950 font-black"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Kapitan Elity
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("parent")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    activeScenario === "parent"
                      ? "bg-sky-400 text-slate-950 font-black"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Profil Rodzica
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("empty")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    activeScenario === "empty"
                      ? "bg-slate-300 text-slate-950 font-black"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Nowe konto
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScenario("restricted")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    activeScenario === "restricted"
                      ? "bg-red-400 text-slate-950 font-black"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Ograniczone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE VIEW */}
      {activeVariant === "elite41" && <DeltaElite41 model={model} />}

      {activeVariant === "sport" && <VariantSport model={model} />}

      {activeVariant === "collector" && <VariantCollector model={model} />}

      {activeVariant === "hybrid" && <VariantHybrid model={model} />}

      {activeVariant === "baseline" && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 relative z-10">
          <HybridPlayerHeader profile={model.profile} />
          <NextActionHero section={model.nextAction} />
          <PlayerProgressStrip section={model.progress} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <RecentCardsPanel section={model.recentCards} />
              <AlbumProgressPanel section={model.albumProgress} />
            </div>

            <div className="space-y-6">
              <RecentAchievementsPanel section={model.recentAchievements} />
              <TeamShowcaseGateway section={model.teamShowcase} />
              <ClubCommunicationsPanel section={model.clubCommunications} />
            </div>
          </div>

          <footer className="mt-12 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4">
            <span>DELTA HYBRID ELITE UI 4.0 (BAZOWY)</span>
            <span>·</span>
            <a href="/preview/pack-demo" className="text-sky-400 hover:underline font-bold">
              Centrum Paczek (Pack Demo)
            </a>
            <span>·</span>
            <a href="/preview/team-showcase-v3" className="text-amber-300 hover:underline font-bold">
              Team Showcase 3.0
            </a>
          </footer>
        </main>
      )}
    </div>
  );
}

export default function DashboardUI4PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
          <div className="text-sm font-bold text-amber-400 animate-pulse">
            Ładowanie DELTA ELITE 4.1...
          </div>
        </div>
      }
    >
      <DashboardUI4PreviewContent />
    </Suspense>
  );
}
