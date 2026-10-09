"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronRight, Coins, Star, Flame, Crown, Zap, Shield, Trophy } from "lucide-react";
import { CardDefinition, CardRarity, CardLayoutConfig } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "../CollectibleCard3D";

interface DrawnCardItem {
  card: CardDefinition;
  is_duplicate: boolean;
  duplicate_points: number;
}

interface PackOpeningCardRevealProps {
  cards: DrawnCardItem[];
  onComplete: () => void;
  getLayoutForCard?: (card?: CardDefinition) => Partial<CardLayoutConfig> | undefined;
}

// Helper: Resolve 6-tier rarity
function getRarityStyle(card: CardDefinition): {
  id: "common" | "rare" | "gold" | "matchday" | "inferno" | "legend";
  label: string;
  color: string;
  badgeBg: string;
  glowColor: string;
  isSpecialClimax: boolean;
} {
  const r = (card.rarity || "").toLowerCase();
  const t = (card.card_type || "").toLowerCase();

  if (r === "inferno" || t.includes("inferno")) {
    return {
      id: "inferno",
      label: "INFERNO",
      color: "#ef4444",
      badgeBg: "linear-gradient(135deg, #e31d2f, #f97316)",
      glowColor: "rgba(239, 68, 68, 0.75)",
      isSpecialClimax: true
    };
  }
  if (r === "legendary" || r === "legend" || t.includes("legend") || t.includes("ikona")) {
    return {
      id: "legend",
      label: "LEGEND",
      color: "#c084fc",
      badgeBg: "linear-gradient(135deg, #9333ea, #f1c95c)",
      glowColor: "rgba(192, 132, 252, 0.75)",
      isSpecialClimax: true
    };
  }
  if (r === "gold" || r === "epic" || t.includes("gold") || t.includes("mvp")) {
    return {
      id: "gold",
      label: "GOLD",
      color: "#f1c95c",
      badgeBg: "linear-gradient(135deg, #f1c95c, #ca8a04)",
      glowColor: "rgba(241, 201, 92, 0.65)",
      isSpecialClimax: false
    };
  }
  if (r === "matchday" || t.includes("matchday")) {
    return {
      id: "matchday",
      label: "MATCHDAY",
      color: "#38bdf8",
      badgeBg: "linear-gradient(135deg, #0284c7, #e31d2f)",
      glowColor: "rgba(56, 189, 248, 0.6)",
      isSpecialClimax: false
    };
  }
  if (r === "rare" || t.includes("training") || t.includes("warrior")) {
    return {
      id: "rare",
      label: "RARE",
      color: "#60a5fa",
      badgeBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
      glowColor: "rgba(96, 165, 250, 0.5)",
      isSpecialClimax: false
    };
  }
  return {
    id: "common",
    label: "COMMON",
    color: "#94a3b8",
    badgeBg: "linear-gradient(135deg, #475569, #334155)",
    glowColor: "rgba(148, 163, 184, 0.3)",
    isSpecialClimax: false
  };
}

export default function PackOpeningCardReveal({
  cards,
  onComplete,
  getLayoutForCard
}: PackOpeningCardRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSuspenseTease, setIsSuspenseTease] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const currentItem = cards[currentIndex];
  const totalCards = cards.length;
  const isLastCard = currentIndex === totalCards - 1;

  const currentRarity = currentItem ? getRarityStyle(currentItem.card) : getRarityStyle({} as any);

  // Trigger reveal effects on index change
  useEffect(() => {
    if (!currentItem) return;

    const rInfo = getRarityStyle(currentItem.card);

    if (rInfo.isSpecialClimax) {
      // Best Card Moment: Suspense Tease
      setIsSuspenseTease(true);
      setIsRevealed(false);
      cardSound.playTeaserHit(2);
      cardSound.playHaptic("medium");

      const t1 = setTimeout(() => {
        setIsSuspenseTease(false);
        setIsRevealed(true);
        cardSound.playReveal(rInfo.id === "inferno" ? "inferno" : "legendary");
        cardSound.playHaptic("inferno");
      }, 750);

      return () => clearTimeout(t1);
    } else {
      setIsSuspenseTease(false);
      setIsRevealed(true);
      const mappedRarity = rInfo.id === "gold" ? "epic" : rInfo.id === "rare" || rInfo.id === "matchday" ? "rare" : "common";
      cardSound.playReveal(mappedRarity);
      cardSound.playHaptic("light");
    }
  }, [currentIndex, currentItem]);

  const handleNext = () => {
    if (isSuspenseTease) return;

    if (isLastCard) {
      cardSound.playWalkoutFanfare();
      onComplete();
    } else {
      cardSound.playFlip();
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      // Swiped left -> advance
      handleNext();
    }
    touchStartX.current = null;
  };

  if (!currentItem) return null;

  return (
    <div 
      className={`delta-cinematic-reveal-stage theme-${currentRarity.id} ${isSuspenseTease ? "in-suspense" : "revealed"} animate-fadeIn`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Background Aura based on rarity */}
      <div 
        className="delta-reveal-ambient-aura"
        style={{ background: `radial-gradient(circle at 50% 45%, ${currentRarity.glowColor} 0%, transparent 70%)` }}
      />

      {/* Top Header Progress */}
      <div className="delta-reveal-top-progress">
        <div className="delta-reveal-counter-badge">
          <span>KARTA {currentIndex + 1} Z {totalCards}</span>
        </div>

        {/* Mini progress dots */}
        <div className="delta-reveal-dots">
          {cards.map((_, idx) => (
            <span
              key={idx}
              className={`delta-reveal-dot ${idx === currentIndex ? "active" : idx < currentIndex ? "passed" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Main Central Card Presentation */}
      <div 
        className="delta-reveal-card-presentation cursor-pointer"
        onClick={handleNext}
      >
        {/* Suspense Teaser Effect for INFERNO / LEGEND */}
        {isSuspenseTease && (
          <div className="delta-reveal-suspense-overlay animate-pulse">
            <div className="delta-suspense-flare" style={{ borderColor: currentRarity.color }} />
            <div className="delta-suspense-label" style={{ color: currentRarity.color }}>
              ⚡ UWAGA! ODKRYWASZ KARTĘ {currentRarity.label}...
            </div>
          </div>
        )}

        {/* 3D Card Display */}
        <div className={`delta-reveal-card-box ${isRevealed ? "card-unveiled" : "card-veiled"}`}>
          <CollectibleCard3D
            card={currentItem.card}
            userCard={undefined}
            isLocked={false}
            size="xl"
            interactive={false}
            showFlip={false}
            layoutOverride={getLayoutForCard ? getLayoutForCard(currentItem.card) : undefined}
          />
        </div>

        {/* Status Badges Overlay (NEW / DUPLIKAT & Rarity) */}
        {isRevealed && !isSuspenseTease && (
          <div className="delta-reveal-status-pills-row animate-slideUp">
            {/* Rarity Pill */}
            <span 
              className="delta-reveal-badge rarity"
              style={{ background: currentRarity.badgeBg }}
            >
              {currentRarity.id === "inferno" && <Flame size={12} className="inline mr-1" />}
              {currentRarity.id === "legend" && <Crown size={12} className="inline mr-1" />}
              {currentRarity.label}
            </span>

            {/* Ownership State (NEW vs DUPLIKAT) */}
            {currentItem.is_duplicate ? (
              <span className="delta-reveal-badge duplicate">
                <Coins size={12} className="inline mr-1" />
                DUPLIKAT (+{currentItem.duplicate_points} DP)
              </span>
            ) : (
              <span className="delta-reveal-badge new">
                <Sparkles size={12} className="inline mr-1" />
                NOWA W KOLEKCJI (NEW)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Navigation Action */}
      <div className="delta-reveal-bottom-actions">
        <button
          type="button"
          disabled={isSuspenseTease}
          onClick={handleNext}
          className="delta-reveal-next-btn"
        >
          <span>{isLastCard ? "ZOBACZ PODSUMOWANIE PACZKI" : "ODKRYJ NASTĘPNĄ KARTĘ"}</span>
          <ChevronRight size={18} />
        </button>

        <span className="delta-reveal-bottom-hint">
          Kliknij w kartę lub przeciągnij palcem, aby przejść dalej
        </span>
      </div>
    </div>
  );
}
