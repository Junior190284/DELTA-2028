import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  EconomyRpcError,
  adminManageEconomyServerSide,
  claimAchievementRewardServerSide,
  claimChallengeRewardServerSide,
  claimDailySpinServerSide,
  claimQuestRewardServerSide,
  claimSeasonPassRewardServerSide,
  completeQuizServerSide,
  grantSpecialCardServerSide,
  purchasePackServerSide,
  serializeEconomyError,
  setUserCardFlagServerSide,
  syncRewardsServerSide
} from "../lib/economy/server-rpc.ts";
import { DAILY_SPIN_SEGMENTS, WEEKLY_QUEST_REWARDS } from "../lib/economy/security.ts";

interface SimDbState {
  profiles: Record<string, { id: string; role: string; display_name: string }>;
  players: Record<string, { id: string; display_name: string }>;
  parentPlayers: Array<{ parent_id: string; player_id: string }>;
  cardDefinitions: Array<Record<string, any>>;
  userCards: Array<Record<string, any>>;
  userUnopenedPacks: Array<Record<string, any>>;
  userDeltaPoints: Record<string, { user_id: string; points_balance: number; total_earned: number }>;
  deltaTransactions: Array<Record<string, any>>;
  userDailySpins: Record<
    string,
    { user_id: string; last_spin_at: string; last_streak_date: string; streak_count: number; total_spins: number }
  >;
  userClaimedChallenges: Array<{ user_id: string; challenge_id: string; reward_summary: any }>;
  userQuizCompletions: Array<{ user_id: string; quiz_id: string; score: number; points_awarded: number }>;
  userClaimedRewards: Array<{
    user_id: string;
    reward_key: string;
    reward_type: string;
    points_awarded: number;
    pack_type_id: string | null;
  }>;
  achievementDefinitions: Record<string, { id: string; title: string; reward_dp: number; reward_pack_type: string | null }>;
  userAchievements: Array<{
    id: string;
    user_id: string;
    player_id: string;
    achievement_id: string;
    is_unlocked: boolean;
    claimed_reward: boolean;
    claimed_at: string | null;
  }>;
  adminCardGrants: Array<{ admin_id: string; user_id: string; card_id: string; reason: string }>;
  userGameProfiles: Record<string, { user_id: string; season_xp: number }>;
  matchAttendance: Array<{ player_id: string; status: string; match: any }>;
  trainingAttendance: Array<{ player_id: string; status: string; training_id: string }>;
  matchEvents: Array<{ match_id: string; player_id: string; assist_player_id?: string | null; event_type: string }>;
  matchPredictions: Array<{ id: string; user_id: string }>;
}

function createEconomyMock(
  seed?: Partial<SimDbState>,
  options?: {
    rpcError?: { code?: string; message?: string } | null;
    rpcDelayMs?: number;
    omitRpcMethod?: boolean;
    simulatePurchaseDpFailure?: boolean;
  }
) {
  const state: SimDbState = {
    profiles: {
      "11111111-1111-4111-8111-111111111111": {
        id: "11111111-1111-4111-8111-111111111111",
        role: "parent",
        display_name: "Rodzic Jan"
      },
      "22222222-2222-4222-8222-222222222222": {
        id: "22222222-2222-4222-8222-222222222222",
        role: "admin",
        display_name: "Admin Adam"
      },
      "33333333-3333-4333-8333-333333333333": {
        id: "33333333-3333-4333-8333-333333333333",
        role: "coach",
        display_name: "Trener Marek"
      },
      "44444444-4444-4444-8444-444444444444": {
        id: "44444444-4444-4444-8444-444444444444",
        role: "parent",
        display_name: "Obcy Piotr"
      },
      ...(seed?.profiles ?? {})
    },
    players: {
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        display_name: "Ryszard Rybacki"
      },
      ...(seed?.players ?? {})
    },
    parentPlayers: seed?.parentPlayers ?? [],
    cardDefinitions: seed?.cardDefinitions ?? [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        player_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        card_name: "Ryszard — Inferno",
        card_type: "inferno",
        rarity: "inferno",
        is_active: true,
        player: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", display_name: "Ryszard Rybacki", position: "Napastnik" }
      }
    ],
    userCards: seed?.userCards ?? [],
    userUnopenedPacks: seed?.userUnopenedPacks ?? [],
    userDeltaPoints: seed?.userDeltaPoints ?? {},
    deltaTransactions: seed?.deltaTransactions ?? [],
    userDailySpins: seed?.userDailySpins ?? {},
    userClaimedChallenges: seed?.userClaimedChallenges ?? [],
    userQuizCompletions: seed?.userQuizCompletions ?? [],
    userClaimedRewards: seed?.userClaimedRewards ?? [],
    achievementDefinitions: seed?.achievementDefinitions ?? {
      first_goal: {
        id: "first_goal",
        title: "Pierwszy Gol",
        reward_dp: 75,
        reward_pack_type: "standard_pack"
      }
    },
    userAchievements: seed?.userAchievements ?? [],
    adminCardGrants: seed?.adminCardGrants ?? [],
    userGameProfiles: seed?.userGameProfiles ?? {},
    matchAttendance: seed?.matchAttendance ?? [],
    trainingAttendance: seed?.trainingAttendance ?? [],
    matchEvents: seed?.matchEvents ?? [],
    matchPredictions: seed?.matchPredictions ?? []
  };

  const directEconomyWrites: Array<{ table: string; op: string }> = [];
  const mutexes = new Map<string, Promise<void>>();

  async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = mutexes.get(key) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => {
      release = resolve;
    });
    mutexes.set(key, prev.then(() => next));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  function applyDp(
    userId: string,
    amount: number,
    transactionType: string,
    sourceType: string,
    sourceId: string | null,
    idemKey?: string | null
  ) {
    const cleanKey = typeof idemKey === "string" && idemKey.trim() !== "" ? idemKey.trim() : null;
    if (cleanKey) {
      const existing = state.deltaTransactions.find(t => t.idempotency_key === cleanKey);
      if (existing) {
        if (
          existing.user_id !== userId ||
          existing.amount !== amount ||
          existing.transaction_type !== transactionType ||
          existing.source_type !== sourceType ||
          (existing.source_id ?? null) !== (sourceId ?? null)
        ) {
          return {
            success: false,
            code: "IDEMPOTENCY_CONFLICT",
            status: 409,
            error: "Konflikt klucza idempotencji: niezgodne parametry ponowionej transakcji"
          };
        }
        return {
          success: true,
          already_processed: true,
          transaction_id: existing.id,
          new_balance: existing.balance_after,
          amount: existing.amount
        };
      }
    }
    const cur = state.userDeltaPoints[userId] ?? { user_id: userId, points_balance: 0, total_earned: 0 };
    const nextBal = cur.points_balance + amount;
    if (nextBal < 0) return { success: false, error: "Niewystarczające saldo Delta Points" };
    cur.points_balance = nextBal;
    if (amount > 0) cur.total_earned += amount;
    state.userDeltaPoints[userId] = cur;
    const txId = `tx-${state.deltaTransactions.length + 1}`;
    state.deltaTransactions.push({
      id: txId,
      user_id: userId,
      amount,
      balance_after: nextBal,
      transaction_type: transactionType,
      source_type: sourceType,
      source_id: sourceId ?? null,
      idempotency_key: cleanKey
    });
    return { success: true, already_processed: false, transaction_id: txId, new_balance: nextBal, amount };
  }

  const client: any = {
    from(table: string) {
      const filters: Array<{ op: "eq" | "in" | "neq"; col: string; val: any }> = [];
      let pendingOp: "select" | "insert" | "update" | "delete" = "select";
      let pendingPayload: any = null;
      let countMode = false;

      const getRows = (): any[] => {
        switch (table) {
          case "profiles":
            return Object.values(state.profiles);
          case "players":
            return Object.values(state.players);
          case "parent_players":
            return state.parentPlayers;
          case "card_definitions":
            return state.cardDefinitions;
          case "user_cards":
            return state.userCards;
          case "user_unopened_packs":
            return state.userUnopenedPacks;
          case "user_delta_points":
            return Object.values(state.userDeltaPoints);
          case "user_daily_spins":
            return Object.values(state.userDailySpins);
          case "user_claimed_challenges":
            return state.userClaimedChallenges;
          case "user_quiz_completions":
            return state.userQuizCompletions;
          case "user_claimed_rewards":
            return state.userClaimedRewards;
          case "achievement_definitions":
            return Object.values(state.achievementDefinitions);
          case "user_achievements":
            return state.userAchievements;
          case "user_game_profile":
            return Object.values(state.userGameProfiles);
          case "match_attendance":
            return state.matchAttendance;
          case "training_attendance":
            return state.trainingAttendance;
          case "match_events":
            return state.matchEvents;
          case "match_predictions":
            return state.matchPredictions;
          default:
            return [];
        }
      };

      const matchRow = (row: any) =>
        filters.every(f => {
          if (f.op === "eq") return row[f.col] === f.val;
          if (f.op === "neq") return row[f.col] !== f.val;
          if (f.op === "in") return Array.isArray(f.val) && f.val.includes(row[f.col]);
          return true;
        });

      const run = async () => {
        const rows = getRows();
        if (pendingOp === "update" && table === "user_cards") {
          const matched = rows.filter(matchRow);
          matched.forEach(r => Object.assign(r, pendingPayload));
          return { data: structuredClone(matched), error: null };
        }
        if (pendingOp === "insert" && table === "user_unopened_packs") {
          const arr = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
          arr.forEach((item, idx) =>
            state.userUnopenedPacks.push({ id: `pack-${state.userUnopenedPacks.length + idx + 1}`, ...item })
          );
          return { data: arr, error: null };
        }
        if (pendingOp === "insert" && table === "card_definitions") {
          const id = `card-def-${state.cardDefinitions.length + 1}`;
          const row = { id, ...pendingPayload };
          state.cardDefinitions.push(row);
          return { data: [row], error: null };
        }
        if (pendingOp === "delete" && table === "user_cards") {
          state.userCards = state.userCards.filter(r => !matchRow(r));
          return { data: [], error: null };
        }
        const filtered = rows.filter(matchRow);
        if (countMode) {
          return { data: null, count: filtered.length, error: null };
        }
        return { data: structuredClone(filtered), error: null };
      };

      const builder: any = {
        select(_cols?: string, opts?: { count?: string; head?: boolean }) {
          if (opts?.count) countMode = true;
          return builder;
        },
        eq(col: string, val: any) {
          filters.push({ op: "eq", col, val });
          return builder;
        },
        neq(col: string, val: any) {
          filters.push({ op: "neq", col, val });
          return builder;
        },
        in(col: string, val: any[]) {
          filters.push({ op: "in", col, val });
          return builder;
        },
        order() {
          return builder;
        },
        insert(payload: any) {
          if (table === "user_delta_points" || table === "user_cards" || table === "delta_points_transactions") {
            directEconomyWrites.push({ table, op: "insert" });
          }
          pendingOp = "insert";
          pendingPayload = payload;
          return builder;
        },
        update(payload: any) {
          if (table === "user_delta_points") {
            directEconomyWrites.push({ table, op: "update" });
          }
          pendingOp = "update";
          pendingPayload = payload;
          return builder;
        },
        upsert() {
          directEconomyWrites.push({ table, op: "upsert" });
          throw new Error(`FORBIDDEN DIRECT UPSERT ON ${table}`);
        },
        delete() {
          pendingOp = "delete";
          return builder;
        },
        async maybeSingle() {
          const res = await run();
          return { data: res.data?.[0] ?? null, error: res.error };
        },
        async single() {
          const res = await run();
          return { data: res.data?.[0] ?? null, error: res.error };
        },
        then(resolve: any, reject: any) {
          return run().then(resolve, reject);
        }
      };
      return builder;
    }
  };

  if (!options?.omitRpcMethod) {
    client.rpc = async (fnName: string, args: Record<string, any>) => {
      if (options?.rpcDelayMs) {
        await new Promise(r => setTimeout(r, options.rpcDelayMs));
      }
      if (options?.rpcError) {
        return { data: null, error: options.rpcError };
      }

      const lockUser =
        args.p_user_id || args.p_target_user_id || "11111111-1111-4111-8111-111111111111";

      return withLock(String(lockUser), async () => {
        if (options?.rpcDelayMs) {
          await new Promise(r => setTimeout(r, options.rpcDelayMs));
        }

        if (fnName === "purchase_pack_atomic") {
          const buyerId = args.p_user_id;
          if (!buyerId) {
            return { data: { success: false, code: "UNAUTHORIZED", status: 401, error: "Wymagana autoryzacja" }, error: null };
          }
          const prices: Record<string, number> = {
            standard_pack: 60,
            matchday_booster: 100,
            gold_booster: 150,
            inferno_booster: 300,
            legend_pack: 450,
            legend_booster: 450
          };
          const price = prices[args.p_pack_type_id];
          if (!price) return { data: { success: false, code: "INVALID_PACK_TYPE", status: 400, error: "Nieprawidłowy typ paczki" }, error: null };
          const scopedIdem = args.p_idempotency_key ? `buy_${buyerId}_${args.p_idempotency_key}` : null;
          if (scopedIdem) {
            const existingTx = state.deltaTransactions.find(t => t.idempotency_key === scopedIdem);
            if (existingTx) {
              if (
                existingTx.user_id !== buyerId ||
                existingTx.amount !== -price ||
                existingTx.transaction_type !== "SPEND" ||
                existingTx.source_type !== "PACK_PURCHASE" ||
                existingTx.source_id !== args.p_pack_type_id
              ) {
                return {
                  data: {
                    success: false,
                    code: "IDEMPOTENCY_CONFLICT",
                    status: 409,
                    error: "Konflikt klucza idempotencji: niezgodny typ paczki lub kwota dla ponowionego zakupu"
                  },
                  error: null
                };
              }
              return {
                data: {
                  success: true,
                  already_processed: true,
                  new_balance: existingTx.balance_after,
                  pack_id: existingTx.pack_id ?? "pack-replay"
                },
                error: null
              };
            }
          }
          const cur = state.userDeltaPoints[buyerId]?.points_balance ?? 0;
          if (cur < price) {
            return {
              data: { success: false, code: "INSUFFICIENT_BALANCE", status: 400, error: "Niewystarczająca liczba Delta Points" },
              error: null
            };
          }
          // Symulacja transakcji SQL z pełnym rollbackiem przy awarii DP
          const snapshotPacks = structuredClone(state.userUnopenedPacks);
          const snapshotWallet = structuredClone(state.userDeltaPoints[buyerId]);
          const packId = `pack-${state.userUnopenedPacks.length + 1}`;
          state.userUnopenedPacks.push({
            id: packId,
            user_id: buyerId,
            pack_type_id: args.p_pack_type_id,
            is_opened: false
          });
          if (options?.simulatePurchaseDpFailure) {
            state.userUnopenedPacks = snapshotPacks;
            if (snapshotWallet) state.userDeltaPoints[buyerId] = snapshotWallet;
            return { data: null, error: { code: "XX000", message: "PURCHASE_PACK_DP_FAILED: simulated rollback" } };
          }
          const dp = applyDp(buyerId, -price, "SPEND", "PACK_PURCHASE", args.p_pack_type_id, scopedIdem);
          if (!dp.success) {
            state.userUnopenedPacks = snapshotPacks;
            if (snapshotWallet) state.userDeltaPoints[buyerId] = snapshotWallet;
            return { data: dp, error: null };
          }
          const lastTx = state.deltaTransactions[state.deltaTransactions.length - 1];
          if (lastTx) lastTx.pack_id = packId;
          return {
            data: { success: true, already_processed: false, new_balance: dp.new_balance, pack_id: packId },
            error: null
          };
        }

        if (fnName === "claim_daily_spin_atomic") {
          const today = new Date().toISOString().slice(0, 10);
          const spin = state.userDailySpins[args.p_user_id];
          if (spin && spin.last_spin_at.slice(0, 10) === today) {
            return {
              data: { success: false, code: "DAILY_LIMIT_REACHED", status: 429, error: "Dzienny limit wykorzystany!" },
              error: null
            };
          }
          let newBalance = state.userDeltaPoints[args.p_user_id]?.points_balance ?? 0;
          let grantedPackId: string | null = null;
          if (args.p_reward_type === "points") {
            const dp = applyDp(
              args.p_user_id,
              args.p_dp_amount,
              "EARN",
              "DAILY_SPIN",
              args.p_segment_id,
              `spin_${args.p_user_id}_${today}`
            );
            newBalance = dp.new_balance;
          } else {
            grantedPackId = `pack-spin-${state.userUnopenedPacks.length + 1}`;
            state.userUnopenedPacks.push({
              id: grantedPackId,
              user_id: args.p_user_id,
              pack_type_id: args.p_pack_type_id,
              source_reason: args.p_source_reason,
              is_opened: false
            });
          }
          state.userDailySpins[args.p_user_id] = {
            user_id: args.p_user_id,
            last_spin_at: new Date().toISOString(),
            last_streak_date: today,
            streak_count: (spin?.streak_count || 0) + 1,
            total_spins: (spin?.total_spins || 0) + 1
          };
          return {
            data: {
              success: true,
              new_balance: newBalance,
              granted_pack_id: grantedPackId,
              streak: state.userDailySpins[args.p_user_id].streak_count,
              total_spins: state.userDailySpins[args.p_user_id].total_spins
            },
            error: null
          };
        }

        if (fnName === "claim_challenge_reward_atomic") {
          const dup = state.userClaimedChallenges.find(
            c => c.user_id === args.p_user_id && c.challenge_id === args.p_challenge_id
          );
          if (dup) {
            return {
              data: { success: false, code: "ALREADY_CLAIMED", status: 409, error: "Już odebrano" },
              error: null
            };
          }
          state.userClaimedChallenges.push({
            user_id: args.p_user_id,
            challenge_id: args.p_challenge_id,
            reward_summary: args.p_reward_summary
          });
          let newBalance = state.userDeltaPoints[args.p_user_id]?.points_balance ?? 0;
          if (args.p_dp_amount > 0) {
            newBalance = applyDp(args.p_user_id, args.p_dp_amount, "EARN", "CHALLENGE", args.p_challenge_id).new_balance;
          }
          let grantedPackId: string | null = null;
          if (args.p_pack_type_id) {
            grantedPackId = `pack-ch-${state.userUnopenedPacks.length + 1}`;
            state.userUnopenedPacks.push({
              id: grantedPackId,
              user_id: args.p_user_id,
              pack_type_id: args.p_pack_type_id,
              source_reason: args.p_source_reason,
              is_opened: false
            });
          }
          return { data: { success: true, new_balance: newBalance, granted_pack_id: grantedPackId }, error: null };
        }

        if (fnName === "grant_sync_reward_packs_atomic") {
          const granted: any[] = [];
          for (const p of args.p_packs || []) {
            const exists = state.userUnopenedPacks.some(
              row => row.user_id === args.p_user_id && row.source_reason === p.source_reason
            );
            if (!exists) {
              const row = {
                id: `pack-sync-${state.userUnopenedPacks.length + 1}`,
                user_id: args.p_user_id,
                pack_type_id: p.pack_type_id,
                source_reason: p.source_reason,
                is_opened: false
              };
              state.userUnopenedPacks.push(row);
              granted.push(row);
            }
          }
          return { data: { success: true, granted_count: granted.length, granted_packs: granted }, error: null };
        }

        if (fnName === "claim_achievement_reward_atomic") {
          const ach = state.userAchievements.find(
            a => a.id === args.p_user_achievement_id && a.user_id === args.p_user_id
          );
          if (!ach) return { data: { success: false, code: "NOT_FOUND", status: 404, error: "Brak" }, error: null };
          if (!ach.is_unlocked) return { data: { success: false, code: "NOT_UNLOCKED", status: 400, error: "Zablokowane" }, error: null };
          if (ach.claimed_reward) return { data: { success: false, code: "ALREADY_CLAIMED", status: 409, error: "Już odebrane" }, error: null };
          ach.claimed_reward = true;
          ach.claimed_at = new Date().toISOString();
          const newBalance =
            args.p_reward_dp > 0
              ? applyDp(args.p_user_id, args.p_reward_dp, "EARN", "ACHIEVEMENT", ach.achievement_id).new_balance
              : state.userDeltaPoints[args.p_user_id]?.points_balance ?? 0;
          let grantedPackId: string | null = null;
          if (args.p_pack_type_id) {
            grantedPackId = `pack-ach-${state.userUnopenedPacks.length + 1}`;
            state.userUnopenedPacks.push({
              id: grantedPackId,
              user_id: args.p_user_id,
              pack_type_id: args.p_pack_type_id,
              source_reason: args.p_source_reason,
              is_opened: false
            });
          }
          return { data: { success: true, new_balance: newBalance, granted_pack_id: grantedPackId }, error: null };
        }

        if (fnName === "complete_quiz_reward_atomic") {
          const exists = state.userQuizCompletions.find(
            q => q.user_id === args.p_user_id && q.quiz_id === args.p_quiz_id
          );
          if (exists) {
            return {
              data: {
                success: true,
                already_claimed: true,
                points_awarded: 0,
                new_balance: state.userDeltaPoints[args.p_user_id]?.points_balance ?? 0
              },
              error: null
            };
          }
          state.userQuizCompletions.push({
            user_id: args.p_user_id,
            quiz_id: args.p_quiz_id,
            score: args.p_score,
            points_awarded: args.p_reward_dp
          });
          const dp = applyDp(args.p_user_id, args.p_reward_dp, "EARN", "QUIZ_COMPLETION", args.p_quiz_id);
          return {
            data: { success: true, already_claimed: false, points_awarded: args.p_reward_dp, new_balance: dp.new_balance },
            error: null
          };
        }

        if (fnName === "claim_reward_once_atomic") {
          const dup = state.userClaimedRewards.find(
            r => r.user_id === args.p_user_id && r.reward_key === args.p_reward_key
          );
          if (dup) {
            return { data: { success: false, code: "ALREADY_CLAIMED", status: 409, error: "Już odebrano" }, error: null };
          }
          state.userClaimedRewards.push({
            user_id: args.p_user_id,
            reward_key: args.p_reward_key,
            reward_type: args.p_reward_type,
            points_awarded: args.p_dp_amount,
            pack_type_id: args.p_pack_type_id ?? null
          });
          const newBalance =
            args.p_dp_amount > 0
              ? applyDp(args.p_user_id, args.p_dp_amount, "EARN", args.p_reward_type, args.p_reward_key).new_balance
              : state.userDeltaPoints[args.p_user_id]?.points_balance ?? 0;
          let grantedPackId: string | null = null;
          if (args.p_pack_type_id) {
            grantedPackId = `pack-rw-${state.userUnopenedPacks.length + 1}`;
            state.userUnopenedPacks.push({
              id: grantedPackId,
              user_id: args.p_user_id,
              pack_type_id: args.p_pack_type_id,
              source_reason: args.p_source_reason,
              is_opened: false
            });
          }
          return { data: { success: true, new_balance: newBalance, granted_pack_id: grantedPackId }, error: null };
        }

        if (fnName === "grant_user_card_atomic") {
          const existing = state.userCards.find(
            uc => uc.user_id === args.p_user_id && uc.card_id === args.p_card_id
          );
          if (existing) {
            if (args.p_increment_duplicate) {
              existing.duplicates_count += 1;
            }
          } else {
            state.userCards.push({
              id: `uc-${state.userCards.length + 1}`,
              user_id: args.p_user_id,
              card_id: args.p_card_id,
              duplicates_count: 0,
              is_favorite: false,
              is_locked: false
            });
          }
          if (args.p_admin_id) {
            state.adminCardGrants.push({
              admin_id: args.p_admin_id,
              user_id: args.p_user_id,
              card_id: args.p_card_id,
              reason: args.p_reason
            });
          }
          return { data: { success: true, card_id: args.p_card_id }, error: null };
        }

        if (fnName === "apply_delta_points_transaction") {
          const res = applyDp(
            args.p_user_id,
            args.p_amount,
            args.p_transaction_type,
            args.p_source_type,
            args.p_source_id,
            args.p_idempotency_key
          );
          return { data: res, error: null };
        }

        if (fnName === "admin_set_delta_points_atomic") {
          state.userDeltaPoints[args.p_target_user_id] = {
            user_id: args.p_target_user_id,
            points_balance: args.p_new_balance,
            total_earned: args.p_new_total_earned ?? args.p_new_balance
          };
          return { data: { success: true, new_balance: args.p_new_balance }, error: null };
        }

        return { data: null, error: { code: "PGRST202", message: `Unknown RPC ${fnName}` } };
      });
    };
  }

  return { client, state, directEconomyWrites };
}

const USER_1 = "11111111-1111-4111-8111-111111111111";
const ADMIN_1 = "22222222-2222-4222-8222-222222222222";
const COACH_1 = "33333333-3333-4333-8333-333333333333";
const OTHER_USER = "44444444-4444-4444-8444-444444444444";
const PLAYER_1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CARD_1 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// ============================================================================
// TESTY ANIM-1A.5 — EKONOMIA, ROLE, CONCURRENCY, REPLAY, FAŁSZOWANIE DANYCH, RLS
// ============================================================================

test("1. Zwykły użytkownik: ulubione i blokowanie działają na własnej karcie, ale odrzucane na obcej karcie (404)", async () => {
  const { client, state } = createEconomyMock({
    userCards: [
      { id: "uc-own", user_id: USER_1, card_id: CARD_1, is_favorite: false, is_locked: false },
      { id: "uc-other", user_id: OTHER_USER, card_id: CARD_1, is_favorite: false, is_locked: false }
    ]
  });

  const ownFav = await setUserCardFlagServerSide({
    adminClient: client,
    userId: USER_1,
    userCardId: "uc-own",
    field: "is_favorite",
    value: true
  });
  assert.equal(ownFav.card.is_favorite, true);

  const ownLock = await setUserCardFlagServerSide({
    adminClient: client,
    userId: USER_1,
    userCardId: "uc-own",
    field: "is_locked",
    value: true
  });
  assert.equal(ownLock.card.is_locked, true);

  // Obcy użytkownik próbuje zmodyfikować cudzą kartę -> 404, karta pozostaje nietknięta
  await assert.rejects(
    () =>
      setUserCardFlagServerSide({
        adminClient: client,
        userId: USER_1,
        userCardId: "uc-other",
        field: "is_locked",
        value: true
      }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 404
  );
  assert.equal(state.userCards.find(c => c.id === "uc-other")?.is_locked, false);
});

test("2. Administrator vs zwykły użytkownik/trener: autoryzacja roli oraz operacje admina (paczki, karty, DP, przeliczenie)", async () => {
  const { client, state } = createEconomyMock({
    parentPlayers: [{ parent_id: USER_1, player_id: PLAYER_1 }],
    trainingAttendance: [{ player_id: PLAYER_1, status: "present", training_id: "t1" }],
    matchAttendance: [{ player_id: PLAYER_1, status: "present", match: null }],
    matchEvents: [{ match_id: "m1", player_id: PLAYER_1, assist_player_id: null, event_type: "goal" }]
  });

  // Zwykły użytkownik i trener odrzuceni (403)
  await assert.rejects(
    () =>
      adminManageEconomyServerSide({
        adminClient: client,
        adminUserId: USER_1,
        body: { action: "grant_points", target_user_id: USER_1, amount: 500 }
      }),
    (err: any) => err instanceof EconomyRpcError && err.code === "FORBIDDEN" && err.statusCode === 403
  );

  await assert.rejects(
    () =>
      grantSpecialCardServerSide({
        adminClient: client,
        adminUserId: COACH_1,
        targetUserId: USER_1,
        cardId: CARD_1
      }),
    (err: any) => err instanceof EconomyRpcError && err.code === "FORBIDDEN" && err.statusCode === 403
  );

  // Admin: przyznanie DP, paczek, karty specjalnej oraz przeliczenie po stronie serwera
  const grantDp = await adminManageEconomyServerSide({
    adminClient: client,
    adminUserId: ADMIN_1,
    body: { action: "grant_points", target_user_id: USER_1, amount: 250 }
  });
  assert.equal(grantDp.newBalance, 250);

  const grantCard = await grantSpecialCardServerSide({
    adminClient: client,
    adminUserId: ADMIN_1,
    targetUserId: USER_1,
    cardId: CARD_1,
    reason: "MVP Miesiąca"
  });
  assert.equal(grantCard.success, true);
  assert.equal(state.adminCardGrants.length, 1);

  const recalc = await adminManageEconomyServerSide({
    adminClient: client,
    adminUserId: ADMIN_1,
    body: { action: "recalculate_user_points", target_user_id: USER_1 }
  });
  // 100 start + 50 trening + 70 mecz + 30 gol = 250 DP
  assert.equal(recalc.newBalance, 250);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 250);
});

test("3. Podwójne żądania (concurrency) we wszystkich ścieżkach nagród przyznają nagrodę dokładnie raz", async () => {
  const { client, state } = createEconomyMock(
    {
      parentPlayers: [{ parent_id: USER_1, player_id: PLAYER_1 }],
      userCards: [
        {
          id: "uc-inf",
          user_id: USER_1,
          card_id: CARD_1,
          card_definition: { id: CARD_1, player_id: PLAYER_1, card_type: "inferno", rarity: "inferno", player: { position: "Napastnik" } }
        }
      ],
      userAchievements: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          user_id: USER_1,
          player_id: PLAYER_1,
          achievement_id: "first_goal",
          is_unlocked: true,
          claimed_reward: false,
          claimed_at: null
        }
      ],
      matchAttendance: [
        { player_id: PLAYER_1, status: "present", match: null },
        { player_id: PLAYER_1, status: "present", match: null }
      ],
      userGameProfiles: { [USER_1]: { user_id: USER_1, season_xp: 250 } }
    },
    { rpcDelayMs: 5 }
  );

  // 3A. Daily Spin x2 równolegle
  const spinRes = await Promise.allSettled([
    claimDailySpinServerSide({ adminClient: client, userId: USER_1, segmentOverride: DAILY_SPIN_SEGMENTS[0] }),
    claimDailySpinServerSide({ adminClient: client, userId: USER_1, segmentOverride: DAILY_SPIN_SEGMENTS[0] })
  ]);
  assert.equal(spinRes.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((spinRes.find(r => r.status === "rejected") as PromiseRejectedResult).reason.statusCode, 429);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 50);

  // 3B. Challenge x2 równolegle (challenge-inferno-owner = 250 DP + gold_booster)
  const chRes = await Promise.allSettled([
    claimChallengeRewardServerSide({ adminClient: client, userId: USER_1, challengeId: "challenge-inferno-owner" }),
    claimChallengeRewardServerSide({ adminClient: client, userId: USER_1, challengeId: "challenge-inferno-owner" })
  ]);
  assert.equal(chRes.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((chRes.find(r => r.status === "rejected") as PromiseRejectedResult).reason.statusCode, 409);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 300); // 50 + 250

  // 3C. Sync Rewards x2 równolegle -> tylko 1 powitalna paczka
  const syncRes = await Promise.all([
    syncRewardsServerSide({ adminClient: client, userId: USER_1 }),
    syncRewardsServerSide({ adminClient: client, userId: USER_1 })
  ]);
  const totalSynced = syncRes.reduce((s, r) => s + r.grantedCount, 0);
  assert.equal(totalSynced, 1);

  // 3D. Achievement Claim x2 równolegle
  const achRes = await Promise.allSettled([
    claimAchievementRewardServerSide({ adminClient: client, userId: USER_1, achievementId: "first_goal", playerId: PLAYER_1 }),
    claimAchievementRewardServerSide({ adminClient: client, userId: USER_1, achievementId: "first_goal", playerId: PLAYER_1 })
  ]);
  assert.equal(achRes.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((achRes.find(r => r.status === "rejected") as PromiseRejectedResult).reason.statusCode, 409);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 375); // 300 + 75

  // 3E. Complete Quiz x2 równolegle
  const quizRes = await Promise.all([
    completeQuizServerSide({ adminClient: client, userId: USER_1, lessonId: "rules-orlik", scorePercent: 90 }),
    completeQuizServerSide({ adminClient: client, userId: USER_1, lessonId: "rules-orlik", scorePercent: 90 })
  ]);
  assert.equal(quizRes.filter(r => r.pointsAwarded === 50).length, 1);
  assert.equal(quizRes.filter(r => r.alreadyClaimed === true && r.pointsAwarded === 0).length, 1);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 425); // 375 + 50

  // 3F. Weekly Quest x2 równolegle + Season Pass x2 równolegle
  const questRes = await Promise.allSettled([
    claimQuestRewardServerSide({ adminClient: client, userId: USER_1, questId: "q-knowledge" }),
    claimQuestRewardServerSide({ adminClient: client, userId: USER_1, questId: "q-knowledge" })
  ]);
  assert.equal(questRes.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 455); // 425 + 30

  const passRes = await Promise.allSettled([
    claimSeasonPassRewardServerSide({ adminClient: client, userId: USER_1, level: 1 }),
    claimSeasonPassRewardServerSide({ adminClient: client, userId: USER_1, level: 1 })
  ]);
  assert.equal(passRes.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 505); // 455 + 50
});

test("4. Powtórne odebranie nagrody, nieuprawnione żądania oraz nieprawidłowa kwota DP są blokowane", async () => {
  const { client, state } = createEconomyMock({
    players: { [PLAYER_1]: { id: PLAYER_1, display_name: "Ryszard Rybacki" } },
    // Celowo zawyżone user_game_profile.season_xp NIE może odblokować poziomu Season Pass
    userGameProfiles: { [USER_1]: { user_id: USER_1, season_xp: 99999 } }
  });

  // Nieznane lub sfałszowane questId odrzucane (400)
  await assert.rejects(
    () => claimQuestRewardServerSide({ adminClient: client, userId: USER_1, questId: "hacked-quest-99999" }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 400
  );

  // Birthday quest działa jednorazowo z autorytatywną kwotą 150 DP, powtórka daje 409
  const bday1 = await claimQuestRewardServerSide({ adminClient: client, userId: USER_1, questId: `birthday-${PLAYER_1}` });
  assert.equal(bday1.pointsAwarded, 150);
  await assert.rejects(
    () => claimQuestRewardServerSide({ adminClient: client, userId: USER_1, questId: `birthday-${PLAYER_1}` }),
    (err: any) => err instanceof EconomyRpcError && err.code === "ALREADY_CLAIMED" && err.statusCode === 409
  );

  // Nieosiągnięty poziom Season Pass (0 XP vs poziom 20 wymagający 2000 XP) odrzucony
  await assert.rejects(
    () => claimSeasonPassRewardServerSide({ adminClient: client, userId: USER_1, level: 20 }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 400
  );

  // Niespełnione wyzwanie Panini odrzucone (400)
  await assert.rejects(
    () => claimChallengeRewardServerSide({ adminClient: client, userId: USER_1, challengeId: "challenge-collector-20" }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 400
  );

  // Ujemna / zerowa kwota DP w panelu admina odrzucona (400)
  await assert.rejects(
    () =>
      adminManageEconomyServerSide({
        adminClient: client,
        adminUserId: ADMIN_1,
        body: { action: "grant_points", target_user_id: USER_1, amount: -500 }
      }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 400
  );
  await assert.rejects(
    () =>
      adminManageEconomyServerSide({
        adminClient: client,
        adminUserId: ADMIN_1,
        body: { action: "set_points", target_user_id: USER_1, balance: -1 }
      }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 400
  );

  // Sfałszowany segment Daily Spin spoza dozwolonej listy serwera odrzucony (400)
  await assert.rejects(
    () =>
      claimDailySpinServerSide({
        adminClient: client,
        userId: USER_1,
        segmentOverride: { id: "hacked", name: "Free", shortName: "Free", type: "points", amount: 99999, weight: 1 }
      }),
    (err: any) => err instanceof EconomyRpcError && err.statusCode === 400
  );

  assert.equal(state.userDeltaPoints[USER_1].points_balance, 150);
  assert.equal(WEEKLY_QUEST_REWARDS["q-knowledge"].dp, 30);
});

test("5. KRYTYCZNE: Brak RPC zwraca 503 RPC_UNAVAILABLE bez fallbacku nieatomowego we wszystkich endpointach", async () => {
  const { client, state, directEconomyWrites } = createEconomyMock(
    {
      userCards: [
        {
          id: "uc-inf",
          user_id: USER_1,
          card_id: CARD_1,
          card_definition: { id: CARD_1, player_id: PLAYER_1, card_type: "inferno", rarity: "inferno", player: { position: "Napastnik" } }
        }
      ],
      userAchievements: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          user_id: USER_1,
          player_id: PLAYER_1,
          achievement_id: "first_goal",
          is_unlocked: true,
          claimed_reward: false,
          claimed_at: null
        }
      ],
      matchAttendance: [
        { player_id: PLAYER_1, status: "present", match: null },
        { player_id: PLAYER_1, status: "present", match: null }
      ],
      parentPlayers: [{ parent_id: USER_1, player_id: PLAYER_1 }],
      userGameProfiles: { [USER_1]: { user_id: USER_1, season_xp: 200 } }
    },
    {
      rpcError: { code: "PGRST202", message: "Could not find the function in schema cache" }
    }
  );

  const checks: Array<() => Promise<any>> = [
    () => purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "standard_pack" }),
    () => claimDailySpinServerSide({ adminClient: client, userId: USER_1 }),
    () => claimChallengeRewardServerSide({ adminClient: client, userId: USER_1, challengeId: "challenge-inferno-owner" }),
    () => syncRewardsServerSide({ adminClient: client, userId: USER_1 }),
    () => completeQuizServerSide({ adminClient: client, userId: USER_1, lessonId: "rules-orlik", scorePercent: 100 }),
    () => claimQuestRewardServerSide({ adminClient: client, userId: USER_1, questId: "q-knowledge" }),
    () => claimSeasonPassRewardServerSide({ adminClient: client, userId: USER_1, level: 1 }),
    () => claimAchievementRewardServerSide({ adminClient: client, userId: USER_1, achievementId: "first_goal" })
  ];

  for (const run of checks) {
    await assert.rejects(
      run,
      (err: any) => err instanceof EconomyRpcError && err.code === "RPC_UNAVAILABLE" && err.statusCode === 503
    );
  }

  assert.equal(directEconomyWrites.length, 0, "Żadna ścieżka nie może robić bezpośredniego fallbacku zapisu przy braku RPC!");
  assert.equal(Object.keys(state.userDeltaPoints).length, 0);
  assert.equal(state.userUnopenedPacks.length, 0);
});

test("6. AUDYT PODZIELONYCH MIGRACJI SQL (FAZA A -> B -> C) ORAZ PLIKÓW APLIKACJI", () => {
  const phaseAPath = path.resolve(process.cwd(), "supabase/migrations/20261111_anim1a5_a_missing_tables_and_deps.sql");
  const phaseBPath = path.resolve(process.cwd(), "supabase/migrations/20261111_anim1a5_b_economy_rpcs.sql");
  const phaseCPath = path.resolve(process.cwd(), "supabase/migrations/20261111_anim1a5_c_rls_hardening.sql");
  const openPackPath = path.resolve(process.cwd(), "supabase/migrations/20261111_etap_anim1a2_open_pack_atomic.sql");

  for (const p of [phaseAPath, phaseBPath, phaseCPath]) {
    assert.equal(fs.existsSync(p), true, `Wymagany plik migracji musi istnieć: ${p}`);
  }

  const sqlA = fs.readFileSync(phaseAPath, "utf-8");
  const sqlB = fs.readFileSync(phaseBPath, "utf-8");
  const sqlC = fs.readFileSync(phaseCPath, "utf-8");
  const openPackSql = fs.readFileSync(openPackPath, "utf-8");

  for (const rawSql of [sqlA, sqlB, sqlC]) {
    const execSql = rawSql.replace(/--.*$/gm, "");
    assert.match(execSql, /^\s*BEGIN;/m);
    assert.match(execSql, /\bCOMMIT;\s*$/m);
    assert.doesNotMatch(execSql, /DROP\s+TABLE/i);
    assert.doesNotMatch(execSql, /CONCURRENTLY/i);
  }

  // FAZA A: Brakujące tabele na Stagingu, dynamiczny typ card_id w admin_card_grants, unikalność i paczki
  for (const tbl of [
    "delta_points_transactions",
    "user_daily_spins",
    "user_claimed_challenges",
    "user_claimed_rewards",
    "user_quiz_completions",
    "admin_card_grants"
  ]) {
    assert.match(sqlA, new RegExp(tbl));
  }
  assert.match(sqlA, /chk_user_delta_points_balance_non_negative/);
  assert.match(sqlA, /uq_dp_tx_idempotency_key_not_null/);
  assert.match(sqlA, /format_type\(a\.atttypid, a\.atttypmod\)/);
  assert.match(sqlA, /INSERT INTO public\.pack_types/);
  assert.match(sqlA, /INSERT INTO public\.pack_definitions/);

  // FAZA B: Jednolity system DP (apply_delta_points_transaction zgodny z open_pack_atomic) + wszystkie RPC
  assert.match(openPackSql, /apply_delta_points_transaction\(uuid,integer,text,text,text,text,jsonb\)/i);
  assert.match(sqlB, /CREATE OR REPLACE FUNCTION public\.apply_delta_points_transaction\(/);
  assert.match(sqlB, /REVOKE ALL ON FUNCTION public\.apply_delta_points_transaction\(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB\)\s+FROM PUBLIC, anon, authenticated;/);
  assert.match(sqlB, /GRANT EXECUTE ON FUNCTION public\.apply_delta_points_transaction\(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB\)\s+TO service_role;/);
  assert.match(sqlB, /INSERT INTO public\.user_delta_points[\s\S]*?ON CONFLICT \(user_id\) DO NOTHING/);
  assert.match(sqlB, /DROP FUNCTION IF EXISTS public\.purchase_pack_atomic\(TEXT, TEXT\);/);
  assert.match(sqlB, /CREATE OR REPLACE FUNCTION public\.purchase_pack_atomic\(\s*p_user_id UUID,/);
  assert.match(sqlB, /REVOKE ALL ON FUNCTION public\.purchase_pack_atomic\(UUID, TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticated;/);
  assert.match(sqlB, /GRANT EXECUTE ON FUNCTION public\.purchase_pack_atomic\(UUID, TEXT, TEXT\)\s+TO service_role;/);
  assert.match(sqlB, /v_existing_tx\.amount <> p_amount[\s\S]*?v_existing_tx\.transaction_type IS DISTINCT FROM p_transaction_type[\s\S]*?v_existing_tx\.source_type IS DISTINCT FROM p_source_type[\s\S]*?v_existing_tx\.source_id IS DISTINCT FROM p_source_id/);
  assert.match(sqlB, /WHEN 'standard_pack' THEN v_price := 60;/);
  assert.match(sqlB, /WHEN 'legend_booster' THEN v_price := 450;/);

  for (const rpcName of [
    "claim_daily_spin_atomic",
    "claim_challenge_reward_atomic",
    "grant_sync_reward_packs_atomic",
    "claim_achievement_reward_atomic",
    "complete_quiz_reward_atomic",
    "claim_reward_once_atomic",
    "grant_user_card_atomic",
    "admin_set_delta_points_atomic"
  ]) {
    assert.match(sqlB, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${rpcName}\\(`));
    assert.match(sqlB, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpcName}[\\s\\S]*?TO service_role;`));
  }
  assert.match(sqlB, /CREATE OR REPLACE FUNCTION public\.is_admin\(\)/);
  assert.match(sqlB, /public\.user_cards\.card_id%TYPE/);
  assert.match(sqlB, /'open_pack_user:' \|\| p_user_id::TEXT/);

  // FAZA C: Pre-flight istnienia RPC i kolumny user_id przed odebraniem zapisu w RLS
  assert.match(sqlC, /to_regprocedure\('public\.apply_delta_points_transaction\(uuid,integer,text,text,text,text,jsonb\)'\)/);
  assert.match(sqlC, /to_regprocedure\('public\.purchase_pack_atomic\(uuid,text,text\)'\)/);
  assert.match(sqlC, /to_regprocedure\('public\.open_pack_atomic\(uuid,uuid,text,text\[\],text\)'\)/);
  assert.match(sqlC, /information_schema\.columns[\s\S]*?column_name = 'user_id'/);
  for (const tbl of [
    "user_cards",
    "user_unopened_packs",
    "user_delta_points",
    "pack_opening_logs",
    "delta_points_transactions",
    "user_daily_spins",
    "user_quiz_completions",
    "user_claimed_challenges",
    "user_claimed_rewards",
    "admin_card_grants"
  ]) {
    assert.match(sqlC, new RegExp(`'${tbl}'`));
  }
  assert.match(sqlC, /REVOKE ALL ON TABLE public\.%I FROM PUBLIC, anon, authenticated/);
  assert.match(sqlC, /GRANT SELECT ON TABLE public\.%I TO authenticated/);
  assert.match(sqlC, /FOR SELECT TO authenticated USING \(user_id = \(SELECT auth\.uid\(\)\) OR public\.is_admin\(\)\)/);

  // AdminPanel nie zapisuje już bezpośrednio do user_delta_points ani user_unopened_packs z przeglądarki
  const adminPanelSrc = fs.readFileSync(path.resolve(process.cwd(), "components/AdminPanel.tsx"), "utf-8");
  assert.doesNotMatch(adminPanelSrc, /\.from\("user_delta_points"\)/);
  assert.doesNotMatch(adminPanelSrc, /\.from\("user_unopened_packs"\)/);
  assert.doesNotMatch(adminPanelSrc, /\.from\("card_definitions"\)\.insert/);

  // API buy-pack korzysta wyłącznie z createAdminClient() + user.id sesji, bez fallbacku upsert
  const buyPackSrc = fs.readFileSync(path.resolve(process.cwd(), "app/api/cards/buy-pack/route.ts"), "utf-8");
  assert.match(buyPackSrc, /createAdminClient\(\)/);
  assert.match(buyPackSrc, /userId:\s*user\.id/);
  assert.doesNotMatch(buyPackSrc, /\.from\("user_delta_points"\)\.upsert/);
  assert.doesNotMatch(buyPackSrc, /pack_\$\{Date\.now\(\)\}/);

  // achievements/sync sprawdza uprawnienia parent_players / staff i używa RPC zamiast surowego insert do user_cards
  const achSyncSrc = fs.readFileSync(path.resolve(process.cwd(), "app/api/achievements/sync/route.ts"), "utf-8");
  assert.match(achSyncSrc, /403/);
  assert.match(achSyncSrc, /grant_user_card_atomic/);
  assert.doesNotMatch(achSyncSrc, /\.from\("user_cards"\)\.insert/);

  // quests/claim-reward ignoruje kwoty i typy od klienta (brak użycia w kodzie wykonywalnym)
  const questsSrc = fs.readFileSync(path.resolve(process.cwd(), "app/api/quests/claim-reward/route.ts"), "utf-8");
  const questsCodeOnly = questsSrc.replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(questsCodeOnly, /rewardPoints|rewardType/);
});

test("7. REGRESJA KUPOWANIA PACZEK (service_role + p_user_id): kontrakt, niewystarczające saldo, rollback i współbieżność", async () => {
  const { client, state } = createEconomyMock(
    {
      userDeltaPoints: { [USER_1]: { user_id: USER_1, points_balance: 200, total_earned: 200 } }
    },
    { rpcDelayMs: 5 }
  );

  // Nieistniejący typ paczki -> 400 BAD_REQUEST bez wywołania RPC
  await assert.rejects(
    () => purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "free_cheat_pack" }),
    (err: any) => err instanceof EconomyRpcError && err.code === "BAD_REQUEST" && err.statusCode === 400
  );

  // Idempotentny zakup przez service_role + p_user_id z zachowaniem kontraktu buy-pack
  const firstBuy = await purchasePackServerSide({
    adminClient: client,
    userId: USER_1,
    packTypeId: "standard_pack",
    idempotencyKey: "buy-once-key"
  });
  assert.equal(firstBuy.success, true);
  assert.equal(firstBuy.remainingPoints, 140);
  assert.equal(firstBuy.grantedPack.user_id, USER_1);
  assert.equal(firstBuy.grantedPack.pack_type_id, "standard_pack");
  assert.equal(firstBuy.grantedPack.is_opened, false);

  const retryBuy = await purchasePackServerSide({
    adminClient: client,
    userId: USER_1,
    packTypeId: "standard_pack",
    idempotencyKey: "buy-once-key"
  });
  assert.equal(retryBuy.already_processed, true);
  assert.equal(retryBuy.remainingPoints, 140);
  assert.equal(state.userUnopenedPacks.length, 1);

  // Retry tym samym kluczem dla INNEGO typu paczki -> 409 IDEMPOTENCY_CONFLICT bez ponownego pobrania DP
  await assert.rejects(
    () =>
      purchasePackServerSide({
        adminClient: client,
        userId: USER_1,
        packTypeId: "gold_booster",
        idempotencyKey: "buy-once-key"
      }),
    (err: any) => err instanceof EconomyRpcError && err.code === "IDEMPOTENCY_CONFLICT" && err.statusCode === 409
  );
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 140);
  assert.equal(state.userUnopenedPacks.length, 1);

  // 3 równoległe zakupy standard_pack (60 DP) przy 140 DP -> 2 przechodzą, 3. odrzucony, saldo = 20 DP
  const results = await Promise.allSettled([
    purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "standard_pack" }),
    purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "standard_pack" }),
    purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "standard_pack" })
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 2);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
  const rejectedConcurrency = results.find(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );
  assert.ok(rejectedConcurrency);
  assert.ok(rejectedConcurrency.reason instanceof EconomyRpcError);
  assert.equal(rejectedConcurrency.reason.code, "INSUFFICIENT_BALANCE");
  assert.equal(rejectedConcurrency.reason.statusCode, 400);
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 20);
  assert.equal(state.userUnopenedPacks.length, 3);
  assert.equal(state.deltaTransactions.length, 3);

  // Niewystarczające saldo (20 DP < 60 DP) -> HTTP 400 z kodem INSUFFICIENT_BALANCE bez zmian
  let insufficientErr: unknown;
  await assert.rejects(
    () => purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "standard_pack" }),
    (err: any) => {
      insufficientErr = err;
      return err instanceof EconomyRpcError && err.code === "INSUFFICIENT_BALANCE" && err.statusCode === 400;
    }
  );
  const serializedInsufficient = serializeEconomyError(insufficientErr);
  assert.equal(serializedInsufficient.status, 400);
  assert.equal(serializedInsufficient.body.code, "INSUFFICIENT_BALANCE");
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 20);
  assert.equal(state.userUnopenedPacks.length, 3);

  // Rollback zakupu: awaria w trakcie księgowania DP cofa insert paczki i saldo pozostaje nietknięte
  const rollbackMock = createEconomyMock(
    { userDeltaPoints: { [USER_1]: { user_id: USER_1, points_balance: 500, total_earned: 500 } } },
    { simulatePurchaseDpFailure: true }
  );
  await assert.rejects(
    () =>
      purchasePackServerSide({
        adminClient: rollbackMock.client,
        userId: USER_1,
        packTypeId: "inferno_booster",
        idempotencyKey: "rollback-key"
      }),
    (err: any) => err instanceof EconomyRpcError && err.code === "DB_WRITE_ERROR" && err.statusCode === 500
  );
  assert.equal(rollbackMock.state.userUnopenedPacks.length, 0, "Rollback musi wycofać wstawioną paczkę");
  assert.equal(rollbackMock.state.userDeltaPoints[USER_1].points_balance, 500, "Rollback nie może pobrać DP");
  assert.equal(rollbackMock.state.deltaTransactions.length, 0);
});

test("8. ZGODNOŚĆ JEDNOLITEGO SYSTEMU DP (apply_delta_points_transaction): równoległe operacje, historia i brak kolizji z open_pack_atomic", async () => {
  const { client, state } = createEconomyMock({
    parentPlayers: [{ parent_id: USER_1, player_id: PLAYER_1 }],
    userDeltaPoints: { [USER_1]: { user_id: USER_1, points_balance: 100, total_earned: 100 } }
  });

  await Promise.all([
    completeQuizServerSide({ adminClient: client, userId: USER_1, lessonId: "rules-orlik", scorePercent: 95 }), // +50 DP
    claimDailySpinServerSide({ adminClient: client, userId: USER_1, segmentOverride: DAILY_SPIN_SEGMENTS[0] }), // +50 DP
    adminManageEconomyServerSide({
      adminClient: client,
      adminUserId: ADMIN_1,
      body: { action: "grant_points", target_user_id: USER_1, amount: 40 }
    }), // +40 DP
    purchasePackServerSide({ adminClient: client, userId: USER_1, packTypeId: "standard_pack" }) // -60 DP
  ]);

  assert.equal(state.userDeltaPoints[USER_1].points_balance, 180);
  assert.equal(state.deltaTransactions.length, 4);
  assert.deepEqual(
    state.deltaTransactions.map(t => t.source_type).sort(),
    ["ADMIN", "DAILY_SPIN", "PACK_PURCHASE", "QUIZ_COMPLETION"]
  );
});

test("9. IDEMPOTENCJA apply_delta_points_transaction: wykrywanie konfliktów przy zmianie kwoty, źródła, typu lub user_id", async () => {
  const { client, state } = createEconomyMock({
    userDeltaPoints: {
      [USER_1]: { user_id: USER_1, points_balance: 100, total_earned: 100 },
      [OTHER_USER]: { user_id: OTHER_USER, points_balance: 100, total_earned: 100 }
    }
  });

  // 1. Oryginalna transakcja
  const res1 = await client.rpc("apply_delta_points_transaction", {
    p_user_id: USER_1,
    p_amount: 50,
    p_transaction_type: "EARN",
    p_source_type: "QUIZ_COMPLETION",
    p_source_id: "rules-orlik",
    p_idempotency_key: "tx-shared-key",
    p_metadata: {}
  });
  assert.equal(res1.data.success, true);
  assert.equal(res1.data.already_processed, false);
  assert.equal(res1.data.new_balance, 150);

  // 2. Dokładnie taki sam retry -> already_processed = true, saldo bez zmian
  const resExact = await client.rpc("apply_delta_points_transaction", {
    p_user_id: USER_1,
    p_amount: 50,
    p_transaction_type: "EARN",
    p_source_type: "QUIZ_COMPLETION",
    p_source_id: "rules-orlik",
    p_idempotency_key: "tx-shared-key",
    p_metadata: {}
  });
  assert.equal(resExact.data.success, true);
  assert.equal(resExact.data.already_processed, true);
  assert.equal(resExact.data.new_balance, 150);

  // 3. Retry z INNA KWOTĄ -> IDEMPOTENCY_CONFLICT (409), brak ponownego księgowania
  const resDiffAmount = await client.rpc("apply_delta_points_transaction", {
    p_user_id: USER_1,
    p_amount: 200,
    p_transaction_type: "EARN",
    p_source_type: "QUIZ_COMPLETION",
    p_source_id: "rules-orlik",
    p_idempotency_key: "tx-shared-key",
    p_metadata: {}
  });
  assert.equal(resDiffAmount.data.success, false);
  assert.equal(resDiffAmount.data.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(resDiffAmount.data.status, 409);

  // 4. Retry z INNYM ŹRÓDŁEM (source_type lub source_id lub transaction_type) -> IDEMPOTENCY_CONFLICT (409)
  const resDiffSourceType = await client.rpc("apply_delta_points_transaction", {
    p_user_id: USER_1,
    p_amount: 50,
    p_transaction_type: "EARN",
    p_source_type: "DAILY_SPIN",
    p_source_id: "rules-orlik",
    p_idempotency_key: "tx-shared-key",
    p_metadata: {}
  });
  assert.equal(resDiffSourceType.data.success, false);
  assert.equal(resDiffSourceType.data.code, "IDEMPOTENCY_CONFLICT");

  const resDiffSourceId = await client.rpc("apply_delta_points_transaction", {
    p_user_id: USER_1,
    p_amount: 50,
    p_transaction_type: "EARN",
    p_source_type: "QUIZ_COMPLETION",
    p_source_id: "skills-dribbling",
    p_idempotency_key: "tx-shared-key",
    p_metadata: {}
  });
  assert.equal(resDiffSourceId.data.success, false);
  assert.equal(resDiffSourceId.data.code, "IDEMPOTENCY_CONFLICT");

  const resDiffUser = await client.rpc("apply_delta_points_transaction", {
    p_user_id: OTHER_USER,
    p_amount: 50,
    p_transaction_type: "EARN",
    p_source_type: "QUIZ_COMPLETION",
    p_source_id: "rules-orlik",
    p_idempotency_key: "tx-shared-key",
    p_metadata: {}
  });
  assert.equal(resDiffUser.data.success, false);
  assert.equal(resDiffUser.data.code, "IDEMPOTENCY_CONFLICT");

  // Saldo i rejestr transakcji nietknięte
  assert.equal(state.userDeltaPoints[USER_1].points_balance, 150);
  assert.equal(state.userDeltaPoints[OTHER_USER].points_balance, 100);
  assert.equal(state.deltaTransactions.length, 1);
});
