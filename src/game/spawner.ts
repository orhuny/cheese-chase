import { TUNING } from '../config/tuning';
import { rand } from '../core/math';
import type { Cheese } from './entities/cheese';
import type { Trap } from './entities/trap';
import type { Keypoint } from './terrain';

const CH = TUNING.cheese;
const TR = TUNING.traps;

/** Places cheese and traps around a new hill keypoint. */
export function spawnAtKeypoint(p: Keypoint, isPeak: boolean, d: number, cheese: Cheese[], traps: Trap[]): void {
  if (!isPeak) {
    cheese.push({ x: p.x, y: p.y + CH.valleyHeight, got: false, eaten: -1 });
    if (Math.random() < CH.secondChance) cheese.push({ x: p.x + CH.secondOffsetX, y: p.y + CH.secondHeight, got: false, eaten: -1 });
    if (p.x > TR.firstTrapX && Math.random() < TR.chance + TR.extraChanceAtMaxDifficulty * d) {
      const tx = Math.random() < TR.beforeValleyChance ? p.x - rand(TR.beforeMin, TR.beforeMax) : p.x + rand(TR.afterMin, TR.afterMax);
      traps.push({ x: tx, hit: false, passed: false });
    }
  } else if (Math.random() < CH.arcChance) {
    for (let i = 1; i <= CH.arcCount; i++) {
      cheese.push({ x: p.x + i * CH.arcSpacing, y: p.y + CH.arcHeight + Math.sin(i / 6 * Math.PI) * CH.arcBulge, got: false, eaten: -1 });
    }
  }
}
