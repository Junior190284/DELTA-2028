"use client";

/**
 * DELTA INFERNO — P13A: Cinematic Hold, the living background behind the revealed card.
 *
 * Sits in the film container ABOVE the intro film and BELOW the card. When the film ends
 * it fades in over HOLD_CROSSFADE_MS and covers the film's last frame (no frozen flames).
 * When fully opaque it reports onOpaque, so the parent can unload the film.
 *
 *  - INFERNO: static stadium + a damped loop of inferno-bg.mp4 (screen blend, low opacity:
 *    the clip has two bright light pulses per loop, so they must not dominate the card).
 *  - LEGEND: static stadium + golden beams and particles in CSS (transform/opacity).
 *  - Reduced Motion: static image only.
 * After unmount (SUMMARY, closing the pack) the video is paused and unloaded.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AMBIENT_VIDEO_SRC,
  HOLD_STILL_SRC,
  HOLD_CROSSFADE_MS,
  ambientKind,
  legendParticles,
  shouldMountAmbientVideo,
  shouldPlayAmbientVideo,
  type HoldStage,
  type HoldTheme,
} from "@/lib/cards/cinematicHold";

export interface CinematicHoldBackdropProps {
  theme: HoldTheme;
  stage: HoldStage;
  /** film clock (s), used only to decide on preloading the ambient video */
  filmTime: number;
  reducedMotion: boolean;
  /** called once the hold layer fully covers the film (the film can be unloaded) */
  onOpaque?: () => void;
}

export default function CinematicHoldBackdrop({ theme, stage, filmTime, reducedMotion, onOpaque }: CinematicHoldBackdropProps) {
  const kind = ambientKind(theme, reducedMotion);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onOpaqueRef = useRef(onOpaque);
  onOpaqueRef.current = onOpaque;
  const [documentHidden, setDocumentHidden] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const mountVideo = !videoFailed && shouldMountAmbientVideo({ stage, kind, filmTime });
  const playVideo = shouldPlayAmbientVideo({ stage, kind, documentHidden });
  const holding = stage === "hold";

  // Hidden tab: no point decoding the background.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () => setDocumentHidden(document.visibilityState === "hidden");
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, []);

  // Play / pause the ambient video.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playVideo) {
      void v.play().catch(() => setVideoFailed(true));
    } else {
      v.pause();
    }
  }, [playVideo, mountVideo]);

  // Unmount: pause and unload (frees the decoder and memory after the pack is closed).
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (!v) return;
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {
        /* safe */
      }
    };
  }, [mountVideo]);

  // Opaque: after the crossfade (transitionend) or at the latest after a safety margin.
  useEffect(() => {
    if (!holding) return;
    const t = window.setTimeout(() => onOpaqueRef.current?.(), HOLD_CROSSFADE_MS + 600);
    return () => window.clearTimeout(t);
  }, [holding]);

  const particles = useMemo(() => (kind === "legend-css" ? legendParticles(18) : []), [kind]);

  if (stage === "off") return null;

  return (
    <div
      data-testid="cinematic-hold"
      data-stage={stage}
      data-kind={kind}
      aria-hidden="true"
      className={`v2-hold v2-hold-${theme} ${holding ? "is-holding" : ""} ${reducedMotion ? "is-static" : ""}`}
      style={{ transitionDuration: `${HOLD_CROSSFADE_MS}ms` }}
      onTransitionEnd={(e) => {
        if (holding && e.target === e.currentTarget && e.propertyName === "opacity") onOpaqueRef.current?.();
      }}
    >
      <div className="v2-hold-still" style={{ backgroundImage: `url('${HOLD_STILL_SRC[theme]}')` }} />

      {mountVideo && AMBIENT_VIDEO_SRC[theme] && (
        <video
          ref={videoRef}
          data-testid="cinematic-hold-video"
          className={`v2-hold-ambient-video ${videoPlaying ? "is-playing" : ""}`}
          src={AMBIENT_VIDEO_SRC[theme] as string}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onPlaying={() => setVideoPlaying(true)}
          onPause={() => setVideoPlaying(false)}
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* INFERNO without video (error): light CSS embers so the background is still alive */}
      {theme === "inferno" && kind !== "static" && videoFailed && (
        <div className="v2-hold-embers" data-testid="cinematic-hold-embers">
          {legendParticles(12).map((p, i) => (
            <i key={i} style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`, ["--drift" as string]: `${p.drift}px` } as React.CSSProperties} />
          ))}
        </div>
      )}

      {kind === "legend-css" && (
        <div className="v2-hold-legend-fx" data-testid="cinematic-hold-legend">
          <span className="v2-hold-beam is-left" />
          <span className="v2-hold-beam is-center" />
          <span className="v2-hold-beam is-right" />
          <div className="v2-hold-particles">
            {particles.map((p, i) => (
              <i key={i} style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`, ["--drift" as string]: `${p.drift}px` } as React.CSSProperties} />
            ))}
          </div>
        </div>
      )}

      <div className="v2-hold-vignette" />
    </div>
  );
}
