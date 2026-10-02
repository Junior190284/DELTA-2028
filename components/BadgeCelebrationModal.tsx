"use client";

import React, { useEffect } from "react";
import { 
  Trophy, 
  Star, 
  Sparkles, 
  X, 
  Flame, 
  Award, 
  Crown, 
  Shield, 
  Goal, 
  Zap, 
  ChevronRight 
} from "lucide-react";
import PlayerPhoto from "./PlayerPhoto";

export interface BadgeDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  date?: string;
  opponent?: string;
  unlocked: boolean;
  progress?: string;
  iconName?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export interface BadgeCelebrationModalProps {
  badge: BadgeDetail | null;
  player: {
    id: string;
    display_name: string;
    shirt_number: string | null;
  };
  onClose: () => void;
  onOpenMatch?: () => void;
}

export default function BadgeCelebrationModal({
  badge,
  player,
  onClose,
  onOpenMatch
}: BadgeCelebrationModalProps) {
  useEffect(() => {
    if (!badge) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [badge, onClose]);

  if (!badge) return null;

  const rarityColor = 
    badge.rarity === "legendary" ? "#ff4d5a" :
    badge.rarity === "epic" ? "#c084fc" :
    badge.rarity === "rare" ? "#f1c95c" : "#60a5fa";

  const rarityLabel = 
    badge.rarity === "legendary" ? "LEGENDARNA ODZNAKA INFERNO" :
    badge.rarity === "epic" ? "EPICKIE OSIĄGNIĘCIE" :
    badge.rarity === "rare" ? "ZŁOTA ODZNAKA MECZOWA" : "ODZNAKA DRUŻYNY";

  return (
    <div 
      className="v101-celebration-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Odznaka: ${badge.name}`}
      onClick={onClose}
    >
      <div 
        className={`v101-celebration-card rarity-${badge.rarity || "rare"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Przycisk zamknięcia */}
        <button 
          type="button" 
          className="v101-celebration-close" 
          onClick={onClose}
          aria-label="Zamknij"
        >
          <X size={20} />
        </button>

        {/* Błyski i promienie w tle */}
        <div className="v101-celebration-rays" aria-hidden="true" />
        <div className="v101-celebration-glow" aria-hidden="true" />

        {/* Nagłówek rzadkości */}
        <div className="v101-celebration-rarity">
          <Sparkles size={14} style={{ color: rarityColor }} />
          <span>{rarityLabel}</span>
          <Sparkles size={14} style={{ color: rarityColor }} />
        </div>

        {/* Emblemat 3D Odznaki */}
        <div className="v101-celebration-icon-stage">
          <div className="v101-celebration-trophy-ring">
            {badge.rarity === "legendary" ? (
              <Flame size={64} className="v101-trophy-icon fire" />
            ) : badge.rarity === "epic" ? (
              <Crown size={64} className="v101-trophy-icon crown" />
            ) : (
              <Trophy size={64} className="v101-trophy-icon gold" />
            )}
          </div>
          <span className="v101-celebration-status-tag">
            {badge.unlocked ? "✓ ODBLOKOWANE" : `W TRAKCIE (${badge.progress || "0/1"})`}
          </span>
        </div>

        {/* Tytuł i Zawodnik */}
        <h2 className="v101-celebration-title">{badge.name}</h2>
        <div className="v101-celebration-player-tag">
          <div className="v101-celebration-mini-avatar">
            <PlayerPhoto playerId={player.id} />
          </div>
          <b>{player.display_name}</b>
          <span>{player.shirt_number ? `#${player.shirt_number}` : "DELTA GM"}</span>
        </div>

        {/* Opis osiągnięcia */}
        <p className="v101-celebration-desc">{badge.description}</p>

        {/* Metryka meczu jeśli powiązana */}
        {badge.date && (
          <div className="v101-celebration-match-meta">
            <span>ZAPISANO W MECZU:</span>
            <strong>{badge.opponent ? `z ${badge.opponent}` : "DELTA 2018 GM"}</strong>
            <small>{badge.date}</small>
          </div>
        )}

        {/* Akcje */}
        <div className="v101-celebration-actions">
          {onOpenMatch && badge.date && (
            <button
              type="button"
              className="v101-celebration-btn match"
              onClick={() => {
                onClose();
                onOpenMatch();
              }}
            >
              <span>Zobacz mecz</span>
              <ChevronRight size={16} />
            </button>
          )}
          <button
            type="button"
            className="v101-celebration-btn primary"
            onClick={onClose}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
