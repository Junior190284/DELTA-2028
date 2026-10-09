/**
 * DELTA Card System — State Synchronization & Cache Reconciliation Engine
 * Single Source of Truth, Race-Condition Protection & Event Bus
 */

export interface DeltaPackOpenedPayload {
  pack_type_id: string;
  consumed_pack_id?: string | null;
  remaining_unopened_packs_count?: number;
  total_delta_points_earned?: number;
  new_points_balance?: number;
  drawn_card_ids?: string[];
  timestamp?: number;
}

export interface DeltaFavoriteUpdatedPayload {
  card_id: string;
  is_favorite: boolean;
  timestamp?: number;
}

export interface DeltaCollectionUpdatedPayload {
  timestamp?: number;
  source?: string;
}

// Global Custom Event Names
export const CARD_SYNC_EVENTS = {
  PACK_OPENED: "delta:pack-opened",
  COLLECTION_UPDATED: "delta:collection-updated",
  FAVORITE_UPDATED: "delta:favorite-updated"
} as const;

/**
 * Event Dispatchers (Client-side only)
 */
export function dispatchPackOpened(payload: DeltaPackOpenedPayload): void {
  if (typeof window === "undefined") return;
  const detail: DeltaPackOpenedPayload = {
    ...payload,
    timestamp: payload.timestamp || Date.now()
  };
  window.dispatchEvent(new CustomEvent(CARD_SYNC_EVENTS.PACK_OPENED, { detail }));
}

export function dispatchFavoriteUpdated(cardId: string, isFavorite: boolean): void {
  if (typeof window === "undefined") return;
  const detail: DeltaFavoriteUpdatedPayload = {
    card_id: cardId,
    is_favorite: isFavorite,
    timestamp: Date.now()
  };
  window.dispatchEvent(new CustomEvent(CARD_SYNC_EVENTS.FAVORITE_UPDATED, { detail }));
}

export function dispatchCollectionUpdated(source = "manual"): void {
  if (typeof window === "undefined") return;
  const detail: DeltaCollectionUpdatedPayload = {
    source,
    timestamp: Date.now()
  };
  window.dispatchEvent(new CustomEvent(CARD_SYNC_EVENTS.COLLECTION_UPDATED, { detail }));
}

/**
 * Type-safe Subscription Helper
 */
export function subscribeCardEvents(handlers: {
  onPackOpened?: (detail: DeltaPackOpenedPayload) => void;
  onCollectionUpdated?: (detail: DeltaCollectionUpdatedPayload) => void;
  onFavoriteUpdated?: (detail: DeltaFavoriteUpdatedPayload) => void;
}): () => void {
  if (typeof window === "undefined") return () => {};

  const handlePack = (e: Event) => {
    const customEvent = e as CustomEvent<DeltaPackOpenedPayload>;
    handlers.onPackOpened?.(customEvent.detail || { pack_type_id: "unknown", timestamp: Date.now() });
  };

  const handleCollection = (e: Event) => {
    const customEvent = e as CustomEvent<DeltaCollectionUpdatedPayload>;
    handlers.onCollectionUpdated?.(customEvent.detail || { timestamp: Date.now() });
  };

  const handleFavorite = (e: Event) => {
    const customEvent = e as CustomEvent<DeltaFavoriteUpdatedPayload>;
    handlers.onFavoriteUpdated?.(customEvent.detail || { card_id: "", is_favorite: false, timestamp: Date.now() });
  };

  if (handlers.onPackOpened) window.addEventListener(CARD_SYNC_EVENTS.PACK_OPENED, handlePack);
  if (handlers.onCollectionUpdated) window.addEventListener(CARD_SYNC_EVENTS.COLLECTION_UPDATED, handleCollection);
  if (handlers.onFavoriteUpdated) window.addEventListener(CARD_SYNC_EVENTS.FAVORITE_UPDATED, handleFavorite);

  return () => {
    if (handlers.onPackOpened) window.removeEventListener(CARD_SYNC_EVENTS.PACK_OPENED, handlePack);
    if (handlers.onCollectionUpdated) window.removeEventListener(CARD_SYNC_EVENTS.COLLECTION_UPDATED, handleCollection);
    if (handlers.onFavoriteUpdated) window.removeEventListener(CARD_SYNC_EVENTS.FAVORITE_UPDATED, handleFavorite);
  };
}

/**
 * Race Condition Protector for Async Fetches
 * Ensures older delayed responses do not overwrite newer state
 */
export class FetchSequenceGuard {
  private currentSequence = 0;

  public startRequest(): number {
    this.currentSequence += 1;
    return this.currentSequence;
  }

  public isLatest(sequence: number): boolean {
    return sequence === this.currentSequence;
  }
}

/**
 * Debounced Fetch Request Coalescer
 * Prevents multiple rapid events from firing redundant backend requests
 */
export function createDebouncedRevalidator(fn: () => Promise<void>, delayMs = 150): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let pendingRevalidate = false;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(async () => {
      if (inFlight) {
        pendingRevalidate = true;
        return;
      }
      try {
        inFlight = true;
        await fn();
      } finally {
        inFlight = false;
        if (pendingRevalidate) {
          pendingRevalidate = false;
          fn().catch(() => {});
        }
      }
    }, delayMs);
  };
}

/**
 * Optimistic Favorite Updater with Rollback
 */
export async function toggleFavoriteWithRollback(
  cardId: string,
  nextFavorite: boolean,
  setLocalState: (val: boolean) => void
): Promise<boolean> {
  const previousState = !nextFavorite;

  // 1. Optimistic apply & dispatch
  setLocalState(nextFavorite);
  dispatchFavoriteUpdated(cardId, nextFavorite);

  // 2. Call API
  try {
    const res = await fetch("/api/cards/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, isFavorite: nextFavorite })
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    return true;
  } catch (err) {
    console.error("Favorite API mutation failed, rolling back:", err);
    // Rollback on failure
    setLocalState(previousState);
    dispatchFavoriteUpdated(cardId, previousState);
    return false;
  }
}
