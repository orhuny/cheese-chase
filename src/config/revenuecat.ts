/**
 * RevenueCat settings for the iOS app.
 *
 * The key is RevenueCat's PUBLIC "Apple App Store" SDK key (it starts with "appl_").
 * Find it in RevenueCat → your project → API keys. Public SDK keys are designed to be shipped
 * inside apps, so it's fine to keep it in this file. NEVER put a secret key (sk_...) here.
 *
 * While this still says REPLACE_ME, the iOS app runs normally, but the shop shows
 * "store unavailable" and nothing can be bought.
 */
export const REVENUECAT = {
  iosApiKey: 'appl_REPLACE_ME',
} as const;

export function isRevenueCatConfigured(): boolean {
  return REVENUECAT.iosApiKey.startsWith('appl_') && !REVENUECAT.iosApiKey.includes('REPLACE_ME');
}
