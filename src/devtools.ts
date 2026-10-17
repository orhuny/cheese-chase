import { FEATURES } from './config/features';
import type { Economy } from './economy/Economy';
import type { Game } from './game/Game';
import { MockPurchaseService, type MockMode } from './monetization/MockPurchaseService';
import type { PurchaseManager } from './monetization/PurchaseManager';
import type { SaveManager } from './save/SaveManager';
import { SKINS } from './skins/registry';

/**
 * Developer helpers, only included when running `npm run dev` (never in the real app).
 * Open the browser console (F12 → Console) and type, for example:
 *   cheeseChase.show()               see the current save
 *   cheeseChase.addCheese(500)       add cheese to the wallet
 *   cheeseChase.addBoosts(5)         add boosts
 *   cheeseChase.catchMe()            let the cat catch the mouse now (to see the caught scene)
 *   cheeseChase.storeMode('fail')    make test purchases fail (ask/success/cancel/fail/pending/unavailable)
 *   cheeseChase.unlockAll()          own every mouse
 *   cheeseChase.wear('pirate')       wear a mouse
 *   cheeseChase.reset()              delete all progress and reload
 */
export function installDevTools(save: SaveManager, economy: Economy, purchases: PurchaseManager, game: Game): void {
  const mock = purchases.service instanceof MockPurchaseService ? purchases.service : null;
  const tools = {
    show: () => {
      console.log(`[save] stored in: ${save.store.kind} · store: ${purchases.service.name}${mock ? ` (mode: ${mock.mode})` : ''}`);
      console.log('[ads] feature flags:', { ...FEATURES });
      console.log(JSON.parse(JSON.stringify(save.data)));
    },
    addCheese: (n: number) => { economy.addCheese(n); return economy.cheese; },
    addBoosts: (n: number) => { economy.applyGrant({ boosts: n }); return economy.boosts; },
    catchMe: () => { if (game.state !== 'play') return 'start a run first'; game.cat.x = game.mouse.x; },
    setBest: (m: number) => { save.update(d => { d.bestDistance = Math.max(0, Math.floor(m)); }); },
    /** Own every mouse (for testing looks). */
    unlockAll: () => { economy.applyGrant({ skins: SKINS.map(s => s.id) }); return save.data.ownedSkins; },
    /** Wear a mouse you own, e.g. wear('pirate'). */
    wear: (id: string) => economy.selectSkin(id) || `you don't own '${id}' (try cheeseChase.unlockAll())`,
    storeMode: (m?: MockMode) => {
      if (!mock) return 'not using the test store';
      if (m) { mock.mode = m; void purchases.refreshPrices(); }
      return mock.mode;
    },
    /** Deletes the game save AND the test store's purchases, then reloads. */
    reset: async () => { mock?.clearHistory(); await save.reset(); location.reload(); },
  };
  (window as unknown as { cheeseChase: typeof tools }).cheeseChase = tools;
  console.log('%cCheese Chase dev tools: cheeseChase.show(), cheeseChase.addCheese(500), cheeseChase.storeMode("fail"), cheeseChase.reset()', 'color:#ff8a1f;font-weight:bold');
}
