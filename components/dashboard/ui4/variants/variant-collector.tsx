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
    <div className="variant-shell variant-collector-theme pb-16">
      {/* 1. TOP COLLECTOR VAULT BAR */}
      <header className="border-b border-amber-500/20 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                DELTA INFERNO · VAULT
              </div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>SKARBIEC KART</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold delta-num">
                  SEZON 2026/27
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/preview/pack-demo"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition shadow-sm delta-num"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{albumData?.unopenedPacks ?? 3} PACZKI</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
        {/* 2. DOMINANT HERO: THE SIGNATURE CARD SHOWCASE */}
        <section
          data-testid="collector-dominant-hero"
          className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center overflow-hidden shadow-2xl"
        >
          {/* Subtle Ambient Stadium Light Backdrop */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 shadow">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>GŁÓWNA KARTA ZAWODNIKA · EDYCJA SPECJALNA</span>
            </div>

            {/* The 3D Signature Physical Card Preview */}
            <div className="collector-card-container my-2">
              <div className="collector-signature-card">
                {/* Foil Sheen Layer */}
                <div className="collector-foil-sheen" />

                {/* Card Header */}
                <div className="p-3 flex items-center justify-between border-b border-white/10 bg-black/40">
                  <div className="flex items-center gap-1.5">
                    <Image
                      src="/icons/delta-badge-96.png"
                      alt="Delta"
                      width={20}
                      height={20}
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
                  {/* Decorative background rays */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/20 via-transparent to-transparent pointer-events-none" />

                  <div className="w-24 h-24 rounded-2xl bg-slate-900/90 border-2 border-amber-500/60 p-2 shadow-inner flex items-center justify-center mb-3">
                    <Image
                      src="/icons/delta-badge-96.png"
                      alt="Player Crest"
                      width={70}
                      height={70}
                      className="object-contain drop-shadow"
                    />
                  </div>

                  <div className="text-2xl font-black text-white tracking-tight">
                    {playerName}
                  </div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                    KAPITAN · NR #{shirtNumber}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    U-14 DELTA CHAMPIONS 2026/27
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
            <div className="mt-6 w-full max-w-sm">
              <Link
                href="/preview/pack-demo"
                className="delta-btn-action delta-btn-gold w-full text-sm font-extrabold shadow-xl flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>OTWÓRZ NOWĄ PACZKĘ ({albumData?.unopenedPacks ?? 3} DOSTĘPNE)</span>
              </Link>
            </div>

            {/* Key Collection Metrics Grid */}
            <div className="mt-6 w-full max-w-lg grid grid-cols-3 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-2xl font-black text-white delta-num">
                  {albumData?.owned ?? 48} <span className="text-xs text-slate-400 font-normal">/ {albumData?.total ?? 64}</span>
                </div>
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mt-0.5">
                  Karty w Albumie ({albumData?.percent ?? 75}%)
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-2xl font-black text-white delta-num">
                  {levelData?.level ?? 12}
                </div>
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wide mt-0.5">
                  Poziom ({levelData?.currentXP ?? 2450} XP)
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="text-2xl font-black text-white delta-num">
                  {levelData?.activityStreak ?? 7} <span className="text-xs text-slate-400 font-normal">DNI</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mt-0.5">
                  Seria Aktywności
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ALBUM BINDER PROGRESS & SUB-COLLECTIONS */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Serie i Sekcje w Albumie
              </h2>
            </div>
            <span className="text-xs text-amber-400 font-bold delta-num">
              75% UKOŃCZENIA
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Złota Jedenastka (Podstawowa)</span>
                <span className="text-amber-400 font-bold delta-num">11 / 11 (KOMPLET!)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Inferno Masters (Specjalna)</span>
                <span className="text-slate-400 font-bold delta-num">4 / 6</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full w-[66%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Treningowe Talenty U-14</span>
                <span className="text-slate-400 font-bold delta-num">18 / 24</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div className="bg-gradient-to-r from-sky-500 to-sky-400 h-full rounded-full w-[75%]" />
              </div>
            </div>
          </div>
        </section>

        {/* 4. RECENT PACK PULLS */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Ostatnio Zdobyte Karty
              </h2>
            </div>
            <span className="text-xs text-slate-400">Z paczek i meczów</span>
          </div>

          {recentCards.status === "available" && recentCards.data && recentCards.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {recentCards.data.map((card) => (
                <div
                  key={card.userCardId}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3 flex flex-col justify-between transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                      {card.rarity || "KARTA"}
                    </span>
                    <span className="text-[10px] text-slate-500 delta-num">NOWOŚĆ</span>
                  </div>

                  <div className="py-2 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-1 mb-2">
                      <Image
                        src="/icons/delta-badge-96.png"
                        alt="Badge"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {card.name.replace(/\(.*\)/, "")}
                    </div>
                    <div className="text-[10px] text-slate-400">DELTA INFERNO</div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-900 text-center text-[10px] text-sky-400 font-semibold group-hover:underline">
                    Zobacz w Albumie
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">Brak odblokowanych kart. Otwórz swoją pierwszą paczkę powyżej!</p>
          )}
        </section>

        {/* 5. SUBTLE MATCHDAY STATUS CHIP */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Mecz: DELTA vs KS Ursus (Sobota 11:30)</span>
          </div>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            Obecność zgłoszona ✓
          </span>
        </div>
      </main>
    </div>
  );
}
