import type { AdService, InterstitialResult, RewardedResult } from './AdService';

const UNAVAILABLE = 'ads unavailable';

/** The ad service used today: there are no ads. Every request reports "ads unavailable". */
export class NoAdService implements AdService {
  readonly name = 'No ads';

  async initialize(): Promise<void> {}

  isReady(): boolean {
    return false;
  }

  async preload(): Promise<void> {}

  async showRewarded(): Promise<RewardedResult> {
    return { status: 'unavailable', reason: UNAVAILABLE };
  }

  async showInterstitial(): Promise<InterstitialResult> {
    return { status: 'unavailable', reason: UNAVAILABLE };
  }
}
