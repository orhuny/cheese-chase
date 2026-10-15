/**
 * Feature flags: switch features on or off without touching game code.
 *
 * ADS ARE OFF. Turning a flag on is not enough by itself: the app currently uses
 * NoAdService, which never has an ad to show. See docs/adding-ads.md for the full checklist
 * (ad SDK, App Tracking Transparency, privacy answers, Remove Ads product).
 */
export interface FeatureFlags {
  /** Master switch for every ad. When false, no ad code runs and Remove Ads isn't sold. */
  readonly adsEnabled: boolean;
  /** Game over: "Watch an ad to continue" (once per run). */
  readonly rewardedContinueEnabled: boolean;
  /** Game over: "Watch an ad to double your cheese". */
  readonly rewardedDoubleCheeseEnabled: boolean;
  /** Full-screen ad between runs (limited by AD_RULES). */
  readonly interstitialsEnabled: boolean;
}

export const FEATURES: FeatureFlags = {
  adsEnabled: false,
  rewardedContinueEnabled: false,
  rewardedDoubleCheeseEnabled: false,
  interstitialsEnabled: false,
};

/** Limits so ads never get annoying. Rewarded ads are always the player's choice. */
export const AD_RULES = {
  maxContinuesPerRun: 1,
  /** No interstitial during the first runs of each session. */
  interstitialAfterRuns: 3,
  /** At most one interstitial every N runs... */
  interstitialEveryRuns: 3,
  /** ...and never more often than this. */
  interstitialMinSeconds: 180,
  /** Give up waiting for an ad after this long, so the game can't get stuck. */
  adTimeoutMs: 45_000,
} as const;

export type AdRules = typeof AD_RULES;
