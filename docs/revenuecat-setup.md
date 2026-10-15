# Setting up in-app purchases (App Store Connect + RevenueCat)

You do all of this in a web browser on Windows. Until it's done, the iPhone app works normally but the shop's prices say **Unavailable**.

Menus on these websites change often. If a button has moved, search the page for the words in **bold**.

## 1. Apple Developer account
1. Join the Apple Developer Program at developer.apple.com ($99/year). Approval can take a day or two.
2. **Certificates, Identifiers & Profiles → Identifiers → +** → **App IDs** → **App**.
   - Description: `Cheese Chase`
   - Bundle ID: **Explicit** → `com.orhunyaman.cheesechase` (must match `capacitor.config.json`)
   - **In-App Purchase** is already ticked. Leave the other capabilities off.

## 2. App Store Connect
1. appstoreconnect.apple.com → **Business** (older layouts: **Agreements, Tax, and Banking**): accept the **Paid Apps** agreement and fill in your bank and tax details. **In-app purchases do not work at all until this is done**, not even for testing.
2. **Apps → + → New App**: platform iOS, name `Cheese Chase` (if the name is taken, try e.g. "Cheese Chase: Mouse Run"), language, bundle ID `com.orhunyaman.cheesechase`, SKU `cheesechase`.
3. In the app: **Monetization → In-App Purchases → +**. Create these 8 products. **The Product ID must be copied exactly.**

| Type | Reference name | Product ID | Price |
|---|---|---|---|
| Non-Consumable | Ninja Mouse | `com.orhunyaman.cheesechase.mouse_ninja` | $0.99 |
| Non-Consumable | Chef Mouse | `com.orhunyaman.cheesechase.mouse_chef` | $0.99 |
| Non-Consumable | Pirate Mouse | `com.orhunyaman.cheesechase.mouse_pirate` | $0.99 |
| Non-Consumable | Astronaut Mouse | `com.orhunyaman.cheesechase.mouse_astronaut` | $0.99 |
| Non-Consumable | Supporter Pack | `com.orhunyaman.cheesechase.supporter_pack` | $2.99 |
| Consumable | Cheese Wedge | `com.orhunyaman.cheesechase.cheese_500` | $0.99 |
| Consumable | Cheese Wheel | `com.orhunyaman.cheesechase.cheese_1500` | $1.99 |
| Consumable | Cheese Mountain | `com.orhunyaman.cheesechase.cheese_5000` | $4.99 |

   For each one, add an **App Store Localization** (display name and short description, e.g. "Unlocks the Ninja Mouse"). Also add a **Review screenshot**: a screenshot of the shop is fine. You'll take screenshots in TestFlight (Phase 6).
   Do **not** create `remove_ads` yet (see `docs/adding-ads.md`).
4. **Users and Access → Integrations → In-App Purchase → +**: create an **In-App Purchase Key**. Download the `.p8` file (you can only download it once) and note the **Key ID** and **Issuer ID**. RevenueCat uses this key to verify purchases.

## 3. RevenueCat
1. Sign up at revenuecat.com (free until your app earns a set amount; check their current pricing).
2. Create a **Project** called Cheese Chase, then **+ App** → **App Store**.
   - Bundle ID: `com.orhunyaman.cheesechase`
   - Upload the **In-App Purchase Key** `.p8` with its Key ID and Issuer ID.
3. **Product catalog → Products → + New**: add the same 8 product IDs (or use **Import** if it's offered).
   - You don't need Entitlements or Offerings: the game asks for products by ID directly.
4. **API keys**: copy the **public** Apple key. It starts with `appl_`.
5. Paste it into `src/config/revenuecat.ts`, replacing `appl_REPLACE_ME`. This key is meant to be public, so it's fine in your code. **Never** paste a secret key (`sk_…`) there.

## 4. Testing purchases (no real money)
- Builds installed through **TestFlight** use Apple's test ("sandbox") store automatically. Purchases are free and show "[Environment: Sandbox]".
- If the price buttons say *Unavailable* in TestFlight, check that:
  1. the Paid Apps agreement is active,
  2. the product IDs match exactly,
  3. each product is at least **Ready to Submit**,
  4. the RevenueCat key is in `revenuecat.ts`.

  New products can take a few hours to appear.
- To test **Restore Purchases**, delete the app, reinstall it from TestFlight, and tap Restore. Your mice come back. Cheese bundles don't come back: Apple treats them as used up.
