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
  Crown
} from "lucide-react";
import { PackDefinition, PackOpeningResult, CardDefinition, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";
import CanvasParticles from "./CanvasParticles";

interface PackOpeningExperienceProps {
  pack: PackDefinition;
  onClose: () => void;
  onOpenAnother?: () => void;
  unopenedCount?: number;
}

type Stage = 
  | "sealed" 
  | "charging" 
  | "flash"
  | "walkout_teaser_1" 
  | "walkout_teaser_2" 
  | "walkout_teaser_3" 
  | "walkout_slam" 
  | "revealing" 
  | "summary";

export default function PackOpeningExperience({
  pack,
  onClose,
  onOpenAnother,
  unopenedCount = 0
}: PackOpeningExperienceProps) {
  const [stage, setStage] = useState<Stage>("sealed");
  const [loading, setLoading] = useState(false);
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(null);
  const [walkoutItem, setWalkoutItem] = useState<{ card: CardDefinition; is_duplicate: boolean; duplicate_points: number } | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);
  const [screenShake, setScreenShake] = useState(false);

  // 3D Hover tilt for sealed pack
  const [packTilt, setPackTilt] = useState({ x: 0, y: 0 });
  const packRef = useRef<HTMLDivElement | null>(null);

  const handlePackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!packRef.current || stage !== "sealed") return;
    const rect = packRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setPackTilt({ x: x * 18, y: -y * 18 });
  };

  const handlePackMouseLeave = () => {
    setPackTilt({ x: 0, y: 0 });
  };

  // Trigger server-side opening API
  const handleTearPack = async () => {
    if (loading || stage !== "sealed") return;
    setLoading(true);
    setStage("charging");
    setScreenShake(true);
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

      // Rank cards to find the star card
      const rarityRank: Record<string, number> = {
        inferno: 5,
        legendary: 4,
        epic: 3,
        rare: 2,
        common: 1
      };

      const sortedCards = [...data.cards].sort((a, b) => {
        return (rarityRank[b.card.rarity || "common"] || 1) - (rarityRank[a.card.rarity || "common"] || 1);
      });

      const topCard = sortedCards[0];
      const topRank = rarityRank[topCard?.card?.rarity || "common"] || 1;
      setWalkoutItem(topCard);

      // Charge up -> Flash transition -> ALWAYS start Tunnel Video
      setTimeout(() => {
        setStage("flash");
        setScreenShake(false);

        setTimeout(() => {
          cardSound.playCinematicBoom();
          setStage("walkout_teaser_1");
          cardSound.playTeaserHit(1);

          // If top rank is Rare or higher -> run full 3-step teaser sequence
          if (topRank >= 2) {
            setTimeout(() => {
              setStage("walkout_teaser_2");
              cardSound.playTeaserHit(2);

              setTimeout(() => {
                setStage("walkout_teaser_3");
                cardSound.playTeaserHit(3);

                setTimeout(() => {
                  setStage("walkout_slam");
                  setScreenShake(true);
                  setTimeout(() => setScreenShake(false), 700);
                  if (topCard.card.rarity === "inferno") {
                    cardSound.playReveal("inferno");
                  } else {
                    cardSound.playWalkoutFanfare();
                  }
                }, 1300);
              }, 1200);
            }, 1200);
          } else {
            // For common cards: tunnel flies for 2.0s then slams
            setTimeout(() => {
              setStage("walkout_slam");
              setScreenShake(true);
              setTimeout(() => setScreenShake(false), 700);
              cardSound.playReveal("common");
            }, 2000);
          }
        }, 280);
      }, 600);
    } catch (e: any) {
      alert(e.message || "Nie udało się otworzyć paczki.");
      setStage("sealed");
    } finally {
      setLoading(false);
    }
  };

  // Start sequential reveal after walkout
  const handleProceedToPack = () => {
    setStage("revealing");
    setCurrentCardIndex(0);
  };

  // Reveal current card in stage
  const handleRevealCurrent = () => {
    if (!openingResult) return;
    const currentItem = openingResult.cards[currentCardIndex];
    if (!currentItem) return;

    const rarity = (currentItem.card.rarity || "common") as any;
    cardSound.playReveal(rarity);

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
  const currentCard = openingResult?.cards[currentCardIndex]?.card;
  const currentCardRarity = currentCard?.rarity || "common";

  const particleTheme = (
    (stage === "revealing" && currentCardRarity === "inferno") || walkoutItem?.card?.rarity === "inferno"
      ? "inferno" 
      : (stage === "revealing" && currentCardRarity === "legendary") || walkoutItem?.card?.rarity === "legendary"
      ? "legend" 
      : "gold"
  ) as any;

  // Determine active video background across all stages
  const activeVideoSrc = 
    (stage === "walkout_teaser_1" || stage === "walkout_teaser_2" || stage === "walkout_teaser_3")
      ? "/videos/tunnel.mp4"
      : stage === "walkout_slam"
      ? (walkoutItem?.card?.rarity === "inferno"
          ? "/videos/bg_inferno.mp4"
          : walkoutItem?.card?.rarity === "legendary"
          ? "/videos/bg_legend.mp4"
          : pack.id === "matchday_booster"
          ? "/videos/bg_matchday.mp4"
          : "/videos/bg_gold.mp4")
      : stage === "revealing"
      ? (currentCardRarity === "inferno"
          ? "/videos/bg_inferno.mp4"
          : currentCardRarity === "legendary"
          ? "/videos/bg_legend.mp4"
          : (pack.id === "matchday_booster" || currentCard?.card_type === "matchday")
          ? "/videos/bg_matchday.mp4"
          : "/videos/bg_gold.mp4")
      : stage === "summary"
      ? (pack.theme === "inferno"
          ? "/videos/bg_inferno.mp4"
          : pack.theme === "legend"
          ? "/videos/bg_legend.mp4"
          : pack.id === "matchday_booster"
          ? "/videos/bg_matchday.mp4"
          : "/videos/bg_gold.mp4")
      : undefined;

  return (
    <div className={`v104-open-modal ${screenShake ? "v104-screen-shake" : ""}`}>
      {/* FLASH TRANSITION OVERLAY */}
      {stage === "flash" && (
        <div 
          style={{
            position: "absolute",
            inset: 0,
            background: "#ffffff",
            zIndex: 999,
            pointerEvents: "none",
            animation: "fadeOutFlash 0.3s ease-out forwards"
          }} 
        />
      )}

      {/* FULLSCREEN HARDWARE-ACCELERATED VIDEO PLAYER */}
      {activeVideoSrc && (
        <video
          key={activeVideoSrc}
          src={activeVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 2,
            pointerEvents: "none",
            filter: stage === "summary" || stage === "revealing" ? "brightness(0.75) contrast(1.08)" : "none",
            transition: "filter 0.4s ease"
          }}
        />
      )}

      {/* CONFETTI & SPARKS BURST ON WALKOUT SLAM & SUMMARY & REVEALING */}
      {(stage === "walkout_slam" || stage === "summary" || (stage === "revealing" && (currentCardRarity === "inferno" || currentCardRarity === "legendary"))) && (
        <CanvasParticles theme={particleTheme} active={true} />
      )}

      {/* TOP HEADER CONTROLS */}
      <div className="v104-open-topbar" style={{ zIndex: 100 }}>
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

      {/* ================= EA FC WALKOUT CINEMATIC SEQUENCE ================= */}
      {(stage === "walkout_teaser_1" || stage === "walkout_teaser_2" || stage === "walkout_teaser_3" || stage === "walkout_slam") && walkoutItem && (
        <div className="v104-walkout-stage" style={{ background: "transparent", zIndex: 10 }}>
          {/* Top Skip Button */}
          <div style={{ position: "absolute", top: "24px", right: "24px", zIndex: 100 }}>
            <button
              onClick={handleProceedToPack}
              className="v104-open-skip-btn"
            >
              Pomiń animację
            </button>
          </div>

          {/* Walkout Step 1, 2, 3 Teaser Pillars */}
          {(stage === "walkout_teaser_1" || stage === "walkout_teaser_2" || stage === "walkout_teaser_3") && (
            <div className="v104-walkout-teaser-container">
              <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.22em", color: "#f1c95c", textTransform: "uppercase", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
                🔥 WALKOUT INCOMING... 🔥
              </span>

              <div className="v104-walkout-teasers-row">
                {/* 1. CLUB & NATION */}
                <div className="v104-walkout-teaser-pillar">
                  <span className="v104-walkout-teaser-label">KLUB / KRAJ</span>
                  <img src="/teamlogos/gm.png" alt="DELTA" width={44} height={44} style={{ width: "44px", height: "44px", objectFit: "contain" }} />
                  <span className="v104-walkout-teaser-val">DELTA GM</span>
                </div>

                {/* 2. POSITION */}
                {(stage === "walkout_teaser_2" || stage === "walkout_teaser_3") && (
                  <div className="v104-walkout-teaser-pillar animate-slideUp">
                    <span className="v104-walkout-teaser-label">POZYCJA</span>
                    <span className="v104-walkout-position-badge">
                      {walkoutItem.card.player?.position || "POLE"}
                    </span>
                  </div>
                )}

                {/* 3. SHIRT NUMBER */}
                {stage === "walkout_teaser_3" && (
                  <div className="v104-walkout-teaser-pillar animate-slideUp">
                    <span className="v104-walkout-teaser-label">NUMER</span>
                    <span className="v104-walkout-number-badge">
                      #{walkoutItem.card.player?.shirt_number || "DELTA"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Walkout Step 4: Slam Reveal */}
          {stage === "walkout_slam" && (
            <div className="v104-walkout-slam-container animate-slamZoom">
              <div style={{ transform: "scale(1.12)", transformOrigin: "center center" }}>
                <CollectibleCard3D
                  card={walkoutItem.card}
                  userCard={undefined}
                  isLocked={false}
                  size="xl"
                  interactive={true}
                  showFlip={true}
                />
              </div>

              <div className="v104-walkout-details">
                <span className="v104-walkout-player-title">
                  {walkoutItem.card.title || walkoutItem.card.card_name}
                </span>
                <span className="v104-walkout-player-name">
                  {walkoutItem.card.player?.display_name || "Zawodnik DELTA"}
                </span>
                {walkoutItem.is_duplicate && (
                  <span className="v104-duplicate-tag">
                    <Coins size={12} className="inline mr-1" /> DUPLIKAT (+{walkoutItem.duplicate_points} DP)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleProceedToPack}
                className="v104-walkout-continue-btn"
              >
                ODKRYJ RESZTĘ PACZKI <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= STAGE 1: SEALED FOIL PACK ================= */}
      {(stage === "sealed" || stage === "charging") && (
        <div className="v104-open-stage" style={{ zIndex: 10 }}>
          {/* 3D PACK FOIL with Interactive Tilt & Charge Pulse */}
          <div 
            ref={packRef}
            onMouseMove={handlePackMouseMove}
            onMouseLeave={handlePackMouseLeave}
            onClick={handleTearPack}
            style={{
              transform: `perspective(1000px) rotateY(${packTilt.x}deg) rotateX(${packTilt.y}deg) scale(${stage === "charging" ? 1.05 : 1})`,
              transition: stage === "charging" ? "transform 0.1s ease" : "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              cursor: "pointer"
            }}
            className={`v104-open-foil-pack ${packTheme === "inferno" ? "inferno" : packTheme === "legend" ? "legend" : "gold"} ${stage === "charging" ? "charging-glow" : ""}`}
          >
            {/* Tear Line Indicator at Top */}
            <div className="v104-open-tear-header">
              <span>{stage === "charging" ? "ŁADOWANIE..." : "ROZERWIJ PACZKĘ"}</span>
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
              <span>KLIKNIJ, ABY OTWORZYĆ</span>
              <b>{pack.min_rarity.toUpperCase()}</b>
            </div>
          </div>
        </div>
      )}

      {/* ================= STAGE 3: REVEALING CARDS ONE BY ONE ================= */}
      {stage === "revealing" && openingResult && (
        <div className="v104-open-stage" style={{ zIndex: 10 }}>
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
              <div className="v104-open-card-wrapper animate-fadeIn">
                <CollectibleCard3D
                  card={currentItem.card}
                  userCard={undefined}
                  isLocked={!isRevealed}
                  size="xl"
                  interactive={true}
                  showFlip={isRevealed}
                  onFlipChange={(flipped) => {
                    if (flipped) {
                      cardSound.playFlip();
                    }
                  }}
                />

                {/* Bottom Action Controls */}
                <div className="v104-open-card-controls">
                  {!isRevealed ? (
                    <button
                      type="button"
                      onClick={handleRevealCurrent}
                      className="v104-open-action-btn reveal"
                    >
                      <Sparkles size={18} /> ODKRYJ KARTĘ ({currentCardIndex + 1}/{openingResult.cards.length})
                    </button>
                  ) : (
                    <div className="v104-open-revealed-panel">
                      <div className="v104-open-revealed-info">
                        <span className="v104-open-card-name">
                          {currentItem.card.title || currentItem.card.card_name}
                        </span>
                        <span className="v104-open-player-name">
                          {currentItem.card.player?.display_name || "Zawodnik DELTA"}
                        </span>
                        {currentItem.is_duplicate && (
                          <span className="v104-duplicate-badge">
                            <Coins size={12} className="inline mr-1" /> DUPLIKAT (+{currentItem.duplicate_points} DP)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleNextCard}
                        className="v104-open-action-btn next"
                      >
                        {currentCardIndex + 1 < openingResult.cards.length ? (
                          <>NASTĘPNA KARTA <ChevronRight size={18} /></>
                        ) : (
                          <>PODSUMOWANIE PACZKI <Check size={18} /></>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= STAGE 4: SUMMARY ================= */}
      {stage === "summary" && openingResult && (
        <div className="v104-open-summary-stage animate-fadeIn" style={{ zIndex: 10 }}>
          <div className="v104-summary-header">
            <span className="v104-summary-eyebrow"><Check size={14} /> PACZKA ZOSTAŁA OTWARTA</span>
            <h3 className="v104-summary-title">ZDOBYTE KARTY DELTA</h3>
            {openingResult.total_delta_points_earned > 0 && (
              <div className="v104-summary-points">
                <Coins size={15} style={{ color: "#f1c95c" }} />
                <span>Otrzymujesz <b>+{openingResult.total_delta_points_earned} DP</b> za karty zduplikowane!</span>
              </div>
            )}
          </div>

          {/* Cards Carousel (Side by Side) */}
          <div className="v104-summary-carousel-container">
            <div className="v104-summary-carousel-track">
              {openingResult.cards.map((item, idx) => (
                <div key={idx} className="v104-summary-card-item">
                  <CollectibleCard3D
                    card={item.card}
                    userCard={undefined}
                    isLocked={false}
                    size="md"
                    interactive={true}
                    showFlip={true}
                  />
                  {item.is_duplicate ? (
                    <span className="v104-summary-dup-tag">
                      <Coins size={11} className="inline mr-1" /> DUPLIKAT (+{item.duplicate_points} DP)
                    </span>
                  ) : (
                    <span className="v104-summary-new-tag">
                      <Sparkles size={11} className="inline mr-1" /> NOWA KARTA
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="v104-summary-actions">
            {unopenedCount > 0 && onOpenAnother && (
              <button
                type="button"
                onClick={onOpenAnother}
                className="v104-summary-btn primary"
              >
                <RefreshCw size={17} /> OTWÓRZ KOLEJNĄ PACZKĘ ({unopenedCount})
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="v104-summary-btn secondary"
            >
              PRZEJDŹ DO KLASERA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
