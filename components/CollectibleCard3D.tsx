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
      className="relative select-none perspective-1000 cursor-pointer group shrink-0 block"
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
        className={`w-full h-full relative transition-transform duration-300 transform-gpu preserve-3d rounded-2xl ${
          isHovered ? "scale-[1.03]" : "scale-100"
        }`}
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
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden backface-hidden border flex flex-col justify-between p-3 z-10 box-border"
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
          {/* Outer Glowing Border Ring */}
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none border-2 opacity-80"
            style={{ borderColor: config.color }}
          />

          {/* Shimmer Sheen */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-2xl opacity-30 mix-blend-overlay"
            style={{
              backgroundImage: "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0.9) 50%, transparent 60%)",
              backgroundSize: "200% 200%",
              animation: "cardShimmer 4s infinite linear"
            }}
          />

          {/* TOP HEADER ROW: DELTA Crest + Rarity Tag */}
          <div className="relative z-20 flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <img src="/teamlogos/gm.png" alt="DELTA" className="w-4 h-4 object-contain drop-shadow" />
              <span className="font-extrabold text-[9px] tracking-wider text-slate-300">GM</span>
            </div>
            
            <span 
              className="px-2 py-0.5 text-[8px] font-black tracking-widest rounded uppercase shadow-md flex items-center gap-1"
              style={{
                backgroundColor: config.color,
                color: rarity === "legendary" || rarity === "rare" || rarity === "common" ? "#000" : "#fff",
                boxShadow: `0 0 10px ${config.color}88`
              }}
            >
              {rarity === "inferno" && <Flame size={9} className="animate-pulse" />}
              {rarity === "legendary" && <Crown size={9} />}
              {rarity === "epic" && <Sparkles size={9} />}
              {config.label}
            </span>
          </div>

          {/* CARD TYPE BADGE (e.g. MVP, GOAL HUNTER, TRAINING WARRIOR) */}
          <div className="relative z-20 mt-1 flex justify-center">
            <div 
              className="px-2.5 py-0.5 rounded-full text-[8.5px] font-black tracking-wider uppercase backdrop-blur-md border shadow-md"
              style={{
                backgroundColor: "rgba(0,0,0,0.7)",
                borderColor: `${config.color}88`,
                color: config.color
              }}
            >
              {card.title || typeConfig.name}
            </div>
          </div>

          {/* CENTER: PLAYER CUTOUT ARTWORK / LOCKED FUT SILHOUETTE */}
          <div className="relative flex-1 flex items-center justify-center my-1 overflow-hidden z-10 w-full">
            {isLocked ? (
              /* ===== LOCKED MYSTERY CARD FORMAT (FUT / PANINI STYLE) ===== */
              <div className="flex flex-col items-center justify-center gap-2 text-center w-full py-2">
                <div 
                  className="w-16 h-16 rounded-2xl bg-black/60 border-2 flex items-center justify-center text-white shadow-2xl relative overflow-hidden"
                  style={{ 
                    borderColor: `${config.color}aa`,
                    boxShadow: `0 0 20px ${config.borderGlow}`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="text-2xl font-black italic tracking-tighter" style={{ color: config.color }}>
                    ?
                  </span>
                  <div className="absolute bottom-1 right-1">
                    <Lock size={12} className="text-slate-400" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black tracking-widest text-slate-300 uppercase">
                    DO ODKRYCIA
                  </span>
                  <span className="text-[7.5px] text-slate-400 font-bold">
                    Otwórz w paczce
                  </span>
                </div>
              </div>
            ) : cutoutImage ? (
              /* ===== UNLOCKED CUTOUT ===== */
              <div className="relative w-full h-full max-h-[135px] flex items-center justify-center">
                <img 
                  src={cutoutImage} 
                  alt={card.player?.display_name || "Zawodnik"}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.9)] transform transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              /* ===== UNLOCKED PHOTO / BADGE ===== */
              <div 
                className="w-16 h-16 rounded-full overflow-hidden border-2 shadow-xl relative flex items-center justify-center bg-slate-900"
                style={{ borderColor: config.color }}
              >
                <div className="w-full h-full flex items-center justify-center bg-black/60">
                  <span className="font-black text-sm text-amber-400">
                    {(card.player?.display_name || "D").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM PLAYER IDENTITY FOOTER */}
          <div className="relative z-20 w-full pt-1.5 border-t border-white/10 backdrop-blur-sm bg-black/60 -mx-3 -mb-3 p-2.5 rounded-b-2xl">
            <div className="flex items-end justify-between">
              <div className="flex flex-col overflow-hidden max-w-[72%]">
                <span className="text-[8px] font-bold tracking-wider text-slate-400 uppercase truncate">
                  {card.player?.position || "ZAWODNIK"} • #{card.player?.shirt_number || "GM"}
                </span>
                <h3 className="font-black text-xs tracking-wide text-white truncate drop-shadow">
                  {isLocked ? (card.player?.display_name || "???") : (card.player?.display_name || card.card_name)}
                </h3>
              </div>
              
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[7px] font-extrabold text-slate-400 tracking-wider">SEZON</span>
                <span className="text-[9px] font-black text-amber-400">{card.season || "2026/27"}</span>
              </div>
            </div>

            {/* DUPLICATES BADGE */}
            {userCard && userCard.duplicates_count > 0 && (
              <div className="mt-1 flex items-center justify-between text-[8px]">
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <CheckCircle2 size={9} /> W kolekcji (x{userCard.duplicates_count + 1})
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
              className="absolute top-2.5 right-2.5 z-30 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-md shadow-md transition-all"
              title="Obróć kartę (rewers)"
              aria-label="Obróć kartę"
            >
              <RotateCw size={11} />
            </button>
          )}
        </div>

        {/* ================= REVERSE SIDE (LORE & STATS) ================= */}
        <div 
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden backface-hidden rotate-y-180 border flex flex-col justify-between p-3 z-10 box-border"
          style={{
            background: "radial-gradient(circle at 50% 20%, #1a1e29 0%, #0d1017 60%, #05060a 100%)",
            borderColor: config.borderGlow,
            boxShadow: `0 8px 24px -4px ${config.borderGlow}, inset 0 0 16px -4px ${config.borderGlow}`
          }}
        >
          {/* Top Bar on Reverse */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1">
              <img src="/teamlogos/gm.png" alt="DELTA" className="w-4 h-4 object-contain" />
              <span className="font-extrabold text-[9px] tracking-wider text-slate-300">DELTA GM</span>
            </div>
            <span className="font-mono text-[8px] text-amber-400 font-bold">
              #{String(card.card_number || 1).padStart(3, '0')}
            </span>
          </div>

          {/* Middle: Lore Story */}
          <div className="flex-1 my-2 overflow-y-auto pr-0.5 space-y-2 text-slate-300">
            <div>
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">TYP KARTY</span>
              <span className="text-[10px] font-black" style={{ color: config.color }}>{card.title || typeConfig.name}</span>
            </div>

            {card.lore || card.description ? (
              <div className="p-2 rounded bg-white/5 border border-white/10 text-[10px] leading-relaxed italic text-slate-200">
                "{card.lore || card.description}"
              </div>
            ) : (
              <div className="p-2 rounded bg-white/5 border border-white/10 text-[10px] leading-relaxed italic text-slate-400">
                Oficjalna karta kolekcjonerska zawodnika {card.player?.display_name || "DELTA GM"} z sezonu {card.season || "2026/27"}.
              </div>
            )}

            {/* Quick Stats if available */}
            {stats && (
              <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
                <div className="p-1 rounded bg-black/40 border border-slate-800">
                  <span className="text-[7px] text-slate-400 block font-bold">MECZE</span>
                  <strong className="text-[10px] text-white font-black">{stats.matches || 0}</strong>
                </div>
                <div className="p-1 rounded bg-black/40 border border-slate-800">
                  <span className="text-[7px] text-slate-400 block font-bold">GOLE</span>
                  <strong className="text-[10px] text-amber-400 font-black">{stats.goals || 0}</strong>
                </div>
                <div className="p-1 rounded bg-black/40 border border-slate-800">
                  <span className="text-[7px] text-slate-400 block font-bold">ASYSTY</span>
                  <strong className="text-[10px] text-sky-400 font-black">{stats.assists || 0}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Stamp */}
          <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between">
            <span className="text-[8px] text-slate-400 font-medium">
              {userCard?.acquired_at 
                ? new Date(userCard.acquired_at).toLocaleDateString("pl-PL") 
                : "Kolekcja Klubowa"}
            </span>

            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[7px] text-amber-300 font-black uppercase">
              <Sparkles size={8} /> OFICJALNA
            </div>
          </div>

          {/* Flip Back Button */}
          {showFlip && (
            <button
              type="button"
              onClick={handleFlip}
              className="absolute top-2.5 right-2.5 z-30 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-md shadow-md transition-all"
              title="Obróć kartę (awers)"
              aria-label="Obróć kartę"
            >
              <RotateCw size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
