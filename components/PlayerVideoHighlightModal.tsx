"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, Award, Trophy, User } from "lucide-react";
import { CardDefinition } from "@/lib/cards/types";
import { MEDIA } from "@/lib/media";
import { cardSound } from "@/lib/cards/audio";

interface PlayerVideoHighlightModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export default function PlayerVideoHighlightModal({
  card,
  onClose
}: PlayerVideoHighlightModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 0.5>(1);

  const isInferno = card.rarity === "inferno";
  const isLegend = card.rarity === "legendary";

  const videoSrc = isInferno 
    ? MEDIA.packOpening.bgInferno 
    : isLegend 
    ? MEDIA.packOpening.bgLegend 
    : card.card_type === "matchday" 
    ? MEDIA.packOpening.bgMatchday 
    : MEDIA.packOpening.bgGold;

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardSound.playWalkoutFanfare();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      className="v200-picker-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "rgba(3, 5, 8, 0.96)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflow: "hidden"
      }}
      onClick={onClose}
    >
      <div 
        className="v200-video-modal max-w-2xl w-full flex flex-col relative rounded-3xl overflow-hidden border border-amber-500/40 shadow-2xl shadow-amber-500/10 bg-black"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Floating Controls */}
        <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold tracking-wide">MATCHDAY HIGHLIGHT INTRO</span>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Stage */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            src={videoSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Central Highlight Watermark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

          {/* Player Photo Callout */}
          <div className="absolute bottom-6 left-6 z-10 flex items-end gap-4 pointer-events-none">
            <div className="w-20 h-28 rounded-xl bg-black/40 border border-amber-400/60 p-1 backdrop-blur-md shadow-2xl flex items-center justify-center overflow-hidden">
              <img 
                src={card.player?.photo_path || "/assets/players/ryszard-rybacki.png"} 
                alt={card.player?.display_name || card.card_name}
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                ★ {card.rarity.toUpperCase()} HIGHLIGHT REEL
              </span>
              <h2 className="text-2xl font-black text-white tracking-wide drop-shadow">
                {card.player?.display_name || card.card_name}
              </h2>
              <p className="text-xs text-slate-300 drop-shadow">
                #{card.player?.shirt_number || "7"} • K.S. DELTA WARSZAWA 2018 GM
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors"
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{isMuted ? "Wyciszony" : "Dźwięk stadionu"}</span>
            </button>
            <button
              type="button"
              onClick={() => setPlaybackSpeed(prev => prev === 1 ? 0.5 : 1)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                playbackSpeed === 0.5 ? "bg-amber-500/30 text-amber-300 border border-amber-400" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <span>Slow-Motion ({playbackSpeed}x)</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-amber-400 font-bold">
            DELTA ULTRA HD REEL
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
