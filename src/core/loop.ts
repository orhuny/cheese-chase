import { TUNING } from '../config/tuning';

/**
 * Runs `frame` once per screen refresh (60 fps on iPhones, 120 on ProMotion screens).
 * dt is capped so a hiccup or returning from the background never makes the game jump ahead.
 */
export function startLoop(frame: (dt: number) => void): void {
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, TUNING.physics.maxFrameTime);
    last = now;
    frame(dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
