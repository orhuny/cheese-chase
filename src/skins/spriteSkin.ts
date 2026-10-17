import { drawRigged, type Rig } from '../render/rig';
import { getSprite, spriteInfo, type Sprite, type SpriteId } from '../render/sprites';
import type { MousePose, MouseSkin } from './MouseSkin';

/**
 * All mouse pictures were generated from the same template (mouse_classic), so they share one frame:
 * its right edge (nose/whiskers) and bottom edge (feet) are the anchor points for every mouse.
 */
const REF = spriteInfo('mouse_classic');
const REF_RIGHT = REF.trimX + REF.trimW;
const REF_BOTTOM = REF.trimY + REF.trimH;
/** Whole classic mouse (tail tip to whiskers) = this many game units, about the old drawn mouse. */
const MOUSE_LENGTH = 100;
/** Game units per original image pixel. */
export const MOUSE_UNITS_PER_PX = MOUSE_LENGTH / REF.trimW;
const U = MOUSE_UNITS_PER_PX;
const NOSE_X = 44;  // where the right edge sits in skin space (see MouseSkin.ts)
const FEET_Y = 16;  // where the feet touch the ground in skin space

/** The mouse's own legs, cut out of the shared template (original 1024x1024 pixels). Hind pair and front pair alternate. */
export const MOUSE_RIG: Rig = {
  legs: [
    { // hind leg under the belly
      piece: [[452, 640], [562, 648], [560, 676], [612, 674], [612, 772], [468, 774], [456, 704]],
      seam: [[452, 683], [550, 684], [566, 682], [612, 679]], hip: [505, 655], base: -0.15, swing: 0.4, phase: Math.PI, air: 0.3,
    },
    { // front leg reaching down
      piece: [[672, 640], [700, 641], [722, 651], [750, 655], [768, 668], [766, 712], [698, 714], [672, 692]],
      seam: [[699, 637], [701, 690]], hip: [680, 650], base: 0.05, swing: 0.4, phase: 0.6, air: -0.2,
    },
    { // hind leg stretched back
      piece: [[354, 596], [350, 666], [324, 668], [302, 718], [236, 724], [234, 676], [252, 606], [270, 594]],
      seam: [[316, 601], [322, 657]], hip: [342, 628], base: -0.25, swing: 0.4, phase: 0, air: 0.25,
    },
    { // front leg reaching forward
      piece: [[666, 612], [700, 584], [742, 587], [776, 604], [808, 626], [808, 670], [768, 668], [750, 655], [722, 651], [700, 641], [670, 634]],
      seam: [[686, 628], [735, 596]], hip: [702, 606], base: 0.15, swing: 0.4, phase: Math.PI + 0.6, air: -0.25,
    },
  ],
};

/** The tail of the shared mouse template (original pixels), and where it joins the body. */
export const MOUSE_TAIL = {
  outline: [[40, 440], [120, 405], [185, 416], [225, 455], [262, 498], [300, 516], [334, 512], [334, 574], [290, 576], [246, 560], [205, 528], [170, 480], [130, 458], [95, 452], [68, 472], [38, 462]],
  anchor: [334, 543],
} as const;

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, pose: MousePose): void {
  // A little hop and squash on every stride, a wobble when dizzy.
  const stride = pose.time * 22;
  const running = pose.onGround && !pose.stunned;
  const hop = running ? Math.abs(Math.sin(stride / 2)) * 1.8 : 0;
  const squash = running ? Math.sin(stride) * 0.03 : 0;
  ctx.translate(0, FEET_Y - hop);
  if (pose.stunned) ctx.rotate(Math.sin(pose.time * 20) * 0.08);
  ctx.scale(1 - squash, 1 + squash);
  ctx.translate(0, -FEET_Y);
  // From here on, draw in original-image pixels.
  ctx.translate(NOSE_X - REF_RIGHT * U, FEET_Y - REF_BOTTOM * U);
  ctx.scale(U, U);
  drawRigged(ctx, s, MOUSE_RIG, running ? stride : null);
}

/**
 * A mouse drawn from a picture in art/source/ with running legs drawn in code.
 * Until the picture has loaded (or if it is missing) the code-drawn `fallback` is shown instead.
 */
export function spriteMouse(fallback: MouseSkin, spriteId: SpriteId): MouseSkin {
  const info = spriteInfo(spriteId);
  return {
    id: fallback.id,
    name: fallback.name,
    spriteId,
    // Dizzy stars circle just above the top of this picture (hats are taller).
    starsY: FEET_Y + (info.trimY - REF_BOTTOM) * U - 6,
    draw(ctx, pose) {
      const s = getSprite(spriteId);
      if (s) drawSprite(ctx, s, pose); else fallback.draw(ctx, pose);
    },
  };
}
