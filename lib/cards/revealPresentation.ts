/**
 * DELTA INFERNO — P12G: card reveal presentation (pure logic, no DOM).
 *
 * 1. Which face of a 3D card faces the viewer for a given rotation.
 * 2. Whether the final reveal (HERO_REVEAL / CARD_REVEAL) should use the safe 2D card
 *    instead of CSS 3D. On phones CSS 3D (preserve-3d + backface-visibility +
 *    nested transforms) produced an edge-on card, black rectangles and an
 *    accidentally visible back, while the same card in the 2D summary rendered
 *    correctly.
 */

export type CardFace = "front" | "back" | "edge";
export type RevealForce = "2d" | "3d" | null;

const DEG = Math.PI / 180;

/** Normalises an angle to the range (-180°, 180°]. */
export function normalizeAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const n = ((((deg + 180) % 360) + 360) % 360) - 180;
  return n === -180 ? 180 : n;
}

/**
 * Z component of the front face's normal after rotateX(pitch) rotateY(yaw)
 * (= matrix m33). > 0: front toward the viewer, < 0: back.
 */
export function frontFacingFactor(yawDeg: number, pitchDeg = 0): number {
  return Math.cos(normalizeAngle(yawDeg) * DEG) * Math.cos(normalizeAngle(pitchDeg) * DEG);
}

/**
 * Which face is clearly visible. "edge" means the card is turned more than 60° from
 * both faces: the viewer sees mostly the edge, and neither face may be hidden.
 */
export function faceForRotation(yawDeg: number, pitchDeg = 0): CardFace {
  return faceForFacingFactor(frontFacingFactor(yawDeg, pitchDeg));
}

export function faceForFacingFactor(m33: number): CardFace {
  if (!Number.isFinite(m33)) return "edge";
  if (m33 >= 0.5) return "front";
  if (m33 <= -0.5) return "back";
  return "edge";
}

/** Reveal phases in which the card is meant to rest, front facing the viewer. */
export const FINAL_REVEAL_PHASES = ["HERO_REVEAL", "CARD_REVEAL"] as const;

export function isFinalRevealPhase(phase: string | null | undefined): boolean {
  return phase === "HERO_REVEAL" || phase === "CARD_REVEAL";
}

/** Test switch from the URL: ?cardReveal=2d or ?cardReveal=3d (anything else = automatic). */
export function parseRevealForce(search: string | null | undefined): RevealForce {
  if (!search) return null;
  try {
    const v = new URLSearchParams(search).get("cardReveal");
    return v === "2d" || v === "3d" ? v : null;
  } catch {
    return null;
  }
}

/**
 * P12G.1: production domains. The list matches the /preview route guard
 * (app/preview/layout.tsx), so the test switch is inactive in the same places
 * where test routes are blocked.
 */
export function isProductionHost(host: string | null | undefined): boolean {
  const h = (host || "").toLowerCase().split(":")[0];
  return h.includes("gm2018.pl") || h === "delta-2028.vercel.app";
}

export interface RevealForceContext {
  /** process.env.NEXT_PUBLIC_VERCEL_ENV (set by Vercel at build time; may be missing). */
  vercelEnv?: string | null;
  /** window.location.hostname */
  host?: string | null;
}

/**
 * P12G.1: the ?cardReveal=2d|3d switch is for tests only. In production (Vercel
 * environment "production" or a production domain) it is IGNORED: the user always
 * gets the automatic mode (2D on phones), so nobody can force the unstable 3D on a
 * phone with a link. On local dev and Vercel Preview it works as before.
 */
export function resolveRevealForce(raw: RevealForce, ctx: RevealForceContext = {}): RevealForce {
  if (raw !== "2d" && raw !== "3d") return null;
  if (ctx.vercelEnv === "production") return null;
  if (isProductionHost(ctx.host)) return null;
  return raw;
}

export interface SafeRevealInput {
  viewportWidth: number;
  coarsePointer: boolean;
  reducedMotion: boolean;
  force?: RevealForce;
}

/** Width at or below which (or on any touch screen) the final reveal uses the 2D card. */
export const SAFE_REVEAL_MAX_WIDTH = 820;

/**
 * The 2D card is used on phones/touch screens, at narrow widths and with Reduced Motion.
 * Desktop with a mouse keeps the full CSS 3D card.
 */
export function shouldUseSafe2DReveal({ viewportWidth, coarsePointer, reducedMotion, force = null }: SafeRevealInput): boolean {
  if (force === "2d") return true;
  if (force === "3d") return false;
  if (reducedMotion) return true;
  if (coarsePointer) return true;
  return Number.isFinite(viewportWidth) && viewportWidth > 0 && viewportWidth <= SAFE_REVEAL_MAX_WIDTH;
}

/**
 * Rotation after the finger is lifted in a final-reveal phase: the card always returns to
 * the front (yaw 0, pitch 0). Previously the card stayed where the finger left it, e.g.
 * edge-on after a ~165 px swipe.
 */
export function restingRotationAfterRelease(): { yaw: number; pitch: number } {
  return { yaw: 0, pitch: 0 };
}

/**
 * P12G.1: which face is visible after the gesture ends. The return resets only the
 * drag offset. A deliberate choice of the back (isFlipped = "Rewers" button, which
 * Card3DEngine adds as +180°) is preserved.
 */
export function restingFaceAfterRelease(isFlipped: boolean): CardFace {
  const rest = restingRotationAfterRelease();
  return faceForRotation(rest.yaw + (isFlipped ? 180 : 0), rest.pitch);
}
