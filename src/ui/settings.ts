import { APP } from '../config/app';
import type { Outcome, PurchaseManager } from '../monetization/PurchaseManager';
import { MOCK_MODES, MockPurchaseService, type MockMode } from '../monetization/MockPurchaseService';
import type { SaveManager } from '../save/SaveManager';
import { el } from './dom';

const MODE_LABELS: Record<MockMode, string> = {
  ask: 'Ask me (show a fake purchase sheet)',
  success: 'Always succeed',
  cancel: 'Always cancel',
  fail: 'Always fail (network error)',
  pending: 'Pending (Ask to Buy)',
  unavailable: 'Store unavailable (offline)',
};

/** Sound, haptics, Restore Purchases, privacy policy. */
export class SettingsScreen {
  readonly root: HTMLElement;
  private readonly sound: HTMLButtonElement;
  private readonly haptics: HTMLButtonElement;

  constructor(
    private readonly save: SaveManager,
    private readonly purchases: PurchaseManager,
    private readonly notify: (o: Outcome) => void,
    onClose: () => void,
  ) {
    this.sound = toggle('Sound', () => this.save.update(d => { d.settings.sound = !d.settings.sound; }));
    this.haptics = toggle('Vibration', () => this.save.update(d => { d.settings.haptics = !d.settings.haptics; }));

    this.root = el('div', { class: 'overlay hidden', attrs: { id: 'settings' } },
      el('div', { class: 'card wide settings' },
        el('div', { class: 'sheet-head' },
          el('h2', {}, 'Settings'),
          el('button', { class: 'icon-btn', onclick: onClose, attrs: { 'aria-label': 'Close settings' } }, '✕'),
        ),
        el('div', { class: 'rows' },
          row('🔊 Sound', this.sound),
          row('📳 Vibration', this.haptics),
          row('🛒 Purchases', el('button', { class: 'btn', onclick: () => void this.restore() }, 'Restore Purchases')),
          row('🔒 Privacy', el('a', { class: 'btn', attrs: { href: APP.privacyPolicyUrl, target: '_blank', rel: 'noopener' } }, 'Privacy Policy')),
          this.testStorePanel(),
        ),
        el('div', { class: 'sheet-foot' }, el('span', { class: 'fine' }, `${APP.name} v${APP.version}`)),
      ),
    );
    document.body.append(this.root);
    this.render();
  }

  render(): void {
    setToggle(this.sound, this.save.data.settings.sound);
    setToggle(this.haptics, this.save.data.settings.haptics);
  }

  private async restore(): Promise<void> {
    this.notify(await this.purchases.restore());
  }

  /** Only shown with the browser test store: choose how fake purchases behave. */
  private testStorePanel(): HTMLElement | null {
    const service = this.purchases.service;
    if (!(service instanceof MockPurchaseService)) return null;
    const select = el('select', { class: 'select', attrs: { 'aria-label': 'Test store behaviour' } },
      ...MOCK_MODES.map(m => {
        const o = el('option', { attrs: { value: m } }, MODE_LABELS[m]);
        o.selected = service.mode === m;
        return o;
      }));
    select.addEventListener('change', () => {
      service.mode = select.value as MockMode;
      void this.purchases.refreshPrices();
    });
    const forget = el('button', {
      class: 'btn', onclick: () => {
        service.clearHistory();
        this.notify({ ok: true, tone: 'info', message: 'Test store purchases forgotten (your game save is unchanged).' });
      },
    }, 'Forget test purchases');
    return el('div', { class: 'test-store' },
      el('div', { class: 'test-tag' }, 'TEST STORE · browser only'),
      select,
      forget,
    );
  }
}

function toggle(label: string, onToggle: () => void): HTMLButtonElement {
  return el('button', { class: 'switch', onclick: onToggle, attrs: { role: 'switch', 'aria-label': label } }, el('span', { class: 'knob' }));
}

function setToggle(b: HTMLButtonElement, on: boolean): void {
  b.setAttribute('aria-checked', String(on));
  b.classList.toggle('on', on);
}

function row(label: string, control: HTMLElement): HTMLElement {
  return el('div', { class: 'row' }, el('span', { class: 'row-label' }, label), control);
}
