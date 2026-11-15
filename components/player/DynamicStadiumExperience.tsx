"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Sparkles, 
  Trophy, 
  Dumbbell, 
  Flame, 
  Target, 
  Award, 
  Info, 
  X, 
  ChevronRight,
  Shield,
  Layers,
  Compass,
  Lock,
  CheckCircle2
} from "lucide-react";
import type { Player } from "./PlayerExperience3D";
import { 
  calculateStadiumProgression, 
  type StadiumProgressionResult, 
  STADIUM_TIERS,
  type StadiumTierConfig 
} from "@/lib/stadium/progression";

export type StadiumVariant = "debiutant" | "mlody_talent";

export interface StadiumConfig {
  id: StadiumVariant;
  label: string;
  stageTitle: string;
  stageCategory: string;
  description: string;
  bgWebp: string;
  bgPng: string;
  accentColor: string;
  milestoneXp: string;
  focusArea: string;
}

export const STADIUM_CONFIGS: Record<StadiumVariant, StadiumConfig> = {
  debiutant: {
    id: "debiutant",
    label: "DEBIUTANT",
    stageTitle: "Stadion Treningowy",
    stageCategory: "ETAP 1 • AKADEMIA DELTA",
    description: "Początek piłkarskiej drogi w barwach DELTY. Regularne zbiórki treningowe budują technikę użytkową, dynamikę motoryczną oraz dyscyplinę sportową.",
    bgWebp: "/assets/stadium-experience/stadium_debiutant.webp",
    bgPng: "/assets/stadium-experience/stadium_debiutant.png",
    accentColor: "#f6c952",
    milestoneXp: "+40 XP za każdą zarejestrowaną obecność na treningu",
    focusArea: "Budowa fundamentów: przyjęcie kierunkowe, prowadzenie piłki, motoryka"
  },
  mlody_talent: {
    id: "mlody_talent",
    label: "MŁODY TALENT",
    stageTitle: "Stadion Ligowy DELTA",
    stageCategory: "ETAP 2 • ROZGRYWKI MZPN",
    description: "Prawdziwe emocje ligowe, rozwój zespołowy i rywalizacja turniejowa. Każdy mecz ligowy kształtuje charakter, dojrzałość taktyczną i decyzyjność pod presją.",
    bgWebp: "/assets/stadium-experience/stadium_mlody_talent.webp",
    bgPng: "/assets/stadium-experience/stadium_mlody_talent.png",
    accentColor: "#e22e30",
    milestoneXp: "+60 XP za każdy rozegrany mecz w rozgrywkach MZPN",
    focusArea: "Gra ligowa: współpraca zespołowa, skuteczność bramkowa, asysty"
  }
};

export interface DynamicStadiumExperienceProps {
  player: Player;
  level: number;
  xp: number;
  progression?: StadiumProgressionResult;
  stats?: {
    matches: number;
    trainings: number;
    goals: number;
    assists: number;
  };
  variant: StadiumVariant;
  onVariantChange: (variant: StadiumVariant) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function DynamicStadiumExperience({
  player,
  level,
  xp,
  progression,
  stats,
  variant,
  onVariantChange,
  isOpen,
  onClose
}: DynamicStadiumExperienceProps) {
  const [mounted, setMounted] = useState(false);
  const [activeVariant, setActiveVariant] = useState<StadiumVariant>(variant);
  const [showPromotionBanner, setShowPromotionBanner] = useState(false);

  const progressionResult: StadiumProgressionResult = useMemo(
    () => progression || calculateStadiumProgression(xp),
    [progression, xp]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveVariant(variant);
  }, [variant]);

  // Sprawdzenie jednorazowego wyświetlenia powiadomienia o awansie w bieżącej sesji
  useEffect(() => {
    if (!isOpen) return;
    try {
      const storageKey = `delta_stadium_tier_seen_${player.id}_${progressionResult.currentTier.id}`;
      const seen = sessionStorage.getItem(storageKey);
      if (!seen && progressionResult.currentTier.id !== "debiutant") {
        setShowPromotionBanner(true);
        sessionStorage.setItem(storageKey, "true");
      }
    } catch {}
  }, [isOpen, player.id, progressionResult.currentTier.id]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown]);

  const handleSwitchVariant = (newVariant: StadiumVariant) => {
    setActiveVariant(newVariant);
    onVariantChange(newVariant);
  };

  if (!isOpen || !mounted) {
    return null;
  }

  const currentCfg = STADIUM_CONFIGS[activeVariant];
  const hasShirtNumber = Boolean(player.shirt_number && String(player.shirt_number).trim() !== "");
  const rawShirtNumber = hasShirtNumber ? String(player.shirt_number).trim() : null;
  const isSingleDigit = Boolean(rawShirtNumber && rawShirtNumber.length === 1);
  const isDoubleDigit = Boolean(rawShirtNumber && rawShirtNumber.length === 2);
  const podiumBadgeText = rawShirtNumber ? `#${rawShirtNumber}` : "#DELTA";

  const content = (
    <div 
      className="v7e2-fullscreen-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-label="Prezentacja Stadionowa: Moja Droga do Mistrzostwa"
    >
      {/* 1. TŁO STADIONU Z PŁYNNYM PRZEJŚCIEM */}
      <div className="v7e2-stadium-bg-container" aria-hidden="true">
        {/* Wariant Debiutant */}
        <picture className={`v7e2-stadium-bg-picture ${activeVariant === "debiutant" ? "active" : ""}`}>
          <source srcSet="/assets/stadium-experience/stadium_debiutant.webp" type="image/webp" />
          <img 
            src="/assets/stadium-experience/stadium_debiutant.png" 
            alt="Stadion Treningowy Debiutant" 
            className="v7e2-stadium-bg-img"
          />
        </picture>

        {/* Wariant Młody Talent */}
        <picture className={`v7e2-stadium-bg-picture ${activeVariant === "mlody_talent" ? "active" : ""}`}>
          <source srcSet="/assets/stadium-experience/stadium_mlody_talent.webp" type="image/webp" />
          <img 
            src="/assets/stadium-experience/stadium_mlody_talent.png" 
            alt="Stadion Ligowy Młody Talent" 
            className="v7e2-stadium-bg-img"
          />
        </picture>

        {/* Ciemne winietowanie kinowe i oświetlenie stadionu */}
        <div className="v7e2-stadium-vignette" />
        <div className="v7e2-spotlight left" />
        <div className="v7e2-spotlight right" />
        <div className="v7e2-pitch-ground-glow" />
        <div className="v7e2-ambient-mist" />

        {/* Zmniejszony i stonowany numer znaku wodnego w tle */}
        <div className="v7e2-watermark-num" aria-hidden="true">
          {podiumBadgeText}
        </div>
      </div>

      {/* 2. GÓRNY PASEK NAWIGACJI PREZENTACJI */}
      <div className="v7e2-topbar">
        <div className="v7e2-topbar-left">
          <img src="/teamlogos/gm.png" alt="DELTA" className="v7e2-topbar-crest" />
          <div>
            <div className="v7e2-topbar-title">
              <span>MOJA DROGA DO MISTRZOSTWA</span>
              <span className="v7e2-topbar-sub">DELTA 2018 GÓRNY MOKOTÓW</span>
            </div>
          </div>
        </div>

        {/* Przełącznik stadionów w trybie demonstracyjnym */}
        <div className="v7e2-switcher-wrap" role="group" aria-label="Wybór stadionu (Tryb demonstracyjny)">
          <span className="v7e2-switcher-demo-tag">TRYB DEMO</span>
          <div className="v7e2-switcher-pills">
            <button
              type="button"
              className={`v7e2-switcher-btn ${activeVariant === "debiutant" ? "active" : ""}`}
              onClick={() => handleSwitchVariant("debiutant")}
              aria-pressed={activeVariant === "debiutant"}
            >
              <Dumbbell size={13} />
              <span>DEBIUTANT</span>
            </button>
            <button
              type="button"
              className={`v7e2-switcher-btn ${activeVariant === "mlody_talent" ? "active" : ""}`}
              onClick={() => handleSwitchVariant("mlody_talent")}
              aria-pressed={activeVariant === "mlody_talent"}
            >
              <Trophy size={13} />
              <span>MŁODY TALENT</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="v7e2-btn-close"
          onClick={onClose}
          aria-label="Zamknij pełnoekranową prezentację"
          title="Zamknij (Esc)"
        >
          <X size={18} />
          <span>Zamknij</span>
        </button>
      </div>

      {/* LEKKI BANER CELEBRACJI AWANSU (V7F.1B - zgodny z prefers-reduced-motion, max 1 raz na sesję) */}
      {showPromotionBanner && (
        <div className="v7f-promotion-banner" role="status" aria-live="polite">
          <div className="v7f-promotion-content">
            <Sparkles size={16} className="text-amber-400" />
            <span>
              AWANS STADIONOWY! Osiągnięto etap: <b>{progressionResult.currentTier.name.toUpperCase()}</b> ({progressionResult.currentTier.minXp}+ XP)
            </span>
          </div>
          <button 
            type="button" 
            className="v7f-promotion-close" 
            onClick={() => setShowPromotionBanner(false)}
            aria-label="Zamknij baner awansu"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. GŁÓWNA SCENA STADIONOWA */}
      <div className="v7e2-stage-viewport">
        {/* LEWA STRONA: KARTA ETAPU ROZWOJU */}
        <div className="v7e2-stage-info-card">
          <div className="v7e2-info-header">
            <span className="v7e2-info-category" style={{ color: currentCfg.accentColor }}>
              <Sparkles size={13} />
              <span>{currentCfg.stageCategory}</span>
            </span>
            <h2 className="v7e2-info-title">{currentCfg.stageTitle}</h2>
          </div>

          <p className="v7e2-info-desc">
            {currentCfg.description}
          </p>

          <div className="v7e2-info-milestone-box">
            <Award size={15} className="text-amber-400" />
            <div>
              <b>Filar rozwoju sportowego</b>
              <span>{currentCfg.milestoneXp}</span>
            </div>
          </div>

          <div className="v7e2-info-focus-box">
            <Compass size={15} className="text-sky-400" />
            <div>
              <b>Akcent szkoleniowy</b>
              <span>{currentCfg.focusArea}</span>
            </div>
          </div>

          {stats && (
            <div className="v7e2-info-stats-grid">
              <div className="v7e2-stat-tile">
                <b>{stats.matches}</b>
                <span>Mecze</span>
              </div>
              <div className="v7e2-stat-tile">
                <b>{stats.trainings}</b>
                <span>Treningi</span>
              </div>
              <div className="v7e2-stat-tile highlight">
                <b>{stats.goals}</b>
                <span>Gole</span>
              </div>
              <div className="v7e2-stat-tile highlight-red">
                <b>{stats.assists}</b>
                <span>Asysty</span>
              </div>
            </div>
          )}

          {/* V7F.1B ŚCIEŻKA PROGRESJI: 5 ETAPÓW STADIONOWYCH */}
          <div className="v7f-stadium-pathway-card">
            <div className="v7f-pathway-header">
              <Layers size={13} className="text-amber-400" />
              <span>DROGA DO MISTRZOSTWA (PROGI STADIONÓW)</span>
            </div>
            <div className="v7f-pathway-list">
              {STADIUM_TIERS.map(tier => {
                const isUnlocked = progressionResult.unlockedTierIds.includes(tier.id);
                const isCurrent = progressionResult.currentTier.id === tier.id;

                return (
                  <div 
                    key={tier.id}
                    className={`v7f-pathway-item ${isCurrent ? "current" : ""} ${isUnlocked ? "unlocked" : "locked"}`}
                  >
                    <span className="v7f-pathway-icon">
                      {isUnlocked ? "✓" : "🔒"}
                    </span>
                    <div className="v7f-pathway-details">
                      <div className="v7f-pathway-line">
                        <b>{tier.name}</b>
                        <span className="v7f-pathway-xp">{tier.minXp} XP</span>
                      </div>
                      <small className="v7f-pathway-sub">
                        {isUnlocked 
                          ? (tier.hasGraphic ? "Scena odblokowana" : "Etap osiągnięty")
                          : (tier.hasGraphic ? `Wymaga ${tier.minXp} XP` : `Wymaga ${tier.minXp} XP • W przygotowaniu`)}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ŚRODEK: POSTAĆ ZAWODNIKA NA PODIUM W CZERWONYM STROJU DELTY */}
        <div className="v7e2-athlete-stage">
          <div className="v7e2-pedestal-light-ring" />
          <div className="v7e2-athlete-cutout-wrap">
            <picture>
              <source srcSet="/assets/stadium-experience/player_red_uniform_transparent.webp" type="image/webp" />
              <img 
                src="/assets/stadium-experience/player_red_uniform_transparent.png" 
                alt={player.display_name} 
                className="v7e2-athlete-img"
              />
            </picture>

            {/* Dynamiczny numer koszulki precyzyjnie na plecach czerwonej koszulki */}
            {rawShirtNumber ? (
              <div 
                className={`v7e2-jersey-dynamic-num ${isSingleDigit ? "single-digit" : isDoubleDigit ? "double-digit" : "multi-digit"}`} 
                aria-label={`Numer na plecach koszulki: ${rawShirtNumber}`}
                data-testid="jersey-back-number"
              >
                {rawShirtNumber}
              </div>
            ) : null}
          </div>

          {/* Etykieta tożsamości na podium */}
          <div className="v7e2-athlete-podium-badge">
            <span className="v7e2-podium-num">{podiumBadgeText}</span>
            <span className="v7e2-podium-divider">•</span>
            <span className="v7e2-podium-pos">{player.position || "ZAWODNIK"}</span>
          </div>
        </div>

        {/* PRAWA STRONA: PROFIL I RZECZYWISTY XP SPORTOWY */}
        <div className="v7e2-player-hud-card">
          <div className="v7e2-hud-kicker">
            <Flame size={13} className="text-red-500" />
            <span>K.S. DELTA WARSZAWA</span>
          </div>

          <h1 className="v7e2-hud-name">
            {player.display_name}
          </h1>

          <div className="v7e2-hud-meta">
            <span className="v7e2-hud-meta-item">Rocznik 2018</span>
            <span className="v7e2-hud-meta-dot">•</span>
            <span className="v7e2-hud-meta-item">Górny Mokotów</span>
          </div>

          {/* RZECZYWISTY PASEK XP */}
          <div className="v7e2-hud-xp-box">
            <div className="v7e2-hud-xp-header">
              <span className="v7e2-hud-lvl-pill">
                <Award size={13} />
                <span>POZIOM {level}</span>
              </span>
              <b className="v7e2-hud-xp-val">
                <Sparkles size={13} className="text-amber-400" />
                <span>{xp} XP</span>
              </b>
            </div>

            <div className="v7e2-hud-xp-track">
              <div 
                className="v7e2-hud-xp-fill" 
                style={{ width: `${Math.min(100, Math.max(12, (xp % 250) / 2.5))}%` }}
              />
            </div>

            <div className="v7e2-hud-xp-footer">
              <Info size={12} />
              <span>+40 XP/trening • +60 XP/mecz ligowy</span>
            </div>
          </div>

          {/* V7F.1B WSKAŹNIK PROGRESJI DO NASTĘPNEGO STADIONU */}
          <div className="v7e2-hud-stadium-progression-box" data-testid="hud-stadium-progression">
            <div className="v7e2-hud-stadium-header">
              <span className="v7e2-hud-stadium-tier-tag" style={{ borderColor: progressionResult.currentTier.accentColor }}>
                <Trophy size={12} style={{ color: progressionResult.currentTier.accentColor }} />
                <span>ETAP: <b>{progressionResult.currentTier.name.toUpperCase()}</b></span>
              </span>
              <span className="v7e2-hud-stadium-pct">
                {progressionResult.progressPercent}%
              </span>
            </div>

            <div className="v7e2-hud-stadium-track" title={`Postęp do stadionu ${progressionResult.nextTier?.name || "Mistrzowski"}: ${progressionResult.progressPercent}%`}>
              <div 
                className="v7e2-hud-stadium-fill" 
                style={{ 
                  width: `${progressionResult.progressPercent}%`,
                  backgroundColor: progressionResult.currentTier.accentColor 
                }}
              />
            </div>

            <div className="v7e2-hud-stadium-footer">
              {progressionResult.nextTier ? (
                <span>
                  Kolejny stadion: <b>{progressionResult.nextTier.name}</b> (brakuje <b>{progressionResult.remainingXp} XP</b>)
                </span>
              ) : (
                <span className="text-amber-400 font-bold">
                  🏆 Osiągnięto najwyższy laur stadionowy: Legenda DELTY
                </span>
              )}
            </div>
          </div>

          {/* AKTYWNY STADION PILL */}
          <div className="v7e2-current-stadium-pill">
            <div className="v7e2-stadium-dot" style={{ backgroundColor: currentCfg.accentColor }} />
            <span>Aktualna scena: <b>{currentCfg.label}</b></span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default DynamicStadiumExperience;
