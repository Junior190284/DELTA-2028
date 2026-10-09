"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  X, 
  RotateCw, 
  Star, 
  Calendar, 
  Award, 
  Copy, 
  Layers, 
  Tag, 
  Lock, 
  Eye, 
  Share2,
  CheckCircle2
} from "lucide-react";
import { DeltaCard } from "@/components/cards";
import { DeltaCardModel, DELTA_THEME_CONFIGS } from "@/lib/cards/deltaCardModel";
import { cardSound } from "@/lib/cards/audio";

export interface CardDetailModalProps {
  card: DeltaCardModel | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite?: (cardId: string, currentFavorite: boolean) => void;
  onSetFeatured?: (cardId: string) => void;
  isFeatured?: boolean;
}

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  onToggleFavorite,
  onSetFeatured,
  isFeatured = false
}: CardDetailModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset flipped state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [card?.id]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFavoriteClick = () => {
    if (!card) return;
    const nextState = !card.isFavorite;
    onToggleFavorite?.(card.id, !!card.isFavorite);
    cardSound?.playPurchase?.();
    showToast(nextState ? "⭐ Dodano do ulubionych" : "Usunięto z ulubionych");
  };

  const handleFeaturedClick = () => {
    if (!card) return;
    onSetFeatured?.(card.id);
    cardSound?.playPurchase?.();
    showToast("👑 Ustawiono jako wyróżnioną kartę");
  };

  if (!isOpen || !card) return null;

  const themeConfig = DELTA_THEME_CONFIGS[card.cardType] || DELTA_THEME_CONFIGS.STANDARD;
  const backData = card.backData || {};
  const obtainedDate = card.obtainedAt 
    ? new Date(card.obtainedAt).toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" })
    : "Brak danych";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/15 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8 text-white select-none"
        style={{
          boxShadow: `0 0 50px -10px ${themeConfig.accentGlow}, 0 25px 50px -12px rgba(0, 0, 0, 0.9)`
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-30"
          aria-label="Zamknij modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Interactive 3D DeltaCard */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative">
            <DeltaCard
              card={card}
              size="lg"
              isFlipped={isFlipped}
              onFlipChange={(flipped) => setIsFlipped(flipped)}
              interactive={true}
              showFlip={true}
            />
          </div>

          <button
            onClick={() => setIsFlipped(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Pokaż Awers" : "Obróć na Rewers"}</span>
          </button>
        </div>

        {/* Right: Card Dossier & Actions */}
        <div className="flex-1 flex flex-col justify-between w-full space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider border"
                style={{
                  backgroundColor: "rgba(0,0,0,0.5)",
                  borderColor: themeConfig.primaryColor,
                  color: themeConfig.fontAccentColor
                }}
              >
                {themeConfig.badgePill}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                {card.rarity}
              </span>
            </div>

            <h2 id="card-detail-title" className="text-2xl md:text-3xl font-[1000] tracking-tight uppercase">
              {card.playerName}
            </h2>
            {card.shirtNumber && (
              <p className="text-sm font-bold text-amber-400">
                Zawodnik DELTA GM #{card.shirtNumber}
              </p>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-white/10 font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Numer Karty</span>
              <span className="text-xs font-bold text-white truncate">{backData.cardId || card.id}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Sezon</span>
              <span className="text-xs font-bold text-white">{backData.season || "2026/27"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Data Zdobycia</span>
              <span className="text-xs font-bold text-white">{obtainedDate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Duplikaty</span>
              <span className="text-xs font-bold text-cyan-300">
                {card.duplicatesCount ? `x${card.duplicatesCount + 1}` : "1 (unikalna)"}
              </span>
            </div>
          </div>

          {/* Real Stats Pill Box (if exists) */}
          {card.stats && card.stats.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Statystyki Klubowe
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {card.stats.map(s => (
                  <div key={s.key} className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col items-center">
                    <span className="text-sm font-black text-amber-300">{s.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestone Source / Lore */}
          {(backData.milestoneBadge || backData.lore) && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
              {backData.milestoneBadge && (
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: backData.milestoneBadge.color }}>
                  <Award className="w-4 h-4 shrink-0" />
                  <span>{backData.milestoneBadge.label}</span>
                </div>
              )}
              {backData.lore && (
                <p className="text-xs text-slate-300 italic">
                  "{backData.lore}"
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Favorite Toggle */}
            <button
              onClick={handleFavoriteClick}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                card.isFavorite
                  ? "bg-amber-500/20 border border-amber-400 text-amber-300 hover:bg-amber-500/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10"
              }`}
            >
              <Star className={`w-4 h-4 ${card.isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
              <span>{card.isFavorite ? "Ulubiona Karta" : "Dodaj do Ulubionych"}</span>
            </button>

            {/* Set Featured Toggle */}
            {onSetFeatured && (
              <button
                onClick={handleFeaturedClick}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  isFeatured
                    ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isFeatured ? "Wyróżniona Wizytówka" : "Ustaw jako Wizytówkę"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950/90 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-2xl backdrop-blur-md animate-bounce">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
