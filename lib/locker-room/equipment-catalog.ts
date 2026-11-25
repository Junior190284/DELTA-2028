/**
 * DELTA INFERNO — ETAP V7G.2A
 * PLAYER LOCKER ROOM — DEMO EQUIPMENT CATALOG
 *
 * Bezpieczny, w 100% lokalny katalog wyposażenia szatni zawodnika.
 * Definiuje 6 kanonicznych kategorii sportowych, stany przedmiotów
 * (EQUIPPED / AVAILABLE / LOCKED) oraz warunki odblokowania.
 *
 * REGULA BEZPIECZEŃSTWA:
 * Całkowity zakaz zapisu do Supabase, localStorage i mutacji danych profilu.
 */

export type LockerCategory = 
  | "jerseys" 
  | "shorts" 
  | "socks" 
  | "boots" 
  | "balls" 
  | "accessories";

export type EquipmentState = "EQUIPPED" | "AVAILABLE" | "LOCKED";

export interface EquipmentStyleModifiers {
  tintFilter?: string;
  accentColor?: string;
  badgeLabel?: string;
  glowAura?: string;
  scale?: number;
  indicatorIcon?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: LockerCategory;
  categoryLabel: string;
  description: string;
  rarity: "STANDARD" | "PREMIUM" | "INFERNO" | "LEGEND";
  accentColor: string;
  defaultState: EquipmentState;
  unlockCondition?: string;
  styleModifiers: EquipmentStyleModifiers;
}

export interface CategoryDefinition {
  id: LockerCategory;
  label: string;
  iconName: string;
  description: string;
}

export const LOCKER_CATEGORIES: CategoryDefinition[] = [
  {
    id: "jerseys",
    label: "Koszulki",
    iconName: "Shirt",
    description: "Oficjalne trykoty meczowe i treningowe K.S. Delta Warszawa"
  },
  {
    id: "shorts",
    label: "Spodenki",
    iconName: "Scissors",
    description: "Czarne i czerwone spodenki meczowe z herbem klubu"
  },
  {
    id: "socks",
    label: "Getry",
    iconName: "Footprints",
    description: "Getry piłkarskie ze strefą kompresji i wsparciem ścięgna Achillesa"
  },
  {
    id: "boots",
    label: "Buty",
    iconName: "Sparkles",
    description: "Korki piłkarskie na murawę naturalną i sztuczną (FG / AG)"
  },
  {
    id: "balls",
    label: "Piłki",
    iconName: "CircleDot",
    description: "Oficjalne piłki meczowe i treningowe akademii"
  },
  {
    id: "accessories",
    label: "Akcesoria",
    iconName: "Shield",
    description: "Opaski kapitańskie, bidony i ochraniacze klubowe"
  }
];

export const DEMO_EQUIPMENT_ITEMS: EquipmentItem[] = [
  // 1. KOSZULKI
  {
    id: "jersey_delta_home",
    name: "Koszulka DELTA HOME 2026/27",
    category: "jerseys",
    categoryLabel: "Koszulki",
    description: "Oficjalna czerwona koszulka domowa z herbem DELTY i dynamicznym numerem na plecach.",
    rarity: "STANDARD",
    accentColor: "#e22e30",
    defaultState: "EQUIPPED",
    styleModifiers: {
      tintFilter: "none",
      accentColor: "#e22e30",
      badgeLabel: "HOME",
      glowAura: "rgba(226, 46, 48, 0.35)"
    }
  },
  {
    id: "jersey_training_black",
    name: "Koszulka Treningowa Pro (Czarna)",
    category: "jerseys",
    categoryLabel: "Koszulki",
    description: "Lekka, techniczna koszulka treningowa z grafitowymi akcentami do intensywnych jednostek.",
    rarity: "STANDARD",
    accentColor: "#475569",
    defaultState: "AVAILABLE",
    styleModifiers: {
      tintFilter: "brightness(0.7) contrast(1.15) hue-rotate(180deg)",
      accentColor: "#334155",
      badgeLabel: "TRAIN",
      glowAura: "rgba(100, 116, 139, 0.3)"
    }
  },
  {
    id: "jersey_delta_away",
    name: "Koszulka DELTA AWAY (Biała)",
    category: "jerseys",
    categoryLabel: "Koszulki",
    description: "Elegancki biały trykot wyjazdowy z czerwono-złotymi lamówkami.",
    rarity: "PREMIUM",
    accentColor: "#f8fafc",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga rozegrania pierwszego meczu wyjazdowego z potwierdzoną obecnością",
    styleModifiers: {
      tintFilter: "brightness(1.4) saturate(0.2)",
      accentColor: "#ffffff",
      badgeLabel: "AWAY",
      glowAura: "rgba(255, 255, 255, 0.45)"
    }
  },
  {
    id: "jersey_inferno_special",
    name: "Koszulka DELTA INFERNO Special Edition",
    category: "jerseys",
    categoryLabel: "Koszulki",
    description: "Unikalny trykot kolekcjonerski z płonącym motywem INFERNO i złotymi detalami.",
    rarity: "INFERNO",
    accentColor: "#f6c952",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga odblokowania stadionu: Legenda DELTY (4000 XP)",
    styleModifiers: {
      tintFilter: "contrast(1.3) drop-shadow(0 0 15px rgba(246, 201, 82, 0.7))",
      accentColor: "#f6c952",
      badgeLabel: "INFERNO",
      glowAura: "rgba(246, 201, 82, 0.6)"
    }
  },

  // 2. SPODENKI
  {
    id: "shorts_delta_black",
    name: "Spodenki Meczowe Black",
    category: "shorts",
    categoryLabel: "Spodenki",
    description: "Klasyczne czarne spodenki klubowe zapewniające pełną swobodę ruchu.",
    rarity: "STANDARD",
    accentColor: "#0f172a",
    defaultState: "EQUIPPED",
    styleModifiers: {
      tintFilter: "none",
      accentColor: "#0f172a",
      badgeLabel: "KLASYK"
    }
  },
  {
    id: "shorts_delta_red",
    name: "Spodenki Sparingowe Red",
    category: "shorts",
    categoryLabel: "Spodenki",
    description: "Alternatywne czerwone spodenki na mecze sparingowe i turnieje.",
    rarity: "STANDARD",
    accentColor: "#e22e30",
    defaultState: "AVAILABLE",
    styleModifiers: {
      tintFilter: "hue-rotate(330deg)",
      accentColor: "#e22e30",
      badgeLabel: "SPARING"
    }
  },
  {
    id: "shorts_pro_carbon",
    name: "Spodenki Pro Carbon Shield",
    category: "shorts",
    categoryLabel: "Spodenki",
    description: "Spodenki z panelami kompresyjnymi stabilizującymi mięśnie czworogłowe.",
    rarity: "PREMIUM",
    accentColor: "#064e3b",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga zaliczenia 10 potwierdzonych treningów w bieżącym sezonie",
    styleModifiers: {
      tintFilter: "contrast(1.2)",
      accentColor: "#10b981",
      badgeLabel: "PRO"
    }
  },

  // 3. GETRY
  {
    id: "socks_delta_black",
    name: "Getry Meczowe DELTA Black",
    category: "socks",
    categoryLabel: "Getry",
    description: "Oddychające czarne getry piłkarskie ze wzmocnioną piętą.",
    rarity: "STANDARD",
    accentColor: "#1e293b",
    defaultState: "EQUIPPED",
    styleModifiers: {
      tintFilter: "none",
      accentColor: "#1e293b"
    }
  },
  {
    id: "socks_delta_red",
    name: "Getry Turniejowe DELTA Red",
    category: "socks",
    categoryLabel: "Getry",
    description: "Jaskrawoczerwone getry ligowe zapewniające widoczność na boisku.",
    rarity: "STANDARD",
    accentColor: "#dc2626",
    defaultState: "AVAILABLE",
    styleModifiers: {
      tintFilter: "hue-rotate(340deg)",
      accentColor: "#dc2626"
    }
  },
  {
    id: "socks_inferno_flame",
    name: "Getry INFERNO Flame Tech",
    category: "socks",
    categoryLabel: "Getry",
    description: "Getry z ognistym printem i strefą dynamicznego ściągacza.",
    rarity: "INFERNO",
    accentColor: "#f59e0b",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga passy frekwencji: 5 obecności z rzędu na treningach",
    styleModifiers: {
      tintFilter: "saturate(1.5)",
      accentColor: "#f59e0b"
    }
  },

  // 4. BUTY
  {
    id: "boots_academy_black",
    name: "Buty Academy Black Control",
    category: "boots",
    categoryLabel: "Buty",
    description: "Niezawodne czarne korki ze skóry syntetycznej o precyzyjnym czuciu piłki.",
    rarity: "STANDARD",
    accentColor: "#334155",
    defaultState: "EQUIPPED",
    styleModifiers: {
      accentColor: "#334155",
      badgeLabel: "CONTROL",
      indicatorIcon: "BootBlack"
    }
  },
  {
    id: "boots_speed_red",
    name: "Buty Speed Strike Red",
    category: "boots",
    categoryLabel: "Buty",
    description: "Lekkie korki sprinterskie z agresywnym układem kołków do szybkich zrywów.",
    rarity: "STANDARD",
    accentColor: "#ef4444",
    defaultState: "AVAILABLE",
    styleModifiers: {
      accentColor: "#ef4444",
      badgeLabel: "SPEED",
      indicatorIcon: "BootRed"
    }
  },
  {
    id: "boots_inferno_gold",
    name: "Buty INFERNO Gold Edition",
    category: "boots",
    categoryLabel: "Buty",
    description: "Złote buty mistrzowskie z chromowaną podeszwą dla najlepszych snajperów.",
    rarity: "INFERNO",
    accentColor: "#f6c952",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga odblokowania etapu: Stadion Mistrzowski (2400 XP)",
    styleModifiers: {
      accentColor: "#f6c952",
      badgeLabel: "GOLD",
      glowAura: "rgba(246, 201, 82, 0.8)",
      indicatorIcon: "BootGold"
    }
  },
  {
    id: "boots_legend_chrome",
    name: "Buty DELTA Legend Chrome",
    category: "boots",
    categoryLabel: "Buty",
    description: "Ekskluzywne buty z tytanowymi akcentami wręczane legendom akademii.",
    rarity: "LEGEND",
    accentColor: "#38bdf8",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga osiągnięcia Poziomu 10 w profilu zawodnika",
    styleModifiers: {
      accentColor: "#38bdf8",
      badgeLabel: "LEGEND",
      glowAura: "rgba(56, 189, 248, 0.8)"
    }
  },

  // 5. PIŁKI
  {
    id: "ball_training_classic",
    name: "Piłka Treningowa DELTA Classic",
    category: "balls",
    categoryLabel: "Piłki",
    description: "Wytrzymała piłka rozmiar 4 z atestem klubowym do codziennych ćwiczeń technicznych.",
    rarity: "STANDARD",
    accentColor: "#cbd5e1",
    defaultState: "EQUIPPED",
    styleModifiers: {
      accentColor: "#cbd5e1",
      badgeLabel: "SIZE 4"
    }
  },
  {
    id: "ball_match_pro",
    name: "Piłka Meczowa MZPN Match Pro",
    category: "balls",
    categoryLabel: "Piłki",
    description: "Oficjalna klejona termicznie piłka meczowa z certyfikatem FIFA Basic.",
    rarity: "PREMIUM",
    accentColor: "#e22e30",
    defaultState: "AVAILABLE",
    styleModifiers: {
      accentColor: "#e22e30",
      badgeLabel: "FIFA MATCH"
    }
  },
  {
    id: "ball_inferno_champions",
    name: "Piłka Champions INFERNO",
    category: "balls",
    categoryLabel: "Piłki",
    description: "Turniejowa piłka mistrzów z powłoką mikro-teksturowaną i ognistym wzorem.",
    rarity: "INFERNO",
    accentColor: "#f6c952",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga osiągnięcia Poziomu 5 (4000 XP) oraz zdobycia min. 1 karty INFERNO",
    styleModifiers: {
      accentColor: "#f6c952",
      badgeLabel: "CHAMPIONS",
      glowAura: "rgba(246, 201, 82, 0.7)"
    }
  },

  // 6. AKCESORIA
  {
    id: "acc_captain_armband",
    name: "Opaska Kapitańska DELTA",
    category: "accessories",
    categoryLabel: "Akcesoria",
    description: "Elastyczna opaska lidera zespołu z haftowanym herbem K.S. Delta Warszawa.",
    rarity: "STANDARD",
    accentColor: "#f6c952",
    defaultState: "EQUIPPED",
    styleModifiers: {
      accentColor: "#f6c952",
      badgeLabel: "KAPITAN"
    }
  },
  {
    id: "acc_bottle_gm",
    name: "Bidon Klubowy DELTA 750ml",
    category: "accessories",
    categoryLabel: "Akcesoria",
    description: "Lekki, ergonomiczny bidon z ustnikiem sportowym i miarką nawodnienia.",
    rarity: "STANDARD",
    accentColor: "#e22e30",
    defaultState: "AVAILABLE",
    styleModifiers: {
      accentColor: "#e22e30",
      badgeLabel: "750 ML"
    }
  },
  {
    id: "acc_shin_guards",
    name: "Ochraniacze Carbon Guard Lite",
    category: "accessories",
    categoryLabel: "Akcesoria",
    description: "Anatomicznie profilowane ochraniacze goleni z pianką amortyzującą uderzenia.",
    rarity: "PREMIUM",
    accentColor: "#10b981",
    defaultState: "AVAILABLE",
    styleModifiers: {
      accentColor: "#10b981",
      badgeLabel: "PROTECT"
    }
  },
  {
    id: "acc_gloves_winter",
    name: "Rękawiczki Termiczne Player Pro",
    category: "accessories",
    categoryLabel: "Akcesoria",
    description: "Rękawiczki polarowe z silikonowymi wypustkami na palcach do pewnego chwytu piłki przy wyrzucie z autu.",
    rarity: "STANDARD",
    accentColor: "#38bdf8",
    defaultState: "LOCKED",
    unlockCondition: "Wymaga potwierdzonej obecności na treningu w warunkach zimowych",
    styleModifiers: {
      accentColor: "#38bdf8",
      badgeLabel: "WINTER"
    }
  }
];

export function getInitialEquippedMap(): Record<LockerCategory, EquipmentItem> {
  const result: Partial<Record<LockerCategory, EquipmentItem>> = {};

  for (const cat of LOCKER_CATEGORIES) {
    const defaultItem = DEMO_EQUIPMENT_ITEMS.find(
      item => item.category === cat.id && item.defaultState === "EQUIPPED"
    ) || DEMO_EQUIPMENT_ITEMS.find(
      item => item.category === cat.id && item.defaultState === "AVAILABLE"
    )!;

    result[cat.id] = defaultItem;
  }

  return result as Record<LockerCategory, EquipmentItem>;
}
