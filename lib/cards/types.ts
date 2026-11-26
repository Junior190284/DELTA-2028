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

export type PackTheme = "standard" | "matchday" | "gold" | "inferno" | "legend";

export interface CanonicalPackConfig {
  id: string;
  name: string;
  cardsCount: number;
  theme: PackTheme;
  minRarity: CardRarity;
  imageUrl: string;
  cutoutUrl: string;
  stadiumUrl: string;
  guaranteeText: string;
  description: string;
}

export const CANONICAL_PACK_CONFIGS: Record<string, CanonicalPackConfig> = {
  standard_pack: {
    id: "standard_pack",
    name: "Paczka Standardowa",
    cardsCount: 3,
    theme: "standard",
    minRarity: "common",
    imageUrl: "/assets/packs/pack-standard.jpg",
    cutoutUrl: "/media/walkouts/delta-standard-pack-cutout.webp",
    stadiumUrl: "/media/walkouts/delta-standard-stadium.webp",
    guaranteeText: "3 losowe karty zawodników DELTA",
    description: "Podstawowy pakiet kolekcjonerski zawierający 3 karty zawodników rocznika 2018."
  },
  matchday_booster: {
    id: "matchday_booster",
    name: "Matchday Booster",
    cardsCount: 4,
    theme: "matchday",
    minRarity: "rare",
    imageUrl: "/assets/packs/pack-matchday.jpg",
    cutoutUrl: "/media/walkouts/delta-matchday-pack-cutout.webp",
    stadiumUrl: "/media/walkouts/delta-matchday-stadium.webp",
    guaranteeText: "Min. 1 karta Matchday Hero",
    description: "Specjalny booster meczowy nagradzający ligowe występy i determinację na boisku."
  },
  gold_booster: {
    id: "gold_booster",
    name: "Gold Booster",
    cardsCount: 5,
    theme: "gold",
    minRarity: "rare",
    imageUrl: "/assets/packs/pack-gold.jpg",
    cutoutUrl: "/media/walkouts/delta-gold-pack-cutout.webp",
    stadiumUrl: "/media/walkouts/delta-gold-stadium.webp",
    guaranteeText: "Min. 1 karta Gold Master (wysoki OVR)",
    description: "Ekskluzywny booster z gwarancją złotej karty elity o wysokich statystykach OVR."
  },
  inferno_booster: {
    id: "inferno_booster",
    name: "🔥 Inferno Booster",
    cardsCount: 5,
    theme: "inferno",
    minRarity: "epic",
    imageUrl: "/assets/packs/pack-inferno.jpg",
    cutoutUrl: "/media/walkouts/delta-inferno-pack-cutout.webp",
    stadiumUrl: "/media/walkouts/delta-inferno-red-stadium.webp",
    guaranteeText: "Gwarantowana karta Inferno z płomieniami",
    description: "Ognisty booster premium zawierający najgorętsze karty w unikalnej oprawie INFERNO."
  },
  legend_pack: {
    id: "legend_pack",
    name: "👑 Legend Pack",
    cardsCount: 6,
    theme: "legend",
    minRarity: "legendary",
    imageUrl: "/assets/packs/pack-legend.jpg",
    cutoutUrl: "/media/walkouts/delta-legend-pack-cutout.webp",
    stadiumUrl: "/media/walkouts/delta-legend-stadium.webp",
    guaranteeText: "Gwarantowana karta Legendy",
    description: "Królewski booster legendarny z gwarancją karty mistrzowskiej."
  },
  legend_booster: {
    id: "legend_booster",
    name: "👑 Legend Booster",
    cardsCount: 6,
    theme: "legend",
    minRarity: "legendary",
    imageUrl: "/assets/packs/pack-legend.jpg",
    cutoutUrl: "/media/walkouts/delta-legend-pack-cutout.webp",
    stadiumUrl: "/media/walkouts/delta-legend-stadium.webp",
    guaranteeText: "Gwarantowana karta Legendy",
    description: "Królewski booster legendarny z gwarancją karty mistrzowskiej."
  }
};

export function resolveCanonicalPackTheme(packId?: string, fallbackTheme?: string): PackTheme {
  const id = (packId || "").toLowerCase();
  if (id.includes("standard")) return "standard";
  if (id.includes("matchday")) return "matchday";
  if (id.includes("gold")) return "gold";
  if (id.includes("inferno")) return "inferno";
  if (id.includes("legend")) return "legend";

  const th = (fallbackTheme || "").toLowerCase();
  if (th === "inferno") return "inferno";
  if (th === "legend") return "legend";
  if (th === "gold") return "gold";
  if (th === "matchday") return "matchday";
  return "standard";
}

export function getPackImageUrl(packId?: string, theme?: string): string {
  const canonical = resolveCanonicalPackTheme(packId, theme);
  switch (canonical) {
    case "inferno": return "/assets/packs/pack-inferno.jpg";
    case "legend": return "/assets/packs/pack-legend.jpg";
    case "gold": return "/assets/packs/pack-gold.jpg";
    case "matchday": return "/assets/packs/pack-matchday.jpg";
    case "standard":
    default:
      return "/assets/packs/pack-standard.jpg";
  }
}

export function getPackCutoutUrl(packId?: string, theme?: string): string {
  const canonical = resolveCanonicalPackTheme(packId, theme);
  return `/media/walkouts/delta-${canonical}-pack-cutout.webp`;
}

export function getPackStadiumUrl(packId?: string, theme?: string): string {
  const canonical = resolveCanonicalPackTheme(packId, theme);
  if (canonical === "inferno") return "/media/walkouts/delta-inferno-red-stadium.webp";
  return `/media/walkouts/delta-${canonical}-stadium.webp`;
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
  consumed_pack_id?: string | null;
  remaining_unopened_packs_count?: number;
  enable_3d_walkout?: boolean;
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
    duplicatePoints: 4
  },
  rare: {
    label: "RARE",
    color: "#38bdf8",
    bgGradient: "linear-gradient(135deg, #0369a1, #0c4a6e)",
    borderGlow: "rgba(56, 189, 248, 0.6)",
    duplicatePoints: 10
  },
  epic: {
    label: "EPIC",
    color: "#c084fc",
    bgGradient: "linear-gradient(135deg, #6b21a8, #3b0764)",
    borderGlow: "rgba(192, 132, 252, 0.75)",
    duplicatePoints: 25
  },
  legendary: {
    label: "LEGENDARY",
    color: "#f1c95c",
    bgGradient: "linear-gradient(135deg, #ca8a04, #713f12)",
    borderGlow: "rgba(241, 201, 92, 0.85)",
    duplicatePoints: 60
  },
  inferno: {
    label: "INFERNO",
    color: "#ff4d5a",
    bgGradient: "linear-gradient(135deg, #b91c1c, #450a0a)",
    borderGlow: "rgba(255, 77, 90, 0.95)",
    duplicatePoints: 120
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

