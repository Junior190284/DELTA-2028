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
  Move,
  Layers,
  Type,
  LayoutTemplate,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2
} from "lucide-react";

type WalkoutStage = "intro" | "rarity" | "player" | "card" | "hero";

export default function InfernoWalkoutDevPage() {
  // Stage control: "intro" (0-3s), "rarity" (3-5s), "player" (5-7s), "card" (7-9s), "hero" (9s+)
  const [stage, setStage] = useState<WalkoutStage>("hero");
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(9.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSavedLocal, setIsSavedLocal] = useState<boolean>(false);

  // 1. RARITY INFERNO Typography Transforms
  const [rarityX, setRarityX] = useState<number>(0);
  const [rarityY, setRarityY] = useState<number>(-1);
  const [rarityScale, setRarityScale] = useState<number>(1.75);

  // 2. PLAYER CUTOUT Transforms
  const [playerX, setPlayerX] = useState<number>(-21);
  const [playerY, setPlayerY] = useState<number>(-24);
  const [playerScale, setPlayerScale] = useState<number>(1.05);

  // 3. 3D CARD Transforms
  const [cardX, setCardX] = useState<number>(-2);
  const [cardY, setCardY] = useState<number>(-78);
  const [cardScale, setCardScale] = useState<number>(1.3);

  // 4. Active selection for dragging
  const [activeLayer, setActiveLayer] = useState<"player" | "card" | "rarity">("player");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number }>({ x: 0, y: 0, origX: 0, origY: 0 });

  // Player metadata
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

  // Dragging logic directly in the viewport
  const handleMouseDown = (e: React.MouseEvent, layer: "player" | "card" | "rarity") => {
    e.stopPropagation();
    setActiveLayer(layer);
    setIsDragging(true);

    let curX = 0, curY = 0;
    if (layer === "player") { curX = playerX; curY = playerY; }
    else if (layer === "card") { curX = cardX; curY = cardY; }
    else if (layer === "rarity") { curX = rarityX; curY = rarityY; }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: curX,
      origY: curY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const nextX = Math.round(dragStartRef.current.origX + deltaX);
      const nextY = Math.round(dragStartRef.current.origY + deltaY);

      if (activeLayer === "player") {
        setPlayerX(nextX);
        setPlayerY(nextY);
      } else if (activeLayer === "card") {
        setCardX(nextX);
        setCardY(nextY);
      } else if (activeLayer === "rarity") {
        setRarityX(nextX);
        setRarityY(nextY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, activeLayer]);

  const copyConfig = () => {
    const data = JSON.stringify({
      rarity: { x: rarityX, y: rarityY, scale: rarityScale },
      player: { x: playerX, y: playerY, scale: playerScale },
      card: { x: cardX, y: cardY, scale: cardScale }
    }, null, 2);
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToLocalStorage = () => {
    try {
      const data = {
        rarity: { x: rarityX, y: rarityY, scale: rarityScale },
        player: { x: playerX, y: playerY, scale: playerScale },
        card: { x: cardX, y: cardY, scale: cardScale }
      };
      localStorage.setItem("delta_inferno_walkout_v2", JSON.stringify(data));
      setIsSavedLocal(true);
      setTimeout(() => setIsSavedLocal(false), 2500);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("delta_inferno_walkout_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rarity) {
          if (parsed.rarity.x !== undefined) setRarityX(parsed.rarity.x);
          if (parsed.rarity.y !== undefined) setRarityY(parsed.rarity.y);
          if (parsed.rarity.scale !== undefined) setRarityScale(parsed.rarity.scale);
        }
        if (parsed.player) {
          if (parsed.player.x !== undefined) setPlayerX(parsed.player.x);
          if (parsed.player.y !== undefined) setPlayerY(parsed.player.y);
          if (parsed.player.scale !== undefined) setPlayerScale(parsed.player.scale);
        }
        if (parsed.card) {
          if (parsed.card.x !== undefined) setCardX(parsed.card.x);
          if (parsed.card.y !== undefined) setCardY(parsed.card.y);
          if (parsed.card.scale !== undefined) setCardScale(parsed.card.scale);
        }
      }
    } catch (e) {}

    setManualStage("hero");
    return () => clearTimers();
  }, []);

  return (
    <div className="walkout-app-root">
      
      {/* ========================================================================= */}
      {/* TOP NAVIGATION                                                           */}
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
      {/* MAIN WORKSPACE                                                            */}
      {/* ========================================================================= */}
      <div className="studio-container">
        
        {/* LEFT COLUMN: CINEMATIC SCREEN */}
        <div className="preview-screen-wrapper">
          
          {/* Stage selector bar */}
          <div className="stage-timeline-bar">
            <span className="timeline-label">KROK OSI CZASU:</span>
            {[
              { id: "intro", label: "1. Intro (0-3s)" },
              { id: "rarity", label: "2. Rarity INFERNO (3-5s)" },
              { id: "player", label: "3. Zawodnik (5-7s)" },
              { id: "card", label: "4. Karta 3D (7-9s)" },
              { id: "hero", label: "5. Finał Hero (9s+)" },
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
            
            {/* Background Video */}
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

            {/* Dark & color grading overlays */}
            <div className="cinematic-overlay" />
            {isFlash && <div className="cinematic-flash" />}

            {/* STAGE 2: RARITY SLAM (INFERNO) — WITH FULL TRANSFORM CONTROLS */}
            {stage === "rarity" && (
              <div 
                className={`rarity-slam-box ${activeLayer === "rarity" ? "layer-selected" : ""}`}
                onMouseDown={e => handleMouseDown(e, "rarity")}
                style={{
                  transform: `translate(${rarityX}px, ${rarityY}px) scale(${rarityScale})`,
                  cursor: isDragging ? "grabbing" : "grab"
                }}
              >
                <div className="drag-handle-hint">✥ Chwyć i przesuń napis</div>
                <span className="rarity-kicker-text">ULTRA RARE WALKOUT</span>
                <h1 className="rarity-huge-title">INFERNO</h1>
                <div className="rarity-pills-row">
                  <span className="pill-item">{playerPosition}</span>
                  <span className="pill-item pill-rating">OVR {playerRating}</span>
                </div>
              </div>
            )}

            {/* STAGES 3, 4, 5: HERO SCENE (PLAYER & CARD) */}
            {(stage === "player" || stage === "card" || stage === "hero") && (
              <div className="hero-multiplane-scene">
                
                {/* Ground red ambient shadow */}
                <div className="ground-glow-spotlight" />

                {/* PLAYER CUTOUT PNG */}
                <div 
                  className={`player-cutout-layer ${activeLayer === "player" ? "layer-selected" : ""}`}
                  onMouseDown={e => handleMouseDown(e, "player")}
                  style={{
                    transform: `translate(${playerX}px, ${playerY}px) scale(${playerScale})`,
                    zIndex: 10,
                    cursor: isDragging ? "grabbing" : "grab"
                  }}
                >
                  <div className="drag-handle-hint">✥ Zawodnik (X: {playerX}px, Y: {playerY}px)</div>
                  <img 
                    src={playerCutoutSrc} 
                    alt="Zawodnik Cutout" 
                    className="player-cutout-image"
                    draggable={false}
                  />
                  <div className="player-rim-light" />
                </div>

                {/* INFERNO CARD */}
                {(stage === "card" || stage === "hero") && (
                  <div 
                    className={`card-3d-layer ${activeLayer === "card" ? "layer-selected" : ""}`}
                    onMouseDown={e => handleMouseDown(e, "card")}
                    style={{
                      transform: `translate(${cardX}px, ${cardY}px) scale(${cardScale})`,
                      zIndex: 20,
                      cursor: isDragging ? "grabbing" : "grab"
                    }}
                  >
                    <div className="drag-handle-hint">✥ Karta (X: {cardX}px, Y: {cardY}px)</div>
                    <div className="card-outer-box">
                      <img 
                        src={cardSrc} 
                        alt="Karta INFERNO" 
                        className="card-main-image"
                        draggable={false}
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

          {/* Status info bar */}
          <div className="preview-status-bar">
            <div className="status-indicator">
              <span className="status-dot" />
              <span>Wideo: <b>public/media/walkouts/inferno-bg.mp4</b></span>
            </div>
            <div className="status-timing">
              💡 <b>Wskazówka:</b> Możesz przesuwać elementy <b>suwakami</b> po prawej lub <b>chwytając myszką</b> bezpośrednio na ekranie!
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DEV CONTROL PANEL */}
        <aside className="dev-studio-sidebar">
          
          <div className="sidebar-header">
            <div className="sidebar-title">
              <Sliders size={18} color="#f1c95c" />
              <span>STUDIO POZYCJI ELEMENTÓW</span>
            </div>
            <p className="sidebar-desc">
              Dopasuj pozycję i wielkość napisu INFERNO, zawodnika oraz karty.
            </p>
          </div>

          {/* 1. RARITY INFERNO SLIDERS */}
          <div className="panel-box rarity-box">
            <div className="panel-header-row">
              <span className="panel-box-title text-orange">
                <Type size={14} /> 1. NAPIS RARITY (INFERNO):
              </span>
              <button 
                type="button" 
                className="reset-mini-btn"
                onClick={() => { setRarityX(0); setRarityY(-1); setRarityScale(1.75); }}
              >
                Resetuj
              </button>
            </div>

            {/* Rarity X */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja X (Lewo ⟷ Prawo):</span>
                <div className="input-row">
                  <input 
                    type="number" 
                    value={rarityX} 
                    onChange={e => setRarityX(Number(e.target.value))}
                    className="num-input"
                  />
                  <span className="unit">px</span>
                </div>
              </div>
              <input 
                type="range" 
                min="-600" 
                max="600" 
                value={rarityX} 
                onChange={e => setRarityX(Number(e.target.value))}
                className="range-input range-orange"
              />
            </div>

            {/* Rarity Y */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja Y (Góra ⟷ Dół):</span>
                <div className="input-row">
                  <input 
                    type="number" 
                    value={rarityY} 
                    onChange={e => setRarityY(Number(e.target.value))}
                    className="num-input"
                  />
                  <span className="unit">px</span>
                </div>
              </div>
              <input 
                type="range" 
                min="-400" 
                max="400" 
                value={rarityY} 
                onChange={e => setRarityY(Number(e.target.value))}
                className="range-input range-orange"
              />
            </div>

            {/* Rarity Scale */}
            <div className="control-group">
              <div className="control-label">
                <span>Skala napisu:</span>
                <span className="val-badge text-orange">{rarityScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="2.5" 
                step="0.05"
                value={rarityScale} 
                onChange={e => setRarityScale(Number(e.target.value))}
                className="range-input range-orange"
              />
            </div>
          </div>

          {/* 2. PLAYER POSITION SLIDERS */}
          <div className="panel-box player-box">
            <div className="panel-header-row">
              <span className="panel-box-title text-red">
                <Move size={14} /> 2. ZAWODNIK (player-cutout.png):
              </span>
              <button 
                type="button" 
                className="reset-mini-btn"
                onClick={() => { setPlayerX(-21); setPlayerY(-24); setPlayerScale(1.05); }}
              >
                Resetuj
              </button>
            </div>

            {/* Player X */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja X (Lewo ⟷ Prawo):</span>
                <div className="input-row">
                  <input 
                    type="number" 
                    value={playerX} 
                    onChange={e => setPlayerX(Number(e.target.value))}
                    className="num-input"
                  />
                  <span className="unit">px</span>
                </div>
              </div>
              <input 
                type="range" 
                min="-800" 
                max="800" 
                value={playerX} 
                onChange={e => setPlayerX(Number(e.target.value))}
                className="range-input range-red"
              />
            </div>

            {/* Player Y */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja Y (Góra ⟷ Dół):</span>
                <div className="input-row">
                  <input 
                    type="number" 
                    value={playerY} 
                    onChange={e => setPlayerY(Number(e.target.value))}
                    className="num-input"
                  />
                  <span className="unit">px</span>
                </div>
              </div>
              <input 
                type="range" 
                min="-500" 
                max="500" 
                value={playerY} 
                onChange={e => setPlayerY(Number(e.target.value))}
                className="range-input range-red"
              />
            </div>

            {/* Player Scale */}
            <div className="control-group">
              <div className="control-label">
                <span>Skala (Wielkość):</span>
                <span className="val-badge text-red">{playerScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.3" 
                max="2.5" 
                step="0.05"
                value={playerScale} 
                onChange={e => setPlayerScale(Number(e.target.value))}
                className="range-input range-red"
              />
            </div>
          </div>

          {/* 3. CARD POSITION SLIDERS */}
          <div className="panel-box card-box">
            <div className="panel-header-row">
              <span className="panel-box-title text-gold">
                <Layers size={14} /> 3. KARTA 3D (inferno-card.png):
              </span>
              <button 
                type="button" 
                className="reset-mini-btn"
                onClick={() => { setCardX(-2); setCardY(-78); setCardScale(1.3); }}
              >
                Resetuj
              </button>
            </div>

            {/* Card X */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja X (Lewo ⟷ Prawo):</span>
                <div className="input-row">
                  <input 
                    type="number" 
                    value={cardX} 
                    onChange={e => setCardX(Number(e.target.value))}
                    className="num-input"
                  />
                  <span className="unit">px</span>
                </div>
              </div>
              <input 
                type="range" 
                min="-800" 
                max="800" 
                value={cardX} 
                onChange={e => setCardX(Number(e.target.value))}
                className="range-input range-gold"
              />
            </div>

            {/* Card Y */}
            <div className="control-group">
              <div className="control-label">
                <span>Pozycja Y (Góra ⟷ Dół):</span>
                <div className="input-row">
                  <input 
                    type="number" 
                    value={cardY} 
                    onChange={e => setCardY(Number(e.target.value))}
                    className="num-input"
                  />
                  <span className="unit">px</span>
                </div>
              </div>
              <input 
                type="range" 
                min="-500" 
                max="500" 
                value={cardY} 
                onChange={e => setCardY(Number(e.target.value))}
                className="range-input range-gold"
              />
            </div>

            {/* Card Scale */}
            <div className="control-group">
              <div className="control-label">
                <span>Skala (Wielkość):</span>
                <span className="val-badge text-gold">{cardScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.3" 
                max="2.5" 
                step="0.05"
                value={cardScale} 
                onChange={e => setCardScale(Number(e.target.value))}
                className="range-input range-gold"
              />
            </div>
          </div>

          {/* SAVE & COPY BUTTONS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button 
              type="button" 
              className="copy-config-btn save-local-btn" 
              onClick={saveToLocalStorage}
              style={{
                background: isSavedLocal ? "#15803d" : "linear-gradient(90deg, #ff2a3b, #ff8400)",
                color: "#000000",
                fontWeight: 950,
                border: "none"
              }}
            >
              {isSavedLocal ? <Check size={16} color="#000" /> : <Sparkles size={16} />}
              <span>{isSavedLocal ? "ZAPISANO W PAMIĘCI!" : "💾 ZAPISZ USTAWIENIA W PAMIĘCI"}</span>
            </button>

            <button type="button" className="copy-config-btn" onClick={copyConfig}>
              {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
              <span>{copied ? "SKOPIOWANO DO SCHOWKA!" : "📋 KOPIUJ WSPÓŁRZĘDNE (JSON)"}</span>
            </button>
          </div>

          {/* LIVE JSON READOUT */}
          <div className="json-readout-box">
            <span className="readout-title">WSPÓŁRZĘDNE (JSON):</span>
            <pre>
{JSON.stringify({
  rarity: { x: rarityX, y: rarityY, scale: rarityScale },
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

        /* Top Navigation */
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
          grid-template-columns: 1fr 410px;
          padding: 20px;
          gap: 20px;
          max-width: 1650px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        /* Left Column */
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

        /* Viewport */
        .cinematic-viewport {
          height: 660px;
          background: #000000;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
          user-select: none;
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

        /* Drag Handles and Selection Highlights */
        .layer-selected {
          outline: 2px dashed rgba(255, 255, 255, 0.6);
          outline-offset: 4px;
        }

        .drag-handle-hint {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #f1c95c;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .player-cutout-layer:hover .drag-handle-hint,
        .card-3d-layer:hover .drag-handle-hint,
        .rarity-slam-box:hover .drag-handle-hint {
          opacity: 1;
        }

        /* Rarity Slam Box */
        .rarity-slam-box {
          position: absolute;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 10px;
          border-radius: 12px;
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

        /* Hero Multiplane Scene */
        .hero-multiplane-scene {
          position: relative;
          z-index: 40;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1200px;
        }

        .ground-glow-spotlight {
          position: absolute;
          bottom: 110px;
          width: 460px;
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
          filter: drop-shadow(0 0 40px rgba(255, 42, 59, 0.85)) drop-shadow(0 20px 30px rgba(0,0,0,0.9));
          border-radius: 12px;
        }

        .player-cutout-image {
          max-height: 440px;
          max-width: 380px;
          object-fit: contain;
          display: block;
          pointer-events: none;
        }

        /* Card Layer */
        .card-3d-layer {
          position: absolute;
          filter: drop-shadow(0 0 45px rgba(255, 42, 59, 0.95)) drop-shadow(0 25px 40px rgba(0,0,0,0.95));
          transform-style: preserve-3d;
          border-radius: 18px;
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
          pointer-events: none;
        }

        .card-main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Hero Details */
        .hero-bottom-details {
          position: absolute;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          z-index: 60;
          pointer-events: auto;
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
          font-size: clamp(26px, 5vw, 36px);
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
          margin: 4px 0 14px 0;
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
          gap: 10px;
        }

        .hero-btn-collect {
          padding: 11px 22px;
          border-radius: 12px;
          background: linear-gradient(90deg, #ff2a3b, #ff8400);
          border: none;
          color: #000000;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(255, 42, 59, 0.5);
        }

        .hero-btn-repeat {
          padding: 11px 16px;
          border-radius: 12px;
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

        /* Sidebar Controls */
        .dev-studio-sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          padding-right: 4px;
        }

        .sidebar-header {
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .sidebar-desc {
          margin: 0;
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.35;
        }

        .panel-box {
          padding: 12px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rarity-box {
          background: rgba(255, 132, 0, 0.06);
          border: 1px solid rgba(255, 132, 0, 0.25);
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
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .text-orange { color: #ff8400; }
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
          align-items: center;
          font-size: 10.5px;
          color: #cbd5e1;
        }

        .input-row {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .num-input {
          width: 55px;
          padding: 2px 4px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #ffffff;
          font-size: 11px;
          font-family: monospace;
          font-weight: 800;
          text-align: right;
        }

        .unit {
          font-size: 10px;
          color: #64748b;
          font-family: monospace;
        }

        .val-badge {
          font-family: monospace;
          font-weight: 900;
          font-size: 11px;
        }

        .range-input {
          width: 100%;
          cursor: pointer;
        }

        .range-orange { accent-color: #ff8400; }
        .range-red { accent-color: #ff2a3b; }
        .range-gold { accent-color: #f1c95c; }

        .copy-config-btn {
          padding: 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
        }

        .json-readout-box {
          padding: 10px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .readout-title {
          font-size: 9.5px;
          font-weight: 900;
          color: #38bdf8;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 2px;
        }

        .json-readout-box pre {
          margin: 0;
          font-family: monospace;
          font-size: 10px;
          color: #cbd5e1;
          line-height: 1.35;
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
