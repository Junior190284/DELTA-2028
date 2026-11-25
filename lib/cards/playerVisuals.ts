/**
 * Safe player visual asset resolution shared across 3D cards, miniatures, and walkout stages.
 * Prevents falling back to another player's portrait (e.g. ryszard-gold.png / player-default.png)
 * when a player has no individual photo.
 */

const SHARED_RYSZARD_OR_DEMO_PREFIXES = [
  "/assets/players/ryszard-",
  "/assets/cards/inferno-3d/player-default.png",
  "/demo/player-cutout.png"
];

export function isRyszardPlayer(
  playerName?: string | null,
  cardName?: string | null
): boolean {
  const combined = `${playerName || ""} ${cardName || ""}`.toLowerCase();
  return combined.includes("ryszard") || combined.includes("rybacki");
}

export function isSharedRyszardOrDemoAsset(url?: string | null): boolean {
  if (typeof url !== "string") return false;
  const normalized = url.trim().split(/[?#]/)[0].toLowerCase();
  if (!normalized) return false;
  return SHARED_RYSZARD_OR_DEMO_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function sanitizePlayerPhotoCandidate(
  url: string | null | undefined,
  playerName?: string | null,
  cardName?: string | null
): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (!isRyszardPlayer(playerName, cardName) && isSharedRyszardOrDemoAsset(trimmed)) {
    return null;
  }
  return trimmed;
}

export function resolveSafePlayerImageUrl(params: {
  playerName?: string | null;
  cardName?: string | null;
  artworkUrl?: string | null;
  photoPath?: string | null;
  cutoutUrl?: string | null;
  imageUrlOverride?: string | null;
  preferArtworkUrl?: boolean;
}): string | null {
  const {
    playerName,
    cardName,
    artworkUrl,
    photoPath,
    cutoutUrl,
    imageUrlOverride,
    preferArtworkUrl = true
  } = params;

  const candidates = preferArtworkUrl
    ? [imageUrlOverride, cutoutUrl, artworkUrl, photoPath]
    : [imageUrlOverride, cutoutUrl, photoPath, artworkUrl];

  for (const candidate of candidates) {
    const clean = sanitizePlayerPhotoCandidate(candidate, playerName, cardName);
    if (clean) return clean;
  }

  return null;
}
