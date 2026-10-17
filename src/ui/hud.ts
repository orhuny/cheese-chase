import type { Game } from '../game/Game';
import { $ } from './dom';

/** Distance, cheese, cat distance and best score at the top; Dive/Jump pads and the Boost button at the bottom. */
export class Hud {
  private readonly dist = $('dist');
  private readonly cheese = $('cheesec');
  private readonly chaser = $('chaser');
  private readonly best = $('best');
  private readonly pads = $('pads');
  private readonly padDive = $('padDive');
  private readonly padJump = $('padJump');
  private readonly boostBtn = $('boostBtn');
  private readonly boostCount = $('boostCount');
  private lastKey = '';
  private lastCheese = 0;

  showPads(show: boolean): void {
    this.pads.classList.toggle('hidden', !show);
  }

  update(g: Game, best: number, boosts: number): void {
    this.padDive.classList.toggle('on', g.input.diving());
    this.padJump.classList.toggle('on', g.input.jumpFlash > 0);
    const m = g.distance();
    const gap = g.catGap();
    // Only touch the page when something changed (keeps frames fast).
    const boosting = g.mouse.boost > 0;
    const key = m + '|' + g.cheeseCount + '|' + gap + '|' + best + '|' + boosts + '|' + boosting;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.dist.textContent = m + ' m';
    this.cheese.textContent = '🧀 ' + g.cheeseCount;
    if (g.cheeseCount > this.lastCheese) {
      // Restart the little bounce on every cheese.
      this.cheese.classList.remove('bump'); void this.cheese.offsetWidth; this.cheese.classList.add('bump');
    }
    this.lastCheese = g.cheeseCount;
    this.chaser.textContent = '🐱 cat ' + gap + ' m behind';
    this.chaser.classList.toggle('near', gap < 10);
    this.best.textContent = best ? 'best ' + best + ' m' : '';
    this.boostCount.textContent = String(boosts);
    this.boostBtn.classList.toggle('active', boosting);
    this.boostBtn.classList.toggle('empty', boosts <= 0 && !boosting);
    this.boostBtn.setAttribute('aria-label', `Boost (${boosts} left)`);
  }
}
