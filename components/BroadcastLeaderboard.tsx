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
      label: "GOLI",
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

  const getCategoryMeta = () => {
    switch (activeTab) {
      case "goals":
        return { title: "KLASYFIKACJA STRZELCÓW", sub: "Najlepsi snajperzy sezonu 2026/27", color: "#38bdf8", icon: "⚽" };
      case "assists":
        return { title: "KLASYFIKACJA ASYST", sub: "Królowie kluczowych podań", color: "#f1c95c", icon: "🎯" };
      case "training":
        return { title: "100% FREKWENCJI TRENINGOWEJ", sub: "Wojownicy treningu i systematyczności", color: "#34d399", icon: "⚡" };
      case "mvp":
        return { title: "KRÓL MVP MECZU", sub: "Najwięcej wyróżnień gracza meczu", color: "#c084fc", icon: "👑" };
    }
  };

  const meta = getCategoryMeta();

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div 
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "rgba(3, 5, 8, 0.94)",
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
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          background: "radial-gradient(ellipse at 50% 0%, #0d1b38 0%, #060d1d 55%, #02050b 100%)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          borderRadius: "24px",
          boxShadow: "0 30px 90px -20px rgba(0,0,0,0.98), 0 0 50px rgba(56, 189, 248, 0.2)",
          color: "#fff",
          overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ================= 1. TV BROADCAST TOP HEADER ================= */}
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            background: "linear-gradient(90deg, #091329 0%, #0c1c3d 50%, #091329 100%)",
            borderBottom: "1px solid rgba(56, 189, 248, 0.3)"
          }}
        >
          {/* Live On Air Indicator & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "1px",
                boxShadow: "0 0 12px rgba(220, 38, 38, 0.7)"
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ffffff", display: "inline-block" }} />
              LIVE ON AIR
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Tv size={18} style={{ color: "#38bdf8" }} />
              <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "1px", color: "#f8fafc" }}>
                DELTA TV SPORTS HD • STUDIO MECZOWE
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button 
            type="button" 
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cbd5e1",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            aria-label="Zamknij"
          >
            <X size={16} />
          </button>
        </div>

        {/* ================= 2. CATEGORY TAB SWITCHER ================= */}
        <div 
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            background: "rgba(0, 0, 0, 0.5)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab("goals"); cardSound.playHover(); }}
            style={{
              padding: "12px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: activeTab === "goals" ? "rgba(56, 189, 248, 0.18)" : "transparent",
              borderBottom: activeTab === "goals" ? "3px solid #38bdf8" : "3px solid transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              color: activeTab === "goals" ? "#38bdf8" : "#94a3b8",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <Target size={14} /> KRÓL STRZELCÓW
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("assists"); cardSound.playHover(); }}
            style={{
              padding: "12px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: activeTab === "assists" ? "rgba(241, 201, 92, 0.18)" : "transparent",
              borderBottom: activeTab === "assists" ? "3px solid #f1c95c" : "3px solid transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              color: activeTab === "assists" ? "#f1c95c" : "#94a3b8",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <Sparkles size={14} /> KRÓL ASYST
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("training"); cardSound.playHover(); }}
            style={{
              padding: "12px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: activeTab === "training" ? "rgba(52, 211, 153, 0.18)" : "transparent",
              borderBottom: activeTab === "training" ? "3px solid #34d399" : "3px solid transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              color: activeTab === "training" ? "#34d399" : "#94a3b8",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <Zap size={14} /> 100% FREKWENCJI
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("mvp"); cardSound.playHover(); }}
            style={{
              padding: "12px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: activeTab === "mvp" ? "rgba(192, 132, 252, 0.18)" : "transparent",
              borderBottom: activeTab === "mvp" ? "3px solid #c084fc" : "3px solid transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              color: activeTab === "mvp" ? "#c084fc" : "#94a3b8",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <Crown size={14} /> MVP MIESIĄCA
          </button>
        </div>

        {/* ================= 3. BROADCAST BODY (STUDIO & TABLE) ================= */}
        <div 
          style={{
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 1.35fr",
            gap: "24px",
            overflowY: "auto",
            alignItems: "center"
          }}
        >
          {/* Left Column: Star Leader TV Spotlight */}
          <div 
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 16px",
              borderRadius: "20px",
              background: "linear-gradient(180deg, rgba(13, 37, 77, 0.6) 0%, rgba(3, 10, 24, 0.8) 100%)",
              border: `1px solid ${meta.color}55`,
              boxShadow: `0 10px 30px rgba(0,0,0,0.6), inset 0 0 20px ${meta.color}15`,
              position: "relative",
              textAlign: "center"
            }}
          >
            {/* Top Ribbon */}
            <div 
              style={{
                position: "absolute",
                top: "10px",
                left: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(241, 201, 92, 0.2)",
                border: "1px solid rgba(241, 201, 92, 0.5)",
                color: "#f1c95c",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.5px"
              }}
            >
              <Trophy size={11} /> LIDER RANKINGU #1
            </div>

            {/* Framed Photo */}
            <div 
              style={{
                width: "140px",
                height: "170px",
                margin: "18px 0 12px 0",
                borderRadius: "14px",
                border: "2px solid rgba(241, 201, 92, 0.7)",
                overflow: "hidden",
                background: "radial-gradient(circle, #1e293b 0%, #020617 100%)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.8), 0 0 20px rgba(241, 201, 92, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img 
                src={topPlayer?.photoUrl || "/teamlogos/gm.png"} 
                alt={topPlayer?.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain"
                }}
              />
            </div>

            {/* Player Info */}
            <span style={{ fontSize: "10px", color: meta.color, fontWeight: "bold", fontFamily: "monospace" }}>
              #{topPlayer?.shirtNumber} • K.S. DELTA WARSZAWA 2018 GM
            </span>
            <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#ffffff", margin: "4px 0 8px 0", letterSpacing: "0.5px" }}>
              {topPlayer?.name}
            </h3>

            {/* Stat Score Pill */}
            <div 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 16px",
                borderRadius: "30px",
                background: "linear-gradient(90deg, #f1c95c, #eab308)",
                color: "#000000",
                fontWeight: 900,
                fontSize: "14px",
                boxShadow: "0 4px 15px rgba(241, 201, 92, 0.4)"
              }}
            >
              <span>{topPlayer?.val}</span>
              <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{topPlayer?.label}</span>
            </div>
          </div>

          {/* Right Column: TV Broadcast Lower-Third Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", padding: "0 4px" }}>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.5px" }}>{meta.title}</span>
                <span style={{ display: "block", fontSize: "10px", color: "#94a3b8" }}>{meta.sub}</span>
              </div>
              <span style={{ fontSize: "10px", color: meta.color, fontWeight: "bold", fontFamily: "monospace" }}>TOP 5 ZAWODNIKÓW</span>
            </div>

            {activeList.map((item, idx) => {
              const isFirst = idx === 0;
              return (
                <div 
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 14px",
                    borderRadius: "12px",
                    background: isFirst 
                      ? "linear-gradient(90deg, rgba(241, 201, 92, 0.18) 0%, rgba(241, 201, 92, 0.04) 100%)" 
                      : "rgba(255, 255, 255, 0.03)",
                    border: isFirst 
                      ? "1px solid rgba(241, 201, 92, 0.5)" 
                      : "1px solid rgba(255, 255, 255, 0.06)",
                    boxShadow: isFirst ? "0 4px 14px rgba(241, 201, 92, 0.15)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span 
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 900,
                        background: idx === 0 ? "#f1c95c" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#b45309" : "rgba(255,255,255,0.08)",
                        color: idx === 0 || idx === 1 ? "#000000" : "#ffffff"
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
                        {item.name}
                      </h4>
                      <span style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace" }}>
                        #{item.shirtNumber} • DELTA 2018 GM
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 900, color: meta.color, fontFamily: "monospace" }}>
                      {item.val}
                    </span>
                    <span style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase" }}>
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 4. TV BOTTOM TICKER ================= */}
        <div 
          style={{
            padding: "10px 20px",
            background: "rgba(0, 0, 0, 0.75)",
            borderTop: "1px solid rgba(56, 189, 248, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#38bdf8"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <span 
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                background: "#38bdf8",
                color: "#000000",
                fontWeight: 900,
                fontSize: "9px"
              }}
            >
              TICKER
            </span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ★ NAJBLIŻSZY MECZ LIGOWY: SEMP URSYNÓW vs K.S. DELTA 2018 GM • SOBOTA 10:00 ★
            </span>
          </div>

          <span style={{ color: "#64748b", fontSize: "10px", flexShrink: 0 }}>
            DELTA TV SPORTS HD • 2026/27
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
