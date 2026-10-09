import React from "react";
import { notFound } from "next/navigation";
import DeltaCollectionHub from "@/components/collection/DeltaCollectionHub";
import { CardDefinition, UserCard, UserUnopenedPack } from "@/lib/cards/types";

export const metadata = {
  title: "DELTA Collection Hub — Dev Preview (/dev/collection)",
  robots: { index: false, follow: false }
};

export default function DevCollectionPage() {
  // Security Gate: Non-production only
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_DEV_PAGES !== "true") {
    notFound();
  }

  // Realistic mock data for robust local testing without DB dependencies
  const mockPlayers = [
    { id: "p1", display_name: "RYSZARD RYBACKI", shirt_number: "7", position: "NAP", photo_path: "/assets/players/ryszard-rybacki.png" },
    { id: "p2", display_name: "MATEUSZ KOWALCZYK", shirt_number: "10", position: "POM", photo_path: null },
    { id: "p3", display_name: "ALEKSANDER ZIELIŃSKI", shirt_number: "1", position: "BRAM", photo_path: null },
    { id: "p4", display_name: "BARTOSZ WIŚNIEWSKI", shirt_number: "4", position: "OBR", photo_path: null }
  ];

  const mockCards: CardDefinition[] = [
    // Ryszard Cards
    {
      id: "c1",
      player_id: "p1",
      season: "2026/27",
      card_type: "base",
      card_name: "RYSZARD RYBACKI",
      title: "BASE",
      rarity: "common",
      artwork_url: "/assets/players/ryszard-gold.png",
      artwork_pose: "standard",
      frame_theme: "base",
      card_number: 1,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Karta bazowa zawodnika DELTA 2018 GM.",
      lore: "Debiut w kadrze meczowej rocznika 2018.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[0]
    },
    {
      id: "c2",
      player_id: "p1",
      season: "2026/27",
      card_type: "training_warrior",
      card_name: "RYSZARD RYBACKI",
      title: "TRAINING HERO",
      rarity: "rare",
      artwork_url: "/assets/players/ryszard-gold.png",
      artwork_pose: "arms_crossed",
      frame_theme: "training_hero",
      card_number: 2,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Wojownik treningu DELTA.",
      lore: "98% frekwencji na treningach w rundzie jesiennej.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[0]
    },
    {
      id: "c3",
      player_id: "p1",
      season: "2026/27",
      card_type: "inferno",
      card_name: "RYSZARD RYBACKI",
      title: "INFERNO ULTRA",
      rarity: "inferno",
      artwork_url: "/assets/players/ryszard-inferno.png",
      artwork_pose: "inferno_flame",
      frame_theme: "inferno",
      card_number: 3,
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
      id: "c4",
      player_id: "p1",
      season: "2026/27",
      card_type: "legend",
      card_name: "RYSZARD RYBACKI",
      title: "DELTA ICON",
      rarity: "legendary",
      artwork_url: "/assets/players/ryszard-legend.png",
      artwork_pose: "action_dribble",
      frame_theme: "delta_icon",
      card_number: 4,
      is_active: true,
      is_limited: true,
      edition_size: 25,
      description: "Królewska karta ikony klubu DELTA.",
      lore: "Filar ofensywy i wzór zaangażowania dla młodszych roczników.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[0]
    },
    // Mateusz Cards
    {
      id: "c5",
      player_id: "p2",
      season: "2026/27",
      card_type: "matchday",
      card_name: "MATEUSZ KOWALCZYK",
      title: "MATCHDAY HERO",
      rarity: "rare",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "matchday_hero",
      card_number: 5,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Karta meczowa pomocnika DELTA.",
      lore: "Perfekcyjna asysta w doliczonym czasie gry.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[1]
    },
    {
      id: "c6",
      player_id: "p2",
      season: "2026/27",
      card_type: "captain",
      card_name: "MATEUSZ KOWALCZYK",
      title: "CAPTAIN SERIES",
      rarity: "epic",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "captain",
      card_number: 6,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Opaska kapitańska i serce zespołu.",
      lore: "Wyprowadzenie drużyny DELTA na finałowy mecz mistrzostw.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[1]
    },
    // Aleksander Cards
    {
      id: "c7",
      player_id: "p3",
      season: "2026/27",
      card_type: "gold_master",
      card_name: "ALEKSANDER ZIELIŃSKI",
      title: "GOLD MASTER",
      rarity: "epic",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "gold_master",
      card_number: 7,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Mistrzowska obrona bramki DELTA.",
      lore: "Trzy obronione rzuty karne w serii jedenastek.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[2]
    },
    // Bartosz Cards
    {
      id: "c8",
      player_id: "p4",
      season: "2026/27",
      card_type: "goal_hunter",
      card_name: "BARTOSZ WIŚNIEWSKI",
      title: "GOAL MACHINE",
      rarity: "epic",
      artwork_url: null,
      artwork_pose: "standard",
      frame_theme: "goal_machine",
      card_number: 8,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Nieustępliwy defensor z golem po rzucie rożnym.",
      lore: "Zwycięska bramka głową w derbach Warszawy.",
      match_id: null,
      special_event_id: null,
      player: mockPlayers[3]
    }
  ];

  // User owns cards c1, c2, c3, c5 (c3 has 1 duplicate, c1 & c3 are favorites)
  const mockUserCards: UserCard[] = [
    {
      id: "uc1",
      user_id: "dev-user",
      card_id: "c1",
      acquired_at: "2026-10-01T12:00:00.000Z",
      duplicates_count: 0,
      is_favorite: true,
      card_definition: mockCards[0]
    },
    {
      id: "uc2",
      user_id: "dev-user",
      card_id: "c2",
      acquired_at: "2026-10-03T15:30:00.000Z",
      duplicates_count: 0,
      is_favorite: false,
      card_definition: mockCards[1]
    },
    {
      id: "uc3",
      user_id: "dev-user",
      card_id: "c3",
      acquired_at: "2026-10-08T18:45:00.000Z",
      duplicates_count: 1,
      is_favorite: true,
      card_definition: mockCards[2]
    },
    {
      id: "uc5",
      user_id: "dev-user",
      card_id: "c5",
      acquired_at: "2026-10-05T09:15:00.000Z",
      duplicates_count: 0,
      is_favorite: false,
      card_definition: mockCards[4]
    }
  ];

  const mockUnopenedPacks: UserUnopenedPack[] = [
    {
      id: "pack_1",
      user_id: "dev-user",
      pack_type_id: "inferno_booster",
      source_reason: "Nagroda za aktywność",
      is_opened: false,
      opened_at: null,
      created_at: "2026-10-09T08:00:00.000Z"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider">
                DEV / STAGING ONLY
              </span>
              <span className="text-xs font-mono text-slate-400">BRANCH: gemini/card-collection-overhaul</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              DELTA Collection Hub Showcase (ETAP 13B)
            </h1>
          </div>
        </div>

        <DeltaCollectionHub
          initialAllCards={mockCards}
          initialUserCards={mockUserCards}
          initialUnopenedPacks={mockUnopenedPacks}
          initialDeltaPoints={450}
        />
      </div>
    </div>
  );
}
