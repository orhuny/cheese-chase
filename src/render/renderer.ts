import type { View } from '../core/canvas';
import type { Game } from '../game/Game';
import type { MouseSkin } from '../skins/MouseSkin';
import { drawHillStrip, drawRange, drawSky } from './background';
import { getSprite } from './sprites';
import { caughtSceneHidesCharacters, caughtSceneShake, drawCaughtScene } from './caughtScene';
import { drawCat } from './catSprite';
import { drawFloaters, drawFluff, drawParticles, drawPopups, drawSpeedLines } from './effects';
import { drawMouse } from './mouseSprite';
import { drawCheese, drawEatenCheese, drawGround, drawTraps } from './world';

/** Draws one frame, back to front. */
export function render(view: View, g: Game, skin: MouseSkin, time: number): void {
  const { ctx, H } = view;
  const cam = g.camera;
  drawSky(ctx, view, cam, time);
  const far = getSprite('bg_hills_far'), near = getSprite('bg_hills_near');
  if (far) drawHillStrip(ctx, view, cam, far, 0.08, 0.3, 0.36);
  else drawRange(ctx, view, cam, 0.08, H * 0.2, H * 0.2, '#b6e0a0', 1.3);
  if (near) drawHillStrip(ctx, view, cam, near, 0.18, 0.42, 0.42);
  else drawRange(ctx, view, cam, 0.18, H * 0.08, H * 0.18, '#93d07a', 4.1);
  const [shakeX, shakeY] = caughtSceneShake(g.caught);
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawGround(ctx, view, cam, g);
  drawTraps(ctx, view, cam, g, time);
  drawCheese(ctx, view, cam, g, time);
  drawEatenCheese(ctx, cam, g);
  drawParticles(ctx, cam, g.fx);
  if (!caughtSceneHidesCharacters(g.caught)) {
    drawMouse(ctx, cam, g.mouse, skin, time);
    drawCat(ctx, view, cam, g, time);
  }
  drawFloaters(ctx, cam, g.fx);
  if (g.caught) drawCaughtScene(ctx, cam, g.caught, skin);
  ctx.restore();
  drawSpeedLines(ctx, view, g.mouse, time);
  drawFluff(ctx, view, g.fx);
  drawPopups(ctx, view, g.fx);
}
