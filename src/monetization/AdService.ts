import type { AdPlacement } from './adPlacements';

/**
 * The only way the game talks to an ad network.
 * Today: NoAdService. Later: e.g. AdMobAdService, without changing any game code.
 *
 * RULE: implementations never throw. Every problem comes back as a result value.
 *
 * App Tracking Transparency (ATT): if a future ad SDK uses the advertising identifier (IDFA),
 * request ATT permission inside that implementation's initialize(), BEFORE loading the first ad,
 * and add NSUserTrackingUsageDescription to ios/App/App/Info.plist. See docs/adding-ads.md.
 */

export type RewardedResult =
  /** Watched to the end: give the reward. */
  | { status: 'earned' }
  /** Closed early: no reward. */
  | { status: 'skipped' }
  | { status: 'unavailable'; reason: string };

export type InterstitialResult =
  | { status: 'shown' }
  | { status: 'unavailable'; reason: string };

export interface AdService {
  /** For debugging. */
  readonly name: string;

  /** Start the SDK (and ask for tracking permission if needed). Called once, only when ads are enabled. */
  initialize(): Promise<void>;

  /** Is an ad loaded and ready to show right now for this placement? Must answer instantly. */
  isReady(placement: AdPlacement): boolean;

  /** Start loading an ad for this placement in the background. */
  preload(placement: AdPlacement): Promise<void>;

  showRewarded(placement: AdPlacement): Promise<RewardedResult>;

  showInterstitial(placement: AdPlacement): Promise<InterstitialResult>;
}
