"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Stage3DEngine } from "./Stage3DEngine";
import { Card3DEngine } from "./Card3DEngine";
import { useWalkoutEngine, WalkoutPhase } from "./walkoutEngine";
import { CARD_VISUAL_THEMES } from "./themes";
import { TEST_PLAYERS } from "./mockData";
import { CardVisualType, CollectionCategory, PlayerCardData } from "./types";
import { Volume2, VolumeX, Play, Pause, RotateCcw, FastForward, Eye, RotateCw } from "lucide-react";

const CATEGORIES: { category: CollectionCategory; visualType: CardVisualType; label: string; badge: string; color: string }[] = [
  { category: "INFERNO", visualType: "INFERNO_ULTRA", label: "Inferno Ultra", badge: "ULTRA 1/1", color: "#ff3b1e" },
  { category: "GOLD", visualType: "GOLD_MASTER", label: "Gold Master", badge: "GOLD", color: "#f59e0b" },
  { category: "MATCHDAY", visualType: "MATCHDAY_HERO", label: "Matchday Hero", badge: "MATCHDAY", color: "#38bdf8" },
  { category: "LEGEND", visualType: "DELTA_ICON", label: "Delta Icon (Legend)", badge: "ICON", color: "#a855f7" },
  { category: "RARE", visualType: "TRAINING_HERO", label: "Training Hero (Rare)", badge: "RARE", color: "#10b981" },
  { category: "COMMON", visualType: "BASE", label: "Base (Common)", badge: "COMMON", color: "#94a3b8" }
];

export function CollectionWalkoutLab() {
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string>("rybacki");
  const [player, setPlayer] = useState<PlayerCardData>(TEST_PLAYERS.rybacki);
  const [currentVisualType, setCurrentVisualType] = useState<CardVisualType>("INFERNO_ULTRA");
  const [lightingMode, setLightingMode] = useState<"dynamic" | "stadium" | "stealth">("dynamic");

  // Read initial URL query params safely
  const initialParams = useMemo(() => {
    if (typeof window === "undefined") return { player: null, theme: null, time: null };
    const p = new URLSearchParams(window.location.search);
    const parsedTime = p.get("time") !== null ? parseFloat(p.get("time")!) : null;
    return {
      player: p.get("player"),
      theme: p.get("theme") as CardVisualType | null,
      time: parsedTime !== null && !isNaN(parsedTime) ? parsedTime : null
    };
  }, []);

  // Sync with URL query parameters on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { player: pParam, theme: tParam, time: timeParam } = initialParams;

    if (pParam && TEST_PLAYERS[pParam]) {
      setSelectedPlayerKey(pParam);
      setPlayer({ ...TEST_PLAYERS[pParam] });
      if (tParam && CARD_VISUAL_THEMES[tParam]) {
        setCurrentVisualType(tParam);
        setPlayer((prev) => ({ ...prev, visualType: tParam, rarity: CARD_VISUAL_THEMES[tParam].category }));
      } else {
        setCurrentVisualType(TEST_PLAYERS[pParam].visualType);
      }
    } else if (tParam && CARD_VISUAL_THEMES[tParam]) {
      setCurrentVisualType(tParam);
      setPlayer((prev) => ({ ...prev, visualType: tParam, rarity: CARD_VISUAL_THEMES[tParam].category }));
    }

    if (timeParam !== null) {
      walkout.seek(timeParam);
    }
  }, []);

  const currentTheme = CARD_VISUAL_THEMES[currentVisualType] || CARD_VISUAL_THEMES.INFERNO_ULTRA;

  // Universal Walkout Controller
  const walkout = useWalkoutEngine({
    themeId: currentVisualType,
    rarity: player.rarity,
    autoStart: initialParams.time === null,
    initialTime: initialParams.time ?? 0
  });

  // Switch Theme
  const handleSelectTheme = useCallback((vType: CardVisualType, cat: CollectionCategory) => {
    setCurrentVisualType(vType);
    setPlayer((prev) => ({
      ...prev,
      visualType: vType,
      rarity: cat
    }));
    walkout.replay();
  }, [walkout]);

  // Switch Player
  const handleSelectPlayer = useCallback((key: string) => {
    setSelectedPlayerKey(key);
    const mock = TEST_PLAYERS[key];
    if (mock) {
      setPlayer({ ...mock });
      setCurrentVisualType(mock.visualType);
      walkout.replay();
    }
  }, [walkout]);

  // Format mm:ss.d
  const formattedTime = useMemo(() => {
    const s = Math.floor(walkout.currentTime);
    const ms = Math.floor((walkout.currentTime % 1) * 10);
    return `00:${s.toString().padStart(2, "0")}.${ms}`;
  }, [walkout.currentTime]);

  const phaseTitleMap: Record<WalkoutPhase, string> = {
    intro: "0–3s • Dark Awakening",
    activation: "3–7s • Thematic Charging",
    reveal: "7–10s • 3D Spin Reveal",
    hero: "10–12s • Hero Shot",
    completed: "12s+ • Interactive Hero"
  };

  const isPostReveal = walkout.phase === "hero" || walkout.phase === "completed";

  return (
    <div style={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#020307",
      color: "#ffffff"
    }}>
      {/* 1. UNIVERSAL STAGE ENGINE INSTANCE */}
      <Stage3DEngine
        theme={currentTheme}
        lightingMode={lightingMode}
        isShockwaving={walkout.isShockwaving}
        isFlashing={walkout.isFlashing}
        isPulsing={walkout.isPulsing}
        isScreenShaking={walkout.isScreenShaking}
        stadiumZoom={walkout.currentTime > 0}
        ribbonText={`${currentTheme.displayName} • ${player.surname}`}
      >
        <div style={{
          position: "relative",
          zIndex: 10,
          transform: walkout.phase === "hero" || walkout.phase === "completed" ? "scale(1.15)" : "scale(1.0)",
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <Card3DEngine
            data={player}
            theme={currentTheme}
            yaw={walkout.yaw}
            pitch={walkout.pitch}
            isFlipped={walkout.isFlipped}
            interactive={isPostReveal}
            autoRotate={walkout.autoRotate}
            isRevealing={walkout.phase === "reveal"}
            onRotationChange={(y, p) => {
              walkout.setYaw(y);
              walkout.setPitch(p);
            }}
          />
        </div>
      </Stage3DEngine>

      {/* 2. TOP HUD: Theme Selector & Quick Links */}
      <header style={{
        position: "absolute",
        top: 16,
        left: 20,
        right: 20,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 30,
        pointerEvents: "auto",
        gap: 12
      }}>
        {/* Title & Back Link */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/lab/collection-3d-engine"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.15)",
              textDecoration: "none",
              letterSpacing: "0.05em"
            }}
          >
            ← Showroom Kart
          </Link>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: currentTheme.styling.primaryColor,
                boxShadow: `0 0 10px ${currentTheme.styling.primaryColor}`
              }} />
              <h1 style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: 0,
                color: "#ffffff"
              }}>
                Universal Walkout Engine (Etap 3)
              </h1>
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {currentTheme.displayName} • {player.surname} (#{player.shirtNumber} {player.position})
            </span>
          </div>
        </div>

        {/* Categories Bar */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {CATEGORIES.map((cat) => {
            const isActive = currentVisualType === cat.visualType;
            return (
              <button
                key={cat.visualType}
                type="button"
                onClick={() => handleSelectTheme(cat.visualType, cat.category)}
                style={{
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: isActive ? 800 : 600,
                  borderRadius: 6,
                  border: isActive ? `1.5px solid ${cat.color}` : "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.5)",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {cat.badge}
              </button>
            );
          })}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={walkout.toggleMute}
            aria-label={walkout.isMuted ? "Włącz dźwięk walkoutu" : "Wycisz dźwięk walkoutu"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 6,
              border: walkout.isMuted ? "1px solid rgba(255,255,255,0.15)" : `1.5px solid ${currentTheme.styling.primaryColor}`,
              backgroundColor: walkout.isMuted ? "rgba(0,0,0,0.6)" : currentTheme.styling.primaryColor,
              color: "#ffffff",
              cursor: "pointer",
              marginLeft: 6
            }}
          >
            {walkout.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{walkout.isMuted ? "DŹWIĘK WYŁ." : "DŹWIĘK WŁ."}</span>
          </button>

          {/* Real Browser Telemetry Pill */}
          <div
            title="Rzeczywisty pomiar klatek na sekundę w przeglądarce"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 700,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: walkout.fps >= 50 ? "#4ade80" : walkout.fps >= 30 ? "#facc15" : "#f87171",
              marginLeft: 4
            }}
          >
            <span>{walkout.fps} FPS</span>
            {walkout.frameDrops > 0 && (
              <span style={{ color: "#f87171" }}>({walkout.frameDrops} drop)</span>
            )}
          </div>
        </div>
      </header>

      {/* 3. RIGHT PANEL: Player Presets & Lighting Mode */}
      <aside style={{
        position: "absolute",
        top: 72,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 30,
        maxWidth: 240,
        pointerEvents: "auto"
      }}>
        {/* Player Selector */}
        <div style={{
          backgroundColor: "rgba(10, 15, 25, 0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 8,
          padding: 10,
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
            Zawodnik Testowy
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(TEST_PLAYERS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPlayer(key)}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  textAlign: "left",
                  borderRadius: 4,
                  backgroundColor: selectedPlayerKey === key ? "rgba(255,255,255,0.12)" : "transparent",
                  color: selectedPlayerKey === key ? "#ffffff" : "#94a3b8",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {p.surname} ({p.position} {p.ovr})
              </button>
            ))}
          </div>
        </div>

        {/* Lighting Mode Selector */}
        <div style={{
          backgroundColor: "rgba(10, 15, 25, 0.75)",
          backdropFilter: "blur(12px)",
          borderRadius: 8,
          padding: 10,
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
            Oświetlenie Stadionu
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["dynamic", "stadium", "stealth"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLightingMode(mode)}
                style={{
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 10,
                  fontWeight: lightingMode === mode ? 700 : 500,
                  borderRadius: 4,
                  border: lightingMode === mode ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
                  backgroundColor: lightingMode === mode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
                  color: lightingMode === mode ? "#ffffff" : "#64748b",
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 4. BOTTOM DOCK: Playback Controls & Scrubber */}
      <footer style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: "92%",
        maxWidth: 820,
        backgroundColor: "rgba(10, 15, 25, 0.85)",
        backdropFilter: "blur(16px)",
        borderRadius: 12,
        padding: "12px 18px",
        border: "1px solid rgba(255,255,255,0.1)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)"
      }}>
        {/* Controls Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={walkout.isPlaying ? walkout.pause : walkout.play}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: currentTheme.styling.primaryColor,
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: `0 0 12px ${currentTheme.styling.primaryColor}`
              }}
            >
              {walkout.isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
            </button>

            {/* Replay */}
            <button
              type="button"
              onClick={walkout.replay}
              style={{
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <RotateCcw size={12} />
              <span>Od Nowa</span>
            </button>

            {/* Skip */}
            <button
              type="button"
              onClick={walkout.skip}
              style={{
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <FastForward size={12} />
              <span>Pomiń (Skip)</span>
            </button>
          </div>

          {/* Phase Badge & Time Display */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: currentTheme.styling.primaryColor,
              letterSpacing: "0.04em"
            }}>
              {phaseTitleMap[walkout.phase]}
            </span>

            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: "#e2e8f0" }}>
              {formattedTime} / 00:12.0
            </span>
          </div>

          {/* Post-Reveal Hero Controls */}
          {isPostReveal && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={walkout.toggleFlip}
                style={{
                  padding: "5px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 6,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Eye size={12} />
                <span>{walkout.isFlipped ? "Awers" : "Rewers"}</span>
              </button>

              <button
                type="button"
                onClick={walkout.toggleAutoRotate}
                style={{
                  padding: "5px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 6,
                  backgroundColor: walkout.autoRotate ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.06)",
                  color: walkout.autoRotate ? "#10b981" : "#cbd5e1",
                  border: walkout.autoRotate ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <RotateCw size={12} />
                <span>360°</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrubber Progress Slider */}
        <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
          <input
            type="range"
            min="0"
            max="12"
            step="0.05"
            value={walkout.currentTime}
            onChange={(e) => walkout.seek(parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: currentTheme.styling.primaryColor,
              cursor: "pointer"
            }}
          />
        </div>
      </footer>
    </div>
  );
}
