'use client';

import React, { useState } from 'react';
import { Bell, Shield, Send, CheckCircle2, XCircle, AlertTriangle, Smartphone } from 'lucide-react';
import { isEventEligibleForPush, getDeepLinkForEvent, type PushSubscriptionRecord } from '@/lib/events/push-eligibility';
import type { DeltaSystemEvent } from '@/lib/events/types';

export default function DevPushHarnessPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [activeScenario, setActiveScenario] = useState<string>('');

  const mockSub: PushSubscriptionRecord = {
    id: 'sub-dev-1',
    user_id: 'user-dev-1',
    endpoint: 'https://fcm.googleapis.com/fcm/send/sample-dev-endpoint-123',
    p256dh: 'mock-p256dh',
    auth: 'mock-auth',
    enabled: true,
    preferences: {
      matches: true,
      schedule_changes: true,
      trainings: true,
      lineup: true,
      club_news: true,
      achievements: true,
      gallery: true
    }
  };

  const cutoff = '2026-10-09T18:00:00.000Z';

  const runScenario = (scenarioName: string, configOverrides: any, eventOverrides: any, subOverrides: any = {}) => {
    setActiveScenario(scenarioName);
    const sub = { ...mockSub, ...subOverrides };
    const event: DeltaSystemEvent = {
      id: `evt-${Date.now()}`,
      type: 'CLUB_NEWS',
      title: 'Powołania 2018 Górny Mokotów',
      message: 'Nowe powołania na mecz ligowy',
      source: 'DELTA_SYNC',
      importance: 'NORMAL',
      audience_type: 'TEAM',
      target_user_id: null,
      target_player_id: null,
      created_at: '2026-10-09T18:15:00.000Z',
      ...eventOverrides
    };

    const config = {
      pushEnabled: true,
      activationCutoffIso: cutoff,
      nowIso: '2026-10-09T18:30:00.000Z',
      ...configOverrides
    };

    const outcome = isEventEligibleForPush(event, sub, { id: sub.user_id, role: 'parent' }, config);
    const deepLink = getDeepLinkForEvent(event);

    setTestResult({
      scenarioName,
      event,
      subscription: { ...sub, endpoint: sub.endpoint.slice(0, 35) + '...' },
      config,
      deepLink,
      outcome
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Bell size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-white m-0">
                Web Push Dev Harness
              </h1>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                ETAP 11B: Preflight & Eligibility Engine Simulator
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            DEV ENVIRONMENT ONLY
          </span>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              id: 'feature_off',
              title: '1. Feature Flag OFF',
              desc: 'Globalny przełącznik PUSH_ENABLED=false',
              run: () => runScenario('Feature Flag OFF', { pushEnabled: false }, {})
            },
            {
              id: 'historical_cutoff',
              title: '2. Before Cutoff (10 Historical News)',
              desc: 'Event z przeszłości (np. 12:00 przed cutoff 18:00)',
              run: () => runScenario('Historical Before Cutoff', {}, { created_at: '2026-10-09T12:00:00.000Z' })
            },
            {
              id: 'eligible_after_cutoff',
              title: '3. Eligible After Cutoff',
              desc: 'Świeży komunikat opublikowany po cutoff',
              run: () => runScenario('Eligible New Event', {}, { created_at: '2026-10-09T18:05:00.000Z' })
            },
            {
              id: 'preference_off',
              title: '4. Category Preference OFF',
              desc: 'Użytkownik wyłączył kategorię club_news',
              run: () => runScenario('Preference Off', {}, {}, { preferences: { ...mockSub.preferences, club_news: false } })
            },
            {
              id: 'wrong_audience',
              title: '5. Wrong Audience',
              desc: 'Event prywatny przypisany do innego usera',
              run: () => runScenario('Wrong Audience', {}, { audience_type: 'USER', target_user_id: 'other-user-999' })
            },
            {
              id: 'stale_event',
              title: '6. Stale Event (> TTL)',
              desc: 'Komunikat starszy niż 120 minut',
              run: () => runScenario('Stale Event', { nowIso: '2026-10-09T22:00:00.000Z' }, { created_at: '2026-10-09T18:01:00.000Z' })
            },
            {
              id: 'storm_digest',
              title: '7. News Storm / Digest (3 News)',
              desc: 'Symulacja 3 wpisów w jednym sync run',
              run: () => runScenario('News Storm Digest', {}, { title: 'Powołania 2018 (3 nowe wpisy)' })
            },
            {
              id: 'dead_endpoint',
              title: '8. Dead Endpoint Simulation',
              desc: 'Subskrypcja wyłączona po błędzie 410',
              run: () => runScenario('Dead Endpoint', {}, {}, { enabled: false })
            }
          ].map((s) => (
            <button
              key={s.id}
              onClick={s.run}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                activeScenario === s.title
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/20'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-2 flex items-center gap-1">
                <Send size={12} /> Testuj scenariusz
              </span>
            </button>
          ))}
        </div>

        {/* Results Panel */}
        {testResult && (
          <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                Wynik Ewaluacji: {testResult.scenarioName}
              </h2>
              <div className="flex items-center gap-2">
                {testResult.outcome.eligible ? (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
                    <CheckCircle2 size={14} /> ELIGIBLE (PUSH SEND)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black flex items-center gap-1">
                    <XCircle size={14} /> REJECTED: {testResult.outcome.reason}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-white/5 space-y-1">
                <span className="font-bold text-slate-400">Event Details:</span>
                <div><span className="text-slate-500">Typ:</span> {testResult.event.type}</div>
                <div><span className="text-slate-500">Tytuł:</span> {testResult.event.title}</div>
                <div><span className="text-slate-500">Utworzono:</span> {testResult.event.created_at}</div>
                <div><span className="text-slate-500">Waga:</span> {testResult.event.importance}</div>
                <div><span className="text-slate-500">Audience:</span> {testResult.event.audience_type}</div>
                <div><span className="text-slate-500">Deep Link:</span> <code className="text-amber-400">{testResult.deepLink}</code></div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-white/5 space-y-1">
                <span className="font-bold text-slate-400">Server & Sub Context:</span>
                <div><span className="text-slate-500">PUSH_ENABLED:</span> {String(testResult.config.pushEnabled)}</div>
                <div><span className="text-slate-500">Cutoff ISO:</span> {testResult.config.activationCutoffIso}</div>
                <div><span className="text-slate-500">Sub Enabled:</span> {String(testResult.subscription.enabled)}</div>
                <div><span className="text-slate-500">Club News Pref:</span> {String(testResult.subscription.preferences?.club_news)}</div>
                <div><span className="text-slate-500">Endpoint:</span> {testResult.subscription.endpoint}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
