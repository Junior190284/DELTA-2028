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
  FastForward,
  Repeat,
  AlertCircle,
  FileVideo
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
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_path?: string | null;
}

export interface WalkoutSettings {
  videoSrc: string;
  rarity: {
    text: string;
    subtext: string;
    x: number; // percentage offset
    y: number; // percentage offset
    scale: number;
  };
  player: {
    x: number; // percentage offset
    y: number; // percentage offset
    scale: number;
    customCutoutUrl?: string;
  };
  card: {
    x: number; // percentage offset
    y: number; // pixel offset
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
        if (saved) {
          const parsed = JSON.parse(saved);
          // If stored videoSrc is a dead blob URL from an old session, fallback to default
          if (parsed.videoSrc && parsed.videoSrc.startsWith("blob:")) {
            parsed.videoSrc = DEFAULT_SETTINGS.videoSrc;
          }
          return { ...DEFAULT_SETTINGS, ...parsed };
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

  // Stage sequence playback: "intro" (0-3s), "rarity" (3-5s), "player" (5-7s), "card" (7-9s), "hero" (9s+)
  const [stage, setStage] = useState<"intro" | "rarity" | "player" | "card" | "hero">("hero");
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(9.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<"rarity" | "player" | "card">("card");
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

  // Full Walkout 12s Animation Sequence
  const startFullWalkout = () => {
    clearTimers();
    setIsPlayingAuto(true);
    setStage("intro");
    setIsFlash(false);
    setCurrentTime(0);
    startTimeRef.current = Date.now();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
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
      const targetTime = times[s] % (videoRef.current.duration || 10);
      videoRef.current.currentTime = targetTime;
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }
  };

  // Video Manual Playback Controls
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

  // Drag and Drop interaction on viewport
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
      setCustomVideoFileName("");
      localStorage.removeItem("delta_walkout_studio_settings");
    }
  };

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string>("Gotowy");

  // Video Upload with instant preview and Supabase storage upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoErrorMsg(null);
    setCustomVideoFileName(file.name);

    // 1. Instant local preview
    const localUrl = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, videoSrc: localUrl }));
    setVideoStatus(`Wczytano plik: ${file.name}`);

    // 2. Play immediately
    if (videoRef.current) {
      videoRef.current.src = localUrl;
      videoRef.current.load();
      videoRef.current.play().then(() => {
        setIsVideoPlaying(true);
      }).catch((err) => {
        console.warn("Autoplay blocked or format error:", err);
      });
    }

    // 3. Upload in background to Supabase Storage for permanent persistence
    try {
      setUploadingVideo(true);
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
          setVideoStatus(`Zapisano w chmurze DELTA: ${file.name}`);
        }
      }
    } catch (err) {
      console.warn("Storage upload fallback to local:", err);
    } finally {
      setUploadingVideo(false);
    }
  };

  // Cutout Upload
  const handleCutoutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, player: { ...prev.player, customCutoutUrl: url } }));
  };

  // Card Upload
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
            <Flame size={22} />
          </div>
          <div>
            <h2 className="ws-title">
              Studio Walkoutów & Animacji DELTA
              <span className="ws-pro-tag">PRO WYSIWYG</span>
            </h2>
            <p className="ws-subtitle">
              Wgraj własny film MP4/WebM, ustaw kartę i sylwetkę gracza. Odtwarzaj wideo i testuj animacje w czasie rzeczywistym.
            </p>
          </div>
        </div>

        <div className="ws-actions-group">
          <button 
            type="button" 
            onClick={() => setHideOverlays(!hideOverlays)} 
            className={`ws-btn-ghost ${hideOverlays ? "ws-btn-active-toggle" : ""}`}
            title="Ukryj lub pokaż elementy graficzne"
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
            <span>{savedFeedback ? "✓ Zapisano!" : "Zapisz ułożenie"}</span>
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

            {/* WARSTWY NAKŁADANE (UKRYWANE W TRYBIE "TYLKO WIDEO") */}
            {!hideOverlays && (
              <>
                {/* 1. WARSTWA NAPISÓW (RARITY) */}
                {(stage === "rarity" || stage === "player" || stage === "hero") && (
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
                {(stage === "player" || stage === "hero") && (
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
                {(stage === "card" || stage === "hero") && (
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

                {/* DOLNE SZCZEGÓŁY HERO */}
                {stage === "hero" && (
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

                {/* WSKAŹNIKI WARSTWY */}
                <div className="ws-drag-indicator">
                  <Move size={14} />
                  <span>Aktywna warstwa: <b>{activeLayer === "card" ? "Karta 3D" : activeLayer === "player" ? "Zawodnik" : "Napisy"}</b></span>
                </div>
              </>
            )}

            {/* WSKAŹNIK CZASU */}
            <div className="ws-time-indicator">
              {formatTime(videoCurrentTime)} / {formatTime(videoDuration)} • Faza: <span className="uppercase">{stage}</span>
            </div>

            {/* KOMUNIKAT BŁĘDU WIDEO JEŚLI WYSTĄPIŁ */}
            {videoErrorMsg && (
              <div className="ws-video-error-badge">
                <AlertCircle size={15} />
                <span>{videoErrorMsg}</span>
              </div>
            )}
          </div>

          {/* DEDYKOWANY ODTWARZACZ WIDEO (PLAY / PAUSE / SCRUBBER / PRĘDKOŚĆ / DŹWIĘK) */}
          <div className="ws-video-controls-bar">
            {/* GÓRNY WIERSZ: SUWAK CZASU (SCRUBBER) */}
            <div className="ws-scrubber-row">
              <span className="ws-scrubber-time">{formatTime(videoCurrentTime)}</span>
              <input
                type="range"
                min={0}
                max={videoDuration || 12}
                step={0.05}
                value={videoCurrentTime}
                onChange={handleSeek}
                className="ws-scrubber-slider"
              />
              <span className="ws-scrubber-time">{formatTime(videoDuration)}</span>
            </div>

            {/* DOLNY WIERSZ: PRZYCISKI KONTROLNE */}
            <div className="ws-controls-main-row">
              {/* LEWA STRONA: PLAY/PAUSE, RESTART, ODTWÓRZ CAŁY WALKOUT */}
              <div className="ws-controls-group">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={`ws-btn-main-play ${isVideoPlaying ? "is-playing" : ""}`}
                >
                  {isVideoPlaying ? <Pause size={17} /> : <Play size={17} />}
                  <span>{isVideoPlaying ? "Wstrzymaj film" : "Odtwórz film"}</span>
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
                  title="Uruchom pełną 12-sekundową animację kinową"
                >
                  <Sparkles size={15} />
                  <span>Animacja Walkoutu (12s)</span>
                </button>
              </div>

              {/* ŚRODEK: SKOKI DO FAZ ANIMACJI */}
              <div className="ws-stages-row">
                <span className="ws-stages-label">Faza:</span>
                <button
                  type="button"
                  onClick={() => jumpToStage("intro")}
                  className={`ws-stage-btn ${stage === "intro" ? "active" : ""}`}
                >
                  Intro (0s)
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStage("rarity")}
                  className={`ws-stage-btn ${stage === "rarity" ? "active red" : ""}`}
                >
                  Napis (3s)
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStage("player")}
                  className={`ws-stage-btn ${stage === "player" ? "active sky" : ""}`}
                >
                  Gracz (5s)
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStage("card")}
                  className={`ws-stage-btn ${stage === "card" ? "active gold" : ""}`}
                >
                  Karta (7s)
                </button>
                <button
                  type="button"
                  onClick={() => jumpToStage("hero")}
                  className={`ws-stage-btn ${stage === "hero" ? "active yellow" : ""}`}
                >
                  Hero (9s)
                </button>
              </div>

              {/* PRAWA STRONA: PRĘDKOŚĆ, PĘTLA, DŹWIĘK */}
              <div className="ws-controls-group">
                {/* PRĘDKOŚĆ */}
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

                {/* LOOP */}
                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`ws-btn-icon-sub ${isLooping ? "active-gold" : ""}`}
                  title={isLooping ? "Pętla włączona" : "Pętla wyłączona"}
                >
                  <Repeat size={15} />
                </button>

                {/* GŁOŚNOŚĆ */}
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

        {/* PRAWA KOLUMNA: DOKŁADNE PANELE KONTROLNE */}
        <div className="ws-sidebar">
          
          {/* SEKCJA ZARZĄDZANIA WIDEO */}
          <div className="ws-panel-box ws-box-video">
            <div className="ws-panel-head">
              <span className="ws-box-heading video-color">
                <Video size={16} /> Odtwarzacz & Wideo w tle
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
                  <span className="ws-active-file-meta">{videoDuration.toFixed(1)}s • MP4/WebM</span>
                </div>
              </div>
            )}

            <div className="ws-presets-list">
              <span className="ws-field-label">Predefiniowane tła:</span>
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
                  className={`ws-preset-btn ${settings.videoSrc === preset.src ? "active" : ""}`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div className="ws-upload-field">
              <label className="ws-field-label font-bold text-amber-400 flex items-center gap-1.5">
                <Upload size={13} /> Wgraj własny film z dysku (MP4 / WebM / MOV):
              </label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
                onChange={handleVideoUpload}
                className="ws-file-input"
              />
              <span className="ws-upload-hint">
                Film uruchomi się natychmiast po wybraniu i zostanie przygotowany do odtwarzania.
              </span>
            </div>
          </div>

          {/* WYBÓR WARSTWY DO REGULACJI */}
          <div className="ws-panel-box">
            <span className="ws-panel-title">Wybierz warstwę graficzną:</span>
            <div className="ws-layers-tabs">
              <button
                type="button"
                onClick={() => setActiveLayer("card")}
                className={`ws-layer-tab ${activeLayer === "card" ? "active-gold" : ""}`}
              >
                <Sparkles size={16} />
                <span>Karta 3D</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer("player")}
                className={`ws-layer-tab ${activeLayer === "player" ? "active-sky" : ""}`}
              >
                <Layers size={16} />
                <span>Zawodnik</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer("rarity")}
                className={`ws-layer-tab ${activeLayer === "rarity" ? "active-red" : ""}`}
              >
                <Type size={16} />
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
                  Reset do optymalnych
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
                  Reset do optymalnych
                </button>
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
                  Reset do optymalnych
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

          {/* JSON READOUT */}
          <div className="ws-json-box">
            <span className="ws-json-title">Współrzędne (Live JSON):</span>
            <pre className="ws-json-pre">
              {JSON.stringify({
                rarity: { x: settings.rarity.x, y: settings.rarity.y, scale: settings.rarity.scale },
                player: { x: settings.player.x, y: settings.player.y, scale: settings.player.scale },
                card: { x: settings.card.x, y: settings.card.y, scale: settings.card.scale }
              }, null, 2)}
            </pre>
          </div>

        </div>
      </div>

      {/* SCOPED CSS STYLES - ZERO BLEED GUARANTEE */}
      <style jsx>{`
        .ws-root {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: #ffffff;
          box-sizing: border-box;
          font-family: inherit;
        }

        .ws-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ws-brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ws-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ff2a3b, #f59e0b);
          display: grid;
          place-items: center;
          color: #000;
          box-shadow: 0 4px 14px rgba(255, 42, 59, 0.4);
        }

        .ws-title {
          font-size: 15px;
          font-weight: 900;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ws-pro-tag {
          font-size: 9.5px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(220, 38, 38, 0.25);
          color: #f87171;
          border: 1px solid rgba(220, 38, 38, 0.4);
        }

        .ws-subtitle {
          margin: 2px 0 0 0;
          font-size: 11.5px;
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
          padding: 8px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-size: 12px;
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
          padding: 8px 16px;
          border-radius: 10px;
          background: linear-gradient(90deg, #f59e0b, #eab308);
          border: none;
          color: #000;
          font-size: 12px;
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
          grid-template-columns: 1fr 370px;
          gap: 18px;
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
          height: 560px;
          border-radius: 18px;
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
          opacity: 0.9;
          z-index: 99;
          animation: wsFlashAnim 0.3s ease-out forwards;
          pointer-events: none;
        }

        @keyframes wsFlashAnim {
          0% { opacity: 0.9; }
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
          min-width: 40px;
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
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ws-stage-btn.active {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .ws-stage-btn.active.red {
          background: rgba(220, 38, 38, 0.35);
          color: #fca5a5;
          border-color: #ef4444;
        }

        .ws-stage-btn.active.sky {
          background: rgba(14, 165, 233, 0.35);
          color: #bae6fd;
          border-color: #38bdf8;
        }

        .ws-stage-btn.active.gold {
          background: rgba(217, 119, 6, 0.35);
          color: #fde68a;
          border-color: #f59e0b;
        }

        .ws-stage-btn.active.yellow {
          background: #eab308;
          color: #000000;
          font-weight: 900;
        }

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

        .ws-box-heading.video-color { color: #60a5fa; }
        .ws-box-heading.gold { color: #f59e0b; }
        .ws-box-heading.sky { color: #38bdf8; }
        .ws-box-heading.red { color: #ef4444; }

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
          font-size: 11.5px;
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

        .ws-upload-hint {
          font-size: 10px;
          color: #64748b;
          line-height: 1.3;
        }

        .ws-presets-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ws-preset-btn {
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }

        .ws-preset-btn.active {
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          border-color: rgba(245, 158, 11, 0.5);
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
