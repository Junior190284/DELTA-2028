'use client';

import React, { useState } from 'react';
import { X, Swords, RefreshCw, Sparkles } from 'lucide-react';
import { BattleCard, BattleSummary } from '@/lib/game/battles';

interface DeltaCardBattleArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  playerCards?: any[];
  onXPClaimed?: (xp: number) => void;
}

export const DeltaCardBattleArenaModal: React.FC<DeltaCardBattleArenaModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
  playerCards = [],
  onXPClaimed
}) => {
  const [battleMode, setBattleMode] = useState<'1v1' | '3v3'>('1v1');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCard] = useState<any | null>(playerCards[0] || null);
  const [battleResult, setBattleResult] = useState<BattleSummary | null>(null);
  const [squadResult, setSquadResult] = useState<any | null>(null);
  const [, setIsFighting] = useState(false);
  const [step, setStep] = useState<'setup' | 'fighting' | 'result'>('setup');

  if (!isOpen) return null;

  const handleStartBattle = async () => {
    setIsFighting(true);
    setStep('fighting');

    try {
      const cardToUse: BattleCard = selectedCard ? {
        id: selectedCard.id || 'p_card',
        name: selectedCard.title || selectedCard.name || 'Zawodnik DELTA',
        position: selectedCard.position || 'CM',
        overall: selectedCard.overall || 82,
        pace: selectedCard.pace || selectedCard.stats?.pace || 80,
        shooting: selectedCard.shooting || selectedCard.stats?.shooting || 78,
        passing: selectedCard.passing || selectedCard.stats?.passing || 81,
        dribbling: selectedCard.dribbling || selectedCard.stats?.dribbling || 79,
        defending: selectedCard.defending || selectedCard.stats?.defending || 72,
        physical: selectedCard.physical || selectedCard.stats?.physical || 75
      } : {
        id: 'default_card',
        name: 'Kapitan DELTA',
        position: 'CM',
        overall: 80,
        pace: 82,
        shooting: 79,
        passing: 84,
        dribbling: 80,
        defending: 74,
        physical: 76
      };

      const res = await fetch('/api/game/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mode: battleMode,
          difficulty,
          playerCard: cardToUse,
          playerSquad: playerCards.slice(0, 3).map((c, i) => ({
            id: c.id || `sq_${i}`,
            name: c.title || c.name || `Gracz ${i + 1}`,
            position: c.position || 'CM',
            overall: c.overall || 78,
            pace: c.pace || 75,
            shooting: c.shooting || 72,
            passing: c.passing || 75,
            dribbling: c.dribbling || 74,
            defending: c.defending || 70,
            physical: c.physical || 72
          }))
        })
      });

      const data = await res.json();
      
      // Simulate dramatic 1.5-second duel tension
      setTimeout(() => {
        if (data.success) {
          if (battleMode === '1v1') {
            setBattleResult(data.battleResult);
          } else {
            setSquadResult(data.battleResult);
          }
          if (onXPClaimed && data.battleResult.xpAwarded) {
            onXPClaimed(data.battleResult.xpAwarded);
          }
          setStep('result');
        }
        setIsFighting(false);
      }, 1500);
    } catch (err) {
      console.error('Battle error:', err);
      setIsFighting(false);
      setStep('setup');
    }
  };

  const handleReset = () => {
    setBattleResult(null);
    setSquadResult(null);
    setStep('setup');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-red-950 via-slate-900 to-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-xl shadow-lg shadow-red-600/30">
              ⚔️
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                Arena Pojedynków Kart <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">PvE BOT</span>
              </h2>
              <p className="text-xs text-slate-400">Wyzwij na pojedynek rywali z Mazowsza i zdobywaj XP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {step === 'setup' && (
            <div className="space-y-5">
              {/* Mode Selection */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Tryb Pojedynku:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBattleMode('1v1')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      battleMode === '1v1'
                        ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-600/20'
                        : 'bg-slate-800/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl">👤</div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Pojedynek 1v1</h4>
                      <p className="text-[11px] text-slate-400">Starcie na statystyki 1 karty</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setBattleMode('3v3')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      battleMode === '3v3'
                        ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-600/20'
                        : 'bg-slate-800/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl">👥</div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Bitwa Składów 3v3</h4>
                      <p className="text-[11px] text-slate-400">Atak, Pomoc i Obrona</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Poziom Trudności Przeciwnika:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs uppercase tracking-wider transition-all ${
                        difficulty === lvl
                          ? lvl === 'easy'
                            ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                            : lvl === 'medium'
                            ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20'
                            : 'bg-red-950/60 border-red-500 text-red-300 shadow-md shadow-red-500/30'
                          : 'bg-slate-800/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 'easy' ? '🟢 Łatwy (+45 XP)' : lvl === 'medium' ? '🟡 Średni (+75 XP)' : '🔴 Trudny (+110 XP)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Battle CTA */}
              <div className="pt-2">
                <button
                  onClick={handleStartBattle}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
                >
                  <Swords className="w-5 h-5" /> Rozpocznij Starcie w Arenie
                </button>
              </div>
            </div>
          )}

          {step === 'fighting' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-4xl shadow-2xl shadow-red-600/50 animate-bounce">
                ⚔️
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Trwa Starcie w Arenie...</h3>
                <p className="text-xs text-slate-400 mt-1">Porównywanie statystyk kart i umiejętności taktycznych</p>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-5 animate-fadeIn">
              {battleMode === '1v1' && battleResult && (
                <div className="space-y-4">
                  {/* Match Outcome Banner */}
                  <div
                    className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center ${
                      battleResult.matchResult === 'win'
                        ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-500/20'
                        : battleResult.matchResult === 'loss'
                        ? 'bg-gradient-to-b from-red-950/60 to-slate-900 border-red-500/50 shadow-xl shadow-red-500/20'
                        : 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-500/50 shadow-xl shadow-amber-500/20'
                    }`}
                  >
                    <div className="text-3xl mb-1">
                      {battleResult.matchResult === 'win' ? '🏆' : battleResult.matchResult === 'loss' ? '💀' : '🤝'}
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-white">
                      {battleResult.matchResult === 'win'
                        ? 'ZWYCIĘSTWO DELTA!'
                        : battleResult.matchResult === 'loss'
                        ? 'PORAŻKA W POJEDYNKU'
                        : 'REMIS W ARENIE'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Wynik rund: {battleResult.playerScore} - {battleResult.cpuScore}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                      <Sparkles className="w-3.5 h-3.5" /> +{battleResult.xpAwarded} XP do profilu
                    </div>
                  </div>

                  {/* Rounds Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Przebieg Rund:</h4>
                    {battleResult.rounds.map((rnd) => (
                      <div
                        key={rnd.roundNumber}
                        className="p-3 rounded-lg bg-slate-950/50 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center font-bold text-[10px]">
                            {rnd.roundNumber}
                          </span>
                          <div>
                            <p className="font-bold text-white">{rnd.statName}</p>
                            <p className="text-[10px] text-slate-400">{rnd.commentary}</p>
                          </div>
                        </div>
                        <div
                          className={`font-black text-xs px-2 py-0.5 rounded ${
                            rnd.winner === 'player'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : rnd.winner === 'cpu'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {rnd.winner === 'player' ? 'TY' : rnd.winner === 'cpu' ? 'CPU' : 'REMIS'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {battleMode === '3v3' && squadResult && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center ${
                      squadResult.matchResult === 'win'
                        ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/50 shadow-xl'
                        : squadResult.matchResult === 'loss'
                        ? 'bg-gradient-to-b from-red-950/60 to-slate-900 border-red-500/50 shadow-xl'
                        : 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-500/50 shadow-xl'
                    }`}
                  >
                    <div className="text-3xl mb-1">
                      {squadResult.matchResult === 'win' ? '🏆' : squadResult.matchResult === 'loss' ? '💀' : '🤝'}
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-white">
                      {squadResult.matchResult === 'win' ? 'TRIUMF SKŁADU DELTA!' : 'KONIEC MECZU 3v3'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Sektory wygrane: {squadResult.playerScore} - {squadResult.cpuScore}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                      <Sparkles className="w-3.5 h-3.5" /> +{squadResult.xpAwarded} XP
                    </div>
                  </div>

                  {/* Sektory */}
                  <div className="space-y-2">
                    {squadResult.duels?.map((d: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-950/50 border border-white/5 text-xs">
                        <div className="flex justify-between font-bold text-white mb-0.5">
                          <span>{d.sector}</span>
                          <span
                            className={
                              d.winner === 'player'
                                ? 'text-emerald-400'
                                : d.winner === 'cpu'
                                ? 'text-red-400'
                                : 'text-amber-400'
                            }
                          >
                            {d.winner === 'player' ? 'WYGRANA' : d.winner === 'cpu' ? 'PRZEGRANA' : 'REMIS'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{d.commentary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" /> Zagraj Ponownie
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider"
                >
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
