"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Play, 
  RotateCcw, 
  FastForward, 
  Sliders, 
  ArrowLeft, 
  Sparkles, 
  Flame,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Pause,
  Maximize,
  Eye,
  Layers,
  Move,
  LayoutTemplate
} from "lucide-react";

type WalkoutStage = "intro" | "rarity" | "player" | "card" | "hero";

export default function InfernoWalkoutDevPage() {
  // Mode: "preview" (interactive studio / editor) or "cinematic" (fullscreen playback)
  const [activeTab, setActiveTab] = useState<"editor" | "cinematic">("editor");

  // Timeline & Stage
  const [stage, setStage] = useState<WalkoutStage>("hero");
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(9.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Position & Transform Sliders (Controlled Live)
  const [playerX, setPlayerX] = useState<number>(-120);
  const [playerY, setPlayerY] = useState<number>(0);
  const [playerScale, setPlayerScale] = useState<number>(1.0);

  const [cardX, setCardX] = useState<number>(110);
  const [cardY, setCardY] = useState<number>(0);
  const [cardScale, setCardScale] = useState<number>(1.05);

  // Card & Player Info
  const [playerName, setPlayerName] = useState<string>("RYSIO");
  const [playerRating, setPlayerRating] = useState<number>(94);
  const [playerPosition, setPlayerPosition] = useState<string>("NAPASTNIK");

  // Video and Animation Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Assets
  const videoSrc = "/media/walkouts/inferno-bg.mp4";
  const playerCutoutSrc = "/demo/player-cutout.png";
  const cardSrc = "/demo/inferno-card.png";

  const clearTimers = () => {
    timerRef.current.forEach(t => clearTimeout(t));
    timerRef.current = [];
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  // Start complete cinematic walkout sequence from 0.0s
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
      if (elapsed < 11) {
        animFrameRef.current = requestAnimationFrame(updateTicker);
      } else {
        setIsPlayingAuto(false);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateTicker);

    // 0–3s: Intro
    // 3–5s: Rarity Slam (INFERNO)
    const t1 = setTimeout(() => {
      setStage("rarity");
    }, 3000);

    // 5–7s: Player Cutout Reveal
    const t2 = setTimeout(() => {
      setStage("player");
    }, 5000);

    // 7–9s: Card Reveal with Flash
    const t3 = setTimeout(() => {
      setStage("card");
      setIsFlash(true);
      setTimeout(() => setIsFlash(false), 500);
    }, 7000);

    // 9s+: Final Hero Shot
    const t4 = setTimeout(() => {
      setStage("hero");
      setIsPlayingAuto(false);
    }, 9000);

    timerRef.current = [t1, t2, t3, t4];
  };

  // Freeze/Manual switch to any stage for live position tuning
  const setManualStage = (newStage: WalkoutStage) => {
    clearTimers();
    setIsPlayingAuto(false);
    setIsFlash(false);
    setStage(newStage);
    if (newStage === "intro") setCurrentTime(1.5);
    else if (newStage === "rarity") setCurrentTime(4.0);
    else if (newStage === "player") setCurrentTime(6.0);
    else if (newStage === "card") setCurrentTime(8.0);
    else if (newStage === "hero") setCurrentTime(9.5);
  };

  const applyPreset = (preset: "classic" | "centered" | "cardFront" | "stacked") => {
    if (preset === "classic") {
      setPlayerX(-120);
      setPlayerY(0);
      setPlayerScale(1.0);
      setCardX(110);
      setCardY(0);
      setCardScale(1.05);
    } else if (preset === "centered") {
      setPlayerX(0);
      setPlayerY(0);
      setPlayerScale(1.0);
      setCardX(0);
      setCardY(0);
      setCardScale(1.05);
    } else if (preset === "cardFront") {
      setPlayerX(-80);
      setPlayerY(-20);
      setPlayerScale(0.95);
      setCardX(70);
      setCardY(20);
      setCardScale(1.1);
    } else if (preset === "stacked") {
      setPlayerX(0);
      setPlayerY(-40);
      setPlayerScale(0.88);
      setCardX(0);
      setCardY(60);
      setCardScale(1.0);
    }
  };

  const copyConfig = () => {
    const data = JSON.stringify({
      playerTransform: { x: playerX, y: playerY, scale: playerScale },
      cardTransform: { x: cardX, y: cardY, scale: cardScale }
    }, null, 2);
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // Start in Hero Shot stage so the user immediately sees the player and card and can move them
    setManualStage("hero");
    return () => clearTimers();
  }, []);

  return (
    <div className="walkout-app-root">
      
      {/* ========================================================================= */}
      {/* TOP BAR & NAVIGATION                                                     */}
      {/* ========================================================================= */}
      <header className="top-nav-bar">
        <div className="nav-left">
          <Link href="/" className="back-btn">
            <ArrowLeft size={14} /> Powrót do aplikacji
          </Link>
          <div className="nav-divider" />
          <div className="brand-title">
            <Flame size={20} className="flame-icon" />
            <span className="brand-name">INFERNO WALKOUT REVEAL</span>
            <span className="dev-tag">STUDIO PROTOTYP</span>
          </div>
        </div>

        <div className="nav-right">
          {/* Main Action Triggers */}
          <button 
            type="button" 
            className={`tab-btn ${isPlayingAuto ? "tab-btn-active-play" : "tab-btn-primary"}`}
            onClick={startFullWalkout}
          >
            <Play size={16} fill={isPlayingAuto ? "#000" : "currentColor"} />
            <span>ODTWÓRZ PEŁNY WALKOUT (0–10s)</span>
          </button>

          <button 
            type="button" 
            className="tab-btn tab-btn-secondary"
            onClick={() => setManualStage("hero")}
          >
            <FastForward size={15} />
            <span>KADR KOŃCOWY (HERO SHOT)</span>
          </button>

          <button 
            type="button" 
            className="tab-btn tab-btn-sound"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isMuted ? "DŹWIĘK: WYŁ" : "DŹWIĘK: WŁ"}</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN STUDIO WORKSPACE (TWO COLUMNS: PREVIEW + DEV CONTROLS)              */}
      {/* ========================================================================= */}
      <div className="studio-container">
        
        {/* LEFT COLUMN: CINEMATIC SCREEN (THE REVEAL ITSELF) */}
        <div className="preview-screen-wrapper">
          
          {/* Top Floating Stage Timeline Pills */}
          <div className="stage-timeline-bar">
            <span className="timeline-label">KROK OSI CZASU:</span>
            {[
              { id: "intro", label: "1. Intro (0-3s)", time: "0-3s" },
              { id: "rarity", label: "2. Rarity INFERNO (3-5s)", time: "3-5s" },
              { id: "player", label: "3. Zawodnik (5-7s)", time: "5-7s" },
              { id: "card", label: "4. Karta 3D (7-9s)", time: "7-9s" },
              { id: "hero", label: "5. Finał Hero (9s+)", time: "9s+" },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                className={`stage-pill-btn ${stage === item.id ? "stage-pill-active" : ""}`}
                onClick={() => setManualStage(item.id as WalkoutStage)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* THE ACTUAL WALKOUT VIEWPORT */}
          <div className="cinematic-viewport">
            
            {/* 1. CINEMATIC BACKGROUND VIDEO (inferno-bg.mp4) */}
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              className="cinematic-bg-video"
              onLoadedData={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
            />

            {/* 2. Color grading vignette */}
            <div className="cinematic-overlay" />

            {/* 3. Flash burst on card slam */}
            {isFlash && <div className="cinematic-flash" />}

            {/* ================= STAGE 2: RARITY SLAM ================= */}
            {stage === "rarity" && (
              <div className="rarity-slam-box">
                <span className="rarity-kicker-text">ULTRA RARE WALKOUT</span>
                <h1 className="rarity-huge-title">INFERNO</h1>
                <div className="rarity-pills-row">
                  <span className="pill-item">{playerPosition}</span>
                  <span className="pill-item pill-rating">OVR {playerRating}</span>
                </div>
              </div>
            )}

            {/* ================= STAGES 3, 4, 5: HERO SCENE ================= */}
            {(stage === "player" || stage === "card" || stage === "hero") && (
              <div className="hero-multiplane-scene">
                
                {/* Ground red ambient shadow */}
                <div className="ground-glow-spotlight" />

                {/* PLAYER CUTOUT PNG — FULLY ADJUSTABLE LIVE */}
                <div 
                  className="player-cutout-layer"
                  style={{
                    transform: `translate(${playerX}px, ${playerY}px) scale(${playerScale})`,
                    zIndex: 10
                  }}
                >
                  <img 
                    src={playerCutoutSrc} 
                    alt="Zawodnik Cutout" 
                    className="player-cutout-image"
                  />
                  {/* Subtle red rim light reflection */}
                  <div className="player-rim-light" />
                </div>

                {/* INFERNO CARD — SHOWN IN STAGES 'card' AND 'hero' */}
                {(stage === "card" || stage === "hero") && (
                  <div 
                    className="card-3d-layer"
                    style={{
                      transform: `translate(${cardX}px, ${cardY}px) scale(${cardScale})`,
                      zIndex: 20
                    }}
                  >
                    <div className="card-outer-box">
                      <img 
                        src={cardSrc} 
                        alt="Karta INFERNO" 
                        className="card-main-image"
                      />
                    </div>
                  </div>
                )}

                {/* FINAL HERO SHOT UI OVERLAY (9s+) */}
                {stage === "hero" && (
                  <div className="hero-bottom-details">
                    <div className="hero-badge">
                      <Flame size={14} color="#ff2a3b" />
                      <span>INFERNO WALKOUT</span>
                    </div>

                    <h2 className="hero-title-name">{playerName}</h2>

                    <p className="hero-meta-subtitle">
                      <span>{playerPosition}</span>
                      <span className="sep">•</span>
                      <span className="highlight-rating">{playerRating} OVR</span>
                      <span className="sep">•</span>
                      <span>K.S. DELTA WARSZAWA</span>
                    </p>

                    <div className="hero-btn-row">
                      <button 
                        type="button" 
                        className="hero-btn-collect"
                        onClick={() => alert("Karta dodana do albumu!")}
                      >
                        <Sparkles size={16} />
                        <span>DODAJ DO KOLEKCJI</span>
                      </button>

                      <button 
                        type="button" 
                        className="hero-btn-repeat"
                        onClick={startFullWalkout}
                      >
                        <RotateCcw size={15} />
                        <span>POWTÓRZ WALKOUT</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Quick status bar below preview */}
          <div className="preview-status-bar">
            <div className="status-indicator">
              <span className="status-dot" />
              <span>Plik wideo: <b>public/media/walkouts/inferno-bg.mp4</b></span>
            </div>
            <div className="status-timing">
              Aktualny czas: <b>{currentTime.toFixed(1)}s</b> / Tryb: <b>{isPlayingAuto ? "Odtwarzanie sekwencji" : "Podgląd / Edycja pozycji"}</b>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DEDICATED DEV CONTROL PANEL */}
        <aside className="dev-studio-sidebar">
          
          <div className="sidebar-header">
            <div className="sidebar-title">
              <Sliders size={18} color="#f1c95c" />
              <span>DOPASOWANIE ZAWODNIKA I KARTY</span>
            </div>
            <p className="sidebar-desc">
              Przesuwaj suwaki, aby na żywo ustawić pozycję zawodnika (PNG) oraz karty na tle naszego filmu.
            </p>
          </div>

          {/* PRESET TEMPLATES */}
          <div className="panel-box preset-box">
            <span className="panel-box-title">
              <LayoutTemplate size={14} /> GOTOWE UKŁADY (PRESETY):
            </span>
            <div className="preset-grid">
              <button type="button" className="preset-btn" onClick={() => applyPreset("classic")}>
                Klasyczny (Zawodnik L / Karta P)
              </button>
              <button type="button" className="preset-btn" onClick={() => applyPreset("cardFront")}>
                Karta na pierwszym planie
              </button>
              <button type="button" className="preset-btn" onClick={() => applyPreset("centered")}>
                Oba na środku (0, 0)
              </button>
              <button type="button" className="preset-btn" onClick={() => applyPreset("stacked")}>
                Zawodnik góra / Karta dół
              </button>
            </div>
          </div>

          {/* 1. PLAYER POSITION SLIDERS */}
          <div className="panel-box player-box">
            <div className="panel-header-row">
              <span className="panel-box-title text-red">
                <Move size={14} /> ZAWODNIK (player-cutout.png):
              </span>
              <button 
                type="button" 
                className="reset-mini-btn"
                onClick={() => { setPlayerX(-120); setPlayerY(0); setPlayerScale(1.0); }}
              >
                Resetuj
              </button>
            </div>

            {/* Slider X */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja X (Lewo / Prawo):</span>
                <span className="val-badge text-red">{playerX} px</span>
              </div>
              <input 
                type="range" 
                min="-400" 
                max="400" 
                value={playerX} 
                onChange={e => setPlayerX(Number(e.target.value))}
                className="range-input range-red"
              />
            </div>

            {/* Slider Y */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja Y (Góra / Dół):</span>
                <span className="val-badge text-red">{playerY} px</span>
              </div>
              <input 
                type="range" 
                min="-300" 
                max="300" 
                value={playerY} 
                onChange={e => setPlayerY(Number(e.target.value))}
                className="range-input range-red"
              />
            </div>

            {/* Slider Scale */}
            <div className="control-group">
              <div className="control-label">
                <span>Skala (Wielkość):</span>
                <span className="val-badge text-red">{playerScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.4" 
                max="2.5" 
                step="0.05"
                value={playerScale} 
                onChange={e => setPlayerScale(Number(e.target.value))}
                className="range-input range-red"
              />
            </div>
          </div>

          {/* 2. CARD POSITION SLIDERS */}
          <div className="panel-box card-box">
            <div className="panel-header-row">
              <span className="panel-box-title text-gold">
                <Layers size={14} /> KARTA (inferno-card.png):
              </span>
              <button 
                type="button" 
                className="reset-mini-btn"
                onClick={() => { setCardX(110); setCardY(0); setCardScale(1.05); }}
              >
                Resetuj
              </button>
            </div>

            {/* Slider X */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja X (Lewo / Prawo):</span>
                <span className="val-badge text-gold">{cardX} px</span>
              </div>
              <input 
                type="range" 
                min="-400" 
                max="400" 
                value={cardX} 
                onChange={e => setCardX(Number(e.target.value))}
                className="range-input range-gold"
              />
            </div>

            {/* Slider Y */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja Y (Góra / Dół):</span>
                <span className="val-badge text-gold">{cardY} px</span>
              </div>
              <input 
                type="range" 
                min="-300" 
                max="300" 
                value={cardY} 
                onChange={e => setCardY(Number(e.target.value))}
                className="range-input range-gold"
              />
            </div>

            {/* Slider Scale */}
            <div className="control-group">
              <div className="control-label">
                <span>Skala (Wielkość):</span>
                <span className="val-badge text-gold">{cardScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.4" 
                max="2.5" 
                step="0.05"
                value={cardScale} 
                onChange={e => setCardScale(Number(e.target.value))}
                className="range-input range-gold"
              />
            </div>
          </div>

          {/* COPY CONFIG / EXPORT */}
          <button type="button" className="copy-config-btn" onClick={copyConfig}>
            {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
            <span>{copied ? "SKOPIOWANO WARTOŚCI JSON!" : "KOPIUJ POZYCJE (TRANSFORM JSON)"}</span>
          </button>

          {/* LIVE JSON READOUT */}
          <div className="json-readout-box">
            <span className="readout-title">AKTUALNE WSPÓŁRZĘDNE:</span>
            <pre>
{JSON.stringify({
  player: { x: playerX, y: playerY, scale: playerScale },
  card: { x: cardX, y: cardY, scale: cardScale }
}, null, 2)}
            </pre>
          </div>

        </aside>

      </div>

      {/* ========================================================================= */}
      {/* SCOPED COMPONENT STYLES                                                  */}
      {/* ========================================================================= */}
      <style jsx>{`
        .walkout-app-root {
          width: 100vw;
          min-height: 100vh;
          background: #020408;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        /* Top Navigation Header */
        .top-nav-bar {
          height: 60px;
          background: rgba(4, 8, 16, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0 20px;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 12px;
          text-decoration: none;
          font-weight: 600;
        }

        .back-btn:hover {
          color: #ffffff;
        }

        .nav-divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.15);
        }

        .brand-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .flame-icon {
          color: #ff2a3b;
        }

        .brand-name {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .dev-tag {
          font-size: 10px;
          font-weight: 900;
          background: #dc2626;
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 6px;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tab-btn {
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .tab-btn-primary {
          background: linear-gradient(90deg, #ff2a3b, #ff8400);
          color: #000000;
          box-shadow: 0 4px 15px rgba(255, 42, 59, 0.35);
        }

        .tab-btn-active-play {
          background: #22c55e;
          color: #000000;
          box-shadow: 0 0 15px #22c55e;
        }

        .tab-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .tab-btn-sound {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f1c95c;
        }

        /* Workspace Grid */
        .studio-container {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 390px;
          padding: 20px;
          gap: 20px;
          max-width: 1600px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        /* Left Column: Cinematic Preview Area */
        .preview-screen-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stage-timeline-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 12px;
          border-radius: 12px;
          overflow-x: auto;
        }

        .timeline-label {
          font-size: 11px;
          font-weight: 900;
          color: #94a3b8;
          white-space: nowrap;
        }

        .stage-pill-btn {
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .stage-pill-active {
          background: #ff2a3b;
          border-color: #ff2a3b;
          color: #ffffff;
          font-weight: 900;
          box-shadow: 0 0 12px rgba(255, 42, 59, 0.5);
        }

        /* The Viewport Container */
        .cinematic-viewport {
          height: 650px;
          background: #000000;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justifyContent: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
        }

        .cinematic-bg-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.8) contrast(1.15);
          z-index: 1;
        }

        .cinematic-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, transparent 25%, rgba(2, 4, 8, 0.5) 60%, rgba(2, 4, 8, 0.95) 100%),
                      radial-gradient(circle at 50% 60%, rgba(255, 42, 59, 0.2) 0%, transparent 70%);
          z-index: 2;
          pointer-events: none;
        }

        .cinematic-flash {
          position: absolute;
          inset: 0;
          background: #ffffff;
          z-index: 80;
          animation: flash-out 0.5s ease-out forwards;
          pointer-events: none;
        }

        @keyframes flash-out {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }

        /* Stage 2 Rarity Typography */
        .rarity-slam-box {
          position: absolute;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: slam-anim 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
        }

        .rarity-kicker-text {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 4px;
          color: #f1c95c;
          text-shadow: 0 0 15px rgba(241, 201, 92, 0.8);
          margin-bottom: 6px;
        }

        .rarity-huge-title {
          font-size: clamp(54px, 10vw, 96px);
          font-weight: 950;
          letter-spacing: 8px;
          margin: 0;
          line-height: 1;
          background: linear-gradient(180deg, #ffffff 0%, #ff2a3b 60%, #5c050a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 40px rgba(255, 42, 59, 0.85));
        }

        .rarity-pills-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }

        .pill-item {
          padding: 6px 16px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid #ff2a3b;
          font-size: 12px;
          font-weight: 900;
          color: #ffffff;
        }

        .pill-rating {
          background: linear-gradient(90deg, #ff2a3b, #ff8400);
          color: #000000;
          border: none;
          font-weight: 950;
        }

        @keyframes slam-anim {
          0% { opacity: 0; transform: scale(2.2); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        /* Hero Scene Container */
        .hero-multiplane-scene {
          position: relative;
          z-index: 40;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justifyContent: center;
          perspective: 1200px;
        }

        .ground-glow-spotlight {
          position: absolute;
          bottom: 110px;
          width: 440px;
          height: 80px;
          background: radial-gradient(ellipse, rgba(255, 42, 59, 0.5) 0%, rgba(0,0,0,0.85) 50%, transparent 70%);
          border-radius: 50%;
          filter: blur(14px);
          z-index: 5;
          pointer-events: none;
        }

        /* Player Layer */
        .player-cutout-layer {
          position: absolute;
          transition: transform 0.1s ease-out;
          filter: drop-shadow(0 0 40px rgba(255, 42, 59, 0.85)) drop-shadow(0 20px 30px rgba(0,0,0,0.9));
          pointer-events: none;
        }

        .player-cutout-image {
          max-height: 440px;
          max-width: 380px;
          object-fit: contain;
          display: block;
        }

        /* Card 3D Layer */
        .card-3d-layer {
          position: absolute;
          transition: transform 0.1s ease-out;
          filter: drop-shadow(0 0 45px rgba(255, 42, 59, 0.95)) drop-shadow(0 25px 40px rgba(0,0,0,0.95));
          transform-style: preserve-3d;
        }

        .card-outer-box {
          width: 260px;
          height: 380px;
          border-radius: 18px;
          overflow: hidden;
          background: #080203;
          border: 2px solid #ff2a3b;
          box-shadow: 0 0 35px rgba(255, 42, 59, 0.6);
          display: flex;
          align-items: center;
          justifyContent: center;
        }

        .card-main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Hero Bottom Details (9s+) */
        .hero-bottom-details {
          position: absolute;
          bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          z-index: 60;
          animation: fade-up 0.5s ease-out forwards;
        }

        .hero-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 900;
          color: #ff2a3b;
          letter-spacing: 2px;
          margin-bottom: 2px;
        }

        .hero-title-name {
          font-size: clamp(26px, 5vw, 38px);
          font-weight: 950;
          letter-spacing: 2px;
          margin: 0;
          color: #ffffff;
          text-shadow: 0 0 25px rgba(255, 42, 59, 0.85);
        }

        .hero-meta-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 700;
          margin: 4px 0 16px 0;
        }

        .hero-meta-subtitle .sep {
          color: #475569;
        }

        .hero-meta-subtitle .highlight-rating {
          color: #f1c95c;
          font-weight: 900;
        }

        .hero-btn-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hero-btn-collect {
          padding: 12px 24px;
          border-radius: 14px;
          background: linear-gradient(90deg, #ff2a3b, #ff8400);
          border: none;
          color: #000000;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(255, 42, 59, 0.5);
        }

        .hero-btn-repeat {
          padding: 12px 18px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .preview-status-bar {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
          font-size: 11px;
          color: #94a3b8;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
        }

        /* Right Column: DEV Studio Controls */
        .dev-studio-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sidebar-header {
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .sidebar-desc {
          margin: 0;
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.4;
        }

        .panel-box {
          padding: 14px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .preset-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .preset-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .preset-btn {
          padding: 7px 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }

        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .player-box {
          background: rgba(255, 42, 59, 0.06);
          border: 1px solid rgba(255, 42, 59, 0.25);
        }

        .card-box {
          background: rgba(241, 201, 92, 0.06);
          border: 1px solid rgba(241, 201, 92, 0.25);
        }

        .panel-header-row {
          display: flex;
          align-items: center;
          justifyContent: space-between;
        }

        .panel-box-title {
          font-size: 11.5px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .text-red { color: #ff4d5a; }
        .text-gold { color: #f1c95c; }

        .reset-mini-btn {
          padding: 2px 7px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94a3b8;
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .control-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #cbd5e1;
        }

        .val-badge {
          font-family: monospace;
          font-weight: 900;
        }

        .range-input {
          width: 100%;
          cursor: pointer;
        }

        .range-red { accent-color: #ff2a3b; }
        .range-gold { accent-color: #f1c95c; }

        .copy-config-btn {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .copy-config-btn:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .json-readout-box {
          padding: 12px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .readout-title {
          font-size: 10px;
          font-weight: 900;
          color: #38bdf8;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }

        .json-readout-box pre {
          margin: 0;
          font-family: monospace;
          font-size: 10.5px;
          color: #cbd5e1;
          line-height: 1.4;
        }

        @media (max-width: 1100px) {
          .studio-container {
            grid-template-columns: 1fr;
          }
          .cinematic-viewport {
            height: 480px;
          }
        }
      `}</style>
    </div>
  );
}
