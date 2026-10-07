"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Crown, Shield, Sparkles, Check, ChevronRight, RefreshCw, Lock, Unlock, Flame, Trophy, Save } from "lucide-react";
import { UserCard } from "@/lib/cards/types";
import { SQUAD_FORMATIONS, FormationKey, SquadSlotAssignment, evaluateSquad, SquadEvaluationResult } from "@/lib/cards/squad-engine";
import { calculateCardOVR, CENTRAL_CARD_TYPES, INITIAL_COACH_CARDS, SPECIAL_VENUE_CARDS } from "@/lib/cards/central-types";

interface DeltaSquadBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCards: UserCard[];
  onSquadSaved?: () => void;
}

export default function DeltaSquadBuilderModal({
  isOpen,
  onClose,
  userCards,
  onSquadSaved
}: DeltaSquadBuilderModalProps) {
  const [formation, setFormation] = useState<FormationKey>("2-3-1");
  const [assignments, setAssignments] = useState<SquadSlotAssignment[]>([]);
  const [captainCardId, setCaptainCardId] = useState<string | null>(null);
  const [coachCardId, setCoachCardId] = useState<string | null>(null);
  const [stadiumCardId, setStadiumCardId] = useState<string | null>(null);
  const [crestCardId, setCrestCardId] = useState<string | null>(null);
  const [squadName, setSquadName] = useState<string>("Moja 11 DELTA");

  // Selection drawer / modal state
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing saved squad
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/cards/squad")
      .then(res => res.json())
      .then(data => {
        if (data?.squad) {
          const sq = data.squad;
          setFormation(sq.formation || "2-3-1");
          setAssignments(sq.slots || []);
          setCaptainCardId(sq.captain_card_id || null);
          setCoachCardId(sq.coach_card_id || null);
          setStadiumCardId(sq.stadium_card_id || null);
          setCrestCardId(sq.crest_card_id || null);
          setSquadName(sq.squad_name || "Moja 11 DELTA");
        }
      })
      .catch(err => console.error("Error loading squad:", err));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentFormationDef = SQUAD_FORMATIONS[formation] || SQUAD_FORMATIONS["2-3-1"];
  const evaluation: SquadEvaluationResult = evaluateSquad({
    formation,
    assignments,
    userCards,
    captainCardId,
    coachCardId,
    stadiumCardId,
    crestCardId
  });

  const handleSelectCardForSlot = (userCard: UserCard) => {
    if (!activeSlotId) return;

    // Check if card is already assigned in another slot
    const existingOtherSlot = assignments.find(
      a => a.slotId !== activeSlotId && (a.userCardId === userCard.id || a.cardId === userCard.card_id)
    );
    if (existingOtherSlot) {
      alert("Ten egzemplarz karty jest już ustawiony na innej pozycji!");
      return;
    }

    setAssignments(prev => {
      const filtered = prev.filter(a => a.slotId !== activeSlotId);
      return [...filtered, {
        slotId: activeSlotId,
        userCardId: userCard.id,
        cardId: userCard.card_id
      }];
    });

    // If no captain yet, set as captain
    if (!captainCardId) {
      setCaptainCardId(userCard.card_id);
    }

    setActiveSlotId(null);
  };

  const handleRemoveFromSlot = (slotId: string) => {
    setAssignments(prev => prev.filter(a => a.slotId !== slotId));
    setActiveSlotId(null);
  };

  const handleSaveSquad = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/cards/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          squad_name: squadName,
          formation,
          slots: assignments,
          captain_card_id: captainCardId,
          coach_card_id: coachCardId,
          stadium_card_id: stadiumCardId,
          crest_card_id: crestCardId,
          squad_rating: evaluation.squadRating,
          attack_rating: evaluation.attackRating,
          midfield_rating: evaluation.midfieldRating,
          defense_rating: evaluation.defenseRating,
          goalkeeper_rating: evaluation.goalkeeperRating,
          chemistry_score: evaluation.chemistryScore
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (onSquadSaved) onSquadSaved();
      } else {
        alert(data.error || "Nie udało się zapisać składu.");
      }
    } catch (err: any) {
      alert("Błąd połączenia: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Find assigned card for a slot
  const getAssignedCard = (slotId: string): UserCard | null => {
    const assignment = assignments.find(a => a.slotId === slotId);
    if (!assignment) return null;
    return userCards.find(uc => uc.id === assignment.userCardId || uc.card_id === assignment.cardId) || null;
  };

  const activeSlotDef = currentFormationDef.slots.find(s => s.slotId === activeSlotId);

  return (
    <div className="v200-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-modal-container max-w-5xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v200-modal-head">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Users size={22} />
            </div>
            <div>
              <span className="eyebrow gold">SQUAD BUILDER 2.0</span>
              <h2 className="text-xl font-black text-white m-0">WŁASNA DRUŻYNA DELTA</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="v200-tc-action-btn gold"
              disabled={saving}
              onClick={handleSaveSquad}
            >
              <Save size={14} /> {saving ? "Zapisywanie…" : "ZAPISZ SKŁAD"}
            </button>
            <button type="button" className="v200-modal-close" onClick={onClose} aria-label="Zamknij">
              <X size={20} />
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check size={16} />
            <span>Skład został pomyślnie zapisany w bazie!</span>
          </div>
        )}

        {/* Top Control Bar: Formation, Name & Gauges */}
        <div className="p-4 bg-black/60 border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Formations */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Formacja Boiskowa
            </label>
            <select
              value={formation}
              onChange={e => setFormation(e.target.value as FormationKey)}
              className="w-full bg-slate-900 text-white font-bold text-xs p-2.5 rounded-xl border border-white/15 outline-none focus:border-amber-400"
            >
              {Object.values(SQUAD_FORMATIONS).map(f => (
                <option key={f.key} value={f.key}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Ratings Gauge Summary */}
          <div className="md:col-span-2 flex items-center justify-around gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-white/10">
            <div className="text-center">
              <span className="text-[10px] text-amber-400 font-black block">OVR SKŁADU</span>
              <b className="text-2xl font-black text-white">{evaluation.squadRating}</b>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] text-red-400 font-bold block">ATAK</span>
              <b className="text-lg font-bold text-slate-200">{evaluation.attackRating}</b>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-amber-300 font-bold block">POMOC</span>
              <b className="text-lg font-bold text-slate-200">{evaluation.midfieldRating}</b>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-blue-400 font-bold block">OBRONA</span>
              <b className="text-lg font-bold text-slate-200">{evaluation.defenseRating}</b>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-emerald-400 font-bold block">BRAMKARZ</span>
              <b className="text-lg font-bold text-slate-200">{evaluation.goalkeeperRating}</b>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] text-purple-400 font-black block">ZGRANIE</span>
              <b className="text-lg font-black text-purple-300">{evaluation.chemistryScore}%</b>
            </div>
          </div>
        </div>

        {/* Main Pitch Stage & Booster Slot Bar */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Football Pitch (3 Cols) */}
          <div className="lg:col-span-3 relative rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/30 overflow-hidden min-h-[440px] flex items-center justify-center shadow-inner">
            {/* Pitch Markings */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
            <div className="absolute inset-4 border border-emerald-400/30 rounded-xl pointer-events-none" />
            <div className="absolute top-1/2 left-4 right-4 h-px bg-emerald-400/30 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-emerald-400/30 pointer-events-none" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-20 border-b border-l border-r border-emerald-400/30 pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-l border-r border-emerald-400/30 pointer-events-none" />

            {/* Interactive Player Slots */}
            {currentFormationDef.slots.map(slot => {
              const assigned = getAssignedCard(slot.slotId);
              const cardDef = assigned?.card_definition;
              const isCaptain = captainCardId && (cardDef?.id === captainCardId || assigned?.id === captainCardId);
              const ovr = cardDef ? calculateCardOVR({
                cardType: cardDef.card_type,
                rarity: cardDef.rarity,
                isGoalkeeper: slot.role === "GK"
              }) + (isCaptain ? 2 : 0) : null;

              return (
                <div
                  key={slot.slotId}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <button
                    type="button"
                    className={`w-16 sm:w-20 h-20 sm:h-24 rounded-xl border-2 transition-all flex flex-col items-center justify-between p-1 shadow-xl relative ${
                      assigned
                        ? "bg-slate-900/95 border-amber-500/80 hover:scale-105"
                        : "bg-black/60 border-dashed border-white/30 hover:border-amber-400"
                    }`}
                    onClick={() => setActiveSlotId(slot.slotId)}
                  >
                    {assigned && cardDef ? (
                      <>
                        <div className="w-full flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-amber-400">{ovr}</span>
                          <span className="text-[8px] font-bold text-slate-400">{slot.role}</span>
                        </div>
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-black/60 border border-white/20 my-0.5">
                          {cardDef.artwork_url ? (
                            <img src={cardDef.artwork_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-black text-amber-400">
                              {cardDef.player?.shirt_number ? `#${cardDef.player.shirt_number}` : "★"}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-white truncate max-w-full text-center">
                          {cardDef.player?.display_name || cardDef.card_name}
                        </span>
                        {isCaptain && (
                          <div className="absolute -top-2 -right-1 px-1 rounded bg-amber-500 text-black text-[8px] font-black shadow">
                            C
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black text-emerald-400">{slot.role}</span>
                        <span className="text-[9px] text-slate-400 mt-1">+ Dodaj</span>
                      </div>
                    )}
                  </button>

                  {assigned && (
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        className={`p-0.5 rounded text-[8px] font-bold ${isCaptain ? "bg-amber-500 text-black" : "bg-black/60 text-slate-400"}`}
                        onClick={(e) => { e.stopPropagation(); setCaptainCardId(cardDef?.id || null); }}
                        title="Ustaw jako Kapitana (+2 OVR)"
                      >
                        <Crown size={10} />
                      </button>
                      <button
                        type="button"
                        className="p-0.5 rounded bg-red-900/60 text-red-300 text-[8px]"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromSlot(slot.slotId); }}
                        title="Usuń ze składu"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Boosters (Coach, Stadium, Crest) & Roster Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider m-0">
              Karty Wsparcia i Sztabu
            </h3>

            {/* Coach Slot */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">TRENER DELTA</span>
                <strong className="text-xs text-white">
                  {coachCardId ? INITIAL_COACH_CARDS.find(c => c.id === coachCardId)?.name : "Brak trenera"}
                </strong>
              </div>
              <button
                type="button"
                className="text-xs text-amber-400 font-bold hover:underline"
                onClick={() => setCoachCardId(INITIAL_COACH_CARDS[0].id)}
              >
                {coachCardId ? "Zmień" : "+ Wybierz"}
              </button>
            </div>

            {/* Stadium Slot */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">OBIEKT / BOISKO</span>
                <strong className="text-xs text-white">
                  {stadiumCardId ? SPECIAL_VENUE_CARDS.find(s => s.id === stadiumCardId)?.name : "Twierdza Jordanek"}
                </strong>
              </div>
              <button
                type="button"
                className="text-xs text-amber-400 font-bold hover:underline"
                onClick={() => setStadiumCardId(SPECIAL_VENUE_CARDS[0].id)}
              >
                {stadiumCardId ? "Zmień" : "+ Wybierz"}
              </button>
            </div>

            {/* Crest Slot */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">HERB KLUBU</span>
                <strong className="text-xs text-white">
                  {crestCardId ? "Złoty Herb DELTA" : "Standardowy"}
                </strong>
              </div>
              <button
                type="button"
                className="text-xs text-amber-400 font-bold hover:underline"
                onClick={() => setCrestCardId(SPECIAL_VENUE_CARDS[2].id)}
              >
                {crestCardId ? "Zmień" : "+ Wybierz"}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-400 space-y-1">
              <p><b>Obsadzone pozycje:</b> {evaluation.assignedCount} / {evaluation.totalSlots}</p>
              <p><b>Kapitan drużyny:</b> {captainCardId ? "Wybrany (+2 OVR)" : "Brak"}</p>
            </div>
          </div>
        </div>

        {/* Card Selection Drawer Modal */}
        {activeSlotId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Wybierz Kartę na Pozycję:</span>
                  <h4 className="text-sm font-black text-white m-0">
                    {activeSlotDef?.roleLabel} ({activeSlotDef?.role})
                  </h4>
                </div>
                <button
                  type="button"
                  className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  onClick={() => setActiveSlotId(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                {userCards.map(uc => {
                  const card = uc.card_definition;
                  if (!card) return null;
                  const isAssigned = assignments.some(a => a.userCardId === uc.id || a.cardId === uc.card_id);
                  const ovr = calculateCardOVR({
                    cardType: card.card_type,
                    rarity: card.rarity,
                    isGoalkeeper: activeSlotDef?.role === "GK"
                  });

                  return (
                    <button
                      key={uc.id}
                      type="button"
                      disabled={isAssigned}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isAssigned
                          ? "bg-black/40 border-white/5 opacity-40 cursor-not-allowed"
                          : "bg-slate-800/80 border-white/15 hover:border-amber-400 hover:scale-[1.02]"
                      }`}
                      onClick={() => handleSelectCardForSlot(uc)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400">{ovr} OVR</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">{card.rarity}</span>
                      </div>
                      <div className="my-2 text-center">
                        <strong className="text-xs text-white block truncate">
                          {card.player?.display_name || card.card_name}
                        </strong>
                        <small className="text-[10px] text-slate-400 block truncate">{card.title}</small>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                        <span>{card.player?.position || "Zawodnik"}</span>
                        {uc.duplicates_count > 0 && <span className="text-amber-400">+{uc.duplicates_count}</span>}
                      </div>
                    </button>
                  );
                })}

                {userCards.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-slate-500 text-xs">
                    Brak dostępnych kart w kolekcji. Otwórz paczki w albumie!
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-white/10 flex justify-between">
                <button
                  type="button"
                  className="text-xs text-red-400 font-bold hover:underline"
                  onClick={() => handleRemoveFromSlot(activeSlotId)}
                >
                  Wyczyść tę pozycję
                </button>
                <button
                  type="button"
                  className="v200-tc-action-btn"
                  onClick={() => setActiveSlotId(null)}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {evaluation.isComplete ? "✓ Skład jest kompletny!" : `Pozostało do uzupełnienia: ${evaluation.totalSlots - evaluation.assignedCount} pozycji`}
          </span>
          <button type="button" className="v200-tc-action-btn" onClick={onClose}>
            ZAMKNIJ
          </button>
        </div>
      </div>
    </div>
  );
}
