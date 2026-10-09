"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Flame, 
  Layers, 
  Gift, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Share2,
  ChevronRight,
  TrendingUp
} from "lucide-react";

export interface WeeklyRecapData {
  weekLabel: string;
  activeDaysCount: number;
  streakCount: number;
  cardsAcquiredCount: number;
  achievementsCompletedCount: number;
  packsOpenedCount: number;
  topCardName?: string;
  topCardRarity?: string;
}

interface WeeklyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeeklyRecapData;
  playerName?: string;
}

export default function WeeklyRecapModal({
  isOpen,
  onClose,
  data,
  playerName = "Zawodnik DELTA"
}: WeeklyRecapModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-recap-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                PODSUMOWANIE TYGODNIA
              </span>
              <span className="text-xs text-slate-400 font-semibold">{data.weekLabel}</span>
            </div>
            <h2 id="weekly-recap-title" className="text-xl sm:text-2xl font-black text-white tracking-wide">
              ŚWIETNY TYDZIEŃ, {playerName.toUpperCase()}!
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Zamknij podsumowanie"
          >
            <X size={20} />
          </button>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-2 gap-3.5 my-6 relative z-10">
          {/* Active Days */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
              <Calendar size={15} className="text-blue-400" />
              <span>Dni aktywności</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {data.activeDaysCount} <span className="text-xs text-slate-400 font-sans">/ 7</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {data.activeDaysCount >= 5 ? "Znakomita frekwencja!" : "Dobry start w tym tygodniu"}
            </p>
          </div>

          {/* Streak */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
              <Flame size={15} className="text-red-400" />
              <span>Seria logowania</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {data.streakCount} <span className="text-xs text-slate-400 font-sans">dni</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {data.streakCount >= 7 ? "Kompletna seria 7/7!" : `Do celu brakuje ${7 - (data.streakCount % 7)} dni`}
            </p>
          </div>

          {/* Cards Gained */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
              <Layers size={15} className="text-purple-400" />
              <span>Zdobyte karty</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              +{data.cardsAcquiredCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {data.topCardName ? `Najlepsza: ${data.topCardName}` : "Powiększono kolekcję"}
            </p>
          </div>

          {/* Achievements Done */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
              <Trophy size={15} className="text-yellow-400" />
              <span>Nowe odznaki</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {data.achievementsCompletedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {data.achievementsCompletedCount > 0 ? "Klubowe cele osiągnięte" : "Kolejne odznaki blisko!"}
            </p>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3.5 mb-6 relative z-10">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wide">
              Cel na kolejny tydzień:
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Utrzymaj serię 7 dni i zdobądź gwarantowany <strong>Gold Booster</strong>!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
          >
            Kontynuuj przygodę
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
