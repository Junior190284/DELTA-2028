"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { 
  Flame, 
  Sparkles, 
  RotateCw, 
  Lock, 
  Crown, 
  CheckCircle2, 
  Zap,
  Shield,
  Star,
  Trophy,
  Award
} from "lucide-react";
import { 
  CardDefinition, 
  CardRarity, 
  CardTemplateKey, 
  CardLayoutConfig, 
  DEFAULT_TEMPLATE_LAYOUTS, 
  RARITY_CONFIG, 
  UserCard 
} from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

export interface PlayerCardProps {
  card?: CardDefinition;
  player?: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
    photo_path?: string | null;
  };
  userCard?: UserCard | null;
  isLocked?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "responsive";
  templateOverride?: CardTemplateKey;
  layoutOverride?: Partial<CardLayoutConfig>;
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
  customPhotoUrl?: string | null;
  className?: string;
}

// Compute dynamic realistic FIFA attributes from stats & card details
export function getCardFIFAStats(card?: CardDefinition, player?: any, stats?: any) {
  const rarity = (card?.rarity || "common").toLowerCase();
  const name = player?.display_name || card?.player?.display_name || card?.card_name || "DELTA";
  const nameHash = name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);

  const baseOvr = 
    rarity === "inferno" ? 95 :
    rarity === "legendary" ? 90 :
    rarity === "epic" ? 85 :
    rarity === "rare" ? 80 : 75;

  const extraGoals = stats?.goals ? Math.min(3, Math.floor(stats.goals / 2)) : 0;
  const extraMatches = stats?.matches ? Math.min(2, Math.floor(stats.matches / 5)) : 0;
  const ovr = Math.min(99, baseOvr + (nameHash % 4) + extraGoals + extraMatches);

  const posRaw = (player?.position || card?.player?.position || "POM").toUpperCase();
  const isForward = posRaw.includes("NAP") || posRaw.includes("ST") || posRaw.includes("FW") || card?.card_type === "goal_hunter";
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

export const CARD_THEME_ASSETS: Record<CardTemplateKey, {
  background: string;
  frame: string;
  fx: string;
  backBg: string;
}> = {
  base: {
    background: "/assets/cards/base/base-background.png",
    frame: "/assets/cards/base/base-frame.png",
    fx: "/assets/cards/base/base-fx.png",
    backBg: "/assets/cards/base/base-back-bg.png"
  },
  matchday: {
    background: "/assets/cards/matchday-hero/matchday-hero-background.png",
    frame: "/assets/cards/matchday-hero/matchday-hero-frame.png",
    fx: "/assets/cards/matchday-hero/matchday-hero-fx.png",
    backBg: "/assets/cards/matchday-hero/matchday-hero-back-bg.png"
  },
  gold: {
    background: "/assets/cards/gold-master/gold-master-background.png",
    frame: "/assets/cards/gold-master/gold-master-frame.png",
    fx: "/assets/cards/gold-master/gold-master-fx.png",
    backBg: "/assets/cards/gold-master/gold-master-back-bg.png"
  },
  legend: {
    background: "/assets/cards/delta-icon/delta-icon-background.png",
    frame: "/assets/cards/delta-icon/delta-icon-frame.png",
    fx: "/assets/cards/delta-icon/delta-icon-fx.png",
    backBg: "/assets/cards/delta-icon/delta-icon-back-bg.png"
  },
  inferno: {
    background: "/assets/cards/inferno-ultra/inferno-ultra-background.png",
    frame: "/assets/cards/inferno-ultra/inferno-ultra-frame.png",
    fx: "/assets/cards/inferno-ultra/inferno-ultra-fx.png",
    backBg: "/assets/cards/inferno-ultra/inferno-ultra-back-bg.png"
  },
  training: {
    background: "/assets/cards/training-hero/training-hero-background.png",
    frame: "/assets/cards/training-hero/training-hero-frame.png",
    fx: "/assets/cards/training-hero/training-hero-fx.png",
    backBg: "/assets/cards/training-hero/training-hero-back-bg.png"
  },
  panini: {
    background: "/assets/cards/base/base-background.png",
    frame: "/assets/cards/base/base-frame.png",
    fx: "/assets/cards/base/base-fx.png",
    backBg: "/assets/cards/base/base-back-bg.png"
  }
};

export default function PlayerCard({
  card,
  player: propPlayer,
  userCard,
  isLocked = false,
  size = "md",
  templateOverride,
  layoutOverride,
  interactive = true,
  showFlip = true,
  isFlipped: controlledFlipped,
  onFlipChange,
  onClick,
  stats,
  customPhotoUrl,
  className = ""
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [internalRotateY, setInternalRotateY] = useState(controlledFlipped ? 180 : 0);
  const [internalRotateX, setInternalRotateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  // Sync external flipped state
  useEffect(() => {
    if (controlledFlipped !== undefined) {
      setInternalRotateY(controlledFlipped ? 180 : 0);
    }
  }, [controlledFlipped]);

  // Dimensions based on 2:3 ratio
  const dim = useMemo(() => {
    switch (size) {
      case "xs": return { w: 120, h: 180 };
      case "sm": return { w: 170, h: 255 };
      case "lg": return { w: 300, h: 450 };
      case "xl": return { w: 360, h: 540 };
      case "responsive": return { w: 260, h: 390 };
      default: return { w: 240, h: 360 };
    }
  }, [size]);

  // Determine active template key
  const templateKey: CardTemplateKey = useMemo(() => {
    if (templateOverride) return templateOverride;
    const r = (card?.rarity || "common").toLowerCase();
    const t = (card?.card_type || "").toLowerCase();
    if (t.includes("training") || t.includes("warrior")) return "training";
    if (r === "inferno" || t.includes("inferno")) return "inferno";
    if (r === "legendary" || t.includes("legend")) return "legend";
    if (r === "epic" || t.includes("gold") || t.includes("mvp")) return "gold";
    if (r === "rare" || t.includes("matchday")) return "matchday";
    if (t.includes("panini")) return "panini";
    return "base";
  }, [templateOverride, card]);

  const themeAssets = useMemo(() => {
    return CARD_THEME_ASSETS[templateKey] || CARD_THEME_ASSETS.base;
  }, [templateKey]);

  // Compute final layout configuration (Default template layout + overrides)
  const layout: CardLayoutConfig = useMemo(() => {
    const def = DEFAULT_TEMPLATE_LAYOUTS[templateKey] || DEFAULT_TEMPLATE_LAYOUTS.base;
    return {
      scale: layoutOverride?.scale !== undefined ? layoutOverride.scale : def.scale,
      translateX: layoutOverride?.translateX !== undefined ? layoutOverride.translateX : def.translateX,
      translateY: layoutOverride?.translateY !== undefined ? layoutOverride.translateY : def.translateY,
      rotate: layoutOverride?.rotate !== undefined ? layoutOverride.rotate : (def.rotate || 0),
      brightness: layoutOverride?.brightness !== undefined ? layoutOverride.brightness : (def.brightness || 1),
      contrast: layoutOverride?.contrast !== undefined ? layoutOverride.contrast : (def.contrast || 1),
      photoUrl: customPhotoUrl || layoutOverride?.photoUrl || null
    };
  }, [templateKey, layoutOverride, customPhotoUrl]);

  const playerObj = propPlayer || card?.player;
  const playerName = (playerObj?.display_name || card?.card_name || "ZAWODNIK DELTA").toUpperCase();
  const shirtNum = playerObj?.shirt_number ? `#${playerObj.shirt_number}` : "";
  const rarity = (card?.rarity || (templateKey === "inferno" ? "inferno" : templateKey === "legend" ? "legendary" : templateKey === "gold" ? "epic" : templateKey === "matchday" ? "rare" : "common")) as CardRarity;
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const fifaStats = useMemo(() => getCardFIFAStats(card, playerObj, stats), [card, playerObj, stats]);

  const initials = useMemo(() => {
    const parts = playerName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || "RR";
  }, [playerName]);

  const cardType = (card?.card_type || "").toLowerCase();

  const seriesInfo = useMemo(() => {
    if (cardType === "training_warrior" || templateKey === "training") {
      return { badge: "⚔️ WARRIOR", seriesName: "TRAINING HERO", code: "TRN" };
    }
    if (cardType === "goal_hunter") {
      return { badge: "🎯 HUNTER", seriesName: "GOAL HUNTER", code: "HNT" };
    }
    if (cardType === "mvp") {
      return { badge: "👑 MVP", seriesName: "MVP EDITION", code: "MVP" };
    }
    if (cardType === "hat_trick_hero") {
      return { badge: "⚽ HAT-TRICK", seriesName: "HAT-TRICK HERO", code: "HAT" };
    }
    if (cardType === "captain") {
      return { badge: "🎖️ CAPTAIN", seriesName: "CAPTAIN SERIES", code: "CPT" };
    }
    if (templateKey === "inferno") {
      return { badge: "🔥 INFERNO", seriesName: "INFERNO ULTRA", code: "INFR" };
    }
    if (templateKey === "legend") {
      return { badge: "👑 ICON", seriesName: "DELTA ICON", code: "ICON" };
    }
    if (templateKey === "gold") {
      return { badge: "🌟 GOLD", seriesName: "GOLD MASTER", code: "GOLD" };
    }
    if (templateKey === "matchday") {
      return { badge: "⚡ MATCHDAY", seriesName: "MATCHDAY HERO", code: "MTCH" };
    }
    return { badge: "📦 BASE", seriesName: "BASE SERIES", code: "BASE" };
  }, [cardType, templateKey]);

  const dynamicCardId = useMemo(() => {
    const num = String(card?.card_number || 1).padStart(3, "0");
    return `${seriesInfo.code}-26-${initials}-${num}`;
  }, [seriesInfo.code, initials, card?.card_number]);

  // Cutout Photo Determination - ONLY assign Ryszard photo to Ryszard's card!
  const cutoutUrl = useMemo(() => {
    if (layout.photoUrl) return layout.photoUrl;
    if (card?.artwork_url) return card.artwork_url;

    const pName = (playerObj?.display_name || card?.card_name || "").toLowerCase();
    const isRyszard = pName.includes("ryszard") || pName.includes("rybacki");
    if (isRyszard) {
      if (templateKey === "inferno") return "/assets/players/ryszard-inferno.png";
      if (templateKey === "legend") return "/assets/players/ryszard-legend.png";
      if (templateKey === "gold") return "/assets/players/ryszard-gold.png";
      return "/assets/players/ryszard-rybacki.png";
    }

    if (playerObj?.photo_path) return playerObj.photo_path;
    return null; // Return null so other boys without photo display their personalized neon silhouette!
  }, [layout.photoUrl, card?.artwork_url, card?.card_name, playerObj, templateKey]);

  // Flip Action
  const flipCard = useCallback((e?: React.MouseEvent) => {
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

  // 3D Pointer Events
  const dragStartRef = useRef<{ startX: number; startY: number; startRotY: number; startRotX: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotY: internalRotateY,
      startRotX: internalRotateX
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x, y, opacity: isDragging ? 0.75 : 0.45 });

    if (isDragging && dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      setInternalRotateY(dragStartRef.current.startRotY + deltaX * 0.7);
      setInternalRotateX(Math.max(-25, Math.min(25, dragStartRef.current.startRotX - deltaY * 0.4)));
    } else if (isHovered) {
      const rotY = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 14;
      const rotX = -((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 14;
      setInternalRotateY(rotY);
      setInternalRotateX(rotX);
    }
  };

  const isBackFace = useMemo(() => (Math.abs(Math.round(internalRotateY / 180)) % 2) === 1, [internalRotateY]);

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
    const nearestFace = Math.round(internalRotateY / 180) * 180;
    setInternalRotateY(nearestFace);
    setInternalRotateX(0);
  };

  return (
    <div 
      className={`v200-player-card-wrapper ${interactive ? "interactive" : ""} ${isDragging ? "dragging" : ""} ${className}`}
      style={{
        width: `${dim.w}px`,
        height: `${dim.h}px`,
        minWidth: `${dim.w}px`,
        maxWidth: `${dim.w}px`,
        minHeight: `${dim.h}px`,
        maxHeight: `${dim.h}px`,
        aspectRatio: "2/3",
        touchAction: interactive ? "none" : "auto",
        cursor: !interactive ? "default" : isDragging ? "grabbing" : "grab"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        if (!isDragging) {
          setInternalRotateX(0);
          setInternalRotateY(Math.round(internalRotateY / 180) * 180);
          setGlarePos(prev => ({ ...prev, opacity: 0 }));
        }
      }}
      onClick={onClick}
    >
      <div 
        ref={cardRef}
        className={`v200-card-inner-3d ${isHovered ? "hovered" : ""}`}
        style={{
          transform: `perspective(1100px) rotateX(${internalRotateX}deg) rotateY(${internalRotateY}deg)`,
          boxShadow: isLocked
            ? `0 6px 20px rgba(0,0,0,0.7)`
            : isDragging
            ? `0 20px 40px -10px ${config.borderGlow}, 0 0 35px ${config.borderGlow}`
            : `0 10px 30px -5px ${config.borderGlow}, 0 0 20px ${config.borderGlow}`
        }}
      >
        {/* ========================================================================= */}
        {/* FACE 1: FRONT (5 DECOUPLED ARCHITECTURAL LAYERS)                          */}
        {/* ========================================================================= */}
        <div 
          className={`v200-card-face front-face theme-${templateKey} player-card`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: isBackFace ? "none" : "auto"
          }}
        >
          
          {/* ------------------------------------------------------------- */}
          {/* LAYER 1: BASE BACKGROUND / DYNAMIC BACKGROUND                 */}
          {/* ------------------------------------------------------------- */}
          <div className="card-background v200-layer-1-background">
            <img 
              src={themeAssets.background} 
              alt="" 
              className="v200-bg-img"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 20%"
              }}
              loading="eager"
              decoding="sync"
            />
            <div className="v200-bg-stadium-lights" />
            <div className={`v200-bg-particles theme-${templateKey}`} />
            <div className="v200-bg-radial-halo" />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* LAYER 2: PLAYER ARTWORK / CUTOUT SILHOUETTE                   */}
          {/* ------------------------------------------------------------- */}
          <div className="player-art v200-layer-2-player">
            {isLocked ? (
              <div className="v200-card-locked-silhouette">
                <Lock size={32} className="text-slate-400 animate-pulse" />
                <span>KARTA ZABLOKOWANA</span>
              </div>
            ) : cutoutUrl ? (
              <div 
                className="v200-player-cutout-transform"
                style={{
                  transform: `translate(${layout.translateX}%, ${layout.translateY}%) scale(${layout.scale}) rotate(${layout.rotate || 0}deg)`,
                  filter: `brightness(${layout.brightness || 1}) contrast(${layout.contrast || 1})`
                }}
              >
                <img 
                  src={cutoutUrl} 
                  alt={playerName}
                  className="v200-player-cutout-img"
                  loading="eager"
                  decoding="sync"
                />
              </div>
            ) : (
              /* High-tech Futuristic Neon Silhouette for players without a cutout yet */
              <div 
                className="v200-player-cutout-transform"
                style={{
                  transform: `translate(${layout.translateX}%, ${layout.translateY}%) scale(${layout.scale}) rotate(${layout.rotate || 0}deg)`
                }}
              >
                <div className={`v200-neon-silhouette theme-${templateKey}`}>
                  <div className="v200-neon-body" />
                  <div className="v200-neon-crest">
                    <img 
                      src="/teamlogos/gm.png" 
                      alt="DELTA" 
                      width={32}
                      height={32}
                      style={{ width: 32, height: 32, minWidth: 32, maxWidth: 32, minHeight: 32, maxHeight: 32, objectFit: "contain", flexShrink: 0 }}
                    />
                    <span>{playerObj?.shirt_number || "GM"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* LAYER 3: FRAME (800x1200 PNG WITH TRANSPARENCY)               */}
          {/* ------------------------------------------------------------- */}
          <img 
            src={themeAssets.frame} 
            alt="" 
            className="card-frame"
            loading="eager"
            decoding="sync"
          />

          {/* ------------------------------------------------------------- */}
          {/* LAYER 4: ALL EXISTING CARD UI & DYNAMIC DATA                  */}
          {/* ------------------------------------------------------------- */}
          <div className="card-ui v200-layer-3-data">
            {/* Top Left: EA FC FIFA Badge (OVR, POS, FLAG, CREST) */}
            {!isLocked && (
              <div className="v200-fifa-top-badge">
                <span className={`v200-badge-ovr theme-${templateKey}`}>{fifaStats.ovr}</span>
                <span className="v200-badge-pos">{fifaStats.posCode}</span>
                <span className="v200-badge-flag" role="img" aria-label="Polska">🇵🇱</span>
                <img 
                  src="/teamlogos/gm.png" 
                  alt="DELTA" 
                  width={18}
                  height={18}
                  className="v200-badge-crest" 
                  style={{ width: 18, height: 18, minWidth: 18, maxWidth: 18, minHeight: 18, maxHeight: 18, objectFit: "contain", flexShrink: 0 }}
                />
              </div>
            )}

            {/* Top Right: Edition Tag & Flip Button */}
            <div className="v200-top-right-meta">
              <span className={`v200-edition-pill theme-${templateKey}`}>
                {seriesInfo.badge}
              </span>

              {showFlip && (
                <button
                  type="button"
                  onClick={flipCard}
                  className="v200-flip-trigger-btn"
                  title="Obróć kartę (Rewers)"
                  aria-label="Obróć kartę"
                >
                  <RotateCw size={13} />
                </button>
              )}
            </div>

            {/* Center-Bottom: Player Nameplate */}
            <div className="v200-card-nameplate-box">
              <span className={`v200-player-name-text theme-${templateKey}`}>
                {isLocked ? "???" : playerName}
              </span>
              {shirtNum && !isLocked && <span className="v200-shirt-number-tag">{shirtNum}</span>}
            </div>

            {/* Bottom: Dynamic 6-Attribute FIFA Stats Matrix */}
            {!isLocked && (
              <div className="v200-card-stats-matrix">
                <div className="v200-stat-cell">
                  <span className="val">{fifaStats.pac}</span>
                  <span className="lbl">PAC</span>
                </div>
                <div className="v200-stat-cell">
                  <span className="val">{fifaStats.sho}</span>
                  <span className="lbl">SHO</span>
                </div>
                <div className="v200-stat-cell">
                  <span className="val">{fifaStats.pas}</span>
                  <span className="lbl">PAS</span>
                </div>
                <div className="v200-stat-cell">
                  <span className="val">{fifaStats.dri}</span>
                  <span className="lbl">DRI</span>
                </div>
                <div className="v200-stat-cell">
                  <span className="val">{fifaStats.def}</span>
                  <span className="lbl">DEF</span>
                </div>
                <div className="v200-stat-cell">
                  <span className="val">{fifaStats.phy}</span>
                  <span className="lbl">PHY</span>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* LAYER 5: FX & SPECULAR HOLOGRAPHIC SHEEN                       */}
          {/* ------------------------------------------------------------- */}
          <img 
            src={themeAssets.fx} 
            alt="" 
            className="card-fx"
            loading="eager"
            decoding="sync"
          />

          <div className="v200-layer-5-fx">
            <div 
              className={`v200-hologram-sheen theme-${templateKey}`}
              style={{
                backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
                opacity: glarePos.opacity > 0 ? glarePos.opacity : 0.35
              }}
            />
            {templateKey === "inferno" && <div className="v200-inferno-fire-overlay" />}
            {templateKey === "legend" && <div className="v200-legend-star-sparkles" />}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FACE 2: REVERSE / BACK (5-LAYER MATCHING COLLECTOR DOSSIER)               */}
        {/* ========================================================================= */}
        <div 
          className={`v200-card-face back-face theme-${templateKey} player-card`}
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: isBackFace ? "auto" : "none"
          }}
        >
          
          {/* ------------------------------------------------------------- */}
          {/* LAYER 1: BACK BACKGROUND                                      */}
          {/* ------------------------------------------------------------- */}
          <div className="card-background v200-layer-1-background">
            <img 
              src={themeAssets.backBg} 
              alt="" 
              className="v200-bg-img"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center"
              }}
              loading="eager"
              decoding="sync"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* LAYER 2: DELTA CLUB CREST WATERMARK (OPACITY ~12%)            */}
          {/* ------------------------------------------------------------- */}
          <div 
            className="v200-back-watermark"
            style={{
              position: "absolute",
              top: "16%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "60%",
              height: "60%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.12,
              pointerEvents: "none",
              zIndex: 10
            }}
          >
            <img 
              src="/teamlogos/gm.png" 
              alt="DELTA" 
              style={{ width: "100%", height: "100%", objectFit: "contain", filter: "grayscale(30%) brightness(1.2)" }} 
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* LAYER 3: MATCHING FRAME (800x1200 PNG)                         */}
          {/* ------------------------------------------------------------- */}
          <img 
            src={themeAssets.frame} 
            alt="" 
            className="card-frame"
            loading="eager"
            decoding="sync"
          />

          {/* ------------------------------------------------------------- */}
          {/* LAYER 4: DYNAMIC DOSSIER & CARD DATA (HTML/CSS)               */}
          {/* ------------------------------------------------------------- */}
          <div className="card-ui v200-layer-3-data v200-back-ui">
            
            {/* Top Bar: Club Badge & Flip */}
            <div className="v200-back-top-bar">
              <div className="v200-back-club-tag">
                <img 
                  src="/teamlogos/gm.png" 
                  alt="DELTA" 
                  width={14} 
                  height={14} 
                  className="v200-back-club-logo" 
                  style={{ width: 14, height: 14, minWidth: 14, maxWidth: 14, minHeight: 14, maxHeight: 14, objectFit: "contain", flexShrink: 0 }} 
                />
                <span>DELTA 2018 GM</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className={`v200-edition-pill theme-${templateKey}`}>
                  {seriesInfo.badge}
                </span>

                {showFlip && (
                  <button
                    type="button"
                    onClick={flipCard}
                    className="v200-flip-trigger-btn"
                    title="Wróć na awers"
                    aria-label="Wróć na awers"
                  >
                    <RotateCw size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Center: Player Name & Detailed Card Specs */}
            <div className="v200-back-center-dossier">
              <div className="v200-back-name-wrap">
                <h3 className="v200-back-player-name">{playerName}</h3>
                <span className="v200-back-player-sub">
                  {shirtNum || "#7"} • {playerObj?.position || "POM"}
                </span>
              </div>

              <div className="v200-back-team-label">
                DELTA WARSZAWA 2018 GM
              </div>

              {/* 2x2 Meta Grid (SEZON, SERIA, RARITY, CARD ID) */}
              <div className="v200-back-meta-grid">
                <div className="v200-back-meta-cell">
                  <span className="lbl">SEZON</span>
                  <span className="val">2026/27</span>
                </div>
                <div className="v200-back-meta-cell">
                  <span className="lbl">SERIA</span>
                  <span className="val">{seriesInfo.seriesName}</span>
                </div>
                <div className="v200-back-meta-cell">
                  <span className="lbl">RARITY</span>
                  <span className="val">{rarity.toUpperCase()}</span>
                </div>
                <div className="v200-back-meta-cell">
                  <span className="lbl">CARD ID</span>
                  <span className="val font-mono">{dynamicCardId}</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer: Collector Stamp */}
            <div className="v200-back-footer-stamp">
              <span className="stamp-text">DELTA COLLECTOR SERIES</span>
              <span className="stamp-code">★ OFFICIAL ★</span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* LAYER 5: MATCHING FX & SPECULAR GLOW                           */}
          {/* ------------------------------------------------------------- */}
          <img 
            src={themeAssets.fx} 
            alt="" 
            className="card-fx"
            loading="eager"
            decoding="sync"
          />

          <div className="v200-layer-5-fx">
            <div 
              className={`v200-hologram-sheen theme-${templateKey}`}
              style={{
                backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
                opacity: glarePos.opacity > 0 ? glarePos.opacity : 0.25
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
