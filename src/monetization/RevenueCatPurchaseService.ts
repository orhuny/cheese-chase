import {
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  Purchases,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesStoreProduct,
} from '@revenuecat/purchases-capacitor';
import type { PastPurchase, PurchaseResult, PurchaseService, RestoreResult, StoreProduct } from './PurchaseService';

/** How the plugin rejects on iOS: message + numeric code as a string, details in `data`. */
interface PluginError {
  message?: string;
  code?: string | number;
  userCancelled?: boolean | null;
  data?: { userCancelled?: boolean; readableErrorCode?: string; code?: string | number };
}

/** Turns a RevenueCat error into a sentence a player understands. */
function describe(e: PluginError): { code: string; cancelled: boolean; message: string } {
  const code = String(e?.code ?? e?.data?.code ?? '');
  const cancelled = code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || e?.userCancelled === true || e?.data?.userCancelled === true;
  let message: string;
  switch (code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      message = 'Please check your internet connection.'; break;
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      message = 'Purchases are not allowed on this device.'; break;
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      message = 'This item is not available right now.'; break;
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      message = 'You already own this. Tap Restore Purchases.'; break;
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      message = 'The App Store had a problem. Please try again later.'; break;
    case PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      message = 'Another purchase is still in progress.'; break;
    default:
      message = 'Please try again later.';
  }
  return { code, cancelled, message };
}

function history(info: CustomerInfo): PastPurchase[] {
  return info.nonSubscriptionTransactions.map(t => ({
    productId: t.productIdentifier,
    transactionId: t.transactionIdentifier,
    purchasedAt: Date.parse(t.purchaseDate) || 0,
  }));
}

/**
 * The real App Store, through RevenueCat (iOS app only).
 * Follows the PurchaseService rule: never throws, every problem becomes a result.
 */
export class RevenueCatPurchaseService implements PurchaseService {
  readonly name = 'App Store (RevenueCat)';
  private configured = false;
  private readonly products = new Map<string, PurchasesStoreProduct>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly apiKey: string, private readonly debugLogs: boolean) {}

  async initialize(): Promise<void> {
    if (this.configured) return;
    if (!this.apiKey || this.apiKey.includes('REPLACE_ME')) return; // no key yet: store stays "unavailable"
    try {
      if (this.debugLogs) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      // No appUserID: RevenueCat creates an anonymous ID. No login, no personal data.
      await Purchases.configure({ apiKey: this.apiKey });
      this.configured = true;
      await Purchases.addCustomerInfoUpdateListener(() => this.listeners.forEach(fn => fn()));
    } catch (e) {
      console.warn('[store] RevenueCat setup failed', e);
    }
  }

  async canMakePurchases(): Promise<boolean> {
    if (!this.configured) return false;
    try { return (await Purchases.canMakePayments()).canMakePayments; } catch { return false; }
  }

  async getProducts(ids: readonly string[]): Promise<StoreProduct[]> {
    if (!this.configured) return [];
    try {
      const { products } = await Purchases.getProducts({ productIdentifiers: [...ids], type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
      for (const p of products) this.products.set(p.identifier, p);
      return products.map(p => ({ id: p.identifier, title: p.title, priceString: p.priceString }));
    } catch (e) {
      console.warn('[store] could not load products', e);
      return [];
    }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    if (!this.configured) return { status: 'failed', message: 'The store is not set up yet.' };
    if (!this.products.has(productId)) await this.getProducts([productId]);
    const product = this.products.get(productId);
    if (!product) return { status: 'failed', message: 'This item is not available right now.' };

    try {
      const r = await Purchases.purchaseStoreProduct({ product });
      return {
        status: 'success',
        productId: r.productIdentifier,
        transactionId: r.transaction.transactionIdentifier,
        purchasedAt: Date.parse(r.transaction.purchaseDate) || Date.now(),
      };
    } catch (e) {
      const err = describe(e as PluginError);
      if (err.cancelled) return { status: 'cancelled' };
      if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: 'pending' };
      console.warn('[store] purchase failed', e);
      return { status: 'failed', message: err.message };
    }
  }

  async restore(): Promise<RestoreResult> {
    if (!this.configured) return { status: 'failed', message: 'The store is not set up yet.' };
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return { status: 'success', ownedProductIds: [...new Set(history(customerInfo).map(h => h.productId))] };
    } catch (e) {
      console.warn('[store] restore failed', e);
      return { status: 'failed', message: describe(e as PluginError).message };
    }
  }

  async getPurchaseHistory(): Promise<PastPurchase[]> {
    if (!this.configured) return [];
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return history(customerInfo);
    } catch (e) {
      console.warn('[store] could not read purchase history', e);
      return [];
    }
  }

  onPurchasesChanged(listener: () => void): void {
    this.listeners.add(listener);
  }
}
