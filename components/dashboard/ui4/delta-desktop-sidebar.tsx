"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Bell,
  Settings,
  Shield,
  Flame,
  Award,
  ChevronRight,
  LogOut
} from "lucide-react";
import type { ProfileModel } from "./types";

interface DesktopSidebarProps {
  profile: ProfileModel;
  activeItem?: "dashboard" | "schedule" | "collection" | "packs" | "team" | "news";
  unopenedPacks?: number;
  badgeCount?: number;
  variantTheme?: "elite" | "sport" | "collector" | "hybrid";
}

export function DeltaDesktopSidebar({
  profile,
  activeItem = "dashboard",
  unopenedPacks = 3,
  badgeCount = 0,
  variantTheme = "elite"
}: DesktopSidebarProps) {
  const isParent = profile.actorKind === "parent";
  const playerName = profile.player.data?.displayName || profile.displayName;
  const isRestricted = profile.player.status === "unavailable";

  const navItems = [
    {
      id: "dashboard",
      label: "Pulpit Główny",
      icon: LayoutDashboard,
      href: "/preview/dashboard-ui4?view=home",
      badge: null
    },
    {
      id: "schedule",
      label: "Terminarz & Mecze",
      icon: Calendar,
      href: "/preview/dashboard-ui4?view=home#schedule",
      badge: isRestricted ? null : "MECZ"
    },
    {
      id: "collection",
      label: "Kolekcja INFERNO",
      icon: Layers,
      href: "/preview/dashboard-ui4?view=collection",
      badge: isRestricted ? null : "75%"
    },
    {
      id: "packs",
      label: "Skarbiec Paczek",
      icon: Sparkles,
      href: "/preview/pack-demo",
      badge: isRestricted ? null : (unopenedPacks > 0 ? `${unopenedPacks}` : null),
      highlight: unopenedPacks > 0 && !isRestricted
    },
    {
      id: "team",
      label: "Kadra U-9",
      icon: Users,
      href: "/preview/dashboard-ui4#team",
      badge: null
    },
    {
      id: "news",
      label: "Komunikaty Klubu",
      icon: Bell,
      href: "/preview/dashboard-ui4#news",
      badge: isRestricted ? null : "3"
    }
  ];

  const themeAccentBorder = {
    elite: "border-amber-500/30",
    sport: "border-sky-500/30",
    collector: "border-amber-500/40",
    hybrid: "border-amber-500/30"
  }[variantTheme];

  const themeActiveBg = {
    elite: "bg-gradient-to-r from-amber-500/20 to-sky-500/10 text-amber-300 border-l-4 border-amber-400 font-black",
    sport: "bg-gradient-to-r from-sky-500/20 to-slate-850 text-sky-300 border-l-4 border-sky-400 font-black",
    collector: "bg-gradient-to-r from-amber-500/25 to-slate-850 text-amber-300 border-l-4 border-amber-400 font-black",
    hybrid: "bg-gradient-to-r from-amber-500/20 to-sky-500/15 text-amber-300 border-l-4 border-amber-400 font-black"
  }[variantTheme];

  return (
    <aside
      data-testid="delta-desktop-sidebar"
      className="d4-desktop-sidebar bg-slate-950/95 border-r border-slate-800/80 select-none backdrop-blur-xl"
    >
      {/* 1. Official Club Header with Authentic DELTA Crest */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 p-1.5 flex items-center justify-center shrink-0 shadow-lg shadow-black/60 group">
          <Image
            src="/teamlogos/gm.png"
            alt="Herb DELTA Warszawa"
            width={40}
            height={40}
            className="object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
            priority
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
            <Flame className="w-2.5 h-2.5 text-slate-950" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              DELTA INFERNO
            </span>
          </div>
          <div className="text-sm font-black text-white tracking-tight truncate">
            K.S. DELTA WARSZAWA
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Rocznik 2018 · U-9
          </div>
        </div>
      </div>

      {/* 2. Navigation Menu Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Menu Główne
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition duration-150 group ${
                isActive
                  ? themeActiveBg
                  : "text-slate-300 hover:text-white hover:bg-slate-900/70 border-l-4 border-transparent font-semibold"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive
                      ? "text-amber-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black delta-num ${
                    item.highlight
                      ? "bg-amber-400 text-slate-950 animate-pulse shadow-sm shadow-amber-400/40"
                      : isActive
                      ? "bg-amber-400/20 text-amber-300 border border-amber-500/30"
                      : "bg-slate-900 text-slate-400 border border-slate-700/60"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Klub & Aplikacja
        </div>

        <Link
          href="/preview/pack-demo"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition font-medium"
        >
          <div className="flex items-center gap-3">
            <Award className="w-4 h-4 text-slate-400" />
            <span>Sala Trofeów</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>

        <Link
          href="/preview/dashboard-ui4"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition font-medium"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Ustawienia Profilu</span>
          </div>
        </Link>
      </nav>

      {/* 3. Bottom User Profile Card (Parent or Player) */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 rounded-xl bg-slate-850 border border-slate-700/80 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-amber-400">
                {isParent ? "OP" : "ZA"}
              </span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate">
                {isParent ? profile.displayName : playerName}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                {isRestricted ? (
                  <span className="text-rose-400 font-semibold">Ograniczony</span>
                ) : isParent ? (
                  <>
                    <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 text-[9px] font-bold border border-sky-800/50">RODZIC</span>
                    <span className="truncate">Alfa</span>
                  </>
                ) : (
                  <>
                    <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[9px] font-bold border border-amber-800/50">ZAWODNIK</span>
                    <span className="truncate">U-9</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition">
            <Shield className="w-4 h-4" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default DeltaDesktopSidebar;
