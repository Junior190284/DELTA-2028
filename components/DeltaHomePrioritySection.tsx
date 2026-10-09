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
  unreadCount?: number;
  dailySpinAvailable?: boolean;
}

export default function DeltaHomePrioritySection({
  priorityData,
  onNavigate,
  unreadCount = 0,
  dailySpinAvailable = true
}: DeltaHomePrioritySectionProps) {
  const { primaryAction, secondaryActions } = priorityData;

  // Find if there is a critical operational emergency or match attendance declaration
  const isCriticalAlert = primaryAction?.tier === 'CRITICAL_ALERT';
  const isAttendanceReq = primaryAction?.tier === 'MATCH_ATTENDANCE';
  const isLineupCallup = primaryAction?.tier === 'LINEUP_CALLUP';
  const isScheduleChange = primaryAction?.tier === 'SCHEDULE_CHANGE';
  const isAdminAlert = primaryAction?.tier === 'ADMIN_ALERT';

  const hasUrgentBanner = isCriticalAlert || isAttendanceReq || isLineupCallup || isScheduleChange || isAdminAlert;

  // Extract unread message & spin info from actions or fallback props
  const unreadAction =
    (primaryAction?.tier === 'UNREAD_MESSAGES' ? primaryAction : null) ||
    secondaryActions.find((a) => a.tier === 'UNREAD_MESSAGES');

  const spinAction =
    (primaryAction?.tier === 'GAMIFICATION' ? primaryAction : null) ||
    secondaryActions.find((a) => a.tier === 'GAMIFICATION');

  const unreadLabel = unreadAction?.headline || (unreadCount > 0 ? `${unreadCount} nowych wiadomości` : 'Powiadomienia');
  const spinLabel = spinAction?.headline || (dailySpinAvailable ? 'Koło fortuny • zakręć' : 'Koło fortuny • użyte dzisiaj');
  const isSpinReady = dailySpinAvailable || spinAction?.headline.includes('zakręć');

  return (
    <section
      className="v200-home-priority-section w-full mb-3.5 animate-fadeIn"
      role="region"
      aria-label="Najważniejsze teraz"
    >
      {/* 1. URGENT / ACTIONABLE BANNER (Only when critical event or required attendance declaration exists) */}
      {hasUrgentBanner && primaryAction && (
        <div
          className={`relative overflow-hidden rounded-xl border mb-2.5 p-3 sm:p-3.5 shadow-lg transition-all ${
            isCriticalAlert
              ? 'bg-gradient-to-r from-red-950/90 via-slate-900/95 to-red-950/80 border-red-500/50 shadow-red-950/30'
              : isAttendanceReq
              ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-slate-950/90 border-amber-500/40 shadow-amber-950/20'
              : 'bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 border-white/15 shadow-black/40'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  isCriticalAlert
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}
              >
                {isCriticalAlert ? (
                  <Flame className="w-4 h-4 text-red-400 animate-pulse" />
                ) : isAttendanceReq ? (
                  <UserCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                      isCriticalAlert
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    }`}
                  >
                    {primaryAction.badgeText || 'PILNE'}
                  </span>
                  <h4 className="text-white font-black text-xs sm:text-sm truncate m-0">
                    {primaryAction.headline}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-300 truncate m-0 mt-0.5">
                  {primaryAction.subtext}
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm flex items-center gap-1.5 ${
                isCriticalAlert
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              }`}
              onClick={() => onNavigate(primaryAction.targetTab, primaryAction.targetPayload)}
            >
              <span>{primaryAction.ctaLabel}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 2. COMPACT INFERNO COMMUNICATION STRIP (Replacing old white cards) */}
      <div
        className="v200-home-comm-strip w-full p-2 sm:p-2.5 rounded-xl border border-[#d4af37]/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 gap-2"
        style={{ background: 'rgba(8, 10, 14, 0.92)' }}
      >
        {/* Tile 1: Wiadomości / Powiadomienia */}
        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className="min-w-0 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-amber-400/30 transition-all flex items-center justify-between gap-2 text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-[#080a0e] animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                {unreadLabel}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {unreadCount > 0 ? 'Centrum wiadomości i alerty' : 'Brak nowych komunikatów'}
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-500 group-hover:text-amber-400 shrink-0 transition-colors" />
        </button>

        {/* Tile 2: Koło Fortuny (Daily Spin) */}
        <button
          type="button"
          onClick={() => onNavigate('collection', { openSpin: true })}
          className="min-w-0 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-amber-400/30 transition-all flex items-center justify-between gap-2 text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-red-600/15 border border-red-500/30 flex items-center justify-center shrink-0 text-amber-400 text-sm">
              🎡
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                {spinLabel}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                {isSpinReady ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Darmowy spin dostępny
                  </span>
                ) : (
                  <span className="text-slate-500">Użyte dzisiaj • wróć jutro</span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-500 group-hover:text-amber-400 shrink-0 transition-colors" />
        </button>
      </div>
    </section>
  );
}
