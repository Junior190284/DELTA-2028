"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Users, 
  Shield, 
  Target, 
  Sparkles, 
  X, 
  ChevronRight, 
  RotateCcw, 
  Info,
  CheckCircle2,
  Save,
  Sliders,
  Move
} from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
}

interface DeltaTacticsBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
}

export type TacticsGameFormat = "5v5" | "6v6";

export interface PitchPosition {
  id: string;
  label: string;
  role: "GK" | "DEF" | "MID" | "ATT";
  top: number; // %
  left: number; // %
  assignedPlayerId: string | null;
}

export interface FormationDefinition {
  name: string;
  desc: string;
  positions: PitchPosition[];
}

// FORMAT 5 vs 5: 1 Bramkarz + 4 Zawodników w polu = 5 zawodników
export const FORMATIONS_5V5: Record<string, FormationDefinition> = {
  "2-2": {
    name: "2-2 (Kwadrat / Równowaga)",
    desc: "2 Obrońców i 2 Napastników. Stabilna defensywa z dwoma zawodnikami w pressingu.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 64, left: 28, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 64, left: 72, assignedPlayerId: null },
      { id: "la", label: "LN", role: "ATT", top: 24, left: 32, assignedPlayerId: null },
      { id: "ra", label: "PN", role: "ATT", top: 24, left: 68, assignedPlayerId: null }
    ]
  },
  "1-2-1": {
    name: "1-2-1 (Romb / Diament)",
    desc: "1 Środkowy Obrońca, 2 Skrzydłowych i 1 Napastnik. Uniwersalne i płynne przejście z obrony do ataku.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "cd", label: "ŚO", role: "DEF", top: 66, left: 50, assignedPlayerId: null },
      { id: "lm", label: "LP", role: "MID", top: 44, left: 22, assignedPlayerId: null },
      { id: "rm", label: "PP", role: "MID", top: 44, left: 78, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 20, left: 50, assignedPlayerId: null }
    ]
  },
  "2-1-1": {
    name: "2-1-1 (Zabezpieczenie + Pivot)",
    desc: "2 Obrońców, 1 Środkowy Rozgrywający i 1 Wysunięty Snajper. Bezpieczne wyprowadzanie piłki.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 66, left: 26, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 66, left: 74, assignedPlayerId: null },
      { id: "cm", label: "ŚP", role: "MID", top: 42, left: 50, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null }
    ]
  },
  "1-3": {
    name: "1-3 (Wysoki Pressing)",
    desc: "1 Ostatni Obrońca i 3 Napastników w linii. Agresywny odbiór na połowie przeciwnika.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "cd", label: "ŚO", role: "DEF", top: 68, left: 50, assignedPlayerId: null },
      { id: "lw", label: "LS", role: "ATT", top: 24, left: 20, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null },
      { id: "rw", label: "PS", role: "ATT", top: 24, left: 80, assignedPlayerId: null }
    ]
  }
};

// FORMAT 6 vs 6: 1 Bramkarz + 5 Zawodników w polu = 6 zawodników
export const FORMATIONS_6V6: Record<string, FormationDefinition> = {
  "2-3": {
    name: "2-3 (Ofensywna Dominacja)",
    desc: "2 Obrońców i 3 Napastników w ataku. Szeroka gra skrzydłami i ciągłe zagrożenie pod bramką.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 66, left: 28, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 66, left: 72, assignedPlayerId: null },
      { id: "lw", label: "LS", role: "ATT", top: 26, left: 20, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null },
      { id: "rw", label: "PS", role: "ATT", top: 26, left: 80, assignedPlayerId: null }
    ]
  },
  "3-2": {
    name: "3-2 (Żelazna Obrona)",
    desc: "3 Obrońców w linii zabezpieczających całą szerokość boiska i 2 szybkich Napastników.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 66, left: 20, assignedPlayerId: null },
      { id: "cd", label: "ŚO", role: "DEF", top: 68, left: 50, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 66, left: 80, assignedPlayerId: null },
      { id: "lst", label: "LN", role: "ATT", top: 22, left: 32, assignedPlayerId: null },
      { id: "rst", label: "PN", role: "ATT", top: 22, left: 68, assignedPlayerId: null }
    ]
  },
  "1-3-1": {
    name: "1-3-1 (Kontrola Środka Pola)",
    desc: "1 Środkowy Obrońca, 3 Pomocników i 1 Wysunięty Napastnik. Dominacja posiadania piłki.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "cd", label: "ŚO", role: "DEF", top: 68, left: 50, assignedPlayerId: null },
      { id: "lm", label: "LP", role: "MID", top: 42, left: 20, assignedPlayerId: null },
      { id: "cm", label: "ŚP", role: "MID", top: 40, left: 50, assignedPlayerId: null },
      { id: "rm", label: "PP", role: "MID", top: 42, left: 80, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null }
    ]
  },
  "2-2-1": {
    name: "2-2-1 (Klasyczny Orlik U-9)",
    desc: "2 Obrońców, 2 Skrzydłowych / Pomocników i 1 Napastnik. Zrównoważony i łatwy do nauki system.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 66, left: 28, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 66, left: 72, assignedPlayerId: null },
      { id: "lm", label: "LP", role: "MID", top: 42, left: 26, assignedPlayerId: null },
      { id: "rm", label: "PP", role: "MID", top: 42, left: 74, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null }
    ]
  }
};

const STORAGE_KEY_PREFIX = "delta:tactics-board:v1";

export default function DeltaTacticsBoardModal({
  isOpen,
  onClose,
  players
}: DeltaTacticsBoardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [gameFormat, setGameFormat] = useState<TacticsGameFormat>("5v5");
  const [selectedFormationKey, setSelectedFormationKey] = useState<string>("2-2");
  const [positions, setPositions] = useState<PitchPosition[]>(FORMATIONS_5V5["2-2"].positions);
  const [selectedPosId, setSelectedPosId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const pitchRef = useRef<HTMLDivElement | null>(null);

  // Init client mount & load saved formation/lineup
  useEffect(() => {
    setMounted(true);
    try {
      const savedFormat = localStorage.getItem(`${STORAGE_KEY_PREFIX}:format`) as TacticsGameFormat;
      const validFormat = savedFormat === "6v6" ? "6v6" : "5v5";
      setGameFormat(validFormat);

      const savedKey = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${validFormat}:formation`);
      const availableFormations = validFormat === "5v5" ? FORMATIONS_5V5 : FORMATIONS_6V6;
      const initialKey = (savedKey && availableFormations[savedKey]) ? savedKey : Object.keys(availableFormations)[0];
      setSelectedFormationKey(initialKey);

      const savedPositionsJson = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${validFormat}:${initialKey}:positions`);
      if (savedPositionsJson) {
        const parsed = JSON.parse(savedPositionsJson);
        if (Array.isArray(parsed) && parsed.length === availableFormations[initialKey].positions.length) {
          setPositions(parsed);
          return;
        }
      }
      setPositions(availableFormations[initialKey].positions);
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Handle format switch (5v5 <-> 6v6)
  const handleFormatChange = (newFormat: TacticsGameFormat) => {
    if (newFormat === gameFormat) return;
    setGameFormat(newFormat);
    const availableFormations = newFormat === "5v5" ? FORMATIONS_5V5 : FORMATIONS_6V6;
    const defaultKey = Object.keys(availableFormations)[0];
    setSelectedFormationKey(defaultKey);

    // Carry over previously assigned players into the new format without dropping from roster
    const currentAssignedList = positions.map(p => p.assignedPlayerId).filter(Boolean) as string[];
    const baseNewPositions = availableFormations[defaultKey].positions.map((pos, idx) => ({
      ...pos,
      assignedPlayerId: currentAssignedList[idx] || null
    }));

    setPositions(baseNewPositions);
    setSelectedPosId(null);

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:format`, newFormat);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${newFormat}:formation`, defaultKey);
    } catch {}
  };

  // Handle formation key change within format
  const handleFormationChange = (newKey: string) => {
    setSelectedFormationKey(newKey);
    setSelectedPosId(null);
    const availableFormations = gameFormat === "5v5" ? FORMATIONS_5V5 : FORMATIONS_6V6;
    const targetFormation = availableFormations[newKey];
    if (!targetFormation) return;

    // Preserve already assigned players by index
    const currentAssignedList = positions.map(p => p.assignedPlayerId).filter(Boolean) as string[];
    const remapped = targetFormation.positions.map((pos, idx) => ({
      ...pos,
      assignedPlayerId: currentAssignedList[idx] || null
    }));

    setPositions(remapped);

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${gameFormat}:formation`, newKey);
    } catch {}
  };

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Assign player to selected pitch position (Any player can play in any position, including GK)
  const handleAssignPlayer = (playerId: string) => {
    if (!selectedPosId) return;
    setPositions(prev => {
      const next = prev.map(p => {
        if (p.id === selectedPosId) {
          return { ...p, assignedPlayerId: p.assignedPlayerId === playerId ? null : playerId };
        }
        // Prevent duplicate player on the pitch
        if (p.assignedPlayerId === playerId) {
          return { ...p, assignedPlayerId: null };
        }
        return p;
      });
      autoSavePositions(next);
      return next;
    });
  };

  // Reset board
  const handleReset = () => {
    const availableFormations = gameFormat === "5v5" ? FORMATIONS_5V5 : FORMATIONS_6V6;
    const base = availableFormations[selectedFormationKey].positions;
    setPositions(base);
    setSelectedPosId(null);
    autoSavePositions(base);
  };

  // Save positions helper
  const autoSavePositions = (currentPositions: PitchPosition[]) => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}:${gameFormat}:${selectedFormationKey}:positions`,
        JSON.stringify(currentPositions)
      );
      setSaveStatus("Zapisano");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {}
  };

  // Free Dragging Handlers (Pointer Events supporting Desktop Mouse & Mobile Touch)
  const handlePointerDownNode = (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    setSelectedPosId(nodeId);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMovePitch = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingNodeId || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Calculate relative percentage coordinates clamped inside pitch boundary (5% - 95%)
    const clientX = e.clientX;
    const clientY = e.clientY;

    const rawLeft = ((clientX - rect.left) / rect.width) * 100;
    const rawTop = ((clientY - rect.top) / rect.height) * 100;

    const clampedLeft = Math.max(8, Math.min(92, Math.round(rawLeft)));
    const clampedTop = Math.max(8, Math.min(92, Math.round(rawTop)));

    setPositions(prev => prev.map(p => {
      if (p.id === draggingNodeId) {
        return { ...p, left: clampedLeft, top: clampedTop };
      }
      return p;
    }));
  };

  const handlePointerUpPitch = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      autoSavePositions(positions);
    }
  };

  if (!isOpen || !mounted) return null;

  const currentFormations = gameFormat === "5v5" ? FORMATIONS_5V5 : FORMATIONS_6V6;
  const currentFormation = currentFormations[selectedFormationKey] || Object.values(currentFormations)[0];
  const assignedPlayerIds = new Set(positions.map(p => p.assignedPlayerId).filter(Boolean));
  const activeCount = positions.filter(p => p.assignedPlayerId !== null).length;
  const maxCount = positions.length;

  return createPortal(
    <div className="v200-knowledge-modal-backdrop" onClick={onClose}>
      <div 
        className="v200-knowledge-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="v200-knowledge-header">
          <div className="v200-knowledge-header-left">
            <div className="v200-knowledge-icon-shield gold-shield">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="v200-badge-academy gold-badge">
                  <Target size={13} />
                  <span>ODPRAWA TAKTYCZNA U-9</span>
                </div>
                {saveStatus && (
                  <span className="text-[11px] font-bold text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30">
                    <CheckCircle2 size={12} /> {saveStatus}
                  </span>
                )}
              </div>
              <h2>Klubowa Tablica Taktyczna DELTA</h2>
              <p>Dynamiczne formaty meczowe DELTA U-9 (5v5 oraz 6v6) ze swobodnym przesuwaniem zawodników</p>
            </div>
          </div>

          <button 
            type="button" 
            className="v200-btn-close-knowledge"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </header>

        {/* 1. PASEK KONTROLNY: FORMAT (5v5 vs 6v6) ORAZ FORMACJE */}
        <div className="v200-tactics-bar flex-wrap gap-3">
          {/* PRZEŁĄCZNIK FORMATU */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${gameFormat === "5v5" ? "bg-amber-400 text-black shadow-md shadow-amber-400/30" : "text-slate-300 hover:text-white"}`}
              onClick={() => handleFormatChange("5v5")}
            >
              FORMAT 5 vs 5 (4+1)
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${gameFormat === "6v6" ? "bg-amber-400 text-black shadow-md shadow-amber-400/30" : "text-slate-300 hover:text-white"}`}
              onClick={() => handleFormatChange("6v6")}
            >
              FORMAT 6 vs 6 (5+1)
            </button>
          </div>

          {/* LISTA FORMACJI DLA WYBRANEGO FORMATU */}
          <div className="v200-tactics-pills">
            {Object.entries(currentFormations).map(([key, f]) => (
              <button
                key={key}
                type="button"
                className={`v200-tactic-pill ${selectedFormationKey === key ? "active" : ""}`}
                onClick={() => handleFormationChange(key)}
              >
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <button 
            type="button" 
            className="v200-btn-reset-board shrink-0"
            onClick={handleReset}
          >
            <RotateCcw size={15} />
            <span>RESET FORMACJI</span>
          </button>
        </div>

        <div className="v200-tactics-grid">
          {/* LEWA STRONA: BOISKO / MURAWA Z OBSŁUGĄ DRAG & DROP DOTYKU */}
          <div className="v200-pitch-wrapper">
            <div 
              ref={pitchRef}
              className="v200-pitch touch-none select-none relative"
              onPointerMove={handlePointerMovePitch}
              onPointerUp={handlePointerUpPitch}
              onPointerLeave={handlePointerUpPitch}
            >
              {/* Oznaczenia boiska */}
              <div className="v200-pitch-center-circle" />
              <div className="v200-pitch-center-line" />
              <div className="v200-pitch-penalty-top" />
              <div className="v200-pitch-penalty-bottom" />

              {/* Informacja o możliwości przesuwania */}
              <div className="absolute top-2 left-2 text-[10px] text-emerald-300/70 font-mono flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded backdrop-blur pointer-events-none">
                <Move size={11} /> Przeciągaj zawodników po murawie
              </div>

              {/* Pozycje na murawie */}
              {positions.map(pos => {
                const assignedPlayer = players.find(p => p.id === pos.assignedPlayerId);
                const isSelected = selectedPosId === pos.id;
                const isDragging = draggingNodeId === pos.id;

                return (
                  <div
                    key={pos.id}
                    className={`v200-pitch-node ${pos.role.toLowerCase()} ${isSelected ? "selected" : ""} ${isDragging ? "cursor-grabbing scale-110 shadow-2xl z-30" : "cursor-grab"}`}
                    style={{ 
                      top: `${pos.top}%`, 
                      left: `${pos.left}%`,
                      touchAction: "none"
                    }}
                    onPointerDown={(e) => handlePointerDownNode(e, pos.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPosId(pos.id);
                    }}
                  >
                    <div className="v200-node-badge">
                      {assignedPlayer?.shirt_number ? `#${assignedPlayer.shirt_number}` : pos.label}
                    </div>
                    <span className="v200-node-name">
                      {assignedPlayer ? assignedPlayer.display_name.split(" ")[0] : pos.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PRAWA STRONA: KADRA I ZADANIA */}
          <div className="v200-tactics-sidebar">
            <div className="v200-tactic-info-card">
              <div className="flex items-center justify-between gap-2">
                <h4>{currentFormation.name}</h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                  SKŁAD: {activeCount} / {maxCount}
                </span>
              </div>
              <p>{currentFormation.desc}</p>
            </div>

            <div className="v200-roster-select-box">
              <div className="v200-roster-title">
                <Users size={16} />
                <span>
                  {selectedPosId 
                    ? `Przypisz zawodnika do pozycji: ${positions.find(p => p.id === selectedPosId)?.label}`
                    : "Wybierz pozycję na boisku, a potem zawodnika:"}
                </span>
              </div>

              <div className="v200-roster-chips max-h-[340px] overflow-y-auto">
                {players.map(p => {
                  const isAssigned = assignedPlayerIds.has(p.id);
                  const isAssignedToActive = positions.find(pos => pos.id === selectedPosId)?.assignedPlayerId === p.id;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!selectedPosId}
                      className={`v200-roster-chip ${isAssigned ? "is-assigned" : ""} ${isAssignedToActive ? "active-assigned" : ""}`}
                      onClick={() => handleAssignPlayer(p.id)}
                    >
                      <span className="chip-num">#{p.shirt_number || "-"}</span>
                      <span className="chip-name">{p.display_name}</span>
                      {isAssignedToActive && <CheckCircle2 size={14} className="chip-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
