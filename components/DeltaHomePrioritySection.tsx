'use client';

import React from 'react';
import {
  Flame,
  UserCheck,
  AlertTriangle,
  Bell,
  Sparkles,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import type { PriorityEngineOutput } from '@/lib/home/priority-engine';

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
  const { primaryAction } = priorityData;

  // Find if there is a critical operational emergency or match attendance declaration
  const isCriticalAlert = primaryAction?.tier === 'CRITICAL_ALERT';
  const isAttendanceReq = primaryAction?.tier === 'MATCH_ATTENDANCE';
  const hasUrgentBanner = isCriticalAlert || isAttendanceReq;

  // Clean single-line copy
  const unreadText =
    unreadCount > 0
      ? unreadCount === 1
        ? '1 nowa wiadomość'
        : `${unreadCount} nowych wiadomości`
      : 'Brak nowych wiadomości';

  const spinText = dailySpinAvailable ? 'Koło fortuny • zakręć' : 'Koło fortuny • użyte dzisiaj';

  return (
    <section
      className="v200-home-priority-section w-full mb-3 animate-fadeIn"
      role="region"
      aria-label="Centrum Komunikacji"
      style={{ boxSizing: 'border-box' }}
    >
      {/* 1. URGENT / ACTIONABLE BANNER (Only for critical cancellation or missing match attendance) */}
      {hasUrgentBanner && primaryAction && (
        <div
          className="relative overflow-hidden rounded-xl border mb-2 px-3 py-2.5 shadow-lg flex items-center justify-between gap-2.5"
          style={{
            background: isCriticalAlert
              ? 'linear-gradient(90deg, rgba(60,10,15,0.95), rgba(20,10,12,0.95))'
              : 'linear-gradient(90deg, rgba(50,30,10,0.95), rgba(20,15,10,0.95))',
            borderColor: isCriticalAlert ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)',
            boxShadow: isCriticalAlert
              ? '0 0 16px rgba(220,38,38,0.25)'
              : '0 0 16px rgba(217,119,6,0.20)',
            color: '#f5f5f5'
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                background: isCriticalAlert ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                borderColor: isCriticalAlert ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)',
                color: isCriticalAlert ? '#ef4444' : '#f59e0b'
              }}
            >
              {isCriticalAlert ? (
                <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0"
                  style={{
                    background: isCriticalAlert ? '#dc2626' : '#d97706',
                    color: '#ffffff',
                    borderColor: isCriticalAlert ? '#ef4444' : '#f59e0b'
                  }}
                >
                  {primaryAction.badgeText || 'PILNE'}
                </span>
                <span className="text-white font-bold text-xs truncate" style={{ color: '#ffffff' }}>
                  {primaryAction.headline}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              background: isCriticalAlert ? '#dc2626' : '#d97706',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => onNavigate(primaryAction.targetTab, primaryAction.targetPayload)}
          >
            <span>{primaryAction.ctaLabel}</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* 2. ONE SHARED INFERNO COMMUNICATION STRIP (Single compact container, height 52-58px) */}
      <div
        className="v200-home-comm-strip w-full flex items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, rgba(10,12,16,0.96), rgba(18,12,12,0.94))',
          border: '1px solid rgba(212,175,55,0.22)',
          boxShadow: '0 0 18px rgba(180,20,20,0.10)',
          borderRadius: '14px',
          minHeight: '50px',
          maxHeight: '58px',
          height: '52px',
          padding: '0 12px',
          boxSizing: 'border-box',
          color: '#f5f5f5',
          overflow: 'hidden'
        }}
      >
        {/* Left Action: Powiadomienia */}
        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className="flex-1 min-w-0 flex items-center justify-start gap-2 text-left group transition-opacity hover:opacity-90 active:opacity-75"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '8px 4px',
            margin: 0,
            cursor: 'pointer',
            color: '#f5f5f5',
            boxSizing: 'border-box'
          }}
          aria-label="Centrum Powiadomień"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <Bell size={16} color="#d6b04c" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: '#ef4444',
                  boxShadow: '0 0 6px #ef4444'
                }}
              />
            )}
          </div>
          <span
            className="text-xs font-bold truncate"
            style={{
              color: unreadCount > 0 ? '#ffffff' : 'rgba(255,255,255,0.75)',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {unreadText}
          </span>
          <ChevronRight size={13} color="rgba(255,255,255,0.35)" className="shrink-0 ml-auto hidden sm:block" />
        </button>

        {/* Center Subtle Divider */}
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255,255,255,0.10)',
            margin: '0 8px',
            flexShrink: 0
          }}
          aria-hidden="true"
        />

        {/* Right Action: Koło Fortuny (Daily Spin) */}
        <button
          type="button"
          onClick={() => onNavigate('collection', { openSpin: true })}
          className="flex-1 min-w-0 flex items-center justify-start gap-2 text-left group transition-opacity hover:opacity-90 active:opacity-75"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '8px 4px',
            margin: 0,
            cursor: 'pointer',
            color: '#f5f5f5',
            boxSizing: 'border-box'
          }}
          aria-label="Koło Fortuny"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <Sparkles size={16} color={dailySpinAvailable ? '#d6b04c' : 'rgba(255,255,255,0.45)'} />
            {dailySpinAvailable && (
              <span
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping"
                style={{
                  background: '#d6b04c',
                  boxShadow: '0 0 6px #d6b04c'
                }}
              />
            )}
          </div>
          <span
            className="text-xs font-bold truncate"
            style={{
              color: dailySpinAvailable ? '#ffffff' : 'rgba(255,255,255,0.65)',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {spinText}
          </span>
          <ChevronRight size={13} color="rgba(255,255,255,0.35)" className="shrink-0 ml-auto hidden sm:block" />
        </button>
      </div>
    </section>
  );
}
