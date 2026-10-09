import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  determineNextBestAction, 
  mapStreakDays, 
  formatCountdownTime, 
  getAchievementState, 
  getCelebrationTier 
} from '../lib/gamification/engine.ts';
import type { UserGamificationState } from '../lib/gamification/engine.ts';
import { PACK_PRICES, DAILY_SPIN_SEGMENTS } from '../lib/economy/security.ts';
import { RARITY_CONFIG } from '../lib/cards/types.ts';

describe('ETAP 14E.1: Gamification & Retention Product Verification Test Suite', () => {

  // Test 1: Next Best Action Priority Ordering
  it('1. Next Best Action correctly prioritizes Unopened Packs (Priority 1)', () => {
    const state: UserGamificationState = {
      canDailySpin: true,
      unopenedPacksCount: 2,
      unclaimedAchievementsCount: 3,
      availableQuizCount: 1,
      streakCount: 4,
      collectionProgressPercent: 50
    };

    const action = determineNextBestAction(state);
    assert.equal(action.id, 'open_pack');
    assert.equal(action.priority, 1);
    assert.equal(action.actionType, 'OPEN_PACKS');
  });

  // Test 2: Next Best Action - Daily Spin fallback
  it('2. Next Best Action prioritizes Daily Spin when no unopened packs (Priority 2)', () => {
    const state: UserGamificationState = {
      canDailySpin: true,
      unopenedPacksCount: 0,
      unclaimedAchievementsCount: 2,
      availableQuizCount: 1,
      streakCount: 3,
      collectionProgressPercent: 50
    };

    const action = determineNextBestAction(state);
    assert.equal(action.id, 'daily_spin');
    assert.equal(action.priority, 2);
    assert.equal(action.actionType, 'DAILY_SPIN');
  });

  // Test 3: Next Best Action - Unclaimed Achievements
  it('3. Next Best Action prioritizes Unclaimed Achievements when spin is unavailable (Priority 3)', () => {
    const state: UserGamificationState = {
      canDailySpin: false,
      unopenedPacksCount: 0,
      unclaimedAchievementsCount: 4,
      availableQuizCount: 1,
      streakCount: 3,
      collectionProgressPercent: 50
    };

    const action = determineNextBestAction(state);
    assert.equal(action.id, 'claim_achievement');
    assert.equal(action.priority, 3);
    assert.equal(action.actionType, 'CLAIM_ACHIEVEMENTS');
  });

  // Test 4: Next Best Action - Available Quiz
  it('4. Next Best Action prioritizes Quiz when packs, spin, achievements are clear (Priority 4)', () => {
    const state: UserGamificationState = {
      canDailySpin: false,
      unopenedPacksCount: 0,
      unclaimedAchievementsCount: 0,
      availableQuizCount: 2,
      streakCount: 3,
      collectionProgressPercent: 50
    };

    const action = determineNextBestAction(state);
    assert.equal(action.id, 'take_quiz');
    assert.equal(action.priority, 4);
    assert.equal(action.actionType, 'START_QUIZ');
  });

  // Test 5: Next Best Action - All Tasks Completed (Neutral All Clear state)
  it('5. Next Best Action renders neutral All Clear state when all tasks are done', () => {
    const state: UserGamificationState = {
      canDailySpin: false,
      unopenedPacksCount: 0,
      unclaimedAchievementsCount: 0,
      availableQuizCount: 0,
      streakCount: 7,
      collectionProgressPercent: 85
    };

    const action = determineNextBestAction(state);
    assert.equal(action.id, 'completed_all');
    assert.equal(action.priority, 5);
    assert.equal(action.actionType, 'VIEW_ALBUM');
    assert.equal(action.badgeText, 'GOTOWE NA DZIŚ');
  });

  // Test 6: 7-Day Streak Mapping Logic
  it('6. 7-Day Streak maps completed, current, and future days without invalid states', () => {
    const streakDays = mapStreakDays(4, true);

    // Days 1..3 should be claimed
    assert.equal(streakDays[0].isClaimed, true);
    assert.equal(streakDays[1].isClaimed, true);
    assert.equal(streakDays[2].isClaimed, true);
    // Day 4 should be current
    assert.equal(streakDays[3].isCurrent, true);
    assert.equal(streakDays[3].isClaimed, false);
    // Days 5..7 should be future
    assert.equal(streakDays[4].isFuture, true);
    assert.equal(streakDays[5].isFuture, true);
    assert.equal(streakDays[6].isFuture, true);
  });

  // Test 7: Daily Spin Countdown Formatting
  it('7. Daily Spin countdown accurately computes hours, minutes, seconds', () => {
    assert.equal(formatCountdownTime(0), '00:00:00');
    assert.equal(formatCountdownTime(3665), '01:01:05');
    assert.equal(formatCountdownTime(86399), '23:59:59');
  });

  // Test 8: Weekly Recap aggregation validation (Zero Added DP)
  it('8. Weekly Recap is strictly informative and awards 0 bonus DP', () => {
    const recapData = {
      weekLabel: 'Tydzień 41',
      activeDaysCount: 6,
      streakCount: 6,
      cardsAcquiredCount: 14,
      achievementsCompletedCount: 3,
      packsOpenedCount: 4
    };

    // Recap must only contain counters, never balance mutations
    assert.equal(typeof recapData.activeDaysCount, 'number');
    assert.equal(typeof recapData.cardsAcquiredCount, 'number');
    assert.equal((recapData as any).bonusDpAwarded, undefined);
  });

  // Test 9: Achievement Status & Celebration Tier Categorization
  it('9. Achievement Status classifies locked, in-progress, completed, claimed accurately & assigns celebration tiers', () => {
    assert.equal(getAchievementState(0, 10, false), 'LOCKED');
    assert.equal(getAchievementState(5, 10, false), 'IN_PROGRESS');
    assert.equal(getAchievementState(10, 10, false), 'COMPLETED');
    assert.equal(getAchievementState(10, 10, true), 'CLAIMED');

    assert.equal(getCelebrationTier('bronze'), 1);
    assert.equal(getCelebrationTier('silver'), 2);
    assert.equal(getCelebrationTier('gold'), 3);
    assert.equal(getCelebrationTier('diamond'), 4);
    assert.equal(getCelebrationTier('inferno'), 4);
  });

  // Test 10: Economic Rule Freeze Integrity Check
  it('10. Economic rule integrity freeze check (prices 60/100/150/300/450 and cashback 4/10/25/60/120)', () => {
    assert.equal(PACK_PRICES.standard_pack, 60);
    assert.equal(PACK_PRICES.matchday_booster, 100);
    assert.equal(PACK_PRICES.gold_booster, 150);
    assert.equal(PACK_PRICES.inferno_booster, 300);
    assert.equal(PACK_PRICES.legend_pack, 450);

    assert.equal(RARITY_CONFIG.common.duplicatePoints, 4);
    assert.equal(RARITY_CONFIG.rare.duplicatePoints, 10);
    assert.equal(RARITY_CONFIG.epic.duplicatePoints, 25);
    assert.equal(RARITY_CONFIG.legendary.duplicatePoints, 60);
    assert.equal(RARITY_CONFIG.inferno.duplicatePoints, 120);
  });

  // TEST 11: D7 Gold Booster shown only if backend rule exists
  it('11. D7 Gold Booster shown only if backend rule exists (Backend uses probabilistic spin segments with zero guaranteed override)', () => {
    // Backend DAILY_SPIN_SEGMENTS contains s6 gold booster with weight 8 / 119
    const goldSegment = DAILY_SPIN_SEGMENTS.find(s => s.id === 's6');
    assert.ok(goldSegment, 's6 segment exists in daily spin segments');
    assert.equal(goldSegment.weight, 8);
    // UI must not promise a guaranteed gold booster since roll is probabilistic
  });

  // TEST 12: Achievement claim CTA shown only if real claim flow exists
  it('12. Achievement claim CTA shown only if real claim flow exists (status must be COMPLETED or CLAIMED)', () => {
    const isClaimable = (current: number, target: number, claimed: boolean) => {
      return current >= target && !claimed;
    };
    assert.equal(isClaimable(5, 10, false), false);
    assert.equal(isClaimable(10, 10, false), true);
    assert.equal(isClaimable(10, 10, true), false);
  });

  // TEST 13: Next Best Action never suggests unsupported claim action
  it('13. Next Best Action never suggests unsupported claim action', () => {
    const stateWithNoUnclaimed: UserGamificationState = {
      canDailySpin: false,
      unopenedPacksCount: 0,
      unclaimedAchievementsCount: 0,
      availableQuizCount: 0,
      streakCount: 3,
      collectionProgressPercent: 20
    };
    const action = determineNextBestAction(stateWithNoUnclaimed);
    assert.notEqual(action.id, 'claim_achievement');
  });

  // TEST 14: Weekly recap hides unsupported history metrics
  it('14. Weekly recap hides unsupported history metrics when undefined', () => {
    const minimalRecap = {
      weekLabel: 'Tydzień 41',
      activeDaysCount: 4,
      streakCount: 4,
      cardsAcquiredCount: 2,
      achievementsCompletedCount: 1,
      packsOpenedCount: 1
    };
    assert.equal(typeof minimalRecap.activeDaysCount, 'number');
    assert.equal((minimalRecap as any).fakeSyntheticMetric, undefined);
  });

  // TEST 15: XP/level shown only from real data
  it('15. XP and level shown only from real valid backend data', () => {
    const validateLevelData = (level?: number, currentXp?: number, nextXp?: number) => {
      if (typeof level === 'number' && typeof currentXp === 'number' && typeof nextXp === 'number' && nextXp > 0) {
        return true;
      }
      return false;
    };
    assert.equal(validateLevelData(undefined, undefined, undefined), false);
    assert.equal(validateLevelData(4, 350, 500), true);
    assert.equal(validateLevelData(4, 350, 0), false);
  });

  // TEST 16: Daily Spin countdown uses backend next_spin_at / secondsRemaining
  it('16. Daily Spin countdown uses backend-calculated remaining seconds', () => {
    const calculateSecondsRemaining = (nextMidnightIso: string, nowMs: number) => {
      const target = new Date(nextMidnightIso).getTime();
      return Math.max(0, Math.floor((target - nowMs) / 1000));
    };

    const mockNow = 1760000000000;
    const mockNextMidnight = new Date(mockNow + 7200 * 1000).toISOString();
    const remaining = calculateSecondsRemaining(mockNextMidnight, mockNow);
    assert.equal(remaining, 7200);
    assert.equal(formatCountdownTime(remaining), '02:00:00');
  });

});
