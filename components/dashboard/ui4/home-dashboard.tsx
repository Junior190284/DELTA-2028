"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  Layers,
  Award,
  Users,
  Shield,
  Bell,
  ChevronRight,
  Flame,
  ArrowRight,
  AlertCircle,
  Activity,
  Check,
  Star,
  Zap,
  Target,
  Trophy,
  Crown,
  Medal
} from "lucide-react";
import DeltaCard from "@/components/cards/DeltaCard";
import type { DashboardUI4Model } from "./types";
import { DeltaDesktopSidebar } from "./delta-desktop-sidebar";
import { DeltaMobileBottomNav } from "./delta-mobile-nav";
import { subscribeCardEvents } from "@/lib/cards/cardSync";

interface HomeDashboardProps {
  model: DashboardUI4Model;
}

function formatCommunicationDate(publishedAt?: string | null): string {
  if (!publishedAt) return "—";
  try {
    const d = new Date(publishedAt);
    if (Number.isNaN(d.getTime())) return "—";

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const todayStr = formatter.format(now);
    const itemDateStr = formatter.format(d);

    if (todayStr === itemDateStr) {
      return "Dzisiaj";
    }

    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const yesterdayStr = formatter.format(yesterday);
    if (yesterdayStr === itemDateStr) {
      return "Wczoraj";
    }

    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      day: "numeric",
      month: "short"
    }).format(d);
  } catch {
    return "—";
  }
}

function renderAchievementIcon(iconName?: string | null, className = "w-3 h-3 text-amber-400 shrink-0") {
  switch (iconName) {
    case "Shield":
      return <Shield className={className} />;
    case "Zap":
      return <Zap className={className} />;
    case "Trophy":
      return <Trophy className={className} />;
    case "Crown":
      return <Crown className={className} />;
    case "Medal":
      return <Medal className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "Award":
      return <Award className={className} />;
    case "CalendarDays":
      return <Calendar className={className} />;
    default:
      return <Star className={className} />;
  }
}

export function HomeDashboard({ model }: HomeDashboardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [showNotificationNotice, setShowNotificationNotice] = useState(false);
  const [expandedCommIds, setExpandedCommIds] = useState<Record<string, boolean>>({});

  const toggleExpandComm = (id: string) => {
    setExpandedCommIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const {
    profile,
    nextAction,
    progress,
    recentCards,
    albumProgress,
    recentAchievements,
    teamShowcase,
    clubCommunications
  } = model;

  const isParent = profile.actorKind === "parent";
  const isRestricted = profile.player.status === "unavailable";
  const playerName = profile.player.data?.displayName || profile.displayName;
  const shirtNumber = profile.player.data?.shirtNumber ?? null;
  const position = profile.player.data?.position ?? null;
  const levelData = progress.data;
  const albumData = albumProgress.data;

  // Real-time synchronization of unopened packs across views
  const [unopenedPacksCount, setUnopenedPacksCount] = useState(
    albumData?.unopenedPacks ?? 0
  );

  useEffect(() => {
    setUnopenedPacksCount(albumData?.unopenedPacks ?? 0);
  }, [albumData?.unopenedPacks]);

  useEffect(() => {
    const unsubscribe = subscribeCardEvents({
      onPackOpened: (payload) => {
        if (typeof payload.remaining_unopened_packs_count === "number" && Number.isFinite(payload.remaining_unopened_packs_count)) {
          setUnopenedPacksCount(Math.max(0, Math.floor(payload.remaining_unopened_packs_count)));
        } else {
          setUnopenedPacksCount(prev => Math.max(0, prev - 1));
        }
      },
      onCollectionUpdated: (payload) => {
        if (typeof payload.remaining_unopened_packs_count === "number" && Number.isFinite(payload.remaining_unopened_packs_count)) {
          setUnopenedPacksCount(Math.max(0, Math.floor(payload.remaining_unopened_packs_count)));
        }
      }
    });
    return unsubscribe;
  }, []);

  // Safe player card model for compact preview
  const eliteCardModel = {
    id: "card-demo-alpha",
    playerId: profile.player.data?.id || "demo-player-alpha",
    playerName: playerName.toUpperCase(),
    shirtNumber: shirtNumber !== null ? String(shirtNumber) : "",
    position: position || "ZAWODNIK",
    cardType: "INFERNO" as const,
    rarity: "inferno" as const,
    playerImage: null
  };

  const startsAt = nextAction.data?.startsAt ? new Date(nextAction.data.startsAt) : null;
  const matchTime = startsAt && !isNaN(startsAt.getTime())
    ? startsAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
    : "11:30";
  const matchDay = startsAt && !isNaN(startsAt.getTime())
    ? startsAt.toLocaleDateString("pl-PL", { weekday: "long" }).toUpperCase()
    : "SOBOTA";
  const homeTeam = profile.teamName || "DELTA WARSZAWA";
  const opponentTeam = nextAction.data?.opponent || "DRUŻYNA RYWALA";
  const matchLocation = nextAction.data?.location || "Centrum Treningowe DELTA (Boisko Główne)";

  return (
    <div className="e41-root">
      <div className="d4-desktop-shell">
        {/* Desktop Sidebar Navigation */}
        <DeltaDesktopSidebar
          profile={profile}
          activeItem="dashboard"
          unopenedPacks={unopenedPacksCount}
          collectionPercent={albumProgress.status === "available" ? (albumData?.percent ?? null) : null}
          variantTheme="elite"
        />

        <div className="d4-desktop-content pb-24 lg:pb-12">
          {/* Ambient Stadium Lighting */}
          <div className="e41-stadium-glow" />

          {/* ===================================================================== */}
          {/* 1. TOP APP BAR                                                        */}
          {/* ===================================================================== */}
          <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="d4-container-desktop flex items-center justify-between">
              {/* Club Identity & Player Profile */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-black/40">
                  <Image
                    src="/teamlogos/gm.png"
                    alt="Herb DELTA Warszawa"
                    width={34}
                    height={34}
                    className="object-contain w-6 h-6 sm:w-[34px] sm:h-[34px]"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 sm:gap-2">
                    <span>DELTA INFERNO</span>
                    <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                      PULPIT GŁÓWNY · U-9
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-black text-white flex items-center gap-1.5 truncate">
                    <span>{isParent ? `${profile.displayName}` : playerName}</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[190px] sm:max-w-md">
                    {isRestricted ? (
                      <span className="text-slate-500">Konto z ograniczonym dostępem</span>
                    ) : isParent ? (
                      <span>Podopieczny: <strong className="text-slate-200">{playerName}</strong>{shirtNumber !== null ? ` #${shirtNumber}` : ""} · {profile.teamName ?? "Drużyna"}</span>
                    ) : (
                      <span>{shirtNumber !== null ? `#${shirtNumber} · ` : ""}{profile.teamName ?? "Drużyna Testowa"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Navigation Link to Collection Dashboard */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {albumProgress.status === "available" && albumData && (
                  <Link
                    href="/preview/dashboard-ui4?view=collection"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black hover:bg-amber-500/25 transition shadow-sm e41-num focus-visible:ring-2 focus-visible:ring-amber-400"
                    title="Przejdź do Skarbca Kolekcji"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>SKARBIEC KART ({unopenedPacksCount}) →</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setShowNotificationNotice(prev => !prev)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition relative focus-visible:ring-2 focus-visible:ring-amber-400"
                  title="Powiadomienia klubowe"
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 rounded-full bg-amber-400" />
                </button>
              </div>
            </div>

            {/* Notification Notice Banner */}
            {showNotificationNotice && (
              <div className="d4-container-desktop mt-2 px-3 py-2 bg-slate-900/90 border border-amber-400/40 rounded-xl text-center text-xs text-amber-300 flex items-center justify-between">
                <span>ℹ Powiadomienia (Tryb demonstracyjny): Brak nowych powiadomień w środowisku podglądu.</span>
                <button
                  type="button"
                  onClick={() => setShowNotificationNotice(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>
            )}
          </header>

          {/* ===================================================================== */}
          {/* MAIN DESKTOP CONTENT GRID                                             */}
          {/* ===================================================================== */}
          <main className="d4-container-desktop relative z-10">
            
            {/* ROW 1: MATCHDAY COMMAND CENTER (8 cols) + PASSPORT, XP & COLLECTION (4 cols) */}
            <div className="d4-dashboard-row-1">
              
              {/* LEFT: 2. DOMINANT HERO: MATCHDAY COMMAND CENTER & CLUB WIRE (8 cols) */}
              <div className="lg:col-span-8 min-w-0 flex flex-col gap-4">
                <section
                  data-testid="e41-event-hero"
                  className="e41-match-hero p-4 sm:p-5 text-white flex flex-col gap-3.5"
                >
                  {/* Clean stadium atmosphere without heavy text watermarks */}
                  <div
                    className="e41-match-bg"
                    style={{
                      backgroundImage: `url('/assets/hero-stadium-clean-desktop-v2.png')`
                    }}
                  />

                  <div className="relative z-10 flex flex-col gap-3">
                    {/* Header Pill & Countdown */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-black tracking-wider uppercase">
                        <Shield className="w-3.5 h-3.5" />
                        <span>
                          {nextAction.status === "available"
                            ? "LIGA ŻAKÓW U-9 · KOLEJKA 14"
                            : nextAction.status === "empty"
                            ? "TERMINARZ MECZOWY"
                            : "DOSTĘP DO TERMINARZA"}
                        </span>
                      </span>

                      {nextAction.status === "available" && nextAction.data?.countdown ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black e41-num">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{nextAction.data.countdown}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                          STATUS: {nextAction.status === "empty" ? "BRAK MECZU" : "ZASTRZEŻONY"}
                        </span>
                      )}
                    </div>

                    {/* Teams Matchup Header (Balanced Proportions on Mobile & Desktop) */}
                    {nextAction.status === "available" && nextAction.data ? (
                      <>
                        <div className="bg-slate-950/85 border border-slate-800/90 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
                          <div className="grid grid-cols-7 items-center text-center gap-1 sm:gap-2">
                            {/* Home Team */}
                            <div className="col-span-3 min-w-0 flex flex-col items-center sm:flex-row sm:text-left gap-1.5 sm:gap-2.5">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 shadow-lg">
                                <Image
                                  src="/teamlogos/gm.png"
                                  alt="Delta"
                                  width={36}
                                  height={36}
                                  className="object-contain w-7 h-7 sm:w-[36px] sm:h-[36px]"
                                />
                              </div>
                              <div className="min-w-0 max-w-full">
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase text-sky-400">Gospodarz</div>
                                <div className="text-xs sm:text-base lg:text-lg font-black text-white leading-tight uppercase truncate">
                                  {homeTeam}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-400">Rocznik 2018 (U-9)</div>
                              </div>
                            </div>

                            {/* VS / Kickoff Time */}
                            <div className="col-span-1 flex flex-col items-center justify-center">
                              <div className="text-[10px] sm:text-[11px] font-black text-amber-400 tracking-wider">VS</div>
                              <div className="text-sm sm:text-xl font-black text-white e41-num mt-0.5" suppressHydrationWarning>{matchTime}</div>
                              <div className="text-[9px] text-slate-400 uppercase font-bold" suppressHydrationWarning>{matchDay}</div>
                            </div>

                            {/* Away Team */}
                            <div className="col-span-3 min-w-0 flex flex-col items-center sm:flex-row-reverse sm:text-right gap-1.5 sm:gap-2.5">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-slate-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-md text-slate-400">
                                <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
                              </div>
                              <div className="min-w-0 max-w-full">
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">Gość</div>
                                <div className="text-xs sm:text-base lg:text-lg font-black text-white leading-tight uppercase truncate">
                                  {opponentTeam}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-400">Zespół Rywala</div>
                              </div>
                            </div>
                          </div>

                          {/* Logistics Ribbon */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span className="truncate">{matchLocation}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Zbiórka: 45 min przed meczem</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Status: Zaplanowany</span>
                            </div>
                          </div>
                        </div>

                        {/* Attendance Action CTA (Tight spacing, no giant empty gap) */}
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmed(!confirmed)}
                            className={`e41-btn-action w-full min-h-[44px] py-2 px-4 text-xs sm:text-sm font-black transition ${
                              confirmed
                                ? "bg-emerald-700 text-white shadow-lg shadow-emerald-950/40"
                                : "e41-btn-primary"
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                            <span>
                              {isParent
                                ? confirmed
                                  ? "OBECNOŚĆ ZAZNACZONA ✓"
                                  : "POTWIERDŹ OBECNOŚĆ PODOPIECZNEGO"
                                : confirmed
                                ? "OBECNOŚĆ ZAZNACZONA ✓"
                                : "POTWIERDŹ OBECNOŚĆ NA MECZ"}
                            </span>
                          </button>

                          <div className="text-center text-[10px] text-amber-400 font-bold tracking-wide">
                            Tryb demonstracyjny — nie zapisuje obecności
                          </div>

                          {confirmed && (
                            <div className="text-center text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-xl py-1.5 px-3">
                              ℹ Symulacja interfejsu: Brak rzeczywistego zapisu w bazie danych Supabase.
                            </div>
                          )}

                          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-sky-400" />
                            <span>14 z 16 potwierdzonych obecności na mecz</span>
                          </div>
                        </div>
                      </>
                    ) : nextAction.status === "empty" ? (
                      <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center space-y-2">
                        <Calendar className="w-8 h-8 mx-auto text-slate-500" />
                        <div className="text-sm font-bold text-slate-200">
                          Brak zaplanowanych meczów w najbliższym terminie
                        </div>
                        <div className="text-xs text-slate-400">
                          Nowy harmonogram ligowy U-9 pojawi się po opublikowaniu przez MZPN.
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-amber-500/60" />
                        <div className="text-sm font-bold text-slate-300">
                          Harmonogram meczowy jest zastrzeżony
                        </div>
                        <div className="text-xs text-slate-500">
                          Dostęp do szczegółów zbiórki i składu wymaga aktywnego profilu zawodnika lub rodzica.
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 4. CLUB WIRE & COACH BRIEFING (DIRECTLY BELOW MATCHDAY HERO) */}
                <section
                  data-testid="e41-club-communications"
                  className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                        <h2 className="text-xs sm:text-base font-bold text-white tracking-wide truncate">
                          Komunikaty Klubu i Trenera
                        </h2>
                      </div>
                      <span className="shrink-0 text-[10px] bg-slate-800 text-slate-300 px-2 sm:px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                        {clubCommunications.data?.length ?? 0} AKTUALNOŚCI
                      </span>
                    </div>

                    {clubCommunications.status === "available" && clubCommunications.data ? (
                      <div className="space-y-2.5">
                        {clubCommunications.data.map((item) => {
                          const isExpanded = Boolean(expandedCommIds[item.id]);
                          const hasLongContent =
                            typeof item.summary === "string" &&
                            (item.summary.length > 90 || item.summary.includes("\n"));

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-xl border transition ${
                                item.urgent
                                  ? "bg-gradient-to-r from-amber-950/40 to-slate-950/80 border-amber-500/50 border-l-4 border-l-amber-500 text-amber-100 shadow-md shadow-amber-950/20"
                                  : "bg-gradient-to-r from-slate-900/60 to-slate-950/80 border-slate-800/80 border-l-4 border-l-slate-700/80 text-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  {item.urgent && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0">
                                      PILNE
                                    </span>
                                  )}
                                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                                    {item.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 e41-num shrink-0">
                                  {formatCommunicationDate(item.publishedAt)}
                                </span>
                              </div>
                              {item.summary && (
                                <div className="mt-0.5">
                                  <p
                                    className={`text-xs text-slate-300/90 leading-relaxed whitespace-pre-line break-words ${
                                      isExpanded ? "" : "line-clamp-2 sm:line-clamp-3"
                                    }`}
                                  >
                                    {item.summary}
                                  </p>
                                  {hasLongContent && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandComm(item.id)}
                                      className="mt-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 transition focus:outline-none"
                                      data-testid={`communication-expand-${item.id}`}
                                    >
                                      <span>{isExpanded ? "Zwiń" : "Więcej"}</span>
                                      <ChevronRight
                                        className={`w-3 h-3 transition-transform duration-200 ${
                                          isExpanded ? "-rotate-90" : "rotate-90"
                                        }`}
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
                        Brak nowych ogłoszeń na tablicy klubowej.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* RIGHT: 3. PASSPORT, PROGRESS, COLLECTION & TEAM SHOWCASE */}
              <div className="lg:col-span-4 min-w-0 flex flex-col gap-3.5">
                
                {/* 3A. PASSPORT & ATHLETE PROGRESS (with integrated badges) */}
                <div
                  data-testid="e41-passport-section"
                  className="bg-slate-900/75 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md flex flex-col gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-sky-400" />
                        <span>Paszport Zawodnika</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700/60">
                        DELTA ELITE
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-11 h-11 rounded-xl bg-slate-950 border border-sky-500/40 p-1 flex items-center justify-center shrink-0 shadow-md">
                        <Image
                          src="/teamlogos/gm.png"
                          alt="Delta"
                          width={36}
                          height={36}
                          className="object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">{playerName}</div>
                        <div className="text-xs text-slate-400 font-medium truncate">
                          {profile.teamName || "Drużyna U-9"} · #{shirtNumber ?? 7} ({position ?? "POM"})
                        </div>
                      </div>
                    </div>

                    {/* Level & XP Progression */}
                    {progress.status === "available" && levelData ? (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/70">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white font-bold">Poziom {levelData.level} · {levelData.title}</span>
                          <span className="text-amber-400 font-extrabold e41-num">
                            {levelData.currentLevelXP ?? 0} / {levelData.nextLevelXP ?? 250} XP ({levelData.progressPercent ?? 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-sky-500 to-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${levelData.progressPercent ?? 0}%` }}
                          />
                        </div>

                        {/* Submetrics Row */}
                        <div className="grid grid-cols-3 gap-1.5 text-center pt-1 text-[10px]">
                          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                            <span className="text-slate-400 block font-medium">Razem XP</span>
                            <span className="text-white font-black e41-num">{levelData.currentXP ?? 0}</span>
                          </div>
                          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                            <span className="text-slate-400 block font-medium">Seria</span>
                            <span className="text-amber-400 font-black e41-num">{levelData.activityStreak ?? 0} DNI</span>
                          </div>
                          <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                            <span className="text-slate-400 block font-medium">Frekwencja sez.</span>
                            <span className="text-emerald-400 font-black e41-num">
                              {typeof levelData.attendanceRatePercent === "number" ? `${levelData.attendanceRatePercent}%` : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Next Achievement Progression */}
                        {levelData.nextAchievement && (
                          <div className="pt-2 border-t border-slate-800/70">
                            <div className="flex justify-between items-center text-[11px] mb-1">
                              <span className="text-slate-300 font-semibold flex items-center gap-1.5 truncate">
                                <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate">Najbliższy cel: {levelData.nextAchievement.name}</span>
                              </span>
                              <span className="text-amber-400 font-bold e41-num shrink-0 ml-2">
                                {levelData.nextAchievement.current} / {levelData.nextAchievement.target} ({levelData.nextAchievement.percent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                              <div
                                className="bg-sky-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${levelData.nextAchievement.percent}%` }}
                              />
                            </div>
                            {levelData.nextAchievement.description && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                                {levelData.nextAchievement.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-800/70 text-center py-2">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {progress.reason === "no_linked_player"
                            ? "Brak powiązanego profilu zawodnika"
                            : progress.reason === "not_authorized"
                            ? "Brak uprawnień do profilu zawodnika"
                            : "Brak dostępu do statystyk sportowych"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Integrated Badges & Achievements */}
                  {recentAchievements.status === "available" && recentAchievements.data && recentAchievements.data.length > 0 ? (
                    <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>Zdobyte odznaki ({recentAchievements.data.length})</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {recentAchievements.data.map((ach) => (
                          <div
                            key={ach.id}
                            className="group relative inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold"
                            title={ach.description || ach.name}
                          >
                            {renderAchievementIcon(ach.icon)}
                            <span className="truncate max-w-[130px]">{ach.name}</span>
                            {ach.unlockedAt && (
                              <span className="text-[9px] text-slate-400 font-normal">
                                · {formatCommunicationDate(ach.unlockedAt)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : recentAchievements.status === "available" || recentAchievements.status === "empty" ? (
                    <div className="pt-2 border-t border-slate-800/70 text-center py-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Brak zdobytych odznak w tym sezonie
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800/70 text-center py-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {recentAchievements.reason === "no_linked_player"
                          ? "Brak powiązanego profilu zawodnika"
                          : recentAchievements.reason === "not_authorized"
                          ? "Brak uprawnień do profilu zawodnika"
                          : "Brak dostępu do osiągnięć"}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3B. COMPACT COLLECTION SHORTCUT (Zero-Overlap Mini DeltaCard) */}
                <section
                  data-testid="e41-collection-section"
                  className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/35 rounded-2xl p-3.5 backdrop-blur-md shadow-lg"
                >
                  <div className="flex items-center justify-between mb-2.5 border-b border-amber-500/20 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Kolekcja Kart INFERNO
                      </h3>
                    </div>
                    <Link
                      href="/preview/dashboard-ui4?view=collection"
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-0.5"
                    >
                      <span>Skarbiec</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {albumProgress.status === "available" ? (
                    <div className="space-y-2.5">
                      {/* Compact Card Thumbnail + Progress Summary with Clear Separation */}
                      <div className="flex items-center gap-3">
                        <div className="w-[72px] shrink-0 flex items-center justify-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                          {recentCards.status === "available" && recentCards.data && recentCards.data.length > 0 ? (
                            <DeltaCard
                              card={eliteCardModel}
                              size="xs"
                              interactive={false}
                              showFlip={false}
                              className="mx-auto drop-shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded-lg bg-slate-900 border border-dashed border-amber-500/40 flex items-center justify-center text-amber-400">
                              <Sparkles className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="text-xs font-black text-white">Album Klubowy</div>
                          <div className="text-xs font-extrabold text-amber-400 e41-num">
                            {albumData?.percent != null ? `${albumData.percent}% UKOŃCZENIA` : "Postęp albumu: Niedostępny"}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Zdobyte: <strong className="text-white">{albumData ? albumData.owned : "—"}</strong> {albumData?.total != null ? `z ${albumData.total} kart` : "unikalnych kart"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Duplikaty: <strong className="text-slate-200 font-bold">{albumData?.duplicates ?? 0}</strong> · Paczki: <strong className="text-amber-400 font-bold">{unopenedPacksCount} do otwarcia</strong>
                          </div>
                        </div>
                      </div>

                      {/* Primary Navigation Button to Full Collection Dashboard */}
                      <Link
                        href="/preview/dashboard-ui4?view=collection"
                        className="e41-btn-action e41-btn-gold w-full min-h-[38px] py-1.5 px-3 text-xs font-black flex items-center justify-center gap-2 shadow"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-950" />
                        <span>PRZEJDŹ DO KOLEKCJI & PACZEK →</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                      Kolekcja kart i album INFERNO: Niedostępne dla tego konta
                    </div>
                  )}
                </section>

                {/* 5. SQUAD ROSTER: TEAM SHOWCASE U-9 */}
                {teamShowcase.status === "available" && teamShowcase.data ? (
                  <section
                    data-testid="e41-team-showcase"
                    className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-sky-400" />
                          <h2 className="text-sm font-bold text-white tracking-wide">
                            Kadra Rocznika 2018 (U-9)
                          </h2>
                        </div>
                        <Link
                          href="/preview/team-showcase-v3"
                          className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-0.5"
                        >
                          <span>Skład</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                        {teamShowcase.data.featuredPlayers.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-sky-500/40 text-sky-300 font-black text-xs flex items-center justify-center shrink-0 e41-num">
                                {p.shirtNumber !== null ? `#${p.shirtNumber}` : "#-"}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {p.displayName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {p.position || "POM"} · Powołany
                                </div>
                              </div>
                            </div>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : null}

              </div>

            </div>

          </main>

          {/* Mobile Bottom Navigation */}
          <DeltaMobileBottomNav
            unopenedPacks={unopenedPacksCount}
            activeItem="dashboard"
          />
        </div>
      </div>
    </div>
  );
}

export default HomeDashboard;
