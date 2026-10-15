import type { Sprite } from './sprites';

/**
 * Running legs drawn in code on top of a still character picture ("rig").
 * The picture is the body (head, body, tail, clothes). Its own legs are either erased here
 * (using `erase` outlines) or, better, the picture is a version generated without legs.
 * All coordinates are in ORIGINAL image pixels (art/source/…), so one rig fits every
 * picture made from the same template.
 */
export type Pt = readonly [number, number];

export interface LegStyle {
  fur: string;      // near legs
  farFur: string;   // far legs (a bit darker, so they read as "behind")
  foot: string;     // paw / boot
  footFar: string;
  outline: string;
  width: number;    // leg thickness
  outlineW: number;
  toes: boolean;    // little toe lines on the paw
}

export interface Leg {
  hip: Pt;            // where the leg hangs from (inside the body)
  upper: number;      // hip → knee length
  lower: number;      // knee → ankle length
  foot: readonly [number, number]; // paw length, height
  far: boolean;
  base: number;       // resting angle (radians; 0 = straight down, + = forward)
  swing: number;      // how far it swings each way while running
  kneeBend: number;   // how much the knee folds while the leg comes forward
  phase: number;      // position in the stride, so legs alternate
  air: number;        // leg angle while flying
}

export interface Rig {
  legs: readonly Leg[];
  /** Outlines of the legs in the picture, erased when the picture still has its own legs. */
  erase: readonly (readonly Pt[])[];
}

const bodies = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

/** The picture with its own legs erased (cached). */
function bodyOf(s: Sprite, erase: Rig['erase']): HTMLCanvasElement | HTMLImageElement {
  if (!erase.length) return s.img;
  const cached = bodies.get(s.img);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = s.outW; c.height = s.outH;
  const g = c.getContext('2d')!;
  g.drawImage(s.img, 0, 0);
  const sc = s.outW / s.trimW;
  g.globalCompositeOperation = 'destination-out';
  for (const poly of erase) {
    g.beginPath();
    poly.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, (x - s.trimX) * sc, (y - s.trimY) * sc));
    g.closePath(); g.fill();
  }
  bodies.set(s.img, c);
  return c;
}

function drawLeg(ctx: CanvasRenderingContext2D, leg: Leg, st: LegStyle, stride: number | null): void {
  const t = stride === null ? 0 : stride + leg.phase;
  const a = stride === null ? leg.air : leg.base + leg.swing * Math.sin(t);
  // The knee folds while the leg travels forward (lifting the paw), and straightens while pushing back.
  const fold = stride === null ? 0.5 : 0.5 + 0.5 * Math.cos(t);
  const b = a - leg.kneeBend * fold;
  const [hx, hy] = leg.hip;
  const kx = hx + Math.sin(a) * leg.upper, ky = hy + Math.cos(a) * leg.upper;
  const ax = kx + Math.sin(b) * leg.lower, ay = ky + Math.cos(b) * leg.lower;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(ax, ay);
  ctx.strokeStyle = st.outline; ctx.lineWidth = st.width + st.outlineW * 2; ctx.stroke();
  ctx.strokeStyle = leg.far ? st.farFur : st.fur; ctx.lineWidth = st.width; ctx.stroke();

  // Paw: points forward, tilting a little with the lower leg; the heel sits at the ankle.
  const [fl, fh] = leg.foot;
  ctx.save();
  ctx.translate(ax, ay); ctx.rotate(-b * 0.35);
  ctx.beginPath(); ctx.ellipse(fl * 0.3, 0, fl / 2, fh / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = leg.far ? st.footFar : st.foot; ctx.fill();
  ctx.lineWidth = st.outlineW; ctx.strokeStyle = st.outline; ctx.stroke();
  if (st.toes) {
    ctx.lineWidth = st.outlineW * 0.55;
    for (const k of [0.45, 0.68]) {
      ctx.beginPath(); ctx.moveTo(fl * k, -fh * 0.05); ctx.quadraticCurveTo(fl * (k + 0.06), fh * 0.25, fl * (k + 0.02), fh * 0.42); ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws a rigged character. The context must already map ORIGINAL image pixels
 * (the picture is drawn at its trim rectangle). `stride` = running cycle in radians, or null while flying.
 * Far legs first, then near legs, then the body on top so it covers where the legs join.
 */
export function drawRigged(ctx: CanvasRenderingContext2D, s: Sprite, rig: Rig, style: LegStyle, stride: number | null): void {
  for (const leg of rig.legs) if (leg.far) drawLeg(ctx, leg, style, stride);
  for (const leg of rig.legs) if (!leg.far) drawLeg(ctx, leg, style, stride);
  ctx.drawImage(bodyOf(s, rig.erase), s.trimX, s.trimY, s.trimW, s.trimH);
}
