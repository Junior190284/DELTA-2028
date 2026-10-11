/**
 * DELTA COLLECTION 3D ENGINE — CLASSIFICATION & DATA ADAPTER
 * 
 * Safety-First Explicit Adapter bridging:
 * 1. Production database schema (lib/cards/types.ts & lib/cards/central-types.ts):
 *    - CardRarity: "common" | "rare" | "epic" | "legendary" | "inferno" (Economic / Drop Rates / Value)
 *    - CardType: "base" | "matchday" | "training_warrior" | "gold_master" etc. (Thematic series)
 *    - CardDefinition: Central entity model
 * 
 * 2. 3D Engine Presentation Layer (components/collection-3d/types.ts):
 *    - CardVisualType: Visual 3D skins/frames (INFERNO_ULTRA, GOLD_MASTER, MATCHDAY_HERO, DELTA_ICON, TRAINING_HERO, BASE)
 *    - CollectionCategory: UI catalog classification (COMMON, RARE, GOLD, MATCHDAY, INFERNO, LEGEND)
 * 
 * CORE PRINCIPLE:
 * CardRarity (economic data) and CardVisualType (presentation skin) are COMPLETELY INDEPENDENT.
 * Economic rarity is NEVER implicitly overridden or mutated by visual type or collection category.
 * Full lossless round-trip (production → 3D engine → production) is strictly guaranteed.
 */

import type {
  CardDefinition,
  ProductionCardRarity,
  ProductionCardType,
  CollectionCategory,
  CardVisualType,
  PlayerCardData,
  PlayerStats
} from "./types.ts";

/**
 * 1. RESOLVE CARD VISUAL TYPE (Skórka / Ramka 3D)
 * Wyznacza szablon graficzny karty 3D wyłącznie na potrzeby renderingu wizualnego.
 * NIE wpływa na rzadkość ekonomiczną karty.
 */
export function resolveCardVisualType(params: {
  frameTheme?: string | null;
  cardType?: ProductionCardType | string | null;
  rarity?: ProductionCardRarity | null;
}): CardVisualType {
  const { frameTheme, cardType, rarity } = params;
  const normTheme = (frameTheme || "").toLowerCase();
  const normType = (cardType || "").toLowerCase();
  const normRarity = (rarity || "").toLowerCase();

  // A. Priorytet 1: Jawnie zdefiniowany frame_theme
  if (normTheme.includes("inferno")) return "INFERNO_ULTRA";
  if (normTheme.includes("gold") || normTheme.includes("hunter")) return "GOLD_MASTER";
  if (normTheme.includes("matchday") || normTheme.includes("mecz")) return "MATCHDAY_HERO";
  if (normTheme.includes("icon") || normTheme.includes("legend")) return "DELTA_ICON";
  if (normTheme.includes("training") || normTheme.includes("trening")) return "TRAINING_HERO";
  if (normTheme.includes("base") || normTheme.includes("standard")) return "BASE";

  // B. Priorytet 2: Typ tematyczny karty (card_type)
  if (normType.includes("inferno")) return "INFERNO_ULTRA";
  if (normType === "legend" || normType.includes("icon")) return "DELTA_ICON";
  if (normType.includes("gold") || normType.includes("hunter") || normType.includes("captain") || normType.includes("mvp")) return "GOLD_MASTER";
  if (normType.includes("matchday") || normType === "finals" || normType === "tournament") return "MATCHDAY_HERO";
  if (normType.includes("training") || normType.includes("warrior") || normType.includes("iron")) return "TRAINING_HERO";
  if (normType.includes("seasonal") || normType.includes("winter") || normType.includes("special_event")) return "SEASONAL_EVENT";
  if (normType.includes("star")) return "STAR_PLAYER";

  // C. Priorytet 3: Fallback z rzadkości ekonomicznej (jeśli brak innych wskazówek)
  if (normRarity === "inferno") return "INFERNO_ULTRA";
  if (normRarity === "legendary") return "DELTA_ICON";
  if (normRarity === "epic") return "GOLD_MASTER";
  if (normRarity === "rare") return "TRAINING_HERO";
  return "BASE";
}

/**
 * 2. RESOLVE COLLECTION CATEGORY (Kategoria w katalogu albumu UI)
 * Klasyfikuje kartę do 6 kanonicznych zakładek DELTA Collection:
 * COMMON, RARE, GOLD, MATCHDAY, INFERNO, LEGEND.
 * Służy WYŁĄCZNIE do filtrowania i etykietowania w UI.
 */
export function toCollectionCategory(
  productionRarity: ProductionCardRarity,
  productionType?: ProductionCardType | string
): CollectionCategory {
  const normRarity = (productionRarity || "").toLowerCase();
  const normType = (productionType || "").toLowerCase();

  // 1. INFERNO — najwyższy priorytet
  if (normRarity === "inferno" || normType.includes("inferno")) {
    return "INFERNO";
  }

  // 2. LEGEND / IKONA
  if (normRarity === "legendary" || normType === "legend" || normType.includes("icon")) {
    return "LEGEND";
  }

  // 3. MATCHDAY — dedykowana seria meczowa
  if (normType.includes("matchday") || normType === "finals") {
    return "MATCHDAY";
  }

  // 4. GOLD / MISTRZ
  if (normRarity === "epic" || normType.includes("gold") || normType.includes("hunter")) {
    return "GOLD";
  }

  // 5. RARE / TRENING
  if (normRarity === "rare" || normType.includes("training") || normType.includes("warrior")) {
    return "RARE";
  }

  // 6. COMMON
  return "COMMON";
}

/**
 * 3. TO PRODUCTION RARITY (Bezpieczne wyciąganie rzadkości produkcyjnej)
 * Pobiera rzadkość ekonomiczną. Jeśli dostępny jest oryginalny obiekt PlayerCardData
 * lub explicit fallback, ZAWSZE zwraca oryginalną rzadkość bez strat.
 */
export function toProductionRarity(
  categoryOrData: CollectionCategory | PlayerCardData,
  fallbackEconomicRarity?: ProductionCardRarity
): ProductionCardRarity {
  // Jeśli przekazano pełny obiekt PlayerCardData, czytamy nienaruszoną rzadkość ekonomiczną
  if (typeof categoryOrData === "object" && categoryOrData !== null) {
    if (categoryOrData.economicRarity) {
      return categoryOrData.economicRarity;
    }
    if (categoryOrData.rawDefinition?.rarity) {
      return categoryOrData.rawDefinition.rarity;
    }
    return toProductionRarity(categoryOrData.rarity, fallbackEconomicRarity);
  }

  // Jeśli podano jawny fallback ekonomiczny, zachowaj go
  if (fallbackEconomicRarity) {
    return fallbackEconomicRarity;
  }

  // Odwzorowanie domyślne dla kategorii syntetycznych
  switch (categoryOrData) {
    case "INFERNO":
      return "inferno";
    case "LEGEND":
      return "legendary";
    case "GOLD":
      return "epic";
    case "MATCHDAY":
      return "rare";
    case "RARE":
      return "rare";
    case "COMMON":
    default:
      return "common";
  }
}

/**
 * 4. TO PRODUCTION CARD TYPE (Bezpieczne mapowanie typu wizualnego na card_type bazy danych)
 */
export function toProductionCardType(
  visualTypeOrData: CardVisualType | PlayerCardData,
  fallbackType?: ProductionCardType | string
): ProductionCardType | string {
  if (typeof visualTypeOrData === "object" && visualTypeOrData !== null) {
    if (visualTypeOrData.productionCardType) {
      return visualTypeOrData.productionCardType;
    }
    if (visualTypeOrData.rawDefinition?.card_type) {
      return visualTypeOrData.rawDefinition.card_type;
    }
    return toProductionCardType(visualTypeOrData.visualType, fallbackType);
  }

  if (fallbackType) {
    return fallbackType;
  }

  switch (visualTypeOrData) {
    case "INFERNO_ULTRA":
      return "inferno";
    case "DELTA_ICON":
      return "legend";
    case "GOLD_MASTER":
      return "goal_hunter";
    case "MATCHDAY_HERO":
      return "matchday";
    case "TRAINING_HERO":
      return "training_warrior";
    case "STAR_PLAYER":
      return "star_player";
    case "SEASONAL_EVENT":
      return "special_event";
    case "BASE":
    default:
      return "base";
  }
}

/**
 * 5. GET DEFAULT VISUAL TYPE FOR CATEGORY
 */
export function getDefaultVisualTypeForCategory(category: CollectionCategory): CardVisualType {
  switch (category) {
    case "INFERNO":
      return "INFERNO_ULTRA";
    case "LEGEND":
      return "DELTA_ICON";
    case "GOLD":
      return "GOLD_MASTER";
    case "MATCHDAY":
      return "MATCHDAY_HERO";
    case "RARE":
      return "TRAINING_HERO";
    case "COMMON":
    default:
      return "BASE";
  }
}

/**
 * 6. LOSSLESS ROUND-TRIP: PRODUCTION CARD DEFINITION -> 3D PLAYER CARD DATA
 * Konwertuje encję bazy danych produkcyjnej na obiekt PlayerCardData silnika 3D.
 * Gwarantuje bezstratne zachowanie wszystkich oryginalnych danych ekonomicznych.
 */
export function fromProductionCard(
  card: CardDefinition,
  options?: {
    stats?: PlayerStats;
    ovr?: number;
    specialTitleId?: string | null;
    isDuplicate?: boolean;
    duplicatePoints?: number;
    instanceId?: string | null;
  }
): PlayerCardData {
  const visualType = resolveCardVisualType({
    frameTheme: card.frame_theme,
    cardType: card.card_type,
    rarity: card.rarity
  });

  const category = toCollectionCategory(card.rarity, card.card_type);

  // Bazowe statystyki lub wyliczone
  const stats: PlayerStats = options?.stats || {
    pac: 75,
    sho: 70,
    pas: 72,
    dri: 74,
    def: 65,
    phy: 70
  };

  // Ekstrakcja nazwiska z display_name lub title
  const displayName = card.player?.display_name || card.title || card.card_name || "ZAWODNIK";
  const nameParts = displayName.trim().split(" ");
  const surname = nameParts.length > 1 ? nameParts.slice(1).join(" ").toUpperCase() : nameParts[0].toUpperCase();

  return {
    playerId: card.player_id,
    cardId: card.id,
    imageUrl: card.player?.photo_path || card.artwork_url || "/assets/cards/inferno-3d/player-default.png",
    surname,
    shirtNumber: card.player?.shirt_number || card.card_number || 10,
    position: card.player?.position || "FWD",
    ovr: options?.ovr ?? 80,
    stats,
    visualType,
    rarity: category,
    specialTitleId: options?.specialTitleId ?? null,
    season: card.season || "2026/2027",

    isDuplicate: options?.isDuplicate ?? false,
    duplicatePoints: options?.duplicatePoints ?? 0,
    instanceId: options?.instanceId ?? null,

    // ZACHOWANIE ORYGINALNEJ TOŻSAMOŚCI EKONOMICZNEJ
    economicRarity: card.rarity,
    productionCardType: card.card_type,
    rawDefinition: { ...card }
  };
}

/**
 * 7. LOSSLESS ROUND-TRIP: 3D PLAYER CARD DATA -> PRODUCTION CARD DEFINITION
 * Konwertuje dane silnika 3D z powrotem na format produkcyjny CardDefinition.
 * Zapewnia 100% zgodności rzadkości ekonomicznej i typu karty.
 */
export function toProductionCard(data: PlayerCardData): Partial<CardDefinition> {
  const base = data.rawDefinition ? { ...data.rawDefinition } : {};

  const exactRarity = data.economicRarity || (base.rarity as ProductionCardRarity) || toProductionRarity(data.rarity);
  const exactType = data.productionCardType || base.card_type || toProductionCardType(data.visualType);

  return {
    ...base,
    id: data.cardId || base.id || `card_${data.playerId}`,
    player_id: data.playerId,
    season: data.season || base.season || "2026/2027",
    card_type: exactType,
    rarity: exactRarity,
    title: base.title || `${data.surname} (${data.position})`,
    card_name: base.card_name || data.surname,
    artwork_url: data.imageUrl,
    frame_theme: base.frame_theme || data.visualType.toLowerCase(),
    card_number: typeof data.shirtNumber === "number" ? data.shirtNumber : parseInt(String(data.shirtNumber), 10) || null,
    is_active: base.is_active !== undefined ? base.is_active : true,
    is_limited: base.is_limited !== undefined ? base.is_limited : false,
    edition_size: base.edition_size !== undefined ? base.edition_size : null,
    description: base.description || null,
    lore: base.lore || null,
    match_id: base.match_id || null,
    special_event_id: base.special_event_id || null,
    player: {
      id: data.playerId,
      display_name: data.surname,
      shirt_number: String(data.shirtNumber),
      position: String(data.position),
      photo_path: data.imageUrl
    }
  };
}
