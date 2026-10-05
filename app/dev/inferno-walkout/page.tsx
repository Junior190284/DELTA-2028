"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  Flame, 
  Sparkles, 
  Crown, 
  Play, 
  Sliders, 
  ArrowLeft,
  RotateCcw,
  FastForward,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Tv,
  Layers,
  Settings2
} from "lucide-react";
import InfernoWalkoutReveal, { InfernoWalkoutRevealRef } from "@/components/InfernoWalkoutReveal";
import { InfernoWalkoutData } from "@/lib/cards/walkout-config";

export default function InfernoWalkoutDevPage() {
  const walkoutRef = useRef<InfernoWalkoutRevealRef | null>(null);

  // Live transform states for real-time adjustments
  const [playerX, setPlayerX] = useState(-110);
  const [playerY, setPlayerY] = useState(0);
  const [playerScale, setPlayerScale] = useState(1.0);

  const [cardX, setCardX] = useState(100);
  const [cardY, setCardY] = useState(0);
  const [cardScale, setCardScale] = useState(1.05);

  // Assets and card data
  const [videoSrc, setVideoSrc] = useState("/media/walkouts/inferno-bg.mp4");
  const [playerImgSrc, setPlayerImgSrc] = useState("/demo/player-cutout.png");
  const [cardImgSrc, setCardImgSrc] = useState("/demo/inferno-card.png");
  const [playerName, setPlayerName] = useState("Ryszard Rybacki");
  const [rating, setRating] = useState(99);
  const [position, setPosition] = useState("RW / NAPASTNIK");

  // UI modes
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Dynamic Walkout Data Object
  const walkoutData: InfernoWalkoutData = {
    rarity: "INFERNO",
    playerName,
    rating,
    position,
    teamName: "K.S. DELTA WARSZAWA 2018 GM",
    playerImage: playerImgSrc,
    cardImage: cardImgSrc,
    backgroundVideo: videoSrc,
    clubLogo: "/demo/delta-logo.png",
    accentColor: "#ff2a3b",
    playerTransform: {
      x: playerX,
      y: playerY,
      scale: playerScale,
      rotate: 0
    },
    cardTransform: {
      x: cardX,
      y: cardY,
      scale: cardScale,
      rotate: 0
    }
  };

  const handlePlayWalkout = () => {
    walkoutRef.current?.play();
  };

  const handleReplay = () => {
    walkoutRef.current?.replay();
  };

  const handleSkipToReveal = () => {
    walkoutRef.current?.skipToReveal();
  };

  const handleResetTransforms = () => {
    setPlayerX(-110);
    setPlayerY(0);
    setPlayerScale(1.0);
    setCardX(100);
    setCardY(0);
    setCardScale(1.05);
  };

  const handleCopyConfig = () => {
    const config = JSON.stringify({
      playerTransform: { x: playerX, y: playerY, scale: playerScale },
      cardTransform: { x: cardX, y: cardY, scale: cardScale }
    }, null, 2);

    navigator.clipboard.writeText(config);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      style={{
        minHeight: "100vh",
        background: "#030712",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflowX: "hidden"
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "12px 24px"
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link 
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#94a3b8",
                fontSize: "12px",
                textDecoration: "none"
              }}
            >
              <ArrowLeft size={14} /> Powrót
            </Link>
            <div style={{ height: "16px", width: "1px", background: "rgba(255,255,255,0.15)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Flame size={18} style={{ color: "#ff2a3b" }} />
              <span style={{ fontWeight: 900, fontSize: "14px", letterSpacing: "0.5px" }}>
                INFERNO WALKOUT REVEAL • STUDIO DEV
              </span>
              <span 
                style={{
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 900
                }}
              >
                PROTOTYP
              </span>
            </div>
          </div>

          {/* Quick Action Trigger Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handlePlayWalkout}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "linear-gradient(90deg, #ff2a3b, #ff8400)",
                border: "none",
                color: "#000000",
                fontSize: "12px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(255, 42, 59, 0.4)"
              }}
            >
              <Play size={14} fill="#000" />
              <span>PLAY WALKOUT</span>
            </button>

            <button
              type="button"
              onClick={handleReplay}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer"
              }}
            >
              <RotateCcw size={14} />
              <span>REPLAY</span>
            </button>

            <button
              type="button"
              onClick={handleSkipToReveal}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#f1c95c",
                fontSize: "12px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer"
              }}
            >
              <FastForward size={14} />
              <span>SKIP TO REVEAL</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer"
              }}
              title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isFullscreen ? "OKNO" : "FULLSCREEN"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isFullscreen ? "1fr" : "1fr 380px", gap: "20px" }}>
          
          {/* Main Walkout Stage Area */}
          <div 
            style={{
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#000000",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              height: isFullscreen ? "calc(100vh - 100px)" : "720px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <InfernoWalkoutReveal
              ref={walkoutRef}
              data={walkoutData}
              isEmbedded={true}
              onCollect={() => {
                alert("Dodano ultra kartę INFERNO do Twojego albumu!");
              }}
            />

            {/* Floating Quick Controls on Fullscreen mode */}
            {isFullscreen && (
              <div 
                style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "20px",
                  zIndex: 999,
                  background: "rgba(0, 0, 0, 0.85)",
                  backdropFilter: "blur(10px)",
                  padding: "12px 18px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
              >
                <button
                  type="button"
                  onClick={handlePlayWalkout}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "#ff2a3b",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  PLAY
                </button>
                <button
                  type="button"
                  onClick={handleReplay}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  REPLAY
                </button>
                <button
                  type="button"
                  onClick={handleSkipToReveal}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#f1c95c",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  SKIP TO REVEAL
                </button>
                <div style={{ color: "#94a3b8", fontSize: "11px", fontFamily: "monospace" }}>
                  P: ({playerX}px, {playerY}px, {playerScale}x) | C: ({cardX}px, {cardY}px, {cardScale}x)
                </div>
              </div>
            )}
          </div>

          {/* Right Column: DEV Control Panel */}
          {!isFullscreen && (
            <div 
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              {/* DEV Panel Card */}
              <div 
                style={{
                  padding: "20px",
                  borderRadius: "18px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sliders size={16} style={{ color: "#f1c95c" }} />
                    <span style={{ fontSize: "13px", fontWeight: 900, color: "#ffffff", letterSpacing: "0.5px" }}>
                      PANEL DEV • TRANSFORMACJE
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetTransforms}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#94a3b8",
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Reset
                  </button>
                </div>

                {/* Main 3 Action Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handlePlayWalkout}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      background: "linear-gradient(90deg, #ff2a3b, #ff8400)",
                      border: "none",
                      color: "#000000",
                      fontSize: "12px",
                      fontWeight: 950,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <Play size={14} fill="#000" />
                    <span>PLAY WALKOUT</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReplay}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>REPLAY</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipToReveal}
                    style={{
                      gridColumn: "span 2",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "rgba(241, 201, 92, 0.12)",
                      border: "1px solid rgba(241, 201, 92, 0.3)",
                      color: "#f1c95c",
                      fontSize: "12px",
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <FastForward size={14} />
                    <span>SKIP TO REVEAL (9s+ HERO SHOT)</span>
                  </button>
                </div>

                {/* PLAYER Transform Sliders */}
                <div 
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    background: "rgba(255, 42, 59, 0.06)",
                    border: "1px solid rgba(255, 42, 59, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#ff4d5a", letterSpacing: "0.5px" }}>
                      PLAYER (PNG CUTOUT)
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace" }}>
                      X: {playerX}px | Y: {playerY}px | {playerScale}x
                    </span>
                  </div>

                  {/* Player X */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>
                      <span>Pozycja X:</span>
                      <b style={{ color: "#ff4d5a", fontFamily: "monospace" }}>{playerX} px</b>
                    </div>
                    <input 
                      type="range" 
                      min="-400" 
                      max="400" 
                      value={playerX} 
                      onChange={e => setPlayerX(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#ff2a3b" }}
                    />
                  </div>

                  {/* Player Y */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>
                      <span>Pozycja Y:</span>
                      <b style={{ color: "#ff4d5a", fontFamily: "monospace" }}>{playerY} px</b>
                    </div>
                    <input 
                      type="range" 
                      min="-300" 
                      max="300" 
                      value={playerY} 
                      onChange={e => setPlayerY(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#ff2a3b" }}
                    />
                  </div>

                  {/* Player Scale */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>
                      <span>Skala (Scale):</span>
                      <b style={{ color: "#ff4d5a", fontFamily: "monospace" }}>{playerScale}x</b>
                    </div>
                    <input 
                      type="range" 
                      min="0.4" 
                      max="2.5" 
                      step="0.05"
                      value={playerScale} 
                      onChange={e => setPlayerScale(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#ff2a3b" }}
                    />
                  </div>
                </div>

                {/* CARD Transform Sliders */}
                <div 
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    background: "rgba(241, 201, 92, 0.06)",
                    border: "1px solid rgba(241, 201, 92, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#f1c95c", letterSpacing: "0.5px" }}>
                      CARD (3D CARD)
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace" }}>
                      X: {cardX}px | Y: {cardY}px | {cardScale}x
                    </span>
                  </div>

                  {/* Card X */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>
                      <span>Pozycja X:</span>
                      <b style={{ color: "#f1c95c", fontFamily: "monospace" }}>{cardX} px</b>
                    </div>
                    <input 
                      type="range" 
                      min="-400" 
                      max="400" 
                      value={cardX} 
                      onChange={e => setCardX(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#f1c95c" }}
                    />
                  </div>

                  {/* Card Y */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>
                      <span>Pozycja Y:</span>
                      <b style={{ color: "#f1c95c", fontFamily: "monospace" }}>{cardY} px</b>
                    </div>
                    <input 
                      type="range" 
                      min="-300" 
                      max="300" 
                      value={cardY} 
                      onChange={e => setCardY(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#f1c95c" }}
                    />
                  </div>

                  {/* Card Scale */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "4px" }}>
                      <span>Skala (Scale):</span>
                      <b style={{ color: "#f1c95c", fontFamily: "monospace" }}>{cardScale}x</b>
                    </div>
                    <input 
                      type="range" 
                      min="0.4" 
                      max="2.5" 
                      step="0.05"
                      value={cardScale} 
                      onChange={e => setCardScale(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#f1c95c" }}
                    />
                  </div>
                </div>

                {/* Copy JSON Button */}
                <button
                  type="button"
                  onClick={handleCopyConfig}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer"
                  }}
                >
                  {isCopied ? <Check size={14} style={{ color: "#22c55e" }} /> : <Copy size={14} />}
                  <span>{isCopied ? "SKOPIOWANO DO SCHOWKA!" : "KOPIUJ WARTOŚCI TRANSFORMS"}</span>
                </button>
              </div>

              {/* Assets & Timeline Info Card */}
              <div 
                style={{
                  padding: "16px 20px",
                  borderRadius: "18px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "11px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <span style={{ fontWeight: 900, color: "#38bdf8", letterSpacing: "0.5px" }}>
                  AKTYWNE ASSETY DEMO:
                </span>
                <div style={{ color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px", fontFamily: "monospace" }}>
                  <div>🎬 Wideo: <span style={{ color: "#ffffff" }}>{videoSrc}</span></div>
                  <div>👤 Cutout: <span style={{ color: "#ffffff" }}>{playerImgSrc}</span></div>
                  <div>🃏 Karta: <span style={{ color: "#ffffff" }}>{cardImgSrc}</span></div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginTop: "4px" }}>
                  <span style={{ fontWeight: 900, color: "#f1c95c" }}>SEKWENCJA REVEALU:</span>
                  <ul style={{ margin: "6px 0 0 16px", padding: 0, color: "#94a3b8", lineHeight: 1.5 }}>
                    <li><b>0–3 s:</b> Film cinematic bez dodatkowych elementów</li>
                    <li><b>3–5 s:</b> Rarity slam (INFERNO) z czerwonym glow</li>
                    <li><b>5–7 s:</b> Sylwetka zawodnika + rim light & cień</li>
                    <li><b>7–9 s:</b> Karta INFERNO + flash & 3D tilt</li>
                    <li><b>9 s+:</b> Finałowy hero shot + akcje</li>
                  </ul>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
