import { CardDefinition, CardRarity, UserCard, CardLayoutConfig } from "./types";

export type DeltaCardTheme = 
  | "STANDARD"
  | "TRAINING_HERO"
  | "GOAL_MACHINE"
  | "CAPTAIN"
  | "MATCHDAY_HERO"
  | "DELTA_ICON"
  | "GOLD_MASTER"
  | "INFERNO"
  | "SEASONAL_EVENT";

export type DeltaCardSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero" | "responsive";

export interface DeltaCardStatItem {
  key: string;
  label: string;
  value: string | number;
  icon?: string;
}

export interface DeltaCardBackData {
  season?: string;
  seriesName?: string;
  seriesCode?: string;
  cardId?: string;
  obtainedAt?: string | null;
  sourceReason?: string | null;
  lore?: string | null;
  milestoneBadge?: {
    label: string;
    icon: string;
    color: string;
  } | null;
}

export interface DeltaCardModel {
  id: string;
  playerId: string;
  playerName: string;
  shirtNumber?: string | null;
  position?: string | null;
  playerImage?: string | null;
  cardType: DeltaCardTheme;
  rarity: CardRarity;
  frameTheme?: string | null;
  artworkPose?: string | null;
  stats?: DeltaCardStatItem[];
  duplicatesCount?: number;
  isFavorite?: boolean;
  obtainedAt?: string | null;
  isOwned?: boolean;
  isLocked?: boolean;
  layoutOverride?: Partial<CardLayoutConfig>;
  backData?: DeltaCardBackData;
}

export interface DeltaThemeConfig {
  theme: DeltaCardTheme;
  label: string;
  badgePill: string;
  seriesCode: string;
  primaryColor: string;
  secondaryColor: string;
  accentGlow: string;
  borderGradient: string;
  bgAsset: string;
  frameAsset: string;
  fxAsset: string;
  backBgAsset: string;
  fontAccentColor: string;
  glowIntensity: number;
  foilType: "none" | "subtle" | "holographic" | "gold_refractor" | "inferno_lava" | "cosmic";
}

export const DELTA_THEME_CONFIGS: Record<DeltaCardTheme, DeltaThemeConfig> = {
  STANDARD: {
    theme: "STANDARD",
    label: "BASE SERIES",
    badgePill: "📦 BASE",
    seriesCode: "BASE",
    primaryColor: "#94a3b8",
    secondaryColor: "#1e293b",
    accentGlow: "rgba(148, 163, 184, 0.45)",
    borderGradient: "linear-gradient(135deg, #cbd5e1, #475569)",
    bgAsset: "/assets/cards/base/base-background.png",
    frameAsset: "/assets/cards/base/base-frame.png",
    fxAsset: "/assets/cards/base/base-fx.png",
    backBgAsset: "/assets/cards/base/base-back-bg.png",
    fontAccentColor: "#ffffff",
    glowIntensity: 0.35,
    foilType: "subtle"
  },
  TRAINING_HERO: {
    theme: "TRAINING_HERO",
    label: "TRAINING HERO",
    badgePill: "⚔️ WARRIOR",
    seriesCode: "TRN",
    primaryColor: "#38bdf8",
    secondaryColor: "#0369a1",
    accentGlow: "rgba(56, 189, 248, 0.65)",
    borderGradient: "linear-gradient(135deg, #38bdf8, #0284c7)",
    bgAsset: "/assets/cards/training-hero/training-hero-background.png",
    frameAsset: "/assets/cards/training-hero/training-hero-frame.png",
    fxAsset: "/assets/cards/training-hero/training-hero-fx.png",
    backBgAsset: "/assets/cards/training-hero/training-hero-back-bg.png",
    fontAccentColor: "#38bdf8",
    glowIntensity: 0.55,
    foilType: "holographic"
  },
  GOAL_MACHINE: {
    theme: "GOAL_MACHINE",
    label: "GOAL MACHINE",
    badgePill: "🎯 HUNTER",
    seriesCode: "HNT",
    primaryColor: "#f97316",
    secondaryColor: "#9a3412",
    accentGlow: "rgba(249, 115, 22, 0.7)",
    borderGradient: "linear-gradient(135deg, #fb923c, #c2410c)",
    bgAsset: "/assets/cards/matchday-hero/matchday-hero-background.png",
    frameAsset: "/assets/cards/matchday-hero/matchday-hero-frame.png",
    fxAsset: "/assets/cards/matchday-hero/matchday-hero-fx.png",
    backBgAsset: "/assets/cards/matchday-hero/matchday-hero-back-bg.png",
    fontAccentColor: "#fed7aa",
    glowIntensity: 0.65,
    foilType: "holographic"
  },
  CAPTAIN: {
    theme: "CAPTAIN",
    label: "CAPTAIN SERIES",
    badgePill: "🎖️ CAPTAIN",
    seriesCode: "CPT",
    primaryColor: "#a855f7",
    secondaryColor: "#581c87",
    accentGlow: "rgba(168, 85, 247, 0.75)",
    borderGradient: "linear-gradient(135deg, #c084fc, #7e22ce)",
    bgAsset: "/assets/cards/gold-master/gold-master-background.png",
    frameAsset: "/assets/cards/gold-master/gold-master-frame.png",
    fxAsset: "/assets/cards/gold-master/gold-master-fx.png",
    backBgAsset: "/assets/cards/gold-master/gold-master-back-bg.png",
    fontAccentColor: "#f3e8ff",
    glowIntensity: 0.7,
    foilType: "gold_refractor"
  },
  MATCHDAY_HERO: {
    theme: "MATCHDAY_HERO",
    label: "MATCHDAY HERO",
    badgePill: "⚡ MATCHDAY",
    seriesCode: "MTCH",
    primaryColor: "#0ea5e9",
    secondaryColor: "#075985",
    accentGlow: "rgba(14, 165, 233, 0.7)",
    borderGradient: "linear-gradient(135deg, #38bdf8, #0369a1)",
    bgAsset: "/assets/cards/matchday-hero/matchday-hero-background.png",
    frameAsset: "/assets/cards/matchday-hero/matchday-hero-frame.png",
    fxAsset: "/assets/cards/matchday-hero/matchday-hero-fx.png",
    backBgAsset: "/assets/cards/matchday-hero/matchday-hero-back-bg.png",
    fontAccentColor: "#e0f2fe",
    glowIntensity: 0.6,
    foilType: "holographic"
  },
  DELTA_ICON: {
    theme: "DELTA_ICON",
    label: "DELTA ICON",
    badgePill: "👑 ICON",
    seriesCode: "ICON",
    primaryColor: "#f59e0b",
    secondaryColor: "#78350f",
    accentGlow: "rgba(245, 158, 11, 0.85)",
    borderGradient: "linear-gradient(135deg, #fef08a, #d97706, #78350f)",
    bgAsset: "/assets/cards/delta-icon/delta-icon-background.png",
    frameAsset: "/assets/cards/delta-icon/delta-icon-frame.png",
    fxAsset: "/assets/cards/delta-icon/delta-icon-fx.png",
    backBgAsset: "/assets/cards/delta-icon/delta-icon-back-bg.png",
    fontAccentColor: "#fef08a",
    glowIntensity: 0.85,
    foilType: "gold_refractor"
  },
  GOLD_MASTER: {
    theme: "GOLD_MASTER",
    label: "GOLD MASTER",
    badgePill: "🌟 GOLD",
    seriesCode: "GOLD",
    primaryColor: "#eab308",
    secondaryColor: "#713f12",
    accentGlow: "rgba(234, 179, 8, 0.8)",
    borderGradient: "linear-gradient(135deg, #fde047, #ca8a04)",
    bgAsset: "/assets/cards/gold-master/gold-master-background.png",
    frameAsset: "/assets/cards/gold-master/gold-master-frame.png",
    fxAsset: "/assets/cards/gold-master/gold-master-fx.png",
    backBgAsset: "/assets/cards/gold-master/gold-master-back-bg.png",
    fontAccentColor: "#fef9c3",
    glowIntensity: 0.8,
    foilType: "gold_refractor"
  },
  INFERNO: {
    theme: "INFERNO",
    label: "INFERNO ULTRA",
    badgePill: "🔥 INFERNO",
    seriesCode: "INFR",
    primaryColor: "#ef4444",
    secondaryColor: "#450a0a",
    accentGlow: "rgba(239, 68, 68, 0.95)",
    borderGradient: "linear-gradient(135deg, #ff4d5a, #dc2626, #7f1d1d)",
    bgAsset: "/assets/cards/inferno-ultra/inferno-ultra-background.png",
    frameAsset: "/assets/cards/inferno-ultra/inferno-ultra-frame.png",
    fxAsset: "/assets/cards/inferno-ultra/inferno-ultra-fx.png",
    backBgAsset: "/assets/cards/inferno-ultra/inferno-ultra-back-bg.png",
    fontAccentColor: "#fee2e2",
    glowIntensity: 0.95,
    foilType: "inferno_lava"
  },
  SEASONAL_EVENT: {
    theme: "SEASONAL_EVENT",
    label: "SPECIAL EVENT",
    badgePill: "✨ EVENT",
    seriesCode: "EVT",
    primaryColor: "#06b6d4",
    secondaryColor: "#164e63",
    accentGlow: "rgba(6, 182, 212, 0.75)",
    borderGradient: "linear-gradient(135deg, #22d3ee, #0891b2)",
    bgAsset: "/assets/cards/matchday-hero/matchday-hero-background.png",
    frameAsset: "/assets/cards/matchday-hero/matchday-hero-frame.png",
    fxAsset: "/assets/cards/matchday-hero/matchday-hero-fx.png",
    backBgAsset: "/assets/cards/matchday-hero/matchday-hero-back-bg.png",
    fontAccentColor: "#cffafe",
    glowIntensity: 0.7,
    foilType: "cosmic"
  }
};

export const SIZE_DIMENSIONS: Record<DeltaCardSize, { width: number; height: number }> = {
  xs: { width: 64, height: 96 },
  sm: { width: 120, height: 180 },
  md: { width: 180, height: 270 },
  lg: { width: 260, height: 390 },
  xl: { width: 320, height: 480 },
  hero: { width: 360, height: 540 },
  responsive: { width: 240, height: 360 }
};

export function resolveDeltaCardTheme(
  cardType?: string | null,
  rarity?: string | null,
  frameTheme?: string | null
): DeltaCardTheme {
  const ft = (frameTheme || "").toUpperCase();
  if (ft === "INFERNO" || ft === "INFERNO_ULTRA") return "INFERNO";
  if (ft === "DELTA_ICON" || ft === "ICON" || ft === "LEGEND") return "DELTA_ICON";
  if (ft === "GOLD_MASTER" || ft === "GOLD") return "GOLD_MASTER";
  if (ft === "TRAINING_HERO" || ft === "TRAINING") return "TRAINING_HERO";
  if (ft === "GOAL_MACHINE" || ft === "GOAL_HUNTER") return "GOAL_MACHINE";
  if (ft === "CAPTAIN") return "CAPTAIN";
  if (ft === "MATCHDAY_HERO" || ft === "MATCHDAY") return "MATCHDAY_HERO";
  if (ft === "SEASONAL_EVENT" || ft === "EVENT" || ft === "TOURNAMENT") return "SEASONAL_EVENT";

  const ct = (cardType || "").toLowerCase();
  if (ct === "inferno") return "INFERNO";
  if (ct === "legend" || ct === "mvp") return "DELTA_ICON";
  if (ct === "gold_master" || ct === "hat_trick_hero") return "GOLD_MASTER";
  if (ct === "training_warrior" || ct === "training") return "TRAINING_HERO";
  if (ct === "goal_hunter" || ct === "goal_machine") return "GOAL_MACHINE";
  if (ct === "captain") return "CAPTAIN";
  if (ct === "matchday" || ct === "matchday_hero") return "MATCHDAY_HERO";
  if (ct === "tournament" || ct === "winter_edition" || ct === "finals" || ct === "special_event") return "SEASONAL_EVENT";

  const r = (rarity || "").toLowerCase();
  if (r === "inferno") return "INFERNO";
  if (r === "legendary") return "DELTA_ICON";
  if (r === "epic") return "GOLD_MASTER";
  if (r === "rare") return "MATCHDAY_HERO";

  return "STANDARD";
}

export function adaptLegacyToDeltaCardModel(props: {
  card?: CardDefinition;
  player?: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
    photo_path?: string | null;
  };
  userCard?: UserCard | null;
  isLocked?: boolean;
  stats?: {
    matches?: number;
    goals?: number;
    assists?: number;
    trainings?: number;
    attendance?: number;
    captain?: number;
    mvp?: number;
  };
  customPhotoUrl?: string | null;
  layoutOverride?: Partial<CardLayoutConfig>;
}): DeltaCardModel {
  const card = props.card;
  const player = props.player || card?.player;
  const userCard = props.userCard;
  const playerName = (player?.display_name || card?.card_name || "ZAWODNIK DELTA").toUpperCase();
  const shirtNumber = player?.shirt_number ? String(player.shirt_number) : null;
  const position = player?.position || card?.player?.position || null;
  const rarity = (card?.rarity || "common").toLowerCase() as CardRarity;

  const cardTheme = resolveDeltaCardTheme(
    card?.card_type,
    rarity,
    card?.frame_theme
  );

  const resolvedPhoto = props.customPhotoUrl || card?.artwork_url || player?.photo_path || null;

  const initials = playerName
    .split(" ")
    .filter(Boolean)
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "GM";

  const themeConfig = DELTA_THEME_CONFIGS[cardTheme];
  const dynamicCardId = `${themeConfig.seriesCode}-26-${initials}-${String(card?.card_number || 1).padStart(3, "0")}`;

  // Map only real DELTA stats if provided
  const statItems: DeltaCardStatItem[] = [];
  if (props.stats) {
    if (typeof props.stats.matches === "number") {
      statItems.push({ key: "matches", label: "MECZE", value: props.stats.matches, icon: "🏟️" });
    }
    if (typeof props.stats.goals === "number") {
      statItems.push({ key: "goals", label: "GOLE", value: props.stats.goals, icon: "⚽" });
    }
    if (typeof props.stats.assists === "number") {
      statItems.push({ key: "assists", label: "ASYSTY", value: props.stats.assists, icon: "🎯" });
    }
    if (typeof props.stats.trainings === "number") {
      statItems.push({ key: "trainings", label: "TRENINGI", value: props.stats.trainings, icon: "⚡" });
    }
    if (typeof props.stats.attendance === "number") {
      statItems.push({ key: "attendance", label: "FREKW.", value: `${props.stats.attendance}%`, icon: "📈" });
    }
    if (typeof props.stats.captain === "number" && props.stats.captain > 0) {
      statItems.push({ key: "captain", label: "KAPITAN", value: props.stats.captain, icon: "🎖️" });
    }
    if (typeof props.stats.mvp === "number" && props.stats.mvp > 0) {
      statItems.push({ key: "mvp", label: "MVP", value: props.stats.mvp, icon: "👑" });
    }
  }

  // Real milestone source badge if present
  let milestoneBadge = null;
  const goals = props.stats?.goals ?? 0;
  const trainings = props.stats?.trainings ?? 0;
  if (goals >= 50) {
    milestoneBadge = { label: "KLUB 50 GOLI", icon: "⚽", color: "#ff4d5a" };
  } else if (trainings >= 90) {
    milestoneBadge = { label: "WYS. FREKWENCJA", icon: "⚡", color: "#38bdf8" };
  } else if (card?.card_type === "mvp" || (props.stats?.mvp && props.stats.mvp > 0)) {
    milestoneBadge = { label: "MVP MECZU", icon: "👑", color: "#f1c95c" };
  }

  return {
    id: card?.id || player?.id || "delta-card",
    playerId: player?.id || card?.player_id || "delta-player",
    playerName,
    shirtNumber,
    position,
    playerImage: resolvedPhoto,
    cardType: cardTheme,
    rarity,
    frameTheme: card?.frame_theme,
    artworkPose: card?.artwork_pose,
    stats: statItems.length > 0 ? statItems : undefined,
    duplicatesCount: userCard?.duplicates_count || 0,
    isFavorite: userCard?.is_favorite || false,
    obtainedAt: userCard?.acquired_at || null,
    isOwned: !!userCard,
    isLocked: props.isLocked ?? false,
    layoutOverride: props.layoutOverride,
    backData: {
      season: card?.season || "2026/27",
      seriesName: themeConfig.label,
      seriesCode: themeConfig.seriesCode,
      cardId: dynamicCardId,
      obtainedAt: userCard?.acquired_at || null,
      sourceReason: null,
      lore: card?.lore || card?.description || null,
      milestoneBadge
    }
  };
}
