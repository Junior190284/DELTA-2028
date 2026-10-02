"use client";

import React, { useState } from "react";
import { 
  Swords, 
  Crown, 
  Flame, 
  Sparkles, 
  X, 
  ChevronRight, 
  Trophy, 
  ShieldCheck, 
  Zap 
} from "lucide-react";
import { CardDefinition, UserCard, RARITY_CONFIG } from "@/lib/cards/types";
import CollectibleCard3D from "./CollectibleCard3D";

interface CardBattleCompareModalProps {
  cards: CardDefinition[];
  userCardsMap: Map<string, UserCard>;
  initialCardA?: CardDefinition;
  initialCardB?: CardDefinition;
  onClose: () => void;
}

export default function CardBattleCompareModal({
  cards,
  userCardsMap,
  initialCardA,
  initialCardB,
  onClose
}: CardBattleCompareModalProps) {
  const [cardA, setCardA] = useState<CardDefinition>(initialCardA || cards[0]);
  const [cardB, setCardB] = useState<CardDefinition>(initialCardB || cards[1] || cards[0]);

  const getPower = (c: CardDefinition) => {
    switch (c?.rarity?.toLowerCase()) {
      case "inferno": return 99;
      case "legendary": return 92;
      case "epic": return 85;
      case "rare": return 78;
      default: return 70;
    }
  };

  const getStats = (c: CardDefinition) => {
    const isInferno = c?.rarity === "inferno";
    const isLegend = c?.rarity === "legendary";
    return {
      power: getPower(c),
      matches: isInferno ? 18 : isLegend ? 14 : 9,
      goals: isInferno ? 15 : isLegend ? 9 : 4,
      assists: isInferno ? 11 : isLegend ? 8 : 3,
      trainings: isInferno ? 26 : isLegend ? 22 : 16
    };
  };

  const statsA = getStats(cardA);
  const statsB = getStats(cardB);

  // Determine overall match winner
  let winsA = 0;
  let winsB = 0;
  if (statsA.power > statsB.power) winsA++; else if (statsB.power > statsA.power) winsB++;
  if (statsA.goals > statsB.goals) winsA++; else if (statsB.goals > statsA.goals) winsB++;
  if (statsA.assists > statsB.assists) winsA++; else if (statsB.assists > statsA.assists) winsB++;
  if (statsA.matches > statsB.matches) winsA++; else if (statsB.matches > statsA.matches) winsB++;
  if (statsA.trainings > statsB.trainings) winsA++; else if (statsB.trainings > statsA.trainings) winsB++;

  return (
    <div className="v200-battle-backdrop" onClick={onClose}>
      <div className="v200-battle-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-battle-header">
          <div className="v200-battle-badge">
            <Swords size={16} className="text-yellow-400" />
            <span>HEAD-TO-HEAD CARD BATTLE</span>
          </div>
          <h2>PORÓWNYWARKA KART 3D</h2>
          <p>Porównaj atrybuty, statystyki meczowe i siłę dwóch kart kolekcjonerskich DELTA.</p>

          <button 
            type="button" 
            onClick={onClose}
            className="v200-battle-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= DUAL CARDS 3D ARENA ================= */}
        <div className="v200-battle-arena">
          {/* CARD A */}
          <div className="v200-battle-card-col">
            <div className="v200-battle-selector-wrap">
              <select
                value={cardA?.id}
                onChange={e => {
                  const target = cards.find(c => c.id === e.target.value);
                  if (target) setCardA(target);
                }}
                className="v200-battle-select"
              >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.player?.display_name || c.card_name} ({c.rarity.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="v200-battle-card-stage">
              {winsA > winsB && (
                <div className="v200-winner-crown-badge animate-bounce">
                  <Crown size={16} /> ZWYCIĘZCA POJEDYNKU
                </div>
              )}
              <CollectibleCard3D
                card={cardA}
                userCard={userCardsMap.get(cardA.id) || null}
                isLocked={false}
                size="lg"
                interactive={true}
                showFlip={true}
              />
            </div>
          </div>

          {/* VS FLAME BADGE */}
          <div className="v200-battle-vs-badge">
            <Flame size={24} className="text-red-500 animate-pulse" />
            <span>VS</span>
          </div>

          {/* CARD B */}
          <div className="v200-battle-card-col">
            <div className="v200-battle-selector-wrap">
              <select
                value={cardB?.id}
                onChange={e => {
                  const target = cards.find(c => c.id === e.target.value);
                  if (target) setCardB(target);
                }}
                className="v200-battle-select"
              >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.player?.display_name || c.card_name} ({c.rarity.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="v200-battle-card-stage">
              {winsB > winsA && (
                <div className="v200-winner-crown-badge animate-bounce">
                  <Crown size={16} /> ZWYCIĘZCA POJEDYNKU
                </div>
              )}
              <CollectibleCard3D
                card={cardB}
                userCard={userCardsMap.get(cardB.id) || null}
                isLocked={false}
                size="lg"
                interactive={true}
                showFlip={true}
              />
            </div>
          </div>
        </div>

        {/* ================= ATTRIBUTES COMPARISON MATRIX ================= */}
        <div className="v200-battle-metrics-table">
          {/* POWER RATING */}
          <div className="v200-metric-row">
            <span className={`v200-metric-val left ${statsA.power >= statsB.power ? "win" : ""}`}>
              {statsA.power} {statsA.power > statsB.power && <Crown size={12} className="inline ml-1" />}
            </span>
            <div className="v200-metric-center">
              <span className="v200-metric-label">SIŁA KARTY (OVR)</span>
              <div className="v200-metric-bar-dual">
                <div className="bar-left" style={{ width: `${(statsA.power / 99) * 100}%` }} />
                <div className="bar-right" style={{ width: `${(statsB.power / 99) * 100}%` }} />
              </div>
            </div>
            <span className={`v200-metric-val right ${statsB.power >= statsA.power ? "win" : ""}`}>
              {statsB.power} {statsB.power > statsA.power && <Crown size={12} className="inline ml-1" />}
            </span>
          </div>

          {/* GOALS */}
          <div className="v200-metric-row">
            <span className={`v200-metric-val left ${statsA.goals >= statsB.goals ? "win" : ""}`}>
              {statsA.goals}
            </span>
            <div className="v200-metric-center">
              <span className="v200-metric-label">GOLE W SEZONIE</span>
              <div className="v200-metric-bar-dual">
                <div className="bar-left gold" style={{ width: `${Math.min(100, (statsA.goals / 20) * 100)}%` }} />
                <div className="bar-right gold" style={{ width: `${Math.min(100, (statsB.goals / 20) * 100)}%` }} />
              </div>
            </div>
            <span className={`v200-metric-val right ${statsB.goals >= statsA.goals ? "win" : ""}`}>
              {statsB.goals}
            </span>
          </div>

          {/* ASSISTS */}
          <div className="v200-metric-row">
            <span className={`v200-metric-val left ${statsA.assists >= statsB.assists ? "win" : ""}`}>
              {statsA.assists}
            </span>
            <div className="v200-metric-center">
              <span className="v200-metric-label">ASYSTY</span>
              <div className="v200-metric-bar-dual">
                <div className="bar-left cyan" style={{ width: `${Math.min(100, (statsA.assists / 15) * 100)}%` }} />
                <div className="bar-right cyan" style={{ width: `${Math.min(100, (statsB.assists / 15) * 100)}%` }} />
              </div>
            </div>
            <span className={`v200-metric-val right ${statsB.assists >= statsA.assists ? "win" : ""}`}>
              {statsB.assists}
            </span>
          </div>

          {/* MATCHES */}
          <div className="v200-metric-row">
            <span className={`v200-metric-val left ${statsA.matches >= statsB.matches ? "win" : ""}`}>
              {statsA.matches}
            </span>
            <div className="v200-metric-center">
              <span className="v200-metric-label">MECZE OFICJALNE</span>
              <div className="v200-metric-bar-dual">
                <div className="bar-left slate" style={{ width: `${Math.min(100, (statsA.matches / 25) * 100)}%` }} />
                <div className="bar-right slate" style={{ width: `${Math.min(100, (statsB.matches / 25) * 100)}%` }} />
              </div>
            </div>
            <span className={`v200-metric-val right ${statsB.matches >= statsA.matches ? "win" : ""}`}>
              {statsB.matches}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
