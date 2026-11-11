"use client";

import React, { useEffect, useState } from "react";
import CinematicPackExperience from "@/components/pack-opening-v2/CinematicPackExperience";
import DeltaCollectionAlbum from "@/components/DeltaCollectionAlbum";
import { type PackDefinition, type PackOpeningResult, type CardDefinition } from "@/lib/cards/types";
import { Sparkles, Flame, Play, Shield, Eye, Layers } from "lucide-react";

export default function DevPackOpeningV2Page() {
  const [albumMode, setAlbumMode] = useState(false);
  const [activePack, setActivePack] = useState<PackDefinition | null>(null);
  const [activeMockResult, setActiveMockResult] = useState<PackOpeningResult | null>(null);
  const [launchNonce, setLaunchNonce] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [autoStart, setAutoStart] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("album") === "1") {
        setAlbumMode(true);
      }
    }
  }, []);

  const mockPlayer = {
    id: "p1",
    display_name: "RYSZARD RYBACKI",
    shirt_number: "7",
    position: "NAP",
    photo_path: "/assets/players/ryszard-rybacki.png"
  };

  const createCard = (id: string, type: string, rarity: string, name: string): CardDefinition => ({
    id,
    player_id: mockPlayer.id,
    season: "2026/27",
    card_type: type,
    card_name: name,
    title: type.toUpperCase(),
    rarity: rarity as any,
    artwork_url:
      type === "inferno"
        ? "/assets/players/ryszard-inferno.png"
        : type === "legend"
        ? "/assets/players/ryszard-legend.png"
        : type === "gold_master" || type === "gold"
        ? "/assets/players/ryszard-gold.png"
        : null,
    artwork_pose: "standard",
    frame_theme: type,
    card_number: 1,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: "Karta kolekcjonerska DELTA GM.",
    lore: null,
    match_id: null,
    special_event_id: null,
    player: mockPlayer
  });

  const samplePacks: { title: string; pack: PackDefinition; result: PackOpeningResult }[] = [
    {
      title: "🔥 INFERNO CLIMAX (5 Kart, w tym Inferno Ultra — 3D Walkout)",
      pack: {
        id: "inferno_booster",
        name: "Inferno Booster",
        description: "Najwyższy poziom płomiennych emocji DELTA INFERNO z pełnym walkoutem 3D.",
        cards_count: 5,
        drop_rates: { common: 20, rare: 40, epic: 25, legendary: 10, inferno: 5 },
        min_rarity: "epic",
        theme: "inferno",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_inf", "inferno", "inferno", "RYSZARD RYBACKI (INFERNO)"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_gold", "gold_master", "epic", "MATEUSZ KOWALCZYK"), is_duplicate: true, duplicate_points: 50 },
          { card: createCard("c_match", "matchday", "rare", "ALEKSANDER ZIELIŃSKI"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_base1", "base", "common", "BARTOSZ WIŚNIEWSKI"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_base2", "base", "common", "JAKUB KAMIŃSKI"), is_duplicate: true, duplicate_points: 10 }
        ],
        total_delta_points_earned: 60,
        new_points_balance: 510,
        pack_type_id: "inferno_booster",
        remaining_unopened_packs_count: 2,
        enable_3d_walkout: true
      }
    },
    {
      title: "👑 DELTA ICON (3 Karty, Legend Walkout)",
      pack: {
        id: "legend_pack",
        name: "Legend Pack",
        description: "Gwarantowana karta legendy klubu DELTA z dynamicznym walkoutem 3D.",
        cards_count: 3,
        drop_rates: { common: 10, rare: 30, epic: 40, legendary: 20, inferno: 0 },
        min_rarity: "legendary",
        theme: "legend",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_icon", "legend", "legendary", "RYSZARD RYBACKI (IKONA)"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_rare", "matchday", "rare", "TOMASZ LEWANDOWSKI"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_base", "base", "common", "FILIP SZYMAŃSKI"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 0,
        new_points_balance: 450,
        pack_type_id: "legend_pack",
        remaining_unopened_packs_count: 1,
        enable_3d_walkout: true
      }
    },
    {
      title: "⚡ MATCHDAY HERO (4 Karty)",
      pack: {
        id: "matchday_booster",
        name: "Matchday Booster",
        description: "Paczka meczowa ligowych bohaterów (4 karty).",
        cards_count: 4,
        drop_rates: { common: 50, rare: 40, epic: 10, legendary: 0, inferno: 0 },
        min_rarity: "rare",
        theme: "matchday",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_mtch", "matchday", "rare", "MATEUSZ KOWALCZYK (MATCHDAY)"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_trn", "training_warrior", "rare", "ALEKSANDER ZIELIŃSKI"), is_duplicate: true, duplicate_points: 20 },
          { card: createCard("c_bs1", "base", "common", "BARTOSZ WIŚNIEWSKI"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_bs2", "base", "common", "JAKUB KAMIŃSKI"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 20,
        new_points_balance: 470,
        pack_type_id: "matchday_booster",
        remaining_unopened_packs_count: 0,
        enable_3d_walkout: true
      }
    },
    {
      title: "📦 STANDARD PACK (3 Karty — bez walkoutu, szybkie odkrywanie)",
      pack: {
        id: "standard_pack",
        name: "Paczka Standardowa",
        description: "Podstawowy zestaw 3 kart (brak walkoutu — bezpośrednie płynne przejście do kart).",
        cards_count: 3,
        drop_rates: { common: 70, rare: 25, epic: 5, legendary: 0, inferno: 0 },
        min_rarity: "common",
        theme: "standard",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_b1", "base", "common", "RYSZARD RYBACKI"), is_duplicate: true, duplicate_points: 10 },
          { card: createCard("c_b2", "base", "common", "MATEUSZ KOWALCZYK"), is_duplicate: true, duplicate_points: 10 },
          { card: createCard("c_b3", "base", "common", "ALEKSANDER ZIELIŃSKI"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 20,
        new_points_balance: 500,
        pack_type_id: "standard_pack",
        remaining_unopened_packs_count: 0,
        enable_3d_walkout: false
      }
    },
    {
      title: "🏆 MEGA PACK (6 Kart — test responsywnego podsumowania)",
      pack: {
        id: "mega_pack",
        name: "Paczka Mistrzowska (6 Kart)",
        description: "Test 6 kart w podsumowaniu — weryfikacja wyśrodkowania i braku ucinania dolnych przycisków.",
        cards_count: 6,
        drop_rates: { common: 20, rare: 40, epic: 30, legendary: 10, inferno: 0 },
        min_rarity: "rare",
        theme: "gold",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_gold_m", "gold_master", "epic", "KAPITAN DRUŻYNY"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_m1", "matchday", "rare", "MATEUSZ KOWALCZYK"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_m2", "training_warrior", "rare", "ALEKSANDER ZIELIŃSKI"), is_duplicate: true, duplicate_points: 20 },
          { card: createCard("c_m3", "base", "common", "BARTOSZ WIŚNIEWSKI"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_m4", "base", "common", "JAKUB KAMIŃSKI"), is_duplicate: true, duplicate_points: 10 },
          { card: createCard("c_m5", "base", "common", "TOMASZ LEWANDOWSKI"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 30,
        new_points_balance: 530,
        pack_type_id: "mega_pack",
        remaining_unopened_packs_count: 3,
        enable_3d_walkout: true
      }
    }
  ];

  const handleLaunchPack = (item: (typeof samplePacks)[0]) => {
    setActivePack(item.pack);
    setActiveMockResult(item.result);
    setLaunchNonce((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white p-6 md:p-12 font-sans selection:bg-red-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-[11px] font-black tracking-widest text-red-400 uppercase">
                ETAP 8C — V2 LAB
              </span>
              <span className="text-xs text-white/50">/dev/pack-opening-v2</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-red-500">
              DELTA INFERNO 2.0 — CINEMATIC PACK OPENING
            </h1>
            <p className="text-xs md:text-sm text-white/60 mt-1">
              Nowa architektura otwierania paczek oparta o niezależny kontroler FSM, płynne przejścia i brak powtarzania kart.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="rounded accent-red-500"
              />
              <span>Reduced Motion</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="rounded accent-red-500"
              />
              <span>Auto-Start</span>
            </label>

            <button
              type="button"
              data-testid="toggle-album-sandbox"
              onClick={() => setAlbumMode((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/20 transition-all"
            >
              <span>{albumMode ? "Pokaż Presety V2" : "Sandbox Album + V2"}</span>
            </button>
          </div>
        </header>

        {albumMode ? (
          <div data-testid="dev-album-sandbox" className="rounded-2xl border border-white/10 overflow-hidden bg-[#050811]">
            <DeltaCollectionAlbum currentUserId="dev-sandbox-user" />
          </div>
        ) : (
          <>
            {/* Preset Packs Grid */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
            <Layers size={16} className="text-amber-400" />
            <span>Dostępne zestawy testowe paczek</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {samplePacks.map((item, idx) => (
              <div
                key={item.pack.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/40 transition-all flex flex-col justify-between gap-4 group hover:bg-white/[0.07]"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/60 border border-white/10 text-amber-300">
                      {item.pack.cards_count} KART
                    </span>
                    <span className="text-[10px] text-white/50 uppercase">
                      Theme: {item.pack.theme}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {item.pack.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchPack(item)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Play size={14} className="fill-white" />
                  <span>Uruchom Otwieranie (V2)</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture & Verification Checklist */}
        <section className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <Shield size={14} />
            <span>Standardy ETAP 8C — Cinematic Experience</span>
          </h3>
          <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside">
            <li>Niezależny kontroler FSM (<code className="text-amber-300">PackExperienceController</code>) zarządza fazami i timerami.</li>
            <li>Zero duplikatów: Karta walkoutu (<code className="text-amber-300">heroCard</code>) nie powtarza się w fazie <code className="text-amber-300">CARD_REVEAL</code>.</li>
            <li>Podsumowanie (<code className="text-amber-300">SUMMARY</code>) zawiera pełen komplet otrzymanych kart (3, 5 lub 6).</li>
            <li>Wyśrodkowany układ podsumowania — brak przyklejenia do lewej krawędzi i brak ucinania dolnych przycisków.</li>
            <li>Czyste sprzątanie timerów i bezpieczne przejścia przy przyciskach Pomiń / Zamknij.</li>
          </ul>
        </section>
          </>
        )}
      </div>

      {/* Cinematic Modal Experience Mount */}
      {activePack && activeMockResult && (
        <CinematicPackExperience
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
            // Re-open with refreshed state
            const current = samplePacks.find((p) => p.pack.id === activePack.id);
            if (current) {
              handleLaunchPack(current);
            }
          }}
          unopenedCount={activeMockResult.remaining_unopened_packs_count || 0}
        />
      )}
    </div>
  );
}
