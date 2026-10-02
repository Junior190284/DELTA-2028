"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Flame, 
  Gift, 
  Coins, 
  Crown, 
  Trophy, 
  CheckCircle2, 
  X, 
  RotateCw,
  Zap,
  Calendar
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";
import { PackDefinition, getPackImageUrl } from "@/lib/cards/types";

interface WheelSegment {
  id: string;
  name: string;
  type: "points" | "pack";
  amount?: number;
  packTypeId?: string;
  color: string;
  textColor: string;
  icon: string;
  weight: number;
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "s1", name: "+50 DP", type: "points", amount: 50, color: "#eab308", textColor: "#000", icon: "🪙", weight: 28 },
  { id: "s2", name: "Paczka Standardowa", type: "pack", packTypeId: "standard_pack", color: "#dc2626", textColor: "#fff", icon: "📦", weight: 20 },
  { id: "s3", name: "+100 DP", type: "points", amount: 100, color: "#ca8a04", textColor: "#000", icon: "💰", weight: 15 },
  { id: "s4", name: "Matchday Booster", type: "pack", packTypeId: "matchday_booster", color: "#0284c7", textColor: "#fff", icon: "⚡", weight: 12 },
  { id: "s5", name: "+25 DP", type: "points", amount: 25, color: "#64748b", textColor: "#fff", icon: "🪙", weight: 30 },
  { id: "s6", name: "👑 Gold Booster", type: "pack", packTypeId: "gold_booster", color: "#f59e0b", textColor: "#000", icon: "👑", weight: 8 },
  { id: "s7", name: "🔥 Bilet Inferno (+200 DP)", type: "points", amount: 200, color: "#991b1b", textColor: "#fff", icon: "🔥", weight: 4 },
  { id: "s8", name: "👑 Legend Pack", type: "pack", packTypeId: "legend_pack", color: "#7e22ce", textColor: "#fff", icon: "🌟", weight: 2 }
];

const STREAK_DAYS = [
  { day: 1, reward: "+25 DP", claimed: true },
  { day: 2, reward: "+50 DP", claimed: true },
  { day: 3, reward: "Paczka Std", claimed: false, current: true },
  { day: 4, reward: "+75 DP", claimed: false },
  { day: 5, reward: "Matchday", claimed: false },
  { day: 6, reward: "+150 DP", claimed: false },
  { day: 7, reward: "👑 Gold Pack", claimed: false, big: true }
];

interface DailyInfernoSpinProps {
  onClose?: () => void;
  onRewardClaimed?: (newBalance: number) => void;
  onOpenPack?: (pack: PackDefinition) => void;
  packDefinitions?: PackDefinition[];
}

export default function DailyInfernoSpin({
  onClose,
  onRewardClaimed,
  onOpenPack,
  packDefinitions = []
}: DailyInfernoSpinProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningSegment, setWinningSegment] = useState<WheelSegment | null>(null);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [savingReward, setSavingReward] = useState(false);

  const numSegments = WHEEL_SEGMENTS.length;
  const arcSize = 360 / numSegments;

  // Spin wheel action
  const handleSpin = () => {
    if (spinning) return;

    setSpinning(true);
    setWinningSegment(null);
    setShowWinCelebration(false);

    // Weighted random selection
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    let randomVal = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      if (randomVal <= WHEEL_SEGMENTS[i].weight) {
        selectedIndex = i;
        break;
      }
      randomVal -= WHEEL_SEGMENTS[i].weight;
    }

    const prize = WHEEL_SEGMENTS[selectedIndex];

    // Calculate rotation: 5 full spins (1800 deg) + offset to land on selectedIndex
    // Segment 0 is at 0-45 deg. The pointer is at the top (270 deg / -90 deg).
    const extraTurns = 5 * 360;
    const segmentCenterAngle = selectedIndex * arcSize + arcSize / 2;
    // Pointer is at the top (90 deg relative or 270)
    const targetAngle = extraTurns + (360 - segmentCenterAngle);

    // Add current rotation to keep spinning forward
    const finalRotation = rotation + targetAngle + (Math.random() * (arcSize * 0.7) - arcSize * 0.35);
    setRotation(finalRotation);

    // Tick sounds during spin
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      cardSound.playHover();
      if (tickCount > 25) clearInterval(tickInterval);
    }, 140);

    // Landing on prize
    setTimeout(async () => {
      setSpinning(false);
      setWinningSegment(prize);
      setShowWinCelebration(true);
      setHasSpunToday(true);
      cardSound.playWalkoutFanfare();

      // Persist reward
      try {
        setSavingReward(true);
        const res = await fetch("/api/cards/daily-spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reward: prize })
        });
        if (res.ok) {
          const data = await res.json();
          if (onRewardClaimed && data.newPointsBalance !== undefined) {
            onRewardClaimed(data.newPointsBalance);
          }
        }
      } catch (e) {
        console.error("Błąd zapisu nagrody:", e);
      } finally {
        setSavingReward(false);
      }
    }, 4600);
  };

  const handleOpenWonPack = () => {
    if (!winningSegment || winningSegment.type !== "pack" || !winningSegment.packTypeId) return;
    const targetPack = packDefinitions.find(p => p.id === winningSegment.packTypeId) || {
      id: winningSegment.packTypeId,
      name: winningSegment.name,
      description: "Nagroda z Koła Fortuny DELTA",
      cards_count: 5,
      drop_rates: { common: 35, rare: 45, epic: 15, legendary: 4.5, inferno: 0.5 },
      min_rarity: "rare",
      theme: winningSegment.packTypeId.includes("inferno") ? "inferno" : winningSegment.packTypeId.includes("legend") ? "legend" : "gold",
      image_url: getPackImageUrl(winningSegment.packTypeId),
      is_active: true
    };

    if (onOpenPack) {
      onOpenPack(targetPack);
      if (onClose) onClose();
    }
  };

  return (
    <div className="v200-spin-modal-backdrop">
      {/* Dynamic Celebration Particles */}
      {showWinCelebration && (
        <CanvasParticles theme="gold" active={true} />
      )}

      <div className="v200-spin-modal-container">
        {/* Header Bar */}
        <div className="v200-spin-header">
          <div className="v200-spin-title-group">
            <div className="v200-spin-badge">
              <Flame size={14} className="text-red-500 animate-pulse" />
              <span>DELTA INFERNO WHEEL</span>
            </div>
            <h2>CODZIENNE KOŁO FORTUNY</h2>
            <p>Zakręć kołem i zdobywaj codzienne nagrody, paczki oraz punkty Delta!</p>
          </div>

          {onClose && (
            <button 
              type="button" 
              onClick={onClose}
              className="v200-spin-close-btn"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 7-Day Streak Tracker Bar */}
        <div className="v200-streak-bar">
          <div className="v200-streak-header">
            <span className="v200-streak-title">
              <Calendar size={13} className="text-yellow-400 inline mr-1" />
              SERIA LOGOWANIA (DZIEŃ 3 Z 7)
            </span>
            <span className="v200-streak-boost">
              Dzień 7: 👑 Gwarantowany Gold Booster!
            </span>
          </div>

          <div className="v200-streak-track">
            {STREAK_DAYS.map(s => (
              <div 
                key={s.day} 
                className={`v200-streak-step ${s.claimed ? "claimed" : ""} ${s.current ? "current" : ""} ${s.big ? "big-reward" : ""}`}
              >
                <div className="v200-streak-circle">
                  {s.claimed ? (
                    <CheckCircle2 size={13} className="text-green-400" />
                  ) : s.big ? (
                    <Crown size={13} className="text-yellow-400" />
                  ) : (
                    <span>{s.day}</span>
                  )}
                </div>
                <span className="v200-streak-reward-label">{s.reward}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ================= WHEEL STAGE ================= */}
        <div className="v200-wheel-stage">
          {/* Top Flapper Pointer */}
          <div className="v200-wheel-pointer">
            <div className="v200-pointer-arrow" />
          </div>

          {/* Glowing Outer Wheel Rim */}
          <div className="v200-wheel-outer-rim">
            <div 
              className="v200-wheel-disk"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4.5s cubic-bezier(0.12, 0.95, 0.25, 1)" : "none"
              }}
            >
              {/* SVG Segments */}
              <svg viewBox="0 0 400 400" className="v200-wheel-svg">
                <defs>
                  <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#78350f" stopOpacity="0.95" />
                  </radialGradient>
                </defs>

                {WHEEL_SEGMENTS.map((seg, idx) => {
                  const startAngle = (idx * arcSize - 90) * (Math.PI / 180);
                  const endAngle = ((idx + 1) * arcSize - 90) * (Math.PI / 180);
                  const radius = 195;
                  const x1 = 200 + radius * Math.cos(startAngle);
                  const y1 = 200 + radius * Math.sin(startAngle);
                  const x2 = 200 + radius * Math.cos(endAngle);
                  const y2 = 200 + radius * Math.sin(endAngle);

                  const pathData = `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                  const textAngle = idx * arcSize + arcSize / 2;

                  return (
                    <g key={seg.id}>
                      <path 
                        d={pathData} 
                        fill={seg.color}
                        stroke="#1e293b"
                        strokeWidth="2.5"
                      />
                      {/* Segment Label rotated */}
                      <g transform={`rotate(${textAngle}, 200, 200)`}>
                        <text
                          x="200"
                          y="65"
                          fill={seg.textColor}
                          fontSize="12"
                          fontWeight="900"
                          textAnchor="middle"
                          transform="rotate(90, 200, 65)"
                          style={{ letterSpacing: "0.04em", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
                        >
                          {seg.name}
                        </text>
                        <text
                          x="200"
                          y="105"
                          fontSize="16"
                          textAnchor="middle"
                        >
                          {seg.icon}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Center Club Hub Button */}
              <div className="v200-wheel-center-hub">
                <img 
                  src="/teamlogos/gm.png" 
                  alt="DELTA" 
                  className="v200-hub-logo" 
                />
                <div className="v200-hub-ring" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="v200-spin-action-row">
          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning}
            className={`v200-spin-launch-btn ${spinning ? "spinning" : ""}`}
          >
            {spinning ? (
              <>
                <RotateCw size={20} className="animate-spin" />
                <span>LOSOWANIE NAGRODY...</span>
              </>
            ) : (
              <>
                <Zap size={20} className="text-black" />
                <span>ZAKRĘĆ KOŁEM (DARMOWY SPIN)</span>
              </>
            )}
          </button>
        </div>

        {/* ================= WINNING PRIZE MODAL BANNER ================= */}
        {showWinCelebration && winningSegment && (
          <div className="v200-spin-win-modal animate-slamZoom">
            <div className="v200-win-glow" />
            <div className="v200-win-content">
              <span className="v200-win-kicker">🎉 GRATULACJE! WYGRYWASZ:</span>
              <h3 className="v200-win-prize-title">{winningSegment.name}</h3>

              {winningSegment.type === "pack" ? (
                <div className="v200-win-pack-preview">
                  <img 
                    src={getPackImageUrl(winningSegment.packTypeId)} 
                    alt={winningSegment.name}
                    className="v200-win-pack-img"
                  />
                  <button
                    type="button"
                    onClick={handleOpenWonPack}
                    className="v200-win-open-pack-btn"
                  >
                    <Sparkles size={16} /> OTWÓRZ TĘ PACZKĘ TERAZ!
                  </button>
                </div>
              ) : (
                <div className="v200-win-points-badge">
                  <Coins size={22} className="text-yellow-400" />
                  <span>+{winningSegment.amount} DP dodane do Twojego konta!</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowWinCelebration(false)}
                className="v200-win-dismiss-btn"
              >
                Świetnie, zbieram dalej!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
