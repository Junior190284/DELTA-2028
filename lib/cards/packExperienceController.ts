/**
 * DELTA INFERNO 2.0 — Central Cinematic Animation Controller (FSM)
 *
 * Implements a robust, deterministic, single-source-of-truth state machine
 * for cinematic pack opening sequences with zero duplicated cards, stale event protection,
 * configurable timings, and clean audio/media synchronization.
 */

import type { CardDefinition, PackOpeningResult } from "./types.ts";
import {
  type CanonicalCardTheme,
  normalizeCardTheme,
  WALKOUT_PRESENTATION_PRIORITY
} from "./walkout-config.ts";

// =============================================================================
// TYPES & DEFINITIONS
// =============================================================================

export type PackExperiencePhase =
  | "READY"
  | "OPENING"
  | "TRANSITION"
  | "WALKOUT"
  | "HERO_REVEAL"
  | "CARD_REVEAL"
  | "SUMMARY"
  | "COMPLETE";

export type PackExperienceEvent =
  | "PLAY"
  | "NEXT"
  | "SKIP"
  | "CLOSE"
  | "MEDIA_ENDED"
  | "MEDIA_ERROR"
  | "TIMEOUT";

export type PackAudioCue =
  | "TEAR"
  | "TRANSITION_FLASH"
  | "TEASER_HIT"
  | "HERO_FANFARE"
  | "STADIUM_CHEER"
  | "CARD_FLIP"
  | "SUMMARY_CHIME"
  | "STOP_ALL";

export interface PackDrawnItem {
  card: CardDefinition;
  is_duplicate: boolean;
  duplicate_points: number;
  theme: CanonicalCardTheme;
  priority: number;
}

export interface PackTimingConfig {
  openingTearMs: number;
  openingTimeoutMs: number;
  transitionMs: number;
  walkoutStandardMs: number;
  walkoutInfernoMs: number;
}

export const DEFAULT_PACK_TIMINGS: PackTimingConfig = {
  openingTearMs: 1100,
  openingTimeoutMs: 3000,
  transitionMs: 600,
  walkoutStandardMs: 3200,
  walkoutInfernoMs: 4800
};

export interface PackExperienceState {
  phase: PackExperiencePhase;
  generation: number;
  heroCard: PackDrawnItem | null;
  revealCards: PackDrawnItem[];
  currentRevealIndex: number;
  summaryCards: PackDrawnItem[];
  totalCardsCount: number;
  currentDisplayCard: PackDrawnItem | null;
  canSkip: boolean;
  canClose: boolean;
  isComplete: boolean;
  isMuted: boolean;
  hasWalkout: boolean;
  is3DWalkoutEnabled: boolean;
}

export interface PackExperienceControllerOptions {
  result: PackOpeningResult;
  timings?: Partial<PackTimingConfig>;
  reducedMotion?: boolean;
  initialMuted?: boolean;
  onAudioCue?: (cue: PackAudioCue) => void;
  onStateChange?: (state: PackExperienceState) => void;
}

// =============================================================================
// CONTROLLER CLASS
// =============================================================================

export class PackExperienceController {
  private readonly result: PackOpeningResult;
  private readonly timings: PackTimingConfig;
  private readonly reducedMotion: boolean;
  private readonly onAudioCue?: (cue: PackAudioCue) => void;
  private readonly listeners: Set<(state: PackExperienceState) => void> = new Set();

  private phase: PackExperiencePhase = "READY";
  private generation: number = 0;
  private isMuted: boolean = false;
  private activeTimerId: ReturnType<typeof setTimeout> | null = null;

  private readonly heroCard: PackDrawnItem | null;
  private readonly revealCards: PackDrawnItem[];
  private readonly summaryCards: PackDrawnItem[];
  private currentRevealIndex: number = 0;

  constructor(options: PackExperienceControllerOptions) {
    this.result = options.result;
    this.timings = { ...DEFAULT_PACK_TIMINGS, ...options.timings };
    this.reducedMotion = options.reducedMotion ?? false;
    this.isMuted = options.initialMuted ?? false;
    this.onAudioCue = options.onAudioCue;

    if (options.onStateChange) {
      this.listeners.add(options.onStateChange);
    }

    // 1. Map all items with canonical themes and presentation priority
    const allItems: PackDrawnItem[] = (this.result.cards || []).map((item) => {
      const theme = normalizeCardTheme(item.card.card_type || item.card.frame_theme);
      const priority = WALKOUT_PRESENTATION_PRIORITY[theme] || 0;
      return {
        card: item.card,
        is_duplicate: item.is_duplicate,
        duplicate_points: item.duplicate_points,
        theme,
        priority
      };
    });

    this.summaryCards = Object.freeze([...allItems]) as PackDrawnItem[];

    // 2. Select exactly one highest-priority walkout card (if eligible)
    const eligibleWalkouts = allItems
      .filter((c) => c.priority > 0)
      .sort((a, b) => b.priority - a.priority);

    this.heroCard = eligibleWalkouts.length > 0 ? eligibleWalkouts[0] : null;

    // 3. Prepare reveal cards WITHOUT duplicating the heroCard
    if (this.heroCard) {
      // Find index of first matching hero card and exclude only that exact instance
      let heroExcluded = false;
      this.revealCards = allItems.filter((c) => {
        if (!heroExcluded && c.card.id === this.heroCard!.card.id) {
          heroExcluded = true;
          return false;
        }
        return true;
      });
    } else {
      this.revealCards = [...allItems];
    }
  }

  // ===========================================================================
  // SUBSCRIPTION & STATE
  // ===========================================================================

  public subscribe(listener: (state: PackExperienceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): PackExperienceState {
    const currentDisplayCard =
      this.phase === "HERO_REVEAL"
        ? this.heroCard
        : this.phase === "CARD_REVEAL" && this.revealCards.length > 0
        ? this.revealCards[this.currentRevealIndex] || null
        : null;

    return {
      phase: this.phase,
      generation: this.generation,
      heroCard: this.heroCard,
      revealCards: this.revealCards,
      currentRevealIndex: this.currentRevealIndex,
      summaryCards: this.summaryCards,
      totalCardsCount: this.summaryCards.length,
      currentDisplayCard,
      canSkip: this.phase !== "READY" && this.phase !== "SUMMARY" && this.phase !== "COMPLETE",
      canClose: this.phase !== "COMPLETE",
      isComplete: this.phase === "COMPLETE",
      isMuted: this.isMuted,
      hasWalkout: this.heroCard !== null,
      is3DWalkoutEnabled: this.result.enable_3d_walkout === true
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error("PackExperienceController listener error:", err);
      }
    }
  }

  private emitAudio(cue: PackAudioCue): void {
    if (this.isMuted && cue !== "STOP_ALL") return;
    try {
      this.onAudioCue?.(cue);
    } catch (err) {
      console.warn("PackExperienceController onAudioCue error:", err);
    }
  }

  // ===========================================================================
  // TIMERS & GENERATION SAFETY
  // ===========================================================================

  private clearActiveTimer(): void {
    if (this.activeTimerId !== null) {
      clearTimeout(this.activeTimerId);
      this.activeTimerId = null;
    }
  }

  private setStepTimer(ms: number, callback: (generation: number) => void): void {
    this.clearActiveTimer();
    const currentGen = this.generation;
    this.activeTimerId = setTimeout(() => {
      this.activeTimerId = null;
      // Stale event prevention: only execute if generation matches exactly
      if (this.generation === currentGen) {
        callback(currentGen);
      }
    }, ms);
  }

  private transitionTo(newPhase: PackExperiencePhase): void {
    this.clearActiveTimer();
    this.generation++;
    this.phase = newPhase;
    this.notify();
  }

  // ===========================================================================
  // DISPATCH FSM
  // ===========================================================================

  public dispatch(event: PackExperienceEvent): boolean {
    if (this.phase === "COMPLETE") {
      // Completed controller is sealed against further mutations
      return false;
    }

    // Universal Global Actions:
    if (event === "CLOSE") {
      this.clearActiveTimer();
      this.emitAudio("STOP_ALL");
      this.transitionTo("COMPLETE");
      return true;
    }

    if (event === "SKIP") {
      if (this.phase === "READY" || this.phase === "SUMMARY") {
        return false;
      }
      this.clearActiveTimer();
      this.emitAudio("STOP_ALL");
      this.emitAudio("SUMMARY_CHIME");
      this.transitionTo("SUMMARY");
      return true;
    }

    // Phase-specific state machine transitions:
    switch (this.phase) {
      case "READY":
        if (event === "PLAY") {
          if (this.reducedMotion) {
            // Accessibility: instant summary transition
            this.emitAudio("SUMMARY_CHIME");
            this.transitionTo("SUMMARY");
            return true;
          }

          this.emitAudio("TEAR");
          this.transitionTo("OPENING");

          // Watchdog timer for media/tear completion
          this.setStepTimer(this.timings.openingTearMs, (gen) => {
            if (this.generation === gen && this.phase === "OPENING") {
              this.dispatch("MEDIA_ENDED");
            }
          });
          return true;
        }
        return false;

      case "OPENING":
        if (event === "MEDIA_ENDED" || event === "MEDIA_ERROR" || event === "TIMEOUT" || event === "NEXT") {
          this.emitAudio("TRANSITION_FLASH");
          this.transitionTo("TRANSITION");

          // Brief smooth flash transition into next arena
          this.setStepTimer(this.timings.transitionMs, (gen) => {
            if (this.generation === gen && this.phase === "TRANSITION") {
              if (this.heroCard) {
                this.emitAudio("TEASER_HIT");
                this.transitionTo("WALKOUT");

                const walkoutDuration =
                  this.heroCard.theme === "INFERNO" || this.heroCard.theme === "DELTA_ICON"
                    ? this.timings.walkoutInfernoMs
                    : this.timings.walkoutStandardMs;

                this.setStepTimer(walkoutDuration, (wGen) => {
                  if (this.generation === wGen && this.phase === "WALKOUT") {
                    this.dispatch("MEDIA_ENDED");
                  }
                });
              } else if (this.revealCards.length > 0) {
                this.currentRevealIndex = 0;
                this.emitAudio("CARD_FLIP");
                this.transitionTo("CARD_REVEAL");
              } else {
                this.emitAudio("SUMMARY_CHIME");
                this.transitionTo("SUMMARY");
              }
            }
          });
          return true;
        }
        return false;

      case "TRANSITION":
        // Manual override during transition
        if (event === "NEXT" || event === "MEDIA_ENDED") {
          this.clearActiveTimer();
          if (this.heroCard) {
            this.emitAudio("TEASER_HIT");
            this.transitionTo("WALKOUT");
          } else if (this.revealCards.length > 0) {
            this.currentRevealIndex = 0;
            this.emitAudio("CARD_FLIP");
            this.transitionTo("CARD_REVEAL");
          } else {
            this.emitAudio("SUMMARY_CHIME");
            this.transitionTo("SUMMARY");
          }
          return true;
        }
        return false;

      case "WALKOUT":
        if (event === "MEDIA_ENDED" || event === "TIMEOUT" || event === "NEXT") {
          this.emitAudio("HERO_FANFARE");
          this.emitAudio("STADIUM_CHEER");
          this.transitionTo("HERO_REVEAL");
          return true;
        }
        return false;

      case "HERO_REVEAL":
        if (event === "NEXT") {
          if (this.revealCards.length > 0) {
            this.currentRevealIndex = 0;
            this.emitAudio("CARD_FLIP");
            this.transitionTo("CARD_REVEAL");
          } else {
            this.emitAudio("SUMMARY_CHIME");
            this.transitionTo("SUMMARY");
          }
          return true;
        }
        return false;

      case "CARD_REVEAL":
        if (event === "NEXT") {
          if (this.currentRevealIndex + 1 < this.revealCards.length) {
            this.currentRevealIndex++;
            this.emitAudio("CARD_FLIP");
            this.notify();
          } else {
            this.emitAudio("SUMMARY_CHIME");
            this.transitionTo("SUMMARY");
          }
          return true;
        }
        return false;

      case "SUMMARY":
        // End of flow; NEXT moves to complete
        if (event === "NEXT") {
          this.transitionTo("COMPLETE");
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  // ===========================================================================
  // AUDIO CONTROLS & CLEANUP
  // ===========================================================================

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.emitAudio("STOP_ALL");
    }
    this.notify();
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    if (this.isMuted !== muted) {
      this.isMuted = muted;
      if (this.isMuted) {
        this.emitAudio("STOP_ALL");
      }
      this.notify();
    }
  }

  public dispose(): void {
    this.clearActiveTimer();
    this.emitAudio("STOP_ALL");
    this.phase = "COMPLETE";
    this.listeners.clear();
  }
}
