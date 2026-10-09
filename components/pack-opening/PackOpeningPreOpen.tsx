"use client";

import React, { useState } from "react";
import { Sparkles, Gift, X, Zap, ChevronRight, Layers } from "lucide-react";
import { PackDefinition, getPackImageUrl } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

interface PackOpeningPreOpenProps {
  pack: PackDefinition;
  unopenedCount: number;
  onOpen: () => void;
  onClose: () => void;
  disabled?: boolean;
}

export default function PackOpeningPreOpen({
  pack,
  unopenedCount,
  onOpen,
  onClose,
  disabled = false
}: PackOpeningPreOpenProps) {
  const [isHovered, setIsHovered] = useState(false);
  const packImage = pack.image_url || getPackImageUrl(pack.id, pack.theme);

  const themeClass = `theme-${pack.theme || "standard"}`;

  const handleOpenClick = () => {
    if (disabled) return;
    cardSound.playPackTear();
    cardSound.playHaptic("heavy");
    onOpen();
  };

  return (
    <div className={`delta-cinematic-preopen-stage ${themeClass} animate-fadeIn`}>
      {/* Background Ambient Glow & Stadium Smoke */}
      <div className="delta-cinematic-bg-elements">
        <div className="delta-cinematic-smoke-layer" />
        <div className="delta-cinematic-stadium-lights" />
        <div className="delta-cinematic-radial-flare" />
      </div>

      {/* Top Bar with Close Button and Stock indicator */}
      <div className="delta-preopen-topbar">
        <div className="delta-preopen-pack-tag">
          <Gift size={15} className="text-yellow-400" />
          <span>DOSTĘPNE PACZKI: <b>{unopenedCount + 1}</b></span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="delta-preopen-close-btn"
          aria-label="Zamknij"
        >
          <X size={20} />
        </button>
      </div>

      {/* Center 3D Floating Pack Showcase */}
      <div className="delta-preopen-center-wrap">
        <div 
          className={`delta-preopen-pack-3d-box ${isHovered ? "hovered" : ""}`}
          onMouseEnter={() => {
            setIsHovered(true);
            cardSound.playHover();
          }}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleOpenClick}
        >
          {/* Holographic foil sheen & edge aura */}
          <div className="delta-preopen-aura" />
          
          <img 
            src={packImage} 
            alt={pack.name} 
            className="delta-preopen-pack-image"
          />

          <div className="delta-preopen-sheen" />

          {/* Cards Count Badge */}
          <div className="delta-preopen-cards-pill">
            <Layers size={13} />
            <span>{pack.cards_count || 4} KART W ŚRODKU</span>
          </div>
        </div>

        {/* Pack Details */}
        <div className="delta-preopen-info">
          <div className="delta-preopen-badge">
            <Sparkles size={12} className="text-yellow-400" />
            <span>OFICJALNY BOOSTER DELTA GM</span>
          </div>

          <h2 className="delta-preopen-title">{pack.name}</h2>
          <p className="delta-preopen-description">
            {pack.description || "Odkrywaj unikalne karty zawodników rocznika 2018. Zbieraj legendy i kompletuj klaser!"}
          </p>

          {/* CTA Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleOpenClick}
            className="delta-preopen-cta-btn"
          >
            <Sparkles size={20} className="animate-spin" />
            <span>ROZETNIJ I OTWÓRZ PACZKĘ</span>
            <ChevronRight size={18} />
          </button>

          <span className="delta-preopen-tap-hint">
            Dotknij paczkę lub kliknij przycisk, aby rozpocząć odkrywanie
          </span>
        </div>
      </div>
    </div>
  );
}
