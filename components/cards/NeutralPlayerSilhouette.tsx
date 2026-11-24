"use client";

import React, { useId, useState } from "react";

export interface NeutralPlayerSilhouetteProps {
  shirtNumber?: string | number | null;
  accentColor?: string;
  glowColor?: string;
  crestSrc?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Neutralna sylwetka zawodnika DELTA (bez twarzy innego gracza) wyświetlana,
 * gdy zawodnik nie posiada własnego zdjęcia / cutoutu.
 * Zapewnia wysoką czytelność, dynamiczną aurę i herb DELTA zamiast czarnego/pustego pola.
 */
export default function NeutralPlayerSilhouette({
  shirtNumber,
  accentColor = "#fbbf24",
  glowColor = "rgba(251, 191, 36, 0.45)",
  crestSrc = "/teamlogos/gm.png",
  compact = false,
  className = ""
}: NeutralPlayerSilhouetteProps) {
  const [crestFailed, setCrestFailed] = useState(false);
  const uid = useId().replace(/:/g, "_");
  const gradId = `delta-neutral-grad-${uid}`;
  const strokeGradId = `delta-neutral-stroke-${uid}`;

  const cleanNumber =
    shirtNumber !== undefined && shirtNumber !== null && String(shirtNumber).trim() !== ""
      ? `#${String(shirtNumber).trim()}`
      : "DELTA";

  return (
    <div
      data-testid="neutral-player-silhouette"
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pointerEvents: "none",
        userSelect: "none",
        overflow: "visible"
      }}
    >
      {/* 1. Dynamic Radial Energy Aura behind silhouette */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          right: "5%",
          bottom: "8%",
          borderRadius: "9999px",
          background: `radial-gradient(circle at 50% 44%, ${glowColor} 0%, rgba(255, 255, 255, 0.08) 28%, rgba(0, 0, 0, 0) 72%)`,
          filter: "blur(22px)",
          opacity: 0.95,
          pointerEvents: "none"
        }}
      />

      {/* 2. Athletic Neon Silhouette SVG with modern sports jersey cut (zero facial traits) */}
      <svg
        viewBox="0 0 240 290"
        aria-hidden="true"
        style={{
          position: "relative",
          width: compact ? "84%" : "92%",
          height: compact ? "90%" : "98%",
          maxWidth: "100%",
          maxHeight: "100%",
          zIndex: 2,
          filter: `drop-shadow(0 14px 28px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 18px ${glowColor})`
        }}
      >
        <defs>
          {/* Luminous semi-translucent torso body gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.28)" />
            <stop offset="25%" stopColor="rgba(255, 255, 255, 0.16)" />
            <stop offset="65%" stopColor="rgba(15, 23, 42, 0.75)" />
            <stop offset="100%" stopColor="rgba(8, 12, 22, 0.94)" />
          </linearGradient>

          {/* Stroke highlight gradient */}
          <linearGradient id={strokeGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="35%" stopColor={accentColor} stopOpacity="0.92" />
            <stop offset="85%" stopColor={accentColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.25" />
          </linearGradient>

          {/* Subtle energetic jersey ribbing pattern */}
          <linearGradient id={`rib-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Minimal abstract athletic head/hood outline (no face) */}
        <circle
          cx="120"
          cy="52"
          r="28"
          fill={`url(#${gradId})`}
          stroke={`url(#${strokeGradId})`}
          strokeWidth="3.2"
        />

        {/* Shoulders & Athletic Torso Silhouette */}
        <path
          d="M42 278 L48 144 C48 110 74 92 102 90 L120 108 L138 90 C166 92 192 110 192 144 L198 278 Z"
          fill={`url(#${gradId})`}
          stroke={`url(#${strokeGradId})`}
          strokeWidth="3.4"
          strokeLinejoin="round"
        />

        {/* Subtle dynamic athletic chest contour wash */}
        <path
          d="M58 148 C72 128 100 118 120 120 C140 118 168 128 182 148 L184 220 C140 240 100 240 56 220 Z"
          fill={`url(#rib-${uid})`}
        />

        {/* Athletic collar V-neck */}
        <path
          d="M96 92 L120 122 L144 92"
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.95"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dynamic jersey side accent panels */}
        <path
          d="M62 155 L58 272 M178 155 L182 272"
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />

        {/* Dynamic athletic shoulder seam lines */}
        <line
          x1="66"
          y1="126"
          x2="102"
          y2="92"
          stroke={accentColor}
          strokeOpacity="0.75"
          strokeWidth="2.2"
        />
        <line
          x1="174"
          y1="126"
          x2="138"
          y2="92"
          stroke={accentColor}
          strokeOpacity="0.75"
          strokeWidth="2.2"
        />
      </svg>

      {/* 3. Centered DELTA Club Medallion with Crest & Large Jersey Number */}
      <div
        data-testid="neutral-silhouette-medallion"
        style={{
          position: "absolute",
          top: compact ? "48%" : "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? "3px" : "5px",
          padding: compact ? "8px 14px" : "10px 18px",
          borderRadius: "18px",
          // Dense high-contrast shield with luminous neon rim matching card rarity
          background: "linear-gradient(180deg, rgba(14, 20, 36, 0.92) 0%, rgba(6, 10, 18, 0.96) 100%)",
          border: `1.5px solid ${accentColor}`,
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.75), 0 0 20px ${glowColor}, inset 0 1px 1px rgba(255, 255, 255, 0.25)`
        }}
      >
        {!crestFailed ? (
          <img
            src={crestSrc}
            alt="DELTA Crest"
            onError={() => setCrestFailed(true)}
            style={{
              width: compact ? "30px" : "38px",
              height: compact ? "30px" : "38px",
              maxWidth: "44px",
              maxHeight: "44px",
              objectFit: "contain",
              filter: `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.8))`
            }}
          />
        ) : (
          /* Robust vector GM crest fallback */
          <svg
            viewBox="0 0 24 24"
            width={compact ? 26 : 32}
            height={compact ? 26 : 32}
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.12)" />
            <text
              x="12"
              y="15"
              textAnchor="middle"
              fill={accentColor}
              fontSize="7"
              fontWeight="900"
              fontFamily="sans-serif"
              stroke="none"
            >
              GM
            </text>
          </svg>
        )}

        <span
          className="e41-num"
          style={{
            fontSize: compact ? "14px" : "17px",
            fontWeight: 1000,
            letterSpacing: "0.08em",
            color: accentColor,
            textShadow: `0 0 12px ${glowColor}, 0 2px 4px #000`,
            lineHeight: 1
          }}
        >
          {cleanNumber}
        </span>
      </div>
    </div>
  );
}
