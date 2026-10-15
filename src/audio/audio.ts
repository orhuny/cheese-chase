import type { Emitter } from '../core/events';
import type { GameEvents } from '../game/Game';

export type SoundName = 'jump' | 'perfect' | 'zoom' | 'bonk' | 'cheese' | 'snap' | 'caught';

/**
 * Sound effects. The prototype has no sound, so this is silent for now;
 * the sound on/off setting and real sounds are added in a later phase.
 */
export class SoundPlayer {
  enabled = true;

  play(_name: SoundName): void {
    // intentionally silent for now
  }

  /** Plays a sound for each game event. */
  listen(events: Emitter<GameEvents>): void {
    events.on('jump', () => this.play('jump'));
    events.on('perfect', () => this.play('perfect'));
    events.on('zoom', () => this.play('zoom'));
    events.on('bonk', () => this.play('bonk'));
    events.on('cheese', () => this.play('cheese'));
    events.on('snap', () => this.play('snap'));
    events.on('gameOver', () => this.play('caught'));
  }
}
