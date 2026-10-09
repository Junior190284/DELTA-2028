"use client";

import React from "react";
import { DeltaThemeConfig } from "@/lib/cards/deltaCardModel";

export interface CardFrameProps {
  themeConfig: DeltaThemeConfig;
}

export default function CardFrame({ themeConfig }: CardFrameProps) {
  return (
    <div className="card-layer-frame absolute inset-0 w-full h-full pointer-events-none z-15 overflow-hidden rounded-[4cqw]">
      <img
        src={themeConfig.frameAsset}
        alt=""
        className="w-full h-full object-fill pointer-events-none"
        loading="eager"
        decoding="sync"
      />
      {/* Outer Rim Highlight Accent */}
      <div
        className="absolute inset-0 rounded-[4cqw] border pointer-events-none opacity-40"
        style={{
          borderColor: themeConfig.primaryColor
        }}
      />
    </div>
  );
}
