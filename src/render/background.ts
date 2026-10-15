import type { Camera } from '../core/camera';
import type { View } from '../core/canvas';
import { ell } from './draw';
import { getSprite, type Sprite } from './sprites';

/** Sky picture (or the drawn gradient + sun while it loads) and drifting clouds. */
export function drawSky(ctx: CanvasRenderingContext2D, { W, H }: View, cam: Camera, time: number): void {
  const pic = getSprite('bg_sky');
  if (pic) {
    // Fill the screen; anchored top-right so the sun always stays visible, whatever the screen shape.
    const s = Math.max(W / pic.img.width, H / pic.img.height);
    const dw = pic.img.width * s, dh = pic.img.height * s;
    ctx.drawImage(pic.img, W - dw, 0, dw, dh);
    if (dh < H) { ctx.fillStyle = '#fdeec4'; ctx.fillRect(0, dh, W, H - dh); }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4aa8ec'); g.addColorStop(0.6, '#9fd6f7'); g.addColorStop(1, '#fdeec4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const sx = W * 0.8, sy = H * 0.17, r = Math.min(W, H) * 0.07;
    const sg = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 3);
    sg.addColorStop(0, 'rgba(255,240,180,0.9)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
    ctx.fillStyle = '#fff4c2'; ell(ctx, sx, sy, r, r);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 0.31 + 1) * W - (cam.x * cam.scale * 0.03 + time * 8) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
    const cy = H * (0.12 + i * 0.07);
    ell(ctx, cx, cy, 46, 18); ell(ctx, cx + 30, cy - 10, 30, 18); ell(ctx, cx - 28, cy - 4, 26, 14);
  }
}

/**
 * A repeating hill picture that scrolls slower than the ground (parallax).
 * `top` and `height` are fractions of the screen height; below the picture its bottom colour continues.
 */
export function drawHillStrip(ctx: CanvasRenderingContext2D, { W, H }: View, cam: Camera, pic: Sprite, factor: number, top: number, height: number): void {
  const h = H * height, w = pic.img.width * h / pic.img.height;
  const off = ((cam.x * cam.scale * factor) % w + w) % w;
  const y = H * top;
  // +1 px overlap so no hairline shows where copies meet.
  for (let x = -off; x < W; x += w) ctx.drawImage(pic.img, Math.floor(x), y, Math.ceil(w) + 1, h);
  ctx.fillStyle = pic.bottomColor ?? '#5fb246';
  ctx.fillRect(0, y + h - 1, W, H - (y + h) + 1);
}

/** A distant hill range drawn in code (used until the hill pictures have loaded). */
export function drawRange(ctx: CanvasRenderingContext2D, { W, H }: View, cam: Camera, factor: number, base: number, amp: number, color: string, seed: number): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  const off = cam.x * cam.scale * factor;
  for (let sx = 0; sx <= W + 12; sx += 12) {
    const wx = (off + sx) / Math.max(cam.scale, 0.4);
    const hgt = (Math.sin(wx * 0.0021 + seed) * 0.5 + 0.5) * amp + Math.sin(wx * 0.007 + seed * 2) * amp * 0.2 + amp * 0.2;
    ctx.lineTo(sx, H - base - hgt);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}
