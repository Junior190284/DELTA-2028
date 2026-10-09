"use client";

import React from "react";
import { DeltaThemeConfig } from "@/lib/cards/deltaCardModel";

export interface CardGlowProps {
  themeConfig: DeltaThemeConfig;
  isBack?: boolean;
}

export default function CardGlow({ themeConfig, isBack = false }: CardGlowProps) {
  const bgImage = isBack ? themeConfig.backBgAsset : themeConfig.bgAsset;

  return (
    <div className="card-layer-background absolute inset-0 w-full h-full overflow-hidden rounded-[4cqw] pointer-events-none z-0">
      {/* Background Graphic Asset */}
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
        decoding="sync"
      />

      {/* Atmospheric Radial Halo */}
      <div
        className="absolute inset-0 w-full h-full mix-blend-screen opacity-50"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${themeConfig.accentGlow} 0%, transparent 75%)`
        }}
      />

      {/* Stadium Floodlights Beam */}
      <div
        className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[140%] h-[80%] pointer-events-none opacity-40 mix-blend-overlay"
        style={{
          background: `conic-gradient(from 180deg at 50% 0%, transparent 40%, ${themeConfig.primaryColor} 50%, transparent 60%)`
        }}
      />

      {/* Subdued Vignette */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/80 via-transparent to-black/40" />
    </div>
  );
}
