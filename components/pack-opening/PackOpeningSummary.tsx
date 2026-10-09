"use client";

import React, { useState } from "react";
import { Sparkles, RefreshCw, Layers, ArrowLeft, Trophy, Coins, Flame, Crown, CheckCircle2 } from "lucide-react";
import { CardDefinition, CardLayoutConfig } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "../CollectibleCard3D";

interface DrawnCardItem {
  card: CardDefinition;
  is_duplicate: boolean;
  duplicate_points: number;
}

interface PackOpeningSummaryProps {
  cards: DrawnCardItem[];
  totalDeltaPointsEarned: number;
  unopenedCount: number;
  onClose: () => void;
  onOpenAnother?: () => void;
  collectionProgress?: {
    currentOwned: number;
    totalCards: number;
  };
  getLayoutForCard?: (card?: CardDefinition) => Partial<CardLayoutConfig> | undefined;
}

// Helper: Rarity rank
const RARITY_RANK: Record<string, number> = {
  inferno: 6,
  legendary: 5,
  legend: 5,
  epic: 4,
  gold: 4,
  matchday: 3,
  rare: 2,
  common: 1
};

export default function PackOpeningSummary({
  cards,
  totalDeltaPointsEarned,
  unopenedCount,
  onClose,
  onOpenAnother,
  collectionProgress,
  getLayoutForCard
}: PackOpeningSummaryProps) {
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  const newCardsCount = cards.filter(c => !c.is_duplicate).length;
  const duplicatesCount = cards.filter(c => c.is_duplicate).length;

  // Find the top star card of the pack
  const sortedCards = [...cards].sort((a, b) => {
    const rA = RARITY_RANK[(a.card.rarity || "").toLowerCase()] || 1;
    const rB = RARITY_RANK[(b.card.rarity || "").toLowerCase()] || 1;
    return rB - rA;
  });

  const bestCardItem = sortedCards[0];
  const bestRarity = (bestCardItem?.card?.rarity || "common").toUpperCase();

  // Progress change calculation
  const currentOwned = collectionProgress?.currentOwned || 0;
  const totalCards = collectionProgress?.totalCards || 66;
  const prevOwned = Math.max(0, currentOwned - newCardsCount);

  return (
    <div className="delta-cinematic-summary-stage animate-fadeIn">
      {/* Top Title & Header */}
      <div className="delta-summary-header">
        <div className="delta-summary-badge">
          <CheckCircle2 size={15} className="text-green-400" />
          <span>OTWARCIE ZAKOŃCZONE POMYŚLNIE</span>
        </div>
        <h2 className="delta-summary-title">OTWARTA PACZKA</h2>
        <p className="delta-summary-subtitle">
          Sprawdź trafione karty, nowe zdobycze w klaserze i nagrody za duplikaty!
        </p>
      </div>

      {/* 4 Summary Stat Chips */}
      <div className="delta-summary-stats-grid">
        {/* Stat 1: Postęp Kolekcji */}
        <div className="delta-summary-stat-chip">
          <div className="delta-stat-icon-box progress">
            <Trophy size={18} />
          </div>
          <div>
            <span className="delta-stat-label">POSTĘP KOLEKCJI</span>
            <div className="delta-stat-val-row">
              <span className="delta-stat-old">{prevOwned}</span>
              <span className="delta-stat-arrow">→</span>
              <strong className="delta-stat-new">{currentOwned} / {totalCards}</strong>
            </div>
          </div>
        </div>

        {/* Stat 2: Nowe Karty */}
        <div className="delta-summary-stat-chip">
          <div className="delta-stat-icon-box new">
            <Sparkles size={18} />
          </div>
          <div>
            <span className="delta-stat-label">NOWE KARTY</span>
            <strong className="delta-stat-highlight text-green-400">+{newCardsCount}</strong>
          </div>
        </div>

        {/* Stat 3: Duplikaty & Punkty DP */}
        <div className="delta-summary-stat-chip">
          <div className="delta-stat-icon-box dup">
            <Coins size={18} />
          </div>
          <div>
            <span className="delta-stat-label">DUPLIKATY</span>
            <strong className="delta-stat-highlight text-yellow-400">
              {duplicatesCount} {totalDeltaPointsEarned > 0 ? `(+${totalDeltaPointsEarned} DP)` : ""}
            </strong>
          </div>
        </div>

        {/* Stat 4: Najlepsza Karta */}
        <div className="delta-summary-stat-chip">
          <div className="delta-stat-icon-box best">
            {bestRarity === "INFERNO" ? <Flame size={18} /> : <Crown size={18} />}
          </div>
          <div>
            <span className="delta-stat-label">NAJLEPSZA KARTA</span>
            <strong className="delta-stat-highlight text-yellow-300">
              {bestCardItem?.card?.player?.display_name || bestRarity}
            </strong>
          </div>
        </div>
      </div>

      {/* All Drawn Cards Gallery Grid */}
      <div className="delta-summary-cards-gallery">
        {cards.map((item, idx) => {
          return (
            <div 
              key={idx}
              className={`delta-summary-card-cell ${item.is_duplicate ? "is-dup" : "is-new"}`}
              onClick={() => {
                setSelectedCardIdx(idx);
                cardSound.playFlip();
              }}
            >
              <div className="delta-summary-card-preview">
                <CollectibleCard3D
                  card={item.card}
                  userCard={undefined}
                  isLocked={false}
                  size="md"
                  interactive={true}
                  showFlip={true}
                  layoutOverride={getLayoutForCard ? getLayoutForCard(item.card) : undefined}
                />
              </div>

              <div className="delta-summary-card-footer">
                <span className="delta-summary-pname">
                  {item.card.player?.display_name || item.card.card_name}
                </span>

                {item.is_duplicate ? (
                  <span className="delta-summary-tag dup">
                    DUPLIKAT (+{item.duplicate_points} DP)
                  </span>
                ) : (
                  <span className="delta-summary-tag new">
                    NOWA KARTA (NEW)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions Row */}
      <div className="delta-summary-actions-row">
        {unopenedCount > 0 && onOpenAnother && (
          <button
            type="button"
            onClick={onOpenAnother}
            className="delta-summary-action-btn primary"
          >
            <RefreshCw size={18} />
            <span>OTWÓRZ KOLEJNĄ PACZKĘ ({unopenedCount})</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="delta-summary-action-btn secondary"
        >
          <ArrowLeft size={18} />
          <span>WRÓĆ DO KLASERA</span>
        </button>
      </div>
    </div>
  );
}
