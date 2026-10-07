'use client';

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface DeltaWeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays?: number;
  xpGained?: number;
  trainingsAttended?: number;
  cardsUnlocked?: number;
}

export const DeltaWeeklySummaryModal: React.FC<DeltaWeeklySummaryModalProps> = ({
  isOpen,
  onClose,
  streakDays = 5,
  xpGained = 480,
  trainingsAttended = 3,
  cardsUnlocked = 6
}) => {
  if (!isOpen) return null;

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-lg animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Banner Top */}
        <div className="p-6 bg-gradient-to-br from-red-950 via-slate-900 to-amber-950 border-b border-white/10 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="v200-modal-close absolute top-4 right-4"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20">
            📊
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider m-0">
            Podsumowanie Tygodnia DELTA
          </h2>
          <p className="text-xs text-slate-300 mt-1 m-0">Świetna robota! Sprawdź swoje postępy z ostatnich 7 dni</p>
        </div>

        {/* Infographic Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 flex flex-col items-center text-center">
              <div className="text-2xl mb-1">⚡</div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Zdobyte XP</span>
              <span className="text-xl font-black text-amber-400 mt-0.5">+{xpGained} XP</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 flex flex-col items-center text-center">
              <div className="text-2xl mb-1">🔥</div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Streak Dni</span>
              <span className="text-xl font-black text-red-400 mt-0.5">{streakDays} Dni</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 flex flex-col items-center text-center">
              <div className="text-2xl mb-1">⚽</div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Treningi</span>
              <span className="text-xl font-black text-emerald-400 mt-0.5">{trainingsAttended} / 3</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 flex flex-col items-center text-center">
              <div className="text-2xl mb-1">🎴</div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nowe Karty</span>
              <span className="text-xl font-black text-purple-400 mt-0.5">+{cardsUnlocked}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 to-amber-950/40 border border-amber-500/20 text-xs text-slate-300 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0" />
            <p>
              Regularne treningi na boisku i konsekwencja w aplikacji rozwijają Twoją postać w rankingu DELTA 2018!
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30"
          >
            Kontynuuj Grę
          </button>
        </div>
      </div>
    </div>
  );
};
