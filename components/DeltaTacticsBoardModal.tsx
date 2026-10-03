"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2
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

interface PitchPosition {
  id: string;
  label: string;
  role: "GK" | "DEF" | "MID" | "ATT";
  top: number; // %
  left: number; // %
  assignedPlayerId: string | null;
}

const FORMATIONS: Record<string, { name: string; desc: string; positions: PitchPosition[] }> = {
  "1-2-3-1": {
    name: "1-2-3-1 (Ofensywna Orlik)",
    desc: "Klasyczne ustawienie orlikowe: 1 Bramkarz, 2 Obrońców, 3 Pomocników i 1 Napastnik.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 68, left: 28, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 68, left: 72, assignedPlayerId: null },
      { id: "lm", label: "LP", role: "MID", top: 44, left: 18, assignedPlayerId: null },
      { id: "cm", label: "ŚP", role: "MID", top: 42, left: 50, assignedPlayerId: null },
      { id: "rm", label: "PP", role: "MID", top: 44, left: 82, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null }
    ]
  },
  "1-3-2-1": {
    name: "1-3-2-1 (Mocna Defensywa)",
    desc: "Ustawienie z mocnym zabezpieczeniem tyłów: 3 Obrońców, 2 Środkowych Pomocników i 1 Wysunięty Napastnik.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 68, left: 20, assignedPlayerId: null },
      { id: "cd", label: "ŚO", role: "DEF", top: 70, left: 50, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 68, left: 80, assignedPlayerId: null },
      { id: "lcm", label: "LP", role: "MID", top: 44, left: 34, assignedPlayerId: null },
      { id: "rcm", label: "PP", role: "MID", top: 44, left: 66, assignedPlayerId: null },
      { id: "st", label: "N", role: "ATT", top: 18, left: 50, assignedPlayerId: null }
    ]
  },
  "1-2-2-2": {
    name: "1-2-2-2 (Dwa Żądła Ataku)",
    desc: "Odważne ustawienie z dwoma napastnikami polującymi na błędy obrony rywala.",
    positions: [
      { id: "gk", label: "BR", role: "GK", top: 86, left: 50, assignedPlayerId: null },
      { id: "ld", label: "LO", role: "DEF", top: 68, left: 28, assignedPlayerId: null },
      { id: "rd", label: "PO", role: "DEF", top: 68, left: 72, assignedPlayerId: null },
      { id: "lm", label: "LP", role: "MID", top: 46, left: 30, assignedPlayerId: null },
      { id: "rm", label: "PP", role: "MID", top: 46, left: 70, assignedPlayerId: null },
      { id: "lst", label: "LN", role: "ATT", top: 20, left: 32, assignedPlayerId: null },
      { id: "rst", label: "PN", role: "ATT", top: 20, left: 68, assignedPlayerId: null }
    ]
  }
};

export default function DeltaTacticsBoardModal({
  isOpen,
  onClose,
  players
}: DeltaTacticsBoardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedFormationKey, setSelectedFormationKey] = useState<string>("1-2-3-1");
  const [positions, setPositions] = useState<PitchPosition[]>(FORMATIONS["1-2-3-1"].positions);
  const [selectedPosId, setSelectedPosId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPositions(FORMATIONS[selectedFormationKey].positions);
    setSelectedPosId(null);
  }, [selectedFormationKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleAssignPlayer = (playerId: string) => {
    if (!selectedPosId) return;
    setPositions(prev => prev.map(p => {
      if (p.id === selectedPosId) {
        return { ...p, assignedPlayerId: p.assignedPlayerId === playerId ? null : playerId };
      }
      if (p.assignedPlayerId === playerId) {
        return { ...p, assignedPlayerId: null };
      }
      return p;
    }));
  };

  const handleReset = () => {
    setPositions(FORMATIONS[selectedFormationKey].positions);
    setSelectedPosId(null);
  };

  if (!isOpen || !mounted) return null;

  const currentFormation = FORMATIONS[selectedFormationKey];
  const assignedPlayerIds = new Set(positions.map(p => p.assignedPlayerId).filter(Boolean));

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
              <div className="v200-badge-academy gold-badge">
                <Target size={13} />
                <span>ODPRAWA PRZEDMECZOWA</span>
              </div>
              <h2>Klubowa Tablica Taktyczna Orlika</h2>
              <p>Wybierz formację, rozstaw skład na murawie i sprawdź zadania na pozycjach</p>
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

        {/* PRZEŁĄCZNIK FORMACJI */}
        <div className="v200-tactics-bar">
          <div className="v200-tactics-pills">
            {Object.entries(FORMATIONS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                className={`v200-tactic-pill ${selectedFormationKey === key ? "active" : ""}`}
                onClick={() => setSelectedFormationKey(key)}
              >
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <button 
            type="button" 
            className="v200-btn-reset-board"
            onClick={handleReset}
          >
            <RotateCcw size={15} />
            <span>WYCZYŚĆ SKŁAD</span>
          </button>
        </div>

        <div className="v200-tactics-grid">
          {/* LEWA STRONA: BOISKO / MURAWA */}
          <div className="v200-pitch-wrapper">
            <div className="v200-pitch">
              {/* Oznaczenia boiska */}
              <div className="v200-pitch-center-circle" />
              <div className="v200-pitch-center-line" />
              <div className="v200-pitch-penalty-top" />
              <div className="v200-pitch-penalty-bottom" />

              {/* Pozycje na murawie */}
              {positions.map(pos => {
                const assignedPlayer = players.find(p => p.id === pos.assignedPlayerId);
                const isSelected = selectedPosId === pos.id;

                return (
                  <div
                    key={pos.id}
                    className={`v200-pitch-node ${pos.role.toLowerCase()} ${isSelected ? "selected" : ""}`}
                    style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                    onClick={() => setSelectedPosId(pos.id)}
                  >
                    <div className="v200-node-badge">
                      {assignedPlayer?.shirt_number || pos.label}
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
              <h4>{currentFormation.name}</h4>
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

              <div className="v200-roster-chips">
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
