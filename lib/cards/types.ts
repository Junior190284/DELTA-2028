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
  theme: "gold" | "inferno" | "legend" | "matchday" | "standard" | string;
  image_url?: string;
  is_active: boolean;
}

export function getPackImageUrl(packId?: string, theme?: string): string {
  const id = (packId || "").toLowerCase();
  const th = (theme || "").toLowerCase();
  if (id.includes("inferno") || th === "inferno") return "/assets/packs/pack-inferno.jpg";
  if (id.includes("legend") || th === "legend") return "/assets/packs/pack-legend.jpg";
  if (id.includes("matchday") || th === "matchday") return "/assets/packs/pack-matchday.jpg";
  if (id.includes("gold") || th === "gold") return "/assets/packs/pack-gold.jpg";
  return "/assets/packs/pack-standard.jpg";
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

export type CardTemplateKey = "base" | "matchday" | "gold" | "legend" | "inferno" | "panini" | "training";

export interface CardLayoutConfig {
  scale: number; // 0.5 to 2.5
  translateX: number; // percentage (-50% to +50%)
  translateY: number; // percentage (-50% to +50%)
  rotate?: number; // degrees (-45 to +45)
  brightness?: number; // 0.5 to 1.5
  contrast?: number; // 0.5 to 1.5
  photoUrl?: string | null;
}

export interface PlayerCardLayoutRow {
  id?: string;
  player_id: string;
  template_key: string;
  photo_url?: string | null;
  scale: number;
  translate_x: number;
  translate_y: number;
  rotate?: number;
  brightness?: number;
  contrast?: number;
  updated_at?: string;
}

export const DEFAULT_TEMPLATE_LAYOUTS: Record<CardTemplateKey, CardLayoutConfig> = {
  base: { scale: 1.15, translateX: 0, translateY: 4, rotate: 0, brightness: 1.0, contrast: 1.0 },
  matchday: { scale: 1.05, translateX: 0, translateY: -2, rotate: 0, brightness: 1.05, contrast: 1.05 },
  gold: { scale: 1.08, translateX: 0, translateY: -4, rotate: 0, brightness: 1.1, contrast: 1.08 },
  legend: { scale: 1.12, translateX: 0, translateY: -5, rotate: 0, brightness: 1.12, contrast: 1.1 },
  inferno: { scale: 1.15, translateX: 0, translateY: -6, rotate: 0, brightness: 1.15, contrast: 1.15 },
  panini: { scale: 0.95, translateX: 0, translateY: 2, rotate: 0, brightness: 1.0, contrast: 1.0 },
  training: { scale: 1.05, translateX: 0, translateY: -2, rotate: 0, brightness: 1.05, contrast: 1.05 }
};

export const CARD_THEME_ASSETS: Record<CardTemplateKey, {
  background: string;
  frame: string;
  fx: string;
  backBg: string;
}> = {
  base: {
    background: "/assets/cards/base/base-background.png",
    frame: "/assets/cards/base/base-frame.png",
    fx: "/assets/cards/base/base-fx.png",
    backBg: "/assets/cards/base/base-back-bg.png"
  },
  matchday: {
    background: "/assets/cards/matchday-hero/matchday-hero-background.png",
    frame: "/assets/cards/matchday-hero/matchday-hero-frame.png",
    fx: "/assets/cards/matchday-hero/matchday-hero-fx.png",
    backBg: "/assets/cards/matchday-hero/matchday-hero-back-bg.png"
  },
  gold: {
    background: "/assets/cards/gold-master/gold-master-background.png",
    frame: "/assets/cards/gold-master/gold-master-frame.png",
    fx: "/assets/cards/gold-master/gold-master-fx.png",
    backBg: "/assets/cards/gold-master/gold-master-back-bg.png"
  },
  legend: {
    background: "/assets/cards/delta-icon/delta-icon-background.png",
    frame: "/assets/cards/delta-icon/delta-icon-frame.png",
    fx: "/assets/cards/delta-icon/delta-icon-fx.png",
    backBg: "/assets/cards/delta-icon/delta-icon-back-bg.png"
  },
  inferno: {
    background: "/assets/cards/inferno-ultra/inferno-ultra-background.png",
    frame: "/assets/cards/inferno-ultra/inferno-ultra-frame.png",
    fx: "/assets/cards/inferno-ultra/inferno-ultra-fx.png",
    backBg: "/assets/cards/inferno-ultra/inferno-ultra-back-bg.png"
  },
  training: {
    background: "/assets/cards/training-hero/training-hero-background.png",
    frame: "/assets/cards/training-hero/training-hero-frame.png",
    fx: "/assets/cards/training-hero/training-hero-fx.png",
    backBg: "/assets/cards/training-hero/training-hero-back-bg.png"
  },
  panini: {
    background: "/assets/cards/base/base-background.png",
    frame: "/assets/cards/base/base-frame.png",
    fx: "/assets/cards/base/base-fx.png",
    backBg: "/assets/cards/base/base-back-bg.png"
  }
};

export function resolveCardTemplateKey(card?: CardDefinition, templateOverride?: CardTemplateKey): CardTemplateKey {
  if (templateOverride) return templateOverride;
  const r = (card?.rarity || "common").toLowerCase();
  const t = (card?.card_type || "").toLowerCase();
  if (t.includes("training") || t.includes("warrior")) return "training";
  if (r === "inferno" || t.includes("inferno")) return "inferno";
  if (r === "legendary" || t.includes("legend")) return "legend";
  if (r === "epic" || t.includes("gold") || t.includes("mvp")) return "gold";
  if (r === "rare" || t.includes("matchday")) return "matchday";
  if (t.includes("panini")) return "panini";
  return "base";
}

export function getCardAllAssetUrls(card?: CardDefinition, templateOverride?: CardTemplateKey): string[] {
  const key = resolveCardTemplateKey(card, templateOverride);
  const theme = CARD_THEME_ASSETS[key] || CARD_THEME_ASSETS.base;
  const urls: string[] = [
    theme.background,
    theme.frame,
    theme.fx,
    theme.backBg,
    "/teamlogos/gm.png"
  ];

  if (card?.artwork_url) urls.push(card.artwork_url);
  if (card?.player?.photo_path) urls.push(card.player.photo_path);

  const pName = (card?.player?.display_name || card?.card_name || "").toLowerCase();
  if (pName.includes("ryszard") || pName.includes("rybacki")) {
    if (key === "inferno") urls.push("/assets/players/ryszard-inferno.png");
    else if (key === "legend") urls.push("/assets/players/ryszard-legend.png");
    else if (key === "gold") urls.push("/assets/players/ryszard-gold.png");
    else urls.push("/assets/players/ryszard-rybacki.png");
  }

  return urls.filter(Boolean);
}

export async function preloadCardAssets(card?: CardDefinition, templateOverride?: CardTemplateKey): Promise<void> {
  if (typeof window === "undefined") return;
  const urls = getCardAllAssetUrls(card, templateOverride);
  
  const promises = urls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.src = url;
      if (img.complete) {
        if ("decode" in img) {
          img.decode().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      } else {
        img.onload = () => {
          if ("decode" in img) {
            img.decode().then(resolve).catch(resolve);
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
      }
    });
  });

  await Promise.all(promises);
}

export async function preloadAllCardThemes(): Promise<void> {
  if (typeof window === "undefined") return;
  const allUrls: string[] = [
    "/teamlogos/gm.png",
    "/assets/players/ryszard-rybacki.png",
    "/assets/players/ryszard-inferno.png",
    "/assets/players/ryszard-gold.png",
    "/assets/players/ryszard-legend.png"
  ];

  Object.values(CARD_THEME_ASSETS).forEach(theme => {
    allUrls.push(theme.background, theme.frame, theme.fx, theme.backBg);
  });

  const promises = allUrls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.src = url;
      if (img.complete) {
        if ("decode" in img) {
          img.decode().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      } else {
        img.onload = () => {
          if ("decode" in img) {
            img.decode().then(resolve).catch(resolve);
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
      }
    });
  });

  await Promise.all(promises);
}

