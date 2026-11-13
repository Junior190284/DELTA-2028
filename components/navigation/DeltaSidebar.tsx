"use client";

import React from "react";
import {
  Flame,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import {
  getNavigationSections,
  type DeltaTabId,
  type DeltaPrimarySectionId,
  type DeltaNavContext,
  type DeltaNavItemConfig,
} from "./DeltaNavigationConfig";

export interface DeltaSidebarProps {
  activeTab: DeltaTabId;
  activeSection: DeltaPrimarySectionId;
  onSelectTab: (tabId: DeltaTabId) => void;
  onOpenModalAction?: (actionId: string) => void;
  onTriggerIntro?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  navContext: DeltaNavContext;
  canOpenAdmin?: boolean;
  staff?: boolean;
  className?: string;
}

export const DeltaSidebar: React.FC<DeltaSidebarProps> = ({
  activeTab,
  activeSection,
  onSelectTab,
  onOpenModalAction,
  onTriggerIntro,
  isCollapsed,
  onToggleCollapse,
  navContext,
  canOpenAdmin = false,
  staff = false,
  className = "",
}) => {
  const sections = getNavigationSections(navContext);

  const handleItemClick = (item: DeltaNavItemConfig) => {
    if (item.isActionModal && onOpenModalAction) {
      onOpenModalAction(item.isActionModal);
    } else {
      onSelectTab(item.id as DeltaTabId);
    }
  };

  return (
    <aside
      className={`delta-sidebar ${
        isCollapsed ? "is-collapsed" : "is-expanded"
      } ${className}`.trim()}
      style={isCollapsed ? { width: "72px", minWidth: "72px", maxWidth: "72px" } : undefined}
      role="navigation"
      aria-label="Główny pasek nawigacji bocznej"
    >
      {/* 1. BRAND HEADER */}
      <div className="flex items-center justify-between px-3.5 py-4 border-b border-white/8 min-h-[64px]">
        <button
          type="button"
          onClick={() => onSelectTab("home")}
          className="flex items-center gap-3 text-left flex-1 min-w-0 group cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400 rounded-lg p-1"
          title="Przejdź do Pulpitu Głównego"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-600/30 via-slate-900 to-amber-500/20 p-1 flex items-center justify-center border border-white/10 shrink-0 group-hover:border-amber-400/50 transition-colors shadow-md">
            <img
              src="/teamlogos/gm.png"
              alt="K.S. Delta Warszawa"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black tracking-widest text-red-400 uppercase truncate">
                DELTA 2018 GM
              </span>
              <span className="text-sm font-extrabold text-slate-100 tracking-tight truncate group-hover:text-amber-300 transition-colors">
                Górny Mokotów
              </span>
            </div>
          )}
        </button>

        {/* Collapse button on top right when expanded */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="relative z-10 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors shrink-0 cursor-pointer"
            title="Zwiń pasek boczny"
            aria-label="Zwiń pasek boczny"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* 2. SCROLLABLE NAVIGATION SECTIONS */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1">
            {/* Section Header */}
            {!isCollapsed ? (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                  {section.label}
                </span>
              </div>
            ) : (
              <div className="w-full h-[1px] bg-white/6 my-2" />
            )}

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isItemActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-left group ${
                      isItemActive
                        ? "bg-gradient-to-r from-red-600/25 via-amber-600/15 to-transparent text-white border-l-2 border-amber-400 shadow-[inset_0_0_12px_rgba(245,158,11,0.08)]"
                        : "text-slate-300 hover:text-white hover:bg-white/6 border-l-2 border-transparent"
                    } ${isCollapsed ? "justify-center px-0 py-3" : ""}`}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={isItemActive ? "page" : undefined}
                  >
                    <div
                      className={`relative shrink-0 flex items-center justify-center w-5 h-5 transition-transform group-hover:scale-110 ${
                        isItemActive
                          ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      <IconComponent size={18} />
                      {item.isLiveBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" />
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                        <span
                          className={`truncate text-[13px] ${
                            isItemActive ? "font-black text-white" : "font-medium"
                          }`}
                        >
                          {item.label}
                        </span>

                        {item.badge && (
                          <span
                            className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              item.isGoldBadge
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : item.isLiveBadge
                                ? "bg-red-500/15 text-red-300 border border-red-500/30 animate-pulse"
                                : "bg-white/8 text-slate-300 border border-white/10"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. SIDEBAR FOOTER (INTRO, ADMIN, COLLAPSE) */}
      <div className="p-2 border-t border-white/8 space-y-1 bg-[#07080b]/60">
        {/* Zobacz Intro Button */}
        {onTriggerIntro && (
          <button
            type="button"
            onClick={onTriggerIntro}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-red-300 bg-red-950/25 hover:bg-red-900/40 border border-red-500/25 hover:border-red-500/50 cursor-pointer ${
              isCollapsed ? "justify-center px-0 py-2.5" : ""
            }`}
            title="Odtwórz filmowe intro stadionowe"
          >
            <Flame size={16} className="text-red-400 shrink-0" />
            {!isCollapsed && <span className="truncate">ZOBACZ INTRO</span>}
          </button>
        )}

        {/* Panel Administratora Shortcut */}
        {canOpenAdmin && (
          <a
            href="/admin"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all text-amber-300 bg-amber-950/25 hover:bg-amber-900/40 border border-amber-500/25 hover:border-amber-500/50 no-underline cursor-pointer ${
              isCollapsed ? "justify-center px-0 py-2.5" : ""
            }`}
            title="Panel Trenera / Administratora"
          >
            <Shield size={16} className="text-amber-400 shrink-0" />
            {!isCollapsed && (
              <span className="truncate flex items-center justify-between w-full">
                <span>PANEL ADMINA</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  {staff ? "ADMIN" : "POMOCNIK"}
                </span>
              </span>
            )}
          </a>
        )}

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
            title="Rozwiń pasek boczny"
            aria-label="Rozwiń pasek boczny"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default DeltaSidebar;
