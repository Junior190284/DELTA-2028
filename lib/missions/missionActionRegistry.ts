/**
 * DELTA SMART MISSION ACTION REGISTRY 2.0 (DELTA-050D)
 *
 * Centralny rejestr akcji misji łączący rzeczywisty katalog misji,
 * warunki ich ukończenia oraz natychmiastowe nawigacje do dedykowanych modułów:
 * - Przejście do konkretnej zakładki (tab: collection, training, matches, players, hall, chronicle)
 * - Otwarcie dedykowanego modala (action: typer, tactics, photobooth, knowledge, seasonpass)
 * - Uruchomienie minigry (action: skillgames, mode: free_kicks / gk_reflex)
 * - Koło fortuny INFERNO (action: dailyspin)
 * - Bezpieczne wyjaśnienie niedostępności lub braku uprawnień
 */

export type MissionActionType =
  | "NAVIGATE_TAB"
  | "OPEN_MODAL"
  | "LAUNCH_MINIGAME"
  | "DAILY_SPIN"
  | "EXPLAIN_UNAVAILABLE";

export interface MissionActionTarget {
  type: MissionActionType;
  targetTab?: string;
  modalAction?: string;
  minigameMode?: "free_kicks" | "gk_reflex";
  ctaLabel: string;
  ctaContinuingLabel?: string;
  hint?: string;
  unavailableReason?: string;
  requiresStaff?: boolean;
  requiresParent?: boolean;
}

export interface MissionResolution {
  missionId: string;
  action: MissionActionTarget;
  isAvailable: boolean;
  unavailableExplanation?: string;
}

/**
 * Zdefiniowane reguły dla misji codziennych i tygodniowych z lib/game/economy.ts
 * oraz DeltaDailyMissionsModal fallback templates.
 */
export const MISSION_ACTION_REGISTRY: Record<string, MissionActionTarget> = {
  // 1. Koło Fortuny INFERNO
  "daily_spin": {
    type: "DAILY_SPIN",
    ctaLabel: "ZAKRĘĆ KOŁEM",
    ctaContinuingLabel: "ZAKRĘĆ KOŁEM",
    hint: "Darmowy spin dostępny raz na 24h w Szatni / Kolekcji INFERNO",
  },
  "d1": {
    type: "DAILY_SPIN",
    ctaLabel: "ZAKRĘĆ KOŁEM",
    ctaContinuingLabel: "ZAKRĘĆ KOŁEM",
    hint: "Darmowy spin dostępny raz na 24h w Szatni / Kolekcji INFERNO",
  },

  // 2. Minigra: Trening Umiejętności / Celność / Refleks
  "daily_minigame": {
    type: "LAUNCH_MINIGAME",
    minigameMode: "free_kicks",
    ctaLabel: "TRENUJ W MINIGRZE",
    ctaContinuingLabel: "KONTYNUUJ TRENING",
    hint: "Zagraj w rzuty wolne lub refleks bramkarza, aby zdobyć punkty",
  },
  "d3": {
    type: "LAUNCH_MINIGAME",
    minigameMode: "free_kicks",
    ctaLabel: "TRENUJ W MINIGRZE",
    ctaContinuingLabel: "KONTYNUUJ TRENING",
    hint: "Zagraj w rzuty wolne lub refleks bramkarza, aby zdobyć punkty",
  },
  "weekly_score": {
    type: "LAUNCH_MINIGAME",
    minigameMode: "free_kicks",
    ctaLabel: "ZDOBYWAJ PUNKTY (500)",
    ctaContinuingLabel: "KONTYNUUJ WYZWANIE",
    hint: "Zdobądź łącznie 500 punktów w minigrach treningowych",
  },

  // 3. Typer DELTA / Pojedynki i Liga
  "typer": {
    type: "OPEN_MODAL",
    modalAction: "typer",
    ctaLabel: "TYPUJ WYNIKI",
    ctaContinuingLabel: "TYPUJ WYNIKI",
    hint: "Typuj mecze weekendowe i zdobywaj punkty DP",
  },

  // 4. Kolekcja kart & Skarbiec INFERNO
  "collection": {
    type: "NAVIGATE_TAB",
    targetTab: "collection",
    ctaLabel: "OTWÓRZ SKARBIEC",
    ctaContinuingLabel: "PRZEJDŹ DO KART",
    hint: "Otwieraj paczki, przeglądaj karty 3D i buduj skład w albumie",
  },
  "w3": {
    type: "NAVIGATE_TAB",
    targetTab: "collection",
    ctaLabel: "ZDOBĄDŹ KARTY W SKARBCU",
    ctaContinuingLabel: "PRZEJDŹ DO SKARBCU",
    hint: "Otwórz paczki lub wymieniaj karty na Giełdzie Szatni",
  },

  // 5. Kącik Wiedzy & Quiz taktyczny
  "knowledge": {
    type: "OPEN_MODAL",
    modalAction: "knowledge",
    ctaLabel: "ZALICZ LEKCJĘ & QUIZ",
    ctaContinuingLabel: "KONTYNUUJ NAUKĘ",
    hint: "Lekcje taktyczne, dieta sportowa i zasady gry DELTA",
  },
  "w2": {
    type: "OPEN_MODAL",
    modalAction: "knowledge",
    ctaLabel: "PRZEJDŹ DO KĄCIKA WIEDZY",
    ctaContinuingLabel: "KONTYNUUJ QUIZY",
    hint: "Zalicz min. 2 lekcje taktyczne z wynikiem powyżej 80%",
  },

  // 6. Treningi i obecności drużyny
  "training": {
    type: "NAVIGATE_TAB",
    targetTab: "training",
    ctaLabel: "ZOBACZ TRENINGI",
    ctaContinuingLabel: "POTWIERDŹ OBECNOŚĆ",
    hint: "Sprawdź frekwencję, historię gierek i zgłoś obecność",
  },

  // 7. Mecze & Match Hub
  "matches": {
    type: "NAVIGATE_TAB",
    targetTab: "matches",
    ctaLabel: "ZOBACZ TERMINARZ",
    ctaContinuingLabel: "MATCHDAY HUB",
    hint: "Terminarz ligowy, zbiórki i składy meczowe",
  },
  "w1": {
    type: "NAVIGATE_TAB",
    targetTab: "training",
    ctaLabel: "POTWIERDŹ FREKWENCJĘ",
    ctaContinuingLabel: "SPRAWDŹ TRENINGI",
    hint: "Ustaw 11-tkę i zgłoś obecność na 3 treningach w tygodniu",
  },

  // 8. Streak & Zaangażowanie
  "weekly_streak": {
    type: "NAVIGATE_TAB",
    targetTab: "home",
    ctaLabel: "LOGUJ SIĘ CODZIENNIE",
    ctaContinuingLabel: "UTRZYMAJ SERIĘ",
    hint: "Odwiedzaj DELTA GM min. 4 dni w tygodniu, by utrzymać płomień serii",
  },

  // 9. Arena Pojedynków Kart (Wdrożona częściowo, lokalny stan pojedynków)
  "daily_battle": {
    type: "OPEN_MODAL",
    modalAction: "battle",
    ctaLabel: "POJEDYNEK KART 1V1",
    ctaContinuingLabel: "DOŁĄCZ DO ARENY",
    hint: "Zagraj pojedynek kart w Arenie przeciwko CPU",
  },
  "d2": {
    type: "OPEN_MODAL",
    modalAction: "battle",
    ctaLabel: "POJEDYNEK KART 1V1",
    ctaContinuingLabel: "DOŁĄCZ DO ARENY",
    hint: "Zagraj pojedynek kart w Arenie przeciwko CPU",
  },
  "weekly_battles": {
    type: "OPEN_MODAL",
    modalAction: "battle",
    ctaLabel: "ARENA POJEDYNKÓW",
    ctaContinuingLabel: "WYGRAJ 3 POJEDYNKI",
    hint: "Wygraj 3 pojedynki w Arenie Kart (1v1 lub 3v3)",
  },

  // 10. Tablica Taktyczna
  "tactics": {
    type: "OPEN_MODAL",
    modalAction: "tactics",
    ctaLabel: "TABLICA TAKTYCZNA 3D",
    ctaContinuingLabel: "USTAW SKŁAD",
    hint: "Ustaw formacje 5v5 i 6v6 oraz analizuj taktykę",
  },

  // 11. Rozwój zawodnika — Road to Glory
  "road_to_glory": {
    type: "NAVIGATE_TAB",
    targetTab: "players",
    ctaLabel: "PROFIL & KARIERA",
    ctaContinuingLabel: "ŚCIEŻKA ROZWOJU",
    hint: "Zobacz profil zawodnika, odznaki, historię meczową i poziom stadionu",
  },

  // 12. DELTA GAME INFERNO / Świat 3D
  "game_inferno": {
    type: "LAUNCH_MINIGAME",
    minigameMode: "free_kicks",
    ctaLabel: "ZAGRAJ W MINIGRĘ",
    ctaContinuingLabel: "ROZPOCZNIJ ROZGRYWKĘ",
    hint: "Mobilny tryb gry zoptymalizowany pod dotyk i silnik 60 FPS",
  },
};

/**
 * Rozpoznaje i mapuje identyfikator misji na konkretny cel w Mission Action Registry.
 * Obsługuje dynamiczne prefiksy identyfikatorów z timestampami np. `daily_spin_2026-11-26`.
 */
export function resolveMissionAction(
  missionId: string,
  userRole?: string
): MissionActionTarget {
  // 1. Sprawdź dokładne dopasowanie
  if (MISSION_ACTION_REGISTRY[missionId]) {
    return MISSION_ACTION_REGISTRY[missionId];
  }

  // 2. Sprawdź prefiksy dynamiczne (np. daily_spin_..., daily_battle_..., weekly_battles_...)
  const prefix = missionId.replace(/_\d{4}-\d{2}-\d{2}$/, "");
  if (MISSION_ACTION_REGISTRY[prefix]) {
    return MISSION_ACTION_REGISTRY[prefix];
  }

  // 3. Sprawdź słowa kluczowe w ID
  const lower = missionId.toLowerCase();
  if (lower.includes("spin") || lower.includes("kolo") || lower.includes("kołem")) {
    return MISSION_ACTION_REGISTRY["daily_spin"];
  }
  if (lower.includes("minigame") || lower.includes("celnosc") || lower.includes("score") || lower.includes("trening")) {
    return MISSION_ACTION_REGISTRY["daily_minigame"];
  }
  if (lower.includes("battle") || lower.includes("pojedynek")) {
    return MISSION_ACTION_REGISTRY["daily_battle"];
  }
  if (lower.includes("streak") || lower.includes("seria")) {
    return MISSION_ACTION_REGISTRY["weekly_streak"];
  }
  if (lower.includes("quiz") || lower.includes("wiedza") || lower.includes("erudyta")) {
    return MISSION_ACTION_REGISTRY["knowledge"];
  }
  if (lower.includes("card") || lower.includes("paczka") || lower.includes("karta") || lower.includes("skarbiec")) {
    return MISSION_ACTION_REGISTRY["collection"];
  }
  if (lower.includes("mecz") || lower.includes("match")) {
    return MISSION_ACTION_REGISTRY["matches"];
  }
  if (lower.includes("typer")) {
    return MISSION_ACTION_REGISTRY["typer"];
  }

  // Fallback: bezpieczne wyjaśnienie i odesłanie do Pulpitu
  return {
    type: "NAVIGATE_TAB",
    targetTab: "home",
    ctaLabel: "PRZEJDŹ DO ZADANIA",
    ctaContinuingLabel: "KONTYNUUJ W PANELU",
    hint: "Aktywność dostępna w głównym panelu klubowym DELTA GM",
  };
}
