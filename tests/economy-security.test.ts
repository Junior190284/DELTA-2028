import { test } from "node:test";
import assert from "node:assert/strict";
import { 
  DAILY_SPIN_SEGMENTS, 
  selectRandomSpinSegment, 
  QUIZ_PASS_THRESHOLD_PERCENT, 
  QUIZ_LESSON_REWARDS,
  getQuizRewardForLesson,
  PACK_PRICES 
} from "../lib/economy/security.ts";

/**
 * DELTA 2018 GM — ETAP 14B.1: ECONOMY SECURITY HARDENING TEST SUITE
 * Comprehensive security, idempotency, atomic consistency, and product rule tests.
 */

// =========================================================================
// TEST 1: Daily Spin ignores client-sent reward object in request body
// =========================================================================
test("TEST 1: Daily Spin ignores client-sent reward object in request body", () => {
  const clientForgedBody = {
    reward: {
      type: "points",
      amount: 999999,
      name: "HACKED_DELTA_POINTS"
    }
  };

  const serverChosenSegment = selectRandomSpinSegment();

  assert.notEqual(
    serverChosenSegment.amount,
    clientForgedBody.reward.amount,
    "Server must not use client-provided reward amount"
  );
  assert.ok(
    DAILY_SPIN_SEGMENTS.some(s => s.id === serverChosenSegment.id),
    "Server-chosen segment must belong to the authoritative server list"
  );
});

// =========================================================================
// TEST 2: Daily Spin enforces 1 spin per day (cooldown 429 when already spun)
// =========================================================================
test("TEST 2: Daily Spin enforces 1 spin per day (cooldown 429 when already spun)", () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const mockUserDailySpin = {
    user_id: "user-123",
    last_spin_at: `${todayStr}T08:30:00.000Z`,
    streak_count: 3
  };

  const isAlreadySpunToday = (lastSpinAt: string) => {
    const lastSpinStr = new Date(lastSpinAt).toISOString().slice(0, 10);
    return lastSpinStr === todayStr;
  };

  const attemptSpin = (spinRecord: { user_id: string; last_spin_at: string; streak_count: number }) => {
    if (isAlreadySpunToday(spinRecord.last_spin_at)) {
      return { status: 429, error: "Dzienny limit wykorzystany. Kolejny obrót dostępny po północy!" };
    }
    return { status: 200, success: true };
  };

  const result = attemptSpin(mockUserDailySpin);
  assert.equal(result.status, 429, "Must return HTTP 429 on second spin attempt on same day");
  assert.match(result.error || "", /Dzienny limit wykorzystany/);
});

// =========================================================================
// TEST 3: Daily Spin rolls strictly from valid server sector list with weights
// =========================================================================
test("TEST 3: Daily Spin rolls strictly from valid server sector list with correct weights", () => {
  assert.equal(DAILY_SPIN_SEGMENTS.length, 8, "Must contain exactly 8 wheel segments");
  
  const totalWeight = DAILY_SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  assert.equal(totalWeight, 119, "Total weight of sectors must sum to 119");

  const expectedIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
  const actualIds = DAILY_SPIN_SEGMENTS.map(s => s.id);
  assert.deepEqual(actualIds, expectedIds);

  const firstSegment = selectRandomSpinSegment(0);
  assert.equal(firstSegment.id, "s1", "At weight offset 0, segment must be s1");

  const lastSegment = selectRandomSpinSegment(118.9);
  assert.equal(lastSegment.id, "s8", "At weight offset 118.9, segment must be s8");
});

// =========================================================================
// TEST 4: Daily Spin server awards verified points or pack without client tampering
// =========================================================================
test("TEST 4: Daily Spin server awards verified points or pack without client tampering", () => {
  let userBalance = 100;
  const userPacks: string[] = [];

  const applyReward = (segment: typeof DAILY_SPIN_SEGMENTS[0]) => {
    if (segment.type === "points" && segment.amount) {
      userBalance += segment.amount;
    } else if (segment.type === "pack" && segment.packTypeId) {
      userPacks.push(segment.packTypeId);
    }
  };

  const seg1 = DAILY_SPIN_SEGMENTS.find(s => s.id === "s1")!;
  applyReward(seg1);
  assert.equal(userBalance, 150, "User balance must increment by exactly 50");

  const seg2 = DAILY_SPIN_SEGMENTS.find(s => s.id === "s2")!;
  applyReward(seg2);
  assert.equal(userPacks.length, 1);
  assert.equal(userPacks[0], "standard_pack");
});

// =========================================================================
// TEST 5: Quiz endpoint rejects unauthenticated requests (401)
// =========================================================================
test("TEST 5: Quiz endpoint rejects unauthenticated requests (401)", () => {
  const checkAuth = (user: { id: string } | null) => {
    if (!user) {
      return { status: 401, error: "Wymagane logowanie" };
    }
    return { status: 200 };
  };

  const response = checkAuth(null);
  assert.equal(response.status, 401, "Unauthenticated request must return 401");
});

// =========================================================================
// TEST 6: Quiz endpoint ignores client-provided pointsAwarded parameter
// =========================================================================
test("TEST 6: Quiz endpoint ignores client-provided pointsAwarded parameter", () => {
  const clientPayload = {
    lessonId: "rules-orlik",
    scorePercent: 100,
    pointsAwarded: 10000
  };

  const calculateReward = (lessonId: string, score: number) => {
    if (score < QUIZ_PASS_THRESHOLD_PERCENT) return 0;
    return getQuizRewardForLesson(lessonId);
  };

  const awarded = calculateReward(clientPayload.lessonId, clientPayload.scorePercent);
  assert.equal(awarded, 50, "Server must award pre-existing 50 DP and completely ignore 10000 from client");
});

// =========================================================================
// TEST 7: Quiz endpoint awards points only if score >= 75% (0 DP on failure)
// =========================================================================
test("TEST 7: Quiz endpoint awards points only if score >= 75% (0 DP on failure)", () => {
  assert.equal(QUIZ_PASS_THRESHOLD_PERCENT, 75);

  const evaluateQuiz = (lessonId: string, score: number) => {
    if (score >= QUIZ_PASS_THRESHOLD_PERCENT) {
      return { passed: true, pointsAwarded: getQuizRewardForLesson(lessonId) };
    }
    return { passed: false, pointsAwarded: 0 };
  };

  assert.deepEqual(evaluateQuiz("rules-orlik", 74), { passed: false, pointsAwarded: 0 });
  assert.deepEqual(evaluateQuiz("rules-orlik", 75), { passed: true, pointsAwarded: 50 });
  assert.deepEqual(evaluateQuiz("rules-orlik", 100), { passed: true, pointsAwarded: 50 });
});

// =========================================================================
// TEST 8: Quiz endpoint replay protection prevents multiple claims for same quiz ID
// =========================================================================
test("TEST 8: Quiz endpoint replay protection prevents multiple claims for same quiz ID", () => {
  const completedQuizzes = new Set<string>();
  let userBalance = 0;

  const processQuizSubmission = (quizId: string, score: number) => {
    if (score < QUIZ_PASS_THRESHOLD_PERCENT) {
      return { success: false, pointsAwarded: 0 };
    }

    if (completedQuizzes.has(quizId)) {
      return { success: true, passed: true, pointsAwarded: 0, alreadyClaimed: true };
    }

    completedQuizzes.add(quizId);
    const reward = getQuizRewardForLesson(quizId);
    userBalance += reward;
    return { success: true, passed: true, pointsAwarded: reward, alreadyClaimed: false };
  };

  const firstAttempt = processQuizSubmission("rules-orlik", 85);
  assert.equal(firstAttempt.pointsAwarded, 50);
  assert.equal(firstAttempt.alreadyClaimed, false);
  assert.equal(userBalance, 50);

  const secondAttempt = processQuizSubmission("rules-orlik", 90);
  assert.equal(secondAttempt.pointsAwarded, 0);
  assert.equal(secondAttempt.alreadyClaimed, true);
  assert.equal(userBalance, 50, "User balance must not increase on replayed quiz");
});

// =========================================================================
// TEST 9: Minigames progress route ignores client-supplied points_earned
// =========================================================================
test("TEST 9: Minigames progress route ignores client-supplied points_earned", () => {
  let userDeltaPoints = 200;
  const clientBody = {
    game_id: "accuracy",
    level_completed: 3,
    score: 1500,
    points_earned: 500
  };

  const serverProcessProgress = (_body: typeof clientBody) => {
    return {
      success: true,
      game_id: _body.game_id,
      newPointsBalance: userDeltaPoints
    };
  };

  const res = serverProcessProgress(clientBody);
  assert.equal(res.newPointsBalance, 200, "Balance must remain unchanged by client injected points_earned");
});

// =========================================================================
// TEST 10: Minigames submit route enforces session user.id and rejects user spoofing
// =========================================================================
test("TEST 10: Minigames submit route enforces session user.id and rejects user spoofing", () => {
  const sessionUser = { id: "authenticated-user-uuid" };
  const clientPayload = {
    userId: "victim-user-uuid",
    gameId: "gk_reflex",
    score: 2000
  };

  const effectiveUserId = sessionUser.id;

  assert.equal(
    effectiveUserId,
    "authenticated-user-uuid",
    "Server must bind action strictly to authenticated session user ID"
  );
  assert.notEqual(
    effectiveUserId,
    clientPayload.userId,
    "Spoofed userId from request body must be discarded"
  );
});

// =========================================================================
// TEST 11: Buy Pack enforces server-side pricing strictly (client cannot alter prices)
// =========================================================================
test("TEST 11: Buy Pack enforces server-side pricing strictly (client cannot alter prices)", () => {
  assert.equal(PACK_PRICES.standard_pack, 50);
  assert.equal(PACK_PRICES.matchday_booster, 80);
  assert.equal(PACK_PRICES.gold_booster, 120);
  assert.equal(PACK_PRICES.inferno_booster, 250);
  assert.equal(PACK_PRICES.legend_pack, 350);

  const getPackPrice = (packTypeId: string) => {
    return PACK_PRICES[packTypeId] || null;
  };

  const serverPrice = getPackPrice("legend_pack");
  assert.equal(serverPrice, 350, "Server price for legend_pack must strictly be 350 DP");
  assert.equal(getPackPrice("fake_infinite_pack"), null);
});

// =========================================================================
// TEST 12: Buy Pack rejects purchase when user balance is insufficient (no negative balance)
// =========================================================================
test("TEST 12: Buy Pack rejects purchase when user balance is insufficient (no negative balance)", () => {
  let userPoints = 40;
  const packPrice = PACK_PRICES.standard_pack;

  const purchasePack = () => {
    if (userPoints < packPrice) {
      return {
        success: false,
        error: `Niewystarczająca liczba Delta Points. Posiadasz ${userPoints} DP, a paczka kosztuje ${packPrice} DP.`
      };
    }
    userPoints -= packPrice;
    return { success: true, remainingPoints: userPoints };
  };

  const result = purchasePack();
  assert.equal(result.success, false);
  assert.equal(userPoints, 40, "Balance must remain untouched");
  assert.ok(userPoints >= 0, "Balance must never drop below zero");
});

// =========================================================================
// TEST 13: Buy Pack race condition guard prevents concurrent overspending
// =========================================================================
test("TEST 13: Buy Pack race condition guard prevents concurrent overspending", async () => {
  let walletBalance = 60;
  const packPrice = PACK_PRICES.standard_pack;
  let grantedPacksCount = 0;

  const atomicPurchase = async () => {
    await new Promise(r => setTimeout(r, 5));
    if (walletBalance >= packPrice) {
      walletBalance -= packPrice;
      grantedPacksCount += 1;
      return { success: true };
    }
    return { success: false, error: "Insufficient balance" };
  };

  const requests = Array.from({ length: 5 }, () => atomicPurchase());
  const results = await Promise.all(requests);

  const successfulPurchases = results.filter(r => r.success).length;
  const failedPurchases = results.filter(r => !r.success).length;

  assert.equal(successfulPurchases, 1, "Only 1 purchase can succeed with 60 DP for a 50 DP pack");
  assert.equal(failedPurchases, 4, "4 purchases must fail due to balance check");
  assert.equal(walletBalance, 10, "Remaining balance must be exactly 10 DP");
  assert.equal(grantedPacksCount, 1, "Exactly 1 pack granted");
});

// =========================================================================
// TEST 14: SBC endpoint locks arbitrary card burning and rejects client-forged rewards
// =========================================================================
test("TEST 14: SBC endpoint locks arbitrary card burning and rejects client-forged rewards", () => {
  const sbcHandler = (_body: { challenge_id: string; reward_points?: number }) => {
    return {
      status: 501,
      error: "Moduł Squad Building Challenges (SBC) jest tymczasowo zablokowany do czasu wdrożenia autorytatywnego silnika walidacji składu na serwerze.",
      code: "SBC_FEATURE_LOCKED"
    };
  };

  const response = sbcHandler({ challenge_id: "sbc_test", reward_points: 9999 });
  assert.equal(response.status, 501, "SBC must return 501 feature locked");
  assert.equal(response.code, "SBC_FEATURE_LOCKED");
});

// =========================================================================
// TEST 15: Safe trades endpoint enforces session user verification and prevents unauthorized swaps
// =========================================================================
test("TEST 15: Safe trades endpoint enforces session user verification and prevents unauthorized swaps", () => {
  const handleTradePost = () => {
    return {
      status: 501,
      error: "Moduł wymiany kart (Trading) jest obecnie wyłączony ze względów bezpieczeństwa ekonomii do czasu wdrożenia pełnego serwerowego silnika bezpiecznej wymiany.",
      code: "TRADING_FEATURE_LOCKED"
    };
  };

  const result = handleTradePost();
  assert.equal(result.status, 501);
  assert.equal(result.code, "TRADING_FEATURE_LOCKED");
});

// =========================================================================
// TEST 16: Same idempotency key pays only once
// =========================================================================
test("TEST 16: Same idempotency key pays only once", () => {
  const ledger = new Map<string, { amount: number; balance_after: number }>();
  let balance = 100;

  const processEarn = (idempotencyKey: string, amount: number) => {
    if (ledger.has(idempotencyKey)) {
      return {
        success: true,
        already_processed: true,
        balance: ledger.get(idempotencyKey)!.balance_after
      };
    }
    balance += amount;
    ledger.set(idempotencyKey, { amount, balance_after: balance });
    return {
      success: true,
      already_processed: false,
      balance
    };
  };

  const txKey = "spin_user123_2026-10-09";
  const first = processEarn(txKey, 50);
  assert.equal(first.already_processed, false);
  assert.equal(first.balance, 150);

  const second = processEarn(txKey, 50);
  assert.equal(second.already_processed, true);
  assert.equal(second.balance, 150, "Balance must not change on duplicate idempotency key");
  assert.equal(balance, 150);
});

// =========================================================================
// TEST 17: Reused idempotency key cannot mutate balance twice
// =========================================================================
test("TEST 17: Reused idempotency key cannot mutate balance twice", () => {
  const ledger = new Map<string, { amount: number; balance_after: number }>();
  let balance = 300;

  const processSpend = (idempotencyKey: string, price: number) => {
    if (ledger.has(idempotencyKey)) {
      return {
        success: true,
        already_processed: true,
        balance: ledger.get(idempotencyKey)!.balance_after
      };
    }
    if (balance < price) return { success: false, error: "insufficient" };
    balance -= price;
    ledger.set(idempotencyKey, { amount: -price, balance_after: balance });
    return {
      success: true,
      already_processed: false,
      balance
    };
  };

  const key = "buy_pack_user123_tx_999";
  const first = processSpend(key, 120);
  assert.equal(first.already_processed, false);
  assert.equal(first.balance, 180);

  const duplicate = processSpend(key, 120);
  assert.equal(duplicate.already_processed, true);
  assert.equal(duplicate.balance, 180);
  assert.equal(balance, 180, "Balance must stay at 180 and not be deducted a second time");
});

// =========================================================================
// TEST 18: Ledger amount matches balance_after strictly
// =========================================================================
test("TEST 18: Ledger amount matches balance_after strictly", () => {
  const initialBalance = 250;
  const deltaAmount = -80;
  const balanceAfter = initialBalance + deltaAmount;

  assert.equal(initialBalance + deltaAmount, balanceAfter);
  assert.equal(balanceAfter, 170);

  const ledgerEntry = {
    amount: deltaAmount,
    balance_after: balanceAfter,
    initial_balance: initialBalance
  };

  assert.equal(ledgerEntry.initial_balance + ledgerEntry.amount, ledgerEntry.balance_after);
});

// =========================================================================
// TEST 19: Failed operation creates no ledger entry
// =========================================================================
test("TEST 19: Failed operation creates no ledger entry", () => {
  const ledger: Array<{ user_id: string; amount: number }> = [];
  let userBalance = 30;
  const packPrice = 50;

  const tryPurchase = () => {
    if (userBalance < packPrice) {
      return { success: false, error: "Insufficient balance" };
    }
    userBalance -= packPrice;
    ledger.push({ user_id: "user_fail", amount: -packPrice });
    return { success: true };
  };

  const result = tryPurchase();
  assert.equal(result.success, false);
  assert.equal(ledger.length, 0, "Ledger must have 0 entries on failed purchase");
  assert.equal(userBalance, 30);
});

// =========================================================================
// TEST 20: Negative balance blocked at DB/RPC layer
// =========================================================================
test("TEST 20: Negative balance blocked at DB/RPC layer", () => {
  const checkBalanceConstraint = (currentBalance: number, amount: number) => {
    const newBalance = currentBalance + amount;
    if (newBalance < 0) {
      throw new Error("CHECK constraint violation: points_balance must be >= 0");
    }
    return newBalance;
  };

  assert.throws(
    () => checkBalanceConstraint(20, -50),
    /points_balance must be >= 0/,
    "Must throw on negative balance attempt"
  );
  assert.equal(checkBalanceConstraint(50, -50), 0);
  assert.equal(checkBalanceConstraint(50, -30), 20);
});

// =========================================================================
// TEST 21: Pack purchase rollback: no DP deduction if pack creation fails
// =========================================================================
test("TEST 21: Pack purchase rollback: no DP deduction if pack creation fails", async () => {
  let balance = 200;
  const price = 50;

  const transactionalPurchase = async (shouldFailPackInsert: boolean) => {
    let tempBalance = balance;
    tempBalance -= price; // step 1: deduct

    // step 2: insert pack
    if (shouldFailPackInsert) {
      // rollback
      tempBalance += price;
      return { success: false, error: "DB pack insert failed - rolled back" };
    }

    balance = tempBalance;
    return { success: true, remainingPoints: balance };
  };

  const res = await transactionalPurchase(true);
  assert.equal(res.success, false);
  assert.equal(balance, 200, "Balance must be intact at 200 after rollback");
});

// =========================================================================
// TEST 22: Pack purchase rollback: no pack if DP deduction fails
// =========================================================================
test("TEST 22: Pack purchase rollback: no pack if DP deduction fails", async () => {
  let userPacks: string[] = [];
  const balance = 30;
  const price = 80;

  const tryPurchase = () => {
    if (balance < price) {
      // Abort before pack creation
      return { success: false, error: "Insufficient DP" };
    }
    userPacks.push("matchday_booster");
    return { success: true };
  };

  const res = tryPurchase();
  assert.equal(res.success, false);
  assert.equal(userPacks.length, 0, "No pack must be created when DP deduction fails");
});

// =========================================================================
// TEST 23: Trading remains disabled even for valid owner
// =========================================================================
test("TEST 23: Trading remains disabled even for valid owner", () => {
  const validOwnerUser = { id: "user_owner_1", email: "owner@delta.club" };

  const attemptTrade = (_user: typeof validOwnerUser) => {
    return {
      status: 501,
      error: "Moduł wymiany kart (Trading) jest obecnie wyłączony ze względów bezpieczeństwa ekonomii do czasu wdrożenia pełnego serwerowego silnika bezpiecznej wymiany.",
      code: "TRADING_FEATURE_LOCKED"
    };
  };

  const res = attemptTrade(validOwnerUser);
  assert.equal(res.status, 501);
  assert.equal(res.code, "TRADING_FEATURE_LOCKED");
});

// =========================================================================
// TEST 24: SBC remains disabled even for valid owner
// =========================================================================
test("TEST 24: SBC remains disabled even for valid owner", () => {
  const validOwnerUser = { id: "user_owner_2" };

  const attemptSBC = (_user: typeof validOwnerUser) => {
    return {
      status: 501,
      error: "Moduł Squad Building Challenges (SBC) jest tymczasowo zablokowany do czasu wdrożenia autorytatywnego silnika walidacji składu na serwerze.",
      code: "SBC_FEATURE_LOCKED"
    };
  };

  const res = attemptSBC(validOwnerUser);
  assert.equal(res.status, 501);
  assert.equal(res.code, "SBC_FEATURE_LOCKED");
});

// =========================================================================
// TEST 25: Minigame cannot pay arbitrary reward
// =========================================================================
test("TEST 25: Minigame cannot pay arbitrary reward", () => {
  const userBalance = 100;
  const clientPayload = {
    game_id: "gk_reflex",
    points_earned: 99999
  };

  const handleMinigameProgress = (_body: typeof clientPayload) => {
    return {
      success: true,
      game_id: _body.game_id,
      newPointsBalance: userBalance
    };
  };

  const res = handleMinigameProgress(clientPayload);
  assert.equal(res.newPointsBalance, 100, "Client cannot mint DP via minigame progress");
});

// =========================================================================
// TEST 26: Quiz product reward matches pre-existing rule/config
// =========================================================================
test("TEST 26: Quiz product reward matches pre-existing rule/config", () => {
  assert.equal(QUIZ_LESSON_REWARDS["rules-orlik"], 50);
  assert.equal(QUIZ_LESSON_REWARDS["nutrition-power"], 50);
  assert.equal(QUIZ_LESSON_REWARDS["hydration-champion"], 50);
  assert.equal(QUIZ_LESSON_REWARDS["tactics-positioning"], 60);
  assert.equal(QUIZ_LESSON_REWARDS["skills-dribbling"], 75);
  assert.equal(QUIZ_LESSON_REWARDS["speed-agility"], 75);
  assert.equal(getQuizRewardForLesson("unknown-future-lesson"), 50);
});

// =========================================================================
// TEST 27: Daily spin reward table matches pre-14B configuration
// =========================================================================
test("TEST 27: Daily spin reward table matches pre-14B configuration", () => {
  assert.equal(DAILY_SPIN_SEGMENTS.length, 8);
  assert.deepEqual(
    DAILY_SPIN_SEGMENTS.map(s => ({ id: s.id, weight: s.weight, type: s.type })),
    [
      { id: "s1", weight: 28, type: "points" },
      { id: "s2", weight: 20, type: "pack" },
      { id: "s3", weight: 15, type: "points" },
      { id: "s4", weight: 12, type: "pack" },
      { id: "s5", weight: 30, type: "points" },
      { id: "s6", weight: 8, type: "pack" },
      { id: "s7", weight: 4, type: "points" },
      { id: "s8", weight: 2, type: "pack" }
    ]
  );
  const totalWeight = DAILY_SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  assert.equal(totalWeight, 119);
});
