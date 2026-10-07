// lib/cinematic/types.ts
// Shared types for the Central Card Reveal Engine and Walkout Suite

export type RarityTier = 
  | 'STANDARD'
  | 'TRAINING_HERO'
  | 'MATCHDAY_HERO'
  | 'GOLD_MASTER'
  | 'DELTA_ICON'
  | 'INFERNO'
  | 'SEASONAL';

export interface RevealCardItem {
  id: string;
  name: string;
  displayName?: string;
  position?: string;
  overall: number;
  rarity: RarityTier;
  photoUrl?: string;
  stats?: {
    pace?: number;
    shooting?: number;
    passing?: number;
    dribbling?: number;
    defending?: number;
    physical?: number;
  };
  isNew?: boolean;
  duplicateCount?: number;
  club?: string;
  nation?: string;
  badge?: string;
  description?: string;
}

export interface PackOpeningPayload {
  packType: string;
  packName: string;
  cards: RevealCardItem[];
  source?: 'SHOP' | 'MISSION' | 'BATTLEPASS' | 'STREAK' | 'ADMIN' | 'DEV';
}
