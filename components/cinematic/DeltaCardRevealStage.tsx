'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  FastForward, 
  RotateCcw, 
  ChevronRight, 
  Flame, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Star, 
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { RevealCardItem } from '@/lib/cinematic/types';
import { getRarityToken } from '@/lib/cinematic/tokens';
import { cinematicAudio } from '@/lib/cinematic/audio';

interface DeltaCardRevealStageProps {
  isOpen: boolean;
  onClose: () => void;
  cards: RevealCardItem[];
  packName?: string;
  source?: string;
  onFinished?: () => void;
}

type RevealPhase = 
  | 'PACK_PRE'
  | 'PACK_TEAR'
  | 'WALKOUT_TUNNEL'
  | 'WALKOUT_FLASH'
  | 'CARD_REVEAL'
  | 'PACK_SUMMARY';

export const DeltaCardRevealStage: React.FC<DeltaCardRevealStageProps> = ({
  isOpen,
  onClose,
  cards = [],
  packName = 'Paczka DELTA',
  source = 'PACK',
  onFinished
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [phase, setPhase] = useState<RevealPhase>('PACK_PRE');
  const [isMuted, setIsMuted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [perfMode, setPerfMode] = useState<'HIGH' | 'LITE'>('HIGH');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [activeWalkoutStep, setActiveWalkoutStep] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const walkoutTimerRef = useRef<NodeJS.Timeout[]>([]);

  const currentCard: RevealCardItem = cards[currentCardIndex] || {
    id: 'c1',
    name: 'Zawodnik DELTA',
    position: 'CM',
    overall: 80,
    rarity: 'STANDARD',
    stats: { pace: 78, shooting: 75, passing: 82, dribbling: 79, defending: 70, physical: 74 }
  };

  const token = getRarityToken(currentCard.rarity);

  // Clear timers on unmount
  const clearAllTimers = useCallback(() => {
    walkoutTimerRef.current.forEach(t => clearTimeout(t));
    walkoutTimerRef.current = [];
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentCardIndex(0);
      setPhase(cards.length > 1 ? 'PACK_PRE' : 'CARD_REVEAL');
      setIsFlipped(false);
      clearAllTimers();
    }
    return () => clearAllTimers();
  }, [isOpen, cards, clearAllTimers]);

  // Audio mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    cinematicAudio.setMuted(next);
  };

  // Start Pack Opening Sequence
  const handleOpenPack = () => {
    setPhase('PACK_TEAR');
    cinematicAudio.playPackTear();

    const t1 = setTimeout(() => {
      startCardReveal(0);
    }, 1200);
    walkoutTimerRef.current.push(t1);
  };

  // Start specific card reveal
  const startCardReveal = (index: number) => {
    clearAllTimers();
    setCurrentCardIndex(index);
    setIsFlipped(false);
    const card = cards[index] || currentCard;
    const t = getRarityToken(card.rarity);

    if (t.hasWalkout && perfMode === 'HIGH') {
      // Walkout Sequence
      setPhase('WALKOUT_TUNNEL');
      setActiveWalkoutStep(1);
      cinematicAudio.playBassImpact(0.7);

      const t1 = setTimeout(() => {
        setActiveWalkoutStep(2); // Smoke & Lights
      }, 1500);

      const t2 = setTimeout(() => {
        setPhase('WALKOUT_FLASH');
        setActiveWalkoutStep(3); // Flash & SFX
        if (t.id === 'INFERNO') cinematicAudio.playInfernoFanfare();
        else if (t.id === 'GOLD_MASTER' || t.id === 'DELTA_ICON') cinematicAudio.playGoldGlimmer();
        else cinematicAudio.playBassImpact(1.2);
      }, 3000);

      const t3 = setTimeout(() => {
        setPhase('CARD_REVEAL');
        cinematicAudio.playCardFlip();
      }, 4500);

      walkoutTimerRef.current.push(t1, t2, t3);
    } else {
      // Standard / Quick Reveal
      setPhase('CARD_REVEAL');
      cinematicAudio.playCardFlip();
    }
  };

  // Skip current animation straight to card reveal
  const handleSkip = () => {
    clearAllTimers();
    if (phase !== 'CARD_REVEAL' && phase !== 'PACK_SUMMARY') {
      setPhase('CARD_REVEAL');
      cinematicAudio.playCardFlip();
    } else if (phase === 'CARD_REVEAL') {
      handleNextCard();
    }
  };

  // Next card in pack or summary
  const handleNextCard = () => {
    clearAllTimers();
    if (currentCardIndex < cards.length - 1) {
      startCardReveal(currentCardIndex + 1);
    } else {
      setPhase('PACK_SUMMARY');
      cinematicAudio.playGoldGlimmer();
      if (onFinished) onFinished();
    }
  };

  // Visual Replay (strictly client-side animation replay, zero duplicate claim)
  const handleReplay = () => {
    startCardReveal(currentCardIndex);
  };

  // 3D Parallax Tilt Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (perfMode === 'LITE') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 22, y: -y * 22 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 overflow-hidden select-none animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 999999 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Dynamic Background Atmosphere */}
      <div 
        className={`absolute inset-0 bg-gradient-to-b ${token.bgGradient} transition-colors duration-1000 opacity-90`}
        aria-hidden="true"
      />

      {/* Volumetric Spotlights & Beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div 
          className="absolute -top-32 left-1/4 w-96 h-[800px] bg-gradient-to-b from-white/15 to-transparent transform -rotate-12 blur-2xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div 
          className="absolute -top-32 right-1/4 w-96 h-[800px] bg-gradient-to-b from-white/15 to-transparent transform rotate-12 blur-2xl animate-pulse"
          style={{ animationDuration: '5s' }}
        />
      </div>

      {/* Floating Sparks / Embers for INFERNO & GOLD */}
      {token.id === 'INFERNO' && perfMode === 'HIGH' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-t from-red-600/30 to-transparent blur-xl animate-pulse" />
        </div>
      )}

      {/* Top Action Controls */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-all backdrop-blur-md shadow-lg"
            title={isMuted ? 'Włącz dźwięk' : 'Wycisz'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={() => setPerfMode(p => p === 'HIGH' ? 'LITE' : 'HIGH')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all ${
              perfMode === 'HIGH'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
            title="Przełącz jakość efektów (HIGH / LITE)"
          >
            FX: {perfMode}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {phase !== 'PACK_SUMMARY' && (
            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-200 hover:text-white hover:bg-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all"
            >
              <FastForward size={15} /> Pomiń
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-all backdrop-blur-md shadow-lg"
            title="Zamknij"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PACK PRE-REVEAL STAGE */}
      {/* ========================================================================= */}
      {phase === 'PACK_PRE' && (
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 max-w-sm w-full space-y-6 animate-fadeIn">
          <div className="relative group cursor-pointer" onClick={handleOpenPack}>
            {/* Pack Glow & Atmosphere */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-red-600 via-amber-500 to-yellow-400 rounded-3xl blur-2xl opacity-40 group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />
            
            {/* 3D Physical Foil Pack */}
            <div className="relative w-64 h-96 rounded-2xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-950 border-2 border-amber-400/50 shadow-2xl p-6 flex flex-col justify-between overflow-hidden transform group-hover:scale-105 group-hover:-rotate-1 transition-transform duration-300">
              {/* Metallic Foil Sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-60 pointer-events-none" />
              
              <div className="flex justify-between items-center z-10">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {cards.length} {cards.length === 1 ? 'KARTA' : 'KARTY'}
                </span>
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">DELTA 2018</span>
              </div>

              <div className="my-auto text-center z-10 space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-3xl shadow-xl shadow-red-600/40">
                  🔥
                </div>
                <h3 className="text-xl font-black uppercase text-white tracking-wider drop-shadow-md">
                  {packName}
                </h3>
                <p className="text-xs text-amber-200/80 font-medium">Oficjalna Seria Kolekcjonerska</p>
              </div>

              <div className="z-10 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Dotknij, aby rozedrzeć paczkę
                </span>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenPack}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-600/40 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
          >
            <Sparkles size={18} /> Otwórz Paczkę
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PACK TEARING STAGE */}
      {/* ========================================================================= */}
      {phase === 'PACK_TEAR' && (
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
          <div className="relative w-64 h-96 rounded-2xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-950 border-2 border-amber-400 shadow-2xl p-6 flex flex-col justify-center items-center scale-110 rotate-2 transition-all duration-700 animate-pulse">
            <div className="absolute inset-x-0 top-1/3 h-1 bg-white shadow-[0_0_20px_#fff] animate-ping" />
            <div className="text-4xl animate-bounce">⚡</div>
            <h4 className="text-lg font-black uppercase text-amber-300 mt-3 tracking-widest">
              Otwieranie...
            </h4>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WALKOUT STAGE (Tunnel, Smoke, Lights, Flash) */}
      {/* ========================================================================= */}
      {(phase === 'WALKOUT_TUNNEL' || phase === 'WALKOUT_FLASH') && (
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 space-y-6 animate-fadeIn">
          {/* Tunnel Lights */}
          <div className="relative w-80 h-80 rounded-full border-4 border-red-600/40 flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.5)]">
            <div className="w-64 h-64 rounded-full border-2 border-amber-500/40 flex items-center justify-center animate-pulse">
              <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-red-600/20 to-amber-500/20 flex flex-col items-center justify-center space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  {token.label}
                </span>
                <div className="text-4xl font-black text-white drop-shadow-xl">
                  {currentCard.position || 'ZAW'}
                </div>
                <span className="text-sm font-bold text-slate-300">
                  DELTA WARSZAWA
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white uppercase tracking-wider animate-pulse">
              {token.id === 'INFERNO' ? '🔥 INFERNO WALKOUT 🔥' : '⭐ WALKOUT ZAWODNIKA ⭐'}
            </h3>
            <p className="text-xs text-amber-300 font-bold uppercase tracking-widest">
              {token.sublabel}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CARD REVEAL & 3D INTERACTIVE TILT VIEW */}
      {/* ========================================================================= */}
      {phase === 'CARD_REVEAL' && (
        <div className="relative z-10 flex flex-col items-center justify-center p-4 max-w-lg w-full space-y-4 animate-fadeIn">
          {/* Card Indicator Badge (NOWA vs DUPLIKAT) */}
          <div className="flex items-center gap-2">
            {currentCard.isNew ? (
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1 animate-bounce">
                <Sparkles size={13} /> NOWA W KOLEKCJI
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-bold text-xs uppercase tracking-wider">
                Posiadane kopie: x{(currentCard.duplicateCount || 1) + 1}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-amber-400 border border-amber-500/30 text-xs font-bold">
              Karta {currentCardIndex + 1} z {cards.length}
            </span>
          </div>

          {/* 3D Interactive Card Stage */}
          <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setIsFlipped(f => !f)}
            className="relative cursor-pointer transition-transform duration-100 ease-out"
            style={{
              perspective: '1000px',
              transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`
            }}
            title="Kliknij, aby odwrócić kartę (3D Flip)"
          >
            {/* Card Frame (Front & Back) */}
            <div 
              className={`relative w-72 sm:w-80 h-[430px] rounded-3xl p-5 border-2 shadow-2xl transition-all duration-500 flex flex-col justify-between overflow-hidden ${token.borderGlow}`}
              style={{
                background: token.id === 'INFERNO' 
                  ? 'linear-gradient(135deg, #450a0a 0%, #1c1917 50%, #7f1d1d 100%)'
                  : token.id === 'GOLD_MASTER'
                  ? 'linear-gradient(135deg, #713f12 0%, #1e1b4b 50%, #451a03 100%)'
                  : token.id === 'DELTA_ICON'
                  ? 'linear-gradient(135deg, #581c87 0%, #0f172a 50%, #701a75 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
                boxShadow: `0 0 40px ${token.accentGlow}`
              }}
            >
              {/* Holographic Iridescent Sheen Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-60"
                style={{
                  transform: `translateX(${tilt.x * 2}px) translateY(${tilt.y * 2}px)`
                }}
              />

              {!isFlipped ? (
                /* FRONT VIEW */
                <>
                  {/* Card Header */}
                  <div className="flex justify-between items-start z-10">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                        {currentCard.overall}
                      </span>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        {currentCard.position || 'CM'}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 text-slate-200 border border-white/20">
                        {token.label}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">DELTA 2018 GM</span>
                    </div>
                  </div>

                  {/* Player Visual Portrait */}
                  <div className="my-auto flex flex-col items-center justify-center z-10 relative">
                    <div className="w-36 h-36 rounded-2xl bg-gradient-to-b from-white/10 to-black/40 border border-white/15 flex items-center justify-center overflow-hidden shadow-inner relative">
                      {currentCard.photoUrl ? (
                        <img 
                          src={currentCard.photoUrl} 
                          alt={currentCard.name} 
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="text-6xl select-none">⚽</div>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-white uppercase tracking-wider mt-3 drop-shadow-md text-center">
                      {currentCard.displayName || currentCard.name}
                    </h3>
                  </div>

                  {/* Stat Grid */}
                  <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-black/50 border border-white/10 z-10 text-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">PAC</span>
                      <span className="text-xs font-black text-white">{currentCard.stats?.pace || 78}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">SHO</span>
                      <span className="text-xs font-black text-white">{currentCard.stats?.shooting || 75}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">PAS</span>
                      <span className="text-xs font-black text-white">{currentCard.stats?.passing || 80}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">DRI</span>
                      <span className="text-xs font-black text-white">{currentCard.stats?.dribbling || 79}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">DEF</span>
                      <span className="text-xs font-black text-white">{currentCard.stats?.defending || 72}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">PHY</span>
                      <span className="text-xs font-black text-white">{currentCard.stats?.physical || 76}</span>
                    </div>
                  </div>
                </>
              ) : (
                /* BACK VIEW (Card Bio & Details) */
                <div className="h-full flex flex-col justify-between z-10 text-left p-1">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <h4 className="font-black text-white uppercase text-sm">{currentCard.name}</h4>
                      <span className="text-xs font-bold text-amber-400">REWERS 3D</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentCard.description || 'Oficjalna karta zawodnika rocznika 2018 K.S. Delta Warszawa (Górny Mokotów). Karta rozwija statystyki w oparciu o mecze ligowe i frekwencję treningową.'}
                    </p>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Klub:</span>
                        <span className="text-white font-bold">K.S. Delta Warszawa GM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ranga:</span>
                        <span className="text-amber-400 font-bold">{token.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 italic">Dotknij, aby powrócić do awersu</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full pt-2">
            <button
              onClick={handleReplay}
              className="py-3 px-4 rounded-xl bg-slate-900/80 border border-white/10 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
              title="Odtwórz animację reveal ponownie (tylko wizualnie)"
            >
              <RotateCcw size={14} /> Powtórz
            </button>

            <button
              onClick={handleNextCard}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
            >
              {currentCardIndex < cards.length - 1 ? (
                <>Następna Karta <ChevronRight size={16} /></>
              ) : (
                <>Podsumowanie Paczki <CheckCircle2 size={16} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PACK SUMMARY STAGE */}
      {/* ========================================================================= */}
      {phase === 'PACK_SUMMARY' && (
        <div className="relative z-10 flex flex-col items-center justify-center p-4 max-w-2xl w-full space-y-6 animate-fadeIn">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-2xl shadow-xl shadow-amber-500/20">
              🎁
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
              Podsumowanie Otwarcia
            </h3>
            <p className="text-xs text-slate-400">Wszystkie karty zostały dodane do Twojej kolekcji</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-h-[50vh] overflow-y-auto p-1">
            {cards.map((c, i) => {
              const cToken = getRarityToken(c.rarity);
              return (
                <div
                  key={c.id || i}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col items-center text-center space-y-2 relative shadow-lg"
                >
                  {c.isNew && (
                    <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-black">
                      NOWA
                    </span>
                  )}
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl overflow-hidden border border-white/10">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      '⚽'
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs leading-snug">{c.name}</h5>
                    <span className="text-[10px] font-black text-amber-400">OVR {c.overall} · {c.position || 'CM'}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    {cToken.label}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
          >
            <CheckCircle2 size={18} /> Dodaj do Kolekcji i Zamknij
          </button>
        </div>
      )}
    </div>
  );
};
