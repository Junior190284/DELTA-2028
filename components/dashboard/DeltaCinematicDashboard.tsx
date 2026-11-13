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
// MAIN CINEMATIC DASHBOARD COMPONENT
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

  // Featured cards for INFERNO 3D Showcase (picked from real team players)
  const featuredPlayers = useMemo(() => {
    if (!players || players.length === 0) return [];
    // Prioritize child if parent, then top scorers, or first players
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
    <div className="delta-cinematic-dashboard w-full min-w-0 max-w-full space-y-4 sm:space-y-6 pb-8">
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
          2. DESKTOP CINEMATIC STADIUM HEADER
          ================================================================== */}
      <section
        className="delta-desktop-only delta-stadium-header-box"
        aria-label="DELTA 2018 GM — Panel Stadionowy"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080b]/95 via-[#07080b]/75 to-transparent pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Glowing Fiery Club Crest */}
            <div
              className="relative shrink-0 rounded-2xl bg-gradient-to-b from-[#181d2a] to-[#0a0d14] border border-amber-400/40 p-2 shadow-[0_0_28px_rgba(245,158,11,0.25)] flex items-center justify-center cursor-pointer group"
              style={{ width: "72px", height: "72px", minWidth: "72px", minHeight: "72px" }}
              onClick={onTriggerIntro}
              title="Odtwórz filmowe intro stadionowe"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-red-500/20 blur-sm pointer-events-none group-hover:bg-red-500/35 transition-all" />
              <img
                src="/teamlogos/gm.png"
                alt="K.S. Delta Warszawa"
                style={{ width: "56px", height: "56px", objectFit: "contain" }}
                className="relative z-10 transition-transform group-hover:scale-105"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DeltaBadge variant="crimson" size="sm" dot>
                  Górny Mokotów • 2018
                </DeltaBadge>
                <DeltaBadge variant="gold" size="sm">
                  Sezon 2026/27 • MZPN
                </DeltaBadge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight mt-1 mb-0.5">
                DELTA 2018 GM
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium m-0 max-w-xl">
                Oficjalne centrum dowodzenia drużyny. Razem do wielkich rzeczy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
            <DeltaButton
              variant="outline"
              size="md"
              icon={<Flame size={16} className="text-red-500 animate-pulse" />}
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
          4. NEXT MATCH HERO & ATTENDANCE (ABOVE THE FOLD ON MOBILE)
          ================================================================== */}
      {nextMatch ? (
        <section
          className="delta-next-match-hero w-full"
          aria-label="Najbliższy mecz drużyny"
        >
          <DeltaCard
            variant="elevated"
            padding="none"
            className="border-amber-400/25 shadow-xl relative overflow-hidden"
          >
            {/* Header Ribbon */}
            <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 bg-gradient-to-r from-red-950/40 via-[#141822] to-[#0c0f16] border-b border-white/10">
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
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-7 items-center gap-2 sm:gap-4 text-center">
                {/* Home Team */}
                <div className="col-span-3 flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center p-1 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <Logo team={nextMatch.home_team} size={64} />
                  </div>
                  <b className="text-xs sm:text-base font-black text-slate-100 line-clamp-2 max-w-[140px] leading-tight">
                    {formatTeamName(nextMatch.home_team)}
                  </b>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Gospodarz
                  </span>
                </div>

                {/* VS Badge & Match Info */}
                <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#07080b] flex items-center justify-center font-black text-xs sm:text-sm text-amber-300">
                      VS
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 hidden sm:block">
                    {datePL(nextMatch.match_date)}
                  </span>
                </div>

                {/* Away Team */}
                <div className="col-span-3 flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center p-1 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <Logo team={nextMatch.away_team} size={64} />
                  </div>
                  <b className="text-xs sm:text-base font-black text-slate-100 line-clamp-2 max-w-[140px] leading-tight">
                    {formatTeamName(nextMatch.away_team)}
                  </b>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Gość
                  </span>
                </div>
              </div>

              {/* Match Details Meta */}
              <div className="mt-4 pt-3 border-t border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 font-bold text-slate-200">
                    <CalendarDays size={14} className="text-amber-400" />
                    {datePL(nextMatch.match_date)} • {(nextMatch.match_time || "").slice(0, 5) || "godz. do ustalenia"}
                  </span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="text-slate-400 truncate max-w-[280px]">
                    📍 {nextMatch.venue || "Miejsce spotkania do ustalenia"}
                  </span>
                </div>

                {/* Attendance Summary Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">
                    Zadeklarowani: <strong className="text-slate-100">{nextPresent}</strong> / {players.length}
                  </span>
                  <div className="w-20 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
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
            <div className="p-3 sm:p-4 bg-gradient-to-r from-[#090b10] via-[#0f121a] to-[#090b10] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                    <UserCheck size={16} className="text-amber-400" />
                    <span>
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
                  size="md"
                  touchTarget={true}
                  className="flex-1 sm:flex-none font-black text-xs sm:text-sm"
                  onClick={() => openMatch(nextMatch, "attendance", "home")}
                >
                  <UserCheck size={16} />
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
                  size="md"
                  touchTarget={true}
                  className="flex-1 sm:flex-none font-black text-xs sm:text-sm"
                  onClick={() => openMatch(nextMatch, "summary", "home")}
                >
                  <span>CENTRUM MECZU</span>
                  <ChevronRight size={16} />
                </DeltaButton>
              </div>
            </div>
          </DeltaCard>
        </section>
      ) : (
        <DeltaEmptyState
          icon={<CalendarDays size={32} />}
          title="Brak zaplanowanych meczów"
          description="Terminarz kolejnych spotkań w rozgrywkach MZPN zostanie opublikowany wkrótce."
          action={{
            label: "PRZEGLĄDAJ ARCHIWUM MECZÓW",
            onClick: () => onSelectTab("matches"),
          }}
        />
      )}

      {/* ==================================================================
          5. QUICK ACTIONS (MOBILE: 4 KLUCZOWE AKCJE / DESKTOP: 8 KAFELKÓW)
          ================================================================== */}
      <section aria-label="Szybkie akcje" className="w-full">
        {/* Mobile: Exactly 4 Large Touch-Optimized Tiles */}
        <div className="delta-mobile-only delta-quick-actions-mobile-grid">
          <DeltaCard
            variant="interactive"
            padding="sm"
            className="flex items-center gap-2.5 min-h-[58px]"
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
            className="flex items-center gap-2.5 min-h-[58px]"
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
            className="flex items-center gap-2.5 min-h-[58px]"
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
            className="flex items-center gap-2.5 min-h-[58px]"
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

        {/* Desktop: Expanded Feature Grid (8 tiles) */}
        <div className="delta-desktop-only delta-quick-actions-desktop-grid">
          {[
            {
              id: "matches",
              title: "Terminarz & Wyniki",
              desc: "Kalendarz ligowy i sparingi",
              icon: CalendarDays,
              color: "text-red-400",
              badge: "MECZE",
              badgeVariant: "crimson" as const,
              action: () => onSelectTab("matches"),
            },
            {
              id: "collection",
              title: "Kolekcja Kart 3D",
              desc: "Album, paczki i wymiany kart",
              icon: Layers,
              color: "text-amber-400",
              badge: "INFERNO",
              badgeVariant: "gold" as const,
              action: () => onSelectTab("collection"),
            },
            {
              id: "typer",
              title: "Typer Meczowy DELTA",
              desc: "Typuj wyniki spotkań i zbieraj DP",
              icon: Target,
              color: "text-emerald-400",
              badge: "PUNKTY DP",
              badgeVariant: "gold" as const,
              action: () => onOpenModalAction("typer"),
            },
            {
              id: "missions",
              title: "Misje & Cele Sezonu",
              desc: "Wyzwania dzienne i tygodniowe",
              icon: Zap,
              color: "text-amber-400",
              badge: "XP & NAGRODY",
              badgeVariant: "gold" as const,
              action: () => onOpenModalAction("missions"),
            },
            {
              id: "knowledge",
              title: "Kącik Wiedzy & Quizy",
              desc: "Taktyka, zasady i regeneracja",
              icon: BookOpen,
              color: "text-blue-400",
              badge: "AKADEMIA",
              badgeVariant: "default" as const,
              action: () => onOpenModalAction("knowledge"),
            },
            {
              id: "seasonpass",
              title: "Battle Pass Sezon 1",
              desc: "Poziomy 1–20 i Złote Skrzynie",
              icon: Crown,
              color: "text-amber-400",
              badge: "BATTLE PASS",
              badgeVariant: "gold" as const,
              action: () => onOpenModalAction("seasonpass"),
            },
            {
              id: "photobooth",
              title: "Studio Foto-Budka",
              desc: "Plakaty i grafiki meczowe HD",
              icon: Camera,
              color: "text-purple-400",
              badge: "GRAFIKI HD",
              badgeVariant: "default" as const,
              action: () => onOpenModalAction("photobooth"),
            },
            {
              id: "teamcenter",
              title: "Strefa Drużyny",
              desc: "Obecności i sprawy zespołu",
              icon: Users,
              color: "text-red-400",
              badge: "ZESPÓŁ",
              badgeVariant: "crimson" as const,
              action: () => onSelectTab("teamcenter"),
            },
          ].map((tile) => (
            <DeltaCard
              key={tile.id}
              variant="interactive"
              padding="sm"
              className="flex flex-col justify-between gap-3 group"
              onClick={tile.action}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${tile.color} group-hover:scale-110 transition-transform`}>
                  <tile.icon size={20} />
                </div>
                <DeltaBadge variant={tile.badgeVariant} size="sm">
                  {tile.badge}
                </DeltaBadge>
              </div>
              <div className="flex flex-col gap-0.5">
                <strong className="text-sm font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                  {tile.title}
                </strong>
                <span className="text-xs text-slate-400 line-clamp-1">{tile.desc}</span>
              </div>
              <div className="flex items-center justify-end text-xs font-bold text-slate-400 group-hover:text-amber-400 transition-colors">
                <span>Otwórz</span>
                <ChevronRight size={14} />
              </div>
            </DeltaCard>
          ))}
        </div>
      </section>

      {/* ==================================================================
          6. LEVEL & XP GAMING PANEL + MISSIONS & WEEKLY GOALS (DUO GRID)
          ================================================================== */}
      <section className="delta-dashboard-duo-grid">
        {/* Left: Level & XP Panel */}
        <DeltaCard variant="gold" padding="md" className="flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Crown size={14} />
                PROFIL GRACZA
              </span>
              <DeltaBadge variant="crimson" size="sm">
                🔥 {streak} {streak === 1 ? "dzień serii" : "dni serii"}
              </DeltaBadge>
            </div>

            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-100 m-0">
                Poziom {levelInfo.level}
              </h3>
              <span className="text-xs font-bold text-amber-300 truncate">
                {levelInfo.title}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1 mb-3">
              Zdobywaj XP za obecności, mecze, quizy oraz misje tygodniowe.
            </p>

            {/* XP Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-400">Postęp poziomu</span>
                <span className="text-amber-300">
                  {levelInfo.currentLevelXP} / {levelInfo.nextLevelXP} XP
                </span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300">
              Sezon 1: Młode Wilki
            </span>
            <DeltaButton
              variant="gold"
              size="sm"
              onClick={() => onOpenModalAction("seasonpass")}
            >
              <span>BATTLE PASS</span>
              <ChevronRight size={14} />
            </DeltaButton>
          </div>
        </DeltaCard>

        {/* Center / Right (Col span 2): Missions & Weekly Goals */}
        <DeltaCard variant="default" padding="md" className="lg:col-span-2 flex flex-col justify-between gap-3">
          <DeltaSectionHeader
            kicker="WYZWANIA & CELE"
            title="Misje Dnia i Rytm Sezonu"
            action={
              <DeltaButton
                variant="outline"
                size="sm"
                onClick={() => onOpenModalAction("missions")}
              >
                WSZYSTKIE MISJE ({dailyMissions.length || 0})
              </DeltaButton>
            }
          />

          {missionsLoading ? (
            <div className="space-y-2 py-2">
              <DeltaSkeleton variant="card" height="48px" />
              <DeltaSkeleton variant="card" height="48px" />
            </div>
          ) : dailyMissions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-1">
              {dailyMissions.slice(0, 2).map((mission) => (
                <div
                  key={mission.id}
                  className="p-3 rounded-xl bg-[#141822] border border-white/8 flex items-center justify-between gap-2.5 hover:border-amber-400/30 transition-all cursor-pointer"
                  onClick={() => onOpenModalAction("missions")}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-lg shrink-0">{mission.icon || "⚽"}</span>
                    <div className="flex flex-col min-w-0">
                      <b className="text-xs font-black text-slate-100 truncate">
                        {mission.title}
                      </b>
                      <span className="text-[10px] text-slate-400 line-clamp-1">
                        {mission.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <DeltaBadge variant="gold" size="sm">
                      +{mission.xpReward} XP
                    </DeltaBadge>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">
                      {mission.currentCount}/{mission.targetCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DeltaEmptyState
              title="Wszystkie misje wykonane!"
              description="Nowe wyzwania pojawią się o północy. Sprawdź tabelę ligową lub zagraj w Typera."
              action={{
                label: "PRZEJDŹ DO TYPERA",
                onClick: () => onOpenModalAction("typer"),
              }}
            />
          )}

          {/* Team Season Goal Track */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/25 via-[#121622] to-[#0d1017] border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 shrink-0">
                <Target size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-slate-100 truncate">
                  Wspólny cel: 50 bramek w sezonie
                </span>
                <small className="text-[10px] text-slate-400">
                  Aktualnie: <strong className="text-amber-300">{teamSummary.goals}</strong> / {teamGoalTarget} bramek ({teamGoalProgress}%)
                </small>
              </div>
            </div>
            <div className="w-full sm:w-44 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10 shrink-0">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400"
                style={{ width: `${Math.min(100, teamGoalProgress)}%` }}
              />
            </div>
          </div>
        </DeltaCard>
      </section>

      {/* ==================================================================
          7. INFERNO 3D COLLECTION SHOWCASE & RECENT REWARDS
          ================================================================== */}
      <section className="space-y-4">
        <DeltaSectionHeader
          kicker="INFERNO 3D CARDS"
          title="Kolekcja Kart Zawodników DELTA"
          subtitle="Zbieraj trójwymiarowe karty klubowe, sprawdzaj statystyki i buduj mistrzowski skład."
          action={
            <DeltaButton
              variant="gold"
              size="sm"
              onClick={() => onSelectTab("collection")}
            >
              <span>OTWÓRZ ALBUM</span>
              <ChevronRight size={14} />
            </DeltaButton>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* Left & Center: Featured 3D Player Cards Showcase */}
          <DeltaCard
            variant="elevated"
            padding="md"
            className="lg:col-span-2 border-white/10 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                WYRÓŻNIENI ZAWODNICY DRUŻYNY
              </span>
              <DeltaBadge variant="default" size="sm">
                Skład: {players.length} graczy
              </DeltaBadge>
            </div>

            {featuredPlayers.length > 0 ? (
              <div className="flex items-center justify-around gap-2 sm:gap-4 flex-wrap sm:flex-nowrap py-2 overflow-x-auto">
                {featuredPlayers.slice(0, 3).map((player) => (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
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
                    <span className="text-xs font-black text-slate-200 group-hover:text-amber-400 transition-colors truncate max-w-[140px] text-center">
                      {player.display_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <DeltaEmptyState
                icon={<Layers size={32} />}
                title="Karty zawodników w przygotowaniu"
                description="Kolekcja kart 3D jest synchronizowana ze składem drużyny."
                action={{
                  label: "PRZEJDŹ DO SKŁADU",
                  onClick: () => onSelectTab("players"),
                }}
              />
            )}

            <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">
                Paczki do otwarcia: <strong className="text-amber-300">{gameProfile?.unopenedPacks || 0}</strong>
              </span>
              <div className="flex items-center gap-2">
                <DeltaButton
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectTab("collection")}
                >
                  ZAKRĘĆ KOŁEM
                </DeltaButton>
                <DeltaButton
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectTab("collection")}
                >
                  OTWÓRZ PACZKĘ
                </DeltaButton>
              </div>
            </div>
          </DeltaCard>

          {/* Right: Recent Rewards / Achievements Feed */}
          <DeltaCard variant="default" padding="md" className="flex flex-col justify-between gap-3 h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/8">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Gift size={14} />
                  OSTATNIE NAGRODY & PUNKTY
                </span>
                <button
                  type="button"
                  onClick={() => onOpenModalAction("trophies")}
                  className="text-[11px] font-bold text-slate-400 hover:text-amber-300 cursor-pointer"
                >
                  Trofea →
                </button>
              </div>

              {rewardsLoading ? (
                <div className="space-y-2 py-2">
                  <DeltaSkeleton variant="text" width="100%" />
                  <DeltaSkeleton variant="text" width="80%" />
                  <DeltaSkeleton variant="text" width="90%" />
                </div>
              ) : recentRewards.length > 0 ? (
                <div className="space-y-2.5">
                  {recentRewards.map((notif: any) => (
                    <div
                      key={notif.id}
                      className="p-2.5 rounded-lg bg-white/4 border border-white/6 flex items-start gap-2.5"
                    >
                      <div className="p-1.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0 mt-0.5">
                        <Sparkles size={13} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <b className="text-xs font-bold text-slate-100 truncate">
                          {notif.title}
                        </b>
                        <p className="text-[10px] text-slate-400 m-0 line-clamp-1">
                          {notif.message || notif.body}
                        </p>
                        <small className="text-[9px] text-slate-500 mt-0.5">
                          {new Date(notif.created_at).toLocaleDateString("pl-PL")}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Trophy size={28} className="mx-auto text-amber-400/50 mb-1.5" />
                  <p className="m-0 font-bold text-slate-300">Pierwsze nagrody czekają</p>
                  <small className="text-slate-500">
                    Otwieraj paczki, typuj wyniki i zbieraj trofea.
                  </small>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/8">
              <DeltaButton
                variant="secondary"
                size="sm"
                fullWidth={true}
                onClick={() => onOpenModalAction("notifications")}
              >
                CENTRUM POWIADOMIEŃ
              </DeltaButton>
            </div>
          </DeltaCard>
        </div>
      </section>

      {/* ==================================================================
          8. CLUB NEWS & DELTA SYNC UPDATES
          ================================================================== */}
      <section className="space-y-3">
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
                className="flex flex-col justify-between gap-3"
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
                icon={<Bell size={28} />}
                title="Brak nowych komunikatów"
                description="Wszystkie oficjalne informacje klubowe pojawią się w tej sekcji."
              />
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================
          9. TEAM SUMMARY & STATS STRIP
          ================================================================== */}
      <section aria-label="Statystyki zespołu" className="w-full">
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
            <DeltaCard key={item.label} variant={item.glow} padding="sm" className="text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                {item.label}
              </span>
              <strong className="text-2xl sm:text-3xl font-black text-slate-100 block">
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
