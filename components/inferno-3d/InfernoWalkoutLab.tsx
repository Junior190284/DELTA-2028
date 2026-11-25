"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { InfernoCard3D, InfernoCardData } from "./InfernoCard3D";
import CanvasParticles from "@/components/CanvasParticles";
import { infernoAudio } from "./infernoAudio";
import "./inferno-walkout.css";

const WALKOUT_CARD_DATA: InfernoCardData = {
  name: "RYBACKI",
  number: 10,
  position: "FWD",
  overall: 88,
  stats: {
    pac: 88,
    sho: 84,
    pas: 81,
    dri: 89,
    def: 62,
    phy: 78
  },
  playerImage: "/assets/cards/inferno-3d/player-default.png",
  frontBg: "/assets/cards/inferno-3d/front-bg.png",
  backBg: "/assets/cards/inferno-3d/back-bg.png",
  frameImg: "/assets/cards/inferno-3d/frame.png",
  fxImg: "/assets/cards/inferno-3d/fx.png",
  crestImg: "/assets/cards/inferno-3d/delta-crest.png"
};

export type WalkoutPhase = "intro" | "activation" | "reveal" | "hero";

/**
 * Pure, deterministic pose calculation for the entire 12-second WALKOUT sequence.
 * Guarantees consistent state across time scrubber, tests, and real-time RAF loop.
 */
export function getWalkoutPoseAtTime(t: number): {
  phase: WalkoutPhase;
  yaw: number;
  pitch: number;
  isFlipped: boolean;
  isFlaring: boolean;
} {
  if (t < 3.0) {
    // 0–3s: Dark Intro — card is a mysterious distant silhouette, reverse facing camera
    return {
      phase: "intro",
      yaw: 180,
      pitch: -4,
      isFlipped: false,
      isFlaring: false
    };
  } else if (t < 7.0) {
    // 3–7s: Inferno Activation — reverse card materializes, DELTA crest illuminates, gentle sway
    const swayYaw = 180 + Math.sin((t - 3.0) * 1.8) * 4.5;
    const swayPitch = -4 + Math.cos((t - 3.0) * 1.4) * 2.8;
    return {
      phase: "activation",
      yaw: swayYaw,
      pitch: swayPitch,
      isFlipped: false,
      isFlaring: false
    };
  } else if (t < 10.0) {
    // 7–10s: Card Reveal — continuous physical 3D spin from reverse (180°) to obverse (-10°)
    const revealProgress = (t - 7.0) / 3.0; // 0.0 -> 1.0
    const ease =
      revealProgress < 0.5
        ? 4 * revealProgress * revealProgress * revealProgress
        : 1 - Math.pow(-2 * revealProgress + 2, 3) / 2;

    const currentYaw = 180 - ease * 190; // 180° -> -10°
    const pitchArch = Math.sin(revealProgress * Math.PI) * 13;
    const currentPitch = -4 + pitchArch + ease * 10;

    return {
      phase: "reveal",
      yaw: currentYaw,
      pitch: currentPitch,
      isFlipped: false,
      isFlaring: revealProgress >= 0.48
    };
  } else {
    // 10–12s: Hero Shot — monumental presentation facing front, full player & stats clarity
    return {
      phase: "hero",
      yaw: -10,
      pitch: 6,
      isFlipped: false,
      isFlaring: false
    };
  }
}

export function InfernoWalkoutLab() {
  // Timeline: 0.0s to 12.0s
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [phase, setPhase] = useState<WalkoutPhase>("intro");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // 3D angles & interactive state
  const [yaw, setYaw] = useState<number>(180);
  const [pitch, setPitch] = useState<number>(-4);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Visual FX flags
  const [isFlaring, setIsFlaring] = useState<boolean>(false);
  const [isShockwaving, setIsShockwaving] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isStadiumPulsing, setIsStadiumPulsing] = useState<boolean>(false);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);

  // Time & animation refs — monotonic and immune to dependency restarts
  const currentTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const autoRotateAnimIdRef = useRef<number | null>(null);
  const hasShockwaveFiredRef = useRef<boolean>(false);
  const hasStadiumPulseFiredRef = useRef<boolean>(false);
  const isManualInteractingRef = useRef<boolean>(false);

  // Audio trigger refs for 12-second sequence (V3.1 Mastering)
  const hasAwakeningRef = useRef<boolean>(false);
  const hasTensionPadRef = useRef<boolean>(false);
  const hasBeat1Ref = useRef<boolean>(false);
  const hasBeat2Ref = useRef<boolean>(false);
  const hasBeat3Ref = useRef<boolean>(false);
  const hasChantRef = useRef<boolean>(false);
  const hasBeat4Ref = useRef<boolean>(false);
  const hasBeat5Ref = useRef<boolean>(false);
  const hasBeat6Ref = useRef<boolean>(false);
  const hasRiserRef = useRef<boolean>(false);
  const hasWhooshRef = useRef<boolean>(false);
  const hasPreDropRef = useRef<boolean>(false);
  const hasGrandImpactRef = useRef<boolean>(false);
  const hasFadeOutRef = useRef<boolean>(false);

  // Timeout refs for safe cleanup
  const shockwaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stadiumPulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const screenShakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sound effects
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const isMutedRef = useRef<boolean>(true);

  useEffect(() => {
    isMutedRef.current = isMuted;
    infernoAudio.setMuted(isMuted);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      infernoAudio.setMuted(next);
      return next;
    });
  }, []);

  const clearFxTimeouts = useCallback(() => {
    if (shockwaveTimeoutRef.current) {
      clearTimeout(shockwaveTimeoutRef.current);
      shockwaveTimeoutRef.current = null;
    }
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    if (stadiumPulseTimeoutRef.current) {
      clearTimeout(stadiumPulseTimeoutRef.current);
      stadiumPulseTimeoutRef.current = null;
    }
    if (screenShakeTimeoutRef.current) {
      clearTimeout(screenShakeTimeoutRef.current);
      screenShakeTimeoutRef.current = null;
    }
  }, []);

  const resetAudioTriggers = useCallback(() => {
    hasAwakeningRef.current = false;
    hasTensionPadRef.current = false;
    hasBeat1Ref.current = false;
    hasBeat2Ref.current = false;
    hasBeat3Ref.current = false;
    hasChantRef.current = false;
    hasBeat4Ref.current = false;
    hasBeat5Ref.current = false;
    hasBeat6Ref.current = false;
    hasRiserRef.current = false;
    hasWhooshRef.current = false;
    hasPreDropRef.current = false;
    hasGrandImpactRef.current = false;
    hasFadeOutRef.current = false;
    infernoAudio.stopAll();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (autoRotateAnimIdRef.current) cancelAnimationFrame(autoRotateAnimIdRef.current);
      clearFxTimeouts();
      infernoAudio.stopAll();
    };
  }, [clearFxTimeouts]);

  // Initial check for query params (?time=X, ?skip=1) or prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryTime = params.get("time");
      const shouldSkip = params.get("skip") === "1" || params.get("skip") === "true";
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

      if (mediaQuery.matches || shouldSkip || queryTime !== null) {
        const targetT = queryTime !== null ? Math.max(0, Math.min(12, parseFloat(queryTime))) : 10.5;
        currentTimeRef.current = targetT;
        pausedTimeRef.current = targetT;
        setCurrentTime(targetT);
        setIsPlaying(false);

        const pose = getWalkoutPoseAtTime(targetT);
        setPhase(pose.phase);
        setYaw(pose.yaw);
        setPitch(pose.pitch);
        setIsFlipped(pose.isFlipped);
        setIsFlaring(pose.isFlaring);
      }
    }
  }, []);

  /**
   * 12-SECOND CINEMATIC ENGINE
   * Continuous, monotonic RAF clock. Runs exactly once from 0s to 12s,
   * cleanly stops at Hero shot, and NEVER loops automatically.
   */
  useEffect(() => {
    if (!isPlaying) return;

    startTimeRef.current = performance.now() - currentTimeRef.current * 1000;

    const tick = (now: number) => {
      const elapsedSeconds = (now - startTimeRef.current) / 1000;
      const t = Math.min(12, elapsedSeconds);
      currentTimeRef.current = t;
      pausedTimeRef.current = t;
      setCurrentTime(t);

      const pose = getWalkoutPoseAtTime(t);
      setPhase(pose.phase);
      if (!isManualInteractingRef.current) {
        setYaw(pose.yaw);
        setPitch(pose.pitch);
      }
      setIsFlipped(pose.isFlipped);
      setIsFlaring(pose.isFlaring);

      // 0–3s THE AWAKENING: Low ambient, distant stadium murmur, rising sub-bass drone
      if (t >= 0.05 && !hasAwakeningRef.current) {
        hasAwakeningRef.current = true;
        infernoAudio.playAwakening();
      }

      // 3–5s RHYTHMIC ENGAGEMENT: Tension pad & accelerating heartbeat rhythm
      if (t >= 3.0 && !hasTensionPadRef.current) {
        hasTensionPadRef.current = true;
        hasBeat1Ref.current = true;
        infernoAudio.startTensionPad();
        infernoAudio.playHeartbeat(0.46, 68, 28);
      }
      if (t >= 3.8 && !hasBeat2Ref.current) {
        hasBeat2Ref.current = true;
        infernoAudio.playHeartbeat(0.52, 72, 30);
      }
      if (t >= 4.6 && !hasBeat3Ref.current) {
        hasBeat3Ref.current = true;
        infernoAudio.playHeartbeat(0.58, 76, 30);
      }

      // 5–7s ESCALATING CHANT & DOPING: DELTA fans chant, building crowd energy
      if (t >= 5.0 && !hasChantRef.current) {
        hasChantRef.current = true;
        infernoAudio.startStadiumChant();
      }
      if (t >= 5.3 && !hasBeat4Ref.current) {
        hasBeat4Ref.current = true;
        infernoAudio.playHeartbeat(0.64, 80, 32);
      }
      if (t >= 5.9 && !hasBeat5Ref.current) {
        hasBeat5Ref.current = true;
        infernoAudio.playHeartbeat(0.70, 84, 34);
      }
      if (t >= 6.5 && !hasBeat6Ref.current) {
        hasBeat6Ref.current = true;
        infernoAudio.playHeartbeat(0.76, 88, 36);
      }

      // 7–9s THE REVEAL RISER & WHOOSH: Card rotation begins, rising frequency sweep
      if (t >= 7.0 && !hasRiserRef.current) {
        hasRiserRef.current = true;
        infernoAudio.playEnergyRiser();
      }
      if (t >= 7.6 && !hasWhooshRef.current) {
        hasWhooshRef.current = true;
        infernoAudio.playSpinWhoosh();
      }

      // 8.5s: Midpoint flash & shockwave
      if (t >= 8.5 && t < 9.5 && !hasShockwaveFiredRef.current) {
        hasShockwaveFiredRef.current = true;
        setIsShockwaving(true);
        setIsFlashing(true);
        flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 380);
        shockwaveTimeoutRef.current = setTimeout(() => setIsShockwaving(false), 1200);
      }

      // 8.85s: Pre-drop tension breath (subtle mid-range ducking creates psychoacoustic punch)
      if (t >= 8.85 && !hasPreDropRef.current) {
        hasPreDropRef.current = true;
        infernoAudio.playPreDropBreath();
      }

      // 9.0s: Grand Reveal Climax (Sub-Drop impact, studio hit, fanfare, crowd eruption, screen shake)
      if (t >= 9.0 && !hasGrandImpactRef.current) {
        hasGrandImpactRef.current = true;
        hasStadiumPulseFiredRef.current = true;
        setIsStadiumPulsing(true);
        setIsScreenShaking(true);
        infernoAudio.playGrandImpact();
        stadiumPulseTimeoutRef.current = setTimeout(() => setIsStadiumPulsing(false), 950);
        screenShakeTimeoutRef.current = setTimeout(() => setIsScreenShaking(false), 450);
      }

      // 11.2–12.0s: Controlled graceful finale fade-out
      if (t >= 11.2 && !hasFadeOutRef.current) {
        hasFadeOutRef.current = true;
        infernoAudio.fadeOutFinale();
      }

      // Finish sequence at 12.0s: freeze at hero presentation without auto-restarting
      if (t >= 12.0) {
        setIsPlaying(false);
        currentTimeRef.current = 12.0;
        pausedTimeRef.current = 12.0;
        setPhase("hero");
        setYaw(-10);
        setPitch(6);
        setIsFlipped(false);
        setIsFlaring(false);
        return;
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, clearFxTimeouts]);

  // Auto-rotation loop during Hero mode
  useEffect(() => {
    if (phase !== "hero" || !autoRotate) return;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setYaw((prev) => (prev + dt * 0.04) % 360);
      autoRotateAnimIdRef.current = requestAnimationFrame(loop);
    };

    autoRotateAnimIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (autoRotateAnimIdRef.current) {
        cancelAnimationFrame(autoRotateAnimIdRef.current);
      }
    };
  }, [phase, autoRotate]);

  // Actions
  const handleReplay = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    if (autoRotateAnimIdRef.current) cancelAnimationFrame(autoRotateAnimIdRef.current);
    clearFxTimeouts();
    resetAudioTriggers();
    hasShockwaveFiredRef.current = false;
    hasStadiumPulseFiredRef.current = false;
    isManualInteractingRef.current = false;
    pausedTimeRef.current = 0;
    currentTimeRef.current = 0;
    setCurrentTime(0);

    const pose = getWalkoutPoseAtTime(0);
    setPhase(pose.phase);
    setYaw(pose.yaw);
    setPitch(pose.pitch);
    setIsFlipped(pose.isFlipped);
    setAutoRotate(false);
    setIsFlaring(false);
    setIsShockwaving(false);
    setIsFlashing(false);
    setIsStadiumPulsing(false);
    setIsScreenShaking(false);
    setIsPlaying(true);
  }, [clearFxTimeouts, resetAudioTriggers]);

  const handleSkipIntro = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    if (autoRotateAnimIdRef.current) cancelAnimationFrame(autoRotateAnimIdRef.current);
    clearFxTimeouts();
    infernoAudio.stopAll();
    hasShockwaveFiredRef.current = true;
    hasStadiumPulseFiredRef.current = true;
    hasAwakeningRef.current = true;
    hasTensionPadRef.current = true;
    hasBeat1Ref.current = true;
    hasBeat2Ref.current = true;
    hasBeat3Ref.current = true;
    hasChantRef.current = true;
    hasBeat4Ref.current = true;
    hasBeat5Ref.current = true;
    hasBeat6Ref.current = true;
    hasRiserRef.current = true;
    hasWhooshRef.current = true;
    hasPreDropRef.current = true;
    hasGrandImpactRef.current = true;
    hasFadeOutRef.current = true;
    pausedTimeRef.current = 10.0;
    currentTimeRef.current = 10.0;
    setCurrentTime(10.0);

    const pose = getWalkoutPoseAtTime(10.0);
    setPhase(pose.phase);
    setYaw(pose.yaw);
    setPitch(pose.pitch);
    setIsFlipped(pose.isFlipped);
    setAutoRotate(false);
    setIsFlaring(false);
    setIsShockwaving(false);
    setIsFlashing(false);
    setIsStadiumPulsing(false);
    setIsScreenShaking(false);
    isManualInteractingRef.current = false;
    setIsPlaying(false);
  }, [clearFxTimeouts]);

  const handleToggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleResetPose = useCallback(() => {
    setAutoRotate(false);
    setIsFlipped(false);
    setYaw(-10);
    setPitch(6);
    isManualInteractingRef.current = false;
  }, []);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds);
    const ms = Math.floor((seconds % 1) * 10);
    return `00:${s.toString().padStart(2, "0")}.${ms}`;
  };

  // Phase Title Map
  const phaseLabelMap: Record<WalkoutPhase, string> = {
    intro: "0–3s • Dark Intro",
    activation: "3–7s • Inferno Activation",
    reveal: "7–10s • Card Reveal 3D",
    hero: "10–12s • Hero Presentation"
  };

  return (
    <div className={`walkout-container phase-${phase} ${isPlaying ? "is-timeline-running" : ""} ${isScreenShaking ? "is-screen-shaking" : ""}`}>
      {/* Stadium Environment with Slow Push-in */}
      <div className={`walkout-stadium-wrapper ${currentTime > 0 ? "is-zooming" : ""}`}>
        <img
          className="walkout-stadium-img"
          src="/assets/stadium.png"
          alt="Stadium Walkout Arena"
        />
      </div>

      {/* Atmospheric dark vignette */}
      <div className="walkout-dark-vignette" />

      {/* Searchlights & Core Glow */}
      <div className="walkout-lights-layer">
        <div className="walkout-reflector is-left" />
        <div className="walkout-reflector is-right" />
        <div className="walkout-center-core-glow" />
      </div>

      {/* Mist Drift */}
      <div className="walkout-mist-layer" />

      {/* Realistic Rising Sparks via CanvasParticles */}
      <CanvasParticles theme="inferno" active={phase !== "intro"} />

      {/* Stadium Light Pulse, Shockwave & Flash on Reveal */}
      <div className={`walkout-stadium-pulse ${isStadiumPulsing ? "is-pulsing" : ""}`} />
      <div className={`walkout-shockwave ${isShockwaving ? "is-blasting" : ""}`} />
      <div className={`walkout-flash-overlay ${isFlashing ? "is-flashing" : ""}`} />

      {/* TOP HUD BAR */}
      <div className="walkout-hud-top">
        <div className="walkout-hud-badge">
          <div className="walkout-hud-badge-dot" />
          <span>DELTA 2018 GM • INFERNO WALKOUT LAB</span>
        </div>

        <div className="walkout-hud-actions">
          {phase !== "hero" && (
            <button
              type="button"
              className="walkout-btn is-primary"
              onClick={handleSkipIntro}
              title="Pomiń intro i przejdź bezpośrednio do prezentacji karty"
            >
              ⏩ Pomiń
            </button>
          )}

          <button
            type="button"
            className={`walkout-btn ${isMuted ? "is-audio-prompt" : "is-primary"}`}
            onClick={toggleMute}
            title={isMuted ? "Włącz dźwięk stadionu, bas i fanfarę" : "Wycisz dźwięk"}
          >
            {isMuted ? "🔇 Włącz dźwięk (FX & Fanfara)" : "🔊 Dźwięk wł."}
          </button>

          <Link href="/lab/inferno-card" className="walkout-btn" title="Zamknij i wróć do edytora">
            ✕ Zamknij
          </Link>
        </div>
      </div>

      {/* 3D CARD STAGE */}
      <div className="walkout-stage">
        <div className={`walkout-card-anchor is-${phase}`}>
          <InfernoCard3D
            data={WALKOUT_CARD_DATA}
            isFlipped={isFlipped}
            autoRotate={false}
            isRevealing={isFlaring}
            interactive={phase === "hero"}
            yaw={yaw}
            pitch={pitch}
            onRotationChange={(newYaw, newPitch) => {
              isManualInteractingRef.current = true;
              setYaw(newYaw);
              setPitch(newPitch);
            }}
          />
        </div>
      </div>

      {/* BOTTOM HUD SCRUBBER */}
      <div className="walkout-hud-bottom">
        <div className="walkout-timeline-bar-wrap">
          <div className="walkout-timeline-info">
            <span className="walkout-timeline-phase">
              <span>{phaseLabelMap[phase]}</span>
            </span>
            <span className="walkout-timeline-timer">
              {formatTime(currentTime)} / 00:12.0
            </span>
          </div>

          <div className="walkout-scrubber-track">
            <div
              className="walkout-scrubber-fill"
              style={{ width: `${Math.min(100, (currentTime / 12) * 100)}%` }}
            />
          </div>

          <div className="walkout-phases-row">
            <span className={`walkout-phase-item ${phase === "intro" ? "is-active" : ""}`}>
              0–3s Intro
            </span>
            <span className={`walkout-phase-item ${phase === "activation" ? "is-active" : ""}`}>
              3–7s Activation
            </span>
            <span className={`walkout-phase-item ${phase === "reveal" ? "is-active" : ""}`}>
              7–10s Reveal
            </span>
            <span className={`walkout-phase-item ${phase === "hero" ? "is-active" : ""}`}>
              10–12s Hero Shot
            </span>
          </div>
        </div>

        {/* Hero actions when finished or in hero phase */}
        {phase === "hero" && (
          <div className="walkout-hero-ctas">
            <button
              type="button"
              className="walkout-btn is-primary"
              onClick={handleReplay}
              title="Odtwórz animację odkrycia od początku"
            >
              ↻ Odtwórz ponownie
            </button>
            <button
              type="button"
              className="walkout-btn"
              onClick={handleToggleFlip}
              title="Odwróć kartę na rewers / awers"
            >
              🔄 {isFlipped ? "Pokaż awers" : "Pokaż rewers"}
            </button>
            <button
              type="button"
              className={`walkout-btn ${autoRotate ? "is-active" : ""}`}
              onClick={handleToggleAutoRotate}
              title="Włącz lub wyłącz płynny automatyczny obrót"
            >
              🌀 {autoRotate ? "Zatrzymaj obrót" : "Auto-obrót"}
            </button>
            <button
              type="button"
              className="walkout-btn"
              onClick={handleResetPose}
              title="Zresetuj kąt karty do pozycji głównej"
            >
              🎯 Reset kąta
            </button>
            <Link href="/lab/inferno-card" className="walkout-btn" title="Przejdź do edytora karty">
              ⚙ Edytor karty
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default InfernoWalkoutLab;
