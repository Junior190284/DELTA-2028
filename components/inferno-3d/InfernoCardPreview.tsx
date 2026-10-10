"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { InfernoCard3D, InfernoCardData } from "./InfernoCard3D";
import {
  SPECIAL_TITLES_REGISTRY,
  SPECIAL_TITLES_LIST,
  getSpecialTitle,
  SpecialTitleDefinition
} from "./specialTitles";
import "./inferno-card.css";

const DEFAULT_CARD_DATA: InfernoCardData = {
  name: "RYBACKI",
  number: 10,
  position: "FWD",
  overall: 88,
  stats: {
    pac: 88,
    sho: 84,
    pas: 81,
    dri: 89,
    def: 62,
    phy: 78
  },
  playerImage: "/assets/cards/inferno-3d/player-default.png",
  frontBg: "/assets/cards/inferno-3d/front-bg.png",
  backBg: "/assets/cards/inferno-3d/back-bg.png",
  frameImg: "/assets/cards/inferno-3d/frame.png",
  fxImg: "/assets/cards/inferno-3d/fx.png",
  crestImg: "/assets/cards/inferno-3d/delta-crest.png",
  specialTitleId: "kapitan_delta"
};

type RevealPhase = "idle" | "dimmed_back" | "rotating" | "flaring" | "holo_flash" | "done";

export function InfernoCardPreview() {
  const [cardData, setCardData] = useState<InfernoCardData>(DEFAULT_CARD_DATA);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>("idle");
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isRevealingTitle, setIsRevealingTitle] = useState<boolean>(false);
  const [showSpecialTitleGlow, setShowSpecialTitleGlow] = useState<boolean>(false);

  // Rotation angles (default: crisp hero perspective facing front)
  const [yaw, setYaw] = useState<number>(-10);
  const [pitch, setPitch] = useState<number>(6);

  // Custom photo object URL tracking for memory cleanup
  const customPhotoUrlRef = useRef<string | null>(null);

  // Timers ref for clearable reveal sequences
  const revealTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach((t) => clearTimeout(t));
    revealTimersRef.current = [];
    setIsRevealingTitle(false);
    setShowSpecialTitleGlow(false);
  }, []);

  // Initial mount: check URL query for initial flipped view or custom title
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("flipped") === "1" || params.get("flipped") === "true") {
        setIsFlipped(true);
      }
      const titleParam = params.get("title");
      if (titleParam !== null) {
        setCardData((prev) => ({
          ...prev,
          specialTitleId: titleParam === "none" || titleParam === "false" ? null : titleParam
        }));
      }
      const nameParam = params.get("name");
      if (nameParam) {
        setCardData((prev) => ({ ...prev, name: nameParam.toUpperCase() }));
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllRevealTimers();
      if (customPhotoUrlRef.current) {
        URL.revokeObjectURL(customPhotoUrlRef.current);
      }
    };
  }, [clearAllRevealTimers]);
  // Auto-rotation loop
  useEffect(() => {
    if (!autoRotate) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = now - lastTime;
      if (dt > 20) {
        setYaw((prev) => (prev + 0.35) % 360);
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate]);

  /**
   * EXACT REVEAL SEQUENCE TIMELINE (0 - 4.5s):
   * 0.0 - 1.0s: Przyciemniony rewers i delikatne podświetlenie
   * 1.0 - 2.5s: Płynny obrót 3D (przejście z rewersu na przód)
   * 2.5 - 3.5s: Odsłonięcie zawodnika i rozświetlenie ramki
   * 3.5 - 4.5s: Holograficzny błysk i efektowne zatrzymanie przodem
   * Od 4.5s: Czysty koniec animacji, natychmiastowy ręczny obrót myszką/palcem
   */
  const triggerReveal = useCallback(() => {
    clearAllRevealTimers();
    setAutoRotate(false);

    // [0.0s] Phase 1: Przyciemniony rewers
    setRevealPhase("dimmed_back");
    setIsFlipped(true);
    setYaw(10);
    setPitch(-3);

    // [1.0s] Phase 2: Płynny obrót 3D z rewersu na przód
    const t1 = setTimeout(() => {
      setRevealPhase("rotating");
      setIsFlipped(false);
      setYaw(-26);
      setPitch(10);
    }, 1000);

    // [2.5s] Phase 3: Odsłonięcie zawodnika i rozświetlenie ramki
    const t2 = setTimeout(() => {
      setRevealPhase("flaring");
      setYaw(-18);
      setPitch(7);
    }, 2500);

    // [3.2s] Staggered Title Reveal: Ujawnienie plakietki tytułu specjalnego po zawodniku
    const tTitle = setTimeout(() => {
      setIsRevealingTitle(true);
    }, 3200);

    // [3.5s] Phase 4: Holograficzny błysk i zatrzymanie przodem
    const t3 = setTimeout(() => {
      setRevealPhase("holo_flash");
      setYaw(-10);
      setPitch(5);

      // Dodatkowy błysk dla legendarnych i epickich tytułów
      const titleDef = getSpecialTitle(cardData.specialTitleId);
      if (titleDef && (titleDef.rarity === "legendary" || titleDef.rarity === "epic")) {
        setShowSpecialTitleGlow(true);
      }
    }, 3500);

    // [4.2s] Wygaszenie błysku tytułu
    const tGlowOff = setTimeout(() => {
      setShowSpecialTitleGlow(false);
    }, 4200);

    // [4.5s] Phase 5: Zakończenie animacji, odblokowanie swobodnego sterowania
    const t4 = setTimeout(() => {
      setRevealPhase("done");
      setIsRevealingTitle(false);
    }, 4500);

    revealTimersRef.current = [t1, t2, tTitle, t3, tGlowOff, t4];
  }, [clearAllRevealTimers, cardData.specialTitleId]);

  // Handlers for controls
  const handleToggleFlip = () => {
    clearAllRevealTimers();
    setRevealPhase("idle");
    setIsFlipped((prev) => !prev);
  };

  const handleToggleAuto = () => {
    setAutoRotate((prev) => !prev);
  };

  const handleResetPosition = () => {
    clearAllRevealTimers();
    setRevealPhase("idle");
    setYaw(0);
    setPitch(0);
    setIsFlipped(false);
    setAutoRotate(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (customPhotoUrlRef.current) {
      URL.revokeObjectURL(customPhotoUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    customPhotoUrlRef.current = objectUrl;

    setCardData((prev) => ({
      ...prev,
      playerImage: objectUrl
    }));
  };

  const handleResetDefaultPlayer = () => {
    if (customPhotoUrlRef.current) {
      URL.revokeObjectURL(customPhotoUrlRef.current);
      customPhotoUrlRef.current = null;
    }
    setCardData(DEFAULT_CARD_DATA);
  };

  const handlePresetCaptain = () => {
    setCardData((prev) => ({
      ...prev,
      name: "KAPITAN DELTA",
      number: 7,
      position: "MID",
      overall: 92,
      stats: {
        pac: 91,
        sho: 88,
        pas: 94,
        dri: 90,
        def: 74,
        phy: 82
      }
    }));
  };

  // Compute CSS modifier classes for active reveal phase
  const isDimmed = revealPhase === "dimmed_back";
  const isFlaring = revealPhase === "flaring";
  const isHoloFlashing = revealPhase === "holo_flash";
  const isRevealAnimating = revealPhase !== "idle" && revealPhase !== "done";

  const stageAreaClass = [
    "inferno-stage-area",
    isDimmed ? "is-dimmed-back" : "",
    isFlaring ? "is-flaring" : "",
    isHoloFlashing ? "is-holo-flashing" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="inferno-studio">
      {/* Header */}
      <header className="inferno-header">
        <span className="inferno-header-badge">DELTA 2018 GM • COLLECTION LAB</span>
        <h1 className="inferno-header-title">
          INFERNO <span>3D CINEMATIC</span>
        </h1>
        <p className="inferno-header-subtitle">
          V5.1 Smart Typography • Auto-skalowanie &amp; 2 Wiersze • Special Titles • 6 Statystyk 3×2
        </p>
      </header>

      {/* Main 3D Stage Section */}
      <section className={stageAreaClass}>
        <InfernoCard3D
          data={cardData}
          isFlipped={isFlipped}
          autoRotate={autoRotate}
          isRevealing={isRevealAnimating}
          isRevealingTitle={isRevealingTitle}
          showSpecialTitleGlow={showSpecialTitleGlow}
          yaw={yaw}
          pitch={pitch}
          onRotationChange={(newYaw, newPitch) => {
            // Cancel active reveal script if user manually starts dragging
            if (isRevealAnimating) {
              clearAllRevealTimers();
              setRevealPhase("idle");
            }
            setYaw(newYaw);
            setPitch(newPitch);
          }}
        />

          {/* Action Controls Toolbar */}
        <div className="inferno-controls-bar">
          <button
            type="button"
            className="inferno-btn is-primary"
            onClick={handleToggleFlip}
          >
            ↻ {isFlipped ? "Pokaż przód" : "Obróć na rewers"}
          </button>

          <button
            type="button"
            className={`inferno-btn ${autoRotate ? "is-active" : ""}`}
            onClick={handleToggleAuto}
          >
            {autoRotate ? "⏸ Zatrzymaj obrót" : "▶ Autoobrót"}
          </button>

          <button
            type="button"
            className={`inferno-btn ${isRevealAnimating ? "is-active" : ""}`}
            onClick={triggerReveal}
          >
            ✨ Reveal (0–4.5s Rewers → Przód)
          </button>

          <button
            type="button"
            className={`inferno-btn ${isRevealingTitle ? "is-active" : ""}`}
            onClick={() => {
              setIsRevealingTitle(true);
              setShowSpecialTitleGlow(true);
              setTimeout(() => setShowSpecialTitleGlow(false), 800);
            }}
          >
            👑 Test ujawnienia tytułu (Stagger)
          </button>

          <button
            type="button"
            className="inferno-btn"
            onClick={handleResetPosition}
          >
            ↺ Ustaw na wprost
          </button>

          <button
            type="button"
            className={`inferno-btn ${isPanelOpen ? "is-active" : ""}`}
            onClick={() => setIsPanelOpen((prev) => !prev)}
          >
            ⚙ {isPanelOpen ? "Schowaj edytor" : "Panel edycji"}
          </button>
        </div>
      </section>

      {/* Data & Customization Editor Panel */}
      {isPanelOpen && (
        <section className="inferno-editor-panel">
          <div className="inferno-panel-head">
            <div>
              <strong>Panel edycji karty INFERNO — V5 Special Titles</strong>
              <span>Dostosuj tytuł specjalny, dane zawodnika w czasie rzeczywistym lub wgraj PNG</span>
            </div>
            <span>
              <span className="inferno-kbd-tag">Mysz / Dotyk</span> obrót •{" "}
              <span className="inferno-kbd-tag">Rewers</span> flip 3D
            </span>
          </div>

          <div className="inferno-editor-grid">
            {/* Special Title Selector */}
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="inferno-field-label" style={{ fontWeight: 800, color: "#ffd56b" }}>
                🏆 Tytuł specjalny DELTA (Osobna plakietka nad nazwiskiem)
                <select
                  className="inferno-input-text"
                  style={{
                    marginTop: "6px",
                    background: "rgba(22, 10, 14, 0.95)",
                    border: "1px solid rgba(255, 180, 50, 0.6)",
                    color: "#fff8eb",
                    fontWeight: 700,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                  value={cardData.specialTitleId || "none"}
                  onChange={(e) => {
                    const val = e.target.value === "none" ? null : e.target.value;
                    setCardData((prev) => ({ ...prev, specialTitleId: val }));
                  }}
                >
                  <option value="none">— BRAK TYTUŁU (Standardowa karta) —</option>
                  {SPECIAL_TITLES_LIST.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.rarity.toUpperCase()}] {t.label} — {t.unlockCondition}
                    </option>
                  ))}
                </select>
              </label>

              {cardData.specialTitleId && (
                <div style={{
                  fontSize: "11px",
                  lineHeight: "1.4",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "rgba(255, 180, 50, 0.08)",
                  border: "1px solid rgba(255, 180, 50, 0.25)",
                  color: "rgba(255, 235, 200, 0.85)"
                }}>
                  <strong>Warunek odblokowania:</strong> {getSpecialTitle(cardData.specialTitleId)?.unlockCondition}
                </div>
              )}
            </div>

            <label className="inferno-field-label">
              Nazwisko zawodnika (zawsze widoczne!)
              <input
                className="inferno-input-text"
                type="text"
                maxLength={24}
                value={cardData.name}
                onChange={(e) =>
                  setCardData((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))
                }
                placeholder="np. RYBACKI"
              />
            </label>

            <label className="inferno-field-label">
              Numer na koszulce
              <input
                className="inferno-input-number"
                type="number"
                min={0}
                max={99}
                value={cardData.number}
                onChange={(e) =>
                  setCardData((prev) => ({ ...prev, number: e.target.value }))
                }
              />
            </label>

            <label className="inferno-field-label">
              Pozycja / OVR
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  className="inferno-input-text"
                  style={{ width: "55%" }}
                  type="text"
                  maxLength={4}
                  value={cardData.position || "FWD"}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      position: e.target.value.toUpperCase()
                    }))
                  }
                />
                <input
                  className="inferno-input-number"
                  style={{ width: "45%" }}
                  type="number"
                  min={50}
                  max={99}
                  value={cardData.overall || 88}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      overall: Number(e.target.value) || 88
                    }))
                  }
                />
              </div>
            </label>

            <label className="inferno-field-label">
              Własne zdjęcie PNG zawodnika
              <input
                className="inferno-input-file"
                type="file"
                accept="image/png,image/webp,image/jpeg"
                onChange={handlePhotoUpload}
              />
            </label>

            {/* 6 Statystyk w edytorze (3x2) */}
            <div className="inferno-stats-inputs-row">
              <label>
                PAC
                <input
                  className="inferno-input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={cardData.stats.pac}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      stats: { ...prev.stats, pac: Number(e.target.value) || 0 }
                    }))
                  }
                />
              </label>

              <label>
                SHO
                <input
                  className="inferno-input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={cardData.stats.sho}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      stats: { ...prev.stats, sho: Number(e.target.value) || 0 }
                    }))
                  }
                />
              </label>

              <label>
                PAS
                <input
                  className="inferno-input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={cardData.stats.pas}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      stats: { ...prev.stats, pas: Number(e.target.value) || 0 }
                    }))
                  }
                />
              </label>

              <label>
                DRI
                <input
                  className="inferno-input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={cardData.stats.dri}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      stats: { ...prev.stats, dri: Number(e.target.value) || 0 }
                    }))
                  }
                />
              </label>

              <label>
                DEF
                <input
                  className="inferno-input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={cardData.stats.def}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      stats: { ...prev.stats, def: Number(e.target.value) || 0 }
                    }))
                  }
                />
              </label>

              <label>
                PHY
                <input
                  className="inferno-input-number"
                  type="number"
                  min={1}
                  max={99}
                  value={cardData.stats.phy}
                  onChange={(e) =>
                    setCardData((prev) => ({
                      ...prev,
                      stats: { ...prev.stats, phy: Number(e.target.value) || 0 }
                    }))
                  }
                />
              </label>
            </div>

            {/* Presets and quick actions */}
            <div className="inferno-presets-bar">
              <span style={{ fontSize: "11px", color: "var(--inferno-muted)", fontWeight: 700 }}>
                Presety testowe V5.1:
              </span>
              <button
                type="button"
                className="inferno-preset-btn"
                onClick={() => {
                  setCardData((prev) => ({
                    ...prev,
                    name: "RYBACKI",
                    number: 10,
                    position: "FWD",
                    overall: 88,
                    specialTitleId: "kapitan_delta"
                  }));
                }}
              >
                👑 1. RYBACKI + KAPITAN DELTA
              </button>
              <button
                type="button"
                className="inferno-preset-btn"
                onClick={() => {
                  setCardData((prev) => ({
                    ...prev,
                    name: "LEWANDOWSKI-KOWALSKI",
                    number: 9,
                    position: "FWD",
                    overall: 92,
                    specialTitleId: "kapitan_delta"
                  }));
                }}
              >
                👑 2. LEWANDOWSKI-KOWALSKI + KAPITAN
              </button>
              <button
                type="button"
                className="inferno-preset-btn"
                onClick={() => {
                  setCardData((prev) => ({
                    ...prev,
                    name: "BRZĘCZYSZCZYKIEWICZ",
                    number: 14,
                    position: "MID",
                    overall: 94,
                    specialTitleId: "mvp_turnieju"
                  }));
                }}
              >
                🏅 3. BRZĘCZYSZCZYKIEWICZ + MVP TURNIEJU
              </button>
              <button
                type="button"
                className="inferno-preset-btn"
                onClick={() => {
                  setCardData((prev) => ({
                    ...prev,
                    name: "BRZĘCZYSZCZYKIEWICZ",
                    number: 14,
                    position: "MID",
                    overall: 94,
                    specialTitleId: null
                  }));
                }}
              >
                ⚪ 4. BRZĘCZYSZCZYKIEWICZ (Brak tytułu)
              </button>
              <button
                type="button"
                className="inferno-preset-btn"
                onClick={() => {
                  setCardData((prev) => ({
                    ...prev,
                    name: "RYBACKI",
                    number: 10,
                    position: "FWD",
                    overall: 88,
                    specialTitleId: null
                  }));
                }}
              >
                ⚪ 5. RYBACKI (Brak tytułu)
              </button>
              <button
                type="button"
                className="inferno-preset-btn"
                onClick={() => {
                  setYaw(-15);
                  setPitch(8);
                }}
              >
                📐 Kąt 3D
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Note & Architectural specs */}
      <div className="inferno-note-card">
        <strong>V5.1 Smart Typography Engine:</strong> Automatyczne skalowanie i estetyczny podział długich nazwisk na dwa wiersze bez ucinania wielokropkiem (obsługa polskich znaków np. BRZĘCZYSZ- / CZYKIEWICZ). Zrównoważony układ: [Tytuł Specjalny] → [Nazwisko] → [Pozycja & OVR] → [6 Statystyk]. Czysty rewers bez kolizji z metryką zawodnika.
      </div>
    </div>
  );
}

export default InfernoCardPreview;
