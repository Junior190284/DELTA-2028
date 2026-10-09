'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, Check, Shield, AlertCircle, Smartphone, CheckCircle2 } from 'lucide-react';
import { subscribeToPush } from '@/lib/push';
import { DEFAULT_PUSH_PREFERENCES, type PushNotificationPreferences } from '@/lib/events/types';

interface DeltaNotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const DeltaNotificationPreferencesModal: React.FC<DeltaNotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user'
}) => {
  const [prefs, setPrefs] = useState<PushNotificationPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [pushStatus, setPushStatus] = useState<'supported' | 'unsupported' | 'denied' | 'granted' | 'default'>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Check browser push support & permission
    if (typeof window !== 'undefined') {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported');
      } else if (Notification.permission === 'denied') {
        setPushStatus('denied');
      } else if (Notification.permission === 'granted') {
        setPushStatus('granted');
      } else {
        setPushStatus('default');
      }
    }

    // Fetch existing preferences from server if logged in
    fetch('/api/push/subscribe')
      .then(res => res.json())
      .then(data => {
        if (data?.ok && data.subscriptions?.[0]?.preferences) {
          setPrefs({ ...DEFAULT_PUSH_PREFERENCES, ...data.subscriptions[0].preferences });
        } else {
          const cached = localStorage.getItem('delta_notif_prefs');
          if (cached) {
            try { setPrefs(JSON.parse(cached)); } catch {}
          }
        }
      })
      .catch(() => {
        const cached = localStorage.getItem('delta_notif_prefs');
        if (cached) {
          try { setPrefs(JSON.parse(cached)); } catch {}
        }
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof PushNotificationPreferences) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const handleEnablePush = async () => {
    try {
      setIsSubscribing(true);
      setFeedback(null);
      await subscribeToPush();
      setPushStatus('granted');
      setFeedback('Powiadomienia na tym urządzeniu zostały włączone!');
    } catch (err: any) {
      if (err?.stage === 'permission') {
        setPushStatus('denied');
        setFeedback('Zgoda na powiadomienia została zablokowana w przeglądarce.');
      } else {
        setFeedback(err?.message || 'Nie udało się włączyć powiadomień.');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSave = async () => {
    localStorage.setItem('delta_notif_prefs', JSON.stringify(prefs));

    try {
      await fetch('/api/push/subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs })
      });
    } catch {}

    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const categories: Array<{ key: keyof PushNotificationPreferences; label: string; desc: string; icon: string }> = [
    { key: 'matches', label: 'Terminarze i mecze', desc: 'Terminy spotkań, godziny zbiórek i rywale', icon: '⚽' },
    { key: 'schedule_changes', label: 'Zmiany terminów i boisk', desc: 'Pilne korekty godzin, odwołania i zmiany lokalizacji', icon: '⚠️' },
    { key: 'trainings', label: 'Treningi drużyny', desc: 'Plan zajęć treningowych i zbiórki', icon: '⚡' },
    { key: 'lineup', label: 'Powołania i składy', desc: 'Ogłoszenie składu na mecze ligowe i turnieje', icon: '📋' },
    { key: 'club_news', label: 'Wiadomości ze strony DELTA', desc: 'Komunikaty klubowe z oficjalnej strony K.S. Delta', icon: '📰' },
    { key: 'achievements', label: 'Osiągnięcia i karty', desc: 'Zdobyte odznaki, wyzwania i nowe karty zawodników', icon: '🏆' },
    { key: 'gallery', label: 'Galeria i wideo', desc: 'Nowe zdjęcia z meczów i materiały wideo', icon: '📸' }
  ];

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-lg animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wider m-0">
                Ustawienia Powiadomień
              </h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">Dostosuj powiadomienia i kanały Web Push</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="v200-modal-close"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Device Push Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Smartphone size={16} className="text-amber-400" />
                <span>Status na tym urządzeniu:</span>
              </div>
              <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${
                pushStatus === 'granted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                pushStatus === 'denied' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                pushStatus === 'unsupported' ? 'bg-slate-800 text-slate-400' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {pushStatus === 'granted' ? 'Włączone' :
                 pushStatus === 'denied' ? 'Zablokowane w przeglądarce' :
                 pushStatus === 'unsupported' ? 'Brak wsparcia' :
                 'Wyłączone'}
              </span>
            </div>

            {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="mt-1 w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Bell size={14} />
                {isSubscribing ? 'Włączanie...' : 'Włącz powiadomienia na tym urządzeniu'}
              </button>
            )}

            {feedback && (
              <p className="text-[11px] text-amber-300 m-0 flex items-center gap-1.5 mt-1">
                <AlertCircle size={13} /> {feedback}
              </p>
            )}
          </div>

          {/* Category List */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider m-0 mb-1">
              Kategorie powiadomień
            </h4>
            {categories.map((item) => (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className="p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:border-white/20 flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg">{item.icon}</div>
                  <div>
                    <h5 className="font-bold text-white text-xs sm:text-sm m-0">{item.label}</h5>
                    <p className="text-[11px] text-slate-400 m-0">{item.desc}</p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  prefs[item.key]
                    ? 'bg-amber-500 border-amber-400 text-slate-950'
                    : 'bg-slate-900 border-white/20 text-transparent'
                }`}>
                  <Check size={12} className="stroke-[3]" />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              {saved ? <><Check size={15} /> Zapisano Ustawienia</> : 'Zapisz Preferencje'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
