"use client";

import React from "react";
import { Home, Users, Sparkles, LayoutGrid } from "lucide-react";
import type { DeltaPrimarySectionId, DeltaTabId } from "./DeltaNavigationConfig";

export interface DeltaBottomNavProps {
  activeTab: DeltaTabId;
  activeSection: DeltaPrimarySectionId;
  onSelectSection: (sectionId: DeltaPrimarySectionId) => void;
  onSelectTab: (tabId: DeltaTabId) => void;
  onToggleMore: () => void;
  isMoreOpen: boolean;
  unreadCount?: number;
  isMatchToday?: boolean;
  isTrainingToday?: boolean;
  className?: string;
}

export const DeltaBottomNav: React.FC<DeltaBottomNavProps> = ({
  activeTab,
  activeSection,
  onSelectSection,
  onSelectTab,
  onToggleMore,
  isMoreOpen,
  unreadCount = 0,
  isMatchToday = false,
  isTrainingToday = false,
  className = "",
}) => {
  const isTeamActive = activeSection === "team" && !isMoreOpen;
  const isHomeActive = activeSection === "home" && !isMoreOpen;
  const isCollectionActive = activeSection === "collection" && !isMoreOpen;

  return (
    <nav
      className={`delta-bottom-nav pb-[calc(6px+env(safe-area-inset-bottom,0px))] overflow-hidden ${className}`.trim()}
      role="navigation"
      aria-label="Główna nawigacja mobilna DELTA INFERNO"
    >
      <div className="grid grid-cols-4 items-center justify-around w-full max-w-lg mx-auto px-1 pt-1.5">
        {/* 1. PULPIT */}
        <button
          type="button"
          onClick={() => onSelectTab("home")}
          className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-center transition-all group cursor-pointer"
          aria-label="Pulpit główny drużyny"
          aria-current={isHomeActive ? "page" : undefined}
        >
          {isHomeActive && (
            <span
              className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-red-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              aria-hidden="true"
            />
          )}
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
              isHomeActive
                ? "bg-gradient-to-br from-red-600/25 to-amber-600/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105"
                : "text-slate-400 hover:text-slate-200 group-hover:scale-105"
            }`}
          >
            <Home size={20} />
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase mt-1 font-bold transition-colors ${
              isHomeActive ? "text-amber-300 font-black" : "text-slate-400"
            }`}
          >
            Pulpit
          </span>
        </button>

        {/* 2. DRUŻYNA */}
        <button
          type="button"
          onClick={() => {
            if (activeSection === "team") {
              // If already in team section, cycle or stay
              onSelectTab(activeTab === "matches" ? "training" : "matches");
            } else {
              onSelectTab("matches");
            }
          }}
          className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-center transition-all group cursor-pointer"
          aria-label="Drużyna: mecze, treningi i skład"
          aria-current={isTeamActive ? "page" : undefined}
        >
          {isTeamActive && (
            <span
              className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-red-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              aria-hidden="true"
            />
          )}
          <div
            className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
              isTeamActive
                ? "bg-gradient-to-br from-red-600/25 to-amber-600/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105"
                : "text-slate-400 hover:text-slate-200 group-hover:scale-105"
            }`}
          >
            <Users size={20} />
            {(isMatchToday || isTrainingToday) && (
              <span
                className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#07080b] shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse"
                title={isMatchToday ? "Dziś mecz!" : "Dziś trening!"}
              />
            )}
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase mt-1 font-bold transition-colors ${
              isTeamActive ? "text-amber-300 font-black" : "text-slate-400"
            }`}
          >
            Drużyna
          </span>
        </button>

        {/* 3. KOLEKCJA (3D INFERNO) */}
        <button
          type="button"
          onClick={() => onSelectTab("collection")}
          className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-center transition-all group cursor-pointer"
          aria-label="Kolekcja kart 3D i paczki"
          aria-current={isCollectionActive ? "page" : undefined}
        >
          {isCollectionActive && (
            <span
              className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-red-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              aria-hidden="true"
            />
          )}
          <div
            className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
              isCollectionActive
                ? "bg-gradient-to-br from-amber-500/25 to-red-600/25 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.35)] scale-105"
                : "text-slate-400 hover:text-slate-200 group-hover:scale-105"
            }`}
          >
            <Sparkles size={20} className={isCollectionActive ? "animate-pulse" : ""} />
            <span className="absolute -top-1 -right-1 text-[8px] font-black px-1 rounded-full bg-amber-400 text-slate-950 leading-tight border border-[#07080b]">
              3D
            </span>
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase mt-1 font-bold transition-colors ${
              isCollectionActive ? "text-amber-300 font-black" : "text-slate-400"
            }`}
          >
            Kolekcja
          </span>
        </button>

        {/* 4. WIĘCEJ (HUB KAFELKOWY & MODALE) */}
        <button
          type="button"
          onClick={onToggleMore}
          className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 text-center transition-all group cursor-pointer"
          aria-label="Więcej opcji drużyny i społeczność"
          aria-expanded={isMoreOpen}
          aria-controls="delta-mobile-more-menu"
        >
          {isMoreOpen && (
            <span
              className="absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-red-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              aria-hidden="true"
            />
          )}
          <div
            className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
              isMoreOpen
                ? "bg-gradient-to-br from-red-600/25 to-amber-600/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105"
                : "text-slate-400 hover:text-slate-200 group-hover:scale-105"
            }`}
          >
            <LayoutGrid size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-[#07080b] shadow-[0_0_6px_rgba(220,38,38,0.7)]"
                aria-live="polite"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase mt-1 font-bold transition-colors ${
              isMoreOpen ? "text-amber-300 font-black" : "text-slate-400"
            }`}
          >
            Więcej
          </span>
        </button>
      </div>
    </nav>
  );
};

export default DeltaBottomNav;
