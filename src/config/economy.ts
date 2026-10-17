import { PRODUCT_IDS } from './products';

/**
 * Economy numbers (soft currency). Gameplay numbers live in tuning.ts,
 * real-money products in products.ts.
 */
export const ECONOMY = {
  /** Cheese added to the wallet for each cheese collected in a run. */
  walletCheesePerPickup: 1,
  /** Cheese price of a single Boost in the shop (the 10-pack costs real money, see products.ts). */
  boostCheesePrice: 200,
} as const;

/** How each mouse can be unlocked. Mice are cosmetic only: no gameplay advantage. */
export interface SkinOffer {
  skinId: string;
  cheesePrice: number;
  /** Real-money product that unlocks it, if any. */
  productId?: string;
}

/** Shop order. Classic is free and always owned. */
export const SKIN_OFFERS: readonly SkinOffer[] = [
  { skinId: 'classic', cheesePrice: 0 },
  { skinId: 'ninja', cheesePrice: 400, productId: PRODUCT_IDS.mouseNinja },
  { skinId: 'chef', cheesePrice: 600, productId: PRODUCT_IDS.mouseChef },
  { skinId: 'pirate', cheesePrice: 900, productId: PRODUCT_IDS.mousePirate },
  { skinId: 'astronaut', cheesePrice: 1500, productId: PRODUCT_IDS.mouseAstronaut },
];
