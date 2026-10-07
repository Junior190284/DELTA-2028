"use client";

import React from "react";
import { Users, Shirt, Sparkles, Crown, Flame, Plus, Check } from "lucide-react";
import { CardDefinition, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";

interface PositionSlot {
  id: string;
  role: string;
  label: string;
  gridArea: string;
  xPercent: number;
  yPercent: number;
}

interface LockerRoom3DProps {
  formationSlots: PositionSlot[];
  squadSlots: Record<string, CardDefinition>;
  captainSlotId: string;
  onSlotClick: (slot: PositionSlot) => void;
  onSelectCaptain: (slotId: string) => void;
}

export default function LockerRoom3D({
  formationSlots,
  squadSlots,
  captainSlotId,
  onSlotClick,
  onSelectCaptain
}: LockerRoom3DProps) {
  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden border border-amber-500/30 p-3 sm:p-5 md:p-6 flex flex-col justify-between"
      style={{
        minHeight: "420px",
        background: "radial-gradient(ellipse at 50% 20%, #1e1510 0%, #0c0806 60%, #030202 100%)",
        boxShadow: "inset 0 0 100px rgba(0,0,0,0.8)"
      }}
    >
      {/* Locker Room VIP Ambient Lighting */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
      
      {/* Top Banner: Club Name & Tactical Board */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3 sm:pb-4 border-b border-amber-900/40">
        <div className="flex items-center gap-2.5">
          <img src="/teamlogos/gm.png" alt="DELTA" className="w-8 h-8 sm:w-10 sm:h-10 object-contain filter drop-shadow" />
          <div>
            <span className="text-[9px] sm:text-[10px] tracking-widest text-amber-400/80 font-mono font-bold block">OFICJALNA SZATNIA DRUŻYNY</span>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide">K.S. DELTA WARSZAWA 2018 GM</h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-amber-500/20 text-[11px] sm:text-xs text-amber-300 font-semibold">
          <span>📋 Odprawa przedmeczowa</span>
        </div>
      </div>

      {/* Wooden Stalls / Lockers Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 my-4 sm:my-6">
        {formationSlots.map(slot => {
          const card = squadSlots[slot.id];
          const isCaptain = captainSlotId === slot.id;
          const rarity = card?.rarity || "common";
          const pName = card?.player?.display_name || card?.card_name;
          const shirtNum = card?.player?.shirt_number || "GM";

          return (
            <div
              key={slot.id}
              onClick={() => {
                cardSound.playHover();
                onSlotClick(slot);
              }}
              className="relative group cursor-pointer flex flex-col items-center"
            >
              {/* Wooden Locker Stall Frame */}
              <div 
                className="w-full h-44 sm:h-48 md:h-52 rounded-xl p-2 flex flex-col items-center justify-between transition-all duration-300 relative overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #2a1810 0%, #170d09 100%)",
                  border: card ? "1px solid rgba(241, 201, 92, 0.4)" : "1px dashed rgba(255, 255, 255, 0.15)",
                  boxShadow: card ? "0 10px 25px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.1)" : "none"
                }}
              >
                {/* Stall Header (Slot Label & Captain Badge) */}
                <div className="w-full flex items-center justify-between text-[10px] font-bold px-1 text-amber-200/80">
                  <span className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-500/20 text-[9px] sm:text-[10px]">{slot.label}</span>
                  {isCaptain && (
                    <span className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                      <Crown size={11} /> C
                    </span>
                  )}
                </div>

                {/* Locker Center: Hanging Jersey or Empty Slot */}
                {card ? (
                  <div className="flex flex-col items-center my-auto transform group-hover:scale-105 transition-transform max-w-full">
                    {/* Hanging Jersey Illustration */}
                    <div 
                      className="w-12 h-16 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-t-lg bg-gradient-to-b from-red-700 to-red-950 border border-red-500/50 flex flex-col items-center justify-center relative shadow-lg flex-shrink-0"
                      style={{
                        clipPath: "polygon(20% 0%, 80% 0%, 100% 25%, 85% 100%, 15% 100%, 0% 25%)"
                      }}
                    >
                      <span className="text-white font-black text-[11px] sm:text-xs drop-shadow">{shirtNum}</span>
                      <img src="/teamlogos/gm.png" alt="DELTA" className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain mt-0.5" />
                    </div>

                    <span className="text-[10px] sm:text-[11px] font-black text-white text-center mt-1.5 truncate w-full px-0.5">
                      {pName?.split(" ")[0]}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-amber-400/90 uppercase font-mono">{rarity}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center my-auto gap-1 text-slate-500 group-hover:text-amber-400 transition-colors">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-dashed border-current flex items-center justify-center">
                      <Plus size={14} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">Wybierz</span>
                  </div>
                )}

                {/* Locker Bottom Shelf (Boots / Gear) */}
                <div className="w-full pt-1 border-t border-amber-900/30 flex items-center justify-center text-[8px] sm:text-[9px] text-slate-400 font-mono">
                  {card ? `#${slot.id.toUpperCase()}` : "WOLNE"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Locker Room Floor & Bench Area */}
      <div className="relative z-10 pt-2.5 sm:pt-3 border-t border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Shirt size={13} className="text-amber-400 flex-shrink-0" />
          <span>Kliknij w szafkę, aby zmienić trykot lub obsadzić pozycję w szatni</span>
        </span>
        <span className="text-amber-300/80 font-mono text-[10px] sm:text-[11px]">VIP LOCKER ROOM • 2026/27</span>
      </div>
    </div>
  );
}
