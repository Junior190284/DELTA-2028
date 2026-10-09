"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Award, Sparkles, X, ChevronRight, Flame } from "lucide-react";

export type CelebrationTier = 1 | 2 | 3 | 4;

export interface AchievementUnlockToastData {
  id: string;
  title: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "diamond" | "inferno";
  rewardDp: number;
  rewardPackType?: string | null;
  iconName?: string;
  celebrationTier?: CelebrationTier;
}

interface AchievementUnlockToastProps {
  achievement: AchievementUnlockToastData | null;
  onDismiss: () => void;
  onViewDetails?: (achievement: AchievementUnlockToastData) => void;
  onClaim?: (achievement: AchievementUnlockToastData) => void;
  autoDismissMs?: number;
}

export default function AchievementUnlockToast({
  achievement,
  onDismiss,
  onViewDetails,
  onClaim,
  autoDismissMs = 6000
}: AchievementUnlockToastProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!achievement) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setProgress(100);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoDismissMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setVisible(false);
        setTimeout(onDismiss, 300);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [achievement, autoDismissMs, onDismiss]);

  if (!achievement || !visible) return null;

  const isInferno = achievement.tier === "inferno" || achievement.tier === "diamond";
  const isGold = achievement.tier === "gold";
  const isSilver = achievement.tier === "silver";

  let badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
  let borderColor = "border-amber-500/40";
  let bgGradient = "from-slate-900 via-slate-850 to-slate-900";
  let accentIcon = <Trophy className="text-yellow-400" size={20} />;

  if (isInferno) {
    badgeColor = "bg-red-500/20 text-red-300 border-red-500/40";
    borderColor = "border-red-500/50";
    bgGradient = "from-slate-950 via-red-950/40 to-slate-950";
    accentIcon = <Flame className="text-red-500" size={20} />;
  } else if (isSilver) {
    badgeColor = "bg-slate-300/20 text-slate-200 border-slate-300/40";
    borderColor = "border-slate-500/40";
    accentIcon = <Award className="text-slate-300" size={20} />;
  }

  return (
    <aside
      className="fixed bottom-6 right-6 z-[99999] max-w-sm w-[calc(100vw-3rem)] pointer-events-auto"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} border ${borderColor} p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5`}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              {accentIcon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                  {achievement.tier.toUpperCase()} ODZNAKA
                </span>
                <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles size={11} /> ODBLOKOWANO!
                </span>
              </div>
              <h4 className="text-sm font-black text-white mt-0.5 leading-tight">
                {achievement.title}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 200);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
            aria-label="Zamknij powiadomienie"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">
          {achievement.description}
        </p>

        {/* Reward + Action CTA */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800">
          <div className="text-xs font-black text-amber-300 flex items-center gap-1">
            <span>+{achievement.rewardDp} DP</span>
            {achievement.rewardPackType && (
              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                +Paczka
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(achievement)}
                className="text-xs text-slate-300 hover:text-white font-bold px-2 py-1 rounded hover:bg-slate-800 transition-colors"
              >
                Zobacz 3D
              </button>
            )}

            {onClaim && (
              <button
                type="button"
                onClick={() => onClaim(achievement)}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-lg flex items-center gap-1 transition-colors uppercase tracking-wider"
              >
                <span>Odbierz</span>
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (Auto Dismiss Countdown) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
          <div
            className={`h-full ${isInferno ? "bg-red-500" : "bg-amber-400"} transition-all duration-75`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
