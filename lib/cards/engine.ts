import type { SupabaseClient } from "@supabase/supabase-js";
import { type CardDefinition, type CardRarity, type PackOpeningResult, CARD_TYPES_CONFIG } from "./types.ts";

/**
 * Zapewnia istnienie domyślnych 6 kart startowych dla każdego zawodnika w danym sezonie
 */
export async function ensureStarterCardsForPlayers(
  supabase: SupabaseClient,
  players: { id: string; display_name: string }[],
  season = "2026/27"
) {
  if (!players || !players.length) return;

  const starterTypes = ["base", "matchday", "training_warrior", "goal_hunter", "mvp", "inferno"] as const;

  const cardsToInsert: any[] = [];

  for (const p of players) {
    const isRyszard = (p.display_name || "").toLowerCase().includes("ryszard") &&
                      (p.display_name || "").toLowerCase().includes("rybacki");

    for (const type of starterTypes) {
      const cfg = CARD_TYPES_CONFIG[type];
      let artworkUrl: string | null = null;
      let artworkPose = "standard";

      if (isRyszard) {
        if (type === "inferno") {
          artworkUrl = "/assets/players/ryszard-inferno.png";
          artworkPose = "inferno_flame";
        } else if (type === "mvp" || type === "goal_hunter" || type === "training_warrior") {
          artworkUrl = "/assets/players/ryszard-legend.png";
          artworkPose = "action_dribble";
        } else {
          artworkUrl = "/assets/players/ryszard-gold.png";
          artworkPose = "arms_crossed";
        }
      }

      cardsToInsert.push({
        player_id: p.id,
        season,
        card_type: type,
        card_name: `${p.display_name} — ${cfg.name}`,
        title: cfg.name,
        rarity: cfg.defaultRarity,
        artwork_url: artworkUrl,
        artwork_pose: artworkPose,
        frame_theme: type === "inferno" ? "inferno" : type === "mvp" ? "legend" : "gold",
        description: cfg.description,
        lore: `Oficjalna karta DELTA Warszawa 2018 GM z kolekcji ${season}.`,
        is_active: true
      });
    }
  }

  // Wstawienie lub aktualizacja (on conflict do nothing)
  try {
    await supabase
      .from("card_definitions")
      .upsert(cardsToInsert, { onConflict: "player_id,season,card_type", ignoreDuplicates: true });
  } catch (err) {
    console.error("Błąd seedowania kart:", err);
  }
}

/**
 * Losuje rzadkość na podstawie wag procentowych w definicji paczki
 */
export function rollRarity(dropRates: Record<CardRarity, number>, guaranteedMin?: CardRarity): CardRarity {
  const raritiesOrder: CardRarity[] = ["common", "rare", "epic", "legendary", "inferno"];

  const validRates = { ...dropRates };
  if (guaranteedMin) {
    const minIndex = raritiesOrder.indexOf(guaranteedMin);
    // Zerujemy rzadkości poniżej gwarantowanego minimum
    raritiesOrder.slice(0, minIndex).forEach(r => {
      validRates[r] = 0;
    });
  }

  const totalWeight = Object.values(validRates).reduce((sum, w) => sum + (w || 0), 0);
  if (totalWeight <= 0) return guaranteedMin || "common";

  let randomVal = Math.random() * totalWeight;
  for (const rarity of raritiesOrder) {
    const weight = validRates[rarity] || 0;
    if (randomVal <= weight) {
      return rarity;
    }
    randomVal -= weight;
  }

  return guaranteedMin || "common";
}

export type PackOpeningErrorCode =
  | "UNAUTHORIZED"
  | "NO_UNOPENED_PACK"
  | "ALREADY_OPENED"
  | "PACK_NOT_FOUND"
  | "PACK_TYPE_MISMATCH"
  | "NO_AVAILABLE_CARDS"
  | "RPC_UNAVAILABLE"
  | "DB_READ_ERROR"
  | "DB_WRITE_ERROR";

export class PackOpeningError extends Error {
  public readonly code: PackOpeningErrorCode;
  public readonly statusCode: number;

  constructor(code: PackOpeningErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "PackOpeningError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const PACK_FALLBACK_CONFIGS: Record<
  string,
  { cardsCount: number; dropRates: Record<CardRarity, number>; minRarity: CardRarity }
> = {
  standard_pack: {
    cardsCount: 3,
    dropRates: { common: 70, rare: 22, epic: 6, legendary: 1.8, inferno: 0.2 },
    minRarity: "common"
  },
  matchday_booster: {
    cardsCount: 4,
    dropRates: { common: 50, rare: 35, epic: 11, legendary: 3.5, inferno: 0.5 },
    minRarity: "rare"
  },
  gold_booster: {
    cardsCount: 5,
    dropRates: { common: 35, rare: 45, epic: 15, legendary: 4.5, inferno: 0.5 },
    minRarity: "rare"
  },
  inferno_booster: {
    cardsCount: 5,
    dropRates: { common: 20, rare: 40, epic: 28, legendary: 9, inferno: 3 },
    minRarity: "epic"
  },
  legend_pack: {
    cardsCount: 6,
    dropRates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 },
    minRarity: "legendary"
  },
  legend_booster: {
    cardsCount: 6,
    dropRates: { common: 10, rare: 35, epic: 35, legendary: 17, inferno: 3 },
    minRarity: "legendary"
  }
};

interface AtomicCardMeta {
  card_id: string;
  is_duplicate: boolean;
  duplicate_points: number;
}

interface AtomicPackResponsePayload {
  cards_meta: AtomicCardMeta[];
  total_delta_points_earned: number;
  new_points_balance: number;
  pack_type_id: string;
  consumed_pack_id: string;
  remaining_unopened_packs_count: number;
}

function isRpcMissingError(err: { code?: string; message?: string; details?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "PGRST202" || err.code === "42883") return true;
  const msg = `${err.message || ""} ${err.details || ""}`.toLowerCase();
  return (
    msg.includes("could not find the function") ||
    (msg.includes("open_pack_atomic") && msg.includes("does not exist"))
  );
}

/**
 * Pobiera aktywne definicje kart (wyłącznie prawdziwe rekordy z card_definitions).
 * Jeśli tabela jest pusta, zasila ją z aktywnych zawodników przez serwisowy klient admina.
 */
async function resolveActiveCardPool(adminClient: SupabaseClient): Promise<CardDefinition[]> {
  const selectQuery = `
    *,
    player:players(id, display_name, shirt_number, position, photo_path),
    match:matches(id, match_date, home_team, away_team, home_score, away_score)
  `;

  const { data: initialCards, error: cardsErr } = await adminClient
    .from("card_definitions")
    .select(selectQuery)
    .eq("is_active", true);

  if (cardsErr) {
    throw new PackOpeningError("DB_READ_ERROR", "Błąd odczytu aktywnych definicji kart.", 500);
  }

  if (initialCards && initialCards.length > 0) {
    return initialCards as CardDefinition[];
  }

  const { data: players, error: playersErr } = await adminClient
    .from("players")
    .select("id, display_name, active")
    .order("display_name");

  if (playersErr) {
    throw new PackOpeningError("DB_READ_ERROR", "Błąd odczytu listy zawodników do seedowania kart.", 500);
  }

  const activePlayers = (players || []).filter(p => p.active !== false);
  if (activePlayers.length > 0) {
    await ensureStarterCardsForPlayers(adminClient, activePlayers, "2026/27");
    const { data: seededCards, error: seededErr } = await adminClient
      .from("card_definitions")
      .select(selectQuery)
      .eq("is_active", true);

    if (seededErr) {
      throw new PackOpeningError("DB_READ_ERROR", "Błąd odczytu zasianych definicji kart.", 500);
    }
    if (seededCards && seededCards.length > 0) {
      return seededCards as CardDefinition[];
    }
  }

  throw new PackOpeningError("NO_AVAILABLE_CARDS", "Brak aktywnych kart w puli losowania.", 500);
}

/**
 * Buduje pełny PackOpeningResult na podstawie payloadu zwróconego przez RPC open_pack_atomic.
 * Przy powtórzonym żądaniu idempotentnym dociąga pełne definicje kart z bazy.
 */
async function buildResultFromAtomicPayload(
  adminClient: SupabaseClient,
  payload: AtomicPackResponsePayload,
  preloadedCardMap?: Map<string, CardDefinition>
): Promise<PackOpeningResult> {
  const cardMap = new Map<string, CardDefinition>(preloadedCardMap || []);
  const metas = Array.isArray(payload.cards_meta) ? payload.cards_meta : [];
  const missingIds = Array.from(
    new Set(metas.map(m => String(m.card_id)).filter(id => !cardMap.has(id)))
  );

  if (missingIds.length > 0) {
    const { data: fetchedCards, error: fetchErr } = await adminClient
      .from("card_definitions")
      .select(`
        *,
        player:players(id, display_name, shirt_number, position, photo_path),
        match:matches(id, match_date, home_team, away_team, home_score, away_score)
      `)
      .in("id", missingIds);

    if (fetchErr) {
      throw new PackOpeningError("DB_READ_ERROR", "Błąd pobierania danych wylosowanych kart.", 500);
    }

    for (const c of fetchedCards || []) {
      cardMap.set(String((c as CardDefinition).id), c as CardDefinition);
    }
  }

  const cards = metas.map(meta => {
    const cardDef = cardMap.get(String(meta.card_id));
    if (!cardDef) {
      throw new PackOpeningError("DB_READ_ERROR", `Brak definicji karty ${meta.card_id} w odpowiedzi RPC.`, 500);
    }
    return {
      card: cardDef,
      is_duplicate: Boolean(meta.is_duplicate),
      duplicate_points: Number(meta.duplicate_points) || 0
    };
  });

  return {
    cards,
    total_delta_points_earned: Number(payload.total_delta_points_earned) || 0,
    new_points_balance: Number(payload.new_points_balance) || 0,
    pack_type_id: payload.pack_type_id,
    consumed_pack_id: payload.consumed_pack_id ?? null,
    remaining_unopened_packs_count: Number(payload.remaining_unopened_packs_count) || 0
  };
}

function mapAtomicRejectionToError(rpcResult: {
  code?: string;
  status?: number;
  error?: string;
}): PackOpeningError {
  const code = rpcResult.code || "DB_WRITE_ERROR";
  switch (code) {
    case "UNAUTHORIZED":
      return new PackOpeningError("UNAUTHORIZED", rpcResult.error || "Wymagana autoryzacja użytkownika.", 401);
    case "PACK_NOT_FOUND":
      return new PackOpeningError("PACK_NOT_FOUND", rpcResult.error || "Nie znaleziono paczki do otwarcia.", 404);
    case "ALREADY_OPENED":
      return new PackOpeningError("ALREADY_OPENED", rpcResult.error || "ALREADY_OPENED: Ta paczka została już otwarta.", 409);
    case "NO_UNOPENED_PACK":
      return new PackOpeningError("NO_UNOPENED_PACK", rpcResult.error || "Brak dostępnej paczki tego typu do otwarcia.", 400);
    case "PACK_TYPE_MISMATCH":
      return new PackOpeningError("PACK_TYPE_MISMATCH", rpcResult.error || "Niezgodny typ wskazanej paczki.", 400);
    case "NO_AVAILABLE_CARDS":
      return new PackOpeningError("NO_AVAILABLE_CARDS", rpcResult.error || "Brak wylosowanych kart.", 400);
    default:
      return new PackOpeningError(
        "DB_WRITE_ERROR",
        rpcResult.error || "Błąd podczas atomowego otwierania paczki.",
        rpcResult.status || 500
      );
  }
}

export interface OpenPackServerSideOptions {
  idempotencyKey?: string | null;
}

/**
 * Główny silnik serwerowy otwierania paczki zintegrowany z atomowym RPC public.open_pack_atomic.
 * Brak nieatomowego fallbacku: awaria lub brak RPC kończy się kontrolowanym błędem.
 */
export async function openPackServerSide(
  adminClient: SupabaseClient,
  userId: string,
  userUnopenedPackId?: string,
  packTypeId = "matchday",
  options?: OpenPackServerSideOptions
): Promise<PackOpeningResult> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new PackOpeningError("UNAUTHORIZED", "Wymagana autoryzacja użytkownika.", 401);
  }

  const cleanIdemKey =
    typeof options?.idempotencyKey === "string" && options.idempotencyKey.trim() !== ""
      ? options.idempotencyKey.trim()
      : null;

  // 1. Szybka obsługa ponowionego żądania z tym samym idempotency_key przed sprawdzaniem stanu paczek
  if (cleanIdemKey) {
    const { data: existingLog, error: idemErr } = await adminClient
      .from("pack_opening_logs")
      .select("response_payload")
      .eq("user_id", userId)
      .eq("idempotency_key", cleanIdemKey)
      .maybeSingle();

    if (!idemErr && existingLog?.response_payload) {
      return buildResultFromAtomicPayload(
        adminClient,
        existingLog.response_payload as AtomicPackResponsePayload
      );
    }
  }

  // 2. Weryfikacja posiadania uprawnionej paczki i odczyt autorytatywnego pack_type_id
  let finalPackTypeId = packTypeId;

  if (userUnopenedPackId) {
    const { data: packRow, error: packErr } = await adminClient
      .from("user_unopened_packs")
      .select("id, user_id, pack_type_id, is_opened")
      .eq("id", userUnopenedPackId)
      .maybeSingle();

    if (packErr) {
      if (packErr.code === "22P02") {
        throw new PackOpeningError("PACK_NOT_FOUND", "Nie znaleziono paczki do otwarcia.", 404);
      }
      throw new PackOpeningError("DB_READ_ERROR", "Błąd weryfikacji paczki do otwarcia.", 500);
    }

    if (!packRow || packRow.user_id !== userId) {
      throw new PackOpeningError("PACK_NOT_FOUND", "Nie znaleziono paczki do otwarcia.", 404);
    }

    if (packRow.is_opened) {
      throw new PackOpeningError("ALREADY_OPENED", "ALREADY_OPENED: Ta paczka została już otwarta.", 409);
    }

    finalPackTypeId = packRow.pack_type_id;
  } else {
    const { data: candidatePack, error: candErr } = await adminClient
      .from("user_unopened_packs")
      .select("id, pack_type_id")
      .eq("user_id", userId)
      .eq("pack_type_id", finalPackTypeId)
      .eq("is_opened", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candErr) {
      throw new PackOpeningError("DB_READ_ERROR", "Błąd sprawdzania dostępnych paczek użytkownika.", 500);
    }

    if (!candidatePack) {
      throw new PackOpeningError("NO_UNOPENED_PACK", "Brak dostępnej paczki tego typu do otwarcia.", 400);
    }

    finalPackTypeId = candidatePack.pack_type_id;
  }

  // 3. Odczyt konfiguracji paczki (drop_rates, cards_count, min_rarity)
  const { data: packDef } = await adminClient
    .from("pack_definitions")
    .select("*")
    .eq("id", finalPackTypeId)
    .maybeSingle();

  const fallback = PACK_FALLBACK_CONFIGS[finalPackTypeId] || PACK_FALLBACK_CONFIGS.standard_pack;
  const cardsCount = packDef?.cards_count || fallback.cardsCount;
  const dropRates: Record<CardRarity, number> = packDef?.drop_rates || fallback.dropRates;
  const minRarity: CardRarity = packDef?.min_rarity || fallback.minRarity;

  // 4. Pobranie wyłącznie aktywnych card_definitions
  const availableCards = await resolveActiveCardPool(adminClient);

  // 5. Losowanie kart według obowiązujących zasad ekonomii (min_rarity na ostatnim slocie)
  const drawnCards: CardDefinition[] = [];
  const preloadedCardMap = new Map<string, CardDefinition>();
  const raritiesOrder: CardRarity[] = ["common", "rare", "epic", "legendary", "inferno"];

  for (let slot = 0; slot < cardsCount; slot++) {
    const isLastSlot = slot === cardsCount - 1;
    const hasMetMinRarity = drawnCards.some(
      card => raritiesOrder.indexOf(card.rarity) >= raritiesOrder.indexOf(minRarity)
    );

    const guaranteed = isLastSlot && !hasMetMinRarity ? minRarity : undefined;
    const rolledRarity = rollRarity(dropRates, guaranteed);

    let matchingCards = availableCards.filter(c => c.rarity === rolledRarity);
    if (!matchingCards.length) {
      matchingCards = availableCards;
    }

    const selectedCard = matchingCards[Math.floor(Math.random() * matchingCards.length)] as CardDefinition;
    drawnCards.push(selectedCard);
    preloadedCardMap.set(String(selectedCard.id), selectedCard);
  }

  const drawnCardIds = drawnCards.map(c => String(c.id));

  // 6. Atomowy zapis przez public.open_pack_atomic (ZERO fallbacku do zapisu nieatomowego!)
  if (typeof (adminClient as any).rpc !== "function") {
    throw new PackOpeningError(
      "RPC_UNAVAILABLE",
      "Klient Supabase nie obsługuje wywołania RPC open_pack_atomic.",
      503
    );
  }

  const { data: rpcResult, error: rpcErr } = await adminClient.rpc("open_pack_atomic", {
    p_user_id: userId,
    p_pack_id: userUnopenedPackId || null,
    p_pack_type_id: finalPackTypeId,
    p_drawn_card_ids: drawnCardIds,
    p_idempotency_key: cleanIdemKey
  });

  if (rpcErr) {
    if (isRpcMissingError(rpcErr) || rpcErr.code === "42501") {
      throw new PackOpeningError(
        "RPC_UNAVAILABLE",
        "Atomowa funkcja open_pack_atomic nie jest dostępna w tej bazie danych.",
        503
      );
    }
    throw new PackOpeningError(
      "DB_WRITE_ERROR",
      rpcErr.message || "Błąd wykonania transakcji open_pack_atomic.",
      500
    );
  }

  if (!rpcResult || typeof rpcResult !== "object") {
    throw new PackOpeningError("DB_WRITE_ERROR", "Nieprawidłowa odpowiedź z funkcji open_pack_atomic.", 500);
  }

  if (!rpcResult.success) {
    throw mapAtomicRejectionToError(rpcResult);
  }

  return buildResultFromAtomicPayload(
    adminClient,
    rpcResult.response_payload as AtomicPackResponsePayload,
    preloadedCardMap
  );
}

export interface IdempotencyEntry {
  expiresAt: number;
  inFlight?: Promise<PackOpeningResult>;
  result?: PackOpeningResult;
}

const DEFAULT_IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;
const MAX_IDEMPOTENCY_ENTRIES = 500;
const defaultIdempotencyStore = new Map<string, IdempotencyEntry>();

function pruneIdempotencyStore(store: Map<string, IdempotencyEntry>, now: number): void {
  for (const [key, entry] of store.entries()) {
    if (!entry.inFlight && entry.expiresAt <= now) {
      store.delete(key);
    }
  }
  while (store.size >= MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

/**
 * Warstwa deduplikacji procesowej + przekazanie klucza idempotencji do atomowego RPC open_pack_atomic.
 */
export async function openPackWithIdempotency(params: {
  supabase: SupabaseClient;
  userId: string;
  userUnopenedPackId?: string;
  packTypeId?: string;
  idempotencyKey?: string | null;
  store?: Map<string, IdempotencyEntry>;
}): Promise<PackOpeningResult> {
  const {
    supabase,
    userId,
    userUnopenedPackId,
    packTypeId = "matchday",
    idempotencyKey,
    store = defaultIdempotencyStore
  } = params;

  const cleanKey = typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";
  if (!cleanKey) {
    return openPackServerSide(supabase, userId, userUnopenedPackId, packTypeId);
  }

  const now = Date.now();
  pruneIdempotencyStore(store, now);

  const compositeKey = `${userId}::${cleanKey}`;
  const existing = store.get(compositeKey);

  if (existing) {
    if (existing.result && existing.expiresAt > now) {
      return existing.result;
    }
    if (existing.inFlight) {
      return existing.inFlight;
    }
  }

  const executionPromise = openPackServerSide(
    supabase,
    userId,
    userUnopenedPackId,
    packTypeId,
    { idempotencyKey: cleanKey }
  );

  store.set(compositeKey, {
    expiresAt: now + DEFAULT_IDEMPOTENCY_TTL_MS,
    inFlight: executionPromise
  });

  try {
    const result = await executionPromise;
    store.set(compositeKey, {
      expiresAt: Date.now() + DEFAULT_IDEMPOTENCY_TTL_MS,
      result
    });
    return result;
  } catch (err) {
    store.delete(compositeKey);
    throw err;
  }
}
