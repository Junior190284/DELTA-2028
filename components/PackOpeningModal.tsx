"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Sparkles, 
  X, 
  RotateCcw, 
  Flame, 
  Crown, 
  ShieldCheck,
  Zap,
  ArrowRight,
  Trophy
} from "lucide-react";
import PlayerCard3D, { CardTheme, PlayerCardStats } from "./PlayerCard3D";

interface PackOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
  };
  stats: PlayerCardStats;
  theme?: CardTheme;
  initialTheme?: CardTheme;
  onUnlockCard?: (theme: CardTheme) => void;
  unlockedBadgesCount?: number;
}

type Step = "selector" | "tearing" | "flag" | "pos" | "club" | "rating" | "revealed";

export default function PackOpeningModal({
  isOpen,
  onClose,
  player,
  stats,
  theme,
  initialTheme = "gold",
  onUnlockCard,
  unlockedBadgesCount = 0
}: PackOpeningModalProps) {
  const chosenTheme = theme || initialTheme;
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("selector");
  const [activeTheme, setActiveTheme] = useState<CardTheme>(chosenTheme);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep("selector");
      setActiveTheme(chosenTheme);
    }
  }, [isOpen, chosenTheme]);

  // Sekwencja Walkout FIFA z dedykowanymi efektami dla danego motywu
  const startPackOpening = (themeToOpen: CardTheme) => {
    setActiveTheme(themeToOpen);
    setStep("tearing");

    setTimeout(() => {
      setStep("flag"); // 1. Flaga
    }, 1100);

    setTimeout(() => {
      setStep("pos"); // 2. Pozycja
    }, 2200);

    setTimeout(() => {
      setStep("club"); // 3. Klub
    }, 3300);

    setTimeout(() => {
      setStep("rating"); // 4. Ocena OVR
    }, 4400);

    setTimeout(() => {
      setStep("revealed"); // 5. Karta w pełnej krasie
      onUnlockCard?.(themeToOpen);
    }, 5600);
  };

  const skipToRevealed = () => {
    setStep("revealed");
    onUnlockCard?.(activeTheme);
  };

  if (!isOpen || !mounted) return null;

  const posUpper = (player.position || "ZAW").toUpperCase();
  const fifaPos = 
    posUpper.includes("BRAMK") ? "BRAMKARZ" :
    posUpper.includes("OBRON") ? "OBROŃCA" :
    posUpper.includes("POMOC") ? "POMOCNIK" :
    posUpper.includes("NAPAST") ? "NAPASTNIK" : "ZAWODNIK";

  return createPortal(
    <div className={`v101-pack-modal-backdrop theme-${activeTheme}`} role="dialog" aria-modal="true">
      {/* Przycisk Zamknięcia */}
      <button 
        type="button" 
        className="v101-pack-close-btn" 
        onClick={onClose}
        title="Zamknij"
      >
        <X size={22} />
      </button>

      {/* Tło z promieniami i efektami motywu */}
      <div className={`v101-pack-bg-rays theme-${activeTheme}`} aria-hidden="true" />

      {/* EFEKTY CZĄSTECZKOWE TŁA W ZALEŻNOŚCI OD MOTYWU */}
      {activeTheme === "inferno" && (
        <div className="v101-modal-inferno-sparks" aria-hidden="true">
          <i className="spark sp-1" /><i className="spark sp-2" /><i className="spark sp-3" />
          <i className="spark sp-4" /><i className="spark sp-5" /><i className="spark sp-6" />
          <div className="v101-inferno-magma-glow" />
        </div>
      )}

      {activeTheme === "gold" && (
        <div className="v101-modal-gold-glitter" aria-hidden="true">
          <i className="glitter gt-1" /><i className="glitter gt-2" /><i className="glitter gt-3" />
          <i className="glitter gt-4" /><i className="glitter gt-5" />
        </div>
      )}

      {activeTheme === "legend" && (
        <div className="v101-modal-legend-lightning" aria-hidden="true">
          <div className="lightning-bolt bolt-1" />
          <div className="lightning-bolt bolt-2" />
          <div className="v101-cosmic-vortex-glow" />
        </div>
      )}

      {/* 1. SELEKTOR PACZEK FIFA DO OTWARCIA */}
      {step === "selector" && (
        <div className="v101-pack-selector-stage">
          <div className="v101-selector-header">
            <span className="v101-selector-kicker"><Sparkles size={14} /> SKLEP PACZEK DELTA GM</span>
            <h2>WYBIERZ PACZKĘ DO ROZCIĘCIA</h2>
            <p>Każda paczka kryje unikalną edycję karty, inne ujęcie i dedykowane efekty!</p>
          </div>

          <div className="v101-pack-cards-row">
            {/* PACZKA 1: GOLD IN-FORM */}
            <div 
              className={`v101-pack-choice-card theme-gold ${activeTheme === "gold" ? "selected" : ""}`}
              onClick={() => startPackOpening("gold")}
              role="button"
              tabIndex={0}
            >
              <div className="v101-pack-choice-badge">✦ IN-FORM</div>
              <div className="v101-choice-crest">
                <img src="/teamlogos/gm.png" alt="DELTA GM" />
              </div>
              <h3>PREMIUM GOLD</h3>
              <span>Złota Elita • 87 OVR</span>
              <button type="button" className="v101-choice-btn gold">
                <Zap size={14} /> Otwórz paczkę
              </button>
            </div>

            {/* PACZKA 2: INFERNO */}
            <div 
              className={`v101-pack-choice-card theme-inferno ${activeTheme === "inferno" ? "selected" : ""}`}
              onClick={() => startPackOpening("inferno")}
              role="button"
              tabIndex={0}
            >
              <div className="v101-pack-choice-badge inferno">🔥 INFERNO</div>
              <div className="v101-choice-crest">
                <img src="/teamlogos/gm.png" alt="DELTA GM" />
              </div>
              <h3>MŁODY DIABEŁEK</h3>
              <span>Ognisty Napastnik • 87 OVR</span>
              <button type="button" className="v101-choice-btn inferno">
                <Flame size={14} /> Otwórz paczkę
              </button>
            </div>

            {/* PACZKA 3: TOTY ICON LEGENDA */}
            <div 
              className={`v101-pack-choice-card theme-legend ${activeTheme === "legend" ? "selected" : ""}`}
              onClick={() => startPackOpening("legend")}
              role="button"
              tabIndex={0}
            >
              <div className="v101-pack-choice-badge legend">👑 TOTY ICON</div>
              <div className="v101-choice-crest">
                <img src="/teamlogos/gm.png" alt="DELTA GM" />
              </div>
              <h3>LEGENDA DELTY</h3>
              <span>Diamentowa Ikona • 87 OVR</span>
              <button type="button" className="v101-choice-btn legend">
                <Crown size={14} /> Otwórz paczkę
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ROZCINANIE PACZKI */}
      {step === "tearing" && (
        <div className="v101-pack-tearing-stage">
          <div className="v101-pack-burst-flash" />
          <div className={`v101-fut-booster-pack is-tearing theme-${activeTheme}`}>
            <div className="v101-booster-crack" />
          </div>
          <p className="v101-pack-loading-text">
            {activeTheme === "inferno" ? "🔥 OTWIERANIE PACZKI INFERNO..." : activeTheme === "legend" ? "👑 OTWIERANIE PACZKI LEGENDY..." : "✦ OTWIERANIE PACZKI GOLD..."}
          </p>
        </div>
      )}

      {/* 3. WALKOUT SEQUENCE (FLAGA -> POZYCJA -> HERB -> OCENA) */}
      {(step === "flag" || step === "pos" || step === "club" || step === "rating") && (
        <div className={`v101-walkout-stage theme-${activeTheme}`}>
          <button 
            type="button" 
            className="v101-walkout-skip" 
            onClick={skipToRevealed}
          >
            Pomiń <ArrowRight size={14} />
          </button>

          <div className="v101-walkout-tunnel">
            {/* Krok 1: FLAGA */}
            <div className={`v101-walkout-item flag ${step === "flag" || step === "pos" || step === "club" || step === "rating" ? "active" : ""}`}>
              <span className="v101-walkout-label">NARODOWOŚĆ</span>
              <div className="v101-walkout-flag-box">
                <i className="flag-white" />
                <i className="flag-red" />
              </div>
              <h2 className="v101-walkout-val">POLSKA</h2>
            </div>

            {/* Krok 2: POZYCJA */}
            {(step === "pos" || step === "club" || step === "rating") && (
              <div className="v101-walkout-item pos active">
                <span className="v101-walkout-label">POZYCJA</span>
                <h2 className={`v101-walkout-val highlight theme-${activeTheme}`}>{fifaPos}</h2>
              </div>
            )}

            {/* Krok 3: KLUB */}
            {(step === "club" || step === "rating") && (
              <div className="v101-walkout-item club active">
                <span className="v101-walkout-label">KLUB</span>
                <img src="/teamlogos/gm.png" alt="DELTA GM" className="v101-walkout-crest" />
                <h2 className="v101-walkout-val">K.S. DELTA WARSZAWA GM</h2>
              </div>
            )}

            {/* Krok 4: OCENA OVR */}
            {step === "rating" && (
              <div className="v101-walkout-item rating active">
                <span className="v101-walkout-label">OCENA OGÓLNA</span>
                <h1 className={`v101-walkout-ovr theme-${activeTheme}`}>87</h1>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. REVEALED: PEŁNA KARTA 3D W CHWALE */}
      {step === "revealed" && (
        <div className="v101-pack-revealed-stage">
          <div className={`v101-revealed-confetti theme-${activeTheme}`} aria-hidden="true" />
          
          <div className="v101-revealed-card-wrap">
            <PlayerCard3D
              player={player}
              stats={stats}
              theme={activeTheme}
              unlockedBadgesCount={unlockedBadgesCount}
              showExport={true}
            />
          </div>

          <div className="v101-pack-revealed-footer">
            <button 
              type="button" 
              className="v101-pack-replay-btn"
              onClick={() => setStep("selector")}
            >
              <RotateCcw size={15} />
              <span>Wybierz inną paczkę</span>
            </button>
            <button 
              type="button" 
              className="v101-pack-done-btn"
              onClick={onClose}
            >
              <ShieldCheck size={16} />
              <span>Zatwierdź do Klubu</span>
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
