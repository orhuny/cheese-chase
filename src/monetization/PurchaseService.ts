/**
 * The only way the game talks to a real-money store.
 * Implementations: MockPurchaseService (browser testing) and RevenueCatPurchaseService (iOS, Phase 5).
 *
 * RULE: implementations never throw. Every problem comes back as a result value,
 * so a store error can never crash or freeze the game.
 */

/** A product as the store sees it, with the price in the player's own currency. */
export interface StoreProduct {
  id: string;
  title: string;
  priceString: string; // e.g. "$0.99", "0,99 €"
}

/** One completed purchase in the player's store history. */
export interface PastPurchase {
  productId: string;
  transactionId: string;
  /** Milliseconds since 1970. */
  purchasedAt: number;
}

export type PurchaseResult =
  | { status: 'success'; productId: string; transactionId: string; purchasedAt: number }
  | { status: 'cancelled' }
  /** Waiting for approval (e.g. Ask to Buy for children). Unlocks later through restore/sync. */
  | { status: 'pending' }
  | { status: 'failed'; message: string };

export type RestoreResult =
  | { status: 'success'; ownedProductIds: string[] }
  | { status: 'failed'; message: string };

export interface PurchaseService {
  /** For debugging and the settings screen. */
  readonly name: string;

  /** Connect to the store. Safe to call once at startup. */
  initialize(): Promise<void>;

  /** False when the store can't be used (offline, not configured, purchases disabled in Screen Time). */
  canMakePurchases(): Promise<boolean>;

  /** Prices for the given product IDs. Products the store doesn't know are left out. */
  getProducts(ids: readonly string[]): Promise<StoreProduct[]>;

  /** Shows the store's purchase sheet and waits for the result. */
  purchase(productId: string): Promise<PurchaseResult>;

  /** "Restore Purchases": asks the store for everything bought before (may ask the player to sign in). */
  restore(): Promise<RestoreResult>;

  /**
   * Every completed one-time purchase (mice, packs, cheese), without prompting the player.
   * Used silently at startup and after changes, to re-unlock mice and to credit purchases
   * that were approved later (Ask to Buy) or interrupted before the game could credit them.
   */
  getPurchaseHistory(): Promise<PastPurchase[]>;

  /** Called when the store reports new purchases outside a purchase() call (e.g. Ask to Buy approved). */
  onPurchasesChanged(listener: () => void): void;
}
