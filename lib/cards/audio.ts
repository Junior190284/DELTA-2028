"use client";

// Web Audio API synthesizers for collectible cards & pack opening sounds

class CardSoundEngine {
  private ctx: AudioContext | null = null;

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
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // 3D Card flip swoosh
  playFlip() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      
      // White noise buffer for air swoosh
      const bufferSize = ctx.sampleRate * 0.18;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.09);
      filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.18);
      filter.Q.value = 3;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  // Foil pack tear sound
  playPackTear() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const duration = 0.55;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(4500, ctx.currentTime + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + duration);
    } catch {}
  }

  // Rarity card reveal sound
  playReveal(rarity: "common" | "rare" | "epic" | "legendary" | "inferno") {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (rarity === "common") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.25);
      } else if (rarity === "rare") {
        // Dual chime
        [440, 660, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.15, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.4);
        });
      } else if (rarity === "epic") {
        // Royal chord arpeggio
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.2, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.6);
        });
      } else if (rarity === "legendary") {
        // Golden fanfare shimmer
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.22, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.8);
        });
      } else if (rarity === "inferno") {
        // Deep sub-bass boom + rising fire chord + explosion
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = "sawtooth";
        subOsc.frequency.setValueAtTime(120, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.8);
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.8);

        [220, 330, 440, 554, 659, 880, 1108].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now + 0.15 + i * 0.05);
          gain.gain.setValueAtTime(0.18, now + 0.15 + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.05 + 0.9);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + 0.15 + i * 0.05);
          osc.stop(now + 0.15 + i * 0.05 + 0.9);
        });
      }
    } catch {}
  }
}

export const cardSound = new CardSoundEngine();
