"use client";

/**
 * DELTA INFERNO — P12G: safe 2D card for the final reveal (HERO_REVEAL / CARD_REVEAL).
 *
 * On phones CSS 3D (Card3DEngine: preserve-3d + backface-visibility + nested
 * transforms) produced an edge-on card, black rectangles and an accidentally
 * visible back. The same cards in the 2D summary (DeltaCard, interactive={false})
 * render correctly on the same phone, so this component uses exactly that
 * configuration, plus staticFace="front": the back face (CardBack with rotateY(180deg) +
 * backface-visibility) is not rendered at all, so the card's visibility does not
 * depend on how a given browser handles backface-visibility.
 *
 * The "flip" is purely 2D: the back shrinks horizontally (scaleX 1 -> 0) and then the
 * front grows (scaleX 0 -> 1). There is no rotateY, no backface-visibility and no
 * preserve-3d, so a face cannot end up "on the wrong side" and there is nothing to
 * sort in depth. At rest the element holds only the 2D card front. It does not
 * respond to swipes.
 * With Reduced Motion: no animation, the front appears immediately.
 */

import React, { useEffect, useState } from "react";
import { DeltaCard } from "@/components/cards";
import type { DeltaCardModel } from "@/lib/cards/deltaCardModel";

export type SafeRevealMode = "flip" | "fade";

export interface SafeRevealCardProps {
  /** The same model the summary uses (unified.deltaCard). */
  miniCard: DeltaCardModel;
  /** Back image for the 2D flip (the theme's back face). Optional. */
  backImageSrc?: string | null;
  displayName: string;
  /** Card width in px before the stage's own scaling. */
  width: number;
  mode: SafeRevealMode;
  reducedMotion: boolean;
}

export default function SafeRevealCard({ miniCard, backImageSrc, displayName, width, mode, reducedMotion }: SafeRevealCardProps) {
  const animated = !reducedMotion && (mode === "fade" || (mode === "flip" && Boolean(backImageSrc)));
  const [face, setFace] = useState<"front" | "turning">(animated ? "turning" : "front");

  useEffect(() => {
    setFace(animated ? "turning" : "front");
  }, [animated, miniCard]);

  return (
    <div
      data-testid="safe-reveal-card"
      data-face={face}
      data-mode={animated ? mode : "static"}
      role="img"
      aria-label={`Karta zawodnika: ${displayName}`}
      className={`v2-safe-reveal ${animated ? `is-${mode}` : "is-static"}`}
      style={{ width: `${width}px` }}
    >
      {animated && mode === "flip" && backImageSrc && face === "turning" && (
        <img className="v2-safe-reveal-back" src={backImageSrc} alt="" aria-hidden="true" draggable={false} />
      )}
      <div
        className="v2-safe-reveal-front"
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setFace("front");
        }}
      >
        <DeltaCard card={miniCard} size="responsive" interactive={false} showFlip={false} staticFace="front" className="w-full h-full pointer-events-none" />
      </div>
    </div>
  );
}
