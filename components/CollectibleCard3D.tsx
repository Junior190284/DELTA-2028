"use client";

import React, { useState, useRef, useCallback } from "react";
import { 
  Flame, 
  Sparkles, 
  RotateCw, 
  Lock, 
  Crown, 
  CheckCircle2, 
  HelpCircle,
  ShieldAlert
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
  const [internalFlipped, setInternalFlipped] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleFlip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isLocked) return;
    const next = !isFlipped;
    setInternalFlipped(next);
    onFlipChange?.(next);
    cardSound.playFlip();
  };

  const handleMouseMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current || isLocked) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Tilt calculations (-12 to 12 deg)
    const rotX = -((y - centerY) / centerY) * 12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePos({ x: glareX, y: glareY, opacity: 0.75 });
  }, [interactive, isLocked]);

  const handlePointerEnter = () => {
    if (!interactive || isLocked) return;
    setIsHovered(true);
    cardSound.playHover();
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
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

  return (
    <div 
      className="v104-cc-wrap"
      style={{
        width: `${dim.w}px`,
        height: `${dim.h}px`,
        minWidth: `${dim.w}px`,
        maxWidth: `${dim.w}px`,
        minHeight: `${dim.h}px`,
        maxHeight: `${dim.h}px`
      }}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handleMouseMove}
      onPointerLeave={handlePointerLeave}
    >
      <div 
        ref={cardRef}
        className={`v104-cc-inner ${isHovered ? "hovered" : ""}`}
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${isFlipped ? rotateY + 180 : rotateY}deg)`,
          transition: isHovered ? "transform 0.08s ease-out" : "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
          boxShadow: isLocked 
            ? `0 6px 20px rgba(0,0,0,0.7), 0 0 12px ${config.borderGlow}`
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
          {/* Shimmer Sheen */}
          <div className="v104-cc-shimmer" />

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

          {/* FLIP BUTTON ON CARD */}
          {showFlip && !isLocked && (
            <button
              type="button"
              onClick={handleFlip}
              className="v104-cc-flip-btn"
              title="Obróć kartę (rewers)"
              aria-label="Obróć kartę"
            >
              <RotateCw size={11} />
            </button>
          )}
        </div>

        {/* ================= REVERSE SIDE (LORE & STATS) ================= */}
        <div 
          className="v104-cc-face reverse"
          style={{
            borderColor: config.borderGlow,
            boxShadow: `0 8px 24px -4px ${config.borderGlow}, inset 0 0 16px -4px ${config.borderGlow}`
          }}
        >
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
            <span style={{ color: "#f1c95c", fontFamily: "monospace", fontSize: "8px", fontWeight: 700 }}>
              #{String(card.card_number || 1).padStart(3, '0')}
            </span>
          </div>

          {/* Middle: Lore Story */}
          <div className="v104-cc-reverse-body">
            <div>
              <span style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 800, display: "block" }}>
                TYP KARTY
              </span>
              <span style={{ fontSize: "10px", fontWeight: 900, color: config.color }}>
                {card.title || typeConfig.name}
              </span>
            </div>

            {card.lore || card.description ? (
              <div className="v104-cc-reverse-lore">
                "{card.lore || card.description}"
              </div>
            ) : (
              <div className="v104-cc-reverse-lore" style={{ color: "#94a3b8" }}>
                Oficjalna karta kolekcjonerska zawodnika {card.player?.display_name || "DELTA GM"} z sezonu {card.season || "2026/27"}.
              </div>
            )}

            {/* Quick Stats if available */}
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", paddingTop: "4px", textAlign: "center" }}>
                <div style={{ padding: "4px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "7px", color: "#94a3b8", display: "block", fontWeight: 800 }}>MECZE</span>
                  <strong style={{ fontSize: "10px", color: "#fff", fontWeight: 900 }}>{stats.matches || 0}</strong>
                </div>
                <div style={{ padding: "4px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "7px", color: "#94a3b8", display: "block", fontWeight: 800 }}>GOLE</span>
                  <strong style={{ fontSize: "10px", color: "#f1c95c", fontWeight: 900 }}>{stats.goals || 0}</strong>
                </div>
                <div style={{ padding: "4px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "7px", color: "#94a3b8", display: "block", fontWeight: 800 }}>ASYSTY</span>
                  <strong style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 900 }}>{stats.assists || 0}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Stamp */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 600 }}>
              {userCard?.acquired_at 
                ? new Date(userCard.acquired_at).toLocaleDateString("pl-PL") 
                : "Kolekcja Klubowa"}
            </span>
            <span style={{ fontSize: "8px", color: "#f1c95c", fontWeight: 800 }}>
              DELTA CARDS
            </span>
          </div>

          {/* Flip Back Button */}
          {showFlip && (
            <button
              type="button"
              onClick={handleFlip}
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
