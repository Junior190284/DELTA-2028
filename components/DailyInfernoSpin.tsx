"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  Calendar, 
  Star, 
  Clock,
  ShieldAlert 
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";
import { PackDefinition, getPackImageUrl } from "@/lib/cards/types";

interface WheelSegment {
  id: string;
  name: string;
  shortName: string;
  type: "points" | "pack";
  amount?: number;
  packTypeId?: string;
  gradientId: string;
  textColor: string;
  icon: string;
  weight: number;
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "s1", name: "+50 DELTA POINTS", shortName: "+50 DP", type: "points", amount: 50, gradientId: "grad-gold", textColor: "#000000", icon: "🪙", weight: 28 },
  { id: "s2", name: "PACZKA STANDARDOWA", shortName: "PACZKA STD", type: "pack", packTypeId: "standard_pack", gradientId: "grad-crimson", textColor: "#ffffff", icon: "📦", weight: 20 },
  { id: "s3", name: "+100 DELTA POINTS", shortName: "+100 DP", type: "points", amount: 100, gradientId: "grad-amber", textColor: "#000000", icon: "💰", weight: 15 },
  { id: "s4", name: "MATCHDAY BOOSTER", shortName: "MATCHDAY", type: "pack", packTypeId: "matchday_booster", gradientId: "grad-blue", textColor: "#ffffff", icon: "⚡", weight: 12 },
  { id: "s5", name: "+25 DELTA POINTS", shortName: "+25 DP", type: "points", amount: 25, gradientId: "grad-slate", textColor: "#ffffff", icon: "🪙", weight: 30 },
  { id: "s6", name: "👑 GOLD BOOSTER", shortName: "GOLD PACK", type: "pack", packTypeId: "gold_booster", gradientId: "grad-yellow", textColor: "#000000", icon: "👑", weight: 8 },
  { id: "s7", name: "🔥 INFERNO (+200 DP)", shortName: "+200 DP 🔥", type: "points", amount: 200, gradientId: "grad-inferno", textColor: "#ffffff", icon: "🔥", weight: 4 },
  { id: "s8", name: "🌟 LEGEND PACK", shortName: "LEGEND PACK", type: "pack", packTypeId: "legend_pack", gradientId: "grad-legend", textColor: "#ffffff", icon: "🌟", weight: 2 }
];

const STREAK_REWARDS_CONFIG = [
  { day: 1, reward: "+25 DP" },
  { day: 2, reward: "+50 DP" },
  { day: 3, reward: "Paczka Std" },
  { day: 4, reward: "+75 DP" },
  { day: 5, reward: "Matchday" },
  { day: 6, reward: "+150 DP" },
  { day: 7, reward: "👑 Gold Pack", big: true }
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
  const [mounted, setMounted] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningSegment, setWinningSegment] = useState<WheelSegment | null>(null);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  
  // Daily cooldown & streak state from server
  const [canSpin, setCanSpin] = useState<boolean>(true);
  const [streakCount, setStreakCount] = useState<number>(1);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      mediaQuery.removeEventListener("change", listener);
    };
  }, []);

  // Fetch initial spin eligibility and streak from server
  useEffect(() => {
    let isMounted = true;
    async function loadSpinStatus() {
      try {
        setLoadingStatus(true);
        const res = await fetch("/api/cards/daily-spin");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCanSpin(Boolean(data.canSpin));
            setStreakCount(data.streak || 1);
            setSecondsRemaining(data.secondsRemaining || 0);
          }
        }
      } catch (err) {
        console.error("Błąd pobierania statusu daily-spin:", err);
      } finally {
        if (isMounted) setLoadingStatus(false);
      }
    }
    loadSpinStatus();
    return () => { isMounted = false; };
  }, []);

  // Countdown timer interval
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setCanSpin(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const numSegments = WHEEL_SEGMENTS.length;
  const arcSize = 360 / numSegments;

  // Spin wheel action (Server-controlled)
  const handleSpin = async () => {
    if (spinning || !canSpin || secondsRemaining > 0) return;

    setSpinning(true);
    setWinningSegment(null);
    setShowWinCelebration(false);

    try {
      // 1. Call server to get the authoritative result and commit the reward
      const res = await fetch("/api/cards/daily-spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSpinning(false);
        if (errData.secondsRemaining !== undefined) {
          setSecondsRemaining(errData.secondsRemaining);
          setCanSpin(false);
        }
        return;
      }

      const data = await res.json();
      const serverSegmentId = data.segmentId || data.reward?.id;
      let selectedIndex = WHEEL_SEGMENTS.findIndex(s => s.id === serverSegmentId);
      if (selectedIndex === -1) {
        selectedIndex = 0;
      }
      const prize = WHEEL_SEGMENTS[selectedIndex];

      // 2. Calculate rotation: 5 full spins (1800 deg) + offset to land on selectedIndex
      const extraTurns = 5 * 360;
      const segmentCenterAngle = selectedIndex * arcSize + arcSize / 2;
      const targetAngle = extraTurns + (360 - segmentCenterAngle);

      const finalRotation = rotation + targetAngle + (Math.random() * (arcSize * 0.5) - arcSize * 0.25);
      setRotation(finalRotation);

      // Tick sounds during spin
      let tickCount = 0;
      const tickInterval = setInterval(() => {
        tickCount++;
        cardSound.playHover();
        if (tickCount > 28) clearInterval(tickInterval);
      }, 130);

      // Landing on prize after animation completes (4.5s)
      setTimeout(() => {
        setSpinning(false);
        setWinningSegment(prize);
        setShowWinCelebration(true);
        setCanSpin(false);
        cardSound.playWalkoutFanfare();

        if (data.streak !== undefined) setStreakCount(data.streak);
        if (data.secondsRemaining !== undefined) setSecondsRemaining(data.secondsRemaining);
        if (onRewardClaimed && data.newPointsBalance !== undefined) {
          onRewardClaimed(data.newPointsBalance);
        }
      }, 4600);
    } catch (e) {
      console.error("Błąd podczas kręcenia kołem:", e);
      setSpinning(false);
    }
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

  // Generate 24 perimeter LED bulb coordinates around the rim
  const rimBulbs = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i * 15) * (Math.PI / 180);
    const r = 240;
    return {
      x: 250 + r * Math.cos(angle),
      y: 250 + r * Math.sin(angle),
      id: i
    };
  });

  const streakDaysList = useMemo(() => {
    return STREAK_REWARDS_CONFIG.map(s => {
      const isClaimed = s.day < streakCount || (s.day === streakCount && !canSpin);
      const isCurrent = s.day === streakCount && canSpin;
      return {
        ...s,
        claimed: isClaimed,
        current: isCurrent
      };
    });
  }, [streakCount, canSpin]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div 
      className="v200-spin-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "rgba(3, 5, 8, 0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        overflowY: "auto",
        overflowX: "hidden",
        isolation: "isolate",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(10px, 3vw, 24px)",
        boxSizing: "border-box"
      }}
      onClick={onClose}
    >
      {/* Dynamic Celebration Particles */}
      {showWinCelebration && !isReducedMotion && (
        <CanvasParticles theme="gold" active={true} />
      )}

      <div className="v200-spin-modal-container vip-wheel-container" onClick={e => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="v200-spin-header">
          <div className="v200-spin-title-group">
            <div className="v200-spin-badge">
              <Flame size={15} className="text-red-500 animate-pulse" />
              <span>DELTA CASINO & WHEEL VIP</span>
            </div>
            <h2>CODZIENNE KOŁO FORTUNY</h2>
            <p>Maksymalnie 1 darmowy obrót dziennie. Zbieraj codzienną serię 7 dni!</p>
          </div>

          {onClose && (
            <button 
              type="button" 
              onClick={onClose}
              className="v200-spin-close-btn"
              aria-label="Zamknij"
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* 7-Day Streak Tracker Bar */}
        <div className="v200-streak-bar">
          <div className="v200-streak-header">
            <span className="v200-streak-title">
              <Calendar size={14} className="text-yellow-400 inline mr-1.5" />
              SERIA LOGOWANIA (DZIEŃ {streakCount} Z 7)
            </span>
            <span className="v200-streak-boost">
              Dzień 7: 👑 <strong>Gwarantowany Gold Booster!</strong>
            </span>
          </div>

          <div className="v200-streak-track">
            {streakDaysList.map(s => (
              <div 
                key={s.day} 
                className={`v200-streak-step ${s.claimed ? "claimed" : ""} ${s.current ? "current" : ""} ${s.big ? "big-reward" : ""}`}
              >
                <div className="v200-streak-circle">
                  {s.claimed ? (
                    <CheckCircle2 size={15} className="text-green-400" />
                  ) : s.big ? (
                    <Crown size={15} className="text-yellow-400 animate-bounce" />
                  ) : (
                    <span>{s.day}</span>
                  )}
                </div>
                <span className="v200-streak-reward-label">{s.reward}</span>
              </div>
            ))}
          </div>

          {streakCount === 1 && !canSpin && (
            <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
              ✨ Dzień 1/7 zaliczony! Wracaj codziennie, by utrzymać serię aż do Gold Boostera!
            </p>
          )}
        </div>

        {/* ================= MEGA WHEEL STAGE ================= */}
        <div className="v200-wheel-stage mega-wheel">
          {/* Top Flapper Pointer */}
          <div className="v200-wheel-pointer mega-flapper">
            <div className="v200-pointer-gem" />
            <div className="v200-pointer-arrow" />
          </div>

          {/* Glowing Outer Wheel Rim */}
          <div className="v200-wheel-outer-rim mega-rim">
            <div 
              className="v200-wheel-disk"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning 
                  ? (isReducedMotion ? "transform 1s ease-out" : "transform 4.5s cubic-bezier(0.12, 0.95, 0.25, 1)") 
                  : "none"
              }}
            >
              {/* SVG Segments */}
              <svg viewBox="0 0 500 500" className="v200-wheel-svg">
                <defs>
                  <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ca8a04" />
                  </linearGradient>

                  <linearGradient id="grad-crimson" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>

                  <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>

                  <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>

                  <linearGradient id="grad-slate" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>

                  <linearGradient id="grad-inferno" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="50%" stopColor="#7f1d1d" />
                    <stop offset="100%" stopColor="#450a0a" />
                  </linearGradient>

                  <linearGradient id="grad-legend" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#581c87" />
                  </linearGradient>

                  <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>

                  <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
                  </filter>
                </defs>

                {/* Outer Wheel Background Ring */}
                <circle cx="250" cy="250" r="248" fill="#111827" stroke="#f59e0b" strokeWidth="4" />

                {/* Segments */}
                {WHEEL_SEGMENTS.map((seg, idx) => {
                  const startAngle = (idx * arcSize - 90) * (Math.PI / 180);
                  const endAngle = ((idx + 1) * arcSize - 90) * (Math.PI / 180);
                  const radius = 238;
                  const x1 = 250 + radius * Math.cos(startAngle);
                  const y1 = 250 + radius * Math.sin(startAngle);
                  const x2 = 250 + radius * Math.cos(endAngle);
                  const y2 = 250 + radius * Math.sin(endAngle);

                  const pathData = `M 250 250 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
                  const textAngle = idx * arcSize + arcSize / 2;

                  return (
                    <g key={seg.id}>
                      {/* Sector Slice */}
                      <path 
                        d={pathData} 
                        fill={`url(#${seg.gradientId})`}
                        stroke="#0f172a"
                        strokeWidth="3.5"
                      />

                      {/* Radial Content rotated to bisector */}
                      <g transform={`rotate(${textAngle}, 250, 250)`}>
                        <text
                          x="250"
                          y="62"
                          fontSize="24"
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
                        >
                          {seg.icon}
                        </text>

                        <text
                          x="250"
                          y="110"
                          fill={seg.textColor}
                          fontSize="15"
                          fontWeight="900"
                          letterSpacing="0.05em"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform="rotate(90, 250, 110)"
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                            textShadow: seg.textColor === "#ffffff" ? "0 2px 6px rgba(0,0,0,0.9)" : "0 1px 2px rgba(255,255,255,0.4)"
                          }}
                        >
                          {seg.shortName}
                        </text>

                        <line 
                          x1="250" 
                          y1="165" 
                          x2="250" 
                          y2="190" 
                          stroke="rgba(255,255,255,0.25)" 
                          strokeWidth="2" 
                          strokeDasharray="2,2" 
                        />
                      </g>
                    </g>
                  );
                })}

                {/* Perimeter Golden LED Bulbs */}
                {rimBulbs.map(b => (
                  <circle
                    key={b.id}
                    cx={b.x}
                    cy={b.y}
                    r={b.id % 2 === 0 ? "4" : "3"}
                    fill={b.id % 2 === 0 ? "#fef08a" : "#f59e0b"}
                    stroke="#78350f"
                    strokeWidth="1"
                    className="v200-wheel-led"
                  />
                ))}
              </svg>

              {/* Center Club Hub Button */}
              <button 
                type="button"
                onClick={handleSpin}
                disabled={spinning || !canSpin || secondsRemaining > 0}
                className={`v200-wheel-center-hub mega-hub ${!canSpin && !spinning ? "opacity-80" : ""}`}
                title={canSpin ? "Kliknij, aby zakręcić!" : `Kolejny spin za: ${formatCountdown(secondsRemaining)}`}
              >
                <div className="v200-hub-inner">
                  <img 
                    src="/teamlogos/gm.png" 
                    alt="DELTA" 
                    className="v200-hub-logo" 
                  />
                  <span className="v200-hub-spin-txt">
                    {spinning ? "..." : canSpin ? "SPIN" : "JUTRO"}
                  </span>
                </div>
                <div className="v200-hub-ring" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="v200-spin-action-row">
          {canSpin && secondsRemaining === 0 ? (
            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning}
              className={`v200-spin-launch-btn mega-launch-btn ${spinning ? "spinning" : ""}`}
            >
              {spinning ? (
                <>
                  <RotateCw size={22} className="animate-spin" />
                  <span>LOSOWANIE NAGRODY W TOKU...</span>
                </>
              ) : (
                <>
                  <Zap size={22} className="text-black fill-black" />
                  <span>ZAKRĘĆ KOŁEM (DARMOWY SPIN DNIA)</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full max-w-md">
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 font-extrabold text-sm flex items-center justify-center gap-3 cursor-not-allowed shadow-inner"
              >
                <Clock size={18} className="text-amber-400 animate-pulse" />
                <span>KOLEJNY SPIN ZA: <strong className="font-mono text-amber-400 text-base">{formatCountdown(secondsRemaining)}</strong></span>
              </button>
              <span className="text-[11px] text-slate-400 text-center font-medium">
                Wykorzystano darmowy spin na dzisiaj (Dzień {streakCount}/7). Wróć jutro, aby kontynuować serię!
              </span>
            </div>
          )}
        </div>

        {/* ================= WINNING PRIZE MODAL BANNER ================= */}
        {showWinCelebration && winningSegment && (
          <div className="v200-spin-win-modal animate-slamZoom">
            <div className="v200-win-glow" />
            <div className="v200-win-content">
              <div className="v200-win-icon-burst">{winningSegment.icon}</div>
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
                    <Sparkles size={18} /> OTWÓRZ TĘ PACZKĘ TERAZ!
                  </button>
                </div>
              ) : (
                <div className="v200-win-points-badge">
                  <Coins size={26} className="text-yellow-400" />
                  <span>+{winningSegment.amount} DP dodane do Twojego konta Delta!</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowWinCelebration(false)}
                className="v200-win-dismiss-btn"
              >
                Super, zbieram dalej!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
