"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Sparkles,
  Users
} from "lucide-react";

interface MobileBottomNavProps {
  unopenedPacks?: number;
  activeItem?: "dashboard" | "schedule" | "collection" | "packs" | "team";
}

export function DeltaMobileBottomNav({
  unopenedPacks = 3,
  activeItem = "dashboard"
}: MobileBottomNavProps) {
  const items = [
    { id: "dashboard", label: "Pulpit", icon: LayoutDashboard, href: "/preview/dashboard-ui4?view=home" },
    { id: "schedule", label: "Terminarz", icon: Calendar, href: "/preview/dashboard-ui4?view=home#schedule" },
    { id: "collection", label: "Kolekcja", icon: Layers, href: "/preview/dashboard-ui4?view=collection" },
    {
      id: "packs",
      label: "Paczki",
      icon: Sparkles,
      href: "/preview/pack-demo",
      badge: unopenedPacks > 0 ? String(unopenedPacks) : null
    },
    { id: "team", label: "Drużyna", icon: Users, href: "/preview/dashboard-ui4#team" }
  ];

  return (
    <nav
      data-testid="delta-mobile-bottom-nav"
      className="d4-mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-lg px-2 py-1.5 shadow-2xl"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
                isActive
                  ? "text-amber-400 font-black"
                  : "text-slate-400 hover:text-slate-200 font-semibold"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default DeltaMobileBottomNav;
