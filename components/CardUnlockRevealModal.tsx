"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Trophy, X, ChevronRight, Layers, Flame, Crown } from "lucide-react";
import { CardDefinition, CardLayoutConfig } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface CardUnlockRevealModalProps {
  card: CardDefinition;
  achievementTitle?: string;
  onClose: () => void;
  onGoToCollection?: () => void;
  layoutOverride?: Partial<CardLayoutConfig>;
}

export default function CardUnlockRevealModal({
  card,
  achievementTitle = "Osiągnięcie Zrealizowane",
  onClose,
  onGoToCollection,
  layoutOverride
}: CardUnlockRevealModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const r = (card.rarity || "").toLowerCase();
  const isInferno = r === "inferno" || (card.card_type || "").toLowerCase().includes("inferno");
  const isLegend = r === "legendary" || r === "legend" || (card.card_type || "").toLowerCase().includes("legend");

  useEffect(() => {
    setMounted(true);
    cardSound.playReveal(isInferno ? "inferno" : isLegend ? "legendary" : "epic");
    cardSound.playHaptic(isInferno ? "inferno" : "heavy");
  }, [isInferno, isLegend]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className={`delta-card-unlock-reveal-backdrop ${isInferno ? "theme-inferno" : isLegend ? "theme-legend" : "theme-gold"} animate-fadeIn`}
      onClick={onClose}
    >
      <div 
        className="delta-card-unlock-reveal-modal"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="delta-unlock-close-btn"
          aria-label="Zamknij"
        >
          <X size={20} />
        </button>

        {/* Ambient Glow Aura */}
        <div className="delta-unlock-aura" />

        {/* Header Eyebrow */}
        <div className="delta-unlock-header">
          <div className="delta-unlock-badge">
            {isInferno ? <Flame size={14} className="text-red-400" /> : <Trophy size={14} className="text-yellow-400" />}
            <span>{achievementTitle.toUpperCase()}</span>
          </div>
          <h2 className="delta-unlock-title">NOWA KARTA ODBLOKOWANA!</h2>
          <p className="delta-unlock-subtitle">
            Za wybitne osiągnięcie na boisku do Twojej kolekcji trafia specjalny wariant karty!
          </p>
        </div>

        {/* 3D Card Presentation */}
        <div className="delta-unlock-card-container">
          <CollectibleCard3D
            card={card}
            userCard={undefined}
            isLocked={false}
            size="xl"
            interactive={true}
            showFlip={true}
            isFlipped={isFlipped}
            onFlipChange={setIsFlipped}
            layoutOverride={layoutOverride}
          />
        </div>

        <span className="delta-unlock-flip-hint">
          ✋ Kliknij lub chwyć kartę, aby obejrzeć rewers w 3D
        </span>

        {/* Actions */}
        <div className="delta-unlock-actions">
          {onGoToCollection && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToCollection();
              }}
              className="delta-unlock-btn primary"
            >
              <Layers size={18} />
              <span>ZOBACZ W KOLEKCJI DELTA</span>
              <ChevronRight size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="delta-unlock-btn secondary"
          >
            <span>ZAMKNIJ</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
