"use client";

import React, { useEffect, useRef } from "react";

/** Isolated cinematic media layer; the opening controller remains the source of truth. */
export default function StadiumFilmBackdrop({
  playing,
  desktop,
  theme,
  onPlaying,
  onReady,
  onTimeUpdate,
  onEnded,
  onError,
  released = false,
}: {
  /**
   * P13A: the film has ended and the Cinematic Hold layer fully covers it, so unload the
   * film (pause + remove src + load()). That frees the decoder: at most one video decodes
   * at a time. A new session (released = false) loads the film again.
   */
  released?: boolean;
  playing: boolean;
  desktop: boolean;
  theme: "inferno" | "legend";
  onPlaying: () => void;
  onReady?: () => void;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const releasedRef = useRef(released);
  releasedRef.current = released;
  const onErrorRef = useRef(onError);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onReadyRef = useRef(onReady);
  onErrorRef.current = onError;
  onTimeUpdateRef.current = onTimeUpdate;
  onReadyRef.current = onReady;

  const reportBuffered = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    for (let i = 0; i < video.buffered.length; i += 1) {
      if (video.buffered.start(i) <= 0.1 && video.buffered.end(i) >= video.duration - 0.2) {
        onReadyRef.current?.();
        return;
      }
    }
  };

  useEffect(() => {
    // Load the film while the unopened pack is still on screen.
    // P13A: also after released returns to false (a new session); in the released state there is no src.
    videoRef.current?.load();
  }, [theme, desktop, released]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (released) {
      // P13A: the film is not played again (no repeated explosion); the decoder is freed.
      video.pause();
      return;
    }
    if (playing) {
      // P13A: an ended film is never restarted (e.g. when the effect re-runs after a
      // viewport change), so the explosion does not play again.
      if (video.ended) return;
      void video.play().catch(() => onErrorRef.current());
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [playing, desktop, released]);

  // The browser's `timeupdate` event is too sparse (often ~4 Hz) to drive
  // a smooth 3D card reveal. Sample the actual video clock near its finale.
  useEffect(() => {
    if (!playing || released) return;
    let frameId = 0;
    let lastUpdate = 0;
    const sampleVideoTime = (now: number) => {
      const video = videoRef.current;
      if (!video) return;
      if (video.currentTime >= 7 && now - lastUpdate >= 32) {
        onTimeUpdateRef.current(video.currentTime);
        lastUpdate = now;
      }
      frameId = requestAnimationFrame(sampleVideoTime);
    };
    frameId = requestAnimationFrame(sampleVideoTime);
    return () => cancelAnimationFrame(frameId);
  }, [playing, released]);

  return (
    <video
      ref={videoRef}
      // Until a true landscape shot is produced, preserve the actual moving footage.
      // The artificial zoom-pan desktop clip looked like a shaking still image.
      // P13A: released, so no src (the load() effect above aborts and frees the decoder).
      src={released ? undefined : theme === "legend"
        ? desktop
          ? "/media/walkouts/delta-legend-stadium-v2.mp4"
          : "/media/walkouts/delta-legend-stadium-mobile-v2.mp4"
        : desktop
          ? "/media/walkouts/delta-inferno-stadium-desktop-v2.mp4"
          : "/media/walkouts/delta-inferno-stadium-v2.mp4"}
      muted
      playsInline
      preload="auto"
      onProgress={reportBuffered}
      onCanPlayThrough={() => onReadyRef.current?.()}
      onLoadedData={reportBuffered}
      onPlaying={onPlaying}
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
      onEnded={onEnded}
      onError={() => { if (!releasedRef.current) onError(); }}
      style={{ width: "100%", height: "100%", objectFit: desktop ? "contain" : "cover", background: theme === "legend" ? "#080313" : "rgba(16, 3, 3, .28)" }}
    />
  );
}
