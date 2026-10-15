/** What a skin needs to know to animate the mouse. Read-only: skins never change the game. */
export interface MousePose {
  /** Seconds since the game started; use for wiggles and run cycles. */
  time: number;
  onGround: boolean;
  stunned: boolean;
  zooming: boolean;
}

/**
 * A mouse character's look. To add a new mouse, either:
 *  - picture: generate it from art/source/mouse_classic.jpg as reference, save it as art/source/mouse_<id>.jpg,
 *    add it to tools/process-art.mjs, run `npm run art`, and wrap it with spriteMouse() in registry.ts; or
 *  - code: create a file in src/skins/ that implements this interface, and add it to registry.ts.
 * No game logic changes needed either way.
 *
 * Drawing space: the mouse faces right (+x), screen y points down,
 * the body centre is at (0, 0) and the feet touch y ≈ 15.
 * Keep the drawing roughly within x -55..45 and y -40..20 so it matches the hitbox.
 * The renderer already handles position, rotation, zoom, the Zoom glow and the dizzy stars.
 */
export interface MouseSkin {
  id: string;
  name: string;
  /** Height (skin space) of the dizzy stars; defaults to just above the plain mouse's ears. */
  starsY?: number;
  draw(ctx: CanvasRenderingContext2D, pose: MousePose): void;
}
