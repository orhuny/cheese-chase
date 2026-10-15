import { ell, ellS } from '../render/draw';
import type { MousePose } from './MouseSkin';

/**
 * The mouse body, split into parts so every skin shares the same shape and style.
 * A skin draws the parts it wants (in this order) and adds its own costume on top.
 */
export interface MousePalette {
  fur: string;
  furBack: string;   // back ear (slightly darker, it's further away)
  outline: string;
  belly: string;
  earInner: string;
  earInnerBack: string;
  tail: string;
  feet: string;
  nose: string;
  eye: string;
}

export const CLASSIC_PALETTE: MousePalette = {
  fur: '#a3acbb',
  furBack: '#8f98a8',
  outline: '#6f7889',
  belly: '#dde2ea',
  earInner: '#f2b8c3',
  earInnerBack: '#e9b3bd',
  tail: '#e99aa8',
  feet: '#f2a9b6',
  nose: '#ff8fa3',
  eye: '#20232c',
};

export function drawTail(ctx: CanvasRenderingContext2D, { time }: MousePose, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-22, 2);
  ctx.bezierCurveTo(-36, -2 + Math.sin(time * 9) * 6, -44, 10 + Math.cos(time * 9) * 6, -54, 0 + Math.sin(time * 9 + 1) * 8);
  ctx.stroke();
}

export function drawFeet(ctx: CanvasRenderingContext2D, pose: MousePose, color: string): void {
  const legA = pose.onGround ? Math.sin(pose.time * 22) * 5 : 3;
  ctx.fillStyle = color;
  ell(ctx, -10 + legA, 12, 6, 3.5); ell(ctx, 9 - legA, 12, 6, 3.5);
}

export function drawBackEar(ctx: CanvasRenderingContext2D, pal: MousePalette): void {
  ctx.strokeStyle = pal.outline; ctx.lineWidth = 2;
  ellS(ctx, -1, -17, 9, 10, -0.3, pal.furBack);
  ctx.fillStyle = pal.earInnerBack; ell(ctx, -1, -17, 5, 6, -0.3);
}

/** Body + belly. Set `bodyFill`/`bellyFill` to dress the mouse in a suit. */
export function drawBody(ctx: CanvasRenderingContext2D, pal: MousePalette, bodyFill = pal.fur, bellyFill: string | null = pal.belly): void {
  ctx.strokeStyle = pal.outline; ctx.lineWidth = 2;
  ellS(ctx, 0, 0, 23, 13, 0, bodyFill);
  if (bellyFill) { ctx.fillStyle = bellyFill; ell(ctx, 5, 5, 15, 6.5); }
}

/** Head, front ear, snout, nose, eye and whiskers. */
export function drawHead(ctx: CanvasRenderingContext2D, pal: MousePalette, opts: { eye?: boolean; whiskers?: boolean; ear?: boolean } = {}): void {
  ctx.strokeStyle = pal.outline; ctx.lineWidth = 2;
  ellS(ctx, 17, -4, 12, 10, 0, pal.fur);
  if (opts.ear !== false) {
    ellS(ctx, 8, -19, 11, 12, 0.2, pal.fur);
    ctx.fillStyle = pal.earInner; ell(ctx, 8, -19, 7, 8, 0.2);
  }
  ctx.fillStyle = pal.fur; ell(ctx, 27, -2, 8, 5.5);
  ctx.fillStyle = pal.nose; ell(ctx, 35, -3, 3.4, 3);
  if (opts.eye !== false) drawEye(ctx, pal);
  if (opts.whiskers !== false) drawWhiskers(ctx);
}

export function drawEye(ctx: CanvasRenderingContext2D, pal: MousePalette): void {
  ctx.fillStyle = pal.eye; ell(ctx, 21, -8, 2.7, 3.2);
  ctx.fillStyle = '#ffffff'; ell(ctx, 22, -9, 1, 1);
}

export function drawWhiskers(ctx: CanvasRenderingContext2D, length = 12): void {
  ctx.strokeStyle = 'rgba(60,60,70,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(30, -1); ctx.lineTo(30 + length, -5); ctx.moveTo(30, 0); ctx.lineTo(30 + length, 2); ctx.stroke();
}

/** The complete plain mouse, exactly like the prototype. */
export function drawPlainMouse(ctx: CanvasRenderingContext2D, pose: MousePose, pal: MousePalette): void {
  drawTail(ctx, pose, pal.tail);
  drawFeet(ctx, pose, pal.feet);
  drawBackEar(ctx, pal);
  drawBody(ctx, pal);
  drawHead(ctx, pal);
}
