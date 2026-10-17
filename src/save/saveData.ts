import { DEFAULT_SKIN_ID } from '../skins/registry';

export const SAVE_KEY = 'cheese-chase-save';
export const SAVE_VERSION = 1;

/**
 * Everything the game remembers between launches.
 * If you add a field: give it a default in defaultSave() and read it in parseSave().
 * If you change the meaning of a field: bump SAVE_VERSION and convert old data in parseSave().
 */
export interface SaveData {
  version: number;
  /** When this save was first created (ms). Late-approved cheese purchases newer than this are credited. */
  createdAt: number;
  bestDistance: number;   // metres
  cheese: number;         // wallet (soft currency)
  boosts: number;         // shop Boosts left (one is used per tap during a run)
  ownedSkins: string[];
  selectedSkin: string;
  settings: {
    sound: boolean;
    haptics: boolean;
  };
  /** Store transaction IDs already credited, so a purchase is never applied twice. */
  processedTransactions: string[];
  /** Bought "Remove Ads" (only sold once ads exist; see config/features.ts). */
  adsRemoved: boolean;
  stats: {
    runs: number;
    totalDistance: number;
    totalCheese: number;  // all cheese ever collected
    totalTrapsJumped: number;
  };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    bestDistance: 0,
    cheese: 0,
    boosts: 0,
    ownedSkins: [DEFAULT_SKIN_ID],
    selectedSkin: DEFAULT_SKIN_ID,
    settings: { sound: true, haptics: true },
    processedTransactions: [],
    adsRemoved: false,
    stats: { runs: 0, totalDistance: 0, totalCheese: 0, totalTrapsJumped: 0 },
  };
}

const MAX_NUMBER = 1_000_000_000;
export const MAX_TRANSACTIONS = 200;

/** A safe whole number ≥ 0, whatever was stored. */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_NUMBER, Math.max(0, Math.floor(v))) : 0;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? v as Record<string, unknown> : {};
}
function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];
}

/**
 * Turns whatever was stored into valid SaveData.
 * Missing or broken fields fall back to defaults, so a damaged save never crashes the game.
 */
export function parseSave(raw: unknown): SaveData {
  const d = defaultSave();
  const r = obj(raw);
  const settings = obj(r.settings);
  const stats = obj(r.stats);

  const ownedSkins = [...new Set([DEFAULT_SKIN_ID, ...strings(r.ownedSkins)])];
  const selected = typeof r.selectedSkin === 'string' && ownedSkins.includes(r.selectedSkin) ? r.selectedSkin : DEFAULT_SKIN_ID;

  return {
    version: SAVE_VERSION,
    createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) && r.createdAt > 0 ? r.createdAt : d.createdAt,
    bestDistance: count(r.bestDistance),
    cheese: count(r.cheese),
    boosts: count(r.boosts),
    ownedSkins,
    selectedSkin: selected,
    settings: {
      sound: bool(settings.sound, d.settings.sound),
      haptics: bool(settings.haptics, d.settings.haptics),
    },
    processedTransactions: strings(r.processedTransactions).slice(-MAX_TRANSACTIONS),
    adsRemoved: bool(r.adsRemoved, false),
    stats: {
      runs: count(stats.runs),
      totalDistance: count(stats.totalDistance),
      totalCheese: count(stats.totalCheese),
      totalTrapsJumped: count(stats.totalTrapsJumped),
    },
  };
}
