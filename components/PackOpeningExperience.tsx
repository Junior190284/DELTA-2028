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
import dynamic from "next/dynamic";
import { CardDetailModal } from "@/components/collection";
import { cardSound } from "@/lib/cards/audio";
import { dispatchPackOpened, dispatchCollectionUpdated } from "@/lib/cards/cardSync";
import InfernoWalkoutReveal from "@/components/InfernoWalkoutReveal";
import { cardToWalkoutData, normalizeCardTheme, WALKOUT_PRESENTATION_PRIORITY } from "@/lib/cards/walkout-config";

// Dynamic import: Only loaded when 3D Walkout is activated and walkout phase is triggered
const UniversalWalkoutModal = dynamic(
  () => import("@/components/collection-3d/UniversalWalkoutModal"),
  { ssr: false }
);

export type PackFlowPhase = 
  | "PACK_READY"
  | "PACK_OPENING_SERVER"
  | "PACK_TEAR"
  | "WALKOUT"
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
  // Architecture hook: future "DELTA INFERNO PACK OPENING" video support
  videoOpeningUrl?: string;
  enableVideoPackOpening?: boolean;
  autoStart?: boolean;
}

export default function DeltaPackOpeningExperience({
  pack,
  onClose,
  onOpenAnother,
  unopenedCount = 0,
  collectionProgress,
  getLayoutForCard,
  onPackConsumed,
  mockResult,
  videoOpeningUrl,
  enableVideoPackOpening = false,
  autoStart = false
}: DeltaPackOpeningProps) {
  const [phase, setPhase] = useState<PackFlowPhase>("PACK_READY");
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(mockResult || null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [inspectedCard, setInspectedCard] = useState<DeltaCardModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoTearError, setVideoTearError] = useState(false);

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

  // Auto-start pack opening if requested (e.g. dev test launcher)
  useEffect(() => {
    if (autoStart && phase === "PACK_READY") {
      const timer = setTimeout(() => {
        handleOpenPack();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoStart, phase]);

  // 6. Best card selection using purely canonical theme presentation priority (no OVR, no fake rarity)
  const walkoutCardData = useMemo(() => {
    if (!openingResult || !openingResult.cards || openingResult.cards.length === 0) return null;
    
    const eligible = openingResult.cards
      .map((item, index) => {
        const theme = normalizeCardTheme(item.card.card_type || item.card.frame_theme);
        const priority = WALKOUT_PRESENTATION_PRIORITY[theme] || 0;
        return { item, index, theme, priority };
      })
      .filter(x => x.priority > 0);

    if (eligible.length === 0) return null;

    // Sort strictly by presentation priority (highest priority first)
    eligible.sort((a, b) => b.priority - a.priority);
    const best = eligible[0];

    return {
      data: cardToWalkoutData(best.item.card),
      cardIndex: best.index,
      theme: best.theme,
      rawCard: best.item.card,
      isDuplicate: best.item.is_duplicate,
      duplicatePoints: best.item.duplicate_points
    };
  }, [openingResult]);

  // Transition from Tear -> Walkout -> Card Reveal -> Summary
  useEffect(() => {
    if (phase === "PACK_TEAR") {
      const timer = setTimeout(() => {
        if (walkoutCardData) {
          setPhase("WALKOUT");
        } else {
          setPhase("CARD_REVEAL");
        }
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [phase, walkoutCardData]);

  // Handle Walkout Complete -> Move to next cards or summary
  const handleWalkoutComplete = useCallback(() => {
    if (drawnCardModels.length > 1) {
      // If walkout was for card at index 0, start card reveal from next card or let user browse all
      setCurrentCardIndex(0);
      setPhase("CARD_REVEAL");
    } else {
      setPhase("SUMMARY");
    }
  }, [drawnCardModels.length]);

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
      className="fixed inset-0 z-[9999999] bg-[#020408] text-white flex flex-col justify-between overflow-hidden select-none isolate"
      style={{ isolation: "isolate", background: "#020408", width: "100vw", height: "100dvh" }}
    >
      {/* Top Header Bar (Hidden during WALKOUT as walkout modals manage their own header) */}
      {phase !== "WALKOUT" && (
        <div 
          className="relative z-30 flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-black/40 backdrop-blur-md"
          style={{
            minHeight: "56px",
            maxHeight: "74px",
            padding: "10px 18px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <img
              src="/teamlogos/gm.png"
              alt="DELTA"
              className="w-8 h-8 object-contain filter drop-shadow(0 0 10px rgba(255,255,255,0.4)) pack-experience-header-crest"
              style={{
                width: "clamp(34px, 7vw, 42px)",
                height: "clamp(34px, 7vw, 42px)",
                maxWidth: "90px",
                maxHeight: "90px",
                objectFit: "contain",
                flexShrink: 0
              }}
            />
            <div style={{ minWidth: 0 }}>
              <span 
                className="text-[10px] font-black tracking-widest text-amber-400 uppercase block"
                style={{ fontSize: "10px", fontWeight: 900, color: "#fbbf24", letterSpacing: "1px", textTransform: "uppercase", display: "block" }}
              >
                OTWIERANIE PACZKI DELTA
              </span>
              <h2 
                id="pack-opening-title" 
                className="text-sm md:text-base font-black text-white uppercase truncate"
                style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#ffffff", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {pack.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {/* Skip / Reveal All Button (Always available during animations) */}
            {phase !== "PACK_READY" && phase !== "SUMMARY" && (
              <button
                onClick={handleRevealAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-400/40 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px clamp(8px, 1.8vw, 14px)",
                  borderRadius: "10px",
                  background: "rgba(15, 23, 42, 0.9)",
                  color: "#fcd34d",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  flexShrink: 0
                }}
                aria-label="Pomiń animację otwierania"
                title="Pomiń animację i przejdź do kart"
              >
                <FastForward className="w-3.5 h-3.5 shrink-0" style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                <span className="hidden sm:inline">Pomiń Animację</span>
                <span className="inline sm:hidden">Pomiń</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" style={{ width: "18px", height: "18px" }} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 0 & 1: PACK READY / SERVER OPENING                                 */}
      {/* ========================================================================= */}
      {(phase === "PACK_READY" || phase === "PACK_OPENING_SERVER") && (
        <div 
          className="relative flex-1 flex flex-col items-center justify-center p-4 text-center space-y-6"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: "1 1 auto",
            padding: "16px",
            gap: "18px",
            position: "relative"
          }}
        >
          {/* Atmospheric Lights */}
          <div 
            className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" 
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />

          {/* Booster Pack 3D Card Visual */}
          <div 
            className="relative group max-w-[260px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/20 transition-transform duration-300 hover:scale-105"
            style={{
              width: "min(240px, 62vw)",
              height: "min(360px, 46vh)",
              maxWidth: "260px",
              maxHeight: "390px",
              aspectRatio: "2 / 3",
              borderRadius: "16px",
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              flexShrink: 0
            }}
          >
            <img
              src={packImage}
              alt={pack.name}
              className="w-full h-full object-cover"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              }}
              loading="eager"
            />
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-left"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "16px",
                textAlign: "left"
              }}
            >
              <span 
                className="text-[10px] font-black uppercase text-amber-400 tracking-wider"
                style={{ fontSize: "10px", fontWeight: 900, color: "#fbbf24", letterSpacing: "1px", textTransform: "uppercase" }}
              >
                {pack.cards_count} Kart w Paczce
              </span>
              <h3 
                className="text-base font-black text-white"
                style={{ margin: "4px 0 0 0", fontSize: "16px", fontWeight: 900, color: "#ffffff" }}
              >
                {pack.name}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p 
            className="text-xs md:text-sm text-slate-400 max-w-sm"
            style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "380px", margin: 0, lineHeight: 1.5 }}
          >
            {pack.description || "Gwarantowane karty zawodników rocznika 2018."}
          </p>

          {/* Error Banner if any */}
          {errorMessage && (
            <div 
              className="flex items-center gap-2 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs max-w-md"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(69, 10, 10, 0.8)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fecaca", fontSize: "12px", maxWidth: "380px" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" style={{ width: "16px", height: "16px", flexShrink: 0, color: "#f87171" }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Open Button */}
          <button
            onClick={handleOpenPack}
            disabled={phase === "PACK_OPENING_SERVER"}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-[1000] text-sm md:text-base uppercase tracking-wider shadow-2xl shadow-orange-500/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{
              padding: "14px 32px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #dc2626 100%)",
              color: "#020617",
              fontWeight: 900,
              fontSize: "14px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(234, 88, 12, 0.4)",
              transition: "transform 0.15s ease"
            }}
          >
            {phase === "PACK_OPENING_SERVER" ? "Otwieranie..." : "Otwórz Paczkę 📦"}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: PACK TEARING / CINEMATIC VIDEO PACK OPENING                       */}
      {/* ========================================================================= */}
      {phase === "PACK_TEAR" && (
        <div 
          className="relative flex-1 flex flex-col items-center justify-center p-4 text-center overflow-hidden"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: "1 1 auto",
            position: "relative",
            overflow: "hidden",
            padding: "20px"
          }}
        >
          {/* Architecture Hook: Future "DELTA INFERNO PACK OPENING" video player */}
          {(enableVideoPackOpening || videoOpeningUrl) && !videoTearError ? (
            <div className="absolute inset-0 z-20 bg-black flex items-center justify-center overflow-hidden">
              <video
                src={videoOpeningUrl || (pack.theme === "inferno" ? "/media/walkouts/inferno-pack-opening.mp4" : undefined)}
                autoPlay
                playsInline
                muted={false}
                onEnded={() => {
                  if (walkoutCardData) setPhase("WALKOUT");
                  else setPhase("CARD_REVEAL");
                }}
                onError={() => {
                  console.warn("Video pack opening failed or not found, falling back to animated tear");
                  setVideoTearError(true);
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (walkoutCardData) setPhase("WALKOUT");
                    else setPhase("CARD_REVEAL");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Pomiń Wideo</span>
                </button>
              </div>
            </div>
          ) : (
            /* Canonical Interactive CSS Pack Tearing Animation */
            <>
              {/* Full-screen Volumetric Climax Glow (Radial halo centered behind pack) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${highestThemeConfig.primaryColor}33 0%, ${highestThemeConfig.primaryColor}15 45%, transparent 75%)`,
                  filter: "blur(32px)"
                }}
              />

              <div 
                className="space-y-4 animate-bounce"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "16px"
                }}
              >
                <div 
                  className="relative rounded-2xl border-2 border-white/40 shadow-2xl overflow-hidden animate-pulse mx-auto"
                  style={{
                    width: "min(200px, 60vw)",
                    height: "min(300px, 45vh)",
                    aspectRatio: "2 / 3",
                    borderRadius: "16px",
                    position: "relative",
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.4)",
                    boxShadow: "0 0 40px rgba(251, 191, 36, 0.5)",
                    flexShrink: 0
                  }}
                >
                  <img 
                    src={packImage} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div 
                    className="absolute inset-x-0 top-1/3 h-1 bg-white shadow-[0_0_20px_#fff]"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "33%",
                      height: "4px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 0 20px #ffffff"
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-black uppercase tracking-widest text-amber-400"
                  style={{ fontSize: "12px", fontWeight: 900, color: "#fbbf24", letterSpacing: "2px", textTransform: "uppercase" }}
                >
                  Rozdzieranie folii...
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: WALKOUT CINEMATIC SEQUENCE                                       */}
      {/* ========================================================================= */}
      {phase === "WALKOUT" && walkoutCardData && (
        openingResult?.enable_3d_walkout === true ? (
          <UniversalWalkoutModal
            card={walkoutCardData.rawCard}
            isDuplicate={walkoutCardData.isDuplicate}
            duplicatePoints={walkoutCardData.duplicatePoints}
            onComplete={handleWalkoutComplete}
            onSkip={handleRevealAll}
            onClose={handleWalkoutComplete}
          />
        ) : (
          <InfernoWalkoutReveal
            data={walkoutCardData.data}
            isEmbedded={false}
            onCollect={handleWalkoutComplete}
            onSkip={handleRevealAll}
            onClose={handleWalkoutComplete}
          />
        )
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
        <div 
          className="relative flex-1 flex flex-col items-center p-4 md:p-6 max-w-5xl mx-auto w-full overflow-y-auto min-h-0"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: "1 1 0%",
            minHeight: 0,
            width: "100%",
            maxWidth: "1040px",
            margin: "0 auto",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "clamp(12px, 2vw, 24px)",
            paddingBottom: "max(36px, env(safe-area-inset-bottom))"
          }}
        >
          {/* Summary Banner */}
          <div className="text-center space-y-1 mb-4 md:mb-6 shrink-0" style={{ textAlign: "center", marginBottom: "20px", flexShrink: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Paczka Otwarta Pomyślnie</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-[1000] uppercase text-white mt-2">
              Trafione Karty ({drawnCardModels.length})
            </h2>
            {openingResult.total_delta_points_earned > 0 && (
              <p className="text-xs text-amber-400 font-bold mt-1">
                Zdobyto +{openingResult.total_delta_points_earned} Delta Points za duplikaty!
              </p>
            )}
          </div>

          {/* Cards Group - Centered Flex Container for 3, 5, 6 cards */}
          <div 
            className="flex flex-wrap items-start justify-center gap-3 md:gap-5 pb-6 w-full mx-auto"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: "16px",
              width: "100%",
              maxWidth: "1000px",
              margin: "0 auto",
              paddingBottom: "16px"
            }}
          >
            {drawnCardModels.map(({ model, isDuplicate, duplicatePoints }, idx) => (
              <div
                key={`${model.id}_${idx}`}
                onClick={() => setInspectedCard(model)}
                className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "clamp(135px, calc(50% - 12px), 165px)",
                  maxWidth: "175px",
                  flex: "0 0 auto"
                }}
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

                {/* Player Name & Number Plate under card in normal document flow */}
                <div 
                  className="mt-2 text-center w-full px-1 space-y-0.5 pointer-events-none"
                  style={{
                    marginTop: "8px",
                    textAlign: "center",
                    width: "100%",
                    pointerEvents: "none"
                  }}
                >
                  <div 
                    className="text-xs font-black uppercase text-white truncate tracking-wider"
                    style={{
                      fontSize: "12px",
                      fontWeight: 900,
                      color: "#ffffff",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {model.playerName}
                  </div>
                  <div 
                    className="text-[10px] font-bold text-amber-400/90 truncate"
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "rgba(251, 191, 36, 0.9)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    #{model.shirtNumber || "GM"} • {model.position || model.cardType}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Tray - Pinned at bottom of content with generous clearance */}
          <div 
            className="flex flex-wrap items-center justify-center gap-4 pt-6 pb-6 border-t border-white/10 w-full shrink-0"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              width: "100%",
              paddingTop: "24px",
              paddingBottom: "24px",
              marginTop: "auto",
              flexShrink: 0
            }}
          >
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
