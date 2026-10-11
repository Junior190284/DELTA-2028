"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Gift, 
  RotateCw, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft, 
  CheckCircle2, 
  Flame, 
  Crown, 
  Star, 
  Award, 
  FastForward, 
  Layers, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Zap, 
  Eye, 
  Copy, 
  Database, 
  Play, 
  Pause, 
  Info,
  Check,
  Package
} from "lucide-react";

import { Card3DEngine } from "./Card3DEngine";
import { Stage3DEngine } from "./Stage3DEngine";
import { useWalkoutEngine, WalkoutPhase } from "./walkoutEngine";
import { universalAudio } from "./universalAudio";
import { fromProductionCard, toProductionCard, toCollectionCategory } from "./adapter";
import { CARD_VISUAL_THEMES } from "./themes";
import { DEMO_PACKS, DEMO_PRODUCTION_CARDS, DemoPackConfig } from "./mockData";
import { PlayerCardData, CollectionCategory, CardVisualType } from "./types";
import { CardDefinition } from "../../lib/cards/types";
import "./collection-3d.css";
import "./stage.css";

export type LabFlowStep = "SELECT_PACK" | "PACK_TEAR" | "WALKOUT" | "CARD_DETAILS" | "ALBUM_VIEW";

export interface CollectionIntegrationLabProps {
  initialStep?: LabFlowStep;
  initialCard?: string;
  initialDup?: boolean;
}

export function CollectionIntegrationLab({
  initialStep,
  initialCard,
  initialDup = false
}: CollectionIntegrationLabProps = {}) {
  // 1. Flow State
  const defaultStep: LabFlowStep = initialStep && ["SELECT_PACK", "PACK_TEAR", "WALKOUT", "CARD_DETAILS", "ALBUM_VIEW"].includes(initialStep)
    ? initialStep
    : "SELECT_PACK";

  const defaultCardKey = initialCard && DEMO_PRODUCTION_CARDS[initialCard] ? initialCard : "inferno";
  const defaultFixture = DEMO_PRODUCTION_CARDS[defaultCardKey] || DEMO_PRODUCTION_CARDS.inferno;
  const initialDrawnCard = fromProductionCard(defaultFixture.card as unknown as CardDefinition, {
    ovr: defaultFixture.ovr,
    stats: defaultFixture.stats,
    specialTitleId: defaultFixture.specialTitleId,
    isDuplicate: initialDup,
    duplicatePoints: initialDup ? 25 : 0,
    instanceId: `inst_drawn_init`
  });

  const [step, setStep] = useState<LabFlowStep>(defaultStep);
  const [selectedPack, setSelectedPack] = useState<DemoPackConfig>(DEMO_PACKS[3]); // Default: Inferno Booster
  const [selectedCardFixtureKey, setSelectedCardFixtureKey] = useState<string>(defaultCardKey);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(initialDup);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  
  const initialCollection: PlayerCardData[] = useMemo(() => {
    return Object.keys(DEMO_PRODUCTION_CARDS)
      .map(k => {
        const item = DEMO_PRODUCTION_CARDS[k];
        return fromProductionCard(item.card as unknown as CardDefinition, {
          ovr: item.ovr,
          stats: item.stats,
          specialTitleId: item.specialTitleId,
          isDuplicate: false,
          instanceId: `inst_${k}_demo`
        });
      });
  }, []);

  // 2. Data State
  const [activeDrawnCard, setActiveDrawnCard] = useState<PlayerCardData | null>(initialDrawnCard);
  const [simulatedCollection, setSimulatedCollection] = useState<PlayerCardData[]>(initialCollection);
  const [activeAlbumFilter, setActiveAlbumFilter] = useState<CollectionCategory | "ALL">("ALL");
  const [inspectedAlbumCard, setInspectedAlbumCard] = useState<PlayerCardData | null>(null);

  // 3. Adapter Debug View
  const [showAdapterDebug, setShowAdapterDebug] = useState<boolean>(false);

  // 4. Walkout Engine Hook
  const walkout = useWalkoutEngine({
    themeId: initialDrawnCard.visualType,
    rarity: initialDrawnCard.rarity,
    autoStart: defaultStep === "WALKOUT",
    initialTime: defaultStep === "WALKOUT" ? 9.2 : 0
  });

  // Initialize simulated base collection with default mock cards and read URL query parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step") as LabFlowStep | null;
      const cardParam = params.get("card");
      const dupParam = params.get("dup");

      const targetCardKey = cardParam && DEMO_PRODUCTION_CARDS[cardParam] ? cardParam : "inferno";
      const targetIsDup = dupParam === "true";
      if (cardParam) setSelectedCardFixtureKey(targetCardKey);
      if (dupParam) setIsDuplicate(targetIsDup);

      const fixture = DEMO_PRODUCTION_CARDS[targetCardKey] || DEMO_PRODUCTION_CARDS.inferno;
      const adapted = fromProductionCard(fixture.card as unknown as CardDefinition, {
        ovr: fixture.ovr,
        stats: fixture.stats,
        specialTitleId: fixture.specialTitleId,
        isDuplicate: targetIsDup,
        duplicatePoints: targetIsDup ? 25 : 0,
        instanceId: `inst_drawn_demo`
      });
      setActiveDrawnCard(adapted);

      if (stepParam && ["SELECT_PACK", "PACK_TEAR", "WALKOUT", "CARD_DETAILS", "ALBUM_VIEW"].includes(stepParam)) {
        setStep(stepParam);
        if (stepParam === "WALKOUT") {
          walkout.seek(9.2);
        }
      }
      const initialList: PlayerCardData[] = Object.keys(DEMO_PRODUCTION_CARDS)
        .filter(k => k !== "inferno") // leave inferno as the grand prize to be won
        .map(k => {
          const item = DEMO_PRODUCTION_CARDS[k];
          return fromProductionCard(item.card as unknown as CardDefinition, {
            ovr: item.ovr,
            stats: item.stats,
            specialTitleId: item.specialTitleId,
            isDuplicate: false,
            instanceId: `inst_${k}_demo`
          });
        });
      setSimulatedCollection(initialList);
    }
  }, []);

  // Sync mute with audio engine
  useEffect(() => {
    universalAudio.setMuted(isMuted);
  }, [isMuted]);

  // Resolve current theme from drawn card
  const currentTheme = useMemo(() => {
    if (!activeDrawnCard) return CARD_VISUAL_THEMES.INFERNO_ULTRA;
    return CARD_VISUAL_THEMES[activeDrawnCard.visualType] || CARD_VISUAL_THEMES.BASE;
  }, [activeDrawnCard]);

  // Trigger Pack Opening Simulation
  const handleStartOpening = useCallback(() => {
    // 1. Resolve raw card definition from selected fixture
    const fixture = DEMO_PRODUCTION_CARDS[selectedCardFixtureKey] || DEMO_PRODUCTION_CARDS.inferno;
    
    // 2. Determine duplicate reward
    const dupPointsMap: Record<string, number> = {
      inferno: 25,
      legend: 20,
      gold: 12,
      matchday: 8,
      rare: 6,
      common: 4
    };
    const dupPoints = isDuplicate ? (dupPointsMap[selectedCardFixtureKey] || 4) : 0;

    // 3. Convert via lossless production adapter
    const adaptedCard = fromProductionCard(fixture.card as unknown as CardDefinition, {
      ovr: fixture.ovr,
      stats: fixture.stats,
      specialTitleId: fixture.specialTitleId,
      isDuplicate,
      duplicatePoints: dupPoints,
      instanceId: `inst_drawn_${Date.now()}`
    });

    setActiveDrawnCard(adaptedCard);
    setStep("PACK_TEAR");

    // 4. Quick foil tearing animation before launching walkout
    const tearTimer = setTimeout(() => {
      setStep("WALKOUT");
      walkout.replay();
    }, 1200);

    return () => clearTimeout(tearTimer);
  }, [selectedCardFixtureKey, isDuplicate, walkout]);

  // Handle Skip Walkout straight to interactive Hero Shot & Details
  const handleSkipWalkout = useCallback(() => {
    walkout.skip();
    setStep("CARD_DETAILS");
  }, [walkout]);

  // Proceed from Walkout to Card Details
  const handleProceedToDetails = useCallback(() => {
    walkout.pause();
    setStep("CARD_DETAILS");
  }, [walkout]);

  // Add drawn card to collection and view album
  const handleGoToAlbum = useCallback(() => {
    if (activeDrawnCard) {
      setSimulatedCollection(prev => {
        // If not duplicate, append to collection
        if (!activeDrawnCard.isDuplicate && !prev.some(c => c.cardId === activeDrawnCard.cardId)) {
          return [activeDrawnCard, ...prev];
        }
        return prev;
      });
    }
    setStep("ALBUM_VIEW");
  }, [activeDrawnCard]);

  // Filtered collection cards
  const filteredCollection = useMemo(() => {
    if (activeAlbumFilter === "ALL") return simulatedCollection;
    return simulatedCollection.filter(c => c.rarity === activeAlbumFilter);
  }, [simulatedCollection, activeAlbumFilter]);

  // Round-trip verification data for inspection
  const roundTripProductionCard = useMemo(() => {
    if (!activeDrawnCard) return null;
    return toProductionCard(activeDrawnCard);
  }, [activeDrawnCard]);

  return (
    <div className="universal-stage-root relative w-full min-h-screen bg-[#020408] text-white flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* GLOBAL TEST / DEMO PREVIEW HEADER BANNER                       */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-amber-500/20 text-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/lab"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-mono uppercase text-[10px]">Wszystkie Lab</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-black text-[10px] uppercase">
              ETAP 5 PREVIEW
            </span>
            <h1 className="font-bold text-white text-sm hidden sm:inline">
              Safe Integration Preview — Pack Opening & Collection
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Mute Toggle */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-[11px] font-bold uppercase transition-all ${
              isMuted
                ? "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                : "bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            }`}
            title={isMuted ? "Włącz dźwięk (Web Audio API)" : "Wycisz dźwięk"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isMuted ? "Audio: Mute" : "Audio: ON"}</span>
          </button>

          {/* Breadcrumb Steps */}
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10 font-mono text-[10px]">
            <span className={step === "SELECT_PACK" ? "text-amber-400 font-bold" : "text-slate-500"}>1. Paczka</span>
            <span className="text-slate-600">→</span>
            <span className={step === "WALKOUT" ? "text-amber-400 font-bold" : "text-slate-500"}>2. Walkout</span>
            <span className="text-slate-600">→</span>
            <span className={step === "CARD_DETAILS" ? "text-amber-400 font-bold" : "text-slate-500"}>3. Karta</span>
            <span className="text-slate-600">→</span>
            <span className={step === "ALBUM_VIEW" ? "text-amber-400 font-bold" : "text-slate-500"}>4. Kolekcja</span>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: PACK SELECTION & TEST CONFIGURATION                   */}
      {/* ------------------------------------------------------------- */}
      {step === "SELECT_PACK" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-6xl mx-auto w-full space-y-8 animate-fadeIn">
          
          {/* Header Title */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              0 DB Writes • 0 DP Deducted • Safe Isolated Mock Flow
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Wybierz paczkę i przetestuj przepływ odkrywania
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
              Symulacja pełnego cyklu DELTA Collection: otwarcie booster packa, przejście przez kinowy Walkout 3D, weryfikacja szczegółów i umieszczenie w albumie.
            </p>
          </div>

          {/* Pack Selection Carousel / Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, width: "100%" }}>
            {DEMO_PACKS.map(pack => {
              const isSelected = selectedPack.id === pack.id;
              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-950/30 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)] scale-[1.03]"
                      : "bg-slate-900/60 border-white/10 hover:border-white/30 hover:bg-slate-800/60"
                  }`}
                >
                  {/* Pack Cover Image */}
                  <div style={{ position: "relative", width: "100%", height: 200, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 12 }}>
                    <img
                      src={pack.image}
                      alt={pack.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                        {pack.cardsCount} kart
                      </span>
                    </div>
                  </div>

                  {/* Pack Meta */}
                  <h3 className="font-bold text-xs md:text-sm text-white text-center truncate w-full">
                    {pack.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <span className="text-amber-300 font-bold">{pack.priceDp} DP</span>
                    <span className="text-[9px] text-slate-500">(0 DP w teście)</span>
                  </div>
                  <span className="mt-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Min: {pack.minRarity.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Fixture & Test Modifiers Box */}
          <div className="w-full max-w-3xl bg-slate-900/80 border border-white/15 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                  Konfiguracja testowej karty (Fixtures)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Wymuś wariant wizualny i stan duplikatu
              </span>
            </div>

            {/* Fixture Buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase block">
                Wybierz kartę z fixtures do wylosowania w paczce:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {Object.keys(DEMO_PRODUCTION_CARDS).map(key => {
                  const cardItem = DEMO_PRODUCTION_CARDS[key];
                  const isCur = selectedCardFixtureKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCardFixtureKey(key)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isCur
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md"
                          : "bg-black/40 border-white/10 text-slate-300 hover:border-white/30"
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase block text-slate-400">
                        {cardItem.card.rarity}
                      </span>
                      <span className="text-xs font-bold truncate block">
                        {cardItem.card.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duplicate & Audio Mode Toggles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 8 }}>
              {/* Duplicate Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/20">
                <input
                  type="checkbox"
                  checked={isDuplicate}
                  onChange={e => setIsDuplicate(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-white/20"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Symuluj stan DUPLIKATU
                  </span>
                  <span className="text-[10px] text-cyan-300 block">
                    Karta oznaczona jako posiadana (+DP bonus)
                  </span>
                </div>
              </label>

              {/* Audio Mode Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Silnik Audio: Universal 3-Bus Synth
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Proceduralny dźwięk dopasowany do rzadkości karty
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleStartOpening}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer"
          >
            <Gift className="w-5 h-5" />
            <span>Otwórz Paczkę (Demo Walkout)</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: PACK TEAR ATMOSPHERE                                   */}
      {/* ------------------------------------------------------------- */}
      {step === "PACK_TEAR" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-6 animate-fadeIn">
          <div
            className="w-48 h-72 rounded-2xl border-2 border-amber-400/60 shadow-[0_0_50px_rgba(245,158,11,0.5)] overflow-hidden animate-pulse relative"
          >
            <img
              src={selectedPack.image}
              alt={selectedPack.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 top-1/2 h-1 bg-white shadow-[0_0_30px_#fff]" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-400 block animate-bounce">
              Rozdzieranie folii...
            </span>
            <h3 className="text-lg font-bold text-white">
              {selectedPack.name}
            </h3>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: CINEMATIC WALKOUT 3D SEQUENCE                         */}
      {/* ------------------------------------------------------------- */}
      {step === "WALKOUT" && activeDrawnCard && (
        <div className="relative flex-1 w-full h-[calc(100vh-50px)] overflow-hidden">
          
          {/* Universal 3D Stadium Stage */}
          <Stage3DEngine
            theme={currentTheme}
            isShockwaving={walkout.isShockwaving}
            isFlashing={walkout.isFlashing}
            isPulsing={walkout.isPulsing}
            isScreenShaking={walkout.isScreenShaking}
            stadiumZoom={walkout.currentTime > 0}
            ribbonText={`${currentTheme.displayName} • ${activeDrawnCard.surname}`}
          >
            {/* The 3D Card Engine */}
            <div style={{
              position: "relative",
              zIndex: 10,
              transform: walkout.phase === "hero" || walkout.phase === "completed" ? "scale(1.15)" : "scale(1.0)",
              transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
              <Card3DEngine
                data={activeDrawnCard}
                theme={currentTheme}
                yaw={walkout.yaw}
                pitch={walkout.pitch}
                isFlipped={walkout.isFlipped}
                interactive={walkout.phase === "hero" || walkout.phase === "completed"}
                autoRotate={walkout.autoRotate}
                isRevealing={walkout.phase === "reveal"}
                onRotationChange={(y, p) => {
                  walkout.setYaw(y);
                  walkout.setPitch(p);
                }}
              />
            </div>
          </Stage3DEngine>

          {/* Walkout Top Controls Overlay */}
          <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between pointer-events-auto">
            {/* Phase Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 font-bold uppercase">{walkout.phase}</span>
              <span className="text-slate-400">({walkout.currentTime.toFixed(1)}s / 12.0s)</span>
            </div>

            {/* Skip / Hero Shot Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkipWalkout}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                <FastForward className="w-4 h-4" />
                <span>Pomiń do Karty</span>
              </button>
            </div>
          </div>

          {/* Walkout Bottom Control Bar */}
          <div className="absolute bottom-6 inset-x-4 z-40 flex flex-col items-center gap-3 pointer-events-auto max-w-lg mx-auto">
            
            {/* Timeline Progress Bar */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-75"
                style={{ width: `${(walkout.currentTime / 12.0) * 100}%` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-2xl">
              <button
                onClick={() => walkout.isPlaying ? walkout.pause() : walkout.play()}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title={walkout.isPlaying ? "Pauza" : "Start"}
              >
                {walkout.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={walkout.replay}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Od nowa"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-white/20 mx-1" />

              {/* Transition to details if complete or in hero shot */}
              <button
                onClick={handleProceedToDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <span>Szczegóły Karty</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 4: HERO SHOT & CARD DETAILS INSPECTOR                    */}
      {/* ------------------------------------------------------------- */}
      {step === "CARD_DETAILS" && activeDrawnCard && (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 48, width: "100%", maxWidth: 1100, margin: "32px auto", padding: "0 24px" }} className="animate-fadeIn">
          
          {/* Left: Interactive 3D Card Engine in Hero Shot */}
          <div style={{ width: 280, position: "relative", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", ["--inferno-card-w" as any]: "280px" }}>
            <div style={{ width: 280, height: 420, position: "relative" }}>
              <Card3DEngine
                data={activeDrawnCard}
                theme={currentTheme}
                interactive={true}
                autoRotate={false}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400 text-center block mt-3">
              🖱️ Chwyć myszką lub dotykiem, aby obrócić w 3D (360°)
            </span>
          </div>

          {/* Right: Card Specification & Economy Details */}
          <div style={{ flex: 1, minWidth: 420, maxWidth: 620 }} className="flex flex-col bg-slate-900/90 border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider border"
                    style={{
                      borderColor: currentTheme.styling.primaryColor,
                      color: currentTheme.styling.primaryColor,
                      backgroundColor: `${currentTheme.styling.primaryColor}15`
                    }}
                  >
                    {activeDrawnCard.rarity}
                  </span>
                  {activeDrawnCard.isDuplicate ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-cyan-500/20 border border-cyan-400 text-cyan-300">
                      🔁 DUPLIKAT (+{activeDrawnCard.duplicatePoints} DP)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-emerald-500/20 border border-emerald-400 text-emerald-300">
                      ✨ NOWA KARTA DO KOLEKCJI
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  {activeDrawnCard.surname}
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {activeDrawnCard.position} #{activeDrawnCard.shirtNumber} • K.S. DELTA WARSZAWA 2018 GM
                </span>
              </div>

              {/* OVR Badge */}
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-black/60 border border-amber-400/40 text-amber-400 shadow-lg">
                <span className="text-[10px] font-mono font-bold leading-none text-slate-400">OVR</span>
                <span className="text-2xl font-black leading-none">{activeDrawnCard.ovr}</span>
              </div>
            </div>

            {/* 6 Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(activeDrawnCard.stats).map(([stat, val]) => (
                <div
                  key={stat}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10"
                >
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                    {stat}
                  </span>
                  <span className="text-sm font-black text-white font-mono">
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* Technical Identifiers */}
            <div className="space-y-1.5 p-3 rounded-xl bg-black/30 border border-white/10 text-[11px] font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Player ID:</span>
                <span className="text-slate-200">{activeDrawnCard.playerId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Card ID:</span>
                <span className="text-slate-200">{activeDrawnCard.cardId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Visual Skin (3D Frame):</span>
                <span className="text-amber-300 font-bold">{activeDrawnCard.visualType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Economic Rarity (DB):</span>
                <span className="text-emerald-300 font-bold">{activeDrawnCard.economicRarity}</span>
              </div>
            </div>

            {/* Adapter Round-Trip Transparency Accordion */}
            <div>
              <button
                onClick={() => setShowAdapterDebug(prev => !prev)}
                className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{showAdapterDebug ? "Ukryj podgląd adaptera" : "Pokaż audyt adaptera (Round-Trip)"}</span>
              </button>

              {showAdapterDebug && roundTripProductionCard && (
                <div className="mt-2 p-3 rounded-xl bg-black/60 border border-amber-400/30 text-[10px] font-mono overflow-x-auto max-h-48 text-slate-300">
                  <span className="text-amber-400 font-bold block mb-1">
                    ✓ Bezstratne mapowanie produkcja ↔ 3D:
                  </span>
                  <pre>{JSON.stringify({
                    "1_original_economic_rarity": activeDrawnCard.economicRarity,
                    "2_adapted_visual_type": activeDrawnCard.visualType,
                    "3_restored_db_rarity": roundTripProductionCard.rarity,
                    "4_restored_db_card_type": roundTripProductionCard.card_type,
                    "5_instance_id": activeDrawnCard.instanceId,
                    "6_is_duplicate": activeDrawnCard.isDuplicate
                  }, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleGoToAlbum}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Dodaj do Albumu i Zobacz Kolekcję</span>
              </button>

              <button
                onClick={() => setStep("SELECT_PACK")}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Otwórz inną paczkę
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 5: SIMULATED DELTA COLLECTION ALBUM VIEW                 */}
      {/* ------------------------------------------------------------- */}
      {step === "ALBUM_VIEW" && (
        <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 animate-fadeIn">
          
          {/* Album Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-white/15 rounded-2xl p-5">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block tracking-widest">
                OFICJALNY ALBUM DELTA GM 2018
              </span>
              <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight">
                Twoja Kolekcja Kart (Demo Preview)
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Zdobyto {simulatedCollection.length} kart w demonstracyjnym profilu
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("SELECT_PACK")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>Otwórz Kolejną Paczkę</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {(["ALL", "INFERNO", "LEGEND", "GOLD", "MATCHDAY", "RARE", "COMMON"] as const).map(cat => {
              const isCur = activeAlbumFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveAlbumFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isCur
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "bg-black/40 border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, width: "100%" }}>
            {filteredCollection.map(card => {
              const isJustDrawn = activeDrawnCard?.cardId === card.cardId;
              const cardTheme = CARD_VISUAL_THEMES[card.visualType] || CARD_VISUAL_THEMES.BASE;
              return (
                <div
                  key={card.cardId || card.playerId}
                  onClick={() => setInspectedAlbumCard(card)}
                  className={`group relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    isJustDrawn
                      ? "bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/50"
                      : "bg-slate-900/60 border-white/10 hover:border-white/30 hover:bg-slate-800/60"
                  }`}
                >
                  {/* New Pill */}
                  {isJustDrawn && (
                    <div className="absolute -top-2 z-20 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black uppercase tracking-wider shadow">
                      NOWOŚĆ!
                    </div>
                  )}

                  {/* Card Mini Thumbnail */}
                  <div style={{ width: "100%", height: 220, position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 8, pointerEvents: "none", ["--inferno-card-w" as any]: "100%" }}>
                    <Card3DEngine
                      data={card}
                      theme={cardTheme}
                      interactive={false}
                      autoRotate={false}
                    />
                  </div>

                  {/* Card Meta */}
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                    {card.rarity}
                  </span>
                  <h4 className="font-bold text-xs text-white text-center truncate w-full">
                    {card.surname}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    OVR {card.ovr} • #{card.shirtNumber}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Inspected Card Modal in Album */}
          {inspectedAlbumCard && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="relative bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center space-y-4">
                <button
                  onClick={() => setInspectedAlbumCard(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
                <div className="w-[240px] aspect-[2/3]">
                  <Card3DEngine
                    data={inspectedAlbumCard}
                    theme={CARD_VISUAL_THEMES[inspectedAlbumCard.visualType] || CARD_VISUAL_THEMES.BASE}
                    interactive={true}
                    autoRotate={false}
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-white uppercase">{inspectedAlbumCard.surname}</h3>
                  <span className="text-xs font-mono text-slate-400 block">
                    {inspectedAlbumCard.rarity} • OVR {inspectedAlbumCard.ovr}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
export default CollectionIntegrationLab;
