"use client";

import React, { useState, useMemo } from "react";
import { 
  Flame, 
  Sparkles, 
  Lock, 
  Check, 
  Eye, 
  RotateCw, 
  X, 
  Shield, 
  Trophy, 
  Dumbbell, 
  Star,
  Layers
} from "lucide-react";
import { fromProductionCard } from "@/components/collection-3d/adapter";
import { Card3DEngine } from "@/components/collection-3d/Card3DEngine";
import PlayerPhoto from "@/components/PlayerPhoto";

export interface PlayerInfernoCardsProps {
  player: {
    id: string;
    display_name: string;
    shirt_number?: number | string | null;
    position?: string | null;
  };
  cards: any[];
  userCards: any[];
  stats?: Record<string, any>;
  trainingStats?: Record<string, any>;
}

export function PlayerInfernoCards({
  player,
  cards = [],
  userCards = [],
  stats = {},
  trainingStats = {}
}: PlayerInfernoCardsProps) {
  // Modal 3D inspection
  const [inspectedCard, setInspectedCard] = useState<any | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // Filtruj karty wyłącznie dla wybranego zawodnika
  const playerCards = useMemo(() => {
    return cards.filter(c => c.player_id === player.id);
  }, [cards, player.id]);

  // Mapa posiadanych kart: card_id -> user_card
  const ownedMap = useMemo(() => {
    const map = new Map<string, any>();
    userCards.forEach(uc => {
      if (uc.card_id) {
        map.set(uc.card_id, uc);
      }
    });
    return map;
  }, [userCards]);

  const ownedCount = useMemo(() => {
    return playerCards.filter(c => ownedMap.has(c.id)).length;
  }, [playerCards, ownedMap]);

  const completionPercent = playerCards.length > 0 
    ? Math.round((ownedCount / playerCards.length) * 100) 
    : 0;

  // Obliczenie OVR z danych sportowych
  const s = stats[player.id] || { m: 0, g: 0, a: 0, mvp: 0 };
  const t = trainingStats[player.id] || { sessions: 0, ga: 0, attendanceStreak: 0 };
  const calculatedOvr = Math.min(99, Math.max(78, 80 + Math.min(15, s.g + s.a + Math.floor(t.sessions / 3))));

  // Przygotowanie danych do 3D Engine
  const card3DData = useMemo(() => {
    if (!inspectedCard) return null;

    const enrichedCard = {
      ...inspectedCard,
      name: inspectedCard.card_name || inspectedCard.title || `${player.display_name} — ${inspectedCard.card_type}`,
      player: {
        id: player.id,
        display_name: player.display_name,
        shirt_number: player.shirt_number,
        position: player.position
      }
    };

    return fromProductionCard(enrichedCard, {
      ovr: calculatedOvr
    });
  }, [inspectedCard, player, s, t, calculatedOvr]);

  const handleOpen3D = (card: any) => {
    setInspectedCard(card);
    setIsFlipped(false);
    setAutoRotate(false);
  };

  const handleClose3D = () => {
    setInspectedCard(null);
    setIsFlipped(false);
    setAutoRotate(false);
  };

  return (
    <div className="v7b-inferno-cards-section">
      {/* NAGŁÓWEK SEKCI I POSTĘP W KOLEKCJI */}
      <div className="v7b-cards-header-bar devil-card">
        <div className="v7b-cards-title-col">
          <div className="v7b-inferno-tag">
            <Flame size={14} />
            <span>DELTA INFERNO 3D • KOLEKCJA KART</span>
          </div>
          <h3>Karty Zawodnika w Albumie DELTA</h3>
          <p>
            Oficjalne karty kolekcjonerskie z edycji 2026/2027. Zbieraj karty ze specjalnych paczek INFERNO!
          </p>
        </div>

        <div className="v7b-cards-progress-col">
          <div className="v7b-progress-nums">
            <span>Odblokowane karty:</span>
            <b>{ownedCount} / {playerCards.length || 6}</b>
            <span className="percent-badge">{completionPercent}%</span>
          </div>
          <div className="v7b-cards-progress-track">
            <div 
              className="v7b-cards-progress-fill" 
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* SIATKA KART ZAWODNIKA */}
      {playerCards.length > 0 ? (
        <div className="v7b-cards-grid">
          {playerCards.map(card => {
            const isOwned = ownedMap.has(card.id);
            const userCard = ownedMap.get(card.id);
            const themeClass = card.card_type === "inferno" 
              ? "inferno-theme" 
              : card.card_type === "mvp" 
              ? "legend-theme" 
              : card.card_type === "goal_hunter" || card.card_type === "training_warrior"
              ? "gold-theme"
              : "base-theme";

            return (
              <div 
                key={card.id} 
                className={`v7b-player-card-tile ${themeClass} ${isOwned ? "is-owned" : "is-locked"}`}
                onClick={() => handleOpen3D(card)}
              >
                {/* STATUS BADGE: POSIADANA / ZABLOKOWANA */}
                <div className="v7b-card-badge-header">
                  {isOwned ? (
                    <span className="badge-owned">
                      <Check size={12} />
                      <span>W TWOIM ALBUMIE</span>
                      {userCard?.duplicates_count > 0 && (
                        <small>x{userCard.duplicates_count + 1}</small>
                      )}
                    </span>
                  ) : (
                    <span className="badge-locked">
                      <Lock size={12} />
                      <span>DO ZDOBYCIA</span>
                    </span>
                  )}

                  <span className="badge-rarity">
                    {(card.rarity || "COMMON").toUpperCase()}
                  </span>
                </div>

                {/* PODGLĄD KARTY */}
                <div className="v7b-card-preview-art">
                  <div className="v7b-card-portrait-wrap">
                    <PlayerPhoto playerId={player.id} />
                    {!isOwned && (
                      <div className="v7b-card-lock-overlay">
                        <Lock size={32} />
                        <span>Karta zablokowana</span>
                      </div>
                    )}
                  </div>

                  <div className="v7b-card-art-glow" />
                </div>

                {/* DANE KARTY */}
                <div className="v7b-card-info-box">
                  <span className="card-type-label">
                    {card.card_type?.toUpperCase().replace("_", " ") || "STANDARD"}
                  </span>
                  <h4 className="card-name-title">
                    {card.card_name || card.title || player.display_name}
                  </h4>
                  <p className="card-desc">
                    {card.description || "Oficjalna karta rocznika 2018 Górny Mokotów."}
                  </p>

                  <div className="v7b-card-cta-row">
                    <button 
                      type="button" 
                      className={`v7b-btn-inspect-3d ${isOwned ? "btn-active" : "btn-preview"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen3D(card);
                      }}
                    >
                      <Eye size={13} />
                      <span>{isOwned ? "ZOBACZ W 3D (360°)" : "PODGLĄD 3D"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="v7b-cards-empty devil-card">
          <Layers size={40} />
          <h4>Brak wygenerowanych kart dla tego zawodnika</h4>
          <p>Definicje kart pojawią się w nowym sezonie ligowym 2026/2027.</p>
        </div>
      )}

      {/* MODAL PEŁNEJ INSPEKCJI 3D (Card3DEngine) */}
      {inspectedCard && card3DData && (
        <div className="v7b-modal-overlay" onClick={handleClose3D}>
          <div className="v7b-modal-card-container devil-card" onClick={e => e.stopPropagation()}>
            {/* GÓRNY PASEK KONTROLEK */}
            <div className="v7b-modal-header">
              <div className="modal-title-wrap">
                <Flame size={16} className="flame-icon" />
                <span>INSPEKCJA KARTY 3D • DELTA INFERNO</span>
              </div>

              <div className="modal-actions-wrap">
                <button
                  type="button"
                  className={`modal-btn-ctrl ${isFlipped ? "active" : ""}`}
                  onClick={() => setIsFlipped(!isFlipped)}
                  title="Obróć kartę na drugą stronę"
                >
                  <RotateCw size={14} />
                  <span>{isFlipped ? "PRZÓD" : "TYŁ KARTY"}</span>
                </button>

                <button
                  type="button"
                  className={`modal-btn-ctrl ${autoRotate ? "active" : ""}`}
                  onClick={() => setAutoRotate(!autoRotate)}
                  title="Włącz/wyłącz płynny obrót 360 stopni"
                >
                  <Sparkles size={14} />
                  <span>{autoRotate ? "ZATRZYMAJ" : "OBRÓT 360°"}</span>
                </button>

                <button
                  type="button"
                  className="modal-btn-close"
                  onClick={handleClose3D}
                  title="Zamknij podgląd"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* SCENA KARTY 3D */}
            <div className="v7b-3d-scene-stage">
              <Card3DEngine
                data={card3DData}
                isFlipped={isFlipped}
                autoRotate={autoRotate}
                interactive={true}
                enableHolo={true}
                enableParallax={true}
              />
            </div>

            {/* DOLNE DANE I STATUS POSIADANIA */}
            <div className="v7b-modal-footer">
              <div className="footer-status-pill">
                {ownedMap.has(inspectedCard.id) ? (
                  <span className="status-owned">
                    <Check size={14} />
                    <span>Ta karta znajduje się w Twoim albumie klubowym!</span>
                  </span>
                ) : (
                  <span className="status-unowned">
                    <Lock size={14} />
                    <span>Karta zablokowana — do wylosowania w paczkach DELTA INFERNO.</span>
                  </span>
                )}
              </div>

              <div className="footer-meta-chips">
                <span>Rzadkość: <b>{inspectedCard.rarity?.toUpperCase() || "STANDARD"}</b></span>
                <span>Typ: <b>{inspectedCard.card_type?.toUpperCase() || "BASE"}</b></span>
                <span>Sezon: <b>{inspectedCard.season || "2026/27"}</b></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerInfernoCards;
