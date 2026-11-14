"use client";

import React, { useState, useMemo } from "react";
import PlayerPhoto from "../PlayerPhoto";
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
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  History
} from "lucide-react";

export interface TrainingSession {
  id: string;
  training_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  title: string;
  notes: string | null;
  created_at: string;
}

export interface TrainingAttendance {
  training_id: string;
  player_id: string;
  status: "yes" | "no" | "maybe" | "present" | "absent" | string;
  updated_by?: string;
}

export interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path: string | null;
  active: boolean;
}

export interface TrainingGame {
  id: string;
  training_id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  created_by?: string;
  created_at?: string;
}

export interface TrainingEvent {
  id: string;
  training_id?: string;
  game_id: string | null;
  event_type: string;
  player_id: string | null;
  assist_player_id: string | null;
  created_at?: string;
}

export interface TrainingPlayerStat {
  sessions: number;
  attendanceStreak: number;
  games: number;
  wins: number;
  goals: number;
  assists: number;
  ga: number;
}

export interface TrainingPair {
  a: Player;
  b: Player;
  score: number;
  games: number;
  wins: number;
  combinedGA: number;
}

export interface DeltaTrainingCenter20Props {
  trainingSessions: TrainingSession[];
  trainingAttendance: TrainingAttendance[];
  trainingGames: TrainingGame[];
  trainingEvents: TrainingEvent[];
  players: Player[];
  trainingPlayerStats: Record<string, TrainingPlayerStat>;
  trainingChemistry: TrainingPair[];
  chemistryNetwork: { nodes: any[]; links: any[] };
  trainingAttendanceRank: Player[];
  trainingScorers: Player[];
  trainingAssisters: Player[];
  trainingGA: Player[];
  avgTrainingAttendance: number;
  currentUserId: string;
  currentUserRole: string;
  parentPlayerIds: string[];
  canManageTraining?: boolean;
  canManageTrainingAttendance?: boolean;
  onSetAttendance?: (trainingId: string, playerId: string, status: "yes" | "no" | "maybe" | "present" | "absent") => Promise<void> | void;
  onOpenPlayerProfile: (player: Player) => void;
  onOpenTrainingKingModal: () => void;
}

const isRyszardPlayer = (p: { display_name: string }) => {
  const n = (p.display_name || "").toLocaleLowerCase("pl-PL");
  return n.includes("ryszard") && n.includes("rybacki");
};

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

export function calculateDurationMinutes(startAt: Date, endAt: Date): number {
  return Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

function parseTrainingDateTime(dateStr: string, timeStr: string | null): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = ((timeStr || "17:30").slice(0, 5)).split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function getTrainingTimingStatus(dateStr: string, startTime: string | null, endTime: string | null): {
  label: string;
  badgeClass: string;
  isToday: boolean;
  isLive: boolean;
} {
  const now = new Date();
  const startAt = parseTrainingDateTime(dateStr, startTime);
  const endAt = endTime
    ? parseTrainingDateTime(dateStr, endTime)
    : new Date(startAt.getTime() + 90 * 60 * 1000);

  if (now >= startAt && now < endAt) {
    return {
      label: "LIVE • TRWA TERAZ",
      badgeClass: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
      isToday: true,
      isLive: true
    };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const isToday = now.getFullYear() === y && now.getMonth() === (m - 1) && now.getDate() === d;
  if (isToday) {
    return {
      label: "DZISIAJ • TRENING",
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

  const diffMs = startAt.getTime() - now.getTime();
  if (diffMs < 0) {
    return {
      label: "ODBYTY",
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

export default function DeltaTrainingCenter20(props: DeltaTrainingCenter20Props) {
  const {
    trainingSessions,
    trainingAttendance,
    trainingGames,
    trainingEvents,
    players,
    trainingPlayerStats,
    trainingChemistry,
    chemistryNetwork,
    trainingAttendanceRank,
    trainingScorers,
    trainingAssisters,
    trainingGA,
    avgTrainingAttendance,
    currentUserId,
    currentUserRole,
    parentPlayerIds,
    canManageTraining = false,
    canManageTrainingAttendance = false,
    onSetAttendance,
    onOpenPlayerProfile,
    onOpenTrainingKingModal
  } = props;

  const isStaff = currentUserRole === "admin" || currentUserRole === "coach" || canManageTrainingAttendance;
  const isCoachOrStaff = isStaff;
  const isParent = parentPlayerIds && parentPlayerIds.length > 0;
  const parentPlayers = useMemo(
    () => players.filter(p => parentPlayerIds.includes(p.id)),
    [players, parentPlayerIds]
  );

  const [activeTab, setActiveTab] = useState<"schedule" | "coach" | "myattendance" | "lab">("schedule");
  const [localAttendance, setLocalAttendance] = useState<Record<string, "yes" | "no" | "maybe" | "present" | "absent">>({});
  const [feedbackMsg, setFeedbackMsg] = useState<{ trainingId: string; playerId: string; message: string } | null>(null);

  // Chronologically find NEXT training session
  const nextTraining = useMemo(() => {
    const now = new Date();
    const upcoming = [...trainingSessions]
      .map(s => {
        const startAt = parseTrainingDateTime(s.training_date, s.start_time);
        const endAt = s.end_time
          ? parseTrainingDateTime(s.training_date, s.end_time)
          : new Date(startAt.getTime() + 90 * 60 * 1000);
        return { session: s, startAt, endAt };
      })
      .filter(x => x.endAt.getTime() >= now.getTime() - 2 * 3600 * 1000)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    return upcoming[0] || null;
  }, [trainingSessions]);

  // Selected session for Coach Quick Check-in
  const [selectedCoachSessionId, setSelectedCoachSessionId] = useState<string>(
    nextTraining?.session.id || trainingSessions[0]?.id || ""
  );

  const selectedCoachSession = useMemo(() => {
    return trainingSessions.find(s => s.id === selectedCoachSessionId) || nextTraining?.session || trainingSessions[0] || null;
  }, [trainingSessions, selectedCoachSessionId, nextTraining]);

  // Scheduled sessions (future + today)
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return [...trainingSessions]
      .filter(s => {
        const endAt = s.end_time
          ? parseTrainingDateTime(s.training_date, s.end_time)
          : new Date(parseTrainingDateTime(s.training_date, s.start_time).getTime() + 90 * 60 * 1000);
        return endAt.getTime() >= now.getTime() - 2 * 3600 * 1000;
      })
      .sort((a, b) => a.training_date.localeCompare(b.training_date));
  }, [trainingSessions]);

  // Past sessions (most recent first)
  const pastSessions = useMemo(() => {
    const now = new Date();
    return [...trainingSessions]
      .filter(s => {
        const endAt = s.end_time
          ? parseTrainingDateTime(s.training_date, s.end_time)
          : new Date(parseTrainingDateTime(s.training_date, s.start_time).getTime() + 90 * 60 * 1000);
        return endAt.getTime() < now.getTime() - 2 * 3600 * 1000;
      })
      .sort((a, b) => b.training_date.localeCompare(a.training_date));
  }, [trainingSessions]);

  // Attendance lookup with local optimistic override
  const getAttendanceStatus = (trainingId: string, playerId: string) => {
    const key = `${trainingId}_${playerId}`;
    if (localAttendance[key]) return localAttendance[key];
    const rec = trainingAttendance.find(a => a.training_id === trainingId && a.player_id === playerId);
    return rec?.status || null;
  };

  // 1-Click RSVP for Parent
  const handleParentRsvp = async (trainingId: string, playerId: string, status: "yes" | "no" | "maybe") => {
    const key = `${trainingId}_${playerId}`;
    setLocalAttendance(prev => ({ ...prev, [key]: status }));

    const playerName = players.find(p => p.id === playerId)?.display_name || "Dziecko";
    const statusText = status === "yes" ? "obecność potwierdzona" : status === "no" ? "zgłoszono nieobecność" : "status niepewny";
    setFeedbackMsg({ trainingId, playerId, message: `${playerName}: ${statusText}` });
    setTimeout(() => setFeedbackMsg(null), 3500);

    if (onSetAttendance) {
      try {
        await onSetAttendance(trainingId, playerId, status);
      } catch (err) {
        console.error("Błąd zapisu RSVP treningu:", err);
      }
    }
  };

  // Coach confirmation (present / absent)
  const handleCoachSetAttendance = async (trainingId: string, playerId: string, status: "present" | "absent") => {
    const key = `${trainingId}_${playerId}`;
    setLocalAttendance(prev => ({ ...prev, [key]: status }));

    const playerName = players.find(p => p.id === playerId)?.display_name || "Zawodnik";
    const statusText = status === "present" ? "obecność na boisku potwierdzona (+40 XP)" : "odnotowano nieobecność";
    setFeedbackMsg({ trainingId, playerId, message: `${playerName}: ${statusText}` });
    setTimeout(() => setFeedbackMsg(null), 3500);

    if (onSetAttendance) {
      try {
        await onSetAttendance(trainingId, playerId, status);
      } catch (err) {
        console.error("Błąd zatwierdzenia obecności trenera:", err);
      }
    }
  };
  const handleCoachCheckIn = handleCoachSetAttendance;

  // Calculate stats for primary child of parent (or first child)
  const activeChild = parentPlayers[0] || players[0] || null;
  const childStats = useMemo(() => {
    if (!activeChild) return null;
    const childAtt = trainingAttendance.filter(a => a.player_id === activeChild.id);
    const confirmedPresent = childAtt.filter(a => a.status === "present").length;
    const confirmedAbsent = childAtt.filter(a => a.status === "absent").length;
    const totalPast = pastSessions.length;
    const rate = totalPast > 0 ? Math.round((confirmedPresent / totalPast) * 100) : 0;
    const attendanceRate = rate;
    const streak = trainingPlayerStats[activeChild.id]?.attendanceStreak || 0;
    const earnedXp = confirmedPresent * 40;

    return {
      confirmedPresent,
      confirmedAbsent,
      totalPast,
      rate,
      attendanceRate,
      streak,
      earnedXp
    };
  }, [activeChild, trainingAttendance, pastSessions, trainingPlayerStats]);

  return (
    <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-white">
      {/* HEADER: CINEMATIC STADIUM ATMOSPHERE (COMPACT ~38% REDUCTION) */}
      <header className="relative mb-3.5 sm:mb-4 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#141824] via-[#0d1017] to-[#07090d] p-3.5 sm:p-4 md:p-5 shadow-2xl">
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_0%,#dc2626_0%,transparent_60%)]"
          aria-hidden="true"
        />
        <div
          className="absolute -right-16 -top-16 w-48 h-48 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,#f59e0b_0%,transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-red-600/20 text-red-400 border border-red-500/30 mb-1.5">
              <Flame size={12} className="text-red-500 animate-pulse" />
              <span>DELTA INFERNO • CENTRUM TRENINGOWE 2.0</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 m-0">
              CENTRUM <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">TRENINGOWE</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              Harmonogram jednostek, 1-Click deklaracje obecności dla rodziców, lista obecności sztabu i Performance Lab.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-center">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <CalendarDays size={15} className="text-amber-400" />
              <div className="text-left">
                <span className="block text-[9px] text-slate-400 uppercase font-semibold">Treningi</span>
                <b className="text-xs sm:text-sm font-black text-amber-300">{trainingSessions.length} sesji</b>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <Users size={15} className="text-red-400" />
              <div className="text-left">
                <span className="block text-[9px] text-slate-400 uppercase font-semibold">Śr. obecność</span>
                <b className="text-xs sm:text-sm font-black text-white">{avgTrainingAttendance.toFixed(1)} os.</b>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenTrainingKingModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all min-h-[36px]"
              title="Otwórz ranking króla treningu"
            >
              <Trophy size={14} />
              <span className="hidden sm:inline">Król Treningu</span>
            </button>
          </div>
        </div>
      </header>

      {/* TRAINING HERO: CENTRAL UPCOMING TRAINING OR COMPACT EMPTY STATE */}
      <div className="mb-3.5 sm:mb-4">
        {nextTraining ? (
          <article className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#161c29]/95 via-[#0e131d]/95 to-[#080b11]/95 p-5 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-red-600/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Top Bar: Timing Badge & Duration */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Flame size={13} className="text-red-500" />
                  <span>NAJBLIŻSZA JEDNOSTKA</span>
                </span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-300 font-medium hidden sm:inline">DELTA 2018 GM</span>
              </div>

              {(() => {
                const timing = getTrainingTimingStatus(
                  nextTraining.session.training_date,
                  nextTraining.session.start_time,
                  nextTraining.session.end_time
                );
                return (
                  <span className={`px-3 py-1 rounded-full font-black text-[11px] tracking-wider border shadow-sm ${timing.badgeClass}`}>
                    {timing.label}
                  </span>
                );
              })()}
            </div>

            {/* Training Details Grid */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 my-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {nextTraining.session.title || "Trening techniczno-taktyczny"}
                </h3>
                <div className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider mt-1 flex items-center gap-2">
                  <CalendarDays size={15} />
                  <span>{formatFullDatePL(nextTraining.session.training_date)}</span>
                </div>
              </div>

              {/* Time & Duration Box */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 shrink-0 self-start md:self-auto">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-white">
                    {nextTraining.session.start_time ? nextTraining.session.start_time.slice(0, 5) : "17:30"}
                    {nextTraining.session.end_time ? ` - ${nextTraining.session.end_time.slice(0, 5)}` : ""}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Czas trwania: {calculateDurationMinutes(nextTraining.startAt, nextTraining.endAt)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Venue & Navigation Row */}
            <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2 text-slate-300">
                <MapPin size={16} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong className="text-white">Miejsce:</strong> {nextTraining.session.location || "Boisko klubowe K.S. Delta Warszawa"}
                </span>
              </div>

              {nextTraining.session.location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextTraining.session.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 hover:text-amber-200 border border-white/10 transition-colors font-bold text-xs shrink-0 self-start sm:self-auto min-h-[44px]"
                >
                  <Navigation size={14} />
                  <span>Nawiguj na boisko (Google Maps)</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              )}
            </div>

            {/* Organizational Notes */}
            {nextTraining.session.notes && (
              <div className="relative z-10 mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 flex items-start gap-2">
                <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Informacja od trenera:</strong> {nextTraining.session.notes}
                </span>
              </div>
            )}

            {/* PARENT RSVP SECTION (STRICT CHILD SCOPING) */}
            {isParent && parentPlayers.length > 0 && (
              <div className="relative z-10 mt-5 p-4 rounded-2xl bg-black/50 border border-white/10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      TWOJA DEKLARACJA OBECNOŚCI NA TRENINGU (STREFA RODZICA)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Dotyczy wyłącznie Twojego dziecka
                  </span>
                </div>

                {feedbackMsg && feedbackMsg.trainingId === nextTraining.session.id && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <Check size={14} />
                    <span>{feedbackMsg.message}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {parentPlayers.map(child => {
                    const status = getAttendanceStatus(nextTraining.session.id, child.id);
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
                                <span className="text-emerald-400 font-bold">Obecność na boisku potwierdzona przez trenera (+40 XP)</span>
                              ) : status === "absent" ? (
                                <span className="text-slate-400 font-bold">Odnotowano nieobecność</span>
                              ) : (
                                <span className="text-yellow-400 font-semibold">Brak deklaracji — wybierz status</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 1-Click Thumb-friendly RSVP buttons (min-height 44px) */}
                        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleParentRsvp(nextTraining.session.id, child.id, "yes")}
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
                            onClick={() => handleParentRsvp(nextTraining.session.id, child.id, "no")}
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
                            onClick={() => handleParentRsvp(nextTraining.session.id, child.id, "maybe")}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                              status === "maybe"
                                ? "bg-amber-600 text-white shadow-lg shadow-amber-900/50 border border-amber-400 ring-2 ring-amber-400/30"
                                : "bg-white/[0.06] hover:bg-amber-600/30 text-slate-300 hover:text-white border border-white/10"
                            }`}
                          >
                            <HelpCircle size={14} />
                            <span>NIE WIEM</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2.5 text-[10px] text-slate-400 leading-tight">
                  * Deklaracja obecności pomaga trenerowi zaplanować jednostkę treningową i podział na drużyny. Punkty doświadczenia (+40 XP) są naliczane wyłącznie po potwierdzeniu rzeczywistej obecności na boisku przez trenera.
                </div>
              </div>
            )}

            {/* COACH QUICK OVERVIEW */}
            {isStaff && (
              <div className="relative z-10 mt-4 p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                  <Users size={16} className="text-blue-400 shrink-0" />
                  <span>
                    Sztab: <b>{trainingAttendance.filter(a => a.training_id === nextTraining.session.id && a.status === "present").length}/{players.length}</b> potwierdzonych na boisku • <b>{trainingAttendance.filter(a => a.training_id === nextTraining.session.id && a.status === "yes").length}</b> deklaracji rodziców
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCoachSessionId(nextTraining.session.id);
                    setActiveTab("coach");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shrink-0 self-start sm:self-auto min-h-[36px]"
                >
                  Otwórz listę obecności sztabu
                </button>
              </div>
            )}
          </article>
        ) : (
          /* EMPTY STATE (COMPACT, SLEEK ~70% HEIGHT REDUCTION) */
          <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#141824] via-[#0f131c] to-[#0a0d14] p-3.5 sm:p-4 md:p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/[0.06] text-slate-300 border border-white/10">
                      PAUZA TRENINGOWA • DELTA 2018 GM
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-white m-0">
                      Harmonogram w trakcie ustalania
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    W najbliższym czasie brak zaplanowanych jednostek. Trener opublikuje nowy grafik wkrótce.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("lab")}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-bold text-xs border border-white/10 transition-colors min-h-[40px]"
                >
                  Performance Lab & Historia
                </button>
              </div>
            </div>
          </article>
        )}
      </div>

      {/* FILTER PILLS / NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 mb-3.5 sm:mb-4 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "schedule"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <CalendarDays size={14} />
          <span>HARMONOGRAM ({upcomingSessions.length})</span>
        </button>

        {isStaff && (
          <button
            type="button"
            onClick={() => setActiveTab("coach")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[40px] flex items-center gap-1.5 ${
              activeTab === "coach"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>LISTA OBECNOŚCI (SZTAB)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("myattendance")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "myattendance"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <TrendingUp size={14} />
          <span>TWOJA FREKWENCJA & XP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lab")}
          className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide shrink-0 transition-all min-h-[40px] flex items-center gap-1.5 ${
            activeTab === "lab"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-950/30"
              : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
          }`}
        >
          <Zap size={14} />
          <span>PERFORMANCE LAB & CHEMIA</span>
        </button>
      </div>

      {/* TAB CONTENT 1: SCHEDULE */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
            <span className="font-bold uppercase tracking-wider">NADCHODZĄCE JEDNOSTKI TRENINGOWE</span>
            <span>{upcomingSessions.length} w harmonogramie</span>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
              {upcomingSessions.map(s => {
                const timing = getTrainingTimingStatus(s.training_date, s.start_time, s.end_time);
                return (
                  <article
                    key={s.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-5">
                      <div className="sm:w-28 shrink-0">
                        <span className="block text-[11px] font-bold text-amber-400 uppercase">
                          {datePL(s.training_date)}
                        </span>
                        <b className="text-sm text-white block">
                          {s.start_time ? s.start_time.slice(0, 5) : "17:30"}
                          {s.end_time ? ` - ${s.end_time.slice(0, 5)}` : ""}
                        </b>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={12} className="shrink-0" />
                          <span>{s.location ? s.location.split(",")[0] : "Boisko"}</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white m-0">
                          {s.title || "Trening klubowy"}
                        </h4>
                        {s.notes && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {s.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${timing.badgeClass}`}>
                        {timing.label}
                      </span>

                      {isParent && activeChild && (
                        <div className="text-right">
                          {(() => {
                            const status = getAttendanceStatus(s.id, activeChild.id);
                            if (status === "yes") return <span className="text-xs font-bold text-emerald-400">Będziesz ✔</span>;
                            if (status === "no") return <span className="text-xs font-bold text-red-400">Nieobecny ✖</span>;
                            if (status === "maybe") return <span className="text-xs font-bold text-amber-400">Niepewny ?</span>;
                            if (status === "present") return <span className="text-xs font-bold text-emerald-300">Potwierdzony na boisku</span>;
                            return <span className="text-xs text-yellow-400 font-medium">Brak deklaracji</span>;
                          })()}
                        </div>
                      )}

                      {isStaff && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCoachSessionId(s.id);
                            setActiveTab("coach");
                          }}
                          className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs border border-white/10 transition-colors flex items-center gap-1 min-h-[44px]"
                        >
                          <span>Obecność</span>
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-400 text-sm">
              Brak kolejnych zaplanowanych treningów w najbliższym czasie.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: COACH CHECK-IN */}
      {activeTab === "coach" && isStaff && (
        <div className="space-y-4">
          {/* Session Selector Header */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-0.5">
                WYBIERZ SESJĘ TRENINGOWĄ DO CHECK-INU
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white m-0">
                  {selectedCoachSession?.title || "Trening"} • {selectedCoachSession ? datePL(selectedCoachSession.training_date) : ""}
                </h3>
                <span className="text-xs text-slate-400">
                  ({selectedCoachSession?.start_time ? selectedCoachSession.start_time.slice(0, 5) : "17:30"} - {selectedCoachSession?.end_time ? selectedCoachSession.end_time.slice(0, 5) : "19:00"})
                </span>
              </div>
            </div>

            {/* Selector Dropdown / Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {trainingSessions.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedCoachSessionId(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all min-h-[36px] ${
                    selectedCoachSessionId === s.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                      : "bg-white/[0.04] text-slate-300 hover:text-white border border-white/10"
                  }`}
                >
                  {datePL(s.training_date)}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackMsg && selectedCoachSession && feedbackMsg.trainingId === selectedCoachSession.id && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <Check size={14} />
              <span>{feedbackMsg.message}</span>
            </div>
          )}

          {/* Group Roster Grid */}
          {selectedCoachSession && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Obecni na boisku: <b>{trainingAttendance.filter(a => a.training_id === selectedCoachSession.id && a.status === "present").length}/{players.length}</b> • Nieobecni: <b>{trainingAttendance.filter(a => a.training_id === selectedCoachSession.id && a.status === "absent").length}</b>
                </span>
                <span>Potwierdzenie trenera nalicza +40 XP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {players.map(p => {
                  const status = getAttendanceStatus(selectedCoachSession.id, p.id);
                  const isPresent = status === "present";
                  const isAbsent = status === "absent";
                  const isYesRsvp = status === "yes";
                  const isNoRsvp = status === "no";
                  const isMaybeRsvp = status === "maybe";

                  return (
                    <article
                      key={p.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isPresent
                          ? "bg-emerald-950/20 border-emerald-500/40"
                          : isAbsent
                          ? "bg-red-950/20 border-red-500/30"
                          : "bg-white/[0.03] border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                          {isRyszardPlayer(p) ? (
                            <img src="/assets/ryszard-player-card.png" alt={p.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <PlayerPhoto playerId={p.id} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenPlayerProfile(p)}
                            className="font-bold text-xs sm:text-sm text-white hover:text-amber-300 text-left truncate block max-w-[130px]"
                          >
                            {p.display_name}
                          </button>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>#{p.shirt_number || "—"}</span>
                            <span>•</span>
                            {isYesRsvp ? (
                              <span className="text-emerald-400 font-semibold">Rodzic: Będzie</span>
                            ) : isNoRsvp ? (
                              <span className="text-red-400 font-semibold">Rodzic: Nie będzie</span>
                            ) : isMaybeRsvp ? (
                              <span className="text-amber-400 font-semibold">Rodzic: Niepewny</span>
                            ) : (
                              <span>Brak zgłoszenia</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Coach Action Buttons (min 44px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCoachSetAttendance(selectedCoachSession.id, p.id, "present")}
                          className={`min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all ${
                            isPresent
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 border border-emerald-400 ring-2 ring-emerald-400/30"
                              : "bg-white/[0.06] hover:bg-emerald-600/30 text-slate-300 hover:text-white border border-white/10"
                          }`}
                          title="Potwierdź obecność na boisku (+40 XP)"
                        >
                          <Check size={15} />
                          <span className="text-[11px]">OBECNY</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCoachSetAttendance(selectedCoachSession.id, p.id, "absent")}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1.5 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                            isAbsent
                              ? "bg-red-700 text-white shadow-lg shadow-red-900/50 border border-red-500 ring-2 ring-red-500/30"
                              : "bg-white/[0.06] hover:bg-red-700/30 text-slate-400 hover:text-white border border-white/10"
                          }`}
                          title="Odnotuj nieobecność"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: MY ATTENDANCE & XP */}
      {activeTab === "myattendance" && (
        <div className="space-y-4">
          {childStats && activeChild ? (
            <>
              {/* Stats KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Odbyte treningi
                  </span>
                  <b className="text-2xl sm:text-3xl font-black text-white">{childStats.confirmedPresent}</b>
                  <span className="block text-[10px] text-slate-500 mt-0.5">z {childStats.totalPast} w sezonie</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Twoja frekwencja
                  </span>
                  <b className="text-2xl sm:text-3xl font-black text-amber-400">{childStats.rate}%</b>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Wskaźnik obecności</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Seria obecności
                  </span>
                  <b className="text-2xl sm:text-3xl font-black text-red-400 flex items-center justify-center gap-1">
                    <span>{childStats.streak}</span>
                    <Flame size={20} className="text-red-500" />
                  </b>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Treningów z rzędu</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Zdobyte XP
                  </span>
                  <b className="text-2xl sm:text-3xl font-black text-emerald-400">+{childStats.earnedXp} XP</b>
                  <span className="block text-[10px] text-slate-500 mt-0.5">+40 XP za każdy trening</span>
                </div>
              </div>

              {/* Attendance History List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="font-bold uppercase tracking-wider">HISTORIA UCZESTNICTWA ({activeChild.display_name})</span>
                  <span>{pastSessions.length} sesji archiwalnych</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {pastSessions.map(s => {
                    const status = getAttendanceStatus(s.id, activeChild.id);
                    const isPresent = status === "present";
                    const isAbsent = status === "absent";

                    return (
                      <article
                        key={s.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div>
                          <b className="text-xs sm:text-sm text-white block">{s.title || "Trening klubowy"}</b>
                          <span className="text-[11px] text-slate-400">
                            {datePL(s.training_date)} • {s.location || "Boisko"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPresent ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <Check size={13} />
                              <span>OBECNY (+40 XP)</span>
                            </span>
                          ) : isAbsent ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                              <X size={13} />
                              <span>NIEOBECNY</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/[0.06] text-slate-400 border border-white/10">
                              Nieodnotowany
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-slate-400 text-sm">
              Wybierz profil zawodnika w prawym górnym rogu lub zaloguj się jako rodzic, aby zobaczyć osobistą frekwencję.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: PERFORMANCE LAB & CHEMISTRY */}
      {activeTab === "lab" && (
        <div className="space-y-6">
          {/* Quick Actions & Legacy Rankings */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-950/30 via-black/40 to-amber-950/30 border border-white/10">
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-0.5">
                ANALIZA TRENINGOWA & GRY KONTROLNE
              </span>
              <h4 className="text-sm sm:text-base font-black text-white m-0">
                Gierki wewnętrzne, gole, asysty i ranking Króla Treningu
              </h4>
            </div>

            <button
              type="button"
              onClick={onOpenTrainingKingModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition-all min-h-[44px]"
            >
              <Trophy size={16} />
              <span>KRÓL TRENINGU & GIERKI</span>
            </button>
          </div>

          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Frekwencja ranking */}
            <article className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 pb-2.5 border-b border-white/5 mb-2.5">
                <Users size={16} className="text-amber-400" />
                <span>TOP FREKWENCJA</span>
              </div>
              <div className="space-y-2">
                {trainingAttendanceRank.slice(0, 5).map((p, idx) => {
                  const s = trainingPlayerStats[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenPlayerProfile(p)}
                      className="w-full flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-slate-500 font-bold text-[11px]">#{idx + 1}</span>
                        <span className="font-bold text-white truncate max-w-[100px]">{p.display_name}</span>
                      </div>
                      <b className="text-amber-300 font-black shrink-0">{s?.sessions || 0} sesji</b>
                    </button>
                  );
                })}
              </div>
            </article>

            {/* Gole treningowe */}
            <article className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 pb-2.5 border-b border-white/5 mb-2.5">
                <Goal size={16} className="text-red-400" />
                <span>GOLE W GIERKACH</span>
              </div>
              <div className="space-y-2">
                {trainingScorers.slice(0, 5).map((p, idx) => {
                  const s = trainingPlayerStats[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenPlayerProfile(p)}
                      className="w-full flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-slate-500 font-bold text-[11px]">#{idx + 1}</span>
                        <span className="font-bold text-white truncate max-w-[100px]">{p.display_name}</span>
                      </div>
                      <b className="text-red-400 font-black shrink-0">{s?.goals || 0} goli</b>
                    </button>
                  );
                })}
              </div>
            </article>

            {/* Asysty treningowe */}
            <article className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 pb-2.5 border-b border-white/5 mb-2.5">
                <Star size={16} className="text-amber-400" />
                <span>ASYSTY W GIERKACH</span>
              </div>
              <div className="space-y-2">
                {trainingAssisters.slice(0, 5).map((p, idx) => {
                  const s = trainingPlayerStats[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenPlayerProfile(p)}
                      className="w-full flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-slate-500 font-bold text-[11px]">#{idx + 1}</span>
                        <span className="font-bold text-white truncate max-w-[100px]">{p.display_name}</span>
                      </div>
                      <b className="text-amber-300 font-black shrink-0">{s?.assists || 0} asyst</b>
                    </button>
                  );
                })}
              </div>
            </article>

            {/* G+A treningowe */}
            <article className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 pb-2.5 border-b border-white/5 mb-2.5">
                <Zap size={16} className="text-yellow-400" />
                <span>PUNKTACJA G+A</span>
              </div>
              <div className="space-y-2">
                {trainingGA.slice(0, 5).map((p, idx) => {
                  const s = trainingPlayerStats[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenPlayerProfile(p)}
                      className="w-full flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-slate-500 font-bold text-[11px]">#{idx + 1}</span>
                        <span className="font-bold text-white truncate max-w-[100px]">{p.display_name}</span>
                      </div>
                      <b className="text-yellow-400 font-black shrink-0">{s?.ga || 0} pkt</b>
                    </button>
                  );
                })}
              </div>
            </article>
          </div>

          {/* Chemia Zespołu */}
          <article className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-0.5">
                  PAIR PERFORMANCE • ZGRANIE W GRZE
                </span>
                <h4 className="text-base font-black text-white m-0">Chemia zespołu</h4>
              </div>
              <p className="text-xs text-slate-400 max-w-md m-0">
                Współczynnik zgrania par zawodników obliczany na podstawie wspólnych zwycięstw i asyst w gierkach kontrolnych.
              </p>
            </div>

            {/* SVG Network Map if available */}
            {chemistryNetwork.nodes.length > 1 && (
              <div className="v103-chemistry-network mb-4" aria-label="Mapa połączeń między zawodnikami">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {chemistryNetwork.links.map(({ pair, from, to }) => (
                    <line
                      key={`${pair.a.id}-${pair.b.id}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className={pair.score >= 70 ? "strong" : pair.score >= 45 ? "medium" : "developing"}
                      style={{ strokeWidth: Math.max(1.1, pair.score / 28) }}
                    />
                  ))}
                </svg>
                {chemistryNetwork.nodes.map(node => (
                  <button
                    key={node.player.id}
                    type="button"
                    className="v103-chemistry-node"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    onClick={() => onOpenPlayerProfile(node.player)}
                    title={`Otwórz profil: ${node.player.display_name}`}
                  >
                    <span>
                      {isRyszardPlayer(node.player) ? (
                        <img src="/assets/ryszard-player-card.png" alt="" />
                      ) : (
                        <PlayerPhoto playerId={node.player.id} />
                      )}
                    </span>
                    <b>{node.player.display_name}</b>
                  </button>
                ))}
                <div className="v103-chemistry-legend">
                  <span className="strong">silne</span>
                  <span className="medium">dobre</span>
                  <span className="developing">rozwijane</span>
                </div>
              </div>
            )}

            {/* Top Chemistry Pairs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trainingChemistry.slice(0, 6).map((pair, index) => (
                <div
                  key={`${pair.a.id}-${pair.b.id}`}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-amber-400">#{index + 1} Duet</span>
                    <b className="text-amber-300 font-black">{pair.score}%</b>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center -space-x-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-black/50 border border-white/20">
                        {isRyszardPlayer(pair.a) ? <img src="/assets/ryszard-player-card.png" alt="" className="w-full h-full object-cover" /> : <PlayerPhoto playerId={pair.a.id} />}
                      </div>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-black/50 border border-white/20">
                        {isRyszardPlayer(pair.b) ? <img src="/assets/ryszard-player-card.png" alt="" className="w-full h-full object-cover" /> : <PlayerPhoto playerId={pair.b.id} />}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {pair.a.display_name.split(" ")[0]} + {pair.b.display_name.split(" ")[0]}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${pair.score}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {pair.games} gier • {pair.wins} wygranych • {pair.combinedGA} akcji G/A
                  </span>
                </div>
              ))}
              {trainingChemistry.length === 0 && (
                <p className="text-xs text-slate-500 col-span-full">
                  Współczynnik chemii pojawi się po zapisaniu pierwszych gier kontrolnych.
                </p>
              )}
            </div>
          </article>

          {/* OSTATNIE TRENINGI (SESSION HISTORY LIST - PRESERVED FROM LEGACY) */}
          <article className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 pb-2.5 border-b border-white/5 mb-3">
              <History size={16} className="text-amber-400" />
              <span>OSTATNIE TRENINGI</span>
            </div>
            <div className="space-y-2">
              {trainingSessions.slice(0, 8).map(s => {
                const present = trainingAttendance.filter(a => a.training_id === s.id && a.status === "present").length;
                const games = trainingGames.filter(g => g.training_id === s.id);
                return (
                  <div key={s.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <b className="text-white block">{s.title || "Trening"}</b>
                      <span className="text-[11px] text-slate-400">
                        {datePL(s.training_date)} • {[s.start_time?.slice(0, 5), s.location].filter(Boolean).join(" • ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-amber-300">{present}/{players.length} os.</span>
                      <span className="text-[10px] text-slate-400">{games.length} {games.length === 1 ? "gra" : "gry"}</span>
                    </div>
                  </div>
                );
              })}
              {trainingSessions.length === 0 && (
                <p className="text-xs text-slate-500 m-0">Brak archiwalnych jednostek treningowych.</p>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
