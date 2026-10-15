import { drawRigged, type LegStyle, type Rig } from '../render/rig';
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
const U = MOUSE_LENGTH / REF.trimW; // game units per original image pixel
const NOSE_X = 44;  // where the right edge sits in skin space (see MouseSkin.ts)
const FEET_Y = 16;  // where the feet touch the ground in skin space

/** Legs of the shared mouse template (original 1024x1024 pixels). Hind pair and front pair bound alternately. */
const MOUSE_RIG: Rig = {
  legs: [
    { hip: [395, 652], upper: 40, lower: 38, foot: [70, 26], far: true, base: -0.15, swing: 0.8, kneeBend: 0.9, phase: 0.6, air: -1.0 },
    { hip: [690, 632], upper: 44, lower: 44, foot: [52, 26], far: true, base: 0.2, swing: 0.75, kneeBend: 0.9, phase: Math.PI + 0.6, air: 1.0 },
    { hip: [415, 655], upper: 40, lower: 38, foot: [70, 26], far: false, base: -0.15, swing: 0.8, kneeBend: 0.9, phase: 0, air: -0.8 },
    { hip: [705, 636], upper: 44, lower: 44, foot: [52, 26], far: false, base: 0.2, swing: 0.75, kneeBend: 0.9, phase: Math.PI, air: 0.8 },
  ],
  // The legs drawn in the current pictures; not needed once "no legs" pictures are used.
  erase: [
    [[296, 600], [320, 604], [326, 650], [312, 668], [292, 718], [238, 724], [234, 672], [268, 614]],
    [[462, 685], [552, 685], [565, 690], [612, 690], [614, 770], [470, 770]],
    [[680, 662], [702, 650], [740, 652], [752, 670], [758, 714], [684, 714]],
    [[733, 618], [762, 608], [800, 628], [804, 684], [752, 684], [738, 660]],
  ],
};

const OUTLINE = '#3b1d1c';
const pinkFeet = { foot: '#f4a7a6', footFar: '#e08d8e', toes: true };
const common = { outline: OUTLINE, width: 30, outlineW: 8 };

/** Leg colours for each mouse, matching its picture. */
export const MOUSE_LEG_STYLES: Record<string, LegStyle> = {
  classic: { ...common, ...pinkFeet, fur: '#a9b2be', farFur: '#8592a1' },
  ninja: { ...common, ...pinkFeet, fur: '#3d476b', farFur: '#2b3350' },
  chef: { ...common, ...pinkFeet, fur: '#c88a5a', farFur: '#a56a40' },
  pirate: { ...common, fur: '#c78858', farFur: '#a56a40', foot: '#6b4126', footFar: '#553219', toes: false },
  astronaut: { ...common, fur: '#f3f5f9', farFur: '#d3d9e4', foot: '#ffffff', footFar: '#d9dee8', toes: false },
};

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, pose: MousePose, style: LegStyle): void {
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
  drawRigged(ctx, s, MOUSE_RIG, style, running ? stride : null);
}

/**
 * A mouse drawn from a picture in art/source/ with running legs drawn in code.
 * Until the picture has loaded (or if it is missing) the code-drawn `fallback` is shown instead.
 */
export function spriteMouse(fallback: MouseSkin, spriteId: SpriteId): MouseSkin {
  const info = spriteInfo(spriteId);
  const style = MOUSE_LEG_STYLES[fallback.id] ?? MOUSE_LEG_STYLES.classic;
  return {
    id: fallback.id,
    name: fallback.name,
    // Dizzy stars circle just above the top of this picture (hats are taller).
    starsY: FEET_Y + (info.trimY - REF_BOTTOM) * U - 6,
    draw(ctx, pose) {
      const s = getSprite(spriteId);
      if (s) drawSprite(ctx, s, pose, style); else fallback.draw(ctx, pose);
    },
  };
}
