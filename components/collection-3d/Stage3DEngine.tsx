"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { CardVisualTheme } from "./types";
import CanvasParticles from "@/components/CanvasParticles";
import { getRarityPresentation } from "@/lib/cards/rarityPresentation";
import "./stage.css";

export interface Stage3DEngineProps {
  theme: CardVisualTheme;
  rarity?: string | null;
  lightingMode?: "dynamic" | "stadium" | "stealth";
  isShockwaving?: boolean;
  isFlashing?: boolean;
  isPulsing?: boolean;
  isScreenShaking?: boolean;
  enableParallax?: boolean;
  enableParticles?: boolean;
  reducedMotion?: boolean;
  isMobile?: boolean;
  stadiumZoom?: boolean;
  ribbonText?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Stage3DEngine({
  theme,
  rarity,
  lightingMode = "dynamic",
  isShockwaving = false,
  isFlashing = false,
  isPulsing = false,
  isScreenShaking = false,
  enableParallax = true,
  enableParticles = true,
  reducedMotion = false,
  isMobile = false,
  stadiumZoom = false,
  ribbonText,
  children,
  className = "",
  style
}: Stage3DEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const effectiveParallax = enableParallax && !reducedMotion && !isMobile;

  // Mouse / Touch Parallax tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!effectiveParallax || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallaxOffset({ x: nx, y: ny });
  }, [effectiveParallax]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!effectiveParallax || !containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const nx = (touch.clientX - rect.left) / rect.width - 0.5;
    const ny = (touch.clientY - rect.top) / rect.height - 0.5;
    setParallaxOffset({ x: nx, y: ny });
  }, [effectiveParallax]);

  const handleMouseLeave = useCallback(() => {
    setParallaxOffset({ x: 0, y: 0 });
  }, []);

  const rarityProfile = useMemo(
    () => getRarityPresentation(rarity, theme.id),
    [rarity, theme.id]
  );

  // Theme dynamic CSS variables (layered with rarity accent)
  const themeCssVars = useMemo(() => {
    return {
      "--stage-core-glow": rarity ? rarityProfile.glowRgba : theme.stage.coreGlowColor,
      "--stage-reflector-l": theme.stage.reflectorLeft,
      "--stage-reflector-r": theme.stage.reflectorRight,
      "--stage-pulse-color": theme.stage.pulseColor,
      "--stage-primary-color": rarity ? rarityProfile.accentHex : theme.styling.primaryColor,
      "--stage-rarity-accent": rarityProfile.accentHex,
      "--stage-rarity-secondary": rarityProfile.secondaryGlowRgba,
      ...style
    } as React.CSSProperties;
  }, [theme, rarity, rarityProfile, style]);

  // Particles theme respects canonical rarity presentation tiers
  const particlesTheme = useMemo(() => {
    if (rarity) {
      return rarityProfile.stageParticlesTheme;
    }
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
  }, [rarity, rarityProfile.stageParticlesTheme, theme.id]);

  const shouldRenderParticles =
    enableParticles &&
    !reducedMotion &&
    (!rarity || rarityProfile.enableParticles);

  const px = effectiveParallax ? parallaxOffset.x : 0;
  const py = effectiveParallax ? parallaxOffset.y : 0;

  return (
    <div
      ref={containerRef}
      data-rarity={rarityProfile.tier}
      className={`universal-stage-scene mode-${lightingMode} ${stadiumZoom && !reducedMotion ? "is-zooming" : ""} ${isScreenShaking && !reducedMotion && !isMobile ? "is-screen-shaking" : ""} ${isShockwaving && !reducedMotion ? "is-shockwaving" : ""} ${isFlashing && !reducedMotion ? "is-flashing" : ""} ${isPulsing && !reducedMotion ? "is-pulsing" : ""} ${reducedMotion ? "is-reduced-motion" : ""} ${isMobile ? "is-mobile-stage" : ""} ${className}`}
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
            transform: effectiveParallax ? `translate(${px * -16}px, ${py * -10}px) scale(1.04)` : "scale(1.04)"
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
            transform: effectiveParallax ? `translate(${px * -24}px, ${py * -14}px)` : "none"
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
        <div className="universal-stage-corona" />
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
      {shouldRenderParticles && (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}>
          <CanvasParticles
            theme={particlesTheme}
            active={true}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
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
