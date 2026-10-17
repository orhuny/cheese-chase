/**
 * Every real-money product, in one place.
 * These IDs must match EXACTLY what you create in App Store Connect and RevenueCat.
 *
 * Types (Apple's wording):
 *  - consumable:     can be bought again and again (cheese bundles, boost packs)
 *  - non_consumable: bought once, owned forever, restorable (mice, Supporter Pack)
 *
 * Prices are set in App Store Connect; `referencePrice` is only shown by the
 * browser test store and as a hint for what to pick in App Store Connect.
 */

import { FEATURES } from './features';

const PREFIX = 'com.orhunyaman.cheesechase.';

export const PRODUCT_IDS = {
  mouseNinja: PREFIX + 'mouse_ninja',
  mouseChef: PREFIX + 'mouse_chef',
  mouseAstronaut: PREFIX + 'mouse_astronaut',
  mousePirate: PREFIX + 'mouse_pirate',
  supporterPack: PREFIX + 'supporter_pack',
  cheeseSmall: PREFIX + 'cheese_500',
  cheeseMedium: PREFIX + 'cheese_1500',
  cheeseLarge: PREFIX + 'cheese_5000',
  boostPack: PREFIX + 'boost_10',
  /** PLANNED. Only sold once ads exist. Don't create it in App Store Connect until then. */
  removeAds: PREFIX + 'remove_ads',
} as const;

export type ProductKind = 'consumable' | 'non_consumable';

/** What the player receives. */
export interface ProductGrant {
  cheese?: number;
  /** Boosts added to the wallet. */
  boosts?: number;
  skins?: readonly string[];
  /** Turns off interstitial ads for good. */
  removeAds?: boolean;
}

export interface ProductDef {
  id: string;
  kind: ProductKind;
  title: string;
  description: string;
  grant: ProductGrant;
  referencePrice: string;
  /** Only listed in the shop (and requested from the store) when ads are enabled. */
  requiresAds?: boolean;
}

/** The mice included in the Supporter Pack ("all current mice"). Mice added later are not included. */
export const SUPPORTER_PACK_SKINS = ['ninja', 'chef', 'astronaut', 'pirate'] as const;

export const PRODUCTS: readonly ProductDef[] = [
  { id: PRODUCT_IDS.mouseNinja, kind: 'non_consumable', title: 'Ninja Mouse', description: 'Unlocks the Ninja Mouse.', grant: { skins: ['ninja'] }, referencePrice: '$0.99' },
  { id: PRODUCT_IDS.mouseChef, kind: 'non_consumable', title: 'Chef Mouse', description: 'Unlocks the Chef Mouse.', grant: { skins: ['chef'] }, referencePrice: '$0.99' },
  { id: PRODUCT_IDS.mouseAstronaut, kind: 'non_consumable', title: 'Astronaut Mouse', description: 'Unlocks the Astronaut Mouse.', grant: { skins: ['astronaut'] }, referencePrice: '$0.99' },
  { id: PRODUCT_IDS.mousePirate, kind: 'non_consumable', title: 'Pirate Mouse', description: 'Unlocks the Pirate Mouse.', grant: { skins: ['pirate'] }, referencePrice: '$0.99' },
  { id: PRODUCT_IDS.supporterPack, kind: 'non_consumable', title: 'Supporter Pack', description: 'Unlocks all four mice and supports the game.', grant: { skins: SUPPORTER_PACK_SKINS }, referencePrice: '$2.99' },
  { id: PRODUCT_IDS.cheeseSmall, kind: 'consumable', title: 'Cheese Wedge', description: '500 cheese', grant: { cheese: 500 }, referencePrice: '$0.99' },
  { id: PRODUCT_IDS.cheeseMedium, kind: 'consumable', title: 'Cheese Wheel', description: '1,500 cheese', grant: { cheese: 1500 }, referencePrice: '$1.99' },
  { id: PRODUCT_IDS.cheeseLarge, kind: 'consumable', title: 'Cheese Mountain', description: '5,000 cheese', grant: { cheese: 5000 }, referencePrice: '$4.99' },
  { id: PRODUCT_IDS.boostPack, kind: 'consumable', title: 'Boost Pack', description: '10 boosts: tap ⚡ during a run to outrun the cat.', grant: { boosts: 10 }, referencePrice: '$1.99' },
  { id: PRODUCT_IDS.removeAds, kind: 'non_consumable', title: 'Remove Ads', description: 'No more ads between runs. Optional reward ads stay available.', grant: { removeAds: true }, referencePrice: '$2.99', requiresAds: true },
];

/** Products the player can see and buy right now. Remove Ads stays hidden while ads are disabled. */
export const LISTED_PRODUCTS: readonly ProductDef[] = PRODUCTS.filter(p => !p.requiresAds || FEATURES.adsEnabled);
export const LISTED_PRODUCT_IDS: readonly string[] = LISTED_PRODUCTS.map(p => p.id);

export function getProduct(id: string): ProductDef | undefined {
  return PRODUCTS.find(p => p.id === id);
}
