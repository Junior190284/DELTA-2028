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
    <div 
      className="card-layer-header"
      style={{
        position: "absolute",
        left: "7%",
        right: "7%",
        top: "8%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none",
        zIndex: 35
      }}
    >
      {/* Top-Left: Club Crest & Shirt Number (Real data only, NO fake OVR/Flag/Position) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1cqw",
          pointerEvents: "none",
          minWidth: 0
        }}
      >
        <img
          src="/teamlogos/gm.png"
          alt="DELTA"
          style={{
            width: "7cqw",
            height: "7cqw",
            maxWidth: "7cqw",
            maxHeight: "7cqw",
            objectFit: "contain",
            flexShrink: 0,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.85))"
          }}
        />
        {shirtNumber && !isLocked && (
          <span
            style={{
              fontSize: "4.6cqw",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: themeConfig.fontAccentColor,
              textShadow: `0 0 8px ${themeConfig.accentGlow}, 0 2px 4px #000`,
              whiteSpace: "nowrap"
            }}
          >
            #{shirtNumber}
          </span>
        )}
      </div>

      {/* Top-Right: Series Pill, Milestone Badge, Duplicates, Favorite, Flip */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.9cqw",
          pointerEvents: "auto",
          maxWidth: "62%"
        }}
      >
        {/* Edition Pill */}
        <span
          style={{
            fontSize: "2.5cqw",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight: 1.1,
            padding: "0.7cqw 1.6cqw",
            borderRadius: "1cqw",
            border: `1px solid ${themeConfig.primaryColor}`,
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(6px)",
            color: themeConfig.fontAccentColor,
            boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
            whiteSpace: "nowrap"
          }}
        >
          {themeConfig.badgePill}
        </span>

        {/* Real Milestone Badge if present */}
        {milestoneBadge && !isLocked && (
          <span
            style={{
              fontSize: "2.2cqw",
              fontWeight: 800,
              textTransform: "uppercase",
              lineHeight: 1.1,
              padding: "0.5cqw 1.2cqw",
              borderRadius: "0.8cqw",
              border: `1px solid ${milestoneBadge.color}`,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              color: milestoneBadge.color,
              boxShadow: `0 0 8px ${milestoneBadge.color}40`,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5cqw",
              whiteSpace: "nowrap"
            }}
          >
            <span>{milestoneBadge.icon}</span>
            <span>{milestoneBadge.label}</span>
          </span>
        )}

        {/* Action / Status Tray */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.8cqw",
            marginTop: "0.3cqw"
          }}
        >
          {/* Favorite Star */}
          {isFavorite && (
            <span
              style={{
                padding: "0.7cqw",
                borderRadius: "9999px",
                backgroundColor: "rgba(245, 158, 11, 0.22)",
                border: "1px solid #fbbf24",
                color: "#fcd34d",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Ulubiona karta"
            >
              <Star
                style={{
                  width: "3cqw",
                  height: "3cqw",
                  fill: "#fbbf24",
                  color: "#fbbf24"
                }}
              />
            </span>
          )}

          {/* Duplicates Badge */}
          {duplicatesCount > 0 && (
            <span
              style={{
                fontSize: "2.3cqw",
                fontWeight: 900,
                lineHeight: 1,
                padding: "0.5cqw 1.2cqw",
                borderRadius: "9999px",
                backgroundColor: "#0ea5e9",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
                whiteSpace: "nowrap"
              }}
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
              style={{
                padding: "1cqw",
                borderRadius: "9999px",
                backgroundColor: "rgba(0, 0, 0, 0.68)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
                color: "rgba(255, 255, 255, 0.92)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                pointerEvents: "auto"
              }}
              title="Obróć kartę (Rewers)"
              aria-label="Obróć kartę"
            >
              <RotateCw style={{ width: "3.4cqw", height: "3.4cqw", display: "block" }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
