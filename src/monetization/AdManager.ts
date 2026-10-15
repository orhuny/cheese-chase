import { AD_RULES, FEATURES, type AdRules, type FeatureFlags } from '../config/features';
import type { Economy } from '../economy/Economy';
import { PLACEMENT_CONFIG, type AdPlacement } from './adPlacements';
import type { AdService, RewardedResult } from './AdService';
import { safe, withTimeout } from './async';

/**
 * Decides IF and WHEN an ad may be shown (feature flags, Remove Ads, frequency limits),
 * then asks the AdService to show it. Screens only call this class.
 */
export class AdManager {
  private showing = false;
  private runsThisSession = 0;
  private runsSinceInterstitial = 0;
  private lastInterstitialAt = -Infinity;

  constructor(
    readonly service: AdService,
    private readonly economy: Economy,
    private readonly flags: FeatureFlags = FEATURES,
    private readonly rules: AdRules = AD_RULES,
    private readonly now: () => number = () => performance.now() / 1000,
  ) {}

  /** Starts the ad SDK only if ads are enabled; otherwise does nothing at all. */
  async init(): Promise<void> {
    if (!this.flags.adsEnabled) return;
    await safe(() => this.service.initialize(), undefined, 'ads');
    for (const p of Object.keys(PLACEMENT_CONFIG) as AdPlacement[]) {
      if (this.isEnabled(p)) void safe(() => this.service.preload(p), undefined, 'ads');
    }
  }

  /** Is this placement switched on (flags + Remove Ads)? */
  isEnabled(placement: AdPlacement): boolean {
    const cfg = PLACEMENT_CONFIG[placement];
    if (!this.flags.adsEnabled || !this.flags[cfg.flag]) return false;
    return !(cfg.removedByRemoveAds && this.economy.adsRemoved);
  }

  /** Should a "Watch an ad to …" button be shown right now? */
  canOfferRewarded(placement: AdPlacement): boolean {
    if (PLACEMENT_CONFIG[placement].format !== 'rewarded' || this.showing || !this.isEnabled(placement)) return false;
    try { return this.service.isReady(placement); } catch { return false; }
  }

  /** Shows a rewarded ad. Returns true only if the player watched it to the end. */
  async showRewarded(placement: AdPlacement): Promise<boolean> {
    if (!this.canOfferRewarded(placement)) return false;
    const unavailable: RewardedResult = { status: 'unavailable', reason: 'timeout' };
    this.showing = true;
    try {
      const r = await withTimeout(safe(() => this.service.showRewarded(placement), unavailable, 'ads'), this.rules.adTimeoutMs, unavailable);
      return r.status === 'earned';
    } finally {
      this.showing = false;
      void safe(() => this.service.preload(placement), undefined, 'ads');
    }
  }

  /**
   * Call right before a run starts. Shows an interstitial only when every rule allows it:
   * flag on, no Remove Ads, not in the first runs of a session, and not too often.
   */
  async beforeRun(placement: AdPlacement): Promise<void> {
    this.runsThisSession++;
    this.runsSinceInterstitial++;
    if (PLACEMENT_CONFIG[placement].format !== 'interstitial' || this.showing || !this.isEnabled(placement)) return;
    if (this.runsThisSession <= this.rules.interstitialAfterRuns) return;
    if (this.runsSinceInterstitial < this.rules.interstitialEveryRuns) return;
    if (this.now() - this.lastInterstitialAt < this.rules.interstitialMinSeconds) return;
    if (!safeReady(this.service, placement)) return;

    this.showing = true;
    try {
      const r = await withTimeout(
        safe(() => this.service.showInterstitial(placement), { status: 'unavailable' as const, reason: 'error' }, 'ads'),
        this.rules.adTimeoutMs,
        { status: 'unavailable' as const, reason: 'timeout' },
      );
      if (r.status === 'shown') {
        this.runsSinceInterstitial = 0;
        this.lastInterstitialAt = this.now();
      }
    } finally {
      this.showing = false;
      void safe(() => this.service.preload(placement), undefined, 'ads');
    }
  }
}

function safeReady(service: AdService, placement: AdPlacement): boolean {
  try { return service.isReady(placement); } catch { return false; }
}
