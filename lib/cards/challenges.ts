/**
 * DELTA WARSZAWA 2018 GM — PANINI & COLLECTION CHALLENGES 2.0
 * Unified challenge definition, condition evaluator and rewards.
 */

import { UserCard } from "./types";

export interface PaniniChallengeDef {
  id: string;
  title: string;
  category: "player" | "rarity" | "squad" | "special" | "collector";
  icon: string;
  description: string;
  requirementDesc: string;
  targetCount: number;
  reward: {
    deltaPoints: number;
    packTypeId?: string;
    badgeName?: string;
    description: string;
  };
}

export const PANINI_CHALLENGES: PaniniChallengeDef[] = [
  {
    id: "challenge-five-one-player",
    title: "Fan Jednego Diabełka",
    category: "player",
    icon: "⭐",
    description: "Zbierz różne edycje kart tego samego zawodnika DELTA.",
    requirementDesc: "Posiadaj min. 3 różne karty jednego zawodnika",
    targetCount: 3,
    reward: {
      deltaPoints: 100,
      badgeName: "Oddany Kibic",
      description: "100 DP + Odznaka Oddany Kibic"
    }
  },
  {
    id: "challenge-inferno-owner",
    title: "Płomień INFERNO",
    category: "rarity",
    icon: "🌋",
    description: "Traf najrzadszą i najgorętszą kartę w całej kolekcji!",
    requirementDesc: "Zdobądź min. 1 kartę o rzadkości INFERNO",
    targetCount: 1,
    reward: {
      deltaPoints: 250,
      packTypeId: "pack_gold",
      badgeName: "Mistrz Inferno",
      description: "250 DP + Złota Paczka + Odznaka"
    }
  },
  {
    id: "challenge-icon-owner",
    title: "Dotyk Legendy",
    category: "rarity",
    icon: "👑",
    description: "Posiadaj w albumie kartę o statusie DELTA ICON lub LEGENDARY.",
    requirementDesc: "Zdobądź min. 1 kartę Legendary / Delta Icon",
    targetCount: 1,
    reward: {
      deltaPoints: 150,
      badgeName: "Kolekcjoner Ikon",
      description: "150 DP + Odznaka Kolekcjoner Ikon"
    }
  },
  {
    id: "challenge-defensive-line",
    title: "Żelazny Mur Obrony",
    category: "squad",
    icon: "🛡️",
    description: "Skompletuj karty obrońców DELTY zabezpieczających dostęp do bramki.",
    requirementDesc: "Zbierz min. 3 karty zawodników z pozycji OBRONA",
    targetCount: 3,
    reward: {
      deltaPoints: 100,
      badgeName: "Defensywny Mur",
      description: "100 DP + Odznaka Defensywny Mur"
    }
  },
  {
    id: "challenge-matchday-trio",
    title: "Bohaterowie Dnia Meczowego",
    category: "squad",
    icon: "🔥",
    description: "Zbierz karty Matchday Hero upamiętniające oficjalne spotkania.",
    requirementDesc: "Posiadaj min. 3 karty typu Matchday Hero",
    targetCount: 3,
    reward: {
      deltaPoints: 120,
      packTypeId: "pack_standard",
      description: "120 DP + Standardowa Paczka Kart"
    }
  },
  {
    id: "challenge-full-squad",
    title: "Cała Drużyna Razem",
    category: "collector",
    icon: "👥",
    description: "Zbierz karty różnych zawodników z kadry zespołu DELTA 2018 GM.",
    requirementDesc: "Zbierz min. 10 unikalnych zawodników",
    targetCount: 10,
    reward: {
      deltaPoints: 300,
      packTypeId: "pack_gold",
      badgeName: "Skompletowany Skład",
      description: "300 DP + Złota Paczka Kart"
    }
  },
  {
    id: "challenge-coach-card",
    title: "Głos z Ławki Trenerskiej",
    category: "special",
    icon: "📋",
    description: "Zdobądź kartę Sztabu Szkoleniowego DELTA Warszawa.",
    requirementDesc: "Posiadaj min. 1 kartę Trenera",
    targetCount: 1,
    reward: {
      deltaPoints: 100,
      badgeName: "Taktyk DELTY",
      description: "100 DP + Odznaka Taktyka"
    }
  },
  {
    id: "challenge-stadium-card",
    title: "Twierdza Jordanek",
    category: "special",
    icon: "🏟️",
    description: "Odblokuj kartę boiska lub obiektu domowego DELTY.",
    requirementDesc: "Posiadaj min. 1 kartę Stadionu / Obiektu",
    targetCount: 1,
    reward: {
      deltaPoints: 100,
      badgeName: "Gospodarz Obiektu",
      description: "100 DP + Odznaka Gospodarza"
    }
  },
  {
    id: "challenge-crest-card",
    title: "Czerwono-Czarna Duma",
    category: "special",
    icon: "🛡️",
    description: "Zdobądź pamiątkową kartę z oficjalnym herbem klubu DELTA.",
    requirementDesc: "Posiadaj specjalną kartę Herbu Klubu",
    targetCount: 1,
    reward: {
      deltaPoints: 200,
      badgeName: "Serce DELTY",
      description: "200 DP + Prestiżowa Odznaka Klubu"
    }
  },
  {
    id: "challenge-collector-20",
    title: "Wielki Klaser Panini",
    category: "collector",
    icon: "🏆",
    description: "Rozbuduj swój album do poziomu prawdziwego kolekcjonera.",
    requirementDesc: "Zbierz min. 20 unikalnych wzorów kart w albumie",
    targetCount: 20,
    reward: {
      deltaPoints: 500,
      packTypeId: "pack_inferno",
      badgeName: "Mistrz Klaseru",
      description: "500 DP + Paczka INFERNO + Tytuł Mistrza"
    }
  }
];

export interface ChallengeEvaluationResult {
  challengeId: string;
  currentCount: number;
  targetCount: number;
  progressPercent: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

/**
 * EVALUATE ALL CHALLENGES AGAINST USER'S COLLECTION
 */
export function evaluateUserChallenges(
  userCards: UserCard[],
  claimedChallengeIds: string[] = []
): (PaniniChallengeDef & ChallengeEvaluationResult)[] {
  // Map cards
  const cardsByPlayer: Record<string, number> = {};
  let maxCardsForOnePlayer = 0;
  let infernoCount = 0;
  let iconCount = 0;
  let defendersCount = 0;
  let matchdayHeroCount = 0;
  const uniquePlayers = new Set<string>();
  let coachCount = 0;
  let stadiumCount = 0;
  let crestCount = 0;

  userCards.forEach(uc => {
    const card = uc.card_definition;
    if (!card) return;

    if (card.player_id) {
      cardsByPlayer[card.player_id] = (cardsByPlayer[card.player_id] || 0) + 1;
      if (cardsByPlayer[card.player_id] > maxCardsForOnePlayer) {
        maxCardsForOnePlayer = cardsByPlayer[card.player_id];
      }
      uniquePlayers.add(card.player_id);
    }

    if (card.rarity === "inferno") infernoCount++;
    if (card.rarity === "legendary" || card.card_type === "legend" || card.card_type === "DELTA_ICON") iconCount++;

    const pos = (card.player?.position || "").toUpperCase();
    if (pos.includes("OBR") || pos.includes("DEF") || pos.includes("ŚRODEK OBRONY") || pos.includes("BOCZNY")) {
      defendersCount++;
    }

    if (card.card_type === "matchday" || card.card_type === "MATCHDAY_HERO") {
      matchdayHeroCount++;
    }

    if (card.card_type === "coach" || card.card_type === "COACH") {
      coachCount++;
    }

    if (card.card_type === "stadium" || card.card_type === "STADIUM") {
      stadiumCount++;
    }

    if (card.card_type === "crest" || card.card_type === "CLUB_CREST") {
      crestCount++;
    }
  });

  return PANINI_CHALLENGES.map(ch => {
    let current = 0;

    switch (ch.id) {
      case "challenge-five-one-player":
        current = maxCardsForOnePlayer;
        break;
      case "challenge-inferno-owner":
        current = infernoCount;
        break;
      case "challenge-icon-owner":
        current = iconCount;
        break;
      case "challenge-defensive-line":
        current = defendersCount;
        break;
      case "challenge-matchday-trio":
        current = matchdayHeroCount;
        break;
      case "challenge-full-squad":
        current = uniquePlayers.size;
        break;
      case "challenge-coach-card":
        current = coachCount;
        break;
      case "challenge-stadium-card":
        current = stadiumCount;
        break;
      case "challenge-crest-card":
        current = crestCount;
        break;
      case "challenge-collector-20":
        current = userCards.length;
        break;
      default:
        current = 0;
    }

    const isCompleted = current >= ch.targetCount;
    const isClaimed = claimedChallengeIds.includes(ch.id);
    const progressPercent = Math.min(100, Math.round((current / ch.targetCount) * 100));

    return {
      ...ch,
      challengeId: ch.id,
      currentCount: current,
      targetCount: ch.targetCount,
      progressPercent,
      isCompleted,
      isClaimed
    };
  });
}
