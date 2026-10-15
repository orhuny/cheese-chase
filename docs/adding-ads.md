# Adding ads later

Ads are **off** today. The game is already prepared: it only talks to `AdManager`, which only talks to the `AdService` interface. Adding ads means writing **one new class** and changing **one line**, plus the App Store paperwork below.

Check each library's current documentation when you do this. SDKs and Apple rules change.

## What already exists

| File | What it does |
|---|---|
| `src/config/features.ts` | `FEATURES` flags (all `false`) and `AD_RULES` (frequency limits) |
| `src/monetization/adPlacements.ts` | Named placements: `continue_after_caught`, `double_cheese` (rewarded), `between_runs` (interstitial) |
| `src/monetization/AdService.ts` | The interface any ad network must implement |
| `src/monetization/NoAdService.ts` | Today's implementation: always "ads unavailable" |
| `src/monetization/AdManager.ts` | Applies flags, Remove Ads, timeouts and frequency limits |
| `src/monetization/index.ts` | The one place that chooses the ad service |
| `src/config/products.ts` | `remove_ads` product, hidden until `adsEnabled` is `true` |

The game-over screen already has hidden "Continue · watch ad" and "🧀 ×2 · watch ad" buttons. Interstitials are already checked before every run.

## Steps

1. **Pick an ad network** (e.g. Google AdMob) and its Capacitor plugin. For AdMob, look at `@capacitor-community/admob` and confirm it supports your Capacitor version.
2. **Write `src/monetization/AdMobAdService.ts`** implementing `AdService`:
   - `initialize()`: request **App Tracking Transparency** permission first (see below), then start the SDK.
   - `preload(placement)` / `isReady(placement)`: load an ad per placement and remember if it's ready.
   - `showRewarded()`: return `earned` only when the network confirms the reward.
   - Never throw. Turn every error into `unavailable`.
   - Use the network's **test ad unit IDs** until you're ready to release.
3. **Swap it in** inside `src/monetization/index.ts`: replace `new NoAdService()` with your class (on iOS only, keep `NoAdService` in the browser).
4. **Turn on flags** in `src/config/features.ts`: `adsEnabled: true` plus the placements you want.
5. **Remove Ads:** create `com.orhunyaman.cheesechase.remove_ads` (**Non-Consumable**) in App Store Connect and RevenueCat. It appears in the shop's Cheese tab automatically once `adsEnabled` is `true`. Don't create it earlier: a product the reviewer can't find in the app can cause a rejection.

## App Tracking Transparency (ATT)

Needed if the ad SDK uses the advertising identifier (IDFA) for personalised ads.
- Add `NSUserTrackingUsageDescription` to `ios/App/App/Info.plist`, e.g. "This lets us show you more relevant ads."
- Request permission in `AdMobAdService.initialize()`, before loading any ad, and only after the app is visible. Many ad plugins include a helper for this.
- If the player says no, show non-personalised ads. Never block the game.
- The ad network will also ask you to add its `GADApplicationIdentifier` and `SKAdNetworkItems` entries to `Info.plist`.

## App Store paperwork when ads go live

- **App Privacy** in App Store Connect: update your answers. Ad SDKs typically collect *Identifiers (Device ID)*, *Usage Data*, *Diagnostics* and possibly *Coarse Location*, and may be used for *Third-Party Advertising* and *Tracking*. Use the ad network's own privacy disclosure to answer accurately.
- **Privacy policy:** mention the ad network and link to its policy.
- **Age rating 4+:** in the ad network's settings, limit ad content to all-ages (e.g. AdMob "max ad content rating: G"). Make sure ads can't send people to inappropriate content.
- Mention in **review notes** where ads appear and that Remove Ads only removes the between-run ads (optional reward ads stay).
