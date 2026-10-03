"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  Compass,
  Zap,
  Shield
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

// Compute dynamic realistic FIFA attributes based on card rarity, player name and position
function getCardFIFAStats(card: CardDefinition, stats?: any) {
  const rarity = (card.rarity || "common").toLowerCase();
  const name = card.player?.display_name || card.card_name || "DELTA";
  const nameHash = name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);

  const baseOvr = 
    rarity === "inferno" ? 95 :
    rarity === "legendary" ? 90 :
    rarity === "epic" ? 85 :
    rarity === "rare" ? 80 : 75;

  const extraGoals = stats?.goals ? Math.min(3, Math.floor(stats.goals / 2)) : 0;
  const extraMatches = stats?.matches ? Math.min(2, Math.floor(stats.matches / 5)) : 0;
  const ovr = Math.min(99, baseOvr + (nameHash % 4) + extraGoals + extraMatches);

  const posRaw = (card.player?.position || "POM").toUpperCase();
  const isForward = posRaw.includes("NAP") || posRaw.includes("ST") || posRaw.includes("FW") || card.card_type === "goal_hunter";
  const isDefender = posRaw.includes("OBR") || posRaw.includes("CB") || posRaw.includes("DF") || posRaw.includes("BRAM") || posRaw.includes("GK");
  
  const posCode = posRaw.includes("NAP") ? "ST" : posRaw.includes("BRAM") ? "GK" : posRaw.includes("OBR") ? "CB" : "CAM";

  const pac = Math.min(99, ovr - (isForward ? 1 : 4) + (nameHash % 4));
  const sho = isForward ? Math.min(99, ovr + 2) : Math.min(99, ovr - 7 + (nameHash % 5));
  const pas = Math.min(99, ovr - 2 + ((nameHash + 2) % 5));
  const dri = isForward ? Math.min(99, ovr + 3) : Math.min(99, ovr - 3 + (nameHash % 4));
  const def = isDefender ? Math.min(99, ovr + 2) : Math.min(99, ovr - 12 + (nameHash % 6));
  const phy = isDefender ? Math.min(99, ovr + 3) : Math.min(99, ovr - 4 + ((nameHash + 1) % 5));

  return { ovr, posCode, pac, sho, pas, dri, def, phy };
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
    const nextSnapY = (Math.abs(curFace) % 2 === 0) ? curFace * 180 + 180 : curFace * 180 - 180;
    setInternalRotateY(nextSnapY);
    setInternalRotateX(0);
    const isBack = Math.abs((nextSnapY / 180) % 2) === 1;
    cardSound.playFlip();
    cardSound.playHaptic("light");
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
    cardSound.playHaptic("light");
  };

  // Pointer Move -> Smooth 3D Orbit Dragging
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;

    if (isDragging && dragStartRef.current) {
      const now = Date.now();
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      const dt = now - dragStartRef.current.lastTime;
      if (dt > 0) {
        const stepDx = e.clientX - dragStartRef.current.lastX;
        dragStartRef.current.velocityX = stepDx / dt;
        dragStartRef.current.lastX = e.clientX;
        dragStartRef.current.lastTime = now;
      }

      const rotY = dragStartRef.current.startRotY + (dx * 0.75);
      const rotX = Math.max(-28, Math.min(28, dragStartRef.current.startRotX - (dy * 0.45)));

      setInternalRotateY(rotY);
      setInternalRotateX(rotX);

      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const glareX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const glareY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setGlarePos({ x: glareX, y: glareY, opacity: 0.85 });
      }
    } else if (isHovered && cardRef.current) {
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

  // Pointer Up / Cancel
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
      if (onClick) {
        onClick();
      } else {
        flipToNextFace();
      }
      return;
    }

    let projectedY = internalRotateY + vx * 80;
    const snapY = Math.round(projectedY / 180) * 180;
    setInternalRotateY(snapY);

    const prevFace = Math.round(startRotY / 180);
    const newFace = Math.round(snapY / 180);
    const isBack = Math.abs(newFace % 2) === 1;

    if (prevFace !== newFace) {
      cardSound.playFlip();
      cardSound.playHaptic("light");
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
    } else if (card.player?.photo_path) {
      cutoutImage = card.player.photo_path;
    }
  }

  // Exact card dimensions (1:1.50 standard card ratio for 682x1024 frames)
  const dim = {
    sm: { w: 140, h: 210 },
    md: { w: 190, h: 285 },
    lg: { w: 260, h: 390 },
    xl: { w: 330, h: 495 }
  }[size];

  // Template image for this card tier (Front)
  const frameTemplateUrl = useMemo(() => {
    if (rarity === "inferno") return "/assets/cards/templates/frame_inferno.png";
    if (rarity === "legendary") return "/assets/cards/templates/frame_legend.png";
    if (rarity === "epic" || card.card_type === "mvp") return "/assets/cards/templates/frame_gold.png";
    if (rarity === "rare" || card.card_type === "matchday") return "/assets/cards/templates/frame_matchday.png";
    return "/assets/cards/templates/frame_base.png";
  }, [rarity, card.card_type]);

  // Template image for this card tier (Reverse / Back)
  const reverseTemplateUrl = useMemo(() => {
    if (rarity === "inferno") return "/assets/cards/templates/reverse_inferno.png";
    if (rarity === "legendary") return "/assets/cards/templates/reverse_legend.png";
    if (rarity === "epic" || card.card_type === "mvp") return "/assets/cards/templates/reverse_gold.png";
    if (rarity === "rare" || card.card_type === "matchday") return "/assets/cards/templates/reverse_matchday.png";
    return "/assets/cards/templates/reverse_base.png";
  }, [rarity, card.card_type]);

  const fifaStats = useMemo(() => getCardFIFAStats(card, stats), [card, stats]);
  const playerName = (card.player?.display_name || card.card_name || "ZAWODNIK DELTA").toUpperCase();
  const shirtNum = card.player?.shirt_number ? `#${card.player.shirt_number}` : "";

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
            ? `0 20px 40px -10px ${config.borderGlow}, 0 0 35px ${config.borderGlow}`
            : `0 10px 30px -5px ${config.borderGlow}, 0 0 25px ${config.borderGlow}`
        }}
      >
        {/* ================= FRONT SIDE (AUTHENTIC EA FC TEMPLATE) ================= */}
        <div 
          className="v104-cc-face"
          style={{
            borderColor: "transparent",
            background: "transparent",
            padding: 0,
            overflow: "hidden"
          }}
        >
          {/* 1. HIGH-RES CUSTOM DESIGNED TEMPLATE FRAME */}
          <img 
            src={frameTemplateUrl} 
            alt={card.card_name}
            loading="eager"
            decoding="sync"
            className="v200-card-frame-img"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "fill",
              zIndex: 1,
              pointerEvents: "none"
            }}
          />

          {/* 2. DYNAMIC SPECULAR HOLOGRAPHIC SHEEN */}
          <div 
            className="v104-cc-shimmer"
            style={{
              backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
              opacity: glarePos.opacity > 0 ? glarePos.opacity : 0.35,
              zIndex: 8,
              pointerEvents: "none"
            }}
          />

          {/* 3. TOP-LEFT FIFA BADGE (OVR, POS, FLAG, CREST) */}
          {!isLocked && (
            <div 
              className="v200-card-top-left-badge" 
              style={{ 
                position: "absolute",
                top: `${Math.round(dim.h * 0.085)}px`,
                left: `${Math.round(dim.w * 0.10)}px`,
                width: `${Math.round(dim.w * 0.16)}px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1px",
                pointerEvents: "none",
                zIndex: 4 
              }}
            >
              <span 
                className={`v200-card-ovr ${rarity}`}
                style={{
                  fontSize: `${Math.max(14, Math.round(dim.w * 0.092))}px`,
                  fontWeight: 1000,
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em"
                }}
              >
                {fifaStats.ovr}
              </span>
              <span 
                className={`v200-card-pos ${rarity}`}
                style={{
                  fontSize: `${Math.max(6.5, Math.round(dim.w * 0.044))}px`,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  marginTop: "1px",
                  lineHeight: 1
                }}
              >
                {fifaStats.posCode}
              </span>
              <span 
                className="v200-card-flag" 
                role="img" 
                aria-label="Polska"
                style={{
                  fontSize: `${Math.max(6.5, Math.round(dim.w * 0.044))}px`,
                  marginTop: "2px",
                  lineHeight: 1,
                  display: "block"
                }}
              >
                🇵🇱
              </span>
              <img 
                src="/teamlogos/gm.png" 
                alt="DELTA" 
                className="v200-card-mini-crest"
                style={{
                  width: `${Math.max(9, Math.round(dim.w * 0.065))}px`,
                  height: `${Math.max(9, Math.round(dim.w * 0.065))}px`,
                  objectFit: "contain",
                  marginTop: "2px"
                }}
              />
            </div>
          )}

          {/* 4. CENTER: PLAYER CUTOUT / NEON SILHOUETTE */}
          <div 
            className="v200-card-player-center" 
            style={{ 
              position: "absolute",
              top: `${Math.round(dim.h * 0.10)}px`,
              left: `${Math.round(dim.w * 0.12)}px`,
              right: `${Math.round(dim.w * 0.12)}px`,
              bottom: `${Math.round(dim.h * 0.23)}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 3 
            }}
          >
            {isLocked ? (
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
                  <span className="v104-cc-mystery-title">DO ODKRYCIA</span>
                  <span className="v104-cc-mystery-sub">Otwórz w paczce</span>
                </div>
              </div>
            ) : cutoutImage ? (
              <div className="v200-card-cutout-wrap">
                <img 
                  src={cutoutImage} 
                  alt={playerName}
                  loading="eager"
                  decoding="sync"
                  className="v200-card-cutout-img"
                />
              </div>
            ) : (
              /* High-tech Futuristic Neon Silhouette */
              <div className="v200-card-silhouette-wrap">
                <div className={`v200-silhouette-glow ${rarity}`} />
                <div className="v200-silhouette-jersey">
                  <img src="/teamlogos/gm.png" alt="DELTA" className="v200-silhouette-crest" />
                  <span className="v200-silhouette-number">{card.player?.shirt_number || "GM"}</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. NAMEPLATE BANNER (FRONT - CENTERED INSIDE METALLIC PLATE) */}
          <div 
            className="v200-card-nameplate" 
            style={{ 
              position: "absolute",
              top: `${Math.round(dim.h * 0.775)}px`,
              left: `${Math.round(dim.w * 0.12)}px`,
              right: `${Math.round(dim.w * 0.12)}px`,
              height: `${Math.round(dim.h * 0.080)}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              pointerEvents: "none",
              zIndex: 5 
            }}
          >
            <span 
              className={`v200-card-name-text ${rarity}`}
              style={{
                fontSize: `${Math.max(9, Math.round(dim.w * 0.054))}px`,
                fontWeight: 1000,
                letterSpacing: "0.08em",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {isLocked ? "???" : `${playerName} ${shirtNum}`}
            </span>
          </div>

          {/* FLIP BUTTON HELPER (TOP RIGHT) */}
          {showFlip && (
            <button
              type="button"
              onClick={flipToNextFace}
              className="v104-cc-flip-btn"
              style={{ zIndex: 10 }}
              title="Chwyć kartę lub kliknij, aby obrócić w 3D"
              aria-label="Obróć kartę"
            >
              <RotateCw size={11} />
            </button>
          )}

          {/* 3D ROTATE AFFORDANCE HINT (LARGE/XL) */}
          {interactive && (size === "lg" || size === "xl") && show3dBadge && (
            <div className="v104-cc-drag-cue" style={{ zIndex: 10 }}>
              <Compass size={11} className="spin-slow" />
              <span>Chwyć i obróć w 3D</span>
            </div>
          )}
        </div>

        {/* ================= REVERSE SIDE (DETAILED FIFA STATS & LORE) ================= */}
        <div 
          className="v104-cc-face reverse"
          style={{
            borderColor: config.borderGlow,
            boxShadow: `0 8px 24px -4px ${config.borderGlow}, inset 0 0 16px -4px ${config.borderGlow}`,
            padding: `${Math.max(10, Math.round(dim.w * 0.065))}px`,
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          {/* Custom Template Background for Reverse */}
          <img 
            src={reverseTemplateUrl} 
            alt="Delta Card Back"
            loading="eager"
            decoding="sync"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              pointerEvents: "none",
              filter: "brightness(0.35) saturate(1.2)"
            }}
          />

          {/* Dynamic Specular Sheen on Reverse */}
          <div 
            className="v104-cc-shimmer"
            style={{
              backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
              opacity: glarePos.opacity > 0 ? glarePos.opacity : 0.25,
              zIndex: 2,
              pointerEvents: "none"
            }}
          />

          {/* Top Bar on Reverse */}
          <div className="v104-cc-reverse-top" style={{ position: "relative", zIndex: 3, paddingBottom: "6px" }}>
            <div className="v104-cc-brand" style={{ gap: "5px" }}>
              <img 
                src="/teamlogos/gm.png" 
                alt="DELTA" 
                width={16}
                height={16}
                className="v104-cc-brand-logo" 
              />
              <span className="v104-cc-brand-text" style={{ fontSize: `${Math.max(8, Math.round(dim.w * 0.040))}px` }}>
                DELTA GM
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: `${Math.max(8, Math.round(dim.w * 0.040))}px`, fontWeight: 1000, color: config.color }}>
                {fifaStats.ovr} OVR
              </span>
              <span style={{ color: "#f1c95c", fontFamily: "monospace", fontSize: `${Math.max(8, Math.round(dim.w * 0.038))}px`, fontWeight: 800 }}>
                #{String(card.card_number || 1).padStart(3, '0')}
              </span>
            </div>
          </div>

          {/* Middle: Title + FIFA Stats + Match Stats + Lore */}
          <div className="v104-cc-reverse-body" style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", justifyContent: "space-around", flex: 1, margin: "6px 0", gap: "6px" }}>
            <div>
              <span style={{ fontSize: `${Math.max(7, Math.round(dim.w * 0.032))}px`, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", fontWeight: 800, display: "block" }}>
                {isLocked ? "KARTA DO ODKRYCIA" : `${playerName} ${shirtNum}`}
              </span>
              <span style={{ fontSize: `${Math.max(10, Math.round(dim.w * 0.052))}px`, fontWeight: 1000, color: config.color }}>
                {card.title || typeConfig.name}
              </span>
            </div>

            {/* 6 FIFA ATTRIBUTES GRID (PAC, SHO, PAS, DRI, DEF, PHY) */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: "4px",
              background: "rgba(0,0,0,0.7)", 
              padding: "6px", 
              borderRadius: "10px", 
              border: "1px solid rgba(255,255,255,0.14)" 
            }}>
              {[
                { lbl: "PAC", full: "TEMPO", val: fifaStats.pac, col: "#38bdf8" },
                { lbl: "SHO", full: "STRZAŁ", val: fifaStats.sho, col: "#f87171" },
                { lbl: "PAS", full: "PODANIA", val: fifaStats.pas, col: "#fbbf24" },
                { lbl: "DRI", full: "DRYBLING", val: fifaStats.dri, col: "#c084fc" },
                { lbl: "DEF", full: "OBRONA", val: fifaStats.def, col: "#4ade80" },
                { lbl: "PHY", full: "FIZYCZNOŚĆ", val: fifaStats.phy, col: "#fb923c" }
              ].map(st => (
                <div key={st.lbl} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "4px 6px", 
                  background: "rgba(255,255,255,0.08)", 
                  borderRadius: "6px" 
                }}>
                  <span style={{ fontSize: `${Math.max(7, Math.round(dim.w * 0.034))}px`, fontWeight: 900, color: "#cbd5e1" }}>
                    {st.lbl}
                  </span>
                  <strong style={{ fontSize: `${Math.max(9, Math.round(dim.w * 0.048))}px`, fontWeight: 1000, color: isLocked ? "#64748b" : st.col }}>
                    {isLocked ? "--" : st.val}
                  </strong>
                </div>
              ))}
            </div>

            {/* Match Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", textAlign: "center" }}>
              <div style={{ padding: "5px 3px", borderRadius: "8px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span style={{ fontSize: `${Math.max(6, Math.round(dim.w * 0.028))}px`, color: "#94a3b8", display: "block", fontWeight: 800 }}>MECZE</span>
                <strong style={{ fontSize: `${Math.max(10, Math.round(dim.w * 0.052))}px`, color: "#fff", fontWeight: 1000 }}>{stats?.matches || (userCard ? 8 : 0)}</strong>
              </div>
              <div style={{ padding: "5px 3px", borderRadius: "8px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span style={{ fontSize: `${Math.max(6, Math.round(dim.w * 0.028))}px`, color: "#94a3b8", display: "block", fontWeight: 800 }}>GOLE</span>
                <strong style={{ fontSize: `${Math.max(10, Math.round(dim.w * 0.052))}px`, color: "#f1c95c", fontWeight: 1000 }}>{stats?.goals || (userCard ? 4 : 0)}</strong>
              </div>
              <div style={{ padding: "5px 3px", borderRadius: "8px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span style={{ fontSize: `${Math.max(6, Math.round(dim.w * 0.028))}px`, color: "#94a3b8", display: "block", fontWeight: 800 }}>ASYSTY</span>
                <strong style={{ fontSize: `${Math.max(10, Math.round(dim.w * 0.052))}px`, color: "#38bdf8", fontWeight: 1000 }}>{stats?.assists || (userCard ? 3 : 0)}</strong>
              </div>
            </div>

            {/* Lore Story */}
            {card.lore || card.description ? (
              <div className="v104-cc-reverse-lore" style={{ fontSize: `${Math.max(7, Math.round(dim.w * 0.035))}px`, padding: "6px 8px", background: "rgba(0,0,0,0.7)", borderRadius: "8px" }}>
                "{card.lore || card.description}"
              </div>
            ) : (
              <div className="v104-cc-reverse-lore" style={{ color: "#cbd5e1", fontSize: `${Math.max(7, Math.round(dim.w * 0.035))}px`, padding: "6px 8px", background: "rgba(0,0,0,0.7)", borderRadius: "8px" }}>
                Oficjalna karta DELTA 2018 GM: {card.player?.display_name || "DELTA GM"}. Sezon {card.season || "2026/27"}.
              </div>
            )}
          </div>

          {/* Bottom Stamp & Certificate */}
          <div style={{ position: "relative", zIndex: 3, borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: `${Math.max(7, Math.round(dim.w * 0.034))}px`, color: "#94a3b8", fontWeight: 600 }}>
              {userCard?.acquired_at 
                ? new Date(userCard.acquired_at).toLocaleDateString("pl-PL") 
                : "DELTA 2018 GM"}
            </span>
            <span style={{ fontSize: `${Math.max(7, Math.round(dim.w * 0.034))}px`, color: "#f1c95c", fontWeight: 900, letterSpacing: "0.06em" }}>
              DELTA AUTHENTIC
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
