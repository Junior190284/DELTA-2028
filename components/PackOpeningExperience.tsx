"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Zap,
  Shield,
  Award
} from "lucide-react";
import { PackDefinition, PackOpeningResult, CardDefinition, RARITY_CONFIG, getPackImageUrl } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import { MEDIA, getCardTierBackgroundVideo } from "@/lib/media";
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
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<Stage>("sealed");
  const [loading, setLoading] = useState(false);
  const [openingResult, setOpeningResult] = useState<PackOpeningResult | null>(null);
  const [walkoutItem, setWalkoutItem] = useState<{ card: CardDefinition; is_duplicate: boolean; duplicate_points: number } | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);
  const [screenShake, setScreenShake] = useState(false);

  // Preload core templates on mount so there is zero asset popping/delay during reveal
  useEffect(() => {
    setMounted(true);

    const preloadUrls = [
      "/assets/cards/templates/frame_base.png",
      "/assets/cards/templates/frame_inferno.png",
      "/assets/cards/templates/frame_legend.png",
      "/assets/cards/templates/frame_gold.png",
      "/assets/cards/templates/frame_matchday.png",
      "/assets/cards/templates/reverse_base.png",
      "/assets/cards/templates/reverse_inferno.png",
      "/assets/cards/templates/reverse_legend.png",
      "/assets/cards/templates/reverse_gold.png",
      "/assets/cards/templates/reverse_matchday.png",
      "/teamlogos/gm.png",
      "/assets/players/ryszard-inferno.png",
      "/assets/players/ryszard-gold.png",
      "/assets/players/ryszard-legend.png"
    ];

    preloadUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  // 3D Hover tilt for sealed pack
  const packRef = useRef<HTMLDivElement | null>(null);
  const [packTilt, setPackTilt] = useState({ x: 0, y: 0 });

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
    cardSound.playHaptic("medium");

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

      // Instantly preload all card artwork and player photos from this pack
      data.cards.forEach(item => {
        if (item.card.artwork_url) {
          const img = new Image();
          img.src = item.card.artwork_url;
        }
        if (item.card.player?.photo_path) {
          const img = new Image();
          img.src = item.card.player.photo_path;
        }
      });

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

      const isInferno = topCard?.card?.rarity === "inferno";
      const isLegend = topCard?.card?.rarity === "legendary";
      const isEpic = topCard?.card?.rarity === "epic";
      const isWalkoutTier = isInferno || isLegend || isEpic;

      // Charge up -> Flash transition -> ALWAYS start Tunnel Video
      setTimeout(() => {
        setStage("flash");
        setScreenShake(false);

        setTimeout(() => {
          if (isInferno) {
            cardSound.playSirenAlarm();
          } else {
            cardSound.playCinematicBoom();
          }

          setStage("walkout_teaser_1");
          cardSound.playTeaserHit(1);
          cardSound.playHaptic(isInferno ? "inferno" : "heavy");

          // If top rank is Epic or higher (or Rare in gold packs) -> run full EA FC 3-step teaser sequence
          if (isWalkoutTier || topRank >= 2) {
            setTimeout(() => {
              setStage("walkout_teaser_2");
              cardSound.playTeaserHit(2);
              cardSound.playHaptic("medium");

              setTimeout(() => {
                setStage("walkout_teaser_3");
                cardSound.playTeaserHit(3);
                cardSound.playHaptic("heavy");

                setTimeout(() => {
                  setStage("walkout_slam");
                  setScreenShake(true);
                  cardSound.playPyroBurst();

                  if (isInferno) {
                    cardSound.playReveal("inferno");
                    cardSound.playHaptic("inferno");
                  } else if (isLegend) {
                    cardSound.playWalkoutFanfare();
                    cardSound.playHaptic("walkout");
                  } else {
                    cardSound.playWalkoutFanfare();
                    cardSound.playHaptic("heavy");
                  }

                  setTimeout(() => setScreenShake(false), 900);
                }, 1300);
              }, 1200);
            }, 1200);
          } else {
            // For common cards: quick tunnel flight for 1.2s then smooth slam
            setTimeout(() => {
              setStage("walkout_slam");
              setScreenShake(true);
              cardSound.playReveal("common");
              cardSound.playHaptic("light");
              setTimeout(() => setScreenShake(false), 500);
            }, 1200);
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
    cardSound.playHover();
  };

  // Reveal current card in stage
  const handleRevealCurrent = () => {
    if (!openingResult) return;
    const currentItem = openingResult.cards[currentCardIndex];
    if (!currentItem) return;

    const rarity = (currentItem.card.rarity || "common") as any;
    cardSound.playReveal(rarity);
    cardSound.playHaptic(rarity === "inferno" ? "inferno" : rarity === "legendary" ? "walkout" : "medium");

    setRevealedCards(prev => {
      const updated = [...prev];
      updated[currentCardIndex] = true;
      return updated;
    });
  };

  // Next card in pack
  const handleNextCard = () => {
    if (!openingResult) return;
    cardSound.playHover();
    if (currentCardIndex + 1 < openingResult.cards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setStage("summary");
    }
  };

  // Reveal all cards instantly
  const handleRevealAll = () => {
    if (!openingResult) return;
    cardSound.playWalkoutFanfare();
    cardSound.playHaptic("medium");
    setRevealedCards(new Array(openingResult.cards.length).fill(true));
    setStage("summary");
  };

  const packTheme = pack.theme || "gold";
  const currentCard = openingResult?.cards[currentCardIndex]?.card;
  const currentCardRarity = currentCard?.rarity || "common";

  const topCardRarity = walkoutItem?.card?.rarity || "common";
  const isInfernoWalkout = topCardRarity === "inferno";
  const isLegendWalkout = topCardRarity === "legendary";
  const isEpicWalkout = topCardRarity === "epic";

  const particleTheme = (
    (stage === "revealing" && currentCardRarity === "inferno") || isInfernoWalkout
      ? "inferno" 
      : (stage === "revealing" && currentCardRarity === "legendary") || isLegendWalkout
      ? "legend" 
      : "gold"
  ) as any;

  // Active video background
  const activeVideoSrc = 
    (stage === "walkout_teaser_1" || stage === "walkout_teaser_2" || stage === "walkout_teaser_3")
      ? MEDIA.packOpening.tunnel
      : stage === "walkout_slam"
      ? (isInfernoWalkout
          ? MEDIA.packOpening.bgInferno
          : isLegendWalkout
          ? MEDIA.packOpening.bgLegend
          : pack.id === "matchday_booster"
          ? MEDIA.packOpening.bgMatchday
          : MEDIA.packOpening.bgGold)
      : stage === "revealing"
      ? (currentCardRarity === "inferno"
          ? MEDIA.packOpening.bgInferno
          : currentCardRarity === "legendary"
          ? MEDIA.packOpening.bgLegend
          : (pack.id === "matchday_booster" || currentCard?.card_type === "matchday")
          ? MEDIA.packOpening.bgMatchday
          : MEDIA.packOpening.bgGold)
      : stage === "summary"
      ? (pack.theme === "inferno"
          ? MEDIA.packOpening.bgInferno
          : pack.theme === "legend"
          ? MEDIA.packOpening.bgLegend
          : pack.id === "matchday_booster"
          ? MEDIA.packOpening.bgMatchday
          : MEDIA.packOpening.bgGold)
      : undefined;

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div className={`v104-open-modal ${screenShake ? "v104-screen-shake" : ""}`}>
      {/* FLASH TRANSITION OVERLAY */}
      {stage === "flash" && (
        <div 
          style={{
            position: "absolute",
            inset: 0,
            background: isInfernoWalkout ? "#ff2200" : "#ffffff",
            zIndex: 999,
            pointerEvents: "none",
            animation: "fadeOutFlash 0.3s ease-out forwards"
          }} 
        />
      )}

      {/* INFERNO ALARM RED VIGNETTE OVERLAY */}
      {isInfernoWalkout && (stage === "walkout_teaser_1" || stage === "walkout_teaser_2" || stage === "walkout_teaser_3" || stage === "walkout_slam") && (
        <div className="v200-walkout-siren-overlay" aria-hidden="true" />
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
            <span className="v104-open-eyebrow">DELTA CARDS & COLLECTION VIP</span>
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

      {/* ================= EA FC 25 WALKOUT CINEMATIC SEQUENCE ================= */}
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

          {/* DUAL STADIUM LASERS */}
          <div className="v200-walkout-stadium-lasers" aria-hidden="true">
            <div className={`v200-laser-beam beam-left ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"}`} />
            <div className={`v200-laser-beam beam-right ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"}`} />
          </div>

          {/* Walkout Step 1, 2, 3 Teaser Pillars (EA FC STYLE) */}
          {(stage === "walkout_teaser_1" || stage === "walkout_teaser_2" || stage === "walkout_teaser_3") && (
            <div className="v104-walkout-teaser-container">
              {/* Dynamic Incoming Title Banner */}
              <div className={`v200-walkout-teaser-header ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"}`}>
                {isInfernoWalkout ? (
                  <>
                    <Flame size={18} className="text-red-500 animate-pulse" />
                    <span>🔥 UWAGA! INFERNO WALKOUT WYKRYTY 🔥</span>
                    <Flame size={18} className="text-red-500 animate-pulse" />
                  </>
                ) : isLegendWalkout ? (
                  <>
                    <Crown size={18} className="text-yellow-400 animate-bounce" />
                    <span>👑 LEGENDARNY WALKOUT DELTA INCOMING 👑</span>
                    <Crown size={18} className="text-yellow-400 animate-bounce" />
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-amber-400 animate-spin" />
                    <span>⭐ WALKOUT W TOKU... ZAWODNIK DELTA ⭐</span>
                    <Sparkles size={18} className="text-amber-400 animate-spin" />
                  </>
                )}
              </div>

              <div className="v104-walkout-teasers-row">
                {/* 1. KRAJ & KLUB */}
                <div className={`v200-walkout-pillar-fifa ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"} animate-slideUp`}>
                  <span className="v200-pillar-step-badge">KROK 1 • KLUB & KRAJ</span>
                  <div className="v200-pillar-nation-row">
                    <span className="v200-flag-emoji" role="img" aria-label="Polska">🇵🇱</span>
                    <img 
                      src="/teamlogos/gm.png" 
                      alt="DELTA" 
                      className="v200-pillar-crest-img"
                    />
                  </div>
                  <span className="v200-pillar-val-title">K.S. DELTA WARSZAWA</span>
                  <span className="v200-pillar-sub">ROCZNIK 2018 GM</span>
                </div>

                {/* 2. POZYCJA */}
                {(stage === "walkout_teaser_2" || stage === "walkout_teaser_3") && (
                  <div className={`v200-walkout-pillar-fifa ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"} animate-slideUp`}>
                    <span className="v200-pillar-step-badge">KROK 2 • POZYCJA</span>
                    <div className="v200-pillar-pos-wrap">
                      <span className="v200-pillar-pos-tag">
                        {walkoutItem.card.player?.position?.toUpperCase() || "POMOCNIK"}
                      </span>
                    </div>
                    <span className="v200-pillar-val-title">
                      {walkoutItem.card.card_type === "mvp" ? "⭐ DELTA MVP" : walkoutItem.card.card_type === "goal_hunter" ? "🎯 ŁOWCA BRAMEK" : "PIERWSZY SKŁAD"}
                    </span>
                    <span className="v200-pillar-sub">SEZON 2026/27</span>
                  </div>
                )}

                {/* 3. NUMER KOSZULKI */}
                {stage === "walkout_teaser_3" && (
                  <div className={`v200-walkout-pillar-fifa ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"} animate-slideUp`}>
                    <span className="v200-pillar-step-badge">KROK 3 • NUMER</span>
                    <div className="v200-pillar-num-wrap">
                      <span className="v200-pillar-number-glow">
                        #{walkoutItem.card.player?.shirt_number || "DELTA"}
                      </span>
                    </div>
                    <span className="v200-pillar-val-title">
                      {walkoutItem.card.player?.display_name?.split(" ")[0]?.toUpperCase() || "GWIAZDA"}
                    </span>
                    <span className="v200-pillar-sub">DUMA DRUŻYNY</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STADIUM PYRO JETS IN BACKGROUND */}
          {stage === "walkout_slam" && (
            <div className="v200-walkout-pyro-container" aria-hidden="true">
              <div className={`v200-walkout-pyro-jet left ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"}`}>
                <div className="v200-pyro-flame-core" />
              </div>
              <div className={`v200-walkout-pyro-jet right ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"}`}>
                <div className="v200-pyro-flame-core" />
              </div>
            </div>
          )}

          {/* Walkout Step 4: Grand Slam Reveal */}
          {stage === "walkout_slam" && (
            <div className="v104-walkout-slam-container animate-slamZoom">
              {/* Top Walkout Luxury Ribbon */}
              <div className={`v200-walkout-ribbon ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : "gold"}`}>
                {isInfernoWalkout ? (
                  <>
                    <Flame size={20} className="text-red-500 animate-bounce" />
                    <span>🔥 ULTRA INFERNO WALKOUT • ELITA DELTA 2018 🔥</span>
                    <Flame size={20} className="text-red-500 animate-bounce" />
                  </>
                ) : isLegendWalkout ? (
                  <>
                    <Crown size={20} className="text-yellow-400 animate-bounce" />
                    <span>👑 OFICJALNY WALKOUT DELTA • SEZON 2026/27 👑</span>
                    <Crown size={20} className="text-yellow-400 animate-bounce" />
                  </>
                ) : (
                  <>
                    <Sparkles size={20} className="text-amber-400 animate-spin" />
                    <span>⭐ SPECIAL WALKOUT • GWIAZDA DRUŻYNY ⭐</span>
                    <Sparkles size={20} className="text-amber-400 animate-spin" />
                  </>
                )}
              </div>

              {/* 3D Grand Card Showcase with High-Contrast Stage */}
              <div className="v200-walkout-card-stage">
                <CollectibleCard3D
                  card={walkoutItem.card}
                  userCard={undefined}
                  isLocked={false}
                  size="xl"
                  interactive={true}
                  showFlip={true}
                />
              </div>

              {/* Player Details Card */}
              <div className="v104-walkout-details">
                <span className="v104-walkout-player-title">
                  {walkoutItem.card.title || walkoutItem.card.card_name}
                </span>
                <span className="v104-walkout-player-name">
                  {walkoutItem.card.player?.display_name || "Zawodnik DELTA"}
                </span>
                {walkoutItem.is_duplicate && (
                  <span className="v104-duplicate-tag">
                    <Coins size={14} className="inline mr-1" /> DUPLIKAT (+{walkoutItem.duplicate_points} DP)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleProceedToPack}
                className={`v104-walkout-continue-btn ${isInfernoWalkout ? "inferno" : isLegendWalkout ? "legend" : ""}`}
              >
                <span>ODKRYJ POZOSTAŁE KARTY W PACZCE</span>
                <ChevronRight size={20} />
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
            className={`v104-open-foil-pack-3d ${packTheme === "inferno" ? "inferno" : packTheme === "legend" ? "legend" : packTheme === "matchday" ? "matchday" : "gold"} ${stage === "charging" ? "charging-glow" : ""}`}
          >
            {/* Tear Line Indicator at Top */}
            <div className="v104-open-tear-header">
              <span>{stage === "charging" ? "⚡ ROZRYWANIE FOLII..." : "✂️ KLIKNIJ, ABY OTWORZYĆ"}</span>
              <Sparkles size={16} style={{ color: "#fde047" }} />
            </div>

            {/* Realistic HD Pack Wrapper Artwork */}
            <div className="v104-open-pack-art-container">
              <img 
                src={pack.image_url || getPackImageUrl(pack.id, pack.theme)} 
                alt={pack.name} 
                className="v104-open-pack-art-img"
              />
              <div className="v104-open-pack-foil-shimmer" />
            </div>

            {/* Pack Footer */}
            <div className="v104-open-pack-footer">
              <span>GWARANTOWANA MINIMALNA:</span>
              <b style={{ color: "#f1c95c" }}>{pack.min_rarity.toUpperCase()}</b>
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
                      cardSound.playHaptic("light");
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

  return createPortal(modalContent, document.body);
}
