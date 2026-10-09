"use client";

import React, { useState } from "react";
import PackOpeningExperience from "@/components/PackOpeningExperience";
import { PackDefinition, PackOpeningResult, CardDefinition } from "@/lib/cards/types";

export default function DevPackOpeningPage() {
  const [activePack, setActivePack] = useState<PackDefinition | null>(null);
  const [activeMockResult, setActiveMockResult] = useState<PackOpeningResult | null>(null);

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
    artwork_url: type === "inferno" ? "/assets/players/ryszard-inferno.png" : type === "legend" ? "/assets/players/ryszard-legend.png" : null,
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
      title: "🔥 INFERNO CLIMAX (5 Kart, w tym Inferno Ultra)",
      pack: {
        id: "inferno_booster",
        name: "Inferno Booster",
        description: "Najwyższy poziom płomiennych emocji DELTA INFERNO.",
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
        remaining_unopened_packs_count: 2
      }
    },
    {
      title: "👑 DELTA ICON (Legend Pack)",
      pack: {
        id: "legend_pack",
        name: "Legend Pack",
        description: "Gwarantowana karta legendy klubu.",
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
        remaining_unopened_packs_count: 1
      }
    },
    {
      title: "⚡ MATCHDAY HERO BOOSTER",
      pack: {
        id: "matchday_booster",
        name: "Matchday Booster",
        description: "Paczka meczowa ligowych bohaterów.",
        cards_count: 3,
        drop_rates: { common: 50, rare: 40, epic: 10, legendary: 0, inferno: 0 },
        min_rarity: "rare",
        theme: "matchday",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_mtch", "matchday", "rare", "MATEUSZ KOWALCZYK"), is_duplicate: false, duplicate_points: 0 },
          { card: createCard("c_trn", "training_warrior", "rare", "ALEKSANDER ZIELIŃSKI"), is_duplicate: true, duplicate_points: 20 },
          { card: createCard("c_bs", "base", "common", "BARTOSZ WIŚNIEWSKI"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 20,
        new_points_balance: 470,
        pack_type_id: "matchday_booster",
        remaining_unopened_packs_count: 0
      }
    },
    {
      title: "📦 STANDARD PACK (Duplikaty z punktami z backendu)",
      pack: {
        id: "standard_pack",
        name: "Paczka Standardowa",
        description: "Podstawowy zestaw 3 kart (symulacja punktów DP z serwera).",
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
          { card: createCard("c_b3", "base", "common", "ALEKSANDER ZIELIŃSKI"), is_duplicate: true, duplicate_points: 10 }
        ],
        total_delta_points_earned: 30,
        new_points_balance: 500,
        pack_type_id: "standard_pack",
        remaining_unopened_packs_count: 0
      }
    },
    {
      title: "🔄 CLEAN DUPLICATES (Bez nagrody DP)",
      pack: {
        id: "standard_pack_no_dp",
        name: "Paczka Standardowa (Bez DP)",
        description: "Symulacja duplikatów bez naliczonych punktów DP (czyste oznaczenie DUPLIKAT).",
        cards_count: 2,
        drop_rates: { common: 100, rare: 0, epic: 0, legendary: 0, inferno: 0 },
        min_rarity: "common",
        theme: "standard",
        is_active: true
      },
      result: {
        cards: [
          { card: createCard("c_nodp1", "base", "common", "BARTOSZ WIŚNIEWSKI"), is_duplicate: true, duplicate_points: 0 },
          { card: createCard("c_nodp2", "base", "common", "FILIP SZYMAŃSKI"), is_duplicate: false, duplicate_points: 0 }
        ],
        total_delta_points_earned: 0,
        new_points_balance: 450,
        pack_type_id: "standard_pack",
        remaining_unopened_packs_count: 0
      }
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-white/10 pb-4">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider">
            DEV / STAGING ONLY • MOCK DATA
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Pack Opening Experience Preview (ETAP 13E.1)
          </h1>
          <p className="text-xs text-slate-400">
            Cinematic reveal, automat stanów, natychmiastowa synchronizacja, brak fikcyjnych rzadkości, weryfikacja backendu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {samplePacks.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900 border border-white/10 hover:border-amber-400/40 transition-all space-y-3"
            >
              <h3 className="text-sm font-black text-white uppercase">{item.title}</h3>
              <p className="text-xs text-slate-400">{item.pack.description}</p>
              <button
                onClick={() => {
                  setActivePack(item.pack);
                  setActiveMockResult(item.result);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Uruchom Test Otwarcia 📦
              </button>
            </div>
          ))}
        </div>
      </div>

      {activePack && (
        <PackOpeningExperience
          pack={activePack}
          onClose={() => setActivePack(null)}
          mockResult={activeMockResult || undefined}
          unopenedCount={2}
        />
      )}
    </div>
  );
}
