"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  Flame, 
  Sparkles, 
  RotateCw, 
  Lock, 
  Shield, 
  Award, 
  Crown, 
  Zap, 
  Calendar,
  CheckCircle2,
  Share2
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
    
    // Tilt calculations (-15 to 15 deg)
    const rotX = -((y - centerY) / centerY) * 14;
    const rotY = ((x - centerX) / centerX) * 14;

    setRotateX(rotX);
    setRotateY(rotY);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePos({ x: glareX, y: glareY, opacity: 0.85 });
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
  if (isRyszard) {
    if (rarity === "inferno") cutoutImage = "/assets/players/ryszard-inferno.png";
    else if (rarity === "legendary") cutoutImage = "/assets/players/ryszard-gold.png";
    else cutoutImage = "/assets/players/ryszard-legend.png";
  } else if (card.artwork_url) {
    cutoutImage = card.artwork_url;
  }

  // Size classes
  const sizeClasses = {
    sm: "w-[150px] h-[218px] text-[10px]",
    md: "w-[220px] h-[320px] text-xs",
    lg: "w-[280px] h-[408px] text-sm",
    xl: "w-[340px] h-[495px] text-base"
  }[size];

  return (
    <div 
      className={`relative select-none perspective-1000 ${sizeClasses} cursor-pointer group`}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handleMouseMove}
      onPointerLeave={handlePointerLeave}
    >
      <div 
        ref={cardRef}
        className={`w-full h-full relative transition-transform duration-300 transform-gpu preserve-3d rounded-2xl shadow-2xl ${
          isHovered ? "scale-[1.03]" : "scale-100"
        }`}
        style={{
          transform: `perspective(1000px) rotateX(${isFlipped ? rotateX : rotateX}deg) rotateY(${isFlipped ? rotateY + 180 : rotateY}deg)`,
          transition: isHovered ? "transform 0.08s ease-out" : "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)"
        }}
      >
        {/* ================= FRONT SIDE ================= */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden backface-hidden border flex flex-col justify-between p-3.5 z-10 ${
            isLocked ? "bg-slate-950/90 border-slate-800" : ""
          }`}
          style={{
            background: isLocked 
              ? "radial-gradient(circle at 50% 30%, #1e293b 0%, #090d16 100%)" 
              : rarity === "inferno"
                ? "radial-gradient(circle at 50% 25%, #7f1d1d 0%, #200404 60%, #0a0101 100%)"
                : rarity === "legendary"
                  ? "radial-gradient(circle at 50% 25%, #854d0e 0%, #2d1804 60%, #0f0701 100%)"
                  : rarity === "epic"
                    ? "radial-gradient(circle at 50% 25%, #581c87 0%, #1f0738 60%, #0b0214 100%)"
                    : rarity === "rare"
                      ? "radial-gradient(circle at 50% 25%, #0369a1 0%, #082f49 60%, #03131e 100%)"
                      : "radial-gradient(circle at 50% 25%, #334155 0%, #0f172a 60%, #050811 100%)",
            borderColor: isLocked ? "rgba(100, 116, 139, 0.3)" : config.borderGlow,
            boxShadow: isLocked 
              ? "none" 
              : `0 12px 30px -5px ${config.borderGlow}, inset 0 0 20px -5px ${config.borderGlow}`
          }}
        >
          {/* Card Border Highlight & Shimmer */}
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none border-2 opacity-80"
            style={{ borderColor: config.color }}
          />

          {/* Animated Sheen Overlay for High Tiers */}
          {!isLocked && (rarity === "legendary" || rarity === "inferno" || rarity === "epic") && (
            <div 
              className="absolute inset-0 pointer-events-none rounded-2xl opacity-40 mix-blend-overlay"
              style={{
                backgroundImage: "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.9) 50%, transparent 60%)",
                backgroundSize: "200% 200%",
                animation: "cardShimmer 4s infinite linear"
              }}
            />
          )}

          {/* Holographic Glare Overlay */}
          {!isLocked && (
            <div 
              className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,${glarePos.opacity * 0.35}) 0%, transparent 65%)`,
                mixBlendMode: "screen"
              }}
            />
          )}

          {/* TOP HEADER ROW: DELTA Crest + Rarity Tag + Serial */}
          <div className="relative z-20 flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <img src="/teamlogos/gm.png" alt="DELTA" className="w-5 h-5 object-contain drop-shadow" />
              <span className="font-extrabold text-[10px] tracking-wider text-slate-300">DELTA GM</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span 
                className="px-2 py-0.5 text-[9px] font-black tracking-widest rounded uppercase shadow-sm flex items-center gap-1"
                style={{
                  backgroundColor: config.color,
                  color: rarity === "legendary" || rarity === "rare" || rarity === "common" ? "#000" : "#fff",
                  boxShadow: `0 0 10px ${config.color}66`
                }}
              >
                {rarity === "inferno" && <Flame size={10} className="animate-pulse" />}
                {rarity === "legendary" && <Crown size={10} />}
                {rarity === "epic" && <Sparkles size={10} />}
                {config.label}
              </span>
            </div>
          </div>

          {/* CARD TYPE BADGE (e.g. MVP, GOAL HUNTER, TRAINING WARRIOR) */}
          <div className="relative z-20 mt-1 flex justify-center">
            <div 
              className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase backdrop-blur-md border shadow-md"
              style={{
                backgroundColor: "rgba(0,0,0,0.55)",
                borderColor: `${config.color}66`,
                color: config.color
              }}
            >
              {card.title || typeConfig.name}
            </div>
          </div>

          {/* CENTER: PLAYER CUTOUT ARTWORK */}
          <div className="relative flex-1 flex items-center justify-center my-1 overflow-hidden z-10">
            {isLocked ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-400 shadow-inner">
                  <Lock size={26} />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-slate-400">NIEODBLOKOWANA</span>
                <span className="text-[9px] text-slate-500 max-w-[140px] text-center">Otwórz paczkę kart lub zdobądź za aktywność</span>
              </div>
            ) : cutoutImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={cutoutImage} 
                  alt={card.player?.display_name || "Zawodnik"}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.85)] transform transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 shadow-2xl relative" style={{ borderColor: config.color }}>
                {card.player?.id ? (
                  <PlayerPhoto playerId={card.player.id} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Shield size={32} className="text-slate-500" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM PLAYER IDENTITY FOOTER */}
          <div className="relative z-20 w-full pt-1.5 border-t border-white/10 backdrop-blur-sm bg-black/40 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
            <div className="flex items-end justify-between">
              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                  {card.player?.position || "ZAWODNIK"} • #{card.player?.shirt_number || "GM"}
                </span>
                <h3 className="font-black text-sm sm:text-base tracking-wide text-white truncate drop-shadow">
                  {isLocked ? "???" : (card.player?.display_name || card.card_name)}
                </h3>
              </div>
              
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[8px] font-extrabold text-slate-400 tracking-wider">SEZON</span>
                <span className="text-[10px] font-black text-amber-400">{card.season || "2026/27"}</span>
              </div>
            </div>

            {/* DUPLICATES BADGE / SERIAL NUMBER */}
            {userCard && userCard.duplicates_count > 0 && (
              <div className="mt-1 flex items-center justify-between text-[9px]">
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> W kolekcji (x{userCard.duplicates_count + 1})
                </span>
                <span className="text-slate-400 font-mono">#{String(card.card_number || 1).padStart(3, '0')}</span>
              </div>
            )}
          </div>

          {/* FLIP BUTTON ON CARD */}
          {showFlip && !isLocked && (
            <button
              type="button"
              onClick={handleFlip}
              className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 backdrop-blur-md shadow-lg transition-all"
              title="Obróć kartę (rewers)"
              aria-label="Obróć kartę"
            >
              <RotateCw size={13} />
            </button>
          )}
        </div>

        {/* ================= REVERSE SIDE (LORE & STATS) ================= */}
        <div 
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden backface-hidden rotate-y-180 border flex flex-col justify-between p-4 z-10"
          style={{
            background: "radial-gradient(circle at 50% 20%, #1e1e24 0%, #0f1015 60%, #050508 100%)",
            borderColor: config.borderGlow,
            boxShadow: `0 12px 30px -5px ${config.borderGlow}, inset 0 0 20px -5px ${config.borderGlow}`
          }}
        >
          {/* Top Bar on Reverse */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <img src="/teamlogos/gm.png" alt="DELTA" className="w-5 h-5 object-contain" />
              <span className="font-extrabold text-[10px] tracking-wider text-slate-300">DELTA WARSZAWA 2018 GM</span>
            </div>
            <span className="font-mono text-[9px] text-amber-400 font-bold">
              KARTA #{String(card.card_number || 1).padStart(3, '0')}
            </span>
          </div>

          {/* Middle: Lore Story & Player Insights */}
          <div className="flex-1 my-3 overflow-y-auto pr-1 space-y-2.5 text-slate-300">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">TYP KARTY</span>
              <span className="text-xs font-black" style={{ color: config.color }}>{card.title || typeConfig.name}</span>
            </div>

            {card.lore || card.description ? (
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs leading-relaxed italic text-slate-200">
                "{card.lore || card.description}"
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs leading-relaxed italic text-slate-400">
                Oficjalna karta kolekcjonerska zawodnika {card.player?.display_name || "DELTA GM"} z sezonu {card.season || "2026/27"}.
              </div>
            )}

            {/* Quick Match/Training Stats if available */}
            {stats && (
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                <div className="p-1.5 rounded bg-black/40 border border-slate-800">
                  <span className="text-[8px] text-slate-400 block font-bold">MECZE</span>
                  <strong className="text-xs text-white font-black">{stats.matches || 0}</strong>
                </div>
                <div className="p-1.5 rounded bg-black/40 border border-slate-800">
                  <span className="text-[8px] text-slate-400 block font-bold">GOLE</span>
                  <strong className="text-xs text-amber-400 font-black">{stats.goals || 0}</strong>
                </div>
                <div className="p-1.5 rounded bg-black/40 border border-slate-800">
                  <span className="text-[8px] text-slate-400 block font-bold">ASYSTY</span>
                  <strong className="text-xs text-sky-400 font-black">{stats.assists || 0}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Stamp & Acquisition Info */}
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase font-bold">DATA ZDOBYCIA</span>
              <span className="text-[10px] text-slate-300 font-medium">
                {userCard?.acquired_at 
                  ? new Date(userCard.acquired_at).toLocaleDateString("pl-PL") 
                  : "Kolekcja Klubowa"}
              </span>
            </div>

            {/* Hologram Authenticity Seal */}
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 text-[8px] text-amber-300 font-black tracking-widest uppercase">
              <Sparkles size={10} /> OFICJALNA
            </div>
          </div>

          {/* Flip Back Button */}
          {showFlip && (
            <button
              type="button"
              onClick={handleFlip}
              className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 backdrop-blur-md shadow-lg transition-all"
              title="Obróć kartę (awers)"
              aria-label="Obróć kartę"
            >
              <RotateCw size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
