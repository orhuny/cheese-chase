import { SKIN_OFFERS, type SkinOffer } from '../config/economy';
import { getProduct, LISTED_PRODUCTS, PRODUCT_IDS } from '../config/products';
import type { Economy } from '../economy/Economy';
import type { Outcome, PurchaseManager } from '../monetization/PurchaseManager';
import { getSkin } from '../skins/registry';
import { el } from './dom';
import { SkinPreview } from './skinPreview';

type Tab = 'mice' | 'cheese';

/** Seconds a "Confirm?" cheese button waits for the second tap. */
const CONFIRM_MS = 3000;

/**
 * The shop: mice (for cheese or real money), cheese bundles, the Supporter Pack, and Restore Purchases.
 * It only calls Economy and PurchaseManager, never a store SDK directly.
 */
export class ShopScreen {
  readonly root: HTMLElement;
  private readonly walletEl = el('div', { class: 'wallet-pill' });
  private readonly list = el('div', { class: 'shop-row', attrs: { role: 'list' } });
  private readonly tabButtons: Record<Tab, HTMLButtonElement>;
  private tab: Tab = 'mice';
  private readonly previews = new Map<string, SkinPreview>();
  private confirming: string | null = null;
  private confirmTimer = 0;

  constructor(
    private readonly economy: Economy,
    private readonly purchases: PurchaseManager,
    private readonly notify: (o: Outcome) => void,
    onClose: () => void,
  ) {
    this.tabButtons = {
      mice: el('button', { class: 'tab', onclick: () => this.setTab('mice'), attrs: { role: 'tab' } }, '🐭 Mice'),
      cheese: el('button', { class: 'tab', onclick: () => this.setTab('cheese'), attrs: { role: 'tab' } }, '🧀 Cheese'),
    };
    this.root = el('div', { class: 'overlay hidden', attrs: { id: 'shop' } },
      el('div', { class: 'card wide' },
        el('div', { class: 'sheet-head' },
          el('h2', {}, 'Shop'),
          this.walletEl,
          el('button', { class: 'icon-btn', onclick: onClose, attrs: { 'aria-label': 'Close shop' } }, '✕'),
        ),
        el('div', { class: 'tabs', attrs: { role: 'tablist' } }, this.tabButtons.mice, this.tabButtons.cheese),
        this.list,
        el('div', { class: 'sheet-foot' },
          el('button', { class: 'link-btn', onclick: () => void this.restore() }, 'Restore Purchases'),
          el('span', { class: 'fine' }, 'Mice are just for looks. They never change the gameplay.'),
        ),
      ),
    );
    document.body.append(this.root);
    for (const o of SKIN_OFFERS) this.previews.set(o.skinId, new SkinPreview(getSkin(o.skinId), 104, 66));
  }

  open(): void {
    this.tab = 'mice';
    this.list.scrollLeft = 0;
    this.render();
    void this.purchases.refreshPrices();
  }

  /** Redraw everything (called when the wallet, ownership, prices or busy state change). */
  render(): void {
    if (this.root.classList.contains('hidden') && this.list.childElementCount) return;
    this.walletEl.textContent = '🧀 ' + this.economy.cheese.toLocaleString();
    for (const t of ['mice', 'cheese'] as const) {
      this.tabButtons[t].classList.toggle('active', this.tab === t);
      this.tabButtons[t].setAttribute('aria-selected', String(this.tab === t));
    }
    const items = this.tab === 'mice'
      ? [...SKIN_OFFERS.map(o => this.skinItem(o)), this.supporterItem()]
      : [
        ...LISTED_PRODUCTS.filter(p => p.kind === 'consumable').map(p => this.cheeseItem(p.id)),
        // Remove Ads is only in LISTED_PRODUCTS when ads are enabled (config/features.ts).
        ...LISTED_PRODUCTS.filter(p => p.grant.removeAds).map(p => this.removeAdsItem(p.id)),
      ];
    this.list.replaceChildren(...items);
  }

  /** Animate the selected mouse's preview. */
  tick(time: number): void {
    if (this.root.classList.contains('hidden') || this.tab !== 'mice') return;
    this.previews.get(this.economy.selectedSkin)?.draw(time, true);
  }

  private setTab(t: Tab): void {
    this.tab = t;
    this.list.scrollLeft = 0;
    this.render();
  }

  private skinItem(o: SkinOffer): HTMLElement {
    const skin = getSkin(o.skinId);
    const owned = this.economy.ownsSkin(o.skinId);
    const selected = this.economy.selectedSkin === o.skinId;
    const preview = this.previews.get(o.skinId)!;
    if (!selected) preview.draw(0, false);

    const buttons: HTMLElement[] = [];
    if (owned) {
      buttons.push(selected
        ? el('button', { class: 'btn selected', disabled: true }, '✓ Selected')
        : el('button', { class: 'btn', onclick: () => { this.economy.selectSkin(o.skinId); this.render(); } }, 'Select'));
    } else {
      const confirming = this.confirming === o.skinId;
      const afford = this.economy.cheese >= o.cheesePrice;
      buttons.push(el('button', {
        class: `btn cheese${confirming ? ' confirm' : ''}${afford ? '' : ' poor'}`,
        onclick: () => this.buyWithCheese(o),
        attrs: { 'aria-label': `Buy ${skin.name} for ${o.cheesePrice} cheese` },
      }, confirming ? 'Confirm?' : `🧀 ${o.cheesePrice.toLocaleString()}`));
      if (o.productId) buttons.push(this.priceButton(o.productId, skin.name));
    }
    return el('div', { class: `item${selected ? ' is-selected' : ''}`, attrs: { role: 'listitem' } },
      preview.canvas,
      el('div', { class: 'item-name' }, skin.name),
      el('div', { class: 'item-buttons' }, ...buttons),
    );
  }

  private supporterItem(): HTMLElement {
    const p = getProduct(PRODUCT_IDS.supporterPack)!;
    const owned = this.purchases.isOwned(p.id);
    return el('div', { class: 'item special', attrs: { role: 'listitem' } },
      el('div', { class: 'item-icon' }, '💛'),
      el('div', { class: 'item-name' }, p.title),
      el('div', { class: 'item-desc' }, 'All 4 mice + a big thank you'),
      el('div', { class: 'item-buttons' }, owned
        ? el('button', { class: 'btn selected', disabled: true }, '✓ Owned')
        : this.priceButton(p.id, p.title)),
    );
  }

  private cheeseItem(productId: string): HTMLElement {
    const p = getProduct(productId)!;
    const amount = p.grant.cheese ?? 0;
    const icon = amount >= 5000 ? '🧀🧀🧀' : amount >= 1500 ? '🧀🧀' : '🧀';
    return el('div', { class: 'item', attrs: { role: 'listitem' } },
      el('div', { class: 'item-icon' }, icon),
      el('div', { class: 'item-name' }, p.title),
      el('div', { class: 'item-desc' }, `${amount.toLocaleString()} cheese`),
      el('div', { class: 'item-buttons' }, this.priceButton(p.id, p.title)),
    );
  }

  private removeAdsItem(productId: string): HTMLElement {
    const p = getProduct(productId)!;
    return el('div', { class: 'item special', attrs: { role: 'listitem' } },
      el('div', { class: 'item-icon' }, '🚫'),
      el('div', { class: 'item-name' }, p.title),
      el('div', { class: 'item-desc' }, 'No ads between runs'),
      el('div', { class: 'item-buttons' }, this.purchases.isOwned(productId)
        ? el('button', { class: 'btn selected', disabled: true }, '✓ Owned')
        : this.priceButton(productId, p.title)),
    );
  }

  private priceButton(productId: string, name: string): HTMLButtonElement {
    const price = this.purchases.priceOf(productId);
    return el('button', {
      class: 'btn money',
      disabled: this.purchases.busy,
      onclick: () => void this.buyWithMoney(productId),
      attrs: { 'aria-label': price ? `Buy ${name} for ${price}` : `${name}: store unavailable` },
    }, price ?? (this.purchases.pricesLoaded ? 'Unavailable' : '…'));
  }

  /** First tap shows "Confirm?", second tap buys, so cheese is never spent by accident. */
  private buyWithCheese(o: SkinOffer): void {
    const name = getSkin(o.skinId).name;
    if (this.economy.cheese < o.cheesePrice) {
      this.notify({ ok: false, tone: 'info', message: `You need ${(o.cheesePrice - this.economy.cheese).toLocaleString()} more cheese for the ${name}.` });
      return;
    }
    if (this.confirming !== o.skinId) {
      this.confirming = o.skinId;
      clearTimeout(this.confirmTimer);
      this.confirmTimer = window.setTimeout(() => { this.confirming = null; this.render(); }, CONFIRM_MS);
      this.render();
      return;
    }
    this.confirming = null;
    clearTimeout(this.confirmTimer);
    if (this.economy.buySkinWithCheese(o.skinId, o.cheesePrice)) {
      this.economy.selectSkin(o.skinId);
      this.notify({ ok: true, tone: 'success', message: `${name} unlocked!` });
    }
    this.render();
  }

  private async buyWithMoney(productId: string): Promise<void> {
    const outcome = await this.purchases.buy(productId);
    // Wear a newly bought single mouse straight away.
    const skins = getProduct(productId)?.grant.skins;
    if (outcome.ok && skins?.length === 1) this.economy.selectSkin(skins[0]);
    this.notify(outcome);
    this.render();
  }

  private async restore(): Promise<void> {
    this.notify(await this.purchases.restore());
    this.render();
  }
}
