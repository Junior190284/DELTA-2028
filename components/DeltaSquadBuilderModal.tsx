"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  X, Users, Crown, Shield, Sparkles, Check, ChevronRight, 
  RefreshCw, Lock, Unlock, Flame, Trophy, Save, Plus, Trash2, 
  SlidersHorizontal, CheckCircle2, AlertCircle, Info, Star, Compass
} from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const [formation, setFormation] = useState<FormationKey>("2-3-1");
  const [assignments, setAssignments] = useState<SquadSlotAssignment[]>([]);
  const [captainCardId, setCaptainCardId] = useState<string | null>(null);
  const [coachCardId, setCoachCardId] = useState<string | null>(null);
  const [stadiumCardId, setStadiumCardId] = useState<string | null>(null);
  const [crestCardId, setCrestCardId] = useState<string | null>(null);
  const [squadName, setSquadName] = useState<string>("Moja 11 DELTA");

  // Selection drawer / modal state
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [cardSearchFilter, setCardSearchFilter] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const currentFormationDef = SQUAD_FORMATIONS[formation] || SQUAD_FORMATIONS["2-3-1"];
  const evaluation: SquadEvaluationResult = useMemo(() => {
    return evaluateSquad({
      formation,
      assignments,
      userCards,
      captainCardId,
      coachCardId,
      stadiumCardId,
      crestCardId
    });
  }, [formation, assignments, userCards, captainCardId, coachCardId, stadiumCardId, crestCardId]);

  if (!isOpen || !mounted) return null;

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
    if (captainCardId) {
      const assigned = getAssignedCard(slotId);
      if (assigned && (assigned.card_id === captainCardId || assigned.id === captainCardId)) {
        setCaptainCardId(null);
      }
    }
    setActiveSlotId(null);
  };

  const handleSaveSquad = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
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
        setTimeout(() => setSaveSuccess(false), 3500);
        if (onSquadSaved) onSquadSaved();
      } else {
        setSaveError(data.error || "Nie udało się zapisać składu.");
      }
    } catch (err: any) {
      setSaveError("Błąd połączenia: " + err.message);
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

  // Available cards for active slot filtered by search
  const availableCardsForSlot = userCards.filter(uc => {
    const card = uc.card_definition;
    if (!card) return false;
    if (!cardSearchFilter.trim()) return true;
    const q = cardSearchFilter.toLowerCase();
    return (
      (card.player?.display_name || "").toLowerCase().includes(q) ||
      (card.card_name || "").toLowerCase().includes(q) ||
      (card.player?.position || "").toLowerCase().includes(q) ||
      (card.rarity || "").toLowerCase().includes(q)
    );
  });

  const modalContent = (
    <div className="v200-squad-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v200-squad-sheet" onClick={e => e.stopPropagation()}>
        {/* ================= TOP BROADCAST HEADER ================= */}
        <div className="v200-squad-header-bar">
          <div className="squad-header-brand">
            <div className="squad-crest-icon">
              <Users size={22} className="text-amber-400" />
            </div>
            <div>
              <div className="squad-eyebrow-tag">SQUAD BUILDER 2.0 • EA FC BROADCAST</div>
              <h2 className="squad-modal-title">WŁASNA DRUŻYNA DELTA</h2>
            </div>
          </div>

          <div className="squad-header-actions">
            <button
              type="button"
              className="squad-save-btn"
              disabled={saving}
              onClick={handleSaveSquad}
            >
              {saving ? (
                <>
                  <div className="squad-spinner" />
                  <span>ZAPISYWANIE...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>ZAPISZ SKŁAD</span>
                </>
              )}
            </button>
            <button type="button" className="squad-close-btn" onClick={onClose} aria-label="Zamknij">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <div className="squad-alert success">
            <CheckCircle2 size={18} />
            <span>Skład został pomyślnie zapisany w bazie klubu DELTA!</span>
          </div>
        )}
        {saveError && (
          <div className="squad-alert error">
            <AlertCircle size={18} />
            <span>{saveError}</span>
          </div>
        )}

        {/* ================= FORMATION & HUD GAUGES BAR ================= */}
        <div className="v200-squad-control-bar">
          {/* Formation Picker */}
          <div className="squad-formation-picker">
            <label className="squad-control-label">Formacja Boiskowa</label>
            <div className="squad-select-wrap">
              <select
                value={formation}
                onChange={e => setFormation(e.target.value as FormationKey)}
                className="squad-formation-select"
              >
                {Object.values(SQUAD_FORMATIONS).map(f => (
                  <option key={f.key} value={f.key}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* OVR & Stats Gauges Cluster */}
          <div className="squad-hud-gauges-cluster">
            {/* OVR Main Hex */}
            <div className="gauge-ovr-box">
              <span className="gauge-ovr-label">OVR SKŁADU</span>
              <div className="gauge-ovr-val">{evaluation.squadRating}</div>
            </div>

            <div className="gauge-divider" />

            {/* Position Gauges */}
            <div className="gauge-stat-pill attack">
              <span className="pill-name">ATAK</span>
              <span className="pill-val">{evaluation.attackRating}</span>
            </div>
            <div className="gauge-stat-pill midfield">
              <span className="pill-name">POMOC</span>
              <span className="pill-val">{evaluation.midfieldRating}</span>
            </div>
            <div className="gauge-stat-pill defense">
              <span className="pill-name">OBRONA</span>
              <span className="pill-val">{evaluation.defenseRating}</span>
            </div>
            <div className="gauge-stat-pill goalkeeper">
              <span className="pill-name">BRAMKARZ</span>
              <span className="pill-val">{evaluation.goalkeeperRating}</span>
            </div>

            <div className="gauge-divider" />

            {/* Chemistry Gauge */}
            <div className="gauge-chem-box">
              <span className="gauge-chem-label">ZGRANIE</span>
              <div className="gauge-chem-val">{evaluation.chemistryScore}%</div>
            </div>
          </div>
        </div>

        {/* ================= MAIN ARENA (PITCH + SUPPORT CARDS) ================= */}
        <div className="v200-squad-arena-layout">
          {/* Interactive Tactical Pitch */}
          <div className="squad-pitch-container">
            <div className="squad-pitch-grass">
              {/* Field Lines */}
              <div className="pitch-center-circle">
                <div className="pitch-center-dot" />
              </div>
              <div className="pitch-half-line" />
              <div className="pitch-top-box" />
              <div className="pitch-top-penalty" />
              <div className="pitch-bottom-box" />
              <div className="pitch-bottom-penalty" />
              <div className="pitch-corner tl" />
              <div className="pitch-corner tr" />
              <div className="pitch-corner bl" />
              <div className="pitch-corner br" />

              {/* Slot Cards on Pitch */}
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
                    className="pitch-slot-node"
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  >
                    <div
                      className={`pitch-slot-card ${assigned ? "assigned" : "empty"}`}
                      onClick={() => setActiveSlotId(slot.slotId)}
                      role="button"
                      tabIndex={0}
                    >
                      {assigned && cardDef ? (
                        <div className="card-mini-inner">
                          {/* Top Header */}
                          <div className="card-mini-top">
                            <span className="card-mini-ovr">{ovr}</span>
                            <span className="card-mini-role">{slot.role}</span>
                          </div>

                          {/* Player Photo */}
                          <div className="card-mini-photo-wrap">
                            {cardDef.artwork_url ? (
                              <img src={cardDef.artwork_url} alt="" className="card-mini-photo" />
                            ) : (
                              <div className="card-mini-placeholder">
                                {cardDef.player?.shirt_number ? `#${cardDef.player.shirt_number}` : "★"}
                              </div>
                            )}
                          </div>

                          {/* Player Name */}
                          <div className="card-mini-name truncate">
                            {cardDef.player?.display_name || cardDef.card_name}
                          </div>

                          {/* Captain Badge */}
                          {isCaptain && (
                            <div className="card-mini-captain-badge" title="Kapitan (+2 OVR)">
                              C
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="card-slot-placeholder">
                          <div className="slot-role-badge">{slot.role}</div>
                          <div className="slot-plus-icon">
                            <Plus size={16} />
                          </div>
                          <span className="slot-add-text">DODAJ</span>
                        </div>
                      )}
                    </div>

                    {/* Slot Quick Action Controls */}
                    {assigned && (
                      <div className="pitch-slot-actions">
                        <button
                          type="button"
                          className={`slot-action-btn captain ${isCaptain ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCaptainCardId(cardDef?.id || null);
                          }}
                          title={isCaptain ? "Kapitan drużyny" : "Ustaw jako Kapitana (+2 OVR)"}
                        >
                          <Crown size={12} />
                        </button>
                        <button
                          type="button"
                          className="slot-action-btn remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromSlot(slot.slotId);
                          }}
                          title="Usuń ze składu"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Support Staff & Boosters */}
          <div className="squad-support-sidebar">
            <div className="sidebar-section-title">
              <Sparkles size={16} className="text-amber-400" />
              <span>KARTY WSPARCIA I SZTABU</span>
            </div>

            {/* Coach Slot */}
            <div className="support-booster-card">
              <div className="booster-icon-box">
                <Users size={18} className="text-blue-400" />
              </div>
              <div className="booster-info">
                <span className="booster-label">TRENER DELTA</span>
                <strong className="booster-name">
                  {coachCardId ? INITIAL_COACH_CARDS.find(c => c.id === coachCardId)?.name : "Brak trenera (+0)"}
                </strong>
                <span className="booster-bonus">Premia taktyczna: +2 Zgranie</span>
              </div>
              <button
                type="button"
                className="booster-toggle-btn"
                onClick={() => setCoachCardId(coachCardId ? null : INITIAL_COACH_CARDS[0].id)}
              >
                {coachCardId ? "Zmień" : "+ Wybierz"}
              </button>
            </div>

            {/* Stadium Slot */}
            <div className="support-booster-card">
              <div className="booster-icon-box">
                <Compass size={18} className="text-emerald-400" />
              </div>
              <div className="booster-info">
                <span className="booster-label">OBIEKT / BOISKO</span>
                <strong className="booster-name">
                  {stadiumCardId ? SPECIAL_VENUE_CARDS.find(s => s.id === stadiumCardId)?.name : "Twierdza Jordanek"}
                </strong>
                <span className="booster-bonus">Bonus gospodarza: +1 OVR</span>
              </div>
              <button
                type="button"
                className="booster-toggle-btn"
                onClick={() => setStadiumCardId(stadiumCardId ? null : SPECIAL_VENUE_CARDS[0].id)}
              >
                {stadiumCardId ? "Zmień" : "+ Wybierz"}
              </button>
            </div>

            {/* Crest Slot */}
            <div className="support-booster-card">
              <div className="booster-icon-box">
                <Shield size={18} className="text-amber-400" />
              </div>
              <div className="booster-info">
                <span className="booster-label">HERB KLUBU</span>
                <strong className="booster-name">
                  {crestCardId ? "Złoty Herb DELTA 2018" : "Herb Standardowy"}
                </strong>
                <span className="booster-bonus">Prestiż drużyny: Klasa Pro</span>
              </div>
              <button
                type="button"
                className="booster-toggle-btn"
                onClick={() => setCrestCardId(crestCardId ? null : SPECIAL_VENUE_CARDS[2].id)}
              >
                {crestCardId ? "Zmień" : "+ Wybierz"}
              </button>
            </div>

            {/* Roster Completion Tracker */}
            <div className="squad-roster-status-box">
              <div className="status-row">
                <span className="status-label">Obsadzone pozycje:</span>
                <strong className="status-value">{evaluation.assignedCount} / {evaluation.totalSlots}</strong>
              </div>
              <div className="status-row">
                <span className="status-label">Kapitan drużyny:</span>
                <strong className="status-value highlight">{captainCardId ? "Wybrany (+2 OVR)" : "Brak"}</strong>
              </div>
              <div className="status-row">
                <span className="status-label">Stan gotowości:</span>
                <span className={`status-badge ${evaluation.isComplete ? "ready" : "pending"}`}>
                  {evaluation.isComplete ? "GOTOWY DO GRY" : "W BUDOWIE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM FOOTER ================= */}
        <div className="v200-squad-footer-bar">
          <div className="footer-status-text">
            {evaluation.isComplete ? (
              <span className="status-text complete">
                <CheckCircle2 size={16} /> Skład jest w 100% skompletowany i gotowy do turniejów oraz pojedynków 3v3!
              </span>
            ) : (
              <span className="status-text incomplete">
                <Info size={16} /> Pozostało do uzupełnienia: <b>{evaluation.totalSlots - evaluation.assignedCount} pozycji</b>
              </span>
            )}
          </div>

          <div className="footer-actions-group">
            <button type="button" className="squad-secondary-btn" onClick={onClose}>
              ZAMKNIJ
            </button>
            <button
              type="button"
              className="squad-primary-save-btn"
              disabled={saving}
              onClick={handleSaveSquad}
            >
              <Save size={15} />
              <span>{saving ? "ZAPISYWANIE..." : "ZAPISZ SKŁAD"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= CARD SELECTION DRAWER ================= */}
      {activeSlotId && (
        <div className="v200-squad-drawer-overlay" onClick={() => setActiveSlotId(null)}>
          <div className="squad-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="drawer-eyebrow">WYBIERZ KARTĘ NA POZYCJĘ</span>
                <h3 className="drawer-title">
                  {activeSlotDef?.roleLabel} ({activeSlotDef?.role})
                </h3>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setActiveSlotId(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Filter */}
            <div className="drawer-search-wrap">
              <input
                type="text"
                placeholder="Szukaj po nazwisku, pozycji lub rzadkości..."
                value={cardSearchFilter}
                onChange={e => setCardSearchFilter(e.target.value)}
                className="drawer-search-input"
              />
            </div>

            {/* Cards Grid */}
            <div className="drawer-cards-grid">
              {availableCardsForSlot.map(uc => {
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
                    className={`drawer-card-item ${isAssigned ? "is-assigned" : "is-available"}`}
                    onClick={() => handleSelectCardForSlot(uc)}
                  >
                    <div className="item-top-row">
                      <span className="item-ovr-badge">{ovr} OVR</span>
                      <span className="item-rarity-badge">{card.rarity}</span>
                    </div>

                    <div className="item-photo-box">
                      {card.artwork_url ? (
                        <img src={card.artwork_url} alt="" className="item-photo" />
                      ) : (
                        <div className="item-placeholder">
                          {card.player?.shirt_number ? `#${card.player.shirt_number}` : "★"}
                        </div>
                      )}
                    </div>

                    <div className="item-details">
                      <strong className="item-name truncate">{card.player?.display_name || card.card_name}</strong>
                      <span className="item-title truncate">{card.title || card.player?.position || "Zawodnik"}</span>
                    </div>

                    <div className="item-bottom-row">
                      <span className="item-pos-tag">{card.player?.position || "POZ"}</span>
                      {uc.duplicates_count > 0 && (
                        <span className="item-dupes-tag">+{uc.duplicates_count} dup.</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {availableCardsForSlot.length === 0 && (
                <div className="drawer-empty-msg">
                  Brak kart spełniających kryteria. Otwórz więcej paczek w Szatni!
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="drawer-footer">
              <button
                type="button"
                className="drawer-clear-slot-btn"
                onClick={() => handleRemoveFromSlot(activeSlotId)}
              >
                <Trash2 size={14} />
                <span>Wyczyść tę pozycję</span>
              </button>
              <button
                type="button"
                className="drawer-cancel-btn"
                onClick={() => setActiveSlotId(null)}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
