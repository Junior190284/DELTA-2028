/**
 * DELTA COLLECTION 3D ENGINE — TEST MOCK DATA
 * Explicitly isolated laboratory mock data. Never used in production queries.
 */

import type { PlayerCardData } from "./types.ts";

export const TEST_PLAYERS: Record<string, PlayerCardData> = {
  // 1. RYBACKI (Standard DELTA Star, INFERNO)
  rybacki: {
    playerId: "lab_player_rybacki",
    imageUrl: "/assets/cards/inferno-3d/player-default.png",
    surname: "RYBACKI",
    shirtNumber: 10,
    position: "FWD",
    ovr: 88,
    stats: {
      pac: 88,
      sho: 84,
      pas: 81,
      dri: 89,
      def: 62,
      phy: 78
    },
    visualType: "INFERNO_ULTRA",
    rarity: "INFERNO",
    specialTitleId: "hat_trick_hero",
    season: "2026/2027"
  },

  // 2. BRZĘCZYSZCZYKIEWICZ (Ekstremalnie długie polskie nazwisko — test łamania na 2 wiersze i skalowania)
  brzeczyszczykiewicz: {
    playerId: "lab_player_brzeczyszczykiewicz",
    imageUrl: "/assets/cards/inferno-3d/player-default.png",
    surname: "BRZĘCZYSZCZYKIEWICZ",
    shirtNumber: 7,
    position: "MID",
    ovr: 85,
    stats: {
      pac: 82,
      sho: 86,
      pas: 89,
      dri: 83,
      def: 74,
      phy: 80
    },
    visualType: "GOLD_MASTER",
    rarity: "GOLD",
    specialTitleId: "kapitan",
    season: "2026/2027"
  },

  // 3. KOWALSKI (Defensor, Matchday Hero)
  kowalski: {
    playerId: "lab_player_kowalski",
    imageUrl: "/assets/cards/inferno-3d/player-default.png",
    surname: "KOWALSKI",
    shirtNumber: 4,
    position: "DEF",
    ovr: 80,
    stats: {
      pac: 78,
      sho: 58,
      pas: 72,
      dri: 70,
      def: 86,
      phy: 84
    },
    visualType: "MATCHDAY_HERO",
    rarity: "MATCHDAY",
    specialTitleId: "matchday_hero",
    season: "2026/2027"
  },

  // 4. ZIELIŃSKI (Bramkarz, Training Hero / RARE)
  zielinski: {
    playerId: "lab_player_zielinski",
    imageUrl: "/assets/cards/inferno-3d/player-default.png",
    surname: "ZIELIŃSKI",
    shirtNumber: 1,
    position: "GK",
    ovr: 81,
    stats: {
      pac: 76,
      sho: 45,
      pas: 78,
      dri: 74,
      def: 82,
      phy: 80
    },
    visualType: "TRAINING_HERO",
    rarity: "RARE",
    specialTitleId: "training_hero",
    season: "2026/2027"
  },

  // 5. NOWAK (Podstawowy zawodnik akademii, COMMON / BASE)
  nowak: {
    playerId: "lab_player_nowak",
    imageUrl: "/assets/cards/inferno-3d/player-default.png",
    surname: "NOWAK",
    shirtNumber: 19,
    position: "MID",
    ovr: 72,
    stats: {
      pac: 72,
      sho: 68,
      pas: 74,
      dri: 71,
      def: 65,
      phy: 70
    },
    visualType: "BASE",
    rarity: "COMMON",
    specialTitleId: null,
    season: "2026/2027"
  },

  // 6. LEWANDOWSKI (Legenda klubu, DELTA ICON / LEGEND)
  lewandowski: {
    playerId: "lab_player_lewandowski",
    imageUrl: "/assets/cards/inferno-3d/player-default.png",
    surname: "LEWANDOWSKI",
    shirtNumber: 9,
    position: "FWD",
    ovr: 91,
    stats: {
      pac: 87,
      sho: 93,
      pas: 82,
      dri: 88,
      def: 45,
      phy: 85
    },
    visualType: "DELTA_ICON",
    rarity: "LEGEND",
    specialTitleId: "mvp",
    season: "2026/2027"
  }
};

export interface DemoPackConfig {
  id: string;
  name: string;
  cardsCount: number;
  priceDp: number;
  image: string;
  theme: "standard" | "matchday" | "gold" | "inferno" | "legend";
  description: string;
  minRarity: "common" | "rare" | "epic" | "legendary" | "inferno";
  dropRates: Record<string, number>;
}

export const DEMO_PACKS: DemoPackConfig[] = [
  {
    id: "standard_pack",
    name: "Standard Pack",
    cardsCount: 3,
    priceDp: 50,
    image: "/assets/packs/pack-standard.jpg",
    theme: "standard",
    description: "Podstawowa paczka zawierająca 3 karty zawodników rocznika 2018.",
    minRarity: "common",
    dropRates: { common: 70, rare: 22, epic: 6, legendary: 1.8, inferno: 0.2 }
  },
  {
    id: "matchday_booster",
    name: "Matchday Booster",
    cardsCount: 4,
    priceDp: 120,
    image: "/assets/packs/pack-matchday.jpg",
    theme: "matchday",
    description: "4 karty z podwyższoną szansą na edycje meczowe i turniejowe.",
    minRarity: "rare",
    dropRates: { common: 50, rare: 35, epic: 11, legendary: 3.5, inferno: 0.5 }
  },
  {
    id: "gold_booster",
    name: "Gold Booster",
    cardsCount: 5,
    priceDp: 250,
    image: "/assets/packs/pack-gold.jpg",
    theme: "gold",
    description: "5 kart z gwarancją co najmniej jednej karty RARE lub lepszej.",
    minRarity: "rare",
    dropRates: { common: 35, rare: 45, epic: 15, legendary: 4.5, inferno: 0.5 }
  },
  {
    id: "inferno_booster",
    name: "Inferno Booster",
    cardsCount: 5,
    priceDp: 750,
    image: "/assets/packs/pack-inferno.jpg",
    theme: "inferno",
    description: "Ekskluzywna paczka z szansą na płomienną kartę INFERNO ULTRA.",
    minRarity: "epic",
    dropRates: { common: 20, rare: 40, epic: 28, legendary: 9, inferno: 3 }
  },
  {
    id: "legend_pack",
    name: "Legend Pack",
    cardsCount: 6,
    priceDp: 1200,
    image: "/assets/packs/pack-legend.jpg",
    theme: "legend",
    description: "Najwyższy prestiż: 6 kart, gwarantowana karta LEGENDARY lub INFERNO.",
    minRarity: "legendary",
    dropRates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 }
  }
];

export const DEMO_PRODUCTION_CARDS: Record<string, {
  card: {
    id: string;
    player_id: string;
    season: string;
    card_type: string;
    card_name: string;
    title: string;
    rarity: "common" | "rare" | "epic" | "legendary" | "inferno";
    artwork_url: string;
    artwork_pose: string;
    frame_theme: string;
    card_number: number;
    is_active: boolean;
    is_limited: boolean;
    edition_size: number | null;
    description: string;
    lore: string;
    match_id: null;
    special_event_id: null;
    player: {
      id: string;
      display_name: string;
      shirt_number: string;
      position: string;
      photo_path: string;
    };
  };
  ovr: number;
  stats: { pac: number; sho: number; pas: number; dri: number; def: number; phy: number };
  specialTitleId?: string;
}> = {
  inferno: {
    card: {
      id: "card_demo_rybacki_inferno",
      player_id: "player_rybacki_01",
      season: "2026/2027",
      card_type: "inferno",
      card_name: "Ryszard Rybacki — Inferno Ultra",
      title: "Ryszard Rybacki",
      rarity: "inferno",
      artwork_url: "/assets/cards/inferno-3d/player-default.png",
      artwork_pose: "inferno_flame",
      frame_theme: "inferno-3d",
      card_number: 10,
      is_active: true,
      is_limited: true,
      edition_size: 1,
      description: "Oficjalna najrzadsza karta INFERNO ULTRA DELTA 2018 GM.",
      lore: "Zdobywca hat-tricka w finale turnieju zimowego.",
      match_id: null,
      special_event_id: null,
      player: {
        id: "player_rybacki_01",
        display_name: "Ryszard Rybacki",
        shirt_number: "10",
        position: "FWD",
        photo_path: "/assets/cards/inferno-3d/player-default.png"
      }
    },
    ovr: 88,
    stats: { pac: 88, sho: 84, pas: 81, dri: 89, def: 62, phy: 78 },
    specialTitleId: "hat_trick_hero"
  },
  gold: {
    card: {
      id: "card_demo_brzeczyszczykiewicz_gold",
      player_id: "player_brzeczyszczykiewicz_02",
      season: "2026/2027",
      card_type: "goal_hunter",
      card_name: "Janusz Brzęczyszczykiewicz — Gold Master",
      title: "Janusz Brzęczyszczykiewicz",
      rarity: "epic",
      artwork_url: "/assets/cards/inferno-3d/player-default.png",
      artwork_pose: "arms_crossed",
      frame_theme: "gold-master",
      card_number: 7,
      is_active: true,
      is_limited: false,
      edition_size: 100,
      description: "Karta mistrzowska GOLD MASTER DELTA 2018 GM.",
      lore: "Kapitan zespołu, architekt środka pola.",
      match_id: null,
      special_event_id: null,
      player: {
        id: "player_brzeczyszczykiewicz_02",
        display_name: "Janusz Brzęczyszczykiewicz",
        shirt_number: "7",
        position: "MID",
        photo_path: "/assets/cards/inferno-3d/player-default.png"
      }
    },
    ovr: 85,
    stats: { pac: 82, sho: 86, pas: 89, dri: 83, def: 74, phy: 80 },
    specialTitleId: "kapitan"
  },
  matchday: {
    card: {
      id: "card_demo_kowalski_matchday",
      player_id: "player_kowalski_03",
      season: "2026/2027",
      card_type: "matchday",
      card_name: "Tomasz Kowalski — Matchday Hero",
      title: "Tomasz Kowalski",
      rarity: "rare",
      artwork_url: "/assets/cards/inferno-3d/player-default.png",
      artwork_pose: "defensive_stance",
      frame_theme: "matchday-hero",
      card_number: 4,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Oficjalna karta meczowa DELTA Matchday Hero.",
      lore: "Niezłomny filar obrony w derbowym spotkaniu ligowym.",
      match_id: null,
      special_event_id: null,
      player: {
        id: "player_kowalski_03",
        display_name: "Tomasz Kowalski",
        shirt_number: "4",
        position: "DEF",
        photo_path: "/assets/cards/inferno-3d/player-default.png"
      }
    },
    ovr: 80,
    stats: { pac: 78, sho: 58, pas: 72, dri: 70, def: 86, phy: 84 },
    specialTitleId: "matchday_hero"
  },
  legend: {
    card: {
      id: "card_demo_lewandowski_legend",
      player_id: "player_lewandowski_04",
      season: "2026/2027",
      card_type: "legend",
      card_name: "Robert Lewandowski — Delta Icon",
      title: "Robert Lewandowski",
      rarity: "legendary",
      artwork_url: "/assets/cards/inferno-3d/player-default.png",
      artwork_pose: "triumphant_celebration",
      frame_theme: "delta-icon",
      card_number: 9,
      is_active: true,
      is_limited: true,
      edition_size: 25,
      description: "Platynowa karta DELTA ICON najwyższej klasy.",
      lore: "Wzór profesjonalizmu i mentor młodych adeptów futbolu.",
      match_id: null,
      special_event_id: null,
      player: {
        id: "player_lewandowski_04",
        display_name: "Robert Lewandowski",
        shirt_number: "9",
        position: "FWD",
        photo_path: "/assets/cards/inferno-3d/player-default.png"
      }
    },
    ovr: 91,
    stats: { pac: 87, sho: 93, pas: 82, dri: 88, def: 45, phy: 85 },
    specialTitleId: "mvp"
  },
  rare: {
    card: {
      id: "card_demo_zielinski_rare",
      player_id: "player_zielinski_05",
      season: "2026/2027",
      card_type: "training_warrior",
      card_name: "Piotr Zieliński — Training Hero",
      title: "Piotr Zieliński",
      rarity: "rare",
      artwork_url: "/assets/cards/inferno-3d/player-default.png",
      artwork_pose: "diving_save",
      frame_theme: "training-hero",
      card_number: 1,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Karta akademii Training Hero za wzorową postawę na treningach.",
      lore: "Czyste konto w 5 meczach z rzędu w turnieju halowym.",
      match_id: null,
      special_event_id: null,
      player: {
        id: "player_zielinski_05",
        display_name: "Piotr Zieliński",
        shirt_number: "1",
        position: "GK",
        photo_path: "/assets/cards/inferno-3d/player-default.png"
      }
    },
    ovr: 81,
    stats: { pac: 76, sho: 45, pas: 78, dri: 74, def: 82, phy: 80 },
    specialTitleId: "training_hero"
  },
  common: {
    card: {
      id: "card_demo_nowak_common",
      player_id: "player_nowak_06",
      season: "2026/2027",
      card_type: "base",
      card_name: "Adam Nowak — Akademia Base",
      title: "Adam Nowak",
      rarity: "common",
      artwork_url: "/assets/cards/inferno-3d/player-default.png",
      artwork_pose: "ready_pass",
      frame_theme: "base",
      card_number: 19,
      is_active: true,
      is_limited: false,
      edition_size: null,
      description: "Oficjalna karta bazowa zawodnika akademii DELTA 2018 GM.",
      lore: "Młody talent rozwijający skrzydła w roczniku 2018.",
      match_id: null,
      special_event_id: null,
      player: {
        id: "player_nowak_06",
        display_name: "Adam Nowak",
        shirt_number: "19",
        position: "MID",
        photo_path: "/assets/cards/inferno-3d/player-default.png"
      }
    },
    ovr: 72,
    stats: { pac: 72, sho: 68, pas: 74, dri: 71, def: 65, phy: 70 },
    specialTitleId: undefined
  }
};

