"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Crown, Flame, Star, Dumbbell, Shield, Award, Medal } from "lucide-react";
import { Card3DEngineProps, CardVisualTheme } from "./types";
import { getCardVisualTheme } from "./themes";
import { getSpecialTitle, formatPlayerName } from "./specialTitles";
import { sanitizePlayerPhotoCandidate } from "@/lib/cards/playerVisuals";
import NeutralPlayerSilhouette from "@/components/cards/NeutralPlayerSilhouette";
import "./collection-3d.css";

interface EmberData {
  id: number;
  x: string;
  size: string;
  duration: string;
  delay: string;
  drift: string;
}

export function Card3DEngine({
  data,
  theme: customTheme,
  isFlipped = false,
  autoRotate = false,
  isRevealing = false,
  isRevealingTitle = false,
  showSpecialTitleGlow = false,
  interactive = true,
  tiltSensitivity = 1.0,
  maxTiltAngle = 28,
  enableHolo = true,
  enableParallax = true,
  yaw: controlledYaw,
  pitch: controlledPitch,
  onRotationChange,
  className = ""
}: Card3DEngineProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoRotateAnimIdRef = useRef<number | null>(null);

  // Theme resolution: props > data.visualType > fallback INFERNO_ULTRA
  const theme: CardVisualTheme = customTheme || getCardVisualTheme(data.visualType);

  const specialTitle = getSpecialTitle(data.specialTitleId);
  const formattedName = formatPlayerName(data.surname);

  const renderTitleIcon = (iconName: string, size = 11) => {
    switch (iconName) {
      case "Crown": return <Crown size={size} />;
      case "Flame": return <Flame size={size} />;
      case "Star": return <Star size={size} />;
      case "Dumbbell": return <Dumbbell size={size} />;
      case "Shield": return <Shield size={size} />;
      case "Award": return <Award size={size} />;
      case "Medal": return <Medal size={size} />;
      default: return <Star size={size} />;
    }
  };

  // Internal rotation state when not externally driven
  const [internalYaw, setInternalYaw] = useState<number>(-10);
  const [internalPitch, setInternalPitch] = useState<number>(6);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Particles / Embers
  const [frontEmbers, setFrontEmbers] = useState<EmberData[]>([]);
  const [backEmbers, setBackEmbers] = useState<EmberData[]>([]);

  const yaw = controlledYaw !== undefined ? controlledYaw : internalYaw;
  const pitch = controlledPitch !== undefined ? controlledPitch : internalPitch;

  // Interaction refs
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startYaw: number;
    startPitch: number;
  }>({ startX: 0, startY: 0, startYaw: 0, startPitch: 0 });

  // Generate embers on mount if theme supports embers (throttled on mobile, skipped under reduced-motion)
  useEffect(() => {
    const mqReduce =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    if (!theme.styling.hasEmbers || mqReduce) {
      setFrontEmbers([]);
      setBackEmbers([]);
      return;
    }
    const isNarrow = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const makeEmbers = (count: number): EmberData[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: `${(Math.random() * 96 + 2).toFixed(1)}%`,
        size: `${(2 + Math.random() * 4).toFixed(1)}px`,
        duration: `${(3 + Math.random() * 3.8).toFixed(2)}s`,
        delay: `${(-Math.random() * 6).toFixed(2)}s`,
        drift: `${(Math.random() * 110 - 55).toFixed(0)}px`
      }));
    };
    setFrontEmbers(makeEmbers(isNarrow ? 14 : 34));
    setBackEmbers(makeEmbers(isNarrow ? 10 : 24));
  }, [theme.styling.hasEmbers]);

  // Update holographic shine & specular glare CSS variables based on tilt
  useEffect(() => {
    if (!cardRef.current) return;
    const cardEl = cardRef.current;
    const shine1 = `${85 - yaw * 0.9}%`;
    const shine2 = `${12 + yaw * 0.8}%`;
    const shine3 = `${52 - pitch * 0.8}%`;
    const normYaw = (((yaw + 180) % 360) + 360) % 360 - 180;
    const glareX = `${Math.max(8, Math.min(92, 50 - normYaw * 0.9)).toFixed(1)}%`;
    const glareY = `${Math.max(8, Math.min(92, 48 + pitch * 1.15)).toFixed(1)}%`;
    const glareOpacity = Math.min(0.68, 0.22 + (Math.abs(normYaw) + Math.abs(pitch)) * 0.0085).toFixed(3);

    cardEl.style.setProperty("--shine1", shine1);
    cardEl.style.setProperty("--shine2", shine2);
    cardEl.style.setProperty("--shine3", shine3);
    cardEl.style.setProperty("--glare-x", glareX);
    cardEl.style.setProperty("--glare-y", glareY);
    cardEl.style.setProperty("--glare-opacity", glareOpacity);
  }, [yaw, pitch]);

  // Auto-rotation loop if requested
  useEffect(() => {
    if (!autoRotate) return;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (controlledYaw === undefined) {
        setInternalYaw((prev) => (prev + dt * 0.04) % 360);
      } else if (onRotationChange) {
        onRotationChange((controlledYaw + dt * 0.04) % 360, pitch);
      }
      autoRotateAnimIdRef.current = requestAnimationFrame(loop);
    };

    autoRotateAnimIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (autoRotateAnimIdRef.current) {
        cancelAnimationFrame(autoRotateAnimIdRef.current);
      }
    };
  }, [autoRotate, controlledYaw, pitch, onRotationChange]);

  // Pointer drag events (supports desktop mouse and mobile touch smoothly)
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startYaw: yaw,
      startPitch: pitch
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  }, [interactive, yaw, pitch]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !interactive) return;
    const { startX, startY, startYaw, startPitch } = dragStartRef.current;
    const newYaw = startYaw + (e.clientX - startX) * 0.55 * tiltSensitivity;
    const newPitch = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, startPitch - (e.clientY - startY) * 0.35 * tiltSensitivity));

    if (controlledYaw !== undefined && onRotationChange) {
      onRotationChange(newYaw, newPitch);
    } else {
      setInternalYaw(newYaw);
      setInternalPitch(newPitch);
      if (onRotationChange) onRotationChange(newYaw, newPitch);
    }
  }, [isDragging, interactive, controlledYaw, onRotationChange, tiltSensitivity, maxTiltAngle]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  }, [isDragging]);

  // Assets from theme
  const frontBgSrc = theme.assets.frontBg;
  const backBgSrc = theme.assets.backBg;
  const frameSrc = theme.assets.frameImg;
  const fxSrc = theme.assets.fxImg || "/assets/cards/inferno-3d/fx.png";
  const crestSrc = theme.assets.crestImg || "/assets/cards/inferno-3d/delta-crest.png";
  const safePlayerSrc = sanitizePlayerPhotoCandidate(
    data.imageUrl,
    data.fullDisplayName || data.surname
  );
  const [playerImgError, setPlayerImgError] = useState(false);

  useEffect(() => {
    setPlayerImgError(false);
  }, [safePlayerSrc]);

  const hasRealOvr = typeof data.ovr === "number" && Number.isFinite(data.ovr) && data.ovr > 0;
  const hasRealStats = Boolean(data.stats);
  const hasShirtNumber = data.shirtNumber !== undefined && data.shirtNumber !== null && String(data.shirtNumber).trim() !== "";
  const hasPosition = Boolean(data.position && String(data.position).trim() !== "");

  // Effective visual yaw including flipped state
  const effectiveYaw = yaw + (isFlipped ? 180 : 0);

  return (
    <div
      ref={sceneRef}
      className={`inferno-scene-viewport collection-card-theme ${theme.styling.themeClass} ${interactive ? "is-interactive" : "is-static"} ${!enableParallax ? "no-parallax" : ""} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={`Interaktywna karta kolekcjonerska DELTA 3D - ${data.surname}`}
      role="region"
    >
      {/* Ambient background aura & floor radiance */}
      <div className="inferno-aura" />
      <div className="inferno-floor-glow" />

      {/* 3D Card Object */}
      <div
        ref={cardRef}
        className={`inferno-card-object ${isDragging ? "is-dragging" : ""} ${isRevealing ? "is-reveal-animating" : ""}`}
        style={{
          transform: `rotateX(${pitch}deg) rotateY(${effectiveYaw}deg)`
        }}
      >
        {/* Physical 3D thickness / slab depth layers */}
        <div className="inferno-shell-layer inferno-shell-0" />
        <div className="inferno-shell-layer inferno-shell-1" />
        <div className="inferno-shell-layer inferno-shell-2" />
        <div className="inferno-edge-glow" />

        {/* ================= FRONT FACE ================= */}
        <div className="inferno-card-face is-front">
          {/* Base artwork */}
          <img
            className="inferno-layer-img inferno-front-bg"
            src={frontBgSrc}
            alt={`${theme.displayName} Front Background`}
          />

          {/* Environmental smoke & lights */}
          <div className="inferno-smoke-a" />
          <div className="inferno-smoke-b" />
          <div className="inferno-vignette" />
          <div className="inferno-spotlight" />

          {/* Hero Player Back Glow */}
          <div className="inferno-player-back-glow" />

          {/* Refined Player Contact & Ambient Shadows */}
          <div className="inferno-player-ambient-shadow" />
          <div className="inferno-player-contact-shadow" />

          {/* Hero Athlete Silhouette Stage */}
          <div className="inferno-player-stage">
            <div className="inferno-player-slot">
              {safePlayerSrc && !playerImgError ? (
                <img
                  src={safePlayerSrc}
                  alt={`Zawodnik ${data.surname}`}
                  loading="eager"
                  onError={() => setPlayerImgError(true)}
                />
              ) : (
                <NeutralPlayerSilhouette
                  shirtNumber={data.shirtNumber}
                  accentColor={theme.styling.fontAccentColor}
                  glowColor={theme.styling.accentGlow}
                  crestSrc={crestSrc}
                />
              )}
            </div>
          </div>

          {/* Player Number */}
          {hasShirtNumber && (
            <div className="inferno-player-number">{data.shirtNumber}</div>
          )}

          {/* Club & Series Header */}
          <div className="inferno-brand-badge">
            <strong>DELTA 2018 GM</strong>
            <em>{theme.badgeLabel}</em>
          </div>

          {/* DEDICATED NAMEBAR */}
          <div className="inferno-front-namebar">
            {specialTitle && (
              <div
                className={`inferno-special-title-badge ${showSpecialTitleGlow ? "is-holo-glow" : ""} ${isRevealingTitle ? "is-revealing-title" : ""}`}
                style={{
                  background: specialTitle.theme.bg,
                  borderColor: specialTitle.theme.border,
                  color: specialTitle.theme.text,
                  boxShadow: specialTitle.theme.glow
                }}
              >
                <span className="inferno-special-title-icon" style={{ color: specialTitle.theme.accent }}>
                  {renderTitleIcon(specialTitle.iconName)}
                </span>
                <span className="inferno-special-title-label">
                  {specialTitle.label}
                </span>
                {specialTitle.theme.shimmer && (
                  <div
                    className="inferno-special-title-shimmer"
                    style={{ background: specialTitle.theme.shimmer }}
                  />
                )}
              </div>
            )}
            <div
              className={`inferno-front-name-text is-${formattedName.lengthCategory} ${formattedName.isMultiLine ? "is-multiline" : "is-single-line"}`}
              data-lines={formattedName.lines.length}
            >
              {formattedName.lines.map((line, idx) => (
                <span key={`name-line-${idx}`} className="inferno-name-line">
                  {line}
                </span>
              ))}
            </div>
            {(hasPosition || hasRealOvr || hasShirtNumber) && (
              <div className="inferno-front-submeta">
                {hasPosition && (
                  <span className="inferno-front-pos-tag">{data.position}</span>
                )}
                {hasShirtNumber && !hasRealOvr && (
                  <span className="inferno-front-pos-tag">#{data.shirtNumber}</span>
                )}
                {hasRealOvr && (
                  <span className="inferno-front-ovr-tag">
                    OVR <b>{data.ovr}</b>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 6 STATS ONLY IF REAL DATA EXISTS; OTHERWISE CLEAN REAL SERIES BAR */}
          {hasRealStats && data.stats ? (
            <div className="inferno-front-stats-panel">
              {/* Rząd 1: PAC, SHO, PAS */}
              <div className="inferno-front-stat-box">
                <span className="inferno-front-stat-label">PAC</span>
                <b className="inferno-front-stat-value">{data.stats.pac}</b>
              </div>
              <div className="inferno-front-stat-box">
                <span className="inferno-front-stat-label">SHO</span>
                <b className="inferno-front-stat-value">{data.stats.sho}</b>
              </div>
              <div className="inferno-front-stat-box">
                <span className="inferno-front-stat-label">PAS</span>
                <b className="inferno-front-stat-value">{data.stats.pas}</b>
              </div>

              {/* Rząd 2: DRI, DEF, PHY */}
              <div className="inferno-front-stat-box">
                <span className="inferno-front-stat-label">DRI</span>
                <b className="inferno-front-stat-value">{data.stats.dri}</b>
              </div>
              <div className="inferno-front-stat-box">
                <span className="inferno-front-stat-label">DEF</span>
                <b className="inferno-front-stat-value">{data.stats.def}</b>
              </div>
              <div className="inferno-front-stat-box">
                <span className="inferno-front-stat-label">PHY</span>
                <b className="inferno-front-stat-value">{data.stats.phy}</b>
              </div>
            </div>
          ) : (
            <div className="inferno-front-series-bar">
              <span>{theme.badgeLabel}</span>
              <span>•</span>
              <b>{data.season || "2026/27"}</b>
            </div>
          )}

          {/* Energy FX, Frame & Holo Foil */}
          <img
            className="inferno-layer-img inferno-fx-layer"
            src={fxSrc}
            alt=""
          />
          <img
            className="inferno-layer-img inferno-frame-layer"
            src={frameSrc}
            alt={`${theme.displayName} Frame`}
          />
          {enableHolo && (
            <>
              <div className="inferno-specular-glare" />
              <div className="inferno-holo-foil" />
              <div className="inferno-sparktrail" />
            </>
          )}

          {/* Rising embers (if theme hasEmbers is enabled) */}
          {theme.styling.hasEmbers && (
            <div className="inferno-embers-wrap">
              {frontEmbers.map((e) => (
                <i
                  key={`front-e-${e.id}`}
                  className="inferno-ember-particle"
                  style={
                    {
                      "--ember-x": e.x,
                      "--ember-size": e.size,
                      "--ember-duration": e.duration,
                      "--ember-delay": e.delay,
                      "--ember-drift": e.drift
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ================= BACK FACE (REWERS) ================= */}
        <div className="inferno-card-face is-back">
          <img
            className="inferno-layer-img inferno-back-bg"
            src={backBgSrc}
            alt={`${theme.displayName} Back Background`}
          />
          <div className="inferno-smoke-a" />
          <div className="inferno-vignette" />

          {/* DELTA Crest Watermark */}
          <div className="inferno-back-watermark">
            <img 
              src={crestSrc} 
              alt="" 
              style={{
                width: "72%",
                height: "72%",
                maxWidth: "72%",
                maxHeight: "72%",
                objectFit: "contain",
                pointerEvents: "none"
              }}
            />
          </div>

          {/* Back Content UI */}
          <div className="inferno-back-content">
            <div className="inferno-back-crest-medallion">
              <img 
                src={crestSrc} 
                alt="Herb K.S. Delta Warszawa 2018 GM" 
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  pointerEvents: "none"
                }}
              />
            </div>

            <div className="inferno-back-titles-wrap">
              <h2>DELTA 2018 GM</h2>
              <span className="inferno-back-series-tag">
                {theme.seriesLabel}
              </span>
            </div>

            <div className="inferno-back-gold-divider" />

            {/* Credentials 3-box grid (strictly real data — no invented OVR or fake position) */}
            <div className="inferno-back-creds-grid">
              <div className="inferno-back-cred-cell">
                <span>NUMER</span>
                <b>{hasShirtNumber ? `#${data.shirtNumber}` : "—"}</b>
              </div>
              <div className="inferno-back-cred-cell">
                <span>POZYCJA</span>
                <b>{hasPosition ? data.position : "—"}</b>
              </div>
              {hasRealOvr ? (
                <div className="inferno-back-cred-cell">
                  <span>OVR</span>
                  <b>{data.ovr}</b>
                </div>
              ) : (
                <div className="inferno-back-cred-cell">
                  <span>SEZON</span>
                  <b>{data.season || "2026/27"}</b>
                </div>
              )}
            </div>

            {/* Special Title Certification */}
            {specialTitle && (
              <div
                className="inferno-back-title-badge"
                style={{
                  background: specialTitle.theme.bg,
                  borderColor: specialTitle.theme.border,
                  color: specialTitle.theme.text
                }}
              >
                <span style={{ color: specialTitle.theme.accent }}>
                  {renderTitleIcon(specialTitle.iconName, 10)}
                </span>
                <span>TYTUŁ: <b>{specialTitle.label}</b></span>
              </div>
            )}

            <div className="inferno-back-footer-cert">
              OFICJALNA KARTA KOLEKCJONERSKA DELTA
            </div>
          </div>

          <img
            className="inferno-layer-img inferno-fx-layer"
            src={fxSrc}
            alt=""
          />
          <img
            className="inferno-layer-img inferno-frame-layer"
            src={frameSrc}
            alt={`${theme.displayName} Frame`}
          />
          {enableHolo && <div className="inferno-holo-foil" />}

          {/* Back rising embers */}
          {theme.styling.hasEmbers && (
            <div className="inferno-embers-wrap">
              {backEmbers.map((e) => (
                <i
                  key={`back-e-${e.id}`}
                  className="inferno-ember-particle"
                  style={
                    {
                      "--ember-x": e.x,
                      "--ember-size": e.size,
                      "--ember-duration": e.duration,
                      "--ember-delay": e.delay,
                      "--ember-drift": e.drift
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Card3DEngine;
