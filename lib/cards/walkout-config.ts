import { MEDIA } from "@/lib/media";

export type WalkoutRarity = 
  | "INFERNO" 
  | "STANDARD" 
  | "TRAINING_HERO" 
  | "MATCHDAY_HERO" 
  | "GOLD_MASTER" 
  | "DELTA_ICON"
  | string;

export type InfernoWalkoutData = {
  rarity: WalkoutRarity;
  playerName: string;
  rating?: number;
  position?: string;
  teamName?: string;
  playerImage: string;   // PNG cutout zawodnika bez tła
  cardImage: string;     // finalna karta PNG / WebP
  backgroundVideo: string; // mp4 z cinematic stadium/tunnel
  clubLogo?: string;
  accentColor?: string; // default: klubowa czerwień (#e11d48 / #dc2626)
  playerTransform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
  };
  cardTransform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
  };
};

export interface RarityThemeConfig {
  id: string;
  name: string;
  title: string;
  kicker: string;
  accentColor: string;
  secondaryColor: string;
  glowColor: string;
  defaultVideo: string;
  particleTheme: "inferno" | "gold" | "legend" | "standard";
}

export const WALKOUT_RARITY_CONFIGS: Record<string, RarityThemeConfig> = {
  INFERNO: {
    id: "INFERNO",
    name: "INFERNO ULTRA",
    title: "INFERNO",
    kicker: "ULTRA RARE WALKOUT",
    accentColor: "#ff2a3b",
    secondaryColor: "#ff8400",
    glowColor: "rgba(255, 42, 59, 0.6)",
    defaultVideo: MEDIA.packOpening.bgInferno || "/sounds/inferno-bg.mp4",
    particleTheme: "inferno"
  },
  GOLD_MASTER: {
    id: "GOLD_MASTER",
    name: "GOLD MASTER",
    title: "GOLD MASTER",
    kicker: "ELITE PACK WALKOUT",
    accentColor: "#f1c95c",
    secondaryColor: "#eab308",
    glowColor: "rgba(241, 201, 92, 0.6)",
    defaultVideo: MEDIA.packOpening.bgGold,
    particleTheme: "gold"
  },
  DELTA_ICON: {
    id: "DELTA_ICON",
    name: "DELTA ICON",
    title: "DELTA ICON",
    kicker: "LEGENDARY WALKOUT",
    accentColor: "#ffd700",
    secondaryColor: "#ffffff",
    glowColor: "rgba(255, 215, 0, 0.65)",
    defaultVideo: MEDIA.packOpening.bgLegend,
    particleTheme: "legend"
  },
  MATCHDAY_HERO: {
    id: "MATCHDAY_HERO",
    name: "MATCHDAY HERO",
    title: "MATCHDAY HERO",
    kicker: "MATCHDAY SPECIAL",
    accentColor: "#38bdf8",
    secondaryColor: "#0284c7",
    glowColor: "rgba(56, 189, 248, 0.6)",
    defaultVideo: MEDIA.packOpening.bgMatchday,
    particleTheme: "legend"
  },
  TRAINING_HERO: {
    id: "TRAINING_HERO",
    name: "TRAINING HERO",
    title: "WARRIOR HERO",
    kicker: "TRAINING MASTERY",
    accentColor: "#34d399",
    secondaryColor: "#059669",
    glowColor: "rgba(52, 211, 153, 0.6)",
    defaultVideo: MEDIA.packOpening.bgMatchday,
    particleTheme: "legend"
  }
};

export const DEMO_INFERNO_DATA: InfernoWalkoutData = {
  rarity: "INFERNO",
  playerName: "Ryszard Rybacki",
  rating: 99,
  position: "RW / NAPASTNIK",
  teamName: "K.S. DELTA WARSZAWA 2018 GM",
  playerImage: "/assets/players/ryszard-inferno.png",
  cardImage: "/assets/players/ryszard-card-inferno.jpg",
  backgroundVideo: MEDIA.packOpening.bgInferno || MEDIA.intro.inferno,
  clubLogo: "/teamlogos/gm.png",
  accentColor: "#ff2a3b",
  playerTransform: {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0
  },
  cardTransform: {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0
  }
};

export const DEMO_GOLD_DATA: InfernoWalkoutData = {
  rarity: "GOLD_MASTER",
  playerName: "Stefan Zieliński",
  rating: 92,
  position: "CAM / POMOCNIK",
  teamName: "K.S. DELTA WARSZAWA 2018 GM",
  playerImage: "/assets/players/ryszard-gold.png",
  cardImage: "/assets/players/ryszard-card-gold.jpg",
  backgroundVideo: MEDIA.packOpening.bgGold,
  clubLogo: "/teamlogos/gm.png",
  accentColor: "#f1c95c",
  playerTransform: {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0
  },
  cardTransform: {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0
  }
};

export function getRarityTheme(rarity: string): RarityThemeConfig {
  const norm = (rarity || "").toUpperCase().replace(/\s+/g, "_");
  return WALKOUT_RARITY_CONFIGS[norm] || WALKOUT_RARITY_CONFIGS.INFERNO;
}

export function cardToWalkoutData(card: any): InfernoWalkoutData {
  const rarityKey = (card?.rarity || "inferno").toUpperCase();
  const theme = getRarityTheme(rarityKey);
  const pName = card?.player?.display_name || card?.title || card?.card_name || "Zawodnik DELTA GM";
  const isRyszard = pName.toLowerCase().includes("ryszard") || pName.toLowerCase().includes("rybacki");

  const playerImg = isRyszard
    ? (rarityKey === "INFERNO" ? "/assets/players/ryszard-inferno.png" : "/assets/players/ryszard-gold.png")
    : (card?.player?.photo_path || "/assets/players/ryszard-inferno.png");

  const cardImg = isRyszard
    ? (rarityKey === "INFERNO" ? "/assets/players/ryszard-card-inferno.jpg" : "/assets/players/ryszard-card-gold.jpg")
    : (card?.artwork_url || "/assets/players/ryszard-card-inferno.jpg");

  return {
    rarity: rarityKey,
    playerName: pName,
    rating: card?.ovr || card?.stats?.overall || (rarityKey === "INFERNO" ? 99 : 92),
    position: card?.player?.position || card?.position || "ZAWODNIK",
    teamName: "K.S. DELTA WARSZAWA 2018 GM",
    playerImage: playerImg,
    cardImage: cardImg,
    backgroundVideo: theme.defaultVideo,
    clubLogo: "/teamlogos/gm.png",
    accentColor: theme.accentColor,
    playerTransform: {
      x: -110,
      y: 0,
      scale: 1.0,
      rotate: 0
    },
    cardTransform: {
      x: 100,
      y: 0,
      scale: 1.05,
      rotate: 0
    }
  };
}
