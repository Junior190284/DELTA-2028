"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { CardVisualTheme } from "./types";
import CanvasParticles from "@/components/CanvasParticles";
import "./stage.css";

export interface Stage3DEngineProps {
  theme: CardVisualTheme;
  lightingMode?: "dynamic" | "stadium" | "stealth";
  isShockwaving?: boolean;
  isFlashing?: boolean;
  isPulsing?: boolean;
  isScreenShaking?: boolean;
  enableParallax?: boolean;
  enableParticles?: boolean;
  stadiumZoom?: boolean;
  ribbonText?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Stage3DEngine({
  theme,
  lightingMode = "dynamic",
  isShockwaving = false,
  isFlashing = false,
  isPulsing = false,
  isScreenShaking = false,
  enableParallax = true,
  enableParticles = true,
  stadiumZoom = false,
  ribbonText,
  children,
  className = "",
  style
}: Stage3DEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse / Touch Parallax tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableParallax || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallaxOffset({ x: nx, y: ny });
  }, [enableParallax]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableParallax || !containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const nx = (touch.clientX - rect.left) / rect.width - 0.5;
    const ny = (touch.clientY - rect.top) / rect.height - 0.5;
    setParallaxOffset({ x: nx, y: ny });
  }, [enableParallax]);

  const handleMouseLeave = useCallback(() => {
    setParallaxOffset({ x: 0, y: 0 });
  }, []);

  // Theme dynamic CSS variables
  const themeCssVars = useMemo(() => {
    return {
      "--stage-core-glow": theme.stage.coreGlowColor,
      "--stage-reflector-l": theme.stage.reflectorLeft,
      "--stage-reflector-r": theme.stage.reflectorRight,
      "--stage-pulse-color": theme.stage.pulseColor,
      "--stage-primary-color": theme.styling.primaryColor,
      ...style
    } as React.CSSProperties;
  }, [theme, style]);

  // Particles theme mapping
  const particlesTheme = useMemo(() => {
    switch (theme.id) {
      case "INFERNO_ULTRA":
        return "inferno";
      case "GOLD_MASTER":
        return "gold";
      case "DELTA_ICON":
        return "legend";
      default:
        return "standard";
    }
  }, [theme.id]);

  const px = parallaxOffset.x;
  const py = parallaxOffset.y;

  return (
    <div
      ref={containerRef}
      className={`universal-stage-scene mode-${lightingMode} ${stadiumZoom ? "is-zooming" : ""} ${isScreenShaking ? "is-screen-shaking" : ""} ${isShockwaving ? "is-shockwaving" : ""} ${isFlashing ? "is-flashing" : ""} ${isPulsing ? "is-pulsing" : ""} ${className}`}
      style={themeCssVars}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. PARALLAX STADIUM BACKGROUND */}
      <div className="universal-stage-parallax">
        <div
          className="universal-stage-stands"
          style={{
            transform: enableParallax ? `translate(${px * -16}px, ${py * -10}px) scale(1.04)` : "scale(1.04)"
          }}
        >
          <img
            className="universal-stage-stadium-photo"
            src="/assets/stadium.png"
            alt="Stadium Atmosphere"
          />
          <div className="universal-stage-vignette" />

          {/* Stadium LED Ribbon Banner */}
          <div className="universal-stage-ribbon">
            <span>K.S. DELTA WARSZAWA</span>
            <span>•</span>
            <span>{ribbonText || `${theme.displayName} SHOWROOM`}</span>
            <span>•</span>
            <span>2018 GÓRNY MOKOTÓW</span>
          </div>
        </div>

        {/* Floodlight Truss Towers */}
        <div
          className="universal-stage-floodlights"
          style={{
            transform: enableParallax ? `translate(${px * -24}px, ${py * -14}px)` : "none"
          }}
        >
          <div className="universal-stage-tower">
            <div className="universal-stage-lamp-grid">
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
            </div>
          </div>
          <div className="universal-stage-tower">
            <div className="universal-stage-lamp-grid">
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
              <span className="universal-stage-lamp" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. VOLUMETRIC SPOTLIGHT BEAMS & AURA */}
      <div className="universal-stage-lights">
        <div className="universal-stage-beam-l" />
        <div className="universal-stage-beam-r" />
        <div className="universal-stage-core-glow" />
        <div className="universal-stage-smoke-a" />
        <div className="universal-stage-smoke-b" />

        {/* Floor Pedestal Ring */}
        <div className="universal-stage-pedestal">
          <div className="universal-stage-pedestal-inner" />
        </div>
      </div>

      {/* 3. REVEAL MOMENT FX */}
      <div className="universal-stage-shockwave" />
      <div className="universal-stage-flash" />
      <div className="universal-stage-pulse" />

      {/* 4. CANVAS PARTICLES (Atmospheric depth behind 3D card) */}
      {enableParticles && (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}>
          <CanvasParticles
            theme={particlesTheme}
            active={true}
          />
        </div>
      )}

      {/* 5. 3D HERO CONTENT (Centered Card) */}
      <div style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        flex: 1
      }}>
        {children}
      </div>
    </div>
  );
}
