import { TUNING } from '../../config/tuning';
import type { Mouse } from './mouse';

const C = TUNING.cat;

export interface Cat { x: number; v: number; }

export function createCat(): Cat {
  return { x: C.startX, v: C.baseSpeed };
}

/** Moves the cat. Returns true if it caught the mouse. */
export function updateCat(cat: Cat, mouse: Mouse, elapsed: number, dt: number): boolean {
  cat.v = Math.min(C.baseSpeed + elapsed * C.speedGainPerSecond, C.maxSpeed);
  cat.x += cat.v * dt;
  if (cat.x < mouse.x - C.maxDistanceBehind) cat.x = mouse.x - C.maxDistanceBehind;
  return cat.x + C.catchDistance >= mouse.x;
}
