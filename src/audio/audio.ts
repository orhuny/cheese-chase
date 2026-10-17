import { TUNING } from '../config/tuning';
import type { Emitter } from '../core/events';
import type { GameEvents } from '../game/Game';

export type SoundName = 'jump' | 'perfect' | 'zoom' | 'boost' | 'bonk' | 'cheese' | 'snap' | 'caught';

/** Cheese grabbed within this many seconds of the last one climbs in pitch. */
const CHEESE_COMBO_WINDOW = 0.9;
const CHEESE_COMBO_MAX = 8;

/**
 * Sound effects, synthesized with the Web Audio API so there are no audio files to ship.
 * Browsers (and iOS) only allow audio after a tap, so the audio context is created on the first touch.
 */
export class SoundPlayer {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastCheeseAt = -Infinity;
  private cheeseCombo = 0;

  constructor() {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx?.state === 'running') {
        for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, true);
      }
    };
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, true);

    // Stop the audio hardware while the app is in the background.
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.visibilityState === 'hidden') void this.ctx.suspend().catch(() => {});
      else void this.ctx.resume().catch(() => {});
    });
  }

  play(name: SoundName, level = 0): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    switch (name) {
      case 'jump':
        this.tone('triangle', 330, 660, t, 0.14, 0.35);
        break;
      case 'perfect': {
        // A quick rising arpeggio that goes higher as the streak grows.
        const base = 660 * Math.pow(2, Math.min(level, 6) / 12);
        [1, 1.25, 1.5].forEach((m, i) => this.tone('square', base * m, base * m, t + i * 0.05, 0.09, 0.12));
        break;
      }
      case 'zoom':
        this.tone('sawtooth', 220, 880, t, 0.35, 0.12);
        this.whoosh(t, 0.4, 600, 3000, 0.25);
        break;
      case 'boost':
        // Rocket "fwoosh" with a rising zap.
        this.tone('square', 330, 1320, t, 0.22, 0.1);
        this.tone('triangle', 660, 1760, t + 0.05, 0.25, 0.2);
        this.whoosh(t, 0.6, 400, 4000, 0.35);
        break;
      case 'bonk':
        this.tone('sine', 200, 70, t, 0.18, 0.5);
        break;
      case 'cheese': {
        // Bright two-note "bling"; quick successive grabs step up the scale.
        this.cheeseCombo = t - this.lastCheeseAt < CHEESE_COMBO_WINDOW
          ? Math.min(this.cheeseCombo + 1, CHEESE_COMBO_MAX) : 0;
        this.lastCheeseAt = t;
        const base = 988 * Math.pow(2, MAJOR_STEPS[this.cheeseCombo] / 12); // B5 and up
        this.tone('sine', base, base, t, 0.08, 0.35);
        this.tone('sine', base * 1.5, base * 1.5, t + 0.06, 0.22, 0.35);
        this.tone('triangle', base * 3, base * 3, t + 0.06, 0.12, 0.08); // sparkle
        break;
      }
      case 'snap':
        this.whoosh(t, 0.08, 2500, 2500, 0.6);
        this.tone('square', 160, 50, t, 0.12, 0.3);
        break;
      case 'caught': {
        // Scuffle in the dust cloud: thumps, whooshes and the odd boing (as long as the caught scene)...
        for (let i = 0; i < 12; i++) {
          const at = t + i * 0.11 + Math.random() * 0.03;
          this.whoosh(at, 0.09, 300 + Math.random() * 600, 1800 + Math.random() * 1500, 0.3);
          this.tone('square', 140 + Math.random() * 90, 55, at, 0.07, 0.18);
          if (i % 4 === 2) this.tone('sine', 280, 620, at + 0.03, 0.12, 0.2);
        }
        // ...then a sad descending "wah wah wah".
        const sad = t + TUNING.caught.sceneDuration - 0.2;
        [392, 349, 311].forEach((f, i) => this.tone('triangle', f, f * 0.97, sad + i * 0.22, 0.2, 0.3));
        this.tone('triangle', 262, 220, sad + 0.66, 0.5, 0.3);
        break;
      }
    }
  }

  /** Plays a sound for each game event. */
  listen(events: Emitter<GameEvents>): void {
    events.on('jump', () => this.play('jump'));
    events.on('perfect', e => this.play('perfect', e.streak));
    events.on('zoom', () => this.play('zoom'));
    events.on('boost', () => this.play('boost'));
    events.on('bonk', () => this.play('bonk'));
    events.on('cheese', () => this.play('cheese'));
    events.on('snap', () => this.play('snap'));
    events.on('gameOver', () => this.play('caught'));
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended' && document.visibilityState === 'visible') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** One oscillator note with a pitch slide and a short attack/decay envelope. */
  private tone(type: OscillatorType, from: number, to: number, start: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /** Filtered white noise, for whooshes and clicks. */
  private whoosh(start: number, dur: number, from: number, to: number, vol: number): void {
    const ctx = this.ctx!;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(from, start);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, start + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(start);
    src.stop(start + dur);
  }
}

const UNLOCK_EVENTS = ['pointerdown', 'touchstart', 'keydown'] as const;
/** Semitone steps of a major scale, for the cheese combo. */
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14];
