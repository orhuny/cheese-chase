import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { Emitter } from '../core/events';
import type { GameEvents } from '../game/Game';

/** Small vibrations on the iPhone. Does nothing in the browser or when turned off in Settings. */
export class HapticsPlayer {
  enabled = true;
  private readonly native = Capacitor.isNativePlatform();

  impact(style: ImpactStyle): void {
    if (!this.enabled || !this.native) return;
    Haptics.impact({ style }).catch(() => { /* haptics are optional */ });
  }

  listen(events: Emitter<GameEvents>): void {
    events.on('perfect', () => this.impact(ImpactStyle.Light));
    events.on('zoom', () => this.impact(ImpactStyle.Medium));
    events.on('snap', () => this.impact(ImpactStyle.Heavy));
  }
}
