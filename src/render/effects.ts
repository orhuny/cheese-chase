import type { Camera } from '../core/camera';
import { reduceMotion, type View } from '../core/canvas';
import { clamp } from '../core/math';
import { FLOATER_LIFE, particleAlpha, POPUP_LIFE, type Effects, type Popup } from '../game/effects';
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

/** "+1" bubbles rising from where cheese was eaten; bigger and more orange during a combo. */
export function drawFloaters(ctx: CanvasRenderingContext2D, cam: Camera, fx: Effects): void {
  const k = cam.spriteScale();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const f of fx.floaters) {
    const age = FLOATER_LIFE - f.life;
    const pop = Math.min(1, age / 0.08) * (1 + 0.25 * Math.max(0, 1 - age / 0.2));
    const size = (24 + Math.min(f.combo - 1, 6) * 3) * k * pop;
    ctx.globalAlpha = clamp(f.life / 0.25, 0, 1);
    ctx.font = `700 ${Math.round(size)}px ${FONT}`;
    const x = cam.toSX(f.x), y = cam.toSY(f.y);
    ctx.lineWidth = size * 0.24; ctx.strokeStyle = '#3b1d1c'; ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.combo >= 5 ? '#ff8a1f' : f.combo >= 3 ? '#ffb321' : '#ffd23f';
    ctx.fillText(f.text, x, y);
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

const INK = '#3b1d1c';
/** Starbursts are this much wider than tall, to fit a word. */
const BURST_ASPECT = 1.7;

/** Jagged starburst path around (0, 0); the same `seed` always gives the same spikes. */
function starburstPath(ctx: CanvasRenderingContext2D, r: number, spikes: number, seed: number): void {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const jitter = 0.82 + 0.3 * Math.abs(Math.sin(seed + i * 12.9898));
    const rr = i % 2 ? r * 0.7 : r * jitter;
    const a = (i / (spikes * 2)) * Math.PI * 2 + Math.sin(seed + i) * 0.06;
    ctx.lineTo(Math.cos(a) * rr * BURST_ASPECT, Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** "Snap!" / "Bonk!": the word bursts out of a comic starburst, wobbles, shakes, then fades. */
function drawImpact(ctx: CanvasRenderingContext2D, { W, H }: View, u: Popup): void {
  const im = u.impact!;
  const age = POPUP_LIFE - u.life;
  const size = Math.round(clamp(W * 0.085, 40, 76));
  // Springy pop: overshoots, then settles. Shakes for the first moment.
  const pop = reduceMotion ? 1 : Math.min(1, age / 0.07) * (1 + 0.32 * Math.exp(-age * 7) * Math.cos(age * 26));
  const shake = reduceMotion ? 0 : Math.max(0, 0.25 - age) * 24;
  const x = W / 2 + Math.sin(age * 90) * shake, y = H * 0.3 + Math.cos(age * 77) * shake - Math.max(0, age - 0.6) * 40;

  ctx.save();
  ctx.globalAlpha = clamp(u.life / 0.3, 0, 1);
  ctx.translate(x, y); ctx.rotate(im.tilt); ctx.scale(pop, pop);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // Speed lines flying outward.
  if (!reduceMotion && age < 0.45) {
    const out = age / 0.45;
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, size * 0.07) * (1 - out);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + im.seed;
      const r0 = size * (1.4 + out * 0.8), r1 = r0 + size * (0.45 - out * 0.25);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0 * BURST_ASPECT, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1 * BURST_ASPECT, Math.sin(a) * r1); ctx.stroke();
    }
  }

  // Splash blobs flung out of the burst, falling a little.
  if (!reduceMotion && age < 0.6) {
    const out = age / 0.6;
    ctx.fillStyle = im.burst; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, size * 0.05);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + im.seed * 0.7;
      const d = size * (1.3 + out * 1.1), r = size * 0.13 * (1 - out) * (0.7 + 0.5 * Math.abs(Math.sin(im.seed + i)));
      ctx.beginPath(); ctx.arc(Math.cos(a) * d * BURST_ASPECT, Math.sin(a) * d + out * out * size * 0.8, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  // Starburst: outer colour with a thick ink outline, lighter core.
  const spin = Math.sin(age * 3) * 0.06;
  ctx.save(); ctx.rotate(spin);
  starburstPath(ctx, size * 1.3, 14, im.seed);
  ctx.fillStyle = im.burst; ctx.fill();
  ctx.lineWidth = Math.max(3, size * 0.09); ctx.strokeStyle = INK; ctx.stroke();
  starburstPath(ctx, size * 0.98, 14, im.seed + 3);
  ctx.fillStyle = im.core; ctx.fill();
  ctx.restore();

  // The word: drop shadow, fat ink outline, colour with a shiny top half.
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ty = size * 0.04;
  ctx.lineWidth = size * 0.26; ctx.strokeStyle = INK;
  ctx.strokeText(u.text, size * 0.05, ty + size * 0.09);
  ctx.strokeText(u.text, 0, ty);
  ctx.fillStyle = u.color; ctx.fillText(u.text, 0, ty);
  ctx.save();
  ctx.beginPath(); ctx.rect(-W, ty - size, W * 2, size * 0.88); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(u.text, 0, ty);
  ctx.restore();
  ctx.restore();
}

export function drawPopups(ctx: CanvasRenderingContext2D, view: View, fx: Effects): void {
  const { W, H } = view;
  for (const u of fx.popups) {
    if (u.impact) { drawImpact(ctx, view, u); continue; }
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
