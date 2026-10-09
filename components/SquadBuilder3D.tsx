"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Sparkles, 
  Plus, 
  X, 
  Check, 
  Save, 
  RotateCcw,
  Shirt,
  LayoutGrid
} from "lucide-react";
import { CardDefinition, UserCard } from "@/lib/cards/types";
import { DeltaCard } from "@/components/cards";
import { DeltaCardModel, adaptLegacyToDeltaCardModel } from "@/lib/cards/deltaCardModel";
import { CardDetailModal } from "@/components/collection";
import { cardSound } from "@/lib/cards/audio";
import { subscribeCardEvents } from "@/lib/cards/cardSync";
import LockerRoom3D from "./LockerRoom3D";

export interface PitchSlotDef {
  id: string;
  xPercent: number;
  yPercent: number;
}

export interface FormationOption {
  key: string;
  name: string;
  playerCount: number;
  slots: PitchSlotDef[];
}

export const SQUAD_FORMATIONS: Record<string, FormationOption> = {
  "2-3-1": {
    key: "2-3-1",
    name: "2-3-1 (7 Zawodników)",
    playerCount: 7,
    slots: [
      { id: "slot_1", xPercent: 50, yPercent: 88 },
      { id: "slot_2", xPercent: 26, yPercent: 68 },
      { id: "slot_3", xPercent: 74, yPercent: 68 },
      { id: "slot_4", xPercent: 18, yPercent: 44 },
      { id: "slot_5", xPercent: 50, yPercent: 46 },
      { id: "slot_6", xPercent: 82, yPercent: 44 },
      { id: "slot_7", xPercent: 50, yPercent: 18 }
    ]
  },
  "1-2-1": {
    key: "1-2-1",
    name: "1-2-1 (5 Zawodników)",
    playerCount: 5,
    slots: [
      { id: "slot_1", xPercent: 50, yPercent: 88 },
      { id: "slot_2", xPercent: 50, yPercent: 66 },
      { id: "slot_3", xPercent: 22, yPercent: 44 },
      { id: "slot_4", xPercent: 78, yPercent: 44 },
      { id: "slot_5", xPercent: 50, yPercent: 18 }
    ]
  },
  "3-2-1": {
    key: "3-2-1",
    name: "3-2-1 (7 Zawodników)",
    playerCount: 7,
    slots: [
      { id: "slot_1", xPercent: 50, yPercent: 88 },
      { id: "slot_2", xPercent: 20, yPercent: 68 },
      { id: "slot_3", xPercent: 50, yPercent: 70 },
      { id: "slot_4", xPercent: 80, yPercent: 68 },
      { id: "slot_5", xPercent: 34, yPercent: 44 },
      { id: "slot_6", xPercent: 66, yPercent: 44 },
      { id: "slot_7", xPercent: 50, yPercent: 18 }
    ]
  },
  "4-3-3": {
    key: "4-3-3",
    name: "4-3-3 (11 Zawodników)",
    playerCount: 11,
    slots: [
      { id: "slot_1", xPercent: 50, yPercent: 90 },
      { id: "slot_2", xPercent: 15, yPercent: 72 },
      { id: "slot_3", xPercent: 38, yPercent: 74 },
      { id: "slot_4", xPercent: 62, yPercent: 74 },
      { id: "slot_5", xPercent: 85, yPercent: 72 },
      { id: "slot_6", xPercent: 26, yPercent: 48 },
      { id: "slot_7", xPercent: 50, yPercent: 50 },
      { id: "slot_8", xPercent: 74, yPercent: 48 },
      { id: "slot_9", xPercent: 20, yPercent: 22 },
      { id: "slot_10", xPercent: 50, yPercent: 18 },
      { id: "slot_11", xPercent: 80, yPercent: 22 }
    ]
  }
};

export interface SquadBuilder3DProps {
  ownedCards: CardDefinition[];
  userCardsMap: Map<string, UserCard>;
  onClose?: () => void;
  className?: string;
}

export default function SquadBuilder3D({
  ownedCards,
  userCardsMap,
  onClose,
  className = ""
}: SquadBuilder3DProps) {
  const [viewMode, setViewMode] = useState<"pitch" | "lockerRoom">("pitch");
  const [formationKey, setFormationKey] = useState<string>("2-3-1");
  const [squadSlots, setSquadSlots] = useState<Record<string, CardDefinition>>({});
  const [activePickerSlot, setActivePickerSlot] = useState<PitchSlotDef | null>(null);
  const [inspectedCard, setInspectedCard] = useState<DeltaCardModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [localOwnedCards, setLocalOwnedCards] = useState<CardDefinition[]>(ownedCards);
  const [localUserCardsMap, setLocalUserCardsMap] = useState<Map<string, UserCard>>(userCardsMap);

  const formation = SQUAD_FORMATIONS[formationKey] || SQUAD_FORMATIONS["2-3-1"];

  // Sync with prop updates
  useEffect(() => {
    setLocalOwnedCards(ownedCards);
  }, [ownedCards]);

  useEffect(() => {
    setLocalUserCardsMap(userCardsMap);
  }, [userCardsMap]);

  // Subscribe to global card events to refresh picker roster without page reload
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/cards/collection");
        if (res.ok) {
          const data = await res.json();
          const uCards: UserCard[] = data.userCards || [];
          const uMap = new Map<string, UserCard>();
          uCards.forEach(uc => {
            if (uc.card_id) uMap.set(uc.card_id, uc);
          });
          const oCards = uCards.map(uc => uc.card_definition).filter(Boolean);
          setLocalOwnedCards(oCards);
          setLocalUserCardsMap(uMap);
        }
      } catch (err) {
        console.warn("Could not revalidate squad cards:", err);
      }
    };

    const unsubscribe = subscribeCardEvents({
      onPackOpened: () => fetchLatest(),
      onCollectionUpdated: () => fetchLatest()
    });

    return () => unsubscribe();
  }, []);

  // Load saved squad from backend on mount
  useEffect(() => {
    fetch("/api/cards/squad")
      .then(res => res.json())
      .then(data => {
        if (data?.squad) {
          const sq = data.squad;
          if (sq.formation && SQUAD_FORMATIONS[sq.formation]) {
            setFormationKey(sq.formation);
          }
          if (Array.isArray(sq.slots)) {
            const restored: Record<string, CardDefinition> = {};
            sq.slots.forEach((item: any) => {
              const matched = localOwnedCards.find(c => c.id === item.card_id);
              if (matched) {
                restored[item.slot_id] = matched;
              }
            });
            setSquadSlots(restored);
          }
        }
      })
      .catch(err => console.warn("Could not load squad:", err));
  }, [localOwnedCards]);

  // Convert assigned cards to DeltaCardModels
  const assignedCardModels: Record<string, DeltaCardModel> = useMemo(() => {
    const map: Record<string, DeltaCardModel> = {};
    Object.entries(squadSlots).forEach(([slotId, card]) => {
      const userCard = localUserCardsMap.get(card.id) || null;
      map[slotId] = adaptLegacyToDeltaCardModel({
        card,
        player: card.player,
        userCard,
        isLocked: false
      });
    });
    return map;
  }, [squadSlots, localUserCardsMap]);

  // Handlers
  const handleAssignCard = (slot: PitchSlotDef, card: CardDefinition) => {
    setSquadSlots(prev => ({ ...prev, [slot.id]: card }));
    setActivePickerSlot(null);
    cardSound?.playFlip?.();
  };

  const handleRemoveFromSlot = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSquadSlots(prev => {
      const copy = { ...prev };
      delete copy[slotId];
      return copy;
    });
  };

  const handleClearSquad = () => {
    setSquadSlots({});
  };

  const handleAutoFill = () => {
    const sorted = [...ownedCards];
    const newSlots: Record<string, CardDefinition> = {};
    const usedIds = new Set<string>();

    formation.slots.forEach(slot => {
      const best = sorted.find(c => !usedIds.has(c.id));
      if (best) {
        newSlots[slot.id] = best;
        usedIds.add(best.id);
      }
    });

    setSquadSlots(newSlots);
    cardSound?.playWalkoutFanfare?.();
  };

  const handleSaveSquad = async () => {
    setSaving(true);
    try {
      const slotPayload = Object.entries(squadSlots).map(([slot_id, card]) => ({
        slot_id,
        card_id: card.id
      }));

      const res = await fetch("/api/cards/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation: formationKey,
          slots: slotPayload
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Save squad error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-4 text-slate-100 ${className}`}>
      {/* Top Header Bar: Tabs & Formations */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-xl">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/5">
          <button
            type="button"
            onClick={() => { setViewMode("pitch"); cardSound?.playHover?.(); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "pitch"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>MURAWA</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("lockerRoom"); cardSound?.playHover?.(); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "lockerRoom"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>SZATNIA VIP</span>
          </button>
        </div>

        {/* Center: Formation Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase hidden sm:inline">Ustawienie:</span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/5">
            {Object.keys(SQUAD_FORMATIONS).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setFormationKey(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formationKey === key
                    ? "bg-slate-800 text-amber-300 border border-amber-400/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoFill}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 transition-all cursor-pointer"
            title="Automatycznie wypełnij skład"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Auto-Skład</span>
          </button>

          <button
            type="button"
            onClick={handleClearSquad}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 transition-colors cursor-pointer"
            title="Wyczyść murawę"
            aria-label="Wyczyść murawę"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleSaveSquad}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${
              savedSuccess
                ? "bg-emerald-500 text-slate-950"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950"
            }`}
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? "Zapisano!" : "Zapisz"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-white/10"
              aria-label="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Pitch / Locker Room Stage */}
      {viewMode === "lockerRoom" ? (
        <LockerRoom3D
          formationSlots={formation.slots as any}
          squadSlots={squadSlots}
          captainSlotId=""
          onSlotClick={(slot: any) => setActivePickerSlot(slot)}
          onSelectCaptain={() => {}}
        />
      ) : (
        <div className="relative w-full rounded-3xl bg-slate-950 border border-white/15 p-2 sm:p-4 md:p-6 shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Pitch Container with 4:3 Responsive Aspect Ratio and Stadium Shader */}
          <div 
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-emerald-500/30 shadow-inner select-none"
            style={{
              containerType: "inline-size",
              background: "radial-gradient(circle at 50% 50%, #064e3b 0%, #022c22 70%, #021a14 100%)"
            }}
          >
            {/* Field Markings */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              {/* Outer boundary line */}
              <div className="absolute inset-[4%] border border-white/40 rounded-xl" />
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24cqw] h-[24cqw] rounded-full border border-white/40" />
              {/* Center line */}
              <div className="absolute top-1/2 left-[4%] right-[4%] h-[1px] bg-white/40 -translate-y-1/2" />
              {/* Penalty box top */}
              <div className="absolute top-[4%] left-1/2 -translate-x-1/2 w-[44cqw] h-[16cqw] border-b border-x border-white/40 rounded-b-lg" />
              {/* Penalty box bottom */}
              <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[44cqw] h-[16cqw] border-t border-x border-white/40 rounded-t-lg" />
            </div>

            {/* Stadium Atmospheric Lighting & Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

            {/* Interactive Position Slots */}
            {formation.slots.map((slot) => {
              const assignedCard = squadSlots[slot.id];
              const cardModel = assignedCardModels[slot.id];

              return (
                <div
                  key={slot.id}
                  style={{
                    position: "absolute",
                    left: `${slot.xPercent}%`,
                    top: `${slot.yPercent}%`,
                    transform: "translate(-50%, -50%)",
                    width: "clamp(48px, 12.5cqw, 82px)",
                    aspectRatio: "2 / 3"
                  }}
                  className="z-20 transition-transform duration-200 hover:scale-105"
                >
                  {assignedCard && cardModel ? (
                    <div className="relative w-full h-full group">
                      {/* DeltaCard miniature on pitch */}
                      <div
                        onClick={() => setInspectedCard(cardModel)}
                        className="w-full h-full cursor-pointer"
                      >
                        <DeltaCard
                          card={cardModel}
                          size="responsive"
                          interactive={false}
                          showFlip={false}
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFromSlot(slot.id, e)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer z-30"
                        title="Zdejmij z boiska"
                        aria-label="Zdejmij z boiska"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    /* Clean Neutral Empty Slot Placeholder */
                    <button
                      type="button"
                      onClick={() => setActivePickerSlot(slot)}
                      className="w-full h-full rounded-[4cqw] border-2 border-dashed border-white/30 hover:border-amber-400/80 bg-black/40 hover:bg-black/60 backdrop-blur-xs flex items-center justify-center transition-all group cursor-pointer shadow-md"
                      title="Wybierz zawodnika"
                      aria-label="Wybierz zawodnika"
                    >
                      <Plus className="w-5 h-5 text-slate-300 group-hover:text-amber-400 transition-colors" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Picker Modal when clicking an empty slot */}
      {activePickerSlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setActivePickerSlot(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/15 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">
                  Wybierz zawodnika do składu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePickerSlot(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {ownedCards.map(card => {
                const isAssigned = Object.values(squadSlots).some(c => c.id === card.id);
                const userCard = userCardsMap.get(card.id) || null;
                const cardModel = adaptLegacyToDeltaCardModel({
                  card,
                  player: card.player,
                  userCard,
                  isLocked: false
                });

                return (
                  <div
                    key={card.id}
                    onClick={() => !isAssigned && handleAssignCard(activePickerSlot, card)}
                    className={`relative aspect-[2/3] rounded-xl overflow-hidden transition-all ${
                      isAssigned 
                        ? "opacity-40 grayscale cursor-not-allowed" 
                        : "cursor-pointer hover:scale-105"
                    }`}
                  >
                    <DeltaCard
                      card={cardModel}
                      size="responsive"
                      interactive={false}
                      showFlip={false}
                    />
                    {isAssigned && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-black text-amber-300 uppercase">
                        W Składzie
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shared Card Detail Modal for full 3D inspection on pitch click */}
      <CardDetailModal
        card={inspectedCard}
        isOpen={!!inspectedCard}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
}
