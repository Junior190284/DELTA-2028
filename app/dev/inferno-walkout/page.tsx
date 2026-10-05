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
  Check
} from "lucide-react";

type Stage = "intro" | "rarity" | "player" | "card" | "hero";

export default function InfernoWalkoutDevPage() {
  // Stage control: "intro" (0-3s), "rarity" (3-5s), "player" (5-7s), "card" (7-9s), "hero" (9s+)
  const [stage, setStage] = useState<Stage>("intro");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Live transform sliders
  const [playerX, setPlayerX] = useState<number>(-120);
  const [playerY, setPlayerY] = useState<number>(0);
  const [playerScale, setPlayerScale] = useState<number>(1.0);

  const [cardX, setCardX] = useState<number>(110);
  const [cardY, setCardY] = useState<number>(0);
  const [cardScale, setCardScale] = useState<number>(1.05);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Asset paths
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

  const startTimeline = () => {
    clearTimers();
    setStage("intro");
    setIsPlaying(true);
    setIsFlash(false);
    setCurrentTime(0);
    startTimeRef.current = Date.now();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    // Time ticker for dev UI
    const updateTicker = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);
      if (elapsed < 12) {
        animFrameRef.current = requestAnimationFrame(updateTicker);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateTicker);

    // 3.0s: Stage 2 - RARITY (INFERNO text)
    const t1 = setTimeout(() => {
      setStage("rarity");
    }, 3000);

    // 5.0s: Stage 3 - PLAYER CUTOUT
    const t2 = setTimeout(() => {
      setStage("player");
    }, 5000);

    // 7.0s: Stage 4 - INFERNO CARD
    const t3 = setTimeout(() => {
      setStage("card");
      setIsFlash(true);
      setTimeout(() => setIsFlash(false), 500);
    }, 7000);

    // 9.0s+: Stage 5 - FINAL HERO SHOT
    const t4 = setTimeout(() => {
      setStage("hero");
    }, 9000);

    timerRef.current = [t1, t2, t3, t4];
  };

  const skipToReveal = () => {
    clearTimers();
    setStage("hero");
    setCurrentTime(9.0);
    setIsFlash(false);
  };

  const copyValues = () => {
    const json = JSON.stringify({
      player: { x: playerX, y: playerY, scale: playerScale },
      card: { x: cardX, y: cardY, scale: cardScale }
    }, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    startTimeline();
    return () => clearTimers();
  }, []);

  return (
    <div className="walkout-dev-root">
      {/* ========================================================================= */}
      {/* FULLSCREEN CINEMATIC STAGE                                               */}
      {/* ========================================================================= */}
      <div className="walkout-viewport">
        {/* Layer 1: HTML5 Background Video */}
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          className="walkout-video"
          onLoadedData={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
        />

        {/* Layer 2: Cinematic Vignette & Color Grade */}
        <div className="walkout-overlay" />

        {/* Layer 3: White Flash Burst (Stage 4 Card Reveal) */}
        {isFlash && <div className="walkout-flash" />}

        {/* ========================================================================= */}
        {/* STAGE 2: 3–5s — RARITY (INFERNO)                                         */}
        {/* ========================================================================= */}
        {stage === "rarity" && (
          <div className="rarity-slam-container">
            <span className="rarity-kicker">ULTRA RARE WALKOUT</span>
            <h1 className="rarity-title">INFERNO</h1>
            <div className="rarity-meta">
              <span className="meta-pill">NAPASTNIK</span>
              <span className="meta-pill meta-rating">OVR 94</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGES 3, 4, 5: PLAYER & CARD HERO COMPOSITION                           */}
        {/* ========================================================================= */}
        {(stage === "player" || stage === "card" || stage === "hero") && (
          <div className="hero-scene-container">
            {/* Ground Spotlight Shadow */}
            <div className="ground-shadow" />

            {/* PLAYER CUTOUT PNG (5–7s, 7–9s, 9s+) */}
            <div 
              className={`player-wrapper ${stage === "player" ? "anim-player-enter" : ""}`}
              style={{
                transform: `translate(${stage === "player" ? 0 : playerX}px, ${playerY}px) scale(${stage === "player" ? 1.15 : playerScale})`,
                transition: stage === "player" ? "all 0.9s cubic-bezier(0.16, 1, 0.3, 1)" : "transform 0.15s ease-out"
              }}
            >
              <img 
                src={playerCutoutSrc} 
                alt="Zawodnik" 
                className="player-cutout-img"
              />
            </div>

            {/* INFERNO CARD (7–9s, 9s+) */}
            {(stage === "card" || stage === "hero") && (
              <div 
                className={`card-wrapper ${stage === "card" ? "anim-card-slam" : ""}`}
                style={{
                  transform: `translate(${cardX}px, ${cardY}px) scale(${cardScale}) rotateY(0deg)`,
                  transition: stage === "card" ? "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" : "transform 0.15s ease-out"
                }}
              >
                <div className="card-frame">
                  <img 
                    src={cardSrc} 
                    alt="Karta INFERNO" 
                    className="card-img"
                  />
                </div>
              </div>
            )}

            {/* FINAL HERO SHOT METADATA & BUTTONS (9s+) */}
            {stage === "hero" && (
              <div className="hero-ui-bottom anim-fade-up">
                <div className="hero-rarity-tag">
                  <Flame size={15} color="#ff2a3b" />
                  <span>INFERNO WALKOUT</span>
                </div>
                
                <h2 className="hero-player-name">RYSIO</h2>
                <div className="hero-player-sub">
                  <span>NAPASTNIK</span>
                  <span className="dot">•</span>
                  <span className="rating-num">94 OVR</span>
                  <span className="dot">•</span>
                  <span>K.S. DELTA WARSZAWA</span>
                </div>

                <div className="hero-actions">
                  <button 
                    type="button" 
                    className="btn-collect"
                    onClick={() => alert("Karta dodana do Twojej kolekcji!")}
                  >
                    <Sparkles size={16} />
                    <span>DODAJ DO KOLEKCJI</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-replay-hero"
                    onClick={startTimeline}
                  >
                    <RotateCcw size={15} />
                    <span>POWTÓRZ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DEV CONTROL PANEL (DEDICATED FOR /dev/inferno-walkout)                   */}
      {/* ========================================================================= */}
      <aside className="dev-panel">
        {/* Panel Header */}
        <div className="dev-panel-header">
          <div className="dev-title-wrap">
            <Link href="/" className="dev-back-link">
              <ArrowLeft size={13} /> Strona główna
            </Link>
            <div className="dev-title">
              <Sliders size={16} color="#f1c95c" />
              <span>PANEL DEV WALKOUT</span>
            </div>
          </div>
          <span className="dev-badge">STAGE: {stage.toUpperCase()} ({currentTime.toFixed(1)}s)</span>
        </div>

        {/* Action Buttons: PLAY WALKOUT, REPLAY, SKIP TO REVEAL */}
        <div className="dev-actions-grid">
          <button type="button" className="dev-btn btn-play" onClick={startTimeline}>
            <Play size={14} fill="#000" />
            <span>PLAY WALKOUT</span>
          </button>

          <button type="button" className="dev-btn btn-replay" onClick={startTimeline}>
            <RotateCcw size={14} />
            <span>REPLAY</span>
          </button>

          <button type="button" className="dev-btn btn-skip" onClick={skipToReveal}>
            <FastForward size={14} />
            <span>SKIP TO REVEAL</span>
          </button>
        </div>

        {/* Sliders: PLAYER */}
        <div className="dev-section player-section">
          <div className="dev-section-title">
            <span className="text-red">PLAYER (player-cutout.png)</span>
            <span className="mono-val">X: {playerX} | Y: {playerY} | {playerScale}x</span>
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>X (Lewo / Prawo):</span>
              <b>{playerX}px</b>
            </div>
            <input 
              type="range" 
              min="-400" 
              max="300" 
              value={playerX} 
              onChange={e => setPlayerX(Number(e.target.value))}
              className="accent-red"
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Y (Góra / Dół):</span>
              <b>{playerY}px</b>
            </div>
            <input 
              type="range" 
              min="-300" 
              max="300" 
              value={playerY} 
              onChange={e => setPlayerY(Number(e.target.value))}
              className="accent-red"
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>SCALE (Wielkość):</span>
              <b>{playerScale}x</b>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.2" 
              step="0.05"
              value={playerScale} 
              onChange={e => setPlayerScale(Number(e.target.value))}
              className="accent-red"
            />
          </div>
        </div>

        {/* Sliders: CARD */}
        <div className="dev-section card-section">
          <div className="dev-section-title">
            <span className="text-gold">CARD (inferno-card.png)</span>
            <span className="mono-val">X: {cardX} | Y: {cardY} | {cardScale}x</span>
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>X (Lewo / Prawo):</span>
              <b>{cardX}px</b>
            </div>
            <input 
              type="range" 
              min="-300" 
              max="400" 
              value={cardX} 
              onChange={e => setCardX(Number(e.target.value))}
              className="accent-gold"
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Y (Góra / Dół):</span>
              <b>{cardY}px</b>
            </div>
            <input 
              type="range" 
              min="-300" 
              max="300" 
              value={cardY} 
              onChange={e => setCardY(Number(e.target.value))}
              className="accent-gold"
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>SCALE (Wielkość):</span>
              <b>{cardScale}x</b>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.2" 
              step="0.05"
              value={cardScale} 
              onChange={e => setCardScale(Number(e.target.value))}
              className="accent-gold"
            />
          </div>
        </div>

        {/* Utilities & Copy Config */}
        <div className="dev-footer-actions">
          <button type="button" className="dev-util-btn" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isMuted ? "WŁĄCZ DŹWIĘK" : "WYCISZ DŹWIĘK"}</span>
          </button>

          <button type="button" className="dev-util-btn copy-btn" onClick={copyValues}>
            {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
            <span>{copied ? "SKOPIOWANO!" : "KOPIUJ WARTOŚCI"}</span>
          </button>
        </div>

        {/* Timeline Reference Helper */}
        <div className="dev-timeline-info">
          <span className="info-title">OŚ CZASU REVEALU:</span>
          <div className="info-row"><b>0–3 s:</b> Fullscreen film w tle (bez UI)</div>
          <div className="info-row"><b>3–5 s:</b> Napis INFERNO + czerwony/złoty glow</div>
          <div className="info-row"><b>5–7 s:</b> Sylwetka zawodnika + rim light & cień</div>
          <div className="info-row"><b>7–9 s:</b> Karta INFERNO + flash & 3D scale</div>
          <div className="info-row"><b>9 s+:</b> Finałowy Hero Shot (Rysio 94) + przyciski</div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* SCOPED CSS STYLES                                                        */}
      {/* ========================================================================= */}
      <style jsx>{`
        .walkout-dev-root {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #020408;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          position: relative;
        }

        /* Fullscreen Walkout Viewport */
        .walkout-viewport {
          flex: 1;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: #000000;
          display: flex;
          align-items: center;
          justifyContent: center;
        }

        .walkout-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.8) contrast(1.1);
          z-index: 1;
        }

        .walkout-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, transparent 20%, rgba(2, 4, 8, 0.45) 60%, rgba(2, 4, 8, 0.95) 100%),
                      radial-gradient(circle at 50% 60%, rgba(255, 42, 59, 0.15) 0%, transparent 70%);
          z-index: 2;
          pointer-events: none;
        }

        .walkout-flash {
          position: absolute;
          inset: 0;
          background: #ffffff;
          z-index: 80;
          animation: flash-burst 0.5s ease-out forwards;
          pointer-events: none;
        }

        @keyframes flash-burst {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }

        /* Stage 2: Rarity Slam */
        .rarity-slam-container {
          position: absolute;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: rarity-slam 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
        }

        .rarity-kicker {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 4px;
          color: #f1c95c;
          text-shadow: 0 0 12px rgba(241, 201, 92, 0.8);
          margin-bottom: 6px;
        }

        .rarity-title {
          font-size: clamp(60px, 12vw, 110px);
          font-weight: 950;
          letter-spacing: 8px;
          margin: 0;
          line-height: 1;
          background: linear-gradient(180deg, #ffffff 0%, #ff2a3b 60%, #7f0a14 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 35px rgba(255, 42, 59, 0.85)) drop-shadow(0 0 60px rgba(255, 132, 0, 0.4));
        }

        .rarity-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }

        .meta-pill {
          padding: 6px 16px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid #ff2a3b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #ffffff;
        }

        .meta-rating {
          background: linear-gradient(90deg, #ff2a3b, #ff8400);
          color: #000000;
          font-weight: 950;
          border: none;
          box-shadow: 0 0 15px rgba(255, 42, 59, 0.6);
        }

        @keyframes rarity-slam {
          0% { opacity: 0; transform: scale(2.2) translateY(-30px); filter: blur(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }

        /* Hero Scene Container */
        .hero-scene-container {
          position: relative;
          z-index: 40;
          width: 100%;
          max-width: 1000px;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          perspective: 1200px;
        }

        .ground-shadow {
          position: absolute;
          bottom: 120px;
          width: 440px;
          height: 80px;
          background: radial-gradient(ellipse, rgba(255, 42, 59, 0.45) 0%, rgba(0,0,0,0.85) 50%, transparent 70%);
          border-radius: 50%;
          filter: blur(14px);
          z-index: 5;
          pointer-events: none;
        }

        /* Player Cutout */
        .player-wrapper {
          position: absolute;
          z-index: 10;
          pointer-events: none;
          filter: drop-shadow(0 0 35px rgba(255, 42, 59, 0.75)) 
                  drop-shadow(0 15px 30px rgba(0, 0, 0, 0.9));
        }

        .player-cutout-img {
          max-height: clamp(340px, 55vh, 480px);
          max-width: 400px;
          object-fit: contain;
          display: block;
        }

        .anim-player-enter {
          animation: player-glide 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes player-glide {
          0% { opacity: 0; transform: translateY(60px) scale(0.9); filter: blur(8px) brightness(0.4); }
          100% { opacity: 1; transform: translateY(0) scale(1.15); filter: blur(0) brightness(1); }
        }

        /* Card Wrapper */
        .card-wrapper {
          position: absolute;
          z-index: 20;
          transform-style: preserve-3d;
          filter: drop-shadow(0 0 45px rgba(255, 42, 59, 0.9)) drop-shadow(0 20px 40px rgba(0, 0, 0, 0.95));
        }

        .card-frame {
          width: clamp(220px, 28vw, 290px);
          height: clamp(330px, 42vw, 430px);
          border-radius: 18px;
          overflow: hidden;
          background: #080203;
          border: 2px solid #ff2a3b;
          box-shadow: 0 0 30px rgba(255, 42, 59, 0.5);
          display: flex;
          align-items: center;
          justifyContent: center;
        }

        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .anim-card-slam {
          animation: card-slam 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes card-slam {
          0% { opacity: 0; transform: scale(2.4) rotateY(35deg); filter: brightness(2); }
          100% { opacity: 1; transform: scale(1.05) rotateY(0deg); filter: brightness(1); }
        }

        /* Stage 5: Hero UI Bottom */
        .hero-ui-bottom {
          position: absolute;
          bottom: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          z-index: 60;
        }

        .hero-rarity-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 900;
          color: #ff2a3b;
          letter-spacing: 2px;
          margin-bottom: 4px;
        }

        .hero-player-name {
          font-size: clamp(28px, 6vw, 42px);
          font-weight: 950;
          letter-spacing: 2px;
          margin: 0 0 4px 0;
          text-shadow: 0 0 25px rgba(255, 42, 59, 0.8);
          color: #ffffff;
        }

        .hero-player-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 700;
          margin-bottom: 18px;
        }

        .hero-player-sub .dot {
          color: #475569;
        }

        .hero-player-sub .rating-num {
          color: #f1c95c;
          font-weight: 900;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-collect {
          padding: 13px 26px;
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
          transition: transform 0.15s;
        }

        .btn-collect:hover {
          transform: scale(1.03);
        }

        .btn-replay-hero {
          padding: 12px 20px;
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

        .btn-replay-hero:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        .anim-fade-up {
          animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* ========================================================================= */
        /* DEV CONTROL PANEL SIDEBAR                                                */
        /* ========================================================================= */
        .dev-panel {
          width: 360px;
          height: 100%;
          background: rgba(8, 12, 22, 0.95);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 99;
          backdrop-filter: blur(12px);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
        }

        .dev-panel-header {
          display: flex;
          align-items: flex-start;
          justifyContent: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }

        .dev-back-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #64748b;
          text-decoration: none;
          margin-bottom: 4px;
        }

        .dev-back-link:hover {
          color: #94a3b8;
        }

        .dev-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .dev-badge {
          font-size: 10px;
          font-weight: 900;
          background: #ff2a3b;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
        }

        .dev-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .dev-btn {
          padding: 10px;
          border-radius: 10px;
          border: none;
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
        }

        .btn-play {
          background: linear-gradient(90deg, #ff2a3b, #ff8400);
          color: #000000;
        }

        .btn-replay {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .btn-skip {
          grid-column: span 2;
          background: rgba(241, 201, 92, 0.12);
          border: 1px solid rgba(241, 201, 92, 0.3);
          color: #f1c95c;
        }

        .dev-section {
          padding: 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .player-section {
          background: rgba(255, 42, 59, 0.06);
          border: 1px solid rgba(255, 42, 59, 0.2);
        }

        .card-section {
          background: rgba(241, 201, 92, 0.06);
          border: 1px solid rgba(241, 201, 92, 0.2);
        }

        .dev-section-title {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          font-size: 11px;
          font-weight: 900;
        }

        .text-red { color: #ff4d5a; }
        .text-gold { color: #f1c95c; }
        .mono-val { font-family: monospace; color: #94a3b8; font-size: 10px; font-weight: normal; }

        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .slider-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #cbd5e1;
        }

        .slider-label b {
          font-family: monospace;
          color: #ffffff;
        }

        input[type="range"] {
          width: 100%;
          cursor: pointer;
        }

        .accent-red { accent-color: #ff2a3b; }
        .accent-gold { accent-color: #f1c95c; }

        .dev-footer-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .dev-util-btn {
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
        }

        .copy-btn {
          color: #ffffff;
        }

        .dev-timeline-info {
          padding: 12px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-title {
          font-weight: 900;
          color: #38bdf8;
          font-size: 10px;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .info-row {
          color: #94a3b8;
          font-size: 10.5px;
          line-height: 1.4;
        }

        .info-row b {
          color: #f1c95c;
        }

        @media (max-width: 900px) {
          .walkout-dev-root {
            flex-direction: column;
            overflow-y: auto;
          }
          .walkout-viewport {
            height: 60vh;
            flex: none;
          }
          .dev-panel {
            width: 100%;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
