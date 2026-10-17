import { TUNING } from '../config/tuning';
import type { Camera } from '../core/camera';
import type { Mouse } from '../game/entities/mouse';
import type { MouseSkin } from '../skins/MouseSkin';
import { ell, star } from './draw';

/** Positions and rotates the mouse, then lets the selected skin draw it. Zoom/Boost glow and dizzy stars are shared by all skins. */
export function drawMouse(ctx: CanvasRenderingContext2D, cam: Camera, m: Mouse, skin: MouseSkin, time: number): void {
  const k = cam.spriteScale() * 1.1;
  const ang = -Math.atan2(m.vy, m.vx);
  ctx.save(); ctx.translate(cam.toSX(m.x), cam.toSY(m.y)); ctx.rotate(ang); ctx.scale(k, k);
  if (m.chomp > 0) {
    // Two quick munches after eating cheese: puffs out wide and squat, then springs back (from the feet).
    const p = 1 - m.chomp / TUNING.cheese.chompTime, s = Math.abs(Math.sin(p * Math.PI * 2)) * (1 - p * 0.5);
    ctx.scale(1 + 0.2 * s, 1 - 0.14 * s);
  }
  ctx.translate(0, -15);

  if (m.boost > 0) {
    const bg = ctx.createRadialGradient(0, 0, 8, 0, 0, 60);
    bg.addColorStop(0, 'rgba(127,211,255,0.55)'); bg.addColorStop(1, 'rgba(127,211,255,0)');
    ctx.fillStyle = bg; ell(ctx, 0, 0, 60, 44);
  }
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
