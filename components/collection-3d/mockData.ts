/**
 * DELTA COLLECTION 3D ENGINE — TEST MOCK DATA
 * Explicitly isolated laboratory mock data. Never used in production queries.
 */

import { PlayerCardData } from "./types";

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
