/**
 * DELTA INFERNO — HOME Dashboard Real Data Loader (P1 Safe Read-Only)
 *
 * Implements read-only server-side data loading for HOME Dashboard UI4:
 * 1. Session verification via getCurrentProfile()
 * 2. Role-based permission checks & parent-child authorization
 * 3. Nearest upcoming match & training session selection (Europe/Warsaw timezone)
 * 4. Safe mapping to DashboardUI4AdapterInput -> DashboardUI4Model
 * 5. Complete isolation: Zero mutations, zero PII leaks, zero client-side service_role.
 * 6. DELTA-027 Security Hardening:
 *    - Genuine user->player resolution (never assumes players.id = auth.users.id)
 *    - Strict data separation: zero synthetic XP, zero demo cards, zero fake badges in real-data mode
 *    - Bulletproof Europe/Warsaw timezone parser with DST transition handling
 */

import { getCurrentProfile } from "../current-profile.ts";
import { createClient } from "../supabase/server.ts";
import {
  parseWarsawLocalDateTime,
  getWarsawDateTime,
  normalizeTimeString,
  calculateVerifiedSportsXp,
  isTrainingFinished
} from "../stadium/xp-calculator.ts";
import {
  createDashboardUI4Model,
  type DashboardUI4AdapterInput,
  type DashboardUI4Model,
  type PlayerInput,
  type EventInput,
  type CardDefinitionInput,
  type UserCardInput,
  type SportsXpInput,
  type UnavailableReason
} from "../../components/dashboard/ui4/index.ts";
import { canAccessChildData } from "../security/roles.ts";

export interface RealDataLoaderOptions {
  activeChildId?: string;
  now?: Date;
  client?: any;
  isAuthoritativeCatalog?: boolean;
  profileOverride?: {
    user: { id: string; email?: string } | null;
    profile: { id: string; role?: string | null; display_name?: string | null } | null;
    error?: string | null;
  } | null;
}

export interface RealDashboardUI4Result {
  model: DashboardUI4Model;
  actor: {
    userId: string | null;
    role: string | null;
    actorKind: "parent" | "player" | "staff" | "user";
    isAuthenticated: boolean;
    linkedChildIds: string[];
    activeChildId: string | null;
  };
  eventContext: {
    nextEventType: "match" | "training" | "none";
    eventId: string | null;
    startsAt: string | null;
    hasTime: boolean;
  };
}

export interface CandidateEvent {
  kind: "match" | "training";
  id: string;
  title: string;
  location: string | null;
  opponent: string | null;
  date: Date;
  hasTime: boolean;
  raw: any;
}

/**
 * DELTA-027 Strict Environment Security Guard.
 * Validates that the request genuinely originates from a local development loopback machine.
 * NEVER trusts Host or X-Forwarded-Host alone:
 * - If running in remote cloud environments (Vercel Preview / Vercel Production), access is unconditionally DENIED.
 * - If running in standard production mode without an explicit dev flag, access is DENIED.
 * - Only genuine local loopback requests without Vercel runtime are permitted to access real database queries.
 */
export function isGenuineLocalEnvironment(hostHeader?: string): boolean {
  // 1. Unconditionally blocked on Vercel (both Preview and Production)
  if (Boolean(process.env.VERCEL || process.env.VERCEL_ENV)) {
    return false;
  }

  // 2. Unconditionally blocked in production builds unless local real data flag is explicitly enabled
  if (process.env.NODE_ENV === "production" && !process.env.DELTA_ALLOW_LOCAL_REAL_DATA) {
    return false;
  }

  // 3. Host must strictly be loopback (localhost or 127.0.0.1 or ::1)
  let cleanHost = (hostHeader || "").toLowerCase().trim();
  if (cleanHost.startsWith("[") && cleanHost.includes("]")) {
    cleanHost = cleanHost.slice(1, cleanHost.indexOf("]"));
  } else if (cleanHost.includes(":") && !cleanHost.includes("::")) {
    cleanHost = cleanHost.split(":")[0];
  }
  const isLoopback = cleanHost === "localhost" || cleanHost === "127.0.0.1" || cleanHost === "::1";

  return isLoopback;
}

/**
 * Safely queries attendance for a player without service_role or unsafe overrides.
 * Returns { data, error } safely. If mock client or database returns an error,
 * error is propagated so the caller marks progress as unavailable without guessing.
 */
export async function safeQueryAttendance(
  supabase: any,
  table: "training_attendance" | "match_attendance",
  childId: string | null
): Promise<{ data: any[] | null; error: any }> {
  if (!childId) {
    return { data: null, error: null };
  }
  try {
    const selectCols = table === "training_attendance"
      ? "training_id,player_id,status"
      : "match_id,player_id,status";
    let query = supabase.from(table).select(selectCols);
    if (typeof query?.eq === "function") {
      query = query.eq("player_id", childId);
    } else {
      return { data: null, error: new Error(`Query does not support eq on ${table}`) };
    }
    const res = await query;
    return res;
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Normalizes date and time strings to a Date object in Europe/Warsaw timezone.
 * Handles DST spring forward gap (non-existent hour) and autumn overlap (ambiguous hour) safely.
 * Returns { date, hasTime: true } when exact time is specified, or { date, hasTime: false } for date-only events.
 */
export function parseWarsawDateTime(
  dateStr?: string | null,
  timeStr?: string | null
): { date: Date; hasTime: boolean } | null {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) {
    return null;
  }

  const cleanDate = dateStr.trim();
  const cleanTime = typeof timeStr === "string" ? timeStr.trim() : "";
  const normalizedTime = normalizeTimeString(cleanTime);

  if (normalizedTime) {
    try {
      const date = parseWarsawLocalDateTime(cleanDate, normalizedTime);
      if (!Number.isNaN(date.getTime())) {
        return { date, hasTime: true };
      }
    } catch {
      // Fallback below
    }
  }

  // When no time is set, use 12:00:00 Warsaw time for date-level comparison,
  // but explicitly flag hasTime: false to disallow synthetic countdowns.
  try {
    const fallbackDate = parseWarsawLocalDateTime(cleanDate, "12:00:00");
    if (!Number.isNaN(fallbackDate.getTime())) {
      return { date: fallbackDate, hasTime: false };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Computes deterministic countdown string in Polish for future events.
 * Returns null if event is in the past, right now, or lacking exact time.
 */
export function formatWarsawCountdown(targetTime: Date, nowTime: Date): string | null {
  const diffMs = targetTime.getTime() - nowTime.getTime();
  if (diffMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);

  if (days >= 2) {
    return `ZA ${days} DNI` + (hours > 0 ? ` ${hours} GODZ` : "");
  }
  if (days === 1) {
    return `ZA 1 DZIEŃ` + (hours > 0 ? ` ${hours} GODZ` : "");
  }
  if (hours >= 1) {
    return `ZA ${hours} GODZ`;
  }
  return `ZA ${Math.max(1, totalMinutes)} MIN`;
}

/**
 * Determines opponent and title from match teams.
 */
function resolveMatchOpponent(homeTeam?: string | null, awayTeam?: string | null): { opponent: string | null; title: string } {
  const home = homeTeam?.trim() || "Delta";
  const away = awayTeam?.trim() || "Rywal";

  const isHomeDelta = home.toLowerCase().includes("delta");
  const opponent = isHomeDelta ? away : home;
  const title = `${home} vs ${away}`;

  return { opponent, title };
}

/**
 * Selects the single nearest future event between upcoming matches and trainings.
 * Accounts for canceled matches, past events, missing times, and Warsaw timezone.
 */
export function selectNearestEvent(
  matches: any[] | null | undefined,
  trainings: any[] | null | undefined,
  now: Date
): {
  nextMatch: EventInput | null;
  nextMatchCountdown: string | null;
  nextTraining: { session: EventInput; start: string | null; countdown: string | null } | null;
  eventContext: RealDashboardUI4Result["eventContext"];
} {
  const candidates: CandidateEvent[] = [];
  const warsawNow = getWarsawDateTime(now);
  const todayDateStr = warsawNow.dateStr;

  // 1. Process matches
  if (Array.isArray(matches)) {
    for (const m of matches) {
      if (!m || typeof m !== "object") continue;

      // Exclude canceled, postponed, or already played matches
      const status = typeof m.status === "string" ? m.status.toLowerCase().trim() : "";
      if (status === "cancelled" || status === "canceled" || status === "played" || status === "postponed") {
        continue;
      }

      const parsed = parseWarsawDateTime(m.match_date, m.match_time);
      if (!parsed) continue;

      // Past check:
      // If exact time exists: must be in the future
      // If date-only: match date must be today or future
      if (parsed.hasTime) {
        if (parsed.date.getTime() < now.getTime()) {
          continue; // Past match
        }
      } else {
        if (m.match_date < todayDateStr) {
          continue; // Past date
        }
      }

      const { opponent, title } = resolveMatchOpponent(m.home_team, m.away_team);

      candidates.push({
        kind: "match",
        id: String(m.id || ""),
        title: m.title?.trim() || title,
        location: m.venue?.trim() || m.location?.trim() || "Boisko klubowe",
        opponent,
        date: parsed.date,
        hasTime: parsed.hasTime,
        raw: m
      });
    }
  }

  // 2. Process training sessions
  if (Array.isArray(trainings)) {
    for (const t of trainings) {
      if (!t || typeof t !== "object") continue;

      const parsed = parseWarsawDateTime(t.training_date, t.start_time);
      if (!parsed) continue;

      if (parsed.hasTime) {
        if (parsed.date.getTime() < now.getTime()) {
          continue; // Past training
        }
      } else {
        if (t.training_date < todayDateStr) {
          continue; // Past date
        }
      }

      candidates.push({
        kind: "training",
        id: String(t.id || ""),
        title: t.title?.trim() || "Trening klubowy",
        location: t.location?.trim() || "Boisko klubowe",
        opponent: null,
        date: parsed.date,
        hasTime: parsed.hasTime,
        raw: t
      });
    }
  }

  if (candidates.length === 0) {
    return {
      nextMatch: null,
      nextMatchCountdown: null,
      nextTraining: null,
      eventContext: {
        nextEventType: "none",
        eventId: null,
        startsAt: null,
        hasTime: false
      }
    };
  }

  // Sort candidate events chronologically ascending
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const nearest = candidates[0];

  const startsAtIso = nearest.date.toISOString();
  const countdown = nearest.hasTime ? formatWarsawCountdown(nearest.date, now) : null;

  if (nearest.kind === "match") {
    const nextMatch: EventInput = {
      id: nearest.id,
      title: nearest.title,
      starts_at: startsAtIso,
      start_time: nearest.hasTime ? normalizeTimeString(nearest.raw.match_time) : null,
      location: nearest.location,
      opponent: nearest.opponent
    };

    return {
      nextMatch,
      nextMatchCountdown: countdown,
      nextTraining: null,
      eventContext: {
        nextEventType: "match",
        eventId: nearest.id,
        startsAt: startsAtIso,
        hasTime: nearest.hasTime
      }
    };
  }

  // Nearest is training
  const nextTraining = {
    session: {
      id: nearest.id,
      title: nearest.title,
      starts_at: startsAtIso,
      start_time: nearest.hasTime ? normalizeTimeString(nearest.raw.start_time) : null,
      location: nearest.location
    },
    start: startsAtIso,
    countdown
  };

  return {
    nextMatch: null,
    nextMatchCountdown: null,
    nextTraining,
    eventContext: {
      nextEventType: "training",
      eventId: nearest.id,
      startsAt: startsAtIso,
      hasTime: nearest.hasTime
    }
  };
}

/**
 * Creates safe fallback model when user is unauthenticated or access is denied.
 */
function createSafeUnauthenticatedModel(): DashboardUI4Model {
  return createDashboardUI4Model({
    profile: {
      id: "unauthenticated",
      role: "guest",
      display_name: "Gość"
    },
    access: {
      canViewCollection: false,
      canViewAchievements: false,
      canViewTeamShowcase: false,
      canViewClubCommunications: false
    },
    players: undefined,
    parentPlayerIds: undefined,
    nextMatch: null,
    nextTraining: null
  });
}

/**
 * Primary read-only data loader for HOME Dashboard UI4.
 */
export async function loadRealDashboardUI4Data(
  options: RealDataLoaderOptions = {}
): Promise<RealDashboardUI4Result> {
  const now = options.now || new Date();

  // 1. Client & Session initialization
  let authUser: { id: string; email?: string } | null = null;
  let authProfile: { id: string; role?: string | null; display_name?: string | null } | null = null;
  let supabase = options.client;

  // 2. Session & Authentication Verification (DELTA-031 ETAP B Strict Real-Data Auth)
  if (options.profileOverride !== undefined) {
    authUser = options.profileOverride?.user ?? null;
    authProfile = options.profileOverride?.profile ?? null;
  } else {
    try {
      if (!supabase) {
        supabase = await createClient();
      }
      // ETAP B: In real-data, strictly require identity confirmed by supabase.auth.getUser().
      // The developer cookie (delta_dev_user) is NEVER allowed to authorize real data or private records.
      const authResponse = supabase?.auth?.getUser ? await supabase.auth.getUser() : null;
      const verifiedUser = authResponse?.data?.user ?? null;
      const authError = authResponse?.error ?? null;

      if (authError || !verifiedUser) {
        authUser = null;
        authProfile = null;
      } else {
        authUser = verifiedUser;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id,role,display_name")
          .eq("id", verifiedUser.id)
          .maybeSingle();

        authProfile = profile ?? {
          id: verifiedUser.id,
          role: "parent",
          display_name: verifiedUser.user_metadata?.full_name || verifiedUser.id.slice(0, 8) || "Użytkownik"
        };
      }
    } catch {
      authUser = null;
      authProfile = null;
    }
  }

  if (!authUser || !authProfile) {
    return {
      model: createSafeUnauthenticatedModel(),
      actor: {
        userId: null,
        role: null,
        actorKind: "user",
        isAuthenticated: false,
        linkedChildIds: [],
        activeChildId: null
      },
      eventContext: {
        nextEventType: "none",
        eventId: null,
        startsAt: null,
        hasTime: false
      }
    };
  }

  const role = authProfile.role || "parent";
  const userRole: "admin" | "coach" | "parent" =
    role === "admin" || role === "coach" ? role : "parent";
  const actorKind: "parent" | "player" | "staff" | "user" =
    userRole === "admin" || userRole === "coach" ? "staff" : "parent";

  if (!supabase) {
    supabase = await createClient();
  }

  try {
    let linkedChildIds: string[] = [];
    let activeChildId: string | null = null;
    let allowedPlayers: PlayerInput[] = [];

    // 3. Child & Player Isolation (DELTA-028 Schema-Aligned)
    // Adult accounts (parents & staff) connect to player records strictly through parent_players.
    // players.id is never assumed to equal auth.users.id.
    const { data: parentLinks, error: linksError } = await supabase
      .from("parent_players")
      .select("player_id")
      .eq("parent_id", authUser.id);

    if (!linksError && Array.isArray(parentLinks)) {
      linkedChildIds = parentLinks.map((x: any) => String(x.player_id)).filter(Boolean);
    }

    if (linkedChildIds.length > 0) {
      // Authorize target child selection
      if (options.activeChildId) {
        const isAuthorized = canAccessChildData(
          { userId: authUser.id, role: userRole, parentPlayerIds: linkedChildIds },
          options.activeChildId
        );
        // If parent attempts to access an unauthorized child, strictly reject and fall back safely
        activeChildId = isAuthorized ? options.activeChildId : linkedChildIds[0];
      } else {
        activeChildId = linkedChildIds[0];
      }

      // Fetch strictly the authorized linked children
      const { data: playerRows, error: playersError } = await supabase
        .from("players")
        .select("id,display_name,shirt_number,position,active")
        .in("id", linkedChildIds)
        .eq("active", true);

      if (!playersError && Array.isArray(playerRows)) {
        // Place active child first so adapter picks it
        allowedPlayers = [...playerRows].sort((a, b) => {
          if (a.id === activeChildId) return -1;
          if (b.id === activeChildId) return 1;
          return (a.display_name || "").localeCompare(b.display_name || "");
        });
      }
    } else if (actorKind === "staff") {
      // Staff without linked children can view team showcase players
      const { data: teamPlayers } = await supabase
        .from("players")
        .select("id,display_name,shirt_number,position,active")
        .eq("active", true)
        .order("display_name")
        .limit(12);

      allowedPlayers = Array.isArray(teamPlayers) ? teamPlayers : [];
    }

    // 4. Schedule, Events & Collection (Read-Only)
    const [
      { data: matchesData },
      { data: trainingData },
      { data: newsData },
      { data: clubUpdatesData },
      { data: cardDefsData, error: cardDefsError },
      { data: userCardsData, error: userCardsError },
      { data: unopenedPacksData, error: unopenedPacksError },
      trAttRes,
      mAttRes
    ] = await Promise.all([
      supabase
        .from("matches")
        .select("id,round_no,match_date,match_time,venue,home_team,away_team,home_score,away_score,status")
        .order("match_date"),
      supabase
        .from("training_sessions")
        .select("id,training_date,start_time,end_time,location,title,notes")
        .order("training_date"),
      supabase
        .from("news")
        .select("id,title,body,published_at")
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("club_updates")
        .select("id,title,body,priority,published_at")
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("card_definitions")
        .select(`
          id,
          card_name,
          title,
          rarity,
          artwork_url,
          artwork_pose,
          frame_theme,
          card_number,
          is_active,
          season,
          card_type,
          player:players(id, display_name, shirt_number, position, photo_path)
        `)
        .eq("is_active", true)
        .order("card_number"),
      supabase
        .from("user_cards")
        .select(`
          id,
          user_id,
          card_id,
          duplicates_count,
          is_locked,
          is_favorite,
          acquired_at,
          card_definition:card_definitions(
            id,
            card_name,
            title,
            rarity,
            artwork_url,
            artwork_pose,
            frame_theme,
            card_number,
            player:players(id, display_name, shirt_number, position, photo_path)
          )
        `)
        .eq("user_id", authUser.id)
        .order("acquired_at", { ascending: false }),
      supabase
        .from("user_unopened_packs")
        .select("id, pack_type_id, source_reason, is_opened, created_at")
        .eq("user_id", authUser.id)
        .eq("is_opened", false),
      safeQueryAttendance(supabase, "training_attendance", activeChildId),
      safeQueryAttendance(supabase, "match_attendance", activeChildId)
    ]);

    const { nextMatch, nextMatchCountdown, nextTraining, eventContext } = selectNearestEvent(
      matchesData,
      trainingData,
      now
    );

    // 5. Map Collection Data (DELTA-028 P2 Read-Only)
    let allCards: CardDefinitionInput[] | undefined = undefined;
    let userCards: UserCardInput[] | undefined = undefined;
    let unopenedPacksCount: number | undefined = undefined;

    if (!cardDefsError && !userCardsError && Array.isArray(cardDefsData) && Array.isArray(userCardsData)) {
      allCards = cardDefsData.map((def: any) => ({
        id: String(def.id),
        name: def.card_name || def.title || def.name,
        title: def.title || def.card_name,
        rarity: def.rarity ?? null,
        card_type: def.card_type ?? null,
        artwork_url: def.artwork_url ?? null,
        image_url: def.artwork_url ?? null,
        player: def.player ? {
          id: String(def.player.id),
          display_name: def.player.display_name,
          shirt_number: def.player.shirt_number,
          position: def.player.position
        } : null
      }));

      userCards = userCardsData.map((uc: any) => {
        const def = uc.card_definition;
        return {
          id: String(uc.id),
          card_id: String(uc.card_id),
          duplicates_count: typeof uc.duplicates_count === "number" ? uc.duplicates_count : 0,
          acquired_at: uc.acquired_at ?? null,
          card_definition: def ? {
            id: String(def.id),
            name: def.card_name || def.title || def.name,
            title: def.title || def.card_name,
            rarity: def.rarity ?? null,
            card_type: def.card_type ?? null,
            artwork_url: def.artwork_url ?? null,
            image_url: def.artwork_url ?? null,
            player: def.player ? {
              id: String(def.player.id),
              display_name: def.player.display_name,
              shirt_number: def.player.shirt_number,
              position: def.player.position
            } : null
          } : null
        };
      });

      unopenedPacksCount = !unopenedPacksError && Array.isArray(unopenedPacksData)
        ? unopenedPacksData.length
        : 0;
    }

    // 5.5. Sports XP & Attendance Calculation (DELTA-038 Real Sports XP)
    let sportsXp: SportsXpInput | null = null;
    let progressUnavailableReason: UnavailableReason | undefined = undefined;

    if (!activeChildId) {
      progressUnavailableReason = actorKind === "parent"
        ? "no_linked_player"
        : "not_loaded";
    } else if (trAttRes?.error || mAttRes?.error || !Array.isArray(trAttRes?.data) || !Array.isArray(mAttRes?.data)) {
      progressUnavailableReason = "not_loaded";
    } else {
      const verifiedResult = calculateVerifiedSportsXp(activeChildId, {
        trainingSessions: Array.isArray(trainingData) ? trainingData : [],
        trainingAttendance: trAttRes.data,
        matches: Array.isArray(matchesData) ? matchesData : [],
        matchAttendance: mAttRes.data,
        referenceDate: now
      });

      const finishedTrainings = (Array.isArray(trainingData) ? trainingData : []).filter(s =>
        isTrainingFinished(s, now)
      );

      const attendanceRatePercent = finishedTrainings.length > 0
        ? Math.min(100, Math.max(0, Math.round((verifiedResult.presentTrainings / finishedTrainings.length) * 100)))
        : null;

      sportsXp = {
        sportsXp: verifiedResult.sportsXp,
        playerLevel: verifiedResult.playerLevel,
        currentLvlXp: verifiedResult.currentLvlXp,
        neededLvlXp: verifiedResult.neededLvlXp,
        progressPercent: verifiedResult.progressPercent,
        presentTrainings: verifiedResult.presentTrainings,
        presentMatches: verifiedResult.presentMatches,
        stadiumTierTitle: verifiedResult.stadiumProgression.currentTier.name,
        attendanceRatePercent
      };
    }

    // 6. Build Adapter Input
    const adapterInput: DashboardUI4AdapterInput = {
      profile: {
        id: authUser.id,
        role: authProfile.role,
        display_name: authProfile.display_name
      },
      teamName: "K.S. Delta Warszawa U-9",
      access: {
        canViewCollection: true,
        canViewAchievements: true,
        canViewTeamShowcase: true,
        canViewClubCommunications: true
      },
      players: allowedPlayers.length > 0 ? allowedPlayers : (actorKind === "parent" ? [] : undefined),
      parentPlayerIds: actorKind === "parent" ? (activeChildId ? [activeChildId, ...linkedChildIds.filter(id => id !== activeChildId)] : linkedChildIds) : linkedChildIds,
      nextMatch,
      nextMatchCountdown,
      nextTraining,
      // Communications mapped to existing adapter expectations
      news: Array.isArray(newsData)
        ? newsData.map(n => ({ id: n.id, title: n.title, content: n.body, published_at: n.published_at }))
        : [],
      clubUpdates: Array.isArray(clubUpdatesData)
        ? clubUpdatesData.map(u => ({ id: u.id, title: u.title, content: u.body, published_at: u.published_at, urgent: u.priority === "urgent" || u.priority === "high" }))
        : [],
      // DELTA-028 P2 Collection Data
      allCards,
      userCards,
      unopenedPacksCount,
      isAuthoritativeCatalog: options.isAuthoritativeCatalog ?? false,
      // DELTA-038 Real Sports XP & Progress
      sportsXp,
      progressUnavailableReason,
      // Data purity: gameProfile (user_game_profile) and achievements remain undefined until future phases
      gameProfile: undefined,
      achievements: undefined
    };

    const model = createDashboardUI4Model(adapterInput);

    return {
      model,
      actor: {
        userId: authUser.id,
        role: authProfile.role ?? null,
        actorKind,
        isAuthenticated: true,
        linkedChildIds,
        activeChildId
      },
      eventContext
    };
  } catch {
    // Return safe fallback without exposing database error details
    const fallbackModel = createDashboardUI4Model({
      profile: {
        id: authUser.id,
        role: authProfile.role,
        display_name: authProfile.display_name
      },
      access: {
        canViewCollection: false,
        canViewAchievements: false,
        canViewTeamShowcase: false,
        canViewClubCommunications: false
      },
      players: undefined,
      parentPlayerIds: undefined,
      nextMatch: undefined,
      nextTraining: undefined
    });

    return {
      model: fallbackModel,
      actor: {
        userId: authUser.id,
        role: authProfile.role ?? null,
        actorKind,
        isAuthenticated: true,
        linkedChildIds: [],
        activeChildId: null
      },
      eventContext: {
        nextEventType: "none",
        eventId: null,
        startsAt: null,
        hasTime: false
      }
    };
  }
}
