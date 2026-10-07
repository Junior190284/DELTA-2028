// lib/game/seasons.ts
// Season Management and Battle Pass Tier Definitions

export interface BattlePassTier {
  level: number;
  requiredXP: number;
  rewardType: 'PACK' | 'XP' | 'BADGE' | 'SPIN' | 'SPECIAL_CARD';
  rewardTitle: string;
  rewardDescription: string;
  rewardValue: any;
  icon: string;
}

export interface SeasonInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  theme: string;
  totalTiers: number;
}

export const CURRENT_SEASON: SeasonInfo = {
  id: 'season_autumn_2026',
  name: 'Sezon Jesień 2026: Narodziny INFERNO',
  startDate: '2026-09-01',
  endDate: '2026-11-30',
  isActive: true,
  theme: 'inferno_red',
  totalTiers: 25
};

export const BATTLE_PASS_TIERS: BattlePassTier[] = [
  { level: 1, requiredXP: 50, rewardType: 'PACK', rewardTitle: 'Paczka Startowa', rewardDescription: 'Podstawowa paczka kart DELTA', rewardValue: { packType: 'standard' }, icon: '📦' },
  { level: 2, requiredXP: 120, rewardType: 'XP', rewardTitle: '+100 Bonus XP', rewardDescription: 'Zastrzyk punktów doświadczenia', rewardValue: { xp: 100 }, icon: '⚡' },
  { level: 3, requiredXP: 200, rewardType: 'SPIN', rewardTitle: 'Bonusowy Zakręć Kołem', rewardDescription: 'Dodatkowa szansa na Koło Fortuny', rewardValue: { spins: 1 }, icon: '🎡' },
  { level: 4, requiredXP: 300, rewardType: 'BADGE', rewardTitle: 'Odznaka: Ogień Mokotowa', rewardDescription: 'Unikalna odznaka profilu', rewardValue: { badgeId: 'badge_fire_mokotow' }, icon: '🔥' },
  { level: 5, requiredXP: 420, rewardType: 'PACK', rewardTitle: 'Paczka Srebrna', rewardDescription: 'Gwarantowana karta ze statystykami 75+', rewardValue: { packType: 'silver' }, icon: '🥈' },
  { level: 6, requiredXP: 550, rewardType: 'XP', rewardTitle: '+150 Bonus XP', rewardDescription: 'Kolejny krok do mistrzostwa', rewardValue: { xp: 150 }, icon: '⚡' },
  { level: 7, requiredXP: 700, rewardType: 'SPIN', rewardTitle: 'Super Zakręć Kołem', rewardDescription: 'Koło ze zwiększonymi nagrodami', rewardValue: { spins: 1 }, icon: '🎡' },
  { level: 8, requiredXP: 880, rewardType: 'PACK', rewardTitle: 'Paczka Złota', rewardDescription: 'Gwarantowana karta RARE', rewardValue: { packType: 'gold' }, icon: '🥇' },
  { level: 9, requiredXP: 1080, rewardType: 'BADGE', rewardTitle: 'Odznaka: Żelazna Obrona', rewardDescription: 'Dla nieustępliwych obrońców', rewardValue: { badgeId: 'badge_iron_defense' }, icon: '🛡️' },
  { level: 10, requiredXP: 1300, rewardType: 'SPECIAL_CARD', rewardTitle: 'Karta Trenera DELTA', rewardDescription: 'Karta trenera wzmacniająca statystyki składu', rewardValue: { cardId: 'coach_special_01' }, icon: '📋' },
  { level: 11, requiredXP: 1550, rewardType: 'XP', rewardTitle: '+200 Bonus XP', rewardDescription: 'Doświadczenie meczowe', rewardValue: { xp: 200 }, icon: '⚡' },
  { level: 12, requiredXP: 1820, rewardType: 'PACK', rewardTitle: 'Paczka Złota+', rewardDescription: '2x Rzadka karta zawodnika', rewardValue: { packType: 'gold_plus' }, icon: '🌟' },
  { level: 13, requiredXP: 2120, rewardType: 'SPIN', rewardTitle: 'Diamentowy Spin', rewardDescription: 'Najwyższa pula nagród koła', rewardValue: { spins: 1 }, icon: '💎' },
  { level: 14, requiredXP: 2450, rewardType: 'BADGE', rewardTitle: 'Odznaka: Snajper Mokotowa', rewardDescription: 'Dla najlepszych strzelców', rewardValue: { badgeId: 'badge_sniper' }, icon: '🎯' },
  { level: 15, requiredXP: 2800, rewardType: 'PACK', rewardTitle: 'Paczka INFERNO PRO', rewardDescription: 'Karty ze specjalnym wykończeniem', rewardValue: { packType: 'inferno_pro' }, icon: '🔥' },
  { level: 16, requiredXP: 3200, rewardType: 'XP', rewardTitle: '+300 Bonus XP', rewardDescription: 'Wielki skok punktowy', rewardValue: { xp: 300 }, icon: '⚡' },
  { level: 17, requiredXP: 3650, rewardType: 'BADGE', rewardTitle: 'Odznaka: Mistrz Asyst', rewardDescription: 'Dla królów środka pola', rewardValue: { badgeId: 'badge_assists_king' }, icon: '👟' },
  { level: 18, requiredXP: 4150, rewardType: 'PACK', rewardTitle: 'Paczka Diamentowa', rewardDescription: 'Najwyższa jakość kart w grze', rewardValue: { packType: 'diamond' }, icon: '💎' },
  { level: 19, requiredXP: 4700, rewardType: 'XP', rewardTitle: '+400 Bonus XP', rewardDescription: 'Poziom mistrzowski', rewardValue: { xp: 400 }, icon: '⚡' },
  { level: 20, requiredXP: 5300, rewardType: 'SPECIAL_CARD', rewardTitle: 'Karta Legendy Klubu', rewardDescription: 'Złota Karta Historyczna DELTA', rewardValue: { cardId: 'legend_delta_2018' }, icon: '👑' },
  { level: 21, requiredXP: 6000, rewardType: 'SPIN', rewardTitle: '3x Zakręć Kołem', rewardDescription: 'Potrójny pakiet spinów', rewardValue: { spins: 3 }, icon: '🎡' },
  { level: 22, requiredXP: 6800, rewardType: 'PACK', rewardTitle: 'Paczka Champions', rewardDescription: 'Paczka mistrzowska', rewardValue: { packType: 'champions' }, icon: '🏆' },
  { level: 23, requiredXP: 7700, rewardType: 'BADGE', rewardTitle: 'Odznaka: Niepokonany', rewardDescription: 'Miano elitarnego zawodnika', rewardValue: { badgeId: 'badge_undefeated' }, icon: '⚔️' },
  { level: 24, requiredXP: 8700, rewardType: 'XP', rewardTitle: '+500 Mega XP', rewardDescription: 'Finałowy zryw sezonu', rewardValue: { xp: 500 }, icon: '⚡' },
  { level: 25, requiredXP: 10000, rewardType: 'SPECIAL_CARD', rewardTitle: 'Karta: Puchar INFERNO 2026', rewardDescription: 'Ekskluzywna karta koronująca Sezon 1', rewardValue: { cardId: 'cup_inferno_champion' }, icon: '🏅' }
];
