import type { Camera } from '../core/camera';
import { reduceMotion, type View } from '../core/canvas';
import { clamp } from '../core/math';
import { particleAlpha, POPUP_LIFE, type Effects } from '../game/effects';
import { speedOf, type Mouse } from '../game/entities/mouse';
import { ell, FONT } from './draw';

export function drawParticles(ctx: CanvasRenderingContext2D, cam: Camera, fx: Effects): void {
  const k = cam.spriteScale();
  for (const q of fx.particles) {
    ctx.globalAlpha = particleAlpha(q);
    ctx.fillStyle = q.c; ell(ctx, cam.toSX(q.x), cam.toSY(q.y), q.r * k, q.r * k);
  }
  ctx.globalAlpha = 1;
}

export function drawSpeedLines(ctx: CanvasRenderingContext2D, { W, H }: View, m: Mouse, time: number): void {
  const sp = speedOf(m);
  if (sp < 1300 || reduceMotion) return;
  const a = clamp((sp - 1300) / 900, 0, 0.5);
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = ((i * 131 + time * 900) % H);
    const x = (i * 211 + time * 1400) % (W + 200);
    ctx.beginPath(); ctx.moveTo(W - x, y); ctx.lineTo(W - x + 120, y); ctx.stroke();
  }
}

export function drawFluff(ctx: CanvasRenderingContext2D, { W, H }: View, fx: Effects): void {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const f of fx.fluff) ell(ctx, f.x * W, f.y * H, f.r, f.r);
}

export function drawPopups(ctx: CanvasRenderingContext2D, { W, H }: View, fx: Effects): void {
  for (const u of fx.popups) {
    const t = 1 - u.life / POPUP_LIFE;
    ctx.globalAlpha = clamp(u.life / 0.4, 0, 1);
    ctx.font = `700 ${Math.round(clamp(W * 0.06, 28, 52) * (1 + 0.15 * Math.sin(Math.min(t * 6, Math.PI))))}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(80,50,20,0.45)';
    const y = H * 0.3 - t * 30;
    ctx.strokeText(u.text, W / 2, y);
    ctx.fillStyle = u.color; ctx.fillText(u.text, W / 2, y);
  }
  ctx.globalAlpha = 1;
}
