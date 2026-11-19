"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  InfernoPackCanvasHandle,
  CardCount,
} from "@/components/pack-opening-v2/InfernoPackCanvas";
import { mapPackResultToInferno3D } from "@/components/pack-opening-v2/infernoCardBridge";
import type { PackOpeningResult, PackDefinition } from "@/lib/cards/types";
import CinematicPackExperience from "@/components/pack-opening-v2/CinematicPackExperience";

// Dynamic import for standalone canvas with loading state
const InfernoPackCanvas = dynamic(
  () => import("@/components/pack-opening-v2/InfernoPackCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0c0b0e] text-amber-500 font-mono text-sm">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-3" />
        Ładowanie modułu Three.js (dynamic import)...
      </div>
    ),
  }
);

type ViewportPreset = "responsive" | "320" | "360" | "390" | "768" | "1440";
type DataSourceMode = "real_cards" | "demo_proto";

// Deterministic synthetic test packs simulating realistic DELTA card draws
const MOCK_PACK_DEFINITIONS: Record<CardCount, PackOpeningResult> = {
  3: {
    cards: [
      {
        card: {
          id: "syn-c1",
          player_id: "p-01",
          season: "2026/27",
          card_type: "base",
          card_name: "Jan Kowalski",
          title: "Obrońca",
          rarity: "common",
          artwork_url: null, // triggers silhouette fallback
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
            photo_path: null,
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
      {
        card: {
          id: "syn-c2",
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
            photo_path: null,
          },
        },
        is_duplicate: true,
        duplicate_points: 50,
      },
      {
        card: {
          id: "syn-c3",
          player_id: "p-03",
          season: "2026/27",
          card_type: "inferno",
          card_name: "Robert Lewandowski",
          title: "Król Strzelców",
          rarity: "inferno",
          artwork_url: "/assets/cards/phoenix_prime.png",
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
            photo_path: null,
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
    ],
    pack_type_id: "inferno-phoenix-pack-dev",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
  4: {
    cards: [
      {
        card: {
          id: "syn-c1",
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
          id: "syn-c2",
          player_id: "p-02",
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
          id: "syn-c3",
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
          id: "syn-c4",
          player_id: "p-05",
          season: "2026/27",
          card_type: "finals",
          card_name: "Wojciech Szczęsny",
          title: "Ściana Bramki",
          rarity: "legendary",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "gold",
          card_number: 1,
          is_active: true,
          is_limited: true,
          edition_size: 250,
          description: "Legendarna interwencja w meczu finałowym.",
          lore: null,
          match_id: null,
          special_event_id: null,
          player: {
            id: "p-05",
            display_name: "Wojciech Szczęsny",
            shirt_number: "1",
            position: "BR",
          },
        },
        is_duplicate: false,
        duplicate_points: 0,
      },
    ],
    pack_type_id: "inferno-phoenix-pack-dev",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
  5: {
    cards: [
      {
        card: {
          id: "syn-c1",
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
          id: "syn-c2",
          player_id: "p-04",
          season: "2026/27",
          card_type: "training_warrior",
          card_name: "Tomasz Adamski",
          title: "Wojownik Treningu",
          rarity: "rare",
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
          id: "syn-c3",
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
          id: "syn-c4",
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
          id: "syn-c5",
          player_id: "p-03",
          season: "2026/27",
          card_type: "inferno",
          card_name: "Robert Lewandowski",
          title: "PHOENIX PRIME",
          rarity: "inferno",
          artwork_url: "/assets/cards/phoenix_prime.png",
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
    pack_type_id: "inferno-phoenix-pack-dev",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
  6: {
    cards: [
      {
        card: {
          id: "syn-c1",
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
          id: "syn-c2",
          player_id: "p-04",
          season: "2026/27",
          card_type: "training_warrior",
          card_name: "Tomasz Adamski",
          title: "Wojownik Treningu",
          rarity: "rare",
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
          id: "syn-c3",
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
          id: "syn-c4",
          player_id: "p-07",
          season: "2026/27",
          card_type: "hat_trick_hero",
          card_name: "Arkadiusz Milik",
          title: "Hat-Trick Hero",
          rarity: "epic",
          artwork_url: null,
          artwork_pose: null,
          frame_theme: "matchday",
          card_number: 99,
          is_active: true,
          is_limited: false,
          edition_size: null,
          description: "Trzy bramki w dramatycznej końcówce.",
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
          id: "syn-c5",
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
          id: "syn-c6",
          player_id: "p-08",
          season: "2026/27",
          card_type: "legend",
          card_name: "Kazimierz Deyna",
          title: "DELTA ICON",
          rarity: "inferno",
          artwork_url: "/assets/cards/phoenix_prime.png",
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
    pack_type_id: "inferno-phoenix-pack-dev",
    total_delta_points_earned: 50,
    new_points_balance: 1450,
  },
};

const DEV_PACK_DEFINITION: PackDefinition = {
  id: "inferno-phoenix-pack-dev",
  name: "INFERNO PHOENIX PACK",
  description: "Ekskluzywna paczka z szansą na karty DELTA INFERNO.",
  cards_count: 5,
  drop_rates: { common: 0.5, rare: 0.3, epic: 0.15, legendary: 0.04, inferno: 0.01 },
  min_rarity: "rare",
  theme: "inferno",
  image_url: "/assets/packs/pack-inferno.jpg",
  is_active: true,
};

export default function InfernoPackDevPage() {
  const canvasRef = useRef<InfernoPackCanvasHandle | null>(null);

  const [cardCount, setCardCount] = useState<CardCount>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>("[1/7] Inicjalizacja");
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>("responsive");
  const [dataSource, setDataSource] = useState<DataSourceMode>("real_cards");

  // Experience modal test state
  const [isExperienceOpen, setIsExperienceOpen] = useState<boolean>(false);
  const [enable3DFlag, setEnable3DFlag] = useState<boolean>(true);

  // Compute presentation from mock result via real bridge
  const activeMockPack = useMemo(
    () => MOCK_PACK_DEFINITIONS[cardCount],
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

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (canvasRef.current) {
      canvasRef.current.seek(val);
    }
  }, []);

  const handleCardCountChange = useCallback((n: CardCount) => {
    setCardCount(n);
    if (canvasRef.current) {
      canvasRef.current.setCardCount(n);
    }
  }, []);

  // Compute container style based on viewport preset
  const getContainerStyle = () => {
    switch (viewportPreset) {
      case "320":
        return { width: "320px", height: "568px" };
      case "360":
        return { width: "360px", height: "640px" };
      case "390":
        return { width: "390px", height: "844px" };
      case "768":
        return { width: "768px", height: "600px" };
      case "1440":
        return { width: "1280px", height: "720px" };
      case "responsive":
      default:
        return { width: "100%", height: "100%" };
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#070608] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Header bar */}
      <header className="flex items-center justify-between px-5 py-3 bg-zinc-950/80 border-b border-zinc-800/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          <h1 className="text-sm font-bold tracking-wider text-amber-400">
            DELTA INFERNO 3.0 • CONTROLLED THREE.JS PACK ENGINE (B2C.2)
          </h1>
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
            Real Card Data Bridge
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
            <input
              data-testid="toggle-3d-flag-main"
              type="checkbox"
              checked={enable3DFlag}
              onChange={(e) => setEnable3DFlag(e.target.checked)}
              className="accent-amber-500"
            />
            <span className="text-[11px]">3D Engine: {enable3DFlag ? "ON" : "OFF (Fallback)"}</span>
          </label>

          <button
            onClick={() => setIsExperienceOpen(true)}
            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs rounded transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            ✦ Otwórz Cinematic Experience
          </button>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400 font-semibold">● 0 Zapytań API</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Hero: {bridgePresentation.heroCard.surname}</span>
        </div>
      </header>

      {/* Main 3D Canvas Area */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden p-2 bg-[#050406]">
        <div
          id="pack-canvas-wrapper"
          style={getContainerStyle()}
          className="relative transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-zinc-800/60 bg-[#0c0b0e]"
        >
          <InfernoPackCanvas
            ref={canvasRef}
            cards={dataSource === "real_cards" ? bridgePresentation.cards : undefined}
            heroCardId={dataSource === "real_cards" ? bridgePresentation.heroCard.id : undefined}
            cardCount={cardCount}
            autoPlay={true}
            reducedMotion={reducedMotion}
            onTimeUpdate={handleTimeUpdate}
            onPhaseChange={handlePhaseChange}
            showDevHud={true}
          />
        </div>
      </main>

      {/* Control Deck */}
      <footer className="px-6 py-4 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur z-20 flex flex-col gap-3">
        {/* Scrubber slider and time display */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition flex items-center gap-1.5 shadow"
          >
            {isPlaying ? "❚❚ Pauza" : "▶ Odtwórz"}
          </button>

          <button
            onClick={handleRestart}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded border border-zinc-700 transition"
          >
            ↺ Restart
          </button>

          <button
            onClick={handleSkip}
            className="px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 text-xs font-semibold rounded border border-amber-700/40 transition"
          >
            ⏭ Pomiń (Hero)
          </button>

          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="10"
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-mono text-xs text-amber-400 w-24 text-right">
              {currentTime.toFixed(2)}s / 10.0s
            </span>
          </div>

          <div className="text-xs font-mono text-zinc-300 bg-zinc-900 px-3 py-1 rounded border border-zinc-800">
            {currentPhase}
          </div>
        </div>

        {/* Configurations: Card Count, Data Source, Viewport, Reduced Motion */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-900 flex-wrap gap-2">
          {/* Card Count presets */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold">Liczba kart (N):</span>
            {([3, 4, 5, 6] as CardCount[]).map((n) => (
              <button
                key={n}
                onClick={() => handleCardCountChange(n)}
                className={`px-2 py-0.5 rounded font-mono font-bold transition ${
                  cardCount === n
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                N={n}
              </button>
            ))}
          </div>

          {/* Data Source toggle */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold">Dane kart:</span>
            <button
              onClick={() => setDataSource("real_cards")}
              className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold transition ${
                dataSource === "real_cards"
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Real Bridge Data
            </button>
            <button
              onClick={() => setDataSource("demo_proto")}
              className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold transition ${
                dataSource === "demo_proto"
                  ? "bg-amber-500 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Demo Prototype (B2B.2)
            </button>
          </div>

          {/* Viewport simulations */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-semibold">Ekran:</span>
            {(
              [
                { id: "responsive", label: "Pełny" },
                { id: "320", label: "320px" },
                { id: "360", label: "360px" },
                { id: "390", label: "390px" },
                { id: "768", label: "768px" },
                { id: "1440", label: "1440px" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setViewportPreset(p.id)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition ${
                  viewportPreset === p.id
                    ? "bg-zinc-200 text-black font-bold"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reduced Motion toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>reduced-motion</span>
            </label>
          </div>
        </div>
      </footer>

      {/* CinematicPackExperience Full Integration Modal Preview */}
      {isExperienceOpen && (
        <div className="fixed inset-0 z-50">
          {/* Quick debug banner on top of experience */}
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000005] bg-black/85 border border-amber-500/40 rounded-full px-4 py-1 text-xs font-mono flex items-center gap-3 shadow-2xl pointer-events-auto">
            <span className="text-amber-400 font-bold">INTEGRACJA FSM (B2C.2)</span>
            <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
              <input
                data-testid="toggle-3d-flag"
                type="checkbox"
                checked={enable3DFlag}
                onChange={(e) => setEnable3DFlag(e.target.checked)}
                className="accent-amber-500"
              />
              <span>enableInferno3DCanvas={enable3DFlag ? "true" : "false"}</span>
            </label>
          </div>

          <CinematicPackExperience
            pack={{ ...DEV_PACK_DEFINITION, cards_count: cardCount }}
            mockResult={activeMockPack}
            enableInferno3DCanvas={enable3DFlag}
            onClose={() => setIsExperienceOpen(false)}
            onOpenAnother={() => {
              // Restart synthetic experience
              setIsExperienceOpen(false);
              setTimeout(() => setIsExperienceOpen(true), 100);
            }}
          />
        </div>
      )}
    </div>
  );
}
