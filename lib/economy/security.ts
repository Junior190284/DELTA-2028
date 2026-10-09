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
