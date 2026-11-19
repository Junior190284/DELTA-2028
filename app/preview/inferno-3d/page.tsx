"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  InfernoPackCanvasHandle,
  CardCount,
} from "@/components/pack-opening-v2/InfernoPackCanvas";
import { mapPackResultToInferno3D } from "@/components/pack-opening-v2/infernoCardBridge";
import type { PackOpeningResult } from "@/lib/cards/types";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Eye,
} from "lucide-react";

// Dynamic client-only import for Three.js canvas
const InfernoPackCanvas = dynamic(
  () => import("@/components/pack-opening-v2/InfernoPackCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070609] text-amber-500 font-mono text-xs p-6 text-center">
        <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <span className="font-bold tracking-wide">ŁADOWANIE SILNIKA 3D INFERNO...</span>
        <span className="text-zinc-500 text-[11px] mt-1">Przygotowywanie modelu GLB i tekstur WebGL</span>
      </div>
    ),
  }
);

// Synthetic, leak-safe card decks for mobile preview
const PREVIEW_PACK_DEFINITIONS: Record<CardCount, PackOpeningResult> = {
  3: {
    cards: [
      {
        card: {
          id: "preview-c1",
          player_id: "p-01",
          season: "2026/27",
          card_type: "base",
          card_name: "Jan Kowalski",
          title: "Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 4,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: "Solidny filar formacji defensywnej.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-01",
            display_name: "Jan Kowalski",
            shirt_number: "4",
            position: "CB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c2",
          player_id: "p-02",
          season: "2026/27",
          card_type: "matchday",
          card_name: "Piotr Nowak",
          title: "Rozgrywający",
          rarity: "rare",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "matchday",
          card_number: 8,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: "Kreator gry w środku pola.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-02",
            display_name: "Piotr Nowak",
            shirt_number: "8",
            position: "CM",
          },
        },
        is_duplicate: true,
        duplicate_points: 50,
      },
      {
        card: {
          id: "preview-c3",
          player_id: "p-03",
          season: "2026/27",
          card_type: "inferno",
          card_name: "Robert Lewandowski",
          title: "Król Strzelców",
          rarity: "inferno",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "inferno",
          card_number: 9,
          is_active: true,
          is_limited: true,
          edition_size: 100,
          description: "Niepowstrzymany snajper DELTA INFERNO.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-03",
            display_name: "Robert Lewandowski",
            shirt_number: "9",
            position: "ST",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
    ],
    pack_type_id: "inferno-phoenix-preview",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
  4: {
    cards: [
      {
        card: {
          id: "preview-c1",
          player_id: "p-01",
          season: "2026/27",
          card_type: "base",
          card_name: "Jan Kowalski",
          title: "Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 4,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-01",
            display_name: "Jan Kowalski",
            shirt_number: "4",
            position: "CB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c2",
          player_id: "p-04",
          season: "2026/27",
          card_type: "base",
          card_name: "Tomasz Adamski",
          title: "Boczny Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 2,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-04",
            display_name: "Tomasz Adamski",
            shirt_number: "2",
            position: "LB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c3",
          player_id: "p-02",
          season: "2026/27",
          card_type: "matchday",
          card_name: "Piotr Nowak",
          title: "Rozgrywający",
          rarity: "rare",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "matchday",
          card_number: 8,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-02",
            display_name: "Piotr Nowak",
            shirt_number: "8",
            position: "CM",
          },
        },
        is_duplicate: true,
        duplicate_points: 50,
      },
      {
        card: {
          id: "preview-c4",
          player_id: "p-03",
          season: "2026/27",
          card_type: "inferno",
          card_name: "Robert Lewandowski",
          title: "Król Strzelców",
          rarity: "inferno",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "inferno",
          card_number: 9,
          is_active: true,
          is_limited: true,
          edition_size: 100,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-03",
            display_name: "Robert Lewandowski",
            shirt_number: "9",
            position: "ST",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
    ],
    pack_type_id: "inferno-phoenix-preview",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
  5: {
    cards: [
      {
        card: {
          id: "preview-c1",
          player_id: "p-01",
          season: "2026/27",
          card_type: "base",
          card_name: "Jan Kowalski",
          title: "Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 4,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-01",
            display_name: "Jan Kowalski",
            shirt_number: "4",
            position: "CB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c2",
          player_id: "p-04",
          season: "2026/27",
          card_type: "base",
          card_name: "Tomasz Adamski",
          title: "Boczny Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 2,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-04",
            display_name: "Tomasz Adamski",
            shirt_number: "2",
            position: "LB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c3",
          player_id: "p-02",
          season: "2026/27",
          card_type: "matchday",
          card_name: "Piotr Nowak",
          title: "Rozgrywający",
          rarity: "rare",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "matchday",
          card_number: 8,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-02",
            display_name: "Piotr Nowak",
            shirt_number: "8",
            position: "CM",
          },
        },
        is_duplicate: true,
        duplicate_points: 50,
      },
      {
        card: {
          id: "preview-c4",
          player_id: "p-06",
          season: "2026/27",
          card_type: "finals",
          card_name: "Piotr Zieliński",
          title: "Magik Środka Pola",
          rarity: "legendary",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "gold",
          card_number: 10,
          is_active: true,
          is_limited: true,
          edition_size: 200,
          description: "Wizjonerskie zagrania w najważniejszych momentach.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-06",
            display_name: "Piotr Zieliński",
            shirt_number: "10",
            position: "ŚPO",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c5",
          player_id: "p-03",
          season: "2026/27",
          card_type: "inferno",
          card_name: "Robert Lewandowski",
          title: "PHOENIX PRIME",
          rarity: "inferno",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "inferno",
          card_number: 9,
          is_active: true,
          is_limited: true,
          edition_size: 50,
          description: "Dominator pola karnego DELTA INFERNO.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-03",
            display_name: "Robert Lewandowski",
            shirt_number: "9",
            position: "NAP",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
    ],
    pack_type_id: "inferno-phoenix-preview",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
  6: {
    cards: [
      {
        card: {
          id: "preview-c1",
          player_id: "p-01",
          season: "2026/27",
          card_type: "base",
          card_name: "Jan Kowalski",
          title: "Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 4,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-01",
            display_name: "Jan Kowalski",
            shirt_number: "4",
            position: "CB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c2",
          player_id: "p-04",
          season: "2026/27",
          card_type: "base",
          card_name: "Tomasz Adamski",
          title: "Boczny Obrońca",
          rarity: "common",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: null,
          card_number: 2,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-04",
            display_name: "Tomasz Adamski",
            shirt_number: "2",
            position: "LB",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c3",
          player_id: "p-02",
          season: "2026/27",
          card_type: "matchday",
          card_name: "Piotr Nowak",
          title: "Rozgrywający",
          rarity: "rare",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "matchday",
          card_number: 8,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-02",
            display_name: "Piotr Nowak",
            shirt_number: "8",
            position: "CM",
          },
        },
        is_duplicate: true,
        duplicate_points: 50,
      },
      {
        card: {
          id: "preview-c4",
          player_id: "p-07",
          season: "2026/27",
          card_type: "matchday",
          card_name: "Arkadiusz Milik",
          title: "Egzekutor",
          rarity: "epic",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "matchday",
          card_number: 99,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: null,
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-07",
            display_name: "Arkadiusz Milik",
            shirt_number: "99",
            position: "NAP",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c5",
          player_id: "p-06",
          season: "2026/27",
          card_type: "finals",
          card_name: "Piotr Zieliński",
          title: "Magik Środka Pola",
          rarity: "legendary",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "gold",
          card_number: 10,
          is_active: true,
          is_limited: true,
          edition_size: 200,
          description: "Wizjonerskie zagrania w najważniejszych momentach.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-06",
            display_name: "Piotr Zieliński",
            shirt_number: "10",
            position: "ŚPO",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "preview-c6",
          player_id: "p-08",
          season: "2026/27",
          card_type: "legend",
          card_name: "Kazimierz Deyna",
          title: "DELTA ICON",
          rarity: "inferno",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "legend",
          card_number: 10,
          is_active: true,
          is_limited: true,
          edition_size: 25,
          description: "Absolutna ikona polskiego futbolu.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-08",
            display_name: "Kazimierz Deyna",
            shirt_number: "10",
            position: "POM",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
    ],
    pack_type_id: "inferno-phoenix-preview",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
};

export default function Inferno3DPreviewMobilePage() {
  const canvasRef = useRef<InfernoPackCanvasHandle | null>(null);

  const [cardCount, setCardCount] = useState<CardCount>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>("[1/7] Inicjalizacja");
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [hasWebGlError, setHasWebGlError] = useState<boolean>(false);

  // Map presentation cards from mock result
  const activeMockPack = useMemo(
    () => PREVIEW_PACK_DEFINITIONS[cardCount],
    [cardCount]
  );

  const bridgePresentation = useMemo(() => {
    return mapPackResultToInferno3D(activeMockPack);
  }, [activeMockPack]);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  const handlePhaseChange = useCallback((phase: string) => {
    setCurrentPhase(phase);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!canvasRef.current) return;
    if (isPlaying) {
      canvasRef.current.pause();
      setIsPlaying(false);
    } else {
      canvasRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleRestart = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.restart();
    setIsPlaying(true);
  }, []);

  const handleSkip = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.skip();
    setIsPlaying(false);
  }, []);

  const handleCardCountChange = useCallback((n: CardCount) => {
    setCardCount(n);
    if (canvasRef.current) {
      canvasRef.current.setCardCount(n);
    }
  }, []);

  const handleWebGlError = useCallback((err: string) => {
    console.error("[Preview] WebGL Error:", err);
    setHasWebGlError(true);
  }, []);

  return (
    <div
      className="flex flex-col w-full h-[100dvh] bg-[#070609] text-zinc-100 overflow-hidden font-sans select-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* 1. Header Mobile Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <img
            src="/teamlogos/gm.png"
            alt="DELTA"
            className="w-7 h-7 object-contain drop-shadow"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                PREVIEW B2C.4
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-700/30">
                0 API
              </span>
            </div>
            <h1 className="text-sm font-black text-white tracking-wide leading-none mt-0.5">
              DELTA INFERNO 3D
            </h1>
          </div>
        </div>

        {/* Hero Card Indicator */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-full text-[11px] font-mono text-zinc-300">
          <Sparkles size={12} className="text-amber-400 shrink-0" />
          <span className="truncate max-w-[110px]">{bridgePresentation.heroCard.surname}</span>
        </div>
      </header>

      {/* 2. Main 3D Stage (Fluid Responsive Area) */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#050406]">
        {hasWebGlError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400 max-w-sm">
            <Smartphone size={36} className="text-amber-500 mb-3" />
            <h2 className="text-base font-bold text-white mb-1">
              Brak sprzętowego wsparcia WebGL
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Twoja przeglądarka lub urządzenie nie obsługuje WebGL. Użyj silnika awaryjnego CSS 3D.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-lg"
            >
              Odśwież stronę
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <InfernoPackCanvas
              ref={canvasRef}
              cards={bridgePresentation.cards}
              heroCardId={bridgePresentation.heroCard.id}
              cardCount={cardCount}
              autoPlay={true}
              reducedMotion={reducedMotion}
              onTimeUpdate={handleTimeUpdate}
              onPhaseChange={handlePhaseChange}
              onError={handleWebGlError}
              showDevHud={false}
              className="w-full h-full"
            />

            {/* Live Phase Indicator Pill (Floating Top Center) */}
            <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none px-4 z-10">
              <div className="bg-black/80 backdrop-blur border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[11px] font-mono shadow-lg max-w-full truncate text-center">
                {currentPhase}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Mobile Control Deck (Finger-friendly, >=48px Touch Targets) */}
      <footer
        className="px-4 pt-3 pb-3 bg-zinc-950/95 border-t border-zinc-850 backdrop-blur z-20 shrink-0 flex flex-col gap-2.5"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        {/* Progress & Time */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100"
              style={{ width: `${(currentTime / 10.0) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-amber-400 shrink-0">
            {currentTime.toFixed(1)}s / 10s
          </span>
        </div>

        {/* Primary Action Buttons (Touch Targets >= 48px) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={handlePlayPause}
            className="h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-black font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
          >
            {isPlaying ? (
              <>
                <Pause size={16} fill="currentColor" />
                <span>PAUZA</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span>ODTWÓRZ</span>
              </>
            )}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="h-12 bg-zinc-850 hover:bg-zinc-800 active:scale-[0.98] text-zinc-200 font-bold text-xs rounded-xl border border-zinc-750 flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw size={15} />
            <span>OD NOWA</span>
          </button>

          {/* Skip directly to Hero Reveal */}
          <button
            type="button"
            onClick={handleSkip}
            className="h-12 bg-orange-950/60 hover:bg-orange-900/60 active:scale-[0.98] text-orange-300 font-bold text-xs rounded-xl border border-orange-700/50 flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <FastForward size={16} />
            <span>POMIŃ</span>
          </button>
        </div>

        {/* Secondary Bar: Card Count Selectors + Settings */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-900/80">
          {/* Card Count Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-400 font-medium mr-1">Karty:</span>
            {([3, 4, 5, 6] as CardCount[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleCardCountChange(n)}
                className={`min-w-[34px] h-8 px-2 rounded-lg font-bold text-xs transition ${
                  cardCount === n
                    ? "bg-amber-500 text-black shadow-sm"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Reduced-Motion Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-400">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="accent-amber-500 w-3.5 h-3.5 rounded"
            />
            <span>Mniej ruchu</span>
          </label>
        </div>
      </footer>
    </div>
  );
}
