/**
 * ACHIEVEMENTS 2.0 & PLAYER RECORDS ENGINE
 * Rzeczywisty system osiągnięć i rekordów zawodnika DELTA 2018 GM.
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
  | "epic" 
  | "legendary" 
  | "inferno";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  target: number;
  iconName: string;
  rewardLabel?: string;
  unlocksCardId?: string;
  isSecret?: boolean;
}

export interface PlayerAchievementStatus {
  definition: AchievementDefinition;
  current: number;
  target: number;
  percent: number;
  isUnlocked: boolean;
  unlockedAt?: string;
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
  // 🏃 1. FREKWENCJA
  {
    id: "att_1",
    name: "Pierwszy Krok",
    description: "Weź udział w pierwszym oficjalnym treningu DELTA 2018 GM.",
    category: "attendance",
    rarity: "common",
    target: 1,
    iconName: "Zap",
    rewardLabel: "Odznaka Debiutant"
  },
  {
    id: "att_5",
    name: "Rozgrzewka",
    description: "Zalicz 5 jednostek treningowych w klubie.",
    category: "attendance",
    rarity: "common",
    target: 5,
    iconName: "Zap",
    rewardLabel: "+100 DELTA Coins"
  },
  {
    id: "att_10",
    name: "Żelazna Dyscyplina",
    description: "Zalicz 10 oficjalnych treningów DELTA.",
    category: "attendance",
    rarity: "rare",
    target: 10,
    iconName: "Zap",
    rewardLabel: "Karta: TRAINING 10",
    unlocksCardId: "card_training_10"
  },
  {
    id: "att_25",
    name: "Forma Mistrza",
    description: "Zalicz 25 jednostek treningowych w sezonie.",
    category: "attendance",
    rarity: "epic",
    target: 25,
    iconName: "Zap",
    rewardLabel: "Karta: TRAINING 25",
    unlocksCardId: "card_training_25"
  },
  {
    id: "att_50",
    name: "Legenda Frekwencji",
    description: "Zalicz aż 50 treningów w barwach Górnego Mokotowa.",
    category: "attendance",
    rarity: "legendary",
    target: 50,
    iconName: "Flame",
    rewardLabel: "Karta: TRAINING MASTER",
    unlocksCardId: "card_training_master"
  },
  {
    id: "att_streak_3",
    name: "Żelazna Seria 3",
    description: "Bądź obecny na minimum 3 treningach z rzędu.",
    category: "attendance",
    rarity: "rare",
    target: 3,
    iconName: "Flame",
    rewardLabel: "Badge Żelazna Seria"
  },
  {
    id: "att_streak_7",
    name: "Niezłomny",
    description: "Osiągnij imponującą serię 7 obecności treningowych z rzędu.",
    category: "attendance",
    rarity: "epic",
    target: 7,
    iconName: "Flame",
    rewardLabel: "Tytuł: Niezłomny GM"
  },
  {
    id: "att_perfect_month",
    name: "Perfect Month",
    description: "100% obecności na wszystkich treningach w danym miesiącu.",
    category: "attendance",
    rarity: "epic",
    target: 1,
    iconName: "Trophy",
    rewardLabel: "Karta: PERFECT MONTH",
    unlocksCardId: "card_perfect_month"
  },

  // ⚽ 2. MECZE
  {
    id: "match_debut",
    name: "Oficjalny Debiut",
    description: "Zagraj w pierwszym meczu ligowym lub turniejowym DELTA 2018 GM.",
    category: "matches",
    rarity: "common",
    target: 1,
    iconName: "CalendarDays",
    rewardLabel: "Karta: STANDARD",
    unlocksCardId: "card_standard"
  },
  {
    id: "match_5",
    name: "Stadionowy Wyjadacz",
    description: "Rozegraj 5 oficjalnych meczów w barwach klubu.",
    category: "matches",
    rarity: "common",
    target: 5,
    iconName: "CalendarDays",
    rewardLabel: "+150 DELTA Coins"
  },
  {
    id: "match_10",
    name: "Filar Zespołu",
    description: "Zanotuj 10 oficjalnych występów meczowych.",
    category: "matches",
    rarity: "rare",
    target: 10,
    iconName: "CalendarDays",
    rewardLabel: "Odznaka Doświadczony Gracz"
  },
  {
    id: "match_25",
    name: "Wojownik Meczu",
    description: "Zagraj w 25 meczach ligowych i turniejowych.",
    category: "matches",
    rarity: "epic",
    target: 25,
    iconName: "Trophy",
    rewardLabel: "Karta: MATCHDAY WARRIOR",
    unlocksCardId: "card_matchday_warrior"
  },
  {
    id: "match_50",
    name: "Klubowy Weteran",
    description: "Zanotuj 50 rozegranych spotkań w DELTA Górny Mokotów.",
    category: "matches",
    rarity: "legendary",
    target: 50,
    iconName: "Trophy",
    rewardLabel: "Karta: CLUB VETERAN",
    unlocksCardId: "card_club_veteran"
  },
  {
    id: "match_starter_1",
    name: "Pierwsza Szóstka",
    description: "Wyjdź w podstawowym składzie meczu ligowego.",
    category: "matches",
    rarity: "common",
    target: 1,
    iconName: "Users",
    rewardLabel: "Badge Starter"
  },
  {
    id: "match_starter_10",
    name: "Niezastąpiony",
    description: "Wyjdź w pierwszym składzie minimum 10 razy.",
    category: "matches",
    rarity: "rare",
    target: 10,
    iconName: "Users",
    rewardLabel: "Badge Niezastąpiony"
  },

  // 🎯 3. BRAMKI & ATAK
  {
    id: "goal_first",
    name: "Pierwszy Gol",
    description: "Zdobądź swoją pierwszą bramkę w oficjalnym meczu DELTA.",
    category: "goals",
    rarity: "common",
    target: 1,
    iconName: "Goal",
    rewardLabel: "Odznaka Snajper"
  },
  {
    id: "goal_dublet",
    name: "Dublet w Meczu",
    description: "Strzel 2 bramki w trakcie jednego spotkania ligowego.",
    category: "goals",
    rarity: "rare",
    target: 2,
    iconName: "Goal",
    rewardLabel: "Karta: DOUBLE STRIKE",
    unlocksCardId: "card_double_strike"
  },
  {
    id: "goal_hattrick",
    name: "Hat-trick!",
    description: "Strzel minimum 3 bramki w jednym meczu!",
    category: "goals",
    rarity: "epic",
    target: 3,
    iconName: "Flame",
    rewardLabel: "Karta: GOAL MACHINE",
    unlocksCardId: "card_goal_machine"
  },
  {
    id: "goal_10",
    name: "Super Strzelec",
    description: "Zdobądź łącznie 10 bramek w meczach DELTA.",
    category: "goals",
    rarity: "epic",
    target: 10,
    iconName: "Target",
    rewardLabel: "Puchar Strzelca"
  },
  {
    id: "goal_25",
    name: "Złoty But DELTY",
    description: "Zdobądź aż 25 bramek w karierze klubowej.",
    category: "goals",
    rarity: "legendary",
    target: 25,
    iconName: "Trophy",
    rewardLabel: "Karta: LEGENDARY FINISHER",
    unlocksCardId: "card_legendary_finisher"
  },
  {
    id: "assist_1",
    name: "Pierwsza Asysta",
    description: "Zanotuj asystę przy golu kolegi z drużyny.",
    category: "goals",
    rarity: "common",
    target: 1,
    iconName: "Sparkles",
    rewardLabel: "Badge Kreator"
  },
  {
    id: "assist_5",
    name: "Reżyser Gry",
    description: "Zanotuj 5 kluczowych asyst w meczach ligowych.",
    category: "goals",
    rarity: "rare",
    target: 5,
    iconName: "Sparkles",
    rewardLabel: "Karta: PLAYMAKER",
    unlocksCardId: "card_playmaker"
  },

  // 🛡️ 4. DRUŻYNA & LIDER
  {
    id: "team_captain_1",
    name: "Kapitan Zespołu",
    description: "Wyprowadź drużynę na boisko z opaską kapitana.",
    category: "team",
    rarity: "rare",
    target: 1,
    iconName: "Crown",
    rewardLabel: "Karta: CAPTAIN",
    unlocksCardId: "card_captain"
  },
  {
    id: "team_captain_5",
    name: "Wielki Lider",
    description: "Rozegraj 5 meczów w roli kapitana DELTA 2018 GM.",
    category: "team",
    rarity: "epic",
    target: 5,
    iconName: "Crown",
    rewardLabel: "Karta: CAPTAIN LEADER",
    unlocksCardId: "card_captain_leader"
  },
  {
    id: "team_tournament",
    name: "Turniejowy Wojownik",
    description: "Weź udział w prestiżowym turnieju w barwach klubu.",
    category: "team",
    rarity: "rare",
    target: 1,
    iconName: "Medal",
    rewardLabel: "Karta: TOURNAMENT HERO",
    unlocksCardId: "card_tournament_hero"
  },
  {
    id: "team_mvp_1",
    name: "Gwiazda Meczu (MVP)",
    description: "Zdobądź oficjalne wyróżnienie MVP meczu od sztabu trenerskiego.",
    category: "team",
    rarity: "epic",
    target: 1,
    iconName: "Medal",
    rewardLabel: "Badge MVP Meczu"
  },
  {
    id: "team_mvp_4",
    name: "Poczwórne MVP",
    description: "Zdobądź tytuł MVP w 4 różnych meczach.",
    category: "team",
    rarity: "legendary",
    target: 4,
    iconName: "Trophy",
    rewardLabel: "Puchar MVP Sezonu"
  },

  // 🔥 5. INFERNO PREMIUM
  {
    id: "inferno_strike",
    name: "Inferno Strike",
    description: "Strzel Hat-tricka oraz zalicz asystę w jednym meczu ligowym.",
    category: "inferno",
    rarity: "inferno",
    target: 1,
    iconName: "Flame",
    rewardLabel: "Karta: INFERNO STRIKER",
    unlocksCardId: "card_inferno_striker"
  },
  {
    id: "inferno_master",
    name: "Inferno Master",
    description: "Osiągnij 25 treningów, 10 meczów oraz 10 goli.",
    category: "inferno",
    rarity: "inferno",
    target: 1,
    iconName: "Flame",
    rewardLabel: "Karta: INFERNO SPECIAL",
    unlocksCardId: "card_inferno_special"
  },
  {
    id: "inferno_legend",
    name: "Legenda Górnego Mokotowa",
    description: "Osiągnij 50 meczów, 25 goli i 5 spotkań w roli kapitana!",
    category: "inferno",
    rarity: "inferno",
    target: 1,
    iconName: "Flame",
    rewardLabel: "Karta: INFERNO ULTIMATE",
    unlocksCardId: "card_inferno_ultimate"
  }
];

/**
 * Wylicza postępy we wszystkich osiągnięciach dla danego zawodnika na podstawie danych
 */
export function calculatePlayerAchievements(
  playerId: string,
  stats: Record<string, any>,
  trainingStats: Record<string, any>,
  maxGoalsInSingleMatch: number = 0
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
      case "att_streak_3":
      case "att_streak_7":
        current = t.attendanceStreak || 0;
        break;
      case "att_perfect_month":
        current = (t.sessions >= 8 && t.attendanceStreak >= 8) ? 1 : 0;
        break;

      // Mecze
      case "match_debut":
      case "match_5":
      case "match_10":
      case "match_25":
      case "match_50":
        current = s.m || 0;
        break;
      case "match_starter_1":
      case "match_starter_10":
        current = s.starts || 0;
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
      case "assist_1":
      case "assist_5":
        current = s.a || 0;
        break;

      // Drużyna
      case "team_captain_1":
      case "team_captain_5":
        current = s.captain || 0;
        break;
      case "team_tournament":
        current = s.m >= 1 ? 1 : 0;
        break;
      case "team_mvp_1":
      case "team_mvp_4":
        current = s.mvp || 0;
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

    return {
      definition: def,
      current,
      target: def.target,
      percent,
      isUnlocked,
      unlockedAt: isUnlocked ? "Zdobyte" : undefined
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
      details: "Frekwencja na zajęciach DELTA"
    },
    {
      id: "rec_max_goals",
      label: "Najwięcej goli w 1 meczu",
      value: maxGoalsInSingleMatch,
      unit: maxGoalsInSingleMatch === 1 ? "bramka" : "bramki",
      category: "goals",
      isNewRecord: maxGoalsInSingleMatch >= 3,
      details: maxGoalsInSingleMatch >= 3 ? "Hat-trick!" : "Rekord ligowy"
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
      label: "Mecze z opaską kapitana",
      value: s.captain || 0,
      unit: "meczów",
      category: "leadership",
      details: "Lider na boisku"
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
      label: "Odblokowane Karty 3D",
      value: `${unlockedCardsCount} / 15`,
      category: "collection",
      details: "Warianty kolekcjonerskie"
    }
  ];
}
