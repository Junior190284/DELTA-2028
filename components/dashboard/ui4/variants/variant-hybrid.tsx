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
  ArrowUpRight
} from "lucide-react";
import type { DashboardUI4Model } from "../types";

interface VariantProps {
  model: DashboardUI4Model;
}

export function VariantHybrid({ model }: VariantProps) {
  const [confirmed, setConfirmed] = useState(false);
  const { profile, nextAction, progress, recentCards, albumProgress, teamShowcase, clubCommunications } = model;

  const isParent = profile.actorKind === "parent";
  const playerName = profile.player.data?.displayName || profile.displayName;
  const shirtNumber = profile.player.data?.shirtNumber ?? 7;
  const position = profile.player.data?.position ?? "NAP";
  const levelData = progress.data;
  const albumData = albumProgress.data;

  return (
    <div className="variant-shell variant-hybrid-theme pb-16">
      {/* 1. TOP HYBRID STATUS BAR */}
      <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
              <Image
                src="/icons/delta-badge-96.png"
                alt="Delta"
                width={30}
                height={30}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                DELTA HYBRID ELITE · U-14
              </div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{playerName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  KAPITAN #{shirtNumber}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/preview/pack-demo"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition delta-num"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{albumData?.unopenedPacks ?? 3} PACZKI</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-6">
        {/* 2. DOMINANT HERO: DUAL-PILLAR PASSPORT (Matchday + Card Showcase) */}
        <section
          data-testid="hybrid-dominant-hero"
          className="hybrid-passport-header relative overflow-hidden text-white"
        >
          {/* Subtle Stadium Top Texture */}
          <div
            className="hybrid-stadium-top"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(5,11,20,0.2) 0%, rgba(5,11,20,0.95) 100%), url('/assets/hero-stadium-clean-mobile-v2.png')`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%"
            }}
          >
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold tracking-wider text-amber-400 uppercase text-[11px]">
                PASZPORT MECZOWO-KOLEKCJONERSKI
              </span>
              <span className="text-slate-400 delta-num">SEZON 2026/27</span>
            </div>
          </div>

          {/* Dual Pillar Content Grid */}
          <div className="p-4 sm:p-6 bg-slate-950/90 border-t border-slate-800/80">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* PILLAR 1: MATCHDAY ACTION (7 cols on desktop) */}
              <div className="md:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="sport-badge-pill bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      <Shield className="w-3.5 h-3.5" />
                      <span>NAJBLIŻSZY MECZ</span>
                    </span>
                    <span className="text-xs text-amber-400 font-bold delta-num">
                      {nextAction.data?.countdown || "ZA 2 DNI 4 GODZ"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-amber-500/30 p-1 flex items-center justify-center">
                        <Image
                          src="/icons/delta-badge-96.png"
                          alt="Delta"
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{profile.teamName || "DELTA WARSZAWA"}</div>
                        <div className="text-[10px] text-slate-400">Gospodarz</div>
                      </div>
                    </div>

                    <div className="text-center px-2">
                      <div className="text-xs font-black text-amber-400">VS</div>
                      <div className="text-xs font-bold text-white delta-num">SOB 11:30</div>
                    </div>

                    <div className="flex items-center gap-2.5 text-right">
                      <div>
                        <div className="text-sm font-black text-white truncate max-w-[120px]">
                          {nextAction.data?.opponent || "DRUŻYNA RYVALA"}
                        </div>
                        <div className="text-[10px] text-slate-400">Gość</div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center text-slate-400">
                        <Shield className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{nextAction.data?.location || "Obiekt klubowy DELTA"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setConfirmed(!confirmed)}
                    className={`delta-btn-action w-full ${
                      confirmed
                        ? "bg-emerald-700 text-white shadow-lg shadow-emerald-950/40"
                        : "delta-btn-primary"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {confirmed
                        ? "SYMULACJA: OBECNOŚĆ ZAZNACZONA LOKALNIE ✓"
                        : "SYMULACJA: POTWIERDŹ OBECNOŚĆ [TRYB DEMO]"}
                    </span>
                  </button>
                </div>
              </div>

              {/* PILLAR 2: CARD COLLECTION & XP VAULT (5 cols on desktop) */}
              <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="sport-badge-pill bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AKTYWNA KARTA</span>
                    </span>
                    <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                      INFERNO
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-22 rounded-xl bg-slate-950 border-2 border-amber-500/60 p-1 flex flex-col items-center justify-center shrink-0 shadow-lg">
                      <Image
                        src="/icons/delta-badge-96.png"
                        alt="Badge"
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                      <span className="text-[9px] font-black text-amber-400 mt-1 delta-num">#{shirtNumber || "—"}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">{playerName}</div>
                      <div className="text-xs text-amber-400 font-semibold">INFERNO ULTRA 2026/27</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Album: <strong className="text-white delta-num">{albumData ? `${albumData.owned} z ${albumData.total}` : "—"}</strong> kart
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Poziom {levelData ? levelData.level : "—"} ({levelData?.title || "Rozwój"})</span>
                      <span className="text-sky-400 font-bold delta-num">{levelData ? `${levelData.progressPercent}%` : "—"}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-amber-400 h-full rounded-full"
                        style={{ width: `${levelData ? levelData.progressPercent : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <Link
                    href="/preview/pack-demo"
                    className="delta-btn-action delta-btn-gold w-full text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>OTWÓRZ PACZKĘ ({albumData ? albumData.unopenedPacks : 0})</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CONSOLIDATED ATHLETIC METRIC STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="hybrid-metric-chip">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Seria Aktywności
            </span>
            <span className="text-lg font-black text-emerald-400 delta-num">
              {levelData ? `${levelData.activityStreak} DNI` : "—"}
            </span>
            <span className="text-[10px] text-slate-500">
              {levelData ? `Maksymalna seria: ${levelData.maxStreak} dni` : "Brak danych"}
            </span>
          </div>

          <div className="hybrid-metric-chip">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sezonowe XP
            </span>
            <span className="text-lg font-black text-sky-400 delta-num">
              {levelData ? `${levelData.seasonXP} XP` : "—"}
            </span>
            <span className="text-[10px] text-slate-500">
              {levelData ? `Poziom ${levelData.level}` : "Brak danych"}
            </span>
          </div>

          <div className="hybrid-metric-chip">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Kolekcja Albumu
            </span>
            <span className="text-lg font-black text-amber-400 delta-num">
              {albumData ? `${albumData.percent}%` : "—"}
            </span>
            <span className="text-[10px] text-slate-500">
              {albumData ? `${albumData.owned} z ${albumData.total} kart` : "Brak danych"}
            </span>
          </div>

          <div className="hybrid-metric-chip">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Skarbiec Paczek
            </span>
            <span className="text-lg font-black text-purple-400 delta-num">
              {albumData ? albumData.unopenedPacks : "—"}
            </span>
            <span className="text-[10px] text-slate-500">
              {albumData && albumData.unopenedPacks > 0 ? "Gotowe do otwarcia" : "Brak paczek"}
            </span>
          </div>
        </div>

        {/* 4. BALANCED SECTIONS: SQUAD AND RECENT PULLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Squad Readiness */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Kadra Meczowa na Sobotę
                </h3>
              </div>
              <Link
                href="/preview/team-showcase-v3"
                className="text-xs text-sky-400 hover:underline font-semibold"
              >
                Pokaż wszystkich
              </Link>
            </div>

            <div className="space-y-2">
              {teamShowcase.data?.featuredPlayers.slice(0, 4).map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/70 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-slate-900 border border-slate-700 text-sky-300 font-black flex items-center justify-center text-[10px] delta-num">
                      #{p.shirtNumber}
                    </span>
                    <span className="font-bold text-white">{p.displayName}</span>
                    <span className="text-[10px] text-slate-400">{p.position}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">Gotowy ✓</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Card Pulls */}
          <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Ostatnie Zdobycze w Albumie
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">3 nowe karty</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {recentCards.data?.slice(0, 3).map((c) => (
                <div
                  key={c.userCardId}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center flex flex-col items-center justify-between"
                >
                  <span className="text-[9px] font-black uppercase text-amber-400">
                    {c.rarity || "KARTA"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-1 my-1.5">
                    <Image
                      src="/icons/delta-badge-96.png"
                      alt="Card"
                      width={22}
                      height={22}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white truncate w-full">
                    {c.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 5. CLUB FEED & COMMUNICATIONS */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Aktualności i Informacje Klubu
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {clubCommunications.data?.slice(0, 2).map((comm) => (
              <div
                key={comm.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5 mb-0.5">
                    {comm.urgent && (
                      <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-amber-500 text-slate-950">
                        PILNE
                      </span>
                    )}
                    <span>{comm.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{comm.summary}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
