import { TUNING } from '../config/tuning';
import type { RunReward } from '../economy/Economy';
import type { RunResult } from '../game/Game';
import { $ } from './dom';

export type ScreenId = 'menu' | 'over' | 'shop' | 'settings';

/**
 * Shows one screen at a time. While playing, no screen is shown (current = null).
 * Shop and Settings return to the screen they were opened from.
 */
export class Screens {
  current: ScreenId | null = 'menu';
  private returnTo: ScreenId = 'menu';
  private readonly roots = new Map<ScreenId, HTMLElement>();
  private overTimer = 0;

  constructor() {
    this.roots.set('menu', $('menu'));
    this.roots.set('over', $('over'));
  }

  register(id: ScreenId, root: HTMLElement): void {
    this.roots.set(id, root);
  }

  show(id: ScreenId | null): void {
    clearTimeout(this.overTimer);
    if (id === 'shop' || id === 'settings') {
      if (this.current === 'menu' || this.current === 'over') this.returnTo = this.current;
    }
    for (const [key, root] of this.roots) root.classList.toggle('hidden', key !== id);
    this.current = id;
  }

  /** Close Shop/Settings and go back. */
  back(): void {
    this.show(this.returnTo);
  }

  /** Refreshes the best distance and wallet on the menu. */
  updateMenu(best: number, cheese: number): void {
    $('menuBest').textContent = best.toLocaleString() + ' m';
    $('menuCheese').textContent = '🧀 ' + cheese.toLocaleString();
  }

  /** Shows or hides the "watch an ad" buttons on the game-over card. */
  setOffers(offers: { continueRun: boolean; doubleCheese: boolean }): void {
    $('continueBtn').classList.toggle('hidden', !offers.continueRun);
    $('doubleBtn').classList.toggle('hidden', !offers.doubleCheese);
  }

  /** Updates the wallet on the game-over card (e.g. after doubling). */
  setGameOverWallet(wallet: number): void {
    $('finalWallet').textContent = '🧀 ' + wallet.toLocaleString();
  }

  /** Fills in the results, then shows the card after a short pause. */
  showGameOver(r: RunResult, reward: RunReward): void {
    $('finalDist').textContent = r.distance.toLocaleString() + ' m';
    $('finalCheese').textContent = '+' + reward.earned;
    $('finalTraps').textContent = String(r.trapsJumped);
    $('finalBest').textContent = reward.best.toLocaleString() + ' m';
    this.setGameOverWallet(reward.wallet);
    $('newBest').classList.toggle('hidden', !reward.newBest);
    this.show(null);
    this.overTimer = window.setTimeout(() => this.show('over'), TUNING.flow.gameOverScreenDelayMs);
  }
}
