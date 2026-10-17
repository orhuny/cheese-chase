import { ECONOMY } from '../config/economy';
import type { ProductGrant } from '../config/products';
import type { RunResult } from '../game/Game';
import { MAX_TRANSACTIONS } from '../save/saveData';
import type { SaveManager } from '../save/SaveManager';

/** What a finished run earned, for the game-over screen. */
export interface RunReward {
  earned: number;   // wallet cheese from this whole run
  wallet: number;   // wallet after adding it
  best: number;
  newBest: boolean;
}

/**
 * The cheese wallet, boosts and owned mice. All rules about earning, spending and unlocking live here;
 * screens and stores call these methods instead of editing the save directly.
 */
export class Economy {
  /** What was already banked for the current run (a run can end twice if it is continued). */
  private banked = { runId: -1, cheese: 0, distance: 0, traps: 0 };

  constructor(private readonly save: SaveManager) {}

  get cheese(): number { return this.save.data.cheese; }
  get boosts(): number { return this.save.data.boosts; }
  get best(): number { return this.save.data.bestDistance; }
  get selectedSkin(): string { return this.save.data.selectedSkin; }
  get adsRemoved(): boolean { return this.save.data.adsRemoved; }

  /**
   * Banks a run when the cat catches the mouse: wallet, best distance and lifetime stats.
   * If the same run is continued and ends again, only the extra part is added.
   */
  recordRun(r: RunResult): RunReward {
    const prev = r.runId === this.banked.runId ? this.banked : { runId: r.runId, cheese: 0, distance: 0, traps: 0 };
    const earnedNow = (r.cheese - prev.cheese) * ECONOMY.walletCheesePerPickup;
    const newBest = r.distance > this.best;
    this.save.update(d => {
      d.cheese += earnedNow;
      if (newBest) d.bestDistance = r.distance;
      if (prev.runId !== this.banked.runId) d.stats.runs++;
      d.stats.totalDistance += r.distance - prev.distance;
      d.stats.totalCheese += r.cheese - prev.cheese;
      d.stats.totalTrapsJumped += r.trapsJumped - prev.traps;
    });
    this.banked = { runId: r.runId, cheese: r.cheese, distance: r.distance, traps: r.trapsJumped };
    return { earned: r.cheese * ECONOMY.walletCheesePerPickup, wallet: this.cheese, best: this.best, newBest };
  }

  /** Adds cheese (e.g. a bought cheese bundle). */
  addCheese(amount: number): void {
    if (!(amount > 0)) return;
    this.save.update(d => { d.cheese += Math.floor(amount); });
  }

  /** Spends cheese if there is enough. Returns false (and changes nothing) otherwise. */
  spendCheese(amount: number): boolean {
    if (!(amount >= 0) || this.cheese < amount) return false;
    this.save.update(d => { d.cheese -= amount; });
    return true;
  }

  /** Buys one Boost with cheese. Returns false (and changes nothing) if the wallet is too small. */
  buyBoostWithCheese(price: number): boolean {
    if (!(price >= 0) || this.cheese < price) return false;
    this.save.update(d => { d.cheese -= price; d.boosts++; });
    return true;
  }

  /** Uses one Boost. Returns false if there are none left. */
  useBoost(): boolean {
    if (this.boosts <= 0) return false;
    this.save.update(d => { d.boosts--; });
    return true;
  }

  ownsSkin(id: string): boolean {
    return this.save.data.ownedSkins.includes(id);
  }

  unlockSkin(id: string): void {
    if (this.ownsSkin(id)) return;
    this.save.update(d => { d.ownedSkins.push(id); });
  }

  /** Buys a mouse with cheese. Returns false if it's already owned or the wallet is too small. */
  buySkinWithCheese(id: string, price: number): boolean {
    if (this.ownsSkin(id) || this.cheese < price) return false;
    this.save.update(d => { d.cheese -= price; d.ownedSkins.push(id); });
    return true;
  }

  /** When this save was created (ms). */
  get createdAt(): number { return this.save.data.createdAt; }

  /** Has a purchase with any of these keys already been credited? */
  isProcessed(keys: readonly string[]): boolean {
    return keys.some(k => this.save.data.processedTransactions.includes(k));
  }

  /**
   * Gives the player what a purchase grants, in one save.
   * With transaction keys, the same purchase is never applied twice (returns false the second time).
   */
  applyGrant(grant: ProductGrant, keys: string | readonly string[] = []): boolean {
    const ids = typeof keys === 'string' ? [keys] : keys;
    if (this.isProcessed(ids)) return false;
    this.save.update(d => {
      if (grant.cheese && grant.cheese > 0) d.cheese += Math.floor(grant.cheese);
      if (grant.boosts && grant.boosts > 0) d.boosts += Math.floor(grant.boosts);
      for (const id of grant.skins ?? []) if (!d.ownedSkins.includes(id)) d.ownedSkins.push(id);
      if (grant.removeAds) d.adsRemoved = true;
      d.processedTransactions.push(...ids);
      while (d.processedTransactions.length > MAX_TRANSACTIONS) d.processedTransactions.shift();
    });
    return true;
  }

  /** Selects an owned mouse. Returns false if it isn't owned. */
  selectSkin(id: string): boolean {
    if (!this.ownsSkin(id)) return false;
    this.save.update(d => { d.selectedSkin = id; });
    return true;
  }
}
