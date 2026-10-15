import type { Tone } from '../monetization/PurchaseManager';
import { el } from './dom';

/** Short messages at the bottom of the screen ("Ninja Mouse unlocked!", "Purchase cancelled."). */
export class Toasts {
  private readonly box = el('div', { class: 'toasts', attrs: { 'aria-live': 'polite', role: 'status' } });

  constructor() {
    document.body.append(this.box);
  }

  show(message: string, tone: Tone = 'info', ms = 3200): void {
    const t = el('div', { class: `toast ${tone}` }, message);
    this.box.append(t);
    while (this.box.children.length > 3) this.box.firstElementChild?.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 300);
    }, ms);
  }
}

/** A dimmed screen with a spinner while the store is working. Taps are blocked so nothing is bought twice. */
export class BusyOverlay {
  private readonly node = el('div', { class: 'busy hidden', attrs: { 'aria-live': 'assertive' } },
    el('div', { class: 'spinner' }),
    el('div', { class: 'busy-text' }, 'Contacting the App Store…'),
  );

  constructor() {
    document.body.append(this.node);
  }

  set(visible: boolean): void {
    this.node.classList.toggle('hidden', !visible);
  }
}
