import type { MouseSkin } from './MouseSkin';
import { CLASSIC_PALETTE, drawPlainMouse } from './parts';

/** The original grey mouse from the prototype. */
export const classicMouse: MouseSkin = {
  id: 'classic',
  name: 'Classic Mouse',
  draw(ctx, pose) {
    drawPlainMouse(ctx, pose, CLASSIC_PALETTE);
  },
};
