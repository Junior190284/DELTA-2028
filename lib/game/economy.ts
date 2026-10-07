// lib/game/economy.ts
// Central Game Economy, Leveling Curve, Mission Types & Anti-Farming Protections

export interface LevelInfo {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  totalXP: number;
  title: string;
}

// Leveling formula: Level N requires around 150 * (N^1.15) XP
export function calculateLevelFromXP(totalXP: number): LevelInfo {
  let level = 1;
  let accumulatedXP = 0;

  const getXPForLevel = (lvl: number) => Math.round(120 * Math.pow(lvl, 1.18));

  while (true) {
    const requiredForNext = getXPForLevel(level);
    if (totalXP < accumulatedXP + requiredForNext) {
      const currentLevelXP = totalXP - accumulatedXP;
      const progressPercent = Math.min(100, Math.max(0, Math.round((currentLevelXP / requiredForNext) * 100)));
      
      return {
        level,
        currentLevelXP,
        nextLevelXP: requiredForNext,
        progressPercent,
        totalXP,
        title: getPlayerTitle(level)
      };
    }
    accumulatedXP += requiredForNext;
    level++;
    if (level > 99) break; // Hard cap safety
  }

  return {
    level: 99,
    currentLevelXP: 0,
    nextLevelXP: 99999,
    progressPercent: 100,
    totalXP,
    title: 'Legenda DELTA'
  };
}

export function getPlayerTitle(level: number): string {
  if (level < 3) return 'Młody Talent';
  if (level < 6) return 'Zawodnik Szkółki';
  if (level < 10) return 'Młody Wilczek';
  if (level < 15) return 'Podstawowy Skład';
  if (level < 20) return 'Wicekapitan Mokotowa';
  if (level < 30) return 'Kapitan DELTA 2018';
  if (level < 40) return 'Mistrz Ligi Warszawskiej';
  if (level < 50) return 'Gwiazda INFERNO';
  return 'Legenda DELTA';
}

export interface GameMission {
  id: string;
  title: string;
  description: string;
  category: 'DAILY' | 'WEEKLY' | 'EVENT';
  targetCount: number;
  currentCount: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  packReward?: string;
  icon: string;
}

export function generateDailyMissions(): GameMission[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: `daily_spin_${today}`,
      title: 'Dzienny Zakręć Kołem',
      description: 'Zakręć Kołem Fortuny INFERNO i odbierz dzisiejszą nagrodę.',
      category: 'DAILY',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      claimed: false,
      xpReward: 35,
      icon: '🎡'
    },
    {
      id: `daily_battle_${today}`,
      title: 'Pojedynek Kart 1v1',
      description: 'Zagraj minimum 1 mecz w Arenie Pojedynków Kart przeciwko CPU.',
      category: 'DAILY',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      claimed: false,
      xpReward: 50,
      icon: '⚔️'
    },
    {
      id: `daily_minigame_${today}`,
      title: 'Trening Umiejętności',
      description: 'Zagraj w dowolną minigrę (Celność 3D lub Refleks Bramkarza).',
      category: 'DAILY',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      claimed: false,
      xpReward: 40,
      icon: '🎯'
    }
  ];
}

export function generateWeeklyMissions(weekStartStr: string): GameMission[] {
  return [
    {
      id: `weekly_battles_${weekStartStr}`,
      title: 'Mistrz Areny',
      description: 'Wygraj 3 pojedynki w Arenie Kart (1v1 lub 3v3).',
      category: 'WEEKLY',
      targetCount: 3,
      currentCount: 0,
      completed: false,
      claimed: false,
      xpReward: 150,
      packReward: 'STANDARD_PACK',
      icon: '🏆'
    },
    {
      id: `weekly_streak_${weekStartStr}`,
      title: 'Tygodniowa Konsekwencja',
      description: 'Utrzymaj streak aktywności przez co najmniej 4 dni w tygodniu.',
      category: 'WEEKLY',
      targetCount: 4,
      currentCount: 1,
      completed: false,
      claimed: false,
      xpReward: 200,
      packReward: 'RARE_PACK',
      icon: '🔥'
    },
    {
      id: `weekly_score_${weekStartStr}`,
      title: 'Gwiazda Treningu',
      description: 'Zdobądź łącznie 500 punktów w minigrach treningowych.',
      category: 'WEEKLY',
      targetCount: 500,
      currentCount: 0,
      completed: false,
      claimed: false,
      xpReward: 120,
      icon: '⭐'
    }
  ];
}

// Anti-Farming rules for minigames
export const MINIGAME_LIMITS = {
  MAX_DAILY_XP_PER_GAME: 120,
  DIMINISHING_RETURNS_AFTER_PLAYS: 3,
  XP_MULTIPLIERS: [1.0, 1.0, 0.75, 0.5, 0.25, 0.1]
};

export function calculateMinigameXPAward(
  score: number,
  dailyPlays: number,
  currentAwardedXP: number
): { awardedXP: number; reachedCap: boolean } {
  const baseXP = Math.min(60, Math.floor(score / 15));
  const multiplierIndex = Math.min(dailyPlays - 1, MINIGAME_LIMITS.XP_MULTIPLIERS.length - 1);
  const multiplier = MINIGAME_LIMITS.XP_MULTIPLIERS[Math.max(0, multiplierIndex)];
  
  let calculated = Math.round(baseXP * multiplier);
  
  if (currentAwardedXP + calculated > MINIGAME_LIMITS.MAX_DAILY_XP_PER_GAME) {
    calculated = Math.max(0, MINIGAME_LIMITS.MAX_DAILY_XP_PER_GAME - currentAwardedXP);
  }

  return {
    awardedXP: calculated,
    reachedCap: currentAwardedXP + calculated >= MINIGAME_LIMITS.MAX_DAILY_XP_PER_GAME
  };
}
