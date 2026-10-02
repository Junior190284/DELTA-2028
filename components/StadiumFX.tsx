"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MEDIA } from "@/lib/media";

type Props = {
  intro?: boolean;
  compact?: boolean;
  cinematicIntro?: boolean;
  videoSrc?: string;
  onCloseCinematic?: () => void;
};

export default function StadiumFX({
  intro = true,
  compact = false,
  cinematicIntro = false,
  videoSrc = MEDIA.intro.inferno,
  onCloseCinematic
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [showClassicIntro, setShowClassicIntro] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Klasyczna animacja ognia (dla panelu dashboardu lub gdy wyłączone wideo)
  useEffect(() => {
    if (!intro || cinematicIntro) return;
    try {
      const key = "delta-v101-fire-reveal";
      if (sessionStorage.getItem(key) !== "1") {
        setShowClassicIntro(true);
        sessionStorage.setItem(key, "1");
        const timer = window.setTimeout(() => setShowClassicIntro(false), 2400);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setShowClassicIntro(true);
      const timer = window.setTimeout(() => setShowClassicIntro(false), 2400);
      return () => window.clearTimeout(timer);
    }
  }, [intro, cinematicIntro]);

  // Płynne zamknięcie kinowego intro
  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsFadingOut(false);
      onCloseCinematic?.();
    }, 350);
  };

  // Reakcja na montowanie / aktywację kinowego intro
  useEffect(() => {
    if (!cinematicIntro) return;
    setIsFadingOut(false);

    // Klawisz Escape do natychmiastowego pominięcia
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);

    // Wymuszenie startu odtwarzania wideo
    const timer = setTimeout(() => {
      if (videoRef.current) {
        const v = videoRef.current;
        v.muted = true;
        v.defaultMuted = true;
        v.currentTime = 0;
        const playPromise = v.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Video autoplay blocked or error:", err);
          });
        }
      }
    }, 80);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [cinematicIntro]);

  const overlayElement = cinematicIntro ? (
    <div
      className={`v101-cinematic-overlay ${isFadingOut ? "fading" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#020304",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}
      role="dialog"
      aria-label="Filmowe wprowadzenie stadionowe"
    >
      <div className="v101-cinematic-video-wrap">
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el) {
              el.muted = true;
              el.defaultMuted = true;
            }
          }}
          src={videoSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleClose}
          onError={(e) => {
            console.error("Video load error event:", e, videoRef.current?.error);
          }}
          className="v101-cinematic-video"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="v101-cinematic-skip-btn"
        aria-label="Pomiń intro"
      >
        <span>POMIŃ INTRO</span>
        <kbd>ESC</kbd>
      </button>

      <div className="v101-cinematic-brand-accent" aria-hidden="true">
        <img src="/teamlogos/gm.png" alt="" />
        <div>
          <span>K.S. DELTA WARSZAWA</span>
          <b>GÓRNY MOKOTÓW 2018</b>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* 1. Stała atmosfera stadionowa (reflektory, dym, iskry, flary ultras) */}
      <div className={`v101-atmosphere ${compact ? "compact" : ""}`} aria-hidden="true">
        <span className="v101-stadium-beam beam-a" />
        <span className="v101-stadium-beam beam-b" />
        <span className="v101-smoke smoke-a" />
        <span className="v101-smoke smoke-b" />
        <span className="v101-smoke smoke-c" />
        <span className="v101-embers" />
        <span className="v101-ultras-flare flare-left" />
        <span className="v101-ultras-flare flare-right" />
        <span className="v101-terrace-haze" />
        <span className="v101-floodlight-glow glow-left" />
        <span className="v101-floodlight-glow glow-right" />
      </div>

      {/* 2. Istniejąca animacja ognia i herbu (dashboard) */}
      {showClassicIntro && (
        <div className="v101-fire-reveal" aria-hidden="true">
          <div className="v101-fire-smoke" />
          <div className="v101-fire-core fire-left" />
          <div className="v101-fire-core fire-right" />
          <div className="v101-fire-core fire-center" />
          <div className="v101-fire-flare" />
          <div className="v101-fire-title">
            <img src="/teamlogos/gm.png" alt="" />
            <span>DELTA 2018 GM</span>
            <b>GÓRNY MOKOTÓW</b>
          </div>
        </div>
      )}

      {/* 3. Filmowe intro kinowe Inferno montowane bezpośrednio do document.body */}
      {mounted && overlayElement && createPortal(overlayElement, document.body)}
    </>
  );
}
