import type { Camera } from '../core/camera';
import type { Mouse } from '../game/entities/mouse';
import type { MouseSkin } from '../skins/MouseSkin';
import { ell, star } from './draw';

/** Positions and rotates the mouse, then lets the selected skin draw it. Zoom glow and dizzy stars are shared by all skins. */
export function drawMouse(ctx: CanvasRenderingContext2D, cam: Camera, m: Mouse, skin: MouseSkin, time: number): void {
  const k = cam.spriteScale() * 1.1;
  const ang = -Math.atan2(m.vy, m.vx);
  ctx.save(); ctx.translate(cam.toSX(m.x), cam.toSY(m.y)); ctx.rotate(ang); ctx.scale(k, k); ctx.translate(0, -15);

  if (m.fever > 0) {
    const fg = ctx.createRadialGradient(0, 0, 8, 0, 0, 55);
    fg.addColorStop(0, 'rgba(255,210,63,0.55)'); fg.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.fillStyle = fg; ell(ctx, 0, 0, 55, 42);
  }

  ctx.save();
  skin.draw(ctx, { time, onGround: m.onGround, stunned: m.stun > 0, zooming: m.fever > 0 });
  ctx.restore();

  if (m.stun > 0) {
    const sy = skin.starsY ?? -36;
    ctx.fillStyle = '#ffd23f';
    for (let i = 0; i < 3; i++) {
      const a = time * 8 + i * 2.1;
      star(ctx, 10 + Math.cos(a) * 16, sy + Math.sin(a) * 5, 4.5);
    }
  }
  ctx.restore();
}
