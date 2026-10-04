"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Target, 
  ShieldAlert, 
  X, 
  Play, 
  RotateCcw, 
  Trophy, 
  Sparkles, 
  Flame, 
  Coins, 
  CheckCircle2, 
  Zap, 
  Award, 
  ChevronRight, 
  ArrowRight, 
  Crown, 
  Lock 
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";

interface DeltaSkillMiniGamesModalProps {
  onClose: () => void;
  onPointsEarned?: (points: number) => void;
}

type GameMode = "free_kicks" | "gk_reflex";

export interface LevelConfig {
  level: number;
  name: string;
  subtitle: string;
  targetDurationSec: number;
  wavesToPass: number; // e.g. 3 waves of 3 targets
  speedMultiplier: number;
  basePoints: number;
  targetSize: number;
  dpReward: number;
  themeColor: string;
  description: string;
}

export const LEVELS_CONFIG: LevelConfig[] = [
  {
    level: 1,
    name: "POZIOM 1: Młodzik DELTA",
    subtitle: "Trening Podstawowy (Prędkość 1.0x)",
    targetDurationSec: 25,
    wavesToPass: 3, // 9 celów
    speedMultiplier: 1.0,
    basePoints: 100,
    targetSize: 74,
    dpReward: 20,
    themeColor: "#38bdf8",
    description: "Traf 3 fale po 3 ruchome cele w bramce. Spokojne tempo do nauki celności!"
  },
  {
    level: 2,
    name: "POZIOM 2: Trampkarz Ekstraklasy",
    subtitle: "Szybkie Podania (+35% Prędkości)",
    targetDurationSec: 22,
    wavesToPass: 4, // 12 celów
    speedMultiplier: 1.35,
    basePoints: 140,
    targetSize: 68,
    dpReward: 30,
    themeColor: "#4ade80",
    description: "Szybszy ruch celów po przekątnych. Utrzymuj serię celnych uderzeń!"
  },
  {
    level: 3,
    name: "POZIOM 3: Gwiazda DELTA 2018",
    subtitle: "Wysoka Dynamika (+75% Prędkości)",
    targetDurationSec: 20,
    wavesToPass: 4, // 12 celów
    speedMultiplier: 1.75,
    basePoints: 180,
    targetSize: 62,
    dpReward: 45,
    themeColor: "#facc15",
    description: "Mniejsze cele orbitujące w okienkach i przy słupkach. Wymaga szybkiego refleksu!"
  },
  {
    level: 4,
    name: "POZIOM 4: Liga Mistrzów",
    subtitle: "Ekspresowe Strzały (+120% Prędkości)",
    targetDurationSec: 18,
    wavesToPass: 5, // 15 celów
    speedMultiplier: 2.2,
    basePoints: 240,
    targetSize: 56,
    dpReward: 65,
    themeColor: "#f97316",
    description: "Piłki latają z dużą prędkością! Dynamiczne przeskoki celów po całej bramce!"
  },
  {
    level: 5,
    name: "POZIOM 5: 🔥 INFERNO MASTER",
    subtitle: "Maksymalna Piekielna Prędkość (2.8x)",
    targetDurationSec: 16,
    wavesToPass: 5, // 15 celów
    speedMultiplier: 2.8,
    basePoints: 320,
    targetSize: 50,
    dpReward: 100,
    themeColor: "#ef4444",
    description: "Maksymalne tempo! Błyskawiczny ruch i unikalne złote cele. Nagroda mistrza: +100 DP!"
  }
];

interface MovingTarget {
  id: string;
  label: string;
  points: number;
  startTop: number; // percentage
  startLeft: number; // percentage
  animType: "float-h" | "float-v" | "diagonal" | "circle" | "zigzag";
  animDuration: number; // seconds
  size: number;
  isHit: boolean;
  colorTheme: string;
}

export default function DeltaSkillMiniGamesModal({
  onClose,
  onPointsEarned
}: DeltaSkillMiniGamesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMode, setActiveMode] = useState<GameMode>("free_kicks");
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedMaxLevel, setUnlockedMaxLevel] = useState<number>(1);
  
  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const [gameState, setGameState] = useState<"level_select" | "playing" | "level_completed" | "game_over">("level_select");
  const [timeLeft, setTimeLeft] = useState<number>(25);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  
  // Wave state for 3 moving targets
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [activeTargets, setActiveTargets] = useState<MovingTarget[]>([]);
  const [shotFeedback, setShotFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const [shootingBallPos, setShootingBallPos] = useState<{ top: string; left: string } | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Mode 2: GK Reflex specific state
  const [activeThreatZone, setActiveThreatZone] = useState<number | null>(null);
  const [threatTimeRemaining, setThreatTimeRemaining] = useState<number>(0);
  const [reactionSpeeds, setReactionSpeeds] = useState<number[]>([]);
  const threatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const threatStartTimeRef = useRef<number>(0);

  const currentLevel = LEVELS_CONFIG[currentLevelIdx] || LEVELS_CONFIG[0];

  // Helper to generate a fresh wave of 3 unique moving targets
  const generateWaveTargets = (level: LevelConfig, waveNum: number): MovingTarget[] => {
    const animTypes: MovingTarget["animType"][] = ["float-h", "float-v", "diagonal", "circle", "zigzag"];
    const baseDuration = Math.max(1.2, 4.0 / level.speedMultiplier);

    // 3 distinct goal zones: Zone 1 (Left), Zone 2 (Center/Upper), Zone 3 (Right)
    const zones = [
      { minTop: 12, maxTop: 65, minLeft: 10, maxLeft: 32, anim: animTypes[0], label: "LEWY RÓG" },
      { minTop: 10, maxTop: 45, minLeft: 38, maxLeft: 60, anim: animTypes[1], label: "POPRZECZKA" },
      { minTop: 12, maxTop: 65, minLeft: 66, maxLeft: 88, anim: animTypes[2], label: "PRAWY RÓG" }
    ];

    return zones.map((z, idx) => {
      const isGold = idx === 1 && (level.level >= 3 || waveNum >= 3);
      const pts = isGold ? Math.round(level.basePoints * 1.5) : level.basePoints;
      const animType = animTypes[(idx + waveNum) % animTypes.length];
      const duration = baseDuration * (0.85 + (idx * 0.15));

      return {
        id: `target-${waveNum}-${idx}-${Date.now()}`,
        label: isGold ? "🔥 ZŁOTY STRZAŁ" : z.label,
        points: pts,
        startTop: Math.floor(Math.random() * (z.maxTop - z.minTop)) + z.minTop,
        startLeft: Math.floor(Math.random() * (z.maxLeft - z.minLeft)) + z.minLeft,
        animType: animType,
        animDuration: duration,
        size: level.targetSize,
        isHit: false,
        colorTheme: isGold ? "#f59e0b" : level.themeColor
      };
    });
  };

  // Main Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  // GK Reflex Threat Spawner Loop
  useEffect(() => {
    if (gameState === "playing" && activeMode === "gk_reflex") {
      spawnNextThreat();
    }
    return () => {
      if (threatTimerRef.current) clearTimeout(threatTimerRef.current);
    };
  }, [gameState, activeMode]);

  const handleTimeExpired = () => {
    if (activeMode === "free_kicks") {
      if (currentWave > currentLevel.wavesToPass) {
        handleLevelComplete();
      } else {
        setGameState("game_over");
        cardSound.playFlip();
        cardSound.playHaptic("medium");
      }
    } else {
      setGameState("game_over");
      cardSound.playWalkoutFanfare();
      cardSound.playHaptic("walkout");
    }
  };

  const handleLevelComplete = () => {
    setGameState("level_completed");
    cardSound.playWalkoutFanfare();
    cardSound.playHaptic("walkout");

    // Unlock next level if available
    if (currentLevel.level >= unlockedMaxLevel && currentLevel.level < LEVELS_CONFIG.length) {
      setUnlockedMaxLevel(currentLevel.level + 1);
    }
  };

  // Start Level
  const handleStartLevel = (levelIndex: number) => {
    const lvl = LEVELS_CONFIG[levelIndex];
    setCurrentLevelIdx(levelIndex);
    setGameState("playing");
    setTimeLeft(lvl.targetDurationSec);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCurrentWave(1);
    setShotFeedback(null);
    setShootingBallPos(null);
    setRewardClaimed(false);

    if (activeMode === "free_kicks") {
      const firstWave = generateWaveTargets(lvl, 1);
      setActiveTargets(firstWave);
    }

    cardSound.playPackTear();
    cardSound.playHaptic("medium");
  };

  // Shoot at one of the 3 Moving Targets
  const handleHitTarget = (targetId: string) => {
    if (gameState !== "playing" || activeMode !== "free_kicks") return;

    const target = activeTargets.find(t => t.id === targetId);
    if (!target || target.isHit) return;

    // Ball Animation towards target position
    setShootingBallPos({ top: `${target.startTop}%`, left: `${target.startLeft}%` });
    cardSound.playPackTear();
    cardSound.playHaptic("light");

    setTimeout(() => {
      setShootingBallPos(null);

      // Mark target as hit
      const updatedTargets = activeTargets.map(t => t.id === targetId ? { ...t, isHit: true } : t);
      setActiveTargets(updatedTargets);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const multiplier = newStreak >= 6 ? 2.5 : newStreak >= 3 ? 1.5 : 1;
      const pts = Math.round(target.points * multiplier);
      setScore(prev => prev + pts);

      cardSound.playTeaserHit(Math.min(3, newStreak));
      cardSound.playHaptic("heavy");

      setShotFeedback({
        text: `⚽ TRAFIENIE W ${target.label}! +${pts} pkt ${multiplier > 1 ? `(KOMBO x${multiplier})` : ""}`,
        color: target.colorTheme,
        id: Date.now()
      });

      // Check if ALL 3 targets in current wave have been hit!
      const remainingTargets = updatedTargets.filter(t => !t.isHit);
      if (remainingTargets.length === 0) {
        // Wave Completed!
        const nextWaveNum = currentWave + 1;
        setCurrentWave(nextWaveNum);

        cardSound.playWalkoutFanfare();
        cardSound.playHaptic("walkout");

        if (nextWaveNum > currentLevel.wavesToPass) {
          // All waves completed! Level victory!
          setTimeout(() => {
            handleLevelComplete();
          }, 600);
        } else {
          // Spawn next wave of 3 moving targets
          setShotFeedback({
            text: `🌟 FALA ${currentWave}/${currentLevel.wavesToPass} UKOŃCZONA! NASTĘPNA FALA!`,
            color: "#facc15",
            id: Date.now()
          });

          setTimeout(() => {
            const nextWave = generateWaveTargets(currentLevel, nextWaveNum);
            setActiveTargets(nextWave);
          }, 500);
        }
      }
    }, 240);
  };

  // Mode 2: GK Reflex Logic
  const gkZones = [
    { id: 0, label: "GÓRA LEWO", top: "15%", left: "15%" },
    { id: 1, label: "GÓRA ŚRODEK", top: "15%", left: "50%" },
    { id: 2, label: "GÓRA PRAWO", top: "15%", left: "85%" },
    { id: 3, label: "DÓŁ LEWO", top: "70%", left: "15%" },
    { id: 4, label: "DÓŁ ŚRODEK", top: "70%", left: "50%" },
    { id: 5, label: "DÓŁ PRAWO", top: "70%", left: "85%" },
  ];

  const spawnNextThreat = () => {
    if (gameState !== "playing" || activeMode !== "gk_reflex") return;

    const nextZone = Math.floor(Math.random() * 6);
    setActiveThreatZone(nextZone);
    threatStartTimeRef.current = Date.now();
    cardSound.playTeaserHit(1);

    const windowMs = Math.max(500, 1100 - streak * 45);
    setThreatTimeRemaining(windowMs);

    threatTimerRef.current = setTimeout(() => {
      handleGKMiss();
    }, windowMs);
  };

  const handleGKMiss = () => {
    setActiveThreatZone(null);
    setStreak(0);
    cardSound.playFlip();
    cardSound.playHaptic("medium");
    setShotFeedback({ text: "❌ GOL DLA PRZECIWNIKA!", color: "#ef4444", id: Date.now() });

    setTimeout(() => {
      if (gameState === "playing") spawnNextThreat();
    }, 600);
  };

  const handleGKDefend = (zoneId: number) => {
    if (gameState !== "playing" || activeThreatZone === null) return;

    if (zoneId === activeThreatZone) {
      if (threatTimerRef.current) clearTimeout(threatTimerRef.current);
      const reactionTime = Date.now() - threatStartTimeRef.current;
      setReactionSpeeds(prev => [...prev, reactionTime]);

      const earnedPts = Math.max(50, 160 - Math.floor(reactionTime / 10));
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const multiplier = newStreak >= 5 ? 2 : newStreak >= 3 ? 1.5 : 1;
      const roundScore = Math.round(earnedPts * multiplier);
      setScore(prev => prev + roundScore);

      setActiveThreatZone(null);
      cardSound.playTeaserHit(2);
      cardSound.playHaptic("heavy");
      setShotFeedback({ 
        text: `🧤 KAPITALNA OBRONA! (${reactionTime}ms) +${roundScore} pkt!`, 
        color: "#22c55e", 
        id: Date.now() 
      });

      setTimeout(() => {
        if (gameState === "playing") spawnNextThreat();
      }, 400);
    } else {
      handleGKMiss();
    }
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div 
      className="v200-skill-backdrop" 
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "#030508",
        overflow: "hidden",
        isolation: "isolate"
      }}
      onClick={onClose}
    >
      <div className="v200-skill-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-skill-header">
          <div className="v200-skill-title-group">
            <div className="v200-skill-badge">
              <Target size={16} className="text-yellow-400 animate-pulse" />
              <span>DELTA SKILL ARENA & POZIOMY 3D</span>
            </div>
            <h2>TRENING CELNOŚCI & 3 RUCHOME CELE</h2>
            <p>Klikaj w 3 ruchome cele w bramce, niszcz kolejne fale i awansuj na wyższe poziomy z szybszymi piłkami!</p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="v200-skill-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {gameState === "level_select" && (
          <div className="v200-skill-modes-row">
            <button
              type="button"
              onClick={() => {
                setActiveMode("free_kicks");
                cardSound.playFlip();
                cardSound.playHaptic("light");
              }}
              className={`v200-skill-mode-tab ${activeMode === "free_kicks" ? "active" : ""}`}
            >
              <Target size={16} />
              <span>🎯 RZUTY WOLNE (3 RUCHOME CELE & POZIOMY)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode("gk_reflex");
                cardSound.playFlip();
                cardSound.playHaptic("light");
              }}
              className={`v200-skill-mode-tab ${activeMode === "gk_reflex" ? "active" : ""}`}
            >
              <ShieldAlert size={16} />
              <span>🧤 REFLEKS BRAMKARZA (PARADY)</span>
            </button>
          </div>
        )}

        {/* ================= STATE 1: LEVEL SELECT LOBBY ================= */}
        {gameState === "level_select" && (
          <div className="v200-skill-lobby-view animate-fadeIn">
            <div className="v200-levels-grid">
              {LEVELS_CONFIG.map((lvl, index) => {
                const isUnlocked = lvl.level <= unlockedMaxLevel;
                return (
                  <div 
                    key={lvl.level}
                    className={`v200-level-card ${isUnlocked ? "unlocked" : "locked"}`}
                    style={{ borderColor: isUnlocked ? lvl.themeColor : "rgba(255,255,255,0.1)" }}
                  >
                    <div className="v200-level-card-header">
                      <div className="v200-level-badge" style={{ backgroundColor: `${lvl.themeColor}22`, color: lvl.themeColor, borderColor: lvl.themeColor }}>
                        {isUnlocked ? <Sparkles size={13} /> : <Lock size={13} />}
                        <span>POZIOM {lvl.level}</span>
                      </div>
                      <div className="v200-level-reward-tag">
                        <Coins size={14} className="text-yellow-400" />
                        <span>+{lvl.dpReward} DP</span>
                      </div>
                    </div>

                    <h3 className="v200-level-title" style={{ color: isUnlocked ? "#ffffff" : "#64748b" }}>
                      {lvl.name}
                    </h3>
                    <p className="v200-level-subtitle">{lvl.subtitle}</p>
                    <p className="v200-level-desc">{lvl.description}</p>

                    <div className="v200-level-metrics">
                      <span className="metric">⏱️ Czas: <b>{lvl.targetDurationSec}s</b></span>
                      <span className="metric">🎯 Fale: <b>{lvl.wavesToPass} (x3 cele)</b></span>
                      <span className="metric">⚡ Prędkość: <b>{lvl.speedMultiplier}x</b></span>
                    </div>

                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => handleStartLevel(index)}
                      className={`v200-level-play-btn ${isUnlocked ? "active-play" : "locked-btn"}`}
                      style={{ background: isUnlocked ? `linear-gradient(135deg, ${lvl.themeColor}, #eab308)` : "#334155" }}
                    >
                      {isUnlocked ? (
                        <>
                          <Play size={16} /> ROZPOCZNIJ POZIOM {lvl.level}
                        </>
                      ) : (
                        <>
                          <Lock size={16} /> UKOŃCZ POZIOM {lvl.level - 1}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STATE 2: ACTIVE PLAYING ARENA ================= */}
        {gameState === "playing" && (
          <div className="v200-skill-pitch-arena animate-fadeIn">
            {/* Top HUD */}
            <div className="v200-skill-hud-bar">
              <div className="v200-hud-stat">
                <span className="label">POZIOM</span>
                <span className="val" style={{ color: currentLevel.themeColor }}>LVL {currentLevel.level}</span>
              </div>

              <div className="v200-hud-stat">
                <span className="label">FALA CELÓW</span>
                <span className="val text-yellow-300">
                  {currentWave} / {currentLevel.wavesToPass}
                </span>
              </div>

              <div className="v200-hud-stat">
                <span className="label">CZAS</span>
                <span className={`val time ${timeLeft <= 5 ? "urgent" : ""}`}>{timeLeft}s</span>
              </div>

              <div className="v200-hud-stat">
                <span className="label">WYNIK</span>
                <span className="val score">{score}</span>
              </div>

              <div className="v200-hud-stat">
                <span className="label">KOMBO</span>
                <span className={`val streak ${streak >= 3 ? "fire" : ""}`}>
                  {streak > 0 ? `🔥 x${streak}` : "0"}
                </span>
              </div>
            </div>

            {/* Goal Canvas Pitch */}
            <div className="v200-skill-goal-stage">
              <div className="v200-goal-crossbar-top" />
              <div className="v200-goal-post-left" />
              <div className="v200-goal-post-right" />
              <div className="v200-goal-net-pattern" />

              {/* Feedback toast */}
              {shotFeedback && (
                <div 
                  key={shotFeedback.id} 
                  className="v200-shot-feedback-toast animate-bounce"
                  style={{ color: shotFeedback.color, borderColor: shotFeedback.color }}
                >
                  {shotFeedback.text}
                </div>
              )}

              {/* 3 ACTIVE MOVING TARGETS IN WAVE */}
              {activeMode === "free_kicks" && activeTargets.map(target => {
                if (target.isHit) return null;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => handleHitTarget(target.id)}
                    className={`v200-dynamic-moving-target ${target.animType}`}
                    style={{
                      top: `${target.startTop}%`,
                      left: `${target.startLeft}%`,
                      width: target.size,
                      height: target.size,
                      animationDuration: `${target.animDuration}s`,
                      borderColor: target.colorTheme,
                      boxShadow: `0 0 25px ${target.colorTheme}66`
                    }}
                  >
                    <div 
                      className="v200-target-inner-core"
                      style={{ background: `radial-gradient(circle, #ffffff 0%, ${target.colorTheme} 100%)` }}
                    >
                      <span className="text-black font-black text-xs">{target.points}</span>
                    </div>
                  </button>
                );
              })}

              {/* MODE 2: GK THREAT ZONES */}
              {activeMode === "gk_reflex" && gkZones.map(zone => {
                const isUnderThreat = activeThreatZone === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => handleGKDefend(zone.id)}
                    className={`v200-gk-zone-button ${isUnderThreat ? "under-threat animate-pulse" : ""}`}
                    style={{ top: zone.top, left: zone.left }}
                  >
                    {isUnderThreat ? (
                      <div className="v200-gk-incoming-ball">
                        <span>⚽ BROŃ!</span>
                      </div>
                    ) : (
                      <div className="v200-gk-zone-idle">
                        <span>🧤</span>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Ball Flight Animation */}
              {shootingBallPos && (
                <div 
                  className="v200-flight-ball"
                  style={{ top: shootingBallPos.top, left: shootingBallPos.left }}
                >
                  ⚽
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STATE 3: LEVEL COMPLETED (AWANS!) ================= */}
        {gameState === "level_completed" && (
          <div className="v200-skill-gameover-view animate-fadeIn">
            <div className="v200-gameover-card victory-card">
              <div className="v200-victory-trophy-box">
                <Crown size={48} className="text-yellow-400 animate-bounce" />
              </div>

              <h3 className="v200-gameover-tier text-yellow-300">
                🎉 POZIOM {currentLevel.level} UKOŃCZONY!
              </h3>
              <p className="v200-gameover-sub">
                Kapitalna celność! Trafiono wszystkie fale celów w czasie <strong className="text-white">{timeLeft}s przed końcem</strong>!
              </p>

              {/* Reward Box */}
              <div className="v200-gameover-reward-box">
                <Coins size={30} className="text-yellow-400" />
                <div>
                  <span className="text-xs text-slate-300 block">NAGRODA ZA AWANS:</span>
                  <strong className="text-2xl text-yellow-300 font-black">+{currentLevel.dpReward} DELTA POINTS</strong>
                </div>

                {!rewardClaimed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRewardClaimed(true);
                      if (onPointsEarned) onPointsEarned(currentLevel.dpReward);
                      cardSound.playPurchase();
                      cardSound.playHaptic("medium");
                    }}
                    className="v200-claim-skill-dp-btn"
                  >
                    <Sparkles size={16} /> ODBIERZ +{currentLevel.dpReward} DP
                  </button>
                ) : (
                  <span className="text-sm font-bold text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={16} /> Odebrano nagrodę!
                  </span>
                )}
              </div>

              {/* Next Level & Replay Actions */}
              <div className="v200-gameover-actions">
                {currentLevelIdx + 1 < LEVELS_CONFIG.length ? (
                  <button
                    type="button"
                    onClick={() => handleStartLevel(currentLevelIdx + 1)}
                    className="v200-skill-nextlevel-btn"
                  >
                    <ArrowRight size={18} /> AWANSUJ DO POZIOMU {currentLevel.level + 1} (SZYBSZE PIŁKI!)
                  </button>
                ) : (
                  <div className="text-yellow-400 font-bold text-sm">
                    🏆 GRATULACJE! JESTEŚ MISTRZEM INFERNO DELTA WARSZAWA!
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleStartLevel(currentLevelIdx)}
                  className="v200-skill-restart-btn"
                >
                  <RotateCcw size={16} /> ZAGRAJ TEN POZIOM PONOWNIE
                </button>

                <button
                  type="button"
                  onClick={() => setGameState("level_select")}
                  className="v200-skill-menu-btn"
                >
                  WYBÓR POZIOMÓW
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 4: GAME OVER / RETRY ================= */}
        {gameState === "game_over" && (
          <div className="v200-skill-gameover-view animate-fadeIn">
            <div className="v200-gameover-card">
              <h3 className="v200-gameover-tier text-red-400">
                ⏱️ SKOŃCZYŁ SIĘ CZAS!
              </h3>
              <p className="v200-gameover-sub">
                Udało się ukończyć falę: <strong className="text-yellow-300">{currentWave - 1} / {currentLevel.wavesToPass}</strong> | Zdobyte punkty: <strong>{score} pkt</strong>
              </p>

              <div className="v200-gameover-actions">
                <button
                  type="button"
                  onClick={() => handleStartLevel(currentLevelIdx)}
                  className="v200-skill-restart-btn"
                >
                  <RotateCcw size={16} /> SPRÓBUJ PONOWNIE
                </button>

                <button
                  type="button"
                  onClick={() => setGameState("level_select")}
                  className="v200-skill-menu-btn"
                >
                  WYBIERZ INNY POZIOM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
