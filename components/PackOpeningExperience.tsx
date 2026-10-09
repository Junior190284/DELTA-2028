"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { PackDefinition, PackOpeningResult, CardDefinition, CardLayoutConfig, preloadAllCardThemes, preloadCardAssets } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import PackOpeningPreOpen from "./pack-opening/PackOpeningPreOpen";
import PackOpeningTear from "./pack-opening/PackOpeningTear";
import PackOpeningCardReveal from "./pack-opening/PackOpeningCardReveal";
import PackOpeningSummary from "./pack-opening/PackOpeningSummary";

interface PackOpeningExperienceProps {
  pack: PackDefinition;
  onClose: () => void;
  onOpenAnother?: () => void;
  unopenedCount?: number;
  collectionProgress?: {
    currentOwned: number;
    totalCards: number;
  };
  getLayoutForCard?: (card?: CardDefinition) => Partial<CardLayoutConfig> | undefined;
  onPackConsumed?: (remainingCount?: number) => void;
}

type OpeningStage = "pre_open" | "tearing" | "revealing" | "summary";

const SESSION_STORAGE_KEY = "delta_active_pack_opening_result";

export default function PackOpeningExperience({
  pack,
  onClose,
  onOpenAnother,
  unopenedCount = 0,
  collectionProgress,
  getLayoutForCard,
  onPackConsumed
}: PackOpeningExperienceProps) {
  const [stage, setStage] = useState<OpeningStage>("pre_open");
  const [loading, setLoading] = useState(false);
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(null);
  const [hasInfernoOrLegend, setHasInfernoOrLegend] = useState(false);

  // Lock body scroll during full-screen pack opening
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    preloadAllCardThemes();

    // Check if there is an uncompleted session opening to safely resume without re-rolling
    try {
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.cards && parsed.cards.length > 0) {
          setOpeningResult(parsed);
          setStage("revealing");
        }
      }
    } catch {}

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Handle Trigger Pack Open (Communication with Backend)
  const handleStartOpening = useCallback(async () => {
    if (loading || stage !== "pre_open") return;
    setLoading(true);

    try {
      const res = await fetch("/api/cards/open-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_type_id: pack.id })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd podczas otwierania paczki.");
      }

      const data: PackOpeningResult = await res.json();
      setOpeningResult(data);

      // Check if pack contains INFERNO or LEGEND for climax anticipation
      const containsClimax = data.cards.some(item => {
        const r = (item.card.rarity || "").toLowerCase();
        const t = (item.card.card_type || "").toLowerCase();
        return r === "inferno" || r === "legendary" || r === "legend" || t.includes("inferno") || t.includes("legend");
      });
      setHasInfernoOrLegend(containsClimax);

      // Save to sessionStorage for safety on refresh
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      } catch {}

      // Inform parent of consumed pack
      if (onPackConsumed && data.remaining_unopened_packs_count !== undefined) {
        onPackConsumed(data.remaining_unopened_packs_count);
      }

      // Preload drawn card assets immediately into GPU memory
      Promise.all(data.cards.map(item => preloadCardAssets(item.card)));

      // Transition to tearing animation
      setStage("tearing");
    } catch (e: any) {
      alert(e.message || "Nie udało się otworzyć paczki. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }, [loading, stage, pack.id, onPackConsumed]);

  // Clean finish handler
  const handleFinalClose = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    onClose();
  };

  const handleFinalOpenAnother = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    if (onOpenAnother) onOpenAnother();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="delta-cinematic-pack-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "#03060a",
        overflow: "hidden",
        isolation: "isolate"
      }}
    >
      {/* 1. Pre-Open Stage */}
      {stage === "pre_open" && (
        <PackOpeningPreOpen
          pack={pack}
          unopenedCount={unopenedCount}
          onOpen={handleStartOpening}
          onClose={handleFinalClose}
          disabled={loading}
        />
      )}

      {/* 2. Cinematic Tearing Stage */}
      {stage === "tearing" && (
        <PackOpeningTear
          pack={pack}
          hasInfernoOrLegend={hasInfernoOrLegend}
          onTearComplete={() => setStage("revealing")}
        />
      )}

      {/* 3. Sequential Card Reveal Stage */}
      {stage === "revealing" && openingResult && (
        <PackOpeningCardReveal
          cards={openingResult.cards}
          onComplete={() => setStage("summary")}
          getLayoutForCard={getLayoutForCard}
        />
      )}

      {/* 4. Final Summary Stage */}
      {stage === "summary" && openingResult && (
        <PackOpeningSummary
          cards={openingResult.cards}
          totalDeltaPointsEarned={openingResult.total_delta_points_earned}
          unopenedCount={unopenedCount}
          onClose={handleFinalClose}
          onOpenAnother={unopenedCount > 0 ? handleFinalOpenAnother : undefined}
          collectionProgress={collectionProgress}
          getLayoutForCard={getLayoutForCard}
        />
      )}
    </div>,
    document.body
  );
}
