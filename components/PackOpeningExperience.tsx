"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  Sparkles, 
  X, 
  ChevronRight, 
  Check, 
  Coins, 
  RefreshCw,
  Gift,
  Crown,
  Volume2,
  VolumeX
} from "lucide-react";
import { PackDefinition, PackOpeningResult, CardDefinition, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface PackOpeningExperienceProps {
  pack: PackDefinition;
  onClose: () => void;
  onOpenAnother?: () => void;
  unopenedCount?: number;
}

type Stage = "sealed" | "tearing" | "burst" | "revealing" | "summary";

export default function PackOpeningExperience({
  pack,
  onClose,
  onOpenAnother,
  unopenedCount = 0
}: PackOpeningExperienceProps) {
  const [stage, setStage] = useState<Stage>("sealed");
  const [loading, setLoading] = useState(false);
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);
  const [infernoCinematic, setInfernoCinematic] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  // Trigger server-side opening API
  const handleTearPack = async () => {
    if (loading || stage !== "sealed") return;
    setLoading(true);
    setStage("tearing");
    cardSound.playPackTear();

    try {
      const res = await fetch("/api/cards/open-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_type_id: pack.id })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd otwierania paczki");
      }

      const data: PackOpeningResult = await res.json();
      setOpeningResult(data);
      setRevealedCards(new Array(data.cards.length).fill(false));

      // Timing for burst animation
      setTimeout(() => {
        setStage("burst");
        setTimeout(() => {
          setStage("revealing");
          setCurrentCardIndex(0);
        }, 800);
      }, 700);
    } catch (e: any) {
      alert(e.message || "Nie udało się otworzyć paczki.");
      setStage("sealed");
    } finally {
      setLoading(false);
    }
  };

  // Reveal current card in sequence
  const handleRevealCurrentCard = () => {
    if (!openingResult) return;
    const cardItem = openingResult.cards[currentCardIndex];
    if (!cardItem) return;

    const rarity = cardItem.card.rarity || "common";

    // Play sound
    if (!soundMuted) {
      cardSound.playReveal(rarity);
    }

    // Inferno special cinematic
    if (rarity === "inferno") {
      setInfernoCinematic(true);
      setTimeout(() => {
        setInfernoCinematic(false);
      }, 2400);
    }

    setRevealedCards(prev => {
      const updated = [...prev];
      updated[currentCardIndex] = true;
      return updated;
    });
  };

  // Next card in pack
  const handleNextCard = () => {
    if (!openingResult) return;
    if (currentCardIndex + 1 < openingResult.cards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setStage("summary");
    }
  };

  // Reveal all cards instantly
  const handleRevealAll = () => {
    if (!openingResult) return;
    setRevealedCards(new Array(openingResult.cards.length).fill(true));
    setStage("summary");
  };

  const packTheme = pack.theme || "gold";
  const packBg = 
    packTheme === "inferno"
      ? "from-red-900 via-stone-900 to-black"
      : packTheme === "legend"
        ? "from-amber-800 via-zinc-900 to-black"
        : "from-amber-600 via-stone-900 to-black";

  return (
    <div className="v104-open-modal">
      {/* BACKGROUND STADIUM LIGHTS / AMBIENT GLOW */}
      <div className={`v104-open-ambient ${packTheme === "inferno" ? "inferno" : packTheme === "legend" ? "legend" : ""}`} />

      {/* TOP HEADER CONTROLS */}
      <div className="v104-open-topbar">
        <div className="v104-open-top-brand">
          <img 
            src="/teamlogos/gm.png" 
            alt="DELTA GM" 
            width={34}
            height={34}
            className="v104-open-top-logo" 
          />
          <div>
            <span className="v104-open-eyebrow">DELTA CARDS & COLLECTION</span>
            <h2 className="v104-open-top-title">{pack.name}</h2>
          </div>
        </div>

        <div className="v104-open-actions">
          {stage === "revealing" && (
            <button
              onClick={handleRevealAll}
              className="v104-open-skip-btn"
            >
              Pomiń animację
            </button>
          )}

          <button
            onClick={onClose}
            className="v104-open-close-btn"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ================= INFERNO CINEMATIC OVERLAY ================= */}
      {infernoCinematic && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100000, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.9)" }}>
          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
            <div style={{ padding: "16px", borderRadius: "50%", background: "rgba(239,68,68,0.3)", border: "2px solid #ef4444", boxShadow: "0 0 50px rgba(239,68,68,0.8)" }}>
              <Flame size={64} style={{ color: "#ef4444" }} />
            </div>
            <h1 style={{ fontSize: "48px", fontWeight: 900, fontStyle: "italic", color: "#f87171", textShadow: "0 0 35px rgba(255,100,0,0.9)", margin: 0 }}>
              🔥 INFERNO DROP! 🔥
            </h1>
            <p style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "0.15em", color: "#fecaca", textTransform: "uppercase", margin: 0 }}>
              NAJRZADSZA KARTA W GRZE!
            </p>
          </div>
        </div>
      )}

      {/* ================= STAGE 1: SEALED FOIL PACK ================= */}
      {stage === "sealed" && (
        <div className="v104-open-stage">
          {/* 3D PACK FOIL */}
          <div 
            onClick={handleTearPack}
            className={`v104-open-foil-pack ${packTheme === "inferno" ? "inferno" : packTheme === "legend" ? "legend" : "gold"}`}
          >
            {/* Tear Line Indicator at Top */}
            <div className="v104-open-tear-header">
              <span>ROZERWIJ PACZKĘ</span>
              <Sparkles size={16} style={{ color: "#fde047" }} />
            </div>

            {/* Pack Center Branding */}
            <div className="v104-open-pack-center">
              <img 
                src="/teamlogos/gm.png" 
                alt="DELTA" 
                width={76}
                height={76}
                className="v104-open-pack-center-logo" 
              />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", color: "#f1c95c", textTransform: "uppercase" }}>
                  OFICJALNA PACZKA
                </span>
                <h3 className="v104-open-pack-title">
                  {pack.name}
                </h3>
              </div>
              <span className="v104-open-pack-badge">
                {pack.cards_count} {pack.cards_count === 1 ? "KARTA" : pack.cards_count < 5 ? "KARTY" : "KART"}
              </span>
            </div>

            {/* Pack Footer */}
            <div className="v104-open-pack-footer">
              <span>MIN. RZADKOŚĆ:</span>
              <b>{pack.min_rarity}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTearPack}
            className="v104-open-tear-btn"
          >
            <Sparkles size={18} /> KLIKNIJ, ABY OTWORZYĆ
          </button>
        </div>
      )}

      {/* ================= STAGE 2: TEARING & BURST ================= */}
      {(stage === "tearing" || stage === "burst") && (
        <div className="v104-open-stage">
          <div style={{ width: "280px", height: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
            <Sparkles size={64} style={{ color: "#f1c95c" }} />
            <span style={{ fontWeight: 900, fontSize: "20px", color: "#ffffff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              OTWIERANIE...
            </span>
          </div>
        </div>
      )}

      {/* ================= STAGE 3: REVEALING CARDS ONE BY ONE ================= */}
      {stage === "revealing" && openingResult && (
        <div className="v104-open-stage">
          {/* Progress Indicator */}
          <div className="v104-open-progress">
            {openingResult.cards.map((_, idx) => (
              <div
                key={idx}
                className="v104-open-progress-pill"
                style={{
                  width: idx === currentCardIndex ? "32px" : "16px",
                  background: idx === currentCardIndex ? "#f1c95c" : idx < currentCardIndex || revealedCards[idx] ? "#34d399" : "#334155",
                  boxShadow: idx === currentCardIndex ? "0 0 10px rgba(241, 201, 92, 0.8)" : "none"
                }}
              />
            ))}
          </div>

          {/* Current Card Stage */}
          {(() => {
            const currentItem = openingResult.cards[currentCardIndex];
            if (!currentItem) return null;
            const isRevealed = revealedCards[currentCardIndex];

            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                {!isRevealed ? (
                  /* Card Back (Click to reveal) */
                  <div 
                    onClick={handleRevealCurrentCard}
                    className="v104-open-reveal-card-back"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <img 
                        src="/teamlogos/gm.png" 
                        alt="DELTA" 
                        width={20}
                        height={20}
                        style={{ width: "20px", height: "20px", objectFit: "contain" }} 
                      />
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "#cbd5e1", letterSpacing: "0.08em" }}>DELTA GM</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div className="v104-open-reveal-icon-circle">
                        <Sparkles size={36} />
                      </div>
                      <span style={{ fontSize: "15px", fontWeight: 900, color: "#ffffff", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        KARTA #{currentCardIndex + 1} Z {openingResult.cards.length}
                      </span>
                      <span style={{ fontSize: "12px", color: "#f1c95c", fontWeight: 900, marginTop: "6px" }}>
                        KLIKNIJ, ABY ODKRYĆ!
                      </span>
                    </div>

                    <span style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace" }}>SEZON 2026/27</span>
                  </div>
                ) : (
                  /* Card Front (Revealed) */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <CollectibleCard3D
                      card={currentItem.card}
                      size="lg"
                      interactive={true}
                      showFlip={true}
                    />

                    {/* Duplicate Indicator */}
                    {currentItem.is_duplicate && (
                      <div className="v104-open-dup-banner">
                        <Coins size={16} /> DUPLIKAT! +{currentItem.duplicate_points} DELTA POINTS
                      </div>
                    )}

                    {/* Action Button: Next Card or Summary */}
                    <button
                      type="button"
                      onClick={handleNextCard}
                      className="v104-open-next-btn"
                    >
                      {currentCardIndex + 1 < openingResult.cards.length ? (
                        <>KOLEJNA KARTA <ChevronRight size={18} /></>
                      ) : (
                        <>PODSUMOWANIE PACZKI <Check size={18} /></>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= STAGE 4: SUMMARY SHOWCASE ================= */}
      {stage === "summary" && openingResult && (
        <div className="v104-open-stage">
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.12em", color: "#f1c95c", textTransform: "uppercase" }}>
              GRATULACJE!
            </span>
            <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff", margin: "4px 0" }}>
              OTRZYMANE KARTY
            </h2>
            {openingResult.total_delta_points_earned > 0 && (
              <div className="v104-open-dup-banner" style={{ display: "inline-flex" }}>
                <Coins size={16} /> Łącznie zdobyto +{openingResult.total_delta_points_earned} Delta Points za duplikaty
              </div>
            )}
          </div>

          {/* Cards Grid Showcase */}
          <div className="v104-open-summary-grid">
            {openingResult.cards.map((item, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <CollectibleCard3D
                  card={item.card}
                  size="md"
                  interactive={true}
                  showFlip={true}
                />
                {item.is_duplicate && (
                  <span style={{ fontSize: "10px", fontWeight: 900, color: "#f1c95c", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(241,201,92,0.4)" }}>
                    +{item.duplicate_points} DP (Duplikat)
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Summary Buttons */}
          <div className="v104-open-btn-row">
            <button
              type="button"
              onClick={onClose}
              className="v104-open-secondary-btn"
            >
              Przejdź do kolekcji
            </button>

            {unopenedCount > 0 && onOpenAnother && (
              <button
                type="button"
                onClick={() => {
                  setStage("sealed");
                  setOpeningResult(null);
                  setRevealedCards([]);
                  onOpenAnother();
                }}
                className="v104-open-tear-btn"
                style={{ marginTop: 0 }}
              >
                <Gift size={18} /> Otwórz następną ({unopenedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", paddingTop: "8px", fontSize: "10px", color: "#64748b" }}>
        Karty zostają trwale przypisane do Twojego profilu klubowego w DELTA Warszawa 2018 GM.
      </div>
    </div>
  );
}
