"use client";

import React, { useState, useEffect } from "react";
import { X, Shield, Check, Save } from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  shirt_number?: string | null;
  position?: string | null;
}

interface DeltaAdminGoalkeeperStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  players: Player[];
  onSaved?: () => void;
}

export default function DeltaAdminGoalkeeperStatsModal({
  isOpen,
  onClose,
  matchId,
  players,
  onSaved
}: DeltaAdminGoalkeeperStatsModalProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [minutesPlayed, setMinutesPlayed] = useState(60);
  const [goalsConceded, setGoalsConceded] = useState(0);
  const [saves, setSaves] = useState(5);
  const [cleanSheet, setCleanSheet] = useState(false);
  const [penaltySaves, setPenaltySaves] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter goalkeepers or allow any player
  const goalkeepers = players.filter(p => {
    const pos = (p.position || "").toUpperCase();
    return pos.includes("BRAMKARZ") || pos.includes("GK") || pos.includes("BR");
  });

  useEffect(() => {
    if (isOpen && goalkeepers.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(goalkeepers[0].id);
    }
  }, [isOpen, goalkeepers, selectedPlayerId]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      alert("Wybierz bramkarza!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/goalkeepers/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          player_id: selectedPlayerId,
          minutes_played: minutesPlayed,
          goals_conceded: goalsConceded,
          saves,
          clean_sheet: cleanSheet || goalsConceded === 0,
          penalty_saves: penaltySaves,
          notes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onSaved) onSaved();
        onClose();
      } else {
        alert(data.error || "Błąd zapisu statystyk bramkarza.");
      }
    } catch (err: any) {
      alert("Błąd połączenia: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield size={22} />
            </div>
            <div>
              <span className="eyebrow gold">STATYSTYKI BRAMKARSKIE</span>
              <h2 className="text-base font-black text-white m-0">WYSTĘP BRAMKARZA W MECZU</h2>
            </div>
          </div>
          <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Bramkarz w tym meczu</label>
            <select
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
              className="w-full bg-slate-900 text-white font-bold text-xs p-2.5 rounded-xl border border-white/15 outline-none focus:border-amber-400"
            >
              <option value="">-- Wybierz zawodnika w bramce --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>
                  {p.display_name} (#{p.shirt_number || "—"}) {p.position ? `[${p.position}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Rozegrane minuty</label>
              <input
                type="number"
                value={minutesPlayed}
                onChange={e => setMinutesPlayed(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 text-white text-xs p-2 rounded-lg border border-white/15"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Gole stracone</label>
              <input
                type="number"
                value={goalsConceded}
                onChange={e => setGoalsConceded(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 text-white text-xs p-2 rounded-lg border border-white/15"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Udane obrony (Saves)</label>
              <input
                type="number"
                value={saves}
                onChange={e => setSaves(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 text-white text-xs p-2 rounded-lg border border-white/15"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Obronione rzuty karne</label>
              <input
                type="number"
                value={penaltySaves}
                onChange={e => setPenaltySaves(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 text-white text-xs p-2 rounded-lg border border-white/15"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/40 border border-white/10">
            <input
              type="checkbox"
              id="cleanSheet"
              checked={cleanSheet || goalsConceded === 0}
              onChange={e => setCleanSheet(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded"
            />
            <label htmlFor="cleanSheet" className="text-xs text-white font-bold cursor-pointer">
              Czyste konto (Clean Sheet / 0 goli)
            </label>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Notatki trenera (opcjonalne)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="np. Świetna parada w 55. minucie, pewne wyjścia do dośrodkowań"
              className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-white/15"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" className="v200-tc-action-btn" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" disabled={saving} className="v200-tc-action-btn gold">
              <Save size={13} /> {saving ? "Zapisywanie…" : "ZAPISZ STATYSTYKI"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
