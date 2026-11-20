"use client";

import React, { useEffect, useRef } from "react";

/** Isolated cinematic media layer; the opening controller remains the source of truth. */
export default function StadiumFilmBackdrop({
  playing,
  desktop,
  onPlaying,
  onTimeUpdate,
  onEnded,
  onError,
}: {
  playing: boolean;
  desktop: boolean;
  onPlaying: () => void;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

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

  return (
    <video
      ref={videoRef}
      src={desktop
        ? "/media/walkouts/delta-inferno-stadium-desktop-v1.mp4"
        : "/media/walkouts/delta-inferno-stadium-v2.mp4"}
      muted
      playsInline
      preload="auto"
      onPlaying={onPlaying}
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
      onEnded={onEnded}
      onError={onError}
      style={{ width: "100%", height: "100%", objectFit: desktop ? "contain" : "cover", background: "#100303" }}
    />
  );
}