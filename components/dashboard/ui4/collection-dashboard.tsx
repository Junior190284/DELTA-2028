"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Award,
  ChevronRight,
  BookOpen,
  Trophy,
  Flame,
  Shield,
  ArrowRight,
  Calendar,
  Lock,
  Clock,
  Star,
  CheckCircle2
} from "lucide-react";
import DeltaCard from "@/components/cards/DeltaCard";
import type { DashboardUI4Model } from "./types";
import { DeltaDesktopSidebar } from "./delta-desktop-sidebar";
import { DeltaMobileBottomNav } from "./delta-mobile-nav";

interface CollectionDashboardProps {
  model: DashboardUI4Model;
}

function formatUnlockedBadgeCount(status: string, count: number): string {
  if (status !== "available" && status !== "empty") {
    return "—";
  }
  if (count === 1) return "1 ODBLOKOWANA";
  if (count >= 2 && count <= 4) return `${count} ODBLOKOWANE`;
  return `${count} ODBLOKOWANYCH`;
}

export function CollectionDashboard({ model }: CollectionDashboardProps) {
  const {
    profile,
    progress,
    recentCards,
    albumProgress,
    recentAchievements,
    nextAction
  } = model;

  const isParent = profile.actorKind === "parent";
  const isRestricted = profile.player.status === "unavailable";
  const playerName = profile.player.data?.displayName || profile.displayName;
  const shirtNumber = profile.player.data?.shirtNumber ?? 7;
  const position = profile.player.data?.position ?? "NAP";
  const levelData = progress.data;
  const albumData = albumProgress.data;

  // Safe player card model for the hero card (zero PII, neutral persona)
  const eliteCardModel = {
    id: "card-demo-alpha",
    playerId: profile.player.data?.id || "demo-player-alpha",
    playerName: playerName.toUpperCase(),
    shirtNumber: shirtNumber !== null ? String(shirtNumber) : "7",
    position: position || "ZAWODNIK",
    cardType: "INFERNO" as const,
    rarity: "inferno" as const,
    playerImage: null
  };

  return (
    <div className="e41-root">
      <div className="d4-desktop-shell">
        {/* Desktop Sidebar Navigation */}
        <DeltaDesktopSidebar
          profile={profile}
          activeItem="collection"
          unopenedPacks={albumData?.unopenedPacks ?? 0}
          collectionPercent={albumProgress.status === "available" ? (albumData?.percent ?? null) : null}
          variantTheme="collector"
        />

        <div className="d4-desktop-content pb-24 lg:pb-12">
          {/* Ambient Gold/Inferno Lighting */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] pointer-events-none z-0"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.16) 0%, rgba(220, 38, 38, 0.07) 35%, rgba(5, 11, 20, 0) 70%)"
            }}
          />

          {/* ===================================================================== */}
          {/* 1. TOP APP BAR (Compact on mobile, full identity on desktop)          */}
          {/* ===================================================================== */}
          <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-amber-500/25 px-4 py-2.5">
            <div className="d4-container-desktop flex items-center justify-between gap-2">
              {/* Club & Vault Identity */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
                  <div className="w-full h-full bg-slate-950 rounded-[9px] sm:rounded-[10px] flex items-center justify-center p-1">
                    <Image
                      src="/teamlogos/gm.png"
                      alt="Delta"
                      width={30}
                      height={30}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5 sm:gap-2">
                    <span>DELTA INFERNO · VAULT</span>
                    <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      SKARBIEC KART
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-black text-white truncate">
                    Kolekcja Kart i Album Cyfrowy
                  </div>
                  <div className="hidden sm:block text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    Sezon 2026/27 · Rocznik 2018 (U-9)
                  </div>
                </div>
              </div>

              {/* Action back to Home Dashboard */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/preview/dashboard-ui4?view=home"
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 hover:text-white transition focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180 text-sky-400" />
                  <span className="hidden sm:inline">DO PULPITU GŁÓWNEGO</span>
                  <span className="sm:hidden">PULPIT</span>
                </Link>

                <Link
                  href="/preview/pack-demo"
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black hover:bg-amber-500/30 transition shadow-sm e41-num focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{albumData?.unopenedPacks ?? 3} PACZKI</span>
                </Link>
              </div>
            </div>
          </header>

          {/* ===================================================================== */}
          {/* MAIN COLLECTION GRID (DESKTOP BALANCED 2-LEVEL ARCHITECTURE)          */}
          {/* ===================================================================== */}
          <main className="d4-container-desktop relative z-10">
            
            {/* ----------------------------------------------------------------- */}
            {/* ROW 1: 2-COLUMN PRIMARY WORKSPACE (DeltaCard Hero vs Album/Drops) */}
            {/* ----------------------------------------------------------------- */}
            <div className="d4-dashboard-row-1">
              
              {/* LEFT SHOWCASE COLUMN: HERO INFERNO CARD & PACK VAULT (5 COLS) */}
              <div className="lg:col-span-5 flex flex-col">
                <section
                  data-testid="e41-collection-section"
                  className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 rounded-3xl p-4 sm:p-5 text-center overflow-hidden shadow-2xl flex flex-col items-center"
                >
                  {/* Subtle ambient light */}
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2.5 shadow">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>GŁÓWNA KARTA ZAWODNIKA · EDYCJA INFERNO</span>
                    </div>

                    {/* High-Fidelity Card Renderer */}
                    {albumProgress.status === "available" && recentCards.status === "available" ? (
                      <div className="w-[210px] sm:w-[230px] my-1 transition duration-300 hover:scale-105">
                        <DeltaCard
                          card={eliteCardModel}
                          size="responsive"
                          interactive={true}
                          showFlip={false}
                          className="mx-auto drop-shadow-[0_12px_28px_rgba(245,158,11,0.22)]"
                        />
                      </div>
                    ) : (
                      <div className="w-full py-10 px-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                        <Lock className="w-8 h-8 mx-auto text-amber-500/60" />
                        <div className="text-sm font-bold text-slate-300">
                          Kolekcja kart jest zastrzeżona
                        </div>
                        <div className="text-xs text-slate-500">
                          Dostęp do kart zawodnika wymaga zalogowania na profil członka klubu DELTA.
                        </div>
                      </div>
                    )}

                    {/* Card Identity & Persona Details */}
                    <div className="w-full mt-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/25 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-left">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="font-extrabold text-white">{playerName}</span>
                        <span className="text-slate-400 font-medium">#{shirtNumber} ({position})</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        INFERNO 26/27
                      </span>
                    </div>

                    {/* Big Action Button: Open New Pack */}
                    <div className="mt-3 w-full">
                      {albumData && albumData.unopenedPacks > 0 ? (
                        <Link
                          href="/preview/pack-demo"
                          className="e41-btn-action e41-btn-gold w-full min-h-[46px] text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>OTWÓRZ NOWĄ PACZKĘ ({albumData.unopenedPacks} DOSTĘPNE)</span>
                        </Link>
                      ) : (
                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 font-bold text-xs">
                          BRAK NOWYCH PACZEK DO OTWARCIA
                        </div>
                      )}
                    </div>

                    {/* Key Collection Metrics Grid */}
                    <div className="mt-3 w-full grid grid-cols-3 gap-2">
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-base sm:text-lg lg:text-xl font-black text-white e41-num">
                          {albumData ? albumData.owned : "—"} {albumData?.total != null ? <span className="text-xs text-slate-400 font-normal">/ {albumData.total}</span> : null}
                        </div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mt-0.5">
                          Unikalne Karty {albumData?.percent != null ? `(${albumData.percent}%)` : ""}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-base sm:text-lg lg:text-xl font-black text-white e41-num">
                          {albumData ? albumData.duplicates : "—"}
                        </div>
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide mt-0.5">
                          Duplikaty w Kolekcji
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                        <div className="text-base sm:text-lg lg:text-xl font-black text-white e41-num">
                          {albumData ? albumData.unopenedPacks : "—"}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mt-0.5">
                          Paczki do Otwarcia
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT GALLERY COLUMN: ALBUM MATRIX & RECENT DROPS (7 COLS) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                
                {/* 2A. ALBUM BINDER PROGRESS & SUB-COLLECTIONS */}
                <section className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Serie i Sekcje w Albumie Klubowym
                      </h2>
                    </div>
                    <span className="text-xs text-amber-400 font-bold e41-num">
                      {albumData?.percent != null ? `${albumData.percent}% UKOŃCZENIA` : "Mianownik: Oczekuje na publikację sezonu"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(albumData?.series && albumData.series.length > 0 ? albumData.series : [
                      { id: "base", name: "Karty Podstawowe (Base)", category: "base" as const, owned: 0, total: null, percent: null },
                      { id: "matchday", name: "Karty Meczowe (Matchday)", category: "matchday" as const, owned: 0, total: null, percent: null },
                      { id: "inferno", name: "Karty Specjalne (Inferno)", category: "inferno" as const, owned: 0, total: null, percent: null }
                    ]).map((s) => {
                      const colorGradient = s.category === "inferno"
                        ? "from-red-500 to-amber-500"
                        : s.category === "matchday"
                        ? "from-sky-500 to-emerald-400"
                        : "from-amber-500 to-amber-300";
                      return (
                        <div key={s.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-semibold">{s.name}</span>
                            <span className="text-amber-400 font-bold e41-num">
                              {s.owned} {s.total != null ? `/ ${s.total} KART (${s.percent}%)` : "KART W KOLEKCJI"}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className={`bg-gradient-to-r ${colorGradient} h-full rounded-full transition-all duration-500`}
                              style={{ width: s.percent != null ? `${s.percent}%` : `${Math.min(100, Math.max(s.owned > 0 ? 15 : 0, s.owned * 12))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 2B. RECENT CARD DROPS GALLERY (4 cards) */}
                <section className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Ostatnio Zdobyte Karty
                      </h2>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      Ostatnie 4 dropy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {recentCards.status === "available" && recentCards.data && recentCards.data.length > 0 ? (
                      recentCards.data.map((card, i) => {
                        const rarity = (card.rarity || "COMMON").toUpperCase();
                        const glow =
                          rarity === "INFERNO"
                            ? "border-red-500/50 bg-red-950/20 text-red-400"
                            : rarity === "GOLD"
                            ? "border-amber-500/50 bg-amber-950/20 text-amber-400"
                            : rarity === "SILVER"
                            ? "border-slate-400/40 bg-slate-800/30 text-slate-300"
                            : "border-slate-700 bg-slate-900/40 text-slate-400";
                        return (
                          <div
                            key={card.userCardId || i}
                            className={`p-3 rounded-2xl border ${glow} flex flex-col items-center text-center transition hover:scale-105 shadow-md backdrop-blur-sm`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 mb-1.5 shadow">
                              <Image
                                src="/teamlogos/gm.png"
                                alt="Crest"
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>
                            <div className="text-xs font-black text-white truncate max-w-full">{card.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold truncate max-w-full">
                              {card.playerName || "ZAWODNIK"}
                            </div>
                            <span className="text-[9px] font-black mt-0.5 e41-num">{rarity}</span>
                          </div>
                        );
                      })
                    ) : recentCards.status === "empty" ? (
                      <div className="col-span-full py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                        Brak jeszcze kart w kolekcji — otwórz pierwszą paczkę!
                      </div>
                    ) : (
                      <div className="col-span-full py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                        Kolekcja kart niedostępna dla tego profilu.
                      </div>
                    )}
                  </div>
                </section>

              </div>

            </div>

            {/* ----------------------------------------------------------------- */}
            {/* ROW 2: SECONDARY WORKSPACE (Badges & Trophies vs Match Pack Radar)*/}
            {/* ----------------------------------------------------------------- */}
            <div className="d4-dashboard-row-2">
              
              {/* 3A. COLLECTOR ACHIEVEMENTS & TROPHIES (6 COLS) */}
              <div className="lg:col-span-6 flex flex-col">
                <section className="bg-slate-900/65 border border-slate-800/85 rounded-2xl p-4 sm:p-5 backdrop-blur-md h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Odznaki i Osiągnięcia Kolekcjonerskie
                      </h2>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                      {formatUnlockedBadgeCount(recentAchievements.status, recentAchievements.data?.length ?? 0)}
                    </span>
                  </div>

                  {recentAchievements.status === "available" && recentAchievements.data && recentAchievements.data.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {recentAchievements.data.map((ach) => (
                        <div key={ach.id} className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/30 flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Star className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{ach.name}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold">{ach.description || "Odblokowane ✓"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentAchievements.status === "available" || recentAchievements.status === "empty" ? (
                    <div className="py-6 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        Brak zdobytych odznak w tym sezonie
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Odznaki przyznawane są za obecność na treningach, mecze i postawę sportową.
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        {recentAchievements.reason === "no_linked_player"
                          ? "Brak powiązanego profilu zawodnika"
                          : recentAchievements.reason === "not_authorized"
                          ? "Brak uprawnień do profilu zawodnika"
                          : "Osiągnięcia niedostępne"}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* 3B. MATCHDAY PACK DROP RADAR (6 COLS) */}
              <div className="lg:col-span-6 flex flex-col">
                <section className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-sky-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md h-full flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Radar Wydarzeń Sportowych
                      </h2>
                    </div>
                    <span className="text-xs text-sky-400 font-bold uppercase">
                      {nextAction.status === "available" && nextAction.data
                        ? (nextAction.data.countdown || "ZAPLANOWANE")
                        : "BRAK WYDARZEŃ"}
                    </span>
                  </div>

                  {nextAction.status === "available" && nextAction.data ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">{nextAction.data.title}</div>
                          <div className="text-[11px] text-slate-300">
                            {nextAction.data.kind === "match" ? "Najbliższy mecz ligowy: " : "Najbliższy trening: "}
                            <strong className="text-amber-400">{nextAction.data.location || "Centrum DELTA"}</strong>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/preview/dashboard-ui4?view=home"
                        className="e41-btn-action e41-btn-primary text-xs shrink-0 py-2.5 px-4 min-h-[40px] font-bold"
                      >
                        <span>Szczegóły wydarzenia →</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-6 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center">
                      <p className="text-xs text-slate-400 font-medium">
                        Brak zaplanowanych meczów ani treningów w najbliższym czasie.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Paczki meczowe zostaną przydzielone po potwierdzeniu obecności na oficjalnych rozgrywkach.
                      </p>
                    </div>
                  )}
                </section>
              </div>

            </div>

          </main>

          {/* Mobile Bottom Navigation */}
          <DeltaMobileBottomNav
            unopenedPacks={albumData?.unopenedPacks ?? 0}
            activeItem="collection"
          />
        </div>
      </div>
    </div>
  );
}

export default CollectionDashboard;
