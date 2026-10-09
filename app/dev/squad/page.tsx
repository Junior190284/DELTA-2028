import React from "react";
import { notFound } from "next/navigation";
import SquadBuilder3D from "@/components/SquadBuilder3D";
import { CardDefinition, UserCard } from "@/lib/cards/types";

export const metadata = {
  title: "DELTA Squad Builder — Dev Preview (/dev/squad)",
  robots: { index: false, follow: false }
};

export default function DevSquadPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_DEV_PAGES !== "true") {
    notFound();
  }

  const mockPlayers = [
    { id: "p1", display_name: "RYSZARD RYBACKI", shirt_number: "7", position: "NAP", photo_path: "/assets/players/ryszard-rybacki.png" },
    { id: "p2", display_name: "MATEUSZ KOWALCZYK", shirt_number: "10", position: "POM", photo_path: null },
    { id: "p3", display_name: "ALEKSANDER ZIELIŃSKI", shirt_number: "1", position: "BRAM", photo_path: null },
    { id: "p4", display_name: "BARTOSZ WIŚNIEWSKI", shirt_number: "4", position: "OBR", photo_path: null },
    { id: "p5", display_name: "TOMASZ LEWANDOWSKI", shirt_number: "8", position: "POM", photo_path: null },
    { id: "p6", display_name: "JAKUB KAMIŃSKI", shirt_number: "5", position: "OBR", photo_path: null },
    { id: "p7", display_name: "FILIP SZYMAŃSKI", shirt_number: "11", position: "NAP", photo_path: null },
    { id: "p8", display_name: "KACPER WOŹNIAK", shirt_number: "3", position: "OBR", photo_path: null }
  ];

  const mockCards: CardDefinition[] = mockPlayers.map((p, idx) => ({
    id: `card_${p.id}`,
    player_id: p.id,
    season: "2026/27",
    card_type: idx === 0 ? "inferno" : idx === 1 ? "captain" : idx === 2 ? "gold_master" : "base",
    card_name: p.display_name,
    title: idx === 0 ? "INFERNO" : idx === 1 ? "CAPTAIN" : "BASE",
    rarity: idx === 0 ? "inferno" : idx === 1 ? "epic" : idx === 2 ? "epic" : "common",
    artwork_url: idx === 0 ? "/assets/players/ryszard-inferno.png" : null,
    artwork_pose: "standard",
    frame_theme: idx === 0 ? "inferno" : idx === 1 ? "captain" : "base",
    card_number: idx + 1,
    is_active: true,
    is_limited: false,
    edition_size: null,
    description: `Karta zawodnika ${p.display_name}.`,
    lore: null,
    match_id: null,
    special_event_id: null,
    player: p
  }));

  const userCardsMap = new Map<string, UserCard>();
  mockCards.forEach((c) => {
    userCardsMap.set(c.id, {
      id: `uc_${c.id}`,
      user_id: "dev-user",
      card_id: c.id,
      acquired_at: "2026-10-09T08:00:00Z",
      duplicates_count: 0,
      is_favorite: c.id === "card_p1",
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
            Moja 11 / Squad Builder Preview (ETAP 13C)
          </h1>
          <p className="text-xs text-slate-400">
            Collision-free 4:3 pitch layout, DeltaCard integration, zero chemistry, persistent roster saving.
          </p>
        </div>

        <SquadBuilder3D
          ownedCards={mockCards}
          userCardsMap={userCardsMap}
        />
      </div>
    </div>
  );
}
