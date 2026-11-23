"use client";

import React, { useState } from "react";
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
  BookOpen,
  Trophy,
  AlertCircle,
  Lock
} from "lucide-react";
import DeltaCard from "@/components/cards/DeltaCard";
import type { DashboardUI4Model } from "./types";

interface DeltaElite41Props {
  model: DashboardUI4Model;
}

export function DeltaElite41({ model }: DeltaElite41Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [showNotificationNotice, setShowNotificationNotice] = useState(false);

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

  // Safe player card model for DeltaCard (Neutral test persona, zero fabricated stats)
  const eliteCardModel = {
    id: "card-demo-alpha",
    playerId: profile.player.data?.id || "demo-player-alpha",
    playerName: playerName.toUpperCase(),
    shirtNumber: shirtNumber !== null ? String(shirtNumber) : "",
    position: position || "ZAWODNIK",
    cardType: "INFERNO" as const,
    rarity: "inferno" as const,
    playerImage: null // Uses NeutralPlayerSilhouette with Delta crest safely
  };

  // Dynamic event date and logistics mapping
  const startsAt = nextAction.data?.startsAt ? new Date(nextAction.data.startsAt) : null;
  const matchTime = startsAt && !isNaN(startsAt.getTime())
    ? startsAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
    : "11:30";
  const matchDay = startsAt && !isNaN(startsAt.getTime())
    ? startsAt.toLocaleDateString("pl-PL", { weekday: "long" }).toUpperCase()
    : "SOBOTA";
  const homeTeam = profile.teamName || "DELTA WARSZAWA";
  const opponentTeam = nextAction.data?.opponent || "DRUŻYNA RYVALA";
  const matchLocation = nextAction.data?.location || "Obiekt klubowy DELTA";

  return (
    <div className="e41-root pb-20">
      {/* Stadium floodlight ambient aura */}
      <div className="e41-stadium-glow" />

      {/* ===================================================================== */}
      {/* 1. TOP APP BAR (Authentic DELTA INFERNO Identity)                     */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/90 px-4 py-2.5">
        <div className="max-w-md lg:max-w-5xl mx-auto flex items-center justify-between">
          {/* Club Identity & Player Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-black/40">
              <Image
                src="/icons/delta-badge-96.png"
                alt="Herb DELTA Warszawa"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                DELTA INFERNO
              </div>
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>{isParent ? `${profile.displayName}` : playerName}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
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

          {/* Quick Actions (Packs only if available & Notifications) */}
          <div className="flex items-center gap-2">
            {albumProgress.status === "available" && albumData && (
              <Link
                href="/preview/pack-demo"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-black hover:bg-amber-500/25 transition shadow-sm e41-num"
                title="Dostępne paczki demonstracyjne"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{albumData.unopenedPacks ?? 0} PACZKI</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowNotificationNotice(prev => !prev)}
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition relative"
              title="Powiadomienia klubowe (Tryb demonstracyjny)"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
            </button>
          </div>
        </div>

        {/* Demo Notification Notice Banner */}
        {showNotificationNotice && (
          <div className="max-w-md lg:max-w-5xl mx-auto mt-2 px-3 py-2 bg-slate-900/90 border border-amber-400/40 rounded-xl text-center text-xs text-amber-300 flex items-center justify-between">
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
      {/* MAIN SCREEN (390px Mobile-first, Expands to 2-Column on Desktop)     */}
      {/* ===================================================================== */}
      <main className="max-w-md lg:max-w-5xl mx-auto px-4 pt-3.5 space-y-4 relative z-10">
        <div className="e41-layout-grid">

        {/* =================================================================== */}
        {/* 2. HERO WYDARZENIA: SPORTOWA KARTA MECZU / TRENINGU (LEFT ON DESKTOP)*/}
        {/* =================================================================== */}
        <section
          data-testid="e41-event-hero"
          className="e41-match-hero e41-col-left py-3.5 px-4 text-white"
        >
          {/* Integrated Stadium Texture */}
          <div
            className="e41-match-bg"
            style={{
              backgroundImage: `url('/assets/hero-stadium-identity-mobile.png')`
            }}
          />

          <div className="relative z-10 flex flex-col gap-3">
            {/* Top Badge: Countdown only if match available, otherwise state indicator */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-black tracking-wider uppercase">
                <Shield className="w-3 h-3" />
                <span>
                  {nextAction.status === "available"
                    ? "LIGA ŻAKÓW U-9 · KOLEJKA 14"
                    : nextAction.status === "empty"
                    ? "TERMINARZ MECZOWY"
                    : "DOSTĘP DO TERMINARZA"}
                </span>
              </span>

              {nextAction.status === "available" && nextAction.data?.countdown ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black e41-num">
                  <Clock className="w-3 h-3" />
                  <span>{nextAction.data.countdown}</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {nextAction.status === "empty" ? "STATUS: BRAK MECZU" : "STATUS: ZASTRZEŻONY"}
                </span>
              )}
            </div>

            {/* Teams Matchup Header (ONLY WHEN AVAILABLE) */}
            {nextAction.status === "available" && nextAction.data ? (
              <>
                <div className="bg-slate-950/75 border border-slate-800/90 rounded-xl p-3 backdrop-blur-md">
                  <div className="grid grid-cols-7 items-center text-center gap-1.5">
                    {/* Home Team */}
                    <div className="col-span-3 flex flex-col items-center">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center mb-1 shadow-md">
                        <Image
                          src="/icons/delta-badge-96.png"
                          alt="Delta"
                          width={34}
                          height={34}
                          className="object-contain"
                        />
                      </div>
                      <div className="text-xs font-black text-white leading-tight uppercase truncate max-w-full">
                        {homeTeam}
                      </div>
                      <div className="text-[9px] text-sky-400 font-bold uppercase">Gospodarz</div>
                    </div>

                    {/* VS / Kickoff Time */}
                    <div className="col-span-1 flex flex-col items-center">
                      <div className="text-[10px] font-black text-amber-400 tracking-wider">VS</div>
                      <div className="text-sm font-black text-white e41-num mt-0.5">{matchTime}</div>
                      <div className="text-[8px] text-slate-400 uppercase font-bold">{matchDay}</div>
                    </div>

                    {/* Away Team (Opponent) */}
                    <div className="col-span-3 flex flex-col items-center">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center mb-1 shadow-md text-slate-300">
                        <Shield className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="text-xs font-black text-white leading-tight uppercase truncate max-w-full">
                        {opponentTeam}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Gość</div>
                    </div>
                  </div>

                  {/* Compact Logistics Ribbon */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{matchLocation}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Zbiórka: 45 min przed meczem</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span>Status: Zaplanowany</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hero CTA & Attendance Counter ONLY SHOWN WHEN EVENT EXISTS */}
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmed(!confirmed)}
                    className={`e41-btn-action w-full min-h-[44px] py-2.5 px-4 text-xs ${
                      confirmed
                        ? "bg-emerald-700 text-white shadow-lg shadow-emerald-950/40"
                        : "e41-btn-primary"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isParent
                        ? confirmed
                          ? "SYMULACJA: OBECNOŚĆ PODOPIECZNEGO ZAZNACZONA ✓"
                          : "SYMULACJA: POTWIERDŹ OBECNOŚĆ PODOPIECZNEGO"
                        : confirmed
                        ? "SYMULACJA: OBECNOŚĆ ZAZNACZONA LOKALNIE ✓"
                        : "SYMULACJA: POTWIERDŹ OBECNOŚĆ NA MECZ"}
                    </span>
                  </button>

                  <div className="text-center text-[10px] text-amber-400 font-bold tracking-wide">
                    [TRYB DEMO — SYMULACJA LOKALNA, BRAK ZAPISU W BAZIE DANYCH]
                  </div>

                  {confirmed && (
                    <div className="text-center text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-lg py-1 px-2">
                      ℹ Symulacja interfejsu: Brak rzeczywistego zapisu w bazie danych Supabase.
                    </div>
                  )}

                  <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                    <Users className="w-3 h-3 text-sky-400" />
                    <span>
                      {confirmed ? "15 z 16" : "14 z 16"} zawodników w podglądzie listy
                    </span>
                  </div>
                </div>
              </>
            ) : nextAction.status === "empty" ? (
              /* EMPTY STATE: NO CTA, NO FAKE COUNTDOWN, NO CONFIRMATION BUTTON */
              <div className="p-4 text-center bg-slate-950/70 border border-slate-800 rounded-xl">
                <Calendar className="w-7 h-7 mx-auto text-slate-500 mb-1.5" />
                <div className="text-xs font-bold text-slate-200">Brak zaplanowanych meczów ligowych</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Terminarz na kolejny weekend zostanie ogłoszony przez sztab szkoleniowy po treningu.
                </div>
              </div>
            ) : (
              /* UNAVAILABLE STATE: ACCESS RESTRICTED */
              <div className="p-4 text-center bg-slate-950/70 border border-slate-800 rounded-xl">
                <Lock className="w-6 h-6 mx-auto text-amber-500/80 mb-1.5" />
                <div className="text-xs font-bold text-slate-200">Harmonogram meczowy jest zastrzeżony</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Dostęp do szczegółów zbiórki i składu wymaga aktywnego profilu zawodnika lub rodzica.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================================== */}
        {/* 3. KOLEKCJA: KARTA ZAWODNIKA (DeltaCard) + SKARBIEC PACZEK (RIGHT)  */}
        {/* =================================================================== */}
        <section
          data-testid="e41-collection-section"
          className="e41-col-right bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                Kolekcja DELTA INFERNO
              </h2>
            </div>
            {albumProgress.status === "available" && (
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                ULTRA 2026/27
              </span>
            )}
          </div>

          {/* Available State: Authentic DeltaCard + Progress */}
          {albumProgress.status === "available" && recentCards.status === "available" ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
              {/* DeltaCard Renderer with Safe Neutral Silhouette */}
              <div className="sm:col-span-5 flex justify-center">
                <div className="w-44 max-w-full">
                  <DeltaCard
                    card={eliteCardModel}
                    player={{
                      id: profile.player.data?.id || "demo-player-alpha",
                      display_name: playerName,
                      shirt_number: shirtNumber !== null ? String(shirtNumber) : null,
                      position: position || null
                    }}
                    themeOverride="INFERNO"
                    size="responsive"
                    staticFace="front"
                    interactive={true}
                    className="shadow-2xl shadow-black/80"
                  />
                </div>
              </div>

              {/* Album Counter & Pack Unlock Action */}
              <div className="sm:col-span-7 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Album Klubowy</span>
                    </span>
                    <span className="text-amber-400 font-black e41-num">
                      {albumData?.percent ?? 75}% UKOŃCZENIA
                    </span>
                  </div>

                  {/* Album Progress Track */}
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${albumData?.percent ?? 75}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Zdobyte: <strong className="text-white e41-num">{albumData?.owned ?? 48}</strong> z {albumData?.total ?? 64} kart</span>
                    <span>Duplikaty: <strong className="text-slate-200 e41-num">{albumData?.duplicates ?? 3}</strong></span>
                  </div>
                </div>

                {/* Action: Open Pack */}
                <div>
                  <Link
                    href="/preview/pack-demo"
                    className="e41-btn-action e41-btn-gold w-full min-h-[44px] py-2 px-3 text-xs flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>OTWÓRZ PACZKĘ ({albumData?.unopenedPacks ?? 3})</span>
                  </Link>
                  <div className="text-center text-[10px] text-slate-400 mt-1">
                    1 nowa paczka meczowa czeka po rozegraniu meczu
                  </div>
                </div>
              </div>
            </div>
          ) : albumProgress.status === "empty" ? (
            /* Empty State: Album empty */
            <div className="p-5 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
              <div className="text-xs font-bold text-slate-200">Twój album DELTA INFERNO jest pusty</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Nie posiadasz jeszcze odblokowanych kart w bieżącym sezonie. Odbierz pierwszą paczkę startową.
              </p>
              <div className="pt-2">
                <Link
                  href="/preview/pack-demo"
                  className="e41-btn-action e41-btn-primary text-xs py-2 px-4"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ODBIERZ PACZKĘ STARTOWĄ</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Unavailable State: Access Restricted — ZERO CARD OR STATS LEAK */
            <div className="p-5 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
              <Lock className="w-7 h-7 mx-auto text-amber-500/80" />
              <div className="text-xs font-bold text-slate-200">Kolekcja kart jest zastrzeżona</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Dostęp do albumu, paczek i statystyk zawodnika wymaga zalogowania na profil członka klubu DELTA.
              </p>
            </div>
          )}
        </section>

        {/* =================================================================== */}
        {/* 4. PROGRES: POZIOM, XP, ODZNAKA, FREKWENCJA (RIGHT ON DESKTOP)      */}
        {/* =================================================================== */}
        <div className="e41-col-right">
          {progress.status === "available" && levelData ? (
            <section className="grid grid-cols-2 gap-2.5">
              {/* Level & XP */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Poziom Zawodnika
                  </div>
                  <div className="text-base font-black text-white flex items-baseline gap-1.5 mt-0.5">
                    <span className="e41-num text-lg text-sky-400">Lvl {levelData.level}</span>
                    <span className="text-[11px] font-bold text-slate-400 truncate">{levelData.title}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{levelData.currentLevelXP} / {levelData.nextLevelXP} XP</span>
                    <span className="text-sky-400 font-bold e41-num">{levelData.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-sky-300 h-full rounded-full"
                      style={{ width: `${levelData.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Latest Milestone Badge */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Ostatnia Odznaka
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        {recentAchievements.data?.[0]?.name ?? "Odznaka Zaangażowania"}
                      </div>
                      <div className="text-[9px] text-amber-400 font-bold truncate">
                        {recentAchievements.data?.[0]?.description ?? "Aktywny udział w treningach"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Seria: <strong className="text-emerald-400 e41-num">{levelData.activityStreak} dni</strong></span>
                  <span>Maks: <strong className="text-slate-300 e41-num">{levelData.maxStreak} dni</strong></span>
                </div>
              </div>
            </section>
          ) : progress.status === "empty" ? (
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
              Poziom 1 (Nowicjusz) · Weź udział w pierwszym treningu, aby zacząć zdobywać punkty XP.
            </div>
          ) : (
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
              Moduł rozwoju i odznak wymaga przypisanego konta klubowego.
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 5. PREZENTACJA DRUŻYNY: TEAM SHOWCASE V3 PREVIEW (LEFT ON DESKTOP) */}
        {/* =================================================================== */}
        <div className="e41-col-left">
          {teamShowcase.status === "available" && teamShowcase.data && teamShowcase.data.featuredPlayers.length > 0 ? (
            <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-black text-white tracking-wide uppercase">
                    Kadra Rocznika 2018 (U-9)
                  </h3>
                </div>
                <Link
                  href="/preview/team-showcase-v3"
                  className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                >
                  <span>Team Showcase</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {teamShowcase.data.featuredPlayers.slice(0, 4).map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2"
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-sky-500/40 text-sky-300 font-black text-xs flex items-center justify-center shrink-0 e41-num">
                      #{p.shirtNumber ?? "-"}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {p.displayName.split(" ")[0]}
                      </div>
                      <div className="text-[10px] text-slate-400">{p.position || "POM"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : teamShowcase.status === "empty" ? (
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
              Skład drużyny rocznika 2018 jest w trakcie kompletowania.
            </div>
          ) : (
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
              Skład drużyny jest dostępny wyłącznie dla zweryfikowanych członków klubu.
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 6. MAKSYMALNIE TRZY KOMUNIKATY KLUBOWE (LEFT ON DESKTOP)           */}
        {/* =================================================================== */}
        <div className="e41-col-left">
          {clubCommunications.status === "available" && clubCommunications.data && clubCommunications.data.length > 0 ? (
            <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black text-white tracking-wide uppercase">
                    Komunikaty Klubu i Trenera
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">
                  {Math.min(clubCommunications.data.length, 3)} AKTUALNOŚCI
                </span>
              </div>

              <div className="space-y-2">
                {clubCommunications.data.slice(0, 3).map((comm) => (
                  <div key={comm.id} className="e41-news-row">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${comm.urgent ? "bg-amber-400" : "bg-sky-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{comm.title}</span>
                        {comm.urgent && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">PILNE</span>
                        )}
                      </div>
                      {comm.summary && (
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                          {comm.summary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : clubCommunications.status === "empty" ? (
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
              Brak nowych ogłoszeń na tablicy klubowej.
            </div>
          ) : (
            <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
              Komunikaty klubowe są dostępne po zalogowaniu na konto klubowe.
            </div>
          )}
        </div>

        </div> {/* Closing e41-layout-grid */}

        {/* =================================================================== */}
        {/* 7. SZYBKI DOSTĘP DO POZOSTAŁYCH FUNKCJI KLUBOWYCH                   */}
        {/* =================================================================== */}
        <footer className="pt-3 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-3">
          <Link href="/preview/pack-demo" className="text-sky-400 hover:underline font-bold">
            Centrum Paczek
          </Link>
          <span>·</span>
          <Link href="/preview/team-showcase-v3" className="text-amber-300 hover:underline font-bold">
            Team Showcase 3.0
          </Link>
          <span>·</span>
          <span>DELTA WARSZAWA U-9 · 2026/27</span>
        </footer>
      </main>
    </div>
  );
}
