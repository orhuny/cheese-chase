import { defaultSave, parseSave, SAVE_KEY, type SaveData } from './saveData';
import type { KeyValueStore } from './storage';

/** Best score key used by the prototype and Phase 1; imported once, then ignored. */
const LEGACY_BEST_KEY = 'cheese-chase-best';

/**
 * Loads and saves SaveData. Change data only through update(), which saves right away.
 * Writes happen one at a time in order, and a failed write never crashes the game.
 */
export class SaveManager {
  data: SaveData = defaultSave();
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<(d: SaveData) => void>();

  constructor(readonly store: KeyValueStore) {}

  async load(): Promise<void> {
    let raw: string | null = null;
    try {
      raw = await this.store.get(SAVE_KEY);
    } catch (e) {
      console.warn('[save] could not read save, using defaults', e);
    }

    if (raw === null) {
      this.data = defaultSave();
      this.data.bestDistance = readLegacyBest();
      if (this.data.bestDistance > 0) void this.persist();
    } else {
      try {
        this.data = parseSave(JSON.parse(raw));
      } catch (e) {
        // Keep a copy of the broken save for debugging, then start fresh.
        console.warn('[save] save was damaged, starting fresh', e);
        void this.store.set(SAVE_KEY + '.damaged', raw).catch(() => {});
        this.data = defaultSave();
      }
    }
    this.notify();
  }

  /** Change the save and store it. Example: save.update(d => { d.cheese += 5; }) */
  update(change: (d: SaveData) => void): void {
    change(this.data);
    this.notify();
    void this.persist();
  }

  /** Called whenever the save changes (to refresh menus and the shop). */
  onChange(fn: (d: SaveData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Waits until everything has been written (call before the app goes to the background). */
  flush(): Promise<void> {
    return this.writeQueue;
  }

  /** Delete all progress (used by the developer tools). */
  async reset(): Promise<void> {
    this.data = defaultSave();
    await this.flush();
    await this.store.remove(SAVE_KEY).catch(() => {});
    try { localStorage.removeItem(LEGACY_BEST_KEY); } catch { /* not available */ }
    this.notify();
  }

  private persist(): Promise<void> {
    const json = JSON.stringify(this.data);
    this.writeQueue = this.writeQueue
      .then(() => this.store.set(SAVE_KEY, json))
      .catch(e => console.warn('[save] could not write save', e));
    return this.writeQueue;
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.data);
  }
}

function readLegacyBest(): number {
  try { return parseInt(localStorage.getItem(LEGACY_BEST_KEY) || '0', 10) || 0; } catch { return 0; }
}
