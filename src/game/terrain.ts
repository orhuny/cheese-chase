import { TUNING } from '../config/tuning';
import { clamp, rand } from '../core/math';

const T = TUNING.terrain;

export interface Keypoint { x: number; y: number; }

/** Called for every new keypoint, so items can be placed on it. `difficulty` goes 0 → 1. */
export type KeypointListener = (p: Keypoint, isPeak: boolean, difficulty: number) => void;

/**
 * Endless hills: alternating peaks and valleys (keypoints),
 * joined with cosine interpolation so the slopes are smooth.
 */
export class Terrain {
  pts: Keypoint[] = [];
  private lastHigh = true;

  constructor(private readonly onKeypoint: KeypointListener) {}

  reset(): void {
    this.pts = T.startPoints.map(p => ({ ...p }));
    this.lastHigh = true;
    this.ensure(T.initialLength);
  }

  /** Generate hills until they reach at least x. */
  ensure(x: number): void {
    while (this.pts[this.pts.length - 1].x < x) this.addPoint();
  }

  /** Forget hills far behind. */
  cull(behindX: number): void {
    while (this.pts.length > 5 && this.pts[2].x < behindX) this.pts.shift();
  }

  private addPoint(): void {
    const last = this.pts[this.pts.length - 1];
    const d = clamp(last.x / T.maxDifficultyDistance, 0, 1);
    const high = !this.lastHigh;
    const w = rand(T.segmentMinWidth, T.segmentMaxWidth) + d * T.extraWidthAtMaxDifficulty;
    const y = high ? rand(T.peakMin, T.peakMax) + d * T.extraPeakAtMaxDifficulty : rand(T.valleyMin, T.valleyMax);
    const p = { x: last.x + w, y };
    this.pts.push(p);
    this.onKeypoint(p, high, d);
    this.lastHigh = high;
  }

  /** Index of the segment containing x (binary search). */
  private seg(x: number): number {
    const pts = this.pts;
    let lo = 0, hi = pts.length - 1;
    if (x <= pts[0].x) return 0;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].x <= x) lo = m; else hi = m; }
    return lo;
  }

  /** Ground height and slope (dy/dx) at x. */
  ground(x: number): [y: number, slope: number] {
    const i = this.seg(x), a = this.pts[i], b = this.pts[i + 1];
    const t = clamp((x - a.x) / (b.x - a.x), 0, 1);
    const y = a.y + (b.y - a.y) * (1 - Math.cos(Math.PI * t)) / 2;
    const s = (b.y - a.y) * Math.PI / 2 * Math.sin(Math.PI * t) / (b.x - a.x);
    return [y, s];
  }
}
