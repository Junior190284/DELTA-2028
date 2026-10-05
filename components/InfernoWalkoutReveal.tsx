"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Sparkles, 
  Flame, 
  X, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Check, 
  ChevronRight,
  Shield,
  Crown,
  Trophy
} from "lucide-react";
import { InfernoWalkoutData, getRarityTheme } from "@/lib/cards/walkout-config";
import { cardSound } from "@/lib/cards/audio";
import CanvasParticles from "./CanvasParticles";

export type WalkoutStage = 
  | "intro"       // 0–3s: Stadium tunnel atmosphere & tension building
  | "rarity"      // 3–5s: INFERNO rarity typography slam & rating/pos tease
  | "player"      // 5–7s: Player cutout reveals with rim light & upward glide
  | "card"        // 7–9s: Card slams with flash, 3D tilt & fanfare
  | "final_hero"; // 9s+: Stabilized final hero shot with full UI & CTA

interface InfernoWalkoutRevealProps {
  data: InfernoWalkoutData;
  onStart?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  onCollect?: () => void;
  onClose?: () => void;
}

export default function InfernoWalkoutReveal({
  data,
  onStart,
  onComplete,
  onSkip,
  onCollect,
  onClose
}: InfernoWalkoutRevealProps) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<WalkoutStage>("intro");
  const [screenShake, setScreenShake] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [interactiveTilt, setInteractiveTilt] = useState({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageTimersRef = useRef<NodeJS.Timeout[]>([]);

  const themeConfig = useMemo(() => getRarityTheme(data.rarity), [data.rarity]);
  const accentColor = data.accentColor || themeConfig.accentColor;

  // Cleanup timers helper
  const clearAllTimers = () => {
    stageTimersRef.current.forEach(t => clearTimeout(t));
    stageTimersRef.current = [];
  };

  // Mount setup & lock document scroll
  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    onStart?.();

    return () => {
      document.body.style.overflow = prevOverflow;
      clearAllTimers();
      cardSound.stopDeltaChant();
    };
  }, [onStart]);

  // Main timeline sequencer
  const startTimeline = () => {
    clearAllTimers();
    setStage("intro");
    setScreenShake(false);
    setFlashActive(false);

    // Audio cue 1: Sub-bass rumble & boom
    try {
      cardSound.playCinematicBoom();
      if (!isMuted) {
        cardSound.playDeltaChant(0.9);
      }
    } catch {}

    // ETAP 2: RARITY REVEAL (3.0s)
    const t1 = setTimeout(() => {
      setStage("rarity");
      setScreenShake(true);
      try {
        cardSound.playPyroBurst();
        cardSound.playSirenAlarm();
      } catch {}
      setTimeout(() => setScreenShake(false), 600);
    }, 3000);

    // ETAP 3: PLAYER REVEAL (5.2s)
    const t2 = setTimeout(() => {
      setStage("player");
      try {
        cardSound.playTeaserHit(3);
      } catch {}
    }, 5200);

    // ETAP 4: CARD REVEAL SLAM (7.4s)
    const t3 = setTimeout(() => {
      setStage("card");
      setFlashActive(true);
      setScreenShake(true);
      try {
        cardSound.playWalkoutFanfare();
      } catch {}
      setTimeout(() => {
        setFlashActive(false);
        setScreenShake(false);
      }, 700);
    }, 7400);

    // ETAP 5: FINAL HERO SHOT (9.2s)
    const t4 = setTimeout(() => {
      setStage("final_hero");
      onComplete?.();
    }, 9200);

    stageTimersRef.current = [t1, t2, t3, t4];
  };

  useEffect(() => {
    startTimeline();
    return () => clearAllTimers();
  }, [data]);

  // Keyboard shortcut: ESC to skip
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Skip handler -> Jump directly to Final Hero Shot
  const handleSkip = () => {
    clearAllTimers();
    setStage("final_hero");
    setFlashActive(false);
    setScreenShake(false);
    onSkip?.();
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    cardSound.setDeltaChantMuted(next);
    if (!next) {
      cardSound.playDeltaChant(0.95);
    }
  };

  // 3D Card mouse move parallax for Stage 5
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== "final_hero") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setInteractiveTilt({ x: x * 15, y: -y * 15 });
  };

  const handleMouseLeave = () => {
    setInteractiveTilt({ x: 0, y: 0 });
  };

  if (!mounted || typeof document === "undefined") return null;

  // Custom user offsets & transforms
  const pTransform = data.playerTransform || {};
  const cTransform = data.cardTransform || {};

  const modalContent = (
    <div 
      className={`v200-walkout-master-viewport ${screenShake ? "v200-screen-shake" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999999,
        background: "#020408",
        overflow: "hidden",
        isolation: "isolate",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none"
      }}
      role="dialog"
      aria-label="Walkout Reveal"
    >
      {/* ================= LAYER 1: CINEMATIC BACKGROUND VIDEO ================= */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          overflow: "hidden"
        }}
      >
        {!videoError ? (
          <video
            ref={videoRef}
            src={data.backgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.75) contrast(1.15)"
            }}
          />
        ) : (
          /* High-res stadium poster fallback */
          <div 
            style={{
              width: "100%",
              height: "100%",
              background: "radial-gradient(ellipse at 50% 30%, #1e0508 0%, #0d0203 50%, #020102 100%)"
            }}
          />
        )}
      </div>

      {/* ================= LAYER 2: DARK OVERLAYS & COLOR GRADING ================= */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          background: "radial-gradient(circle at 50% 50%, transparent 20%, rgba(2, 4, 8, 0.6) 60%, rgba(2, 4, 8, 0.95) 100%)",
          pointerEvents: "none"
        }}
      />
      <div 
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          background: `radial-gradient(circle at 50% 60%, ${accentColor}18 0%, transparent 70%)`,
          mixBlendMode: "screen",
          pointerEvents: "none"
        }}
      />

      {/* ================= LAYER 3: PARTICLES & SPARKS ================= */}
      <CanvasParticles theme={themeConfig.particleTheme} active={stage !== "intro"} />

      {/* ================= FLASH EXPLOSION OVERLAY (STAGE 4) ================= */}
      {flashActive && (
        <div 
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 80,
            background: "#ffffff",
            animation: "v200-flash-burst 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards",
            pointerEvents: "none"
          }}
        />
      )}

      {/* ================= TOP FLOATING NAVIGATION & SOUND ================= */}
      <div 
        style={{
          position: "absolute",
          top: "20px",
          left: "24px",
          right: "24px",
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "auto"
        }}
      >
        {/* Brand Kicker */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img 
            src={data.clubLogo || "/teamlogos/gm.png"} 
            alt="DELTA" 
            style={{ width: "32px", height: "32px", objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.4))" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", letterSpacing: "1px" }}>
              K.S. DELTA WARSZAWA
            </span>
            <span style={{ fontSize: "9px", color: accentColor, fontWeight: 800, letterSpacing: "0.5px" }}>
              {themeConfig.kicker}
            </span>
          </div>
        </div>

        {/* Action Controls: Sound & Skip */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={toggleSound}
            style={{
              padding: "7px 14px",
              borderRadius: "30px",
              background: "rgba(0, 0, 0, 0.65)",
              border: `1px solid ${isMuted ? "rgba(239, 68, 68, 0.6)" : "rgba(241, 201, 92, 0.5)"}`,
              color: isMuted ? "#fca5a5" : "#f1c95c",
              fontSize: "11px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              backdropFilter: "blur(8px)"
            }}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isMuted ? "WYCISZONY" : "DŹWIĘK"}</span>
          </button>

          {stage !== "final_hero" ? (
            <button
              type="button"
              onClick={handleSkip}
              style={{
                padding: "7px 16px",
                borderRadius: "30px",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                backdropFilter: "blur(8px)"
              }}
            >
              <span>POMIŃ</span>
              <kbd style={{ fontSize: "9px", background: "rgba(0,0,0,0.5)", padding: "1px 5px", borderRadius: "4px" }}>ESC</kbd>
            </button>
          ) : (
            onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
                aria-label="Zamknij"
              >
                <X size={18} />
              </button>
            )
          )}
        </div>
      </div>

      {/* ================= STAGE 2: RARITY SLAM TYPOGRAPHY ================= */}
      {stage === "rarity" && (
        <div 
          style={{
            position: "absolute",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            animation: "v200-slam-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            pointerEvents: "none"
          }}
        >
          <span 
            style={{
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "4px",
              color: "#ffffff",
              textTransform: "uppercase",
              marginBottom: "8px",
              textShadow: "0 0 14px rgba(255,255,255,0.7)"
            }}
          >
            {themeConfig.kicker}
          </span>

          <h1 
            style={{
              fontSize: "clamp(48px, 12vw, 100px)",
              fontWeight: 950,
              letterSpacing: "8px",
              margin: 0,
              background: `linear-gradient(180deg, #ffffff 0%, ${accentColor} 60%, #5c050a 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: `drop-shadow(0 0 35px ${themeConfig.glowColor})`,
              lineHeight: 1
            }}
          >
            {themeConfig.title}
          </h1>

          {/* Teaser Metadata Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px" }}>
            {data.position && (
              <span 
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  background: "rgba(0, 0, 0, 0.75)",
                  border: `1px solid ${accentColor}`,
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "1px"
                }}
              >
                {data.position}
              </span>
            )}
            {data.rating && (
              <span 
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  background: `linear-gradient(90deg, ${accentColor}, #ff8400)`,
                  color: "#000000",
                  fontSize: "13px",
                  fontWeight: 950,
                  boxShadow: `0 0 20px ${accentColor}`
                }}
              >
                OVR {data.rating}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ================= STAGE 3, 4 & 5: MAIN HERO STAGE ================= */}
      {(stage === "player" || stage === "card" || stage === "final_hero") && (
        <div 
          style={{
            position: "relative",
            zIndex: 40,
            width: "100%",
            maxWidth: "1100px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          {/* Central Multiplane Stage (Player Silhouette + 3D Card) */}
          <div 
            style={{
              position: "relative",
              width: "100%",
              height: "clamp(380px, 60vh, 520px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              perspective: "1200px"
            }}
          >
            {/* 1. Ground Ambient Spotlight Shadow */}
            <div 
              style={{
                position: "absolute",
                bottom: "-20px",
                width: "420px",
                height: "100px",
                background: `radial-gradient(ellipse, ${accentColor}55 0%, rgba(0,0,0,0.8) 45%, transparent 70%)`,
                borderRadius: "50%",
                filter: "blur(12px)",
                zIndex: 1,
                pointerEvents: "none"
              }}
            />

            {/* 2. Player Cutout PNG (Layered behind/alongside card) */}
            <div 
              style={{
                position: "absolute",
                zIndex: stage === "player" ? 10 : 5,
                transform: `
                  translate(
                    ${stage === "final_hero" ? "-110px" : stage === "card" ? "-80px" : "0px"}, 
                    ${pTransform.y || 0}px
                  ) 
                  scale(${stage === "player" ? (pTransform.scale || 1.15) : (pTransform.scale || 1.0)}) 
                  rotate(${pTransform.rotate || 0}deg)
                `,
                transition: "all 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
                animation: stage === "player" ? "v200-player-glide 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "v200-player-drift 5s ease-in-out infinite alternate",
                filter: `drop-shadow(0 0 40px ${accentColor}88) drop-shadow(0 20px 30px rgba(0,0,0,0.9))`,
                pointerEvents: "none",
                opacity: stage === "player" ? 1 : 0.88
              }}
            >
              <img 
                src={data.playerImage || "/assets/players/ryszard-inferno.png"} 
                alt={data.playerName}
                style={{
                  maxHeight: "clamp(340px, 55vh, 480px)",
                  maxWidth: "400px",
                  objectFit: "contain"
                }}
              />
            </div>

            {/* 3. Card Image (Layered in front) */}
            {(stage === "card" || stage === "final_hero") && (
              <div 
                style={{
                  position: "absolute",
                  zIndex: 20,
                  transform: `
                    translate(
                      ${stage === "final_hero" ? "100px" : "0px"}, 
                      ${cTransform.y || 0}px
                    ) 
                    rotateY(${interactiveTilt.x}deg) 
                    rotateX(${interactiveTilt.y}deg) 
                    scale(${cTransform.scale || (stage === "final_hero" ? 1.05 : 1.12)})
                  `,
                  transformStyle: "preserve-3d",
                  transition: stage === "final_hero" ? "transform 0.15s ease-out" : "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
                  animation: stage === "card" ? "v200-card-slam 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards" : undefined,
                  filter: `drop-shadow(0 0 45px ${accentColor}99) drop-shadow(0 25px 40px rgba(0,0,0,0.95))`
                }}
              >
                <div 
                  style={{
                    width: "clamp(230px, 32vw, 300px)",
                    height: "clamp(340px, 48vw, 440px)",
                    borderRadius: "18px",
                    overflow: "hidden",
                    background: "radial-gradient(circle, #1a080a 0%, #080203 100%)",
                    border: `2px solid ${accentColor}`,
                    boxShadow: `0 0 30px ${accentColor}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <img 
                    src={data.cardImage || "/assets/players/ryszard-card-inferno.jpg"} 
                    alt={data.playerName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================= STAGE 5: HERO METADATA & ACTIONS ================= */}
          {stage === "final_hero" && (
            <div 
              style={{
                width: "100%",
                maxWidth: "600px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginTop: "16px",
                animation: "v200-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                zIndex: 60
              }}
            >
              {/* Player Nameplate */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Crown size={16} style={{ color: accentColor }} />
                <span style={{ fontSize: "11px", fontWeight: 900, color: accentColor, letterSpacing: "2px", textTransform: "uppercase" }}>
                  {themeConfig.title} • {data.position || "NAPASTNIK"}
                </span>
              </div>

              <h2 
                style={{
                  fontSize: "clamp(24px, 5vw, 36px)",
                  fontWeight: 950,
                  color: "#ffffff",
                  letterSpacing: "1px",
                  margin: "0 0 4px 0",
                  textShadow: `0 0 25px ${accentColor}88`
                }}
              >
                {data.playerName.toUpperCase()}
              </h2>

              <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700, margin: "0 0 16px 0", fontFamily: "monospace" }}>
                #{data.rating || "99"} • {data.teamName || "K.S. DELTA WARSZAWA 2018 GM"}
              </p>

              {/* Action Buttons Bar */}
              <div 
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  width: "100%",
                  flexWrap: "wrap"
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onCollect?.();
                    onClose?.();
                  }}
                  style={{
                    padding: "14px 28px",
                    borderRadius: "16px",
                    background: `linear-gradient(90deg, ${accentColor}, #ff8400)`,
                    border: "none",
                    color: "#000000",
                    fontSize: "13px",
                    fontWeight: 950,
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    boxShadow: `0 6px 25px ${accentColor}66`,
                    transition: "all 0.2s"
                  }}
                >
                  <Sparkles size={18} />
                  <span>DODAJ DO KOLEKCJI</span>
                </button>

                <button
                  type="button"
                  onClick={startTimeline}
                  style={{
                    padding: "13px 20px",
                    borderRadius: "16px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    backdropFilter: "blur(8px)"
                  }}
                >
                  <RotateCcw size={15} />
                  <span>POWTÓRZ REVEAL</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Embedded Keyframes for Walkout Animation */}
      <style jsx global>{`
        @keyframes v200-slam-in {
          0% {
            opacity: 0;
            transform: scale(2.2) translateY(-40px);
            filter: blur(15px);
          }
          60% {
            opacity: 1;
            transform: scale(0.96) translateY(0);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes v200-player-glide {
          0% {
            opacity: 0;
            transform: translateY(60px) scale(0.85);
            filter: blur(10px) brightness(0.5);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1.15);
            filter: blur(0) brightness(1);
          }
        }

        @keyframes v200-player-drift {
          0% {
            transform: translate(-110px, 0px) scale(1.0);
          }
          100% {
            transform: translate(-110px, -12px) scale(1.02);
          }
        }

        @keyframes v200-card-slam {
          0% {
            opacity: 0;
            transform: scale(2.5) rotateY(45deg);
            filter: brightness(2.5);
          }
          70% {
            opacity: 1;
            transform: scale(0.95) rotateY(-8deg);
            filter: brightness(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1.05) rotateY(0deg);
            filter: brightness(1);
          }
        }

        @keyframes v200-fade-up {
          0% {
            opacity: 0;
            transform: translateY(25px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes v200-flash-burst {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }

        .v200-screen-shake {
          animation: v200-shake-kf 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes v200-shake-kf {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
          40%, 60% { transform: translate3d(6px, 0, 0); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
