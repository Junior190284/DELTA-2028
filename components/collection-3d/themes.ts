/**
 * DELTA COLLECTION 3D ENGINE — VISUAL THEME REGISTRY
 * 
 * Central registry of visual themes for the 3D Card Engine.
 * Configures frames, backgrounds, colors, holographics, slab depths, and stage lighting.
 */

import { CardVisualType, CardVisualTheme, CollectionCategory } from "./types";
import { getDefaultVisualTypeForCategory } from "./adapter";

export const CARD_VISUAL_THEMES: Record<CardVisualType, CardVisualTheme> = {
  // 1. INFERNO ULTRA (Kategoria: INFERNO) — Oryginalne zatwierdzone grafiki z prototypu V5.1
  INFERNO_ULTRA: {
    id: "INFERNO_ULTRA",
    category: "INFERNO",
    displayName: "INFERNO ULTRA",
    seriesLabel: "INFERNO ULTRA RARE • 2018 GM",
    badgeLabel: "🔥 INFERNO",
    assets: {
      frameImg: "/assets/cards/inferno-3d/frame.png",
      frontBg: "/assets/cards/inferno-3d/front-bg.png",
      backBg: "/assets/cards/inferno-3d/back-bg.png",
      fxImg: "/assets/cards/inferno-3d/fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#ef4444",
      secondaryColor: "#450a0a",
      accentGlow: "rgba(255, 42, 42, 0.45)",
      borderGradient: "linear-gradient(135deg, #ff4d5a, #dc2626, #7f1d1d)",
      fontAccentColor: "#ffca58",
      foilType: "inferno_lava",
      slabDepthPx: 15,
      hasEmbers: true,
      emberColor: "#ff6a3d",
      themeClass: "theme-inferno"
    },
    stage: {
      coreGlowColor: "rgba(255, 45, 35, 0.24)",
      reflectorLeft: "linear-gradient(180deg, rgba(255, 60, 40, 0.65) 0%, rgba(220, 20, 30, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(255, 75, 40, 0.65) 0%, rgba(200, 15, 25, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(255, 120, 80, 0.42)"
    }
  },

  // 2. GOLD MASTER (Kategoria: GOLD) — Złota karta mistrzowska
  GOLD_MASTER: {
    id: "GOLD_MASTER",
    category: "GOLD",
    displayName: "GOLD MASTER",
    seriesLabel: "GOLD MASTER SERIES • 2018 GM",
    badgeLabel: "🌟 GOLD",
    assets: {
      frameImg: "/assets/cards/gold-master/gold-master-frame.png",
      frontBg: "/assets/cards/gold-master/gold-master-background.png",
      backBg: "/assets/cards/gold-master/gold-master-back-bg.png",
      fxImg: "/assets/cards/gold-master/gold-master-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#eab308",
      secondaryColor: "#713f12",
      accentGlow: "rgba(234, 179, 8, 0.45)",
      borderGradient: "linear-gradient(135deg, #fde047, #ca8a04, #713f12)",
      fontAccentColor: "#fef08a",
      foilType: "gold_refractor",
      slabDepthPx: 14,
      hasEmbers: false,
      themeClass: "theme-gold"
    },
    stage: {
      coreGlowColor: "rgba(234, 179, 8, 0.22)",
      reflectorLeft: "linear-gradient(180deg, rgba(250, 204, 21, 0.65) 0%, rgba(161, 98, 7, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(253, 224, 71, 0.65) 0%, rgba(161, 98, 7, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(250, 204, 21, 0.42)"
    }
  },

  // 3. MATCHDAY HERO (Kategoria: MATCHDAY) — Oficjalna karta meczowa
  MATCHDAY_HERO: {
    id: "MATCHDAY_HERO",
    category: "MATCHDAY",
    displayName: "MATCHDAY HERO",
    seriesLabel: "MATCHDAY HERO • 2018 GM",
    badgeLabel: "⚡ MATCHDAY",
    assets: {
      frameImg: "/assets/cards/matchday-hero/matchday-hero-frame.png",
      frontBg: "/assets/cards/matchday-hero/matchday-hero-background.png",
      backBg: "/assets/cards/matchday-hero/matchday-hero-back-bg.png",
      fxImg: "/assets/cards/matchday-hero/matchday-hero-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#0ea5e9",
      secondaryColor: "#075985",
      accentGlow: "rgba(14, 165, 233, 0.45)",
      borderGradient: "linear-gradient(135deg, #38bdf8, #0369a1, #0c4a6e)",
      fontAccentColor: "#e0f2fe",
      foilType: "holographic",
      slabDepthPx: 13,
      hasEmbers: false,
      themeClass: "theme-matchday"
    },
    stage: {
      coreGlowColor: "rgba(14, 165, 233, 0.22)",
      reflectorLeft: "linear-gradient(180deg, rgba(56, 189, 248, 0.65) 0%, rgba(3, 105, 161, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(14, 165, 233, 0.65) 0%, rgba(3, 105, 161, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(56, 189, 248, 0.42)"
    }
  },

  // 4. DELTA ICON (Kategoria: LEGEND) — Królewska karta legendarna
  DELTA_ICON: {
    id: "DELTA_ICON",
    category: "LEGEND",
    displayName: "DELTA ICON",
    seriesLabel: "DELTA ICON LEGEND • 2018 GM",
    badgeLabel: "👑 LEGEND",
    assets: {
      frameImg: "/assets/cards/delta-icon/delta-icon-frame.png",
      frontBg: "/assets/cards/delta-icon/delta-icon-background.png",
      backBg: "/assets/cards/delta-icon/delta-icon-back-bg.png",
      fxImg: "/assets/cards/delta-icon/delta-icon-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#f59e0b",
      secondaryColor: "#78350f",
      accentGlow: "rgba(245, 158, 11, 0.50)",
      borderGradient: "linear-gradient(135deg, #fef08a, #d97706, #78350f)",
      fontAccentColor: "#fef08a",
      foilType: "gold_refractor",
      slabDepthPx: 15,
      hasEmbers: false,
      themeClass: "theme-legend"
    },
    stage: {
      coreGlowColor: "rgba(245, 158, 11, 0.26)",
      reflectorLeft: "linear-gradient(180deg, rgba(254, 240, 138, 0.65) 0%, rgba(217, 119, 6, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(245, 158, 11, 0.65) 0%, rgba(120, 53, 15, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(254, 240, 138, 0.45)"
    }
  },

  // 5. TRAINING HERO (Kategoria: RARE) — Wyróżnienie treningowe
  TRAINING_HERO: {
    id: "TRAINING_HERO",
    category: "RARE",
    displayName: "TRAINING HERO",
    seriesLabel: "TRAINING HERO • 2018 GM",
    badgeLabel: "⚔️ RARE",
    assets: {
      frameImg: "/assets/cards/training-hero/training-hero-frame.png",
      frontBg: "/assets/cards/training-hero/training-hero-background.png",
      backBg: "/assets/cards/training-hero/training-hero-back-bg.png",
      fxImg: "/assets/cards/training-hero/training-hero-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#10b981",
      secondaryColor: "#064e3b",
      accentGlow: "rgba(16, 185, 129, 0.40)",
      borderGradient: "linear-gradient(135deg, #34d399, #059669, #064e3b)",
      fontAccentColor: "#a7f3d0",
      foilType: "holographic",
      slabDepthPx: 12,
      hasEmbers: false,
      themeClass: "theme-rare"
    },
    stage: {
      coreGlowColor: "rgba(16, 185, 129, 0.20)",
      reflectorLeft: "linear-gradient(180deg, rgba(52, 211, 153, 0.60) 0%, rgba(5, 150, 105, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(16, 185, 129, 0.60) 0%, rgba(6, 78, 59, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(52, 211, 153, 0.40)"
    }
  },

  // 6. BASE (Kategoria: COMMON) — Karta podstawowa
  BASE: {
    id: "BASE",
    category: "COMMON",
    displayName: "STANDARD BASE",
    seriesLabel: "BASE SERIES • 2018 GM",
    badgeLabel: "📦 COMMON",
    assets: {
      frameImg: "/assets/cards/base/base-frame.png",
      frontBg: "/assets/cards/base/base-background.png",
      backBg: "/assets/cards/base/base-back-bg.png",
      fxImg: "/assets/cards/base/base-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#94a3b8",
      secondaryColor: "#1e293b",
      accentGlow: "rgba(148, 163, 184, 0.35)",
      borderGradient: "linear-gradient(135deg, #cbd5e1, #475569)",
      fontAccentColor: "#ffffff",
      foilType: "subtle",
      slabDepthPx: 12,
      hasEmbers: false,
      themeClass: "theme-common"
    },
    stage: {
      coreGlowColor: "rgba(148, 163, 184, 0.16)",
      reflectorLeft: "linear-gradient(180deg, rgba(203, 213, 225, 0.50) 0%, rgba(71, 85, 105, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(148, 163, 184, 0.50) 0%, rgba(30, 41, 59, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(203, 213, 225, 0.35)"
    }
  },

  // 7. STAR PLAYER (MVP / Placeholder)
  STAR_PLAYER: {
    id: "STAR_PLAYER",
    category: "GOLD",
    displayName: "STAR PLAYER",
    seriesLabel: "STAR PLAYER SERIES • 2018 GM",
    badgeLabel: "⭐ STAR",
    assets: {
      frameImg: "/assets/cards/gold-master/gold-master-frame.png",
      frontBg: "/assets/cards/gold-master/gold-master-background.png",
      backBg: "/assets/cards/gold-master/gold-master-back-bg.png",
      fxImg: "/assets/cards/gold-master/gold-master-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#a855f7",
      secondaryColor: "#581c87",
      accentGlow: "rgba(168, 85, 247, 0.45)",
      borderGradient: "linear-gradient(135deg, #c084fc, #7e22ce)",
      fontAccentColor: "#f3e8ff",
      foilType: "holographic",
      slabDepthPx: 14,
      hasEmbers: false,
      themeClass: "theme-star"
    },
    stage: {
      coreGlowColor: "rgba(168, 85, 247, 0.22)",
      reflectorLeft: "linear-gradient(180deg, rgba(192, 132, 252, 0.65) 0%, rgba(88, 28, 135, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(168, 85, 247, 0.65) 0%, rgba(88, 28, 135, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(192, 132, 252, 0.42)"
    }
  },

  // 8. SEASONAL EVENT (Placeholder)
  SEASONAL_EVENT: {
    id: "SEASONAL_EVENT",
    category: "RARE",
    displayName: "SEASONAL EVENT",
    seriesLabel: "SPECIAL EVENT • 2018 GM",
    badgeLabel: "✨ EVENT",
    assets: {
      frameImg: "/assets/cards/training-hero/training-hero-frame.png",
      frontBg: "/assets/cards/training-hero/training-hero-background.png",
      backBg: "/assets/cards/training-hero/training-hero-back-bg.png",
      fxImg: "/assets/cards/training-hero/training-hero-fx.png",
      crestImg: "/assets/cards/inferno-3d/delta-crest.png"
    },
    styling: {
      primaryColor: "#06b6d4",
      secondaryColor: "#164e63",
      accentGlow: "rgba(6, 182, 212, 0.45)",
      borderGradient: "linear-gradient(135deg, #22d3ee, #0891b2)",
      fontAccentColor: "#cffafe",
      foilType: "holographic",
      slabDepthPx: 13,
      hasEmbers: false,
      themeClass: "theme-event"
    },
    stage: {
      coreGlowColor: "rgba(6, 182, 212, 0.22)",
      reflectorLeft: "linear-gradient(180deg, rgba(34, 211, 238, 0.65) 0%, rgba(8, 145, 178, 0.20) 60%, transparent 100%)",
      reflectorRight: "linear-gradient(180deg, rgba(6, 182, 212, 0.65) 0%, rgba(22, 78, 99, 0.20) 60%, transparent 100%)",
      pulseColor: "rgba(34, 211, 238, 0.42)"
    }
  }
};

export function getCardVisualTheme(type: CardVisualType): CardVisualTheme {
  return CARD_VISUAL_THEMES[type] || CARD_VISUAL_THEMES.INFERNO_ULTRA;
}

export function getThemeForCategory(category: CollectionCategory): CardVisualTheme {
  const visualType = getDefaultVisualTypeForCategory(category);
  return getCardVisualTheme(visualType);
}
