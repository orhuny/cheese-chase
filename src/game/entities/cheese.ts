import { TUNING } from '../../config/tuning';
import { rand } from '../../core/math';
import type { Game } from '../Game';
import { boostSpeed } from './mouse';

const CH = TUNING.cheese;

export interface Cheese { x: number; y: number; got: boolean; }

export const CHEESE_BURST = ['#ffd23f', '#fff1b8', '#ffffff'];

/** Picks up any cheese the mouse touches: speed boost and no more dizziness. */
export function collectCheese(g: Game): void {
  const m = g.mouse;
  for (const f of g.cheese) {
    if (f.got || Math.abs(f.x - m.x) > CH.pickupRangeX) continue;
    if (Math.abs(f.y - (m.y + CH.mouseCenterY)) < CH.pickupRangeY) {
      f.got = true; g.cheeseCount++;
      boostSpeed(m, CH.speedBoost);
      m.stun = 0;
      g.fx.burst(f.x, f.y, 12, CHEESE_BURST, 220, m.vx);
      for (let j = 0; j < 6; j++) {
        g.fx.particles.push({ x: m.x - 10 - j * 8, y: m.y + 12, vx: -rand(80, 200), vy: rand(-20, 40), life: 0.5, max: 0.5, r: rand(3, 5), c: '#ffd23f' });
      }
      g.events.emit('cheese', undefined);
    }
  }
}
