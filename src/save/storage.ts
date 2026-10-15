import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/** A simple text key/value store. The save system only talks to this interface. */
export interface KeyValueStore {
  /** For debugging: which backend is in use. */
  readonly kind: 'preferences' | 'localStorage' | 'memory';
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** iOS app: Capacitor Preferences (stored in the app's UserDefaults, survives app updates). */
class PreferencesStore implements KeyValueStore {
  readonly kind = 'preferences';
  async get(key: string) { return (await Preferences.get({ key })).value; }
  async set(key: string, value: string) { await Preferences.set({ key, value }); }
  async remove(key: string) { await Preferences.remove({ key }); }
}

/** Browser: localStorage. */
class LocalStorageStore implements KeyValueStore {
  readonly kind = 'localStorage';
  async get(key: string) { return localStorage.getItem(key); }
  async set(key: string, value: string) { localStorage.setItem(key, value); }
  async remove(key: string) { localStorage.removeItem(key); }
}

/** Last resort (e.g. private browsing with storage blocked): works, but forgets on reload. */
class MemoryStore implements KeyValueStore {
  readonly kind = 'memory';
  private readonly map = new Map<string, string>();
  async get(key: string) { return this.map.get(key) ?? null; }
  async set(key: string, value: string) { this.map.set(key, value); }
  async remove(key: string) { this.map.delete(key); }
}

function localStorageWorks(): boolean {
  try {
    const k = '__cc_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function createStore(): KeyValueStore {
  if (Capacitor.isNativePlatform()) return new PreferencesStore();
  if (localStorageWorks()) return new LocalStorageStore();
  return new MemoryStore();
}
