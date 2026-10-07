/**
 * DELTA WARSZAWA 2018 GM — CENTRAL CARD TYPES & RATING SYSTEM
 * Central single source of truth for card types, stats, rarity boosts and ratings.
 */

import { CardRarity } from "./types";

export type CentralCardCategory = "player" | "coach" | "stadium" | "crest" | "special";

export type CentralCardTypeKey = 
  | "PLAYER_STANDARD"
  | "TRAINING_HERO"
  | "MATCHDAY_HERO"
  | "GOLD_MASTER"
  | "DELTA_ICON"
  | "INFERNO"
  | "SEASONAL"
  | "COACH"
  | "STADIUM"
  | "CLUB_CREST";

export interface CentralCardTypeMeta {
  type: CentralCardTypeKey;
  legacyKey: string; // compatibility with existing card_type strings
  category: CentralCardCategory;
  displayName: string;
  badgeLabel: string;
  defaultRarity: CardRarity;
  sortOrder: number;
  icon: string; // lucide or emoji
  description: string;
  ratingBonus: number; // bonus added to player base OVR
  squadBonusDescription?: string;
  bgGradient: string;
  borderGlow: string;
}

export const CENTRAL_CARD_TYPES: Record<CentralCardTypeKey, CentralCardTypeMeta> = {
  PLAYER_STANDARD: {
    type: "PLAYER_STANDARD",
    legacyKey: "base",
    category: "player",
    displayName: "Standard Base",
    badgeLabel: "STANDARD",
    defaultRarity: "common",
    sortOrder: 1,
    icon: "⚽",
    description: "Podstawowa oficjalna karta zawodnika w kadrze DELTA 2018 GM.",
    ratingBonus: 0,
    bgGradient: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderGlow: "rgba(156, 163, 175, 0.4)"
  },
  TRAINING_HERO: {
    type: "TRAINING_HERO",
    legacyKey: "training_warrior",
    category: "player",
    displayName: "Training Hero",
    badgeLabel: "TRENING",
    defaultRarity: "rare",
    sortOrder: 2,
    icon: "⚔️",
    description: "Wyróżnienie za zaangażowanie, frekwencję i postawę na treningach.",
    ratingBonus: 3,
    bgGradient: "linear-gradient(135deg, #065f46, #022c22)",
    borderGlow: "rgba(52, 211, 153, 0.6)"
  },
  MATCHDAY_HERO: {
    type: "MATCHDAY_HERO",
    legacyKey: "matchday",
    category: "player",
    displayName: "Matchday Hero",
    badgeLabel: "MECZ",
    defaultRarity: "rare",
    sortOrder: 3,
    icon: "🔥",
    description: "Karta meczowa. Wysoka dyspozycja i skupienie w dniu meczu ligowego.",
    ratingBonus: 5,
    bgGradient: "linear-gradient(135deg, #0369a1, #0c4a6e)",
    borderGlow: "rgba(56, 189, 248, 0.7)"
  },
  GOLD_MASTER: {
    type: "GOLD_MASTER",
    legacyKey: "goal_hunter",
    category: "player",
    displayName: "Gold Master",
    badgeLabel: "GOLD MASTER",
    defaultRarity: "epic",
    sortOrder: 4,
    icon: "👑",
    description: "Złota karta mistrzowska. Niezawodny strzelec, asystent lub król gierki.",
    ratingBonus: 8,
    bgGradient: "linear-gradient(135deg, #b45309, #78350f)",
    borderGlow: "rgba(245, 158, 11, 0.85)"
  },
  DELTA_ICON: {
    type: "DELTA_ICON",
    legacyKey: "legend",
    category: "player",
    displayName: "Delta Icon",
    badgeLabel: "IKONA DELTA",
    defaultRarity: "legendary",
    sortOrder: 5,
    icon: "⭐",
    description: "Klubowa ikona. Najwyższe osiągnięcia, kapitańska postawa i MVP.",
    ratingBonus: 12,
    bgGradient: "linear-gradient(135deg, #ca8a04, #451a03)",
    borderGlow: "rgba(250, 204, 21, 0.95)"
  },
  INFERNO: {
    type: "INFERNO",
    legacyKey: "inferno",
    category: "player",
    displayName: "DELTA INFERNO",
    badgeLabel: "INFERNO",
    defaultRarity: "inferno",
    sortOrder: 6,
    icon: "🌋",
    description: "Płonąca potęga DELTA INFERNO. Najrzadsza i najpotężniejsza karta w grze.",
    ratingBonus: 16,
    bgGradient: "linear-gradient(135deg, #dc2626, #450a0a)",
    borderGlow: "rgba(239, 68, 68, 1)"
  },
  SEASONAL: {
    type: "SEASONAL",
    legacyKey: "special_event",
    category: "special",
    displayName: "Edycja Sezonowa / Event",
    badgeLabel: "EVENT",
    defaultRarity: "epic",
    sortOrder: 7,
    icon: "🎄",
    description: "Karta okolicznościowa z turniejów, świąt lub obozów przygotowawczych.",
    ratingBonus: 6,
    bgGradient: "linear-gradient(135deg, #6366f1, #312e81)",
    borderGlow: "rgba(129, 140, 248, 0.8)"
  },
  COACH: {
    type: "COACH",
    legacyKey: "coach",
    category: "coach",
    displayName: "Karta Trenera",
    badgeLabel: "SZTAB SZKOLENIOWY",
    defaultRarity: "epic",
    sortOrder: 8,
    icon: "📋",
    description: "Sztab szkoleniowy DELTA. Daje bonus taktyczny +2 OVR do formacji w składzie.",
    ratingBonus: 0,
    squadBonusDescription: "+2 do Zgrania i +2 OVR do formacji",
    bgGradient: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderGlow: "rgba(245, 158, 11, 0.75)"
  },
  STADIUM: {
    type: "STADIUM",
    legacyKey: "stadium",
    category: "stadium",
    displayName: "Obiekt / Boisko",
    badgeLabel: "TWEIRDZA DELTA",
    defaultRarity: "rare",
    sortOrder: 9,
    icon: "🏟️",
    description: "Baza domowa Diabełków (Jordanek / Mokotów). Daje bonus gospodarza +1 OVR.",
    ratingBonus: 0,
    squadBonusDescription: "+1 OVR dla całej drużyny na własnym boisku",
    bgGradient: "linear-gradient(135deg, #0f766e, #134e4a)",
    borderGlow: "rgba(20, 184, 166, 0.75)"
  },
  CLUB_CREST: {
    type: "CLUB_CREST",
    legacyKey: "crest",
    category: "crest",
    displayName: "Herb Klubu DELTA",
    badgeLabel: "HERB KLUBU",
    defaultRarity: "legendary",
    sortOrder: 10,
    icon: "🛡️",
    description: "Oficjalny herb K.S. Delta Warszawa 2018 Górny Mokotów. Duma i tożsamość.",
    ratingBonus: 0,
    squadBonusDescription: "+2 do morale i ducha zespołu w Squad Builderze",
    bgGradient: "linear-gradient(135deg, #7f1d1d, #450a0a)",
    borderGlow: "rgba(245, 158, 11, 0.9)"
  }
};

/**
 * POLSKIE OZNACZENIA STATYSTYK NA KARTACH
 */
export interface StatMetricDef {
  key: string;
  codePL: string; // 3-literowy kod (np. TEM, STR, POD, DRY, OBR, FIZ)
  fullNamePL: string;
  descriptionPL: string;
  icon: string;
  isGoalkeeperStat?: boolean;
}

export const POLISH_CARD_STATS: Record<string, StatMetricDef> = {
  pace: {
    key: "pace",
    codePL: "TEM",
    fullNamePL: "Tempo i Szybkość",
    descriptionPL: "Szybkość sprintu, zwinność i dynamika pierwszego kroku do piłki.",
    icon: "⚡"
  },
  shooting: {
    key: "shooting",
    codePL: "STR",
    fullNamePL: "Siła i Celność Strzału",
    descriptionPL: "Precyzja uderzenia, wykończenie akcji oraz strzały z dystansu.",
    icon: "🎯"
  },
  passing: {
    key: "passing",
    codePL: "POD",
    fullNamePL: "Podania i Przegląd Pola",
    descriptionPL: "Dokładność podań po ziemi, dośrodkowania i widzenie kolegów.",
    icon: "↗️"
  },
  dribbling: {
    key: "dribbling",
    codePL: "DRY",
    fullNamePL: "Drybling i Kontrola",
    descriptionPL: "Prowadzenie piłki blisko nogi, zwody 1 na 1 i pierwszy kontakt.",
    icon: "🪄"
  },
  defending: {
    key: "defending",
    codePL: "OBR",
    fullNamePL: "Gra w Obronie",
    descriptionPL: "Odbiór piłki, asekuracja, blokowanie strzałów i gra ciałem.",
    icon: "🛡️"
  },
  physicality: {
    key: "physicality",
    codePL: "FIZ",
    fullNamePL: "Kondycja i Fizyczność",
    descriptionPL: "Wytrzymałość biegowa, zaangażowanie i walka o każdą piłkę.",
    icon: "💪"
  },
  // Statystyki bramkarskie
  gk_positioning: {
    key: "gk_positioning",
    codePL: "POZ",
    fullNamePL: "Pozycjonowanie",
    descriptionPL: "Ustawienie w bramce i skracanie kąta rywalom.",
    icon: "📐",
    isGoalkeeperStat: true
  },
  gk_saves: {
    key: "gk_saves",
    codePL: "OBR",
    fullNamePL: "Obrony i Parady",
    descriptionPL: "Skuteczność chwytu i obrony strzałów z bliska i daleka.",
    icon: "🧤",
    isGoalkeeperStat: true
  },
  gk_reflex: {
    key: "gk_reflex",
    codePL: "REF",
    fullNamePL: "Refleks",
    descriptionPL: "Błyskawiczny czas reakcji na zaskakujące strzały i rykoszety.",
    icon: "⚡",
    isGoalkeeperStat: true
  },
  gk_kicking: {
    key: "gk_kicking",
    codePL: "WZP",
    fullNamePL: "Wznowienie Gry",
    descriptionPL: "Wyrzuty ręką i precyzyjne wykopy rozpoczynające kontratak.",
    icon: "👟",
    isGoalkeeperStat: true
  }
};

/**
 * 4 POCZĄTKOWE KARTY TRENERÓW (SZTAB SZKOLENIOWY DELTA)
 */
export interface CoachCardDef {
  id: string;
  name: string;
  roleTitle: string;
  specialty: string;
  rarity: CardRarity;
  tacticalBonus: string;
  photoUrl: string;
}

export const INITIAL_COACH_CARDS: CoachCardDef[] = [
  {
    id: "coach-main",
    name: "Trener Główny DELTA 2018",
    roleTitle: "I Trener Drużyny",
    specialty: "Ofensywny Pressing & Tiki-Taka",
    rarity: "legendary",
    tacticalBonus: "+3 OVR Atak & Pomoc",
    photoUrl: "/teamlogos/gm.png"
  },
  {
    id: "coach-asst",
    name: "Trener Asystent & Taktyk",
    roleTitle: "II Trener / Taktyka",
    specialty: "Asekuracja i Fazy Przejściowe",
    rarity: "epic",
    tacticalBonus: "+2 OVR Obrona & Zgranie",
    photoUrl: "/teamlogos/gm.png"
  },
  {
    id: "coach-prep",
    name: "Trener Przygotowania Motorycznego",
    roleTitle: "Motoryka & Kondycja",
    specialty: "Szybkość i Zwinność Diabełków",
    rarity: "epic",
    tacticalBonus: "+3 Tempo & Fizyczność",
    photoUrl: "/teamlogos/gm.png"
  },
  {
    id: "coach-gk",
    name: "Trener Bramkarzy DELTA",
    roleTitle: "Szkoła Bramkarska DELTA",
    specialty: "Gra Nogami i Refleks na Linii",
    rarity: "rare",
    tacticalBonus: "+4 OVR Bramkarz",
    photoUrl: "/teamlogos/gm.png"
  }
];

/**
 * KARTY STADIONU I HERBU
 */
export const SPECIAL_VENUE_CARDS = [
  {
    id: "stadium-jordanek",
    name: "Twierdza Jordanek DELTA",
    type: "STADIUM" as CentralCardTypeKey,
    rarity: "rare" as CardRarity,
    title: "Oficjalne Boisko Domowe",
    description: "Naturalny dom rocznika 2018. Tutaj Diabełki trenują i rozgrywają mecze ligowe.",
    bonus: "+1 OVR dla całej drużyny na własnym boisku",
    photoUrl: "/teamlogos/gm.png"
  },
  {
    id: "stadium-mokotow-arena",
    name: "Arena Mokotów",
    type: "STADIUM" as CentralCardTypeKey,
    rarity: "epic" as CardRarity,
    title: "Centrum Turniejowe",
    description: "Główny kompleks turniejowy DELTA z trybunami i oświetleniem meczowym.",
    bonus: "+2 OVR w meczach pucharowych i turniejowych",
    photoUrl: "/teamlogos/gm.png"
  },
  {
    id: "crest-delta-gold",
    name: "Złoty Herb DELTA Warszawa",
    type: "CLUB_CREST" as CentralCardTypeKey,
    rarity: "legendary" as CardRarity,
    title: "Herb Klubu 2018 GM",
    description: "Najwyższy symbol tożsamości, pasji i przywiązania do czerwono-czarnych barw DELTY.",
    bonus: "+100% Dumy Klubowej & +2 OVR Zgranie",
    photoUrl: "/teamlogos/gm.png"
  }
];

/**
 * CENTRAL RATING HELPER (Jedno źródło prawdy dla OVR karty)
 */
export function calculateCardOVR(params: {
  playerStats?: { matches?: number; goals?: number; assists?: number; trainings?: number; mvp?: number; cleanSheets?: number };
  cardType?: string | CentralCardTypeKey;
  rarity?: CardRarity;
  isGoalkeeper?: boolean;
}): number {
  const { playerStats, cardType = "PLAYER_STANDARD", rarity = "common", isGoalkeeper = false } = params;

  // 1. Bazowy rating wyjściowy
  let baseOVR = 70;

  // 2. Wpływ realnych statystyk z meczów i treningów
  if (playerStats) {
    const m = playerStats.matches || 0;
    const g = playerStats.goals || 0;
    const a = playerStats.assists || 0;
    const tr = playerStats.trainings || 0;
    const mvp = playerStats.mvp || 0;
    const cs = playerStats.cleanSheets || 0;

    if (isGoalkeeper) {
      baseOVR += Math.min(6, m * 0.5) + Math.min(8, cs * 2) + Math.min(4, tr * 0.3) + Math.min(5, mvp * 2.5);
    } else {
      baseOVR += Math.min(5, m * 0.4) + Math.min(7, g * 0.6) + Math.min(5, a * 0.5) + Math.min(4, tr * 0.25) + Math.min(5, mvp * 2);
    }
  }

  // 3. Bonus typu karty
  const matchedType = Object.values(CENTRAL_CARD_TYPES).find(
    t => t.type === cardType || t.legacyKey === cardType
  );
  if (matchedType) {
    baseOVR += matchedType.ratingBonus;
  }

  // 4. Bonus Rarity (jeśli karta ma wyższy rarity niż domyślny)
  const rarityBonusMap: Record<CardRarity, number> = {
    common: 0,
    rare: 2,
    epic: 4,
    legendary: 6,
    inferno: 9
  };
  baseOVR += (rarityBonusMap[rarity] || 0);

  // Zaokrąglenie do zakresu 65 - 99
  return Math.min(99, Math.max(65, Math.round(baseOVR)));
}
