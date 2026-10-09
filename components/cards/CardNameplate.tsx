"use client";

import React from "react";
import { DeltaThemeConfig } from "@/lib/cards/deltaCardModel";

export interface CardNameplateProps {
  playerName: string;
  shirtNumber?: string | null;
  themeConfig: DeltaThemeConfig;
  isLocked?: boolean;
}

export default function CardNameplate({
  playerName,
  shirtNumber,
  themeConfig,
  isLocked = false
}: CardNameplateProps) {
  const displayName = isLocked ? "???" : playerName.toUpperCase();
  
  // Calculate dynamic font-size for very long names (e.g. >16 chars)
  const isLong = displayName.length > 15;
  const isVeryLong = displayName.length > 20;
  const fontSize = isVeryLong ? "3.2cqw" : isLong ? "3.8cqw" : "4.4cqw";

  return (
    <div className="card-layer-nameplate absolute inset-x-[7%] top-[67%] h-[7%] flex items-center justify-center text-center pointer-events-none z-25 px-[2cqw]">
      <div className="flex items-center justify-center gap-[1cqw] max-w-full overflow-hidden">
        <span
          className="font-[1000] tracking-wider uppercase truncate whitespace-nowrap"
          style={{
            fontSize,
            color: themeConfig.fontAccentColor,
            textShadow: `0 0 10px ${themeConfig.accentGlow}, 0 2px 4px #000`,
            lineHeight: 1
          }}
        >
          {displayName}
        </span>
        
        {shirtNumber && !isLocked && (
          <span
            className="text-[3cqw] font-bold px-[1cqw] py-[0.2cqw] rounded-[0.6cqw] bg-black/50 text-white/80 border border-white/10 shrink-0"
            style={{ lineHeight: 1 }}
          >
            #{shirtNumber}
          </span>
        )}
      </div>
    </div>
  );
}
