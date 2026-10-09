/**
 * ACHIEVEMENTS 2.0 & CARD UNLOCK SYSTEM ENGINE
 * Rzeczywisty system osiągnięć i odblokowywania kart zawodnika DELTA 2018 GM.
 */

export type AchievementCategory = 
  | "attendance" 
  | "matches" 
  | "goals" 
  | "team" 
  | "inferno";

export type AchievementRarity = 
  | "common" 
  | "rare" 
  | "gold" 
  | "matchday" 
  | "inferno" 
  | "legend";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  target: number;
  iconName: string;
  rewardLabel?: string;
  rewardDp?: number;
  rewardCardType?: "base" | "training_warrior" | "goal_hunter" | "captain" | "matchday" | "mvp" | "inferno" | "legend";
  isSecret?: boolean;
  isManual?: boolean;
}

export interface PlayerAchievementStatus {
  definition: AchievementDefinition;
  current: number;
  target: number;
  percent: number;
  status: "LOCKED" | "IN_PROGRESS" | "UNLOCKED";
  isUnlocked: boolean;
  unlockedAt?: string;
  unlockedCardName?: string;
}

export interface PlayerRecordItem {
  id: string;
  label: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  isNewRecord?: boolean;
  category: "attendance" | "matches" | "goals" | "leadership" | "collection";
  details?: string;
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  // =========================================================
  // 🏃 1. FREKWENCJA
  // =========================================================
  {
    id: "att_1",
    name: "Pierwszy Trening",
    description: "Weź udział w pierwszym oficjalnym treningu DELTA 2018 GM.",
    category: "attendance",
    rarity: "common",
    target: 1,
    iconName: "Zap",
    rewardLabel: "+50 DP",
    rewardDp: 50
  },
  {
    id: "att_5",
    name: "5 Treningów",
    description: "Zalicz 5 potwierdzonych jednostek treningowych w klubie.",
    category: "attendance",
    rarity: "common",
    target: 5,
    iconName: "Zap",
    rewardLabel: "+100 DP",
    rewardDp: 100
  },
  {
    id: "att_10",
    name: "10 Treningów (Training Hero)",
    description: "Zalicz 10 oficjalnych treningów DELTA z potwierdzoną obecnością.",
    category: "attendance",
    rarity: "rare",
    target: 10,
    iconName: "Shield",
    rewardLabel: "Karta: TRAINING HERO",
    rewardCardType: "training_warrior",
    rewardDp: 150
  },
  {
    id: "att_25",
    name: "25 Treningów",
    description: "Zalicz 25 jednostek treningowych w sezonie rocznika 2018.",
    category: "attendance",
    rarity: "gold",
    target: 25,
    iconName: "Zap",
    rewardLabel: "Karta: TRAINING WARRIOR (Gold)",
    rewardCardType: "training_warrior",
    rewardDp: 250
  },
  {
    id: "att_50",
    name: "50 Treningów (Tytan Frekwencji)",
    description: "Osiągnij imponujący kamień milowy 50 treningów w barwach DELTA GM.",
    category: "attendance",
    rarity: "legend",
    target: 50,
    iconName: "Flame",
    rewardLabel: "Karta: TRAINING TITAN (Legend)",
    rewardCardType: "training_warrior",
    rewardDp: 500
  },
  {
    id: "att_perfect_month",
    name: "Perfect Month",
    description: "100% potwierdzonej obecności na wszystkich treningach w danym miesiącu.",
    category: "attendance",
    rarity: "gold",
    target: 1,
    iconName: "Trophy",
    rewardLabel: "Odznaka: Perfect Month",
    rewardDp: 200
  },

  // =========================================================
  // ⚽ 2. MECZE
  // =========================================================
  {
    id: "match_debut",
    name: "Oficjalny Debiut",
    description: "Zagraj w pierwszym meczu ligowym lub turniejowym DELTA 2018 GM.",
    category: "matches",
    rarity: "common",
    target: 1,
    iconName: "CalendarDays",
    rewardLabel: "Karta: STANDARD",
    rewardCardType: "base",
    rewardDp: 50
  },
  {
    id: "match_10",
    name: "10 Meczów (Matchday Hero)",
    description: "Zanotuj 10 oficjalnych występów meczowych w klubie.",
    category: "matches",
    rarity: "matchday",
    target: 10,
    iconName: "CalendarDays",
    rewardLabel: "Karta: MATCHDAY HERO",
    rewardCardType: "matchday",
    rewardDp: 150
  },
  {
    id: "match_25",
    name: "25 Meczów (Filar Zespołu)",
    description: "Rozegraj 25 meczów ligowych i turniejowych w barwach DELTY.",
    category: "matches",
    rarity: "gold",
    target: 25,
    iconName: "Trophy",
    rewardLabel: "Karta: MATCHDAY MASTER",
    rewardCardType: "matchday",
    rewardDp: 250
  },
  {
    id: "match_50",
    name: "50 Meczów (Klubowy Weteran)",
    description: "Zanotuj aż 50 rozegranych spotkań w DELTA Górny Mokotów.",
    category: "matches",
    rarity: "legend",
    target: 50,
    iconName: "Trophy",
    rewardLabel: "Karta: CLUB VETERAN (Legend)",
    rewardCardType: "mvp",
    rewardDp: 500
  },

  // =========================================================
  // 🎯 3. BRAMKI
  // =========================================================
  {
    id: "goal_first",
    name: "Pierwszy Gol",
    description: "Zdobądź swoją pierwszą bramkę w oficjalnym meczu DELTA.",
    category: "goals",
    rarity: "common",
    target: 1,
    iconName: "Goal",
    rewardLabel: "Odznaka Snajper",
    rewardDp: 50
  },
  {
    id: "goal_dublet",
    name: "Dublet w Meczu",
    description: "Strzel 2 bramki w trakcie jednego spotkania ligowego.",
    category: "goals",
    rarity: "rare",
    target: 2,
    iconName: "Goal",
    rewardLabel: "Odznaka Podwójne Uderzenie",
    rewardDp: 100
  },
  {
    id: "goal_hattrick",
    name: "Hat-trick! (Goal Machine)",
    description: "Strzel minimum 3 bramki w jednym meczu ligowym!",
    category: "goals",
    rarity: "gold",
    target: 3,
    iconName: "Flame",
    rewardLabel: "Karta: GOAL MACHINE",
    rewardCardType: "goal_hunter",
    rewardDp: 250
  },
  {
    id: "goal_10",
    name: "10 Goli w Karierze",
    description: "Zdobądź łącznie 10 bramek w oficjalnych meczach DELTA.",
    category: "goals",
    rarity: "gold",
    target: 10,
    iconName: "Target",
    rewardLabel: "Karta: GOAL HUNTER MASTER",
    rewardCardType: "goal_hunter",
    rewardDp: 250
  },
  {
    id: "goal_25",
    name: "25 Goli (Złoty But DELTY)",
    description: "Zdobądź 25 bramek w karierze klubowej.",
    category: "goals",
    rarity: "legend",
    target: 25,
    iconName: "Trophy",
    rewardLabel: "Karta: LEGENDARY FINISHER",
    rewardCardType: "mvp",
    rewardDp: 500
  },

  // =========================================================
  // 🛡️ 4. DRUŻYNA
  // =========================================================
  {
    id: "team_captain_1",
    name: "Kapitan Zespołu",
    description: "Wyprowadź drużynę na boisko z opaską kapitana.",
    category: "team",
    rarity: "rare",
    target: 1,
    iconName: "Crown",
    rewardLabel: "Karta: CAPTAIN",
    rewardCardType: "captain",
    rewardDp: 150
  },
  {
    id: "team_captain_5",
    name: "5 Meczów Jako Kapitan",
    description: "Rozegraj 5 meczów w roli oficjalnego kapitana DELTA 2018 GM.",
    category: "team",
    rarity: "gold",
    target: 5,
    iconName: "Crown",
    rewardLabel: "Karta: CAPTAIN LEADER (Gold)",
    rewardCardType: "captain",
    rewardDp: 250
  },
  {
    id: "team_tournament",
    name: "Turniej DELTY",
    description: "Weź udział w oficjalnym turnieju w barwach klubu.",
    category: "team",
    rarity: "matchday",
    target: 1,
    iconName: "Medal",
    rewardLabel: "Karta: TOURNAMENT HERO",
    rewardCardType: "matchday",
    rewardDp: 150
  },
  {
    id: "admin_special_honor",
    name: "Wyróżnienie Administratora",
    description: "Specjalne wyróżnienie sztabu szkoleniowego za postawę fair play i zaangażowanie.",
    category: "team",
    rarity: "gold",
    target: 1,
    iconName: "Award",
    rewardLabel: "Odznaka Specjalna DELTA",
    rewardDp: 300,
    isManual: true
  },

  // =========================================================
  // 🔥 5. INFERNO PREMIUM
  // =========================================================
  {
    id: "inferno_strike",
    name: "Inferno Strike",
    description: "Zanotuj Hat-trick oraz asystę w jednym oficjalnym meczu ligowym.",
    category: "inferno",
    rarity: "inferno",
    target: 1,
    iconName: "Flame",
    rewardLabel: "Karta: INFERNO STRIKER",
    rewardCardType: "inferno",
    rewardDp: 400
  },
  {
    id: "inferno_master",
    name: "Inferno Master (Milestone Sezonowy)",
    description: "Osiągnij 25 treningów, 10 meczów oraz 10 goli w sezonie!",
    category: "inferno",
    rarity: "inferno",
    target: 1,
    iconName: "Flame",
    rewardLabel: "Karta: INFERNO MASTER",
    rewardCardType: "inferno",
    rewardDp: 600,
    isSecret: true
  },
  {
    id: "inferno_legend",
    name: "Legenda Górnego Mokotowa",
    description: "Rozegraj 50 meczów, strzel 25 goli i wystąp 5 razy jako kapitan!",
    category: "inferno",
    rarity: "inferno",
    target: 1,
    iconName: "Flame",
    rewardLabel: "Karta: INFERNO ULTIMATE",
    rewardCardType: "inferno",
    rewardDp: 1000,
    isSecret: true
  }
];

/**
 * Wylicza postępy w osiągnięciach dla danego zawodnika na podstawie rzeczywistych danych
 */
export function calculatePlayerAchievements(
  playerId: string,
  stats: Record<string, any>,
  trainingStats: Record<string, any>,
  maxGoalsInSingleMatch: number = 0,
  adminManualGrants: string[] = []
): PlayerAchievementStatus[] {
  const s = stats[playerId] || { m: 0, starts: 0, captain: 0, g: 0, a: 0, mvp: 0 };
  const t = trainingStats[playerId] || { sessions: 0, goals: 0, assists: 0, attendanceStreak: 0 };

  return ACHIEVEMENTS_CATALOG.map(def => {
    let current = 0;

    switch (def.id) {
      // Frekwencja
      case "att_1":
      case "att_5":
      case "att_10":
      case "att_25":
      case "att_50":
        current = t.sessions || 0;
        break;
      case "att_perfect_month":
        current = (t.sessions >= 8 && t.attendanceStreak >= 8) ? 1 : 0;
        break;

      // Mecze
      case "match_debut":
      case "match_10":
      case "match_25":
      case "match_50":
        current = s.m || 0;
        break;

      // Bramki
      case "goal_first":
      case "goal_10":
      case "goal_25":
        current = s.g || 0;
        break;
      case "goal_dublet":
        current = Math.min(2, maxGoalsInSingleMatch);
        break;
      case "goal_hattrick":
        current = Math.min(3, maxGoalsInSingleMatch);
        break;

      // Drużyna
      case "team_captain_1":
      case "team_captain_5":
        current = s.captain || 0;
        break;
      case "team_tournament":
        current = s.m >= 1 ? 1 : 0;
        break;
      case "admin_special_honor":
        current = adminManualGrants.includes(def.id) || adminManualGrants.includes("admin_special_honor") ? 1 : 0;
        break;

      // Inferno
      case "inferno_strike":
        current = (maxGoalsInSingleMatch >= 3 && s.a >= 1) ? 1 : 0;
        break;
      case "inferno_master":
        current = (t.sessions >= 25 && s.m >= 10 && s.g >= 10) ? 1 : 0;
        break;
      case "inferno_legend":
        current = (s.m >= 50 && s.g >= 25 && s.captain >= 5) ? 1 : 0;
        break;

      default:
        current = 0;
    }

    const isUnlocked = current >= def.target;
    const percent = Math.min(100, Math.round((current / def.target) * 100));
    const status: "LOCKED" | "IN_PROGRESS" | "UNLOCKED" = isUnlocked 
      ? "UNLOCKED" 
      : current > 0 
      ? "IN_PROGRESS" 
      : "LOCKED";

    return {
      definition: def,
      current,
      target: def.target,
      percent,
      status,
      isUnlocked,
      unlockedAt: isUnlocked ? "Zdobyte" : undefined,
      unlockedCardName: def.rewardCardType ? def.rewardLabel : undefined
    };
  });
}

/**
 * Wylicza kafelki rekordów życiowych zawodnika
 */
export function calculatePlayerRecords(
  playerId: string,
  stats: Record<string, any>,
  trainingStats: Record<string, any>,
  maxGoalsInSingleMatch: number = 0,
  unlockedCardsCount: number = 0,
  unlockedAchievementsCount: number = 0
): PlayerRecordItem[] {
  const s = stats[playerId] || { m: 0, starts: 0, captain: 0, g: 0, a: 0, mvp: 0 };
  const t = trainingStats[playerId] || { sessions: 0, attendanceStreak: 0 };

  return [
    {
      id: "rec_streak",
      label: "Najdłuższa seria treningów",
      value: Math.max(t.attendanceStreak || 0, 1),
      unit: "z rzędu",
      category: "attendance",
      isNewRecord: (t.attendanceStreak || 0) >= 5,
      details: "Potwierdzona frekwencja DELTA"
    },
    {
      id: "rec_max_goals",
      label: "Najwięcej goli w 1 meczu",
      value: maxGoalsInSingleMatch,
      unit: maxGoalsInSingleMatch === 1 ? "bramka" : "bramki",
      category: "goals",
      isNewRecord: maxGoalsInSingleMatch >= 3,
      details: maxGoalsInSingleMatch >= 3 ? "Hat-trick meczowy!" : "Oficjalny mecz ligowy"
    },
    {
      id: "rec_hattricks",
      label: "Liczba Hat-tricków",
      value: maxGoalsInSingleMatch >= 3 ? 1 : 0,
      category: "goals",
      details: "W meczach oficjalnych"
    },
    {
      id: "rec_captain",
      label: "Mecze jako kapitan",
      value: s.captain || 0,
      unit: "meczów",
      category: "leadership",
      details: "Opaska kapitańska na murawie"
    },
    {
      id: "rec_achievements",
      label: "Zdobyte Osiągnięcia 2.0",
      value: `${unlockedAchievementsCount} / ${ACHIEVEMENTS_CATALOG.length}`,
      category: "collection",
      details: `${Math.round((unlockedAchievementsCount / ACHIEVEMENTS_CATALOG.length) * 100)}% ukończenia`
    },
    {
      id: "rec_cards",
      label: "Odblokowane Karty Specjalne",
      value: `${unlockedCardsCount} / 8`,
      category: "collection",
      details: "Warianty kolekcjonerskie"
    }
  ];
}
