/**
 * DELTA COLLECTION 3D ENGINE — CANONICAL TYPES
 * Unified data models, theme definitions, and classification mappings.
 */

import type { CardDefinition, CardRarity as ProductionCardRarity, CardType as ProductionCardType } from "../../lib/cards/types.ts";

/**
 * Obowiązująca klasyfikacja rzadkości DELTA Collection (Użytkownik / Game Design):
 * COMMON, RARE, GOLD, MATCHDAY, INFERNO, LEGEND.
 */
export type CollectionCategory =
  | "COMMON"
  | "RARE"
  | "GOLD"
  | "MATCHDAY"
  | "INFERNO"
  | "LEGEND";

/**
 * Typy wizualne skórek kart w silniku 3D:
 */
export type CardVisualType =
  | "INFERNO_ULTRA"
  | "GOLD_MASTER"
  | "MATCHDAY_HERO"
  | "DELTA_ICON"
  | "TRAINING_HERO"
  | "BASE"
  | "STAR_PLAYER"
  | "SEASONAL_EVENT";

export interface PlayerStats {
  pac: number; // Tempo
  sho: number; // Strzał
  pas: number; // Podania
  dri: number; // Drybling
  def: number; // Defensywa
  phy: number; // Fizyczność
}

export type PlayerPosition = "FWD" | "MID" | "DEF" | "GK" | string;

export interface SpecialTitleBadge {
  id: string;
  label: string;
  category: "captain" | "hattrick" | "mvp" | "training" | "matchday" | "milestone";
  iconName: string;
  theme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
    accent: string;
    shimmer?: string;
  };
}

/**
 * Ujednolicony model danych zawodnika dla silnika Card3DEngine
 */
export interface PlayerCardData {
  playerId: string;
  imageUrl: string;
  surname: string;
  shirtNumber: string | number;
  position: PlayerPosition;
  ovr: number;
  stats: PlayerStats;
  visualType: CardVisualType;
  rarity: CollectionCategory;
  specialTitleId?: string | null;
  season?: string;

  cardId?: string;
  isDuplicate?: boolean;
  duplicatePoints?: number;
  instanceId?: string | null;

  /**
   * Jawne rozdzielenie danych ekonomicznych i prezentacyjnych:
   * Oryginalne dane produkcyjne zachowywane bezstratnie dla round-trip i bezpieczeństwa ekonomii gry.
   */
  economicRarity?: ProductionCardRarity;
  productionCardType?: ProductionCardType | string;
  rawDefinition?: Partial<CardDefinition>;
}

/**
 * Konfiguracja zasobów i stylu motywu wizualnego karty
 */
export interface CardVisualTheme {
  id: CardVisualType;
  category: CollectionCategory;
  displayName: string;
  seriesLabel: string;
  badgeLabel: string;
  assets: {
    frameImg: string;
    frontBg: string;
    backBg: string;
    fxImg?: string;
    crestImg?: string;
  };
  styling: {
    primaryColor: string;
    secondaryColor: string;
    accentGlow: string;
    borderGradient: string;
    fontAccentColor: string;
    foilType: "none" | "subtle" | "holographic" | "gold_refractor" | "inferno_lava" | "cosmic";
    slabDepthPx: number;
    hasEmbers: boolean;
    emberColor?: string;
    themeClass: string;
  };
  stage: {
    coreGlowColor: string;
    reflectorLeft: string;
    reflectorRight: string;
    pulseColor: string;
  };
}

export interface Card3DEngineProps {
  data: PlayerCardData;
  theme?: CardVisualTheme;
  isFlipped?: boolean;
  autoRotate?: boolean;
  isRevealing?: boolean;
  isRevealingTitle?: boolean;
  showSpecialTitleGlow?: boolean;
  interactive?: boolean;
  tiltSensitivity?: number;
  maxTiltAngle?: number;
  enableHolo?: boolean;
  enableParallax?: boolean;
  yaw?: number;
  pitch?: number;
  onRotationChange?: (yaw: number, pitch: number) => void;
  className?: string;
  width?: number;
  height?: number;
}

export type { ProductionCardRarity, ProductionCardType, CardDefinition };
