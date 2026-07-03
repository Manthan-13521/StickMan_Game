export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch {
      console.warn('Audio not available');
    }
  }

  private ensureResumed(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private getCtx(): AudioContext | null {
    this.ensureResumed();
    return this.ctx;
  }

  playHit(type: 'punch' | 'kick' | 'heavy' | 'ultimate', blocked = false): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    if (blocked) { this.playBlock(ctx); return; }

    switch (type) {
      case 'punch': this.synthPunch(ctx); break;
      case 'kick': this.synthKick(ctx); break;
      case 'heavy': this.synthHeavy(ctx); break;
      case 'ultimate': this.synthUltimate(ctx); break;
    }
  }

  playKO(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.synthKO(ctx);
  }

  playCountdownBeep(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.synthBeep(ctx, 440, 0.15, 0.3);
  }

  playFight(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.synthBeep(ctx, 880, 0.4, 0.4);
    setTimeout(() => {
      const ctx2 = this.getCtx();
      if (!ctx2) return;
      this.synthBeep(ctx2, 1100, 0.3, 0.3);
    }, 100);
  }

  playVictory(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const ctx2 = this.getCtx();
        if (!ctx2) return;
        this.synthBeep(ctx2, freq, 0.2, 0.2);
      }, i * 120);
    });
  }

  playDefeat(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const ctx2 = this.getCtx();
        if (!ctx2) return;
        this.synthBeep(ctx2, freq, 0.25, 0.2);
      }, i * 150);
    });
  }

  playMenuHover(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.synthBeep(ctx, 600, 0.05, 0.1);
  }

  playMenuClick(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.synthBeep(ctx, 800, 0.08, 0.15);
  }

  playCountdownFinal(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.synthBeep(ctx, 660, 0.2, 0.4);
  }

  private synthPunch(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = 200;
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.06);

    const noise = this.createNoise(ctx, t, 0.03, 0.15);
    if (noise) {
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
      noise.connect(ng);
      ng.connect(this.sfxGain!);
    }
  }

  private synthKick(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.1);

    const noise = this.createNoise(ctx, t, 0.04, 0.2);
    if (noise) {
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.2, t);
      ng.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
      noise.connect(ng);
      ng.connect(this.sfxGain!);
    }
  }

  private synthHeavy(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.15);

    const noise = this.createNoise(ctx, t, 0.08, 0.3);
    if (noise) {
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, t);
      ng.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      noise.connect(ng);
      ng.connect(this.sfxGain!);
    }
  }

  private synthUltimate(ctx: AudioContext): void {
    const t = ctx.currentTime;
    [100, 80, 60].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3 - i * 0.08, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.15);
    });

    const noise = this.createNoise(ctx, t, 0.2, 0.5);
    if (noise) {
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      noise.connect(ng);
      ng.connect(this.sfxGain!);
    }
  }

  private synthKO(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.4);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.4);

    const noise = this.createNoise(ctx, t, 0.3, 0.6);
    if (noise) {
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.6, t);
      ng.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      noise.connect(ng);
      ng.connect(this.sfxGain!);
    }
  }

  private synthBlock(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 1200;

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  private synthBeep(ctx: AudioContext, freq: number, dur: number, vol: number): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + dur);
  }

  private playBlock(ctx: AudioContext): void {
    this.synthBlock(ctx);
  }

  private createNoise(ctx: AudioContext, t: number, dur: number, vol: number): AudioNode | null {
    const bufferSize = ctx.sampleRate * dur;
    if (bufferSize < 1) return null;
    const buffer = ctx.createBuffer(1, Math.ceil(bufferSize), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * vol;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  setVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = vol;
    }
  }

  getVolume(): number {
    return this.masterGain?.gain.value ?? 0.5;
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

export const soundManager = new SoundManager();
