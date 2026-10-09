'use client';

import React, { useState } from 'react';
import DeltaLiveAlertBanner from '@/components/DeltaLiveAlertBanner';
import {
  Bell,
  Flame,
  AlertTriangle,
  Smartphone,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import type { DeltaSystemEvent } from '@/lib/events/types';
import {
  getEventsNewSinceVisit,
  aggregateNewEventsSummary
} from '@/lib/events/live-alert';

const BASE_VISIT_ISO = '2026-10-09T12:00:00.000Z';

const SCENARIOS: Record<string, { label: string; events: DeltaSystemEvent[]; userRole?: string; visitIso?: string }> = {
  zeroEvents: {
    label: '0 New Events',
    visitIso: '2026-10-09T18:00:00.000Z',
    events: [
      {
        id: 'old-1',
        type: 'CLUB_NEWS',
        title: 'Stary wpis sprzed wizyty',
        message: 'Opublikowany przed ostatnią wizytą użytkownika.',
        source: 'DELTA_SYNC',
        importance: 'NORMAL',
        created_at: '2026-10-09T10:00:00.000Z',
        is_read: false
      }
    ]
  },
  oneClubNews: {
    label: '1 CLUB_NEWS',
    visitIso: BASE_VISIT_ISO,
    events: [
      {
        id: 'news-1',
        type: 'CLUB_NEWS',
        title: 'Nowe zasady treningów jesiennych',
        message: 'Klub ogłasza uaktualniony grafik treningowy dla rocznika 2018.',
        source: 'DELTA_SYNC',
        importance: 'NORMAL',
        created_at: '2026-10-09T14:00:00.000Z',
        is_read: false
      }
    ]
  },
  threeMixed: {
    label: '3 Mixed Events (Klub, Mecz, Trening)',
    visitIso: BASE_VISIT_ISO,
    events: [
      {
        id: 'mix-1',
        type: 'MATCH_CREATED',
        title: 'Zaplanowano sparing z KS Raszyn',
        message: 'Sobota 18.10 godz. 11:00.',
        source: 'DELTA_SYSTEM',
        importance: 'IMPORTANT',
        created_at: '2026-10-09T15:30:00.000Z',
        is_read: false
      },
      {
        id: 'mix-2',
        type: 'CLUB_NEWS',
        title: 'Turniej jesienny Delta Cup',
        message: 'Zgłoszenia drużyn do 15 października.',
        source: 'DELTA_SYNC',
        importance: 'NORMAL',
        created_at: '2026-10-09T16:00:00.000Z',
        is_read: false
      },
      {
        id: 'mix-3',
        type: 'TRAINING_UPDATED',
        title: 'Zmiana boiska: Trening Piątek',
        message: 'Trening odbędzie się na boisku pod balonem.',
        source: 'DELTA_SYSTEM',
        importance: 'NORMAL',
        created_at: '2026-10-09T16:45:00.000Z',
        is_read: false
      }
    ]
  },
  importantMatch: {
    label: 'Important MATCH_UPDATED (Urgent/Important)',
    visitIso: BASE_VISIT_ISO,
    events: [
      {
        id: 'urgent-1',
        type: 'MATCH_UPDATED',
        title: 'PILNE: Przesunięcie godziny meczu ligowego',
        message: 'Mecz ligowy rozpocznie się o 13:00 zamiast 10:00.',
        source: 'DELTA_SYSTEM',
        importance: 'URGENT',
        created_at: '2026-10-09T17:00:00.000Z',
        is_read: false
      }
    ]
  },
  pushReceivedUnread: {
    label: 'Push-Received But Unread',
    visitIso: BASE_VISIT_ISO,
    events: [
      {
        id: 'push-1',
        type: 'CLUB_NEWS',
        title: 'Komunikat zarządu DELTA',
        message: 'Dostarczony przez Web Push, oczekuje na przeczytanie.',
        source: 'DELTA_SYNC',
        importance: 'IMPORTANT',
        created_at: '2026-10-09T16:30:00.000Z',
        is_read: false
      }
    ]
  },
  highUnreadFewNew: {
    label: '99+ Unread But 2 New Since Visit',
    visitIso: BASE_VISIT_ISO,
    events: [
      // 2 new events
      {
        id: 'new-1',
        type: 'MATCH_CREATED',
        title: 'Świeży mecz dodany 10 min temu',
        message: 'Nowo utworzone spotkanie ligowe.',
        source: 'DELTA_SYSTEM',
        importance: 'IMPORTANT',
        created_at: '2026-10-09T17:30:00.000Z',
        is_read: false
      },
      {
        id: 'new-2',
        type: 'TRAINING_CREATED',
        title: 'Świeży trening dodatkowy',
        message: 'Sesja motoryczna w środę.',
        source: 'DELTA_SYSTEM',
        importance: 'NORMAL',
        created_at: '2026-10-09T17:45:00.000Z',
        is_read: false
      },
      // 100 older unread events
      ...Array.from({ length: 100 }, (_, i) => ({
        id: `old-unread-${i}`,
        type: 'CLUB_NEWS' as const,
        title: `Stary nieprzeczytany news #${i + 1}`,
        message: 'Stara treść z przeszłości.',
        source: 'DELTA_SYNC',
        importance: 'LOW' as const,
        created_at: '2026-10-01T12:00:00.000Z',
        is_read: false
      }))
    ]
  },
  adminEvent: {
    label: 'Admin-Only Event (SYNC_ERROR)',
    visitIso: BASE_VISIT_ISO,
    userRole: 'admin',
    events: [
      {
        id: 'admin-1',
        type: 'SYNC_ERROR',
        title: 'Błąd synchronizacji DELTA Sync',
        message: 'Tylko dla kadry trenerskiej i administratorów.',
        source: 'DELTA_SYNC',
        importance: 'HIGH',
        audience_type: 'ADMIN',
        created_at: '2026-10-09T17:15:00.000Z',
        is_read: false
      }
    ]
  }
};

export default function DevLiveAlertPreviewPage() {
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('threeMixed');
  const [viewportWidth, setViewportWidth] = useState<'desktop' | '320' | '375' | '390' | '430'>('desktop');
  const [navigatedTo, setNavigatedTo] = useState<string | null>(null);

  const scenario = SCENARIOS[activeScenarioKey] || SCENARIOS.threeMixed;
  const visitIso = scenario.visitIso || BASE_VISIT_ISO;
  const userRole = scenario.userRole || 'parent';

  const newEvents = getEventsNewSinceVisit(scenario.events, visitIso, {
    userId: 'dev_user',
    role: userRole
  });

  const summary = aggregateNewEventsSummary(newEvents);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/40">
              DEV PREVIEW • ETAP 12B
            </span>
            <h1 className="text-xl font-black text-white uppercase tracking-wider mt-1 m-0">
              Live Alert & &quot;Co Nowego?&quot; Lab
            </h1>
          </div>
        </div>

        {/* SCENARIO SELECTOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider m-0">
              Wybierz Scenariusz Alertu
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SCENARIOS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveScenarioKey(key);
                    sessionStorage.removeItem('delta_dismissed_live_alerts_session');
                  }}
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

        {/* METRICS BAR */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div>
            <span>Wszystkie zdarzenia: </span>
            <strong className="text-white">{scenario.events.length}</strong>
            <span className="mx-2">•</span>
            <span>Nowe od wizyty: </span>
            <strong className="text-amber-400">{summary.totalCount}</strong>
            <span className="mx-2">•</span>
            <span>Priorytet: </span>
            <strong className={summary.hasUrgentOrImportant ? 'text-red-400' : 'text-slate-300'}>
              {summary.highestImportance}
            </strong>
          </div>
          {navigatedTo && (
            <div className="text-emerald-400 font-bold">
              Akcja: Nawigowano do {navigatedTo}
            </div>
          )}
        </div>

        {/* LIVE VIEWPORT PREVIEW */}
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
                Podgląd ekranu głównego (HOME / Dashboard)
              </span>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('delta_dismissed_live_alerts_session');
                  setActiveScenarioKey(prev => prev);
                }}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                Resetuj Dismiss
              </button>
            </div>

            {/* LIVE ALERT COMPONENT INSTANCE */}
            <DeltaLiveAlertBanner
              key={`${activeScenarioKey}_${viewportWidth}`}
              events={scenario.events}
              userId="dev_user"
              userRole={userRole}
              onNavigate={(tab) => setNavigatedTo(`Tab: ${tab}`)}
              onOpenNotifications={() => setNavigatedTo('Notifications Center Modal')}
            />

            {/* Mock Dashboard Content beneath */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-500 space-y-2">
              <div className="font-bold text-slate-400">Zawartość Pulpitu Głównego (Home)</div>
              <p className="m-0 text-[11px]">
                Karty meczowe, frekwencja oraz skróty nie są zasłaniane przez Live Alert.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
