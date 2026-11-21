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
          top: "12%",
          left: "8%",
          right: "8%",
          bottom: "10%",
          borderRadius: "9999px",
          background: `radial-gradient(circle at 50% 46%, ${glowColor} 0%, rgba(0, 0, 0, 0) 74%)`,
          filter: "blur(20px)",
          opacity: 0.88,
          pointerEvents: "none"
        }}
      />

      {/* 2. Athletic Neon Silhouette SVG with modern sports jersey cut (zero facial traits) */}
      <svg
        viewBox="0 0 240 290"
        aria-hidden="true"
        style={{
          position: "relative",
          width: compact ? "82%" : "90%",
          height: compact ? "88%" : "96%",
          maxWidth: "100%",
          maxHeight: "100%",
          zIndex: 2,
          filter: `drop-shadow(0 14px 28px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 16px ${glowColor})`
        }}
      >
        <defs>
          {/* Luminous semi-translucent torso body gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.12)" />
            <stop offset="75%" stopColor="rgba(15, 23, 42, 0.70)" />
            <stop offset="100%" stopColor="rgba(8, 12, 22, 0.90)" />
          </linearGradient>

          {/* Stroke highlight gradient */}
          <linearGradient id={strokeGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor={accentColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Minimal abstract athletic head/hood outline (no face) */}
        <circle
          cx="120"
          cy="52"
          r="28"
          fill={`url(#${gradId})`}
          stroke={`url(#${strokeGradId})`}
          strokeWidth="3"
        />

        {/* Shoulders & Athletic Torso Silhouette */}
        <path
          d="M42 278 L48 144 C48 110 74 92 102 90 L120 108 L138 90 C166 92 192 110 192 144 L198 278 Z"
          fill={`url(#${gradId})`}
          stroke={`url(#${strokeGradId})`}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />

        {/* Athletic collar V-neck */}
        <path
          d="M96 92 L120 120 L144 92"
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.9"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dynamic jersey side accent panels */}
        <path
          d="M62 160 L60 270 M178 160 L180 270"
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Subtle athletic shoulder seam lines */}
        <line
          x1="66"
          y1="126"
          x2="102"
          y2="92"
          stroke={accentColor}
          strokeOpacity="0.6"
          strokeWidth="2"
        />
        <line
          x1="174"
          y1="126"
          x2="138"
          y2="92"
          stroke={accentColor}
          strokeOpacity="0.6"
          strokeWidth="2"
        />
      </svg>

      {/* 3. Centered DELTA Club Medallion with Crest & Large Jersey Number */}
      <div
        data-testid="neutral-silhouette-medallion"
        style={{
          position: "absolute",
          top: compact ? "50%" : "52%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? "2px" : "4px",
          padding: compact ? "6px 12px" : "8px 16px",
          borderRadius: "16px",
          background: "rgba(10, 14, 24, 0.72)",
          border: `1.5px solid ${accentColor}`,
          boxShadow: `0 0 18px ${glowColor}, inset 0 0 10px rgba(255, 255, 255, 0.08)`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)"
        }}
      >
        {!crestFailed ? (
          <img
            src={crestSrc}
            alt="DELTA Crest"
            onError={() => setCrestFailed(true)}
            style={{
              width: compact ? "28px" : "36px",
              height: compact ? "28px" : "36px",
              maxWidth: "40px",
              maxHeight: "40px",
              objectFit: "contain",
              filter: `drop-shadow(0 0 8px ${glowColor})`
            }}
          />
        ) : (
          /* Robust vector GM crest fallback */
          <svg
            viewBox="0 0 24 24"
            width={compact ? 24 : 30}
            height={compact ? 24 : 30}
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
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
          style={{
            fontSize: compact ? "13px" : "16px",
            fontWeight: 1000,
            letterSpacing: "0.06em",
            color: accentColor,
            textShadow: `0 0 10px ${glowColor}, 0 2px 4px #000`,
            lineHeight: 1
          }}
        >
          {cleanNumber}
        </span>
      </div>
    </div>
  );
}
