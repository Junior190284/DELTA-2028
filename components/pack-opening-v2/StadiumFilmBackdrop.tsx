"use client";

import React from "react";

/** Isolated cinematic media layer; the opening controller remains the source of truth. */
export default function StadiumFilmBackdrop({
  onTimeUpdate,
  onEnded,
  onError,
}: {
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onError: () => void;
}) {
  return (
    <video
      src="/media/walkouts/delta-inferno-stadium-v2.mp4"
      autoPlay
      muted
      playsInline
      preload="auto"
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
      onEnded={onEnded}
      onError={onError}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
