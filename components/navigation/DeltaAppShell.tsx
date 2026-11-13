"use client";

import React, { useState } from "react";
import {
  Bell,
  UserRound,
  Shield,
  Flame,
  Target,
  ChevronRight,
} from "lucide-react";
import { DeltaSidebar } from "./DeltaSidebar";
import { DeltaBottomNav } from "./DeltaBottomNav";
import {
  mapTabToSection,
  getSectionSubtabs,
  type DeltaTabId,
  type DeltaPrimarySectionId,
  type DeltaNavContext,
} from "./DeltaNavigationConfig";

export interface DeltaAppShellProps {
  activeTab: DeltaTabId;
  onSelectTab: (tabId: DeltaTabId) => void;
  navContext: DeltaNavContext;
  onOpenModalAction: (actionId: string) => void;
  onTriggerIntro: () => void;
  onToggleMore: () => void;
  isMoreOpen: boolean;
  canOpenAdmin?: boolean;
  staff?: boolean;
  userProfile?: { display_name?: string | null; role?: string | null };
  unreadNewsCount?: number;
  isMatchToday?: boolean;
  isTrainingToday?: boolean;
  gameProfile?: any;
  children: React.ReactNode;
}

export const DeltaAppShell: React.FC<DeltaAppShellProps> = ({
  activeTab,
  onSelectTab,
  navContext,
  onOpenModalAction,
  onTriggerIntro,
  onToggleMore,
  isMoreOpen,
  canOpenAdmin = false,
  staff = false,
  userProfile,
  unreadNewsCount = 0,
  isMatchToday = false,
  isTrainingToday = false,
  gameProfile,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const activeSection: DeltaPrimarySectionId = mapTabToSection(activeTab);

  // Subtabs for the active section (e.g. Drużyna, Kolekcja)
  const currentSubtabs = getSectionSubtabs(activeSection, navContext);
  const showSubnavPills = currentSubtabs.length > 1 && activeSection !== "home";

  return (
    <div className="delta-app-shell min-h-screen flex bg-[#07080b] text-slate-100 overflow-x-hidden relative font-sans">
      {/* 1. DESKTOP RESPONSIVE SIDEBAR */}
      <DeltaSidebar
        activeTab={activeTab}
        activeSection={activeSection}
        onSelectTab={onSelectTab}
        onOpenModalAction={onOpenModalAction}
        onTriggerIntro={onTriggerIntro}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        navContext={navContext}
        canOpenAdmin={canOpenAdmin}
        staff={staff}
      />

      {/* 2. MAIN VIEW CONTAINER */}
      <div className="delta-app-shell-main flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* TOPBAR */}
        <header className="delta-topbar sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-2.5 bg-[#090b10]/90 backdrop-blur-xl border-b border-white/8 min-h-[58px]">
          {/* Mobile Brand Button (Visible only on mobile / small screen) */}
          <button
            type="button"
            onClick={() => onSelectTab("home")}
            className="delta-mobile-only items-center gap-2.5 text-left focus:outline-none cursor-pointer"
            aria-label="Przejdź na stronę główną"
          >
            <div
              className="rounded-lg bg-slate-900 border border-white/10 p-0.5 shrink-0 flex items-center justify-center"
              style={{ width: "32px", height: "32px", minWidth: "32px", minHeight: "32px" }}
            >
              <img
                src="/teamlogos/gm.png"
                alt="DELTA 2018 GM"
                style={{ width: "26px", height: "26px", objectFit: "contain" }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <b className="text-xs font-black tracking-tight text-white leading-none">
                DELTA 2018 GM
              </b>
              <span className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase leading-tight">
                Górny Mokotów
              </span>
            </div>
          </button>

          {/* Central Gamification XP & Level Pill */}
          {gameProfile && (
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-amber-500/30 text-xs shadow-inner cursor-pointer hover:border-amber-500/60 transition-all select-none"
              onClick={() => onOpenModalAction("weeklysummary")}
              title="Kliknij, aby otworzyć Podsumowanie Tygodnia"
              role="button"
              tabIndex={0}
            >
              <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                POZ. {gameProfile.levelInfo?.level || 1}
              </span>
              <div className="flex flex-col min-w-[90px]">
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300 font-bold">
                  <span className="truncate max-w-[80px]">
                    {gameProfile.levelInfo?.title || "Zawodnik DELTA"}
                  </span>
                  <span className="text-amber-400 font-mono">
                    {gameProfile.levelInfo?.currentLevelXP || 0}/
                    {gameProfile.levelInfo?.nextLevelXP || 100} XP
                  </span>
                </div>
                <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 mt-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${gameProfile.levelInfo?.progressPercent || 0}%`,
                    }}
                  />
                </div>
              </div>
              {gameProfile.activityStreak > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 ml-0.5">
                  <Flame size={11} className="text-red-500" />{" "}
                  {gameProfile.activityStreak}d
                </span>
              )}
            </div>
          )}

          {/* Right Top Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
            {/* Quick Action: Misje */}
            <button
              type="button"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-red-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider hover:border-amber-400 hover:scale-102 transition-all cursor-pointer"
              onClick={() => onOpenModalAction("missions")}
              title="Centrum Misji Dziennych i Tygodniowych"
            >
              <Target size={14} /> <span>MISJE</span>
            </button>

            {/* Quick Action: Arena */}
            <button
              type="button"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600/15 to-amber-600/15 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider hover:border-red-400 hover:scale-102 transition-all cursor-pointer"
              onClick={() => onOpenModalAction("battle")}
              title="Arena Pojedynków Kart PvE"
            >
              <Flame size={14} /> <span>ARENA</span>
            </button>

            {/* Mobile / Tablet Intro Trigger */}
            <button
              type="button"
              className="delta-mobile-only items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 font-bold text-xs uppercase hover:border-red-400 transition-all cursor-pointer"
              onClick={onTriggerIntro}
              title="Odtwórz filmowe intro stadionowe"
            >
              <Flame size={14} className="text-red-400" />
              <span className="hidden xs:inline text-[11px]">INTRO</span>
            </button>

            {/* Admin Badge Shortcut on Desktop */}
            {canOpenAdmin && (
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-black uppercase tracking-wider hover:border-amber-400 transition-all no-underline"
              >
                <Shield size={12} />
                <span>{staff ? "ADMIN" : "POMOCNIK"}</span>
              </a>
            )}

            {/* Notification Center Trigger */}
            <button
              type="button"
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
              onClick={() => onOpenModalAction("notifications")}
              aria-label="Centrum powiadomień"
              title="Centrum powiadomień i aktualności"
            >
              <Bell size={18} />
              {unreadNewsCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-slate-950 shadow-sm"
                  aria-live="polite"
                >
                  {unreadNewsCount > 99 ? "99+" : unreadNewsCount}
                </span>
              )}
            </button>

            {/* User Account Button & Dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-amber-400/40 transition-all cursor-pointer"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-label="Konto użytkownika"
                aria-expanded={accountMenuOpen}
              >
                <UserRound size={17} />
              </button>

              {accountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAccountMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl bg-[#0f1117] border border-white/12 shadow-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="pb-2 border-b border-white/10">
                      <small className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                        KONTO
                      </small>
                      <b className="text-sm font-black text-white block truncate">
                        {userProfile?.display_name || "Użytkownik"}
                      </b>
                      <span className="text-[11px] font-semibold text-amber-400 capitalize">
                        {userProfile?.role || "Kibic"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {canOpenAdmin && (
                        <a
                          href="/admin"
                          className="w-full text-left text-xs font-bold text-amber-400 hover:text-amber-300 py-1.5 px-2 rounded-lg hover:bg-white/5 flex items-center gap-2 transition-colors no-underline"
                        >
                          <Shield size={14} /> Panel administratora (
                          {staff ? "ADMIN" : "POMOCNIK"})
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onOpenModalAction("notifprefs");
                        }}
                        className="w-full text-left text-xs font-bold text-slate-300 hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>🔔 Preferencje powiadomień</span>
                        <ChevronRight size={14} className="text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onOpenModalAction("changelog");
                        }}
                        className="w-full text-left text-xs font-bold text-slate-300 hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>🚀 Co nowego? (v2.0)</span>
                        <ChevronRight size={14} className="text-slate-500" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 3. HORIZONTAL SUBNAV PILL BAR (Direct 1-tap switching without drawers) */}
        {showSubnavPills && (
          <nav
            className="sticky top-[58px] z-10 flex items-center gap-1.5 px-3.5 sm:px-6 py-2 bg-[#0b0e14]/95 backdrop-blur-md border-b border-white/6 overflow-x-auto scrollbar-none select-none max-w-full"
            aria-label={`Sekcja: ${activeSection}`}
          >
            {currentSubtabs.map((sub) => {
              const isSubActive = activeTab === sub.id;
              const SubIcon = sub.icon;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectTab(sub.id as DeltaTabId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isSubActive
                      ? "bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-102"
                      : "bg-white/6 text-slate-300 hover:text-white hover:bg-white/10 border border-white/8"
                  }`}
                  aria-current={isSubActive ? "page" : undefined}
                >
                  <SubIcon size={14} />
                  <span>{sub.label}</span>
                  {sub.badge && !isSubActive && (
                    <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-black">
                      {sub.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* 4. MAIN CONTENT CONTAINER */}
        <main className="delta-main-content">
          {children}
        </main>
      </div>

      {/* 5. MOBILE BOTTOM NAVIGATION */}
      <DeltaBottomNav
        activeTab={activeTab}
        activeSection={activeSection}
        onSelectSection={() => {}}
        onSelectTab={onSelectTab}
        onToggleMore={onToggleMore}
        isMoreOpen={isMoreOpen}
        unreadCount={unreadNewsCount}
        isMatchToday={isMatchToday}
        isTrainingToday={isTrainingToday}
      />
    </div>
  );
};

export default DeltaAppShell;
