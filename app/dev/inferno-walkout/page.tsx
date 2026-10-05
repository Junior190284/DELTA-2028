"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Flame, 
  Sparkles, 
  Crown, 
  Play, 
  Sliders, 
  Shield, 
  ArrowLeft,
  Tv,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import InfernoWalkoutReveal from "@/components/InfernoWalkoutReveal";
import { 
  InfernoWalkoutData, 
  DEMO_INFERNO_DATA, 
  DEMO_GOLD_DATA, 
  WALKOUT_RARITY_CONFIGS 
} from "@/lib/cards/walkout-config";
import { MEDIA } from "@/lib/media";

export default function InfernoWalkoutDevPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<"inferno" | "gold" | "custom">("inferno");
  const [playerX, setPlayerX] = useState(-110);
  const [playerY, setPlayerY] = useState(0);
  const [playerScale, setPlayerScale] = useState(1.0);
  const [cardX, setCardX] = useState(100);
  const [cardY, setCardY] = useState(0);
  const [cardScale, setCardScale] = useState(1.05);

  const [selectedRarity, setSelectedRarity] = useState<string>("INFERNO");
  const [playerName, setPlayerName] = useState("Ryszard Rybacki");
  const [rating, setRating] = useState(99);
  const [position, setPosition] = useState("RW / NAPASTNIK");

  // Dynamic Walkout Data Payload
  const walkoutData: InfernoWalkoutData = {
    rarity: selectedRarity,
    playerName,
    rating,
    position,
    teamName: "K.S. DELTA WARSZAWA 2018 GM",
    playerImage: selectedRarity === "INFERNO" ? "/assets/players/ryszard-inferno.png" : "/assets/players/ryszard-gold.png",
    cardImage: selectedRarity === "INFERNO" ? "/assets/players/ryszard-card-inferno.jpg" : "/assets/players/ryszard-card-gold.jpg",
    backgroundVideo: selectedRarity === "INFERNO" ? (MEDIA.packOpening.bgInferno || MEDIA.intro.inferno) : MEDIA.packOpening.bgGold,
    clubLogo: "/teamlogos/gm.png",
    playerTransform: {
      x: playerX,
      y: playerY,
      scale: playerScale,
      rotate: 0
    },
    cardTransform: {
      x: cardX,
      y: cardY,
      scale: cardScale,
      rotate: 0
    }
  };

  const setPreset = (type: "inferno" | "gold") => {
    setActivePreset(type);
    if (type === "inferno") {
      setSelectedRarity("INFERNO");
      setPlayerName("Ryszard Rybacki");
      setRating(99);
      setPosition("RW / NAPASTNIK");
      setPlayerX(-110);
      setPlayerY(0);
      setPlayerScale(1.0);
      setCardX(100);
      setCardY(0);
      setCardScale(1.05);
    } else {
      setSelectedRarity("GOLD_MASTER");
      setPlayerName("Stefan Zieliński");
      setRating(92);
      setPosition("CAM / POMOCNIK");
      setPlayerX(-100);
      setPlayerY(0);
      setPlayerScale(1.0);
      setCardX(90);
      setCardY(0);
      setCardScale(1.05);
    }
  };

  return (
    <div 
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #111a2e 0%, #060a14 60%, #020408 100%)",
        color: "#ffffff",
        padding: "32px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <Link 
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#94a3b8",
                fontSize: "12px",
                textDecoration: "none",
                marginBottom: "8px"
              }}
            >
              <ArrowLeft size={14} /> Powrót do aplikacji
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 900, margin: 0 }}>
                INFERNO WALKOUT REVEAL • STUDIO DEV
              </h1>
              <span 
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.5px"
                }}
              >
                PROTOTYPE v2.0
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Filmowy moduł otwarcia ultra-rzadkich kart walkout (Intro video → Rarity slam → Cutout zawodnika → Karta 3D → Finałowy Hero Shot).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              padding: "14px 28px",
              borderRadius: "16px",
              background: "linear-gradient(90deg, #ff2a3b, #ff8400)",
              border: "none",
              color: "#000000",
              fontWeight: 950,
              fontSize: "14px",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 6px 25px rgba(255, 42, 59, 0.4)",
              transition: "all 0.2s"
            }}
          >
            <Play size={18} fill="#000" />
            <span>ODPAL WALKOUT REVEAL</span>
          </button>
        </div>

        {/* Main Grid: Live Presets & Transform Customizer */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
          {/* Left Column: Preset Selector & Timeline Inspector */}
          <div 
            style={{
              padding: "24px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            <div>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#f1c95c", letterSpacing: "1px", textTransform: "uppercase" }}>
                1. Wybierz szablon rzadkości
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setPreset("inferno")}
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    textAlign: "left",
                    background: activePreset === "inferno" ? "rgba(255, 42, 59, 0.2)" : "rgba(0, 0, 0, 0.3)",
                    border: activePreset === "inferno" ? "2px solid #ff2a3b" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ff4d5a", fontWeight: 900, fontSize: "13px" }}>
                    <Flame size={16} />
                    <span>INFERNO ULTRA (99 OVR)</span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
                    Ryszard Rybacki • Piekielne wideo i ogień
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset("gold")}
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    textAlign: "left",
                    background: activePreset === "gold" ? "rgba(241, 201, 92, 0.2)" : "rgba(0, 0, 0, 0.3)",
                    border: activePreset === "gold" ? "2px solid #f1c95c" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f1c95c", fontWeight: 900, fontSize: "13px" }}>
                    <Crown size={16} />
                    <span>GOLD MASTER (92 OVR)</span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#94a3b8" }}>
                    Stefan Zieliński • Złota oprawa i arena
                  </p>
                </button>
              </div>
            </div>

            {/* Timeline Breakdown Info */}
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#38bdf8", letterSpacing: "1px", textTransform: "uppercase" }}>
                2. Struktura osi czasu (Timeline)
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {[
                  { time: "0.0s – 3.0s", title: "ETAP 1: INTRO VIDEO", desc: "Kinowy stadion / tunel w tle z sub-bass rumble" },
                  { time: "3.0s – 5.2s", title: "ETAP 2: RARITY SLAM", desc: "Napis INFERNO, syrena, iskry i teaser pozycji/ratingu" },
                  { time: "5.2s – 7.4s", title: "ETAP 3: PLAYER REVEAL", desc: "Miękkie wejście PNG zawodnika z rim lightem i cieniem" },
                  { time: "7.4s – 9.2s", title: "ETAP 4: CARD SLAM", desc: "Błysk flash, uderzenie karty 3D i hymn DELTA GM" },
                  { time: "9.2s +", title: "ETAP 5: FINAL HERO SHOT", desc: "Końcowa kompozycja 3D + nazwisko + przyciski akcji" },
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      fontSize: "11px"
                    }}
                  >
                    <div>
                      <b style={{ color: "#ffffff", marginRight: "8px" }}>{item.title}</b>
                      <span style={{ color: "#64748b" }}>{item.desc}</span>
                    </div>
                    <span style={{ color: "#f1c95c", fontFamily: "monospace", fontWeight: 900, flexShrink: 0 }}>
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Transform Customizer */}
          <div 
            style={{
              padding: "24px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sliders size={16} style={{ color: "#f1c95c" }} />
              <span style={{ fontSize: "12px", fontWeight: 900, color: "#ffffff" }}>
                EDYCJA TRANSFORMACJI ZAWODNIKA I KARTY
              </span>
            </div>

            {/* Player Transform Sliders */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#ff4d5a" }}>
                POZYCJA ZAWODNIKA (PNG CUTOUT)
              </span>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                  <span>Przesunięcie X:</span>
                  <b style={{ color: "#fff" }}>{playerX}px</b>
                </div>
                <input 
                  type="range" 
                  min="-250" 
                  max="50" 
                  value={playerX} 
                  onChange={e => setPlayerX(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#ff4d5a" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                  <span>Skala zawodnika:</span>
                  <b style={{ color: "#fff" }}>{playerScale}x</b>
                </div>
                <input 
                  type="range" 
                  min="0.7" 
                  max="1.4" 
                  step="0.05"
                  value={playerScale} 
                  onChange={e => setPlayerScale(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#ff4d5a" }}
                />
              </div>
            </div>

            {/* Card Transform Sliders */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#f1c95c" }}>
                POZYCJA KARTY (3D CARD)
              </span>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                  <span>Przesunięcie X:</span>
                  <b style={{ color: "#fff" }}>{cardX}px</b>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="250" 
                  value={cardX} 
                  onChange={e => setCardX(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#f1c95c" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                  <span>Skala karty:</span>
                  <b style={{ color: "#fff" }}>{cardScale}x</b>
                </div>
                <input 
                  type="range" 
                  min="0.8" 
                  max="1.4" 
                  step="0.05"
                  value={cardScale} 
                  onChange={e => setCardScale(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#f1c95c" }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(90deg, #ff2a3b, #ff8400)",
                border: "none",
                color: "#000000",
                fontWeight: 900,
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              PRZETESTUJ PODGLĄD W WIDOKU PEŁNOEKRANOWYM
            </button>
          </div>
        </div>
      </div>

      {/* Main Walkout Modal Portal */}
      {isOpen && (
        <InfernoWalkoutReveal
          data={walkoutData}
          onClose={() => setIsOpen(false)}
          onCollect={() => {
            alert("Dodano kartę do Twojej kolekcji!");
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
