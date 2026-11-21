/**
 * DELTA INFERNO — P13A: Cinematic Hold (pure logic, no DOM).
 *
 * Problem: the stadium intro film (WALKOUT) is played once. After it ends, the browser
 * held the LAST FRAME through HERO_REVEAL and CARD_REVEAL, so the flames "froze" behind
 * the revealed card.
 *
 * Solution: when the film ends a "hold" layer fades in. It is a living, looped ambient
 * background (INFERNO: the static stadium plus a damped loop of inferno-bg.mp4; LEGEND:
 * the static stadium plus light CSS golden beams and particles). The intro film is not
 * played again (no repeated explosion). Once the hold layer fully covers the film, the
 * film is unloaded (its decoder is freed), so at most one video decodes at a time.
 */

export type HoldTheme = "inferno" | "legend";
/** off: no hold; intro: the intro film is playing; hold: the living background behind the card. */
export type HoldStage = "off" | "intro" | "hold";
export type AmbientKind = "inferno-video" | "legend-css" | "static";

/** Phases in which the film/hold background is behind the card. */
const FILM_PHASES = new Set(["WALKOUT", "HERO_REVEAL", "CARD_REVEAL"]);

/** Crossfade length from the film to the hold layer. */
export const HOLD_CROSSFADE_MS = 900;
/** From this film second the ambient video starts preloading (the film lasts 10–11.6 s). */
export const AMBIENT_PRELOAD_FROM_S = 7;

export const AMBIENT_VIDEO_SRC: Record<HoldTheme, string | null> = {
  inferno: "/media/walkouts/inferno-bg.mp4",
  // LEGEND: no ambient video. Only CSS (beams + particles) over the static stadium.
  legend: null,
};

/** Static stadium base under the ambient layer (the same images that sit behind the film today). */
export const HOLD_STILL_SRC: Record<HoldTheme, string> = {
  inferno: "/media/walkouts/delta-inferno-red-stadium.webp",
  legend: "/media/walkouts/delta-legend-stadium.webp",
};

export interface HoldStageInput {
  phase: string | null | undefined;
  /** the pack has a matching stadium film and it is in use (not the fallback) */
  hasFilm: boolean;
  /** the intro film has ended (the "ended" event) */
  filmEnded: boolean;
}

/**
 * Lifecycle stage:
 *  - outside WALKOUT/HERO_REVEAL/CARD_REVEAL (READY, OPENING, TRANSITION, SUMMARY, COMPLETE): off
 *  - film still playing (also when the user moved on to HERO before the end): intro.
 *    The film finishes ONCE; it is not restarted.
 *  - film ended: hold, for as long as the card is shown (no time limit)
 */
export function holdStage({ phase, hasFilm, filmEnded }: HoldStageInput): HoldStage {
  if (!hasFilm || !phase || !FILM_PHASES.has(phase)) return "off";
  return filmEnded ? "hold" : "intro";
}

/** Kind of living background. Reduced Motion: always a static image. */
export function ambientKind(theme: HoldTheme, reducedMotion: boolean): AmbientKind {
  if (reducedMotion) return "static";
  return theme === "inferno" ? "inferno-video" : "legend-css";
}

/** Whether to mount the ambient video now (preload): only near the end of the film or during hold. */
export function shouldMountAmbientVideo(input: { stage: HoldStage; kind: AmbientKind; filmTime: number }): boolean {
  if (input.kind !== "inferno-video") return false;
  if (input.stage === "hold") return true;
  return input.stage === "intro" && Number.isFinite(input.filmTime) && input.filmTime >= AMBIENT_PRELOAD_FROM_S;
}

/** The ambient video plays only during hold and while the tab is visible. */
export function shouldPlayAmbientVideo(input: { stage: HoldStage; kind: AmbientKind; documentHidden: boolean }): boolean {
  return input.stage === "hold" && input.kind === "inferno-video" && !input.documentHidden;
}

/**
 * The intro film is unloaded once it has ended AND the hold layer has fully covered it.
 * It stays unloaded until a new session (READY resets the flags), including in SUMMARY,
 * so it is not loaded again in the background for no reason.
 */
export function shouldReleaseFilm(input: { filmEnded: boolean; holdOpaque: boolean }): boolean {
  return input.filmEnded && input.holdOpaque;
}

/**
 * Number of videos decoding at once (model for tests / budget):
 * intro: the film (the ambient video can only be preloading, paused);
 * hold: the film has ended (paused at its last frame, then unloaded) plus the ambient video.
 */
export function activeDecoders(input: { stage: HoldStage; kind: AmbientKind; documentHidden?: boolean }): number {
  if (input.stage === "intro") return 1;
  if (input.stage === "hold") return shouldPlayAmbientVideo({ stage: "hold", kind: input.kind, documentHidden: Boolean(input.documentHidden) }) ? 1 : 0;
  return 0;
}

/**
 * Deterministic LEGEND particles (no Math.random: stable between renders and testable).
 * Every animation uses transform/opacity only (compositor), no blur filter animations.
 */
export interface LegendParticle { left: number; size: number; duration: number; delay: number; drift: number; }
export function legendParticles(count = 18): LegendParticle[] {
  const out: LegendParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    // golden ratio spreads the particles evenly without randomness
    const g = (i * 0.61803398875) % 1;
    out.push({
      left: Math.round((4 + g * 92) * 10) / 10,
      size: 2 + ((i * 7) % 4),
      duration: 6 + ((i * 5) % 6),
      delay: -((i * 1.37) % 9),
      drift: ((i * 37) % 60) - 30,
    });
  }
  return out;
}
