import { TUNING } from '../../config/tuning';

/** The player. Position is the mouse's feet; (tx, ty) is the last ground direction. */
export interface Mouse {
  x: number; y: number;
  vx: number; vy: number;
  onGround: boolean;
  air: number;     // seconds in the air
  streak: number;  // perfect landings in a row
  fever: number;   // seconds of "Zoom!" left
  stun: number;    // seconds of dizziness left
  coyote: number;  // seconds left to still jump after leaving the ground
  tx: number; ty: number;
}

export function createMouse(): Mouse {
  return {
    x: 0, y: TUNING.start.mouseY, vx: TUNING.start.mouseSpeed, vy: 0,
    onGround: true, air: 0, streak: 0, fever: 0, stun: 0,
    coyote: TUNING.jump.coyoteTime, tx: 1, ty: 0,
  };
}

export const speedOf = (m: Mouse): number => Math.hypot(m.vx, m.vy);

/** Adds `amount` to the mouse's speed without changing its direction. */
export function boostSpeed(m: Mouse, amount: number): void {
  const sp = speedOf(m) || 1;
  m.vx += m.vx / sp * amount;
  m.vy += m.vy / sp * amount;
}
