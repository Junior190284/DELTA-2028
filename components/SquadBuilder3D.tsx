"use client";

import React, { useState, useMemo } from "react";
import { 
  Users, 
  Sparkles, 
  Crown, 
  Shield, 
  Zap, 
  Flame, 
  Plus, 
  X, 
  Check, 
  Share2, 
  Save, 
  RotateCcw,
  Trophy,
  ArrowRight,
  Shirt,
  LayoutGrid
} from "lucide-react";
import { CardDefinition, UserCard, RARITY_CONFIG } from "@/lib/cards/types";
import { cardSound } from "@/lib/cards/audio";
import CollectibleCard3D from "./CollectibleCard3D";
import LockerRoom3D from "./LockerRoom3D";

interface PositionSlot {
  id: string;
  role: string;
  label: string;
  gridArea: string;
  xPercent: number;
  yPercent: number;
}

const FORMATIONS: Record<string, { name: string; slots: PositionSlot[] }> = {
  "1-2-3-1": {
    name: "1-2-3-1 (Klasyk Orlik 7v7)",
    slots: [
      { id: "gk", role: "BRAMKARZ", label: "BR", gridArea: "gk", xPercent: 50, yPercent: 86 },
      { id: "cbl", role: "OBROŃCA", label: "LO", gridArea: "cbl", xPercent: 28, yPercent: 66 },
      { id: "cbr", role: "OBROŃCA", label: "PO", gridArea: "cbr", xPercent: 72, yPercent: 66 },
      { id: "lm", role: "POMOCNIK", label: "LP", gridArea: "lm", xPercent: 18, yPercent: 42 },
      { id: "cm", role: "POMOCNIK", label: "ŚP", gridArea: "cm", xPercent: 50, yPercent: 44 },
      { id: "rm", role: "POMOCNIK", label: "PP", gridArea: "rm", xPercent: 82, yPercent: 42 },
      { id: "st", role: "NAPASTNIK", label: "N", gridArea: "st", xPercent: 50, yPercent: 18 }
    ]
  },
  "1-3-2-1": {
    name: "1-3-2-1 (Ściana Obronny)",
    slots: [
      { id: "gk", role: "BRAMKARZ", label: "BR", gridArea: "gk", xPercent: 50, yPercent: 86 },
      { id: "lb", role: "OBROŃCA", label: "LO", gridArea: "lb", xPercent: 22, yPercent: 68 },
      { id: "cb", role: "OBROŃCA", label: "ŚO", gridArea: "cb", xPercent: 50, yPercent: 70 },
      { id: "rb", role: "OBROŃCA", label: "PO", gridArea: "rb", xPercent: 78, yPercent: 68 },
      { id: "cml", role: "POMOCNIK", label: "ŚP", gridArea: "cml", xPercent: 36, yPercent: 44 },
      { id: "cmr", role: "POMOCNIK", label: "ŚP", gridArea: "cmr", xPercent: 64, yPercent: 44 },
      { id: "st", role: "NAPASTNIK", label: "N", gridArea: "st", xPercent: 50, yPercent: 18 }
    ]
  },
  "1-2-2-2": {
    name: "1-2-2-2 (Podwójne Uderzenie)",
    slots: [
      { id: "gk", role: "BRAMKARZ", label: "BR", gridArea: "gk", xPercent: 50, yPercent: 86 },
      { id: "cbl", role: "OBROŃCA", label: "LO", gridArea: "cbl", xPercent: 30, yPercent: 68 },
      { id: "cbr", role: "OBROŃCA", label: "PO", gridArea: "cbr", xPercent: 70, yPercent: 68 },
      { id: "lm", role: "POMOCNIK", label: "LP", gridArea: "lm", xPercent: 32, yPercent: 44 },
      { id: "rm", role: "POMOCNIK", label: "PP", gridArea: "rm", xPercent: 68, yPercent: 44 },
      { id: "stl", role: "NAPASTNIK", label: "N", gridArea: "stl", xPercent: 36, yPercent: 18 },
      { id: "str", role: "NAPASTNIK", label: "N", gridArea: "str", xPercent: 64, yPercent: 18 }
    ]
  }
};

interface SquadBuilder3DProps {
  ownedCards: CardDefinition[];
  userCardsMap: Map<string, UserCard>;
  onClose?: () => void;
}

export default function SquadBuilder3D({
  ownedCards,
  userCardsMap,
  onClose
}: SquadBuilder3DProps) {
  const [viewMode, setViewMode] = useState<"pitch" | "lockerRoom">("pitch");
  const [selectedFormationKey, setSelectedFormationKey] = useState<string>("1-2-3-1");
  const [squadSlots, setSquadSlots] = useState<Record<string, CardDefinition>>({});
  const [captainSlotId, setCaptainSlotId] = useState<string>("st");
  const [activePickerSlot, setActivePickerSlot] = useState<PositionSlot | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const formation = FORMATIONS[selectedFormationKey] || FORMATIONS["1-2-3-1"];

  // Rarity power multiplier for OVR rating calculation
  const getCardPower = (card: CardDefinition): number => {
    switch (card.rarity?.toLowerCase()) {
      case "inferno": return 94;
      case "legendary": return 88;
      case "epic": return 82;
      case "rare": return 76;
      default: return 70;
    }
  };

  // Compute live squad analytics
  const { teamOvr, chemistry, totalGoals, totalMatches } = useMemo(() => {
    const assignedCards = Object.values(squadSlots);
    if (!assignedCards.length) {
      return { teamOvr: 0, chemistry: 0, totalGoals: 0, totalMatches: 0 };
    }

    const totalPower = assignedCards.reduce((acc, c) => acc + getCardPower(c), 0);
    const avgPower = Math.round(totalPower / formation.slots.length);
    
    // Chemistry bonus based on filled slots and full squad
    const fillRatio = assignedCards.length / formation.slots.length;
    const calcChem = Math.min(100, Math.round(fillRatio * 90 + (captainSlotId ? 10 : 0)));

    let goals = 0;
    let matches = 0;
    assignedCards.forEach(c => {
      goals += c.rarity === "inferno" ? 12 : c.rarity === "legendary" ? 8 : 4;
      matches += 10;
    });

    return {
      teamOvr: avgPower,
      chemistry: calcChem,
      totalGoals: goals,
      totalMatches: matches
    };
  }, [squadSlots, formation, captainSlotId]);

  const handlePickCard = (card: CardDefinition) => {
    if (!activePickerSlot) return;
    setSquadSlots(prev => ({
      ...prev,
      [activePickerSlot.id]: card
    }));
    setActivePickerSlot(null);
    cardSound.playFlip();
  };

  const handleRemoveFromSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSquadSlots(prev => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleClearSquad = () => {
    setSquadSlots({});
  };

  const handleAutoFillBest = () => {
    const sorted = [...ownedCards].sort((a, b) => getCardPower(b) - getCardPower(a));
    const newSlots: Record<string, CardDefinition> = {};
    const usedIds = new Set<string>();

    formation.slots.forEach(slot => {
      const bestAvailable = sorted.find(c => !usedIds.has(c.id));
      if (bestAvailable) {
        newSlots[slot.id] = bestAvailable;
        usedIds.add(bestAvailable.id);
      }
    });

    setSquadSlots(newSlots);
    cardSound.playWalkoutFanfare();
  };

  const handleSaveSquad = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="v200-squad-builder-container">
      {/* Top Controls & KPI Bar */}
      <div className="v200-squad-header-bar">
        <div className="v200-squad-title-group">
          <div className="v200-squad-badge">
            <Users size={14} className="text-yellow-400" />
            <span>MOJA JEDENASTKA 3D</span>
          </div>
          <h2>SKŁAD MECZOWY DELTA 2018 GM</h2>
        </div>

        {/* View Mode & Formation Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-black/40 border border-white/10 p-1">
            <button
              type="button"
              onClick={() => { setViewMode("pitch"); cardSound.playHover(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "pitch" ? "bg-amber-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid size={13} /> MURAWA 3D
            </button>
            <button
              type="button"
              onClick={() => { setViewMode("lockerRoom"); cardSound.playHover(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "lockerRoom" ? "bg-amber-500 text-black shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <Shirt size={13} /> SZATNIA VIP
            </button>
          </div>

          <div className="v200-squad-formation-selector">
            <span className="text-xs text-slate-400 font-bold uppercase">Formacja:</span>
            <div className="flex gap-2">
              {Object.entries(FORMATIONS).map(([key, form]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedFormationKey(key)}
                  className={`v200-formation-tab ${selectedFormationKey === key ? "active" : ""}`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="v200-squad-action-buttons">
          <button
            type="button"
            onClick={handleAutoFillBest}
            className="v200-squad-autofill-btn"
          >
            <Sparkles size={14} /> AUTO-SKŁAD (NAJLEPSI)
          </button>
          
          <button
            type="button"
            onClick={handleClearSquad}
            className="v200-squad-clear-btn"
            title="Wyczyść murawę"
          >
            <RotateCcw size={14} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="v200-squad-close-btn"
              aria-label="Zamknij"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Ribbon */}
      <div className="v200-squad-kpi-ribbon">
        <div className="v200-squad-kpi-item rating">
          <div className="v200-kpi-icon-wrap">
            <Shield size={18} className="text-yellow-400" />
          </div>
          <div>
            <span className="v200-kpi-label">OCENA SKŁADU</span>
            <span className="v200-kpi-val">{teamOvr || "--"} <small>OVR</small></span>
          </div>
        </div>

        <div className="v200-squad-kpi-item chemistry">
          <div className="v200-kpi-icon-wrap">
            <Zap size={18} className="text-cyan-400" />
          </div>
          <div>
            <span className="v200-kpi-label">ZGRANIE TEAMU</span>
            <span className="v200-kpi-val">{chemistry} / 100</span>
          </div>
        </div>

        <div className="v200-squad-kpi-item goals">
          <div className="v200-kpi-icon-wrap">
            <Flame size={18} className="text-red-500" />
          </div>
          <div>
            <span className="v200-kpi-label">GOLE SKŁADU</span>
            <span className="v200-kpi-val">{totalGoals}</span>
          </div>
        </div>

        <div className="v200-squad-kpi-item lineup">
          <div className="v200-kpi-icon-wrap">
            <Crown size={18} className="text-yellow-500" />
          </div>
          <div>
            <span className="v200-kpi-label">KAPITAN</span>
            <span className="v200-kpi-val font-semibold text-xs">
              {squadSlots[captainSlotId]?.player?.display_name || "Wybierz 'C'"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 3D STAGE: PITCH OR LOCKER ROOM ================= */}
      {viewMode === "lockerRoom" ? (
        <LockerRoom3D
          formationSlots={formation.slots}
          squadSlots={squadSlots}
          captainSlotId={captainSlotId}
          onSlotClick={(slot) => setActivePickerSlot(slot)}
          onSelectCaptain={(slotId) => setCaptainSlotId(slotId)}
        />
      ) : (
        <div className="v200-pitch-stage-wrapper">
          <div className="v200-pitch-stadium-lights" />

          <div className="v200-pitch-field">
            {/* Pitch Markings */}
            <div className="v200-pitch-center-circle" />
            <div className="v200-pitch-halfway-line" />
            <div className="v200-pitch-penalty-area top" />
            <div className="v200-pitch-penalty-area bottom" />
            <div className="v200-pitch-corner tl" />
            <div className="v200-pitch-corner tr" />
            <div className="v200-pitch-corner bl" />
            <div className="v200-pitch-corner br" />

            {/* Interactive Player Position Slots */}
            {formation.slots.map(slot => {
              const assignedCard = squadSlots[slot.id];
              const isCaptain = captainSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  className={`v200-pitch-slot ${assignedCard ? "filled" : "empty"}`}
                  style={{
                    left: `${slot.xPercent}%`,
                    top: `${slot.yPercent}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  onClick={() => setActivePickerSlot(slot)}
                >
                  {assignedCard ? (
                    <div className="v200-slot-card-preview">
                      {/* Small 3D Card Miniature */}
                      <CollectibleCard3D
                        card={assignedCard}
                        userCard={userCardsMap.get(assignedCard.id) || null}
                        isLocked={false}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                      />

                      {/* Captain Badge Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCaptainSlotId(slot.id);
                        }}
                        className={`v200-slot-captain-badge ${isCaptain ? "active" : ""}`}
                        title={isCaptain ? "Kapitan zespołu" : "Ustaw jako kapitana"}
                      >
                        C
                      </button>

                      {/* Remove Card Button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFromSlot(slot.id, e)}
                        className="v200-slot-remove-btn"
                        title="Zdejmij z boiska"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="v200-slot-empty-placeholder">
                      <div className="v200-slot-plus-circle">
                        <Plus size={16} />
                      </div>
                      <span className="v200-slot-pos-badge">{slot.label}</span>
                      <span className="v200-slot-role-name">{slot.role}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Save & Share Bar */}
      <div className="v200-squad-bottom-bar">
        <button
          type="button"
          onClick={handleSaveSquad}
          className={`v200-squad-save-btn ${savedSuccess ? "saved" : ""}`}
        >
          {savedSuccess ? (
            <>
              <Check size={16} className="text-green-400" />
              <span>SKŁAD ZAPISANY W KLUBIE!</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>ZAPISZ SKŁAD MECZOWY</span>
            </>
          )}
        </button>
      </div>

      {/* ================= CARD PICKER MODAL ================= */}
      {activePickerSlot && (
        <div 
          className="v200-picker-backdrop"
          onClick={() => setActivePickerSlot(null)}
        >
          <div 
            className="v200-picker-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="v200-picker-header">
              <div>
                <span className="text-xs text-yellow-400 font-bold uppercase">WYBIERZ ZAWODNIKA NA POZYCJĘ:</span>
                <h3 className="text-lg font-black text-white">{activePickerSlot.role} ({activePickerSlot.label})</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActivePickerSlot(null)}
                className="v200-picker-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="v200-picker-grid">
              {ownedCards.length === 0 ? (
                <div className="p-8 text-center text-slate-400 col-span-full">
                  Brak odblokowanych kart w kolekcji. Otwórz paczki w Skarbcu!
                </div>
              ) : (
                ownedCards.map(card => {
                  const isAlreadyInSquad = Object.values(squadSlots).some(c => c.id === card.id);

                  return (
                    <div 
                      key={card.id} 
                      onClick={() => !isAlreadyInSquad && handlePickCard(card)}
                      className={`v200-picker-item ${isAlreadyInSquad ? "disabled" : ""}`}
                    >
                      <CollectibleCard3D
                        card={card}
                        userCard={userCardsMap.get(card.id) || null}
                        isLocked={false}
                        size="sm"
                        interactive={false}
                        showFlip={false}
                      />
                      {isAlreadyInSquad && (
                        <div className="v200-picker-in-squad-tag">W SKŁADZIE</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
