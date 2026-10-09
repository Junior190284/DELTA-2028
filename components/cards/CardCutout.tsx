"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { DeltaCardTheme, DeltaThemeConfig } from "@/lib/cards/deltaCardModel";
import { CardLayoutConfig } from "@/lib/cards/types";

export interface CardCutoutProps {
  playerName: string;
  shirtNumber?: string | null;
  photoUrl?: string | null;
  artworkPose?: string | null;
  cardType: DeltaCardTheme;
  themeConfig: DeltaThemeConfig;
  isLocked?: boolean;
  layoutOverride?: Partial<CardLayoutConfig>;
}

export default function CardCutout({
  playerName,
  shirtNumber,
  photoUrl,
  artworkPose,
  cardType,
  themeConfig,
  isLocked = false,
  layoutOverride
}: CardCutoutProps) {
  const [imageError, setImageError] = useState(false);

  // Determine pose scale & position adjustments
  const poseScale = artworkPose === "action" ? 1.15 : artworkPose === "celebration" ? 1.2 : 1.05;
  const poseTranslateY = artworkPose === "action" ? -4 : artworkPose === "celebration" ? -6 : -2;

  const finalScale = (layoutOverride?.scale || poseScale);
  const finalTranslateX = layoutOverride?.translateX || 0;
  const finalTranslateY = (layoutOverride?.translateY || poseTranslateY);
  const finalRotate = layoutOverride?.rotate || 0;
  const finalBrightness = layoutOverride?.brightness || 1;
  const finalContrast = layoutOverride?.contrast || 1;

  if (isLocked) {
    return (
      <div className="card-layer-cutout absolute inset-0 w-full h-full flex flex-col items-center justify-center pointer-events-none z-10 p-4">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
          <Lock className="w-[8cqw] h-[8cqw] text-slate-400 animate-pulse mb-1" />
          <span className="text-[3cqw] font-black tracking-widest text-slate-300 uppercase">
            KARTA ZABLOKOWANA
          </span>
        </div>
      </div>
    );
  }

  const hasValidPhoto = photoUrl && !imageError;

  return (
    <div className="card-layer-cutout absolute top-[10%] left-[8%] right-[8%] bottom-[28%] flex items-end justify-center pointer-events-none z-10 overflow-hidden">
      {hasValidPhoto ? (
        <div
          className="w-full h-full flex items-end justify-center transition-transform duration-300"
          style={{
            transform: `translate(${finalTranslateX}%, ${finalTranslateY}%) scale(${finalScale}) rotate(${finalRotate}deg)`,
            filter: `brightness(${finalBrightness}) contrast(${finalContrast}) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.85))`
          }}
        >
          <img
            src={photoUrl}
            alt={playerName}
            className="max-w-full max-h-full object-contain object-bottom pointer-events-none"
            loading="eager"
            decoding="sync"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        /* Fallback: High-Tech Neon Silhouette with Jersey Crest & Number */
        <div
          className="w-full h-full flex flex-col items-center justify-center relative"
          style={{
            transform: `translate(${finalTranslateX}%, ${finalTranslateY}%) scale(${finalScale})`
          }}
        >
          {/* Radial Silhouette Glow */}
          <div
            className="absolute w-[36cqw] h-[36cqw] rounded-full filter blur-xl opacity-60 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${themeConfig.accentGlow} 0%, transparent 70%)`
            }}
          />

          {/* Stylized Silhouette Jersey Body */}
          <div className="relative flex flex-col items-center justify-center z-10">
            <img
              src="/teamlogos/gm.png"
              alt="DELTA"
              className="w-[12cqw] h-[12cqw] object-contain filter drop-shadow(0 0 8px rgba(255,255,255,0.6)) mb-1"
            />
            <span
              className="text-[6.5cqw] font-black tracking-tighter"
              style={{
                color: themeConfig.fontAccentColor,
                textShadow: `0 0 12px ${themeConfig.accentGlow}, 0 2px 4px #000`
              }}
            >
              {shirtNumber ? `#${shirtNumber}` : "GM"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
