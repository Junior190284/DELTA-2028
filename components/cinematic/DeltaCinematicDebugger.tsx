'use client';

import React, { useState } from 'react';
import { Sparkles, Play, Flame, Trophy, Star, Shield, Zap, Box } from 'lucide-react';
import { RarityTier, RevealCardItem } from '@/lib/cinematic/types';
import { DeltaCardRevealStage } from './DeltaCardRevealStage';

export const DeltaCinematicDebugger: React.FC = () => {
  const [selectedRarity, setSelectedRarity] = useState<RarityTier>('INFERNO');
  const [cardsCount, setCardsCount] = useState<number>(1);
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [testCards, setTestCards] = useState<RevealCardItem[]>([]);

  const sampleNames = [
    'Ryszard Rybacki',
    'Tomek Napastnik',
    'Kuba Pomocnik',
    'Janek Obrońca',
    'Oliwier Bramkarz',
    'Mikołaj Skrzydłowy'
  ];

  const handleLaunchTest = () => {
    const list: RevealCardItem[] = [];
    for (let i = 0; i < cardsCount; i++) {
      const name = sampleNames[i % sampleNames.length];
      list.push({
        id: `test_${i}_${Date.now()}`,
        name: name,
        displayName: name,
        position: i === 0 ? 'FW' : i === 1 ? 'CM' : 'DF',
        overall: selectedRarity === 'INFERNO' ? 88 : selectedRarity === 'DELTA_ICON' ? 86 : 82,
        rarity: i === 0 ? selectedRarity : 'STANDARD',
        isNew: i === 0,
        duplicateCount: i > 0 ? i : 0,
        stats: {
          pace: 85,
          shooting: 83,
          passing: 84,
          dribbling: 86,
          defending: 74,
          physical: 80
        }
      });
    }
    setTestCards(list);
    setIsRevealOpen(true);
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 text-white space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            🎬
          </div>
          <div>
            <h3 className="font-black text-lg uppercase tracking-wider text-white">
              Studio Testowe Reveal & Walkout 3D
            </h3>
            <p className="text-xs text-slate-400">Podgląd sekwencji bez przyznawania nagród w bazie danych</p>
          </div>
        </div>
      </div>

      {/* Rarity Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Wybierz Rarity do Testu:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['INFERNO', 'DELTA_ICON', 'GOLD_MASTER', 'MATCHDAY_HERO', 'TRAINING_HERO', 'SEASONAL', 'STANDARD'] as RarityTier[]).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRarity(r)}
              className={`p-3 rounded-xl border text-left font-bold text-xs uppercase tracking-wider transition-all ${
                selectedRarity === r
                  ? r === 'INFERNO'
                    ? 'bg-red-950/70 border-red-500 text-red-300 shadow-lg shadow-red-600/30'
                    : r === 'DELTA_ICON'
                    ? 'bg-pink-950/70 border-pink-500 text-pink-300 shadow-lg'
                    : r === 'GOLD_MASTER'
                    ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-lg'
                    : 'bg-blue-950/70 border-blue-500 text-blue-300 shadow-lg'
                  : 'bg-slate-800/40 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-lg mb-1">
                {r === 'INFERNO' ? '🔥' : r === 'DELTA_ICON' ? '👑' : r === 'GOLD_MASTER' ? '🥇' : '⭐'}
              </div>
              <span>{r}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Number of cards in pack */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Liczba Kart w Paczce:
        </label>
        <div className="flex gap-3">
          {[1, 3, 5].map((count) => (
            <button
              key={count}
              onClick={() => setCardsCount(count)}
              className={`flex-1 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${
                cardsCount === count
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-slate-800/40 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Box size={14} className="inline mr-1" /> {count} {count === 1 ? 'Karta (Single)' : 'Karty (Paczka)'}
            </button>
          ))}
        </div>
      </div>

      {/* Launch CTA */}
      <button
        onClick={handleLaunchTest}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
      >
        <Play size={18} /> Uruchom Testowy Reveal & Walkout
      </button>

      {/* Master Reveal Stage Mount */}
      <DeltaCardRevealStage
        isOpen={isRevealOpen}
        onClose={() => setIsRevealOpen(false)}
        cards={testCards}
        packName={`Paczka Testowa (${selectedRarity})`}
        source="DEV"
      />
    </div>
  );
};
