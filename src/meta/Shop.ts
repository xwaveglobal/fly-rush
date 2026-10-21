/**
 * In-app purchases. Products + a provider interface; the default DemoStore only
 * shows a confirmation (no payment is taken) so every purchase path can be tried.
 * Wire a real store by implementing `Store` (Google Play Billing / StoreKit via a
 * Capacitor plugin, or a web checkout) — see README → In-app purchases.
 */
import type { Reward } from './Daily.ts';

export interface Product {
  sku: string;
  name: string;
  desc: string;
  price: string;
  /** what the player receives */
  grant: Reward & { noAds?: boolean; passDays?: number; starter?: boolean };
  badge?: string;
  kind: 'coins' | 'bundle' | 'special';
  /** one-time offer */
  once?: boolean;
  art: 'coins-s' | 'coins-m' | 'coins-l' | 'coins-xl' | 'starter' | 'jumps' | 'hyper' | 'noads' | 'pass' | 'escape';
}

export const PRODUCTS: Product[] = [
  { sku: 'starter_pack', name: 'Starter Pack', desc: '3,000 coins · 3 Roadster Jumps · 1 HYPER JUMP · no interstitial ads', price: '$1.99', grant: { coins: 3000, items: { super: 3, hyper: 1 }, noAds: true, starter: true }, badge: 'ONE TIME · −80%', kind: 'special', once: true, art: 'starter' },
  { sku: 'xwave_pass', name: 'XWAVE Pass · 30 days', desc: 'Every day: 300 coins + 1 Roadster Jump · gold name on leaderboards · ×2 daily-quest coins', price: '$4.99', grant: { passDays: 30 }, badge: 'BEST FOR DAILY PLAYERS', kind: 'special', art: 'pass' },
  { sku: 'no_ads', name: 'Remove Ads', desc: 'No interstitial ads, forever. Rewarded ads stay optional.', price: '$2.99', grant: { noAds: true }, kind: 'special', once: true, art: 'noads' },
  { sku: 'jump_bundle', name: 'Jump Bundle', desc: '5 Roadster Jumps + 2 HYPER JUMPs', price: '$2.99', grant: { items: { super: 5, hyper: 2 } }, kind: 'bundle', art: 'jumps' },
  { sku: 'escape_3', name: 'Sky Escape ×4', desc: 'Emergency button: rocket straight up over everything, glide back down', price: '$0.99', grant: { items: { escape: 4 } }, kind: 'bundle', art: 'escape' },
  { sku: 'hyper_3', name: 'Mythic HYPER ×5', desc: 'The tournament jump: 7 m high, double roll, golden trail', price: '$3.99', grant: { items: { hyper: 5 } }, badge: 'MYTHIC', kind: 'bundle', art: 'hyper' },
  { sku: 'coins_s', name: '1,200 coins', desc: 'Handful', price: '$0.99', grant: { coins: 1200 }, kind: 'coins', art: 'coins-s' },
  { sku: 'coins_m', name: '6,500 coins', desc: '+30% bonus', price: '$4.99', grant: { coins: 6500 }, badge: 'POPULAR', kind: 'coins', art: 'coins-m' },
  { sku: 'coins_l', name: '14,000 coins', desc: '+40% bonus', price: '$9.99', grant: { coins: 14000 }, kind: 'coins', art: 'coins-l' },
  { sku: 'coins_xl', name: '32,000 coins', desc: '+60% bonus', price: '$19.99', grant: { coins: 32000 }, badge: 'BEST VALUE', kind: 'coins', art: 'coins-xl' },
];

export const productBySku = (sku: string) => PRODUCTS.find((p) => p.sku === sku);

export interface Store {
  readonly name: string;
  /** resolves true when the store confirms the purchase */
  purchase(p: Product): Promise<boolean>;
}

/** Demo store: a clear "demo — no payment" confirmation sheet. */
export class DemoStore implements Store {
  readonly name = 'demo';
  constructor(private parent: HTMLElement) {}
  purchase(p: Product) {
    return new Promise<boolean>((resolve) => {
      const el = document.createElement('div');
      el.className = 'iapsheet';
      el.innerHTML = `
        <div class="iapsheet-box">
          <div class="admock-tag">DEMO STORE</div>
          <div class="iapsheet-name">${p.name}</div>
          <div class="iapsheet-desc">${p.desc}</div>
          <div class="iapsheet-price">${p.price}</div>
          <div class="iapsheet-note">Demo only — no payment is taken. A real build opens Google Play / App Store billing here.</div>
          <div class="admock-actions">
            <button class="btn ghost sm" data-x="no">Cancel</button>
            <button class="btn sm" data-x="ok">Confirm (demo)</button>
          </div>
        </div>`;
      this.parent.appendChild(el);
      const done = (ok: boolean) => {
        el.remove();
        resolve(ok);
      };
      el.querySelector('[data-x="ok"]')!.addEventListener('click', () => done(true));
      el.querySelector('[data-x="no"]')!.addEventListener('click', () => done(false));
      el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    });
  }
}
