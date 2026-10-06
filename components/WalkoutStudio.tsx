"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Sparkles, 
  Flame, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Move, 
  Layers, 
  Type, 
  Maximize2, 
  Minimize2, 
  Video, 
  Upload, 
  Save, 
  Eye, 
  ChevronRight, 
  RefreshCw, 
  Crown, 
  Star, 
  Film,
  Zap,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Shield
} from "lucide-react";
import PlayerPhoto from "./PlayerPhoto";

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path?: string | null;
}

export interface WalkoutSettings {
  videoSrc: string;
  videoType: "preset" | "custom";
  soundVolume: number;
  rarity: {
    text: string;
    subtext: string;
    x: number;
    y: number;
    scale: number;
    fontSize: number;
    color: string;
    glowColor: string;
    appearTime: number; // in seconds
  };
  player: {
    x: number;
    y: number;
    scale: number;
    brightness: number;
    contrast: number;
    appearTime: number;
    customCutoutUrl?: string;
  };
  card: {
    template: "inferno" | "legendary" | "gold" | "epic" | "matchday";
    x: number;
    y: number;
    scale: number;
    rotation: number;
    appearTime: number;
    customCardUrl?: string;
  };
  metadata: {
    playerName: string;
    playerRating: number;
    playerPosition: string;
    playerClub: string;
  };
  timings: {
    totalDuration: number;
    flashTime: number;
    revealTime: number;
  };
}

const DEFAULT_WALKOUT_SETTINGS: WalkoutSettings = {
  videoSrc: "/media/walkouts/inferno-bg.mp4",
  videoType: "preset",
  soundVolume: 0.8,
  rarity: {
    text: "INFERNO",
    subtext: "SPECIAL EDITION",
    x: 0,
    y: -80,
    scale: 1.6,
    fontSize: 54,
    color: "#ff3b30",
    glowColor: "rgba(255, 69, 0, 0.8)",
    appearTime: 2.5
  },
  player: {
    x: -30,
    y: 10,
    scale: 1.15,
    brightness: 105,
    contrast: 110,
    appearTime: 4.8,
    customCutoutUrl: ""
  },
  card: {
    template: "inferno",
    x: 40,
    y: -30,
    scale: 1.25,
    rotation: 0,
    appearTime: 7.2,
    customCardUrl: ""
  },
  metadata: {
    playerName: "RYSIO",
    playerRating: 94,
    playerPosition: "NAPASTNIK",
    playerClub: "DELTA 2018 GM"
  },
  timings: {
    totalDuration: 12.0,
    flashTime: 7.0,
    revealTime: 7.2
  }
};

const VIDEO_PRESETS = [
  { id: "inferno", name: "🔥 Piekielne Płomienie (Inferno MP4)", src: "/media/walkouts/inferno-bg.mp4" },
  { id: "sparks", name: "✨ Złote Cząsteczki & Iskry", src: "/assets/stadium-broadcast-v103.png" },
  { id: "stadium", name: "🏟️ Nocny Stadion DELTA", src: "/assets/stadium.png" },
  { id: "galaxy", name: "🌌 Kosmiczna Galaktyka", src: "/assets/stadium3.png" },
];

export default function WalkoutStudio(props: {
  players?: Player[];
  onSaveSettings?: (settings: WalkoutSettings) => void;
}) {
  const players = props.players || [];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || "");
  const [settings, setSettings] = useState<WalkoutSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("delta_walkout_studio_settings");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_WALKOUT_SETTINGS;
  });

  // Player selection sync
  const activePlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || null;
  }, [players, selectedPlayerId]);

  useEffect(() => {
    if (activePlayer) {
      setSettings(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          playerName: activePlayer.display_name.split(" ")[0].toUpperCase(),
          playerPosition: activePlayer.position || "ZAWODNIK",
        }
      }));
    }
  }, [activePlayer]);

  // Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(settings.timings.totalDuration);
  const [isMuted, setIsMuted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"card" | "player" | "rarity">("card");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0, startY: 0, initX: 0, initY: 0
  });

  // Calculate visibility based on timeline currentTime
  const isRarityVisible = currentTime >= settings.rarity.appearTime;
  const isPlayerVisible = currentTime >= settings.player.appearTime;
  const isCardVisible = currentTime >= settings.card.appearTime;

  // Flash effect trigger
  useEffect(() => {
    const flashDelta = Math.abs(currentTime - settings.timings.flashTime);
    if (flashDelta < 0.25) {
      setIsFlashActive(true);
    } else {
      setIsFlashActive(false);
    }
  }, [currentTime, settings.timings.flashTime]);

  // Video sync
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Playback Loop
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    } else {
      setIsPlaying(true);
      if (currentTime >= settings.timings.totalDuration - 0.2) {
        setCurrentTime(0);
        if (videoRef.current) videoRef.current.currentTime = 0;
      }
      startTimeRef.current = performance.now() - (currentTime * 1000);

      const loop = (now: number) => {
        const elapsed = (now - startTimeRef.current) / 1000;
        if (elapsed >= settings.timings.totalDuration) {
          setCurrentTime(settings.timings.totalDuration);
          setIsPlaying(false);
        } else {
          setCurrentTime(elapsed);
          playbackTimerRef.current = requestAnimationFrame(loop);
        }
      };
      playbackTimerRef.current = requestAnimationFrame(loop);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = newTime % videoRef.current.duration;
    }
    if (isPlaying) {
      startTimeRef.current = performance.now() - (newTime * 1000);
    }
  };

  const handleResetTimeline = () => {
    setIsPlaying(false);
    if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    setCurrentTime(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  // Drag and Drop interaction on Stage
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);

    let initX = 0;
    let initY = 0;

    if (activeLayer === "card") {
      initX = settings.card.x;
      initY = settings.card.y;
    } else if (activeLayer === "player") {
      initX = settings.player.x;
      initY = settings.player.y;
    } else if (activeLayer === "rarity") {
      initX = settings.rarity.x;
      initY = settings.rarity.y;
    }

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const newX = Math.round(dragStartRef.current.initX + deltaX);
    const newY = Math.round(dragStartRef.current.initY + deltaY);

    setSettings(prev => {
      if (activeLayer === "card") {
        return { ...prev, card: { ...prev.card, x: newX, y: newY } };
      } else if (activeLayer === "player") {
        return { ...prev, player: { ...prev.player, x: newX, y: newY } };
      } else if (activeLayer === "rarity") {
        return { ...prev, rarity: { ...prev.rarity, x: newX, y: newY } };
      }
      return prev;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Save Settings
  const handleSave = () => {
    try {
      localStorage.setItem("delta_walkout_studio_settings", JSON.stringify(settings));
      if (props.onSaveSettings) props.onSaveSettings(settings);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (e: any) {
      alert("Błąd zapisu: " + e.message);
    }
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDefaults = () => {
    if (confirm("Przywrócić domyślne ustawienia studia walkoutów?")) {
      setSettings(DEFAULT_WALKOUT_SETTINGS);
      localStorage.removeItem("delta_walkout_studio_settings");
    }
  };

  // Video Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({
      ...prev,
      videoSrc: url,
      videoType: "custom"
    }));
  };

  // Cutout PNG Upload
  const handleCutoutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({
      ...prev,
      player: {
        ...prev.player,
        customCutoutUrl: url
      }
    }));
  };

  return (
    <div className={`v300-walkout-studio ${isFullscreen ? "is-fullscreen" : ""}`}>
      {/* GÓRNY PASEK NARZĘDZI */}
      <div className="flex items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-black shadow-lg">
            <Film size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
              <span>Studio Walkoutów DELTA</span>
              <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-black">
                PRO STUDIO
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Personalizuj animację otwierania kart: wideo tła, pozycje 3D, napisy i efekty wybuchu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Domyślne
          </button>
          <button
            type="button"
            onClick={handleCopyJSON}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Skopiowano JSON!" : "Kopiuj JSON"}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center gap-1.5"
          >
            <Save size={15} />
            <span>{savedFeedback ? "✓ Zapisano!" : "Zapisz animację"}</span>
          </button>
        </div>
      </div>

      {/* GŁÓWNY PANEL EDYTORA (LEWA: STAGE PODGLĄDU, PRAWA: KONTROLKI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        
        {/* LEWA STRONA: SCENA PODGLĄDU (STAGE) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          <div 
            ref={stageContainerRef}
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl select-none flex items-center justify-center cursor-crosshair group"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* 1. TŁO WIDEO */}
            {settings.videoSrc.endsWith(".mp4") || settings.videoSrc.endsWith(".webm") ? (
              <video
                ref={videoRef}
                src={settings.videoSrc}
                loop
                muted={isMuted}
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div 
                className="absolute inset-0 bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: `url(${settings.videoSrc})` }}
              />
            )}

            {/* Ciemna winieta i poświata stadionowa */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/80 pointer-events-none" />

            {/* BŁYSK EXPLOSION (FLASH) */}
            {isFlashActive && (
              <div className="absolute inset-0 bg-white z-50 animate-ping pointer-events-none opacity-90 transition-opacity" />
            )}

            {/* 2. WARSTWA 1: NAPISY RZADKOŚCI & TYTUŁ */}
            {isRarityVisible && (
              <div
                className={`absolute pointer-events-none transition-transform duration-75 flex flex-col items-center justify-center text-center ${
                  activeLayer === "rarity" ? "ring-2 ring-amber-400 ring-offset-4 ring-offset-black/50 rounded-xl p-2" : ""
                }`}
                style={{
                  transform: `translate(${settings.rarity.x}px, ${settings.rarity.y}px) scale(${settings.rarity.scale})`,
                  zIndex: 20
                }}
              >
                <div 
                  className="font-black uppercase tracking-widest leading-none drop-shadow-2xl"
                  style={{
                    fontSize: `${settings.rarity.fontSize}px`,
                    color: settings.rarity.color,
                    textShadow: `0 0 35px ${settings.rarity.glowColor}, 0 0 10px #000, 0 4px 20px #000`
                  }}
                >
                  {settings.rarity.text}
                </div>
                <div 
                  className="text-xs font-black tracking-widest uppercase text-amber-300 mt-1 opacity-90"
                  style={{ letterSpacing: "0.25em" }}
                >
                  {settings.rarity.subtext}
                </div>
              </div>
            )}

            {/* 3. WARSTWA 2: SYLWETKA ZAWODNIKA (CUTOUT PNG) */}
            {isPlayerVisible && (
              <div
                className={`absolute pointer-events-none transition-transform duration-75 flex items-center justify-center ${
                  activeLayer === "player" ? "ring-2 ring-sky-400 ring-offset-4 ring-offset-black/50 rounded-2xl" : ""
                }`}
                style={{
                  transform: `translate(${settings.player.x}px, ${settings.player.y}px) scale(${settings.player.scale})`,
                  filter: `brightness(${settings.player.brightness}%) contrast(${settings.player.contrast}%) drop-shadow(0 20px 30px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(255,69,0,0.35))`,
                  zIndex: 25
                }}
              >
                {settings.player.customCutoutUrl ? (
                  <img 
                    src={settings.player.customCutoutUrl} 
                    alt="Sylwetka zawodnika"
                    className="max-h-[380px] object-contain pointer-events-none"
                  />
                ) : activePlayer ? (
                  <div className="w-64 h-80 relative flex items-center justify-center">
                    <PlayerPhoto playerId={activePlayer.id} className="w-full h-full object-contain pointer-events-none" />
                  </div>
                ) : (
                  <img 
                    src="/demo/player-cutout.png" 
                    alt="Zawodnik domyślny"
                    className="max-h-[380px] object-contain pointer-events-none"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            )}

            {/* 4. WARSTWA 3: KARTA 3D / HERO CARD */}
            {isCardVisible && (
              <div
                className={`absolute pointer-events-none transition-transform duration-75 flex items-center justify-center ${
                  activeLayer === "card" ? "ring-2 ring-yellow-400 ring-offset-4 ring-offset-black/50 rounded-2xl" : ""
                }`}
                style={{
                  transform: `translate(${settings.card.x}px, ${settings.card.y}px) rotate(${settings.card.rotation}deg) scale(${settings.card.scale})`,
                  zIndex: 30
                }}
              >
                <div className="w-56 h-80 rounded-2xl p-4 bg-gradient-to-b from-amber-500/20 via-slate-900 to-black border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] flex flex-col justify-between items-center relative overflow-hidden backdrop-blur-md">
                  {/* Efekt karty */}
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                  
                  {/* Nagłówek karty */}
                  <div className="w-full flex justify-between items-start z-10">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-amber-400 leading-none">
                        {settings.metadata.playerRating}
                      </span>
                      <span className="text-[10px] font-black uppercase text-white/90">
                        {settings.metadata.playerPosition.slice(0, 3)}
                      </span>
                      <img src="/teamlogos/gm.png" alt="Delta" className="w-5 h-5 mt-1 object-contain" />
                    </div>
                    <span className="text-[10px] font-black uppercase bg-red-950 text-red-400 border border-red-700 px-2 py-0.5 rounded-full">
                      {settings.rarity.text}
                    </span>
                  </div>

                  {/* Środek karty - zdjęcie */}
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-amber-400/50 shadow-inner my-auto bg-black/40">
                    {activePlayer ? (
                      <PlayerPhoto playerId={activePlayer.id} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-amber-400 text-xl">
                        ⚽
                      </div>
                    )}
                  </div>

                  {/* Dół karty - Imię i Klub */}
                  <div className="w-full text-center z-10">
                    <div className="text-lg font-black text-white tracking-wide uppercase truncate">
                      {settings.metadata.playerName}
                    </div>
                    <div className="text-[10px] font-bold text-amber-400 tracking-wider">
                      {settings.metadata.playerClub}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wskaźnik przeciągania */}
            <div className="absolute top-3 left-3 z-40 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-300">
              <Move size={14} className="text-amber-400" />
              <span>Przeciągaj myszką: <b>{activeLayer === "card" ? "Karta 3D" : activeLayer === "player" ? "Sylwetka PNG" : "Napisy Rzadkości"}</b></span>
            </div>

            {/* Wskaźnik aktualnego czasu */}
            <div className="absolute bottom-3 right-3 z-40 bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-xs font-mono text-amber-400 font-black">
              {currentTime.toFixed(2)}s / {settings.timings.totalDuration.toFixed(1)}s
            </div>
          </div>

          {/* PASEK OSI CZASU (TIMELINE SCRUBBER) */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black flex items-center justify-center transition shadow-lg"
                  title={isPlaying ? "Pauza" : "Odtwórz walkout"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleResetTimeline}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                  title="Przewiń na początek (0.0s)"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                  title={isMuted ? "Włącz dźwięk" : "Wycisz"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* Szybkie skoki do faz animacji */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => handleSeek(0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  0s Start
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(settings.rarity.appearTime)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
                >
                  {settings.rarity.appearTime}s Napis
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(settings.player.appearTime)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold"
                >
                  {settings.player.appearTime}s Zawodnik
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(settings.card.appearTime)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-300 font-bold"
                >
                  {settings.card.appearTime}s Karta
                </button>
              </div>
            </div>

            {/* Suwak Scrubber */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={settings.timings.totalDuration}
                step={0.05}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.0s (Intro)</span>
                <span>{settings.rarity.appearTime}s (Napis)</span>
                <span>{settings.player.appearTime}s (Zawodnik)</span>
                <span>{settings.card.appearTime}s (Uderzenie Karty)</span>
                <span>{settings.timings.totalDuration}s (Koniec)</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRAWA STRONA: KONTROLKI I ZAKŁADKI PARAMETRÓW */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
          
          {/* WYBÓR WARSTWY DO EDYCJI */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Wybierz aktywną warstwę do edycji:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveLayer("card")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  activeLayer === "card"
                    ? "bg-amber-500 text-black shadow-lg"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Sparkles size={16} />
                <span>Karta 3D</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer("player")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  activeLayer === "player"
                    ? "bg-sky-500 text-black shadow-lg"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Layers size={16} />
                <span>Zawodnik PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer("rarity")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  activeLayer === "rarity"
                    ? "bg-red-500 text-white shadow-lg"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Type size={16} />
                <span>Napisy</span>
              </button>
            </div>
          </div>

          {/* KONTROLKI WYBRANEJ WARSTWY */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 max-h-[560px] overflow-y-auto">
            
            {/* 1. EDYCJA KARTY */}
            {activeLayer === "card" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={16} /> Ustawienia Karty 3D
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, card: { ...prev.card, x: 0, y: 0 } }))}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Wyśrodkuj
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Pozycja X (Poziom)</span>
                      <span className="font-mono text-amber-400">{settings.card.x} px</span>
                    </div>
                    <input
                      type="range"
                      min={-300}
                      max={300}
                      value={settings.card.x}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, x: parseInt(e.target.value) } }))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Pozycja Y (Pion)</span>
                      <span className="font-mono text-amber-400">{settings.card.y} px</span>
                    </div>
                    <input
                      type="range"
                      min={-250}
                      max={250}
                      value={settings.card.y}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, y: parseInt(e.target.value) } }))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Skala karty (Rozmiar)</span>
                      <span className="font-mono text-amber-400">{settings.card.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={settings.card.scale}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, scale: parseFloat(e.target.value) } }))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Rotacja (Kąt)</span>
                      <span className="font-mono text-amber-400">{settings.card.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      value={settings.card.rotation}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, rotation: parseInt(e.target.value) } }))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Moment wejścia karty na scenę</span>
                      <span className="font-mono text-amber-400">{settings.card.appearTime} s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={settings.timings.totalDuration}
                      step={0.1}
                      value={settings.card.appearTime}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, appearTime: parseFloat(e.target.value) } }))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. EDYCJA SYLWETKI ZAWODNIKA */}
            {activeLayer === "player" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={16} /> Ustawienia Sylwetki Gracza
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, player: { ...prev.player, x: 0, y: 0 } }))}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Wyśrodkuj
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Wybierz zawodnika z klubu:
                    </label>
                    <select
                      value={selectedPlayerId}
                      onChange={e => setSelectedPlayerId(e.target.value)}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                    >
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.display_name} (#{p.shirt_number || "—"})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Wgraj własne wycięte zdjęcie PNG sylwetki:
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/webp"
                      onChange={handleCutoutUpload}
                      className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-900 file:text-sky-200"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Pozycja X (Poziom)</span>
                      <span className="font-mono text-sky-400">{settings.player.x} px</span>
                    </div>
                    <input
                      type="range"
                      min={-300}
                      max={300}
                      value={settings.player.x}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, x: parseInt(e.target.value) } }))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Pozycja Y (Pion)</span>
                      <span className="font-mono text-sky-400">{settings.player.y} px</span>
                    </div>
                    <input
                      type="range"
                      min={-250}
                      max={250}
                      value={settings.player.y}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, y: parseInt(e.target.value) } }))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Skala zawodnika</span>
                      <span className="font-mono text-sky-400">{settings.player.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={settings.player.scale}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, scale: parseFloat(e.target.value) } }))}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Moment wejścia zawodnika na scenę</span>
                      <span className="font-mono text-sky-400">{settings.player.appearTime} s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={settings.timings.totalDuration}
                      step={0.1}
                      value={settings.player.appearTime}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, appearTime: parseFloat(e.target.value) } }))}
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. EDYCJA NAPISÓW */}
            {activeLayer === "rarity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Type size={16} /> Ustawienia Napisów i Tekstów
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, x: 0, y: -80 } }))}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Wyśrodkuj
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Główny napis rzadkości:
                    </label>
                    <input
                      type="text"
                      value={settings.rarity.text}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, text: e.target.value.toUpperCase() } }))}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-black"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Podtytuł rzadkości:
                    </label>
                    <input
                      type="text"
                      value={settings.rarity.subtext}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, subtext: e.target.value.toUpperCase() } }))}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Pozycja X (Poziom)</span>
                      <span className="font-mono text-red-400">{settings.rarity.x} px</span>
                    </div>
                    <input
                      type="range"
                      min={-300}
                      max={300}
                      value={settings.rarity.x}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, x: parseInt(e.target.value) } }))}
                      className="w-full accent-red-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Pozycja Y (Pion)</span>
                      <span className="font-mono text-red-400">{settings.rarity.y} px</span>
                    </div>
                    <input
                      type="range"
                      min={-250}
                      max={250}
                      value={settings.rarity.y}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, y: parseInt(e.target.value) } }))}
                      className="w-full accent-red-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Rozmiar czcionki (Scale)</span>
                      <span className="font-mono text-red-400">{settings.rarity.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.05}
                      value={settings.rarity.scale}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, scale: parseFloat(e.target.value) } }))}
                      className="w-full accent-red-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-300 mb-1">
                      <span>Moment wejścia napisu</span>
                      <span className="font-mono text-red-400">{settings.rarity.appearTime} s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={settings.timings.totalDuration}
                      step={0.1}
                      value={settings.rarity.appearTime}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, appearTime: parseFloat(e.target.value) } }))}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* WYBÓR FILMU WIDEO TŁA */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Video size={16} className="text-amber-400" /> Wideo Tła (Background Video):
              </label>

              <div className="grid grid-cols-2 gap-2">
                {VIDEO_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, videoSrc: preset.src, videoType: "preset" }))}
                    className={`p-2 rounded-xl text-[11px] font-bold text-left transition border ${
                      settings.videoSrc === preset.src
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Lub wgraj własny plik wideo (MP4 / WebM):
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleVideoUpload}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
