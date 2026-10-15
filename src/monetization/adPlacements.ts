import type { FeatureFlags } from '../config/features';

/**
 * Every place in the game where an ad could appear, by name.
 * The names are what you'd also use as ad unit names in AdMob (or similar) later.
 * All are disabled while FEATURES.adsEnabled is false.
 */
export const AD_PLACEMENTS = {
  /** Rewarded: caught by the cat → watch an ad to keep running. */
  continueAfterCaught: 'continue_after_caught',
  /** Rewarded: game over → watch an ad to double the cheese from this run. */
  doubleCheese: 'double_cheese',
  /** Interstitial: a full-screen ad before starting another run (rate-limited). */
  betweenRuns: 'between_runs',
} as const;

export type AdPlacement = typeof AD_PLACEMENTS[keyof typeof AD_PLACEMENTS];
export type AdFormat = 'rewarded' | 'interstitial';

export interface PlacementConfig {
  format: AdFormat;
  /** The feature flag that must be on (together with adsEnabled). */
  flag: Exclude<keyof FeatureFlags, 'adsEnabled'>;
  /** Does buying "Remove Ads" turn this placement off? Rewarded ads stay, because the player chooses them. */
  removedByRemoveAds: boolean;
}

export const PLACEMENT_CONFIG: Record<AdPlacement, PlacementConfig> = {
  continue_after_caught: { format: 'rewarded', flag: 'rewardedContinueEnabled', removedByRemoveAds: false },
  double_cheese: { format: 'rewarded', flag: 'rewardedDoubleCheeseEnabled', removedByRemoveAds: false },
  between_runs: { format: 'interstitial', flag: 'interstitialsEnabled', removedByRemoveAds: true },
};
