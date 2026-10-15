/** Small drawing helpers shared by every sprite. */

export const FONT = 'Fredoka, ui-rounded, system-ui, sans-serif';

/** Filled ellipse using the current fillStyle. */
export function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
}

/** Filled + outlined ellipse (outline uses the current strokeStyle). */
export function ellS(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string): void {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
}

/** Rounded rectangle path (ctx.roundRect isn't available on iOS 15). Call fill()/stroke() afterwards. */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Filled 5-point star using the current fillStyle. */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
