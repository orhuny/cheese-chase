import { getProduct, LISTED_PRODUCT_IDS, type ProductDef } from '../config/products';
import type { Economy } from '../economy/Economy';
import { safe, withTimeout } from './async';
import type { PurchaseResult, PurchaseService } from './PurchaseService';

export type Tone = 'success' | 'info' | 'error';
/** A message for the player after buying or restoring. */
export interface Outcome { ok: boolean; message: string; tone: Tone; }

const PRICE_TIMEOUT_MS = 10_000;
const RESTORE_TIMEOUT_MS = 60_000;
/** After this long the busy spinner goes away; a late result is still applied when it arrives. */
const PURCHASE_TIMEOUT_MS = 90_000;

const STORE_UNAVAILABLE = "The store isn't available right now. Check your internet connection and try again.";
/** Tolerance between the phone's clock and the store's clock. */
const CLOCK_SLACK_MS = 60_000;

/**
 * Every key a purchase may be recognised by. The same purchase can come back with a different
 * transaction id (e.g. from the purchase call vs. the history), but product + second stays the same.
 */
export function purchaseKeys(productId: string, transactionId: string, purchasedAt: number): string[] {
  const s = Math.floor(purchasedAt / 1000);
  return [transactionId, `${productId}@${s}`, `${productId}@${s - 1}`, `${productId}@${s + 1}`];
}

/**
 * Connects the store (any PurchaseService) to the wallet (Economy).
 * Screens call buy() and restore() and simply show the returned message.
 */
export class PurchaseManager {
  busy = false;
  /** False until the first price request has finished (or timed out). */
  pricesLoaded = false;
  private prices = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  /** Shows results that arrive after the spinner timed out. */
  onLateOutcome: (o: Outcome) => void = () => {};

  constructor(readonly service: PurchaseService, private readonly economy: Economy) {}

  async init(): Promise<void> {
    await safe(() => this.service.initialize(), undefined);
    this.service.onPurchasesChanged(() => void this.syncHistory());
    await this.refreshPrices();
    await this.syncHistory();
  }

  /**
   * Quietly applies the store's purchase history. Never prompts the player.
   *  - mice / packs / Remove Ads: re-unlocked (e.g. after reinstalling)
   *  - cheese bundles bought since this save was created but never credited
   *    (approved later via Ask to Buy, or the app closed mid-purchase): credited once
   */
  async syncHistory(): Promise<void> {
    const history = await withTimeout(safe(() => this.service.getPurchaseHistory(), []), PRICE_TIMEOUT_MS, []);
    this.grantOwned(history.map(h => h.productId));

    let cheese = 0;
    for (const h of history) {
      const p = getProduct(h.productId);
      if (!p || p.kind !== 'consumable' || h.purchasedAt < this.economy.createdAt - CLOCK_SLACK_MS) continue;
      const keys = purchaseKeys(h.productId, h.transactionId, h.purchasedAt);
      if (this.economy.isProcessed(keys)) continue;
      this.economy.applyGrant(p.grant, keys.slice(0, 2));
      cheese += p.grant.cheese ?? 0;
    }
    if (cheese > 0) this.onLateOutcome({ ok: true, tone: 'success', message: `Purchase approved: +${cheese.toLocaleString()} cheese added!` });
    this.notify();
  }

  async refreshPrices(): Promise<void> {
    const products = await withTimeout(safe(() => this.service.getProducts(LISTED_PRODUCT_IDS), []), PRICE_TIMEOUT_MS, []);
    this.prices = new Map(products.map(p => [p.id, p.priceString]));
    this.pricesLoaded = true;
    this.notify();
  }

  /** Localized price, or null if the store didn't return this product. */
  priceOf(productId: string): string | null {
    return this.prices.get(productId) ?? null;
  }

  /** A non-consumable counts as owned when everything it unlocks is owned. */
  isOwned(productId: string): boolean {
    const p = getProduct(productId);
    if (!p || p.kind !== 'non_consumable') return false;
    if (p.grant.removeAds && !this.economy.adsRemoved) return false;
    return (p.grant.skins ?? []).every(id => this.economy.ownsSkin(id));
  }

  /** Called when busy state or prices change, so screens can refresh. */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async buy(productId: string): Promise<Outcome> {
    if (this.busy) return { ok: false, tone: 'info', message: 'Please wait for the current purchase to finish.' };
    const product = getProduct(productId);
    if (!product || !LISTED_PRODUCT_IDS.includes(productId)) return { ok: false, tone: 'error', message: 'This item is not available.' };
    if (this.isOwned(productId)) return { ok: false, tone: 'info', message: 'You already own this.' };

    this.setBusy(true);
    try {
      if (!this.prices.has(productId)) await this.refreshPrices();
      if (!this.prices.has(productId)) return { ok: false, tone: 'error', message: STORE_UNAVAILABLE };
      if (!(await safe(() => this.service.canMakePurchases(), false))) {
        return { ok: false, tone: 'error', message: 'Purchases are turned off on this device (check Screen Time settings).' };
      }

      const pending = safe<PurchaseResult>(() => this.service.purchase(productId), { status: 'failed', message: 'Something went wrong.' });
      const result = await withTimeout(pending, PURCHASE_TIMEOUT_MS, null);
      if (result === null) {
        void pending.then(r => this.onLateOutcome(this.handleResult(product, r)));
        return { ok: false, tone: 'info', message: 'The App Store is taking a while. Your item will be added as soon as the purchase completes.' };
      }
      return this.handleResult(product, result);
    } finally {
      this.setBusy(false);
    }
  }

  async restore(): Promise<Outcome> {
    if (this.busy) return { ok: false, tone: 'info', message: 'Please wait for the current purchase to finish.' };
    this.setBusy(true);
    try {
      const r = await withTimeout(
        safe(() => this.service.restore(), { status: 'failed' as const, message: 'Something went wrong.' }),
        RESTORE_TIMEOUT_MS,
        { status: 'failed' as const, message: 'The App Store did not respond.' },
      );
      if (r.status === 'failed') return { ok: false, tone: 'error', message: `Couldn't restore purchases. ${r.message}` };

      const ours = r.ownedProductIds.filter(id => getProduct(id)?.kind === 'non_consumable');
      if (ours.length === 0) return { ok: true, tone: 'info', message: 'No previous purchases found for this account.' };
      const restored = this.grantOwned(ours);
      return {
        ok: true, tone: 'success',
        message: restored > 0 ? `Purchases restored! ${restored} ${restored === 1 ? 'item' : 'items'} unlocked.` : 'Your purchases are already restored.',
      };
    } finally {
      this.setBusy(false);
    }
  }

  private handleResult(product: ProductDef, r: PurchaseResult): Outcome {
    switch (r.status) {
      case 'success': {
        if (r.productId !== product.id) console.warn('[store] product mismatch', r.productId, product.id);
        // Record only the exact second; the ±1 s keys are for matching, not storing.
        const keys = purchaseKeys(r.productId, r.transactionId, r.purchasedAt);
        if (!this.economy.isProcessed(keys)) this.economy.applyGrant(product.grant, keys.slice(0, 2));
        return { ok: true, tone: 'success', message: successMessage(product) };
      }
      case 'cancelled':
        return { ok: false, tone: 'info', message: 'Purchase cancelled.' };
      case 'pending':
        return { ok: false, tone: 'info', message: 'Waiting for approval. Your item will unlock once the purchase is approved.' };
      case 'failed':
        return { ok: false, tone: 'error', message: `The purchase didn't go through. ${r.message}` };
    }
  }

  /** Re-applies owned non-consumables (mice, Remove Ads). Returns how many things were newly unlocked. */
  private grantOwned(productIds: readonly string[]): number {
    let unlocked = 0;
    for (const id of productIds) {
      const p = getProduct(id);
      if (!p || p.kind !== 'non_consumable') continue;
      const newSkins = (p.grant.skins ?? []).filter(s => !this.economy.ownsSkin(s));
      const newRemoveAds = !!p.grant.removeAds && !this.economy.adsRemoved;
      if (newSkins.length || newRemoveAds) {
        this.economy.applyGrant({ skins: newSkins, removeAds: newRemoveAds });
        unlocked += newSkins.length + (newRemoveAds ? 1 : 0);
      }
    }
    return unlocked;
  }

  private setBusy(b: boolean): void {
    this.busy = b;
    this.notify();
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

function successMessage(p: ProductDef): string {
  if (p.grant.cheese) return `+${p.grant.cheese.toLocaleString()} cheese added to your wallet!`;
  if (p.grant.removeAds) return 'Ads removed. Thank you!';
  if ((p.grant.skins?.length ?? 0) > 1) return 'Thank you for your support! All mice unlocked.';
  return `${p.title} unlocked!`;
}
