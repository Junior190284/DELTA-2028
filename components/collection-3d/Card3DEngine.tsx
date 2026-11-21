"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Crown, Flame, Star, Dumbbell, Shield, Award, Medal } from "lucide-react";
import { Card3DEngineProps, CardVisualTheme } from "./types";
import { getCardVisualTheme } from "./themes";
import { getSpecialTitle, formatPlayerName } from "./specialTitles";
import { sanitizePlayerPhotoCandidate } from "@/lib/cards/playerVisuals";
import NeutralPlayerSilhouette from "@/components/cards/NeutralPlayerSilhouette";
import { faceForRotation, faceForFacingFactor, restingRotationAfterRelease } from "@/lib/cards/revealPresentation";
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
  snapBackOnRelease = false,
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
    // P12G: in the final reveal the card must not stay edge-on or showing the back
    // after a swipe. It returns to the front with the standard 0.85 s transition.
    if (snapBackOnRelease) {
      const rest = restingRotationAfterRelease();
      if (controlledYaw !== undefined && onRotationChange) {
        onRotationChange(rest.yaw, rest.pitch);
      } else {
        setInternalYaw(rest.yaw);
        setInternalPitch(rest.pitch);
        if (onRotationChange) onRotationChange(rest.yaw, rest.pitch);
      }
    }
  }, [isDragging, snapBackOnRelease, controlledYaw, onRotationChange]);

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
  const [playerImgLoaded, setPlayerImgLoaded] = useState(false);
  const [playerPhotoFadeDone, setPlayerPhotoFadeDone] = useState(false);
  const playerImgRef = useRef<HTMLImageElement>(null);

  // P12E: "loaded" means the photo is downloaded AND decoded (ready to paint). Before,
  // onLoad removed the silhouette immediately while the photo was still at opacity 0
  // (200 ms fade plus decoding a large PNG), so the card centre stayed EMPTY for a moment
  // on every newly mounted card (WALKOUT/HERO/CARD_REVEAL). Now the silhouette and
  // the photo crossfade: the silhouette is never removed before the photo becomes visible.
  const markPlayerImgReady = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    const done = () => setPlayerImgLoaded(true);
    if (typeof img.decode === "function") {
      img.decode().then(done, done);
    } else {
      done();
    }
  }, []);

  useEffect(() => {
    setPlayerImgError(false);
    setPlayerImgLoaded(false);
    setPlayerPhotoFadeDone(false);
    // An image already in the memory cache can finish before React attaches onLoad.
    const img = playerImgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) markPlayerImgReady(img);
      else if (img.currentSrc) setPlayerImgError(true);
    }
  }, [safePlayerSrc, markPlayerImgReady]);

  const hasRealOvr = typeof data.ovr === "number" && Number.isFinite(data.ovr) && data.ovr > 0;
  const hasRealStats = Boolean(data.stats);
  const hasShirtNumber = data.shirtNumber !== undefined && data.shirtNumber !== null && String(data.shirtNumber).trim() !== "";
  const hasPosition = Boolean(data.position && String(data.position).trim() !== "");

  // Effective visual yaw including flipped state
  const effectiveYaw = yaw + (isFlipped ? 180 : 0);

  // P12E: decide in JS which face points at the viewer instead of relying only on
  // backface-visibility. The face turned away gets visibility:hidden, so the browser
  // neither rasterises nor composites its layers.
  // The decision follows the ACTUALLY RENDERED transform (computed style during the
  // CSS transition), not the target state or a timer. In the film path yaw moves in
  // steps on timeupdate and the transition lags behind, so a timer could hide the
  // face that is still visible and leave a black slab. Until the card has really
  // turned to the target side (m33 = cos(pitch)*cos(yaw), with a margin of ±60°),
  // both faces stay rendered and backface-visibility handles the hand-off.
  // P12G: shared logic (lib/cards/revealPresentation): includes pitch, thresholds ±60°.
  const targetFaceRaw = faceForRotation(effectiveYaw, pitch);
  const targetFace: "front" | "back" | "both" = targetFaceRaw === "edge" ? "both" : targetFaceRaw;
  const [settledFace, setSettledFace] = useState<"front" | "back" | "both">("both");
  useEffect(() => {
    setSettledFace((prev) => (prev === targetFace ? prev : "both"));
    if (targetFace === "both") return;
    const el = cardRef.current;
    if (!el || typeof window === "undefined" || typeof window.DOMMatrix === "undefined") return;
    let raf = 0;
    let frames = 0;
    const check = () => {
      frames += 1;
      let m33 = 0;
      try {
        const t = window.getComputedStyle(el).transform;
        m33 = !t || t === "none" ? 1 : new window.DOMMatrix(t).m33;
      } catch {
        return; // unknown state: keep both faces rendered (safe)
      }
      if (faceForFacingFactor(m33) === targetFace) {
        setSettledFace(targetFace);
        return;
      }
      // Give up after ~10 s (e.g. tab in the background): both faces stay visible, which is safe.
      if (frames < 600) raf = window.requestAnimationFrame(check);
    };
    raf = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(raf);
  }, [targetFace]);
  const frontHidden = settledFace === "back";
  const backHidden = settledFace === "front";

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
        data-visible-face={settledFace}
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
        <div className={`inferno-card-face is-front ${frontHidden ? "is-face-hidden" : ""}`} aria-hidden={frontHidden || undefined}>
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

          {/* Refined Player Contact & Ambient Shadows (active only when real athlete cutout is loaded) */}
          {safePlayerSrc && !playerImgError && playerImgLoaded && (
            <>
              <div className="inferno-player-ambient-shadow" />
              <div className="inferno-player-contact-shadow" />
            </>
          )}

          {/* Hero Athlete Silhouette Stage */}
          <div className="inferno-player-stage">
            <div className="inferno-player-slot">
              {/* Fallback silhouette: visible while the photo is missing/loading; crossfades
                  under the photo (P12E) and unmounts only after the photo's fade has finished. */}
              {(!safePlayerSrc || playerImgError || !playerPhotoFadeDone) && (
                <div
                  data-testid="card3d-silhouette-layer"
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: safePlayerSrc && !playerImgError && playerImgLoaded ? 0 : 1,
                    transition: "opacity 220ms ease-out"
                  }}
                >
                  <NeutralPlayerSilhouette
                    shirtNumber={data.shirtNumber}
                    accentColor={theme.styling.fontAccentColor}
                    glowColor={theme.styling.accentGlow}
                    crestSrc={crestSrc}
                  />
                </div>
              )}

              {/* Real Athlete Cutout Image: Mounted when safe src exists; reveals smoothly on load */}
              {safePlayerSrc && !playerImgError && (
                <img
                  ref={playerImgRef}
                  className="inferno-player-cutout-img"
                  src={safePlayerSrc}
                  alt={`Zawodnik ${data.surname}`}
                  loading="eager"
                  onLoad={(e) => markPlayerImgReady(e.currentTarget)}
                  onError={() => {
                    setPlayerImgError(true);
                    setPlayerImgLoaded(false);
                  }}
                  onTransitionEnd={(e) => {
                    if (e.propertyName === "opacity" && playerImgLoaded) setPlayerPhotoFadeDone(true);
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: playerImgLoaded ? 1 : 0,
                    transition: "opacity 200ms ease-in"
                  }}
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
        <div className={`inferno-card-face is-back ${backHidden ? "is-face-hidden" : ""}`} aria-hidden={backHidden || undefined}>
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
