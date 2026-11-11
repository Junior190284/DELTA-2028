"use client";

import React from "react";

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
 */
export default function NeutralPlayerSilhouette({
  shirtNumber,
  accentColor = "#fbbf24",
  glowColor = "rgba(251, 191, 36, 0.45)",
  crestSrc = "/teamlogos/gm.png",
  compact = false,
  className = ""
}: NeutralPlayerSilhouetteProps) {
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
        overflow: "hidden"
      }}
    >
      {/* Radial aura behind silhouette */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "12%",
          borderRadius: "9999px",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 72%)`,
          filter: "blur(18px)",
          opacity: 0.72
        }}
      />

      {/* Geometric headless jersey & shoulders silhouette SVG (zero facial traits) */}
      <svg
        viewBox="0 0 240 280"
        aria-hidden="true"
        style={{
          width: compact ? "78%" : "86%",
          height: "92%",
          maxWidth: "100%",
          maxHeight: "100%",
          filter: `drop-shadow(0 12px 24px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 18px ${glowColor})`
        }}
      >
        <defs>
          <linearGradient id="delta-neutral-silhouette-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(30, 41, 59, 0.94)" />
            <stop offset="55%" stopColor="rgba(15, 23, 42, 0.96)" />
            <stop offset="100%" stopColor="rgba(2, 6, 23, 0.98)" />
          </linearGradient>
        </defs>
        {/* Minimal abstract athletic hood/crest frame (no face) */}
        <circle
          cx="120"
          cy="54"
          r="30"
          fill="url(#delta-neutral-silhouette-grad)"
          stroke={accentColor}
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
        {/* Shoulders & jersey torso silhouette */}
        <path
          d="M50 264 L54 148 C54 114 78 96 104 94 L120 112 L136 94 C162 96 186 114 186 148 L190 264 Z"
          fill="url(#delta-neutral-silhouette-grad)"
          stroke={accentColor}
          strokeOpacity="0.65"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Subtle V-neck / collar accent */}
        <path
          d="M96 96 L120 122 L144 96"
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.85"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Centered DELTA Club Crest + Number badge over chest area */}
      <div
        style={{
          position: "absolute",
          top: compact ? "50%" : "53%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? "4px" : "6px"
        }}
      >
        <img
          src={crestSrc}
          alt="DELTA Crest"
          style={{
            width: compact ? "28px" : "42px",
            height: compact ? "28px" : "42px",
            maxWidth: "44px",
            maxHeight: "44px",
            objectFit: "contain",
            opacity: 0.92,
            filter: `drop-shadow(0 0 10px ${glowColor})`
          }}
        />
        <span
          style={{
            fontSize: compact ? "11px" : "13px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            color: accentColor,
            textShadow: "0 2px 6px rgba(0,0,0,0.95)"
          }}
        >
          {cleanNumber}
        </span>
      </div>
    </div>
  );
}
