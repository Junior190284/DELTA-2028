"use client";

import React from "react";
import { DeltaCardStatItem, DeltaThemeConfig } from "@/lib/cards/deltaCardModel";

export interface CardStatsPanelProps {
  stats?: DeltaCardStatItem[];
  themeConfig: DeltaThemeConfig;
  isLocked?: boolean;
}

export default function CardStatsPanel({
  stats,
  themeConfig,
  isLocked = false
}: CardStatsPanelProps) {
  // If no stats available or card is locked, do not render panel
  if (isLocked || !stats || stats.length === 0) {
    return null;
  }

  // Display up to 4 primary real stats cleanly in bottom plate
  const visibleStats = stats.slice(0, 4);
  const gridColsClass = 
    visibleStats.length === 1 ? "grid-cols-1" :
    visibleStats.length === 2 ? "grid-cols-2" :
    visibleStats.length === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="card-layer-stats absolute inset-x-[7%] top-[75%] bottom-[7%] flex items-center justify-center pointer-events-none z-25 px-[1cqw]">
      <div className={`grid ${gridColsClass} w-full items-center justify-items-center gap-[0.5cqw]`}>
        {visibleStats.map(item => (
          <div key={item.key} className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-[0.3cqw]">
              {item.icon && <span className="text-[2.6cqw] leading-none">{item.icon}</span>}
              <span
                className="text-[4.4cqw] font-[1000] leading-none tracking-tight"
                style={{
                  color: themeConfig.fontAccentColor,
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)"
                }}
              >
                {item.value}
              </span>
            </div>
            <span className="text-[2.4cqw] font-bold text-slate-300 uppercase tracking-wider leading-none mt-[0.3cqw]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
