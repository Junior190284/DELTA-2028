"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Sparkles, 
  Gift, 
  X, 
  RotateCw, 
  ChevronRight, 
  CheckCircle2, 
  Flame, 
  Crown, 
  Star, 
  Award, 
  FastForward, 
  Layers,
  AlertCircle
} from "lucide-react";
import { 
  PackDefinition, 
  PackOpeningResult, 
  CardDefinition, 
  UserCard, 
  CardLayoutConfig,
  getPackImageUrl 
} from "@/lib/cards/types";
import { DeltaCard } from "@/components/cards";
import { DeltaCardModel, adaptLegacyToDeltaCardModel, DELTA_THEME_CONFIGS } from "@/lib/cards/deltaCardModel";
import { CardDetailModal } from "@/components/collection";
import { cardSound } from "@/lib/cards/audio";
import { dispatchPackOpened, dispatchCollectionUpdated } from "@/lib/cards/cardSync";

export type PackFlowPhase = 
  | "PACK_READY"
  | "PACK_OPENING_SERVER"
  | "PACK_TEAR"
  | "RARITY_TEASE"
  | "CARD_REVEAL"
  | "SUMMARY";

export interface DeltaPackOpeningProps {
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
  // Mock mode for Dev Preview
  mockResult?: PackOpeningResult;
}

export default function DeltaPackOpeningExperience({
  pack,
  onClose,
  onOpenAnother,
  unopenedCount = 0,
  collectionProgress,
  getLayoutForCard,
  onPackConsumed,
  mockResult
}: DeltaPackOpeningProps) {
  const [phase, setPhase] = useState<PackFlowPhase>("PACK_READY");
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(mockResult || null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [inspectedCard, setInspectedCard] = useState<DeltaCardModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
    }
  }, []);

  // Lock body scroll during full-screen pack opening
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Convert drawn cards to DeltaCardModels
  const drawnCardModels: { model: DeltaCardModel; isDuplicate: boolean; duplicatePoints: number }[] = useMemo(() => {
    if (!openingResult || !openingResult.cards) return [];
    return openingResult.cards.map(item => ({
      model: adaptLegacyToDeltaCardModel({
        card: item.card,
        player: item.card.player,
        layoutOverride: getLayoutForCard ? getLayoutForCard(item.card) : undefined,
        isLocked: false
      }),
      isDuplicate: item.is_duplicate,
      duplicatePoints: item.duplicate_points
    }));
  }, [openingResult, getLayoutForCard]);

  // Current Card for Reveal
  const currentDrawnCard = drawnCardModels[currentCardIndex] || null;

  // Highest Rarity in the Pack for Tease & Climax
  const highestRarityTheme = useMemo(() => {
    if (drawnCardModels.length === 0) return "STANDARD";
    const themes = drawnCardModels.map(c => c.model.cardType);
    if (themes.includes("INFERNO")) return "INFERNO";
    if (themes.includes("DELTA_ICON")) return "DELTA_ICON";
    if (themes.includes("GOLD_MASTER")) return "GOLD_MASTER";
    if (themes.includes("MATCHDAY_HERO")) return "MATCHDAY_HERO";
    if (themes.includes("CAPTAIN")) return "CAPTAIN";
    if (themes.includes("GOAL_MACHINE")) return "GOAL_MACHINE";
    if (themes.includes("TRAINING_HERO")) return "TRAINING_HERO";
    return "STANDARD";
  }, [drawnCardModels]);

  const highestThemeConfig = DELTA_THEME_CONFIGS[highestRarityTheme] || DELTA_THEME_CONFIGS.STANDARD;

  // 1. Trigger Open Pack (Backend Call)
  const handleOpenPack = async () => {
    if (phase !== "PACK_READY") return;
    setErrorMessage(null);
    setPhase("PACK_OPENING_SERVER");

    // If mock result passed (dev preview)
    if (mockResult) {
      setTimeout(() => {
        setOpeningResult(mockResult);
        cardSound?.playPackTear?.();
        setPhase(prefersReducedMotion ? "SUMMARY" : "PACK_TEAR");
      }, 500);
      return;
    }

    try {
      const res = await fetch("/api/cards/open-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_type_id: pack.id })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 409 || errJson.error?.includes("już otwarta") || errJson.error?.includes("ALREADY_OPENED")) {
          // ALREADY_OPENED: Do NOT decrement count, do NOT emit as new opening
          dispatchCollectionUpdated("already_opened_reconciliation");
          throw new Error("ALREADY_OPENED: Ta paczka została już wcześniej otwarta.");
        }
        throw new Error(errJson.error || `Błąd otwierania paczki (Status ${res.status})`);
      }

      const data: PackOpeningResult = await res.json();
      setOpeningResult(data);

      // IMMEDIATE STATE SYNCHRONIZATION (Server is Source of Truth)
      // Synchronize remaining unopened packs count & collection state IMMEDIATELY upon backend success
      if (onPackConsumed) {
        onPackConsumed(data.remaining_unopened_packs_count);
      }
      dispatchPackOpened({
        pack_type_id: pack.id,
        consumed_pack_id: data.consumed_pack_id,
        remaining_unopened_packs_count: data.remaining_unopened_packs_count,
        total_delta_points_earned: data.total_delta_points_earned,
        new_points_balance: data.new_points_balance,
        drawn_card_ids: (data.cards || []).map(c => c.card.id)
      });
      dispatchCollectionUpdated("pack_opening_success");

      cardSound?.playPackTear?.();
      setPhase(prefersReducedMotion ? "SUMMARY" : "PACK_TEAR");
    } catch (err: any) {
      console.error("Pack opening error:", err);
      setErrorMessage(err.message || "Błąd połączenia. Spróbuj ponownie.");
      setPhase("PACK_READY");
    }
  };

  // Transition from Tear -> Tease -> Reveal
  useEffect(() => {
    if (phase === "PACK_TEAR") {
      const timer = setTimeout(() => {
        setPhase("RARITY_TEASE");
      }, 1200);
      return () => clearTimeout(timer);
    }
    if (phase === "RARITY_TEASE") {
      const timer = setTimeout(() => {
        cardSound?.playWalkoutFanfare?.();
        setPhase("CARD_REVEAL");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Skip / Reveal All
  const handleRevealAll = useCallback(() => {
    setPhase("SUMMARY");
  }, []);

  // Next Card in Reveal
  const handleNextCard = () => {
    if (currentCardIndex + 1 < drawnCardModels.length) {
      setCurrentCardIndex(prev => prev + 1);
      cardSound?.playFlip?.();
    } else {
      setPhase("SUMMARY");
    }
  };

  if (typeof document === "undefined") return null;

  const packImage = getPackImageUrl(pack.id, pack.theme);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-opening-title"
      className="fixed inset-0 z-[999999] bg-[#020408] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <div className="relative z-30 flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/teamlogos/gm.png"
            alt="DELTA"
            className="w-8 h-8 object-contain filter drop-shadow(0 0 10px rgba(255,255,255,0.4))"
          />
          <div>
            <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">
              OTWIERANIE PACZKI DELTA
            </span>
            <h2 id="pack-opening-title" className="text-sm md:text-base font-black text-white uppercase truncate">
              {pack.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Skip / Reveal All Button (Always available during animations) */}
          {phase !== "PACK_READY" && phase !== "SUMMARY" && (
            <button
              onClick={handleRevealAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-400/40 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Pomiń Animację</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 0 & 1: PACK READY / SERVER OPENING                                 */}
      {/* ========================================================================= */}
      {(phase === "PACK_READY" || phase === "PACK_OPENING_SERVER") && (
        <div className="relative flex-1 flex flex-col items-center justify-center p-4 text-center space-y-6">
          {/* Atmospheric Lights */}
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Booster Pack 3D Card Visual */}
          <div className="relative group max-w-[260px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/20 transition-transform duration-300 hover:scale-105">
            <img
              src={packImage}
              alt={pack.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-left">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                {pack.cards_count} Kart w Paczce
              </span>
              <h3 className="text-base font-black text-white">{pack.name}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs md:text-sm text-slate-400 max-w-sm">
            {pack.description || "Gwarantowane karty zawodników rocznika 2018."}
          </p>

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs max-w-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Open Button */}
          <button
            onClick={handleOpenPack}
            disabled={phase === "PACK_OPENING_SERVER"}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-[1000] text-sm md:text-base uppercase tracking-wider shadow-2xl shadow-orange-500/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {phase === "PACK_OPENING_SERVER" ? "Otwieranie..." : "Otwórz Paczkę 📦"}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2 & 3: TEAR & RARITY TEASE / WALKOUT                               */}
      {/* ========================================================================= */}
      {(phase === "PACK_TEAR" || phase === "RARITY_TEASE") && (
        <div className="relative flex-1 flex flex-col items-center justify-center p-4 text-center">
          {/* Full-screen Volumetric Climax Glow */}
          <div
            className="absolute inset-0 filter blur-3xl opacity-40 animate-pulse pointer-events-none"
            style={{ backgroundColor: highestThemeConfig.primaryColor }}
          />

          {phase === "PACK_TEAR" ? (
            <div className="space-y-4 animate-bounce">
              <div className="relative w-48 h-72 rounded-2xl border-2 border-white/40 shadow-2xl overflow-hidden animate-pulse">
                <img src={packImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 top-1/3 h-1 bg-white shadow-[0_0_20px_#fff]" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Rozdzieranie folii...
              </span>
            </div>
          ) : (
            /* Rarity Tease & Walkout Announcement */
            <div className="space-y-4 animate-fadeIn">
              <div
                className="px-4 py-1.5 rounded-full text-xs font-[1000] uppercase tracking-widest border inline-flex items-center gap-2 shadow-2xl"
                style={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  borderColor: highestThemeConfig.primaryColor,
                  color: highestThemeConfig.fontAccentColor
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>WYKRYTO: {highestThemeConfig.label}</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-[1000] tracking-tight uppercase text-white animate-pulse">
                {highestThemeConfig.badgePill}
              </h2>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4: CARD REVEAL                                                     */}
      {/* ========================================================================= */}
      {phase === "CARD_REVEAL" && currentDrawnCard && (
        <div className="relative flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
          {/* Card Count Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-xs font-mono font-bold text-slate-300">
            <span>Karta {currentCardIndex + 1} z {drawnCardModels.length}</span>
          </div>

          {/* New / Duplicate Pill */}
          <div className="flex items-center gap-2">
            {currentDrawnCard.isDuplicate ? (
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-black uppercase tracking-wider">
                {currentDrawnCard.duplicatePoints && currentDrawnCard.duplicatePoints > 0
                  ? `DUPLIKAT (+${currentDrawnCard.duplicatePoints} DP)`
                  : "DUPLIKAT"}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-wider">
                ✨ NOWA KARTA
              </span>
            )}
          </div>

          {/* Central Hero DeltaCard */}
          <div 
            style={{
              width: "min(75vw, 260px)",
              aspectRatio: "2 / 3"
            }}
            className="animate-fadeIn"
          >
            <DeltaCard
              card={currentDrawnCard.model}
              size="responsive"
              interactive={true}
              showFlip={true}
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleNextCard}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <span>{currentCardIndex + 1 < drawnCardModels.length ? "Następna Karta" : "Zobacz Podsumowanie"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 5: SUMMARY STAGE                                                   */}
      {/* ========================================================================= */}
      {phase === "SUMMARY" && openingResult && (
        <div className="relative flex-1 flex flex-col justify-between p-4 md:p-6 max-w-5xl mx-auto w-full overflow-y-auto space-y-6">
          {/* Summary Banner */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Paczka Otwarta Pomyślnie</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-[1000] uppercase text-white">
              Trafione Karty ({drawnCardModels.length})
            </h2>
            {openingResult.total_delta_points_earned > 0 && (
              <p className="text-xs text-amber-400 font-bold">
                Zdobyto +{openingResult.total_delta_points_earned} Delta Points za duplikaty!
              </p>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {drawnCardModels.map(({ model, isDuplicate, duplicatePoints }, idx) => (
              <div
                key={`${model.id}_${idx}`}
                onClick={() => setInspectedCard(model)}
                className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105"
              >
                {/* Status Badge */}
                <div className="absolute -top-2 z-30">
                  {isDuplicate ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[9px] font-black uppercase shadow-md">
                      DUPLIKAT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black uppercase shadow-md">
                      NOWA
                    </span>
                  )}
                </div>

                <div className="w-full aspect-[2/3]">
                  <DeltaCard
                    card={model}
                    size="responsive"
                    interactive={false}
                    showFlip={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Tray */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs md:text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              Do Kolekcji
            </button>

            {onOpenAnother && unopenedCount > 0 && (
              <button
                onClick={onOpenAnother}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Otwórz Kolejną Paczkę ({unopenedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Shared Detail Modal */}
      <CardDetailModal
        card={inspectedCard}
        isOpen={!!inspectedCard}
        onClose={() => setInspectedCard(null)}
      />
    </div>,
    document.body
  );
}
