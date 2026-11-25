"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { universalAudio } from "./universalAudio.ts";
import { infernoAudio } from "../inferno-3d/infernoAudio.ts";
import type { CardVisualType, CollectionCategory } from "./types.ts";

export type WalkoutPhase = "intro" | "activation" | "reveal" | "hero" | "completed";

export interface WalkoutPose {
  phase: WalkoutPhase;
  yaw: number;
  pitch: number;
  isFlipped: boolean;
  isFlaring: boolean;
}

/**
 * Pure, deterministic pose calculation across the 12-second WALKOUT sequence.
 * 0.0s – 3.0s: Dark Awakening / Intro (yaw 180°, pitch -4°)
 * 3.0s – 7.0s: Thematic Activation (yaw 180° ± 4.5°, pitch -4° ± 2.8°)
 * 7.0s – 10.0s: Continuous 3D Spin Reveal (180° -> -10°, pitch arch up to +9°)
 * 10.0s – 12.0s: Monumental Hero Presentation (yaw -10°, pitch 6°)
 */
export function getWalkoutPoseAtTime(t: number): WalkoutPose {
  if (t < 3.0) {
    return {
      phase: "intro",
      yaw: 180,
      pitch: -4,
      isFlipped: false,
      isFlaring: false
    };
  } else if (t < 7.0) {
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
    return {
      phase: t >= 12.0 ? "completed" : "hero",
      yaw: -10,
      pitch: 6,
      isFlipped: false,
      isFlaring: false
    };
  }
}

export interface UseWalkoutEngineOptions {
  themeId?: CardVisualType;
  rarity?: CollectionCategory;
  autoStart?: boolean;
  initialTime?: number;
  initialPlaying?: boolean;
}

export function useWalkoutEngine(options: UseWalkoutEngineOptions = {}) {
  const {
    themeId = "INFERNO_ULTRA",
    rarity = "INFERNO",
    autoStart = true,
    initialTime = 0,
    initialPlaying
  } = options;

  const startT = Math.max(0, Math.min(12, initialTime));
  const initialPose = getWalkoutPoseAtTime(startT);

  // Timeline & Phase state
  const [currentTime, setCurrentTime] = useState<number>(startT);
  const [phase, setPhase] = useState<WalkoutPhase>(initialPose.phase);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying ?? (startT > 0 ? false : autoStart));
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // 3D Angles
  const [yaw, setYaw] = useState<number>(initialPose.yaw);
  const [pitch, setPitch] = useState<number>(initialPose.pitch);
  const [isFlipped, setIsFlipped] = useState<boolean>(initialPose.isFlipped);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Visual FX flags
  const [isFlaring, setIsFlaring] = useState<boolean>(initialPose.isFlaring);
  const [isShockwaving, setIsShockwaving] = useState<boolean>(startT >= 8.9 && startT <= 9.7);
  const [isFlashing, setIsFlashing] = useState<boolean>(startT >= 8.95 && startT <= 9.35);
  const [isPulsing, setIsPulsing] = useState<boolean>(startT >= 8.9 && startT <= 9.8);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(startT >= 8.95 && startT <= 9.4);

  // Monotonic Timing Refs
  const currentTimeRef = useRef<number>(startT);
  const pausedTimeRef = useRef<number>(startT);
  const startTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const autoRotateAnimIdRef = useRef<number | null>(null);

  // Real Browser Rendering Telemetry
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const frameDropsRef = useRef<number>(0);
  const [fps, setFps] = useState<number>(60);

  // Audio sequence trigger tracking (fire once per cycle)
  const hasAwakeningRef = useRef<boolean>(false);
  const hasHeartbeat1Ref = useRef<boolean>(false);
  const hasHeartbeat2Ref = useRef<boolean>(false);
  const hasHeartbeat3Ref = useRef<boolean>(false);
  const hasHeartbeat4Ref = useRef<boolean>(false);
  const hasHeartbeat5Ref = useRef<boolean>(false);
  const hasHeartbeat6Ref = useRef<boolean>(false);
  const hasTensionPadRef = useRef<boolean>(false);
  const hasChantRef = useRef<boolean>(false);
  const hasRiserRef = useRef<boolean>(false);
  const hasWhooshRef = useRef<boolean>(false);
  const hasPreDropRef = useRef<boolean>(false);
  const hasGrandImpactRef = useRef<boolean>(false);
  const hasFanfareRef = useRef<boolean>(false);
  const hasFadeOutRef = useRef<boolean>(false);

  const fxTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearFxTimeouts = useCallback(() => {
    fxTimeoutsRef.current.forEach((t) => clearTimeout(t));
    fxTimeoutsRef.current = [];
  }, []);

  const resetAudioTriggers = useCallback(() => {
    hasAwakeningRef.current = false;
    hasHeartbeat1Ref.current = false;
    hasHeartbeat2Ref.current = false;
    hasHeartbeat3Ref.current = false;
    hasHeartbeat4Ref.current = false;
    hasHeartbeat5Ref.current = false;
    hasHeartbeat6Ref.current = false;
    hasTensionPadRef.current = false;
    hasChantRef.current = false;
    hasRiserRef.current = false;
    hasWhooshRef.current = false;
    hasPreDropRef.current = false;
    hasGrandImpactRef.current = false;
    hasFanfareRef.current = false;
    hasFadeOutRef.current = false;
    universalAudio.stopAll();
    infernoAudio.stopAll();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (autoRotateAnimIdRef.current) cancelAnimationFrame(autoRotateAnimIdRef.current);
      clearFxTimeouts();
      universalAudio.stopAll();
      infernoAudio.stopAll();
    };
  }, [clearFxTimeouts]);

  // Sync mute with audio engine
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      universalAudio.setMuted(next);
      infernoAudio.setMuted(next);
      return next;
    });
  }, []);

  // Main 12-Second RAF Monotonic Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    startTimeRef.current = performance.now() - pausedTimeRef.current * 1000;

    const tick = (now: number) => {
      // Telemetry: measure real frame delta
      if (lastFrameTimeRef.current > 0) {
        const delta = now - lastFrameTimeRef.current;
        if (delta > 33.4) {
          frameDropsRef.current++;
        }
        frameCountRef.current++;
        if (frameCountRef.current % 15 === 0 && delta > 0) {
          setFps(Math.min(120, Math.max(1, Math.round(1000 / delta))));
        }
      }
      lastFrameTimeRef.current = now;

      const elapsed = (now - startTimeRef.current) / 1000;
      const t = Math.min(12.0, Math.max(0, elapsed));
      currentTimeRef.current = t;
      pausedTimeRef.current = t;
      setCurrentTime(t);

      // 1. Calculate pose
      const pose = getWalkoutPoseAtTime(t);
      setPhase(pose.phase);
      setYaw(pose.yaw);
      setPitch(pose.pitch);
      setIsFlaring(pose.isFlaring);

      // 2. Synchronized Audio Events
      if (themeId === "INFERNO_ULTRA") {
        // --- PROVEN INFERNO V3.1 AUDIO MASTERING ---
        // 0–3s THE AWAKENING: Low ambient, distant stadium murmur, rising sub-bass drone
        if (t >= 0.05 && !hasAwakeningRef.current) {
          hasAwakeningRef.current = true;
          infernoAudio.playAwakening();
        }

        // 3–5s RHYTHMIC ENGAGEMENT: Tension pad & accelerating heartbeat rhythm
        if (t >= 3.0 && !hasTensionPadRef.current) {
          hasTensionPadRef.current = true;
          hasHeartbeat1Ref.current = true;
          infernoAudio.startTensionPad();
          infernoAudio.playHeartbeat(0.46, 68, 28);
        }
        if (t >= 3.8 && !hasHeartbeat2Ref.current) {
          hasHeartbeat2Ref.current = true;
          infernoAudio.playHeartbeat(0.52, 72, 30);
        }
        if (t >= 4.6 && !hasHeartbeat3Ref.current) {
          hasHeartbeat3Ref.current = true;
          infernoAudio.playHeartbeat(0.58, 76, 30);
        }

        // 5–7s ESCALATING CHANT & DOPING: DELTA fans chant, building crowd energy
        if (t >= 5.0 && !hasChantRef.current) {
          hasChantRef.current = true;
          infernoAudio.startStadiumChant();
        }
        if (t >= 5.3 && !hasHeartbeat4Ref.current) {
          hasHeartbeat4Ref.current = true;
          infernoAudio.playHeartbeat(0.64, 80, 32);
        }
        if (t >= 5.9 && !hasHeartbeat5Ref.current) {
          hasHeartbeat5Ref.current = true;
          infernoAudio.playHeartbeat(0.70, 84, 34);
        }
        if (t >= 6.5 && !hasHeartbeat6Ref.current) {
          hasHeartbeat6Ref.current = true;
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

        // 8.85s: Pre-drop tension breath (subtle mid-range ducking creates psychoacoustic punch)
        if (t >= 8.85 && !hasPreDropRef.current) {
          hasPreDropRef.current = true;
          infernoAudio.playPreDropBreath();
        }

        // 9.0s: Grand Reveal Climax (Sub-Drop impact, studio hit, fanfare, crowd eruption, screen shake)
        if (t >= 9.0 && !hasGrandImpactRef.current) {
          hasGrandImpactRef.current = true;
          infernoAudio.playGrandImpact();

          // Fire synchronized visual FX
          setIsShockwaving(true);
          setIsFlashing(true);
          setIsPulsing(true);
          setIsScreenShaking(true);

          const tFlash = setTimeout(() => setIsFlashing(false), 380);
          const tShake = setTimeout(() => setIsScreenShaking(false), 420);
          const tPulse = setTimeout(() => setIsPulsing(false), 800);
          const tShock = setTimeout(() => setIsShockwaving(false), 750);
          fxTimeoutsRef.current.push(tFlash, tShake, tPulse, tShock);
        }

        // 11.2s: Controlled graceful finale fade-out
        if (t >= 11.2 && !hasFadeOutRef.current) {
          hasFadeOutRef.current = true;
          infernoAudio.fadeOutFinale();
        }
      } else {
        // --- UNIVERSAL PROCEDURAL SYNTHESIS (GOLD, MATCHDAY, LEGEND, RARE, COMMON) ---
        // 0.0s: Awakening Drone
        if (t >= 0.1 && !hasAwakeningRef.current) {
          hasAwakeningRef.current = true;
          universalAudio.playAwakening(themeId);
        }

        // 3.0s, 4.5s, 6.0s: Heartbeat pulses
        if (t >= 3.0 && !hasHeartbeat1Ref.current) {
          hasHeartbeat1Ref.current = true;
          universalAudio.playHeartbeatPulse(0.7, themeId);
        }
        if (t >= 4.5 && !hasHeartbeat2Ref.current) {
          hasHeartbeat2Ref.current = true;
          universalAudio.playHeartbeatPulse(0.9, themeId);
        }
        if (t >= 6.0 && !hasHeartbeat3Ref.current) {
          hasHeartbeat3Ref.current = true;
          universalAudio.playHeartbeatPulse(1.0, themeId);
        }

        // 7.0s: Tension Riser
        if (t >= 7.0 && !hasRiserRef.current) {
          hasRiserRef.current = true;
          universalAudio.playTensionRiser(themeId);
        }

        // 8.5s: Whoosh sweep
        if (t >= 8.5 && !hasWhooshRef.current) {
          hasWhooshRef.current = true;
          universalAudio.playWhoosh();
        }

        // 9.0s: HERO GRAND IMPACT (The defining moment)
        if (t >= 9.0 && !hasGrandImpactRef.current) {
          hasGrandImpactRef.current = true;
          universalAudio.playGrandImpact(themeId, rarity);

          // Fire synchronized visual FX
          setIsShockwaving(true);
          setIsFlashing(true);
          setIsPulsing(true);
          setIsScreenShaking(true);

          const tFlash = setTimeout(() => setIsFlashing(false), 380);
          const tShake = setTimeout(() => setIsScreenShaking(false), 420);
          const tPulse = setTimeout(() => setIsPulsing(false), 800);
          const tShock = setTimeout(() => setIsShockwaving(false), 750);
          fxTimeoutsRef.current.push(tFlash, tShake, tPulse, tShock);
        }

        // 9.5s: Victory Fanfare
        if (t >= 9.5 && !hasFanfareRef.current) {
          hasFanfareRef.current = true;
          universalAudio.playVictoryFanfare(themeId, rarity);
        }

        // 11.5s: Fade Out Finale
        if (t >= 11.5 && !hasFadeOutRef.current) {
          hasFadeOutRef.current = true;
          universalAudio.fadeOutFinale();
        }
      }

      // 12.0s: Sequence Completed — Lock at Hero Shot
      if (t >= 12.0) {
        setIsPlaying(false);
        currentTimeRef.current = 12.0;
        pausedTimeRef.current = 12.0;
        setPhase("completed");
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
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, themeId, rarity, clearFxTimeouts]);

  // Auto-rotation after sequence completion
  useEffect(() => {
    if ((phase !== "hero" && phase !== "completed") || !autoRotate) return;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setYaw((prev) => (prev + dt * 0.04) % 360);
      autoRotateAnimIdRef.current = requestAnimationFrame(loop);
    };

    autoRotateAnimIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (autoRotateAnimIdRef.current) cancelAnimationFrame(autoRotateAnimIdRef.current);
    };
  }, [phase, autoRotate]);

  // Controls: Play / Pause
  const play = useCallback(() => {
    universalAudio.initContext();
    if (currentTimeRef.current >= 12.0) {
      pausedTimeRef.current = 0;
      currentTimeRef.current = 0;
      setCurrentTime(0);
      resetAudioTriggers();
    }
    setIsPlaying(true);
  }, [resetAudioTriggers]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
  }, []);

  // Controls: Replay
  const replay = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    if (autoRotateAnimIdRef.current) cancelAnimationFrame(autoRotateAnimIdRef.current);
    clearFxTimeouts();
    universalAudio.stopAll();
    infernoAudio.stopAll();
    resetAudioTriggers();

    currentTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setCurrentTime(0);
    setPhase("intro");
    setYaw(180);
    setPitch(-4);
    setIsFlipped(false);
    setAutoRotate(false);
    setIsFlaring(false);
    setIsShockwaving(false);
    setIsFlashing(false);
    setIsPulsing(false);
    lastFrameTimeRef.current = 0;
    frameCountRef.current = 0;
    frameDropsRef.current = 0;
    setFps(60);

    setIsPlaying(true);
  }, [clearFxTimeouts, resetAudioTriggers]);

  // Controls: Skip
  const skip = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    clearFxTimeouts();

    currentTimeRef.current = 10.0;
    pausedTimeRef.current = 10.0;
    setCurrentTime(10.0);
    setPhase("hero");
    setYaw(-10);
    setPitch(6);
    setIsFlipped(false);
    setIsFlaring(false);
    setIsShockwaving(false);
    setIsFlashing(false);
    setIsPulsing(false);
    setIsScreenShaking(false);

    // Play triumphant victory fanfare
    if (themeId === "INFERNO_ULTRA") {
      infernoAudio.stopAll();
      infernoAudio.playGrandImpact();
    } else {
      universalAudio.stopAll();
      universalAudio.playVictoryFanfare(themeId, rarity);
    }
    hasFanfareRef.current = true;
    hasGrandImpactRef.current = true;

    setIsPlaying(false);
  }, [clearFxTimeouts, themeId, rarity]);

  // Controls: Seek
  const seek = useCallback((targetTime: number) => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    clearFxTimeouts();

    const clamped = Math.max(0, Math.min(12.0, targetTime));
    currentTimeRef.current = clamped;
    pausedTimeRef.current = clamped;
    setCurrentTime(clamped);

    const pose = getWalkoutPoseAtTime(clamped);
    setPhase(pose.phase);
    setYaw(pose.yaw);
    setPitch(pose.pitch);
    setIsFlipped(pose.isFlipped);
    setIsFlaring(pose.isFlaring);
    setIsPlaying(false);
  }, [clearFxTimeouts]);

  // Reset / Flip / Auto-rotate helpers
  const toggleFlip = useCallback(() => setIsFlipped((prev) => !prev), []);
  const toggleAutoRotate = useCallback(() => setAutoRotate((prev) => !prev), []);
  const resetPose = useCallback(() => {
    setAutoRotate(false);
    setIsFlipped(false);
    setYaw(-10);
    setPitch(6);
  }, []);

  return {
    currentTime,
    phase,
    isPlaying,
    isMuted,
    yaw,
    pitch,
    isFlipped,
    autoRotate,
    isFlaring,
    isShockwaving,
    isFlashing,
    isPulsing,
    isScreenShaking,
    play,
    pause,
    replay,
    skip,
    seek,
    toggleMute,
    toggleFlip,
    toggleAutoRotate,
    resetPose,
    setYaw,
    setPitch,
    fps,
    frameDrops: frameDropsRef.current
  };
}
