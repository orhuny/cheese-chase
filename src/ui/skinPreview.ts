import { TUNING } from '../config/tuning';
import { ell } from '../render/draw';
import type { MouseSkin } from '../skins/MouseSkin';

/** A small canvas showing a mouse skin running in place (used in the shop). */
export class SkinPreview {
  readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly dpr = Math.min(window.devicePixelRatio || 1, TUNING.display.maxPixelRatio);

  constructor(private readonly skin: MouseSkin, private readonly w = 120, private readonly h = 80) {
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.className = 'skin-preview';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', skin.name);
    this.ctx = this.canvas.getContext('2d')!;
    this.draw(0, false);
  }

  /** `running` animates the legs; otherwise the mouse stands still. */
  draw(time: number, running: boolean): void {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // Skins span about x -56..46 and y -56..17 around their centre (tall hats and antennas included).
    const k = Math.min(w / 112, h / 78);
    ctx.translate(w / 2 + 6 * k, h * 0.74);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(60,40,20,0.14)'; ell(ctx, -2, 16, 34, 4);
    ctx.save();
    this.skin.draw(ctx, { time, onGround: running, stunned: false, zooming: false });
    ctx.restore();
  }
}
