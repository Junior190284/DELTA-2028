"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Trophy, 
  Tv, 
  Flame, 
  Crown, 
  Sparkles, 
  X, 
  Target, 
  Zap, 
  Shield, 
  Award,
  ChevronRight
} from "lucide-react";
import { CardDefinition } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

interface PlayerRankItem {
  id: string;
  name: string;
  shirtNumber: string;
  val: number;
  label: string;
  rarity: string;
  photoUrl?: string;
}

interface BroadcastLeaderboardProps {
  cards: CardDefinition[];
  onClose: () => void;
}

export default function BroadcastLeaderboard({
  cards,
  onClose
}: BroadcastLeaderboardProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"goals" | "assists" | "training" | "mvp">("goals");

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardSound.playCinematicBoom();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Compute leaderboard categories based on players/cards
  const goalScorers: PlayerRankItem[] = cards
    .slice(0, 5)
    .map((c, i) => ({
      id: c.id,
      name: c.player?.display_name || c.card_name || "Zawodnik DELTA",
      shirtNumber: c.player?.shirt_number || String(7 + i),
      val: 18 - i * 3,
      label: "BRAMEK",
      rarity: c.rarity || "common",
      photoUrl: c.player?.photo_path || "/assets/players/ryszard-rybacki.png"
    }));

  const assistKings: PlayerRankItem[] = cards
    .slice(0, 5)
    .map((c, i) => ({
      id: c.id,
      name: c.player?.display_name || c.card_name || "Zawodnik DELTA",
      shirtNumber: c.player?.shirt_number || String(10 + i),
      val: 14 - i * 2,
      label: "ASYST",
      rarity: c.rarity || "rare",
      photoUrl: c.player?.photo_path || "/assets/players/ryszard-gold.png"
    }));

  const trainingWarriors: PlayerRankItem[] = cards
    .slice(0, 5)
    .map((c, i) => ({
      id: c.id,
      name: c.player?.display_name || c.card_name || "Zawodnik DELTA",
      shirtNumber: c.player?.shirt_number || String(4 + i),
      val: 100 - i * 4,
      label: "% FREKWENCJI",
      rarity: "epic",
      photoUrl: c.player?.photo_path || "/assets/players/ryszard-inferno.png"
    }));

  const mvpStars: PlayerRankItem[] = cards
    .slice(0, 5)
    .map((c, i) => ({
      id: c.id,
      name: c.player?.display_name || c.card_name || "Zawodnik DELTA",
      shirtNumber: c.player?.shirt_number || String(9 + i),
      val: 8 - i,
      label: "TYTUŁÓW MVP",
      rarity: "legendary",
      photoUrl: c.player?.photo_path || "/assets/players/ryszard-legend.png"
    }));

  const activeList = 
    activeTab === "goals" ? goalScorers :
    activeTab === "assists" ? assistKings :
    activeTab === "training" ? trainingWarriors : mvpStars;

  const topPlayer = activeList[0];

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
        className="v200-broadcast-modal max-w-4xl w-full flex flex-col"
        style={{
          maxHeight: "92dvh",
          background: "radial-gradient(circle at 50% 10%, #172554 0%, #080f1e 50%, #030712 100%)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          borderRadius: "24px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.95), 0 0 50px rgba(56, 189, 248, 0.15)",
          color: "#fff",
          overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* TV Broadcast Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b border-sky-500/30">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded bg-red-600 text-white font-black text-[11px] tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/50 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" /> LIVE ON AIR
            </div>
            <div className="flex items-center gap-2">
              <Tv size={18} className="text-sky-400" />
              <span className="font-black text-xs tracking-wider text-white">DELTA TV SPORTS HD</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="grid grid-cols-4 border-b border-white/10 bg-black/40 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab("goals"); cardSound.playHover(); }}
            className={`py-3 flex items-center justify-center gap-2 transition-all ${
              activeTab === "goals" ? "bg-sky-500/20 text-sky-300 border-b-2 border-sky-400 font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            <Target size={15} /> KRÓL STRZELCÓW
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("assists"); cardSound.playHover(); }}
            className={`py-3 flex items-center justify-center gap-2 transition-all ${
              activeTab === "assists" ? "bg-amber-500/20 text-amber-300 border-b-2 border-amber-400 font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles size={15} /> KRÓL ASYST
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("training"); cardSound.playHover(); }}
            className={`py-3 flex items-center justify-center gap-2 transition-all ${
              activeTab === "training" ? "bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400 font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap size={15} /> 100% FREKWENCJI
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("mvp"); cardSound.playHover(); }}
            className={`py-3 flex items-center justify-center gap-2 transition-all ${
              activeTab === "mvp" ? "bg-purple-500/20 text-purple-300 border-b-2 border-purple-400 font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            <Crown size={15} /> MVP MIESIĄCA
          </button>
        </div>

        {/* Broadcast Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left: Star Player Spotlight (TV Studio Look) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-sky-950/40 to-black/60 border border-sky-500/30 relative overflow-hidden">
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black tracking-wider flex items-center gap-1">
              <Trophy size={11} /> LIDER RANKINGU #1
            </div>

            <div className="w-36 h-48 my-3 rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-2xl shadow-amber-500/20 relative flex items-center justify-center bg-black/60">
              <img 
                src={topPlayer?.photoUrl || "/teamlogos/gm.png"} 
                alt={topPlayer?.name}
                className="w-full h-full object-contain filter drop-shadow-lg transform hover:scale-105 transition-transform"
              />
            </div>

            <div className="text-center w-full">
              <span className="text-[11px] font-mono text-amber-400 font-bold">#{topPlayer?.shirtNumber} • DELTA WARSZAWA</span>
              <h3 className="text-xl font-black text-white tracking-wide truncate">{topPlayer?.name}</h3>
              <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-sm shadow-lg shadow-amber-500/30">
                <span>{topPlayer?.val}</span>
                <span className="text-xs">{topPlayer?.label}</span>
              </div>
            </div>
          </div>

          {/* Right: TV Broadcast Lower-Third Ranking Table */}
          <div className="md:col-span-7 flex flex-col gap-2 justify-center">
            {activeList.map((item, idx) => (
              <div 
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  idx === 0 
                    ? "bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent border-amber-400/60 shadow-md shadow-amber-500/10" 
                    : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    idx === 0 ? "bg-amber-400 text-black shadow" : idx === 1 ? "bg-slate-300 text-black" : idx === 2 ? "bg-amber-700 text-white" : "text-slate-500"
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-white tracking-wide">{item.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">#{item.shirtNumber} • K.S. DELTA</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-sky-300 font-mono">{item.val}</span>
                  <span className="text-[10px] text-slate-400 uppercase">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TV Bottom Ticker */}
        <div className="py-2.5 px-6 bg-black/80 border-t border-sky-500/30 flex items-center justify-between text-[11px] font-mono text-sky-400/90 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-sky-500 text-black font-black text-[9px]">TICKER</span>
            <span className="truncate">★ NAJBLIŻSZY MECZ: SEMP URSYNÓW vs K.S. DELTA 2018 GM • SOBOTA 10:00 ★</span>
          </div>
          <span className="text-slate-500 hidden sm:inline">SEZON 2026/27</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
