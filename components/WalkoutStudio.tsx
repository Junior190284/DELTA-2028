"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Pause,
  RotateCcw, 
  Flame, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Move, 
  Layers, 
  Type, 
  Video, 
  Upload, 
  Save, 
  Sparkles,
  Eye,
  EyeOff,
  Repeat,
  AlertCircle,
  FileVideo,
  Clock,
  Sliders,
  Zap,
  Film,
  User,
  Shield,
  Award
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlayerPhoto from "./PlayerPhoto";

function isVideoSource(src: string): boolean {
  if (!src) return false;
  const s = src.toLowerCase();
  return (
    s.startsWith("blob:") ||
    s.startsWith("data:video") ||
    s.endsWith(".mp4") ||
    s.endsWith(".webm") ||
    s.endsWith(".mov") ||
    s.endsWith(".m4v") ||
    s.endsWith(".mkv") ||
    s.includes("walkouts") ||
    s.includes("match-media") ||
    s.includes("supabase.co/storage") ||
    s.includes("video")
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00.0";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
}

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path?: string | null;
}

export interface LayerTiming {
  enabled: boolean;
  startTime: number;
  endTime: number;
  stayUntilEnd: boolean;
}

export interface WalkoutTimelineConfig {
  rarity: LayerTiming;
  player: LayerTiming;
  card: LayerTiming;
  hero: LayerTiming;
  flash: {
    enabled: boolean;
    time: number;
  };
}

export interface WalkoutSettings {
  videoSrc: string;
  timeline: WalkoutTimelineConfig;
  rarity: {
    text: string;
    subtext: string;
    x: number;
    y: number;
    scale: number;
  };
  player: {
    x: number;
    y: number;
    scale: number;
    customCutoutUrl?: string;
  };
  card: {
    x: number;
    y: number;
    scale: number;
    customCardUrl?: string;
  };
  metadata: {
    playerName: string;
    playerRating: number;
    playerPosition: string;
    playerClub: string;
  };
}

const DEFAULT_SETTINGS: WalkoutSettings = {
  videoSrc: "/media/walkouts/inferno-bg.mp4",
  timeline: {
    rarity: {
      enabled: true,
      startTime: 2.5,
      endTime: 5.5,
      stayUntilEnd: false
    },
    player: {
      enabled: true,
      startTime: 5.0,
      endTime: 8.0,
      stayUntilEnd: false
    },
    card: {
      enabled: true,
      startTime: 7.5,
      endTime: 15.0,
      stayUntilEnd: true
    },
    hero: {
      enabled: true,
      startTime: 9.0,
      endTime: 15.0,
      stayUntilEnd: true
    },
    flash: {
      enabled: true,
      time: 7.5
    }
  },
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
  }
};

const VIDEO_PRESETS = [
  { id: "inferno", name: "🔥 Piekielny Tunel (Inferno)", desc: "Karty Inferno & Płomienie", src: "/media/walkouts/inferno-bg.mp4" },
  { id: "video_1", name: "⚡ Walkout 1 (Błysk & Tunel)", desc: "Przelot wstępny / Teaser", src: "/media/walkouts/gemini_generated_video_0cb968a2.mp4" },
  { id: "video_2", name: "🌟 Walkout 2 (Złota Arena)", desc: "Karty Złote & Rzadkie", src: "/media/walkouts/gemini_generated_video_15f3538b.mp4" },
  { id: "video_3", name: "💥 Walkout 3 (Płomienie & Show)", desc: "Hat-Trick Hero & Goal Hunter", src: "/media/walkouts/gemini_generated_video_37e13dfb.mp4" },
  { id: "video_4", name: "🎆 Walkout 4 (Epicki Portal)", desc: "Karty Epickie (Epic Tier)", src: "/media/walkouts/gemini_generated_video_ca0c0f50.mp4" },
  { id: "video_5", name: "🏟️ Walkout 5 (Stadion Delta)", desc: "Karty Matchday Booster", src: "/media/walkouts/gemini_generated_video_dd3ce74b.mp4" },
  { id: "video_6", name: "💎 Walkout 6 (Diamentowa Aura)", desc: "Karty MVP & Special Event", src: "/media/walkouts/gemini_generated_video_f3975be6.mp4" },
  { id: "video_7", name: "👑 Walkout 7 (Legendarna Korona)", desc: "Karty Legend & Ikony", src: "/media/walkouts/gemini_generated_video_f8c08d08.mp4" },
  { id: "stadium", name: "🏟️ Nocny Stadion DELTA (Obraz)", desc: "Tło statyczne HD", src: "/assets/stadium.png" },
];

export default function WalkoutStudio(props: {
  players?: Player[];
  onSaveSettings?: (settings: WalkoutSettings) => void;
}) {
  const players = props.players || [];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || "");
  
  // Sidebar Sub-tab
  const [sidebarTab, setSidebarTab] = useState<"timeline" | "position" | "video" | "player">("timeline");

  const [settings, setSettings] = useState<WalkoutSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("delta_walkout_studio_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.videoSrc && parsed.videoSrc.startsWith("blob:")) {
            parsed.videoSrc = DEFAULT_SETTINGS.videoSrc;
          }
          const baseTimeline = DEFAULT_SETTINGS.timeline;
          let loadedTimeline = parsed.timeline || {};
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            timeline: {
              rarity: { ...baseTimeline.rarity, ...(loadedTimeline.rarity || {}) },
              player: { ...baseTimeline.player, ...(loadedTimeline.player || {}) },
              card: { ...baseTimeline.card, ...(loadedTimeline.card || {}) },
              hero: { ...baseTimeline.hero, ...(loadedTimeline.hero || {}) },
              flash: { ...baseTimeline.flash, ...(loadedTimeline.flash || {}) },
            }
          };
        }
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

  const [activeLayer, setActiveLayer] = useState<"rarity" | "player" | "card">("card");
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Video State
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(12.0);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [hideOverlays, setHideOverlays] = useState<boolean>(false);
  const [videoErrorMsg, setVideoErrorMsg] = useState<string | null>(null);
  const [customVideoFileName, setCustomVideoFileName] = useState<string>("");

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

  const activePlayTime = videoCurrentTime;
  const tl = settings.timeline;
  
  const isRarityVisible = !hideOverlays && tl.rarity.enabled && (
    activePlayTime >= tl.rarity.startTime && (tl.rarity.stayUntilEnd || activePlayTime <= tl.rarity.endTime)
  );

  const isPlayerVisible = !hideOverlays && tl.player.enabled && (
    activePlayTime >= tl.player.startTime && (tl.player.stayUntilEnd || activePlayTime <= tl.player.endTime)
  );

  const isCardVisible = !hideOverlays && tl.card.enabled && (
    activePlayTime >= tl.card.startTime && (tl.card.stayUntilEnd || activePlayTime <= tl.card.endTime)
  );

  const isHeroVisible = !hideOverlays && tl.hero.enabled && (
    activePlayTime >= tl.hero.startTime && (tl.hero.stayUntilEnd || activePlayTime <= tl.hero.endTime)
  );

  // Flash trigger
  const lastFlashTimeRef = useRef<number>(-1);
  useEffect(() => {
    if (tl.flash.enabled && isVideoPlaying) {
      const diff = Math.abs(videoCurrentTime - tl.flash.time);
      if (diff < 0.25 && Math.abs(lastFlashTimeRef.current - tl.flash.time) > 1.0) {
        lastFlashTimeRef.current = tl.flash.time;
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 350);
      }
    }
  }, [videoCurrentTime, tl.flash, isVideoPlaying]);

  // Full Walkout Sequence Playback from 0.0s
  const startFullWalkout = () => {
    clearTimers();
    setIsPlayingAuto(true);
    setIsFlash(false);
    lastFlashTimeRef.current = -1;
    startTimeRef.current = Date.now();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setVideoCurrentTime(0);
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }

    if (tl.flash.enabled && tl.flash.time > 0) {
      timerRef.current.push(
        setTimeout(() => {
          setIsFlash(true);
          setTimeout(() => setIsFlash(false), 350);
        }, tl.flash.time * 1000)
      );
    }
  };

  const jumpToSecond = (sec: number) => {
    clearTimers();
    setIsPlayingAuto(false);
    setIsFlash(false);
    setVideoCurrentTime(sec);

    if (videoRef.current) {
      const dur = videoRef.current.duration || 15;
      const targetTime = sec % dur;
      videoRef.current.currentTime = targetTime;
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsVideoPlaying(true);
        setVideoErrorMsg(null);
      }).catch((err) => {
        console.warn("Autoplay block / playback error:", err);
        setVideoErrorMsg("Kliknij ponownie, aby odtworzyć wideo z dźwiękiem.");
      });
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setVideoCurrentTime(0);
    videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setVideoCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  const applyTimelinePreset = (type: "skip_player" | "full" | "instant_card") => {
    setSettings(prev => {
      let nextTl = { ...prev.timeline };
      if (type === "skip_player") {
        nextTl.rarity = { enabled: true, startTime: 2.0, endTime: 4.5, stayUntilEnd: false };
        nextTl.player = { enabled: false, startTime: 0, endTime: 0, stayUntilEnd: false };
        nextTl.card = { enabled: true, startTime: 4.5, endTime: 15.0, stayUntilEnd: true };
        nextTl.hero = { enabled: true, startTime: 6.5, endTime: 15.0, stayUntilEnd: true };
        nextTl.flash = { enabled: true, time: 4.5 };
      } else if (type === "full") {
        nextTl.rarity = { enabled: true, startTime: 2.5, endTime: 5.5, stayUntilEnd: false };
        nextTl.player = { enabled: true, startTime: 5.0, endTime: 8.0, stayUntilEnd: false };
        nextTl.card = { enabled: true, startTime: 7.5, endTime: 15.0, stayUntilEnd: true };
        nextTl.hero = { enabled: true, startTime: 9.0, endTime: 15.0, stayUntilEnd: true };
        nextTl.flash = { enabled: true, time: 7.5 };
      } else if (type === "instant_card") {
        nextTl.rarity = { enabled: false, startTime: 0, endTime: 0, stayUntilEnd: false };
        nextTl.player = { enabled: false, startTime: 0, endTime: 0, stayUntilEnd: false };
        nextTl.card = { enabled: true, startTime: 1.5, endTime: 15.0, stayUntilEnd: true };
        nextTl.hero = { enabled: true, startTime: 3.5, endTime: 15.0, stayUntilEnd: true };
        nextTl.flash = { enabled: true, time: 1.5 };
      }
      return { ...prev, timeline: nextTl };
    });
  };

  const updateLayerTiming = (layerKey: keyof Omit<WalkoutTimelineConfig, "flash">, field: keyof LayerTiming, val: any) => {
    setSettings(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        [layerKey]: {
          ...prev.timeline[layerKey],
          [field]: val
        }
      }
    }));
  };

  const setTimeToCurrent = (layerKey: keyof Omit<WalkoutTimelineConfig, "flash">, field: "startTime" | "endTime") => {
    const rounded = Math.round(videoCurrentTime * 10) / 10;
    updateLayerTiming(layerKey, field, rounded);
  };

  // Drag and Drop
  const handlePointerDown = (e: React.PointerEvent) => {
    if (hideOverlays) return;
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
    if (!isDragging || hideOverlays) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const stepX = Math.round(dx / 4);
    const stepY = Math.round(dy / 4);

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
      timeline: settings.timeline,
      rarity: { x: settings.rarity.x, y: settings.rarity.y, scale: settings.rarity.scale },
      player: { x: settings.player.x, y: settings.player.y, scale: settings.player.scale },
      card: { x: settings.card.x, y: settings.card.y, scale: settings.card.scale }
    };
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDefaults = () => {
    if (confirm("Zresetować czasy osi czasu i ułożenie do wartości domyślnych?")) {
      setSettings(DEFAULT_SETTINGS);
      setCustomVideoFileName("");
      localStorage.removeItem("delta_walkout_studio_settings");
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoErrorMsg(null);
    setCustomVideoFileName(file.name);

    const localUrl = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, videoSrc: localUrl }));

    if (videoRef.current) {
      videoRef.current.src = localUrl;
      videoRef.current.load();
      videoRef.current.play().then(() => {
        setIsVideoPlaying(true);
      }).catch((err) => {
        console.warn("Autoplay blocked or format error:", err);
      });
    }

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `walkouts/user-video-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("match-media").upload(path, file, {
        cacheControl: "3600",
        upsert: true
      });
      if (!uploadErr) {
        const { data: publicData } = supabase.storage.from("match-media").getPublicUrl(path);
        if (publicData?.publicUrl) {
          setSettings(prev => ({ ...prev, videoSrc: publicData.publicUrl }));
        }
      }
    } catch (err) {
      console.warn("Storage upload fallback to local:", err);
    }
  };

  const handleCutoutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, player: { ...prev.player, customCutoutUrl: url } }));
  };

  const handleCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, card: { ...prev.card, customCardUrl: url } }));
  };

  return (
    <div className="ws-root">
      {/* GÓRNY PASEK NARZĘDZI */}
      <div className="ws-topbar">
        <div className="ws-brand-group">
          <div className="ws-icon-badge">
            <Flame size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="ws-title">Studio Walkoutów & Animacji DELTA</h2>
              <span className="ws-pro-tag">HD STUDIO</span>
            </div>
            <p className="ws-subtitle">
              Konfiguruj filmy tła, pozycje 3D oraz precyzyjne czasy wejścia i wyjścia elementów w animacji.
            </p>
          </div>
        </div>

        <div className="ws-actions-group">
          <button 
            type="button" 
            onClick={() => setHideOverlays(!hideOverlays)} 
            className={`ws-btn-ghost ${hideOverlays ? "ws-btn-active-toggle" : ""}`}
            title="Ukryj/Pokaż nakładki"
          >
            {hideOverlays ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} />}
            <span>{hideOverlays ? "Tylko wideo (Czysty film)" : "Wszystkie warstwy"}</span>
          </button>
          <button type="button" onClick={handleResetDefaults} className="ws-btn-ghost">
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={handleCopyJSON} className="ws-btn-ghost">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Skopiowano!" : "Kopiuj JSON"}</span>
          </button>
          <button type="button" onClick={handleSave} className="ws-btn-primary">
            <Save size={15} />
            <span>{savedFeedback ? "✓ Zapisano!" : "Zapisz ułożenie & czasy"}</span>
          </button>
        </div>
      </div>

      {/* GŁÓWNA SIATKA */}
      <div className="ws-grid">
        
        {/* LEWA KOLUMNA: SCENA KINOWA & ODTWARZACZ */}
        <div className="ws-viewport-col">
          
          <div 
            className="ws-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* WIDEO TŁA */}
            {isVideoSource(settings.videoSrc) ? (
              <video
                ref={videoRef}
                key={settings.videoSrc}
                src={settings.videoSrc}
                autoPlay
                loop={isLooping}
                muted={isMuted}
                playsInline
                className="ws-video"
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  setVideoDuration(el.duration || 12.0);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  setVideoCurrentTime(el.currentTime || 0);
                }}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onError={() => {
                  setVideoErrorMsg("Nie udało się odtworzyć tego pliku wideo. Upewnij się, że format to MP4 (H.264) lub WebM.");
                }}
              />
            ) : (
              <div 
                className="ws-video-img"
                style={{ backgroundImage: `url(${settings.videoSrc})` }}
              />
            )}

            {/* WINIETA I ŚWIATŁO */}
            <div className="ws-vignette" />

            {/* FLASH EFFECT */}
            {isFlash && <div className="ws-flash" />}

            {/* 1. WARSTWA NAPISÓW (RARITY) */}
            {isRarityVisible && (
              <div 
                className={`ws-rarity-layer ${activeLayer === "rarity" ? "is-active" : ""}`}
                style={{
                  transform: `translate(calc(-50% + ${settings.rarity.x}%), calc(-50% + ${settings.rarity.y}%)) scale(${settings.rarity.scale})`
                }}
              >
                <div className="ws-rarity-title">
                  {settings.rarity.text}
                </div>
                <div className="ws-rarity-sub">
                  {settings.rarity.subtext}
                </div>
              </div>
            )}

            {/* 2. WARSTWA ZAWODNIKA (CUTOUT PNG) */}
            {isPlayerVisible && (
              <div 
                className={`ws-player-layer ${activeLayer === "player" ? "is-active" : ""}`}
                style={{
                  transform: `translate(calc(-50% + ${settings.player.x}%), calc(-50% + ${settings.player.y}%)) scale(${settings.player.scale})`
                }}
              >
                {settings.player.customCutoutUrl ? (
                  <img 
                    src={settings.player.customCutoutUrl} 
                    alt="Sylwetka zawodnika"
                    className="ws-player-img"
                  />
                ) : activePlayer ? (
                  <div className="ws-player-photo-box">
                    <PlayerPhoto playerId={activePlayer.id} className="ws-player-photo" />
                  </div>
                ) : (
                  <img 
                    src="/demo/player-cutout.png" 
                    alt="Zawodnik"
                    className="ws-player-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            )}

            {/* 3. WARSTWA KARTY 3D */}
            {isCardVisible && (
              <div 
                className={`ws-card-layer ${activeLayer === "card" ? "is-active" : ""}`}
                style={{
                  transform: `translate(calc(-50% + ${settings.card.x}%), calc(-50% + ${settings.card.y}px)) scale(${settings.card.scale})`
                }}
              >
                {settings.card.customCardUrl ? (
                  <img 
                    src={settings.card.customCardUrl} 
                    alt="Karta"
                    className="ws-card-img"
                  />
                ) : (
                  <div className="ws-card-box">
                    <img 
                      src="/demo/inferno-card.png" 
                      alt="Inferno Card"
                      className="ws-card-inner-img"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. DOLNE SZCZEGÓŁY HERO */}
            {isHeroVisible && (
              <div className="ws-hero-layer">
                <div className="ws-hero-badge">
                  <Flame size={13} /> <span>{settings.rarity.text} WALKOUT</span>
                </div>
                <h1 className="ws-hero-name">
                  {settings.metadata.playerName}
                </h1>
                <div className="ws-hero-meta">
                  <span className="ws-rating">{settings.metadata.playerRating} OVR</span>
                  <span className="ws-sep">•</span>
                  <span>{settings.metadata.playerPosition}</span>
                  <span className="ws-sep">•</span>
                  <span className="ws-club">{settings.metadata.playerClub}</span>
                </div>
              </div>
            )}

            {/* WSKAŹNIKI AKTYWNEJ WARSTWY */}
            {!hideOverlays && (
              <div className="ws-drag-indicator">
                <Move size={14} />
                <span>Aktywna warstwa (przeciągaj myszką): <b>{activeLayer === "card" ? "Karta 3D" : activeLayer === "player" ? "Zawodnik" : "Napisy"}</b></span>
              </div>
            )}

            {/* WSKAŹNIK CZASU */}
            <div className="ws-time-indicator">
              ⏱ {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
            </div>

            {/* KOMUNIKAT BŁĘDU WIDEO */}
            {videoErrorMsg && (
              <div className="ws-video-error-badge">
                <AlertCircle size={15} />
                <span>{videoErrorMsg}</span>
              </div>
            )}
          </div>

          {/* INTERAKTYWNA WIZUALNA OŚ CZASU (MULTI-TRACK TIMELINE) */}
          <div className="ws-multi-timeline-card">
            <div className="ws-timeline-header">
              <span className="ws-timeline-title flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" /> Wizualna Oś Czasu (Pojawianie się i znikanie warstw)
              </span>
              <span className="ws-current-sec-tag">{videoCurrentTime.toFixed(1)}s</span>
            </div>

            <div className="ws-tracks-container">
              {/* Ścieżka 1: Napisy */}
              <div className="ws-track-row" onClick={() => jumpToSecond(tl.rarity.startTime)}>
                <span className="ws-track-label text-red-400">🔤 Napisy</span>
                <div className="ws-track-lane">
                  {tl.rarity.enabled ? (
                    <div 
                      className="ws-track-block bg-red-600"
                      style={{
                        left: `${Math.min(100, (tl.rarity.startTime / (videoDuration || 15)) * 100)}%`,
                        width: `${Math.max(4, Math.min(100, ((tl.rarity.stayUntilEnd ? (videoDuration || 15) : tl.rarity.endTime) - tl.rarity.startTime) / (videoDuration || 15) * 100))}%`
                      }}
                    >
                      {tl.rarity.startTime.toFixed(1)}s - {tl.rarity.stayUntilEnd ? "Koniec" : `${tl.rarity.endTime.toFixed(1)}s`}
                    </div>
                  ) : (
                    <div className="ws-track-disabled">Wyłączone / Usunięte</div>
                  )}
                </div>
              </div>

              {/* Ścieżka 2: Gracz */}
              <div className="ws-track-row" onClick={() => tl.player.enabled && jumpToSecond(tl.player.startTime)}>
                <span className="ws-track-label text-sky-400">👤 Gracz</span>
                <div className="ws-track-lane">
                  {tl.player.enabled ? (
                    <div 
                      className="ws-track-block bg-sky-600"
                      style={{
                        left: `${Math.min(100, (tl.player.startTime / (videoDuration || 15)) * 100)}%`,
                        width: `${Math.max(4, Math.min(100, ((tl.player.stayUntilEnd ? (videoDuration || 15) : tl.player.endTime) - tl.player.startTime) / (videoDuration || 15) * 100))}%`
                      }}
                    >
                      {tl.player.startTime.toFixed(1)}s - {tl.player.stayUntilEnd ? "Koniec" : `${tl.player.endTime.toFixed(1)}s`}
                    </div>
                  ) : (
                    <div className="ws-track-disabled text-amber-400 font-bold">⚡ Wyłączone (Od razu karta po napisie!)</div>
                  )}
                </div>
              </div>

              {/* Ścieżka 3: Karta 3D */}
              <div className="ws-track-row" onClick={() => jumpToSecond(tl.card.startTime)}>
                <span className="ws-track-label text-amber-400">🃏 Karta 3D</span>
                <div className="ws-track-lane">
                  {tl.card.enabled ? (
                    <div 
                      className="ws-track-block bg-amber-600"
                      style={{
                        left: `${Math.min(100, (tl.card.startTime / (videoDuration || 15)) * 100)}%`,
                        width: `${Math.max(4, Math.min(100, ((tl.card.stayUntilEnd ? (videoDuration || 15) : tl.card.endTime) - tl.card.startTime) / (videoDuration || 15) * 100))}%`
                      }}
                    >
                      {tl.card.startTime.toFixed(1)}s - {tl.card.stayUntilEnd ? "Koniec" : `${tl.card.endTime.toFixed(1)}s`}
                    </div>
                  ) : (
                    <div className="ws-track-disabled">Wyłączone / Usunięte</div>
                  )}
                </div>
              </div>

              {/* Ścieżka 4: Hero */}
              <div className="ws-track-row" onClick={() => jumpToSecond(tl.hero.startTime)}>
                <span className="ws-track-label text-emerald-400">🏆 Hero</span>
                <div className="ws-track-lane">
                  {tl.hero.enabled ? (
                    <div 
                      className="ws-track-block bg-emerald-600"
                      style={{
                        left: `${Math.min(100, (tl.hero.startTime / (videoDuration || 15)) * 100)}%`,
                        width: `${Math.max(4, Math.min(100, ((tl.hero.stayUntilEnd ? (videoDuration || 15) : tl.hero.endTime) - tl.hero.startTime) / (videoDuration || 15) * 100))}%`
                      }}
                    >
                      {tl.hero.startTime.toFixed(1)}s - {tl.hero.stayUntilEnd ? "Koniec" : `${tl.hero.endTime.toFixed(1)}s`}
                    </div>
                  ) : (
                    <div className="ws-track-disabled">Wyłączone / Usunięte</div>
                  )}
                </div>
              </div>

              {/* Linia głowicy odtwarzania */}
              <div 
                className="ws-playhead-line"
                style={{
                  left: `${Math.min(100, (videoCurrentTime / (videoDuration || 15)) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* DEDYKOWANY ODTWARZACZ WIDEO ZE SCRUBBEREM */}
          <div className="ws-video-controls-bar">
            {/* GÓRNY WIERSZ: SUWAK CZASU */}
            <div className="ws-scrubber-row">
              <span className="ws-scrubber-time">{formatTime(videoCurrentTime)}</span>
              <input
                type="range"
                min={0}
                max={videoDuration || 15}
                step={0.05}
                value={videoCurrentTime}
                onChange={handleSeek}
                className="ws-scrubber-slider"
              />
              <span className="ws-scrubber-time">{formatTime(videoDuration)}</span>
            </div>

            {/* DOLNY WIERSZ: PRZYCISKI KONTROLNE */}
            <div className="ws-controls-main-row">
              <div className="ws-controls-group">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={`ws-btn-main-play ${isVideoPlaying ? "is-playing" : ""}`}
                >
                  {isVideoPlaying ? <Pause size={17} /> : <Play size={17} />}
                  <span>{isVideoPlaying ? "Wstrzymaj" : "Odtwórz"}</span>
                </button>

                <button
                  type="button"
                  onClick={restartVideo}
                  className="ws-btn-icon-sub"
                  title="Odtwórz od początku (0:00)"
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  type="button"
                  onClick={startFullWalkout}
                  className="ws-btn-walkout-seq"
                  title="Uruchom pełną animację od 0.0s ze wszystkimi przejściami"
                >
                  <Sparkles size={15} />
                  <span>
                    {!tl.player.enabled 
                      ? "⚡ Walkout (Karta po napisie)" 
                      : "Walkout od początku (0s)"}
                  </span>
                </button>
              </div>

              {/* SKOKI DO MOMENTÓW */}
              <div className="ws-stages-row">
                <span className="ws-stages-label">Skocz:</span>
                {tl.rarity.enabled && (
                  <button
                    type="button"
                    onClick={() => jumpToSecond(tl.rarity.startTime)}
                    className="ws-stage-btn red"
                  >
                    Napis ({tl.rarity.startTime}s)
                  </button>
                )}
                {tl.player.enabled && (
                  <button
                    type="button"
                    onClick={() => jumpToSecond(tl.player.startTime)}
                    className="ws-stage-btn sky"
                  >
                    Gracz ({tl.player.startTime}s)
                  </button>
                )}
                {tl.card.enabled && (
                  <button
                    type="button"
                    onClick={() => jumpToSecond(tl.card.startTime)}
                    className="ws-stage-btn gold"
                  >
                    Karta ({tl.card.startTime}s)
                  </button>
                )}
                {tl.hero.enabled && (
                  <button
                    type="button"
                    onClick={() => jumpToSecond(tl.hero.startTime)}
                    className="ws-stage-btn yellow"
                  >
                    Hero ({tl.hero.startTime}s)
                  </button>
                )}
              </div>

              {/* DŹWIĘK I PRĘDKOŚĆ */}
              <div className="ws-controls-group">
                <div className="ws-speed-select-box">
                  {[0.5, 1.0, 1.5, 2.0].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSpeedChange(s)}
                      className={`ws-speed-chip ${playbackSpeed === s ? "active" : ""}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`ws-btn-icon-sub ${isLooping ? "active-gold" : ""}`}
                  title={isLooping ? "Pętla włączona" : "Pętla wyłączona"}
                >
                  <Repeat size={15} />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="ws-btn-icon-sub"
                  title={isMuted ? "Włącz dźwięk" : "Wycisz"}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="ws-volume-slider"
                  title="Głośność wideo"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PRAWA KOLUMNA: BOCZNE MENU ZAKŁADEK */}
        <div className="ws-sidebar">

          {/* NAWIGACJA ZAKŁADEK PANELU BOCZNEGO */}
          <div className="ws-sidebar-nav">
            <button
              type="button"
              onClick={() => setSidebarTab("timeline")}
              className={`ws-sidebar-nav-btn ${sidebarTab === "timeline" ? "active-purple" : ""}`}
            >
              <Clock size={15} />
              <span>Oś Czasu</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab("position")}
              className={`ws-sidebar-nav-btn ${sidebarTab === "position" ? "active-amber" : ""}`}
            >
              <Sliders size={15} />
              <span>Pozycje & Skala</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab("video")}
              className={`ws-sidebar-nav-btn ${sidebarTab === "video" ? "active-blue" : ""}`}
            >
              <Film size={15} />
              <span>Filmy Wideo ({VIDEO_PRESETS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab("player")}
              className={`ws-sidebar-nav-btn ${sidebarTab === "player" ? "active-emerald" : ""}`}
            >
              <User size={15} />
              <span>Zawodnik</span>
            </button>
          </div>

          {/* ZAKŁADKA 1: OŚ CZASU & WŁĄCZANIE / WYŁĄCZANIE WARSTW */}
          {sidebarTab === "timeline" && (
            <div className="ws-panel-box ws-box-sequence">
              <div className="ws-panel-head">
                <span className="ws-box-heading purple">
                  <Zap size={16} /> Momenty Wejścia & Wyjścia Warstw
                </span>
              </div>

              {/* SZYBKIE PRESETY */}
              <div className="ws-preset-chips-row">
                <button
                  type="button"
                  onClick={() => applyTimelinePreset("skip_player")}
                  className={`ws-preset-chip ${!tl.player.enabled && tl.rarity.enabled && tl.card.enabled ? "active" : ""}`}
                  title="Karta pojawia się od razu po zniknięciu napisu"
                >
                  ⚡ Karta od razu po napisie
                </button>
                <button
                  type="button"
                  onClick={() => applyTimelinePreset("full")}
                  className={`ws-preset-chip ${tl.player.enabled && tl.rarity.enabled && tl.card.enabled ? "active" : ""}`}
                  title="Pełny kinowy pokaz"
                >
                  👑 Pełny Walkout
                </button>
                <button
                  type="button"
                  onClick={() => applyTimelinePreset("instant_card")}
                  className={`ws-preset-chip ${!tl.rarity.enabled && !tl.player.enabled && tl.card.enabled ? "active" : ""}`}
                  title="Błyskawiczna karta"
                >
                  🚀 Błyskawiczny
                </button>
              </div>

              {/* KARTY CZASOWE */}
              <div className="ws-layer-timing-cards">

                {/* 1. NAPISY RZADKOŚCI */}
                <div className={`ws-timing-card ${tl.rarity.enabled ? "is-on" : "is-off"}`}>
                  <div className="ws-timing-card-head">
                    <label className="ws-timing-toggle">
                      <input
                        type="checkbox"
                        checked={tl.rarity.enabled}
                        onChange={e => updateLayerTiming("rarity", "enabled", e.target.checked)}
                        className="ws-checkbox-custom"
                      />
                      <span className="ws-timing-name text-red-400">1. Napisy Rzadkości (INFERNO)</span>
                    </label>
                    <span className="ws-timing-badge">{tl.rarity.enabled ? "Aktywny" : "USUNIĘTY"}</span>
                  </div>

                  {tl.rarity.enabled && (
                    <div className="ws-timing-controls-grid">
                      <div className="ws-time-input-group">
                        <label>Pojawia się w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            value={tl.rarity.startTime}
                            onChange={e => updateLayerTiming("rarity", "startTime", parseFloat(e.target.value) || 0)}
                            className="ws-input-time"
                          />
                          <span className="text-xs text-slate-400">s</span>
                          <button
                            type="button"
                            onClick={() => setTimeToCurrent("rarity", "startTime")}
                            className="ws-btn-time-now"
                            title="Ustaw aktualny moment filmu"
                          >
                            Bieżący ({videoCurrentTime.toFixed(1)}s)
                          </button>
                        </div>
                      </div>

                      <div className="ws-time-input-group">
                        <label>Znika w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            disabled={tl.rarity.stayUntilEnd}
                            value={tl.rarity.stayUntilEnd ? "" : tl.rarity.endTime}
                            placeholder={tl.rarity.stayUntilEnd ? "Do końca" : "5.5"}
                            onChange={e => updateLayerTiming("rarity", "endTime", parseFloat(e.target.value) || 0)}
                            className="ws-input-time"
                          />
                          <span className="text-xs text-slate-400">s</span>
                          <button
                            type="button"
                            onClick={() => setTimeToCurrent("rarity", "endTime")}
                            className="ws-btn-time-now"
                            title="Ustaw aktualny moment filmu"
                          >
                            Bieżący ({videoCurrentTime.toFixed(1)}s)
                          </button>
                        </div>
                        <label className="ws-sub-check">
                          <input
                            type="checkbox"
                            checked={tl.rarity.stayUntilEnd}
                            onChange={e => updateLayerTiming("rarity", "stayUntilEnd", e.target.checked)}
                          />
                          <span>Widoczny do samego końca filmu</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SYLWETKA ZAWODNIKA */}
                <div className={`ws-timing-card ${tl.player.enabled ? "is-on" : "is-off border-amber-500/40"}`}>
                  <div className="ws-timing-card-head">
                    <label className="ws-timing-toggle">
                      <input
                        type="checkbox"
                        checked={tl.player.enabled}
                        onChange={e => updateLayerTiming("player", "enabled", e.target.checked)}
                        className="ws-checkbox-custom"
                      />
                      <span className="ws-timing-name text-sky-400">2. Sylwetka Zawodnika</span>
                    </label>
                    <span className={`ws-timing-badge ${tl.player.enabled ? "" : "text-amber-400 bg-amber-500/20"}`}>
                      {tl.player.enabled ? "Aktywny" : "USUNIĘTY (Karta od razu po napisie)"}
                    </span>
                  </div>

                  {tl.player.enabled ? (
                    <div className="ws-timing-controls-grid">
                      <div className="ws-time-input-group">
                        <label>Pojawia się w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            value={tl.player.startTime}
                            onChange={e => updateLayerTiming("player", "startTime", parseFloat(e.target.value) || 0)}
                            className="ws-input-time"
                          />
                          <span className="text-xs text-slate-400">s</span>
                          <button
                            type="button"
                            onClick={() => setTimeToCurrent("player", "startTime")}
                            className="ws-btn-time-now"
                            title="Ustaw aktualny moment filmu"
                          >
                            Bieżący ({videoCurrentTime.toFixed(1)}s)
                          </button>
                        </div>
                      </div>

                      <div className="ws-time-input-group">
                        <label>Znika w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            disabled={tl.player.stayUntilEnd}
                            value={tl.player.stayUntilEnd ? "" : tl.player.endTime}
                            placeholder={tl.player.stayUntilEnd ? "Do końca" : "8.0"}
                            onChange={e => updateLayerTiming("player", "endTime", parseFloat(e.target.value) || 0)}
                            className="ws-input-time"
                          />
                          <span className="text-xs text-slate-400">s</span>
                          <button
                            type="button"
                            onClick={() => setTimeToCurrent("player", "endTime")}
                            className="ws-btn-time-now"
                            title="Ustaw aktualny moment filmu"
                          >
                            Bieżący ({videoCurrentTime.toFixed(1)}s)
                          </button>
                        </div>
                        <label className="ws-sub-check">
                          <input
                            type="checkbox"
                            checked={tl.player.stayUntilEnd}
                            onChange={e => updateLayerTiming("player", "stayUntilEnd", e.target.checked)}
                          />
                          <span>Widoczny do samego końca filmu</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="ws-timing-disabled-hint">
                      Odznaczone – zawodnik został wyłączony. Karta pojawi się bezpośrednio w wyznaczonym poniżej czasie!
                    </div>
                  )}
                </div>

                {/* 3. KARTA 3D */}
                <div className={`ws-timing-card ${tl.card.enabled ? "is-on" : "is-off"}`}>
                  <div className="ws-timing-card-head">
                    <label className="ws-timing-toggle">
                      <input
                        type="checkbox"
                        checked={tl.card.enabled}
                        onChange={e => updateLayerTiming("card", "enabled", e.target.checked)}
                        className="ws-checkbox-custom"
                      />
                      <span className="ws-timing-name text-amber-400">3. Karta 3D (Drop & Flash)</span>
                    </label>
                    <span className="ws-timing-badge">{tl.card.enabled ? "Aktywny" : "USUNIĘTY"}</span>
                  </div>

                  {tl.card.enabled && (
                    <div className="ws-timing-controls-grid">
                      <div className="ws-time-input-group">
                        <label>Pojawia się w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            value={tl.card.startTime}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              updateLayerTiming("card", "startTime", val);
                              setSettings(prev => ({ ...prev, timeline: { ...prev.timeline, flash: { ...prev.timeline.flash, time: val } } }));
                            }}
                            className="ws-input-time font-bold text-amber-400"
                          />
                          <span className="text-xs text-slate-400">s</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTimeToCurrent("card", "startTime");
                              setSettings(prev => ({ ...prev, timeline: { ...prev.timeline, flash: { ...prev.timeline.flash, time: Math.round(videoCurrentTime * 10) / 10 } } }));
                            }}
                            className="ws-btn-time-now"
                            title="Ustaw aktualny moment filmu"
                          >
                            Bieżący ({videoCurrentTime.toFixed(1)}s)
                          </button>
                        </div>
                      </div>

                      <div className="ws-time-input-group">
                        <label>Znika w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            disabled={tl.card.stayUntilEnd}
                            value={tl.card.stayUntilEnd ? "" : tl.card.endTime}
                            placeholder={tl.card.stayUntilEnd ? "Do końca filmu" : "15.0"}
                            onChange={e => updateLayerTiming("card", "endTime", parseFloat(e.target.value) || 0)}
                            className="ws-input-time"
                          />
                          <span className="text-xs text-slate-400">s</span>
                        </div>
                        <label className="ws-sub-check">
                          <input
                            type="checkbox"
                            checked={tl.card.stayUntilEnd}
                            onChange={e => updateLayerTiming("card", "stayUntilEnd", e.target.checked)}
                          />
                          <span>Widoczna do samego końca filmu (Zalecane)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. PASEK HERO */}
                <div className={`ws-timing-card ${tl.hero.enabled ? "is-on" : "is-off"}`}>
                  <div className="ws-timing-card-head">
                    <label className="ws-timing-toggle">
                      <input
                        type="checkbox"
                        checked={tl.hero.enabled}
                        onChange={e => updateLayerTiming("hero", "enabled", e.target.checked)}
                        className="ws-checkbox-custom"
                      />
                      <span className="ws-timing-name text-emerald-400">4. Pasek Hero (Rating & Klub)</span>
                    </label>
                    <span className="ws-timing-badge">{tl.hero.enabled ? "Aktywny" : "USUNIĘTY"}</span>
                  </div>

                  {tl.hero.enabled && (
                    <div className="ws-timing-controls-grid">
                      <div className="ws-time-input-group">
                        <label>Pojawia się w sek:</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={30}
                            value={tl.hero.startTime}
                            onChange={e => updateLayerTiming("hero", "startTime", parseFloat(e.target.value) || 0)}
                            className="ws-input-time"
                          />
                          <span className="text-xs text-slate-400">s</span>
                          <button
                            type="button"
                            onClick={() => setTimeToCurrent("hero", "startTime")}
                            className="ws-btn-time-now"
                            title="Ustaw aktualny moment filmu"
                          >
                            Bieżący ({videoCurrentTime.toFixed(1)}s)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ZAKŁADKA 2: POZYCJE & SKALA WARSTW */}
          {sidebarTab === "position" && (
            <div className="space-y-3">
              <div className="ws-panel-box">
                <span className="ws-panel-title">Wybierz warstwę do przesunięcia:</span>
                <div className="ws-layers-tabs">
                  <button
                    type="button"
                    onClick={() => setActiveLayer("card")}
                    className={`ws-layer-tab ${activeLayer === "card" ? "active-gold" : ""}`}
                  >
                    <Sparkles size={15} />
                    <span>Karta 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLayer("player")}
                    className={`ws-layer-tab ${activeLayer === "player" ? "active-sky" : ""}`}
                  >
                    <Layers size={15} />
                    <span>Zawodnik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLayer("rarity")}
                    className={`ws-layer-tab ${activeLayer === "rarity" ? "active-red" : ""}`}
                  >
                    <Type size={15} />
                    <span>Napisy</span>
                  </button>
                </div>
              </div>

              {/* PANEL KARTY */}
              {activeLayer === "card" && (
                <div className="ws-panel-box ws-box-card">
                  <div className="ws-panel-head">
                    <span className="ws-box-heading gold">
                      <Sparkles size={15} /> Pozycja Karty 3D
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, card: { ...prev.card, x: -2, y: -78, scale: 1.3 } }))}
                      className="ws-reset-mini"
                    >
                      Reset optymalny
                    </button>
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Poziom X (%)</span>
                      <span className="ws-val gold">{settings.card.x}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={settings.card.x}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, x: parseInt(e.target.value) } }))}
                      className="ws-slider range-gold"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Pion Y (px)</span>
                      <span className="ws-val gold">{settings.card.y} px</span>
                    </div>
                    <input
                      type="range"
                      min={-200}
                      max={100}
                      value={settings.card.y}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, y: parseInt(e.target.value) } }))}
                      className="ws-slider range-gold"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Skala Karty (Scale)</span>
                      <span className="ws-val gold">{settings.card.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={settings.card.scale}
                      onChange={e => setSettings(prev => ({ ...prev, card: { ...prev.card, scale: parseFloat(e.target.value) } }))}
                      className="ws-slider range-gold"
                    />
                  </div>

                  <div className="ws-upload-field">
                    <label className="ws-field-label">Wgraj grafikę karty (PNG):</label>
                    <input
                      type="file"
                      accept="image/png,image/webp"
                      onChange={handleCardUpload}
                      className="ws-file-input"
                    />
                  </div>
                </div>
              )}

              {/* PANEL ZAWODNIKA */}
              {activeLayer === "player" && (
                <div className="ws-panel-box ws-box-player">
                  <div className="ws-panel-head">
                    <span className="ws-box-heading sky">
                      <Layers size={15} /> Pozycja Sylwetki Gracza
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, player: { ...prev.player, x: -21, y: -24, scale: 1.05 } }))}
                      className="ws-reset-mini"
                    >
                      Reset optymalny
                    </button>
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Poziom X (%)</span>
                      <span className="ws-val sky">{settings.player.x}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={settings.player.x}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, x: parseInt(e.target.value) } }))}
                      className="ws-slider range-sky"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Pion Y (%)</span>
                      <span className="ws-val sky">{settings.player.y}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={settings.player.y}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, y: parseInt(e.target.value) } }))}
                      className="ws-slider range-sky"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Skala Zawodnika (Scale)</span>
                      <span className="ws-val sky">{settings.player.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={settings.player.scale}
                      onChange={e => setSettings(prev => ({ ...prev, player: { ...prev.player, scale: parseFloat(e.target.value) } }))}
                      className="ws-slider range-sky"
                    />
                  </div>

                  <div className="ws-upload-field">
                    <label className="ws-field-label">Wgraj wycięte zdjęcie PNG sylwetki:</label>
                    <input
                      type="file"
                      accept="image/png,image/webp"
                      onChange={handleCutoutUpload}
                      className="ws-file-input"
                    />
                  </div>
                </div>
              )}

              {/* PANEL NAPISÓW */}
              {activeLayer === "rarity" && (
                <div className="ws-panel-box ws-box-rarity">
                  <div className="ws-panel-head">
                    <span className="ws-box-heading red">
                      <Type size={15} /> Pozycja Napisów Rzadkości
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, x: 0, y: -1, scale: 1.75 } }))}
                      className="ws-reset-mini"
                    >
                      Reset optymalny
                    </button>
                  </div>

                  <div className="ws-control-group">
                    <label className="ws-field-label">Główny tekst:</label>
                    <input
                      type="text"
                      value={settings.rarity.text}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, text: e.target.value.toUpperCase() } }))}
                      className="ws-input-text font-black"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Poziom X (%)</span>
                      <span className="ws-val red">{settings.rarity.x}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={settings.rarity.x}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, x: parseInt(e.target.value) } }))}
                      className="ws-slider range-red"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Pion Y (%)</span>
                      <span className="ws-val red">{settings.rarity.y}%</span>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={settings.rarity.y}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, y: parseInt(e.target.value) } }))}
                      className="ws-slider range-red"
                    />
                  </div>

                  <div className="ws-control-group">
                    <div className="ws-label-row">
                      <span>Rozmiar czcionki (Scale)</span>
                      <span className="ws-val red">{settings.rarity.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.05}
                      value={settings.rarity.scale}
                      onChange={e => setSettings(prev => ({ ...prev, rarity: { ...prev.rarity, scale: parseFloat(e.target.value) } }))}
                      className="ws-slider range-red"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 3: FILMY WIDEO (LISTA 8 FILMÓW) */}
          {sidebarTab === "video" && (
            <div className="ws-panel-box ws-box-video">
              <div className="ws-panel-head">
                <span className="ws-box-heading video-color">
                  <Video size={16} /> Dostępne Filmy Walkoutów ({VIDEO_PRESETS.length})
                </span>
                <span className={`ws-status-pill ${isVideoPlaying ? "online" : "paused"}`}>
                  {isVideoPlaying ? "● Odtwarza" : "○ Wstrzymane"}
                </span>
              </div>

              {customVideoFileName && (
                <div className="ws-active-file-banner">
                  <FileVideo size={16} className="text-amber-400" />
                  <div className="ws-active-file-info">
                    <span className="ws-active-file-name">{customVideoFileName}</span>
                    <span className="ws-active-file-meta">{videoDuration.toFixed(1)}s • Plik Własny</span>
                  </div>
                </div>
              )}

              <div className="ws-video-cards-grid">
                {VIDEO_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({ ...prev, videoSrc: preset.src }));
                      setCustomVideoFileName("");
                      setVideoErrorMsg(null);
                      if (videoRef.current) {
                        videoRef.current.src = preset.src;
                        videoRef.current.load();
                        videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
                      }
                    }}
                    className={`ws-video-item-btn ${settings.videoSrc === preset.src ? "active" : ""}`}
                  >
                    <span className="ws-video-item-title">{preset.name}</span>
                    <span className="ws-video-item-desc">{preset.desc}</span>
                  </button>
                ))}
              </div>

              <div className="ws-upload-field">
                <label className="ws-field-label font-bold text-amber-400 flex items-center gap-1.5">
                  <Upload size={13} /> Wgraj kolejny film z dysku (MP4 / WebM / MOV):
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
                  onChange={handleVideoUpload}
                  className="ws-file-input"
                />
              </div>
            </div>
          )}

          {/* ZAKŁADKA 4: DANE ZAWODNIKA I KARTY */}
          {sidebarTab === "player" && (
            <div className="ws-panel-box ws-box-player">
              <div className="ws-panel-head">
                <span className="ws-box-heading sky">
                  <User size={16} /> Podgląd Karty Zawodnika
                </span>
              </div>

              <div className="ws-control-group">
                <label className="ws-field-label">Wybierz zawodnika:</label>
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  className="ws-select"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name} (#{p.shirt_number || "—"})</option>
                  ))}
                </select>
              </div>

              <div className="ws-control-group">
                <label className="ws-field-label">Nazwisko na karcie:</label>
                <input
                  type="text"
                  value={settings.metadata.playerName}
                  onChange={e => setSettings(prev => ({ ...prev, metadata: { ...prev.metadata, playerName: e.target.value.toUpperCase() } }))}
                  className="ws-input-text font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="ws-control-group">
                  <label className="ws-field-label">Ocena OVR:</label>
                  <input
                    type="number"
                    value={settings.metadata.playerRating}
                    onChange={e => setSettings(prev => ({ ...prev, metadata: { ...prev.metadata, playerRating: parseInt(e.target.value) || 90 } }))}
                    className="ws-input-text font-bold"
                  />
                </div>
                <div className="ws-control-group">
                  <label className="ws-field-label">Pozycja:</label>
                  <input
                    type="text"
                    value={settings.metadata.playerPosition}
                    onChange={e => setSettings(prev => ({ ...prev, metadata: { ...prev.metadata, playerPosition: e.target.value.toUpperCase() } }))}
                    className="ws-input-text font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* JSON READOUT */}
          <div className="ws-json-box">
            <span className="ws-json-title">Współrzędne & Czasy (Live JSON):</span>
            <pre className="ws-json-pre">
              {JSON.stringify({
                timeline: settings.timeline,
                rarity: { x: settings.rarity.x, y: settings.rarity.y, scale: settings.rarity.scale },
                player: { x: settings.player.x, y: settings.player.y, scale: settings.player.scale },
                card: { x: settings.card.x, y: settings.card.y, scale: settings.card.scale }
              }, null, 2)}
            </pre>
          </div>

        </div>
      </div>

      {/* SCOPED CSS STYLES */}
      <style jsx>{`
        .ws-root {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: #ffffff;
          box-sizing: border-box;
          font-family: inherit;
        }

        .ws-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          flex-wrap: wrap;
          gap: 12px;
          backdrop-filter: blur(10px);
        }

        .ws-brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ws-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ff2a3b, #f59e0b);
          display: grid;
          place-items: center;
          color: #000;
          box-shadow: 0 4px 14px rgba(255, 42, 59, 0.4);
        }

        .ws-title {
          font-size: 14px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ws-pro-tag {
          font-size: 9px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.25);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.4);
        }

        .ws-subtitle {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #94a3b8;
        }

        .ws-actions-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ws-btn-ghost {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .ws-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .ws-btn-active-toggle {
          background: rgba(245, 158, 11, 0.2) !important;
          border-color: rgba(245, 158, 11, 0.5) !important;
          color: #fcd34d !important;
        }

        .ws-btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 15px;
          border-radius: 9px;
          background: linear-gradient(90deg, #f59e0b, #eab308);
          border: none;
          color: #000;
          font-size: 11.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
          transition: 0.15s ease;
        }

        .ws-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(245, 158, 11, 0.5);
        }

        /* GRID */
        .ws-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 16px;
          width: 100%;
          align-items: start;
        }

        .ws-viewport-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          min-width: 0;
        }

        /* VIEWPORT KINOWY */
        .ws-viewport {
          position: relative;
          width: 100%;
          height: 540px;
          border-radius: 16px;
          overflow: hidden !important;
          background: #000000;
          border: 1px solid rgba(255, 42, 59, 0.4);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(255, 42, 59, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          cursor: crosshair;
        }

        .ws-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          z-index: 1;
        }

        .ws-video-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          pointer-events: none;
          z-index: 1;
        }

        .ws-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.75) 100%),
                      linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, 0.85) 100%);
          pointer-events: none;
          z-index: 2;
        }

        .ws-flash {
          position: absolute;
          inset: 0;
          background: #ffffff;
          opacity: 0.95;
          z-index: 99;
          animation: wsFlashAnim 0.35s ease-out forwards;
          pointer-events: none;
        }

        @keyframes wsFlashAnim {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }

        /* RARITY LAYER */
        .ws-rarity-layer {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          pointer-events: none;
          z-index: 20;
          transform-origin: center center;
          white-space: nowrap;
          animation: wsPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .ws-rarity-layer.is-active {
          border: 2px dashed rgba(245, 158, 11, 0.8);
          border-radius: 12px;
          padding: 8px 16px;
        }

        .ws-rarity-title {
          font-size: 52px;
          font-weight: 950;
          letter-spacing: 4px;
          text-transform: uppercase;
          line-height: 0.9;
          color: #ff3b30;
          text-shadow: 0 0 35px rgba(255, 69, 0, 0.95), 0 0 10px #000, 0 4px 15px #000;
        }

        .ws-rarity-sub {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #fcd34d;
          margin-top: 4px;
          opacity: 0.95;
          text-shadow: 0 0 15px rgba(0,0,0,0.9);
        }

        /* PLAYER LAYER */
        .ws-player-layer {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 15;
          transform-origin: center center;
          filter: drop-shadow(0 20px 30px rgba(0,0,0,0.95)) drop-shadow(0 0 25px rgba(255,69,0,0.4));
          animation: wsPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .ws-player-layer.is-active {
          border: 2px dashed rgba(56, 189, 248, 0.8);
          border-radius: 16px;
        }

        .ws-player-img {
          max-height: 400px;
          object-fit: contain;
          pointer-events: none;
        }

        .ws-player-photo-box {
          width: 250px;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ws-player-photo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }

        /* CARD LAYER */
        .ws-card-layer {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 25;
          transform-origin: center center;
          filter: drop-shadow(0 0 45px rgba(255, 42, 59, 0.95)) drop-shadow(0 25px 40px rgba(0,0,0,0.95));
          animation: wsDropIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes wsPopIn {
          0% { opacity: 0; transform: translate(-50%, -45%) scale(0.8); }
          100% { opacity: 1; }
        }

        @keyframes wsDropIn {
          0% { opacity: 0; transform: translate(-50%, -65%) scale(0.6); }
          100% { opacity: 1; }
        }

        .ws-card-layer.is-active {
          border: 2px dashed rgba(234, 179, 8, 0.9);
          border-radius: 20px;
        }

        .ws-card-box {
          width: 260px;
          height: 380px;
          border-radius: 18px;
          overflow: hidden;
          background: #080203;
          border: 2px solid #ff2a3b;
          box-shadow: 0 0 35px rgba(255, 42, 59, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .ws-card-img {
          width: 260px;
          height: 380px;
          object-fit: contain;
          border-radius: 18px;
        }

        .ws-card-inner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* HERO LAYER */
        .ws-hero-layer {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          pointer-events: none;
          z-index: 30;
          animation: wsPopIn 0.3s ease-out;
        }

        .ws-hero-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 900;
          color: #ff2a3b;
          letter-spacing: 2px;
          margin-bottom: 2px;
          text-shadow: 0 0 15px rgba(0,0,0,0.9);
        }

        .ws-hero-name {
          font-size: 38px;
          font-weight: 950;
          letter-spacing: 2px;
          margin: 0;
          color: #ffffff;
          text-shadow: 0 0 25px rgba(255, 42, 59, 0.85);
          text-transform: uppercase;
        }

        .ws-hero-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 700;
          margin-top: 4px;
        }

        .ws-rating {
          color: #f1c95c;
          font-weight: 900;
        }

        .ws-sep {
          color: #475569;
        }

        .ws-club {
          color: #cbd5e1;
        }

        /* OVERLAY INDICATORS */
        .ws-drag-indicator {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 40;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #cbd5e1;
        }

        .ws-drag-indicator b {
          color: #f59e0b;
        }

        .ws-time-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 40;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 11px;
          font-family: monospace;
          font-weight: 800;
          color: #f59e0b;
        }

        .ws-video-error-badge {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: rgba(220, 38, 38, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid #ef4444;
          padding: 10px 14px;
          border-radius: 10px;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 50;
        }

        /* MULTI-TRACK VISUAL TIMELINE */
        .ws-multi-timeline-card {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ws-timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ws-timeline-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #cbd5e1;
          letter-spacing: 0.5px;
        }

        .ws-current-sec-tag {
          font-family: monospace;
          font-size: 11px;
          font-weight: 900;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.15);
          padding: 2px 6px;
          border-radius: 6px;
        }

        .ws-tracks-container {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          padding: 8px 10px;
          overflow: hidden;
        }

        .ws-track-row {
          display: grid;
          grid-template-columns: 80px 1fr;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .ws-track-label {
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .ws-track-lane {
          position: relative;
          height: 18px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          overflow: hidden;
        }

        .ws-track-block {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 5px;
          display: flex;
          align-items: center;
          padding: 0 6px;
          font-size: 9px;
          font-weight: 900;
          color: #ffffff;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        }

        .ws-track-disabled {
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: 8px;
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
        }

        .ws-playhead-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
          pointer-events: none;
          z-index: 10;
        }

        /* CINEMA VIDEO CONTROLS BAR */
        .ws-video-controls-bar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px 18px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          box-sizing: border-box;
        }

        .ws-scrubber-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .ws-scrubber-time {
          font-size: 11px;
          font-family: monospace;
          font-weight: 800;
          color: #94a3b8;
          min-width: 50px;
        }

        .ws-scrubber-slider {
          flex: 1;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
          cursor: pointer;
          accent-color: #f59e0b;
        }

        .ws-controls-main-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ws-controls-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ws-btn-main-play {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          background: linear-gradient(90deg, #10b981, #059669);
          border: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
          transition: 0.15s ease;
        }

        .ws-btn-main-play.is-playing {
          background: linear-gradient(90deg, #e11d48, #be123c);
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);
        }

        .ws-btn-icon-sub {
          padding: 8px 10px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: 0.15s ease;
        }

        .ws-btn-icon-sub:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        .ws-btn-icon-sub.active-gold {
          background: rgba(245, 158, 11, 0.25);
          border-color: rgba(245, 158, 11, 0.6);
          color: #fcd34d;
        }

        .ws-btn-walkout-seq {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          background: linear-gradient(90deg, #ff2a3b, #f59e0b);
          border: none;
          color: #000000;
          font-size: 11.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(255, 42, 59, 0.4);
          transition: 0.15s ease;
        }

        .ws-btn-walkout-seq:hover {
          transform: translateY(-1px);
        }

        .ws-stages-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .ws-stages-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          margin-right: 2px;
        }

        .ws-stage-btn {
          padding: 6px 9px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ws-stage-btn.red { border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
        .ws-stage-btn.sky { border-color: rgba(56, 189, 248, 0.4); color: #bae6fd; }
        .ws-stage-btn.gold { border-color: rgba(245, 158, 11, 0.4); color: #fde68a; }
        .ws-stage-btn.yellow { border-color: rgba(234, 179, 8, 0.6); color: #fef08a; }

        .ws-speed-select-box {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 2px;
        }

        .ws-speed-chip {
          padding: 4px 7px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .ws-speed-chip.active {
          background: #38bdf8;
          color: #000000;
        }

        .ws-volume-slider {
          width: 60px;
          cursor: pointer;
          accent-color: #38bdf8;
        }

        /* SIDEBAR PANELS */
        .ws-sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          box-sizing: border-box;
        }

        .ws-sidebar-nav {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          background: rgba(0, 0, 0, 0.5);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ws-sidebar-nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
          text-align: center;
        }

        .ws-sidebar-nav-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .ws-sidebar-nav-btn.active-purple {
          background: rgba(168, 85, 247, 0.25);
          color: #c084fc;
          font-weight: 900;
        }

        .ws-sidebar-nav-btn.active-amber {
          background: rgba(245, 158, 11, 0.25);
          color: #fcd34d;
          font-weight: 900;
        }

        .ws-sidebar-nav-btn.active-blue {
          background: rgba(59, 130, 246, 0.25);
          color: #60a5fa;
          font-weight: 900;
        }

        .ws-sidebar-nav-btn.active-emerald {
          background: rgba(16, 185, 129, 0.25);
          color: #34d399;
          font-weight: 900;
        }

        .ws-panel-box {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-sizing: border-box;
        }

        .ws-box-sequence {
          border-color: rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.06);
        }

        .ws-box-video {
          border-color: rgba(59, 130, 246, 0.35);
          background: rgba(59, 130, 246, 0.05);
        }

        .ws-box-card {
          border-color: rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.04);
        }

        .ws-box-player {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.04);
        }

        .ws-box-rarity {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.04);
        }

        .ws-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ws-box-heading {
          font-size: 12px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
        }

        .ws-box-heading.purple { color: #c084fc; }
        .ws-box-heading.video-color { color: #60a5fa; }
        .ws-box-heading.gold { color: #f59e0b; }
        .ws-box-heading.sky { color: #38bdf8; }
        .ws-box-heading.red { color: #ef4444; }

        .ws-preset-chips-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .ws-preset-chip {
          padding: 5px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-size: 10.5px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .ws-preset-chip.active {
          background: rgba(168, 85, 247, 0.3);
          border-color: #a855f7;
          color: #f3e8ff;
        }

        /* TIMING CARDS */
        .ws-layer-timing-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ws-timing-card {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ws-timing-card.is-off {
          opacity: 0.6;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .ws-timing-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ws-timing-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .ws-checkbox-custom {
          width: 16px;
          height: 16px;
          accent-color: #a855f7;
          cursor: pointer;
        }

        .ws-timing-name {
          font-size: 11.5px;
          font-weight: 900;
        }

        .ws-timing-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }

        .ws-timing-controls-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .ws-time-input-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .ws-time-input-group label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
        }

        .ws-input-time {
          width: 70px;
          padding: 5px 8px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #ffffff;
          font-family: monospace;
          font-size: 12px;
          font-weight: 800;
        }

        .ws-btn-time-now {
          font-size: 9.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fcd34d;
          cursor: pointer;
          transition: 0.1s ease;
        }

        .ws-btn-time-now:hover {
          background: rgba(245, 158, 11, 0.3);
        }

        .ws-sub-check {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: #cbd5e1;
          margin-top: 3px;
          cursor: pointer;
        }

        .ws-timing-disabled-hint {
          font-size: 10.5px;
          color: #fcd34d;
          background: rgba(245, 158, 11, 0.1);
          border: 1px dashed rgba(245, 158, 11, 0.3);
          border-radius: 6px;
          padding: 6px 8px;
          line-height: 1.35;
        }

        .ws-status-pill {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
        }

        .ws-status-pill.online {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .ws-status-pill.paused {
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .ws-active-file-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
          padding: 8px 10px;
        }

        .ws-active-file-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .ws-active-file-name {
          font-size: 11.5px;
          font-weight: 800;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ws-active-file-meta {
          font-size: 10px;
          color: #94a3b8;
        }

        .ws-video-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ws-video-item-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          padding: 8px 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          cursor: pointer;
          text-align: left;
          transition: 0.15s ease;
        }

        .ws-video-item-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .ws-video-item-btn.active {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
          color: #93c5fd;
        }

        .ws-video-item-title {
          font-size: 11px;
          font-weight: 800;
        }

        .ws-video-item-desc {
          font-size: 9.5px;
          color: #94a3b8;
        }

        .ws-reset-mini {
          font-size: 10px;
          color: #94a3b8;
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
        }

        .ws-reset-mini:hover {
          color: #fff;
        }

        .ws-panel-title {
          font-size: 11px;
          font-weight: 800;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ws-layers-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .ws-layer-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .ws-layer-tab.active-gold {
          background: #f59e0b;
          color: #000;
          font-weight: 900;
        }

        .ws-layer-tab.active-sky {
          background: #38bdf8;
          color: #000;
          font-weight: 900;
        }

        .ws-layer-tab.active-red {
          background: #ef4444;
          color: #fff;
          font-weight: 900;
        }

        .ws-control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ws-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #cbd5e1;
        }

        .ws-val {
          font-family: monospace;
          font-weight: 900;
        }

        .ws-val.gold { color: #f59e0b; }
        .ws-val.sky { color: #38bdf8; }
        .ws-val.red { color: #ef4444; }

        .ws-slider {
          width: 100%;
          cursor: pointer;
        }

        .range-gold { accent-color: #f59e0b; }
        .range-sky { accent-color: #38bdf8; }
        .range-red { accent-color: #ef4444; }

        .ws-field-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
        }

        .ws-select, .ws-input-text {
          width: 100%;
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #fff;
          font-size: 11.5px;
          box-sizing: border-box;
        }

        .ws-upload-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ws-file-input {
          font-size: 11px;
          color: #94a3b8;
        }

        .ws-json-box {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px;
        }

        .ws-json-title {
          font-size: 10px;
          font-weight: 800;
          color: #38bdf8;
          display: block;
          margin-bottom: 4px;
        }

        .ws-json-pre {
          margin: 0;
          font-family: monospace;
          font-size: 10px;
          color: #94a3b8;
          line-height: 1.35;
        }

        @media (max-width: 1100px) {
          .ws-grid {
            grid-template-columns: 1fr;
          }
          .ws-viewport {
            height: 460px;
          }
        }
      `}</style>
    </div>
  );
}
