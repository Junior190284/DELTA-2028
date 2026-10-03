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
  Zap,
  Play,
  RotateCcw,
  Award,
  Coins,
  Shield,
  CheckCircle2
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

export default function CardBattleCompareModal({
  cards,
  userCardsMap,
  initialCardA,
  initialCardB,
  onClose,
  onRewardClaimed
}: CardBattleCompareModalProps) {
  const [battleMode, setBattleMode] = useState<"1v1" | "match3v3">("1v1");

  // 1v1 State
  const [cardA, setCardA] = useState<CardDefinition>(initialCardA || cards[0]);
  const [cardB, setCardB] = useState<CardDefinition>(initialCardB || cards[1] || cards[0]);

  // 3v3 Match State
  const ownedCardsList = cards.filter(c => userCardsMap.has(c.id));
  const availableUserCards = ownedCardsList.length >= 3 ? ownedCardsList : cards;

  const [selectedTeam, setSelectedTeam] = useState<CardDefinition[]>([
    availableUserCards[0],
    availableUserCards[1] || availableUserCards[0],
    availableUserCards[2] || availableUserCards[0]
  ]);

  const [opponentName, setOpponentName] = useState("Legia Warszawa 2018");
  const [matchRunning, setMatchRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [matchScore, setMatchScore] = useState({ delta: 0, rival: 0 });
  const [roundLogs, setRoundLogs] = useState<string[]>([]);
  const [matchWinner, setMatchWinner] = useState<"delta" | "rival" | "draw" | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Helper for computing authentic FIFA stats
  const getCardPower = (c: CardDefinition) => {
    switch (c?.rarity?.toLowerCase()) {
      case "inferno": return 95;
      case "legendary": return 89;
      case "epic": return 84;
      case "rare": return 79;
      default: return 74;
    }
  };

  const getStats = (c: CardDefinition) => {
    const isInferno = c?.rarity === "inferno";
    const isLegend = c?.rarity === "legendary";
    const isEpic = c?.rarity === "epic";
    const ovr = getCardPower(c);
    return {
      ovr,
      pac: ovr - (isInferno ? 1 : isLegend ? 3 : 5),
      sho: isInferno ? 94 : isLegend ? 87 : isEpic ? 81 : 73,
      pas: isInferno ? 92 : isLegend ? 86 : isEpic ? 80 : 75,
      dri: isInferno ? 95 : isLegend ? 88 : isEpic ? 82 : 76,
      def: isInferno ? 88 : isLegend ? 83 : isEpic ? 78 : 72,
      phy: isInferno ? 91 : isLegend ? 85 : isEpic ? 80 : 74,
      goals: isInferno ? 18 : isLegend ? 12 : isEpic ? 7 : 3,
      matches: isInferno ? 22 : isLegend ? 18 : isEpic ? 14 : 9
    };
  };

  const statsA = getStats(cardA);
  const statsB = getStats(cardB);

  // Determine 1v1 winner
  let winsA = 0;
  let winsB = 0;
  if (statsA.ovr > statsB.ovr) winsA++; else if (statsB.ovr > statsA.ovr) winsB++;
  if (statsA.pac > statsB.pac) winsA++; else if (statsB.pac > statsA.pac) winsB++;
  if (statsA.sho > statsB.sho) winsA++; else if (statsB.sho > statsA.sho) winsB++;
  if (statsA.pas > statsB.pas) winsA++; else if (statsB.pas > statsA.pas) winsB++;
  if (statsA.dri > statsB.dri) winsA++; else if (statsB.dri > statsA.dri) winsB++;
  if (statsA.def > statsB.def) winsA++; else if (statsB.def > statsA.def) winsB++;
  if (statsA.phy > statsB.phy) winsA++; else if (statsB.phy > statsA.phy) winsB++;

  // Opponent Squad for 3v3
  const rivalCards = [
    cards.find(c => c.rarity === "epic") || cards[0],
    cards.find(c => c.rarity === "rare") || cards[1] || cards[0],
    cards.find(c => c.rarity === "legendary") || cards[2] || cards[0]
  ];

  // Start 3v3 Match Simulation
  const handleStart3v3Match = () => {
    setMatchRunning(true);
    setCurrentRound(1);
    setMatchScore({ delta: 0, rival: 0 });
    setRoundLogs(["⚡ Sędzia rozpoczyna mecz w EA FC Arenie DELTA 2018!"]);
    setMatchWinner(null);
    setRewardClaimed(false);
    cardSound.playPackTear();
    cardSound.playHaptic("medium");

    // Round 1: Pace & Dribble
    setTimeout(() => {
      const p1 = getStats(selectedTeam[0]);
      const r1 = getStats(rivalCards[0]);
      const scoreDelta = p1.pac + p1.dri;
      const scoreRival = r1.pac + r1.dri;
      const round1Win = scoreDelta > scoreRival || (scoreDelta === scoreRival && Math.random() >= 0.5);

      setMatchScore(prev => ({
        delta: prev.delta + (round1Win ? 1 : 0),
        rival: prev.rival + (!round1Win ? 1 : 0)
      }));

      setRoundLogs(prev => [
        ...prev,
        round1Win
          ? `⚽ RUNDA 1 (Szybkość & Drybling): GOL DLA DELTA! ${selectedTeam[0].player?.display_name || "Zawodnik"} mija obronę (${scoreDelta} vs ${scoreRival})!`
          : `⚽ RUNDA 1 (Szybkość & Drybling): Rywal trafia po kontrze (${scoreRival} vs ${scoreDelta})!`
      ]);
      setCurrentRound(2);
      cardSound.playTeaserHit(1);
      cardSound.playHaptic(round1Win ? "heavy" : "medium");

      // Round 2: Tactics & Passing
      setTimeout(() => {
        const p2 = getStats(selectedTeam[1]);
        const r2 = getStats(rivalCards[1]);
        const scoreDelta2 = p2.pas + p2.def;
        const scoreRival2 = r2.pas + r2.def;
        const round2Win = scoreDelta2 > scoreRival2 || (scoreDelta2 === scoreRival2 && Math.random() >= 0.5);

        setMatchScore(prev => ({
          delta: prev.delta + (round2Win ? 1 : 0),
          rival: prev.rival + (!round2Win ? 1 : 0)
        }));

        setRoundLogs(prev => [
          ...prev,
          round2Win
            ? `🎯 RUNDA 2 (Rozegranie & Obrona): Wspaniała asysta i GOL DELTA (${scoreDelta2} vs ${scoreRival2})!`
            : `🎯 RUNDA 2 (Rozegranie & Obrona): Rywal przejmuje piłkę i strzela (${scoreRival2} vs ${scoreDelta2})!`
        ]);
        setCurrentRound(3);
        cardSound.playTeaserHit(2);
        cardSound.playHaptic(round2Win ? "heavy" : "medium");

        // Round 3: Shot & Physical Clash
        setTimeout(() => {
          const p3 = getStats(selectedTeam[2]);
          const r3 = getStats(rivalCards[2]);
          const scoreDelta3 = p3.sho + p3.phy;
          const scoreRival3 = r3.sho + r3.phy;
          const round3Win = scoreDelta3 > scoreRival3 || (scoreDelta3 === scoreRival3 && Math.random() >= 0.5);

          const finalDelta = (round1Win ? 1 : 0) + (round2Win ? 1 : 0) + (round3Win ? 1 : 0);
          const finalRival = (!round1Win ? 1 : 0) + (!round2Win ? 1 : 0) + (!round3Win ? 1 : 0);

          setMatchScore({ delta: finalDelta, rival: finalRival });
          setRoundLogs(prev => [
            ...prev,
            round3Win
              ? `🔥 RUNDA 3 (Strzały & Siła): Potężny wolej w okienko dla DELTA (${scoreDelta3} vs ${scoreRival3})!`
              : `🔥 RUNDA 3 (Strzały & Siła): Rywal odpowiada mocnym uderzeniem (${scoreRival3} vs ${scoreDelta3})!`,
            `🏁 KONIEC SPOTKANIA! Wynik: DELTA ${finalDelta} - ${finalRival} ${opponentName}`
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
        }, 1400);
      }, 1400);
    }, 1400);
  };

  return (
    <div className="v200-battle-backdrop" onClick={onClose}>
      <div className="v200-battle-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-battle-header">
          <div className="v200-battle-badge">
            <Swords size={16} className="text-yellow-400" />
            <span>DELTA EA FC BATTLE ARENA</span>
          </div>
          <h2>POJEDYNKI KART & MINI-MECZE 3D</h2>
          <p>Porównuj atrybuty kart lub wystaw swój 3-osobowy skład do dynamicznej symulacji meczowej!</p>

          <button 
            type="button" 
            onClick={onClose}
            className="v200-battle-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="v200-battle-modes-row">
          <button
            type="button"
            onClick={() => setBattleMode("1v1")}
            className={`v200-battle-mode-tab ${battleMode === "1v1" ? "active" : ""}`}
          >
            <Swords size={15} />
            <span>POJEDYNEK 1v1 (STATYSTYKI)</span>
          </button>

          <button
            type="button"
            onClick={() => setBattleMode("match3v3")}
            className={`v200-battle-mode-tab ${battleMode === "match3v3" ? "active" : ""}`}
          >
            <Trophy size={15} />
            <span>MINI-MECZ 3v3 (DELTA ARENA)</span>
          </button>
        </div>

        {/* ================= MODE 1: 1v1 STATS CLASH ================= */}
        {battleMode === "1v1" && (
          <div className="v200-battle-1v1-content">
            {/* DUAL CARDS 3D ARENA */}
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
                      <Crown size={15} /> ZWYCIĘZCA POJEDYNKU
                    </div>
                  )}
                  <CollectibleCard3D
                    card={cardA}
                    userCard={userCardsMap.get(cardA.id) || null}
                    isLocked={false}
                    size="md"
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
                      <Crown size={15} /> ZWYCIĘZCA POJEDYNKU
                    </div>
                  )}
                  <CollectibleCard3D
                    card={cardB}
                    userCard={userCardsMap.get(cardB.id) || null}
                    isLocked={false}
                    size="md"
                    interactive={true}
                    showFlip={true}
                  />
                </div>
              </div>
            </div>

            {/* ATTRIBUTES MATRIX */}
            <div className="v200-battle-metrics-table">
              {/* OVR */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.ovr >= statsB.ovr ? "win" : ""}`}>
                  {statsA.ovr} {statsA.ovr > statsB.ovr && <Crown size={12} className="inline ml-1" />}
                </span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">OCENA OGÓLNA (OVR)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left" style={{ width: `${(statsA.ovr / 99) * 100}%` }} />
                    <div className="bar-right" style={{ width: `${(statsB.ovr / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.ovr >= statsA.ovr ? "win" : ""}`}>
                  {statsB.ovr} {statsB.ovr > statsA.ovr && <Crown size={12} className="inline ml-1" />}
                </span>
              </div>

              {/* PACE */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.pac >= statsB.pac ? "win" : ""}`}>{statsA.pac}</span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">PAC (TEMPO & SZYBKOŚĆ)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left cyan" style={{ width: `${(statsA.pac / 99) * 100}%` }} />
                    <div className="bar-right cyan" style={{ width: `${(statsB.pac / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.pac >= statsA.pac ? "win" : ""}`}>{statsB.pac}</span>
              </div>

              {/* SHOOTING */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.sho >= statsB.sho ? "win" : ""}`}>{statsA.sho}</span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">SHO (STRZAŁY & WYKOŃCZENIE)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left gold" style={{ width: `${(statsA.sho / 99) * 100}%` }} />
                    <div className="bar-right gold" style={{ width: `${(statsB.sho / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.sho >= statsA.sho ? "win" : ""}`}>{statsB.sho}</span>
              </div>

              {/* PASSING */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.pas >= statsB.pas ? "win" : ""}`}>{statsA.pas}</span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">PAS (PODANIA & ROZEGRANIE)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left" style={{ width: `${(statsA.pas / 99) * 100}%` }} />
                    <div className="bar-right" style={{ width: `${(statsB.pas / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.pas >= statsA.pas ? "win" : ""}`}>{statsB.pas}</span>
              </div>

              {/* DRIBBLE */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.dri >= statsB.dri ? "win" : ""}`}>{statsA.dri}</span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">DRI (DRYBLING & ZWINNOŚĆ)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left emerald" style={{ width: `${(statsA.dri / 99) * 100}%` }} />
                    <div className="bar-right emerald" style={{ width: `${(statsB.dri / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.dri >= statsA.dri ? "win" : ""}`}>{statsB.dri}</span>
              </div>

              {/* DEFENSE */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.def >= statsB.def ? "win" : ""}`}>{statsA.def}</span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">DEF (OBRONA & ODBIORY)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left slate" style={{ width: `${(statsA.def / 99) * 100}%` }} />
                    <div className="bar-right slate" style={{ width: `${(statsB.def / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.def >= statsA.def ? "win" : ""}`}>{statsB.def}</span>
              </div>

              {/* PHYSICAL */}
              <div className="v200-metric-row">
                <span className={`v200-metric-val left ${statsA.phy >= statsB.phy ? "win" : ""}`}>{statsA.phy}</span>
                <div className="v200-metric-center">
                  <span className="v200-metric-label">PHY (FIZYCZNOŚĆ & WALECZNOŚĆ)</span>
                  <div className="v200-metric-bar-dual">
                    <div className="bar-left red" style={{ width: `${(statsA.phy / 99) * 100}%` }} />
                    <div className="bar-right red" style={{ width: `${(statsB.phy / 99) * 100}%` }} />
                  </div>
                </div>
                <span className={`v200-metric-val right ${statsB.phy >= statsA.phy ? "win" : ""}`}>{statsB.phy}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODE 2: 3v3 MINI-MECZ ARENA ================= */}
        {battleMode === "match3v3" && (
          <div className="v200-battle-3v3-content">
            {/* Scoreboard */}
            <div className="v200-scoreboard-card">
              <div className="v200-score-team left">
                <img src="/teamlogos/gm.png" alt="DELTA" className="w-9 h-9 object-contain" />
                <div>
                  <span className="text-xs text-yellow-400 font-bold uppercase block">TWOJA DRUŻYNA</span>
                  <h4 className="text-base font-extrabold text-white">DELTA 2018 GM</h4>
                </div>
              </div>

              <div className="v200-score-board">
                <span className="text-3xl font-black text-white">{matchScore.delta}</span>
                <span className="text-xl font-bold text-slate-500">:</span>
                <span className="text-3xl font-black text-white">{matchScore.rival}</span>
              </div>

              <div className="v200-score-team right">
                <div className="text-right">
                  <span className="text-xs text-red-400 font-bold uppercase block">PRZECIWNIK</span>
                  <h4 className="text-base font-extrabold text-white">{opponentName}</h4>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-300">
                  ⚔️
                </div>
              </div>
            </div>

            {/* Lineup Selection & Versus Stage */}
            <div className="v200-lineup-match-grid">
              {/* Delta 3 Cards */}
              <div className="v200-lineup-col">
                <h5 className="text-xs font-bold text-yellow-400 uppercase mb-2 flex items-center gap-1">
                  <Shield size={13} /> TWÓJ SKŁAD (3 KARTY)
                </h5>
                <div className="v200-lineup-cards-row">
                  {selectedTeam.map((c, idx) => (
                    <div key={idx} className="v200-lineup-card-slot">
                      <CollectibleCard3D
                        card={c}
                        userCard={userCardsMap.get(c.id) || null}
                        isLocked={false}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rival 3 Cards */}
              <div className="v200-lineup-col">
                <h5 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1">
                  <Swords size={13} /> SKŁAD RYWALA
                </h5>
                <div className="v200-lineup-cards-row">
                  {rivalCards.map((c, idx) => (
                    <div key={idx} className="v200-lineup-card-slot">
                      <CollectibleCard3D
                        card={c}
                        isLocked={false}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Match Action & Commentary */}
            <div className="v200-match-commentary-box">
              <h5 className="text-xs font-extrabold text-slate-400 uppercase mb-1">KOMENTARZ MECZOWY NA ŻYWO:</h5>
              {roundLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Wybierz skład i kliknij „ROZPOCZNIJ MINI-MECZ”, aby przeprowadzić symulację pojedynku 3 rund.</p>
              ) : (
                <div className="v200-commentary-list">
                  {roundLogs.map((log, i) => (
                    <div key={i} className="v200-commentary-item animate-fadeIn">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Match Controls & Winner Claim */}
            <div className="v200-match-bottom-controls">
              {!matchRunning && !matchWinner && (
                <button
                  type="button"
                  onClick={handleStart3v3Match}
                  className="v200-start-match-btn"
                >
                  <Play size={17} /> ROZPOCZNIJ MINI-MECZ 3v3
                </button>
              )}

              {matchRunning && (
                <div className="v200-match-running-pill animate-pulse">
                  <Zap size={16} className="text-yellow-400 animate-bounce" />
                  <span>TRWA RUNDA {currentRound}/3... POJEDYNEK W TOKU!</span>
                </div>
              )}

              {matchWinner && (
                <div className="v200-match-result-actions">
                  {matchWinner === "delta" && (
                    <div className="v200-match-win-banner">
                      <Crown size={22} className="text-yellow-400" />
                      <div>
                        <b className="text-sm text-yellow-300 block">ZWYCIĘSTWO DELTA WARSZAWA!</b>
                        <span className="text-xs text-slate-300">Świetna taktyka Twoich kart! Zdobywasz nagrodę bitewną.</span>
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
                          className="v200-claim-dp-btn"
                        >
                          <Coins size={15} /> ODBIERZ +25 DP
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                          <CheckCircle2 size={15} /> Odebrano +25 DP!
                        </span>
                      )}
                    </div>
                  )}

                  {matchWinner === "rival" && (
                    <div className="v200-match-lose-banner">
                      <ShieldCheck size={20} className="text-red-400" />
                      <span className="text-xs text-slate-300">Tym razem rywal był minimalnie lepszy. Wzmocnij karty w paczkach i spróbuj ponownie!</span>
                    </div>
                  )}

                  {matchWinner === "draw" && (
                    <div className="v200-match-lose-banner">
                      <ShieldCheck size={20} className="text-slate-400" />
                      <span className="text-xs text-slate-300">Zacięty remis 1:1! Obie drużyny pokazały mistrzowski poziom.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStart3v3Match}
                    className="v200-restart-match-btn"
                  >
                    <RotateCcw size={15} /> ZAGRAJ REWANŻ
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
