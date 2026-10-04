"use client";

// High-fidelity Audio Engine with real MP3 samples and Web Audio fallback
class CardSoundEngine {
  private ctx: AudioContext | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      // Preload MP3 audio files
      this.preloadAudio("pack_tear", "/sounds/pack_tear.mp3");
      this.preloadAudio("teaser_hit", "/sounds/teaser_hit.mp3");
      this.preloadAudio("walkout_fanfare", "/sounds/walkout_fanfare.mp3");
      this.preloadAudio("stadium_cheer", "/sounds/stadium_cheer.mp3");
      this.preloadAudio("card_flip", "/sounds/card_flip.mp3");
      this.preloadAudio("delta_chant", "/sounds/delta_chant.mp3");
    }
  }

  private preloadAudio(key: string, src: string) {
    try {
      const audio = new Audio(src);
      audio.preload = "auto";
      this.audioCache.set(key, audio);
    } catch {}
  }

  private playSample(key: string, volume: number = 0.8, playbackRate: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      try {
        const cached = this.audioCache.get(key);
        const audio = cached ? (cached.cloneNode() as HTMLAudioElement) : new Audio(`/sounds/${key}.mp3`);
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.playbackRate = playbackRate;
        audio.play().then(() => resolve()).catch(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Soft card hover tick
  playHover() {
    try {
      this.playSample("card_flip", 0.2, 1.8);
    } catch {
      this.playSyntheticHover();
    }
  }

  // 3D Card flip swoosh
  playFlip() {
    try {
      this.playSample("card_flip", 0.6, 1.0);
    } catch {
      this.playSyntheticFlip();
    }
  }

  // Foil pack tear sound
  playPackTear() {
    try {
      this.playSample("pack_tear", 0.9, 1.0);
    } catch {
      this.playSyntheticPackTear();
    }
  }

  // Cinematic Sub-Bass Impact
  playCinematicBoom() {
    try {
      // Play deep teaser impact at lower playback rate + stadium cheer
      this.playSample("teaser_hit", 1.0, 0.75);
      this.playSample("stadium_cheer", 0.4, 1.0);
    } catch {
      this.playSyntheticBoom();
    }
  }

  // Walkout sequential teaser sound (Club -> Position -> Number)
  playTeaserHit(step: number = 1) {
    try {
      // Step 1 = pitch 0.88, Step 2 = pitch 1.0, Step 3 = pitch 1.18
      const rate = step === 1 ? 0.88 : step === 2 ? 1.0 : 1.18;
      this.playSample("teaser_hit", 0.9, rate);
    } catch {
      this.playSyntheticTeaserHit(step);
    }
  }

  // Official Club Chant: "DELTA, DELTA, GÓRNY MOKOTÓW!"
  playDeltaChant(volume: number = 0.95) {
    try {
      this.playSample("delta_chant", volume, 1.0);
    } catch {
      this.playWalkoutFanfare();
    }
  }

  // Walkout Grand Victory Fanfare & Crowd Roar
  playWalkoutFanfare() {
    try {
      this.playSample("walkout_fanfare", 0.95, 1.0);
      setTimeout(() => {
        this.playSample("stadium_cheer", 0.7, 1.0);
      }, 400);
    } catch {
      this.playSyntheticFanfare();
    }
  }

  // Rarity card reveal sound
  playReveal(rarity: "common" | "rare" | "epic" | "legendary" | "inferno") {
    try {
      if (rarity === "common") {
        this.playSample("card_flip", 0.5, 1.1);
      } else if (rarity === "rare") {
        this.playSample("card_flip", 0.7, 1.3);
        this.playSample("teaser_hit", 0.5, 1.3);
      } else if (rarity === "epic") {
        this.playSample("walkout_fanfare", 0.8, 1.1);
      } else if (rarity === "legendary") {
        this.playSample("walkout_fanfare", 0.95, 1.0);
        this.playSample("stadium_cheer", 0.6, 1.0);
      } else if (rarity === "inferno") {
        this.playSample("teaser_hit", 1.0, 0.7);
        this.playSample("walkout_fanfare", 1.0, 0.95);
        this.playSample("stadium_cheer", 0.85, 1.0);
      }
    } catch {
      this.playSyntheticReveal(rarity);
    }
  }

  // Coin buy / DP exchange
  playPurchase() {
    try {
      this.playSample("teaser_hit", 0.5, 1.5);
      this.playSample("card_flip", 0.5, 1.2);
    } catch {
      this.playSyntheticPurchase();
    }
  }

  // Mobile Device Haptic Vibration
  playHaptic(pattern: "light" | "medium" | "heavy" | "walkout" | "inferno" = "medium") {
    try {
      if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
        if (pattern === "light") navigator.vibrate(30);
        else if (pattern === "medium") navigator.vibrate([50, 40, 50]);
        else if (pattern === "heavy") navigator.vibrate([120, 60, 150]);
        else if (pattern === "walkout") navigator.vibrate([80, 40, 100, 40, 250]);
        else if (pattern === "inferno") navigator.vibrate([150, 50, 200, 50, 350, 50, 500]);
      }
    } catch {}
  }

  // Pyro flame cannons sound effect
  playPyroBurst() {
    try {
      this.playSample("teaser_hit", 0.85, 0.6);
      this.playSample("pack_tear", 0.7, 0.8);
      this.playHaptic("heavy");
    } catch {
      this.playSyntheticBoom();
    }
  }

  // Volcanic / Inferno Alarm siren
  playSirenAlarm() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.35);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.7);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
      this.playHaptic("inferno");
    } catch {}
  }

  // ================= FALLBACK SYNTHETIC METHODS =================
  private playSyntheticHover() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  private playSyntheticFlip() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  private playSyntheticPackTear() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const duration = 0.4;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1500, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playSyntheticBoom() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(80, now);
      sub.frequency.exponentialRampToValueAtTime(30, now + 1.0);
      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1.0);
    } catch {}
  }

  private playSyntheticTeaserHit(step: number = 1) {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const baseFreq = step === 1 ? 160 : step === 2 ? 220 : 300;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  private playSyntheticFanfare() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.8);
      });
    } catch {}
  }

  private playSyntheticReveal(rarity: string) {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(rarity === "inferno" ? 880 : 550, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  private playSyntheticPurchase() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      [987.77, 1318.51].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch {}
  }
}

export const cardSound = new CardSoundEngine();
