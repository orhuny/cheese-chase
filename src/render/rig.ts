import type { Sprite } from './sprites';

/**
 * Running legs made from the character picture's OWN legs ("cut-out" animation).
 * Each leg is cut off the picture along a seam (where it leaves the body) and drawn as a
 * separate piece that swings around its hip. Pieces are drawn behind the body, and each piece
 * reaches a little way up into the body (its "root"), so no gap opens at the joint while it swings.
 * All coordinates are in ORIGINAL image pixels (art/source/…), so one rig fits every
 * picture made from the same template.
 */
export type Pt = readonly [number, number];

export interface Leg {
  /** Outline of the leg, root included. Outside the body it may be generous (the background is see-through). */
  piece: readonly Pt[];
  /** The leg is cut off the body on the far side of this line (2+ points, roughly straight) from the hip. */
  seam: readonly Pt[];
  hip: Pt;          // pivot, inside the body
  base: number;     // resting turn (radians, + = clockwise = foot swings back)
  swing: number;    // how far it swings each way while running
  phase: number;    // position in the stride, so legs alternate
  air: number;      // turn while flying
}

export interface Rig {
  /** Back to front: earlier legs are drawn behind later ones. */
  legs: readonly Leg[];
}

interface Cut {
  body: HTMLCanvasElement;
  pieces: HTMLCanvasElement[];
}

const cuts = new WeakMap<HTMLImageElement, Cut>();

function trace(g: CanvasRenderingContext2D, s: Sprite, pts: readonly Pt[]): void {
  const sc = s.outW / s.trimW;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, (x - s.trimX) * sc, (y - s.trimY) * sc));
  g.closePath();
}

/** The far side of the seam from the hip, as a big polygon. */
function beyondSeam(leg: Leg): Pt[] {
  const [ax, ay] = leg.seam[0], [bx, by] = leg.seam[leg.seam.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  let nx = -uy, ny = ux;
  if ((leg.hip[0] - ax) * nx + (leg.hip[1] - ay) * ny > 0) { nx = -nx; ny = -ny; }
  const L = 4000;
  return [
    [ax - ux * L, ay - uy * L], ...leg.seam, [bx + ux * L, by + uy * L],
    [bx + ux * L + nx * L, by + uy * L + ny * L], [ax - ux * L + nx * L, ay - uy * L + ny * L],
  ];
}

/** Pieces are grown by this much (picture pixels) so neighbouring cuts leave no faint line between them. */
const GROW = 2;

function canvasLike(s: Sprite): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = s.outW; c.height = s.outH;
  return [c, c.getContext('2d')!];
}

/** The part of the picture inside `poly` (grown by GROW), on a canvas the size of the picture. */
function clipTo(s: Sprite, poly: readonly Pt[]): HTMLCanvasElement {
  const [c, g] = canvasLike(s);
  trace(g, s, poly);
  g.lineWidth = GROW * 2; g.lineJoin = 'round'; g.fill(); g.stroke();
  g.globalCompositeOperation = 'source-in';
  g.drawImage(s.img, 0, 0);
  return c;
}

/** Cuts the picture into body + leg pieces (once per picture). */
function cutUp(s: Sprite, rig: Rig): Cut {
  const cached = cuts.get(s.img);
  if (cached) return cached;
  const [body, bg] = canvasLike(s);
  bg.drawImage(s.img, 0, 0);
  bg.globalCompositeOperation = 'destination-out';
  bg.lineWidth = GROW * 2; bg.lineJoin = 'round';
  const pieces = rig.legs.map(leg => {
    const c = clipTo(s, leg.piece);
    bg.save();
    trace(bg, s, beyondSeam(leg)); bg.clip();
    trace(bg, s, leg.piece); bg.fill(); bg.stroke();
    bg.restore();
    return c;
  });
  const cut = { body, pieces };
  cuts.set(s.img, cut);
  return cut;
}

/** Turn of a leg at this point of the stride (`stride` = running cycle in radians, or null while flying). */
function legTurn(leg: Leg, stride: number | null): number {
  return stride === null ? leg.air : leg.base + leg.swing * Math.sin(stride + leg.phase);
}

/**
 * Draws a rigged character. The context must already map ORIGINAL image pixels
 * (the picture is drawn at its trim rectangle).
 */
export function drawRigged(ctx: CanvasRenderingContext2D, s: Sprite, rig: Rig, stride: number | null): void {
  const { body, pieces } = cutUp(s, rig);
  rig.legs.forEach((leg, i) => {
    const [hx, hy] = leg.hip;
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(legTurn(leg, stride)); ctx.translate(-hx, -hy);
    ctx.drawImage(pieces[i], s.trimX, s.trimY, s.trimW, s.trimH);
    ctx.restore();
  });
  ctx.drawImage(body, s.trimX, s.trimY, s.trimW, s.trimH);
}

/** A loose part of a picture (a leg piece or a tail), to draw on its own. */
export interface Part {
  sprite: Sprite;
  canvas: HTMLCanvasElement;
  /** Where it attaches (original pixels). */
  anchor: Pt;
  /** Direction from the anchor to the part's tip (radians, screen axes). */
  angle: number;
  /** Anchor to tip, in original pixels. */
  length: number;
}

const parts = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

function partOf(s: Sprite, canvas: HTMLCanvasElement, anchor: Pt, poly: readonly Pt[]): Part {
  // The tip is the outline point furthest from the anchor.
  let tip = poly[0], best = -1;
  for (const p of poly) { const d = Math.hypot(p[0] - anchor[0], p[1] - anchor[1]); if (d > best) { best = d; tip = p; } }
  return { sprite: s, canvas, anchor, angle: Math.atan2(tip[1] - anchor[1], tip[0] - anchor[0]), length: best };
}

/** Leg `i` of a rigged picture, as a loose part attached at its hip. */
export function legPart(s: Sprite, rig: Rig, i: number): Part {
  const leg = rig.legs[i];
  return partOf(s, cutUp(s, rig).pieces[i], leg.hip, leg.piece);
}

/** Any outlined region of a picture (cached by `key`), attached at `anchor`. */
export function cutPart(s: Sprite, key: string, poly: readonly Pt[], anchor: Pt): Part {
  let byKey = parts.get(s.img);
  if (!byKey) { byKey = new Map(); parts.set(s.img, byKey); }
  let c = byKey.get(key);
  if (!c) { c = clipTo(s, poly); byKey.set(key, c); }
  return partOf(s, c, anchor, poly);
}

/**
 * Draws a part with its anchor at the origin, pointing along `angle`, `u` screen pixels per original pixel.
 * Pieces include a bit of body around the anchor, so draw them behind something that covers it.
 */
export function drawPart(ctx: CanvasRenderingContext2D, p: Part, angle: number, u: number): void {
  const s = p.sprite;
  ctx.save();
  ctx.rotate(angle - p.angle); ctx.scale(u, u); ctx.translate(-p.anchor[0], -p.anchor[1]);
  ctx.drawImage(p.canvas, s.trimX, s.trimY, s.trimW, s.trimH);
  ctx.restore();
}
