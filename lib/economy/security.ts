/**
 * Authoritative constants and security logic for DELTA Economy
 * Rule: CLIENT NEVER DECIDES REWARD VALUE
 */

export const ECONOMY_BALANCE_VERSION = "2026-10-balanced-v1";

export interface SpinSegment {
  id: string;
  name: string;
  shortName: string;
  type: "points" | "pack";
  amount?: number;
  packTypeId?: string;
  weight: number;
}

export const DAILY_SPIN_SEGMENTS: SpinSegment[] = [
  { id: "s1", name: "+50 DELTA POINTS", shortName: "+50 DP", type: "points", amount: 50, weight: 28 },
  { id: "s2", name: "PACZKA STANDARDOWA", shortName: "PACZKA STD", type: "pack", packTypeId: "standard_pack", weight: 20 },
  { id: "s3", name: "+100 DELTA POINTS", shortName: "+100 DP", type: "points", amount: 100, weight: 15 },
  { id: "s4", name: "MATCHDAY BOOSTER", shortName: "MATCHDAY", type: "pack", packTypeId: "matchday_booster", weight: 12 },
  { id: "s5", name: "+25 DELTA POINTS", shortName: "+25 DP", type: "points", amount: 25, weight: 30 },
  { id: "s6", name: "👑 GOLD BOOSTER", shortName: "GOLD PACK", type: "pack", packTypeId: "gold_booster", weight: 8 },
  { id: "s7", name: "🔥 INFERNO (+200 DP)", shortName: "+200 DP 🔥", type: "points", amount: 200, weight: 4 },
  { id: "s8", name: "🌟 LEGEND PACK", shortName: "LEGEND PACK", type: "pack", packTypeId: "legend_pack", weight: 2 }
];

export function selectRandomSpinSegment(randomValOverride?: number): SpinSegment {
  const totalWeight = DAILY_SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let randomVal = randomValOverride !== undefined ? randomValOverride : Math.random() * totalWeight;

  for (let i = 0; i < DAILY_SPIN_SEGMENTS.length; i++) {
    if (randomVal <= DAILY_SPIN_SEGMENTS[i].weight) {
      return DAILY_SPIN_SEGMENTS[i];
    }
    randomVal -= DAILY_SPIN_SEGMENTS[i].weight;
  }
  return DAILY_SPIN_SEGMENTS[0];
}

export const QUIZ_PASS_THRESHOLD_PERCENT = 75;
export const DEFAULT_QUIZ_REWARD_DELTA_POINTS = 50;

/**
 * Pre-existing lesson reward configuration from Knowledge Corner data
 */
export const QUIZ_LESSON_REWARDS: Record<string, number> = {
  "rules-orlik": 50,
  "nutrition-power": 50,
  "hydration-champion": 50,
  "sleep-recovery": 50,
  "gear-boots": 50,
  "fairplay-respect": 50,
  "tactics-positioning": 60,
  "skills-dribbling": 75,
  "goalkeeper-basics": 60,
  "speed-agility": 75,
  "mindset-focus": 60,
  "firstaid-safety": 75
};

export function getQuizRewardForLesson(lessonId: string): number {
  return QUIZ_LESSON_REWARDS[lessonId] ?? DEFAULT_QUIZ_REWARD_DELTA_POINTS;
}

/**
 * SCENARIO B (BALANCED SUSTAINABLE) AUTHORITATIVE PACK PRICES
 */
export const PACK_PRICES: Record<string, number> = {
  standard_pack: 60,
  matchday_booster: 100,
  gold_booster: 150,
  inferno_booster: 300,
  legend_pack: 450,
  legend_booster: 450
};

export function getPackPrice(packTypeId: string): number {
  return PACK_PRICES[packTypeId] || PACK_PRICES.standard_pack;
}

export const ALLOWED_PACK_TYPES = new Set<string>([
  "standard_pack",
  "matchday_booster",
  "gold_booster",
  "inferno_booster",
  "legend_pack",
  "legend_booster"
]);

const LEGACY_PACK_ALIASES: Record<string, string> = {
  pack_standard: "standard_pack",
  pack_matchday: "matchday_booster",
  pack_gold: "gold_booster",
  pack_inferno: "inferno_booster",
  pack_legend: "legend_pack"
};

export function normalizePackTypeId(packTypeId?: string | null): string | null {
  if (!packTypeId || typeof packTypeId !== "string") return null;
  const normalized = LEGACY_PACK_ALIASES[packTypeId] || packTypeId;
  return ALLOWED_PACK_TYPES.has(normalized) ? normalized : null;
}

export const DAILY_SPIN_DP_AMOUNTS = new Set<number>([25, 50, 100, 200]);

export interface AuthoritativeQuestReward {
  dp: number;
  packTypeId?: string;
  title: string;
}

export const WEEKLY_QUEST_REWARDS: Record<string, AuthoritativeQuestReward> = {
  "q-knowledge": { dp: 30, title: "Młody Erudyta DELTY" },
  "q-typer": { dp: 30, title: "Klubowy Ekspert Wyników" },
  "q-attendance": { dp: 30, title: "Gotowy do Boju" },
  "q-cards": { dp: 30, title: "Kolekcjoner Gwiazd DELTY" },
  "q-fanvote": { dp: 30, title: "Serduszko Trybun" },
  "weekly_mega_chest": { dp: 100, packTypeId: "gold_booster", title: "Złota Skrzynia Tygodnia" }
};

export const BIRTHDAY_GIFT_REWARD: AuthoritativeQuestReward = {
  dp: 150,
  packTypeId: "standard_pack",
  title: "Prezent Urodzinowy DELTY"
};

export interface AuthoritativeSeasonReward {
  level: number;
  xpRequired: number;
  title: string;
  type: "points" | "pack" | "chest" | "cosmetic";
  amount?: number;
  packTypeId?: string;
}

export const SEASON_PASS_SERVER_REWARDS: AuthoritativeSeasonReward[] = [
  { level: 1, xpRequired: 100, title: "+50 Delta Points", type: "points", amount: 50 },
  { level: 2, xpRequired: 200, title: "Paczka Standardowa", type: "pack", packTypeId: "standard_pack" },
  { level: 3, xpRequired: 300, title: "+75 Delta Points", type: "points", amount: 75 },
  { level: 4, xpRequired: 400, title: "Matchday Booster", type: "pack", packTypeId: "matchday_booster" },
  { level: 5, xpRequired: 500, title: "🥉 Brązowa Skrzynia Sezonu", type: "chest", amount: 120 },
  { level: 6, xpRequired: 600, title: "+100 Delta Points", type: "points", amount: 100 },
  { level: 7, xpRequired: 700, title: "👑 Gold Booster", type: "pack", packTypeId: "gold_booster" },
  { level: 8, xpRequired: 800, title: "🌟 Ramka 'Pioneer 2026'", type: "cosmetic" },
  { level: 9, xpRequired: 900, title: "+150 Delta Points", type: "points", amount: 150 },
  { level: 10, xpRequired: 1000, title: "🥈 Srebrna Skrzynia Mistrza", type: "chest", amount: 200, packTypeId: "matchday_booster" },
  { level: 11, xpRequired: 1100, title: "+175 Delta Points", type: "points", amount: 175 },
  { level: 12, xpRequired: 1200, title: "📦 Podwójna Paczka Std", type: "pack", packTypeId: "standard_pack" },
  { level: 13, xpRequired: 1300, title: "+200 Delta Points", type: "points", amount: 200 },
  { level: 14, xpRequired: 1400, title: "👑 Podwójny Gold Booster", type: "pack", packTypeId: "gold_booster" },
  { level: 15, xpRequired: 1500, title: "🥇 Złota Skrzynia Elity", type: "chest", amount: 300, packTypeId: "gold_booster" },
  { level: 16, xpRequired: 1600, title: "+250 Delta Points", type: "points", amount: 250 },
  { level: 17, xpRequired: 1700, title: "🔥 Inferno Booster", type: "pack", packTypeId: "inferno_booster" },
  { level: 18, xpRequired: 1800, title: "👑 Tytuł 'Ikona Delty 2026'", type: "cosmetic" },
  { level: 19, xpRequired: 1900, title: "+350 Delta Points", type: "points", amount: 350 },
  { level: 20, xpRequired: 2000, title: "👑 Legend Booster & Mega Skrzynia", type: "chest", amount: 500, packTypeId: "legend_booster" }
];
