/**
 * DELTA COLLECTION 3D ENGINE — UNIVERSAL AUDIO ENGINE
 * 
 * Professional Web Audio API Synthesizer & Sound Designer
 * Parameterized by Theme (CardVisualType) and Economic Rarity (CollectionCategory).
 * 
 * Architecture:
 * Master Limiter (DynamicsCompressorNode) -> Master Gain -> Destination
 * Sub-busses:
 * - Stadium Atmosphere Bus (filtered crowd bed)
 * - Harmonic Music Bus (thematic chord pads & fanfares)
 * - SFX / Impact Bus (sub-drops, risers, whooshes)
 * 
 * Guarantees zero audio asset dependency failures via 100% synthetic procedural generation.
 */

import { CardVisualType, CollectionCategory } from "./types";

interface ThemeSoundProfile {
  droneFreq: number; // Hz
  subDropFreq: number; // Hz
  riserStart: number;
  riserEnd: number;
  fanfareChords: number[][]; // Frequencies for victory fanfare
  timbre: "volcanic" | "golden" | "electric" | "celestial" | "athletic" | "neutral";
}

const THEME_AUDIO_PROFILES: Record<CardVisualType, ThemeSoundProfile> = {
  INFERNO_ULTRA: {
    droneFreq: 48,
    subDropFreq: 38,
    riserStart: 60,
    riserEnd: 520,
    fanfareChords: [
      [116.54, 174.61, 233.08], // Bb minor
      [130.81, 196.00, 261.63], // C minor
      [146.83, 220.00, 293.66]  // D minor power
    ],
    timbre: "volcanic"
  },
  GOLD_MASTER: {
    droneFreq: 110,
    subDropFreq: 55,
    riserStart: 110,
    riserEnd: 660,
    fanfareChords: [
      [174.61, 220.00, 261.63], // F major
      [196.00, 246.94, 293.66], // G major
      [220.00, 277.18, 329.63]  // A major brass
    ],
    timbre: "golden"
  },
  MATCHDAY_HERO: {
    droneFreq: 130,
    subDropFreq: 65,
    riserStart: 130,
    riserEnd: 780,
    fanfareChords: [
      [130.81, 164.81, 196.00], // C major
      [174.61, 220.00, 261.63], // F major
      [196.00, 246.94, 293.66]  // G major triumph
    ],
    timbre: "electric"
  },
  DELTA_ICON: {
    droneFreq: 146,
    subDropFreq: 50,
    riserStart: 146,
    riserEnd: 880,
    fanfareChords: [
      [146.83, 220.00, 293.66, 440.00], // D major majestic
      [164.81, 246.94, 329.63, 493.88], // E major
      [185.00, 277.18, 369.99, 554.37]  // F# major royal
    ],
    timbre: "celestial"
  },
  TRAINING_HERO: {
    droneFreq: 90,
    subDropFreq: 58,
    riserStart: 90,
    riserEnd: 540,
    fanfareChords: [
      [110.00, 164.81, 220.00], // A minor
      [130.81, 196.00, 261.63], // C major
      [146.83, 220.00, 293.66]  // D minor
    ],
    timbre: "athletic"
  },
  BASE: {
    droneFreq: 80,
    subDropFreq: 60,
    riserStart: 80,
    riserEnd: 420,
    fanfareChords: [
      [130.81, 164.81, 196.00], // C major
      [146.83, 185.00, 220.00]  // D major
    ],
    timbre: "neutral"
  },
  STAR_PLAYER: {
    droneFreq: 110,
    subDropFreq: 55,
    riserStart: 110,
    riserEnd: 660,
    fanfareChords: [
      [174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66]
    ],
    timbre: "golden"
  },
  SEASONAL_EVENT: {
    droneFreq: 120,
    subDropFreq: 50,
    riserStart: 120,
    riserEnd: 720,
    fanfareChords: [
      [146.83, 220.00, 293.66],
      [196.00, 246.94, 293.66]
    ],
    timbre: "electric"
  }
};

export class UniversalAudioEngine {
  private ctx: AudioContext | null = null;
  private _isMuted: boolean = true;

  // Master Chain & Peak Limiter
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  // 3 Busses
  private stadiumBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  // Active oscillators and nodes for safe cleanup
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private activeTimeouts: NodeJS.Timeout[] = [];

  constructor() {
    // Lazy initialized on first user interaction
  }

  public initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // 1. Master Peak Limiter (-2.5 dBFS threshold, 10:1 ratio)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-2.5, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(4.0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(10.0, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.18, this.ctx.currentTime);

        // 2. Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : 0.85, this.ctx.currentTime);

        this.limiter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 3. Sub-mix Busses
        this.stadiumBus = this.ctx.createGain();
        this.stadiumBus.gain.setValueAtTime(0.25, this.ctx.currentTime);
        this.stadiumBus.connect(this.limiter);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.setValueAtTime(0.55, this.ctx.currentTime);
        this.musicBus.connect(this.limiter);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.sfxBus.connect(this.limiter);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this._isMuted;
  }

  /**
   * 0–3s AWAKENING: Ambient Drone + Stadium Atmosphere
   */
  public playAwakening(themeId: CardVisualType = "INFERNO_ULTRA"): void {
    const ctx = this.initContext();
    if (!ctx || !this.musicBus || this._isMuted) return;

    const profile = THEME_AUDIO_PROFILES[themeId] || THEME_AUDIO_PROFILES.INFERNO_ULTRA;
    const now = ctx.currentTime;

    // Sub-bass drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = profile.timbre === "volcanic" ? "sawtooth" : profile.timbre === "golden" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(profile.droneFreq, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(profile.droneFreq * 2.8, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    osc.start(now);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
  }

  /**
   * 3–7s TENSION BUILD: Heartbeat Pulses & Harmonic Bed
   */
  public playHeartbeatPulse(intensity = 1.0, themeId: CardVisualType = "INFERNO_ULTRA"): void {
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || this._isMuted) return;

    const profile = THEME_AUDIO_PROFILES[themeId] || THEME_AUDIO_PROFILES.INFERNO_ULTRA;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(profile.droneFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(profile.droneFreq * 0.7, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42 * intensity, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * 7–9s CHARGING RISER
   */
  public playTensionRiser(themeId: CardVisualType = "INFERNO_ULTRA"): void {
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || this._isMuted) return;

    const profile = THEME_AUDIO_PROFILES[themeId] || THEME_AUDIO_PROFILES.INFERNO_ULTRA;
    const now = ctx.currentTime;
    const duration = 2.0;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = profile.timbre === "volcanic" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(profile.riserStart, now);
    osc.frequency.exponentialRampToValueAtTime(profile.riserEnd, now + duration);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(profile.riserStart * 1.5, now);
    filter.frequency.exponentialRampToValueAtTime(profile.riserEnd * 1.2, now + duration);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.48, now + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + duration + 0.05);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
  }

  /**
   * 8.5s WHOOSH: Fast aerodynamic sweep
   */
  public playWhoosh(): void {
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || this._isMuted) return;

    const now = ctx.currentTime;
    const duration = 0.65;

    // White noise sweep
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(450, now + duration);
    filter.Q.setValueAtTime(3.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
  }

  /**
   * 9.0s GRAND IMPACT: Massive sub-bass drop & reveal punch
   */
  public playGrandImpact(themeId: CardVisualType = "INFERNO_ULTRA", rarity: CollectionCategory = "INFERNO"): void {
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || this._isMuted) return;

    const profile = THEME_AUDIO_PROFILES[themeId] || THEME_AUDIO_PROFILES.INFERNO_ULTRA;
    const now = ctx.currentTime;

    // Rarity boost
    const rarityMultiplier = rarity === "INFERNO" ? 1.3 : rarity === "LEGEND" ? 1.2 : rarity === "GOLD" ? 1.1 : 0.9;

    // 1. Sub-bass Earthquake Boom (38-55Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(profile.subDropFreq * 2.2, now);
    subOsc.frequency.exponentialRampToValueAtTime(profile.subDropFreq, now + 0.35);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.85 * rarityMultiplier, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    subOsc.connect(subGain);
    subGain.connect(this.sfxBus);

    subOsc.start(now);
    subOsc.stop(now + 1.3);

    // 2. Punch Transient (Kick click)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(320, now);
    clickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    clickGain.gain.setValueAtTime(0.6 * rarityMultiplier, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxBus);

    clickOsc.start(now);
    clickOsc.stop(now + 0.12);
  }

  /**
   * 9.5–12s TRIUMPHANT FANFARE: Harmonic chord progression
   */
  public playVictoryFanfare(themeId: CardVisualType = "INFERNO_ULTRA", rarity: CollectionCategory = "INFERNO"): void {
    const ctx = this.initContext();
    if (!ctx || !this.musicBus || this._isMuted) return;

    const profile = THEME_AUDIO_PROFILES[themeId] || THEME_AUDIO_PROFILES.INFERNO_ULTRA;
    const now = ctx.currentTime;
    const chords = profile.fanfareChords;

    chords.forEach((chord, stepIdx) => {
      const stepTime = now + stepIdx * 0.55;
      const stepDuration = stepIdx === chords.length - 1 ? 1.8 : 0.6;

      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = profile.timbre === "volcanic" ? "sawtooth" : profile.timbre === "golden" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, stepTime);

        gain.gain.setValueAtTime(0.001, stepTime);
        gain.gain.linearRampToValueAtTime(0.12, stepTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + stepDuration);

        osc.connect(gain);
        gain.connect(this.musicBus!);

        osc.start(stepTime);
        osc.stop(stepTime + stepDuration + 0.1);

        this.activeOscillators.push(osc);
        this.activeGainNodes.push(gain);
      });
    });
  }

  /**
   * 11.5s FADE OUT FINALE
   */
  public fadeOutFinale(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.5);
  }

  /**
   * Safe instantaneous stop and cleanup of all active oscillators
   */
  public stopAll(): void {
    this.activeTimeouts.forEach((t) => clearTimeout(t));
    this.activeTimeouts = [];

    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeOscillators = [];

    this.activeGainNodes.forEach((gain) => {
      try {
        gain.disconnect();
      } catch {
        // safe fallback
      }
    });
    this.activeGainNodes = [];

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
  }
}

// Global singleton instance
export const universalAudio = new UniversalAudioEngine();
