'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RefreshCw, Smartphone, Monitor, Eye, Layers, RotateCw, Volume2 } from 'lucide-react';
import AchievementUnlock, { AchievementUnlockProps } from '@/components/AchievementUnlock';

type PresetKey = 'training10' | 'hattrick' | 'inferno' | 'queue';

export default function AchievementUnlockDevPage() {
  const [activePreset, setActivePreset] = useState<PresetKey>('training10');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [simulateMobile, setSimulateMobile] = useState(false);
  const [queueStep, setQueueStep] = useState(0);

  const presets: Record<'training10' | 'hattrick' | 'inferno', AchievementUnlockProps> = {
    training10: {
      grantId: 'demo_att_10',
      title: '10 TRENINGÓW',
      description: 'Zaliczono 10 oficjalnych jednostek treningowych w klubie DELTA 2018 Górny Mokotów.',
      variant: 'gold',
      eyebrow: 'ODBLOKOWANO NOWĄ ODZNAKĘ',
      grantDate: '8 października 2026',
      serialNumber: '#010 / 2018 GM',
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
      grantDate: '8 października 2026',
      serialNumber: '#003 / 2018 GM',
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
      grantDate: '8 października 2026',
      serialNumber: '#001 / INFERNO',
      playerName: 'Ryszard Rybacki',
      playerNumber: '10',
      onClose: () => setIsModalOpen(false),
      isDevPreview: true
    }
  };

  const queueItems: AchievementUnlockProps[] = [
    {
      grantId: 'queue_item_1',
      title: 'HAT-TRICK!',
      description: 'Wspaniały występ strzelecki — 3 gole w meczu ligowym DELTA!',
      variant: 'gold',
      eyebrow: 'WYCZYN MECZOWY 1 Z 2',
      grantDate: '8 października 2026',
      serialNumber: '#007 / 2018 GM',
      playerName: 'Ryszard Rybacki',
      playerNumber: '10',
      queueIndex: 1,
      queueTotal: 2,
      onClose: () => {
        setQueueStep(1);
        setAnimKey(prev => prev + 1);
      },
      isDevPreview: true
    },
    {
      grantId: 'queue_item_2',
      title: '10 TRENINGÓW',
      description: 'Wzorowa frekwencja — zaliczono 10 oficjalnych treningów DELTA.',
      variant: 'gold',
      eyebrow: 'FREKWENCJA 2 Z 2',
      grantDate: '8 października 2026',
      serialNumber: '#010 / 2018 GM',
      progress: {
        current: 10,
        max: 25,
        unit: 'treningów',
        label: 'Postęp:'
      },
      nextGoal: {
        label: 'Kolejny cel: 25 Treningów',
        target: 25,
        rewardLabel: 'Karta: TRAINING 25'
      },
      playerName: 'Ryszard Rybacki',
      playerNumber: '10',
      queueIndex: 2,
      queueTotal: 2,
      onClose: () => {
        setIsModalOpen(false);
        setQueueStep(0);
      },
      isDevPreview: true
    }
  ];

  const handleOpenPreset = (key: PresetKey) => {
    setActivePreset(key);
    setQueueStep(0);
    setAnimKey(prev => prev + 1);
    setIsModalOpen(true);
  };

  const handleReplay = () => {
    setAnimKey(prev => prev + 1);
    setIsModalOpen(true);
  };

  const currentProps = activePreset === 'queue'
    ? queueItems[queueStep]
    : presets[activePreset as 'training10' | 'hattrick' | 'inferno'];

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
              <Sparkles size={13} /> STUDIO CELEBRACJI ODZNAK 2.0 (FIGMA PRO)
            </span>
          </div>
        </header>

        {/* Feature Badges Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-red-950/40 border border-white/10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">
              Ekran Zdobycia Odznaki z Efektami Premium
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ✨ SPECULAR SHINE
              </span>
              <span className="text-[10px] font-black px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                🔄 REWERS 3D
              </span>
              <span className="text-[10px] font-black px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                🔊 WEB AUDIO FX
              </span>
              <span className="text-[10px] font-black px-2.5 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                📳 HAPTYKA
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Wdrożono fizyczne odbicie światła myszką, klikalny rewers 3D z pieczęcią klubową i numerem seryjnym,
            dyskretne efekty dźwiękowe Web Audio, wibrację na telefonach oraz obsługę kolejki wielu odznak naraz.
          </p>
        </div>

        {/* 4 Variant Cards (3 Single + 1 Queue Mode) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Variant 1: 10 Treningów */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between space-y-4 hover:border-amber-500/60 transition-all">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xl font-black">
                10
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                  Wariant 1
                </span>
                <h3 className="text-base font-black text-white uppercase">10 Treningów</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Złota metalowa tarcza, pasek 10/25 i kolejny cel na 25 treningów.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('training10')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-1.5"
            >
              <Eye size={14} /> Otwórz Wariant 1
            </button>
          </div>

          {/* Variant 2: Hat-trick */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex flex-col justify-between space-y-4 hover:border-slate-500 transition-all">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-slate-800 text-white border border-slate-600 flex items-center justify-center text-xl">
                ⚽
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Wariant 2
                </span>
                <h3 className="text-base font-black text-white uppercase">Hat-trick!</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wyczyn meczowy — potrójna piłka, platyna & złoto na onyksie.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('hattrick')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider border border-white/10 shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Eye size={14} /> Otwórz Wariant 2
            </button>
          </div>

          {/* Variant 3: INFERNO */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-red-500/40 flex flex-col justify-between space-y-4 hover:border-red-500/80 transition-all">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center text-xl">
                🔥
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-red-400 tracking-wider block">
                  Wariant 3
                </span>
                <h3 className="text-base font-black text-white uppercase">INFERNO PRO</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Płonąca tarcza tytanowo-rubinowa z magmowymi iskrami i czerwonymi cząsteczkami.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('inferno')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-1.5"
            >
              <Eye size={14} /> Otwórz Wariant 3
            </button>
          </div>

          {/* Variant 4: Multi-Badge Queue Demo */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 flex flex-col justify-between space-y-4 hover:border-purple-400 transition-all">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center text-xl font-black">
                <Layers size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block">
                  Nowość
                </span>
                <h3 className="text-base font-black text-white uppercase">Kolejka (2 Odznaki)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Demonstracja zdobycia 2 odznak po meczu (płynne przejście 1 z 2 ➔ 2 z 2).
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPreset('queue')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5"
            >
              <Layers size={14} /> Test Kolejki
            </button>
          </div>
        </div>

        {/* Interactive Features Guide */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} /> Instrukcja interakcji w oknie celebracji:
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <li className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <span className="text-base">🖱️</span>
              <span><strong>3D Parallax & Specular:</strong> Poruszaj myszką po tarczy — plama światła metalicznego podąża za Twoim ruchem.</span>
            </li>
            <li className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <span className="text-base">🔄</span>
              <span><strong>Rewers 3D:</strong> Kliknij bezpośrednio w tarczę, aby odwrócić ją o 180° i zobaczyć certyfikat pamiątkowy z pieczęcią.</span>
            </li>
            <li className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <span className="text-base">🔊</span>
              <span><strong>Subtelny Audio FX:</strong> Przy błysku usłyszysz delikatny świst metalu, a przy odwróceniu dźwięk obrotu tarczy.</span>
            </li>
          </ul>
        </div>

        {/* Controls Bar */}
        <div className="p-4 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSimulateMobile(!simulateMobile)}
              className={`px-3.5 py-2 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                simulateMobile
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {simulateMobile ? <Smartphone size={15} /> : <Monitor size={15} />}
              <span>{simulateMobile ? 'Tryb: Telefon (390×844)' : 'Tryb: Komputer (Pełny Ekran)'}</span>
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
          key={`${activePreset}-${queueStep}-${animKey}`}
          {...currentProps}
        />
      )}
    </div>
  );
}
