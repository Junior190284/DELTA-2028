"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Activity,
  Award
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";

interface DeltaSkillMiniGamesModalProps {
  onClose: () => void;
  onPointsEarned?: (points: number) => void;
}

type GameMode = "free_kicks" | "gk_reflex";

interface TargetZone {
  id: string;
  label: string;
  points: number;
  top: string;
  left: string;
  size: number;
  isMoving?: boolean;
}

export default function DeltaSkillMiniGamesModal({
  onClose,
  onPointsEarned
}: DeltaSkillMiniGamesModalProps) {
  const [activeMode, setActiveMode] = useState<GameMode>("free_kicks");
  const [gameState, setGameState] = useState<"idle" | "playing" | "game_over">("idle");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [shotFeedback, setShotFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const [shootingBallPos, setShootingBallPos] = useState<{ top: string; left: string } | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Mode 2: GK Reflex specific state
  const [activeThreatZone, setActiveThreatZone] = useState<number | null>(null);
  const [threatTimeRemaining, setThreatTimeRemaining] = useState<number>(0);
  const [reactionSpeeds, setReactionSpeeds] = useState<number[]>([]);
  const threatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const threatStartTimeRef = useRef<number>(0);

  // Targets definition for Free Kicks
  const targets: TargetZone[] = [
    { id: "tl", label: "OKIENKO L", points: 100, top: "12%", left: "12%", size: 64 },
    { id: "tr", label: "OKIENKO P", points: 100, top: "12%", left: "76%", size: 64 },
    { id: "tc", label: "POPRZECZKA", points: 75, top: "8%", left: "44%", size: 58 },
    { id: "bl", label: "DOLNY RÓG", points: 50, top: "68%", left: "14%", size: 60 },
    { id: "br", label: "DOLNY RÓG", points: 50, top: "68%", left: "74%", size: 60 },
    { id: "moving", label: "🔥 ZŁOTY CEL", points: 150, top: "35%", left: "45%", size: 70, isMoving: true }
  ];

  // GK Zones (6 zones in goal)
  const gkZones = [
    { id: 0, label: "GÓRA LEWO", top: "15%", left: "15%" },
    { id: 1, label: "GÓRA ŚRODEK", top: "15%", left: "50%" },
    { id: 2, label: "GÓRA PRAWO", top: "15%", left: "85%" },
    { id: 3, label: "DÓŁ LEWO", top: "70%", left: "15%" },
    { id: 4, label: "DÓŁ ŚRODEK", top: "70%", left: "50%" },
    { id: 5, label: "DÓŁ PRAWO", top: "70%", left: "85%" },
  ];

  // Main Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameOver();
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

  const spawnNextThreat = () => {
    if (gameState !== "playing" || activeMode !== "gk_reflex") return;

    // Pick random zone
    const nextZone = Math.floor(Math.random() * 6);
    setActiveThreatZone(nextZone);
    threatStartTimeRef.current = Date.now();
    cardSound.playTeaserHit(1);

    // Dynamic duration based on streak (faster as streak grows)
    const windowMs = Math.max(550, 1100 - streak * 40);
    setThreatTimeRemaining(windowMs);

    threatTimerRef.current = setTimeout(() => {
      // Player missed the save! Goal conceded
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

      const earnedPts = Math.max(50, 150 - Math.floor(reactionTime / 10));
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
      // Wrong zone tapped
      handleGKMiss();
    }
  };

  // Shoot at Target (Free Kicks)
  const handleShootTarget = (target: TargetZone) => {
    if (gameState !== "playing" || activeMode !== "free_kicks") return;

    setShootingBallPos({ top: target.top, left: target.left });
    cardSound.playPackTear();
    cardSound.playHaptic("light");

    setTimeout(() => {
      setShootingBallPos(null);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const multiplier = newStreak >= 5 ? 2.5 : newStreak >= 3 ? 1.5 : 1;
      const pts = Math.round(target.points * multiplier);
      setScore(prev => prev + pts);

      cardSound.playTeaserHit(2);
      cardSound.playHaptic("heavy");

      setShotFeedback({
        text: `🎯 GOOOL W ${target.label}! +${pts} pkt ${multiplier > 1 ? `(KOMBO x${multiplier})` : ""}`,
        color: target.points >= 100 ? "#facc15" : "#4ade80",
        id: Date.now()
      });
    }, 280);
  };

  const handleStartGame = () => {
    setGameState("playing");
    setTimeLeft(activeMode === "free_kicks" ? 30 : 25);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setShotFeedback(null);
    setReactionSpeeds([]);
    setRewardClaimed(false);
    cardSound.playPackTear();
    cardSound.playHaptic("medium");
  };

  const handleGameOver = () => {
    setGameState("game_over");
    setActiveThreatZone(null);
    if (threatTimerRef.current) clearTimeout(threatTimerRef.current);

    cardSound.playWalkoutFanfare();
    cardSound.playHaptic("walkout");
  };

  // Calculate Stars and Reward DP
  const calculateStarsAndDP = () => {
    if (activeMode === "free_kicks") {
      if (score >= 900) return { stars: 3, dp: 40, tier: "MISTRZ CELNOŚCI" };
      if (score >= 500) return { stars: 2, dp: 25, tier: "ŚWIETNY STRZELEC" };
      if (score >= 200) return { stars: 1, dp: 15, tier: "DOBRY TRENING" };
      return { stars: 0, dp: 5, tier: "POĆWICZ JESZCZE" };
    } else {
      if (score >= 1200) return { stars: 3, dp: 40, tier: "ŚCIANA NIE DO PRZEJŚCIA" };
      if (score >= 700) return { stars: 2, dp: 25, tier: "KAPITALNY REFLEKS" };
      if (score >= 300) return { stars: 1, dp: 15, tier: "PEWNY BRAMKARZ" };
      return { stars: 0, dp: 5, tier: "POĆWICZ JESZCZE" };
    }
  };

  const gameResult = calculateStarsAndDP();
  const avgReaction = reactionSpeeds.length > 0 
    ? Math.round(reactionSpeeds.reduce((a, b) => a + b, 0) / reactionSpeeds.length) 
    : 0;

  return (
    <div className="v200-skill-backdrop" onClick={onClose}>
      <div className="v200-skill-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-skill-header">
          <div className="v200-skill-title-group">
            <div className="v200-skill-badge">
              <Target size={16} className="text-yellow-400 animate-pulse" />
              <span>DELTA SKILL ARENA & MINI-GRY</span>
            </div>
            <h2>TRENING CELNOŚCI I REFLEKSU 3D</h2>
            <p>Sprawdź swoje umiejętności strzeleckie i bramkarskie w szybkich 30-sekundowych wyzwaniach i zgarniaj Delta Points!</p>
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
        {gameState === "idle" && (
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
              <span>🎯 RZUTY WOLNE (W OKIENKO)</span>
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
              <span>🧤 REFLEKS BRAMKARZA</span>
            </button>
          </div>
        )}

        {/* ================= STATE 1: IDLE / LOBBY ================= */}
        {gameState === "idle" && (
          <div className="v200-skill-lobby-view">
            <div className="v200-skill-instructions-card">
              <div className="v200-skill-instruction-icon">
                {activeMode === "free_kicks" ? <Target size={44} className="text-yellow-400" /> : <ShieldAlert size={44} className="text-emerald-400" />}
              </div>

              <h3>{activeMode === "free_kicks" ? "RZUTY WOLNE W OKIENKO" : "REFLEKS I OBRONA BRAMKARZA"}</h3>
              <p>
                {activeMode === "free_kicks"
                  ? "Trafiaj palcem w pojawiające się tarcze w okienkach i rogach bramki! Utrzymuj serię trafień, aby aktywować mnożnik KOMBO x2 i x2.5!"
                  : "Broń bramki przed nadlatującymi strzałami! Klikaj i dotykaj zagrożoną strefę bramki zanim minie czas reakcji!"}
              </p>

              <div className="v200-skill-reward-rules">
                <div className="v200-skill-rule-item">
                  <span className="star">⭐ 1 Gwiazdka</span>
                  <span className="pts">+15 DP</span>
                </div>
                <div className="v200-skill-rule-item">
                  <span className="star">⭐⭐ 2 Gwiazdki</span>
                  <span className="pts">+25 DP</span>
                </div>
                <div className="v200-skill-rule-item highlight">
                  <span className="star">⭐⭐⭐ 3 Gwiazdki</span>
                  <span className="pts">+40 DP (Max)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartGame}
                className="v200-skill-start-btn"
              >
                <Play size={20} /> ROZPOCZNIJ WYZWANIE (30s)
              </button>
            </div>
          </div>
        )}

        {/* ================= STATE 2: PLAYING ACTIVE ARENA ================= */}
        {gameState === "playing" && (
          <div className="v200-skill-pitch-arena">
            {/* HUD Top Bar */}
            <div className="v200-skill-hud-bar">
              <div className="v200-hud-stat">
                <span className="label">CZAS</span>
                <span className={`val time ${timeLeft <= 5 ? "urgent" : ""}`}>{timeLeft}s</span>
              </div>

              <div className="v200-hud-stat">
                <span className="label">WYNIK</span>
                <span className="val score">{score}</span>
              </div>

              <div className="v200-hud-stat">
                <span className="label">SERIA KOMBO</span>
                <span className={`val streak ${streak >= 3 ? "fire" : ""}`}>
                  {streak > 0 ? `🔥 x${streak}` : "0"}
                </span>
              </div>
            </div>

            {/* Visual Goal Pitch Canvas */}
            <div className="v200-skill-goal-stage">
              <div className="v200-goal-crossbar-top" />
              <div className="v200-goal-post-left" />
              <div className="v200-goal-post-right" />
              <div className="v200-goal-net-pattern" />

              {/* Feedback toast banner */}
              {shotFeedback && (
                <div 
                  key={shotFeedback.id} 
                  className="v200-shot-feedback-toast animate-bounce"
                  style={{ color: shotFeedback.color, borderColor: shotFeedback.color }}
                >
                  {shotFeedback.text}
                </div>
              )}

              {/* MODE 1: FREE KICKS TARGETS */}
              {activeMode === "free_kicks" && targets.map(target => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleShootTarget(target)}
                  className={`v200-goal-target-ring ${target.isMoving ? "moving-target" : ""}`}
                  style={{
                    top: target.top,
                    left: target.left,
                    width: target.size,
                    height: target.size
                  }}
                >
                  <div className="v200-target-inner-bullseye">
                    <span>{target.points}</span>
                  </div>
                </button>
              ))}

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

        {/* ================= STATE 3: GAME OVER & REWARD SUMMARY ================= */}
        {gameState === "game_over" && (
          <div className="v200-skill-gameover-view animate-fadeIn">
            <div className="v200-gameover-card">
              <div className="v200-gameover-stars-row">
                {[1, 2, 3].map(st => (
                  <span 
                    key={st} 
                    className={`text-4xl ${st <= gameResult.stars ? "text-yellow-400 drop-shadow-md scale-110" : "text-slate-600 opacity-40"}`}
                  >
                    ★
                  </span>
                ))}
              </div>

              <h3 className="v200-gameover-tier">{gameResult.tier}</h3>
              <p className="v200-gameover-sub">
                Zdobyte punkty: <strong className="text-yellow-300 text-xl">{score} pkt</strong> | Najlepsza seria: <strong>{bestStreak}</strong>
                {avgReaction > 0 && <span> | Śr. reakcja: <strong>{avgReaction}ms</strong></span>}
              </p>

              {/* DP Reward Box */}
              <div className="v200-gameover-reward-box">
                <Coins size={28} className="text-yellow-400" />
                <div>
                  <span className="text-xs text-slate-300 block">NAGRODA ZA TRENING:</span>
                  <strong className="text-xl text-yellow-300 font-black">+{gameResult.dp} DELTA POINTS</strong>
                </div>

                {!rewardClaimed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRewardClaimed(true);
                      if (onPointsEarned) onPointsEarned(gameResult.dp);
                      cardSound.playPurchase();
                      cardSound.playHaptic("medium");
                    }}
                    className="v200-claim-skill-dp-btn"
                  >
                    <Sparkles size={16} /> ODBIERZ +{gameResult.dp} DP
                  </button>
                ) : (
                  <span className="text-sm font-bold text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={16} /> Odebrano nagrodę!
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="v200-gameover-actions">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="v200-skill-restart-btn"
                >
                  <RotateCcw size={16} /> ZAGRAJ PONOWNIE
                </button>

                <button
                  type="button"
                  onClick={() => setGameState("idle")}
                  className="v200-skill-menu-btn"
                >
                  MENU GŁÓWNE GIER
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
