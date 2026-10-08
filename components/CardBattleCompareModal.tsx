"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Swords, 
  Crown, 
  Flame, 
  Sparkles, 
  X, 
  ChevronRight, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Play, 
  RotateCcw, 
  Award, 
  Coins, 
  Shield, 
  CheckCircle2,
  Users,
  User,
  Target,
  Activity,
  FlameKindling,
  Timer
} from "lucide-react";
import { CardDefinition, UserCard, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface CardBattleCompareModalProps {
  cards: CardDefinition[];
  userCardsMap: Map<string, UserCard>;
  initialCardA?: CardDefinition;
  initialCardB?: CardDefinition;
  onClose: () => void;
  onRewardClaimed?: (points: number) => void;
}

interface RivalTeamConfig {
  id: string;
  name: string;
  logo: string;
  ovr: number;
  players: { name: string; pos: string; ovr: number; pac: number; sho: number; pas: number; dri: number; def: number; phy: number; photo?: string }[];
}

const RIVAL_TEAMS: RivalTeamConfig[] = [
  {
    id: "legia",
    name: "Legia Warszawa 2018",
    logo: "/teamlogos/gm.png",
    ovr: 87,
    players: [
      { name: "Maksymilian K.", pos: "NAP", ovr: 88, pac: 89, sho: 87, pas: 80, dri: 88, def: 65, phy: 78 },
      { name: "Filip W.", pos: "POM", ovr: 86, pac: 82, sho: 79, pas: 89, dri: 84, def: 78, phy: 80 },
      { name: "Aleksander B.", pos: "OBR", ovr: 85, pac: 80, sho: 60, pas: 75, dri: 74, def: 88, phy: 86 },
    ]
  },
  {
    id: "escola",
    name: "Escola Varsovia 2018",
    logo: "/teamlogos/gm.png",
    ovr: 86,
    players: [
      { name: "Mateusz Z.", pos: "NAP", ovr: 86, pac: 87, sho: 85, pas: 82, dri: 86, def: 60, phy: 74 },
      { name: "Wiktor N.", pos: "POM", ovr: 87, pac: 84, sho: 81, pas: 88, dri: 86, def: 76, phy: 79 },
      { name: "Szymon S.", pos: "OBR", ovr: 84, pac: 78, sho: 58, pas: 76, dri: 72, def: 86, phy: 85 },
    ]
  },
  {
    id: "znicz",
    name: "Znicz Pruszków 2018",
    logo: "/teamlogos/gm.png",
    ovr: 84,
    players: [
      { name: "Kacper M.", pos: "NAP", ovr: 84, pac: 85, sho: 83, pas: 76, dri: 82, def: 55, phy: 81 },
      { name: "Bartosz P.", pos: "POM", ovr: 85, pac: 80, sho: 77, pas: 85, dri: 81, def: 79, phy: 82 },
      { name: "Jakub K.", pos: "OBR", ovr: 84, pac: 77, sho: 55, pas: 72, dri: 70, def: 87, phy: 87 },
    ]
  },
  {
    id: "semp",
    name: "SEMP Ursynów 2018",
    logo: "/teamlogos/gm.png",
    ovr: 85,
    players: [
      { name: "Antoni G.", pos: "NAP", ovr: 85, pac: 86, sho: 84, pas: 78, dri: 84, def: 58, phy: 76 },
      { name: "Piotr L.", pos: "POM", ovr: 86, pac: 81, sho: 80, pas: 87, dri: 83, def: 77, phy: 80 },
      { name: "Marcel D.", pos: "OBR", ovr: 84, pac: 79, sho: 59, pas: 74, dri: 71, def: 85, phy: 84 },
    ]
  }
];

const DEFAULT_FALLBACK_CARD: CardDefinition = {
  id: "card_fallback_default",
  player_id: "p_default",
  season: "2026",
  card_name: "Zawodnik DELTA",
  card_type: "base",
  rarity: "rare",
  title: "Zawodnik DELTA",
  description: "Karta Zawodnika Rocznika 2018",
  artwork_url: "/teamlogos/gm.png",
  artwork_pose: null,
  frame_theme: "gold",
  card_number: 1,
  is_active: true,
  is_limited: false,
  edition_size: null,
  lore: null,
  match_id: null,
  special_event_id: null,
  created_at: new Date().toISOString(),
  player: {
    id: "p_default",
    display_name: "Zawodnik DELTA",
    shirt_number: "10",
    position: "POM",
    photo_path: null
  }
};

export default function CardBattleCompareModal({
  cards = [],
  userCardsMap = new Map(),
  initialCardA,
  initialCardB,
  onClose,
  onRewardClaimed
}: CardBattleCompareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [battleMode, setBattleMode] = useState<"1v1" | "match3v3">("1v1");

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const safeCards = useMemo(() => {
    return (cards && cards.length > 0) ? cards : [DEFAULT_FALLBACK_CARD];
  }, [cards]);

  // 1v1 State
  const [cardAId, setCardAId] = useState<string>(initialCardA?.id || safeCards[0]?.id || DEFAULT_FALLBACK_CARD.id);
  const [cardBId, setCardBId] = useState<string>(initialCardB?.id || safeCards[1]?.id || safeCards[0]?.id || DEFAULT_FALLBACK_CARD.id);

  const cardA = useMemo(() => {
    return safeCards.find(c => c.id === cardAId) || initialCardA || safeCards[0] || DEFAULT_FALLBACK_CARD;
  }, [safeCards, cardAId, initialCardA]);

  const cardB = useMemo(() => {
    return safeCards.find(c => c.id === cardBId) || initialCardB || safeCards[1] || safeCards[0] || DEFAULT_FALLBACK_CARD;
  }, [safeCards, cardBId, initialCardB]);

  // Available user cards or fallback to system cards
  const ownedCardsList = useMemo(() => {
    if (!userCardsMap || userCardsMap.size === 0) return safeCards;
    const owned = safeCards.filter(c => userCardsMap.has(c.id));
    return owned.length >= 3 ? owned : safeCards;
  }, [safeCards, userCardsMap]);

  // 3v3 Squad State
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [teamSquad, setTeamSquad] = useState<CardDefinition[]>([
    ownedCardsList[0] || DEFAULT_FALLBACK_CARD,
    ownedCardsList[1] || ownedCardsList[0] || DEFAULT_FALLBACK_CARD,
    ownedCardsList[2] || ownedCardsList[0] || DEFAULT_FALLBACK_CARD
  ]);

  // Rival Selection
  const [selectedRivalIndex, setSelectedRivalIndex] = useState<number>(0);
  const currentRival = RIVAL_TEAMS[selectedRivalIndex] || RIVAL_TEAMS[0];

  // Match Simulation State
  const [matchRunning, setMatchRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState<0 | 1 | 2 | 3>(0);
  const [matchScore, setMatchScore] = useState<{ delta: number; rival: number }>({ delta: 0, rival: 0 });
  const [roundLogs, setRoundLogs] = useState<{ round: number; text: string; win: boolean | null; deltaScore: number; rivalScore: number }[]>([]);
  const [matchWinner, setMatchWinner] = useState<"delta" | "rival" | "draw" | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Helper for computing authentic FIFA stats
  const getCardPower = (c: CardDefinition) => {
    if (!c) return 75;
    switch (c.rarity?.toLowerCase()) {
      case "inferno": return 95;
      case "legendary": return 90;
      case "epic": return 85;
      case "rare": return 80;
      default: return 75;
    }
  };

  const getStats = (c: CardDefinition) => {
    if (!c) {
      return {
        ovr: 75,
        pac: 75,
        sho: 72,
        pas: 74,
        dri: 75,
        def: 70,
        phy: 73,
        goals: 4,
        matches: 10
      };
    }
    const isInferno = c.rarity === "inferno";
    const isLegend = c.rarity === "legendary";
    const isEpic = c.rarity === "epic";
    const ovr = getCardPower(c);
    
    // Hash based variability so different players feel unique
    const hash = (c.player?.display_name || c.card_name || "DELTA").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const bonusPac = (hash % 5) - 2;
    const bonusSho = ((hash * 3) % 5) - 2;
    const bonusPas = ((hash * 7) % 5) - 2;

    return {
      ovr,
      pac: Math.min(99, Math.max(60, ovr - (isInferno ? 1 : isLegend ? 3 : 5) + bonusPac)),
      sho: Math.min(99, Math.max(60, (isInferno ? 94 : isLegend ? 87 : isEpic ? 81 : 73) + bonusSho)),
      pas: Math.min(99, Math.max(60, (isInferno ? 92 : isLegend ? 86 : isEpic ? 80 : 75) + bonusPas)),
      dri: Math.min(99, Math.max(60, (isInferno ? 95 : isLegend ? 88 : isEpic ? 82 : 76) + (hash % 3))),
      def: Math.min(99, Math.max(60, (isInferno ? 88 : isLegend ? 83 : isEpic ? 78 : 72) - bonusSho)),
      phy: Math.min(99, Math.max(60, (isInferno ? 91 : isLegend ? 85 : isEpic ? 80 : 74) + (hash % 4))),
      goals: isInferno ? 24 : isLegend ? 16 : isEpic ? 9 : 4,
      matches: isInferno ? 28 : isLegend ? 22 : isEpic ? 16 : 10
    };
  };

  const statsA = useMemo(() => getStats(cardA), [cardA]);
  const statsB = useMemo(() => getStats(cardB), [cardB]);

  // 1v1 Comparison calculations
  const comparisonList = useMemo(() => {
    return [
      { key: "ovr", label: "OCENA OGÓLNA (OVR)", valA: statsA.ovr, valB: statsB.ovr, color: "gold" },
      { key: "pac", label: "PAC · TEMPO & SZYBKOŚĆ", valA: statsA.pac, valB: statsB.pac, color: "cyan" },
      { key: "sho", label: "SHO · STRZAŁY & WYKOŃCZENIE", valA: statsA.sho, valB: statsB.sho, color: "gold" },
      { key: "pas", label: "PAS · PODANIA & ROZEGRANIE", valA: statsA.pas, valB: statsB.pas, color: "emerald" },
      { key: "dri", label: "DRI · DRYBLING & ZWINNOŚĆ", valA: statsA.dri, valB: statsB.dri, color: "purple" },
      { key: "def", label: "DEF · OBRONA & INTERWENCJE", valA: statsA.def, valB: statsB.def, color: "blue" },
      { key: "phy", label: "PHY · FIZYCZNOŚĆ & WALECZNOŚĆ", valA: statsA.phy, valB: statsB.phy, color: "red" },
      { key: "goals", label: "GOLE W SEZONIE", valA: statsA.goals, valB: statsB.goals, color: "amber" },
      { key: "matches", label: "MECZE ROZEGRANE", valA: statsA.matches, valB: statsB.matches, color: "slate" },
    ];
  }, [statsA, statsB]);

  const winsA = comparisonList.filter(c => c.valA > c.valB).length;
  const winsB = comparisonList.filter(c => c.valB > c.valA).length;

  // Handle card slot swap in 3v3
  const handleAssignCardToSlot = (slotIdx: number, newCard: CardDefinition) => {
    setTeamSquad(prev => {
      const next = [...prev];
      next[slotIdx] = newCard;
      return next;
    });
    setSelectedSlotIndex(null);
    cardSound.playHaptic("light");
  };

  // Start 3v3 Match Simulation
  const handleStart3v3Match = () => {
    setMatchRunning(true);
    setCurrentRound(1);
    setMatchScore({ delta: 0, rival: 0 });
    setRoundLogs([
      {
        round: 0,
        text: `⚡ Sędzia rozpoczyna hitowe starcie: DELTA 2018 vs ${currentRival.name}!`,
        win: null,
        deltaScore: 0,
        rivalScore: 0
      }
    ]);
    setMatchWinner(null);
    setRewardClaimed(false);
    cardSound.playPackTear();
    cardSound.playHaptic("medium");

    // ROUND 1: Szybkość & Rajd Skrzydłem (Atak vs Obrona)
    setTimeout(() => {
      const p1 = getStats(teamSquad[0]);
      const r1 = currentRival.players[0];
      const deltaPower1 = p1.pac + p1.dri + Math.floor(Math.random() * 8);
      const rivalPower1 = r1.pac + r1.dri + Math.floor(Math.random() * 8);
      const r1Won = deltaPower1 >= rivalPower1;

      setMatchScore(prev => ({
        delta: prev.delta + (r1Won ? 1 : 0),
        rival: prev.rival + (!r1Won ? 1 : 0)
      }));

      setRoundLogs(prev => [
        ...prev,
        {
          round: 1,
          text: r1Won
            ? `⚽ RUNDA 1 (Tempo & Rajd): GOL DLA DELTA! ${teamSquad[0].player?.display_name || teamSquad[0].card_name} urywa się obrońcy (${deltaPower1} vs ${rivalPower1})!`
            : `⚽ RUNDA 1 (Tempo & Rajd): Rywal ${r1.name} wykorzystuje kontrę (${rivalPower1} vs ${deltaPower1})!`,
          win: r1Won,
          deltaScore: deltaPower1,
          rivalScore: rivalPower1
        }
      ]);
      setCurrentRound(2);
      cardSound.playTeaserHit(1);
      cardSound.playHaptic(r1Won ? "heavy" : "medium");

      // ROUND 2: Środek Pola & Rozegranie (Pomoc vs Pomoc)
      setTimeout(() => {
        const p2 = getStats(teamSquad[1]);
        const r2 = currentRival.players[1];
        const deltaPower2 = p2.pas + p2.def + Math.floor(Math.random() * 8);
        const rivalPower2 = r2.pas + r2.def + Math.floor(Math.random() * 8);
        const r2Won = deltaPower2 >= rivalPower2;

        setMatchScore(prev => ({
          delta: prev.delta + (r2Won ? 1 : 0),
          rival: prev.rival + (!r2Won ? 1 : 0)
        }));

        setRoundLogs(prev => [
          ...prev,
          {
            round: 2,
            text: r2Won
              ? `🎯 RUNDA 2 (Rozegranie & Kontrola): Precyzyjny prostopadły pas ${teamSquad[1].player?.display_name || "Pomocnika"} i GOL! (${deltaPower2} vs ${rivalPower2})!`
              : `🎯 RUNDA 2 (Rozegranie & Kontrola): ${r2.name} dominuje środek boiska i trafia do siatki (${rivalPower2} vs ${deltaPower2})!`,
            win: r2Won,
            deltaScore: deltaPower2,
            rivalScore: rivalPower2
          }
        ]);
        setCurrentRound(3);
        cardSound.playTeaserHit(2);
        cardSound.playHaptic(r2Won ? "heavy" : "medium");

        // ROUND 3: Wykończenie & Strzały (Decydujące Starcie)
        setTimeout(() => {
          const p3 = getStats(teamSquad[2]);
          const r3 = currentRival.players[2];
          const deltaPower3 = p3.sho + p3.phy + Math.floor(Math.random() * 8);
          const rivalPower3 = r3.def + r3.phy + Math.floor(Math.random() * 8);
          const r3Won = deltaPower3 >= rivalPower3;

          const finalDelta = (r1Won ? 1 : 0) + (r2Won ? 1 : 0) + (r3Won ? 1 : 0);
          const finalRival = (!r1Won ? 1 : 0) + (!r2Won ? 1 : 0) + (!r3Won ? 1 : 0);

          setMatchScore({ delta: finalDelta, rival: finalRival });
          setRoundLogs(prev => [
            ...prev,
            {
              round: 3,
              text: r3Won
                ? `🔥 RUNDA 3 (Strzały & Finał): Bomba w samo okienko dla DELTY (${deltaPower3} vs ${rivalPower3})!`
                : `🔥 RUNDA 3 (Strzały & Finał): ${r3.name} blokuje uderzenie i wyprowadza zwycięski cios (${rivalPower3} vs ${deltaPower3})!`,
              win: r3Won,
              deltaScore: deltaPower3,
              rivalScore: rivalPower3
            }
          ]);

          const winner = finalDelta > finalRival ? "delta" : finalDelta < finalRival ? "rival" : "draw";
          setMatchWinner(winner);
          setMatchRunning(false);

          if (winner === "delta") {
            cardSound.playWalkoutFanfare();
            cardSound.playHaptic("walkout");
          } else {
            cardSound.playFlip();
            cardSound.playHaptic("medium");
          }
        }, 1300);
      }, 1300);
    }, 1300);
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div 
      className="v200-battle-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="v200-battle-sheet" 
        onClick={e => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="v200-battle-top-nav">
          <div className="nav-left">
            <div className="v200-battle-crest-glow">
              <Swords size={22} className="text-yellow-400" />
            </div>
            <div>
              <div className="v200-arena-eyebrow">
                <Sparkles size={12} className="text-yellow-400 inline mr-1" />
                DELTA BATTLE ARENA · EA FC BROADCAST
              </div>
              <h2 className="v200-arena-sheet-title">POJEDYNKI KART & MINI-MECZE 3v3</h2>
            </div>
          </div>

          <div className="nav-right">
            {/* Mode Switcher Tabs */}
            <div className="v200-arena-mode-tabs">
              <button
                type="button"
                onClick={() => setBattleMode("1v1")}
                className={`v200-arena-mode-btn ${battleMode === "1v1" ? "active" : ""}`}
              >
                <User size={15} />
                <span>POJEDYNEK 1v1</span>
              </button>
              <button
                type="button"
                onClick={() => setBattleMode("match3v3")}
                className={`v200-arena-mode-btn ${battleMode === "match3v3" ? "active" : ""}`}
              >
                <Users size={15} />
                <span>MINI-MECZ 3v3</span>
              </button>
            </div>

            <button 
              type="button" 
              onClick={onClose}
              className="v200-arena-close-circle"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="v200-battle-scrollable-body">
          {/* ========================================================================= */}
          {/* 1. MODE: 1v1 CARD STATS COMPARISON */}
          {/* ========================================================================= */}
          {battleMode === "1v1" && (
            <div className="v200-1v1-pane animate-fadeIn">
              {/* Head-to-Head Clash Stage */}
              <div className="v200-1v1-stage-card">
                {/* Fighter A (Left) */}
                <div className="v200-fighter-column left">
                  <div className="fighter-selector-tray">
                    <label>WYBIERZ KARTĘ A (LEWA):</label>
                    <select
                      value={cardAId}
                      onChange={e => setCardAId(e.target.value)}
                      className="v200-battle-select-field"
                    >
                      {safeCards.map(c => (
                        <option key={`a_${c.id}`} value={c.id}>
                          {c.player?.display_name || c.card_name} ({c.rarity?.toUpperCase()}) · OVR {getCardPower(c)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="fighter-crown-indicator">
                    {winsA > winsB ? (
                      <span className="crown-badge gold animate-bounce">
                        <Crown size={14} /> DOMINUJE ({winsA} / {comparisonList.length})
                      </span>
                    ) : (
                      <span className="crown-badge neutral">{winsA} pkt</span>
                    )}
                  </div>

                  <div className="fighter-3d-card-wrapper">
                    <CollectibleCard3D
                      card={cardA}
                      userCard={userCardsMap?.get(cardA?.id || "") || null}
                      isLocked={false}
                      size="md"
                      interactive={true}
                      showFlip={true}
                    />
                  </div>
                </div>

                {/* Center VS Emblem */}
                <div className="v200-vs-center-column">
                  <div className="vs-blast-ring">
                    <Flame size={28} className="text-red-500 animate-pulse" />
                    <span className="vs-text">VS</span>
                  </div>
                  <div className="vs-tagline">STARCIE ATRYBUTÓW</div>
                  <div className="vs-score-indicator">
                    <span className={`score-digit ${winsA > winsB ? 'lead' : ''}`}>{winsA}</span>
                    <span className="colon">:</span>
                    <span className={`score-digit ${winsB > winsA ? 'lead' : ''}`}>{winsB}</span>
                  </div>
                </div>

                {/* Fighter B (Right) */}
                <div className="v200-fighter-column right">
                  <div className="fighter-selector-tray">
                    <label>WYBIERZ KARTĘ B (PRAWA):</label>
                    <select
                      value={cardBId}
                      onChange={e => setCardBId(e.target.value)}
                      className="v200-battle-select-field"
                    >
                      {safeCards.map(c => (
                        <option key={`b_${c.id}`} value={c.id}>
                          {c.player?.display_name || c.card_name} ({c.rarity?.toUpperCase()}) · OVR {getCardPower(c)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="fighter-crown-indicator">
                    {winsB > winsA ? (
                      <span className="crown-badge gold animate-bounce">
                        <Crown size={14} /> DOMINUJE ({winsB} / {comparisonList.length})
                      </span>
                    ) : (
                      <span className="crown-badge neutral">{winsB} pkt</span>
                    )}
                  </div>

                  <div className="fighter-3d-card-wrapper">
                    <CollectibleCard3D
                      card={cardB}
                      userCard={userCardsMap?.get(cardB?.id || "") || null}
                      isLocked={false}
                      size="md"
                      interactive={true}
                      showFlip={true}
                    />
                  </div>
                </div>
              </div>

              {/* Attributes Comparison Matrix */}
              <div className="v200-stats-matrix-card">
                <div className="matrix-header">
                  <h3>SZCZEGÓŁOWE PORÓWNANIE ATRYBUTÓW FIFA / EA FC</h3>
                  <p>Bezpośrednie zestawienie kluczowych parametrów i statystyk boiskowych</p>
                </div>

                <div className="matrix-rows-list">
                  {comparisonList.map((metric) => {
                    const aWon = metric.valA > metric.valB;
                    const bWon = metric.valB > metric.valA;
                    const isDraw = metric.valA === metric.valB;
                    const diff = Math.abs(metric.valA - metric.valB);

                    return (
                      <div key={metric.key} className="matrix-row-item">
                        {/* Left Value */}
                        <div className={`metric-num left ${aWon ? 'winner' : ''}`}>
                          {metric.valA}
                          {aWon && diff > 0 && <span className="diff-pill plus">+{diff}</span>}
                        </div>

                        {/* Center Bars & Label */}
                        <div className="metric-center-track">
                          <span className="metric-title">{metric.label}</span>
                          <div className="metric-dual-progress-bar">
                            <div 
                              className={`bar-fill left ${metric.color} ${aWon ? 'is-winner' : ''}`}
                              style={{ width: `${Math.min(100, (metric.valA / (metric.key === 'goals' || metric.key === 'matches' ? 35 : 99)) * 100)}%` }}
                            />
                            <div 
                              className={`bar-fill right ${metric.color} ${bWon ? 'is-winner' : ''}`}
                              style={{ width: `${Math.min(100, (metric.valB / (metric.key === 'goals' || metric.key === 'matches' ? 35 : 99)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Right Value */}
                        <div className={`metric-num right ${bWon ? 'winner' : ''}`}>
                          {metric.valB}
                          {bWon && diff > 0 && <span className="diff-pill plus">+{diff}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. MODE: MINI-MECZ 3v3 (EA FC BROADCAST ARENA) */}
          {/* ========================================================================= */}
          {battleMode === "match3v3" && (
            <div className="v200-3v3-pane animate-fadeIn">
              {/* Rival & Settings Bar */}
              <div className="v200-rival-bar-card">
                <div className="rival-picker-box">
                  <label className="rival-label">WYBIERZ PRZECIWNIKA (RYWALE Z MAZOWSZA):</label>
                  <div className="rival-clubs-scroll">
                    {RIVAL_TEAMS.map((rival, rIdx) => (
                      <button
                        key={rival.id}
                        type="button"
                        onClick={() => {
                          setSelectedRivalIndex(rIdx);
                          if (!matchRunning) setMatchWinner(null);
                        }}
                        className={`rival-club-btn ${selectedRivalIndex === rIdx ? 'active' : ''}`}
                      >
                        <span className="club-badge">OVR {rival.ovr}</span>
                        <strong className="club-name">{rival.name}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Broadcast Scoreboard Banner */}
              <div className="v200-broadcast-scoreboard">
                {/* DELTA TEAM */}
                <div className="scoreboard-team left">
                  <div className="team-crest-box">
                    <img src="/teamlogos/gm.png" alt="DELTA" />
                  </div>
                  <div className="team-meta">
                    <span className="team-badge-tag gold">GOSPODARZE</span>
                    <h4>DELTA WARSZAWA 2018</h4>
                    <small>Skład 3 Wybranych Kart</small>
                  </div>
                </div>

                {/* Score & Match Clock Center */}
                <div className="scoreboard-center-display">
                  <div className="scoreboard-status-pill">
                    {matchRunning ? (
                      <span className="live-pill animate-pulse">
                        <Activity size={13} className="inline mr-1" />
                        RUNDA {currentRound}/3 NA ŻYWO
                      </span>
                    ) : matchWinner ? (
                      <span className="final-pill">🏁 KONIEC SPOTKANIA</span>
                    ) : (
                      <span className="ready-pill">⚡ GOTOWY DO GRY</span>
                    )}
                  </div>

                  <div className="scoreboard-digits">
                    <span className="score-num delta">{matchScore.delta}</span>
                    <span className="score-colon">:</span>
                    <span className="score-num rival">{matchScore.rival}</span>
                  </div>

                  <div className="scoreboard-sub-info">
                    {currentRound === 1 && "⚽ RUNDA 1: TEMPO & RAJD"}
                    {currentRound === 2 && "🎯 RUNDA 2: ROZEGRANIE & POMOC"}
                    {currentRound === 3 && "🔥 RUNDA 3: STRZAŁY & WYKOŃCZENIE"}
                    {currentRound === 0 && !matchWinner && "Format: 3 Rundy · OVR i Atrybuty"}
                  </div>
                </div>

                {/* RIVAL TEAM */}
                <div className="scoreboard-team right">
                  <div className="team-meta right">
                    <span className="team-badge-tag red">GOŚCIE</span>
                    <h4>{currentRival.name}</h4>
                    <small>OVR Średnie: {currentRival.ovr}</small>
                  </div>
                  <div className="team-crest-box rival">
                    <span>⚔️</span>
                  </div>
                </div>
              </div>

              {/* TACTICAL PITCH STAGE (3 SLOTS vs 3 SLOTS) */}
              <div className="v200-tactical-pitch-stage">
                {/* DELTA SQUAD COLUMN */}
                <div className="pitch-squad-column delta">
                  <div className="squad-column-header">
                    <Shield size={14} className="text-yellow-400" />
                    <span>TWÓJ SKŁAD (KLIKNIJ, ABY ZMIENIĆ KARTĘ)</span>
                  </div>

                  <div className="squad-slots-grid">
                    {teamSquad.map((cardItem, slotIdx) => {
                      const stats = getStats(cardItem);
                      const roleName = slotIdx === 0 ? "NAPAD (TEMPO)" : slotIdx === 1 ? "POMOC (PODANIA)" : "OBRONA (FIZYCZNOŚĆ)";
                      const isCurrentRoundHero = currentRound === (slotIdx + 1);

                      return (
                        <div
                          key={`delta_slot_${slotIdx}`}
                          className={`pitch-card-slot ${isCurrentRoundHero ? 'active-round-hero' : ''}`}
                          onClick={() => setSelectedSlotIndex(slotIdx)}
                        >
                          <div className="slot-role-tag">{roleName}</div>
                          
                          <div className="slot-card-preview">
                            <div className="mini-card-badge">
                              <span className="mini-ovr">{stats.ovr}</span>
                              <span className="mini-pos">{slotIdx === 0 ? 'NAP' : slotIdx === 1 ? 'POM' : 'OBR'}</span>
                            </div>
                            <div className="mini-player-name">{cardItem?.player?.display_name || cardItem?.card_name}</div>
                            <div className="mini-rarity-tag">{cardItem?.rarity?.toUpperCase()}</div>
                          </div>

                          <div className="slot-stat-strip">
                            {slotIdx === 0 && <span>PAC: <strong>{stats.pac}</strong> · DRI: <strong>{stats.dri}</strong></span>}
                            {slotIdx === 1 && <span>PAS: <strong>{stats.pas}</strong> · DEF: <strong>{stats.def}</strong></span>}
                            {slotIdx === 2 && <span>SHO: <strong>{stats.sho}</strong> · PHY: <strong>{stats.phy}</strong></span>}
                          </div>

                          <div className="slot-swap-hint">Zmień kartę ▾</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CENTER MATCH PITCH CONNECTOR */}
                <div className="pitch-center-divider">
                  <div className="center-circle-ring">
                    <Swords size={20} className="text-yellow-400 animate-spin-slow" />
                  </div>
                </div>

                {/* RIVAL SQUAD COLUMN */}
                <div className="pitch-squad-column rival">
                  <div className="squad-column-header right">
                    <Swords size={14} className="text-red-400" />
                    <span>SKŁAD RYWALA: {currentRival.name}</span>
                  </div>

                  <div className="squad-slots-grid">
                    {currentRival.players.map((rPlayer, rIdx) => {
                      const roleName = rIdx === 0 ? "NAPAD (TEMPO)" : rIdx === 1 ? "POMOC (PODANIA)" : "OBRONA (FIZYCZNOŚĆ)";
                      const isCurrentRoundHero = currentRound === (rIdx + 1);

                      return (
                        <div
                          key={`rival_slot_${rIdx}`}
                          className={`pitch-card-slot rival ${isCurrentRoundHero ? 'active-round-hero' : ''}`}
                        >
                          <div className="slot-role-tag rival">{roleName}</div>
                          
                          <div className="slot-card-preview rival">
                            <div className="mini-card-badge rival">
                              <span className="mini-ovr">{rPlayer.ovr}</span>
                              <span className="mini-pos">{rPlayer.pos}</span>
                            </div>
                            <div className="mini-player-name">{rPlayer.name}</div>
                            <div className="mini-rarity-tag rival">RYWAL 2018</div>
                          </div>

                          <div className="slot-stat-strip">
                            {rIdx === 0 && <span>PAC: <strong>{rPlayer.pac}</strong> · DRI: <strong>{rPlayer.dri}</strong></span>}
                            {rIdx === 1 && <span>PAS: <strong>{rPlayer.pas}</strong> · DEF: <strong>{rPlayer.def}</strong></span>}
                            {rIdx === 2 && <span>SHO: <strong>{rPlayer.sho}</strong> · PHY: <strong>{rPlayer.phy}</strong></span>}
                          </div>

                          <div className="slot-swap-hint rival">AI Bot</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CARD PICKER MODAL/DRAWER (When user clicks a slot) */}
              {selectedSlotIndex !== null && (
                <div className="v200-slot-card-picker animate-fadeIn">
                  <div className="picker-header">
                    <h4>
                      Wybierz kartę na pozycję: {selectedSlotIndex === 0 ? "NAPAD" : selectedSlotIndex === 1 ? "POMOC" : "OBRONA"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedSlotIndex(null)}
                      className="picker-close-btn"
                    >
                      <X size={16} /> Zamknij
                    </button>
                  </div>
                  <div className="picker-grid">
                    {ownedCardsList.map(c => {
                      const cStats = getStats(c);
                      return (
                        <button
                          key={`pick_${c.id}`}
                          type="button"
                          onClick={() => handleAssignCardToSlot(selectedSlotIndex, c)}
                          className="picker-item-btn"
                        >
                          <div className="picker-ovr-tag">{cStats.ovr}</div>
                          <div className="picker-meta">
                            <strong>{c.player?.display_name || c.card_name}</strong>
                            <small>{c.rarity?.toUpperCase()} · PAC {cStats.pac} / SHO {cStats.sho} / PAS {cStats.pas}</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Commentary & Event Log */}
              <div className="v200-broadcast-commentary-box">
                <div className="commentary-header">
                  <Timer size={14} className="text-yellow-400" />
                  <span>KOMENTARZ MECZOWY NA ŻYWO (BROADCAST FEED):</span>
                </div>

                <div className="commentary-scroll">
                  {roundLogs.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`commentary-line animate-fadeIn ${item.win === true ? 'win' : item.win === false ? 'loss' : 'neutral'}`}
                    >
                      <span className="line-icon">{item.win === true ? '🟢' : item.win === false ? '🔴' : '⚡'}</span>
                      <span className="line-text">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Action Button & Results Panel */}
              <div className="v200-match-action-bottom">
                {!matchRunning && !matchWinner && (
                  <button
                    type="button"
                    onClick={handleStart3v3Match}
                    className="v200-big-start-match-btn"
                  >
                    <Play size={20} className="fill-current" />
                    <span>ROZPOCZNIJ MINI-MECZ 3v3</span>
                  </button>
                )}

                {matchRunning && (
                  <div className="v200-match-in-progress-banner">
                    <Zap size={20} className="text-yellow-400 animate-bounce" />
                    <span>TRWA SYMULACJA RUNDY {currentRound}/3... OBLICZANIE WYNIKU!</span>
                  </div>
                )}

                {matchWinner && (
                  <div className="v200-match-outcome-stage animate-scaleUp">
                    {matchWinner === "delta" && (
                      <div className="match-outcome-card victory">
                        <div className="outcome-icon">
                          <Crown size={32} className="text-yellow-400 animate-bounce" />
                        </div>
                        <div className="outcome-text">
                          <h3>WSPANIAŁE ZWYCIĘSTWO DELTY!</h3>
                          <p>Twoje karty zdominowały rywala w kluczowych pojedynkach meczowych.</p>
                        </div>

                        {!rewardClaimed ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRewardClaimed(true);
                              if (onRewardClaimed) onRewardClaimed(25);
                              cardSound.playPurchase();
                              cardSound.playHaptic("medium");
                            }}
                            className="outcome-claim-btn"
                          >
                            <Coins size={16} /> ODBIERZ NAGRODĘ: +25 DP
                          </button>
                        ) : (
                          <div className="outcome-claimed-pill">
                            <CheckCircle2 size={16} className="text-green-400" /> Nagroda +25 DP odebrana!
                          </div>
                        )}
                      </div>
                    )}

                    {matchWinner === "rival" && (
                      <div className="match-outcome-card defeat">
                        <div className="outcome-icon">
                          <ShieldCheck size={32} className="text-red-400" />
                        </div>
                        <div className="outcome-text">
                          <h3>MINIMALNA PORAŻKA SKŁADU</h3>
                          <p>Rywal okazał się skuteczniejszy w pojedynkach. Wzmocnij skład w paczkach i weź rewanż!</p>
                        </div>
                      </div>
                    )}

                    {matchWinner === "draw" && (
                      <div className="match-outcome-card draw">
                        <div className="outcome-icon">
                          <ShieldCheck size={32} className="text-slate-400" />
                        </div>
                        <div className="outcome-text">
                          <h3>ZACIĘTY REMIS 1 : 1</h3>
                          <p>Wyrównany bój dwóch świetnych zespołów z rocznika 2018.</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleStart3v3Match}
                      className="outcome-replay-btn"
                    >
                      <RotateCcw size={16} /> ZAGRAJ REWANŻ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
