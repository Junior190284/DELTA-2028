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
  ArrowUpRight,
  Calendar,
  Lock,
  Clock
} from "lucide-react";
import type { DashboardUI4Model } from "../types";
import { DeltaDesktopSidebar } from "../delta-desktop-sidebar";
import { DeltaMobileBottomNav } from "../delta-mobile-nav";

interface VariantProps {
  model: DashboardUI4Model;
}

export function VariantCollector({ model }: VariantProps) {
  const { profile, progress, recentCards, albumProgress, recentAchievements, nextAction } = model;
  const playerName = profile.player.data?.displayName || profile.displayName;
  const shirtNumber = profile.player.data?.shirtNumber ?? 7;
  const levelData = progress.data;
  const albumData = albumProgress.data;

  return (
    <div className="variant-shell variant-collector-theme">
      <div className="d4-desktop-shell">
        {/* Desktop Sidebar (visible on lg+) */}
        <DeltaDesktopSidebar
          profile={profile}
          activeItem="collection"
          unopenedPacks={albumData?.unopenedPacks ?? 3}
          variantTheme="collector"
        />

        <div className="d4-desktop-content pb-24 lg:pb-12">
          {/* 1. TOP COLLECTOR VAULT BAR */}
          <header className="border-b border-amber-500/20 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
            <div className="d4-container-desktop flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 flex items-center justify-center shadow-lg shadow-amber-950/50">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1">
                    <Image
                      src="/teamlogos/gm.png"
                      alt="Delta"
                      width={30}
                      height={30}
                      className="object-contain"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    DELTA INFERNO · VAULT
                  </div>
                  <div className="text-sm lg:text-base font-extrabold text-white flex items-center gap-2">
                    <span>SKARBIEC KART KOLEKCJONERSKICH</span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold delta-num">
                      SEZON 2026/27
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/preview/pack-demo"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition shadow-sm delta-num"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{albumData?.unopenedPacks ?? 3} PACZKI</span>
                </Link>
              </div>
            </div>
          </header>

          <main className="d4-container-desktop pt-5 space-y-6 relative z-10">
            {/* Desktop 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Signature Card Hero & Pack Vault (Cols 1-5) */}
              <div className="lg:col-span-5 space-y-6">
                {/* 2. DOMINANT HERO: THE SIGNATURE CARD SHOWCASE */}
                <section
                  data-testid="collector-dominant-hero"
                  className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/30 rounded-3xl p-6 text-center overflow-hidden shadow-2xl"
                >
                  {/* Subtle Ambient Stadium Light Backdrop */}
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 shadow">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>GŁÓWNA KARTA ZAWODNIKA · EDYCJA SPECJALNA</span>
                    </div>

                    {/* The 3D Signature Physical Card Preview */}
                    <div className="collector-card-container my-2 max-w-[240px]">
                      <div className="collector-signature-card">
                        {/* Foil Sheen Layer */}
                        <div className="collector-foil-sheen" />

                        {/* Card Header */}
                        <div className="p-3 flex items-center justify-between border-b border-white/10 bg-black/40">
                          <div className="flex items-center gap-1.5">
                            <Image
                              src="/teamlogos/gm.png"
                              alt="Delta"
                              width={22}
                              height={22}
                              className="object-contain"
                            />
                            <span className="text-[10px] font-black tracking-widest text-amber-300">
                              DELTA INFERNO
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-red-600/80 text-[9px] font-black text-white uppercase tracking-wider">
                            ULTRA
                          </span>
                        </div>

                        {/* Card Artwork / Body with Authentic Club Graphics */}
                        <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-[#180d0d] to-slate-950 flex flex-col items-center justify-center p-4">
                          <div className="w-24 h-24 rounded-2xl bg-slate-900/90 border-2 border-amber-500/60 p-2 shadow-inner flex items-center justify-center mb-3">
                            <Image
                              src="/teamlogos/gm.png"
                              alt="Player Crest"
                              width={70}
                              height={70}
                              className="object-contain drop-shadow"
                            />
                          </div>

                          <div className="text-xl lg:text-2xl font-black text-white tracking-tight">
                            {playerName}
                          </div>
                          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                            KAPITAN · NR #{shirtNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            ROCZNIK 2018 · U-9 DELTA
                          </div>
                        </div>

                        {/* Card Footer Authenticity Strip */}
                        <div className="p-3 bg-black/60 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                          <span className="delta-num font-bold text-amber-400">#007 / INFERNO</span>
                          <span className="font-semibold text-slate-400">IKONA KLUBU</span>
                        </div>
                      </div>
                    </div>

                    {/* Big Unopened Pack Action Button */}
                    <div className="mt-5 w-full">
                      {albumData && albumData.unopenedPacks > 0 ? (
                        <Link
                          href="/preview/pack-demo"
                          className="delta-btn-action delta-btn-gold w-full min-h-[48px] text-xs sm:text-sm font-extrabold shadow-xl flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span>OTWÓRZ NOWĄ PACZKĘ ({albumData.unopenedPacks} DOSTĘPNE)</span>
                        </Link>
                      ) : (
                        <div className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 font-bold text-xs">
                          BRAK NOWYCH PACZEK DO OTWARCIA
                        </div>
                      )}
                    </div>

                    {/* Key Collection Metrics Grid */}
                    <div className="mt-5 w-full grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                        <div className="text-xl lg:text-2xl font-black text-white delta-num">
                          {albumData ? albumData.owned : "—"} <span className="text-xs text-slate-400 font-normal">/ {albumData ? albumData.total : "—"}</span>
                        </div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mt-0.5">
                          Karty {albumData ? `(${albumData.percent}%)` : ""}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                        <div className="text-xl lg:text-2xl font-black text-white delta-num">
                          {levelData ? levelData.level : "—"}
                        </div>
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide mt-0.5">
                          Poziom {levelData ? `(${levelData.currentXP} XP)` : ""}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                        <div className="text-xl lg:text-2xl font-black text-white delta-num">
                          {levelData ? `${levelData.activityStreak} ` : "—"}
                          {levelData && <span className="text-xs text-slate-400 font-normal">DNI</span>}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mt-0.5">
                          Seria Dni
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: Binder Progress & Achievements Matrix (Cols 6-12) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 3. ALBUM BINDER PROGRESS & SUB-COLLECTIONS */}
                <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-400" />
                      <h2 className="text-base font-bold text-white tracking-wide">
                        Serie i Sekcje w Albumie Klubowym
                      </h2>
                    </div>
                    <span className="text-xs text-amber-400 font-bold delta-num">
                      75% UKOŃCZENIA
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-semibold">Złota Jedenastka (Podstawowa)</span>
                        <span className="text-amber-400 font-bold delta-num">11 / 11 (KOMPLET!)</span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full w-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-semibold">Inferno Masters (Specjalna)</span>
                        <span className="text-amber-400 font-bold delta-num">5 / 8 KART</span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full w-[62%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-semibold">Młode Wilki DELTA (Rocznik 2018)</span>
                        <span className="text-amber-400 font-bold delta-num">14 / 16 KART</span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full w-[87%]" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. RECENT CARDS MATRIX */}
                <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-400" />
                      <h2 className="text-base font-bold text-white tracking-wide">
                        Ostatnio Zdobyte Karty
                      </h2>
                    </div>
                    <Link href="/preview/dashboard-ui4#collection" className="text-xs text-sky-400 hover:underline">
                      Zobacz wszystkie (24)
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { name: "Zawodnik Alfa", role: "NAPASTNIK", rarity: "INFERNO", num: "#007", glow: "border-red-500/50 bg-red-950/20" },
                      { name: "Zawodnik Beta", role: "POMOCNIK", rarity: "GOLD", num: "#012", glow: "border-amber-500/50 bg-amber-950/20" },
                      { name: "Zawodnik Gamma", role: "OBROŃCA", rarity: "SILVER", num: "#024", glow: "border-slate-400/40 bg-slate-800/30" },
                      { name: "Zawodnik Delta", role: "BRAMKARZ", rarity: "GOLD", num: "#001", glow: "border-amber-500/50 bg-amber-950/20" }
                    ].map((card, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${card.glow} flex flex-col items-center text-center transition hover:scale-105 shadow-md`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 mb-2 shadow">
                          <Image
                            src="/teamlogos/gm.png"
                            alt="Crest"
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                        <div className="text-xs font-black text-white truncate max-w-full">{card.name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{card.role}</div>
                        <span className="text-[9px] font-black text-amber-300 mt-1 delta-num">{card.rarity} · {card.num}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. MATCH RADAR FOR NEXT DROP */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Najbliższy Mecz Ligowy</div>
                      <div className="text-[11px] text-slate-400">
                        {nextAction.data ? `${nextAction.data.opponent} · Sobota 11:30` : "Sobota 11:30"}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                    +1 PACZKA PO MECZU
                  </span>
                </div>

              </div>

            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <DeltaMobileBottomNav
            unopenedPacks={albumData?.unopenedPacks ?? 3}
            activeItem="collection"
          />
        </div>
      </div>
    </div>
  );
}

export default VariantCollector;
