import type { Camera } from '../core/camera';
import type { View } from '../core/canvas';
import type { Game } from '../game/Game';
import { TUNING } from '../config/tuning';
import { mouthOf } from '../game/entities/mouse';
import { ell, FONT } from './draw';
import { getSprite, type Sprite } from './sprites';

const GROUND_STEP = 6;
const FLY = TUNING.cheese.flyTime;
/** Reused every frame to avoid sampling the terrain twice per column. */
const groundYs: number[] = [];

/** One repeat of the grass texture covers this many world units. */
const FILL_TILE_WORLD = 300;
/** Height of the grassy edge strip in world units (blades above the surface + band below). */
const EDGE_HEIGHT_WORLD = 40;

const fillPatterns = new WeakMap<HTMLImageElement, CanvasPattern | null>();

/** The grass texture as a repeating fill that moves with the world (not with the screen). */
function groundPattern(ctx: CanvasRenderingContext2D, pic: Sprite, cam: Camera): CanvasPattern | null {
  let p = fillPatterns.get(pic.img);
  if (p === undefined) { p = ctx.createPattern(pic.img, 'repeat'); fillPatterns.set(pic.img, p); }
  if (!p) return null;
  const tile = FILL_TILE_WORLD * cam.scale, s = tile / pic.img.width;
  const mod = (v: number) => ((v % tile) + tile) % tile;
  p.setTransform(new DOMMatrix([s, 0, 0, s, mod(cam.toSX(0)), mod(cam.toSY(0))]));
  return p;
}

/** Lays the grassy edge picture along the hill line in thin slices, each sheared to the local slope. */
function drawGrassEdge(ctx: CanvasRenderingContext2D, pic: Sprite, cam: Camera, n: number, step: number): void {
  const img = pic.img, iw = img.width, ih = img.height;
  const eh = EDGE_HEIGHT_WORLD * cam.scale;   // on-screen height of the strip
  const above = (pic.groundLine ?? 0.5) * eh; // part above the surface (the blades)
  const r = ih / eh;                          // image pixels per screen pixel (same both ways)
  const w = step * r;                         // image pixels per slice
  for (let i = 0, sx = -step; i < n - 1; i++, sx += step) {
    const y0 = groundYs[i], k = (groundYs[i + 1] - y0) / step;
    const u = (((cam.x * cam.scale + sx) * r) % iw + iw) % iw; // fixed to the world, so it scrolls with the hills
    ctx.save();
    ctx.translate(sx, y0); ctx.transform(1, k, 0, 1, 0, 0);
    if (u + w <= iw) {
      ctx.drawImage(img, u, 0, w, ih, 0, -above, step + 0.6, eh);
    } else { // the slice wraps around the end of the repeating picture
      const w1 = iw - u, d1 = step * w1 / w;
      ctx.drawImage(img, u, 0, w1, ih, 0, -above, d1 + 0.3, eh);
      ctx.drawImage(img, 0, 0, w - w1, ih, d1, -above, step - d1 + 0.6, eh);
    }
    ctx.restore();
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, { W, H }: View, cam: Camera, g: Game): void {
  const step = GROUND_STEP;
  let n = 0;
  for (let sx = -step; sx <= W + step; sx += step) groundYs[n++] = cam.toSY(g.terrain.ground(cam.x + sx / cam.scale)[0]);

  const hill = () => {
    ctx.beginPath(); ctx.moveTo(-step, H);
    for (let i = 0, sx = -step; i < n; i++, sx += step) ctx.lineTo(sx, groundYs[i]);
    ctx.lineTo(W + step, H); ctx.closePath();
  };
  const fill = getSprite('ground_fill');
  const pattern = fill ? groundPattern(ctx, fill, cam) : null;
  hill();
  if (pattern) {
    ctx.fillStyle = pattern; ctx.fill();
    // Slightly darker further down, for depth.
    const shade = ctx.createLinearGradient(0, H - 420 * cam.scale, 0, H);
    shade.addColorStop(0, 'rgba(20,60,10,0)'); shade.addColorStop(1, 'rgba(20,60,10,0.3)');
    ctx.fillStyle = shade; ctx.fill();
  } else {
    const grad = ctx.createLinearGradient(0, H - 420 * cam.scale, 0, H);
    grad.addColorStop(0, '#7ccf5c'); grad.addColorStop(0.55, '#5fb246'); grad.addColorStop(1, '#3f8a35');
    ctx.fillStyle = grad; ctx.fill();
  }

  const edge = getSprite('ground_edge');
  if (edge) { drawGrassEdge(ctx, edge, cam, n, step); return; }
  // bright grass edge (drawn version)
  ctx.beginPath();
  ctx.moveTo(-step, groundYs[0]);
  for (let i = 1, sx = 0; i < n; i++, sx += step) ctx.lineTo(sx, groundYs[i]);
  ctx.strokeStyle = '#a6e37e'; ctx.lineWidth = Math.max(3, 8 * cam.scale); ctx.stroke();
}

export function drawCheese(ctx: CanvasRenderingContext2D, { W }: View, cam: Camera, g: Game, time: number): void {
  const k = cam.spriteScale();
  ctx.lineJoin = 'round';
  for (const f of g.cheese) {
    if (f.got) continue;
    const sx = cam.toSX(f.x); if (sx < -40 || sx > W + 40) continue;
    const sy = cam.toSY(f.y + Math.sin(time * 3 + f.x * 0.01) * 6);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k); ctx.rotate(Math.sin(time * 2 + f.x) * 0.12);
    cheeseWedge(ctx);
    ctx.restore();
  }
}

/** Cheese the mouse just grabbed: shrinks and spins into its mouth. */
export function drawEatenCheese(ctx: CanvasRenderingContext2D, cam: Camera, g: Game): void {
  const k = cam.spriteScale();
  const [mx, my] = mouthOf(g.mouse);
  ctx.lineJoin = 'round';
  for (const f of g.cheese) {
    if (!f.got || f.eaten < 0 || f.eaten >= FLY) continue;
    const p = f.eaten / FLY, e = p * p; // speeds up into the mouth
    const sx = cam.toSX(f.x + (mx - f.x) * e), sy = cam.toSY(f.y + (my - f.y) * e);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(k * (1 - 0.7 * p), k * (1 - 0.7 * p)); ctx.rotate(-p * 2.5);
    cheeseWedge(ctx);
    ctx.restore();
  }
}

/** The cheese wedge around (0, 0), 32 units wide. */
function cheeseWedge(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath(); ctx.moveTo(-16, 9); ctx.lineTo(16, 9); ctx.lineTo(16, -3); ctx.lineTo(-16, 3); ctx.closePath();
  ctx.fillStyle = '#ffc93a'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-16, 3); ctx.lineTo(16, -3); ctx.lineTo(16, -8); ctx.closePath();
  ctx.fillStyle = '#ffe27a'; ctx.fill();
  ctx.strokeStyle = '#d9971a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, 9); ctx.lineTo(16, 9); ctx.lineTo(16, -8); ctx.lineTo(-16, 3); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#e8a817'; ell(ctx, -4, 5, 3, 2.4); ell(ctx, 8, 3, 2.4, 2); ell(ctx, 10, -4, 1.8, 1.4);
}

export function drawTraps(ctx: CanvasRenderingContext2D, { W }: View, cam: Camera, g: Game, time: number): void {
  const k = cam.spriteScale();
  for (const t of g.traps) {
    const sx = cam.toSX(t.x); if (sx < -60 || sx > W + 60) continue;
    const [gy, s] = g.terrain.ground(t.x);
    ctx.save(); ctx.translate(sx, cam.toSY(gy)); ctx.rotate(-Math.atan(s)); ctx.scale(k * 1.1, k * 1.1);
    ctx.fillStyle = 'rgba(40,60,20,0.25)'; ell(ctx, 0, 1, 26, 4);
    ctx.fillStyle = '#c58b4f'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-24, -8, 48, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a4adb8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (t.hit) { ctx.moveTo(-18, -9); ctx.lineTo(18, -9); }
    else { ctx.moveTo(-17, -8); ctx.lineTo(-17, -24); ctx.lineTo(-3, -24); ctx.lineTo(-3, -8); }
    ctx.stroke();
    ctx.fillStyle = '#7c8794'; ell(ctx, -10, -8, 3, 3);
    if (!t.hit) {
      // bait + blinking warning
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(18, -8); ctx.lineTo(18, -15); ctx.closePath(); ctx.fill();
      const a = 0.5 + 0.5 * Math.sin(time * 8);
      ctx.fillStyle = `rgba(255,80,60,${0.65 + 0.35 * a})`;
      ctx.font = `700 18px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('!', 0, -32);
    }
    ctx.restore();
  }
}
