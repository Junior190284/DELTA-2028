"use client";

import React from "react";
import { X, Trophy, CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import { DeltaCard } from "@/components/cards";
import { DeltaCardModel } from "@/lib/cards/deltaCardModel";

export interface PlayerCollectionViewProps {
  player: { id: string; name: string; shirtNumber?: string | null; photoPath?: string | null } | null;
  playerCards: DeltaCardModel[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (card: DeltaCardModel) => void;
}

export default function PlayerCollectionView({
  player,
  playerCards,
  isOpen,
  onClose,
  onSelectCard
}: PlayerCollectionViewProps) {
  if (!isOpen || !player) return null;

  const ownedCount = playerCards.filter(c => !c.isLocked).length;
  const totalCount = playerCards.length;
  const completionPercent = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/15 p-6 md:p-8 shadow-2xl space-y-6 text-white"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              aria-label="Wróć do całej kolekcji"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-[1000] uppercase tracking-tight">
                  {player.name}
                </h2>
                {player.shirtNumber && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                    #{player.shirtNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Prywatna kolekcja kart zawodnika DELTA 2018 GM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400">Odblokowano:</span>
              <span className="text-base font-black text-amber-400 font-mono">
                {ownedCount} / {totalCount} ({completionPercent}%)
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playerCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onSelectCard(card)}
              className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:-translate-y-1.5"
            >
              <div className="w-full relative aspect-[2/3] max-w-[200px]">
                <DeltaCard
                  card={card}
                  size="responsive"
                  interactive={!card.isLocked}
                  showFlip={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
