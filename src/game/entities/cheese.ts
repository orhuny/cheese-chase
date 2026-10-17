import { TUNING } from '../../config/tuning';
import { rand } from '../../core/math';
import type { Game } from '../Game';
import { boostSpeed, mouthOf } from './mouse';

const CH = TUNING.cheese;

/** `eaten` = seconds since the mouse grabbed it (it flies into its mouth), or -1 while it's still waiting. */
export interface Cheese { x: number; y: number; got: boolean; eaten: number; }

export const CHEESE_BURST = ['#ffd23f', '#fff1b8', '#ffffff'];

/** Picks up any cheese the mouse touches: speed boost, no more dizziness, and a munch. */
export function collectCheese(g: Game, dt: number): void {
  const m = g.mouse;
  for (const f of g.cheese) {
    if (f.got) { if (f.eaten >= 0) f.eaten += dt; continue; }
    if (Math.abs(f.x - m.x) > CH.pickupRangeX) continue;
    if (Math.abs(f.y - (m.y + CH.mouseCenterY)) < CH.pickupRangeY) {
      f.got = true; f.eaten = 0; g.cheeseCount++;
      boostSpeed(m, CH.speedBoost);
      m.stun = 0;
      m.chomp = CH.chompTime;
      g.cheeseCombo = g.elapsed - g.lastCheeseAt < CH.comboWindow ? g.cheeseCombo + 1 : 1;
      g.lastCheeseAt = g.elapsed;
      g.fx.burst(f.x, f.y, 8, CHEESE_BURST, 180, m.vx);
      // Crumbs spraying from the mouth, a "+1" rising above the head.
      const [mx, my] = mouthOf(m);
      for (let j = 0; j < 7; j++) {
        g.fx.particles.push({ x: mx, y: my, vx: m.vx * 0.6 + rand(-90, 90), vy: rand(60, 220), life: 0.45, max: 0.45, r: rand(1.8, 3.4), c: j % 3 ? '#ffc93a' : '#e8a817' });
      }
      g.fx.floater('+1', m.x, m.y + 50, g.cheeseCombo);
      g.events.emit('cheese', undefined);
    }
  }
}
