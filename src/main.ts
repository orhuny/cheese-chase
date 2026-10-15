// Fonts are bundled with the app (no internet needed).
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './ui/styles.css';

import { SoundPlayer } from './audio/audio';
import { createView } from './core/canvas';
import { startLoop } from './core/loop';
import { installDevTools } from './devtools';
import { Economy, type RunReward } from './economy/Economy';
import { Game } from './game/Game';
import { Input } from './input/input';
import { AD_PLACEMENTS } from './monetization/adPlacements';
import { createMonetization } from './monetization';
import type { Outcome } from './monetization/PurchaseManager';
import { AD_RULES } from './config/features';
import { HapticsPlayer } from './platform/haptics';
import { hideSplashWhenReady } from './platform/native';
import { render } from './render/renderer';
import { loadSprites } from './render/sprites';
import { SaveManager } from './save/SaveManager';
import { createStore } from './save/storage';
import { getSkin } from './skins/registry';
import { $ } from './ui/dom';
import { Hud } from './ui/hud';
import { Screens } from './ui/screens';
import { SettingsScreen } from './ui/settings';
import { ShopScreen } from './ui/shop';
import { BusyOverlay, Toasts } from './ui/toast';

async function main(): Promise<void> {
  const save = new SaveManager(createStore());
  await save.load();
  const economy = new Economy(save);
  const { purchases, ads } = createMonetization(economy);

  const view = createView($<HTMLCanvasElement>('game'));
  const hud = new Hud();
  const screens = new Screens();
  const toasts = new Toasts();
  const busy = new BusyOverlay();
  const audio = new SoundPlayer();
  const haptics = new HapticsPlayer();
  const notify = (o: Outcome) => toasts.show(o.message, o.tone);
  let time = 0;

  const shop = new ShopScreen(economy, purchases, notify, () => screens.back());
  const settings = new SettingsScreen(save, purchases, notify, () => screens.back());
  screens.register('shop', shop.root);
  screens.register('settings', settings.root);
  purchases.onLateOutcome = notify;

  const input = new Input(view, {
    isPlaying: () => game.state === 'play',
    tryStart: () => { if (screens.current === 'menu' || screens.current === 'over') startRun(); },
    back: () => { if (screens.current === 'shop' || screens.current === 'settings') screens.back(); },
  });
  const game = new Game(view, input);

  let starting = false;
  async function startRun(): Promise<void> {
    if (!game.canStart() || starting) return;
    starting = true;
    try {
      await ads.beforeRun(AD_PLACEMENTS.betweenRuns); // does nothing while ads are disabled
    } finally {
      starting = false;
    }
    game.start();
    screens.show(null);
    hud.showPads(true);
  }

  // Rewarded-ad offers on the game-over card (hidden while ads are disabled).
  let lastReward: RunReward | null = null;
  let doubledRunId = -1;
  const refreshOffers = () => screens.setOffers({
    continueRun: game.state === 'over' && game.continues < AD_RULES.maxContinuesPerRun && ads.canOfferRewarded(AD_PLACEMENTS.continueAfterCaught),
    doubleCheese: game.state === 'over' && !!lastReward && lastReward.earned > 0 && doubledRunId !== game.runId && ads.canOfferRewarded(AD_PLACEMENTS.doubleCheese),
  });

  $('continueBtn').addEventListener('click', async () => {
    if (await ads.showRewarded(AD_PLACEMENTS.continueAfterCaught)) {
      game.continueRun();
      screens.show(null);
      hud.showPads(true);
    } else {
      notify({ ok: false, tone: 'info', message: 'No ad available right now.' });
      refreshOffers();
    }
  });
  $('doubleBtn').addEventListener('click', async () => {
    const reward = lastReward;
    if (!reward || doubledRunId === game.runId) return;
    if (await ads.showRewarded(AD_PLACEMENTS.doubleCheese)) {
      doubledRunId = game.runId;
      economy.addCheese(reward.earned);
      screens.setGameOverWallet(economy.cheese);
      notify({ ok: true, tone: 'success', message: `+${reward.earned} bonus cheese!` });
    } else {
      notify({ ok: false, tone: 'info', message: 'No ad available right now.' });
    }
    refreshOffers();
  });

  // Buttons
  $('playBtn').addEventListener('click', startRun);
  $('againBtn').addEventListener('click', startRun);
  $('menuShopBtn').addEventListener('click', () => { screens.show('shop'); shop.open(); });
  $('overShopBtn').addEventListener('click', () => { screens.show('shop'); shop.open(); });
  $('menuSettingsBtn').addEventListener('click', () => screens.show('settings'));
  $('overMenuBtn').addEventListener('click', () => screens.show('menu'));

  game.events.on('gameOver', r => {
    hud.showPads(false);
    lastReward = economy.recordRun(r);
    screens.showGameOver(r, lastReward);
    refreshOffers();
  });
  audio.listen(game.events);
  haptics.listen(game.events);

  // Keep every screen in sync with the save and the store.
  const sync = () => {
    screens.updateMenu(economy.best, economy.cheese);
    audio.enabled = save.data.settings.sound;
    haptics.enabled = save.data.settings.haptics;
    settings.render();
    shop.render();
  };
  save.onChange(sync);
  purchases.onChange(() => { busy.set(purchases.busy); shop.render(); });
  sync();

  // Make sure the last write finished when the app goes to the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void save.flush();
  });

  if (import.meta.env.DEV) installDevTools(save, economy, purchases);

  // Wait (briefly) for the character and sky pictures, so the first frame already shows them.
  await loadSprites();
  input.attach();
  game.reset();
  void purchases.init(); // loads prices in the background; the game doesn't wait for the store
  void ads.init();       // does nothing while ads are disabled

  startLoop(dt => {
    time += dt;
    input.tick(dt);
    if (game.state === 'play') game.update(dt);
    game.fx.update(dt, time, view, game.state === 'play' ? game.mouse.vx : null);
    render(view, game, getSkin(economy.selectedSkin), time);
    hud.update(game, economy.best);
    shop.tick(time);
  });
  hideSplashWhenReady();
}

void main().catch(err => {
  console.error('[startup]', err);
  hideSplashWhenReady(); // never leave the iPhone stuck on the launch screen
});
