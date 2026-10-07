'use client';

import React, { useState } from 'react';
import { X, Bell, Check, Shield, Trophy, Flame, Calendar, Sparkles } from 'lucide-react';

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
  const [prefs, setPrefs] = useState({
    matches: true,
    trainings: true,
    events: true,
    gameplay: true,
    collection: true,
    important: true
  });
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('delta_notif_prefs', JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wider">
                Ustawienia Powiadomień
              </h3>
              <p className="text-xs text-slate-400">Dostosuj powiadomienia do swoich potrzeb</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 sm:p-6 space-y-3">
          {[
            { key: 'matches', label: 'Terminarze i Wyniki Meczów', desc: 'Godziny zbiórek, powołania i wyniki spotkań', icon: '⚽' },
            { key: 'trainings', label: 'Treningi i Frekwencja', desc: 'Przypomnienia o treningach i potwierdzenia obecności', icon: '⚡' },
            { key: 'events', label: 'Wydarzenia Klubowe', desc: 'Mini-gry, turnieje wewnętrzne i spotkania', icon: '🏆' },
            { key: 'gameplay', label: 'Misje i Koło Fortuny', desc: 'Nowe misje dzienne, darmowe spiny i Battle Pass', icon: '🎯' },
            { key: 'collection', label: 'Kolekcja Kart i Paczki', desc: 'Nowe paczki do odebrania i wyzwania albumu', icon: '🎴' },
          ].map((item) => (
            <div
              key={item.key}
              onClick={() => handleToggle(item.key as any)}
              className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 hover:border-white/20 flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="text-xl">{item.icon}</div>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">{item.label}</h4>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                (prefs as any)[item.key]
                  ? 'bg-amber-500 border-amber-400 text-black'
                  : 'bg-slate-900 border-white/20 text-transparent'
              }`}>
                <Check size={14} className="stroke-[3]" />
              </div>
            </div>
          ))}

          <div className="pt-3">
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
