"use client";

import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  X, 
  RotateCcw,
  Check,
  Star,
  Copy,
  Layers,
  HelpCircle,
  CheckCircle2
} from "lucide-react";
import { DeltaCardTheme, DELTA_THEME_CONFIGS } from "@/lib/cards/deltaCardModel";
import { CardRarity } from "@/lib/cards/types";

export type FilterStatus = "all" | "owned" | "missing" | "duplicates" | "favorites";
export type SortOption = "newest" | "rarity" | "player" | "duplicates" | "card_type";

export interface FilterState {
  search: string;
  status: FilterStatus;
  player: string;
  cardType: string;
  rarity: string;
  sort: SortOption;
}

export interface CollectionFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  playersList: { id: string; name: string }[];
  totalResultsCount: number;
}

export default function CollectionFilterBar({
  filters,
  onChange,
  playersList,
  totalResultsCount
}: CollectionFilterBarProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleUpdate = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const resetFilters = () => {
    onChange({
      search: "",
      status: "all",
      player: "all",
      cardType: "all",
      rarity: "all",
      sort: "newest"
    });
  };

  const isFiltered = 
    filters.search !== "" || 
    filters.status !== "all" || 
    filters.player !== "all" || 
    filters.cardType !== "all" || 
    filters.rarity !== "all" ||
    filters.sort !== "newest";

  const allThemes: DeltaCardTheme[] = [
    "STANDARD",
    "TRAINING_HERO",
    "GOAL_MACHINE",
    "CAPTAIN",
    "MATCHDAY_HERO",
    "DELTA_ICON",
    "GOLD_MASTER",
    "INFERNO",
    "SEASONAL_EVENT"
  ];

  const rarities: { id: CardRarity | "all"; label: string }[] = [
    { id: "all", label: "Wszystkie Rzadkości" },
    { id: "common", label: "Common (Brąz/Srebro)" },
    { id: "rare", label: "Rare (Niebieska)" },
    { id: "epic", label: "Epic (Złota / Fiolet)" },
    { id: "legendary", label: "Legendary (Ikona)" },
    { id: "inferno", label: "Inferno (Ognista)" }
  ];

  const statusTabs: { id: FilterStatus; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Wszystkie", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "owned", label: "Posiadane", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: "missing", label: "Brakujące", icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> },
    { id: "duplicates", label: "Duplikaty", icon: <Copy className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: "favorites", label: "Ulubione", icon: <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> }
  ];

  return (
    <div className="w-full space-y-3">
      {/* Main Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Szukaj zawodnika, serii, numeru..."
            value={filters.search}
            onChange={(e) => handleUpdate({ search: e.target.value })}
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950 border border-white/10 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => handleUpdate({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Chips (Desktop) */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/5 overflow-x-auto">
          {statusTabs.map((tab) => {
            const isActive = filters.status === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleUpdate({ status: tab.id })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md scale-100"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Dropdowns & Mobile Filter Toggle */}
        <div className="flex items-center gap-2">
          {/* Player Dropdown (Desktop) */}
          <select
            value={filters.player}
            onChange={(e) => handleUpdate({ player: e.target.value })}
            className="hidden xl:block px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Wszyscy zawodnicy ({playersList.length})</option>
            {playersList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={filters.sort}
            onChange={(e) => handleUpdate({ sort: e.target.value as SortOption })}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="newest">Sortuj: Najnowsze</option>
            <option value="rarity">Sortuj: Rzadkość ↓</option>
            <option value="player">Sortuj: Zawodnik A-Z</option>
            <option value="duplicates">Sortuj: Duplikaty ↓</option>
            <option value="card_type">Sortuj: Typ / Seria</option>
          </select>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white hover:bg-slate-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Filtry</span>
            {isFiltered && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 transition-colors"
              title="Zresetuj wszystkie filtry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Status Chips (on small screens) */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1">
        {statusTabs.map((tab) => {
          const isActive = filters.status === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleUpdate({ status: tab.id })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-900 border border-white/10 text-slate-400"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results Counter & Active Filters Tagline */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-medium">
          Znaleziono: <strong className="text-white font-mono">{totalResultsCount}</strong> kart
        </span>
        {isFiltered && (
          <span className="text-amber-400/90 font-medium">Aktywne filtry</span>
        )}
      </div>

      {/* Mobile Filters Drawer / Modal */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Filtry Kolekcji</h3>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter: Zawodnik */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Zawodnik</label>
              <select
                value={filters.player}
                onChange={(e) => handleUpdate({ player: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white"
              >
                <option value="all">Wszyscy zawodnicy</option>
                {playersList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Filter: Seria / Typ Karty */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Seria / Typ Karty</label>
              <select
                value={filters.cardType}
                onChange={(e) => handleUpdate({ cardType: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white"
              >
                <option value="all">Wszystkie Serie</option>
                {allThemes.map((t) => (
                  <option key={t} value={t}>{DELTA_THEME_CONFIGS[t].label}</option>
                ))}
              </select>
            </div>

            {/* Filter: Rzadkość */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase">Rzadkość</label>
              <select
                value={filters.rarity}
                onChange={(e) => handleUpdate({ rarity: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white"
              >
                {rarities.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Drawer Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={resetFilters}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300"
              >
                Wyczyść
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-black text-slate-950 shadow-lg"
              >
                Zastosuj ({totalResultsCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
