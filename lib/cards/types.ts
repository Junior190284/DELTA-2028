export type CardRarity = "common" | "rare" | "epic" | "legendary" | "inferno";

export type CardType = 
  | "base"
  | "matchday"
  | "training_warrior"
  | "goal_hunter"
  | "mvp"
  | "inferno"
  | "hat_trick_hero"
  | "captain"
  | "iron_player"
  | "rookie"
  | "tournament"
  | "winter_edition"
  | "finals"
  | "team_of_the_month"
  | "legend"
  | "special_event";

export interface CardDefinition {
  id: string;
  player_id: string;
  season: string;
  card_type: CardType | string;
  card_name: string;
  title: string;
  rarity: CardRarity;
  artwork_url: string | null;
  artwork_pose: string | null;
  frame_theme: string | null;
  card_number: number | null;
  is_active: boolean;
  is_limited: boolean;
  edition_size: number | null;
  description: string | null;
  lore: string | null;
  match_id: string | null;
  special_event_id: string | null;
  created_at?: string;
  // Joined player data
  player?: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
    photo_path?: string | null;
  };
  // Joined match data for historical lore
  match?: {
    id: string;
    match_date: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
  } | null;
}

export interface PackDefinition {
  id: string;
  name: string;
  description: string | null;
  cards_count: number;
  drop_rates: Record<CardRarity, number>;
  min_rarity: CardRarity;
  theme: "gold" | "inferno" | "legend" | string;
  is_active: boolean;
}

export interface UserUnopenedPack {
  id: string;
  user_id: string;
  pack_type_id: string;
  source_reason: string | null;
  is_opened: boolean;
  opened_at: string | null;
  created_at: string;
  pack_definition?: PackDefinition;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  acquired_at: string;
  duplicates_count: number;
  is_favorite: boolean;
  card_definition: CardDefinition;
}

export interface PackOpeningResult {
  cards: {
    card: CardDefinition;
    is_duplicate: boolean;
    duplicate_points: number;
  }[];
  total_delta_points_earned: number;
  new_points_balance: number;
  pack_type_id: string;
}

export const RARITY_CONFIG: Record<CardRarity, {
  label: string;
  color: string;
  bgGradient: string;
  borderGlow: string;
  duplicatePoints: number;
  revealSound?: string;
}> = {
  common: {
    label: "COMMON",
    color: "#9ca3af",
    bgGradient: "linear-gradient(135deg, #1e293b, #0f172a)",
    borderGlow: "rgba(156, 163, 175, 0.4)",
    duplicatePoints: 10
  },
  rare: {
    label: "RARE",
    color: "#38bdf8",
    bgGradient: "linear-gradient(135deg, #0369a1, #0c4a6e)",
    borderGlow: "rgba(56, 189, 248, 0.6)",
    duplicatePoints: 20
  },
  epic: {
    label: "EPIC",
    color: "#c084fc",
    bgGradient: "linear-gradient(135deg, #6b21a8, #3b0764)",
    borderGlow: "rgba(192, 132, 252, 0.75)",
    duplicatePoints: 50
  },
  legendary: {
    label: "LEGENDARY",
    color: "#f1c95c",
    bgGradient: "linear-gradient(135deg, #ca8a04, #713f12)",
    borderGlow: "rgba(241, 201, 92, 0.85)",
    duplicatePoints: 100
  },
  inferno: {
    label: "INFERNO",
    color: "#ff4d5a",
    bgGradient: "linear-gradient(135deg, #b91c1c, #450a0a)",
    borderGlow: "rgba(255, 77, 90, 0.95)",
    duplicatePoints: 250
  }
};

export const CARD_TYPES_CONFIG: Record<string, {
  name: string;
  defaultRarity: CardRarity;
  description: string;
}> = {
  base: {
    name: "BASE",
    defaultRarity: "common",
    description: "Karta bazowa zawodnika w kadrze DELTA 2018 GM."
  },
  matchday: {
    name: "MATCHDAY",
    defaultRarity: "rare",
    description: "Oficjalna karta meczowa. Gotowość i skupienie w dniu meczu."
  },
  training_warrior: {
    name: "TRAINING WARRIOR",
    defaultRarity: "rare",
    description: "Karta wojownika treningu. Nagroda za zaangażowanie i ciężką pracę na treningach."
  },
  goal_hunter: {
    name: "GOAL HUNTER",
    defaultRarity: "epic",
    description: "Karta łowcy bramek. Niezawodny instynkt strzelecki i dynamika w polu karnym."
  },
  mvp: {
    name: "MVP",
    defaultRarity: "legendary",
    description: "Królewskie wyróżnienie MVP meczu. Bohater spotkania i filar zespołu."
  },
  inferno: {
    name: "INFERNO",
    defaultRarity: "inferno",
    description: "Płonąca potęga DELTA INFERNO. Najrzadsza i najbardziej pożądana edycja klubowa."
  },
  hat_trick_hero: {
    name: "HAT-TRICK HERO",
    defaultRarity: "legendary",
    description: "Karta pamiątkowa za zdobycie trzech lub więcej bramek w jednym spotkaniu."
  },
  captain: {
    name: "CAPTAIN",
    defaultRarity: "epic",
    description: "Opaska kapitańska i wyprowadzenie drużyny DELTY na murawę."
  }
};
