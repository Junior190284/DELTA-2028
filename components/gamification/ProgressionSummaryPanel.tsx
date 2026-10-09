"use client";

import React from "react";
import { 
  Flame, 
  Trophy, 
  Layers, 
  Gift, 
  Coins, 
  Crown, 
  ShieldCheck, 
  ChevronRight,
  Sparkles 
} from "lucide-react";

export interface ProgressionSummaryData {
  streakCount: number;
  maxStreak: number;
  collectionUnlockedCards: number;
  collectionTotalCards: number;
  collectionPercentage: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  unclaimedAchievementsCount: number;
  unopenedPacksCount: number;
  currentPoints: number;
  playerLevel?: number;
  currentXp?: number;
  nextLevelXp?: number;
}

interface ProgressionSummaryPanelProps {
  data: ProgressionSummaryData;
  onNavigateToCollection?: () => void;
  onNavigateToAchievements?: () => void;
  onNavigateToSpin?: () => void;
  onNavigateToPacks?: () => void;
  className?: string;
}

export default function ProgressionSummaryPanel({
  data,
  onNavigateToCollection,
  onNavigateToAchievements,
  onNavigateToSpin,
  onNavigateToPacks,
  className = ""
}: ProgressionSummaryPanelProps) {
  const xpPercent = data.nextLevelXp && data.nextLevelXp > 0
    ? Math.min(100, Math.round(((data.currentXp || 0) / data.nextLevelXp) * 100))
    : 100;

  return (
    <div
      className={`rounded-2xl bg-slate-900/95 border border-slate-800 p-4 sm:p-6 shadow-2xl backdrop-blur-md ${className}`}
      role="region"
      aria-label="Podsumowanie postępów gracza"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Crown size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                TWÓJ PROGRES W KLUBIE
              </h2>
              {data.playerLevel && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  LVL {data.playerLevel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              K.S. DELTA Warszawa · Sezon 2026/2027
            </p>
          </div>
        </div>

        {/* DP Balance Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Coins size={16} className="text-amber-400" />
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-black text-base text-amber-300">
              {data.currentPoints.toLocaleString("pl-PL")}
            </span>
            <span className="text-[10px] font-bold text-amber-400/80">DP</span>
          </div>
        </div>
      </div>

      {/* Main Grid Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-4">
        {/* Metric 1: Streak */}
        <button
          type="button"
          onClick={onNavigateToSpin}
          className="group text-left p-3 sm:p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-red-500/50 hover:bg-slate-800/90 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <Flame size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-red-400 flex items-center transition-colors">
              Seria <ChevronRight size={12} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {data.streakCount} <span className="text-xs text-slate-400 font-sans">/ 7 dni</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {data.streakCount >= 7 ? "Zwieńczenie serii 7/7!" : `Dzień ${data.streakCount} z 7 serii`}
          </p>
        </button>

        {/* Metric 2: Collection Progress */}
        <button
          type="button"
          onClick={onNavigateToCollection}
          className="group text-left p-3 sm:p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/50 hover:bg-slate-800/90 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-400 flex items-center transition-colors">
              Album <ChevronRight size={12} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {data.collectionPercentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {data.collectionUnlockedCards} / {data.collectionTotalCards} kart
          </p>
        </button>

        {/* Metric 3: Achievements */}
        <button
          type="button"
          onClick={onNavigateToAchievements}
          className="group text-left p-3 sm:p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-yellow-500/50 hover:bg-slate-800/90 transition-all cursor-pointer relative"
        >
          {data.unclaimedAchievementsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400">
              <Trophy size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-yellow-400 flex items-center transition-colors">
              Odznaki <ChevronRight size={12} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {data.achievementsUnlocked} <span className="text-xs text-slate-400 font-sans">/ {data.achievementsTotal}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {data.unclaimedAchievementsCount > 0
              ? `${data.unclaimedAchievementsCount} do odebrania!`
              : "Wszystkie odebrane"}
          </p>
        </button>

        {/* Metric 4: Unopened Packs */}
        <button
          type="button"
          onClick={onNavigateToPacks}
          className="group text-left p-3 sm:p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-amber-500/50 hover:bg-slate-800/90 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Gift size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-400 flex items-center transition-colors">
              Paczki <ChevronRight size={12} />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {data.unopenedPacksCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {data.unopenedPacksCount > 0 ? "Gotowe do otwarcia" : "Kup w sklepie DP"}
          </p>
        </button>
      </div>

      {/* Progress Bars Strip: Album & Level */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Layers size={13} className="text-blue-400" /> Wypełnienie Albumu
            </span>
            <span className="font-mono text-slate-300 font-bold">{data.collectionPercentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, data.collectionPercentage)}%` }}
            />
          </div>
        </div>

        {data.nextLevelXp && data.nextLevelXp > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" /> Do następnego poziomu (LVL {(data.playerLevel || 1) + 1})
              </span>
              <span className="font-mono text-slate-300 font-bold">
                {data.currentXp || 0} / {data.nextLevelXp} XP
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
