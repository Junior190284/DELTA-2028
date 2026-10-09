'use client';

import React, { useState } from 'react';
import { DeltaNotificationCenterModal } from '@/components/DeltaNotificationCenterModal';
import {
  Bell,
  CheckCheck,
  Flame,
  Zap,
  Trophy,
  Camera,
  Video,
  Smartphone,
  Monitor,
  RotateCcw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import type { DeltaSystemEvent } from '@/lib/events/types';
import {
  mapEventToCategory,
  groupEventsChronologically,
  formatNotificationBadge,
  NOTIFICATION_FILTERS
} from '@/lib/events/notifications';

const MOCK_SCENARIOS: Record<string, DeltaSystemEvent[]> = {
  standard: [
    {
      id: 'mock-1',
      type: 'MATCH_CREATED',
      title: 'Nowy mecz ligowy: vs Alfa Przymierze Rodzin',
      message: 'Mecz ligowy zaplanowany na sobotę 12.10, godzina 10:00, ul. Jeziorna 2.',
      source: 'DELTA_SYSTEM',
      importance: 'IMPORTANT',
      audience_type: 'TEAM',
      created_at: new Date().toISOString(),
      is_read: false,
      metadata: { route: '/dashboard?view=matches' }
    },
    {
      id: 'mock-2',
      type: 'CLUB_NEWS',
      title: 'Jesienny obóz szkoleniowy 2026',
      message: 'Zapisy na obóz jesienny trwają do 20 października. Szczegóły organizacyjne w rozwinięciu.',
      source: 'DELTA_SYNC',
      importance: 'NORMAL',
      audience_type: 'TEAM',
      created_at: new Date().toISOString(),
      is_read: false,
      metadata: { route: '/dashboard?view=club' }
    },
    {
      id: 'mock-3',
      type: 'TRAINING_UPDATED',
      title: 'Zmiana godziny treningu w czwartek',
      message: 'Trening czwartkowy rozpocznie się o 17:30 (zamiast 17:00) na boisku A.',
      source: 'DELTA_SYSTEM',
      importance: 'URGENT',
      audience_type: 'TEAM',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      is_read: true,
      metadata: { route: '/dashboard?view=training' }
    },
    {
      id: 'mock-4',
      type: 'PLAYER_CARD_UNLOCKED',
      title: 'Odblokowano nową kartę: Jan Kowalski (INFERNO)',
      message: 'Gratulacje! Odblokowałeś unikalną kartę kolekcjonerską z serii INFERNO.',
      source: 'DELTA_CARDS',
      importance: 'HIGH',
      audience_type: 'USER',
      target_user_id: 'dev_user',
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      is_read: false,
      metadata: { route: '/dashboard?view=collection' }
    },
    {
      id: 'mock-5',
      type: 'PLAYER_ACHIEVEMENT',
      title: 'Osiągnięcie zdobyte: Król Strzelców Października',
      message: 'Zdobyłeś 5 bramek w ostatnich meczach sparingowych!',
      source: 'DELTA_ACHIEVEMENTS',
      importance: 'NORMAL',
      audience_type: 'PLAYER',
      created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      is_read: true,
      metadata: { route: '/dashboard?view=achievements' }
    },
    {
      id: 'mock-6',
      type: 'GALLERY_CREATED',
      title: 'Nowa galeria zdjęć z Turnieju Delta Cup',
      message: 'Dodano 45 zdjęć wysokiej rozdzielczości z niedzielnych zmagań rocznika 2018.',
      source: 'DELTA_MEDIA',
      importance: 'LOW',
      audience_type: 'TEAM',
      created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      is_read: true,
      metadata: { route: '/dashboard?view=gallery' }
    },
    {
      id: 'mock-7',
      type: 'SYSTEM_MESSAGE',
      title: 'Komunikat organizacyjny: Nowe stroje meczowe',
      message: 'Odbiór nowych strojów meczowych u trenera przed piątkowym treningiem.',
      source: 'DELTA_ADMIN',
      importance: 'NORMAL',
      audience_type: 'TEAM',
      created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
      is_read: true,
    }
  ],
  empty: [],
  highVolumeUnread: Array.from({ length: 120 }, (_, i) => ({
    id: `mock-mass-${i}`,
    type: i % 2 === 0 ? 'MATCH_CREATED' : 'CLUB_NEWS',
    title: `Powiadomienie testowe #${i + 1}`,
    message: `Treść powiadomienia testowego numer ${i + 1} generowanego masowo.`,
    source: 'TEST_GEN',
    importance: i % 10 === 0 ? 'URGENT' : 'NORMAL',
    audience_type: 'TEAM',
    created_at: new Date(Date.now() - i * 3600 * 1000).toISOString(),
    is_read: false,
  }))
};

export default function DevNotificationsPreviewPage() {
  const [scenario, setScenario] = useState<string>('standard');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<'desktop' | '320' | '375' | '390' | '430'>('desktop');
  const [lastNavigated, setLastNavigated] = useState<string | null>(null);

  const events = MOCK_SCENARIOS[scenario] || [];
  const unreadCount = events.filter(e => !e.is_read).length;
  const badge = formatNotificationBadge(unreadCount);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* DEV BAR */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/40">
              DEV PREVIEW • ETAP 12A
            </span>
            <h1 className="text-xl font-black text-white uppercase tracking-wider mt-1 m-0">
              Notifications Center 2.0 Lab
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all shadow-lg flex items-center gap-2"
            >
              <Bell size={16} />
              <span>Otwórz Modal ({badge.display || '0'})</span>
            </button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider m-0">
              Wybierz Scenariusz Danych
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'standard', label: 'Standard (7 eventów, 3 unread)' },
                { id: 'empty', label: 'Empty State (0 eventów)' },
                { id: 'highVolumeUnread', label: '99+ Unread (120 eventów)' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    scenario === s.id
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
              Symulacja Szerokości Ekranu Mobile
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'desktop', label: 'Full Width' },
                { id: '430', label: '430px (iPhone Pro Max)' },
                { id: '390', label: '390px (iPhone standard)' },
                { id: '375', label: '375px (iPhone SE)' },
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

        {/* STATUS BAR */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>Aktywny scenariusz: </span>
            <strong className="text-white">{scenario}</strong>
            <span className="mx-2">•</span>
            <span>Nieprzeczytane: </span>
            <strong className="text-amber-400">{unreadCount}</strong>
            <span className="mx-2">•</span>
            <span>Format Badge: </span>
            <strong className="text-red-400">{badge.display || 'hidden (0)'}</strong>
          </div>
          {lastNavigated && (
            <div className="text-emerald-400">
              <span>Nawigacja do: </span>
              <strong>{lastNavigated}</strong>
            </div>
          )}
        </div>

        {/* VIEWPORT WRAPPER */}
        <div className="flex justify-center p-4 bg-slate-900/30 rounded-2xl border border-white/5 overflow-x-auto">
          <div
            className="transition-all duration-300 bg-slate-950 rounded-2xl border border-white/10 p-4"
            style={{
              width: viewportWidth === 'desktop' ? '100%' : `${viewportWidth}px`,
              maxWidth: '100%'
            }}
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">
                  Podgląd kontenera: {viewportWidth === 'desktop' ? 'Desktop' : `${viewportWidth}px`}
                </span>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                Otwórz modal powiadomień →
              </button>
            </div>

            {/* In-container preview card */}
            <div className="space-y-3">
              {events.slice(0, 4).map(e => (
                <div
                  key={e.id}
                  className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{e.title}</span>
                    <span className="text-[10px] text-slate-500">
                      {mapEventToCategory(e)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] m-0">{e.message}</p>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Brak powiadomień w tym scenariuszu.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL INSTANCE */}
        <DeltaNotificationCenterModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          userId="dev_user"
          userRole="admin"
          parentPlayerIds={['player-1', 'player-2']}
          onNavigate={(tab) => {
            setLastNavigated(tab);
          }}
        />
      </div>
    </div>
  );
}
