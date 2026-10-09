"use client";

import React from "react";
import { Star, RotateCw } from "lucide-react";
import { DeltaThemeConfig } from "@/lib/cards/deltaCardModel";

export interface CardBadgeHeaderProps {
  shirtNumber?: string | null;
  themeConfig: DeltaThemeConfig;
  duplicatesCount?: number;
  isFavorite?: boolean;
  isLocked?: boolean;
  milestoneBadge?: { label: string; icon: string; color: string } | null;
  showFlip?: boolean;
  onFlip?: (e?: React.MouseEvent) => void;
}

export default function CardBadgeHeader({
  shirtNumber,
  themeConfig,
  duplicatesCount = 0,
  isFavorite = false,
  isLocked = false,
  milestoneBadge,
  showFlip = false,
  onFlip
}: CardBadgeHeaderProps) {
  return (
    <div className="card-layer-header absolute inset-x-[7%] top-[8%] flex justify-between items-start pointer-events-none z-25">
      {/* Top-Left: Club Crest & Shirt Number (Real data only, NO fake OVR/Flag/Position) */}
      <div className="flex items-center gap-[1cqw] pointer-events-none">
        <img
          src="/teamlogos/gm.png"
          alt="DELTA"
          className="w-[6cqw] h-[6cqw] object-contain filter drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
        />
        {shirtNumber && !isLocked && (
          <span
            className="text-[4.5cqw] font-[1000] tracking-tight leading-none"
            style={{
              color: themeConfig.fontAccentColor,
              textShadow: `0 0 8px ${themeConfig.accentGlow}, 0 2px 4px #000`
            }}
          >
            #{shirtNumber}
          </span>
        )}
      </div>

      {/* Top-Right: Series Pill, Milestone Badge, Duplicates, Favorite, Flip */}
      <div className="flex flex-col items-end gap-[0.8cqw] pointer-events-auto">
        {/* Edition Pill */}
        <span
          className="text-[2.8cqw] font-extrabold uppercase px-[1.8cqw] py-[0.6cqw] rounded-[1cqw] shadow-md border backdrop-blur-md whitespace-nowrap"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            borderColor: themeConfig.primaryColor,
            color: themeConfig.fontAccentColor
          }}
        >
          {themeConfig.badgePill}
        </span>

        {/* Real Milestone Badge if present */}
        {milestoneBadge && !isLocked && (
          <span
            className="text-[2.4cqw] font-bold uppercase px-[1.4cqw] py-[0.4cqw] rounded-[0.8cqw] border backdrop-blur-md flex items-center gap-[0.4cqw]"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              borderColor: milestoneBadge.color,
              color: milestoneBadge.color,
              boxShadow: `0 0 8px ${milestoneBadge.color}40`
            }}
          >
            <span>{milestoneBadge.icon}</span>
            <span>{milestoneBadge.label}</span>
          </span>
        )}

        {/* Action / Status Tray */}
        <div className="flex items-center gap-[0.6cqw] mt-[0.4cqw]">
          {/* Favorite Star */}
          {isFavorite && (
            <span
              className="p-[0.6cqw] rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 shadow-md flex items-center justify-center"
              title="Ulubiona karta"
            >
              <Star className="w-[3cqw] h-[3cqw] fill-amber-400 text-amber-400" />
            </span>
          )}

          {/* Duplicates Badge */}
          {duplicatesCount > 0 && (
            <span
              className="text-[2.4cqw] font-black px-[1.2cqw] py-[0.3cqw] rounded-full bg-sky-500 text-white border border-white/30 shadow-md"
              title={`Posiadasz duplikaty: ${duplicatesCount}`}
            >
              x{duplicatesCount + 1}
            </span>
          )}

          {/* Flip Button */}
          {showFlip && (
            <button
              type="button"
              onClick={onFlip}
              className="p-[0.8cqw] rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white/90 hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
              title="Obróć kartę (Rewers)"
              aria-label="Obróć kartę"
            >
              <RotateCw className="w-[3.2cqw] h-[3.2cqw]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
