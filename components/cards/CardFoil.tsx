"use client";

import React from "react";
import { DeltaThemeConfig } from "@/lib/cards/deltaCardModel";

export interface CardFoilProps {
  themeConfig: DeltaThemeConfig;
  glarePos?: { x: number; y: number; opacity: number };
  isHovered?: boolean;
}

export default function CardFoil({
  themeConfig,
  glarePos = { x: 50, y: 50, opacity: 0 },
  isHovered = false
}: CardFoilProps) {
  if (themeConfig.foilType === "none") return null;

  const currentOpacity = glarePos.opacity > 0 ? glarePos.opacity : isHovered ? 0.45 : 0.25;

  return (
    <div className="card-layer-foil absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-[4cqw] z-30">
      {/* Specular Glare Gradient */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-200"
        style={{
          opacity: currentOpacity,
          background: themeConfig.foilType === "gold_refractor"
            ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(254, 240, 138, 0.8) 0%, rgba(217, 119, 6, 0.4) 30%, transparent 65%)`
            : themeConfig.foilType === "inferno_lava"
            ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 77, 90, 0.85) 0%, rgba(185, 28, 28, 0.45) 35%, transparent 70%)`
            : themeConfig.foilType === "holographic"
            ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.75) 0%, rgba(56, 189, 248, 0.4) 25%, rgba(192, 132, 252, 0.3) 50%, transparent 70%)`
            : themeConfig.foilType === "cosmic"
            ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(34, 211, 238, 0.8) 0%, rgba(168, 85, 247, 0.45) 40%, transparent 70%)`
            : `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.5) 0%, transparent 60%)`,
          mixBlendMode: themeConfig.foilType === "inferno_lava" ? "screen" : "color-dodge"
        }}
      />

      {/* Diagonal Prism Rainbow Angle Sheen for Holographic & Gold */}
      {(themeConfig.foilType === "holographic" || themeConfig.foilType === "gold_refractor") && (
        <div
          className="absolute inset-0 w-full h-full opacity-20 mix-blend-color-dodge pointer-events-none"
          style={{
            background: `linear-gradient(${115 + (glarePos.x - 50) * 0.5}deg, transparent 20%, rgba(255,255,255,0.4) 45%, rgba(245,158,11,0.5) 50%, rgba(56,189,248,0.4) 55%, transparent 80%)`,
            backgroundSize: "200% 200%",
            backgroundPosition: `${glarePos.x}% ${glarePos.y}%`
          }}
        />
      )}
    </div>
  );
}
