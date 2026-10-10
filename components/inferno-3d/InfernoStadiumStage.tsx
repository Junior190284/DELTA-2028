"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { InfernoCard3D, InfernoCardData } from "./InfernoCard3D";
import { SPECIAL_TITLES_REGISTRY } from "./specialTitles";
import CanvasParticles from "@/components/CanvasParticles";
import "./inferno-stage.css";

const PRESET_CARDS: Record<string, InfernoCardData> = {
  rybacki_kapitan: {
    name: "RYBACKI",
    number: 10,
    position: "FWD",
    overall: 88,
    stats: { pac: 88, sho: 84, pas: 81, dri: 89, def: 62, phy: 78 },
    playerImage: "/assets/cards/inferno-3d/player-default.png",
    frontBg: "/assets/cards/inferno-3d/front-bg.png",
    backBg: "/assets/cards/inferno-3d/back-bg.png",
    frameImg: "/assets/cards/inferno-3d/frame.png",
    fxImg: "/assets/cards/inferno-3d/fx.png",
    crestImg: "/assets/cards/inferno-3d/delta-crest.png",
    specialTitleId: "kapitan_delta"
  },
  brzeczyszczykiewicz_mvp: {
    name: "BRZĘCZYSZCZYKIEWICZ",
    number: 14,
    position: "MID",
    overall: 94,
    stats: { pac: 92, sho: 90, pas: 95, dri: 93, def: 75, phy: 84 },
    playerImage: "/assets/cards/inferno-3d/player-default.png",
    frontBg: "/assets/cards/inferno-3d/front-bg.png",
    backBg: "/assets/cards/inferno-3d/back-bg.png",
    frameImg: "/assets/cards/inferno-3d/frame.png",
    fxImg: "/assets/cards/inferno-3d/fx.png",
    crestImg: "/assets/cards/inferno-3d/delta-crest.png",
    specialTitleId: "mvp_turnieju"
  },
  lewandowski_kapitan: {
    name: "LEWANDOWSKI-KOWALSKI",
    number: 9,
    position: "FWD",
    overall: 92,
    stats: { pac: 89, sho: 94, pas: 85, dri: 88, def: 58, phy: 86 },
    playerImage: "/assets/cards/inferno-3d/player-default.png",
    frontBg: "/assets/cards/inferno-3d/front-bg.png",
    backBg: "/assets/cards/inferno-3d/back-bg.png",
    frameImg: "/assets/cards/inferno-3d/frame.png",
    fxImg: "/assets/cards/inferno-3d/fx.png",
    crestImg: "/assets/cards/inferno-3d/delta-crest.png",
    specialTitleId: "kapitan_delta"
  },
  rybacki_standard: {
    name: "RYBACKI",
    number: 10,
    position: "FWD",
    overall: 88,
    stats: { pac: 88, sho: 84, pas: 81, dri: 89, def: 62, phy: 78 },
    playerImage: "/assets/cards/inferno-3d/player-default.png",
    frontBg: "/assets/cards/inferno-3d/front-bg.png",
    backBg: "/assets/cards/inferno-3d/back-bg.png",
    frameImg: "/assets/cards/inferno-3d/frame.png",
    fxImg: "/assets/cards/inferno-3d/fx.png",
    crestImg: "/assets/cards/inferno-3d/delta-crest.png",
    specialTitleId: null
  }
};

type LightingMode = "inferno" | "matchday" | "stealth";

export function InfernoStadiumStage() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("rybacki_kapitan");
  const [cardData, setCardData] = useState<InfernoCardData>(PRESET_CARDS.rybacki_kapitan);

  // Card 3D transform state
  const [yaw, setYaw] = useState<number>(-10);
  const [pitch, setPitch] = useState<number>(6);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Reveal & lighting FX states
  const [isStageRevealing, setIsStageRevealing] = useState<boolean>(false);
  const [isShockwaveActive, setIsShockwaveActive] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [lightingMode, setLightingMode] = useState<LightingMode>("inferno");

  // Parallax tracking coordinates
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [parallaxOffset, setParallaxOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const revealTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach((t) => clearTimeout(t));
    revealTimersRef.current = [];
    setIsStageRevealing(false);
    setIsShockwaveActive(false);
    setIsFlashing(false);
  }, []);

  // Parse URL query on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const nameParam = params.get("name");
      const titleParam = params.get("title");

      if (nameParam || titleParam !== null) {
        setCardData((prev) => ({
          ...prev,
          name: nameParam ? nameParam.toUpperCase() : prev.name,
          specialTitleId: titleParam === "none" || titleParam === "false" ? null : (titleParam || prev.specialTitleId)
        }));
      }

      if (params.get("flipped") === "1" || params.get("flipped") === "true") {
        setIsFlipped(true);
      }

      const modeParam = params.get("mode");
      if (modeParam === "matchday" || modeParam === "stealth" || modeParam === "inferno") {
        setLightingMode(modeParam as LightingMode);
      }
    }
  }, []);

  // Smooth lerp 60fps parallax loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const target = mouseTargetRef.current;
      const current = mouseCurrentRef.current;

      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;

      setParallaxOffset({ x: current.x, y: current.y });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Mouse move handler for stadium parallax
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width * 2 - 1; // -1 to 1
    const ny = (e.clientY - rect.top) / rect.height * 2 - 1; // -1 to 1

    mouseTargetRef.current = { x: nx, y: ny };
  }, []);

  // Touch move handler for mobile parallax
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const nx = (touch.clientX - rect.left) / rect.width * 2 - 1;
    const ny = (touch.clientY - rect.top) / rect.height * 2 - 1;

    mouseTargetRef.current = { x: nx, y: ny };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseTargetRef.current = { x: 0, y: 0 };
  }, []);

  // Auto-rotation loop
  useEffect(() => {
    if (!autoRotate) return;
    let animId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = now - last;
      if (dt > 20) {
        setYaw((prev) => (prev + 0.35) % 360);
        last = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate]);

  // Synchronized Stadium Reveal Experience
  const triggerStadiumReveal = useCallback(() => {
    clearRevealTimers();
    setAutoRotate(false);
    setIsStageRevealing(true);

    // 0.0s: Prepare on reverse, dim searchlights
    setIsFlipped(true);
    setYaw(12);
    setPitch(-3);

    // 1.0s: 3D rotation begins, spotlights focus inward
    const t1 = setTimeout(() => {
      setIsFlipped(false);
      setYaw(-25);
      setPitch(8);
    }, 1000);

    // 2.5s: Reveal surge & floor shockwave
    const t2 = setTimeout(() => {
      setIsShockwaveActive(true);
      setYaw(-15);
      setPitch(6);
    }, 2500);

    // 3.5s: Flash burst & hero spotlight peak
    const t3 = setTimeout(() => {
      setIsFlashing(true);
      setYaw(-10);
      setPitch(5);
    }, 3500);

    // 4.2s: Settle flash
    const t4 = setTimeout(() => {
      setIsFlashing(false);
      setIsShockwaveActive(false);
    }, 4200);

    // 5.0s: Complete reveal sequence, leave card in hero presentation
    const t5 = setTimeout(() => {
      setIsStageRevealing(false);
    }, 5000);

    revealTimersRef.current = [t1, t2, t3, t4, t5];
  }, [clearRevealTimers]);

  // Switch preset player
  const handleSelectPreset = (key: string) => {
    clearRevealTimers();
    setSelectedPresetKey(key);
    if (PRESET_CARDS[key]) {
      setCardData(PRESET_CARDS[key]);
    }
  };

  const px = parallaxOffset.x;
  const py = parallaxOffset.y;

  return (
    <div
      ref={containerRef}
      className={`inferno-stadium-scene mode-${lightingMode} ${isStageRevealing ? "is-stage-revealing" : ""} ${isShockwaveActive ? "is-shockwave-active" : ""}`}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. PARALLAX STADIUM VIEWPORT */}
      <div className="stage-parallax-viewport">
        {/* Layer 0: Nocturnal Stands */}
        <div
          className="stage-layer-stands"
          style={{
            transform: `translate(${px * -16}px, ${py * -10}px) scale(1.04)`
          }}
        >
          <img
            className="stage-stadium-photo"
            src="/assets/stadium.png"
            alt="Stadium Stands Night"
          />
          <div className="stage-stadium-vignette" />

          {/* LED Stadium Ribbon */}
          <div className="stage-stadium-ribbon">
            <span>K.S. DELTA WARSZAWA</span>
            <span>•</span>
            <span>INFERNO ULTRA STADIUM</span>
            <span>•</span>
            <span>2018 GÓRNY MOKOTÓW</span>
          </div>
        </div>

        {/* Layer 1: Floodlight Clusters on Truss Towers */}
        <div
          className="stage-layer-floodlights"
          style={{
            transform: `translate(${px * -24}px, ${py * -14}px)`
          }}
        >
          <div className="stage-floodlight-cluster is-left">
            <span className="stage-bulb" />
            <span className="stage-bulb" />
            <span className="stage-bulb" />
            <span className="stage-bulb" />
          </div>
          <div className="stage-floodlight-cluster is-right">
            <span className="stage-bulb" />
            <span className="stage-bulb" />
            <span className="stage-bulb" />
            <span className="stage-bulb" />
          </div>
        </div>

        {/* Layer 2: Volumetric Spotlights & Beams */}
        <div
          className="stage-volumetric-layer"
          style={{
            transform: `translate(${px * -18}px, ${py * -10}px)`
          }}
        >
          <div className="stage-beam is-left" />
          <div className="stage-beam is-right" />
          <div className="stage-beam is-center-spot" />
          <div className="stage-card-back-aura" />
        </div>

        {/* Layer 3: Drifting Mist & Fog */}
        <div
          className="stage-mist-layer"
          style={{
            transform: `translate(${px * -28}px, ${py * -14}px)`
          }}
        />

        {/* Floating Embers in Stadium Air */}
        <CanvasParticles theme="inferno" active={true} />
      </div>

      {/* Full-screen Flash Burst during Reveal */}
      <div className={`stage-flash-burst ${isFlashing ? "is-flashing" : ""}`} />

      {/* 2. TOP UI BAR */}
      <header className="stage-top-bar">
        <div className="stage-brand-meta">
          <div className="stage-brand-tag">
            <span>DELTA 2018 GM</span>
            <b>•</b>
            <span>INFERNO STAGE V1</span>
          </div>
          <h1 className="stage-title">
            STADIUM <span>SHOWROOM</span>
          </h1>
        </div>

        <nav className="stage-links-group">
          <Link href="/lab/inferno-card" className="stage-nav-pill">
            🎴 Lab Karty (Edytor V5.1)
          </Link>
          <Link href="/lab/inferno-walkout" className="stage-nav-pill">
            🎬 Walkout Lab (12s)
          </Link>
        </nav>
      </header>

      {/* 3. CENTRAL HERO PRESENTATION WITH GLOSSY REFLECTIVE FLOOR */}
      <div className="stage-center-anchor">
        <div className="stage-card-floating-wrapper">
          <InfernoCard3D
            data={cardData}
            isFlipped={isFlipped}
            autoRotate={autoRotate}
            isRevealing={isStageRevealing}
            yaw={yaw}
            pitch={pitch}
            onRotationChange={(newYaw, newPitch) => {
              if (isStageRevealing) clearRevealTimers();
              setYaw(newYaw);
              setPitch(newPitch);
            }}
          />
        </div>

        {/* Ciemna, lekko odbijająca podłoga pod zawieszoną kartą */}
        <div className="stage-reflective-floor">
          <div className="stage-floor-pedestal">
            <div className="stage-floor-ring" />
            <div className="stage-floor-specular" />
            <div className="stage-contact-shadow" />
            <div className="stage-floor-shockwave" />
          </div>

          {/* Subtelne lustrzane odbicie sylwetki i ramki w ciemnej podłodze */}
          <div className="stage-floor-reflection">
            <img
              src="/assets/cards/inferno-3d/frame.png"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      {/* 4. BOTTOM CONTROLS DOCK */}
      <footer className="stage-bottom-dock">
        {/* Preset Selector Chips */}
        <div className="stage-presets-strip">
          <button
            type="button"
            className={`stage-preset-chip ${selectedPresetKey === "rybacki_kapitan" ? "is-selected" : ""}`}
            onClick={() => handleSelectPreset("rybacki_kapitan")}
          >
            👑 Rybacki + KAPITAN DELTA
          </button>
          <button
            type="button"
            className={`stage-preset-chip ${selectedPresetKey === "brzeczyszczykiewicz_mvp" ? "is-selected" : ""}`}
            onClick={() => handleSelectPreset("brzeczyszczykiewicz_mvp")}
          >
            🏅 Brzęczyszczykiewicz + MVP
          </button>
          <button
            type="button"
            className={`stage-preset-chip ${selectedPresetKey === "lewandowski_kapitan" ? "is-selected" : ""}`}
            onClick={() => handleSelectPreset("lewandowski_kapitan")}
          >
            👑 Lewandowski-Kowalski + KAPITAN
          </button>
          <button
            type="button"
            className={`stage-preset-chip ${selectedPresetKey === "rybacki_standard" ? "is-selected" : ""}`}
            onClick={() => handleSelectPreset("rybacki_standard")}
          >
            ⚪ Rybacki (Standard)
          </button>
        </div>

        {/* Main Stage Action Buttons */}
        <div className="stage-dock-actions">
          <button
            type="button"
            className="stage-btn is-primary"
            onClick={triggerStadiumReveal}
          >
            ✨ Reveal (Światła Stadionu)
          </button>

          <button
            type="button"
            className="stage-btn"
            onClick={() => {
              clearRevealTimers();
              setIsFlipped((prev) => !prev);
            }}
          >
            ↻ {isFlipped ? "Przód karty" : "Obróć na rewers"}
          </button>

          <button
            type="button"
            className={`stage-btn ${autoRotate ? "is-active" : ""}`}
            onClick={() => setAutoRotate((prev) => !prev)}
          >
            {autoRotate ? "⏸ Zatrzymaj obrót" : "▶ Autoobrót"}
          </button>

          <button
            type="button"
            className="stage-btn"
            onClick={() => {
              clearRevealTimers();
              setYaw(0);
              setPitch(0);
              setIsFlipped(false);
              setAutoRotate(false);
            }}
          >
            ↺ Na wprost
          </button>

          {/* Lighting Mode Selector */}
          <div className="stage-lighting-modes">
            <span>Światła:</span>
            <button
              type="button"
              className={`stage-light-pill ${lightingMode === "inferno" ? "is-active" : ""}`}
              onClick={() => setLightingMode("inferno")}
            >
              🔥 Inferno
            </button>
            <button
              type="button"
              className={`stage-light-pill ${lightingMode === "matchday" ? "is-active" : ""}`}
              onClick={() => setLightingMode("matchday")}
            >
              🏟️ Meczowe
            </button>
            <button
              type="button"
              className={`stage-light-pill ${lightingMode === "stealth" ? "is-active" : ""}`}
              onClick={() => setLightingMode("stealth")}
            >
              🌙 Stealth
            </button>
          </div>
        </div>

        <div className="stage-spec-tag">
          Paralaksa stadionu (ruch myszką / dotyk) • Lustrzany cokół • Reaktywne reflektory wolumetryczne • Karta INFERNO 3D V5.1
        </div>
      </footer>
    </div>
  );
}

export default InfernoStadiumStage;
