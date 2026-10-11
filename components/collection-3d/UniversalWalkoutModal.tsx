"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Volume2, 
  VolumeX, 
  FastForward, 
  RotateCcw, 
  Check, 
  RotateCw
} from "lucide-react";
import { CardDefinition } from "@/lib/cards/types";
import { fromProductionCard } from "./adapter";
import { getCardVisualTheme } from "./themes";
import { Stage3DEngine } from "./Stage3DEngine";
import { Card3DEngine } from "./Card3DEngine";
import { useWalkoutEngine } from "./walkoutEngine";
import { formatPlayerName } from "./specialTitles";

export interface UniversalWalkoutModalProps {
  card: CardDefinition;
  isDuplicate?: boolean;
  duplicatePoints?: number;
  onComplete?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  autoStart?: boolean;
}

export default function UniversalWalkoutModal({
  card,
  isDuplicate = false,
  duplicatePoints = 0,
  onComplete,
  onSkip,
  onClose,
  autoStart = true
}: UniversalWalkoutModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe adapter bridge: converts CardDefinition -> PlayerCardData with fallbacks
  const card3DData = useMemo(() => {
    if (!card) return null;
    return fromProductionCard(card, {
      isDuplicate,
      duplicatePoints
    });
  }, [card, isDuplicate, duplicatePoints]);

  // Visual Theme resolution (INFERNO, GOLD, MATCHDAY, LEGEND, RARE, COMMON)
  const currentTheme = useMemo(() => {
    if (!card3DData) return null;
    return getCardVisualTheme(card3DData.visualType);
  }, [card3DData]);

  // Unified Walkout Engine (handles 12s monotonic timeline & audio for all categories)
  const walkout = useWalkoutEngine({
    themeId: card3DData?.visualType ?? "INFERNO_ULTRA",
    rarity: card3DData?.rarity ?? "INFERNO",
    autoStart
  });

  const isPostReveal = walkout.phase === "hero" || walkout.phase === "completed";

  // Display name resolution
  const displayName = useMemo(() => {
    if (!card) return "ZAWODNIK";
    return card.player?.display_name || card.title || card.card_name || card3DData?.surname || "ZAWODNIK";
  }, [card, card3DData]);

  // Name formatting for long surnames (e.g. BRZĘCZYSZCZYKIEWICZ)
  const formattedName = useMemo(() => {
    if (!card3DData) return { lines: [""], isMultiLine: false, lengthCategory: "short" as const, charCount: 0 };
    return formatPlayerName(card3DData.surname);
  }, [card3DData]);

  // Skip handler: If in animation, jump to hero shot. If already at hero shot, complete flow.
  const handleSkipOrNext = useCallback(() => {
    if (isPostReveal) {
      if (onSkip) onSkip();
      else if (onComplete) onComplete();
    } else {
      walkout.skip();
    }
  }, [isPostReveal, walkout, onSkip, onComplete]);

  // Keyboard shortcut: Escape to close / skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
      } else if (e.key === " " || e.key === "Enter") {
        if (isPostReveal && onComplete) {
          onComplete();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onComplete, isPostReveal]);

  if (!mounted || typeof document === "undefined" || !card3DData || !currentTheme) {
    return null;
  }

  const primaryColor = currentTheme.styling.primaryColor;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Walkout karty 3D: ${displayName}`}
      className="fixed inset-0 z-[999999] bg-[#020408] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* ========================================================================= */}
      {/* 1. UNIVERSAL STAGE & 3D CARD ENGINE                                       */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0">
        <Stage3DEngine
          theme={currentTheme}
          lightingMode="dynamic"
          isShockwaving={walkout.isShockwaving}
          isFlashing={walkout.isFlashing}
          isPulsing={walkout.isPulsing}
          isScreenShaking={walkout.isScreenShaking}
          stadiumZoom={walkout.currentTime > 0}
          ribbonText={`${currentTheme.displayName} • ${card3DData.surname}`}
        >
          <div 
            style={{
              position: "relative",
              zIndex: 10,
              transform: isPostReveal ? "scale(1.12)" : "scale(1.0)",
              transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <Card3DEngine
              data={card3DData}
              theme={currentTheme}
              yaw={walkout.yaw}
              pitch={walkout.pitch}
              isFlipped={walkout.isFlipped}
              interactive={isPostReveal}
              autoRotate={walkout.autoRotate}
              isRevealing={walkout.phase === "reveal"}
              onRotationChange={(y, p) => {
                walkout.setYaw(y);
                walkout.setPitch(p);
              }}
            />
          </div>
        </Stage3DEngine>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HUD (Brand, Rarity Pill, Controls)                                 */}
      {/* ========================================================================= */}
      <header className="relative z-30 flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/teamlogos/gm.png"
            alt="DELTA"
            className="w-8 h-8 object-contain filter drop-shadow(0 0 10px rgba(255,255,255,0.4))"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                DELTA COLLECTION 3D
              </span>
              <span 
                className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border"
                style={{
                  backgroundColor: `${primaryColor}22`,
                  borderColor: primaryColor,
                  color: primaryColor
                }}
              >
                {currentTheme.displayName}
              </span>
            </div>
            <h2 className="text-sm md:text-base font-black text-white uppercase truncate">
              {displayName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Sound Toggle Button */}
          <button
            onClick={walkout.toggleMute}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              walkout.isMuted
                ? "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"
                : "bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            }`}
            aria-label={walkout.isMuted ? "Włącz dźwięk" : "Wycisz dźwięk"}
            title={walkout.isMuted ? "Włącz dźwięk" : "Wycisz dźwięk"}
          >
            {walkout.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Skip / Fast Forward Button */}
          {!isPostReveal && (
            <button
              onClick={handleSkipOrNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-400/40 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Pomiń</span>
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose || onComplete}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. BOTTOM HERO PANEL & ACTIONS (Revealed at culmination)                   */}
      {/* ========================================================================= */}
      <footer className="relative z-30 p-4 md:p-6 flex flex-col items-center">
        {isPostReveal ? (
          <div className="w-full max-w-xl mx-auto flex flex-col items-center space-y-4 animate-fadeIn">
            {/* Player details & duplicate banner */}
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-slate-300">
                  {card3DData.position}
                </span>
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                  style={{
                    backgroundColor: `${primaryColor}22`,
                    borderColor: primaryColor,
                    color: primaryColor
                  }}
                >
                  OVR {card3DData.ovr}
                </span>

                {/* Duplicate Pill */}
                {card3DData.isDuplicate && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                    {card3DData.duplicatePoints && card3DData.duplicatePoints > 0
                      ? `DUPLIKAT (+${card3DData.duplicatePoints} DP)`
                      : "DUPLIKAT"}
                  </span>
                )}
              </div>

              <h1 
                className={`font-black uppercase tracking-tight text-white leading-tight ${
                  formattedName.lengthCategory === "extra-long" ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"
                }`}
              >
                {formattedName.lines.join(" ")}
              </h1>
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                {displayName}
              </span>
            </div>

            {/* Hint & Post-reveal controls */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <span>Dotknij i przeciągnij kartę, aby obracać w 3D</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 w-full justify-center pt-1">
              {/* Replay Button */}
              <button
                onClick={walkout.replay}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/20 text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                title="Powtórz animację walkout"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Powtórz</span>
              </button>

              {/* Auto-rotate Toggle */}
              <button
                onClick={walkout.toggleAutoRotate}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                  walkout.autoRotate
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-white/20"
                }`}
                title="Włącz ciągły auto-obrót"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-obrót</span>
              </button>

              {/* Primary Collect / Continue Button */}
              <button
                onClick={onComplete || onClose}
                className="flex-1 max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-slate-950 font-[1000] text-xs md:text-sm uppercase tracking-wider shadow-2xl shadow-orange-500/40 transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Dodaj do Kolekcji</span>
              </button>
            </div>
          </div>
        ) : (
          /* Subtle timeline progress during animation */
          <div className="flex flex-col items-center space-y-2 pb-2">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              {walkout.phase === "intro" && "Mroczne Wybudzenie..."}
              {walkout.phase === "activation" && "Narastanie Energii..."}
              {walkout.phase === "reveal" && "Odkrycie Gwiazdy!"}
            </span>
            <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-75"
                style={{ width: `${(walkout.currentTime / 12) * 100}%` }}
              />
            </div>
          </div>
        )}
      </footer>
    </div>,
    document.body
  );
}
