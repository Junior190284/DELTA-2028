/**
 * DELTA 2018 GM — INFERNO WALKOUT V3.1: STADIUM AUDIO MASTERING
 *
 * Professional 3-Bus Architecture + Master Peak Limiter (DynamicsCompressorNode):
 * Bus 1: Stadium Atmosphere (stadium_cheer, delta_chant, volumetric lowpass filter)
 * Bus 2: Cinematic Music (walkout_fanfare, harmonic tension beds)
 * Bus 3: Impact & Sound FX (sub-drop, heartbeat pulses, risers, air whoosh, teaser hit)
 * -> Master Limiter (-2.5 dBFS threshold, 10:1 ratio, 3ms attack) -> Master Gain -> Destination
 */

class InfernoAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;

  // Master Chain & Peak Limiter
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  // 3 Independent Sub-mix Busses
  private stadiumBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  // Stadium Filter (opens up as tension builds)
  private stadiumFilter: BiquadFilterNode | null = null;

  // Audio Elements (Licensed local club & studio assets)
  private cheerAudio: HTMLAudioElement | null = null;
  private chantAudio: HTMLAudioElement | null = null;
  private fanfareAudio: HTMLAudioElement | null = null;
  private flipAudio: HTMLAudioElement | null = null;
  private teaserAudio: HTMLAudioElement | null = null;

  // Track if media sources have been connected to Web Audio context
  private sourcesConnected: boolean = false;

  // Active oscillators and nodes for safe, instantaneous cleanup
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private activeTimeouts: NodeJS.Timeout[] = [];

  constructor() {
    // Lazy AudioContext init to obey browser autoplay policies
  }

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // 1. Master Peak Limiter (Protects against 0 dBFS clipping with musical soft-knee curve)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-2.5, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(4.0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(10.0, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime); // 3ms ultra-fast transient catch
        this.limiter.release.setValueAtTime(0.18, this.ctx.currentTime); // 180ms smooth release

        // 2. Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);

        this.limiter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 3. Sub-mix Busses
        this.stadiumBus = this.ctx.createGain();
        this.stadiumBus.gain.setValueAtTime(0.25, this.ctx.currentTime);

        // Volumetric Stadium Lowpass filter: distant (550Hz) -> wide open (12kHz)
        this.stadiumFilter = this.ctx.createBiquadFilter();
        this.stadiumFilter.type = "lowpass";
        this.stadiumFilter.frequency.setValueAtTime(550, this.ctx.currentTime);
        this.stadiumFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

        this.stadiumFilter.connect(this.stadiumBus);
        this.stadiumBus.connect(this.limiter);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.setValueAtTime(0.0, this.ctx.currentTime);
        this.musicBus.connect(this.limiter);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.sfxBus.connect(this.limiter);
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    this.connectMediaElements();
    return this.ctx;
  }

  private initAudioElements() {
    if (typeof window === "undefined") return;
    if (!this.cheerAudio) {
      try {
        this.cheerAudio = new Audio("/sounds/stadium_cheer.mp3");
        this.cheerAudio.loop = true;
        this.cheerAudio.preload = "auto";

        this.chantAudio = new Audio("/sounds/delta_chant.mp3");
        this.chantAudio.loop = true;
        this.chantAudio.preload = "auto";

        this.fanfareAudio = new Audio("/sounds/walkout_fanfare.mp3");
        this.fanfareAudio.preload = "auto";

        this.flipAudio = new Audio("/sounds/card_flip.mp3");
        this.flipAudio.preload = "auto";

        this.teaserAudio = new Audio("/sounds/teaser_hit.mp3");
        this.teaserAudio.preload = "auto";
      } catch {
        // Safe fallback
      }
    }
  }

  private connectMediaElements() {
    if (this.sourcesConnected || !this.ctx || !this.stadiumFilter || !this.musicBus || !this.sfxBus) {
      return;
    }
    this.initAudioElements();

    try {
      if (this.cheerAudio) {
        const source = this.ctx.createMediaElementSource(this.cheerAudio);
        source.connect(this.stadiumFilter);
      }
      if (this.chantAudio) {
        const source = this.ctx.createMediaElementSource(this.chantAudio);
        source.connect(this.stadiumFilter);
      }
      if (this.fanfareAudio) {
        const source = this.ctx.createMediaElementSource(this.fanfareAudio);
        source.connect(this.musicBus);
      }
      if (this.flipAudio) {
        const source = this.ctx.createMediaElementSource(this.flipAudio);
        source.connect(this.sfxBus);
      }
      if (this.teaserAudio) {
        const source = this.ctx.createMediaElementSource(this.teaserAudio);
        source.connect(this.sfxBus);
      }
      this.sourcesConnected = true;
    } catch {
      // If browser security limits createMediaElementSource, fallback to standard element.volume
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.initAudioElements();
    const ctx = this.initContext();
    if (this.masterGain && ctx) {
      ctx.resume().catch(() => {});
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.85, ctx.currentTime + 0.1);
    }
    // Also sync element volumes as safe fallback
    const volMult = muted ? 0 : 1;
    if (this.cheerAudio) this.cheerAudio.volume = 0.5 * volMult;
    if (this.chantAudio) this.chantAudio.volume = 0.45 * volMult;
    if (this.fanfareAudio) this.fanfareAudio.volume = 0.85 * volMult;
    if (this.flipAudio) this.flipAudio.volume = 0.75 * volMult;
    if (this.teaserAudio) this.teaserAudio.volume = 0.8 * volMult;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stopAll() {
    // 1. Stop all active oscillators
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.activeOscillators = [];

    // 2. Disconnect active transient gains
    for (const g of this.activeGainNodes) {
      try {
        g.disconnect();
      } catch {}
    }
    this.activeGainNodes = [];

    // 3. Clear pending timeouts
    for (const t of this.activeTimeouts) {
      clearTimeout(t);
    }
    this.activeTimeouts = [];

    // 4. Pause and rewind all audio elements
    const elements = [this.cheerAudio, this.chantAudio, this.fanfareAudio, this.flipAudio, this.teaserAudio];
    for (const el of elements) {
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
    }

    // 5. Cancel scheduled automation on all busses
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.stadiumBus) this.stadiumBus.gain.cancelScheduledValues(now);
      if (this.musicBus) this.musicBus.gain.cancelScheduledValues(now);
      if (this.sfxBus) this.sfxBus.gain.cancelScheduledValues(now);
      if (this.stadiumFilter) this.stadiumFilter.frequency.cancelScheduledValues(now);
      if (this.masterGain) this.masterGain.gain.cancelScheduledValues(now);
    }
  }

  // --------------------------------------------------------------------------
  // 0–3 s — THE AWAKENING: Niski ambient, odległy stadion, powoli narastający bas
  // --------------------------------------------------------------------------
  public playAwakening() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.stadiumBus || !this.stadiumFilter || !this.sfxBus) return;

    const now = ctx.currentTime;

    // Stadium Atmosphere: low distant murmur with 550Hz filter
    this.stadiumFilter.frequency.cancelScheduledValues(now);
    this.stadiumFilter.frequency.setValueAtTime(550, now);
    this.stadiumFilter.frequency.linearRampToValueAtTime(850, now + 3.0);

    this.stadiumBus.gain.cancelScheduledValues(now);
    this.stadiumBus.gain.setValueAtTime(0.14, now);
    this.stadiumBus.gain.linearRampToValueAtTime(0.26, now + 3.0);

    if (this.cheerAudio) {
      this.cheerAudio.currentTime = 0;
      this.cheerAudio.play().catch(() => {});
    }

    // Warm Sub-bass rumble: 44Hz -> 50Hz, filtered lowpass 95Hz -> 130Hz
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(44, now);
    osc.frequency.linearRampToValueAtTime(50, now + 3.0);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(95, now);
    filter.frequency.linearRampToValueAtTime(130, now + 3.0);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 2.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 3.2);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);

    // Subtle metallic resonance chime (380Hz)
    this.playMetallicChime(380, 0.16);
  }

  // --------------------------------------------------------------------------
  // 3–5 s — RHYTHMIC ENGAGEMENT: Mocniejszy rytm, stadion zaczyna reagować
  // --------------------------------------------------------------------------
  public startTensionPad() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || !this.stadiumFilter || !this.stadiumBus) return;

    const now = ctx.currentTime;

    // Stadium reacts to lighting: filter opens to 2,200Hz, gain increases to 0.40
    this.stadiumFilter.frequency.linearRampToValueAtTime(2200, now + 2.0);
    this.stadiumBus.gain.linearRampToValueAtTime(0.40, now + 2.0);

    // Warm tension pad (55Hz Reese-style subtle texture)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.linearRampToValueAtTime(240, now + 2.0);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 2.1);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
  }

  // Heartbeat pulse (3.0s, 3.8s, 4.6s, 5.3s, 5.9s, 6.5s)
  public playHeartbeat(intensity: number, startFreq: number, endFreq: number) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.32);

    gain.gain.setValueAtTime(intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.36);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
  }

  // --------------------------------------------------------------------------
  // 5–7 s — ESCALATING CHANT & DOPING: Wyraźny wzrost napięcia, doping i energia
  // --------------------------------------------------------------------------
  public startStadiumChant() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.stadiumBus || !this.stadiumFilter) return;

    const now = ctx.currentTime;

    // Stadium filter opens to 6,500Hz, broad stadium presence
    this.stadiumFilter.frequency.linearRampToValueAtTime(6500, now + 1.8);
    this.stadiumBus.gain.linearRampToValueAtTime(0.55, now + 1.8);

    // Fade in DELTA chant
    if (this.chantAudio) {
      this.chantAudio.currentTime = 0;
      this.chantAudio.play().catch(() => {});
    }
  }

  // --------------------------------------------------------------------------
  // 7–9 s — REVEAL RISER & WHOOSH: Intensywny riser, whoosh, pre-drop breath
  // --------------------------------------------------------------------------
  public playEnergyRiser() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || !this.stadiumBus) return;

    const now = ctx.currentTime;

    // Stadium swell approaching reveal
    this.stadiumBus.gain.linearRampToValueAtTime(0.68, now + 1.8);

    // Multi-harmonic energy riser (sawtooth through resonant bandpass)
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 1.85);

    filter.type = "bandpass";
    filter.Q.setValueAtTime(4.2, now);
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 1.85);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 1.6);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.85); // Cuts right at pre-drop breath!

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 1.86);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
  }

  public playSpinWhoosh() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus) return;

    if (this.flipAudio) {
      this.flipAudio.currentTime = 0;
      this.flipAudio.play().catch(() => {});
    }

    // Procedural filtered noise whoosh for physical air slicing
    const bufferSize = Math.floor(ctx.sampleRate * 0.6);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(2.0, ctx.currentTime);
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.35);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.58);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.25);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.58);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    whiteNoise.start(ctx.currentTime);
  }

  // Pre-drop tension breath (8.85s – 8.98s): brief mid-range ducking creates psychoacoustic punch
  public playPreDropBreath() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.stadiumBus) return;

    const now = ctx.currentTime;
    // Duck stadium by 50% for 120ms right before 9.0s explosion
    this.stadiumBus.gain.cancelScheduledValues(now);
    this.stadiumBus.gain.setValueAtTime(0.30, now);
    this.stadiumBus.gain.setValueAtTime(0.20, now + 0.08);
  }

  // --------------------------------------------------------------------------
  // 9.0 s — THE GRAND IMPACT: Potężne uderzenie kinowe + fanfara + wiwaty
  // --------------------------------------------------------------------------
  public playGrandImpact() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxBus || !this.musicBus || !this.stadiumBus || !this.stadiumFilter) return;

    const now = ctx.currentTime;

    // 1. Stadium Eruption: maximum width, 12kHz filter, peak gain 0.78
    this.stadiumFilter.frequency.cancelScheduledValues(now);
    this.stadiumFilter.frequency.setValueAtTime(12000, now);
    this.stadiumBus.gain.cancelScheduledValues(now);
    this.stadiumBus.gain.setValueAtTime(0.78, now);

    // 2. Music Bus: Walkout Fanfare entrance
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(0.82, now);

    if (this.fanfareAudio) {
      this.fanfareAudio.currentTime = 0;
      this.fanfareAudio.play().catch(() => {});
    }

    // 3. Studio Teaser Impact Trigger
    if (this.teaserAudio) {
      this.teaserAudio.currentTime = 0;
      this.teaserAudio.play().catch(() => {});
    }

    // 4. Punchy Sub-Drop (95Hz -> 25Hz over 0.75s, gain 0.82)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.75);

    subGain.gain.setValueAtTime(0.82, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    subOsc.connect(subGain);
    subGain.connect(this.sfxBus);

    subOsc.start(now);
    subOsc.stop(now + 1.15);
    this.activeOscillators.push(subOsc);
    this.activeGainNodes.push(subGain);

    // 5. High-Pressure Noise Transient Burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(160, now + 0.35);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.48, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxBus);

    noiseSource.start(now);
  }

  // --------------------------------------------------------------------------
  // 11.2–12.0 s — CONTROLLED FINALE FADE-OUT
  // --------------------------------------------------------------------------
  public fadeOutFinale() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const fadeDuration = 0.8; // 11.2s -> 12.0s

    if (this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
      this.musicBus.gain.linearRampToValueAtTime(0.0, now + fadeDuration);
    }
    if (this.stadiumBus) {
      this.stadiumBus.gain.cancelScheduledValues(now);
      this.stadiumBus.gain.setValueAtTime(this.stadiumBus.gain.value, now);
      this.stadiumBus.gain.linearRampToValueAtTime(0.0, now + fadeDuration);
    }
  }

  // Metallic Chime Helper
  private playMetallicChime(freq: number, gainVal: number) {
    if (!this.ctx || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 1.85);
    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
  }
}

export const infernoAudio = new InfernoAudioEngine();
export default infernoAudio;
