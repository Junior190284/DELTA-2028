export type SpecialTitleRarity = "common" | "rare" | "epic" | "legendary";

export interface SpecialTitleTheme {
  bg: string;
  border: string;
  text: string;
  glow: string;
  accent: string;
  shimmer?: string;
}

export interface SpecialTitleDefinition {
  id: string;
  label: string;
  shortLabel?: string;
  iconName: "Crown" | "Flame" | "Star" | "Dumbbell" | "Shield" | "Award" | "Medal";
  rarity: SpecialTitleRarity;
  theme: SpecialTitleTheme;
  unlockCondition: string;
  description: string;
}

export const SPECIAL_TITLES_REGISTRY: Record<string, SpecialTitleDefinition> = {
  kapitan_delta: {
    id: "kapitan_delta",
    label: "KAPITAN DELTA",
    shortLabel: "KAPITAN",
    iconName: "Crown",
    rarity: "legendary",
    theme: {
      bg: "linear-gradient(135deg, rgba(150, 20, 32, 0.88) 0%, rgba(55, 10, 18, 0.94) 100%)",
      border: "rgba(255, 195, 75, 0.85)",
      text: "#fff2d6",
      glow: "0 0 18px rgba(255, 185, 60, 0.5)",
      accent: "#ffca58",
      shimmer: "linear-gradient(90deg, transparent, rgba(255, 230, 160, 0.7), transparent)"
    },
    unlockCondition: "Mianowany kapitanem zespołu w meczach ligowych K.S. Delta Warszawa",
    description: "Lider zespołu na boisku i poza nim. Złota korona i szkarłatny medalion honorowy."
  },
  hat_trick_hero: {
    id: "hat_trick_hero",
    label: "HAT-TRICK HERO",
    shortLabel: "HAT-TRICK",
    iconName: "Flame",
    rarity: "epic",
    theme: {
      bg: "linear-gradient(135deg, rgba(185, 35, 15, 0.88) 0%, rgba(75, 12, 10, 0.94) 100%)",
      border: "rgba(255, 120, 50, 0.85)",
      text: "#ffede4",
      glow: "0 0 18px rgba(255, 80, 30, 0.6)",
      accent: "#ff6a38",
      shimmer: "linear-gradient(90deg, transparent, rgba(255, 160, 100, 0.7), transparent)"
    },
    unlockCondition: "Zdobycie trzech bramek w jednym oficjalnym meczu turniejowym lub ligowym",
    description: "Strzelec trzech goli. Płonące gwiazdy i dynamiczne szkarłatne wykończenie."
  },
  pilkarz_tygodnia: {
    id: "pilkarz_tygodnia",
    label: "PIŁKARZ TYGODNIA",
    shortLabel: "POTW",
    iconName: "Star",
    rarity: "epic",
    theme: {
      bg: "linear-gradient(135deg, rgba(135, 95, 12, 0.88) 0%, rgba(50, 35, 8, 0.94) 100%)",
      border: "rgba(255, 215, 95, 0.85)",
      text: "#fffbe8",
      glow: "0 0 16px rgba(255, 215, 75, 0.55)",
      accent: "#ffd764",
      shimmer: "linear-gradient(90deg, transparent, rgba(255, 240, 180, 0.7), transparent)"
    },
    unlockCondition: "Najwyższa nota trenerska i zaangażowanie w cyklu tygodniowym",
    description: "Wyróżnienie tygodnia. Złota gwiazda i promienista aureola chwały."
  },
  training_hero: {
    id: "training_hero",
    label: "TRAINING HERO",
    shortLabel: "TRENING",
    iconName: "Dumbbell",
    rarity: "rare",
    theme: {
      bg: "linear-gradient(135deg, rgba(35, 45, 62, 0.88) 0%, rgba(15, 20, 30, 0.94) 100%)",
      border: "rgba(135, 185, 235, 0.75)",
      text: "#eaf3ff",
      glow: "0 0 14px rgba(110, 175, 240, 0.45)",
      accent: "#8ec5fc"
    },
    unlockCondition: "100% frekwencji i maksymalne zaangażowanie na jednostkach treningowych",
    description: "Mistrz pracy na treningu. Stalowo-błękitny metaliczny akcent i symbol siły."
  },
  matchday_hero: {
    id: "matchday_hero",
    label: "MATCHDAY HERO",
    shortLabel: "MATCHDAY",
    iconName: "Shield",
    rarity: "rare",
    theme: {
      bg: "linear-gradient(135deg, rgba(150, 20, 28, 0.88) 0%, rgba(48, 8, 12, 0.94) 100%)",
      border: "rgba(255, 85, 85, 0.8)",
      text: "#ffebeb",
      glow: "0 0 15px rgba(255, 55, 55, 0.5)",
      accent: "#ff4d4d"
    },
    unlockCondition: "Bohater dnia meczowego, kluczowy wpływ na zwycięstwo zespołu",
    description: "Tarcza obronna i kluczowe interwencje w najważniejszych momentach meczu."
  },
  treningow_10: {
    id: "treningow_10",
    label: "10 TRENINGÓW",
    shortLabel: "10 SESJI",
    iconName: "Award",
    rarity: "common",
    theme: {
      bg: "linear-gradient(135deg, rgba(48, 38, 55, 0.88) 0%, rgba(20, 15, 25, 0.94) 100%)",
      border: "rgba(195, 165, 225, 0.7)",
      text: "#f6efff",
      glow: "0 0 12px rgba(185, 145, 225, 0.38)",
      accent: "#c79eed"
    },
    unlockCondition: "Zaliczenie kamienia milowego 10 zrealizowanych jednostek treningowych",
    description: "Pierwszy wielki kamień milowy regularności i pracy nad własnym rozwojem."
  },
  mvp_turnieju: {
    id: "mvp_turnieju",
    label: "MVP TURNIEJU",
    shortLabel: "MVP",
    iconName: "Medal",
    rarity: "legendary",
    theme: {
      bg: "linear-gradient(135deg, rgba(185, 95, 18, 0.9) 0%, rgba(70, 30, 8, 0.95) 100%)",
      border: "rgba(255, 215, 110, 0.95)",
      text: "#fffdf0",
      glow: "0 0 22px rgba(255, 195, 60, 0.65)",
      accent: "#ffc13b",
      shimmer: "linear-gradient(90deg, transparent, rgba(255, 245, 200, 0.85), transparent)"
    },
    unlockCondition: "Tytuł Najbardziej Wartościowego Gracza całego turnieju finałowego",
    description: "Najwyższy indywidualny laur turnieju. Prestiżowy medal i złote wykończenie."
  }
};

export function getSpecialTitle(titleId?: string | null): SpecialTitleDefinition | null {
  if (!titleId || titleId === "none") return null;
  return SPECIAL_TITLES_REGISTRY[titleId] || null;
}

export const SPECIAL_TITLES_LIST = Object.values(SPECIAL_TITLES_REGISTRY);

/**
 * DELTA V5.1 Smart Typography Engine for Player Surnames
 * - Handles auto-scaling without text truncation (no ellipses!)
 * - Graceful two-line splitting for exceptionally long or compound surnames
 * - Native Polish syllable awareness (e.g. BRZĘCZYSZ- / CZYKIEWICZ)
 */
export interface FormattedPlayerName {
  lines: string[];
  isMultiLine: boolean;
  lengthCategory: "short" | "medium" | "long" | "extra-long";
  charCount: number;
}

function isPolishVowel(char?: string): boolean {
  if (!char) return false;
  return "AĄEĘIOÓUY".includes(char.toUpperCase());
}

export function findSmartSyllableBreak(word: string): number {
  const len = word.length;
  if (len <= 8) return Math.floor(len / 2);

  const mid = Math.floor(len / 2);
  const minIdx = Math.max(3, mid - 3);
  const maxIdx = Math.min(len - 3, mid + 3);

  // 1. Prefer break between Polish consonant clusters or after standard digraphs (SZ, CZ, RZ, DZ, CH)
  for (let i = mid; i <= maxIdx; i++) {
    const pair = word.slice(i - 2, i);
    if (["SZ", "CZ", "RZ", "DZ", "CH"].includes(pair) && !isPolishVowel(word[i])) {
      return i;
    }
  }
  for (let i = mid - 1; i >= minIdx; i--) {
    const pair = word.slice(i - 2, i);
    if (["SZ", "CZ", "RZ", "DZ", "CH"].includes(pair) && !isPolishVowel(word[i])) {
      return i;
    }
  }

  // 2. Break after a vowel followed by a consonant (open syllable)
  for (let i = mid; i <= maxIdx; i++) {
    if (isPolishVowel(word[i - 1]) && !isPolishVowel(word[i])) {
      return i;
    }
  }
  for (let i = mid - 1; i >= minIdx; i--) {
    if (isPolishVowel(word[i - 1]) && !isPolishVowel(word[i])) {
      return i;
    }
  }

  return mid;
}

export function formatPlayerName(rawName: string): FormattedPlayerName {
  const trimmed = (rawName || "").trim().toUpperCase();
  if (!trimmed) {
    return {
      lines: [""],
      isMultiLine: false,
      lengthCategory: "short",
      charCount: 0
    };
  }

  // 1. Explicit line break provided
  if (trimmed.includes("\n")) {
    const explicitLines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    return {
      lines: explicitLines,
      isMultiLine: explicitLines.length > 1,
      lengthCategory: "extra-long",
      charCount: trimmed.length
    };
  }

  // 2. Hyphenated compound surname (e.g. LEWANDOWSKI-KOWALSKI)
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((p) => p.trim());
    if (parts.length === 2 && (trimmed.length > 11 || parts[0].length >= 7 || parts[1].length >= 7)) {
      return {
        lines: [`${parts[0]}-`, parts[1]],
        isMultiLine: true,
        lengthCategory: trimmed.length > 16 ? "extra-long" : "long",
        charCount: trimmed.length
      };
    }
  }

  // 3. Multi-word surname with space (e.g. ALEXANDER ARNOLD, DE BRUYNE)
  if (trimmed.includes(" ")) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (trimmed.length > 12 && words.length >= 2) {
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(" ");
      const line2 = words.slice(mid).join(" ");
      return {
        lines: [line1, line2],
        isMultiLine: true,
        lengthCategory: trimmed.length > 16 ? "extra-long" : "long",
        charCount: trimmed.length
      };
    }
  }

  // 4. Single-word names
  if (trimmed.length <= 8) {
    // Short: e.g. RYBACKI (7), BĄK (3), NOWAK (5)
    return {
      lines: [trimmed],
      isMultiLine: false,
      lengthCategory: "short",
      charCount: trimmed.length
    };
  }

  if (trimmed.length <= 12) {
    // Medium: e.g. LEWANDOWSKI (11), KOWALCZYK (9)
    return {
      lines: [trimmed],
      isMultiLine: false,
      lengthCategory: "medium",
      charCount: trimmed.length
    };
  }

  // Exceptionally long single-word surname > 12 chars (e.g. BRZĘCZYSZCZYKIEWICZ 18 chars)
  // Gracefully split into 2 rows with a hyphen
  const splitIdx = findSmartSyllableBreak(trimmed);
  const line1 = `${trimmed.slice(0, splitIdx)}-`;
  const line2 = trimmed.slice(splitIdx);

  return {
    lines: [line1, line2],
    isMultiLine: true,
    lengthCategory: "extra-long",
    charCount: trimmed.length
  };
}

