"use client";

import React from "react";
import { Layers, CheckCircle2, Copy, Star, HelpCircle, Trophy } from "lucide-react";

export interface CollectionSummaryProps {
  totalCards: number;
  uniqueOwned: number;
  duplicatesCount: number;
  favoritesCount: number;
  totalCardsInCatalog: number;
  rarityBreakdown?: {
    common: { owned: number; total: number };
    rare: { owned: number; total: number };
    epic: { owned: number; total: number };
    legendary: { owned: number; total: number };
    inferno: { owned: number; total: number };
  };
  onSelectFilter?: (filter: string) => void;
}

export default function CollectionSummary({
  totalCards,
  uniqueOwned,
  duplicatesCount,
  favoritesCount,
  totalCardsInCatalog,
  rarityBreakdown,
  onSelectFilter
}: CollectionSummaryProps) {
  const completionPercent = totalCardsInCatalog > 0
    ? Math.min(100, Math.round((uniqueOwned / totalCardsInCatalog) * 1000) / 10)
    : 0;

  const missingCount = Math.max(0, totalCardsInCatalog - uniqueOwned);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 p-4 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Top Banner: Global Completion Bar */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base md:text-lg font-black tracking-tight text-white uppercase">
              Postęp Kolekcji DELTA 2026/27
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-[1000] text-amber-400 font-mono">
              {uniqueOwned} <span className="text-sm font-semibold text-slate-400">/ {totalCardsInCatalog}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500/20 border border-amber-400/40 text-amber-300">
              {completionPercent}%
            </span>
          </div>
        </div>

        {/* Multi-tier Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-950 border border-white/10 overflow-hidden relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* 1. Unikalne Karty */}
        <div
          onClick={() => onSelectFilter?.("owned")}
          className="flex flex-col p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unikalne</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-[1000] text-white font-mono">{uniqueOwned}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">odblokowanych</span>
        </div>

        {/* 2. Wszystkie w Ekwipunku */}
        <div
          onClick={() => onSelectFilter?.("all")}
          className="flex flex-col p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-sky-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Wszystkie</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-[1000] text-white font-mono">{totalCards}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">z duplikatami</span>
        </div>

        {/* 3. Duplikaty */}
        <div
          onClick={() => onSelectFilter?.("duplicates")}
          className="flex flex-col p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-cyan-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Duplikaty</span>
            <Copy className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-[1000] text-cyan-300 font-mono">{duplicatesCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">powtórzone karty</span>
        </div>

        {/* 4. Ulubione */}
        <div
          onClick={() => onSelectFilter?.("favorites")}
          className="flex flex-col p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ulubione</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <span className="text-2xl font-[1000] text-amber-300 font-mono">{favoritesCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">oznaczonych gwiazdką</span>
        </div>

        {/* 5. Brakujące */}
        <div
          onClick={() => onSelectFilter?.("missing")}
          className="flex flex-col p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-slate-500/40 transition-all cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-slate-200 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Brakujące</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-[1000] text-slate-300 font-mono">{missingCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">do zdobycia z paczek</span>
        </div>
      </div>
    </div>
  );
}
