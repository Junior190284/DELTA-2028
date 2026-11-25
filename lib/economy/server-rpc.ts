import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BIRTHDAY_GIFT_REWARD,
  DAILY_SPIN_DP_AMOUNTS,
  DAILY_SPIN_SEGMENTS,
  PACK_PRICES,
  QUIZ_PASS_THRESHOLD_PERCENT,
  SEASON_PASS_SERVER_REWARDS,
  WEEKLY_QUEST_REWARDS,
  type SpinSegment,
  getQuizRewardForLesson,
  normalizePackTypeId,
  selectRandomSpinSegment
} from "./security.ts";
import { canGrantCards, type UserRole } from "../security/roles.ts";
import { PANINI_CHALLENGES, evaluateUserChallenges } from "../cards/challenges.ts";
import type { UserCard } from "../cards/types.ts";

export type EconomyRpcErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "ALREADY_CLAIMED"
  | "IDEMPOTENCY_CONFLICT"
  | "DAILY_LIMIT_REACHED"
  | "INSUFFICIENT_BALANCE"
  | "RPC_UNAVAILABLE"
  | "DB_READ_ERROR"
  | "DB_WRITE_ERROR";

export class EconomyRpcError extends Error {
  public readonly code: EconomyRpcErrorCode;
  public readonly statusCode: number;

  constructor(code: EconomyRpcErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "EconomyRpcError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isEconomyRpcMissingError(
  err: { code?: string; message?: string; details?: string } | null | undefined
): boolean {
  if (!err) return false;
  if (err.code === "PGRST202" || err.code === "42883" || err.code === "42501") return true;
  const msg = `${err.message || ""} ${err.details || ""}`.toLowerCase();
  return (
    msg.includes("could not find the function") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("permission denied for function")
  );
}

function mapRpcRejectionToError(rpcResult: {
  code?: string;
  status?: number;
  error?: string;
}): EconomyRpcError {
  const code = rpcResult.code || "DB_WRITE_ERROR";
  const msg = rpcResult.error || "Operacja ekonomii odrzucona przez serwer bazy danych.";
  switch (code) {
    case "UNAUTHORIZED":
      return new EconomyRpcError("UNAUTHORIZED", msg, 401);
    case "FORBIDDEN":
      return new EconomyRpcError("FORBIDDEN", msg, 403);
    case "NOT_FOUND":
    case "PACK_NOT_FOUND":
      return new EconomyRpcError("NOT_FOUND", msg, 404);
    case "ALREADY_CLAIMED":
      return new EconomyRpcError("ALREADY_CLAIMED", msg, 409);
    case "IDEMPOTENCY_CONFLICT":
      return new EconomyRpcError("IDEMPOTENCY_CONFLICT", msg, 409);
    case "DAILY_LIMIT_REACHED":
      return new EconomyRpcError("DAILY_LIMIT_REACHED", msg, 429);
    case "INSUFFICIENT_BALANCE":
      return new EconomyRpcError("INSUFFICIENT_BALANCE", msg, 400);
    case "INVALID_PACK_TYPE":
    case "INVALID_AMOUNT":
    case "INVALID_CARD":
    case "NOT_UNLOCKED":
      return new EconomyRpcError("BAD_REQUEST", msg, 400);
    default:
      return new EconomyRpcError("DB_WRITE_ERROR", msg, rpcResult.status || 400);
  }
}

export async function invokeEconomyRpc<T extends Record<string, any>>(
  client: SupabaseClient,
  fnName: string,
  args: Record<string, unknown>
): Promise<T> {
  if (typeof (client as any)?.rpc !== "function") {
    throw new EconomyRpcError(
      "RPC_UNAVAILABLE",
      `Klient Supabase nie obsługuje wywołania RPC ${fnName}.`,
      503
    );
  }

  const { data, error } = await client.rpc(fnName, args);

  if (error) {
    if (isEconomyRpcMissingError(error)) {
      throw new EconomyRpcError(
        "RPC_UNAVAILABLE",
        `Wymagana funkcja RPC ${fnName} nie jest dostępna w tej bazie danych.`,
        503
      );
    }
    throw new EconomyRpcError(
      "DB_WRITE_ERROR",
      error.message || `Błąd wykonania RPC ${fnName}.`,
      500
    );
  }

  if (!data || typeof data !== "object") {
    throw new EconomyRpcError(
      "DB_WRITE_ERROR",
      `Nieprawidłowa odpowiedź z funkcji RPC ${fnName}.`,
      500
    );
  }

  if (data.success === false) {
    throw mapRpcRejectionToError(data);
  }

  return data as T;
}

export function getIsoWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

export async function assertAdminRoleServerSide(
  adminClient: SupabaseClient,
  userId: string
): Promise<{ role: UserRole; display_name?: string | null }> {
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("role, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd weryfikacji roli użytkownika.", 500);
  }

  const role = (profile?.role || "guest") as UserRole;
  if (!canGrantCards(role)) {
    throw new EconomyRpcError("FORBIDDEN", "Brak uprawnień administratora", 403);
  }

  return { role, display_name: profile?.display_name ?? null };
}

export async function assertStaffOrAdminServerSide(
  adminClient: SupabaseClient,
  userId: string
): Promise<{ role: UserRole; display_name?: string | null }> {
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("role, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd weryfikacji roli użytkownika.", 500);
  }

  const role = (profile?.role || "guest") as UserRole;
  if (role !== "admin" && role !== "coach") {
    throw new EconomyRpcError("FORBIDDEN", "Wymagane uprawnienia administratora lub trenera.", 403);
  }

  return { role, display_name: profile?.display_name ?? null };
}

// ============================================================================
// 1. ZAKUP PACZKI (BUY PACK — WYŁĄCZNIE ATOMOWE RPC purchase_pack_atomic)
// ============================================================================

export async function purchasePackServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  packTypeId: string;
  idempotencyKey?: string | null;
}) {
  const { adminClient, userId, packTypeId, idempotencyKey } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }

  const price = PACK_PRICES[packTypeId];
  if (!price) {
    throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy typ paczki", 400);
  }

  const cleanIdem =
    typeof idempotencyKey === "string" && idempotencyKey.trim() !== ""
      ? idempotencyKey.trim()
      : null;

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    new_balance: number;
    already_processed?: boolean;
    pack_id: string;
  }>(adminClient, "purchase_pack_atomic", {
    p_user_id: userId,
    p_pack_type_id: packTypeId,
    p_idempotency_key: cleanIdem
  });

  return {
    success: true,
    remainingPoints: rpcResult.new_balance,
    already_processed: Boolean(rpcResult.already_processed),
    grantedPack: {
      id: rpcResult.pack_id,
      user_id: userId,
      pack_type_id: packTypeId,
      source_reason: `Zakup w Skarbcu za ${price} Delta Points`,
      is_opened: false
    }
  };
}

// ============================================================================
// 2. KOŁO FORTUNY (DAILY SPIN — ATOMOWE RPC claim_daily_spin_atomic)
// ============================================================================

function getNextUtcMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow;
}

export async function claimDailySpinServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  segmentOverride?: SpinSegment;
}) {
  const { adminClient, userId, segmentOverride } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }

  const winningSegment = segmentOverride || selectRandomSpinSegment();
  const authoritativeSegment = DAILY_SPIN_SEGMENTS.find(s => s.id === winningSegment.id);
  if (!authoritativeSegment) {
    throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy segment koła fortuny.", 400);
  }

  if (
    authoritativeSegment.type === "points" &&
    (!authoritativeSegment.amount || !DAILY_SPIN_DP_AMOUNTS.has(authoritativeSegment.amount))
  ) {
    throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowa stawka DP segmentu.", 400);
  }

  const normalizedPack =
    authoritativeSegment.type === "pack"
      ? normalizePackTypeId(authoritativeSegment.packTypeId)
      : null;

  if (authoritativeSegment.type === "pack" && !normalizedPack) {
    throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy typ paczki koła fortuny.", 400);
  }

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    new_balance: number;
    granted_pack_id: string | null;
    streak: number;
    total_spins: number;
  }>(adminClient, "claim_daily_spin_atomic", {
    p_user_id: userId,
    p_segment_id: authoritativeSegment.id,
    p_reward_type: authoritativeSegment.type,
    p_dp_amount: authoritativeSegment.type === "points" ? authoritativeSegment.amount || 0 : 0,
    p_pack_type_id: normalizedPack,
    p_source_reason: `Nagroda z Koła Fortuny DELTA: ${authoritativeSegment.name}`
  });

  const nextMidnight = getNextUtcMidnight();
  const secondsRemaining = Math.max(0, Math.floor((nextMidnight.getTime() - Date.now()) / 1000));

  return {
    success: true,
    reward: authoritativeSegment,
    segmentId: authoritativeSegment.id,
    newPointsBalance: Number(rpcResult.new_balance) || 0,
    grantedPackId: rpcResult.granted_pack_id || null,
    streak: Number(rpcResult.streak) || 1,
    canSpin: false,
    secondsRemaining,
    nextAvailableAt: nextMidnight.toISOString()
  };
}

// ============================================================================
// 3. WYZWANIA PANINI (SERVER EVALUATION + ATOMOWE RPC claim_challenge_reward_atomic)
// ============================================================================

export async function claimChallengeRewardServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  challengeId: string;
}) {
  const { adminClient, userId, challengeId } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Unauthorized", 401);
  }
  if (!challengeId || typeof challengeId !== "string") {
    throw new EconomyRpcError("BAD_REQUEST", "Missing challengeId", 400);
  }

  const challengeDef = PANINI_CHALLENGES.find(c => c.id === challengeId);
  if (!challengeDef) {
    throw new EconomyRpcError("NOT_FOUND", "Nieznane wyzwanie", 404);
  }

  const [{ data: userCardsRows, error: cardsErr }, { data: claimedRows, error: claimedErr }] =
    await Promise.all([
      adminClient
        .from("user_cards")
        .select("*, card_definition:card_definitions(*, player:players(*))")
        .eq("user_id", userId),
      adminClient
        .from("user_claimed_challenges")
        .select("challenge_id")
        .eq("user_id", userId)
    ]);

  if (cardsErr || claimedErr) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd weryfikacji postępu wyzwań.", 500);
  }

  const claimedIds = (claimedRows || []).map((r: any) => String(r.challenge_id));
  if (claimedIds.includes(challengeId)) {
    throw new EconomyRpcError("ALREADY_CLAIMED", "Nagroda za to wyzwanie została już wcześniej odebrana!", 409);
  }

  const evaluated = evaluateUserChallenges((userCardsRows || []) as UserCard[], claimedIds).find(
    ch => ch.id === challengeId
  );

  if (!evaluated || !evaluated.isCompleted) {
    throw new EconomyRpcError(
      "BAD_REQUEST",
      "Warunki tego wyzwania nie zostały jeszcze spełnione w Twojej kolekcji.",
      400
    );
  }

  const normalizedPack = challengeDef.reward.packTypeId
    ? normalizePackTypeId(challengeDef.reward.packTypeId)
    : null;

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    new_balance: number;
    granted_pack_id: string | null;
  }>(adminClient, "claim_challenge_reward_atomic", {
    p_user_id: userId,
    p_challenge_id: challengeId,
    p_dp_amount: challengeDef.reward.deltaPoints || 0,
    p_pack_type_id: normalizedPack,
    p_source_reason: `Nagroda: ${challengeDef.title}`,
    p_reward_summary: challengeDef.reward
  });

  return {
    success: true,
    message: `Odebrano nagrodę: ${challengeDef.reward.description}`,
    reward: challengeDef.reward,
    newPointsBalance: Number(rpcResult.new_balance) || 0,
    grantedPackId: rpcResult.granted_pack_id || null
  };
}

// ============================================================================
// 4. SYNCHRONIZACJA NAGRÓD ZA OBECNOŚĆ (SYNC REWARDS — ATOMOWE RPC)
// ============================================================================

export async function syncRewardsServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
}) {
  const { adminClient, userId } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }

  const { data: parentLinks, error: linksErr } = await adminClient
    .from("parent_players")
    .select("player_id")
    .eq("parent_id", userId);

  if (linksErr) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd odczytu powiązań zawodnika.", 500);
  }

  const playerIds = (parentLinks || []).map((x: any) => x.player_id);

  const { data: existingPacks, error: packsErr } = await adminClient
    .from("user_unopened_packs")
    .select("source_reason")
    .eq("user_id", userId);

  if (packsErr) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd odczytu historii paczek użytkownika.", 500);
  }

  const existingReasons = new Set((existingPacks || []).map((p: any) => p.source_reason));
  const candidatePacks: Array<{ pack_type_id: string; source_reason: string }> = [];

  const welcomeReason = "Nagroda na start • Witamy w kolekcji kart DELTA!";
  if (!existingReasons.has(welcomeReason)) {
    candidatePacks.push({ pack_type_id: "matchday_booster", source_reason: welcomeReason });
    existingReasons.add(welcomeReason);
  }

  for (const pId of playerIds) {
    const { data: attendedMatches } = await adminClient
      .from("match_attendance")
      .select("match:matches(id, match_date, home_team, away_team, home_score, away_score, status)")
      .eq("player_id", pId)
      .in("status", ["present", "yes"]);

    if (attendedMatches) {
      for (const item of attendedMatches as any[]) {
        const m = item.match;
        if (!m || m.status !== "played") continue;

        const matchReason = `Mecz • ${m.home_team} vs ${m.away_team} (${m.match_date})`;
        if (!existingReasons.has(matchReason)) {
          candidatePacks.push({ pack_type_id: "matchday_booster", source_reason: matchReason });
          existingReasons.add(matchReason);
        }

        const isOursHome =
          String(m.home_team || "").includes("Delta") || String(m.home_team || "").includes("DELTA");
        const ours = isOursHome ? m.home_score : m.away_score;
        const opp = isOursHome ? m.away_score : m.home_score;
        if (ours > opp) {
          const winReason = `Zwycięstwo • ${m.home_team} vs ${m.away_team} (${m.match_date})`;
          if (!existingReasons.has(winReason)) {
            candidatePacks.push({ pack_type_id: "gold_booster", source_reason: winReason });
            existingReasons.add(winReason);
          }
        }
      }
    }

    const { data: goalEvents } = await adminClient
      .from("match_events")
      .select("match_id")
      .eq("player_id", pId)
      .eq("event_type", "goal");

    const goalsPerMatch: Record<string, number> = {};
    (goalEvents || []).forEach((e: any) => {
      goalsPerMatch[e.match_id] = (goalsPerMatch[e.match_id] || 0) + 1;
    });

    for (const count of Object.values(goalsPerMatch)) {
      if (count >= 3) {
        const htReason = `Hat-trick w meczu (${count} gole!)`;
        if (!existingReasons.has(htReason)) {
          candidatePacks.push({ pack_type_id: "legend_booster", source_reason: htReason });
          existingReasons.add(htReason);
        }
      }
    }

    const { data: trainingsAttended } = await adminClient
      .from("training_attendance")
      .select("training_id")
      .eq("player_id", pId)
      .eq("status", "present");

    const sessionCount = trainingsAttended?.length || 0;
    if (sessionCount >= 5) {
      const tr5Reason = "Kamień milowy • 5 obecności na treningach";
      if (!existingReasons.has(tr5Reason)) {
        candidatePacks.push({ pack_type_id: "gold_booster", source_reason: tr5Reason });
        existingReasons.add(tr5Reason);
      }
    }
    if (sessionCount >= 10) {
      const tr10Reason = "Wojownik treningu • 10 obecności na treningach";
      if (!existingReasons.has(tr10Reason)) {
        candidatePacks.push({ pack_type_id: "inferno_booster", source_reason: tr10Reason });
        existingReasons.add(tr10Reason);
      }
    }
  }

  if (candidatePacks.length === 0) {
    return { grantedCount: 0, grantedPacks: [] };
  }

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    granted_count: number;
    granted_packs: any[];
  }>(adminClient, "grant_sync_reward_packs_atomic", {
    p_user_id: userId,
    p_packs: candidatePacks
  });

  return {
    grantedCount: Number(rpcResult.granted_count) || 0,
    grantedPacks: Array.isArray(rpcResult.granted_packs) ? rpcResult.granted_packs : []
  };
}

// ============================================================================
// 5. QUIZ KĄCIKA WIEDZY (COMPLETE QUIZ — ATOMOWE RPC)
// ============================================================================

export async function completeQuizServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  lessonId: string;
  scorePercent: number;
  lessonTitle?: string;
}) {
  const { adminClient, userId, lessonId, scorePercent, lessonTitle } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }
  if (
    !lessonId ||
    typeof lessonId !== "string" ||
    typeof scorePercent !== "number" ||
    !Number.isFinite(scorePercent) ||
    scorePercent < 0 ||
    scorePercent > 100
  ) {
    throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowe dane quizu", 400);
  }

  if (scorePercent < QUIZ_PASS_THRESHOLD_PERCENT) {
    return {
      success: false,
      message: `Wynik poniżej ${QUIZ_PASS_THRESHOLD_PERCENT}%. Spróbuj ponownie, aby odebrać nagrodę!`,
      passed: false,
      pointsAwarded: 0
    };
  }

  const rewardPoints = getQuizRewardForLesson(lessonId);

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    already_claimed: boolean;
    points_awarded: number;
    new_balance: number;
  }>(adminClient, "complete_quiz_reward_atomic", {
    p_user_id: userId,
    p_quiz_id: lessonId,
    p_score: Math.round(scorePercent),
    p_reward_dp: rewardPoints,
    p_metadata: { lessonTitle: lessonTitle || lessonId, scorePercent: Math.round(scorePercent) }
  });

  if (rpcResult.already_claimed) {
    return {
      success: true,
      passed: true,
      lessonId,
      lessonTitle,
      pointsAwarded: 0,
      alreadyClaimed: true,
      message: `Quiz ${lessonTitle || lessonId} został już wcześniej zaliczony. Punkty DELTA przysługują jednorazowo!`
    };
  }

  return {
    success: true,
    passed: true,
    lessonId,
    lessonTitle,
    pointsAwarded: Number(rpcResult.points_awarded) || rewardPoints,
    newPointsBalance: Number(rpcResult.new_balance) || 0,
    message: `Gratulacje! Zdobyłeś ${rewardPoints} Punktów DELTA za zdanie quizu: ${lessonTitle || lessonId}!`
  };
}

// ============================================================================
// 6. COTYGODNIOWE MISJE I PREZENTY (QUESTS CLAIM REWARD — ZERO UFANIA KWOTOM KLIENTA)
// ============================================================================

export async function claimQuestRewardServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  questId: string;
  now?: Date;
}) {
  const { adminClient, userId, questId, now = new Date() } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }
  if (!questId || typeof questId !== "string") {
    throw new EconomyRpcError("BAD_REQUEST", "Brak identyfikatora zadania (questId).", 400);
  }

  const cleanQuestId = questId.trim();
  let dpAmount = 0;
  let packTypeId: string | null = null;
  let rewardKey = "";
  let rewardType = "QUEST";
  let sourceReason = "";

  if (cleanQuestId.startsWith("birthday-")) {
    const playerId = cleanQuestId.slice("birthday-".length).trim();
    if (!isValidUuid(playerId)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy identyfikator zawodnika urodzin.", 400);
    }

    const { data: playerRow, error: playerErr } = await adminClient
      .from("players")
      .select("id, display_name")
      .eq("id", playerId)
      .maybeSingle();

    if (playerErr) {
      throw new EconomyRpcError("DB_READ_ERROR", "Błąd weryfikacji zawodnika.", 500);
    }
    if (!playerRow) {
      throw new EconomyRpcError("NOT_FOUND", "Nie znaleziono zawodnika dla prezentu urodzinowego.", 404);
    }

    dpAmount = BIRTHDAY_GIFT_REWARD.dp;
    packTypeId = BIRTHDAY_GIFT_REWARD.packTypeId || null;
    rewardKey = `birthday:${playerId}:${now.getUTCFullYear()}`;
    rewardType = "BIRTHDAY";
    sourceReason = `Prezent urodzinowy DELTA: ${playerRow.display_name || playerId}`;
  } else {
    const authoritative = WEEKLY_QUEST_REWARDS[cleanQuestId];
    if (!authoritative) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieznane lub niedozwolone zadanie tygodniowe.", 400);
    }

    dpAmount = authoritative.dp;
    packTypeId = authoritative.packTypeId || null;
    rewardKey = `quest:${getIsoWeekKey(now)}:${cleanQuestId}`;
    rewardType = "QUEST";
    sourceReason =
      cleanQuestId === "weekly_mega_chest"
        ? "Złota Skrzynia Tygodnia DELTA 2018"
        : `Nagroda za zadanie tygodniowe: ${authoritative.title}`;
  }

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    new_balance: number;
    granted_pack_id: string | null;
  }>(adminClient, "claim_reward_once_atomic", {
    p_user_id: userId,
    p_reward_key: rewardKey,
    p_reward_type: rewardType,
    p_dp_amount: dpAmount,
    p_pack_type_id: packTypeId,
    p_source_reason: sourceReason,
    p_metadata: { questId: cleanQuestId }
  });

  return {
    success: true,
    questId: cleanQuestId,
    pointsAwarded: dpAmount,
    newPointsBalance: Number(rpcResult.new_balance) || 0,
    grantedPackId: rpcResult.granted_pack_id || null,
    message: `Gratulacje! Odebrano nagrodę: +${dpAmount} Punktów DELTA!`
  };
}

// ============================================================================
// 7. SEASON PASS (OBLICZANIE XP PO STRONIE SERWERA + JEDNORAZOWY CLAIM ATOMOWY)
// ============================================================================

export async function computeAuthoritativeSeasonXp(
  adminClient: SupabaseClient,
  userId: string
): Promise<number> {
  // UWAGA BEZPIECZEŃSTWA: Celowo nie ufamy user_game_profile.season_xp (zapisywane przez starsze endpointy XP bez pełnej blokady RLS).
  // Liczymy XP wyłącznie z serwerowo kontrolowanych tabel aktywności klubowej i nagród.
  const [
    { data: spinRecord },
    { count: quizCount },
    { count: predCount },
    { count: questCount },
    { data: links }
  ] = await Promise.all([
    adminClient.from("user_daily_spins").select("total_spins").eq("user_id", userId).maybeSingle(),
    adminClient
      .from("user_quiz_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    adminClient
      .from("match_predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    adminClient
      .from("user_claimed_rewards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reward_type", "QUEST"),
    adminClient.from("parent_players").select("player_id").eq("parent_id", userId)
  ]);

  let clubActivityXp =
    (Number(spinRecord?.total_spins) || 0) * 15 +
    (quizCount || 0) * 30 +
    (predCount || 0) * 25 +
    (questCount || 0) * 100;

  const playerIds = (links || []).map((l: any) => l.player_id);
  if (playerIds.length > 0) {
    const [{ count: matchCount }, { count: trainCount }] = await Promise.all([
      adminClient
        .from("match_attendance")
        .select("*", { count: "exact", head: true })
        .in("player_id", playerIds)
        .in("status", ["present", "yes"]),
      adminClient
        .from("training_attendance")
        .select("*", { count: "exact", head: true })
        .in("player_id", playerIds)
        .eq("status", "present")
    ]);
    clubActivityXp += (matchCount || 0) * 60 + (trainCount || 0) * 40;
  }

  return clubActivityXp;
}

export async function claimSeasonPassRewardServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  level: number;
  seasonKey?: string;
}) {
  const { adminClient, userId, level, seasonKey = "2026" } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }

  const levelNum = Number(level);
  const reward = SEASON_PASS_SERVER_REWARDS.find(r => r.level === levelNum);
  if (!reward) {
    throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy poziom nagrody", 400);
  }

  const authoritativeXp = await computeAuthoritativeSeasonXp(adminClient, userId);
  if (authoritativeXp < reward.xpRequired) {
    throw new EconomyRpcError(
      "BAD_REQUEST",
      `Poziom ${reward.level} wymaga ${reward.xpRequired} Season XP (posiadasz ${authoritativeXp} XP).`,
      400
    );
  }

  const dpAmount = reward.amount || 0;
  const packTypeId = reward.packTypeId ? normalizePackTypeId(reward.packTypeId) : null;

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    new_balance: number;
    granted_pack_id: string | null;
  }>(adminClient, "claim_reward_once_atomic", {
    p_user_id: userId,
    p_reward_key: `season_pass:${seasonKey}:level_${reward.level}`,
    p_reward_type: "SEASON_PASS",
    p_dp_amount: dpAmount,
    p_pack_type_id: packTypeId,
    p_source_reason: `Nagroda Battle Pass: Poziom ${reward.level}`,
    p_metadata: { level: reward.level, xpRequired: reward.xpRequired, authoritativeXp }
  });

  return {
    success: true,
    level: reward.level,
    rewardTitle: reward.title,
    pointsAwarded: dpAmount,
    newPointsBalance: Number(rpcResult.new_balance) || 0,
    grantedPack: Boolean(rpcResult.granted_pack_id),
    grantedPackId: rpcResult.granted_pack_id || null,
    message: `Odebrano nagrodę poziomu ${reward.level}: ${reward.title}!`
  };
}

// ============================================================================
// 8. ODBIÓR NAGRODY ZA OSIĄGNIĘCIE (ACHIEVEMENT CLAIM REWARD — ATOMOWE RPC)
// ============================================================================

export async function claimAchievementRewardServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  achievementId: string;
  playerId?: string | null;
}) {
  const { adminClient, userId, achievementId, playerId } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Wymagane logowanie", 401);
  }
  if (!achievementId) {
    throw new EconomyRpcError("BAD_REQUEST", "Brak ID osiągnięcia", 400);
  }

  const { data: def, error: defErr } = await adminClient
    .from("achievement_definitions")
    .select("*")
    .eq("id", achievementId)
    .maybeSingle();

  if (defErr) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd odczytu definicji osiągnięcia.", 500);
  }
  if (!def) {
    throw new EconomyRpcError("NOT_FOUND", "Nie znaleziono osiągnięcia", 404);
  }

  let query = adminClient
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId);

  if (playerId) {
    query = query.eq("player_id", playerId);
  }

  const { data: userAch, error: achErr } = await query.maybeSingle();
  if (achErr) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd weryfikacji osiągnięcia użytkownika.", 500);
  }
  if (!userAch || !userAch.is_unlocked) {
    throw new EconomyRpcError("BAD_REQUEST", "To osiągnięcie nie zostało jeszcze odblokowane!", 400);
  }
  if (userAch.claimed_reward) {
    throw new EconomyRpcError("ALREADY_CLAIMED", "Nagroda za to osiągnięcie została już odebrana!", 409);
  }

  const rewardDp = Math.max(0, Number(def.reward_dp) || 0);
  const packTypeId = def.reward_pack_type ? normalizePackTypeId(def.reward_pack_type) : null;

  const rpcResult = await invokeEconomyRpc<{
    success: true;
    new_balance: number;
    granted_pack_id: string | null;
  }>(adminClient, "claim_achievement_reward_atomic", {
    p_user_id: userId,
    p_user_achievement_id: userAch.id,
    p_reward_dp: rewardDp,
    p_pack_type_id: packTypeId,
    p_source_reason: `Nagroda za osiągnięcie: ${def.title}`
  });

  const grantedPack = rpcResult.granted_pack_id
    ? {
        id: rpcResult.granted_pack_id,
        user_id: userId,
        pack_type_id: packTypeId,
        source_reason: `Nagroda za osiągnięcie: ${def.title}`,
        is_opened: false
      }
    : null;

  return {
    success: true,
    achievementId,
    title: def.title,
    rewardDp,
    newPointsBalance: Number(rpcResult.new_balance) || 0,
    grantedPack,
    message: `Odebrano nagrodę: +${rewardDp} DP${grantedPack ? ` oraz darmową paczkę!` : "!"}`
  };
}

// ============================================================================
// 9. ULUBIONE I BLOKOWANIE KART (FAVORITE / LOCK — OWNER-SCOPED ADMIN WRITE)
// ============================================================================

export async function setUserCardFlagServerSide(params: {
  adminClient: SupabaseClient;
  userId: string;
  userCardId?: string;
  cardId?: string;
  field: "is_favorite" | "is_locked";
  value: boolean;
}) {
  const { adminClient, userId, userCardId, cardId, field, value } = params;
  if (!userId) {
    throw new EconomyRpcError("UNAUTHORIZED", "Unauthorized", 401);
  }
  if (!userCardId && !cardId) {
    throw new EconomyRpcError("BAD_REQUEST", "Missing card identifier", 400);
  }
  if (field === "is_locked" && !userCardId) {
    throw new EconomyRpcError("BAD_REQUEST", "Missing userCardId", 400);
  }

  let query = adminClient
    .from("user_cards")
    .update({ [field]: Boolean(value) })
    .eq("user_id", userId);

  if (userCardId) {
    query = query.eq("id", userCardId);
  } else if (cardId) {
    query = query.eq("card_id", cardId);
  }

  const { data, error } = await query.select().maybeSingle();

  if (error) {
    throw new EconomyRpcError("DB_WRITE_ERROR", error.message || "Błąd aktualizacji karty.", 500);
  }
  if (!data) {
    throw new EconomyRpcError("NOT_FOUND", "Nie znaleziono karty w Twojej kolekcji.", 404);
  }

  return { success: true, card: data };
}

// ============================================================================
// 10. PRZYZNAWANIE KART SPECJALNYCH & PANEL ADMINISTRATORA
// ============================================================================

export async function grantSpecialCardServerSide(params: {
  adminClient: SupabaseClient;
  adminUserId: string;
  targetUserId: string;
  cardId: string;
  reason?: string;
}) {
  const { adminClient, adminUserId, targetUserId, cardId, reason = "Wyróżnienie Administratora" } = params;

  await assertAdminRoleServerSide(adminClient, adminUserId);

  if (!targetUserId || !cardId) {
    throw new EconomyRpcError("BAD_REQUEST", "Brak targetUserId lub cardId", 400);
  }

  const { data: cardDef, error: cErr } = await adminClient
    .from("card_definitions")
    .select("id, card_name")
    .eq("id", cardId)
    .maybeSingle();

  if (cErr) {
    throw new EconomyRpcError("DB_READ_ERROR", "Błąd sprawdzania karty.", 500);
  }
  if (!cardDef) {
    throw new EconomyRpcError("NOT_FOUND", "Karta nie istnieje", 404);
  }

  await invokeEconomyRpc(adminClient, "grant_user_card_atomic", {
    p_user_id: targetUserId,
    p_card_id: String(cardId),
    p_increment_duplicate: true,
    p_acquisition_source: "admin",
    p_admin_id: adminUserId,
    p_reason: String(reason || "Wyróżnienie Administratora")
  });

  return {
    success: true,
    message: `Przyznano kartę "${cardDef.card_name}" użytkownikowi.`
  };
}

export async function adminManageEconomyServerSide(params: {
  adminClient: SupabaseClient;
  adminUserId: string;
  body: Record<string, any>;
}) {
  const { adminClient, adminUserId, body } = params;
  await assertAdminRoleServerSide(adminClient, adminUserId);

  const action = body?.action;

  if (action === "grant_packs") {
    const { target_user_id, pack_type_id, quantity, reason } = body;
    const normalizedPack = normalizePackTypeId(pack_type_id);
    if (!normalizedPack) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy typ paczki", 400);
    }

    const packQty = Math.max(1, Math.min(50, parseInt(String(quantity), 10) || 1));

    let userIds: string[] = [];
    if (target_user_id === "all") {
      const { data: allUsers, error: uErr } = await adminClient.from("profiles").select("id");
      if (uErr) throw new EconomyRpcError("DB_READ_ERROR", uErr.message, 500);
      userIds = (allUsers || []).map((u: any) => u.id);
    } else if (isValidUuid(target_user_id)) {
      userIds = [target_user_id];
    } else {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy target_user_id", 400);
    }

    if (userIds.length === 0) {
      throw new EconomyRpcError("BAD_REQUEST", "Brak wybranych użytkowników.", 400);
    }

    const rowsToInsert: any[] = [];
    for (const uid of userIds) {
      for (let i = 0; i < packQty; i++) {
        rowsToInsert.push({
          user_id: uid,
          pack_type_id: normalizedPack,
          source_reason: reason || "Nagroda od trenera",
          is_opened: false
        });
      }
    }

    const { error } = await adminClient.from("user_unopened_packs").insert(rowsToInsert);
    if (error) throw new EconomyRpcError("DB_WRITE_ERROR", error.message, 500);

    return {
      success: true,
      message: `Pomyślnie przyznano ${rowsToInsert.length} paczek.`
    };
  }

  if (action === "grant_card") {
    const { target_user_id, card_id, reason = "Przyznane w panelu administratora" } = body;
    if (!isValidUuid(target_user_id) || !card_id) {
      throw new EconomyRpcError("BAD_REQUEST", "Brak prawidłowego target_user_id lub card_id", 400);
    }

    await invokeEconomyRpc(adminClient, "grant_user_card_atomic", {
      p_user_id: target_user_id,
      p_card_id: String(card_id),
      p_increment_duplicate: true,
      p_acquisition_source: "admin",
      p_admin_id: adminUserId,
      p_reason: String(reason)
    });

    return { success: true, message: "Karta została dodana do kolekcji użytkownika." };
  }

  if (action === "delete_card") {
    const { user_card_id } = body;
    if (!isValidUuid(user_card_id)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy user_card_id", 400);
    }

    const { error } = await adminClient.from("user_cards").delete().eq("id", user_card_id);
    if (error) throw new EconomyRpcError("DB_WRITE_ERROR", error.message, 500);
    return { success: true, message: "Karta została usunięta z kolekcji." };
  }

  if (action === "clear_user_cards") {
    const { target_user_id } = body;
    if (!isValidUuid(target_user_id)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy target_user_id", 400);
    }

    const { error } = await adminClient.from("user_cards").delete().eq("user_id", target_user_id);
    if (error) throw new EconomyRpcError("DB_WRITE_ERROR", error.message, 500);
    return { success: true, message: "Kolekcja użytkownika została wyczyszczona." };
  }

  if (action === "clear_all_cards") {
    const { error } = await adminClient
      .from("user_cards")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw new EconomyRpcError("DB_WRITE_ERROR", error.message, 500);
    return { success: true, message: "Wszystkie kolekcje zostały zresetowane." };
  }

  if (action === "get_user_cards") {
    const { target_user_id } = body;
    if (!isValidUuid(target_user_id)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy target_user_id", 400);
    }

    const { data: cards, error } = await adminClient
      .from("user_cards")
      .select(
        `
        id,
        card_id,
        acquired_at,
        duplicates_count,
        card_definition:card_definitions(
          id,
          card_name,
          title,
          rarity,
          card_type,
          player:players(id, display_name, shirt_number)
        )
      `
      )
      .eq("user_id", target_user_id)
      .order("acquired_at", { ascending: false });

    if (error) throw new EconomyRpcError("DB_READ_ERROR", error.message, 500);
    return { cards: cards || [] };
  }

  if (action === "grant_points") {
    const { target_user_id, amount, reason = "Korekta administratora (+DP)" } = body;
    if (!isValidUuid(target_user_id)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy target_user_id", 400);
    }
    const parsedAmount = parseInt(String(amount), 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowa kwota DP (wymagana wartość dodatnia).", 400);
    }

    const rpcRes = await invokeEconomyRpc<{ new_balance: number }>(
      adminClient,
      "apply_delta_points_transaction",
      {
        p_user_id: target_user_id,
        p_amount: parsedAmount,
        p_transaction_type: "EARN",
        p_source_type: "ADMIN",
        p_source_id: adminUserId,
        p_idempotency_key: null,
        p_metadata: { admin_id: adminUserId, reason: String(reason) }
      }
    );

    return {
      success: true,
      newBalance: Number(rpcRes.new_balance) || 0,
      message: `Przyznano +${parsedAmount} Delta Points!`
    };
  }

  if (action === "set_points" || action === "reset_points") {
    const { target_user_id, balance, reason } = body;
    if (!isValidUuid(target_user_id)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy target_user_id", 400);
    }
    const targetBalance = action === "reset_points" ? 0 : parseInt(String(balance), 10);
    if (!Number.isFinite(targetBalance) || targetBalance < 0 || targetBalance > 1000000) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowa docelowa liczba DP (>= 0).", 400);
    }

    const rpcRes = await invokeEconomyRpc<{ new_balance: number }>(
      adminClient,
      "admin_set_delta_points_atomic",
      {
        p_admin_id: adminUserId,
        p_target_user_id: target_user_id,
        p_new_balance: targetBalance,
        p_new_total_earned: targetBalance,
        p_reason: reason || (action === "reset_points" ? "Reset punktów przez administratora" : "Ustawienie salda DP przez administratora")
      }
    );

    return {
      success: true,
      newBalance: Number(rpcRes.new_balance) ?? targetBalance,
      message:
        action === "reset_points"
          ? "Zresetowano punkty DP do 0."
          : `Ustawiono stan konta: ${targetBalance} DP.`
    };
  }

  if (action === "recalculate_user_points" || action === "recalculate_all_points") {
    const isAll = action === "recalculate_all_points";
    const { target_user_id } = body;
    if (!isAll && !isValidUuid(target_user_id)) {
      throw new EconomyRpcError("BAD_REQUEST", "Nieprawidłowy target_user_id", 400);
    }

    const [
      { data: profilesRows },
      { data: parentLinks },
      { data: trainingAtt },
      { data: matchAtt },
      { data: matchEvents }
    ] = await Promise.all([
      isAll
        ? adminClient.from("profiles").select("id")
        : adminClient.from("profiles").select("id").eq("id", target_user_id),
      adminClient.from("parent_players").select("parent_id, player_id"),
      adminClient.from("training_attendance").select("player_id, status").eq("status", "present"),
      adminClient
        .from("match_attendance")
        .select("player_id, status")
        .in("status", ["present", "yes"]),
      adminClient.from("match_events").select("player_id, assist_player_id, event_type")
    ]);

    const targets = (profilesRows || []).map((p: any) => String(p.id));
    if (targets.length === 0) {
      throw new EconomyRpcError("NOT_FOUND", "Nie znaleziono konta użytkownika.", 404);
    }

    let lastBalance = 0;
    for (const uid of targets) {
      const linkedPlayerIds = (parentLinks || [])
        .filter((x: any) => x.parent_id === uid)
        .map((x: any) => x.player_id);

      let calcPoints = 100;
      for (const pid of linkedPlayerIds) {
        const tSessions = (trainingAtt || []).filter((a: any) => a.player_id === pid).length;
        const mPlayed = (matchAtt || []).filter((a: any) => a.player_id === pid).length;
        const goals = (matchEvents || []).filter(
          (e: any) => e.player_id === pid && e.event_type === "goal"
        ).length;
        const assists = (matchEvents || []).filter(
          (e: any) => e.assist_player_id === pid && e.event_type === "goal"
        ).length;
        const mvps = (matchEvents || []).filter(
          (e: any) => e.player_id === pid && e.event_type === "mvp"
        ).length;

        calcPoints += tSessions * 50 + mPlayed * 70 + goals * 30 + assists * 20 + mvps * 100;
      }

      const rpcRes = await invokeEconomyRpc<{ new_balance: number }>(
        adminClient,
        "admin_set_delta_points_atomic",
        {
          p_admin_id: adminUserId,
          p_target_user_id: uid,
          p_new_balance: calcPoints,
          p_new_total_earned: calcPoints,
          p_reason: "Przeliczenie DP na podstawie statystyk klubowych"
        }
      );
      lastBalance = Number(rpcRes.new_balance) ?? calcPoints;
    }

    return {
      success: true,
      count: targets.length,
      newBalance: lastBalance,
      message: isAll
        ? `Pomyślnie przeliczono i zsynchronizowano punkty DP dla ${targets.length} kont!`
        : `Przeliczono punkty DP! Nowy stan: ${lastBalance} DP`
    };
  }

  if (action === "create_card_definition") {
    const { player_id, card_name, title, card_type, rarity, description, lore } = body;
    if (!isValidUuid(player_id) || !String(card_name || title || "").trim()) {
      throw new EconomyRpcError("BAD_REQUEST", "Wybierz zawodnika i wpisz tytuł karty.", 400);
    }

    const cleanTitle = String(card_name || title).trim();
    const cleanLore = typeof lore === "string" && lore.trim() ? lore.trim() : null;

    const { error } = await adminClient.from("card_definitions").insert({
      player_id,
      season: "2026/27",
      card_name: cleanTitle,
      title: cleanTitle,
      card_type,
      rarity,
      description: (typeof description === "string" && description.trim()) || cleanLore,
      lore: cleanLore,
      is_active: true
    });

    if (error) throw new EconomyRpcError("DB_WRITE_ERROR", error.message, 500);
    return {
      success: true,
      message: "Karta została pomyślnie dodana do oficjalnego katalogu kolekcji DELTA!"
    };
  }

  throw new EconomyRpcError("BAD_REQUEST", "Nieznana akcja", 400);
}

export function serializeEconomyError(
  err: unknown,
  fallbackMessage = "Błąd serwera"
): { status: number; body: { error: string; code?: string } } {
  if (err instanceof EconomyRpcError) {
    return {
      status: err.statusCode,
      body: { error: err.message, code: err.code }
    };
  }
  const message = err instanceof Error ? err.message : fallbackMessage;
  return {
    status: 500,
    body: { error: message || fallbackMessage }
  };
}
