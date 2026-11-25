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
    <div 
      className="card-layer-nameplate"
      style={{
        position: "absolute",
        left: "7%",
        right: "7%",
        top: "67%",
        height: "8%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 25,
        paddingLeft: "2cqw",
        paddingRight: "2cqw",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.2cqw",
          maxWidth: "100%",
          overflow: "hidden"
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 900,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: themeConfig.fontAccentColor,
            textShadow: `0 0 10px ${themeConfig.accentGlow}, 0 2px 4px #000`,
            lineHeight: 1.05
          }}
        >
          {displayName}
        </span>
        
        {shirtNumber && !isLocked && (
          <span
            style={{
              fontSize: "2.9cqw",
              fontWeight: 800,
              lineHeight: 1,
              padding: "0.45cqw 1.1cqw",
              borderRadius: "0.7cqw",
              backgroundColor: "rgba(0, 0, 0, 0.58)",
              color: "rgba(255, 255, 255, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}
          >
            #{shirtNumber}
          </span>
        )}
      </div>
    </div>
  );
}
