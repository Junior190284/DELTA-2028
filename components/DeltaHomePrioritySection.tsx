'use client';

import React from 'react';
import {
  Flame,
  AlertTriangle,
  CalendarDays,
  UserCheck,
  Zap,
  Bell,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Gift
} from 'lucide-react';
import type { HomePriorityAction, PriorityEngineOutput } from '@/lib/home/priority-engine';

interface DeltaHomePrioritySectionProps {
  priorityData: PriorityEngineOutput;
  onNavigate: (tab: string, payload?: any) => void;
}

export default function DeltaHomePrioritySection({
  priorityData,
  onNavigate
}: DeltaHomePrioritySectionProps) {
  const { primaryAction, secondaryActions } = priorityData;

  if (!primaryAction) {
    return null;
  }

  const renderTierIcon = (action: HomePriorityAction) => {
    switch (action.tier) {
      case 'CRITICAL_ALERT':
        return <Flame className="w-5 h-5 text-red-400 animate-pulse" />;
      case 'MATCH_ATTENDANCE':
        return <UserCheck className="w-5 h-5 text-amber-400" />;
      case 'LINEUP_CALLUP':
        return <CalendarDays className="w-5 h-5 text-yellow-400" />;
      case 'MATCH_SOON':
        return <CalendarDays className="w-5 h-5 text-emerald-400" />;
      case 'TRAINING_SOON':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'SCHEDULE_CHANGE':
        return <CalendarDays className="w-5 h-5 text-amber-400" />;
      case 'ADMIN_ALERT':
        return <ShieldAlert className="w-5 h-5 text-orange-400" />;
      case 'GAMIFICATION':
        return <Gift className="w-5 h-5 text-purple-400" />;
      case 'UNREAD_MESSAGES':
      default:
        return <Bell className="w-5 h-5 text-amber-400" />;
    }
  };

  const isCritical = primaryAction.importance === 'CRITICAL';
  const isImportant = primaryAction.importance === 'IMPORTANT';

  return (
    <section
      className="v200-home-priority-section w-full mb-4 animate-fadeIn"
      role="region"
      aria-label="Najważniejsze teraz"
    >
      {/* Primary Action Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all p-4 sm:p-5 shadow-xl ${
          isCritical
            ? 'bg-gradient-to-r from-red-950/90 via-slate-900/95 to-red-950/80 border-red-500/50 shadow-red-950/30'
            : isImportant
            ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-slate-950/90 border-amber-500/40 shadow-amber-950/20'
            : 'bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 border-white/15 shadow-black/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                isCritical
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : isImportant
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/80 border-white/10 text-white'
              }`}
            >
              {renderTierIcon(primaryAction)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isCritical
                      ? 'bg-red-600 text-white border-red-500'
                      : isImportant
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  {primaryAction.badgeText || 'NAJWAŻNIEJSZE TERAZ'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  PRIORYTET AKCJI
                </span>
              </div>

              <h3 className="text-white font-black text-sm sm:text-base leading-snug m-0">
                {primaryAction.headline}
              </h3>

              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed m-0">
                {primaryAction.subtext}
              </p>
            </div>
          </div>

          <div className="self-start sm:self-center shrink-0">
            <button
              type="button"
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 ${
                isCritical
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : isImportant
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 font-black'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/15'
              }`}
              onClick={() => onNavigate(primaryAction.targetTab, primaryAction.targetPayload)}
            >
              <span>{primaryAction.ctaLabel}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Secondary Actions Mini Bar */}
        {secondaryActions.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Pozostałe sprawy:
            </span>
            {secondaryActions.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                onClick={() => onNavigate(sec.targetTab, sec.targetPayload)}
              >
                <span>{sec.badgeText ? `[${sec.badgeText}]` : '•'}</span>
                <span className="truncate max-w-[200px]">{sec.headline}</span>
                <ChevronRight size={12} className="text-amber-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
