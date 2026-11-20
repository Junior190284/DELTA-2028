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
}: {
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
    videoRef.current?.load();
  }, [theme, desktop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      void video.play().catch(() => onErrorRef.current());
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [playing, desktop]);

  // The browser's `timeupdate` event is too sparse (often ~4 Hz) to drive
  // a smooth 3D card reveal. Sample the actual video clock near its finale.
  useEffect(() => {
    if (!playing) return;
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
  }, [playing]);

  return (
    <video
      ref={videoRef}
      // Until a true landscape shot is produced, preserve the actual moving footage.
      // The artificial zoom-pan desktop clip looked like a shaking still image.
      src={theme === "legend"
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
      onError={onError}
      style={{ width: "100%", height: "100%", objectFit: desktop ? "contain" : "cover", background: theme === "legend" ? "#080313" : "rgba(16, 3, 3, .28)" }}
    />
  );
}
