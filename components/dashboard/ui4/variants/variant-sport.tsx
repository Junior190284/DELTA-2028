"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Shield,
  Bell,
  ArrowRight,
  AlertCircle,
  FileText,
  ChevronRight,
  Flame,
  Award,
  Activity
} from "lucide-react";
import type { DashboardUI4Model } from "../types";
import { DeltaDesktopSidebar } from "../delta-desktop-sidebar";
import { DeltaMobileBottomNav } from "../delta-mobile-nav";

interface VariantProps {
  model: DashboardUI4Model;
}

export function VariantSport({ model }: VariantProps) {
  const [confirmed, setConfirmed] = useState(false);
  const { profile, nextAction, teamShowcase, clubCommunications, albumProgress } = model;

  const isParent = profile.actorKind === "parent";
  const playerName = profile.player.data?.displayName || profile.displayName;
  const shirtNumber = profile.player.data?.shirtNumber ?? 7;
  const position = profile.player.data?.position ?? "POM";
  const isRestricted = profile.player.status === "unavailable";
  const albumData = albumProgress.data;

  return (
    <div className="variant-shell variant-sport-theme">
      <div className="d4-desktop-shell">
        {/* Desktop Sidebar (visible on lg+) */}
        <DeltaDesktopSidebar
          profile={profile}
          activeItem="dashboard"
          unopenedPacks={albumData?.unopenedPacks ?? 0}
          variantTheme="sport"
        />

        <div className="d4-desktop-content pb-24 lg:pb-12">
          {/* 1. TOP CLUB IDENTITY HEADER */}
          <header className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
            <div className="d4-container-desktop flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-sky-500/30 flex items-center justify-center overflow-hidden p-1 shadow-md">
                  <Image
                    src="/teamlogos/gm.png"
                    alt="Herb Delta"
                    width={34}
                    height={34}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
                    DELTA WARSZAWA · ROCZNIK 2018 (U-9)
                  </div>
                  <div className="text-sm lg:text-base font-black text-slate-100 flex items-center gap-2">
                    <span>{profile.teamName || "U-9 DELTA CHAMPIONS"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-semibold">
                      LIGA ŻAKÓW
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs sm:text-sm font-bold text-slate-200">
                  {isParent ? `${profile.displayName} (Rodzic)` : playerName}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isParent ? `Zawodnik: ${playerName}` : `#${shirtNumber} · ${position}`}
                </div>
              </div>
            </div>
          </header>

          <main className="d4-container-desktop pt-5 space-y-6 relative z-10">
            {/* Desktop 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT PRIMARY COLUMN: Matchday Command Center (Cols 1-8) */}
              <div className="lg:col-span-8 space-y-6">
                {/* 2. DOMINANT HERO: THE MATCHDAY CENTER */}
                <section
                  data-testid="sport-dominant-hero"
                  className="sport-hero-banner relative p-5 sm:p-7 text-white"
                >
                  {/* Authentic Stadium Atmosphere Background */}
                  <div
                    className="sport-hero-bg"
                    style={{
                      backgroundImage: `url('/assets/broadcast-home-banner.jpg')`
                    }}
                  />

                  <div className="relative z-10 flex flex-col gap-5">
                    {/* Competition Badge & Countdown */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="sport-badge-pill bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        <Shield className="w-3.5 h-3.5" />
                        <span>NAJBLIŻSZY MECZ LIGOWY · KOLEJKA 14</span>
                      </div>
                      <div className="sport-badge-pill bg-amber-500/20 text-amber-300 border border-amber-500/30 delta-num">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{nextAction.data?.countdown || "ZA 2 DNI 4 GODZ"}</span>
                      </div>
                    </div>

                    {/* Teams Matchup Header */}
                    {nextAction.status === "available" && nextAction.data ? (
                      <div className="bg-slate-950/75 border border-slate-800/90 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
                        <div className="grid grid-cols-7 items-center text-center gap-2">
                          {/* Home Team (Delta) */}
                          <div className="col-span-3 flex flex-col items-center sm:flex-row sm:text-left gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-amber-500/40 p-1.5 flex items-center justify-center shrink-0 shadow-lg">
                              <Image
                                src="/teamlogos/gm.png"
                                alt="Delta"
                                width={44}
                                height={44}
                                className="object-contain"
                              />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase text-sky-400">Gospodarz</div>
                              <div className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-white uppercase truncate max-w-full">
                                {profile.teamName || "DELTA WARSZAWA"}
                              </div>
                              <div className="text-xs text-slate-400">Zespół Gospodarzy</div>
                            </div>
                          </div>

                          {/* Kickoff / VS */}
                          <div className="col-span-1 flex flex-col items-center">
                            <div className="text-xs font-black text-amber-400 tracking-wider">VS</div>
                            <div className="text-base sm:text-xl lg:text-2xl font-black delta-num text-white">11:30</div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">DZIEŃ MECZOWY</div>
                          </div>

                          {/* Away Team (Opponent) */}
                          <div className="col-span-3 flex flex-col items-center sm:flex-row-reverse sm:text-right gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shrink-0 shadow-lg text-slate-400">
                              <Shield className="w-8 h-8" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase text-slate-400">Gość</div>
                              <div className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-white uppercase truncate max-w-full">
                                {nextAction.data?.opponent || "DRUŻYNA RYWALA"}
                              </div>
                              <div className="text-xs text-slate-400">Zespół Gości</div>
                            </div>
                          </div>
                        </div>

                        {/* Match Logistics Ribbon */}
                        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="truncate">{nextAction.data?.location || "Obiekt klubowy DELTA"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Zbiórka: 45 min przed meczem</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Status: Zaplanowany</span>
                          </div>
                        </div>

                        {/* Dominant Hero CTA Button (Only when event available) */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => setConfirmed(!confirmed)}
                            className={`delta-btn-action w-full sm:w-auto px-6 py-3 min-h-[48px] text-xs sm:text-sm font-black ${
                              confirmed
                                ? "bg-emerald-700 text-white shadow-lg shadow-emerald-950/40"
                                : "delta-btn-primary"
                            }`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>
                              {confirmed
                                ? "SYMULACJA: OBECNOŚĆ ZAZNACZONA LOKALNIE ✓"
                                : "SYMULACJA: POTWIERDŹ OBECNOŚĆ [TRYB DEMO]"}
                            </span>
                          </button>

                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <Users className="w-4 h-4 text-sky-400" />
                            <span>
                              {confirmed ? "15 z 16" : "14 z 16"} zawodników w podglądzie
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : nextAction.status === "empty" ? (
                      <div className="delta-state-empty">
                        <Calendar className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                        <p className="text-sm font-semibold text-slate-300">Brak zaplanowanych meczów ligowych w tym tygodniu</p>
                        <p className="text-xs text-slate-500 mt-1">Harmonogram pojawi się po zatwierdzeniu przez trenera</p>
                      </div>
                    ) : (
                      <div className="delta-state-unavailable">
                        <AlertCircle className="w-6 h-6 text-slate-500 mb-1" />
                        <p className="text-sm font-semibold text-slate-400">Terminarz meczowy jest zastrzeżony dla Twojego profilu</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. SQUAD LINEUP & ATTENDANCE READINESS */}
                <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-sky-400" />
                      <h2 className="text-base font-bold text-white tracking-wide">
                        Kadra Meczowa U-9 na Sobotę
                      </h2>
                    </div>
                    <Link
                      href="/preview/team-showcase-v3"
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                    >
                      <span>Pełny skład</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {teamShowcase.status === "available" && teamShowcase.data ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {teamShowcase.data.featuredPlayers.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="sport-lineup-pill flex items-center justify-between gap-2 p-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-slate-950 border border-sky-500/40 text-sky-300 font-black text-xs flex items-center justify-center shrink-0 delta-num">
                              {p.shirtNumber ?? "-"}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {p.displayName}
                              </div>
                              <div className="text-[10px] text-slate-400">{p.position || "POM"}</div>
                            </div>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">Skład meczowy zostanie ogłoszony w piątek po treningu.</p>
                  )}
                </section>

                {/* 4. CLUB WIRE & COACH BRIEFING */}
                <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-400" />
                      <h2 className="text-base font-bold text-white tracking-wide">
                        Tablica Trenera i Komunikaty Klubu
                      </h2>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                      3 AKTUALNOŚCI
                    </span>
                  </div>

                  {clubCommunications.status === "available" && clubCommunications.data && clubCommunications.data.length > 0 ? (
                    <div className="space-y-3">
                      {clubCommunications.data.map((comm) => (
                        <div
                          key={comm.id}
                          className={`p-4 rounded-xl border transition ${
                            comm.urgent
                              ? "bg-amber-950/20 border-amber-500/40 text-amber-100"
                              : "bg-slate-950/50 border-slate-800/80 text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {comm.urgent && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                                  PILNE
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-bold text-white">{comm.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 delta-num">Dzisiaj, 09:30</span>
                          </div>
                          {comm.summary && (
                            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed mt-1">
                              {comm.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">Brak nowych komunikatów na tablicy.</p>
                  )}
                </section>
              </div>

              {/* RIGHT SECONDARY COLUMN: Player Passport & Logistics Radar (Cols 9-12) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Athletic Passport Widget */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                      Paszport Zawodnika
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      DELTA SPORT
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-sky-500/40 p-1 flex items-center justify-center shrink-0 shadow-lg">
                      <Image
                        src="/teamlogos/gm.png"
                        alt="Delta"
                        width={44}
                        height={44}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-base font-black text-white">{playerName}</div>
                      <div className="text-xs text-slate-400 font-medium">
                        {profile.teamName || "Drużyna U-9"} · #{shirtNumber} ({position})
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-800/70">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Frekwencja</div>
                      <div className="text-base font-black text-emerald-400 delta-num mt-0.5">94%</div>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Seria Meczowa</div>
                      <div className="text-base font-black text-amber-400 delta-num mt-0.5">7 DNI</div>
                    </div>
                  </div>
                </div>

                {/* Weekly Schedule Radar */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Harmonogram Tygodnia
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Tydzień 47</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Trening Taktyczny</div>
                        <div className="text-[10px] text-slate-400">Czwartek · 17:00 · Boisko A</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold">
                        OBECNY
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-sky-300">Mecz Ligowy (Kolejka 14)</div>
                        <div className="text-[10px] text-slate-300">Sobota · 11:30 · Główny Stadion</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                        CEL
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. MINIMALIST COLLECTOR TEASER */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Kolekcja DELTA INFERNO</div>
                      <div className="text-[11px] text-slate-400">
                        Paczka meczowa czeka na otwarcie po spotkaniu.
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/preview/pack-demo"
                    className="delta-btn-action delta-btn-secondary text-xs shrink-0 py-2 px-3.5 min-h-[40px] font-bold"
                  >
                    <span>Otwórz</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <DeltaMobileBottomNav
            unopenedPacks={albumData?.unopenedPacks ?? 0}
            activeItem="dashboard"
          />
        </div>
      </div>
    </div>
  );
}

export default VariantSport;
