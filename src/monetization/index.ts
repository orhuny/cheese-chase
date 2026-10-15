import { Capacitor } from '@capacitor/core';
import { isRevenueCatConfigured, REVENUECAT } from '../config/revenuecat';
import type { Economy } from '../economy/Economy';
import { AdManager } from './AdManager';
import { MockPurchaseService } from './MockPurchaseService';
import { NoAdService } from './NoAdService';
import { PurchaseManager } from './PurchaseManager';
import type { PurchaseService } from './PurchaseService';
import { RevenueCatPurchaseService } from './RevenueCatPurchaseService';

export interface Monetization {
  purchases: PurchaseManager;
  ads: AdManager;
}

/** iPhone app: real App Store through RevenueCat. Browser: the test store. */
function createPurchaseService(): PurchaseService {
  if (Capacitor.getPlatform() === 'ios') {
    if (!isRevenueCatConfigured()) console.warn('[store] RevenueCat API key not set in src/config/revenuecat.ts');
    return new RevenueCatPurchaseService(REVENUECAT.iosApiKey, import.meta.env.DEV);
  }
  return new MockPurchaseService();
}

/**
 * The ONE place that picks which store and ad implementations the game uses.
 * To add ads later, swap NoAdService for a real ad service here (see docs/adding-ads.md).
 */
export function createMonetization(economy: Economy): Monetization {
  return {
    purchases: new PurchaseManager(createPurchaseService(), economy),
    ads: new AdManager(new NoAdService(), economy),
  };
}
