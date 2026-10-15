import { getProduct, PRODUCTS } from '../config/products';
import type { PastPurchase, PurchaseResult, PurchaseService, RestoreResult, StoreProduct } from './PurchaseService';

/**
 * How the test store behaves:
 *  ask         show a fake purchase sheet (you choose Buy or Cancel)
 *  success     every purchase succeeds immediately
 *  cancel      the player always cancels
 *  fail        every purchase fails (e.g. network error)
 *  pending     purchases wait for parent approval (Ask to Buy); "approved" 5 seconds later
 *  unavailable the store can't be reached (no prices, no purchases)
 */
export const MOCK_MODES = ['ask', 'success', 'cancel', 'fail', 'pending', 'unavailable'] as const;
export type MockMode = typeof MOCK_MODES[number];

const MODE_KEY = 'cheese-chase-mock-mode';
/** The fake "Apple account" purchase history. Kept separately from the game save, like a real store. */
const HISTORY_KEY = 'cheese-chase-mock-history';
const DELAY_MS = 700;
const APPROVAL_MS = 5000;

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const newTransactionId = () => `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** A pretend App Store for testing purchases in the browser on Windows. Never charges anything. */
export class MockPurchaseService implements PurchaseService {
  readonly name = 'Test store (browser)';
  private history: PastPurchase[] = [];
  private _mode: MockMode = 'ask';
  private readonly listeners = new Set<() => void>();

  get mode(): MockMode { return this._mode; }
  set mode(m: MockMode) {
    this._mode = MOCK_MODES.includes(m) ? m : 'ask';
    try { localStorage.setItem(MODE_KEY, this._mode); } catch { /* ignore */ }
  }

  async initialize(): Promise<void> {
    try {
      const m = localStorage.getItem(MODE_KEY) as MockMode | null;
      if (m && MOCK_MODES.includes(m)) this._mode = m;
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(raw)) this.history = raw.filter(p => p && typeof p.productId === 'string' && typeof p.transactionId === 'string');
    } catch { /* start empty */ }
  }

  async canMakePurchases(): Promise<boolean> {
    return this._mode !== 'unavailable';
  }

  async getProducts(ids: readonly string[]): Promise<StoreProduct[]> {
    await wait(300);
    if (this._mode === 'unavailable') return [];
    return PRODUCTS.filter(p => ids.includes(p.id)).map(p => ({ id: p.id, title: p.title, priceString: p.referencePrice }));
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    const product = getProduct(productId);
    if (!product) return { status: 'failed', message: 'Unknown product.' };

    let mode = this._mode;
    if (mode === 'ask') mode = (await confirmSheet(product.title, product.description, product.referencePrice)) ? 'success' : 'cancel';
    else await wait(DELAY_MS);

    switch (mode) {
      case 'cancel': return { status: 'cancelled' };
      case 'fail': return { status: 'failed', message: 'Could not connect to the App Store (test).' };
      case 'unavailable': return { status: 'failed', message: 'The store is unavailable (test).' };
      case 'pending':
        // A pretend parent approves a few seconds later; the store then reports the new purchase.
        setTimeout(() => { this.record(productId); this.listeners.forEach(fn => fn()); }, APPROVAL_MS);
        return { status: 'pending' };
      default: {
        const p = this.record(productId);
        return { status: 'success', productId, transactionId: p.transactionId, purchasedAt: p.purchasedAt };
      }
    }
  }

  async restore(): Promise<RestoreResult> {
    await wait(DELAY_MS);
    if (this._mode === 'fail' || this._mode === 'unavailable') return { status: 'failed', message: 'Could not connect to the App Store (test).' };
    return { status: 'success', ownedProductIds: [...new Set(this.history.map(p => p.productId))] };
  }

  async getPurchaseHistory(): Promise<PastPurchase[]> {
    return this._mode === 'unavailable' ? [] : [...this.history];
  }

  onPurchasesChanged(listener: () => void): void {
    this.listeners.add(listener);
  }

  /** Forget everything "bought" in the test store (developer tools). */
  clearHistory(): void {
    this.history = [];
    this.save();
  }

  private record(productId: string): PastPurchase {
    const p = { productId, transactionId: newTransactionId(), purchasedAt: Date.now() };
    this.history.push(p);
    this.save();
    return p;
  }

  private save(): void {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history)); } catch { /* ignore */ }
  }
}

/** A fake purchase sheet, styled like a system dialog and clearly marked as a test. */
function confirmSheet(title: string, description: string, price: string): Promise<boolean> {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'mock-sheet-backdrop';
    const sheet = document.createElement('div');
    sheet.className = 'mock-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Test purchase');

    const tag = document.createElement('div'); tag.className = 'mock-tag'; tag.textContent = 'TEST STORE · no real money';
    const h = document.createElement('div'); h.className = 'mock-title'; h.textContent = title;
    const p = document.createElement('div'); p.className = 'mock-desc'; p.textContent = description;
    const pr = document.createElement('div'); pr.className = 'mock-price'; pr.textContent = price;
    const buy = document.createElement('button'); buy.className = 'mock-buy'; buy.textContent = 'Buy';
    const cancel = document.createElement('button'); cancel.className = 'mock-cancel'; cancel.textContent = 'Cancel';

    const done = (ok: boolean) => { backdrop.remove(); resolve(ok); };
    buy.addEventListener('click', () => done(true));
    cancel.addEventListener('click', () => done(false));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) done(false); });

    sheet.append(tag, h, p, pr, buy, cancel);
    backdrop.append(sheet);
    document.body.append(backdrop);
    buy.focus();
  });
}
