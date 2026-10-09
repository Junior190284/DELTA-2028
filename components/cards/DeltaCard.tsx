"use client";

import React, { useMemo } from "react";
import {
  DeltaCardModel,
  DeltaCardSize,
  DeltaCardTheme,
  DELTA_THEME_CONFIGS,
  adaptLegacyToDeltaCardModel
} from "@/lib/cards/deltaCardModel";
import { CardDefinition, UserCard, CardLayoutConfig } from "@/lib/cards/types";
import CardInteractiveLayer from "./CardInteractiveLayer";
import CardGlow from "./CardGlow";
import CardCutout from "./CardCutout";
import CardFrame from "./CardFrame";
import CardBadgeHeader from "./CardBadgeHeader";
import CardNameplate from "./CardNameplate";
import CardStatsPanel from "./CardStatsPanel";
import CardRarityEffect from "./CardRarityEffect";
import CardFoil from "./CardFoil";
import CardBack from "./CardBack";

export interface DeltaCardProps {
  card?: DeltaCardModel | CardDefinition;
  player?: {
    id: string;
    display_name: string;
    shirt_number: string | null;
    position: string | null;
    photo_path?: string | null;
  };
  userCard?: UserCard | null;
  isLocked?: boolean;
  size?: DeltaCardSize;
  themeOverride?: DeltaCardTheme;
  layoutOverride?: Partial<CardLayoutConfig>;
  interactive?: boolean;
  showFlip?: boolean;
  touchFlip?: boolean;
  isFlipped?: boolean;
  onFlipChange?: (isFlipped: boolean) => void;
  onClick?: () => void;
  stats?: {
    matches?: number;
    goals?: number;
    assists?: number;
    trainings?: number;
    attendance?: number;
    captain?: number;
    mvp?: number;
  };
  customPhotoUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

function DeltaCard({
  card,
  player,
  userCard,
  isLocked = false,
  size = "md",
  themeOverride,
  layoutOverride,
  interactive = true,
  showFlip = true,
  touchFlip = false,
  isFlipped,
  onFlipChange,
  onClick,
  stats,
  customPhotoUrl,
  className = "",
  style
}: DeltaCardProps) {
  // Normalize into DeltaCardModel
  const cardModel: DeltaCardModel = useMemo(() => {
    if (card && "cardType" in card && typeof card.cardType === "string" && DELTA_THEME_CONFIGS[card.cardType as DeltaCardTheme]) {
      return card as DeltaCardModel;
    }
    return adaptLegacyToDeltaCardModel({
      card: card as CardDefinition,
      player,
      userCard,
      isLocked,
      stats,
      customPhotoUrl,
      layoutOverride
    });
  }, [card, player, userCard, isLocked, stats, customPhotoUrl, layoutOverride]);

  // Apply theme override if specified
  const effectiveTheme: DeltaCardTheme = themeOverride || cardModel.cardType || "STANDARD";
  const themeConfig = DELTA_THEME_CONFIGS[effectiveTheme] || DELTA_THEME_CONFIGS.STANDARD;

  return (
    <CardInteractiveLayer
      size={size}
      interactive={interactive}
      touchFlip={touchFlip}
      isFlipped={isFlipped}
      onFlipChange={onFlipChange}
      onClick={onClick}
      glowColor={themeConfig.accentGlow}
      className={className}
      isLocked={cardModel.isLocked}
      style={style}
    >
      {({ glarePos, isHovered, isBackFace, flipCard }) => (
        <>
          {/* ============================================================= */}
          {/* FACE 1: FRONT FACE                                            */}
          {/* ============================================================= */}
          <div
            className="card-face-front absolute inset-0 w-full h-full rounded-[4cqw] overflow-hidden select-none"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: isBackFace ? "none" : "auto"
            }}
          >
            {/* 1. Background & Stadium Lighting */}
            <CardGlow themeConfig={themeConfig} />

            {/* 2. Player Cutout / Neon Silhouette */}
            <CardCutout
              playerName={cardModel.playerName}
              shirtNumber={cardModel.shirtNumber}
              photoUrl={cardModel.playerImage}
              artworkPose={cardModel.artworkPose}
              cardType={effectiveTheme}
              themeConfig={themeConfig}
              isLocked={cardModel.isLocked}
              layoutOverride={cardModel.layoutOverride}
            />

            {/* 3. Card Frame */}
            <CardFrame themeConfig={themeConfig} />

            {/* 4. Top Badges & Real Indicators */}
            <CardBadgeHeader
              shirtNumber={cardModel.shirtNumber}
              themeConfig={themeConfig}
              duplicatesCount={cardModel.duplicatesCount}
              isFavorite={cardModel.isFavorite}
              isLocked={cardModel.isLocked}
              milestoneBadge={cardModel.backData?.milestoneBadge}
              showFlip={showFlip}
              onFlip={flipCard}
            />

            {/* 5. Player Nameplate */}
            <CardNameplate
              playerName={cardModel.playerName}
              shirtNumber={cardModel.shirtNumber}
              themeConfig={themeConfig}
              isLocked={cardModel.isLocked}
            />

            {/* 6. Dynamic Real Stats Panel (Only if real stats exist) */}
            <CardStatsPanel
              stats={cardModel.stats}
              themeConfig={themeConfig}
              isLocked={cardModel.isLocked}
            />

            {/* 7. Theme-Specific Visual FX */}
            <CardRarityEffect cardType={effectiveTheme} isHovered={isHovered} />

            {/* 8. Specular Holographic Sheen */}
            <CardFoil
              themeConfig={themeConfig}
              glarePos={glarePos}
              isHovered={isHovered}
            />
          </div>

          {/* ============================================================= */}
          {/* FACE 2: REVERSE / BACK FACE                                    */}
          {/* ============================================================= */}
          <CardBack
            card={cardModel}
            themeConfig={themeConfig}
            showFlip={showFlip}
            onFlip={flipCard}
            glarePos={glarePos}
          />
        </>
      )}
    </CardInteractiveLayer>
  );
}

export default React.memo(DeltaCard);
