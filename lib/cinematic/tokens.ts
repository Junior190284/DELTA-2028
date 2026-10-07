// lib/cinematic/tokens.ts
// Central Rarity Design Tokens and FX Parameters

import { RarityTier } from './types';

export interface RarityTokenConfig {
  id: RarityTier;
  label: string;
  sublabel: string;
  themeColor: string;
  accentGlow: string;
  borderGlow: string;
  bgGradient: string;
  smokeColor: string;
  particleType: 'none' | 'subtle_white' | 'cyan_spark' | 'stadium_beam' | 'gold_dust' | 'icon_halo' | 'inferno_fire';
  revealDurationMs: number;
  hasWalkout: boolean;
  holoStyle: 'none' | 'subtle' | 'gold_prism' | 'cosmic_fire' | 'legend_shine';
  audioProfile: 'standard' | 'hero' | 'gold' | 'icon' | 'inferno';
}

export const RARITY_TOKENS: Record<RarityTier, RarityTokenConfig> = {
  STANDARD: {
    id: 'STANDARD',
    label: 'KARTA STANDARDOWA',
    sublabel: 'Podstawowa Karta Kolekcji',
    themeColor: '#94a3b8',
    accentGlow: 'rgba(148, 163, 184, 0.3)',
    borderGlow: 'border-slate-500/40',
    bgGradient: 'from-slate-900 via-slate-950 to-black',
    smokeColor: 'rgba(100, 116, 139, 0.1)',
    particleType: 'subtle_white',
    revealDurationMs: 1800,
    hasWalkout: false,
    holoStyle: 'none',
    audioProfile: 'standard'
  },
  TRAINING_HERO: {
    id: 'TRAINING_HERO',
    label: 'TRAINING HERO',
    sublabel: 'Wojownik Treningowy Mokotowa',
    themeColor: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.5)',
    borderGlow: 'border-cyan-500/60',
    bgGradient: 'from-cyan-950/80 via-slate-950 to-black',
    smokeColor: 'rgba(6, 182, 212, 0.15)',
    particleType: 'cyan_spark',
    revealDurationMs: 3200,
    hasWalkout: false,
    holoStyle: 'subtle',
    audioProfile: 'hero'
  },
  MATCHDAY_HERO: {
    id: 'MATCHDAY_HERO',
    label: 'MATCHDAY HERO',
    sublabel: 'Gwiazda Dnia Meczowego',
    themeColor: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.6)',
    borderGlow: 'border-blue-500/70',
    bgGradient: 'from-blue-950/80 via-slate-950 to-black',
    smokeColor: 'rgba(59, 130, 246, 0.2)',
    particleType: 'stadium_beam',
    revealDurationMs: 4800,
    hasWalkout: true,
    holoStyle: 'subtle',
    audioProfile: 'hero'
  },
  GOLD_MASTER: {
    id: 'GOLD_MASTER',
    label: 'GOLD MASTER',
    sublabel: 'Mistrzowska Klasa Premium',
    themeColor: '#eab308',
    accentGlow: 'rgba(234, 179, 8, 0.7)',
    borderGlow: 'border-amber-400/80',
    bgGradient: 'from-amber-950/80 via-slate-950 to-black',
    smokeColor: 'rgba(234, 179, 8, 0.2)',
    particleType: 'gold_dust',
    revealDurationMs: 5500,
    hasWalkout: true,
    holoStyle: 'gold_prism',
    audioProfile: 'gold'
  },
  DELTA_ICON: {
    id: 'DELTA_ICON',
    label: 'DELTA ICON',
    sublabel: 'Legenda Klubu DELTA 2018',
    themeColor: '#ec4899',
    accentGlow: 'rgba(236, 72, 153, 0.7)',
    borderGlow: 'border-pink-500/80',
    bgGradient: 'from-purple-950/80 via-slate-950 to-black',
    smokeColor: 'rgba(168, 85, 247, 0.2)',
    particleType: 'icon_halo',
    revealDurationMs: 7000,
    hasWalkout: true,
    holoStyle: 'legend_shine',
    audioProfile: 'icon'
  },
  INFERNO: {
    id: 'INFERNO',
    label: 'INFERNO PRO',
    sublabel: 'Maksymalna Ranga Ognia Mokotowa',
    themeColor: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.85)',
    borderGlow: 'border-red-500',
    bgGradient: 'from-red-950 via-slate-950 to-black',
    smokeColor: 'rgba(239, 68, 68, 0.3)',
    particleType: 'inferno_fire',
    revealDurationMs: 9000,
    hasWalkout: true,
    holoStyle: 'cosmic_fire',
    audioProfile: 'inferno'
  },
  SEASONAL: {
    id: 'SEASONAL',
    label: 'SEASONAL SPECIAL',
    sublabel: 'Karta Sezonowa Jesień 2026',
    themeColor: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.7)',
    borderGlow: 'border-emerald-400/80',
    bgGradient: 'from-emerald-950/80 via-slate-950 to-black',
    smokeColor: 'rgba(16, 185, 129, 0.2)',
    particleType: 'gold_dust',
    revealDurationMs: 5000,
    hasWalkout: true,
    holoStyle: 'gold_prism',
    audioProfile: 'gold'
  }
};

export function getRarityToken(rarity?: string): RarityTokenConfig {
  if (!rarity) return RARITY_TOKENS.STANDARD;
  const upper = rarity.toUpperCase() as RarityTier;
  if (RARITY_TOKENS[upper]) return RARITY_TOKENS[upper];
  
  if (upper.includes('INFERNO') || upper.includes('FIRE')) return RARITY_TOKENS.INFERNO;
  if (upper.includes('ICON') || upper.includes('LEGEND')) return RARITY_TOKENS.DELTA_ICON;
  if (upper.includes('GOLD') || upper.includes('RARE')) return RARITY_TOKENS.GOLD_MASTER;
  if (upper.includes('MATCH')) return RARITY_TOKENS.MATCHDAY_HERO;
  if (upper.includes('TRAINING') || upper.includes('SILVER')) return RARITY_TOKENS.TRAINING_HERO;
  
  return RARITY_TOKENS.STANDARD;
}
