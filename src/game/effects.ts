import { clamp, rand } from '../core/math';
import type { View } from '../core/canvas';
import { speedOf, type Mouse } from './entities/mouse';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string; }
export interface Popup { text: string; color: string; life: number; }
/** Floating dandelion fluff, in screen fractions (0..1). */
export interface Fluff { x: number; y: number; r: number; s: number; ph: number; }

export const POPUP_LIFE = 1.1;
export const DUST = ['#c9a27a', '#a8d68a'];

/** Purely visual effects: particles, "Perfect!" popups, floating fluff. */
export class Effects {
  particles: Particle[] = [];
  popups: Popup[] = [];
  readonly fluff: Fluff[] = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: rand(1.2, 2.8), s: rand(8, 25), ph: rand(0, 6) }));

  reset(): void {
    this.particles = [];
    this.popups = [];
  }

  popup(text: string, color: string): void {
    this.popups.push({ text, color, life: POPUP_LIFE });
  }

  /** A puff of particles that also drifts along with the mouse (`baseVx`). */
  burst(x: number, y: number, n: number, colors: readonly string[], spd: number, baseVx: number): void {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(spd * 0.4, spd);
      this.particles.push({ x, y, vx: Math.cos(a) * v + baseVx * 0.3, vy: Math.sin(a) * v + 120, life: rand(0.4, 0.9), max: 0.9, r: rand(3, 6), c: colors[i % colors.length] });
    }
  }

  /** Dust when running fast, golden sparkles during Zoom. */
  trail(m: Mouse): void {
    if (m.onGround && speedOf(m) > 500 && Math.random() < 0.5) {
      this.particles.push({ x: m.x - 16, y: m.y + 3, vx: -rand(40, 120), vy: rand(60, 160), life: 0.45, max: 0.45, r: rand(2, 4), c: Math.random() < 0.5 ? '#c9a27a' : '#8fcf6e' });
    }
    if (m.fever > 0 && Math.random() < 0.9) {
      this.particles.push({ x: m.x - 20, y: m.y + 12 + rand(-8, 8), vx: -rand(50, 150), vy: rand(-30, 30), life: 0.6, max: 0.6, r: rand(3, 6), c: Math.random() < 0.5 ? '#ffd23f' : '#fff6cf' });
    }
  }

  /** `driftVx` is the mouse's speed while playing, or null on menus. */
  update(dt: number, time: number, view: View, driftVx: number | null): void {
    for (const q of this.particles) { q.vy -= 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const u of this.popups) u.life -= dt;
    this.popups = this.popups.filter(u => u.life > 0);
    const drift = driftVx !== null ? 0.00008 * driftVx : 0.015;
    for (const f of this.fluff) {
      f.y += (f.s / view.H) * dt * 1.5 * Math.sin(time + f.ph);
      f.x -= drift * dt * (f.r / 2) + 0.008 * dt;
      if (f.y > 1.02) f.y = -0.02;
      if (f.y < -0.02) f.y = 1.02;
      if (f.x < -0.02) f.x = 1.02;
    }
  }
}

export const particleAlpha = (q: Particle): number => clamp(q.life / q.max, 0, 1);
