"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  Sparkles, 
  Crown, 
  Trophy, 
  Check, 
  X, 
  ChevronRight, 
  UserRound, 
  Shield, 
  Zap, 
  Goal 
} from "lucide-react";
import { CardDefinition, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import { MEDIA } from "@/lib/media";
import CollectibleCard3D from "./CollectibleCard3D";
import CanvasParticles from "./CanvasParticles";

interface CardUnlockCinematicModalProps {
  card: CardDefinition;
  onClose: () => void;
  onAddToCollection?: () => void;
  onViewProfile?: () => void;
}

export default function CardUnlockCinematicModal({
  card,
  onClose,
  onAddToCollection,
  onViewProfile
}: CardUnlockCinematicModalProps) {
  // Sekwencja etapów: 
  // 1: "blackout" 
  // 2: "floodlights" 
  // 3: "smoke_fire" 
  // 4: "category_title" 
  // 5: "player_slam" 
  // 6: "full_card" 
  const [step, setStep] = useState<number>(1);
  const [screenShake, setScreenShake] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const isInferno = card.rarity === "inferno";
  const isLegend = card.rarity === "legendary";
  const playerDisplayName = card.player?.display_name || card.title || "Zawodnik DELTA GM";

  useEffect(() => {
    // Sprawdzenie ustawień dostępności użytkownika
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      setStep(6);
      return;
    }

    // Dźwięk startowy
    try {
      cardSound.playFlip();
    } catch (e) {}

    // Krok 1 -> Krok 2 (Światła stadionowe po 500ms)
    const t1 = setTimeout(() => {
      setStep(2);
      try {
        cardSound.playCinematicBoom();
      } catch (e) {}
    }, 500);

    // Krok 2 -> Krok 3 (Dym & Ogień po 1200ms)
    const t2 = setTimeout(() => {
      setStep(3);
      if (isInferno) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 500);
      }
    }, 1200);

    // Krok 3 -> Krok 4 (Kategoria po 1900ms)
    const t3 = setTimeout(() => {
      setStep(4);
    }, 1900);

    // Krok 4 -> Krok 5 (Slam zawodnika po 2700ms)
    const t4 = setTimeout(() => {
      setStep(5);
      try {
        if (isInferno || isLegend) {
          cardSound.playWalkoutFanfare();
        } else {
          cardSound.playReveal(card.rarity);
        }
      } catch (e) {}
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 600);
    }, 2700);

    // Krok 5 -> Krok 6 (Pełna karta 3D po 3500ms)
    const t5 = setTimeout(() => {
      setStep(6);
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [card, isInferno, isLegend]);

  // Dynamiczne tło wideo z chmury Supabase Storage
  const backgroundVideoSrc = isInferno 
    ? MEDIA.packOpening.bgInferno 
    : isLegend 
    ? MEDIA.packOpening.bgLegend 
    : card.card_type === "matchday" 
    ? MEDIA.packOpening.bgMatchday 
    : MEDIA.packOpening.bgGold;

  return (
    <div className={`v200-reveal-modal ${screenShake ? "v200-screen-shake" : ""}`}>
      {/* TŁO WIDEO / FX */}
      {step >= 3 && !reducedMotion && (
        <video
          key={backgroundVideoSrc}
          src={backgroundVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="v200-reveal-video-bg"
        />
      )}

      {/* PARTICLE FX */}
      {step >= 3 && (
        <CanvasParticles 
          theme={isInferno ? "inferno" : isLegend ? "legend" : "gold"} 
          active={true} 
        />
      )}

      {/* PRZYCISK ZAMKNIĘCIA / POMIŃ */}
      <button 
        type="button" 
        className="v200-reveal-skip-btn" 
        onClick={onClose}
        aria-label="Pomiń animację"
      >
        <span>POMIŃ</span>
        <X size={15} />
      </button>

      {/* ETAP 2: BŁYSK JUPITERÓW (FLOODLIGHTS) */}
      {step === 2 && (
        <div className="v200-floodlight-flash" />
      )}

      {/* ETAP 4: KATEGORIA KARTY (TITLE SLAM) */}
      {step >= 4 && step < 6 && (
        <div className="v200-reveal-category-slam">
          <span className="v200-reveal-kicker">NOWA KARTA ODBLOKOWANA</span>
          <h1 className={isInferno ? "inferno-text" : isLegend ? "gold-text" : ""}>
            {(card.card_name || card.title || card.rarity).toUpperCase()}
          </h1>
          <p>{playerDisplayName}</p>
        </div>
      )}

      {/* ETAP 5 & 6: PEŁNY REVEAL KARTY 3D */}
      {step >= 5 && (
        <div className="v200-reveal-stage">
          <div className="v200-reveal-card-wrap">
            <CollectibleCard3D
              card={card}
              isLocked={false}
              size="lg"
              interactive={true}
              showFlip={true}
            />
          </div>

          {/* PRZYCISKI AKCJI (ETAP 6) */}
          {step >= 6 && (
            <div className="v200-reveal-actions">
              <button 
                type="button" 
                className="btn gold-btn v200-reveal-btn-main"
                onClick={() => {
                  onAddToCollection?.();
                  onClose();
                }}
              >
                <Sparkles size={18} />
                <span>DODAJ DO KOLEKCJI</span>
              </button>

              {onViewProfile && (
                <button 
                  type="button" 
                  className="v200-reveal-btn-secondary"
                  onClick={() => {
                    onViewProfile();
                    onClose();
                  }}
                >
                  <UserRound size={16} />
                  <span>ZOBACZ PROFIL ZAWODNIKA</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
