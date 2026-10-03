"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  X, 
  Sparkles, 
  Gift, 
  Coins, 
  Crown, 
  Flame, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Zap, 
  Star, 
  ShieldAlert, 
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";

export interface SeasonPassReward {
  level: number;
  xpRequired: number;
  title: string;
  type: "points" | "pack" | "chest" | "cosmetic";
  amount?: number;
  packTypeId?: string;
  icon: string;
  isMilestone?: boolean;
}

export const SEASON_REWARDS: SeasonPassReward[] = [
  { level: 1, xpRequired: 100, title: "+50 Delta Points", type: "points", amount: 50, icon: "🪙" },
  { level: 2, xpRequired: 200, title: "Paczka Standardowa", type: "pack", packTypeId: "standard_pack", icon: "📦" },
  { level: 3, xpRequired: 300, title: "+75 Delta Points", type: "points", amount: 75, icon: "🪙" },
  { level: 4, xpRequired: 400, title: "Matchday Booster", type: "pack", packTypeId: "matchday_booster", icon: "⚡" },
  { level: 5, xpRequired: 500, title: "🥉 Brązowa Skrzynia Sezonu", type: "chest", amount: 120, icon: "🥉", isMilestone: true },
  { level: 6, xpRequired: 600, title: "+100 Delta Points", type: "points", amount: 100, icon: "💰" },
  { level: 7, xpRequired: 700, title: "👑 Gold Booster", type: "pack", packTypeId: "gold_booster", icon: "👑" },
  { level: 8, xpRequired: 800, title: "🌟 Ramka 'Pioneer 2026'", type: "cosmetic", icon: "🌟" },
  { level: 9, xpRequired: 900, title: "+150 Delta Points", type: "points", amount: 150, icon: "💰" },
  { level: 10, xpRequired: 1000, title: "🥈 Srebrna Skrzynia Mistrza", type: "chest", amount: 200, packTypeId: "matchday_booster", icon: "🥈", isMilestone: true },
  { level: 11, xpRequired: 1100, title: "+175 Delta Points", type: "points", amount: 175, icon: "🪙" },
  { level: 12, xpRequired: 1200, title: "📦 Podwójna Paczka Std", type: "pack", packTypeId: "standard_pack", icon: "📦" },
  { level: 13, xpRequired: 1300, title: "+200 Delta Points", type: "points", amount: 200, icon: "🔥" },
  { level: 14, xpRequired: 1400, title: "👑 Podwójny Gold Booster", type: "pack", packTypeId: "gold_booster", icon: "👑" },
  { level: 15, xpRequired: 1500, title: "🥇 Złota Skrzynia Elity", type: "chest", amount: 300, packTypeId: "gold_booster", icon: "🥇", isMilestone: true },
  { level: 16, xpRequired: 1600, title: "+250 Delta Points", type: "points", amount: 250, icon: "💰" },
  { level: 17, xpRequired: 1700, title: "🔥 Inferno Booster", type: "pack", packTypeId: "inferno_booster", icon: "🔥" },
  { level: 18, xpRequired: 1800, title: "👑 Tytuł 'Ikona Delty 2026'", type: "cosmetic", icon: "🏆" },
  { level: 19, xpRequired: 1900, title: "+350 Delta Points", type: "points", amount: 350, icon: "💎" },
  { level: 20, xpRequired: 2000, title: "👑 Legend Booster & Mega Skrzynia", type: "chest", amount: 500, packTypeId: "legend_booster", icon: "🌟", isMilestone: true }
];

const XP_SOURCES = [
  { activity: "Obecność na oficjalnym meczu", xp: "+60 XP", icon: "⚽" },
  { activity: "Obecność na treningu DELTA GM", xp: "+40 XP", icon: "🏃" },
  { activity: "Zaliczony quiz w Kąciku Wiedzy", xp: "+30 XP", icon: "🧠" },
  { activity: "Trafiony typ w Klubowym Typerze", xp: "+25 XP", icon: "🎯" },
  { activity: "Codzienny spin Koła Fortuny", xp: "+15 XP", icon: "🎡" },
  { activity: "Ukończenie cotygodniowej misji", xp: "+100 XP", icon: "📜" }
];

interface DeltaSeasonPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  userXp?: number;
  onRewardClaimed?: (claimedLevel: number) => void;
}

export default function DeltaSeasonPassModal({
  isOpen,
  onClose,
  userXp = 850,
  onRewardClaimed
}: DeltaSeasonPassModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentXp, setCurrentXp] = useState(userXp);
  const [claimedLevels, setClaimedLevels] = useState<number[]>([]);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [activeTab, setActiveTab] = useState<"pass" | "how_to_earn">("pass");

  useEffect(() => {
    setMounted(true);
    // Load claimed levels from localStorage if available
    try {
      const saved = localStorage.getItem("delta_season_pass_claimed");
      if (saved) {
        setClaimedLevels(JSON.parse(saved));
      } else {
        // default starter claims for demo
        setClaimedLevels([1, 2]);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Calculate current user level
  const currentLevel = useMemo(() => {
    let lvl = 0;
    for (const r of SEASON_REWARDS) {
      if (currentXp >= r.xpRequired) {
        lvl = r.level;
      } else {
        break;
      }
    }
    return lvl;
  }, [currentXp]);

  // Next level progress
  const nextLevelReward = SEASON_REWARDS.find(r => r.level === currentLevel + 1) || SEASON_REWARDS[SEASON_REWARDS.length - 1];
  const prevLevelXp = currentLevel > 0 ? (SEASON_REWARDS.find(r => r.level === currentLevel)?.xpRequired || 0) : 0;
  const xpInCurrentLevel = currentXp - prevLevelXp;
  const xpNeededForNext = nextLevelReward.xpRequired - prevLevelXp;
  const levelProgressPct = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / (xpNeededForNext || 100)) * 100)));

  // Claim single reward
  const handleClaim = async (level: number) => {
    if (claimedLevels.includes(level) || currentLevel < level || claimingLevel !== null) return;

    setClaimingLevel(level);
    cardSound.playWalkoutFanfare();
    setCelebrating(true);

    try {
      const updated = [...claimedLevels, level];
      setClaimedLevels(updated);
      localStorage.setItem("delta_season_pass_claimed", JSON.stringify(updated));

      // API call to persist reward
      await fetch("/api/season-pass/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level })
      }).catch(() => {});

      if (onRewardClaimed) onRewardClaimed(level);
    } catch (e) {
      console.error("Error claiming reward:", e);
    } finally {
      setTimeout(() => {
        setClaimingLevel(null);
        setCelebrating(false);
      }, 2000);
    }
  };

  // Claim all unlocked
  const handleClaimAll = async () => {
    const unclaimed = SEASON_REWARDS.filter(r => r.level <= currentLevel && !claimedLevels.includes(r.level));
    if (unclaimed.length === 0) return;

    cardSound.playWalkoutFanfare();
    setCelebrating(true);

    const updated = [...claimedLevels, ...unclaimed.map(u => u.level)];
    setClaimedLevels(updated);
    localStorage.setItem("delta_season_pass_claimed", JSON.stringify(updated));

    for (const u of unclaimed) {
      await fetch("/api/season-pass/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: u.level })
      }).catch(() => {});
      if (onRewardClaimed) onRewardClaimed(u.level);
    }

    setTimeout(() => {
      setCelebrating(false);
    }, 2500);
  };

  const unclaimedCount = SEASON_REWARDS.filter(r => r.level <= currentLevel && !claimedLevels.includes(r.level)).length;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="v200-modal-overlay animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {celebrating && <CanvasParticles theme="gold" active={true} />}

      <div className="v200-season-pass-modal animate-scaleUp">
        {/* Top Header Banner */}
        <div className="v200-sp-header-banner">
          <div className="v200-sp-badge-row">
            <div className="v200-sp-season-tag">
              <Flame size={14} className="text-red-500 animate-pulse" />
              <span>SEZON 1: JESIEŃ 2026 • MŁODE WILKI</span>
            </div>
            <div className="v200-sp-days-left">
              <Calendar size={13} className="text-yellow-400 inline mr-1" />
              <span>Pozostało: <strong>42 dni</strong></span>
            </div>
          </div>

          <div className="v200-sp-title-row">
            <div>
              <h2 className="v200-sp-title">
                DELTA <span className="v200-gold-text">BATTLE PASS</span>
              </h2>
              <p className="v200-sp-subtitle">
                Zdobywaj punkty doświadczenia (XP) za mecze, treningi i quizy. Odblokowuj skrzynie, paczki i elitarne nagrody klubowe!
              </p>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="v200-sp-close-btn"
              aria-label="Zamknij"
            >
              <X size={22} />
            </button>
          </div>

          {/* Player Level & XP Gauge Bar */}
          <div className="v200-sp-level-gauge-card">
            <div className="v200-sp-lvl-avatar">
              <Crown size={22} className="text-yellow-400 animate-bounce" />
              <div className="v200-sp-lvl-num">POZIOM {currentLevel}</div>
            </div>

            <div className="v200-sp-gauge-center">
              <div className="v200-sp-gauge-text-row">
                <span>POSTĘP DO POZIOMU {currentLevel + 1} ({nextLevelReward.title})</span>
                <strong>{xpInCurrentLevel} / {xpNeededForNext} XP ({levelProgressPct}%)</strong>
              </div>
              <div className="v200-sp-gauge-track">
                <div 
                  className="v200-sp-gauge-fill" 
                  style={{ width: `${levelProgressPct}%` }} 
                />
              </div>
              <div className="v200-sp-total-xp">
                <Zap size={12} className="text-yellow-400 inline mr-1" />
                <span>Łącznie w sezonie: <strong>{currentXp} XP</strong></span>
              </div>
            </div>

            {unclaimedCount > 0 && (
              <button
                type="button"
                onClick={handleClaimAll}
                className="v200-sp-claim-all-btn animate-pulse"
              >
                <Sparkles size={16} />
                <span>ODBIERZ WSZYSTKO ({unclaimedCount})</span>
              </button>
            )}
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="v200-sp-tabs-row">
            <button
              type="button"
              onClick={() => setActiveTab("pass")}
              className={`v200-sp-tab-btn ${activeTab === "pass" ? "active" : ""}`}
            >
              <Trophy size={16} />
              <span>ŚCIEŻKA NAGRÓD (POZIOMY 1–20)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("how_to_earn")}
              className={`v200-sp-tab-btn ${activeTab === "how_to_earn" ? "active" : ""}`}
            >
              <Zap size={16} />
              <span>JAK ZDOBYWAĆ XP?</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="v200-sp-modal-body custom-scrollbar">
          {activeTab === "pass" ? (
            /* ================= REWARDS TRACK ROADMAP ================= */
            <div className="v200-sp-track-container">
              <div className="v200-sp-track-grid">
                {SEASON_REWARDS.map((reward) => {
                  const isUnlocked = currentLevel >= reward.level;
                  const isClaimed = claimedLevels.includes(reward.level);
                  const isReadyToClaim = isUnlocked && !isClaimed;
                  const isCurrent = currentLevel + 1 === reward.level;

                  return (
                    <div 
                      key={reward.level} 
                      className={`v200-sp-reward-card ${isClaimed ? "claimed" : ""} ${isReadyToClaim ? "ready" : ""} ${!isUnlocked ? "locked" : ""} ${reward.isMilestone ? "milestone" : ""} ${isCurrent ? "next-target" : ""}`}
                    >
                      {/* Top Level Pill */}
                      <div className="v200-sp-node-top">
                        <span className="v200-sp-node-lvl">LVL {reward.level}</span>
                        {reward.isMilestone && (
                          <span className="v200-sp-milestone-tag">👑 MILESTONE</span>
                        )}
                        <span className="v200-sp-node-xp">{reward.xpRequired} XP</span>
                      </div>

                      {/* Reward Icon & Visual */}
                      <div className="v200-sp-icon-wrap">
                        <div className="v200-sp-icon-circle">
                          <span className="v200-sp-big-emoji">{reward.icon}</span>
                        </div>
                        {isClaimed && (
                          <div className="v200-sp-claimed-stamp">
                            <CheckCircle2 size={18} className="text-green-400" />
                          </div>
                        )}
                        {!isUnlocked && (
                          <div className="v200-sp-lock-overlay">
                            <Lock size={16} className="text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Reward Metadata */}
                      <div className="v200-sp-reward-info">
                        <h4 className="v200-sp-reward-title">{reward.title}</h4>
                        <span className="v200-sp-reward-type">
                          {reward.type === "points" ? `+${reward.amount} Delta Points` : reward.type === "chest" ? "Skrzynia z nagrodami" : reward.type === "pack" ? "Paczka kart piłkarskich" : "Unikalna personalizacja"}
                        </span>
                      </div>

                      {/* Action Button */}
                      <div className="v200-sp-node-action">
                        {isClaimed ? (
                          <span className="v200-sp-status-txt claimed">
                            <CheckCircle2 size={14} className="inline mr-1" /> ODEBRANE
                          </span>
                        ) : isReadyToClaim ? (
                          <button
                            type="button"
                            onClick={() => handleClaim(reward.level)}
                            disabled={claimingLevel === reward.level}
                            className="v200-sp-claim-single-btn"
                          >
                            <Sparkles size={14} />
                            <span>{claimingLevel === reward.level ? "ODBIERAM..." : "ODBIERZ"}</span>
                          </button>
                        ) : (
                          <span className="v200-sp-status-txt locked">
                            <Lock size={12} className="inline mr-1" /> Wymaga {reward.xpRequired} XP
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ================= HOW TO EARN XP GUIDE ================= */
            <div className="v200-sp-earn-guide animate-fadeIn">
              <div className="v200-sp-guide-header">
                <Zap size={22} className="text-yellow-400" />
                <div>
                  <h3>ZASADY ZDOBYWANIA XP W SEZONIE 1</h3>
                  <p>Bądź aktywnym zawodnikiem i kibicem DELTY – każdy trening i mecz przybliża Cię do kolejnych poziomów!</p>
                </div>
              </div>

              <div className="v200-sp-xp-sources-grid">
                {XP_SOURCES.map((src, idx) => (
                  <div key={idx} className="v200-sp-xp-source-card">
                    <div className="v200-sp-src-icon">{src.icon}</div>
                    <div className="v200-sp-src-content">
                      <span className="v200-sp-src-title">{src.activity}</span>
                      <span className="v200-sp-src-hint">Automatycznie naliczane po zakończeniu wydarzenia</span>
                    </div>
                    <div className="v200-sp-src-val">{src.xp}</div>
                  </div>
                ))}
              </div>

              <div className="v200-sp-guide-tip-box">
                <Crown size={20} className="text-yellow-400 flex-shrink-0" />
                <div>
                  <strong>Wskazówka Mistrza:</strong>
                  <p>Najszybciej punkty XP zdobędziesz łącząc 100% frekwencję na treningach z rozwiązywaniem cotygodniowych quizów w Kąciku Wiedzy!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
