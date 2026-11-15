"use client";

import React, { useEffect, useState } from "react";
import NeutralPlayerSilhouette from "@/components/cards/NeutralPlayerSilhouette";

export interface PlayerPhotoProps {
  playerId: string;
  shirtNumber?: string | number | null;
  className?: string;
}

export default function PlayerPhoto({
  playerId,
  shirtNumber,
  className
}: PlayerPhotoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setHasError(false);

    fetch(`/api/player-photo/${playerId}`)
      .then(r => r.json())
      .then(d => {
        if (isMounted) {
          setUrl(d.url || null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoaded(true);
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [playerId]);

  if (url && !hasError) {
    return (
      <img
        src={url}
        alt=""
        className={className || "player-photo"}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  // Bezpieczna neutralna sylwetka zamiast wizerunku obcego dziecka
  return (
    <div
      data-testid="player-photo-silhouette-fallback"
      className={`${className || "player-photo"} relative overflow-hidden bg-slate-950 flex items-center justify-center`}
    >
      <NeutralPlayerSilhouette
        shirtNumber={shirtNumber}
        compact={true}
        accentColor="#f6c952"
        glowColor="rgba(246, 201, 82, 0.35)"
      />
      {!loaded && <span className="photo-loading absolute text-[10px] text-amber-400">…</span>}
    </div>
  );
}
