import type {
  PackDefinition,
  PackOpeningResult,
  UserUnopenedPack
} from "./types.ts";

export interface BoosterCatalogFallbackItem {
  id: string;
  name: string;
  cardsCount: number;
  image?: string;
  theme: "standard" | "matchday" | "gold" | "inferno" | "legend" | string;
  description?: string | null;
}

export class LivePackOpenError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = "OPEN_PACK_FAILED", status = 400) {
    super(message);
    this.name = "LivePackOpenError";
    this.code = code;
    this.status = status;
  }
}

export function createOpenPackAttemptKey(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `open-${Date.now()}-${rand}`;
}

export interface ExecuteLivePackOpenOptions {
  fetchImpl?: typeof fetch;
  packTypeId: string;
  userUnopenedPackId?: string | null;
  idempotencyKey: string;
  signal?: AbortSignal;
}

/**
 * Calls server-authoritative /api/cards/open-pack once for the current pack session.
 * Never fabricates or re-rolls cards on the client.
 */
export async function executeLivePackOpen({
  fetchImpl,
  packTypeId,
  userUnopenedPackId,
  idempotencyKey,
  signal
}: ExecuteLivePackOpenOptions): Promise<PackOpeningResult> {
  const fetcher = fetchImpl ?? (typeof fetch !== "undefined" ? fetch : null);
  if (!fetcher) {
    throw new LivePackOpenError("Brak klienta fetch w środowisku uruchomieniowym.", "NO_FETCH", 500);
  }
  if (!packTypeId) {
    throw new LivePackOpenError("Brak identyfikatora typu paczki.", "INVALID_PACK_TYPE", 400);
  }

  const payload: Record<string, string> = {
    pack_type_id: packTypeId,
    idempotency_key: idempotencyKey
  };
  if (userUnopenedPackId) {
    payload.user_unopened_pack_id = userUnopenedPackId;
  }

  const res = await fetcher("/api/cards/open-pack", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payload),
    signal
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = typeof body?.error === "string" ? body.error : "";
    const errCode = typeof body?.code === "string" ? body.code : "";
    if (
      res.status === 409 ||
      errCode === "ALREADY_OPENED" ||
      errMsg.includes("ALREADY_OPENED") ||
      errMsg.includes("już otwarta")
    ) {
      throw new LivePackOpenError(
        "Ta paczka została już wcześniej otwarta.",
        "ALREADY_OPENED",
        409
      );
    }

    throw new LivePackOpenError(
      errMsg || `Błąd otwierania paczki (Status ${res.status})`,
      errCode || "OPEN_PACK_FAILED",
      res.status
    );
  }

  if (!body || !Array.isArray(body.cards)) {
    throw new LivePackOpenError(
      "Nieprawidłowa odpowiedź serwera podczas otwierania paczki.",
      "INVALID_RESPONSE",
      502
    );
  }

  return body as PackOpeningResult;
}

/**
 * Reconciles client unopenedPacks list with authoritative server result idempotently,
 * preventing double-decrement and preserving untouched packs.
 */
export function reconcileUnopenedPacksAfterOpen(
  packs: UserUnopenedPack[],
  payload: {
    consumed_pack_id?: string | null;
    remaining_unopened_packs_count?: number;
  }
): UserUnopenedPack[] {
  if (!Array.isArray(packs) || packs.length === 0) {
    return [];
  }

  let next = packs;
  let removedById = false;

  if (payload.consumed_pack_id) {
    const filtered = packs.filter((item) => item.id !== payload.consumed_pack_id);
    if (filtered.length < packs.length) {
      next = filtered;
      removedById = true;
    }
  }

  if (
    typeof payload.remaining_unopened_packs_count === "number" &&
    Number.isFinite(payload.remaining_unopened_packs_count)
  ) {
    const targetCount = Math.max(0, Math.floor(payload.remaining_unopened_packs_count));
    if (next.length > targetCount) {
      next = next.slice(next.length - targetCount);
    }
    return next;
  }

  if (!removedById) {
    return next.slice(1);
  }

  return next;
}

export function buildFallbackPackDefinition(
  packTypeId: string,
  catalogEntry?: BoosterCatalogFallbackItem | null
): PackDefinition {
  const theme = catalogEntry?.theme || (packTypeId.includes("inferno")
    ? "inferno"
    : packTypeId.includes("legend")
    ? "legend"
    : packTypeId.includes("gold")
    ? "gold"
    : packTypeId.includes("matchday")
    ? "matchday"
    : "standard");

  return {
    id: packTypeId || "standard_pack",
    name: catalogEntry?.name || "Paczka DELTA",
    description: catalogEntry?.description ?? "Oficjalna paczka kart",
    cards_count: catalogEntry?.cardsCount ?? 4,
    drop_rates: { common: 60, rare: 30, epic: 8, legendary: 1.8, inferno: 0.2 },
    min_rarity: theme === "inferno" ? "epic" : theme === "legend" ? "legendary" : "common",
    theme,
    image_url: catalogEntry?.image,
    is_active: true
  };
}

export function resolvePackDefinitionForUnopenedPack(
  unopenedPack: UserUnopenedPack | null | undefined,
  packDefinitions: PackDefinition[],
  fallbackCatalog: BoosterCatalogFallbackItem[] = []
): PackDefinition | null {
  if (!unopenedPack) return null;

  const packTypeId = unopenedPack.pack_type_id || "standard_pack";
  const fromDefs = packDefinitions.find((p) => p.id === packTypeId);
  if (fromDefs) return fromDefs;
  if (unopenedPack.pack_definition) return unopenedPack.pack_definition;

  const fromCatalog = fallbackCatalog.find((item) => item.id === packTypeId) || null;
  return buildFallbackPackDefinition(packTypeId, fromCatalog);
}

export function selectPackSessionToOpen(params: {
  unopenedPacks: UserUnopenedPack[];
  packDefinitions: PackDefinition[];
  preferredPackTypeId?: string | null;
  preferredUnopenedPackId?: string | null;
  allowFallbackToAny?: boolean;
  fallbackCatalog?: BoosterCatalogFallbackItem[];
}): { targetUnopenedPack: UserUnopenedPack; pack: PackDefinition } | null {
  const {
    unopenedPacks,
    packDefinitions,
    preferredPackTypeId,
    preferredUnopenedPackId,
    allowFallbackToAny = true,
    fallbackCatalog = []
  } = params;

  if (!Array.isArray(unopenedPacks) || unopenedPacks.length === 0) {
    return null;
  }

  let target: UserUnopenedPack | undefined;
  if (preferredUnopenedPackId) {
    target = unopenedPacks.find((p) => p.id === preferredUnopenedPackId);
  }
  if (!target && preferredPackTypeId) {
    target = unopenedPacks.find((p) => p.pack_type_id === preferredPackTypeId);
    if (!target && !allowFallbackToAny) {
      return null;
    }
  }
  if (!target) {
    target = unopenedPacks[0];
  }

  const pack = resolvePackDefinitionForUnopenedPack(target, packDefinitions, fallbackCatalog);
  if (!pack) return null;

  return { targetUnopenedPack: target, pack };
}
