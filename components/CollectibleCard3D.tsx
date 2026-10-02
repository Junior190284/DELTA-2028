"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  Flame, 
  Sparkles, 
  RotateCw, 
  Lock, 
  Crown, 
  CheckCircle2, 
  HelpCircle,
  ShieldAlert,
  Hand,
  Compass
} from "lucide-react";
import PlayerPhoto from "./PlayerPhoto";
import { CardDefinition, CardRarity, RARITY_CONFIG, CARD_TYPES_CONFIG, UserCard } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

interface CollectibleCard3DProps {
  card: CardDefinition;
  userCard?: UserCard | null;
  isLocked?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
  showFlip?: boolean;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  onClick?: () => void;
  stats?: {
    matches?: number;
    goals?: number;
    assists?: number;
    trainings?: number;
    mvp?: number;
    captain?: number;
  };
}

export default function CollectibleCard3D({
  card,
  userCard,
  isLocked = false,
  size = "md",
  interactive = true,
  showFlip = true,
  isFlipped: controlledFlipped,
  onFlipChange,
  onClick,
  stats
}: CollectibleCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [internalRotateY, setInternalRotateY] = useState(controlledFlipped ? 180 : 0);
  const [internalRotateX, setInternalRotateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [show3dBadge, setShow3dBadge] = useState(true);

  // Sync external flipped state if controlled
  useEffect(() => {
    if (controlledFlipped !== undefined) {
      const targetY = controlledFlipped ? 180 : 0;
      setInternalRotateY(targetY);
    }
  }, [controlledFlipped]);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startRotY: number;
    startRotX: number;
    startTime: number;
    lastX: number;
    lastTime: number;
    velocityX: number;
  } | null>(null);

  const hasMovedRef = useRef(false);

  // Flip action for button click or tap
  const flipToNextFace = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const curFace = Math.round(internalRotateY / 180);
    // Alternate between 0 (front) and 180 (back) multiples
    const nextSnapY = (Math.abs(curFace) % 2 === 0) ? curFace * 180 + 180 : curFace * 180 - 180;
    setInternalRotateY(nextSnapY);
    setInternalRotateX(0);
    const isBack = Math.abs((nextSnapY / 180) % 2) === 1;
    cardSound.playFlip();
    onFlipChange?.(isBack);
  }, [internalRotateY, onFlipChange]);

  // Pointer Down (Mouse or Touch) -> Start Grab
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotY: internalRotateY,
      startRotX: internalRotateX,
      startTime: Date.now(),
      lastX: e.clientX,
      lastTime: Date.now(),
      velocityX: 0
    };

    hasMovedRef.current = false;
    setIsDragging(true);
    setShow3dBadge(false);
  };

  // Pointer Move -> 3D Direct Spin Physics
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;

    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;

      if (Math.hypot(dx, dy) > 5) {
        hasMovedRef.current = true;
      }

      // Rotate Y (Horizontal drag -> continuous 360 spin, sensitivity = 0.65 deg/px)
      const newRotY = dragStartRef.current.startRotY + dx * 0.65;
      // Rotate X (Vertical tilt -> clamped between -25 and +25 deg, sensitivity = 0.25 deg/px)
      const newRotX = Math.max(-25, Math.min(25, dragStartRef.current.startRotX - dy * 0.25));

      // Velocity calculation for momentum flick
      const now = Date.now();
      const dt = Math.max(1, now - dragStartRef.current.lastTime);
      const vx = (e.clientX - dragStartRef.current.lastX) / dt;
      dragStartRef.current.lastX = e.clientX;
      dragStartRef.current.lastTime = now;
      dragStartRef.current.velocityX = vx;

      setInternalRotateY(newRotY);
      setInternalRotateX(newRotX);

      // Glare reflection shifts realistically across the 3D surface
      const glareX = 50 + (newRotY % 180) * 0.4;
      const glareY = 50 + newRotX * 1.5;
      setGlarePos({ x: Math.max(0, Math.min(100, glareX)), y: Math.max(0, Math.min(100, glareY)), opacity: 0.85 });
    } else if (isHovered && cardRef.current) {
      // Desktop gentle mouse hover tilt
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotX = -((y - centerY) / centerY) * 10;
      const rotY = ((x - centerX) / centerX) * 10;
      const baseSnap = Math.round(internalRotateY / 180) * 180;

      setInternalRotateX(rotX);
      setInternalRotateY(baseSnap + rotY);

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      setGlarePos({ x: glareX, y: glareY, opacity: 0.65 });
    }
  };

  // Pointer Up / Cancel -> Release Grab & Spring Snap to Front or Back
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDragging || !dragStartRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const wasDrag = hasMovedRef.current;
    const vx = dragStartRef.current.velocityX;
    const startRotY = dragStartRef.current.startRotY;
    
    dragStartRef.current = null;
    setIsDragging(false);
    setInternalRotateX(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));

    if (!wasDrag) {
      // Simple click/tap occurred
      if (onClick) {
        onClick();
      } else {
        flipToNextFace();
      }
      return;
    }

    // Drag gesture ended -> Calculate momentum & Snap to nearest face (0 or 180)
    let projectedY = internalRotateY + vx * 80;
    const snapY = Math.round(projectedY / 180) * 180;
    setInternalRotateY(snapY);

    const prevFace = Math.round(startRotY / 180);
    const newFace = Math.round(snapY / 180);
    const isBack = Math.abs(newFace % 2) === 1;

    if (prevFace !== newFace) {
      cardSound.playFlip();
      onFlipChange?.(isBack);
    }
  };

  const handlePointerEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
    cardSound.playHover();
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    if (!isDragging) {
      const baseSnap = Math.round(internalRotateY / 180) * 180;
      setInternalRotateX(0);
      setInternalRotateY(baseSnap);
      setGlarePos(prev => ({ ...prev, opacity: 0 }));
    }
  };

  const rarity = (card.rarity || "common").toLowerCase() as CardRarity;
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const typeConfig = CARD_TYPES_CONFIG[card.card_type] || { name: card.card_type.toUpperCase(), defaultRarity: "common", description: "" };

  const isRyszard = (card.player?.display_name || "").toLowerCase().includes("ryszard");
  
  // Custom cutout selection
  let cutoutImage: string | null = null;
  if (!isLocked) {
    if (isRyszard) {
      if (rarity === "inferno") cutoutImage = "/assets/players/ryszard-inferno.png";
      else if (rarity === "legendary") cutoutImage = "/assets/players/ryszard-gold.png";
      else cutoutImage = "/assets/players/ryszard-legend.png";
    } else if (card.artwork_url) {
      cutoutImage = card.artwork_url;
    }
  }

  // Exact fixed card dimensions
  const dim = {
    sm: { w: 140, h: 210 },
    md: { w: 185, h: 275 },
    lg: { w: 240, h: 355 },
    xl: { w: 300, h: 445 }
  }[size];

  // Derive if currently showing reverse side (facing angle)
  const normalizedY = ((internalRotateY % 360) + 360) % 360;
  const isBackSideFacing = normalizedY > 90 && normalizedY < 270;

  return (
    <div 
      className={`v104-cc-wrap ${interactive ? "interactive" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        width: `${dim.w}px`,
        height: `${dim.h}px`,
        minWidth: `${dim.w}px`,
        maxWidth: `${dim.w}px`,
        minHeight: `${dim.h}px`,
        maxHeight: `${dim.h}px`,
        touchAction: interactive ? "none" : "auto",
        cursor: !interactive ? "default" : isDragging ? "grabbing" : "grab"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div 
        ref={cardRef}
        className={`v104-cc-inner ${isHovered ? "hovered" : ""}`}
        style={{
          transform: `perspective(1100px) rotateX(${internalRotateX}deg) rotateY(${internalRotateY}deg)`,
          transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.15), box-shadow 0.35s ease",
          boxShadow: isLocked 
            ? `0 6px 20px rgba(0,0,0,0.7), 0 0 12px ${config.borderGlow}`
            : isDragging
            ? `0 20px 40px -10px ${config.borderGlow}, 0 0 30px ${config.borderGlow}`
            : `0 10px 30px -5px ${config.borderGlow}, 0 0 20px ${config.borderGlow}`
        }}
      >
        {/* ================= FRONT SIDE ================= */}
        <div 
          className="v104-cc-face"
          style={{
            background: isLocked 
              ? `linear-gradient(180deg, rgba(18, 24, 38, 0.95) 0%, rgba(10, 13, 20, 0.98) 100%), radial-gradient(circle at 50% 40%, ${config.borderGlow} 0%, transparent 70%)`
              : rarity === "inferno"
                ? "radial-gradient(circle at 50% 25%, #7f1d1d 0%, #200404 60%, #0a0101 100%)"
                : rarity === "legendary"
                  ? "radial-gradient(circle at 50% 25%, #854d0e 0%, #2d1804 60%, #0f0701 100%)"
                  : rarity === "epic"
                    ? "radial-gradient(circle at 50% 25%, #581c87 0%, #1f0738 60%, #0b0214 100%)"
                    : rarity === "rare"
                      ? "radial-gradient(circle at 50% 25%, #0369a1 0%, #082f49 60%, #03131e 100%)"
                      : "radial-gradient(circle at 50% 25%, #334155 0%, #0f172a 60%, #050811 100%)",
            borderColor: config.color,
            boxShadow: `inset 0 0 20px rgba(0,0,0,0.8), inset 0 0 10px ${config.borderGlow}`
          }}
        >
          {/* Dynamic Specular Sheen */}
          <div 
            className="v104-cc-shimmer"
            style={{
              backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
              opacity: glarePos.opacity > 0 ? glarePos.opacity : 0.3
            }}
          />

          {/* TOP HEADER ROW: DELTA Crest + Rarity Tag */}
          <div className="v104-cc-header">
            <div className="v104-cc-brand">
              <img 
                src="/teamlogos/gm.png" 
                alt="DELTA" 
                width={16}
                height={16}
                className="v104-cc-brand-logo" 
              />
              <span className="v104-cc-brand-text">GM</span>
            </div>
            
            <span 
              className="v104-cc-rarity-badge"
              style={{
                backgroundColor: config.color,
                color: rarity === "legendary" || rarity === "rare" || rarity === "common" ? "#000" : "#fff",
                boxShadow: `0 0 10px ${config.color}88`
              }}
            >
              {rarity === "inferno" && <Flame size={9} />}
              {rarity === "legendary" && <Crown size={9} />}
              {rarity === "epic" && <Sparkles size={9} />}
              {config.label}
            </span>
          </div>

          {/* CARD TYPE BADGE */}
          <div className="v104-cc-type-badge-wrap">
            <div 
              className="v104-cc-type-badge"
              style={{
                borderColor: `${config.color}88`,
                color: config.color
              }}
            >
              {card.title || typeConfig.name}
            </div>
          </div>

          {/* CENTER: PLAYER CUTOUT ARTWORK / LOCKED SILHOUETTE */}
          <div className="v104-cc-body">
            {isLocked ? (
              /* ===== LOCKED MYSTERY CARD FORMAT ===== */
              <div className="v104-cc-mystery-container">
                <div 
                  className="v104-cc-mystery-box"
                  style={{ 
                    borderColor: `${config.color}aa`,
                    boxShadow: `0 0 20px ${config.borderGlow}`
                  }}
                >
                  <span className="v104-cc-mystery-qmark" style={{ color: config.color }}>
                    ?
                  </span>
                  <div className="v104-cc-mystery-lock">
                    <Lock size={12} />
                  </div>
                </div>

                <div className="v104-cc-mystery-info">
                  <span className="v104-cc-mystery-title">
                    DO ODKRYCIA
                  </span>
                  <span className="v104-cc-mystery-sub">
                    Otwórz w paczce
                  </span>
                </div>
              </div>
            ) : cutoutImage ? (
              /* ===== UNLOCKED CUTOUT ===== */
              <div className="v104-cc-cutout-wrap">
                <img 
                  src={cutoutImage} 
                  alt={card.player?.display_name || "Zawodnik"}
                  className="v104-cc-cutout-img"
                />
              </div>
            ) : (
              /* ===== UNLOCKED BADGE ===== */
              <div 
                className="v104-cc-avatar-badge"
                style={{ borderColor: config.color }}
              >
                <span style={{ color: "#f1c95c", fontWeight: 900, fontSize: "14px" }}>
                  {(card.player?.display_name || "D").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* BOTTOM PLAYER IDENTITY FOOTER */}
          <div className="v104-cc-footer">
            <div className="v104-cc-footer-row">
              <div className="v104-cc-footer-left">
                <span className="v104-cc-player-pos">
                  {card.player?.position || "ZAWODNIK"} • #{card.player?.shirt_number || "GM"}
                </span>
                <h3 className="v104-cc-player-name">
                  {isLocked ? (card.player?.display_name || "???") : (card.player?.display_name || card.card_name)}
                </h3>
              </div>
              
              <div className="v104-cc-footer-right">
                <span className="v104-cc-season-label">SEZON</span>
                <span className="v104-cc-season-val">{card.season || "2026/27"}</span>
              </div>
            </div>

            {/* DUPLICATES BADGE */}
            {userCard && userCard.duplicates_count > 0 && (
              <div className="v104-cc-dup-badge">
                <span className="owned">
                  <CheckCircle2 size={9} /> W kolekcji (x{userCard.duplicates_count + 1})
                </span>
                <span className="num">#{String(card.card_number || 1).padStart(3, '0')}</span>
              </div>
            )}
          </div>

          {/* FLIP BUTTON HELPER (TOP RIGHT) */}
          {showFlip && (
            <button
              type="button"
              onClick={flipToNextFace}
              className="v104-cc-flip-btn"
              title="Chwyć kartę lub kliknij, aby obrócić w 3D"
              aria-label="Obróć kartę"
            >
              <RotateCw size={11} />
            </button>
          )}

          {/* 3D ROTATE AFFORDANCE HINT (LARGE/XL) */}
          {interactive && (size === "lg" || size === "xl") && show3dBadge && (
            <div className="v104-cc-drag-cue">
              <Compass size={11} className="spin-slow" />
              <span>Chwyć i obróć w 3D</span>
            </div>
          )}
        </div>

        {/* ================= REVERSE SIDE (LORE, STATS, OFFICIAL CLUB STAMP) ================= */}
        <div 
          className="v104-cc-face reverse"
          style={{
            borderColor: config.borderGlow,
            boxShadow: `0 8px 24px -4px ${config.borderGlow}, inset 0 0 16px -4px ${config.borderGlow}`
          }}
        >
          {/* Dynamic Specular Sheen on Reverse */}
          <div 
            className="v104-cc-shimmer"
            style={{
              backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
              opacity: glarePos.opacity > 0 ? glarePos.opacity : 0.25
            }}
          />

          {/* Top Bar on Reverse */}
          <div className="v104-cc-reverse-top">
            <div className="v104-cc-brand">
              <img 
                src="/teamlogos/gm.png" 
                alt="DELTA" 
                width={16}
                height={16}
                className="v104-cc-brand-logo" 
              />
              <span className="v104-cc-brand-text">DELTA GM</span>
            </div>
            <span style={{ color: "#f1c95c", fontFamily: "monospace", fontSize: "8.5px", fontWeight: 800 }}>
              #{String(card.card_number || 1).padStart(3, '0')}
            </span>
          </div>

          {/* Middle: Lore Story & Player Facts */}
          <div className="v104-cc-reverse-body">
            <div>
              <span style={{ fontSize: "7.5px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 800, display: "block" }}>
                EDYCJA KOLEKCJONERSKA
              </span>
              <span style={{ fontSize: "10.5px", fontWeight: 900, color: config.color }}>
                {card.title || typeConfig.name}
              </span>
            </div>

            {card.lore || card.description ? (
              <div className="v104-cc-reverse-lore">
                "{card.lore || card.description}"
              </div>
            ) : (
              <div className="v104-cc-reverse-lore" style={{ color: "#cbd5e1" }}>
                Oficjalna karta DELTA 2018 GM zawodnika {card.player?.display_name || "DELTA GM"}. Sezon {card.season || "2026/27"}.
              </div>
            )}

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", paddingTop: "2px", textAlign: "center" }}>
              <div style={{ padding: "4px 2px", borderRadius: "6px", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "7px", color: "#94a3b8", display: "block", fontWeight: 800 }}>MECZE</span>
                <strong style={{ fontSize: "10px", color: "#fff", fontWeight: 900 }}>{stats?.matches || (userCard ? 8 : 0)}</strong>
              </div>
              <div style={{ padding: "4px 2px", borderRadius: "6px", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "7px", color: "#94a3b8", display: "block", fontWeight: 800 }}>GOLE</span>
                <strong style={{ fontSize: "10px", color: "#f1c95c", fontWeight: 900 }}>{stats?.goals || (userCard ? 4 : 0)}</strong>
              </div>
              <div style={{ padding: "4px 2px", borderRadius: "6px", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "7px", color: "#94a3b8", display: "block", fontWeight: 800 }}>ASYSTY</span>
                <strong style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 900 }}>{stats?.assists || (userCard ? 3 : 0)}</strong>
              </div>
            </div>
          </div>

          {/* Bottom Stamp & Certificate */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "7.5px", color: "#94a3b8", fontWeight: 600 }}>
              {userCard?.acquired_at 
                ? new Date(userCard.acquired_at).toLocaleDateString("pl-PL") 
                : "DELTA 2018 GM"}
            </span>
            <span style={{ fontSize: "7.5px", color: "#f1c95c", fontWeight: 900, letterSpacing: "0.06em" }}>
              INFERNO AUTHENTIC
            </span>
          </div>

          {/* Flip Back Button */}
          {showFlip && (
            <button
              type="button"
              onClick={flipToNextFace}
              className="v104-cc-flip-btn"
              title="Obróć na awers"
              aria-label="Obróć na awers"
            >
              <RotateCw size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
