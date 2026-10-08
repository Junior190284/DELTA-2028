'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RefreshCw, Smartphone, Monitor, Eye } from 'lucide-react';
import AchievementUnlock, { AchievementUnlockProps } from '@/components/AchievementUnlock';

type PresetKey = 'training10' | 'hattrick' | 'inferno';

export default function AchievementUnlockDevPage() {
  const [activePreset, setActivePreset] = useState<PresetKey>('training10');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [simulateMobile, setSimulateMobile] = useState(false);

  const presets: Record<PresetKey, AchievementUnlockProps> = {
    training10: {
      grantId: 'demo_att_10',
      title: '10 TRENINGÓW',
      description: 'Zaliczono 10 oficjalnych jednostek treningowych w klubie DELTA 2018 Górny Mokotów.',
      variant: 'gold',
      eyebrow: 'ODBLOKOWANO NOWĄ ODZNAKĘ',
      progress: {
        current: 10,
        max: 25,
        unit: 'treningów',
        label: 'Postęp osiągnięcia:'
      },
      nextGoal: {
        label: 'Kolejny cel: 25 Treningów',
        target: 25,
        rewardLabel: 'Karta: TRAINING 25 (+250 DP)'
      },
      playerName: 'Ryszard Rybacki',
      playerNumber: '10',
      onClose: () => setIsModalOpen(false),
      isDevPreview: true
    },
    hattrick: {
      grantId: 'demo_hattrick',
      title: 'HAT-TRICK!',
      description: 'Strzelono minimum 3 bramki w trakcie jednego oficjalnego meczu ligowego DELTA.',
      variant: 'gold',
      eyebrow: 'MECZOWY WYCZYN DELTA',
      playerName: 'Ryszard Rybacki',
      playerNumber: '10',
      onClose: () => setIsModalOpen(false),
      isDevPreview: true
    },
    inferno: {
      grantId: 'demo_inferno_concept',
      title: 'MISTRZ INFERNO',
      description: 'Elitarna koncepcja wizualna — najwyższy kunszt zaangażowania i pasji na boisku.',
      variant: 'inferno',
      eyebrow: 'LEGENDARNE WYRÓŻNIENIE INFERNO',
      playerName: 'Ryszard Rybacki',
      playerNumber: '10',
      onClose: () => setIsModalOpen(false),
      isDevPreview: true
    }
  };

  const handleOpenPreset = (key: PresetKey) => {
    setActivePreset(key);
    setAnimKey(prev => prev + 1);
    setIsModalOpen(true);
  };

  const handleReplay = () => {
    setAnimKey(prev => prev + 1);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#07090d] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-amber-400 transition font-bold text-xs uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Powrót do Pulpitu
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles size={13} /> PODGLĄD DEWELOPERSKI: ACHIEVEMENT UNLOCK
            </span>
          </div>
        </header>

        {/* Introduction */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-red-950/40 border border-white/10 space-y-2">
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">
            Ekran Zdobycia Odznaki (Figma Reference)
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl">
            Wspólny ekran celebracji odblokowania odznaki z metalicznymi tarczami 3D, poświatą, błyskiem metalu,
            krótką celebracją cząsteczek oraz interaktywnym przechyleniem 3D na desktopie.
          </p>
        </div>

        {/* 3 Variant Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Variant 1: 10 Treningów */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between space-y-5 hover:border-amber-500/60 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl font-black">
                10
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Wariant 1 (Złota Tarcza)
                </span>
                <h3 className="text-lg font-black text-white uppercase">10 Treningów</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zawiera opcjonalny pasek postępu (10/25) oraz sekcję kolejnego progu (+250 DP za 25 treningów).
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('training10')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2"
            >
              <Eye size={15} /> Zobacz Animację (10 Treningów)
            </button>
          </div>

          {/* Variant 2: Hat-trick */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex flex-col justify-between space-y-5 hover:border-slate-500 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-white border border-slate-600 flex items-center justify-center text-2xl">
                ⚽
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Wariant 2 (Onyx & Platinum)
                </span>
                <h3 className="text-lg font-black text-white uppercase">Hat-trick!</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wyczyn meczowy — 3 gole w jednym spotkaniu ligowym. Tarcza z potrójną piłką i złotymi akcentami.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('hattrick')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider border border-white/10 shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Eye size={15} /> Zobacz Animację (Hat-trick)
            </button>
          </div>

          {/* Variant 3: INFERNO */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-red-500/40 flex flex-col justify-between space-y-5 hover:border-red-500/80 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center text-2xl">
                🔥
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-red-400 tracking-wider block">
                  Wariant 3 (Koncepcja Wizualna)
                </span>
                <h3 className="text-lg font-black text-white uppercase">INFERNO PRO</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Koncepcja płonącej tarczy tytanowo-rubinowej z magmowymi iskrami i czerwonymi cząsteczkami ognia.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('inferno')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-2"
            >
              <Eye size={15} /> Zobacz Animację (INFERNO)
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSimulateMobile(!simulateMobile)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                simulateMobile
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {simulateMobile ? <Smartphone size={14} /> : <Monitor size={14} />}
              <span>{simulateMobile ? 'Tryb: Telefon (390×844)' : 'Tryb: Komputer / Pełny Ekran'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReplay}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw size={14} /> Odtwórz Ponownie Aktualny Wariant
            </button>
          </div>
        </div>
      </div>

      {/* Render Modal when active */}
      {isModalOpen && (
        <AchievementUnlock
          key={`${activePreset}-${animKey}`}
          {...presets[activePreset]}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
