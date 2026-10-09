"use client";

import React, { useEffect, useState } from "react";
import { PackDefinition, getPackImageUrl } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

interface PackOpeningTearProps {
  pack: PackDefinition;
  onTearComplete: () => void;
  hasInfernoOrLegend?: boolean;
}

export default function PackOpeningTear({
  pack,
  onTearComplete,
  hasInfernoOrLegend = false
}: PackOpeningTearProps) {
  const [phase, setPhase] = useState<"charge" | "tear" | "flash">("charge");
  const packImage = pack.image_url || getPackImageUrl(pack.id, pack.theme);

  useEffect(() => {
    // 1. Charge phase: 0ms -> 600ms
    const t1 = setTimeout(() => {
      setPhase("tear");
      cardSound.playCinematicBoom();
      cardSound.playHaptic(hasInfernoOrLegend ? "inferno" : "heavy");
    }, 650);

    // 2. Tear / Burst phase: 600ms -> 1300ms
    const t2 = setTimeout(() => {
      setPhase("flash");
    }, 1350);

    // 3. Complete and switch to reveal: 1800ms
    const t3 = setTimeout(() => {
      onTearComplete();
    }, 1750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onTearComplete, hasInfernoOrLegend]);

  return (
    <div className={`delta-cinematic-tear-stage phase-${phase} animate-fadeIn`}>
      {/* Background Energy Surge */}
      <div className="delta-tear-energy-bg" />

      {/* Center Tearing Pack with Split Halves */}
      <div className="delta-tear-pack-container">
        <div className={`delta-tear-pack-half top ${phase}`}>
          <img src={packImage} alt="Pack Upper" className="delta-tear-img top-img" />
          <div className="delta-tear-seam-glow top-seam" />
        </div>

        <div className={`delta-tear-pack-half bottom ${phase}`}>
          <img src={packImage} alt="Pack Lower" className="delta-tear-img bottom-img" />
          <div className="delta-tear-seam-glow bottom-seam" />
        </div>

        {/* Central Burst Light & Shockwave */}
        {phase !== "charge" && (
          <div className="delta-tear-burst-core">
            <div className="delta-tear-shockwave" />
            <div className="delta-tear-sparks" />
          </div>
        )}
      </div>

      {/* Screen White/Gold Flash on complete tear */}
      <div className={`delta-tear-screen-flash ${phase === "flash" ? "active" : ""}`} />
    </div>
  );
}
