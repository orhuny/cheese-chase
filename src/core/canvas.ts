import { TUNING } from '../config/tuning';

/** The drawing surface. W and H are in CSS pixels; the canvas itself is DPR times bigger. */
export interface View {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  DPR: number;
}

/** Sets up a full-screen, high-DPI canvas that follows window size changes. */
export function createView(canvas: HTMLCanvasElement): View {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported');
  const view: View = { canvas, ctx, W: 0, H: 0, DPR: 1 };

  const resize = () => {
    view.DPR = Math.min(window.devicePixelRatio || 1, TUNING.display.maxPixelRatio);
    view.W = window.innerWidth;
    view.H = window.innerHeight;
    canvas.width = Math.round(view.W * view.DPR);
    canvas.height = Math.round(view.H * view.DPR);
    ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
  };
  addEventListener('resize', resize);
  resize();
  return view;
}

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
