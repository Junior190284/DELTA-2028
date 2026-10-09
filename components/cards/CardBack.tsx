"use client";

import React from "react";
import { RotateCw, Calendar, Tag, Shield, Award } from "lucide-react";
import { DeltaCardModel, DeltaThemeConfig } from "@/lib/cards/deltaCardModel";
import CardGlow from "./CardGlow";
import CardFrame from "./CardFrame";
import CardFoil from "./CardFoil";

export interface CardBackProps {
  card: DeltaCardModel;
  themeConfig: DeltaThemeConfig;
  showFlip?: boolean;
  onFlip?: (e?: React.MouseEvent) => void;
  glarePos?: { x: number; y: number; opacity: number };
}

export default function CardBack({
  card,
  themeConfig,
  showFlip = true,
  onFlip,
  glarePos
}: CardBackProps) {
  const backData = card.backData || {};
  const season = backData.season || "2026/27";
  const seriesName = backData.seriesName || themeConfig.label;
  const cardId = backData.cardId || `${themeConfig.seriesCode}-26-${card.id.slice(0, 4).toUpperCase()}`;
  const milestoneBadge = backData.milestoneBadge;
  const obtainedDate = card.obtainedAt 
    ? new Date(card.obtainedAt).toLocaleDateString("pl-PL", { year: "numeric", month: "2-digit", day: "2-digit" })
    : null;

  return (
    <div
      className="card-face-back absolute inset-0 w-full h-full rounded-[4cqw] overflow-hidden select-none"
      style={{
        transform: "rotateY(180deg)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden"
      }}
    >
      {/* 1. Background & Lighting */}
      <CardGlow themeConfig={themeConfig} isBack={true} />

      {/* 2. Club Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-10">
        <img
          src="/teamlogos/gm.png"
          alt="DELTA"
          className="w-1/2 h-1/2 object-contain grayscale brightness-150"
        />
      </div>

      {/* 3. Outer Frame */}
      <CardFrame themeConfig={themeConfig} />

      {/* 4. Content UI Overlay */}
      <div className="absolute inset-[8%] flex flex-col justify-between z-25 text-white pointer-events-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-[1cqw]">
          <div className="flex items-center gap-[1cqw]">
            <img
              src="/teamlogos/gm.png"
              alt="DELTA"
              className="w-[5cqw] h-[5cqw] object-contain"
            />
            <span className="text-[3cqw] font-black tracking-widest text-white/90">
              DELTA 2018 GM
            </span>
          </div>

          <div className="flex items-center gap-[1cqw]">
            <span
              className="text-[2.4cqw] font-extrabold uppercase px-[1.4cqw] py-[0.4cqw] rounded-[0.8cqw] border"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                borderColor: themeConfig.primaryColor,
                color: themeConfig.fontAccentColor
              }}
            >
              {themeConfig.badgePill}
            </span>

            {showFlip && (
              <button
                type="button"
                onClick={onFlip}
                className="p-[0.8cqw] rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white/90 hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
                title="Wróć na awers"
                aria-label="Wróć na awers"
              >
                <RotateCw className="w-[3cqw] h-[3cqw]" />
              </button>
            )}
          </div>
        </div>

        {/* Center Dossier */}
        <div className="flex flex-col gap-[1.5cqw] my-auto">
          {/* Player Banner */}
          <div className="text-center">
            <h3
              className="text-[5.5cqw] font-[1000] uppercase tracking-wider truncate"
              style={{
                color: themeConfig.fontAccentColor,
                textShadow: `0 0 10px ${themeConfig.accentGlow}`
              }}
            >
              {card.playerName}
            </h3>
            {card.shirtNumber && (
              <p className="text-[2.8cqw] font-bold text-slate-300">
                #{card.shirtNumber}
              </p>
            )}
          </div>

          {/* Meta Grid (Real Data: Sezon, Seria, Rzadkość, Numer Karty) */}
          <div className="grid grid-cols-2 gap-[1.2cqw] p-[1.5cqw] rounded-[1.5cqw] bg-black/50 border border-white/10 backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-[2.2cqw] font-extrabold text-slate-400 tracking-wider">SEZON</span>
              <span className="text-[3cqw] font-bold text-white">{season}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[2.2cqw] font-extrabold text-slate-400 tracking-wider">SERIA</span>
              <span className="text-[3cqw] font-bold text-white truncate">{seriesName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[2.2cqw] font-extrabold text-slate-400 tracking-wider">RARITY</span>
              <span className="text-[3cqw] font-bold uppercase" style={{ color: themeConfig.fontAccentColor }}>
                {card.rarity}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[2.2cqw] font-extrabold text-slate-400 tracking-wider">CARD ID</span>
              <span className="text-[2.8cqw] font-mono font-bold text-white truncate">{cardId}</span>
            </div>
          </div>

          {/* Acquisition / Milestone Source Info (Real data) */}
          {(obtainedDate || milestoneBadge || backData.lore) && (
            <div className="flex flex-col gap-[0.8cqw] p-[1.5cqw] rounded-[1.5cqw] bg-black/40 border border-white/10">
              {obtainedDate && (
                <div className="flex items-center justify-between text-[2.4cqw]">
                  <span className="text-slate-400 flex items-center gap-[0.6cqw]">
                    <Calendar className="w-[2.6cqw] h-[2.6cqw]" /> ZDOBYTO:
                  </span>
                  <span className="font-bold text-white">{obtainedDate}</span>
                </div>
              )}

              {milestoneBadge && (
                <div className="flex items-center justify-between text-[2.4cqw]">
                  <span className="text-slate-400 flex items-center gap-[0.6cqw]">
                    <Award className="w-[2.6cqw] h-[2.6cqw]" /> OSIĄGNIĘCIE:
                  </span>
                  <span className="font-bold" style={{ color: milestoneBadge.color }}>
                    {milestoneBadge.icon} {milestoneBadge.label}
                  </span>
                </div>
              )}

              {backData.lore && (
                <p className="text-[2.2cqw] text-slate-300 italic line-clamp-2 mt-[0.4cqw] border-t border-white/10 pt-[0.6cqw]">
                  "{backData.lore}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Stamp */}
        <div className="flex items-center justify-between border-t border-white/15 pt-[1cqw] text-[2.2cqw] text-slate-400 font-extrabold">
          <span>DELTA COLLECTOR SERIES</span>
          <span className="text-amber-400">★ OFFICIAL ★</span>
        </div>
      </div>

      {/* 5. Foil Sheen on Back */}
      <CardFoil themeConfig={themeConfig} glarePos={glarePos} />
    </div>
  );
}
