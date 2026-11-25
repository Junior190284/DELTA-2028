/**
 * DELTA INFERNO 3D — Visual Rarity Presentation Registry (Presentation Only)
 *
 * Maps authoritative server card rarity (`common`, `rare`, `epic`, `legendary`, `inferno`)
 * to distinct lighting, particle, flash, and walkout dramaturgy levels without touching economy logic.
 */

export type CanonicalRarityTier = "common" | "rare" | "epic" | "legendary" | "inferno";

export type StageParticlesTheme =
  | "common"
  | "rare"
  | "epic"
  | "gold"
  | "inferno"
  | "legend"
  | "standard";

export interface RarityPresentationProfile {
  tier: CanonicalRarityTier;
  intensityLevel: 1 | 2 | 3 | 4 | 5;
  labelPl: string;
  walkoutKicker: string;
  stageParticlesTheme: StageParticlesTheme;
  enableParticles: boolean;
  enableShockwave: boolean;
  enableFlash: boolean;
  enableScreenShake: boolean;
  accentHex: string;
  glowRgba: string;
  secondaryGlowRgba: string;
}

const RARITY_PROFILES: Record<CanonicalRarityTier, RarityPresentationProfile> = {
  common: {
    tier: "common",
    intensityLevel: 1,
    labelPl: "COMMON",
    walkoutKicker: "KARTA KLUBOWA",
    stageParticlesTheme: "common",
    enableParticles: false,
    enableShockwave: false,
    enableFlash: false,
    enableScreenShake: false,
    accentHex: "#94a3b8",
    glowRgba: "rgba(148, 163, 184, 0.28)",
    secondaryGlowRgba: "rgba(71, 85, 105, 0.16)"
  },
  rare: {
    tier: "rare",
    intensityLevel: 2,
    labelPl: "RARE",
    walkoutKicker: "ROZŚWIETLENIE ARENY",
    stageParticlesTheme: "rare",
    enableParticles: true,
    enableShockwave: true,
    enableFlash: false,
    enableScreenShake: false,
    accentHex: "#38bdf8",
    glowRgba: "rgba(56, 189, 248, 0.42)",
    secondaryGlowRgba: "rgba(16, 185, 129, 0.22)"
  },
  epic: {
    tier: "epic",
    intensityLevel: 3,
    labelPl: "EPIC",
    walkoutKicker: "EPICKIE WYŁADOWANIE",
    stageParticlesTheme: "epic",
    enableParticles: true,
    enableShockwave: true,
    enableFlash: true,
    enableScreenShake: false,
    accentHex: "#c084fc",
    glowRgba: "rgba(192, 132, 252, 0.52)",
    secondaryGlowRgba: "rgba(56, 189, 248, 0.28)"
  },
  legendary: {
    tier: "legendary",
    intensityLevel: 4,
    labelPl: "LEGENDARY",
    walkoutKicker: "ZŁOTA KULMINACJA",
    stageParticlesTheme: "gold",
    enableParticles: true,
    enableShockwave: true,
    enableFlash: true,
    enableScreenShake: true,
    accentHex: "#fbbf24",
    glowRgba: "rgba(251, 191, 36, 0.58)",
    secondaryGlowRgba: "rgba(217, 119, 6, 0.34)"
  },
  inferno: {
    tier: "inferno",
    intensityLevel: 5,
    labelPl: "INFERNO",
    walkoutKicker: "PREMIERA INFERNO",
    stageParticlesTheme: "inferno",
    enableParticles: true,
    enableShockwave: true,
    enableFlash: true,
    enableScreenShake: true,
    accentHex: "#ff4d3d",
    glowRgba: "rgba(255, 58, 36, 0.65)",
    secondaryGlowRgba: "rgba(251, 191, 36, 0.44)"
  }
};

export function normalizeCanonicalRarity(raw?: string | null): CanonicalRarityTier {
  const normalized = (raw || "").trim().toLowerCase();
  if (normalized === "inferno") return "inferno";
  if (normalized === "legendary" || normalized === "legend" || normalized === "icon") return "legendary";
  if (normalized === "epic") return "epic";
  if (normalized === "rare") return "rare";
  return "common";
}

export function getRarityPresentation(
  rarity?: string | null,
  cardType?: string | null
): RarityPresentationProfile {
  const tier = normalizeCanonicalRarity(rarity);
  if (rarity && tier in RARITY_PROFILES) {
    return RARITY_PROFILES[tier];
  }

  // Fallback only if rarity string was omitted completely
  const typeNorm = (cardType || "").toLowerCase();
  if (typeNorm.includes("inferno")) return RARITY_PROFILES.inferno;
  if (typeNorm.includes("legend")) return RARITY_PROFILES.legendary;
  if (typeNorm.includes("gold")) return RARITY_PROFILES.epic;
  if (typeNorm.includes("matchday") || typeNorm.includes("training")) return RARITY_PROFILES.rare;
  return RARITY_PROFILES.common;
}
