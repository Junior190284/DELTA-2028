import React from "react";
import { notFound } from "next/navigation";
import LockerRoom3D from "@/components/LockerRoom3D";
import { CardDefinition, UserCard } from "@/lib/cards/types";

export const metadata = {
  title: "DELTA VIP Locker Room — Dev Preview (/dev/vip-locker)",
  robots: { index: false, follow: false }
};

export default function DevVipLockerPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_DEV_PAGES !== "true") {
    notFound();
  }

  const mockPlayers = [
    { id: "p1", display_name: "RYSZARD RYBACKI", shirt_number: "7", position: "NAP", photo_path: "/assets/players/ryszard-rybacki.png" },
    { id: "p2", display_name: "MATEUSZ KOWALCZYK", shirt_number: "10", position: "POM", photo_path: null },
    { id: "p3", display_name: "ALEKSANDER ZIELIŃSKI", shirt_number: "1", position: "BRAM", photo_path: null },
    { id: "p4", display_name: "BARTOSZ WIŚNIEWSKI", shirt_number: "4", position: "OBR", photo_path: null }
  ];

  const mockCards: CardDefinition[] = [
    {
      id: "card_inferno",
      player_id: "p1",
      season: "2026/27",
      card_type: "inferno",
      card_name: "RYSZARD RYBACKI",
      title: "INFERNO ULTRA",
      rarity: "inferno",
      artwork_url: "/assets/players/ryszard-inferno.png",
      artwork_pose: "inferno_flame",
      frame_theme: "inferno",
      card_number: 1,
      is_active: true,
      is_limited: true,
      edition_size: 50,
      description: "Płomienna edycja klubowa INFERNO.",
      lore: "Hat-trick w finale turnieju i nagroda Króla Strzelców.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[0]
    },
    {
      id: "card_icon",
      player_id: "p1",
      season: "2026/27",
      card_type: "legend",
      card_name: "RYSZARD RYBACKI",
      title: "DELTA ICON",
      rarity: "legendary",
      artwork_url: "/assets/players/ryszard-legend.png",
      artwork_pose: "action_dribble",
      frame_theme: "delta_icon",
      card_number: 2,
      is_active: true,
      is_limited: true,
      edition_size: 25,
      description: "Królewska karta ikony klubu DELTA.",
      lore: "Filar ofensywy i wzór zaangażowania dla młodszych roczników.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[0]
    },
    {
      id: "card_gold",
      player_id: "p3",
      season: "2026/27",
      card_type: "gold_master",
      card_name: "ALEKSANDER ZIELIŃSKI",
      title: "GOLD MASTER",
      rarity: "epic",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "gold_master",
      card_number: 3,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Mistrzowska obrona bramki DELTA.",
      lore: null,
      match_id: null,
      special_event_id: null,
      player: mockPlayers[2]
    },
    {
      id: "card_matchday",
      player_id: "p2",
      season: "2026/27",
      card_type: "matchday",
      card_name: "MATEUSZ KOWALCZYK",
      title: "MATCHDAY HERO",
      rarity: "rare",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "matchday_hero",
      card_number: 4,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Karta meczowa pomocnika DELTA.",
      lore: null,
      match_id: null,
      special_event_id: null,
      player: mockPlayers[1]
    }
  ];

  const userCardsMap = new Map<string, UserCard>();
  mockCards.forEach((c) => {
    userCardsMap.set(c.id, {
      id: `uc_${c.id}`,
      user_id: "dev-user",
      card_id: c.id,
      acquired_at: "2026-10-09T08:00:00Z",
      duplicates_count: 0,
      is_favorite: c.id === "card_inferno" || c.id === "card_icon",
      card_definition: c
    });
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="border-b border-white/10 pb-4">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider">
            DEV / STAGING ONLY
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            VIP Locker Room Showroom Preview (ETAP 13D)
          </h1>
          <p className="text-xs text-slate-400">
            Dark luxury stadium showroom, central 3D pedestal, spotlight, and showcase carousels.
          </p>
        </div>

        <LockerRoom3D
          ownedCards={mockCards}
          userCardsMap={userCardsMap}
        />
      </div>
    </div>
  );
}
