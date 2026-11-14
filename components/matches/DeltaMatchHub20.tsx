"use client";

import React, { useState, useMemo } from "react";
import { formatTeamName, getTeamLogo } from "@/lib/teams";
import {
  CalendarDays,
  Clock,
  MapPin,
  Navigation,
  Trophy,
  Goal,
  Check,
  X,
  HelpCircle,
  ChevronRight,
  Shield,
  Users,
  Flame,
  Star,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Award,
  TrendingUp,
  Activity
} from "lucide-react";

export interface Match {
  id: string;
  round_no: number | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string; // "scheduled" | "played" | "cancelled"
}

export interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path: string | null;
  active: boolean;
}

export interface Attendance {
  match_id: string;
  player_id: string;
  status: string; // "yes" | "no" | "maybe" | "present" | "absent"
}

export interface Lineup {
  match_id: string;
  player_id: string;
  is_starter: boolean;
  is_captain: boolean;
}

export interface Event {
  id: string;
  match_id: string;
  event_type: string;
  player_id: string | null;
  assist_player_id: string | null;
  minute: number | null;
  created_at: string;
}

export interface LeagueBye {
  round: number;
  date: string;
  team: string;
}

export interface DeltaMatchHub20Props {
  matches: Match[];
  players: Player[];
  attendance: Attendance[];
  lineup: Lineup[];
  events: Event[];
  leagueByes?: LeagueBye[];
  currentUserId: string;
  currentUserRole: string;
  parentPlayerIds: string[];
  canManageMatches?: boolean;
  canEditMatchEvents?: boolean;
  onOpenMatch: (match: Match, initialTab?: "summary" | "attendance" | "lineup" | "events" | "mvp") => void;
  onSetAttendance?: (matchId: string, playerId: string, status: "yes" | "no" | "maybe") => Promise<void> | void;
  onSwitchToTraining?: () => void;
}

function isDeltaTeam(teamName: string | null | undefined): boolean {
  if (!teamName) return false;
  const lower = teamName.toLowerCase();
  return lower.includes("delta") || lower.includes("gm");
}

function datePL(dateStr: string): string {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatFullDatePL(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function parseMatchDateTime(dateStr: string, timeStr: string | null): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = ((timeStr || "12:00").slice(0, 5)).split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function getMatchTimingStatus(dateStr: string, timeStr: string | null): {
  label: string;
  badgeClass: string;
  isToday: boolean;
  isLive: boolean;
} {
  const now = new Date();
  const matchAt = parseMatchDateTime(dateStr, timeStr);
  const diffMs = matchAt.getTime() - now.getTime();

  // If ongoing within 2.5 hours of kick-off
  if (diffMs <= 0 && diffMs >= -2.5 * 3600 * 1000) {
    return {
      label: "LIVE • W TRAKCIE",
      badgeClass: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
      isToday: true,
      isLive: true
    };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const isToday = now.getFullYear() === y && now.getMonth() === (m - 1) && now.getDate() === d;
  if (isToday) {
    return {
      label: "DZISIAJ • MATCHDAY",
      badgeClass: "bg-red-600/30 text-red-300 border-red-500/50 shadow-red-900/40",
      isToday: true,
      isLive: false
    };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = tomorrow.getFullYear() === y && tomorrow.getMonth() === (m - 1) && tomorrow.getDate() === d;
  if (isTomorrow) {
    return {
      label: "JUTRO",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      isToday: false,
      isLive: false
    };
  }

  if (diffMs < 0) {
    return {
      label: "ZAKOŃCZONY",
      badgeClass: "bg-slate-800 text-slate-400 border-slate-700",
      isToday: false,
      isLive: false
    };
  }

  const days = Math.ceil(diffMs / (1000 * 3600 * 24));
  return {
    label: `ZA ${days} DNI`,
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    isToday: false,
    isLive: false
  };
}

function TeamLogo({ team, size = 48 }: { team: string; size?: number }) {
  const src = getTeamLogo(team);
  const isDelta = isDeltaTeam(team);
  return (
    <div
      className="relative shrink-0 flex items-center justify-center rounded-2xl p-1 bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 shadow-lg"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={formatTeamName(team)}
        className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
      />
      {isDelta && (
        <span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border border-black shadow"
          title="Klub DELTA"
        />
      )}
    </div>
  );
}

export default function DeltaMatchHub20(props: DeltaMatchHub20Props) {
  const {
    matches,
    players,
    attendance,
    lineup,
    events,
    leagueByes = [],
    currentUserRole,
    parentPlayerIds,
    canManageMatches = false,
    canEditMatchEvents = false,
    onOpenMatch,
    onSetAttendance,
    onSwitchToTraining
  } = props;

  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "results" | "stats">("upcoming");
  const [localAttendance, setLocalAttendance] = useState<Record<string, "yes" | "no" | "maybe">>({});
  const [rsvpFeedback, setRsvpFeedback] = useState<{ matchId: string; playerId: string; message: string } | null>(null);

  const isStaff = currentUserRole === "admin" || currentUserRole === "coach" || canManageMatches;
  const isParent = parentPlayerIds && parentPlayerIds.length > 0;
  const parentPlayers = useMemo(
    () => players.filter(p => parentPlayerIds.includes(p.id)),
    [players, parentPlayerIds]
  );

  // Chronologically find the NEXT match
  const nextMatch = useMemo(() => {
    const now = new Date();
    // Matches scheduled from 3 hours ago onwards
    const upcoming = matches
      .filter(m => m.status === "scheduled" && parseMatchDateTime(m.match_date, m.match_time).getTime() >= now.getTime() - 3 * 3600 * 1000)
      .sort((a, b) => parseMatchDateTime(a.match_date, a.match_time).getTime() - parseMatchDateTime(b.match_date, b.match_time).getTime());
    return upcoming[0] || null;
  }, [matches]);

  // Played matches (most recent first)
  const playedMatches = useMemo(() => {
    return matches
      .filter(m => m.status === "played")
      .sort((a, b) => b.match_date.localeCompare(a.match_date));
  }, [matches]);

  // Scheduled matches
  const scheduledMatches = useMemo(() => {
    return matches
      .filter(m => m.status === "scheduled")
      .sort((a, b) => a.match_date.localeCompare(b.match_date));
  }, [matches]);

  // Combined timeline items (matches + byes)
  const allTimelineItems = useMemo(() => {
    const list: Array<{ key: string; date: string; match?: Match; bye?: LeagueBye }> = [
      ...matches.map(m => ({ key: `match-${m.id}`, date: m.match_date, match: m })),
      ...leagueByes.map(b => ({ key: `bye-${b.round}`, date: b.date, bye: b }))
    ];
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [matches, leagueByes]);

  // Overall Statistics & Form
  const teamStats = useMemo(() => {
    let played = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

    playedMatches.forEach(m => {
      played++;
      const isHome = isDeltaTeam(m.home_team);
      const deltaG = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
      const oppG = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
      goalsFor += deltaG;
      goalsAgainst += oppG;
      if (deltaG > oppG) wins++;
      else if (deltaG === oppG) draws++;
      else losses++;
    });

    const recentPlayed = [...playedMatches].reverse().slice(-5);
    const form = recentPlayed.map(m => {
      const isHome = isDeltaTeam(m.home_team);
      const deltaG = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
      const oppG = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
      if (deltaG > oppG) return { letter: "W", label: "Zwycięstwo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
      if (deltaG === oppG) return { letter: "R", label: "Remis", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
      return { letter: "P", label: "Porażka", color: "bg-red-500/20 text-red-400 border-red-500/40" };
    });

    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    const goalDiff = goalsFor - goalsAgainst;

    // Goalscorers ranking
    const scorerMap: Record<string, { player: Player; goals: number; assists: number }> = {};
    events.forEach(e => {
      if (e.event_type === "goal" && e.player_id) {
        const p = players.find(x => x.id === e.player_id);
        if (p) {
          if (!scorerMap[p.id]) scorerMap[p.id] = { player: p, goals: 0, assists: 0 };
          scorerMap[p.id].goals++;
        }
      }
      if (e.event_type === "goal" && e.assist_player_id) {
        const p = players.find(x => x.id === e.assist_player_id);
        if (p) {
          if (!scorerMap[p.id]) scorerMap[p.id] = { player: p, goals: 0, assists: 0 };
          scorerMap[p.id].assists++;
        }
      }
    });

    const topScorers = Object.values(scorerMap).sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 5);

    return {
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDiff,
      winRate,
      form,
      topScorers
    };
  }, [playedMatches, events, players]);

  // Handle 1-Click Parent RSVP
  const handleParentRsvp = async (matchId: string, playerId: string, status: "yes" | "no" | "maybe") => {
    const key = `${matchId}_${playerId}`;
    setLocalAttendance(prev => ({ ...prev, [key]: status }));

    const playerName = players.find(p => p.id === playerId)?.display_name || "Dziecko";
    const statusText = status === "yes" ? "obecność potwierdzona" : status === "no" ? "nieobecność zgłoszona" : "status niepewny";
    setRsvpFeedback({ matchId, playerId, message: `${playerName}: ${statusText}` });
    setTimeout(() => setRsvpFeedback(null), 3500);

    if (onSetAttendance) {
      try {
        await onSetAttendance(matchId, playerId, status);
      } catch (err) {
        console.error("Błąd zapisu obecności:", err);
      }
    }
  };

  // Get current attendance status for a player in a match
  const getPlayerMatchAttendance = (matchId: string, playerId: string) => {
    const key = `${matchId}_${playerId}`;
    if (localAttendance[key]) return localAttendance[key];
    const rec = attendance.find(a => a.match_id === matchId && a.player_id === playerId);
    return rec?.status || null;
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 text-white">
      {/* HEADER: CINEMATIC STADIUM ATMOSPHERE */}
      <header className="relative mb-6 rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#141824] via-[#0d1017] to-[#07090d] p-5 sm:p-6 md:p-8 shadow-2xl">
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_0%,#dc2626_0%,transparent_60%)]"
          aria-hidden="true"
        />
        <div
          className="absolute -right-16 -top-16 w-64 h-64 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,#f59e0b_0%,transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-red-600/20 text-red-400 border border-red-500/30 mb-2">
              <Flame size={13} className="text-red-500 animate-pulse" />
              <span>DELTA INFERNO • MATCH HUB 2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              CENTRUM <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">MECZOWE</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Oficjalne mecze ligowe, terminarz spotkań, statystyki bramkowe oraz 1-Click zgłoszenia obecności dla rodziców.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start md:self-center">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
              <Trophy size={16} className="text-amber-400" />
              <div className="text-left">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rozegrane</span>
                <b className="text-sm font-black text-amber-300">{teamStats.played} meczów</b>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
              <Goal size={16} className="text-red-400" />
              <div className="text-left">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Bramki</span>
                <b className="text-sm font-black text-white">{teamStats.goalsFor} goli</b>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MATCH HERO: CENTRAL KICK-OFF CARD OR EMPTY STATE */}
      <div className="mb-8">
        {nextMatch ? (
          <article className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#161c29]/95 via-[#0e131d]/95 to-[#080b11]/95 p-5 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-red-600/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Top Bar: Round & Timing Badge */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wide">
                  KOLEJKA {nextMatch.round_no || "—"}
                </span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-300 font-medium hidden sm:inline">Liga MZPN 2026/27</span>
              </div>

              {(() => {
                const timing = getMatchTimingStatus(nextMatch.match_date, nextMatch.match_time);
                return (
                  <span className={`px-3 py-1 rounded-full font-black text-[11px] tracking-wider border shadow-sm ${timing.badgeClass}`}>
                    {timing.label}
                  </span>
                );
              })()}
            </div>

            {/* Teams Faceoff Grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6 my-2">
              {/* Home Team */}
              <div className="flex items-center sm:flex-col sm:justify-center gap-3 sm:gap-2 text-left sm:text-center">
                <TeamLogo team={nextMatch.home_team} size={58} />
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {formatTeamName(nextMatch.home_team)}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {isDeltaTeam(nextMatch.home_team) ? "Gospodarz • DELTA" : "Gospodarz"}
                  </span>
                </div>
              </div>

              {/* Center VS & Kick-off Time */}
              <div className="flex flex-col items-center justify-center py-2 px-4 rounded-2xl bg-black/40 border border-white/10">
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-amber-400">
                  {nextMatch.match_time ? nextMatch.match_time.slice(0, 5) : "10:00"}
                </div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                  {formatFullDatePL(nextMatch.match_date)}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex items-center sm:flex-col sm:justify-center gap-3 sm:gap-2 text-left sm:text-center flex-row-reverse sm:flex-col">
                <TeamLogo team={nextMatch.away_team} size={58} />
                <div className="sm:text-center text-right sm:text-left">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {formatTeamName(nextMatch.away_team)}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {isDeltaTeam(nextMatch.away_team) ? "Gość • DELTA" : "Gość"}
                  </span>
                </div>
              </div>
            </div>

            {/* Venue & Navigation Row */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2 text-slate-300">
                <MapPin size={16} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong className="text-white">Miejsce spotkania:</strong> {nextMatch.venue || "Do potwierdzenia przez organizatora"}
                </span>
              </div>

              {nextMatch.venue && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextMatch.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 hover:text-amber-200 border border-white/10 transition-colors font-bold text-xs shrink-0 self-start sm:self-auto min-h-[44px]"
                >
                  <Navigation size={14} />
                  <span>Nawiguj do boiska (Google Maps)</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              )}
            </div>

            {/* PARENT RSVP SECTION (STRICT SCOPING) */}
            {isParent && parentPlayers.length > 0 && (
              <div className="relative z-10 mt-5 p-4 rounded-2xl bg-black/50 border border-white/10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      TWOJA DEKLARACJA OBECNOŚCI (STREFA RODZICA)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Dotyczy wyłącznie powiązanego zawodnika
                  </span>
                </div>

                {rsvpFeedback && rsvpFeedback.matchId === nextMatch.id && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <Check size={14} />
                    <span>{rsvpFeedback.message}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {parentPlayers.map(child => {
                    const status = getPlayerMatchAttendance(nextMatch.id, child.id);
                    return (
                      <div
                        key={child.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold flex items-center justify-center text-xs">
                            {child.shirt_number ? `#${child.shirt_number}` : child.display_name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{child.display_name}</div>
                            <div className="text-[11px] text-slate-400">
                              Status:{" "}
                              {status === "yes" ? (
                                <span className="text-emerald-400 font-bold">Potwierdzona obecność (Tak)</span>
                              ) : status === "no" ? (
                                <span className="text-red-400 font-bold">Zgłoszona nieobecność (Nie)</span>
                              ) : status === "maybe" ? (
                                <span className="text-amber-400 font-bold">Status niepewny</span>
                              ) : status === "present" ? (
                                <span className="text-emerald-400 font-bold">Obecność na boisku (Trener)</span>
                              ) : status === "absent" ? (
                                <span className="text-slate-400 font-bold">Odnotowano nieobecność</span>
                              ) : (
                                <span className="text-yellow-400 font-semibold">Brak deklaracji</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 1-Click Thumb-friendly RSVP buttons (min-height 44px) */}
                        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleParentRsvp(nextMatch.id, child.id, "yes")}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              status === "yes" || status === "present"
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 border border-emerald-400 ring-2 ring-emerald-400/30"
                                : "bg-white/[0.06] hover:bg-emerald-600/30 text-slate-300 hover:text-white border border-white/10"
                            }`}
                          >
                            <Check size={14} />
                            <span>BĘDĘ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleParentRsvp(nextMatch.id, child.id, "no")}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              status === "no" || status === "absent"
                                ? "bg-red-700 text-white shadow-lg shadow-red-900/50 border border-red-500 ring-2 ring-red-500/30"
                                : "bg-white/[0.06] hover:bg-red-700/30 text-slate-300 hover:text-white border border-white/10"
                            }`}
                          >
                            <X size={14} />
                            <span>NIE MOGĘ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleParentRsvp(nextMatch.id, child.id, "maybe")}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              status === "maybe"
                                ? "bg-amber-600 text-white shadow-lg shadow-amber-900/50 border border-amber-400 ring-2 ring-amber-400/30"
                                : "bg-white/[0.06] hover:bg-amber-600/30 text-slate-300 hover:text-white border border-white/10"
                            }`}
                          >
                            <HelpCircle size={14} />
                            <span>NIEPEWNY</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COACH / STAFF QUICK ATTENDANCE OVERVIEW */}
            {isStaff && (
              <div className="relative z-10 mt-4 p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                  <Users size={16} className="text-blue-400 shrink-0" />
                  <span>
                    Kadra na mecz: <b>{attendance.filter(a => a.match_id === nextMatch.id && (a.status === "yes" || a.status === "present")).length}</b> potwierdzonych • <b>{attendance.filter(a => a.match_id === nextMatch.id && a.status === "no").length}</b> niedostępnych
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenMatch(nextMatch, "attendance")}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shrink-0 self-start sm:self-auto min-h-[36px]"
                >
                  Zarządzaj obecnością i kadrą
                </button>
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onOpenMatch(nextMatch, "summary")}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm tracking-wide shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>CENTRUM MECZU & SZCZEGÓŁY</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </article>
        ) : (
          /* EMPTY STATE (COMPACT, ZERO FABRICATED MATCHES) */
          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#141824] to-[#0a0d14] p-6 sm:p-8 text-center shadow-xl">
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Shield size={28} />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/[0.06] text-slate-300 text-[11px] font-bold tracking-widest uppercase border border-white/10 mb-2">
                PAUZA LIGOWA • DELTA 2018 GM
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                Mecze w trakcie ustalania
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                W najbliższym terminie drużyna nie rozgrywa oficjalnego meczu ligowego. Bądź gotowy na nadchodzące treningi i sprawdź ostatnie wyniki.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                {onSwitchToTraining && (
                  <button
                    type="button"
                    onClick={onSwitchToTraining}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-2 min-h-[44px]"
                  >
                    <span>Zobacz harmonogram treningów</span>
                    <ArrowRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab("results")}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-bold text-xs border border-white/10 transition-colors min-h-[44px]"
                >
                  Archiwum wyników
                </button>
              </div>
            </div>
          </article>
        )}
      </div>

      {/* FILTER PILLS / NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[44px] flex items-center gap-1.5 ${
            activeTab === "upcoming"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <CalendarDays size={14} />
          <span>TERMINARZ ({scheduledMatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[44px] flex items-center gap-1.5 ${
            activeTab === "results"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <Trophy size={14} />
          <span>WYNIKI ({playedMatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[44px] flex items-center gap-1.5 ${
            activeTab === "stats"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <TrendingUp size={14} />
          <span>TABELA & FORMA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[44px] flex items-center gap-1.5 ${
            activeTab === "all"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <Activity size={14} />
          <span>WSZYSTKIE ({allTimelineItems.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: UPCOMING SCHEDULE */}
      {activeTab === "upcoming" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
            <span className="font-bold uppercase tracking-wider">NADCHODZĄCE SPOTKANIA LIGOWE</span>
            <span>{scheduledMatches.length} w terminarzu</span>
          </div>

          {scheduledMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {scheduledMatches.map(m => {
                const timing = getMatchTimingStatus(m.match_date, m.match_time);
                return (
                  <article
                    key={m.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                      {/* Date & Round badge */}
                      <div className="sm:w-28 shrink-0">
                        <span className="block text-[11px] font-bold text-amber-400 uppercase">
                          Kolejka {m.round_no || "—"}
                        </span>
                        <b className="text-sm text-white block">{datePL(m.match_date)}</b>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={12} /> {m.match_time ? m.match_time.slice(0, 5) : "Do ustalenia"}
                        </span>
                      </div>

                      {/* Teams & Logos */}
                      <div className="flex items-center gap-3">
                        <TeamLogo team={m.home_team} size={36} />
                        <div className="text-sm font-black text-white">
                          <span>{formatTeamName(m.home_team)}</span>
                          <span className="text-slate-500 font-normal mx-2">vs</span>
                          <span>{formatTeamName(m.away_team)}</span>
                        </div>
                        <TeamLogo team={m.away_team} size={36} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${timing.badgeClass}`}>
                        {timing.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenMatch(m, "summary")}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs border border-white/10 transition-colors flex items-center gap-1 min-h-[44px]"
                      >
                        <span>Szczegóły</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-400 text-sm">
              Brak kolejnych zaplanowanych meczów w tym sezonie.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: RESULTS HISTORY */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
            <span className="font-bold uppercase tracking-wider">ROZEGRANE MECZE I WYNIKI</span>
            <span>{playedMatches.length} wyników</span>
          </div>

          {playedMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {playedMatches.map(m => {
                const isHome = isDeltaTeam(m.home_team);
                const deltaG = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
                const oppG = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
                const isWin = deltaG > oppG;
                const isDraw = deltaG === oppG;

                // Match events for goalscorers
                const matchGoals = events.filter(e => e.match_id === m.id && e.event_type === "goal");
                const mvpEvent = events.find(e => e.match_id === m.id && e.event_type === "mvp");
                const mvpPlayer = mvpEvent ? players.find(p => p.id === mvpEvent.player_id) : null;

                return (
                  <article
                    key={m.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Meta & Teams */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        <div className="sm:w-28 shrink-0">
                          <span className="block text-[11px] font-bold text-amber-400 uppercase">
                            Kolejka {m.round_no || "—"}
                          </span>
                          <b className="text-sm text-slate-300 block">{datePL(m.match_date)}</b>
                          <span className="text-[11px] text-slate-500">{m.venue ? m.venue.split(",")[0] : "Ligowy"}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <TeamLogo team={m.home_team} size={38} />
                          <div className="text-sm font-black text-white">
                            <span className={isDeltaTeam(m.home_team) ? "text-amber-300" : ""}>{formatTeamName(m.home_team)}</span>
                            <span className="text-slate-500 font-normal mx-2">vs</span>
                            <span className={isDeltaTeam(m.away_team) ? "text-amber-300" : ""}>{formatTeamName(m.away_team)}</span>
                          </div>
                          <TeamLogo team={m.away_team} size={38} />
                        </div>
                      </div>

                      {/* Score Box & W/D/L Badge */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                        <div className="text-center px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                          <div className="text-lg font-black tracking-wider text-amber-400">
                            {m.home_score ?? 0} : {m.away_score ?? 0}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                            isWin
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : isDraw
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-red-500/20 text-red-300 border-red-500/30"
                          }`}
                        >
                          {isWin ? "ZWYCIĘSTWO" : isDraw ? "REMIS" : "PORAŻKA"}
                        </span>

                        <button
                          type="button"
                          onClick={() => onOpenMatch(m, "summary")}
                          className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs border border-white/10 transition-colors flex items-center gap-1 min-h-[44px]"
                        >
                          <span>Raport</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Goalscorers & MVP pill */}
                    {(matchGoals.length > 0 || mvpPlayer) && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs">
                        {matchGoals.length > 0 && (
                          <div className="flex items-center gap-1.5 text-slate-300 bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/5">
                            <Goal size={13} className="text-amber-400 shrink-0" />
                            <span>
                              {matchGoals
                                .map(g => {
                                  const p = players.find(x => x.id === g.player_id);
                                  return p ? p.display_name : "Bramka";
                                })
                                .join(", ")}
                            </span>
                          </div>
                        )}

                        {mvpPlayer && (
                          <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                            <Star size={13} className="text-amber-400 shrink-0" />
                            <span>MVP: {mvpPlayer.display_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-400 text-sm">
              Brak rozegranych meczów w tym sezonie.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: STATS & FORM */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mecze</span>
              <b className="text-2xl sm:text-3xl font-black text-white">{teamStats.played}</b>
              <span className="block text-[10px] text-slate-500 mt-1">
                {teamStats.wins}W - {teamStats.draws}R - {teamStats.losses}P
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Skuteczność</span>
              <b className="text-2xl sm:text-3xl font-black text-amber-400">{teamStats.winRate}%</b>
              <span className="block text-[10px] text-slate-500 mt-1">Zwycięstw w sezonie</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bramki</span>
              <b className="text-2xl sm:text-3xl font-black text-emerald-400">{teamStats.goalsFor}</b>
              <span className="block text-[10px] text-slate-500 mt-1">Stracone: {teamStats.goalsAgainst}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bilans</span>
              <b className={`text-2xl sm:text-3xl font-black ${teamStats.goalDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {teamStats.goalDiff > 0 ? `+${teamStats.goalDiff}` : teamStats.goalDiff}
              </b>
              <span className="block text-[10px] text-slate-500 mt-1">Różnica goli</span>
            </div>
          </div>

          {/* Form Strip & Top Scorers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Form */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Flame size={14} className="text-red-400" />
                <span>FORMA W OSTATNICH SPOTKANIACH</span>
              </h4>
              {teamStats.form.length > 0 ? (
                <div className="flex items-center gap-2">
                  {teamStats.form.map((f, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${f.color}`}
                      title={f.label}
                    >
                      {f.letter}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Brak rozegranych meczów w celu wyznaczenia formy.</p>
              )}
            </div>

            {/* Top Scorers */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Goal size={14} className="text-amber-400" />
                <span>NAJLEPSI STRZELCY ZESPOŁU</span>
              </h4>
              {teamStats.topScorers.length > 0 ? (
                <div className="space-y-2">
                  {teamStats.topScorers.map(({ player, goals, assists }, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="w-5 text-slate-500 font-normal">#{idx + 1}</span>
                        <span>{player.display_name}</span>
                      </div>
                      <div className="flex items-center gap-3 font-semibold text-slate-400">
                        <span className="text-amber-300 font-bold">{goals} {goals === 1 ? "gol" : "goli"}</span>
                        {assists > 0 && <span className="text-slate-500">({assists} as.)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Brak zapisanych strzelców w rozegranych meczach.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ALL TIMELINE (MATCHES + BYES) */}
      {activeTab === "all" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
            <span className="font-bold uppercase tracking-wider">KOMPLETNY SEZON • TERMINARZ I HISTORIA</span>
            <span>{allTimelineItems.length} pozycji</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {allTimelineItems.map(item => {
              if (item.match) {
                const m = item.match;
                const isPlayed = m.status === "played";
                return (
                  <article
                    key={item.key}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPlayed
                        ? "bg-white/[0.02] border-white/5"
                        : "bg-white/[0.04] border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TeamLogo team={m.home_team} size={32} />
                      <div className="text-xs sm:text-sm font-bold text-white">
                        <span>{formatTeamName(m.home_team)}</span>
                        <span className="text-slate-500 mx-1.5 font-normal">vs</span>
                        <span>{formatTeamName(m.away_team)}</span>
                      </div>
                      <TeamLogo team={m.away_team} size={32} />
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      <span className="text-slate-400 font-medium">
                        Kolejka {m.round_no || "—"} • {datePL(m.match_date)}
                      </span>
                      {isPlayed ? (
                        <b className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-amber-400 font-bold">
                          {m.home_score ?? 0} : {m.away_score ?? 0}
                        </b>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                          Zaplanowany
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenMatch(m, "summary")}
                        className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors min-h-[36px]"
                        title="Otwórz mecz"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              }

              if (item.bye) {
                return (
                  <article
                    key={item.key}
                    className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/15 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 text-amber-300">
                      <CalendarDays size={18} className="text-amber-400 shrink-0" />
                      <div>
                        <b className="block text-white">KOLEJKA {item.bye.round} • DELTA GM PAUZUJE</b>
                        <span className="text-slate-400">W tej kolejce drużyna nie rozgrywa meczu ligowego.</span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-medium shrink-0">{datePL(item.bye.date)}</span>
                  </article>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </section>
  );
}
