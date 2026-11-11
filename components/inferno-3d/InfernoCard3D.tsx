"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Crown, Flame, Star, Dumbbell, Shield, Award, Medal } from "lucide-react";
import { getSpecialTitle, formatPlayerName } from "./specialTitles";
import { sanitizePlayerPhotoCandidate } from "@/lib/cards/playerVisuals";
import NeutralPlayerSilhouette from "@/components/cards/NeutralPlayerSilhouette";
import "./inferno-card.css";

export interface InfernoStats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface InfernoCardData {
  name: string;
  number: string | number;
  position?: string;
  overall?: number;
  stats: InfernoStats;
  playerImage?: string | null;
  frontBg?: string;
  backBg?: string;
  frameImg?: string;
  fxImg?: string;
  crestImg?: string;
  specialTitleId?: string | null;
}

export interface InfernoCard3DProps {
  data: InfernoCardData;
  isFlipped?: boolean;
  autoRotate?: boolean;
  isRevealing?: boolean;
  isRevealingTitle?: boolean;
  showSpecialTitleGlow?: boolean;
  interactive?: boolean;
  yaw?: number;
  pitch?: number;
  onRotationChange?: (yaw: number, pitch: number) => void;
  className?: string;
}


interface EmberData {
  id: number;
  x: string;
  size: string;
  duration: string;
  delay: string;
  drift: string;
}

export function InfernoCard3D({
  data,
  isFlipped = false,
  autoRotate = false,
  isRevealing = false,
  isRevealingTitle = false,
  showSpecialTitleGlow = false,
  interactive = true,
  yaw: controlledYaw,
  pitch: controlledPitch,
  onRotationChange,
  className = ""
}: InfernoCard3DProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const specialTitle = getSpecialTitle(data.specialTitleId);
  const formattedName = formatPlayerName(data.name);

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

  // Internal rotation state when not controlled
  const [internalYaw, setInternalYaw] = useState<number>(-10);
  const [internalPitch, setInternalPitch] = useState<number>(6);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Particles
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

  // Generate embers on mount
  useEffect(() => {
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
    setFrontEmbers(makeEmbers(38));
    setBackEmbers(makeEmbers(28));
  }, []);

  // Update holographic shine CSS variables based on tilt
  useEffect(() => {
    if (!cardRef.current) return;
    const cardEl = cardRef.current;
    const shine1 = `${85 - yaw * 0.9}%`;
    const shine2 = `${12 + yaw * 0.8}%`;
    const shine3 = `${52 - pitch * 0.8}%`;

    cardEl.style.setProperty("--shine1", shine1);
    cardEl.style.setProperty("--shine2", shine2);
    cardEl.style.setProperty("--shine3", shine3);
  }, [yaw, pitch]);

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
    const newYaw = startYaw + (e.clientX - startX) * 0.55;
    const newPitch = Math.max(-28, Math.min(28, startPitch - (e.clientY - startY) * 0.35));

    if (onRotationChange) {
      onRotationChange(newYaw, newPitch);
    } else {
      setInternalYaw(newYaw);
      setInternalPitch(newPitch);
    }
  }, [isDragging, interactive, onRotationChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Assets with default fallbacks
  const frontBgSrc = data.frontBg || "/assets/cards/inferno-3d/front-bg.png";
  const backBgSrc = data.backBg || "/assets/cards/inferno-3d/back-bg.png";
  const frameSrc = data.frameImg || "/assets/cards/inferno-3d/frame.png";
  const fxSrc = data.fxImg || "/assets/cards/inferno-3d/fx.png";
  const safePlayerSrc = sanitizePlayerPhotoCandidate(data.playerImage, data.name);
  const crestSrc = data.crestImg || "/assets/cards/inferno-3d/delta-crest.png";
  const [playerImgError, setPlayerImgError] = useState(false);

  useEffect(() => {
    setPlayerImgError(false);
  }, [safePlayerSrc]);

  // Effective visual yaw including flipped state
  const effectiveYaw = yaw + (isFlipped ? 180 : 0);

  return (
    <div
      ref={sceneRef}
      className={`inferno-scene-viewport ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={`Interaktywna karta kolekcjonerska DELTA INFERNO 3D - ${data.name}`}
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
        {/* Physical 3D thickness / slab depth */}
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
            alt="Inferno Front Background"
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

          {/* Hero Athlete Silhouette Stage (Enlarged & Rim-lit) */}
          <div className="inferno-player-stage">
            <div className="inferno-player-slot">
              {safePlayerSrc && !playerImgError ? (
                <img
                  src={safePlayerSrc}
                  alt={`Zawodnik ${data.name}`}
                  loading="eager"
                  onError={() => setPlayerImgError(true)}
                />
              ) : (
                <NeutralPlayerSilhouette
                  shirtNumber={data.number}
                  accentColor="#ffca58"
                  glowColor="rgba(255, 60, 20, 0.55)"
                  crestSrc={crestSrc}
                />
              )}
            </div>
          </div>

          {/* Player Number */}
          <div className="inferno-player-number">{data.number}</div>

          {/* Club & Series Header */}
          <div className="inferno-brand-badge">
            <strong>DELTA 2018 GM</strong>
            <em>INFERNO</em>
          </div>

          {/* DEDICATED NAMEBAR (Sits neatly above bottom metal panel) */}
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
            <div className="inferno-front-submeta">
              <span className="inferno-front-pos-tag">{data.position || "FWD"}</span>
              <span className="inferno-front-ovr-tag">
                OVR <b>{data.overall || 88}</b>
              </span>
            </div>
          </div>

          {/* 6 STATS IN 3 COLUMNS × 2 ROWS (Sits right on bottom metal panel) */}
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

          {/* Energy FX, Frame, Holo Foil & Floating Embers */}
          <img
            className="inferno-layer-img inferno-fx-layer"
            src={fxSrc}
            alt=""
          />
          <img
            className="inferno-layer-img inferno-frame-layer"
            src={frameSrc}
            alt="Inferno Frame"
          />
          <div className="inferno-holo-foil" />
          <div className="inferno-sparktrail" />

          {/* Front rising embers */}
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
        </div>

        {/* ================= BACK FACE (REWERS) ================= */}
        <div className="inferno-card-face is-back">
          <img
            className="inferno-layer-img inferno-back-bg"
            src={backBgSrc}
            alt="Inferno Back Background"
          />
          <div className="inferno-smoke-a" />
          <div className="inferno-vignette" />

          {/* Real DELTA Crest Watermark in Background */}
          <div className="inferno-back-watermark">
            <img src={crestSrc} alt="" />
          </div>

          {/* Content UI with Real Crest Medallion and Prestigious Typography */}
          <div className="inferno-back-content">
            {/* Medallion with genuine club crest */}
            <div className="inferno-back-crest-medallion">
              <img src={crestSrc} alt="Herb K.S. Delta Warszawa 2018 GM" />
            </div>

            {/* Prestigious Titles */}
            <div className="inferno-back-titles-wrap">
              <h2>DELTA 2018 GM</h2>
              <span className="inferno-back-series-tag">
                INFERNO ULTRA RARE • 2018 GM
              </span>
            </div>

            {/* Golden Divider Line */}
            <div className="inferno-back-gold-divider" />

            {/* Credentials 3-box card: NR, POZYCJA, OVR */}
            <div className="inferno-back-creds-grid">
              <div className="inferno-back-cred-cell">
                <span>NUMER</span>
                <b>#{data.number}</b>
              </div>
              <div className="inferno-back-cred-cell">
                <span>POZYCJA</span>
                <b>{data.position || "FWD"}</b>
              </div>
              <div className="inferno-back-cred-cell">
                <span>OVR</span>
                <b>{data.overall || 88}</b>
              </div>
            </div>

            {/* Special Title Certification on Reverse */}
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

            {/* Official Certification Footer */}
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
            alt="Inferno Frame"
          />
          <div className="inferno-holo-foil" />

          {/* Back rising embers */}
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
        </div>
      </div>
    </div>
  );
}
export default InfernoCard3D;
