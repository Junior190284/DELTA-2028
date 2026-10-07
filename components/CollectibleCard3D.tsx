"use client";

import React from "react";
import PlayerCard, { getCardFIFAStats } from "./PlayerCard";
import { CardDefinition, UserCard, CardLayoutConfig } from "@/lib/cards/types";

export { getCardFIFAStats };

export interface CollectibleCard3DProps {
  card: CardDefinition;
  userCard?: UserCard | null;
  isLocked?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "responsive";
  interactive?: boolean;
  showFlip?: boolean;
  touchFlip?: boolean;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  onClick?: () => void;
  layoutOverride?: Partial<CardLayoutConfig>;
  stats?: {
    matches?: number;
    goals?: number;
    assists?: number;
    trainings?: number;
    mvp?: number;
    captain?: number;
  };
}

export default function CollectibleCard3D({
  card,
  userCard,
  isLocked = false,
  size = "md",
  interactive = true,
  showFlip = true,
  touchFlip = false,
  isFlipped,
  onFlipChange,
  onClick,
  layoutOverride,
  stats
}: CollectibleCard3DProps) {
  return (
    <PlayerCard
      card={card}
      player={card.player}
      userCard={userCard}
      isLocked={isLocked}
      size={size}
      interactive={interactive}
      showFlip={showFlip}
      touchFlip={touchFlip}
      isFlipped={isFlipped}
      onFlipChange={onFlipChange}
      onClick={onClick}
      layoutOverride={layoutOverride}
      stats={stats}
    />
  );
}
