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
  Shield,
  Trash2
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
  soundVolume: number;
  rarity: {
    text: string;
    subtext: string;
    x: number; // percentage offset from center
    y: number; // percentage offset from center
    scale: number;
  };
  player: {
    x: number; // percentage offset from center
    y: number; // percentage offset from center
    scale: number;
    customCutoutUrl?: string;
  };
  card: {
    template: "inferno" | "gold" | "legendary" | "epic";
    x: number; // percentage offset from center
    y: number; // pixel offset from center
    scale: number;
    customCardUrl?: string;
  };
  metadata: {
    playerName: string;
    playerRating: number;
    playerPosition: string;
    playerClub: string;
  };
  stage: "all" | "intro" | "rarity" | "player" | "card" | "hero";
}

const DEFAULT_SETTINGS: WalkoutSettings = {
  videoSrc: "/media/walkouts/inferno-bg.mp4",
  soundVolume: 0.8,
  rarity: {
    text: "INFERNO",
    subtext: "EDYCJA SPECJALNA",
    x: 0,
    y: -1,
    scale: 1.75
  },
  player: {
    x: -21,
    y: -24,
    scale: 1.05,
    customCutoutUrl: ""
  },
  card: {
    template: "inferno",
    x: -2,
    y: -78,
    scale: 1.3,
    customCardUrl: ""
  },
  metadata: {
    playerName: "RYSIO",
    playerRating: 94,
    playerPosition: "NAPASTNIK",
    playerClub: "DELTA 2018 GM"
  },
  stage: "hero"
};

const VIDEO_PRESETS = [
  { id: "inferno", name: "🔥 Piekielny Tunel (Inferno MP4)", src: "/media/walkouts/inferno-bg.mp4" },
  { id: "stadium", name: "🏟️ Nocny Stadion DELTA", src: "/assets/stadium.png" },
  { id: "broadcast", name: "✨ Transmisja Studio Gold", src: "/assets/stadium-broadcast-v103.png" },
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
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

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
          playerPosition: (activePlayer.position || "ZAWODNIK").toUpperCase(),
        }
      }));
    }
  }, [activePlayer]);

  // Stage sequence playback
  const [stage, setStage] = useState<"intro" | "rarity" | "player" | "card" | "hero">("hero");
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(9.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<"rarity" | "player" | "card">("card");
  const [copied, setCopied] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Dragging state on viewport
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0, startY: 0, initX: 0, initY: 0
  });

  const clearTimers = () => {
    timerRef.current.forEach(t => clearTimeout(t));
    timerRef.current = [];
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const startFullWalkout = () => {
    clearTimers();
    setIsPlayingAuto(true);
    setStage("intro");
    setIsFlash(false);
    setCurrentTime(0);
    startTimeRef.current = Date.now();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    const updateTicker = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);
      if (elapsed < 12) {
        animFrameRef.current = requestAnimationFrame(updateTicker);
      } else {
        setIsPlayingAuto(false);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateTicker);

    // 1. Stage: Rarity appear at 3.0s
    timerRef.current.push(
      setTimeout(() => {
        setStage("rarity");
      }, 3000)
    );

    // 2. Stage: Player appear at 5.0s
    timerRef.current.push(
      setTimeout(() => {
        setStage("player");
      }, 5000)
    );

    // 3. Stage: Card Flash & Drop at 7.0s
    timerRef.current.push(
      setTimeout(() => {
        setStage("card");
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 300);
      }, 7000)
    );

    // 4. Stage: Hero full display at 9.0s
    timerRef.current.push(
      setTimeout(() => {
        setStage("hero");
      }, 9000)
    );
  };

  const jumpToStage = (s: "intro" | "rarity" | "player" | "card" | "hero") => {
    clearTimers();
    setIsPlayingAuto(false);
    setStage(s);
    setIsFlash(false);
    const times = { intro: 0, rarity: 3.5, player: 5.5, card: 7.5, hero: 9.5 };
    setCurrentTime(times[s]);
    if (videoRef.current) {
      videoRef.current.currentTime = times[s] % (videoRef.current.duration || 10);
      videoRef.current.play().catch(() => {});
    }
  };

  // Drag and Drop
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);

    let initX = 0;
    let initY = 0;

    if (activeLayer === "rarity") {
      initX = settings.rarity.x;
      initY = settings.rarity.y;
    } else if (activeLayer === "player") {
      initX = settings.player.x;
      initY = settings.player.y;
    } else if (activeLayer === "card") {
      initX = settings.card.x;
      initY = settings.card.y;
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
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    // Scale sensitivity
    const stepX = Math.round(dx / 5);
    const stepY = Math.round(dy / 5);

    const newX = dragStartRef.current.initX + stepX;
    const newY = dragStartRef.current.initY + stepY;

    setSettings(prev => {
      if (activeLayer === "rarity") {
        return { ...prev, rarity: { ...prev.rarity, x: newX, y: newY } };
      } else if (activeLayer === "player") {
        return { ...prev, player: { ...prev.player, x: newX, y: newY } };
      } else if (activeLayer === "card") {
        return { ...prev, card: { ...prev.card, x: newX, y: newY } };
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
    const jsonOutput = {
      rarity: { x: settings.rarity.x, y: settings.rarity.y, scale: settings.rarity.scale },
      player: { x: settings.player.x, y: settings.player.y, scale: settings.player.scale },
      card: { x: settings.card.x, y: settings.card.y, scale: settings.card.scale }
    };
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDefaults = () => {
    if (confirm("Zresetować położenia do domyślnych wartości?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem("delta_walkout_studio_settings");
    }
  };

  // Video Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, videoSrc: url }));
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.play().catch(() => {});
    }
  };

  // Player Cutout Upload
  const handleCutoutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, player: { ...prev.player, customCutoutUrl: url } }));
  };

  // Card Image Upload
  const handleCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, card: { ...prev.card, customCardUrl: url } }));
  };

  return (
    <div className="v300-walkout-studio w-full space-y-4">
      {/* NAGŁÓWEK I PRZYCISKI AKCJI */}
      <div className="flex items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-amber-500 to-yellow-400 flex items-center justify-center text-black shadow-lg">
            <Flame size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Studio Walkoutów & Animacji</span>
              <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                PRO WYSIWYG
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Wybierz film wideo, kartę i zawodnika. Przesuwaj elementy suwakami lub przeciągaj myszką.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            type="button"
            onClick={handleCopyJSON}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Skopiowano!" : "Kopiuj JSON"}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center gap-1.5"
          >
            <Save size={15} />
            <span>{savedFeedback ? "✓ Zapisano!" : "Zapisz ułożenie"}</span>
          </button>
        </div>
      </div>

      {/* GŁÓWNY WIDOK: LEWA - EKRAN FILMOWY, PRAWA - DOKŁADNE PANELE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* LEWA STRONA: KINOWY VIEWPORT (560px) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          
          <div 
            className="relative w-full h-[520px] md:h-[560px] rounded-2xl overflow-hidden bg-black border border-red-900/60 shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none flex items-center justify-center cursor-move group"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* WIDEO TŁA */}
            {settings.videoSrc.endsWith(".mp4") || settings.videoSrc.endsWith(".webm") ? (
              <video
                ref={videoRef}
                src={settings.videoSrc}
                autoPlay
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

            {/* Ciemna winieta */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            {/* EFEKT BŁYSKU (FLASH) */}
            {isFlash && (
              <div className="absolute inset-0 bg-white z-50 animate-ping pointer-events-none opacity-90 transition-opacity" />
            )}

            {/* 1. WARSTWA NAPISÓW (RARITY) */}
            {(stage === "rarity" || stage === "player" || stage === "hero") && (
              <div 
                className={`absolute pointer-events-none flex flex-col items-center text-center z-40 transition-transform duration-75 ${
                  activeLayer === "rarity" ? "ring-2 ring-amber-400 ring-offset-4 ring-offset-black/70 rounded-xl p-2" : ""
                }`}
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${settings.rarity.x}%), calc(-50% + ${settings.rarity.y}%)) scale(${settings.rarity.scale})`
                }}
              >
                <div 
                  className="font-black tracking-widest uppercase leading-none"
                  style={{
                    fontSize: "48px",
                    color: "#ff3b30",
                    textShadow: "0 0 30px rgba(255, 69, 0, 0.9), 0 0 10px #000, 0 4px 15px #000"
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

            {/* 2. WARSTWA ZAWODNIKA (CUTOUT PNG) */}
            {(stage === "player" || stage === "hero") && (
              <div 
                className={`absolute pointer-events-none z-30 transition-transform duration-75 flex items-center justify-center ${
                  activeLayer === "player" ? "ring-2 ring-sky-400 ring-offset-4 ring-offset-black/70 rounded-2xl" : ""
                }`}
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${settings.player.x}%), calc(-50% + ${settings.player.y}%)) scale(${settings.player.scale})`,
                  filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.95)) drop-shadow(0 0 25px rgba(255,69,0,0.4))"
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

            {/* 3. WARSTWA KARTY 3D */}
            {(stage === "card" || stage === "hero") && (
              <div 
                className={`absolute pointer-events-none z-50 transition-transform duration-75 flex items-center justify-center ${
                  activeLayer === "card" ? "ring-2 ring-yellow-400 ring-offset-4 ring-offset-black/70 rounded-2xl" : ""
                }`}
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${settings.card.x}%), calc(-50% + ${settings.card.y}px)) scale(${settings.card.scale})`,
                  filter: "drop-shadow(0 0 45px rgba(255,42,59,0.95)) drop-shadow(0 25px 40px rgba(0,0,0,0.95))"
                }}
              >
                {settings.card.customCardUrl ? (
                  <img 
                    src={settings.card.customCardUrl} 
                    alt="Karta"
                    className="w-[260px] h-[380px] object-contain rounded-2xl pointer-events-none"
                  />
                ) : (
                  <div className="w-[260px] h-[380px] rounded-2xl overflow-hidden bg-[#080203] border-2 border-[#ff2a3b] shadow-[0_0_35px_rgba(255,42,59,0.6)] flex items-center justify-center pointer-events-none">
                    <img 
                      src="/demo/inferno-card.png" 
                      alt="Inferno Card"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback dynamic card
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* DOLNY PASEK BOHATERA (HERO DETAILS) */}
            {stage === "hero" && (
              <div className="absolute bottom-5 z-50 flex flex-col items-center text-center pointer-events-none">
                <div className="flex items-center gap-1.5 text-xs font-black text-red-500 uppercase tracking-widest mb-1">
                  <Flame size={14} /> <span>{settings.rarity.text} WALKOUT</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_25px_rgba(255,42,59,0.85)]">
                  {settings.metadata.playerName}
                </h1>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mt-1">
                  <span className="text-amber-400 font-black">{settings.metadata.playerRating} OVR</span>
                  <span className="text-slate-600">•</span>
                  <span>{settings.metadata.playerPosition}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">{settings.metadata.playerClub}</span>
                </div>
              </div>
            )}

            {/* WSKAŹNIK AKTYWNEJ WARSTWY DO PRZECIĄGANIA */}
            <div className="absolute top-3 left-3 z-50 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-200">
              <Move size={14} className="text-amber-400" />
              <span>Przeciągaj: <b className="text-amber-400">{activeLayer === "card" ? "Karta" : activeLayer === "player" ? "Zawodnik" : "Napisy"}</b></span>
            </div>

            {/* WSKAŹNIK CZASU */}
            <div className="absolute top-3 right-3 z-50 bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-xs font-mono text-amber-400 font-black">
              {currentTime.toFixed(1)}s • Faza: <span className="uppercase text-white">{stage}</span>
            </div>
          </div>

          {/* PASEK KONTROLI ODTWARZANIA I ETAPÓW */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startFullWalkout}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 hover:from-red-500 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
              >
                <Play size={16} /> <span>Odtwórz pełny film walkoutu</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title={isMuted ? "Włącz dźwięk" : "Wycisz"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1">Skocz do fazy:</span>
              <button
                type="button"
                onClick={() => jumpToStage("intro")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stage === "intro" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                1. Intro (0s)
              </button>
              <button
                type="button"
                onClick={() => jumpToStage("rarity")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stage === "rarity" ? "bg-red-950 text-red-300 border border-red-700" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                2. Napis (3s)
              </button>
              <button
                type="button"
                onClick={() => jumpToStage("player")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stage === "player" ? "bg-sky-950 text-sky-300 border border-sky-700" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                3. Gracz (5s)
              </button>
              <button
                type="button"
                onClick={() => jumpToStage("card")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stage === "card" ? "bg-amber-950 text-amber-300 border border-amber-700" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                4. Karta (7s)
              </button>
              <button
                type="button"
                onClick={() => jumpToStage("hero")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stage === "hero" ? "bg-yellow-500 text-black font-black" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                5. Hero (9s+)
              </button>
            </div>
          </div>
        </div>

        {/* PRAWA STRONA: DOKŁADNE SUWAKI I KONTROLKI WARSTW */}
        <div className="xl:col-span-4 flex flex-col gap-3">
          
          {/* WYBÓR AKTYWNEJ WARSTWY */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Wybierz warstwę do regulacji:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveLayer("card")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
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
                className={`py-2 px-2.5 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
                  activeLayer === "player"
                    ? "bg-sky-500 text-black shadow-lg"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Layers size={16} />
                <span>Zawodnik</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer("rarity")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 ${
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

          {/* SUWAKI WARSTWY KARTY */}
          {activeLayer === "card" && (
            <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={16} /> Pozycja Karty 3D
                </span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, card: { ...prev.card, x: -2, y: -78, scale: 1.3 } }))}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Reset do optymalnych
                </button>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Poziom X (%)</span>
                  <span className="font-mono text-amber-400">{settings.card.x}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={settings.card.x}
                  onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, x: parseInt(e.target.value) } }))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Pion Y (px)</span>
                  <span className="font-mono text-amber-400">{settings.card.y} px</span>
                </div>
                <input
                  type="range"
                  min={-200}
                  max={100}
                  value={settings.card.y}
                  onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, y: parseInt(e.target.value) } }))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Skala Karty (Scale)</span>
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

              <div className="pt-2 border-t border-slate-800">
                <label className="block font-bold text-slate-300 mb-1">
                  Wgraj własną grafikę karty (PNG):
                </label>
                <input
                  type="file"
                  accept="image/png,image/webp"
                  onChange={handleCardUpload}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black"
                />
              </div>
            </div>
          )}

          {/* SUWAKI WARSTWY ZAWODNIKA */}
          {activeLayer === "player" && (
            <div className="p-4 bg-slate-900/90 border border-sky-500/30 rounded-2xl space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={16} /> Pozycja Sylwetki Gracza
                </span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, player: { ...prev.player, x: -21, y: -24, scale: 1.05 } }))}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Reset do optymalnych
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Wybierz zawodnika:
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
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Poziom X (%)</span>
                  <span className="font-mono text-sky-400">{settings.player.x}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={settings.player.x}
                  onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, x: parseInt(e.target.value) } }))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Pion Y (%)</span>
                  <span className="font-mono text-sky-400">{settings.player.y}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={settings.player.y}
                  onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, y: parseInt(e.target.value) } }))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Skala Zawodnika (Scale)</span>
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

              <div className="pt-2 border-t border-slate-800">
                <label className="block font-bold text-slate-300 mb-1">
                  Wgraj własne wycięte zdjęcie PNG:
                </label>
                <input
                  type="file"
                  accept="image/png,image/webp"
                  onChange={handleCutoutUpload}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-500 file:text-black"
                />
              </div>
            </div>
          )}

          {/* SUWAKI WARSTWY NAPISÓW */}
          {activeLayer === "rarity" && (
            <div className="p-4 bg-slate-900/90 border border-red-500/30 rounded-2xl space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Type size={16} /> Pozycja Napisów Rzadkości
                </span>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, x: 0, y: -1, scale: 1.75 } }))}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Reset do optymalnych
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Główny tekst:
                </label>
                <input
                  type="text"
                  value={settings.rarity.text}
                  onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, text: e.target.value.toUpperCase() } }))}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-black"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Poziom X (%)</span>
                  <span className="font-mono text-red-400">{settings.rarity.x}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={settings.rarity.x}
                  onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, x: parseInt(e.target.value) } }))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 mb-1">
                  <span>Pion Y (%)</span>
                  <span className="font-mono text-red-400">{settings.rarity.y}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
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
            </div>
          )}

          {/* WYBÓR WIDEO */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 text-xs">
            <label className="block font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Video size={16} className="text-amber-400" /> Film Wideo w Tle:
            </label>

            <div className="grid grid-cols-1 gap-1.5">
              {VIDEO_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSettings(prev => ({ ...prev, videoSrc: preset.src }));
                    if (videoRef.current) {
                      videoRef.current.src = preset.src;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className={`p-2 rounded-xl text-xs font-bold text-left transition border ${
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
              <label className="block text-slate-400 font-bold mb-1">
                Wgraj własny plik wideo (MP4 / WebM):
              </label>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoUpload}
                className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black"
              />
            </div>
          </div>

          {/* JSON READOUT */}
          <div className="p-3 bg-black/60 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-bold mb-1">
              <span>Współrzędne (Live JSON):</span>
            </div>
            <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto p-1 bg-black/40 rounded-lg">
              {JSON.stringify({
                rarity: { x: settings.rarity.x, y: settings.rarity.y, scale: settings.rarity.scale },
                player: { x: settings.player.x, y: settings.player.y, scale: settings.player.scale },
                card: { x: settings.card.x, y: settings.card.y, scale: settings.card.scale }
              }, null, 2)}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
