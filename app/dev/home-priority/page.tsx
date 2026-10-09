'use client';

import React, { useState, useMemo } from 'react';
import DeltaHomePrioritySection from '@/components/DeltaHomePrioritySection';
import {
  computeHomePriorities,
  type PriorityEngineInput,
  type PriorityEngineOutput
} from '@/lib/home/priority-engine';
import {
  Flame,
  UserCheck,
  CalendarDays,
  Zap,
  Bell,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Gift
} from 'lucide-react';
import type { DeltaSystemEvent } from '@/lib/events/types';

const NOW_DATE = new Date('2026-10-09T18:00:00.000Z');

const MOCK_SCENARIOS: Record<string, { label: string; input: PriorityEngineInput }> = {
  calm: {
    label: '1. Brak ważnych akcji (Calm State)',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['p1'] },
      events: [],
      nextMatch: null,
      nextTraining: null,
      unreadMessagesCount: 0,
      unopenedPacksCount: 0,
      dailySpinAvailable: false,
      nowDate: NOW_DATE
    }
  },
  unreadOnly: {
    label: '2. Unread Messages Only (Secondary)',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['p1'] },
      events: [],
      nextMatch: null,
      nextTraining: null,
      unreadMessagesCount: 4,
      nowDate: NOW_DATE
    }
  },
  nextTraining: {
    label: '3. Next Training (Tomorrow 17:30)',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['p1'] },
      events: [],
      nextTraining: {
        id: 'train-1',
        training_date: '2026-10-10',
        start_time: '17:30:00',
        location: 'Boisko B, ul. Jeziorna 2',
        title: 'Trening motoryczny + gierka'
      },
      unreadMessagesCount: 1,
      nowDate: NOW_DATE
    }
  },
  attendanceMissing: {
    label: '4. Attendance Declaration Missing',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['player-123'] },
      parentPlayerIds: ['player-123'],
      nextMatch: {
        id: 'match-101',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'Alfa Przymierze Rodzin',
        match_date: '2026-10-11',
        match_time: '10:00:00',
        venue: 'ul. Jeziorna 2'
      },
      attendanceDeclarations: [], // No declaration for player-123
      unreadMessagesCount: 2,
      nowDate: NOW_DATE
    }
  },
  lineupPublished: {
    label: '5. Lineup / Powołania Published',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['player-123'] },
      nextMatch: {
        id: 'match-101',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'Alfa Przymierze Rodzin',
        match_date: '2026-10-11',
        match_time: '10:00:00',
        venue: 'ul. Jeziorna 2'
      },
      hasLineupPublished: true,
      events: [
        {
          id: 'lineup-ev-1',
          type: 'LINEUP_PUBLISHED',
          title: 'Kadra meczowa na Alfa Przymierze Rodzin',
          message: 'Powołano 12 zawodników.',
          source: 'DELTA_SYSTEM',
          importance: 'IMPORTANT',
          related_entity_id: 'match-101',
          created_at: '2026-10-09T17:00:00.000Z',
          is_read: false
        }
      ],
      nowDate: NOW_DATE
    }
  },
  matchUpdated: {
    label: '6. Important MATCH_UPDATED',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['player-123'] },
      events: [
        {
          id: 'match-up-1',
          type: 'MATCH_UPDATED',
          title: 'Przesunięcie godziny meczu ligowego',
          message: 'Mecz rozpocznie się o 13:00 zamiast 10:00.',
          source: 'DELTA_SYSTEM',
          importance: 'URGENT',
          created_at: '2026-10-09T17:30:00.000Z',
          is_read: false
        }
      ],
      nowDate: NOW_DATE
    }
  },
  matchCancelled: {
    label: '7. MATCH_CANCELLED (Top Tier Priority)',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['player-123'] },
      events: [
        {
          id: 'match-canc-1',
          type: 'MATCH_CANCELLED',
          title: 'Mecz ligowy z KS Raszyn ODWOŁANY',
          message: 'Mecz odwołany z powodu złego stanu boiska rywala.',
          source: 'DELTA_SYSTEM',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:45:00.000Z',
          is_read: false
        }
      ],
      unreadMessagesCount: 5,
      unopenedPacksCount: 3,
      dailySpinAvailable: true,
      nowDate: NOW_DATE
    }
  },
  criticalSystemMessage: {
    label: '8. Critical System Message',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['player-123'] },
      events: [
        {
          id: 'sys-crit-1',
          type: 'SYSTEM_MESSAGE',
          title: 'PILNE: Zmiana miejsca zbiórki na obóz jesienny',
          message: 'Zbiórka przeniesiona na parking główny stadionu.',
          source: 'DELTA_ADMIN',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:50:00.000Z',
          is_read: false
        }
      ],
      nowDate: NOW_DATE
    }
  },
  multipleCompeting: {
    label: '9. Multiple Competing Priorities',
    input: {
      user: { userId: 'parent_1', role: 'parent', playerIds: ['player-123'] },
      parentPlayerIds: ['player-123'],
      events: [
        {
          id: 'crit-alert-1',
          type: 'MATCH_CANCELLED',
          title: 'Mecz sparingowy w niedzielę odwołany',
          message: 'Trener wyznaczył dodatkowy trening w zamian.',
          source: 'DELTA_SYSTEM',
          importance: 'CRITICAL',
          created_at: '2026-10-09T17:55:00.000Z',
          is_read: false
        }
      ],
      nextMatch: {
        id: 'match-2',
        home_team: 'K.S. Delta Warszawa GM',
        away_team: 'FC Vizja Warszawa',
        match_date: '2026-10-15',
        match_time: '11:00:00'
      },
      nextTraining: {
        id: 'tr-2',
        training_date: '2026-10-10',
        start_time: '17:00:00'
      },
      unreadMessagesCount: 6,
      unopenedPacksCount: 2,
      dailySpinAvailable: true,
      nowDate: NOW_DATE
    }
  },
  adminSyncError: {
    label: '10. Admin SYNC_ERROR (Staff View)',
    input: {
      user: { userId: 'coach_1', role: 'coach' },
      events: [
        {
          id: 'sync-err-1',
          type: 'SYNC_ERROR',
          title: 'Błąd synchronizacji DELTA Sync (HTTP 502)',
          message: 'Serwer klubowy nie odpowiada na zapytania parsera.',
          source: 'DELTA_SYNC',
          importance: 'HIGH',
          audience_type: 'ADMIN',
          created_at: '2026-10-09T17:40:00.000Z',
          is_read: false
        }
      ],
      nowDate: NOW_DATE
    }
  },
  gamificationOnly: {
    label: '11. Gamification Only (Unopened Packs + Spin)',
    input: {
      user: { userId: 'parent_1', role: 'parent' },
      events: [],
      nextMatch: null,
      nextTraining: null,
      unreadMessagesCount: 0,
      unopenedPacksCount: 3,
      dailySpinAvailable: true,
      nowDate: NOW_DATE
    }
  }
};

export default function DevHomePriorityPage() {
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('attendanceMissing');
  const [viewportWidth, setViewportWidth] = useState<'desktop' | '320' | '375' | '390' | '430'>('desktop');
  const [lastActionTriggered, setLastActionTriggered] = useState<string | null>(null);

  const scenario = MOCK_SCENARIOS[activeScenarioKey] || MOCK_SCENARIOS.attendanceMissing;
  const priorityData = useMemo<PriorityEngineOutput>(() => {
    return computeHomePriorities(scenario.input);
  }, [scenario]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/40">
              DEV PREVIEW • ETAP 12C
            </span>
            <h1 className="text-xl font-black text-white uppercase tracking-wider mt-1 m-0">
              Home Communication Priority Layer Lab
            </h1>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider m-0">
              Wybierz Scenariusz Priorytetu
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MOCK_SCENARIOS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => setActiveScenarioKey(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeScenarioKey === key
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider m-0">
              Szerokość Podglądu (Viewport)
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'desktop', label: 'Full Width' },
                { id: '430', label: '430px (Max)' },
                { id: '390', label: '390px (Standard)' },
                { id: '375', label: '375px (SE)' },
                { id: '320', label: '320px (Compact)' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewportWidth(v.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewportWidth === v.id
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ENGINE REASONING BAR */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white">Wybrany Primary Tier: </span>
              <span className="text-amber-400 font-mono">
                {priorityData.primaryAction ? priorityData.primaryAction.tier : 'NONE (Calm)'}
              </span>
            </div>
            <div>
              <span className="font-bold text-white">Secondary Actions: </span>
              <span className="text-sky-400 font-mono">{priorityData.secondaryActions.length}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 m-0 font-mono">
            {priorityData.reason}
          </p>
          {lastActionTriggered && (
            <div className="text-emerald-400 font-bold pt-1">
              Akcja wykonana: {lastActionTriggered}
            </div>
          )}
        </div>

        {/* VIEWPORT SIMULATION */}
        <div className="flex justify-center p-4 bg-slate-900/30 rounded-2xl border border-white/5 overflow-x-auto">
          <div
            className="transition-all duration-300 bg-slate-950 rounded-2xl border border-white/10 p-4 space-y-4"
            style={{
              width: viewportWidth === 'desktop' ? '100%' : `${viewportWidth}px`,
              maxWidth: '100%'
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Podgląd HOME ({viewportWidth === 'desktop' ? 'Desktop' : `${viewportWidth}px`})
              </span>
            </div>

            {/* PRIORITY SECTION INSTANCE */}
            <DeltaHomePrioritySection
              priorityData={priorityData}
              onNavigate={(tab, payload) => {
                setLastActionTriggered(`Tab: ${tab}, Payload: ${JSON.stringify(payload || {})}`);
              }}
            />

            {!priorityData.hasPriority && (
              <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-white/10 rounded-2xl">
                ✨ Stan spokojny (Calm State) — brak naglących spraw wymagających natychmiastowej uwagi.
              </div>
            )}

            {/* Mock Next Match Card beneath */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-400 space-y-2">
              <div className="font-bold text-white">Centrum Drużyny & Kafelki HOME</div>
              <p className="text-[11px] m-0 text-slate-400">
                Poniżej wyświetlane są stałe moduły (najbliższy mecz, ostatni wynik, statystyki).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
