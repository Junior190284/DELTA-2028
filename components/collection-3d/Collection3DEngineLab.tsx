"use client";

import React, { useState, useEffect, useId } from "react";
import { Card3DEngine } from "./Card3DEngine";
import { TEST_PLAYERS } from "./mockData";
import { CARD_VISUAL_THEMES } from "./themes";
import { CardVisualType, CollectionCategory, PlayerCardData } from "./types";
import { SPECIAL_TITLES_REGISTRY, SpecialTitleDefinition } from "./specialTitles";

const CATEGORIES: { category: CollectionCategory; visualType: CardVisualType; label: string; badge: string; color: string }[] = [
  { category: "INFERNO", visualType: "INFERNO_ULTRA", label: "Inferno Ultra", badge: "ULTRA 1/1", color: "#ff3b1e" },
  { category: "GOLD", visualType: "GOLD_MASTER", label: "Gold Master", badge: "GOLD", color: "#f59e0b" },
  { category: "MATCHDAY", visualType: "MATCHDAY_HERO", label: "Matchday Hero", badge: "MATCHDAY", color: "#38bdf8" },
  { category: "LEGEND", visualType: "DELTA_ICON", label: "Delta Icon (Legend)", badge: "ICON", color: "#a855f7" },
  { category: "RARE", visualType: "TRAINING_HERO", label: "Training Hero (Rare)", badge: "RARE", color: "#10b981" },
  { category: "COMMON", visualType: "BASE", label: "Base (Common)", badge: "COMMON", color: "#94a3b8" }
];

export function Collection3DEngineLab() {
  const [selectedKey, setSelectedKey] = useState<string>("rybacki");
  const [player, setPlayer] = useState<PlayerCardData>(TEST_PLAYERS.rybacki);
  const [currentVisualType, setCurrentVisualType] = useState<CardVisualType>("INFERNO_ULTRA");
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [enableHolo, setEnableHolo] = useState<boolean>(true);
  const [enableParallax, setEnableParallax] = useState<boolean>(true);
  const [tiltSensitivity, setTiltSensitivity] = useState<number>(1.0);
  const [maxTiltAngle, setMaxTiltAngle] = useState<number>(20);
  const [cardScale, setCardScale] = useState<number>(1.0);
  const [isRevealed, setIsRevealed] = useState<boolean>(true);
  const [revealKey, setRevealKey] = useState<number>(0);

  // Sync with URL query parameters if provided on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pParam = params.get("player");
    const tParam = params.get("theme") as CardVisualType | null;
    const fParam = params.get("flipped");

    if (pParam && TEST_PLAYERS[pParam]) {
      setSelectedKey(pParam);
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

    if (fParam === "true") {
      setIsFlipped(true);
    }
  }, []);

  // Accessible IDs for inputs
  const surnameId = useId();
  const shirtNumberId = useId();
  const positionId = useId();
  const ovrId = useId();
  const titleId = useId();
  const sensitivityId = useId();
  const maxTiltId = useId();
  const scaleId = useId();

  // Switch player preset
  const handleSelectPlayer = (key: string) => {
    setSelectedKey(key);
    const mock = TEST_PLAYERS[key];
    if (mock) {
      setPlayer({ ...mock });
      setCurrentVisualType(mock.visualType);
    }
  };

  // Switch category/theme
  const handleSelectCategory = (visualType: CardVisualType, cat: CollectionCategory) => {
    setCurrentVisualType(visualType);
    setPlayer((prev) => ({
      ...prev,
      visualType,
      rarity: cat
    }));
  };

  // Live stat change
  const handleStatChange = (key: keyof PlayerCardData["stats"], val: number) => {
    const clamped = Math.max(0, Math.min(99, isNaN(val) ? 0 : val));
    setPlayer((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        [key]: clamped
      }
    }));
  };

  // Trigger reveal flash simulation
  const handleTriggerReveal = () => {
    setIsRevealed(false);
    setIsFlipped(true);
    setRevealKey((k) => k + 1);

    setTimeout(() => {
      setIsFlipped(false);
      setTimeout(() => {
        setIsRevealed(true);
      }, 350);
    }, 600);
  };

  const currentTheme = CARD_VISUAL_THEMES[currentVisualType] || CARD_VISUAL_THEMES.INFERNO_ULTRA;
  const primaryThemeColor = currentTheme.styling.primaryColor;
  const glowColor = currentTheme.styling.accentGlow || currentTheme.stage.coreGlowColor;

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#07090e",
      color: "#e2e8f0",
      fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      padding: "24px 20px 48px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      {/* Top Header */}
      <header style={{
        width: "100%",
        maxWidth: 1380,
        marginBottom: 24,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        paddingBottom: 20,
        borderBottom: "1px solid rgba(255,255,255,0.08)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: primaryThemeColor,
              boxShadow: `0 0 12px ${primaryThemeColor}`
            }} />
            <h1 style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: 0,
              color: "#ffffff"
            }}>
              DELTA Collection 3D Engine — Showroom
            </h1>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#94a3b8",
              letterSpacing: "0.1em"
            }}>
              ETAP 2 FOUNDATION
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Uniwersalny silnik kart 3D dla wszystkich kategorii DELTA (COMMON, RARE, GOLD, MATCHDAY, INFERNO, LEGEND)
          </p>
        </div>

        {/* Diagnostic Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{
            fontSize: 11,
            padding: "5px 12px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#cbd5e1"
          }}>
            Theme: <strong style={{ color: primaryThemeColor }}>{currentTheme.displayName}</strong>
          </div>
          <div style={{
            fontSize: 11,
            padding: "5px 12px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#cbd5e1"
          }}>
            Rarity: <strong style={{ color: "#38bdf8" }}>{player.rarity}</strong>
          </div>
          <div style={{
            fontSize: 11,
            padding: "5px 12px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: isAutoRotating ? "#10b981" : "#64748b"
          }}>
            Auto-Rotate: <strong>{isAutoRotating ? "ON" : "OFF"}</strong>
          </div>
        </div>
      </header>

      {/* Main Grid: Card Stage on Left, Controls on Right */}
      <div style={{
        width: "100%",
        maxWidth: 1380,
        display: "grid",
        gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 440px)",
        gap: 32,
        alignItems: "start"
      }}>
        {/* Left: Interactive 3D Stage */}
        <section style={{
          position: "relative",
          minHeight: 640,
          background: "radial-gradient(circle at 50% 45%, rgba(30, 41, 59, 0.4) 0%, rgba(7, 9, 14, 0.95) 75%)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          overflow: "hidden"
        }}>
          {/* Subtle Ambient Stadium Ring */}
          <div style={{
            position: "absolute",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 65%)`,
            filter: "blur(40px)",
            pointerEvents: "none",
            opacity: 0.6,
            zIndex: 0
          }} />

          {/* Quick Stage Controls Bar */}
          <div style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10
          }}>
            <span style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.05em" }}>
              Przeciągnij myszką lub dotknij, aby manipulować w 3D
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsFlipped((f) => !f)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {isFlipped ? "Pokaż Awers" : "Pokaż Rewers"}
              </button>
              <button
                type="button"
                onClick={handleTriggerReveal}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  backgroundColor: primaryThemeColor,
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: `0 0 14px ${glowColor}`
                }}
              >
                Test Reveal
              </button>
            </div>
          </div>

          {/* The Universal 3D Card Engine Instance */}
          <div key={`stage-card-${revealKey}`} style={{
            position: "relative",
            zIndex: 2,
            transform: `scale(${cardScale})`,
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <Card3DEngine
              data={player}
              theme={currentTheme}
              isFlipped={isFlipped}
              autoRotate={isAutoRotating}
              enableHolo={enableHolo}
              enableParallax={enableParallax}
              tiltSensitivity={tiltSensitivity}
              maxTiltAngle={maxTiltAngle}
              isRevealing={!isRevealed}
            />
          </div>

          {/* Bottom Stage Hint */}
          <div style={{
            marginTop: 24,
            fontSize: 12,
            color: "#475569",
            textAlign: "center",
            display: "flex",
            gap: 16
          }}>
            <span>Wymiary: 340 × 510 px</span>
            <span>•</span>
            <span>Skala: {(cardScale * 100).toFixed(0)}%</span>
            <span>•</span>
            <span>Format: SVG + CSS 3D Transforms</span>
          </div>
        </section>

        {/* Right: Controls & Diagnostics Panel */}
        <aside style={{
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}>
          {/* Section 1: Categories & Visual Themes */}
          <div style={{
            backgroundColor: "#0d111a",
            borderRadius: 12,
            padding: 18,
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <h2 style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              margin: "0 0 12px 0"
            }}>
              1. Kategorie DELTA Collection
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8
            }}>
              {CATEGORIES.map((cat) => {
                const isActive = currentVisualType === cat.visualType;
                return (
                  <button
                    key={cat.visualType}
                    type="button"
                    onClick={() => handleSelectCategory(cat.visualType, cat.category)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: isActive ? `1.5px solid ${cat.color}` : "1px solid rgba(255,255,255,0.08)",
                      backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: cat.color,
                      marginBottom: 2
                    }}>
                      {cat.badge}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? "#ffffff" : "#94a3b8"
                    }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Player Profiles */}
          <div style={{
            backgroundColor: "#0d111a",
            borderRadius: 12,
            padding: 18,
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <h2 style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              margin: "0 0 12px 0"
            }}>
              2. Profile Zawodników (Weryfikacja Nazwisk i Pozycji)
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(TEST_PLAYERS).map(([key, p]) => {
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPlayer(key)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                      color: isSelected ? "#ffffff" : "#64748b",
                      border: isSelected ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                      cursor: "pointer"
                    }}
                  >
                    {p.surname} ({p.position} {p.ovr})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Stats & Metadata Editor */}
          <div style={{
            backgroundColor: "#0d111a",
            borderRadius: 12,
            padding: 18,
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <h2 style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              margin: "0 0 12px 0"
            }}>
              3. Edytor Danych w Czasie Rzeczywistym
            </h2>

            {/* Basic Info Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label htmlFor={surnameId} style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4 }}>Nazwisko</label>
                <input
                  id={surnameId}
                  type="text"
                  value={player.surname}
                  onChange={(e) => setPlayer((prev) => ({ ...prev, surname: e.target.value.toUpperCase() }))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: "#ffffff",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label htmlFor={shirtNumberId} style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4 }}>Numer</label>
                <input
                  id={shirtNumberId}
                  type="number"
                  value={player.shirtNumber}
                  onChange={(e) => setPlayer((prev) => ({ ...prev, shirtNumber: parseInt(e.target.value, 10) || 0 }))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: "#ffffff",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label htmlFor={positionId} style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4 }}>Pozycja</label>
                <select
                  id={positionId}
                  value={player.position}
                  onChange={(e) => setPlayer((prev) => ({ ...prev, position: e.target.value as PlayerCardData["position"] }))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    backgroundColor: "#07090e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: "#ffffff",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                >
                  <option value="GK">GK (Bramkarz)</option>
                  <option value="DEF">DEF (Obrońca)</option>
                  <option value="MID">MID (Pomocnik)</option>
                  <option value="FWD">FWD (Napastnik)</option>
                </select>
              </div>

              <div>
                <label htmlFor={ovrId} style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4 }}>OVR</label>
                <input
                  id={ovrId}
                  type="number"
                  min="0"
                  max="99"
                  value={player.ovr}
                  onChange={(e) => setPlayer((prev) => ({ ...prev, ovr: parseInt(e.target.value, 10) || 0 }))}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    color: "#ffffff",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Special Title Selector */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor={titleId} style={{ display: "block", fontSize: 10, color: "#64748b", marginBottom: 4 }}>Tytuł Specjalny</label>
              <select
                id={titleId}
                value={player.specialTitleId || ""}
                onChange={(e) => setPlayer((prev) => ({ ...prev, specialTitleId: e.target.value || null }))}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  backgroundColor: "#07090e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  color: "#ffffff",
                  fontSize: 12,
                  boxSizing: "border-box"
                }}
              >
                <option value="">(Brak tytułu specjalnego)</option>
                {(Object.values(SPECIAL_TITLES_REGISTRY) as SpecialTitleDefinition[]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.rarity.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Stats Sliders */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
              {(["pac", "sho", "pas", "dri", "def", "phy"] as const).map((statKey) => (
                <div key={statKey}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                    <span style={{ textTransform: "uppercase", color: "#64748b" }}>{statKey}</span>
                    <span style={{ fontWeight: 700, color: "#cbd5e1" }}>{player.stats[statKey]}</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="99"
                    value={player.stats[statKey]}
                    onChange={(e) => handleStatChange(statKey, parseInt(e.target.value, 10))}
                    style={{ width: "100%", accentColor: primaryThemeColor }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: 3D Physics & Visual Toggles */}
          <div style={{
            backgroundColor: "#0d111a",
            borderRadius: 12,
            padding: 18,
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <h2 style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              margin: "0 0 12px 0"
            }}>
              4. Kontrola 3D i Efektów Wizualnych
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Auto Rotate Toggle */}
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, cursor: "pointer" }}>
                <span>Ciągły Autoobrót 360°</span>
                <input
                  type="checkbox"
                  checked={isAutoRotating}
                  onChange={(e) => setIsAutoRotating(e.target.checked)}
                  style={{ accentColor: primaryThemeColor, cursor: "pointer" }}
                />
              </label>

              {/* Holographic Foil Toggle */}
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, cursor: "pointer" }}>
                <span>Folia Holograficzna (Holo Foil)</span>
                <input
                  type="checkbox"
                  checked={enableHolo}
                  onChange={(e) => setEnableHolo(e.target.checked)}
                  style={{ accentColor: primaryThemeColor, cursor: "pointer" }}
                />
              </label>

              {/* Parallax Toggle */}
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, cursor: "pointer" }}>
                <span>Wielowarstwowy Parallaks (Parallax)</span>
                <input
                  type="checkbox"
                  checked={enableParallax}
                  onChange={(e) => setEnableParallax(e.target.checked)}
                  style={{ accentColor: primaryThemeColor, cursor: "pointer" }}
                />
              </label>

              {/* Sensitivity Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                  <label htmlFor={sensitivityId}>Czułość Myszki / Dotyku</label>
                  <span>{tiltSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  id={sensitivityId}
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={tiltSensitivity}
                  onChange={(e) => setTiltSensitivity(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: primaryThemeColor }}
                />
              </div>

              {/* Max Tilt Angle Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                  <label htmlFor={maxTiltId}>Maksymalny Kąt Pochylenia</label>
                  <span>{maxTiltAngle}°</span>
                </div>
                <input
                  id={maxTiltId}
                  type="range"
                  min="10"
                  max="35"
                  step="1"
                  value={maxTiltAngle}
                  onChange={(e) => setMaxTiltAngle(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: primaryThemeColor }}
                />
              </div>

              {/* Scale Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                  <label htmlFor={scaleId}>Skala Podglądu</label>
                  <span>{(cardScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  id={scaleId}
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={cardScale}
                  onChange={(e) => setCardScale(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: primaryThemeColor }}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
