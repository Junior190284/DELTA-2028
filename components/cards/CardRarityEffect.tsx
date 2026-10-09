"use client";

import React from "react";
import { DeltaCardTheme } from "@/lib/cards/deltaCardModel";

export interface CardRarityEffectProps {
  cardType: DeltaCardTheme;
  isHovered?: boolean;
}

export default function CardRarityEffect({ cardType, isHovered = false }: CardRarityEffectProps) {
  if (cardType === "STANDARD") return null;

  return (
    <div className="card-layer-rarity-fx absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-[4cqw] z-20">
      {/* INFERNO: Fire Ember Glow & Lava Particles */}
      {cardType === "INFERNO" && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-red-600/40 via-orange-500/20 to-transparent mix-blend-screen animate-pulse" />
          <div 
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-24 rounded-full bg-red-500/30 filter blur-xl mix-blend-screen"
            style={{ animation: "pulse 3s infinite ease-in-out" }}
          />
        </>
      )}

      {/* DELTA_ICON / GOLD_MASTER: Golden Aura & Prism Star Flare */}
      {(cardType === "DELTA_ICON" || cardType === "GOLD_MASTER") && (
        <>
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-transparent to-yellow-300/20 mix-blend-screen" />
          <div 
            className="absolute top-1/4 right-1/4 w-12 h-12 rounded-full bg-amber-300/25 filter blur-lg mix-blend-screen"
            style={{ opacity: isHovered ? 0.8 : 0.4, transition: "opacity 0.3s ease" }}
          />
        </>
      )}

      {/* TRAINING_HERO / MATCHDAY_HERO: Cyan Tech Energy Rings */}
      {(cardType === "TRAINING_HERO" || cardType === "MATCHDAY_HERO") && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-cyan-500/15 mix-blend-screen" />
      )}

      {/* CAPTAIN: Leadership Aura */}
      {cardType === "CAPTAIN" && (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 via-transparent to-fuchsia-400/15 mix-blend-screen" />
      )}

      {/* GOAL_MACHINE: Fire Energy Accent */}
      {cardType === "GOAL_MACHINE" && (
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/25 via-transparent to-amber-400/10 mix-blend-screen" />
      )}
    </div>
  );
}
