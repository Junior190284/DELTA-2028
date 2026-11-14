'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Trophy,
  Target,
  Shield,
  CalendarDays,
  Clock,
  UserCheck,
  Users,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Crown,
  Play,
  Bell,
  Gift,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  BookOpen,
  Camera,
  Check,
  Star,
  ExternalLink,
  Layers,
  HelpCircle,
  X
} from 'lucide-react';

import {
  DeltaCard,
  DeltaButton,
  DeltaBadge,
  DeltaSkeleton,
  DeltaEmptyState,
  DeltaSectionHeader
} from '@/components/ui';
import DeltaHomePrioritySection from '@/components/DeltaHomePrioritySection';
import PlayerCard from '@/components/PlayerCard';
import { getTeamLogo, formatTeamName } from '@/lib/teams';
import type { GameMission } from '@/lib/game/economy';

// ============================================================================
// HELPER TYPES & FUNCTIONS
// ============================================================================

export interface DeltaCinematicDashboardProps {
  profile: {
    id: string;
    role?: string | null;
    display_name?: string | null;
  };
  gameProfile?: {
    currentXP?: number;
    seasonXP?: number;
    levelInfo?: {
      level: number;
      currentLevelXP: number;
      nextLevelXP: number;
      progressPercent: number;
      title: string;
    };
    activityStreak?: number;
    maxStreak?: number;
    unopenedPacks?: number;
    dailySpinUsedToday?: boolean;
    unreadNotifications?: number;
  } | null;
  players: any[];
  matches: any[];
  nextMatch: any | null;
  nextMatchCountdown: string;
  nextPresent: number;
  attendance: any[];
  parentPlayerIds: string[];
  myChild?: any | null;
  news: any[];
  unreadNewsCount: number;
  readNewsMap: Record<string, boolean>;
  clubUpdates: any[];
  homePriorityData: any;
  teamSummary: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goals: number;
    assists: number;
  };
  teamGoalTarget: number;
  teamGoalProgress: number;
  currentWinStreak: number;
  currentUnbeatenStreak: number;
  recentMatches: any[];
  scorersRanking: any[];
  assistsRanking: any[];
  stats: Record<string, any>;
  onSelectTab: (tab: any, payload?: any) => void;
  onOpenModalAction: (actionId: string) => void;
  onTriggerIntro: () => void;
  openMatch: (match: any, initial?: "summary" | "attendance" | "lineup" | "events" | "mvp", placement?: "home" | "overlay") => void;
  openPlayerProfile: (player: any) => void;
  staff: boolean;
  canManageMatches: boolean;
}

function datePL(x: string | null | undefined): string {
  if (!x) return "—";
  try {
    return new Date(`${x}T12:00:00`).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return x;
  }
}

function Logo({ team, size = 48 }: { team: string; size?: number }) {
  const src = getTeamLogo(team);
  if (src) {
    return (
      <img
        src={src}
        alt={formatTeamName(team)}
        style={{ width: size, height: size, objectFit: "contain" }}
        className="shrink-0 drop-shadow-md"
      />
    );
  }
  const short = team.includes(" WI")
    ? "WI"
    : team.includes(" WA")
    ? "WA"
    : team.includes(" GM")
    ? "GM"
    : team.split(" ").filter(Boolean)[0]?.slice(0, 2).toUpperCase() || "KL";

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: Math.max(11, Math.round(size * 0.32)),
        color: "#fbbf24",
        letterSpacing: "0.05em"
      }}
      className="shrink-0"
    >
      {short}
    </div>
  );
}

// ============================================================================
// MAIN CINEMATIC DASHBOARD COMPONENT (V4.2 REDESIGN)
// ============================================================================

export default function DeltaCinematicDashboard({
  profile,
  gameProfile,
  players,
  matches,
  nextMatch,
  nextMatchCountdown,
  nextPresent,
  attendance,
  parentPlayerIds,
  myChild,
  news,
  unreadNewsCount,
  readNewsMap,
  clubUpdates,
  homePriorityData,
  teamSummary,
  teamGoalTarget,
  teamGoalProgress,
  currentWinStreak,
  currentUnbeatenStreak,
  recentMatches,
  scorersRanking,
  assistsRanking,
  stats,
  onSelectTab,
  onOpenModalAction,
  onTriggerIntro,
  openMatch,
  openPlayerProfile,
  staff,
  canManageMatches,
}: DeltaCinematicDashboardProps) {
  // Real Missions & Notifications State
  const [dailyMissions, setDailyMissions] = useState<GameMission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [recentRewards, setRecentRewards] = useState<any[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);

  // Fetch real missions from existing API
  useEffect(() => {
    let isMounted = true;
    async function loadMissions() {
      try {
        setMissionsLoading(true);
        const res = await fetch(`/api/game/missions?userId=${profile.id || 'guest_user'}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.dailyMissions)) {
            setDailyMissions(data.dailyMissions);
          }
        }
      } catch (err) {
        console.warn('Dashboard: could not load missions', err);
      } finally {
        if (isMounted) setMissionsLoading(false);
      }
    }
    loadMissions();
    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  // Fetch real notifications/rewards from existing API
  useEffect(() => {
    let isMounted = true;
    async function loadRewards() {
      try {
        setRewardsLoading(true);
        const res = await fetch(`/api/game/notifications?userId=${profile.id || 'guest_user'}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.notifications)) {
            setRecentRewards(data.notifications.slice(0, 3));
          }
        }
      } catch (err) {
        console.warn('Dashboard: could not load rewards', err);
      } finally {
        if (isMounted) setRewardsLoading(false);
      }
    }
    loadRewards();
    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  // Derive child attendance status for parent role
  const childAttendanceStatus = useMemo(() => {
    if (!myChild || !nextMatch) return null;
    const record = attendance.find(
      (a) => a.match_id === nextMatch.id && a.player_id === myChild.id
    );
    if (!record) return "unconfirmed";
    const st = String(record.status).toLowerCase();
    if (st === "yes" || st === "present") return "present";
    if (st === "no" || st === "absent") return "absent";
    if (st === "maybe") return "maybe";
    return "unconfirmed";
  }, [myChild, nextMatch, attendance]);

  // Level & XP calculation
  const levelInfo = gameProfile?.levelInfo || {
    level: 1,
    title: "Młody Talent",
    currentLevelXP: 0,
    nextLevelXP: 100,
    progressPercent: 0,
  };
  const streak = gameProfile?.activityStreak || 1;
  const unopenedPacks = gameProfile?.unopenedPacks || 0;

  // Featured cards for INFERNO 3D Showcase (picked from real team players)
  const featuredPlayers = useMemo(() => {
    if (!players || players.length === 0) return [];
    const list: any[] = [];
    if (myChild) list.push(myChild);
    for (const p of scorersRanking) {
      if (list.length >= 3) break;
      if (!list.some((x) => x.id === p.id)) list.push(p);
    }
    for (const p of players) {
      if (list.length >= 3) break;
      if (!list.some((x) => x.id === p.id)) list.push(p);
    }
    return list;
  }, [players, myChild, scorersRanking]);

  return (
    <div className="delta-cinematic-dashboard w-full min-w-0 max-w-full space-y-4 sm:space-y-5 pb-8">
      {/* ==================================================================
          1. TOP GAMER PROFILE BAR (MOBILE COMPACT & STREAMLINED)
          ================================================================== */}
      <div className="delta-mobile-only delta-mobile-gamer-bar-box">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="relative shrink-0 rounded-full bg-gradient-to-br from-red-600 to-amber-500 p-0.5 shadow-sm"
              style={{ width: "32px", height: "32px", minWidth: "32px", minHeight: "32px" }}
            >
              <div className="w-full h-full rounded-full bg-[#07080b] flex items-center justify-center font-black text-[11px] text-amber-300">
                {profile.display_name?.slice(0, 2).toUpperCase() || "GM"}
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-100 truncate">
                  {profile.display_name || "Zawodnik DELTA"}
                </span>
                <DeltaBadge
                  variant={
                    profile.role === "admin"
                      ? "gold"
                      : profile.role === "coach"
                      ? "crimson"
                      : profile.role === "parent"
                      ? "default"
                      : "muted"
                  }
                  size="sm"
                >
                  {profile.role === "admin"
                    ? "Admin"
                    : profile.role === "coach"
                    ? "Trener"
                    : profile.role === "parent"
                    ? "Rodzic"
                    : "Zawodnik"}
                </DeltaBadge>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-amber-400/90 font-bold">
                <span>LVL {levelInfo.level} • {levelInfo.title}</span>
                <span className="text-slate-400">•</span>
                <span className="flex items-center gap-0.5 text-red-400">
                  <Flame size={11} className="animate-pulse" /> {streak} dni
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unopenedPacks > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab("collection")}
                className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                aria-label="Otwórz paczki kart"
              >
                <Gift size={13} className="text-amber-400 animate-bounce" />
                <span>{unopenedPacks} PACZEK</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenModalAction("missions")}
              className="px-2 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95"
              aria-label="Misje i zadania"
            >
              <Zap size={13} className="text-amber-400" />
              <span>Misje</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("collection")}
              className="p-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-300 flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Kolekcja kart"
            >
              <Layers size={14} />
            </button>
          </div>
        </div>

        {/* Compact XP Progress Bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
            {levelInfo.currentLevelXP}/{levelInfo.nextLevelXP} XP
          </span>
        </div>
      </div>

      {/* ==================================================================
          2. DESKTOP CINEMATIC STADIUM COMMAND BAR (V4.2 COMPACT & SHORTENED)
          ================================================================== */}
      <section
        className="delta-desktop-only delta-stadium-header-box"
        aria-label="DELTA 2018 GM — Panel Stadionowy"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080b]/95 via-[#07080b]/80 to-transparent pointer-events-none" />

        <div className="relative z-10 w-full flex items-center justify-between gap-4">
          {/* Left: Fiery Crest & Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="relative shrink-0 rounded-xl bg-gradient-to-b from-[#1c2232] to-[#0a0d14] border border-amber-400/40 p-1.5 shadow-[0_0_20px_rgba(245,158,11,0.22)] flex items-center justify-center cursor-pointer group"
              style={{ width: "46px", height: "46px", minWidth: "46px", minHeight: "46px" }}
              onClick={onTriggerIntro}
              title="Odtwórz filmowe intro stadionowe"
            >
              <div className="absolute -inset-0.5 rounded-xl bg-red-500/20 blur-xs pointer-events-none group-hover:bg-red-500/40 transition-all" />
              <img
                src="/teamlogos/gm.png"
                alt="K.S. Delta Warszawa"
                style={{ width: "34px", height: "34px", objectFit: "contain" }}
                className="relative z-10 transition-transform group-hover:scale-110"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-black text-slate-100 tracking-tight flex items-center gap-1.5">
                  DELTA 2018 GM
                </span>
                <DeltaBadge variant="crimson" size="sm" dot>
                  Górny Mokotów
                </DeltaBadge>
                <DeltaBadge variant="gold" size="sm">
                  Sezon 2026/27
                </DeltaBadge>
              </div>
              <p className="text-xs text-slate-400 font-medium m-0 truncate max-w-md">
                Oficjalne centrum dowodzenia drużyny. Razem do wielkich rzeczy.
              </p>
            </div>
          </div>

          {/* Right: Integrated Gamer HUD + Intro Button */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Desktop Gamer XP Mini-Widget */}
            <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0e1118]/80 border border-white/8 text-xs shadow-inner">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Crown size={14} className="text-amber-400" />
                <span>LVL {levelInfo.level}</span>
              </div>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <Flame size={13} className="animate-pulse" /> {streak}d
              </span>
            </div>

            {/* Unopened Packs Quick Pill */}
            {unopenedPacks > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab("collection")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 text-amber-300 font-black text-xs cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                title="Otwórz oczekujące paczki kart 3D"
              >
                <Gift size={14} className="text-amber-400 animate-bounce" />
                <span>{unopenedPacks} PACZEK</span>
              </button>
            )}

            <DeltaButton
              variant="outline"
              size="sm"
              icon={<Flame size={15} className="text-red-500 animate-pulse" />}
              onClick={onTriggerIntro}
              title="Odtwórz filmowe intro stadionowe"
            >
              ZOBACZ INTRO
            </DeltaButton>
          </div>
        </div>
      </section>

      {/* ==================================================================
          3. CRITICAL / ACTIONABLE PRIORITY BANNER (ETAP 12C LAYER)
          ================================================================== */}
      <DeltaHomePrioritySection
        priorityData={homePriorityData}
        unreadCount={unreadNewsCount}
        dailySpinAvailable={!gameProfile?.dailySpinUsedToday}
        onNavigate={(targetTab, payload) => {
          if (targetTab === "notifications") {
            onOpenModalAction("notifications");
          } else if (targetTab === "matches" && payload?.matchId) {
            const m = matches.find((item) => item.id === payload.matchId);
            if (m) {
              openMatch(m, "summary", "overlay");
            }
            onSelectTab("matches");
          } else if (targetTab === "training") {
            onSelectTab("training");
          } else if (targetTab === "news") {
            onSelectTab("news");
          } else if (targetTab === "collection") {
            onSelectTab("collection");
          } else if (targetTab === "achievements") {
            onSelectTab("achievements");
          } else {
            onSelectTab(targetTab);
          }
        }}
      />

      {/* ==================================================================
          4. V4.2 HERO COMMAND CENTER (ASYMMETRIC DUAL ARENA)
          ================================================================== */}
      <div className="delta-dashboard-hero-grid w-full">
        {/* ================================================================
            COLUMN 1 (LEFT / 7 COLS): MATCH ARENA & QUICK ACTION TILES
            ================================================================ */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* NEXT MATCH HERO OR COMPACT EMPTY STATE */}
          {nextMatch ? (
            <section
              className="delta-next-match-hero w-full"
              aria-label="Najbliższy mecz drużyny"
            >
              <DeltaCard
                variant="elevated"
                padding="none"
                className="delta-gaming-card border-amber-400/25 shadow-xl relative overflow-hidden"
              >
                {/* Header Ribbon */}
                <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 bg-gradient-to-r from-red-950/40 via-[#141822] to-[#0c0f16] border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <DeltaBadge variant="gold" size="sm" dot>
                      NAJBLIŻSZY MECZ
                    </DeltaBadge>
                    <span className="text-xs font-bold text-amber-300/90">
                      Kolejka {nextMatch.round_no || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Clock size={13} className="text-amber-400" />
                    <span>{nextMatchCountdown}</span>
                  </div>
                </div>

                {/* Match Stage — Home vs Away */}
                <div className="p-3.5 sm:p-5">
                  <div className="grid grid-cols-7 items-center gap-2 sm:gap-3 text-center">
                    {/* Home Team */}
                    <div className="col-span-3 flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center p-1 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                        <Logo team={nextMatch.home_team} size={52} />
                      </div>
                      <b className="text-xs sm:text-sm font-black text-slate-100 line-clamp-2 max-w-[130px] leading-tight">
                        {formatTeamName(nextMatch.home_team)}
                      </b>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Gospodarz
                      </span>
                    </div>

                    {/* VS Badge & Match Info */}
                    <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-red-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#07080b] flex items-center justify-center font-black text-[11px] sm:text-xs text-amber-300">
                          VS
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 hidden sm:block">
                        {datePL(nextMatch.match_date)}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="col-span-3 flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center p-1 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                        <Logo team={nextMatch.away_team} size={52} />
                      </div>
                      <b className="text-xs sm:text-sm font-black text-slate-100 line-clamp-2 max-w-[130px] leading-tight">
                        {formatTeamName(nextMatch.away_team)}
                      </b>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Gość
                      </span>
                    </div>
                  </div>

                  {/* Match Details Meta */}
                  <div className="mt-3 pt-2.5 border-t border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-bold text-slate-200">
                        <CalendarDays size={13} className="text-amber-400" />
                        {datePL(nextMatch.match_date)} • {(nextMatch.match_time || "").slice(0, 5) || "godz. do ustalenia"}
                      </span>
                      <span className="text-slate-500 hidden sm:inline">•</span>
                      <span className="text-slate-400 truncate max-w-[240px]">
                        📍 {nextMatch.venue || "Miejsce do ustalenia"}
                      </span>
                    </div>

                    {/* Attendance Summary Bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">
                        Zadeklarowani: <strong className="text-slate-100">{nextPresent}</strong> / {players.length}
                      </span>
                      <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-emerald-400"
                          style={{
                            width: `${players.length ? Math.min(100, (nextPresent / players.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance & Action Buttons (Mobile-first, min 44px touch targets) */}
                <div className="p-3 sm:p-3.5 bg-gradient-to-r from-[#090b10] via-[#0f121a] to-[#090b10] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  {/* Parent attendance indicator / Coach tools */}
                  <div className="flex items-center gap-2 min-w-0">
                    {myChild ? (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 ${
                            childAttendanceStatus === "present"
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                              : childAttendanceStatus === "absent"
                              ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
                              : "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {myChild.display_name}:{" "}
                            {childAttendanceStatus === "present"
                              ? "OBECNY"
                              : childAttendanceStatus === "absent"
                              ? "NIEOBECNY"
                              : "BRAK DEKLARACJI"}
                          </span>
                          <small className="text-[10px] text-slate-400">
                            {childAttendanceStatus === "unconfirmed"
                              ? "Wymagane zgłoszenie obecności na mecz"
                              : "Deklaracja zapisana pomyślnie"}
                          </small>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <UserCheck size={15} className="text-amber-400" />
                        <span className="truncate">
                          {staff
                            ? "Zarządzanie obecnościami i kadrą meczową"
                            : "Frekwencja drużyny przed spotkaniem"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTAs with minimum 44px height */}
                  <div className="flex items-center gap-2 shrink-0">
                    <DeltaButton
                      variant={childAttendanceStatus === "unconfirmed" ? "gold" : "secondary"}
                      size="sm"
                      touchTarget={true}
                      className="flex-1 sm:flex-none font-black text-xs"
                      onClick={() => openMatch(nextMatch, "attendance", "home")}
                    >
                      <UserCheck size={15} />
                      <span>
                        {staff
                          ? `OBECNOŚCI (${nextPresent}/${players.length})`
                          : childAttendanceStatus === "unconfirmed"
                          ? "POTWIERDŹ OBECNOŚĆ"
                          : "ZMIEŃ OBECNOŚĆ"}
                      </span>
                    </DeltaButton>

                    <DeltaButton
                      variant="primary"
                      size="sm"
                      touchTarget={true}
                      className="flex-1 sm:flex-none font-black text-xs"
                      onClick={() => openMatch(nextMatch, "summary", "home")}
                    >
                      <span>CENTRUM MECZU</span>
                      <ChevronRight size={15} />
                    </DeltaButton>
                  </div>
                </div>
              </DeltaCard>
            </section>
          ) : (
            /* COMPACT EMPTY STATE (V4.2 REQUIREMENT 2) */
            <DeltaCard
              variant="elevated"
              padding="sm"
              className="delta-gaming-card border-white/10 bg-gradient-to-r from-[#0d1017] via-[#121520] to-[#0d1017] flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <CalendarDays size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DeltaBadge variant="default" size="sm">
                      PRZERWA W ROZGRYWKACH
                    </DeltaBadge>
                    <span className="text-[11px] font-bold text-slate-400">
                      DELTA 2018 GM
                    </span>
                  </div>
                  <strong className="text-xs sm:text-sm font-black text-slate-100 truncate mt-0.5">
                    Brak zaplanowanych meczów ligowych
                  </strong>
                  <span className="text-[11px] text-slate-400 line-clamp-1">
                    Terminarz kolejnych spotkań MZPN zostanie opublikowany wkrótce.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <DeltaButton
                  variant="outline"
                  size="sm"
                  touchTarget={true}
                  className="flex-1 sm:flex-none text-xs font-bold"
                  onClick={() => onSelectTab("matches")}
                >
                  <CalendarDays size={14} />
                  <span>TERMINARZ & WYNIKI</span>
                </DeltaButton>
              </div>
            </DeltaCard>
          )}

          {/* QUICK ACTION TILES (MOBILE 2x2 / DESKTOP 4x1) */}
          <section aria-label="Szybkie akcje" className="w-full">
            {/* Mobile: 4 Large Touch-Optimized Tiles */}
            <div className="delta-mobile-only delta-quick-actions-mobile-grid">
              <DeltaCard
                variant="interactive"
                padding="sm"
                className="delta-gaming-card flex items-center gap-2.5 min-h-[58px]"
                onClick={() => onSelectTab("matches")}
              >
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <CalendarDays size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-black text-slate-100 truncate">Terminarz</strong>
                  <small className="text-[10px] text-slate-400">Mecze i wyniki</small>
                </div>
              </DeltaCard>

              <DeltaCard
                variant="interactive"
                padding="sm"
                className="delta-gaming-card flex items-center gap-2.5 min-h-[58px]"
                onClick={() => onSelectTab("collection")}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                  <Layers size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-black text-slate-100 truncate">Karty 3D</strong>
                  <small className="text-[10px] text-slate-400">Album i paczki</small>
                </div>
              </DeltaCard>

              <DeltaCard
                variant="interactive"
                padding="sm"
                className="delta-gaming-card flex items-center gap-2.5 min-h-[58px]"
                onClick={() => onOpenModalAction("typer")}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Target size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-black text-slate-100 truncate">Typer DELTA</strong>
                  <small className="text-[10px] text-slate-400">Typuj i zbieraj DP</small>
                </div>
              </DeltaCard>

              <DeltaCard
                variant="interactive"
                padding="sm"
                className="delta-gaming-card flex items-center gap-2.5 min-h-[58px]"
                onClick={() => onOpenModalAction("missions")}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-black text-slate-100 truncate">Misje & XP</strong>
                  <small className="text-[10px] text-slate-400">Cele dzienne</small>
                </div>
              </DeltaCard>
            </div>

            {/* Desktop: Streamlined 4-tile Gaming Action Bar */}
            <div className="delta-desktop-only delta-quick-actions-desktop-grid">
              {[
                {
                  id: "matches",
                  title: "Terminarz & Wyniki",
                  desc: "Mecze i tabela ligowa",
                  icon: CalendarDays,
                  color: "text-red-400",
                  badge: "MECZE",
                  badgeVariant: "crimson" as const,
                  action: () => onSelectTab("matches"),
                },
                {
                  id: "collection",
                  title: "Karty 3D & Paczki",
                  desc: "Album i wymiany",
                  icon: Layers,
                  color: "text-amber-400",
                  badge: "INFERNO",
                  badgeVariant: "gold" as const,
                  action: () => onSelectTab("collection"),
                },
                {
                  id: "typer",
                  title: "Typer DELTA",
                  desc: "Zbieraj punkty DP",
                  icon: Target,
                  color: "text-emerald-400",
                  badge: "PUNKTY DP",
                  badgeVariant: "gold" as const,
                  action: () => onOpenModalAction("typer"),
                },
                {
                  id: "missions",
                  title: "Misje & Cele",
                  desc: "Wyzwania dzienne",
                  icon: Zap,
                  color: "text-amber-400",
                  badge: "XP & NAGRODY",
                  badgeVariant: "gold" as const,
                  action: () => onOpenModalAction("missions"),
                },
              ].map((tile) => (
                <DeltaCard
                  key={tile.id}
                  variant="interactive"
                  padding="sm"
                  className="delta-gaming-card flex flex-col justify-between gap-2.5 group"
                  onClick={tile.action}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${tile.color} group-hover:scale-110 transition-transform`}>
                      <tile.icon size={18} />
                    </div>
                    <DeltaBadge variant={tile.badgeVariant} size="sm">
                      {tile.badge}
                    </DeltaBadge>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <strong className="text-xs font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                      {tile.title}
                    </strong>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{tile.desc}</span>
                  </div>
                </DeltaCard>
              ))}
            </div>
          </section>
        </div>

        {/* ================================================================
            COLUMN 2 (RIGHT / 5 COLS): GAMING SIDECAR (VAULT + XP & MISSIONS)
            ================================================================ */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* 1. INFERNO 3D CARDS VAULT & PACKS (HIGH ON SCREEN) */}
          <DeltaCard
            variant="elevated"
            padding="md"
            className="delta-gaming-card border-white/10 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/8">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                KOLEKCJA INFERNO 3D
              </span>
              <DeltaBadge variant="gold" size="sm">
                Skład: {players.length}
              </DeltaBadge>
            </div>

            {/* Featured Cards Mini-Row */}
            {featuredPlayers.length > 0 ? (
              <div className="flex items-center justify-around gap-2 py-1 overflow-x-auto">
                {featuredPlayers.slice(0, 3).map((player) => (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    onClick={() => openPlayerProfile(player)}
                  >
                    <div className="transform transition-transform group-hover:scale-105 group-hover:-translate-y-1 duration-200">
                      <PlayerCard
                        player={player}
                        size="sm"
                        interactive={true}
                        showFlip={true}
                        stats={stats[player.id]}
                        templateOverride="inferno"
                      />
                    </div>
                    <span className="text-[11px] font-black text-slate-200 group-hover:text-amber-400 transition-colors truncate max-w-[90px] text-center">
                      {player.display_name?.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400 text-xs">
                Karty zawodników są synchronizowane.
              </div>
            )}

            {/* Live Packs Counter & Action Bar */}
            <div className="mt-3 pt-3 border-t border-white/8 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Paczki do otwarcia:</span>
                <span className="font-mono font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30">
                  {unopenedPacks} PACZEK
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DeltaButton
                  variant="outline"
                  size="sm"
                  touchTarget={true}
                  className="text-xs font-bold"
                  onClick={() => onSelectTab("collection")}
                >
                  <span>ZAKRĘĆ KOŁEM</span>
                </DeltaButton>
                <DeltaButton
                  variant="primary"
                  size="sm"
                  touchTarget={true}
                  className="text-xs font-black"
                  onClick={() => onSelectTab("collection")}
                >
                  <Gift size={14} />
                  <span>OTWÓRZ PACZKĘ</span>
                </DeltaButton>
              </div>
            </div>
          </DeltaCard>

          {/* 2. PLAYER XP & DAILY MISSIONS (HIGH ON SCREEN) */}
          <DeltaCard variant="gold" padding="md" className="delta-gaming-card flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Crown size={14} />
                PROFIL & MISJE DNIA
              </span>
              <DeltaBadge variant="crimson" size="sm">
                🔥 {streak} {streak === 1 ? "dzień serii" : "dni"}
              </DeltaBadge>
            </div>

            {/* Level & XP Mini Banner */}
            <div className="p-2.5 rounded-xl bg-[#0b0e14]/90 border border-white/8">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-black text-slate-100">
                  Poziom {levelInfo.level} • <span className="text-amber-300">{levelInfo.title}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {levelInfo.currentLevelXP}/{levelInfo.nextLevelXP} XP
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Missions List */}
            {missionsLoading ? (
              <div className="space-y-1.5 py-1">
                <DeltaSkeleton variant="text" width="100%" />
                <DeltaSkeleton variant="text" width="80%" />
              </div>
            ) : dailyMissions.length > 0 ? (
              <div className="space-y-1.5">
                {dailyMissions.slice(0, 2).map((mission) => (
                  <div
                    key={mission.id}
                    className="p-2 rounded-lg bg-[#141822]/90 border border-white/8 flex items-center justify-between gap-2 hover:border-amber-400/30 transition-all cursor-pointer"
                    onClick={() => onOpenModalAction("missions")}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm shrink-0">{mission.icon || "⚽"}</span>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-bold text-slate-100 truncate">
                          {mission.title}
                        </b>
                        <span className="text-[10px] text-slate-400 truncate">
                          {mission.description}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <DeltaBadge variant="gold" size="sm">
                        +{mission.xpReward} XP
                      </DeltaBadge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DeltaEmptyState
                variant="compact"
                title="Wszystkie misje wykonane!"
                description="Kolejne zadania pojawią się o północy."
                action={{
                  label: "PRZEJDŹ DO TYPERA",
                  onClick: () => onOpenModalAction("typer"),
                }}
              />
            )}

            {/* Battle Pass Link */}
            <div className="pt-2 border-t border-white/8 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Sezon 1: Młode Wilki
              </span>
              <DeltaButton
                variant="outline"
                size="sm"
                onClick={() => onOpenModalAction("seasonpass")}
              >
                <span>BATTLE PASS</span>
                <ChevronRight size={13} />
              </DeltaButton>
            </div>
          </DeltaCard>
        </div>
      </div>

      {/* ==================================================================
          5. CLUB NEWS & DELTA SYNC UPDATES (TRIO GRID)
          ================================================================== */}
      <section className="space-y-3 pt-2">
        <DeltaSectionHeader
          kicker="Z ŻYCIA KLUBU"
          title="Aktualności & Komunikaty"
          action={
            <DeltaButton
              variant="outline"
              size="sm"
              onClick={() => onSelectTab("news")}
            >
              WSZYSTKIE AKTUALNOŚCI ({news.length})
            </DeltaButton>
          }
        />

        <div className="delta-dashboard-trio-grid">
          {news.slice(0, 3).map((item) => {
            const isRead = !!readNewsMap[item.id];
            const isUrgent = item.priority === "urgent" || item.type === "wazne";
            return (
              <DeltaCard
                key={item.id}
                variant="interactive"
                padding="sm"
                className="delta-gaming-card flex flex-col justify-between gap-3"
                onClick={() => onSelectTab("news")}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <DeltaBadge
                      variant={isUrgent ? "crimson" : isRead ? "muted" : "gold"}
                      size="sm"
                      dot={isUrgent}
                    >
                      {isUrgent ? "PILNE" : isRead ? "ODCZYTANE" : "NOWE"}
                    </DeltaBadge>
                    <small className="text-[10px] text-slate-400">
                      {new Date(item.published_at).toLocaleDateString("pl-PL")}
                    </small>
                  </div>
                  <h4 className="text-sm font-black text-slate-100 line-clamp-2 m-0">
                    {item.title}
                  </h4>
                  {item.body && (
                    <p className="text-xs text-slate-400 line-clamp-2 m-0 leading-normal">
                      {item.body}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-2 border-t border-white/5">
                  <span>Czytaj komunikat</span>
                  <ChevronRight size={14} />
                </div>
              </DeltaCard>
            );
          })}

          {news.length === 0 && (
            <div className="col-span-3">
              <DeltaEmptyState
                variant="compact"
                icon={<Bell size={24} />}
                title="Brak nowych komunikatów"
                description="Wszystkie oficjalne informacje klubowe pojawią się w tej sekcji."
              />
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================
          6. TEAM SUMMARY & STATS STRIP
          ================================================================== */}
      <section aria-label="Statystyki zespołu" className="w-full pt-1">
        <div className="delta-dashboard-stats-grid-box">
          {[
            { label: "MECZE", val: teamSummary.played, icon: Target, glow: "gold" as const, note: "Rozegrane" },
            { label: "WYGRANE", val: teamSummary.wins, icon: Trophy, glow: "gold" as const, note: "Zwycięstwa" },
            { label: "REMISY", val: teamSummary.draws, icon: Shield, glow: "default" as const, note: "Podział pkt" },
            { label: "PORAŻKI", val: teamSummary.losses, icon: X, glow: "crimson" as const, note: "Przegrane" },
            {
              label: "BRAMKI",
              val: teamSummary.goals,
              icon: Target,
              glow: "gold" as const,
              note: `${teamSummary.played > 0 ? (teamSummary.goals / teamSummary.played).toFixed(1) : "0"} / mecz`,
            },
            { label: "ASYSTY", val: teamSummary.assists, icon: Star, glow: "gold" as const, note: "Kluczowe podania" },
          ].map((item) => (
            <DeltaCard key={item.label} variant={item.glow} padding="sm" className="delta-gaming-card text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                {item.label}
              </span>
              <strong className="text-xl sm:text-2xl font-black text-slate-100 block">
                {item.val}
              </strong>
              <small className="text-[10px] text-slate-400 block mt-0.5 truncate">
                {item.note}
              </small>
            </DeltaCard>
          ))}
        </div>
      </section>
    </div>
  );
}
