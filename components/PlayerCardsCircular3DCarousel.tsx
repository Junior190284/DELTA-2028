"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Layers,
  RotateCw,
  Eye,
  Hand
} from "lucide-react";
import { CardDefinition, UserCard, CardLayoutConfig } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";

interface PlayerCardsCircular3DCarouselProps {
  cards: CardDefinition[];
  ownedCardsMap: Map<string, UserCard>;
  onInspectCard: (card: CardDefinition, userCard: UserCard | null) => void;
  onCinematicReveal: (card: CardDefinition) => void;
  getCardUnlockCondition: (card: CardDefinition) => string;
  layoutsMap?: Record<string, Partial<CardLayoutConfig>>;
}

export default function PlayerCardsCircular3DCarousel({
  cards,
  ownedCardsMap,
  onInspectCard,
  onCinematicReveal,
  getCardUnlockCondition,
  layoutsMap
}: PlayerCardsCircular3DCarouselProps) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [radius, setRadius] = useState(380);

  const startXRef = useRef(0);
  const startRotationRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalCards = cards.length || 6;
  const angleStep = 360 / totalCards;

  // Responsive radius calculation
  useEffect(() => {
    const updateRadius = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 640) {
          setRadius(240);
        } else if (window.innerWidth < 1024) {
          setRadius(320);
        } else {
          setRadius(380);
        }
      }
    };
    updateRadius();
    window.addEventListener("resize", updateRadius);
    return () => window.removeEventListener("resize", updateRadius);
  }, []);

  // Compute active front card index
  const activeIndex = useMemo(() => {
    if (totalCards === 0) return 0;
    const normalized = ((-Math.round(rotation / angleStep) % totalCards) + totalCards) % totalCards;
    return normalized;
  }, [rotation, angleStep, totalCards]);

  const activeCard = cards[activeIndex] || cards[0];
  const activeUserCard = activeCard ? (ownedCardsMap.get(activeCard.id) || null) : null;
  const isFrontLocked = !activeUserCard;

  // Mouse & Touch Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    startXRef.current = e.clientX;
    startRotationRef.current = rotation;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    if (Math.abs(deltaX) > 6) {
      setHasDragged(true);
    }
    // Convert horizontal pixel drag to rotation degrees
    const sensitivity = radius < 300 ? 0.55 : 0.42;
    const newRotation = startRotationRef.current + deltaX * sensitivity;
    setRotation(newRotation);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    // Snap smoothly to nearest card
    const snappedRotation = Math.round(rotation / angleStep) * angleStep;
    setRotation(snappedRotation);
    cardSound.playHover();
    cardSound.playHaptic("light");
  };

  // Step rotation via arrows or edition pills
  const rotateToStep = useCallback((stepIndex: number) => {
    const targetAngle = -stepIndex * angleStep;
    // Calculate shortest angular path
    const currentNorm = rotation % 360;
    const targetNorm = targetAngle % 360;
    let diff = targetNorm - currentNorm;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    setRotation(prev => prev + diff);
    cardSound.playHover();
    cardSound.playHaptic("light");
  }, [rotation, angleStep]);

  const rotateLeft = () => {
    setRotation(prev => Math.round(prev / angleStep) * angleStep + angleStep);
    cardSound.playHover();
    cardSound.playHaptic("light");
  };

  const rotateRight = () => {
    setRotation(prev => Math.round(prev / angleStep) * angleStep - angleStep);
    cardSound.playHover();
    cardSound.playHaptic("light");
  };

  return (
    <div 
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        position: "relative",
        userSelect: "none",
        padding: "10px 0 20px 0"
      }}
    >
      {/* 1. Carousel Header with Controls & Drag Hint */}
      <div 
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          padding: "0 8px"
        }}
      >
        <div>
          <span className="eyebrow gold">
            <Layers size={14} style={{ display: "inline", marginRight: "4px" }} />
            KOŁO 3D KART W KOLEKCJI ({cards.length})
          </span>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
            Przeciągaj myszką lub palcem po kole 3D. Kliknij kartę, aby obejrzeć historię na rewersie!
          </p>
        </div>

        {/* Carousel Navigation Arrows */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={rotateLeft}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(241, 201, 92, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f1c95c",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.5)"
            }}
            aria-label="Obróć w lewo"
          >
            <ChevronLeft size={22} />
          </button>

          <span 
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 900,
              fontFamily: "monospace"
            }}
          >
            {activeIndex + 1} / {totalCards}
          </span>

          <button
            type="button"
            onClick={rotateRight}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(241, 201, 92, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f1c95c",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.5)"
            }}
            aria-label="Obróć w prawo"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* 2. 3D Circular Revolving Stage */}
      <div 
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: "100%",
          height: radius < 300 ? "410px" : "480px",
          position: "relative",
          perspective: "1400px",
          perspectiveOrigin: "50% 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "pan-y",
          overflow: "visible"
        }}
      >
        {/* Revolving 3D Ring Container */}
        <div 
          style={{
            width: "230px",
            height: "340px",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotation}deg)`,
            transition: isDragging ? "none" : "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {cards.map((card, idx) => {
            const userCard = ownedCardsMap.get(card.id) || null;
            const isLocked = !userCard;
            const cardAngle = idx * angleStep;

            // Calculate relative angle from front (0 deg)
            const currentTotalAngle = (cardAngle + rotation) % 360;
            const normalizedAngle = ((currentTotalAngle + 180) % 360 + 360) % 360 - 180;
            const isFront = Math.abs(normalizedAngle) < (angleStep / 2);
            const isBack = Math.abs(normalizedAngle) > 95;

            return (
              <div
                key={card.id}
                onClick={() => {
                  if (hasDragged) return;
                  if (!isFront) {
                    rotateToStep(idx);
                  } else {
                    onInspectCard(card, userCard);
                  }
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "230px",
                  height: "340px",
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${cardAngle}deg) translateZ(${radius}px) scale(${isFront ? 1.05 : 0.88})`,
                  opacity: isBack ? 0.35 : isFront ? 1 : 0.75,
                  filter: isBack ? "blur(2px) grayscale(40%)" : "none",
                  transition: "opacity 0.4s ease, filter 0.4s ease, transform 0.4s ease",
                  cursor: isFront ? "pointer" : "pointer",
                  pointerEvents: "auto",
                  zIndex: isFront ? 100 : Math.round(100 - Math.abs(normalizedAngle))
                }}
              >
                <div style={{ pointerEvents: isFront ? "auto" : "none", width: "100%", height: "100%" }}>
                  <CollectibleCard3D
                    card={card}
                    userCard={userCard}
                    isLocked={isLocked}
                    size="md"
                    interactive={isFront}
                    showFlip={isFront}
                    layoutOverride={layoutsMap ? (layoutsMap[`${card.player_id}_${card.card_type}`] || layoutsMap[`${card.player_id}_base`]) : undefined}
                    onClick={() => {
                      if (!hasDragged && isFront) {
                        onInspectCard(card, userCard);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Grab/Swipe Hint overlay at bottom */}
        <div 
          style={{
            position: "absolute",
            bottom: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 14px",
            borderRadius: "20px",
            background: "rgba(0, 0, 0, 0.65)",
            border: "1px solid rgba(241, 201, 92, 0.3)",
            color: "#f1c95c",
            fontSize: "11px",
            fontWeight: 800,
            backdropFilter: "blur(6px)",
            pointerEvents: "none"
          }}
        >
          <RotateCw size={13} />
          <span>PRZECIĄGNIJ MYSZKĄ LUB PALCEM, ABY KRĘCIĆ KOŁEM KART</span>
        </div>
      </div>

      {/* 3. Edition Selector Pills (BASE, MATCHDAY, WARRIOR, HUNTER, MVP, INFERNO) */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "16px",
          width: "100%"
        }}
      >
        {cards.map((card, idx) => {
          const isSelected = activeIndex === idx;
          const userCard = ownedCardsMap.get(card.id) || null;
          const isOwned = !!userCard;

          const theme = (card.rarity || "common").toLowerCase();
          const themeColor = 
            theme === "inferno" ? "#ff4d5a" :
            theme === "legendary" ? "#f1c95c" :
            theme === "epic" ? "#a855f7" :
            theme === "rare" ? "#38bdf8" : "#94a3b8";

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => rotateToStep(idx)}
              style={{
                padding: "8px 14px",
                borderRadius: "12px",
                background: isSelected 
                  ? `linear-gradient(135deg, ${themeColor}33 0%, rgba(15, 23, 42, 0.9) 100%)` 
                  : "rgba(255, 255, 255, 0.04)",
                border: isSelected 
                  ? `2px solid ${themeColor}` 
                  : "1px solid rgba(255, 255, 255, 0.1)",
                color: isSelected ? "#ffffff" : "#94a3b8",
                fontSize: "11px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: isSelected ? `0 0 16px ${themeColor}44` : "none",
                transition: "all 0.2s"
              }}
            >
              <span 
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isOwned ? "#34d399" : "rgba(255,255,255,0.2)",
                  display: "inline-block"
                }} 
              />
              <span>{(card.card_name || card.title || card.rarity).toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Front Active Card Action & Status Panel */}
      {activeCard && (
        <div 
          style={{
            marginTop: "16px",
            width: "100%",
            maxWidth: "460px",
            padding: "14px 18px",
            borderRadius: "18px",
            background: "linear-gradient(180deg, rgba(13, 27, 56, 0.8) 0%, rgba(5, 12, 26, 0.95) 100%)",
            border: "1px solid rgba(241, 201, 92, 0.4)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "10px", color: "#f1c95c", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                WYBRANA KARTA 3D
              </span>
              <h4 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 900, color: "#ffffff" }}>
                {activeCard.card_name || activeCard.title}
              </h4>
            </div>

            <span 
              style={{
                padding: "3px 10px",
                borderRadius: "20px",
                background: !isFrontLocked ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.08)",
                border: !isFrontLocked ? "1px solid #34d399" : "1px solid rgba(255, 255, 255, 0.2)",
                color: !isFrontLocked ? "#34d399" : "#94a3b8",
                fontSize: "11px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              {!isFrontLocked ? <CheckCircle2 size={13} /> : <Lock size={13} />}
              {!isFrontLocked 
                ? `ODBLOKOWANA ${activeUserCard?.duplicates_count ? `(+${activeUserCard.duplicates_count})` : ""}` 
                : "ZABLOKOWANA"}
            </span>
          </div>

          {!isFrontLocked ? (
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                type="button"
                onClick={() => onInspectCard(activeCard, activeUserCard)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
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
                <Eye size={14} />
                <span>POWIĘKSZ I OBRÓĆ 3D</span>
              </button>

              <button
                type="button"
                onClick={() => onCinematicReveal(activeCard)}
                style={{
                  flex: 1.2,
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "linear-gradient(90deg, #f1c95c, #eab308)",
                  border: "none",
                  color: "#000000",
                  fontSize: "11px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(241, 201, 92, 0.35)"
                }}
              >
                <Sparkles size={14} />
                <span>KINOWY REVEAL 3D</span>
              </button>
            </div>
          ) : (
            <div 
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                fontSize: "11px",
                color: "#94a3b8",
                textAlign: "center"
              }}
            >
              {getCardUnlockCondition(activeCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
