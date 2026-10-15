import { TUNING } from '../../config/tuning';
import type { Game } from '../Game';

const TR = TUNING.traps;

export interface Trap { x: number; hit: boolean; passed: boolean; }

/** Snaps traps the mouse touches; counts traps it got past. */
export function updateTraps(g: Game): void {
  const m = g.mouse;
  for (const t of g.traps) {
    if (t.hit || t.passed) continue;
    if (Math.abs(m.x - t.x) < TR.hitHalfWidth) {
      const [gy] = g.terrain.ground(t.x);
      if (m.y - gy < TR.hitHeight) {
        t.hit = true; m.stun = TR.stunTime; m.streak = 0; m.fever = 0;
        m.vx *= TR.speedKept; m.vy *= TR.speedKept;
        g.fx.popup('Snap!', '#ff6b5b');
        g.fx.burst(t.x, gy + 10, 12, ['#c58b4f', '#ffd23f', '#ffffff'], 220, m.vx);
        g.events.emit('snap', undefined);
      }
    } else if (m.x > t.x + TR.hitHalfWidth) {
      t.passed = true; g.trapsJumped++;
    }
  }
}
