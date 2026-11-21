"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CinematicPackExperience from "@/components/pack-opening-v2/CinematicPackExperience";
import { preloadCinematicArtwork } from "@/components/pack-opening-v2/preloadCinematicArtwork";
import type {
  PackDefinition,
  PackOpeningResult,
  CardDefinition
} from "@/lib/cards/types";
import {
  Sparkles,
  Flame,
  Play,
  Shield,
  Layers,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Smartphone,
  Eye,
  Zap,
  Crown
} from "lucide-react";

interface DemoPackOption {
  id: string;
  badge: string;
  badgeColor: string;
  theme: "standard" | "matchday" | "legend" | "inferno";
  title: string;
  subtitle: string;
  description: string;
  cardsCount: number;
  highlightText: string;
  pack: PackDefinition;
  result: PackOpeningResult;
}

export default function PackDemoCenterPage() {
  const [activePack, setActivePack] = useState<PackDefinition | null>(null);
  const [activeMockResult, setActiveMockResult] = useState<PackOpeningResult | null>(null);
  const [launchNonce, setLaunchNonce] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [autoStart, setAutoStart] = useState<boolean>(false);

  useEffect(() => {
    preloadCinematicArtwork();
    if (typeof document !== "undefined") {
      document.title = "DELTA INFERNO — Centrum Demonstracyjne Paczek (DEMO)";
    }
  }, []);

  // Standard safe mock player
  const mockPlayer = {
    id: "p_ryszard",
    display_name: "RYSZARD RYBACKI",
    shirt_number: "7",
    position: "NAP",
    photo_path: "/assets/players/ryszard-rybacki.png"
  };

  // Safe factory for synthetic preview cards (zero DB writes)
  const createDemoCard = (
    id: string,
    type: string,
    rarity: string,
    name: string,
    withRyszardPhoto = false,
    shirtNumber = "1"
  ): CardDefinition => {
    const playerObj = withRyszardPhoto
      ? mockPlayer
      : {
          id: `p_${id}`,
          display_name: name.replace(/\s*\([^)]+\)\s*/g, "").trim(),
          shirt_number: shirtNumber,
          position: "POM",
          photo_path: null
        };

    return {
      id: `demo-${id}`,
      player_id: playerObj.id,
      season: "2026/27",
      card_type: type,
      card_name: name,
      title: type.toUpperCase(),
      rarity: rarity as any,
      artwork_url: !withRyszardPhoto
        ? null
        : type === "inferno"
        ? "/assets/players/ryszard-inferno.png"
        : type === "legend"
        ? "/assets/players/ryszard-legend.png"
        : type === "gold_master" || type === "gold"
        ? "/assets/players/ryszard-gold.png"
        : "/assets/players/ryszard-rybacki.png",
      artwork_pose: "standard",
      frame_theme: type,
      card_number: Number(shirtNumber) || 1,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Karta demonstracyjna DELTA (DEMO — brak zapisu).",
      lore: null,
      match_id: null,
      special_event_id: null,
      player: playerObj
    };
  };

  // 4 Canonical Demonstrations: STANDARD, MATCHDAY, LEGEND, INFERNO
  const demoPacks: DemoPackOption[] = [
    {
      id: "demo_standard",
      badge: "📦 BASE",
      badgeColor: "border-slate-500/40 text-slate-300 bg-slate-800/40",
      theme: "standard",
      title: "Paczka Standardowa",
      subtitle: "3 Karty • Szybkie Odkrywanie",
      description: "Podstawowy zestaw kart akademii DELTA. Płynne, bezpośrednie przejście do kart bez walkoutu stadionowego.",
      cardsCount: 3,
      highlightText: "Brak walkoutu — natychmiastowe odkrycie kart",
      pack: {
        id: "demo_standard_pack",
        name: "Paczka Standardowa",
        description: "Podstawowy pakiet kart akademii DELTA.",
        cards_count: 3,
        drop_rates: { common: 80, rare: 20, epic: 0, legendary: 0, inferno: 0 },
        min_rarity: "common",
        theme: "standard",
        is_active: true
      },
      result: {
        cards: [
          { card: createDemoCard("std_1", "base", "common", "RYSZARD RYBACKI", true, "7"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("std_2", "base", "common", "MATEUSZ KOWALCZYK", false, "10"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("std_3", "base", "common", "ALEKSANDER ZIELIŃSKI", false, "4"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 0,
        new_points_balance: 0,
        pack_type_id: "demo_standard_pack",
        remaining_unopened_packs_count: 0,
        enable_3d_walkout: false
      }
    },
    {
      id: "demo_matchday",
      badge: "⚡ MATCHDAY",
      badgeColor: "border-sky-500/40 text-sky-300 bg-sky-950/40",
      theme: "matchday",
      title: "Matchday Booster",
      subtitle: "4 Karty • Ligowy Walkout",
      description: "Zestaw 4 kart meczowych. Bohaterowie meczowi ligi DELTA z dynamiczną prezentacją karty meczowej.",
      cardsCount: 4,
      highlightText: "Karta Matchday Hero + Training Warrior",
      pack: {
        id: "demo_matchday_pack",
        name: "Matchday Booster",
        description: "Paczka ligowych bohaterów meczowych (4 karty).",
        cards_count: 4,
        drop_rates: { common: 40, rare: 50, epic: 10, legendary: 0, inferno: 0 },
        min_rarity: "rare",
        theme: "matchday",
        is_active: true
      },
      result: {
        cards: [
          { card: createDemoCard("m_1", "matchday", "rare", "MATEUSZ KOWALCZYK (MATCHDAY)", false, "10"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("m_2", "training_warrior", "rare", "ALEKSANDER ZIELIŃSKI (WARRIOR)", false, "4"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("m_3", "base", "common", "BARTOSZ WIŚNIEWSKI", false, "19"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("m_4", "base", "common", "JAKUB KAMIŃSKI", false, "9"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 0,
        new_points_balance: 0,
        pack_type_id: "demo_matchday_pack",
        remaining_unopened_packs_count: 0,
        enable_3d_walkout: true
      }
    },
    {
      id: "demo_legend",
      badge: "👑 DELTA ICON",
      badgeColor: "border-amber-500/40 text-amber-300 bg-amber-950/40",
      theme: "legend",
      title: "Legend Booster",
      subtitle: "5 Kart • Filmowy Walkout Ikony",
      description: "Złota paczka 5 kart z gwarantowaną Ikoną Klubu. Zawiera pełny filmowy walkout stadionowy z oprawą wideo i racami.",
      cardsCount: 5,
      highlightText: "Filmowy stadion LEGEND + fanfary",
      pack: {
        id: "demo_legend_pack",
        name: "Legend Booster",
        description: "Gwarantowana karta ikony klubu DELTA z dynamicznym walkoutem.",
        cards_count: 5,
        drop_rates: { common: 20, rare: 30, epic: 30, legendary: 20, inferno: 0 },
        min_rarity: "legendary",
        theme: "legend",
        is_active: true
      },
      result: {
        cards: [
          { card: createDemoCard("leg_1", "legend", "legendary", "RYSZARD RYBACKI (IKONA)", true, "7"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("leg_2", "matchday", "rare", "TOMASZ LEWANDOWSKI", false, "14"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("leg_3", "training_warrior", "rare", "FILIP SZYMAŃSKI", false, "22"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("leg_4", "base", "common", "BARTOSZ WIŚNIEWSKI", false, "19"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("leg_5", "base", "common", "JAKUB KAMIŃSKI", false, "9"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 0,
        new_points_balance: 0,
        pack_type_id: "demo_legend_pack",
        remaining_unopened_packs_count: 0,
        enable_3d_walkout: true
      }
    },
    {
      id: "demo_inferno",
      badge: "🔥 INFERNO ULTRA",
      badgeColor: "border-red-500/40 text-red-300 bg-red-950/40",
      theme: "inferno",
      title: "Inferno Booster Ultra",
      subtitle: "5 Kart • Płomienny Walkout 3D",
      description: "Maksymalny poziom emocji DELTA INFERNO. Kinowy wideo-walkout stadionowy z płomieniami, dymem i kartą Inferno Ultra.",
      cardsCount: 5,
      highlightText: "Płomienny stadion INFERNO + karta Inferno Ultra",
      pack: {
        id: "demo_inferno_pack",
        name: "Inferno Booster Ultra",
        description: "Płomienna paczka DELTA INFERNO z pełnym kinowym walkoutem.",
        cards_count: 5,
        drop_rates: { common: 10, rare: 30, epic: 30, legendary: 20, inferno: 10 },
        min_rarity: "inferno",
        theme: "inferno",
        is_active: true
      },
      result: {
        cards: [
          { card: createDemoCard("inf_1", "inferno", "inferno", "RYSZARD RYBACKI (INFERNO)", true, "7"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("inf_2", "gold_master", "epic", "MATEUSZ KOWALCZYK", false, "10"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("inf_3", "matchday", "rare", "ALEKSANDER ZIELIŃSKI", false, "4"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("inf_4", "base", "common", "BARTOSZ WIŚNIEWSKI", false, "19"), is_duplicate: false, duplicate_points: 0 },
          { card: createDemoCard("inf_5", "base", "common", "JAKUB KAMIŃSKI", false, "9"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 0,
        new_points_balance: 0,
        pack_type_id: "demo_inferno_pack",
        remaining_unopened_packs_count: 0,
        enable_3d_walkout: true
      }
    }
  ];

  const handleLaunchPack = (item: DemoPackOption) => {
    setActivePack(item.pack);
    setActiveMockResult(item.result);
    setLaunchNonce((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-[#03060d] text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* 1. Wyraźny Górny Baner Trybu Demonstracyjnego */}
      <div
        data-testid="pack-demo-top-banner"
        className="w-full bg-gradient-to-r from-amber-500/15 via-red-500/15 to-amber-500/15 border-b border-amber-500/30 text-amber-300 py-2.5 px-4 text-center text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shrink-0 z-40"
      >
        <AlertTriangle size={17} className="text-amber-400 shrink-0" />
        <span>TRYB DEMO — karty, XP i DP nie są przyznawane</span>
      </div>

      {/* 2. Główny Kontener */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
        {/* Nawigacja Powrotu i Tytuł */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Link
                href="/collection"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors border border-white/10"
              >
                <ArrowLeft size={14} />
                <span>Wróć do kolekcji</span>
              </Link>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Preview Lab • V2
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-red-500">
              Centrum Demonstracyjne Paczek
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Przetestuj pełne sekwencje rozdarcia saszetki, animacje WebGL, filmowe walkouty stadionowe i prezentację kart.
            </p>
          </div>

          {/* Opcje Dostępności i Sterowania */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition-colors select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4"
              />
              <span className="font-medium">Zredukowany ruch</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition-colors select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4"
              />
              <span className="font-medium">Auto-start</span>
            </label>
          </div>
        </header>

        {/* Siatka 4 Zestawów Demonstracyjnych */}
        <section aria-label="Wybór paczki demonstracyjnej" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              <span>Wybierz paczkę do demonstracji (4 motywy)</span>
            </h2>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Kliknij paczkę aby rozpocząć
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {demoPacks.map((item) => {
              const packImg = `/media/walkouts/delta-${item.theme}-pack-cutout.webp`;

              return (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between gap-5 group hover:shadow-xl hover:shadow-black/50"
                >
                  <div className="space-y-3.5">
                    {/* Header Pigułka + Licznik */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border tracking-wider ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-amber-300/80 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        {item.cardsCount} KART
                      </span>
                    </div>

                    {/* Prezentacja Saszetki i Tytuł */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                        <img
                          src={packImg}
                          alt={item.title}
                          className="w-full h-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.6))"
                          loading="eager"
                        />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-black text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs font-semibold text-amber-400/90">
                          {item.subtitle}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Wyróżnik */}
                    <div className="text-[11px] text-slate-400/90 flex items-center gap-1.5 bg-black/30 p-2 rounded-lg border border-white/5">
                      <Sparkles size={13} className="text-amber-400 shrink-0" />
                      <span className="truncate">{item.highlightText}</span>
                    </div>
                  </div>

                  {/* Przycisk Uruchomienia */}
                  <button
                    type="button"
                    onClick={() => handleLaunchPack(item)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-red-600 to-amber-600 hover:from-amber-400 hover:via-red-500 hover:to-amber-500 font-black text-xs uppercase tracking-wider text-black shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer min-h-[44px]"
                  >
                    <Play size={15} className="fill-black" />
                    <span>Uruchom demonstrację ({item.theme.toUpperCase()})</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Informacje o Bezpieczeństwie i Zgodności */}
        <footer className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
            <Shield size={14} />
            <span>Gwarancja Bezpieczeństwa Trybu DEMO</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-slate-400 text-[11px] leading-relaxed">
            <li>Brak mutacji bazy danych: otwarcie paczki nie wysyła żądań do Supabase ani do endpointu <code className="text-amber-300">/api/cards/open-pack</code>.</li>
            <li>Brak zużycia paczek: Twoje prawdziwe nieotwarte paczki i punkty DP/XP pozostają nienaruszone.</li>
            <li>Wielokrotne odtwarzanie: po zakończeniu animacji możesz użyć przycisku „Otwórz ponownie” lub wrócić do wyboru paczek.</li>
            <li>Trasa jest aktywna wyłącznie w środowiskach deweloperskich i podglądowych Vercel Preview (blokada 404 na domenie produkcyjnej).</li>
          </ul>
        </footer>
      </main>

      {/* 3. Pełnoekranowy Modal Doświadczenia Kinowego (CinematicPackExperience) */}
      {activePack && activeMockResult && (
        <>
          {/* Pływający baner DEMO widoczny na wierzchu podczas całego doświadczenia */}
          <div
            data-testid="demo-floating-banner"
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[100000] pointer-events-none px-4 py-1.5 rounded-full bg-black/90 border border-amber-500/60 text-amber-300 text-[10px] sm:text-xs font-mono font-bold shadow-2xl backdrop-blur flex items-center gap-2 uppercase tracking-wider text-center max-w-[92vw]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">TRYB DEMO — karty, XP i DP nie są przyznawane</span>
          </div>

          <CinematicPackExperience
            enableStadiumFilm={true}
            pack={activePack}
            mockResult={activeMockResult}
            sessionKey={launchNonce}
            reducedMotion={reducedMotion}
            autoStart={autoStart}
            onClose={() => {
              setActivePack(null);
              setActiveMockResult(null);
            }}
            onOpenAnother={() => {
              // Re-run demo pack seamlessly with fresh session key
              setLaunchNonce((n) => n + 1);
            }}
            unopenedCount={0}
          />
        </>
      )}
    </div>
  );
}
