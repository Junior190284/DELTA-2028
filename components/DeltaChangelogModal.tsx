'use client';

import React from 'react';
import { X, Sparkles, Rocket, ShieldCheck, Flame, Trophy } from 'lucide-react';

interface DeltaChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeltaChangelogModal: React.FC<DeltaChangelogModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const updates = [
    {
      title: '🎬 Centralny Card Reveal Engine & Walkout 3D',
      desc: 'Dedykowane animacje reveal dla 7 rang kart (w tym potężny Walkout INFERNO i DELTA ICON) z interaktywnym 3D Tilt i obrotem awers/rewers.'
    },
    {
      title: '🎯 Centrum Misji Dziennych i Tygodniowych',
      desc: 'Nowe codzienne zadania i nagrody XP oraz darmowe paczki bez możliwości wielokrotnego odbioru.'
    },
    {
      title: '⚔️ Arena Pojedynków Kart (1v1 & 3v3 PvE)',
      desc: 'Wyzwij rywali CPU na starcia statystyk kart z wyborem poziomu trudności i nagrodami XP.'
    },
    {
      title: '🏟️ Studio Meczowe & Matchday Broadcast',
      desc: 'Transmisja meczowa przed meczem i podsumowanie po spotkaniu z wyróżnieniem MVP.'
    },
    {
      title: '🔒 Bezpieczeństwo Produkcyjne & PWA',
      desc: 'Pełne wsparcie dla instalacji aplikacji na telefonie (PWA), tryb offline i centralne dzienniki audytu admina.'
    }
  ];

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-lg animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base uppercase tracking-wider m-0">
                  Co nowego w DELTA GM?
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v1.8.0
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0 mt-0.5">Najnowsze funkcje i ulepszenia aplikacji</p>
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

        {/* Updates List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {updates.map((u, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
              <h4 className="font-black text-white text-xs sm:text-sm">{u.title}</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{u.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-slate-950/60">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all"
          >
            Super, zaczynamy!
          </button>
        </div>
      </div>
    </div>
  );
};
