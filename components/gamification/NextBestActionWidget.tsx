"use client";

import React from "react";
import { Sparkles, Gift, Flame, HelpCircle, Trophy, ArrowRight, CheckCircle2 } from "lucide-react";
import { determineNextBestAction, UserGamificationState, NextBestActionData } from "@/lib/gamification/engine";

export type { UserGamificationState, NextBestActionData };

interface NextBestActionWidgetProps {
  userState: UserGamificationState;
  onActionClick?: (actionType: string) => void;
  className?: string;
}

const ICON_MAP = {
  Gift: <Gift className="text-amber-400" size={20} />,
  Flame: <Flame className="text-red-400" size={20} />,
  Trophy: <Trophy className="text-yellow-400" size={20} />,
  HelpCircle: <HelpCircle className="text-blue-400" size={20} />,
  CheckCircle2: <CheckCircle2 className="text-emerald-400" size={20} />
};

export default function NextBestActionWidget({
  userState,
  onActionClick,
  className = ""
}: NextBestActionWidgetProps) {
  const action = determineNextBestAction(userState);
  const icon = ICON_MAP[action.iconName] || <Sparkles className="text-amber-400" size={20} />;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/70 p-4 sm:p-5 shadow-xl transition-all duration-300 hover:border-amber-500/40 ${className}`}
      role="region"
      aria-label="Rekomendowane zadanie gracza"
    >
      {/* Background Subtle Accent Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-inner shrink-0 mt-0.5 sm:mt-0">
            {icon}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${action.badgeColor}`}>
                {action.badgeText}
              </span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" /> Co możesz zrobić teraz:
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
              {action.title}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {action.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onActionClick?.(action.actionType)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-amber-500/20 active:scale-95 shrink-0 self-stretch sm:self-auto cursor-pointer"
        >
          <span>{action.ctaText}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
