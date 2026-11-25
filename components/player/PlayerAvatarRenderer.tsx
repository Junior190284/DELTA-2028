"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Player } from "./PlayerExperience3D";
import type { EquipmentItem, LockerCategory } from "@/lib/locker-room/equipment-catalog";
import { RotateCw, MoveHorizontal, Sparkles, Award } from "lucide-react";

export interface PlayerAvatarRendererProps {
  player: Player;
  equipped: Record<LockerCategory, EquipmentItem>;
  preview: Record<LockerCategory, EquipmentItem>;
  rotationAngle?: number;
  onRotationChange?: (angle: number) => void;
  interactive?: boolean;
  className?: string;
  // Architektura pod przyszły etap V7G.2B (Model GLB):
  modelUrl?: string | null;
  onGlbModelLoaded?: () => void;
}

/**
 * PlayerAvatarRenderer (DELTA PLAYER 5.0)
 *
 * Uczciwy, interaktywny renderer sylwetki zawodnika z wielokątową perspektywą,
 * dynamicznym numerem na plecach koszulki (#10), rotacją 360°, obsługą myszy,
 * dotyku i klawiatury oraz architektonicznym slotem adaptera pod model GLB.
 */
export function PlayerAvatarRenderer({
  player,
  equipped,
  preview,
  rotationAngle: controlledAngle,
  onRotationChange,
  interactive = true,
  className = "",
  modelUrl = null,
  onGlbModelLoaded
}: PlayerAvatarRendererProps) {
  const [internalAngle, setInternalAngle] = useState(0);
  const [pitchAngle, setPitchAngle] = useState(0); // Pionowe pochylenie
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<number | null>(null);

  const angle = controlledAngle !== undefined ? controlledAngle : internalAngle;

  const updateAngle = useCallback((newAngle: number) => {
    // Normalizacja do zakresu -180 .. 180 stopni
    let normalized = newAngle % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;

    if (onRotationChange) {
      onRotationChange(normalized);
    } else {
      setInternalAngle(normalized);
    }
  }, [onRotationChange]);

  // Obsługa automatycznego obrotu (Auto-rotate demo)
  useEffect(() => {
    if (!isAutoRotating) {
      if (autoRotateRef.current) cancelAnimationFrame(autoRotateRef.current);
      return;
    }

    let lastTime = performance.now();
    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      updateAngle(angle + delta * 45); // 45 stopni na sekundę
      autoRotateRef.current = requestAnimationFrame(loop);
    };

    autoRotateRef.current = requestAnimationFrame(loop);
    return () => {
      if (autoRotateRef.current) cancelAnimationFrame(autoRotateRef.current);
    };
  }, [isAutoRotating, angle, updateAngle]);

  // Obsługa przeciągania myszą
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    setIsAutoRotating(false);
    setStartX(e.clientX);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !interactive) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setStartX(e.clientX);
    setStartY(e.clientY);

    updateAngle(angle + dx * 0.75);
    setPitchAngle(prev => Math.max(-10, Math.min(10, prev - dy * 0.2)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Obsługa gestów dotykowych (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive || e.touches.length === 0) return;
    setIsDragging(true);
    setIsAutoRotating(false);
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !interactive || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);

    updateAngle(angle + dx * 0.9);
    setPitchAngle(prev => Math.max(-10, Math.min(10, prev - dy * 0.25)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Obsługa nawigacji klawiaturą
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setIsAutoRotating(false);
      updateAngle(angle - 15);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setIsAutoRotating(false);
      updateAngle(angle + 15);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPitchAngle(prev => Math.min(10, prev + 2));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPitchAngle(prev => Math.max(-10, prev - 2));
    } else if (e.key === " " || e.key === "Home") {
      e.preventDefault();
      setIsAutoRotating(false);
      updateAngle(0);
      setPitchAngle(0);
    }
  };

  // Wyznaczenie perspektywy i widoku
  // angle 0 = przód; angle 180 / -180 = plecy (gdzie widać numer #10)
  const isBackView = Math.abs(angle) > 90;
  const backClarity = Math.max(0, (Math.abs(angle) - 45) / 135); // 0 przy przodzie, 1 przy pełnym tyle
  const frontClarity = 1 - backClarity;

  // Aktywne wyposażenie (podgląd przymierzany ma pierwszeństwo przed zaaprobowanym)
  const activeJersey = preview.jerseys || equipped.jerseys;
  const activeShorts = preview.shorts || equipped.shorts;
  const activeSocks = preview.socks || equipped.socks;
  const activeBoots = preview.boots || equipped.boots;
  const activeBall = preview.balls || equipped.balls;
  const activeAcc = preview.accessories || equipped.accessories;

  const rawShirtNumber = player.shirt_number 
    ? String(player.shirt_number).replace(/[^0-9]/g, "") 
    : "10";

  return (
    <div 
      ref={containerRef}
      className={`v7g-avatar-renderer-root ${className} ${isDragging ? "dragging" : ""}`}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label={`Interaktywny podgląd zawodnika: ${player.display_name}. Klawisze lewo/prawo obracają postać.`}
      data-testid="player-avatar-renderer"
    >
      {/* SCENA PODIUM I OŚWIETLENIE SZATNI */}
      <div 
        className="v7g-avatar-stage-3d"
        style={{
          transform: `perspective(900px) rotateY(${angle}deg) rotateX(${pitchAngle}deg)`,
        }}
      >
        {/* CIEŃ I PIERŚCIEŃ ŚWIETLNY NA PODŁODZE */}
        <div 
          className="v7g-avatar-floor-shadow" 
          style={{
            transform: `translate(-50%, -50%) rotateY(${-angle}deg) scale(${1 - Math.abs(pitchAngle) * 0.02})`,
            boxShadow: `0 0 35px ${activeJersey.styleModifiers.glowAura || "rgba(226, 46, 48, 0.35)"}`
          }}
        />

        {/* POSTAĆ ZAWODNIKA (WIELOWARSTWOWY RENDER 2D Z PRZESTRZENNYM PRZEKSZTAŁCENIEM) */}
        <div className="v7g-avatar-cutout-container">
          <picture>
            <source srcSet="/assets/stadium-experience/player_red_uniform_transparent.webp" type="image/webp" />
            <img 
              src="/assets/stadium-experience/player_red_uniform_transparent.png" 
              alt={player.display_name} 
              className="v7g-avatar-body-img"
              style={{
                filter: activeJersey.styleModifiers.tintFilter || "none"
              }}
              draggable={false}
            />
          </picture>

          {/* DYNAMICZNY NUMER NA PLECACH KOSZULKI (WIDOCZNY PRZY WIDOKU TYŁEM I OBRACANIU) */}
          <div 
            className="v7g-avatar-jersey-number"
            style={{
              opacity: Math.max(0.08, backClarity * 1.1),
              transform: `translate(-50%, -50%) scale(${0.85 + backClarity * 0.25})`,
              filter: `drop-shadow(0 2px 8px rgba(0, 0, 0, 0.95))`
            }}
            data-testid="avatar-jersey-number"
          >
            {rawShirtNumber}
          </div>

          {/* SYMULACJA AKCESORIÓW: OPASKA KAPITAŃSKA */}
          {activeAcc.id === "acc_captain_armband" && (
            <div 
              className="v7g-avatar-armband"
              title="Opaska kapitańska DELTY"
              style={{
                opacity: 0.9,
                transform: `translate(${angle > 0 ? 8 : -8}px, 0)`
              }}
            >
              <span className="v7g-armband-c">C</span>
            </div>
          )}

          {/* SYMULACJA BUTÓW: WSKAŹNIK MODELU */}
          <div 
            className="v7g-avatar-boots-glow"
            style={{
              backgroundColor: activeBoots.accentColor || "#334155",
              boxShadow: activeBoots.styleModifiers.glowAura || "none"
            }}
          />
        </div>

        {/* PIŁKA POSTAWIONA OBOK STOPY ZAWODNIKA NA PODŁODZE SZATNI */}
        <div 
          className="v7g-avatar-ball-fixture"
          style={{
            transform: `translate(42px, 14px) rotateY(${-angle}deg)`
          }}
          title={activeBall.name}
        >
          <div 
            className="v7g-ball-sphere"
            style={{
              borderColor: activeBall.accentColor,
              boxShadow: activeBall.styleModifiers.glowAura || "0 6px 14px rgba(0,0,0,0.8)"
            }}
          >
            <div className="v7g-ball-pentagon" />
          </div>
          <div className="v7g-ball-shadow" />
        </div>
      </div>

      {/* KONTROLKI INTERAKTYWNEGO OBROTU POSTACI */}
      {interactive && (
        <div className="v7g-avatar-controls-strip">
          <button
            type="button"
            className={`v7g-ctrl-btn ${Math.abs(angle) < 25 ? "active" : ""}`}
            onClick={() => { setIsAutoRotating(false); updateAngle(0); setPitchAngle(0); }}
            title="Widok z przodu (0°)"
            aria-label="Ustaw widok z przodu"
          >
            PRZÓD
          </button>

          <button
            type="button"
            className={`v7g-ctrl-btn ${Math.abs(angle - 45) < 20 ? "active" : ""}`}
            onClick={() => { setIsAutoRotating(false); updateAngle(45); }}
            title="Widok pod kątem (45°)"
            aria-label="Ustaw widok pod kątem 45 stopni"
          >
            3/4 PROFIL
          </button>

          <button
            type="button"
            className={`v7g-ctrl-btn ${Math.abs(angle) > 155 ? "active" : ""}`}
            onClick={() => { setIsAutoRotating(false); updateAngle(180); }}
            title="Widok z tyłu (Numer koszulki)"
            aria-label="Ustaw widok z tyłu"
          >
            TYŁ (#{rawShirtNumber})
          </button>

          <button
            type="button"
            className={`v7g-ctrl-btn rotate-toggle ${isAutoRotating ? "spinning" : ""}`}
            onClick={() => setIsAutoRotating(prev => !prev)}
            title="Włącz ciągły obrót 360°"
            aria-pressed={isAutoRotating}
          >
            <RotateCw size={12} className={isAutoRotating ? "animate-spin" : ""} />
            <span>360°</span>
          </button>
        </div>
      )}

      {/* INSTRUKCJA GESTU MYSZY / DOTYKU */}
      <div className="v7g-avatar-drag-hint">
        <MoveHorizontal size={12} />
        <span>Przeciągnij, aby obrócić • Strzałki klawiatury</span>
      </div>

      {/* ARCHITEKTONICZNY ADAPTER POD MODEL 3D GLB (V7G.2B READY) */}
      {modelUrl && (
        <div 
          className="v7g-glb-adapter-slot" 
          aria-hidden="true" 
          style={{ display: "none" }}
          data-glb-target={modelUrl}
        >
          {/* Slot przygotowany pod Three.js Canvas / GLB Loader bez łamania obecnego UI */}
        </div>
      )}
    </div>
  );
}

export default PlayerAvatarRenderer;
