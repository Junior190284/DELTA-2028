/**
 * DELTA WARSZAWA 2018 GM — SQUAD BUILDER & TEAM RATING ENGINE
 * Pure business logic for formations, rating evaluation, chemistry and validation.
 */

import { UserCard } from "./types";
import { calculateCardOVR, CENTRAL_CARD_TYPES } from "./central-types";

export type FormationKey = "2-3-1" | "1-2-1" | "3-2-1" | "2-2-2" | "1-3-2";

export interface SquadSlotDef {
  slotId: string;
  role: "GK" | "DEF" | "MID" | "FWD";
  roleLabel: string;
  x: number; // percentage on pitch (0 - 100)
  y: number; // percentage on pitch (0 - 100)
}

export interface FormationDef {
  key: FormationKey;
  name: string;
  description: string;
  playerCount: number;
  slots: SquadSlotDef[];
}

export const SQUAD_FORMATIONS: Record<FormationKey, FormationDef> = {
  "2-3-1": {
    key: "2-3-1",
    name: "2-3-1 (Klasyczny Orlik 7v7)",
    description: "Zrównoważone ustawienie ligowe: 2 obrońców, 3 pomocników i 1 wysunięty napastnik.",
    playerCount: 7,
    slots: [
      { slotId: "gk", role: "GK", roleLabel: "Bramkarz", x: 50, y: 88 },
      { slotId: "def_l", role: "DEF", roleLabel: "Lewy Obrońca", x: 25, y: 68 },
      { slotId: "def_r", role: "DEF", roleLabel: "Prawy Obrońca", x: 75, y: 68 },
      { slotId: "mid_l", role: "MID", roleLabel: "Lewy Pomocnik", x: 20, y: 44 },
      { slotId: "mid_c", role: "MID", roleLabel: "Środkowy Pomocnik", x: 50, y: 46 },
      { slotId: "mid_r", role: "MID", roleLabel: "Prawy Pomocnik", x: 80, y: 44 },
      { slotId: "fwd", role: "FWD", roleLabel: "Napastnik", x: 50, y: 18 }
    ]
  },
  "1-2-1": {
    key: "1-2-1",
    name: "1-2-1 (Dynamiczny Orlik 5v5)",
    description: "Szybka gra na małym boisku: bramkarz, 1 stoper, 2 skrzydłowych i snajper.",
    playerCount: 5,
    slots: [
      { slotId: "gk", role: "GK", roleLabel: "Bramkarz", x: 50, y: 88 },
      { slotId: "def", role: "DEF", roleLabel: "Stoper / Obrońca", x: 50, y: 65 },
      { slotId: "mid_l", role: "MID", roleLabel: "Lewe Skrzydło", x: 24, y: 42 },
      { slotId: "mid_r", role: "MID", roleLabel: "Prawe Skrzydło", x: 76, y: 42 },
      { slotId: "fwd", role: "FWD", roleLabel: "Napastnik", x: 50, y: 18 }
    ]
  },
  "3-2-1": {
    key: "3-2-1",
    name: "3-2-1 (Żelazna Defensywa)",
    description: "Trójka z tyłu blokująca dostęp do bramki i szybkie wyjścia do kontry.",
    playerCount: 7,
    slots: [
      { slotId: "gk", role: "GK", roleLabel: "Bramkarz", x: 50, y: 88 },
      { slotId: "def_l", role: "DEF", roleLabel: "Lewy Obrońca", x: 20, y: 68 },
      { slotId: "def_c", role: "DEF", roleLabel: "Środkowy Obrońca", x: 50, y: 70 },
      { slotId: "def_r", role: "DEF", roleLabel: "Prawy Obrońca", x: 80, y: 68 },
      { slotId: "mid_l", role: "MID", roleLabel: "Lewy Pomocnik", x: 32, y: 44 },
      { slotId: "mid_r", role: "MID", roleLabel: "Prawy Pomocnik", x: 68, y: 44 },
      { slotId: "fwd", role: "FWD", roleLabel: "Napastnik", x: 50, y: 18 }
    ]
  },
  "2-2-2": {
    key: "2-2-2",
    name: "2-2-2 (Podwójne Uderzenie)",
    description: "Dwóch napastników siejących postrach w polu karnym rywala.",
    playerCount: 7,
    slots: [
      { slotId: "gk", role: "GK", roleLabel: "Bramkarz", x: 50, y: 88 },
      { slotId: "def_l", role: "DEF", roleLabel: "Lewy Obrońca", x: 30, y: 68 },
      { slotId: "def_r", role: "DEF", roleLabel: "Prawy Obrońca", x: 70, y: 68 },
      { slotId: "mid_l", role: "MID", roleLabel: "Środek / Lewa", x: 30, y: 45 },
      { slotId: "mid_r", role: "MID", roleLabel: "Środek / Prawa", x: 70, y: 45 },
      { slotId: "fwd_l", role: "FWD", roleLabel: "Lewy Napastnik", x: 35, y: 18 },
      { slotId: "fwd_r", role: "FWD", roleLabel: "Prawy Napastnik", x: 65, y: 18 }
    ]
  },
  "1-3-2": {
    key: "1-3-2",
    name: "1-3-2 (Ofensywny Diament)",
    description: "Maksymalny nacisk na atak i posiadanie piłki w środkowej strefie.",
    playerCount: 7,
    slots: [
      { slotId: "gk", role: "GK", roleLabel: "Bramkarz", x: 50, y: 88 },
      { slotId: "def", role: "DEF", roleLabel: "Ostatni Obrońca", x: 50, y: 68 },
      { slotId: "mid_l", role: "MID", roleLabel: "Lewe Skrzydło", x: 20, y: 45 },
      { slotId: "mid_c", role: "MID", roleLabel: "Rozgrywający", x: 50, y: 46 },
      { slotId: "mid_r", role: "MID", roleLabel: "Prawe Skrzydło", x: 80, y: 45 },
      { slotId: "fwd_l", role: "FWD", roleLabel: "Lewy Napastnik", x: 35, y: 18 },
      { slotId: "fwd_r", role: "FWD", roleLabel: "Prawy Napastnik", x: 65, y: 18 }
    ]
  }
};

export interface SquadSlotAssignment {
  slotId: string;
  userCardId: string; // ID of the specific user card chosen
  cardId: string; // card definition ID
}

export interface SquadEvaluationResult {
  squadRating: number;
  attackRating: number;
  midfieldRating: number;
  defenseRating: number;
  goalkeeperRating: number;
  chemistryScore: number;
  assignedCount: number;
  totalSlots: number;
  isComplete: boolean;
  validationErrors: string[];
}

/**
 * CALCULATE SQUAD RATINGS & VALIDATION
 */
export function evaluateSquad(params: {
  formation: FormationKey;
  assignments: SquadSlotAssignment[];
  userCards: UserCard[];
  captainCardId?: string | null;
  coachCardId?: string | null;
  stadiumCardId?: string | null;
  crestCardId?: string | null;
}): SquadEvaluationResult {
  const {
    formation,
    assignments,
    userCards,
    captainCardId,
    coachCardId,
    stadiumCardId,
    crestCardId
  } = params;

  const formationDef = SQUAD_FORMATIONS[formation] || SQUAD_FORMATIONS["2-3-1"];
  const totalSlots = formationDef.slots.length;
  const validationErrors: string[] = [];

  // Check unique physical card instances
  const usedUserCardIds = new Set<string>();
  assignments.forEach(a => {
    if (usedUserCardIds.has(a.userCardId)) {
      validationErrors.push("Nie możesz użyć tego samego egzemplarza karty na dwóch pozycjach.");
    }
    usedUserCardIds.add(a.userCardId);
  });

  // Calculate ratings per line
  const attackRatings: number[] = [];
  const midRatings: number[] = [];
  const defRatings: number[] = [];
  let gkRating = 70;
  let assignedCount = 0;

  formationDef.slots.forEach(slot => {
    const assignment = assignments.find(a => a.slotId === slot.slotId);
    if (!assignment) return;

    const userCard = userCards.find(uc => uc.id === assignment.userCardId || uc.card_id === assignment.cardId);
    if (!userCard || !userCard.card_definition) return;

    assignedCount++;
    const cardDef = userCard.card_definition;
    let cardOVR = calculateCardOVR({
      cardType: cardDef.card_type,
      rarity: cardDef.rarity,
      isGoalkeeper: slot.role === "GK"
    });

    // Captain bonus (+2)
    if (captainCardId && (cardDef.id === captainCardId || userCard.id === captainCardId)) {
      cardOVR += 2;
    }

    if (slot.role === "FWD") attackRatings.push(cardOVR);
    else if (slot.role === "MID") midRatings.push(cardOVR);
    else if (slot.role === "DEF") defRatings.push(cardOVR);
    else if (slot.role === "GK") gkRating = cardOVR;
  });

  const avg = (arr: number[], fallback: number = 70) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : fallback;

  let attack = avg(attackRatings, 70);
  let midfield = avg(midRatings, 70);
  let defense = avg(defRatings, 70);
  let goalkeeper = gkRating;

  // Coach bonuses (+2 to specific lines)
  if (coachCardId) {
    midfield += 1;
    attack += 1;
  }
  // Stadium bonus (+1 overall)
  if (stadiumCardId) {
    defense += 1;
  }
  // Crest bonus (+2 team spirit)
  let chemBonus = 0;
  if (crestCardId) {
    chemBonus = 5;
  }

  const squadRating = Math.min(
    99,
    Math.round((attack * 0.3) + (midfield * 0.3) + (defense * 0.25) + (goalkeeper * 0.15))
  );

  // Chemistry: proportional to filled slots + captain + crest
  const fillRate = totalSlots > 0 ? (assignedCount / totalSlots) : 0;
  const chemistryScore = Math.min(100, Math.round(fillRate * 90 + (captainCardId ? 5 : 0) + chemBonus));

  const isComplete = assignedCount === totalSlots && validationErrors.length === 0;

  return {
    squadRating,
    attackRating: Math.min(99, attack),
    midfieldRating: Math.min(99, midfield),
    defenseRating: Math.min(99, defense),
    goalkeeperRating: Math.min(99, goalkeeper),
    chemistryScore,
    assignedCount,
    totalSlots,
    isComplete,
    validationErrors
  };
}
