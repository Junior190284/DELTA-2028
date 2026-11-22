/**
 * DELTA INFERNO — P14A: Team Showcase 2.0 (pure logic, no DOM).
 *
 * - normalises the team roster (sorted by shirt number, then name),
 * - decides on the photo WITHOUT substitutes: a player shows only their own photo;
 *   with no photo, a silhouette + "ZDJĘCIE WKRÓTCE" (no other player's photo, no
 *   shared/demo asset; sanitizePlayerPhotoCandidate),
 * - computes the carousel geometry (circular offset, card position, swipe).
 */
// relative import with .ts (as in collection-3d/adapter.ts) so that node --test runs without the @/ alias
import { sanitizePlayerPhotoCandidate } from "../cards/playerVisuals.ts";

/** A row from the `players` table (the same columns the dashboard reads). */
export interface RosterPlayerRow {
  id: string;
  display_name: string | null;
  shirt_number: string | number | null;
  position: string | null;
  photo_path?: string | null;
  active?: boolean | null;
}

export type PhotoSource =
  /** a public file in /public (e.g. the demo) */
  | { kind: "static"; url: string }
  /** private storage: a signed URL from the existing /api/player-photo/[id] (logged-in users only) */
  | { kind: "signed"; playerId: string }
  | { kind: "none" };

export interface ShowcasePlayer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  shirtNumber: string | null;
  /** position label (e.g. "NAPASTNIK"); null when there is no data, nothing is invented */
  positionLabel: string | null;
  positionCode: string | null;
  photo: PhotoSource;
}

const POSITION_MAP: Array<{ test: RegExp; code: string; label: string }> = [
  { test: /^(br|gk)$|bramk/i, code: "BR", label: "BRAMKARZ" },
  { test: /^(obr|def|cb|lb|rb)$|obro[nń]/i, code: "OBR", label: "OBROŃCA" },
  { test: /^(pom|mid|cm|dm|am)$|pomoc/i, code: "POM", label: "POMOCNIK" },
  { test: /^(nap|nap\.|st|fw|cf)$|napast/i, code: "NAP", label: "NAPASTNIK" },
];

export function normalizePosition(raw: string | null | undefined): { code: string; label: string } | null {
  const v = (raw || "").trim();
  if (!v) return null;
  const hit = POSITION_MAP.find((p) => p.test.test(v));
  if (hit) return { code: hit.code, label: hit.label };
  // an unknown but non-empty value: show it as is (upper case), without inventing anything
  return { code: v.slice(0, 3).toUpperCase(), label: v.toUpperCase() };
}

export function normalizeShirtNumber(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/^#/, "");
  return s ? s : null;
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: "", lastName: parts[0] || "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/**
 * Photo without substitutes:
 *  - `staticPhotoUrl` (e.g. the demo) goes through sanitizePlayerPhotoCandidate, so another
 *    player's shared portrait (/assets/players/ryszard-*) is rejected for anyone else;
 *  - `photo_path` in storage means a signed URL for THIS player only (by their id);
 *  - nothing: kind "none", i.e. silhouette + "ZDJĘCIE WKRÓTCE".
 */
export function resolveShowcasePhoto(row: RosterPlayerRow, staticPhotoUrl?: string | null): PhotoSource {
  const name = row.display_name || "";
  const safeStatic = sanitizePlayerPhotoCandidate(staticPhotoUrl ?? null, name);
  if (safeStatic) return { kind: "static", url: safeStatic };
  if (typeof row.photo_path === "string" && row.photo_path.trim()) return { kind: "signed", playerId: row.id };
  return { kind: "none" };
}

export function toShowcasePlayer(row: RosterPlayerRow, staticPhotoUrl?: string | null): ShowcasePlayer {
  const fullName = (row.display_name || "").trim() || "ZAWODNIK DELTA";
  const { firstName, lastName } = splitName(fullName);
  const pos = normalizePosition(row.position);
  return {
    id: row.id,
    fullName,
    firstName,
    lastName,
    shirtNumber: normalizeShirtNumber(row.shirt_number),
    positionLabel: pos?.label ?? null,
    positionCode: pos?.code ?? null,
    photo: resolveShowcasePhoto(row, staticPhotoUrl),
  };
}

/** Active players only, sorted by shirt number (no number goes last), then by surname. */
export function buildRoster(rows: RosterPlayerRow[], staticPhotos: Record<string, string | null | undefined> = {}): ShowcasePlayer[] {
  return rows
    .filter((r) => r && r.id && r.active !== false)
    .map((r) => toShowcasePlayer(r, staticPhotos[r.id]))
    .sort((a, b) => {
      const na = a.shirtNumber !== null && /^\d+$/.test(a.shirtNumber) ? Number(a.shirtNumber) : Number.POSITIVE_INFINITY;
      const nb = b.shirtNumber !== null && /^\d+$/.test(b.shirtNumber) ? Number(b.shirtNumber) : Number.POSITIVE_INFINITY;
      if (na !== nb) return na - nb;
      return a.lastName.localeCompare(b.lastName, "pl");
    });
}

// ---------------- Carousel ----------------

export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/** Shortest circular offset of card `index` from the active card (e.g. -1 = left, +1 = right). */
export function circularOffset(index: number, active: number, count: number): number {
  if (count <= 0) return 0;
  let d = wrapIndex(index, count) - wrapIndex(active, count);
  if (d > count / 2) d -= count;
  if (d < -count / 2) d += count;
  // with an even count the card exactly opposite always goes to the right (stable layout)
  if (count % 2 === 0 && d === -count / 2) d = count / 2;
  return d;
}

export interface CardLayout {
  /** horizontal shift as a fraction of the card width */
  x: number;
  scale: number;
  /** darkening 0..1 (applied as an overlay's opacity, not as a filter) */
  dim: number;
  z: number;
  visible: boolean;
}

/** Number of cards shown on each side of the active one. */
export function sideSlots(viewportWidth: number): number {
  if (viewportWidth < 420) return 1;
  if (viewportWidth < 900) return 2;
  return 3;
}

/**
 * 2D layout (translate + scale only: no rotateY/preserve-3d, the lesson from P12E–P12G
 * on phones). The active card is the largest in the middle; the side cards get smaller and darker.
 */
export function cardLayout(offset: number, slots: number): CardLayout {
  const a = Math.abs(offset);
  const visible = a <= slots;
  const scale = a === 0 ? 1 : Math.max(0.5, 0.74 - (a - 1) * 0.12);
  // gap: the side cards sit next to the active one, then partly underneath each other
  const x = a === 0 ? 0 : Math.sign(offset) * (0.5 + scale / 2 + 0.06 + (a - 1) * scale * 0.62);
  const dim = a === 0 ? 0 : Math.min(0.78, 0.46 + (a - 1) * 0.14);
  return { x, scale, dim, z: 100 - a, visible };
}

/** Swipe: dx > threshold means the previous player, dx < -threshold means the next one. */
export function swipeStep(dx: number, threshold = 40): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || Math.abs(dx) < threshold) return 0;
  return dx > 0 ? -1 : 1;
}

// ---------------- P14A.1: small rosters, no duplicates ----------------

export interface CarouselSlot { index: number; offset: number; layout: CardLayout; }

/**
 * Visible carousel positions. Each player occurs EXACTLY ONCE (one index = one card = one
 * offset), so the same person can never be visible in two places, even with 2–3 players
 * on a wide screen. With an even count the card opposite the active one goes to the right
 * (circularOffset), so with 2 players: the active one in the middle, the other on the right.
 */
export function carouselSlots(count: number, active: number, slots: number): CarouselSlot[] {
  const out: CarouselSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = circularOffset(i, active, count);
    const layout = cardLayout(offset, slots);
    if (layout.visible) out.push({ index: i, offset, layout });
  }
  return out.sort((a, b) => a.offset - b.offset);
}

/** Arrows, counter and swipe make sense only with at least 2 players. */
export function showNavigation(count: number): boolean {
  return count >= 2;
}

/**
 * A card "wraps" (e.g. from the far left to the far right) when its offset changes by more
 * than 1. Such a card is NOT animated across the centre (it would look like a second copy
 * flying through); it is moved instantly and gently faded in.
 */
export function isWrapJump(prevOffset: number | undefined, nextOffset: number): boolean {
  return prevOffset !== undefined && Math.abs(nextOffset - prevOffset) > 1;
}

// ---------------- P14A.1 / P14A.2: authentication and roster states ----------------

/**
 * Result of the identity check (P14A.2). Identity is confirmed ONLY by
 * supabase.auth.getUser() (the Supabase SSR mechanism: the auth server verifies the
 * token, and refreshes an expired session when a refresh token exists). The presence
 * or name of a cookie is NOT considered.
 *  - "user":             verified user
 *  - "anonymous":        no session (AuthSessionMissingError or no error and no user)
 *  - "session-invalid":  a session the auth server explicitly rejected (AuthApiError 4xx such as
 *                        bad_jwt, AuthInvalidJwtError, ...)
 *  - "auth-unavailable": the session could not be checked (network, 5xx, AuthRetryableFetchError)
 *
 * KNOWN LIMITATION (P14A.3, deliberate): supabase-js treats a REVOKED session (403
 * session_not_found, e.g. logged out on another device) and an expired session with a
 * FAILED REFRESH (refresh_token_not_found) as a logout: it removes the session and getUser()
 * returns AuthSessionMissingError, the same as for someone who was never logged in. In
 * addition, the shared proxy.ts calls getUser() before the page renders, so the session is
 * already removed by the time the page runs. Distinguishing these cases would require
 * changing the shared request handling (proxy.ts) or inspecting cookies, so it is not done:
 * such a user sees the clearly marked DEMO (never real data) and can sign in again.
 */
export type AuthOutcome = "user" | "anonymous" | "session-invalid" | "auth-unavailable";

/** Only the error type and status are needed; never token values or the error message. */
export interface AuthErrorLike { name?: string | null; status?: number | null; code?: string | null; }

export function classifyAuthResult(hasUser: boolean, error: AuthErrorLike | null | undefined): AuthOutcome {
  if (hasUser) return "user";
  if (!error) return "anonymous";
  const name = error.name || "";
  const status = typeof error.status === "number" ? error.status : null;
  if (name === "AuthSessionMissingError") return "anonymous";
  if (name === "AuthRetryableFetchError" || status === 0 || (status !== null && status >= 500 && name !== "AuthInvalidTokenResponseError")) {
    return "auth-unavailable";
  }
  // AuthApiError 4xx (bad_jwt, session_not_found, session_expired, refresh_token_not_found,
  // user_not_found...), AuthInvalidJwtError, AuthInvalidTokenResponseError, AuthUnknownError
  return "session-invalid";
}

export type RosterState =
  | { kind: "demo" }
  | { kind: "live"; rows: RosterPlayerRow[] }
  | { kind: "empty" }
  | { kind: "error"; reason: "session-invalid" | "auth-unavailable" | "query" };

export interface RosterStateInput {
  auth: AuthOutcome;
  /** the players query returned an error (only for auth = "user") */
  queryFailed: boolean;
  rows: RosterPlayerRow[] | null;
}

/**
 * Decision (P14A.2):
 *  - no verified user, no auth error   -> DEMO (clearly marked)
 *  - expired / invalid session         -> ERROR "session-invalid" (sign in again)
 *  - session check unavailable         -> ERROR "auth-unavailable" (Try again)
 *    in both error cases: NO real data and NO demo masquerading as a team
 *  - verified user + query error       -> ERROR "query" (Try again)
 *  - verified user + empty result      -> EMPTY "Skład jest przygotowywany"
 *  - verified user + players           -> LIVE (query with the user's session, RLS)
 */
export function resolveRosterState(i: RosterStateInput): RosterState {
  if (i.auth === "anonymous") return { kind: "demo" };
  if (i.auth === "session-invalid") return { kind: "error", reason: "session-invalid" };
  if (i.auth === "auth-unavailable") return { kind: "error", reason: "auth-unavailable" };
  if (i.queryFailed || i.rows === null) return { kind: "error", reason: "query" };
  const active = i.rows.filter((r) => r && r.id && r.active !== false);
  if (active.length === 0) return { kind: "empty" };
  return { kind: "live", rows: active };
}
