/**
 * DELTA 2018 GM — ETAP 14C.1: ADVANCED ECONOMY MODEL VALIDATION & SCENARIO SIMULATION
 * Comprehensive Monte Carlo simulation engine with disaggregated DP metrics,
 * scenario parameterizations (Current, Scenario A, Scenario B, Scenario C),
 * sensitivity matrices, starting balance comparisons, and milestone analysis.
 */

import { DAILY_SPIN_SEGMENTS, selectRandomSpinSegment, PACK_PRICES, QUIZ_LESSON_REWARDS } from "../lib/economy/security.ts";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "inferno";
export const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary", "inferno"];

export interface PackDefinition {
  price: number;
  cardsCount: number;
  dropRates: Record<Rarity, number>;
  minRarity?: Rarity;
}

export interface EconomyConfig {
  name: string;
  packConfigs: Record<string, PackDefinition>;
  duplicateValues: Record<Rarity, number>;
  spinPointsEv: number;
  spinPackProbabilities: Record<string, number>;
  quizRewards: Record<string, number>;
}

export const CURRENT_CONFIG: EconomyConfig = {
  name: "Current Baseline",
  packConfigs: {
    standard_pack: {
      price: 50,
      cardsCount: 3,
      dropRates: { common: 70, rare: 22, epic: 6, legendary: 1.8, inferno: 0.2 },
      minRarity: "common"
    },
    matchday_booster: {
      price: 80,
      cardsCount: 4,
      dropRates: { common: 50, rare: 35, epic: 11, legendary: 3.5, inferno: 0.5 },
      minRarity: "rare"
    },
    gold_booster: {
      price: 120,
      cardsCount: 5,
      dropRates: { common: 35, rare: 45, epic: 15, legendary: 4.5, inferno: 0.5 },
      minRarity: "rare"
    },
    inferno_booster: {
      price: 250,
      cardsCount: 5,
      dropRates: { common: 20, rare: 40, epic: 28, legendary: 9, inferno: 3 },
      minRarity: "epic"
    },
    legend_pack: {
      price: 350,
      cardsCount: 6,
      dropRates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 },
      minRarity: "legendary"
    }
  },
  duplicateValues: {
    common: 10,
    rare: 20,
    epic: 50,
    legendary: 100,
    inferno: 250
  },
  spinPointsEv: 34.0,
  spinPackProbabilities: {
    standard_pack: 0.10,
    gold_booster: 0.05
  },
  quizRewards: QUIZ_LESSON_REWARDS
};

export const SCENARIO_A_CONFIG: EconomyConfig = {
  name: "Scenario A (Light Calibration)",
  packConfigs: { ...CURRENT_CONFIG.packConfigs },
  duplicateValues: {
    common: 5,
    rare: 15,
    epic: 35,
    legendary: 75,
    inferno: 150
  },
  spinPointsEv: 25.0,
  spinPackProbabilities: {
    standard_pack: 0.08,
    gold_booster: 0.02
  },
  quizRewards: {
    quiz_1: 40, quiz_2: 40, quiz_3: 40, quiz_4: 40, quiz_5: 40, quiz_6: 40,
    quiz_7: 40, quiz_8: 40, quiz_9: 40, quiz_10: 40, quiz_11: 40, quiz_12: 40
  }
};

export const SCENARIO_B_CONFIG: EconomyConfig = {
  name: "Scenario B (Balanced Sustainable - Recommended)",
  packConfigs: {
    standard_pack: {
      price: 60,
      cardsCount: 3,
      dropRates: { common: 72, rare: 21, epic: 5.5, legendary: 1.3, inferno: 0.2 },
      minRarity: "common"
    },
    matchday_booster: {
      price: 100,
      cardsCount: 4,
      dropRates: { common: 52, rare: 34, epic: 10.5, legendary: 3.0, inferno: 0.5 },
      minRarity: "rare"
    },
    gold_booster: {
      price: 150,
      cardsCount: 5,
      dropRates: { common: 38, rare: 44, epic: 14, legendary: 3.5, inferno: 0.5 },
      minRarity: "rare"
    },
    inferno_booster: {
      price: 300,
      cardsCount: 5,
      dropRates: { common: 22, rare: 41, epic: 27, legendary: 7.5, inferno: 2.5 },
      minRarity: "epic"
    },
    legend_pack: {
      price: 450,
      cardsCount: 6,
      dropRates: { common: 12, rare: 36, epic: 35, legendary: 14.5, inferno: 2.5 },
      minRarity: "legendary"
    }
  },
  duplicateValues: {
    common: 4,
    rare: 10,
    epic: 25,
    legendary: 60,
    inferno: 120
  },
  spinPointsEv: 20.0,
  spinPackProbabilities: {
    standard_pack: 0.05,
    gold_booster: 0.01
  },
  quizRewards: {
    quiz_1: 30, quiz_2: 30, quiz_3: 30, quiz_4: 30, quiz_5: 30, quiz_6: 30,
    quiz_7: 30, quiz_8: 30, quiz_9: 30, quiz_10: 30, quiz_11: 30, quiz_12: 30
  }
};

export const SCENARIO_C_CONFIG: EconomyConfig = {
  name: "Scenario C (Long-Term Mastery)",
  packConfigs: {
    standard_pack: {
      price: 75,
      cardsCount: 3,
      dropRates: { common: 75, rare: 19, epic: 4.8, legendary: 1.0, inferno: 0.2 },
      minRarity: "common"
    },
    matchday_booster: {
      price: 125,
      cardsCount: 4,
      dropRates: { common: 55, rare: 33, epic: 9.5, legendary: 2.2, inferno: 0.3 },
      minRarity: "rare"
    },
    gold_booster: {
      price: 200,
      cardsCount: 5,
      dropRates: { common: 40, rare: 43, epic: 13.5, legendary: 3.0, inferno: 0.5 },
      minRarity: "rare"
    },
    inferno_booster: {
      price: 400,
      cardsCount: 5,
      dropRates: { common: 25, rare: 42, epic: 25, legendary: 6.0, inferno: 2.0 },
      minRarity: "epic"
    },
    legend_pack: {
      price: 600,
      cardsCount: 6,
      dropRates: { common: 15, rare: 38, epic: 33, legendary: 12.0, inferno: 2.0 },
      minRarity: "legendary"
    }
  },
  duplicateValues: {
    common: 2,
    rare: 6,
    epic: 15,
    legendary: 40,
    inferno: 80
  },
  spinPointsEv: 15.0,
  spinPackProbabilities: {
    standard_pack: 0.03,
    gold_booster: 0.005
  },
  quizRewards: {
    quiz_1: 20, quiz_2: 20, quiz_3: 20, quiz_4: 20, quiz_5: 20, quiz_6: 20,
    quiz_7: 20, quiz_8: 20, quiz_9: 20, quiz_10: 20, quiz_11: 20, quiz_12: 20
  }
};

export const TOTAL_CARD_POOL_SIZE = 108;
export const RARITY_DISTRIBUTION: Record<Rarity, number> = {
  common: 36,
  rare: 36,
  epic: 18,
  legendary: 9,
  inferno: 9
};

export interface Percentiles {
  min: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
}

export function calculatePercentiles(values: number[]): Percentiles {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) {
    return { min: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, max: 0, mean: 0 };
  }
  const getP = (p: number) => sorted[Math.min(n - 1, Math.max(0, Math.floor(n * p)))];
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0] || 0,
    p10: getP(0.10),
    p25: getP(0.25),
    p50: getP(0.50),
    p75: getP(0.75),
    p90: getP(0.90),
    max: sorted[n - 1] || 0,
    mean: Number((sum / n).toFixed(2))
  };
}

export function rollCardRarity(dropRates: Record<Rarity, number>, guaranteedMin?: Rarity): Rarity {
  let validRates = { ...dropRates };
  if (guaranteedMin) {
    const minIdx = RARITIES.indexOf(guaranteedMin);
    RARITIES.slice(0, minIdx).forEach(r => { validRates[r] = 0; });
  }

  const total = Object.values(validRates).reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  for (const r of RARITIES) {
    if (rand <= validRates[r]) return r;
    rand -= validRates[r];
  }
  return guaranteedMin || "common";
}

export interface UserSimulationResult {
  grossEarnedDP: number;
  spinDP: number;
  quizDP: number;
  duplicateDP: number;
  spentDP: number;
  finalBalanceDP: number;
  purchasedPacks: number;
  freePacks: number;
  totalPacks: number;
  uniqueCardsCount: number;
  collectionPercentage: number;
  infernoCount: number;
  legendaryCount: number;
  dayReached25?: number;
  dayReached50?: number;
  dayReached75?: number;
  dayReached90?: number;
  dayReached95?: number;
}

export interface SimulationOptions {
  persona: "CASUAL" | "ACTIVE" | "POWER_USER";
  days: number;
  initialDP?: number;
  config?: EconomyConfig;
  spinFrequency?: number;
  quizFrequency?: number;
  spendingStrategy?: "PROPORTIONAL" | "TARGET_HIGH" | "TARGET_LOW" | "HOLD";
}

export function simulateUserDetailed(options: SimulationOptions): UserSimulationResult {
  const {
    persona,
    days,
    initialDP = 0,
    config = CURRENT_CONFIG,
    spinFrequency = 1.0,
    quizFrequency = 1.0,
    spendingStrategy = "PROPORTIONAL"
  } = options;

  let balance = initialDP;
  let spinDP = 0;
  let quizDP = 0;
  let duplicateDP = 0;
  let spentDP = 0;
  let purchasedPacks = 0;
  let freePacks = 0;

  const collection = new Map<string, number>();
  let infernoCount = 0;
  let legendaryCount = 0;

  let dayReached25: number | undefined;
  let dayReached50: number | undefined;
  let dayReached75: number | undefined;
  let dayReached90: number | undefined;
  let dayReached95: number | undefined;

  const quizIds = Object.keys(config.quizRewards);
  let completedQuizzesCount = 0;

  for (let day = 1; day <= days; day++) {
    let isActiveDay = false;
    let didSpin = false;
    let didQuiz = false;

    if (persona === "CASUAL") {
      isActiveDay = Math.random() < (2.5 / 7);
      didSpin = isActiveDay && Math.random() < (0.7 * spinFrequency);
      didQuiz = isActiveDay && Math.random() < (0.2 * quizFrequency) && completedQuizzesCount < quizIds.length;
    } else if (persona === "ACTIVE") {
      isActiveDay = Math.random() < (6.0 / 7);
      didSpin = isActiveDay && Math.random() < spinFrequency;
      didQuiz = isActiveDay && Math.random() < (0.4 * quizFrequency) && completedQuizzesCount < quizIds.length;
    } else { // POWER_USER
      isActiveDay = true;
      didSpin = Math.random() < spinFrequency;
      didQuiz = (Math.random() < quizFrequency) && completedQuizzesCount < quizIds.length;
    }

    if (!isActiveDay) continue;

    // 2. Daily Spin
    if (didSpin) {
      if (config === CURRENT_CONFIG) {
        const seg = selectRandomSpinSegment();
        if (seg.type === "points" && seg.amount) {
          balance += seg.amount;
          spinDP += seg.amount;
        } else if (seg.type === "pack" && seg.packTypeId) {
          freePacks++;
          const packDef = config.packConfigs[seg.packTypeId] || config.packConfigs.standard_pack;
          openSimulatedPack(packDef);
        }
      } else {
        const roll = Math.random();
        let probAcc = 0;
        let wonPack: string | null = null;
        for (const [pType, prob] of Object.entries(config.spinPackProbabilities)) {
          probAcc += prob;
          if (roll < probAcc) {
            wonPack = pType;
            break;
          }
        }
        if (wonPack) {
          freePacks++;
          openSimulatedPack(config.packConfigs[wonPack] || config.packConfigs.standard_pack);
        } else {
          const pointsReward = Math.round(config.spinPointsEv * (0.7 + Math.random() * 0.6));
          balance += pointsReward;
          spinDP += pointsReward;
        }
      }
    }

    // 3. Quiz Completion
    if (didQuiz && completedQuizzesCount < quizIds.length) {
      const qId = quizIds[completedQuizzesCount];
      const reward = config.quizRewards[qId] || 50;
      balance += reward;
      quizDP += reward;
      completedQuizzesCount++;
    }

    // 4. Pack Purchasing Behavior
    let keepBuying = true;
    let loopPurchasesInSingleDay = 0;
    const maxDailyPurchases = 10; // Cap daily pack purchases to avoid infinite loop stalls

    while (keepBuying && loopPurchasesInSingleDay < maxDailyPurchases) {
      let targetPackType: string | null = null;

      if (spendingStrategy === "TARGET_LOW") {
        if (balance >= config.packConfigs.standard_pack.price) targetPackType = "standard_pack";
      } else if (spendingStrategy === "TARGET_HIGH") {
        if (balance >= config.packConfigs.legend_pack.price) targetPackType = "legend_pack";
        else if (balance >= config.packConfigs.inferno_booster.price) targetPackType = "inferno_booster";
      } else {
        if (persona === "CASUAL") {
          if (balance >= config.packConfigs.standard_pack.price) targetPackType = "standard_pack";
        } else if (persona === "ACTIVE") {
          if (balance >= config.packConfigs.gold_booster.price) targetPackType = "gold_booster";
          else if (balance >= config.packConfigs.matchday_booster.price && Math.random() < 0.5) targetPackType = "matchday_booster";
          else if (balance >= config.packConfigs.standard_pack.price && Math.random() < 0.25) targetPackType = "standard_pack";
        } else { // POWER_USER
          if (balance >= config.packConfigs.legend_pack.price) targetPackType = "legend_pack";
          else if (balance >= config.packConfigs.inferno_booster.price) targetPackType = "inferno_booster";
          else if (balance >= config.packConfigs.gold_booster.price && Math.random() < 0.3) targetPackType = "gold_booster";
        }
      }

      if (targetPackType && balance >= config.packConfigs[targetPackType].price) {
        const price = config.packConfigs[targetPackType].price;
        balance -= price;
        spentDP += price;
        purchasedPacks++;
        openSimulatedPack(config.packConfigs[targetPackType]);
        loopPurchasesInSingleDay++;
      } else {
        keepBuying = false;
      }
    }

    const currentUniques = collection.size;
    const currentPct = (currentUniques / TOTAL_CARD_POOL_SIZE) * 100;
    if (dayReached25 === undefined && currentPct >= 25) dayReached25 = day;
    if (dayReached50 === undefined && currentPct >= 50) dayReached50 = day;
    if (dayReached75 === undefined && currentPct >= 75) dayReached75 = day;
    if (dayReached90 === undefined && currentPct >= 90) dayReached90 = day;
    if (dayReached95 === undefined && currentPct >= 95) dayReached95 = day;
  }

  function openSimulatedPack(packDef: PackDefinition) {
    for (let slot = 0; slot < packDef.cardsCount; slot++) {
      const isLast = slot === packDef.cardsCount - 1;
      const rolledRarity = rollCardRarity(packDef.dropRates, isLast ? packDef.minRarity : undefined);
      const poolForRarity = RARITY_DISTRIBUTION[rolledRarity] || 18;
      const cardIndex = Math.floor(Math.random() * poolForRarity);
      const cardId = `${rolledRarity}_${cardIndex}`;

      if (rolledRarity === "inferno") infernoCount++;
      if (rolledRarity === "legendary") legendaryCount++;

      if (collection.has(cardId)) {
        collection.set(cardId, (collection.get(cardId) || 1) + 1);
        const dupReward = config.duplicateValues[rolledRarity] || 10;
        balance += dupReward;
        duplicateDP += dupReward;
      } else {
        collection.set(cardId, 1);
      }
    }
  }

  const grossEarnedDP = spinDP + quizDP + duplicateDP + initialDP;

  return {
    grossEarnedDP,
    spinDP,
    quizDP,
    duplicateDP,
    spentDP,
    finalBalanceDP: balance,
    purchasedPacks,
    freePacks,
    totalPacks: purchasedPacks + freePacks,
    uniqueCardsCount: collection.size,
    collectionPercentage: Number(((collection.size / TOTAL_CARD_POOL_SIZE) * 100).toFixed(1)),
    infernoCount,
    legendaryCount,
    dayReached25,
    dayReached50,
    dayReached75,
    dayReached90,
    dayReached95
  };
}

export interface DetailedMonteCarloResult {
  persona: string;
  days: number;
  configName: string;
  initialDP: number;
  simulationsCount: number;
  grossEarnedDP: Percentiles;
  spinDP: Percentiles;
  quizDP: Percentiles;
  duplicateDP: Percentiles;
  spentDP: Percentiles;
  finalBalanceDP: Percentiles;
  purchasedPacks: Percentiles;
  freePacks: Percentiles;
  totalPacks: Percentiles;
  uniqueCardsCount: Percentiles;
  collectionPercentage: Percentiles;
  infernoCount: Percentiles;
  legendaryCount: Percentiles;
  medianDayToMilestones: {
    m25: number | string;
    m50: number | string;
    m75: number | string;
    m90: number | string;
    m95: number | string;
  };
}

export function runDetailedMonteCarlo(
  options: SimulationOptions,
  iterations = 3000
): DetailedMonteCarloResult {
  const grossEarnedList: number[] = [];
  const spinDPList: number[] = [];
  const quizDPList: number[] = [];
  const duplicateDPList: number[] = [];
  const spentDPList: number[] = [];
  const finalBalList: number[] = [];
  const purchasedPacksList: number[] = [];
  const freePacksList: number[] = [];
  const totalPacksList: number[] = [];
  const uniqueCardsList: number[] = [];
  const colPercentList: number[] = [];
  const infernoList: number[] = [];
  const legendaryList: number[] = [];

  const m25List: number[] = [];
  const m50List: number[] = [];
  const m75List: number[] = [];
  const m90List: number[] = [];
  const m95List: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const res = simulateUserDetailed(options);
    grossEarnedList.push(res.grossEarnedDP);
    spinDPList.push(res.spinDP);
    quizDPList.push(res.quizDP);
    duplicateDPList.push(res.duplicateDP);
    spentDPList.push(res.spentDP);
    finalBalList.push(res.finalBalanceDP);
    purchasedPacksList.push(res.purchasedPacks);
    freePacksList.push(res.freePacks);
    totalPacksList.push(res.totalPacks);
    uniqueCardsList.push(res.uniqueCardsCount);
    colPercentList.push(res.collectionPercentage);
    infernoList.push(res.infernoCount);
    legendaryList.push(res.legendaryCount);

    if (res.dayReached25 !== undefined) m25List.push(res.dayReached25);
    if (res.dayReached50 !== undefined) m50List.push(res.dayReached50);
    if (res.dayReached75 !== undefined) m75List.push(res.dayReached75);
    if (res.dayReached90 !== undefined) m90List.push(res.dayReached90);
    if (res.dayReached95 !== undefined) m95List.push(res.dayReached95);
  }

  const medianOrDash = (list: number[]) => {
    if (list.length < iterations * 0.3) return "N/R";
    const s = [...list].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  return {
    persona: options.persona,
    days: options.days,
    configName: options.config?.name || CURRENT_CONFIG.name,
    initialDP: options.initialDP || 0,
    simulationsCount: iterations,
    grossEarnedDP: calculatePercentiles(grossEarnedList),
    spinDP: calculatePercentiles(spinDPList),
    quizDP: calculatePercentiles(quizDPList),
    duplicateDP: calculatePercentiles(duplicateDPList),
    spentDP: calculatePercentiles(spentDPList),
    finalBalanceDP: calculatePercentiles(finalBalList),
    purchasedPacks: calculatePercentiles(purchasedPacksList),
    freePacks: calculatePercentiles(freePacksList),
    totalPacks: calculatePercentiles(totalPacksList),
    uniqueCardsCount: calculatePercentiles(uniqueCardsList),
    collectionPercentage: calculatePercentiles(colPercentList),
    infernoCount: calculatePercentiles(infernoList),
    legendaryCount: calculatePercentiles(legendaryList),
    medianDayToMilestones: {
      m25: medianOrDash(m25List),
      m50: medianOrDash(m50List),
      m75: medianOrDash(m75List),
      m90: medianOrDash(m90List),
      m95: medianOrDash(m95List)
    }
  };
}

export function calculatePackDuplicateEv(pack: PackDefinition, duplicateValues: Record<Rarity, number>, saturationPct: number) {
  const sat = saturationPct / 100;
  let expectedDupPerCard = 0;
  const rates = pack.dropRates;
  const totalRate = Object.values(rates).reduce((s, w) => s + w, 0);

  for (const r of RARITIES) {
    const prob = (rates[r] || 0) / totalRate;
    const dupVal = duplicateValues[r] || 0;
    expectedDupPerCard += prob * dupVal * sat;
  }

  const totalPackDupEv = expectedDupPerCard * pack.cardsCount;
  const returnPercentage = (totalPackDupEv / pack.price) * 100;

  return {
    packPrice: pack.price,
    cardsCount: pack.cardsCount,
    dupEv: Number(totalPackDupEv.toFixed(2)),
    returnPercentage: Number(returnPercentage.toFixed(1))
  };
}

// CLI runner
if (typeof process !== "undefined" && process.argv[1]?.includes("economy-simulation")) {
  console.log("==========================================================================================");
  console.log("DELTA 2018 GM — ETAP 14C.1: ADVANCED MONTE CARLO SIMULATION RESULTS");
  console.log("==========================================================================================\n");

  const horizons = [30, 90, 180];
  const personas: Array<"CASUAL" | "ACTIVE" | "POWER_USER"> = ["CASUAL", "ACTIVE", "POWER_USER"];

  // 1. BASELINE (CURRENT CONFIG)
  console.log("\n==========================================================================================");
  console.log("1. BASELINE SIMULATION (CURRENT CONFIG - 0 DP START)");
  console.log("==========================================================================================");
  for (const p of personas) {
    console.log(`\n--- PERSONA: ${p} ---`);
    for (const d of horizons) {
      const res = runDetailedMonteCarlo({ persona: p, days: d, config: CURRENT_CONFIG, initialDP: 0 }, 3000);
      console.log(`>>> [${p}] ${d} DNI:`);
      console.log(`  Gross DP: Med: ${res.grossEarnedDP.p50} | Mean: ${res.grossEarnedDP.mean} (Spin: ${res.spinDP.p50}, Quiz: ${res.quizDP.p50}, Dup: ${res.duplicateDP.p50})`);
      console.log(`  DP Spent: Med: ${res.spentDP.p50} | Final Bal: ${res.finalBalanceDP.p50} DP`);
      console.log(`  Packs:    Purchased: ${res.purchasedPacks.p50} + Free: ${res.freePacks.p50} = Total: ${res.totalPacks.p50} (Mean: ${res.totalPacks.mean})`);
      console.log(`  Cards:    Unique: ${res.uniqueCardsCount.p50}/108 (${res.collectionPercentage.p50}%) | Inferno: ${res.infernoCount.p50}, Legend: ${res.legendaryCount.p50}`);
      console.log(`  Milestones: 25%: ${res.medianDayToMilestones.m25}d | 50%: ${res.medianDayToMilestones.m50}d | 75%: ${res.medianDayToMilestones.m75}d | 90%: ${res.medianDayToMilestones.m90}d | 95%: ${res.medianDayToMilestones.m95}d`);
    }
  }

  // 2. SCENARIO A
  console.log("\n==========================================================================================");
  console.log("2. SCENARIO A (LIGHT CALIBRATION - 0 DP START)");
  console.log("==========================================================================================");
  for (const p of personas) {
    console.log(`\n--- PERSONA: ${p} ---`);
    for (const d of horizons) {
      const res = runDetailedMonteCarlo({ persona: p, days: d, config: SCENARIO_A_CONFIG, initialDP: 0 }, 3000);
      console.log(`>>> [${p}][A] ${d} DNI:`);
      console.log(`  Gross DP: Med: ${res.grossEarnedDP.p50} | Mean: ${res.grossEarnedDP.mean} (Spin: ${res.spinDP.p50}, Quiz: ${res.quizDP.p50}, Dup: ${res.duplicateDP.p50})`);
      console.log(`  DP Spent: Med: ${res.spentDP.p50} | Final Bal: ${res.finalBalanceDP.p50} DP`);
      console.log(`  Packs:    Purchased: ${res.purchasedPacks.p50} + Free: ${res.freePacks.p50} = Total: ${res.totalPacks.p50} (Mean: ${res.totalPacks.mean})`);
      console.log(`  Cards:    Unique: ${res.uniqueCardsCount.p50}/108 (${res.collectionPercentage.p50}%) | Inferno: ${res.infernoCount.p50}, Legend: ${res.legendaryCount.p50}`);
      console.log(`  Milestones: 25%: ${res.medianDayToMilestones.m25}d | 50%: ${res.medianDayToMilestones.m50}d | 75%: ${res.medianDayToMilestones.m75}d | 90%: ${res.medianDayToMilestones.m90}d | 95%: ${res.medianDayToMilestones.m95}d`);
    }
  }

  // 3. SCENARIO B (RECOMMENDED)
  console.log("\n==========================================================================================");
  console.log("3. SCENARIO B (BALANCED SUSTAINABLE - 0 DP START - RECOMMENDED)");
  console.log("==========================================================================================");
  for (const p of personas) {
    console.log(`\n--- PERSONA: ${p} ---`);
    for (const d of horizons) {
      const res = runDetailedMonteCarlo({ persona: p, days: d, config: SCENARIO_B_CONFIG, initialDP: 0 }, 3000);
      console.log(`>>> [${p}][B] ${d} DNI:`);
      console.log(`  Gross DP: Med: ${res.grossEarnedDP.p50} | Mean: ${res.grossEarnedDP.mean} (Spin: ${res.spinDP.p50}, Quiz: ${res.quizDP.p50}, Dup: ${res.duplicateDP.p50})`);
      console.log(`  DP Spent: Med: ${res.spentDP.p50} | Final Bal: ${res.finalBalanceDP.p50} DP`);
      console.log(`  Packs:    Purchased: ${res.purchasedPacks.p50} + Free: ${res.freePacks.p50} = Total: ${res.totalPacks.p50} (Mean: ${res.totalPacks.mean})`);
      console.log(`  Cards:    Unique: ${res.uniqueCardsCount.p50}/108 (${res.collectionPercentage.p50}%) | Inferno: ${res.infernoCount.p50}, Legend: ${res.legendaryCount.p50}`);
      console.log(`  Milestones: 25%: ${res.medianDayToMilestones.m25}d | 50%: ${res.medianDayToMilestones.m50}d | 75%: ${res.medianDayToMilestones.m75}d | 90%: ${res.medianDayToMilestones.m90}d | 95%: ${res.medianDayToMilestones.m95}d`);
    }
  }

  // 4. SCENARIO C
  console.log("\n==========================================================================================");
  console.log("4. SCENARIO C (LONG-TERM MASTERY - 0 DP START)");
  console.log("==========================================================================================");
  for (const p of personas) {
    console.log(`\n--- PERSONA: ${p} ---`);
    for (const d of horizons) {
      const res = runDetailedMonteCarlo({ persona: p, days: d, config: SCENARIO_C_CONFIG, initialDP: 0 }, 3000);
      console.log(`>>> [${p}][C] ${d} DNI:`);
      console.log(`  Gross DP: Med: ${res.grossEarnedDP.p50} | Mean: ${res.grossEarnedDP.mean} (Spin: ${res.spinDP.p50}, Quiz: ${res.quizDP.p50}, Dup: ${res.duplicateDP.p50})`);
      console.log(`  DP Spent: Med: ${res.spentDP.p50} | Final Bal: ${res.finalBalanceDP.p50} DP`);
      console.log(`  Packs:    Purchased: ${res.purchasedPacks.p50} + Free: ${res.freePacks.p50} = Total: ${res.totalPacks.p50} (Mean: ${res.totalPacks.mean})`);
      console.log(`  Cards:    Unique: ${res.uniqueCardsCount.p50}/108 (${res.collectionPercentage.p50}%) | Inferno: ${res.infernoCount.p50}, Legend: ${res.legendaryCount.p50}`);
      console.log(`  Milestones: 25%: ${res.medianDayToMilestones.m25}d | 50%: ${res.medianDayToMilestones.m50}d | 75%: ${res.medianDayToMilestones.m75}d | 90%: ${res.medianDayToMilestones.m90}d | 95%: ${res.medianDayToMilestones.m95}d`);
    }
  }

  // 5. LEGACY USER COMPARISON (1320 DP START vs 0 DP START)
  console.log("\n==========================================================================================");
  console.log("5. LEGACY USER (1320 DP START) vs NEW USER (0 DP START) - 90 DAYS (SCENARIO B)");
  console.log("==========================================================================================");
  for (const p of personas) {
    const resNew = runDetailedMonteCarlo({ persona: p, days: 90, config: SCENARIO_B_CONFIG, initialDP: 0 }, 3000);
    const resLegacy = runDetailedMonteCarlo({ persona: p, days: 90, config: SCENARIO_B_CONFIG, initialDP: 1320 }, 3000);
    console.log(`\n[${p}] New (0 DP) vs Legacy (1320 DP) in 90d:`);
    console.log(`  Packs Opened:   New: ${resNew.totalPacks.p50} vs Legacy: ${resLegacy.totalPacks.p50} (+${resLegacy.totalPacks.p50 - resNew.totalPacks.p50} packs)`);
    console.log(`  Collection %:   New: ${resNew.collectionPercentage.p50}% vs Legacy: ${resLegacy.collectionPercentage.p50}% (+${(resLegacy.collectionPercentage.p50 - resNew.collectionPercentage.p50).toFixed(1)}%)`);
    console.log(`  Ending Balance: New: ${resNew.finalBalanceDP.p50} DP vs Legacy: ${resLegacy.finalBalanceDP.p50} DP`);
  }

  // 6. SENSITIVITY MATRIX FOR SCENARIO B (ACTIVE PERSONA, 90 DAYS)
  console.log("\n==========================================================================================");
  console.log("6. SENSITIVITY MATRIX (ACTIVE PERSONA, 90 DAYS, SCENARIO B)");
  console.log("==========================================================================================");
  const spinFreqs = [0.5, 0.75, 1.0];
  const quizFreqs = [0.0, 0.5, 1.0];
  for (const sf of spinFreqs) {
    for (const qf of quizFreqs) {
      const res = runDetailedMonteCarlo({ persona: "ACTIVE", days: 90, config: SCENARIO_B_CONFIG, spinFrequency: sf, quizFrequency: qf }, 2000);
      console.log(`  Spin: ${(sf * 100).toFixed(0)}% | Quiz: ${(qf * 100).toFixed(0)}% -> Gross DP: ${res.grossEarnedDP.p50} | Packs: ${res.totalPacks.p50} | Col: ${res.collectionPercentage.p50}% | Bal: ${res.finalBalanceDP.p50} DP`);
    }
  }

  // 7. DUPLICATE BREAK-EVEN ANALYSIS
  console.log("\n==========================================================================================");
  console.log("7. DUPLICATE LOOP BREAK-EVEN MATRIX (% RETURN OF PACK PRICE FROM DUPLICATES)");
  console.log("==========================================================================================");
  const saturations = [25, 50, 75, 90, 100];
  console.log("\n--- CURRENT BASELINE ---");
  for (const [pName, pDef] of Object.entries(CURRENT_CONFIG.packConfigs)) {
    const row = saturations.map(s => `${s}%: ${calculatePackDuplicateEv(pDef, CURRENT_CONFIG.duplicateValues, s).returnPercentage}%`).join(" | ");
    console.log(`  ${pName.padEnd(18)} -> ${row}`);
  }

  console.log("\n--- SCENARIO B (BALANCED) ---");
  for (const [pName, pDef] of Object.entries(SCENARIO_B_CONFIG.packConfigs)) {
    const row = saturations.map(s => `${s}%: ${calculatePackDuplicateEv(pDef, SCENARIO_B_CONFIG.duplicateValues, s).returnPercentage}%`).join(" | ");
    console.log(`  ${pName.padEnd(18)} -> ${row}`);
  }
}
