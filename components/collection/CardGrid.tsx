"use client";

import React from "react";
import { DeltaCard } from "@/components/cards";
import { DeltaCardModel } from "@/lib/cards/deltaCardModel";

export interface CardGridProps {
  cards: DeltaCardModel[];
  onSelectCard: (card: DeltaCardModel) => void;
  featuredCardId?: string | null;
}

export default function CardGrid({
  cards,
  onSelectCard,
  featuredCardId
}: CardGridProps) {
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 items-start">
      {cards.map((card) => {
        const isFeatured = featuredCardId === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onSelectCard(card)}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "200px 300px"
            }}
            className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 will-change-transform"
          >
            {/* Featured Crown Ribbon */}
            {isFeatured && (
              <div className="absolute -top-2.5 z-30 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-lg flex items-center gap-1 animate-pulse">
                <span>👑</span>
                <span>WIZYTÓWKA</span>
              </div>
            )}

            {/* Delta Card Component with 2:3 responsive sizing */}
            <div className="w-full relative aspect-[2/3] max-w-[240px]">
              <DeltaCard
                card={card}
                size="responsive"
                interactive={!card.isLocked}
                showFlip={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
