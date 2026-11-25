import { MEDIA } from "../media.ts";
import { isRyszardPlayer, resolveSafePlayerImageUrl, sanitizePlayerPhotoCandidate } from "./playerVisuals.ts";

export type CanonicalCardTheme = 
  | "INFERNO" 
  | "DELTA_ICON" 
  | "GOLD_MASTER" 
  | "MATCHDAY_HERO" 
  | "SEASONAL_EVENT" 
  | "CAPTAIN" 
  | "GOAL_MACHINE" 
  | "TRAINING_HERO" 
  | "STANDARD";

export type InfernoWalkoutData = {
  theme: CanonicalCardTheme | string;
  playerName: string;
  position?: string;
  teamName?: string;
  playerImage: string | null;   // PNG cutout zawodnika bez tła lub null (neutralna sylwetka)
  cardImage: string | null;     // finalna karta PNG / WebP lub null (neutralne tło serii)
  backgroundVideo: string; // mp4 z cinematic stadium/tunnel
  clubLogo?: string;
  accentColor?: string;
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

export const WALKOUT_THEME_CONFIGS: Record<string, RarityThemeConfig> = {
  INFERNO: {
    id: "INFERNO",
    name: "INFERNO ULTRA",
    title: "INFERNO",
    kicker: "INFERNO SPECIAL",
    accentColor: "#ff2a3b",
    secondaryColor: "#ff8400",
    glowColor: "rgba(255, 42, 59, 0.6)",
    defaultVideo: MEDIA.packOpening.bgInferno || "/media/walkouts/inferno-bg.mp4",
    particleTheme: "inferno"
  },
  DELTA_ICON: {
    id: "DELTA_ICON",
    name: "DELTA ICON",
    title: "DELTA ICON",
    kicker: "DELTA ICON SPECIAL",
    accentColor: "#ffd700",
    secondaryColor: "#ffffff",
    glowColor: "rgba(255, 215, 0, 0.65)",
    defaultVideo: MEDIA.packOpening.bgLegend,
    particleTheme: "legend"
  },
  GOLD_MASTER: {
    id: "GOLD_MASTER",
    name: "GOLD MASTER",
    title: "GOLD MASTER",
    kicker: "GOLD MASTER SPECIAL",
    accentColor: "#f1c95c",
    secondaryColor: "#eab308",
    glowColor: "rgba(241, 201, 92, 0.6)",
    defaultVideo: MEDIA.packOpening.bgGold,
    particleTheme: "gold"
  },
  MATCHDAY_HERO: {
    id: "MATCHDAY_HERO",
    name: "MATCHDAY HERO",
    title: "MATCHDAY HERO",
    kicker: "MATCHDAY HERO SPECIAL",
    accentColor: "#38bdf8",
    secondaryColor: "#0284c7",
    glowColor: "rgba(56, 189, 248, 0.6)",
    defaultVideo: MEDIA.packOpening.bgMatchday,
    particleTheme: "legend"
  },
  SEASONAL_EVENT: {
    id: "SEASONAL_EVENT",
    name: "SEASONAL EVENT",
    title: "SEASONAL EVENT",
    kicker: "SPECIAL EVENT EDITION",
    accentColor: "#a855f7",
    secondaryColor: "#6366f1",
    glowColor: "rgba(168, 85, 247, 0.6)",
    defaultVideo: MEDIA.packOpening.bgEpicPortal,
    particleTheme: "legend"
  },
  TRAINING_HERO: {
    id: "TRAINING_HERO",
    name: "TRAINING HERO",
    title: "TRAINING HERO",
    kicker: "TRAINING SPECIAL",
    accentColor: "#34d399",
    secondaryColor: "#059669",
    glowColor: "rgba(52, 211, 153, 0.6)",
    defaultVideo: MEDIA.packOpening.bgMatchday,
    particleTheme: "legend"
  }
};

/**
 * Explicit presentation priority for cinematic Walkout selection.
 * Pure presentation ordering — not a game stat or OVR rating.
 */
export const WALKOUT_PRESENTATION_PRIORITY: Record<string, number> = {
  INFERNO: 100,
  DELTA_ICON: 80,
  GOLD_MASTER: 60,
  MATCHDAY_HERO: 40,
  SEASONAL_EVENT: 30
};

export function normalizeCardTheme(rawTypeOrTheme?: string | null): CanonicalCardTheme {
  if (!rawTypeOrTheme) return "STANDARD";
  const upper = rawTypeOrTheme.toUpperCase().trim().replace(/[\s-]+/g, "_");
  if (upper.includes("INFERNO")) return "INFERNO";
  if (upper.includes("DELTA_ICON") || upper.includes("ICON") || upper.includes("LEGEND")) return "DELTA_ICON";
  if (upper.includes("GOLD_MASTER") || upper.includes("GOLD")) return "GOLD_MASTER";
  if (upper.includes("MATCHDAY_HERO") || upper.includes("MATCHDAY")) return "MATCHDAY_HERO";
  if (upper.includes("SEASONAL") || upper.includes("EVENT") || upper.includes("SPECIAL_EVENT")) return "SEASONAL_EVENT";
  if (upper.includes("CAPTAIN")) return "CAPTAIN";
  if (upper.includes("GOAL_MACHINE") || upper.includes("GOAL_HUNTER")) return "GOAL_MACHINE";
  if (upper.includes("TRAINING_HERO") || upper.includes("TRAINING") || upper.includes("WARRIOR")) return "TRAINING_HERO";
  return "STANDARD";
}

export function isWalkoutEligibleTheme(theme: string): boolean {
  const norm = normalizeCardTheme(theme);
  return (WALKOUT_PRESENTATION_PRIORITY[norm] || 0) > 0;
}

/**
 * Normalizes walkout theme & priority from `card_type`, `frame_theme`, and `rarity`.
 * Ensures:
 * - `rarity="legendary"` / `frame_theme="legend"` qualifies for DELTA_ICON (80) even if `card_type="mvp"`
 * - `rarity="epic"` / `frame_theme="gold"` qualifies for GOLD_MASTER (60) even if `card_type="goal_hunter"`
 * - starter `base` (`common`) / `training_warrior` (`rare`) with generic `frame_theme="gold"` do NOT false-escalate
 */
export function resolveWalkoutPresentation(card: {
  card_type?: string | null;
  frame_theme?: string | null;
  rarity?: string | null;
}): { theme: CanonicalCardTheme; priority: number } {
  const normType = (card.card_type || "").toLowerCase().trim();
  const normFrame = (card.frame_theme || "").toLowerCase().trim();
  const normRarity = (card.rarity || "").toLowerCase().trim();

  let rarityTheme: CanonicalCardTheme = "STANDARD";
  if (normRarity === "inferno") rarityTheme = "INFERNO";
  else if (normRarity === "legendary") rarityTheme = "DELTA_ICON";
  else if (normRarity === "epic") rarityTheme = "GOLD_MASTER";

  const typeTheme = normalizeCardTheme(normType);
  let frameTheme: CanonicalCardTheme = normFrame ? normalizeCardTheme(normFrame) : "STANDARD";

  const isLowTierStarterType =
    normType === "base" ||
    normType === "standard" ||
    normType === "training_warrior" ||
    normType === "training" ||
    normType === "matchday" ||
    normType === "matchday_hero";

  if (
    frameTheme === "GOLD_MASTER" &&
    (normRarity === "common" || normRarity === "rare") &&
    isLowTierStarterType &&
    !normFrame.includes("gold_master")
  ) {
    frameTheme = "STANDARD";
  }

  const candidates: Array<{ theme: CanonicalCardTheme; priority: number }> = [
    { theme: rarityTheme, priority: WALKOUT_PRESENTATION_PRIORITY[rarityTheme] || 0 },
    { theme: typeTheme, priority: WALKOUT_PRESENTATION_PRIORITY[typeTheme] || 0 },
    { theme: frameTheme, priority: WALKOUT_PRESENTATION_PRIORITY[frameTheme] || 0 }
  ];

  candidates.sort((a, b) => b.priority - a.priority);
  if (candidates[0].priority > 0) {
    return candidates[0];
  }

  return {
    theme: typeTheme !== "STANDARD" ? typeTheme : frameTheme,
    priority: 0
  };
}

export function getRarityTheme(theme: string): RarityThemeConfig {
  const norm = normalizeCardTheme(theme);
  return WALKOUT_THEME_CONFIGS[norm] || WALKOUT_THEME_CONFIGS.GOLD_MASTER;
}

export const DEMO_INFERNO_DATA: InfernoWalkoutData = {
  theme: "INFERNO",
  playerName: "Ryszard Rybacki",
  position: "RW / NAPASTNIK",
  teamName: "K.S. DELTA WARSZAWA 2018 GM",
  playerImage: "/demo/player-cutout.png",
  cardImage: "/demo/inferno-card.png",
  backgroundVideo: MEDIA.packOpening.bgInferno || "/media/walkouts/inferno-bg.mp4",
  clubLogo: "/demo/delta-logo.png",
  accentColor: "#ff2a3b",
  playerTransform: {
    x: -21,
    y: -24,
    scale: 1.05,
    rotate: 0
  },
  cardTransform: {
    x: -2,
    y: -78,
    scale: 1.3,
    rotate: 0
  }
};

export const DEMO_GOLD_DATA: InfernoWalkoutData = {
  theme: "GOLD_MASTER",
  playerName: "Stefan Zieliński",
  position: "CAM / POMOCNIK",
  teamName: "K.S. DELTA WARSZAWA 2018 GM",
  playerImage: null,
  cardImage: null,
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

export function cardToWalkoutData(card: any): InfernoWalkoutData {
  const { theme: themeKey } = resolveWalkoutPresentation(card || {});
  const theme = getRarityTheme(themeKey);
  const pName = card?.player?.display_name || card?.title || card?.card_name || "Zawodnik DELTA GM";
  const isRyszard = isRyszardPlayer(pName, card?.card_name);

  const playerImg =
    resolveSafePlayerImageUrl({
      playerName: pName,
      cardName: card?.card_name,
      cutoutUrl: card?.player?.cutout_url,
      photoPath: card?.player?.photo_path,
      artworkUrl: card?.artwork_url,
      preferArtworkUrl: false
    }) ||
    (isRyszard
      ? (themeKey === "INFERNO" ? "/assets/players/ryszard-inferno.png" : "/assets/players/ryszard-gold.png")
      : null);

  const cardImg =
    sanitizePlayerPhotoCandidate(card?.artwork_url || card?.image_url, pName, card?.card_name) ||
    (isRyszard
      ? (themeKey === "INFERNO" ? "/assets/players/ryszard-card-inferno.jpg" : "/assets/players/ryszard-card-gold.jpg")
      : null);

  return {
    theme: themeKey,
    playerName: pName,
    position: card?.player?.position || card?.position || "ZAWODNIK",
    teamName: "K.S. DELTA WARSZAWA 2018 GM",
    playerImage: playerImg,
    cardImage: cardImg,
    backgroundVideo: theme.defaultVideo,
    clubLogo: "/teamlogos/gm.png",
    accentColor: theme.accentColor,
    playerTransform: {
      x: -21,
      y: -24,
      scale: 1.05,
      rotate: 0
    },
    cardTransform: {
      x: -2,
      y: -78,
      scale: 1.3,
      rotate: 0
    }
  };
}
