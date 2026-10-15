import { TUNING } from '../config/tuning';
import type { View } from '../core/canvas';

/** How long the Jump pad lights up after a tap (seconds). */
const JUMP_FLASH = 0.12;

const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Enter'];
const DIVE_KEYS = ['ArrowDown', 'KeyS'];

export interface InputHandlers {
  isPlaying(): boolean;
  /** Called on a game key press while not playing. Starts a run if allowed. */
  tryStart(): void;
  /** Escape key: close the current panel. */
  back(): void;
}

/**
 * Touch: hold the left half to dive, tap the right half to jump (multi-touch works).
 * Keyboard: hold Down/S to dive, Space/Up/W to jump; Enter/Space starts a run, Escape goes back.
 */
export class Input {
  /** Seconds left in which a pressed jump will still happen (jump buffering). */
  jumpBuffer = 0;
  /** Seconds left to highlight the Jump pad. */
  jumpFlash = 0;
  private keyDive = false;
  private readonly divePointers = new Set<number>();

  constructor(private readonly view: View, private readonly handlers: InputHandlers) {}

  attach(): void {
    addEventListener('pointerdown', e => {
      // Outside a run, taps belong to the menu buttons.
      if (e.button > 0 || !this.handlers.isPlaying()) return;
      e.preventDefault();
      if (e.clientX < this.view.W / 2) this.divePointers.add(e.pointerId); else this.jump();
    }, { passive: false });
    const lift = (e: PointerEvent) => this.divePointers.delete(e.pointerId);
    addEventListener('pointerup', lift);
    addEventListener('pointercancel', lift);
    addEventListener('blur', () => this.clear());
    addEventListener('keydown', e => {
      if (e.code === 'Escape') { this.handlers.back(); return; }
      // Let focused buttons and dropdowns handle their own keys on menus.
      if (!this.handlers.isPlaying() && (e.target as Element | null)?.closest?.('button, select, a, input')) return;
      if (GAME_KEYS.includes(e.code)) e.preventDefault(); else return;
      if (!this.handlers.isPlaying()) { if (!e.repeat) this.handlers.tryStart(); return; }
      if (DIVE_KEYS.includes(e.code)) this.keyDive = true;
      else if (!e.repeat) this.jump();
    });
    addEventListener('keyup', e => { if (DIVE_KEYS.includes(e.code)) this.keyDive = false; });
    addEventListener('contextmenu', e => e.preventDefault());
  }

  diving(): boolean {
    return this.divePointers.size > 0 || this.keyDive;
  }

  /** Release everything (start of a run, game over, app lost focus). */
  clear(): void {
    this.divePointers.clear();
    this.keyDive = false;
  }

  tick(dt: number): void {
    this.jumpFlash = Math.max(0, this.jumpFlash - dt);
  }

  private jump(): void {
    this.jumpBuffer = TUNING.jump.bufferTime;
    this.jumpFlash = JUMP_FLASH;
  }
}
