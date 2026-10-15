import { TUNING } from '../config/tuning';
import type { View } from './canvas';

const C = TUNING.camera;

/** Follows the mouse and zooms out when it flies high. */
export class Camera {
  scale = 1;
  x = 0;

  constructor(private readonly view: View) {}

  baseScale(): number {
    return Math.min(this.view.H / C.designHeight, this.view.W / C.designWidth);
  }

  reset(targetX: number): void {
    this.scale = this.baseScale();
    this.x = targetX - (this.view.W * C.followX) / this.scale;
  }

  update(targetX: number, targetY: number, dt: number): void {
    const target = Math.min(this.baseScale(), (this.view.H * C.highFlyScreenFraction) / (targetY + C.highFlyPadding));
    this.scale += (target - this.scale) * Math.min(1, dt * C.zoomSpeed);
    this.x = targetX - (this.view.W * C.followX) / this.scale;
  }

  /** World x → screen x */
  toSX(x: number): number { return (x - this.x) * this.scale; }
  /** World y → screen y (world y points up, screen y points down) */
  toSY(y: number): number { return this.view.H - (y + C.groundOffset) * this.scale; }

  /** Size multiplier for characters and items, so they stay readable when zoomed out. */
  spriteScale(): number { return Math.max(this.scale, C.minSpriteScale); }
}
