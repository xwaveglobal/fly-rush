/**
 * Daily live-ops: 7-day check-in calendar + 4 daily quests (reset at local
 * midnight) that earn Daily Points toward 3 milestone chests.
 */
import { hashStr, rng } from './Leaderboard.ts';

export type ItemKey = 'super' | 'hyper' | 'shield' | 'escape' | 'turbo' | 'magnet' | 'double' | 'life';
/** start-of-run boosts unlocked by rank class (then bought with coins) */
export const UNLOCK_BOOSTS: { k: ItemKey; cls: 'C' | 'B' | 'A' | 'AA'; price: number }[] = [
  { k: 'turbo', cls: 'C', price: 150 },
  { k: 'magnet', cls: 'B', price: 180 },
  { k: 'double', cls: 'A', price: 260 },
  { k: 'life', cls: 'AA', price: 400 },
];
/**
 * Coin price of ONE item bought singly (Magic Bag / item card). Deliberately above the
 * value inside real-money bundles, so bundles are always the better deal (see docs/ECONOMY.md).
 */
export const ITEM_PRICE: Record<ItemKey, number> = { super: 1800, hyper: 4000, escape: 1200, shield: 300, turbo: 150, magnet: 180, double: 260, life: 400 };
/** v1 prices — only used to refund retired items when an old save moves to v2 */
export const V1_ITEM_PRICE: Record<ItemKey, number> = { super: 400, hyper: 1200, escape: 350, shield: 300, turbo: 150, magnet: 180, double: 260, life: 400 };

/** v2 special items (docs/GAME-DESIGN.md §4): bought with coins, kept in the Magic Bag, ONE per race */
export const SPECIALS = ['escape', 'super', 'hyper'] as const;
export type SpecialKey = (typeof SPECIALS)[number];
/** teaser specials: shown blurred, unlock at AAA (they appear for real in Bonus events) */
export const LOCKED_SPECIALS: { id: string; name: string; short: string; desc: string }[] = [
  { id: 'tunnel', name: 'Tunnel Rider', short: 'Tunnel', desc: 'In a tunnel, drive on its roof' },
  { id: 'wall', name: 'Wall Run', short: 'Wall', desc: 'Run along the side wall past a whole row' },
  { id: 'ghost', name: 'Phase Ghost', short: 'Ghost', desc: 'Pass through obstacles for a few seconds' },
  { id: 'rail', name: 'Sky Rail', short: 'Rail', desc: 'Grab a rail up high and glide a whole stretch' },
];

/** coin value of a reward (used to show "worth N coins" on shop bundles) */
export function rewardValue(r: { coins?: number; items?: Partial<Record<ItemKey, number>> }) {
  let v = r.coins ?? 0;
  for (const [k, n] of Object.entries(r.items ?? {})) v += (n ?? 0) * ITEM_PRICE[k as ItemKey];
  return v;
}

export interface Reward {
  coins?: number;
  items?: Partial<Record<ItemKey, number>>;
}

/** v2: daily check-in pays coins (day 7 adds a Roadster Jump to the Magic Bag) */
export const CHECKIN: Reward[] = [
  { coins: 100 },
  { coins: 150 },
  { coins: 200 },
  { coins: 250 },
  { coins: 300 },
  { coins: 400 },
  { coins: 600, items: { super: 1 } },
];

export type QuestStat = 'runs' | 'coins' | 'distance' | 'near' | 'powerups' | 'jumps' | 'score' | 'finish' | 'rings' | 'exp';

export interface Quest {
  id: string;
  text: string;
  stat: QuestStat;
  target: number;
  /** 'sum' accumulates across runs today, 'max' needs it in one run */
  mode: 'sum' | 'max';
  pts: number;
  coins: number;
}

/** v2: daily missions (Daily + Missions merged) — coins only */
const POOL: Quest[] = [
  { id: 'runs3', text: 'Play 3 races', stat: 'runs', target: 3, mode: 'sum', pts: 0, coins: 100 },
  { id: 'coins150', text: 'Collect 150 coins', stat: 'coins', target: 150, mode: 'sum', pts: 0, coins: 120 },
  { id: 'dist5k', text: 'Drive 5,000 m in total', stat: 'distance', target: 5000, mode: 'sum', pts: 0, coins: 120 },
  { id: 'dist12k', text: 'Drive 12,000 m in total', stat: 'distance', target: 12000, mode: 'sum', pts: 0, coins: 200 },
  { id: 'exp1500', text: 'Earn 1,500 EXP in one race', stat: 'exp', target: 1500, mode: 'max', pts: 0, coins: 150 },
  { id: 'exp3000', text: 'Earn 3,000 EXP in one race', stat: 'exp', target: 3000, mode: 'max', pts: 0, coins: 250 },
  { id: 'power4', text: 'Grab 4 power-ups', stat: 'powerups', target: 4, mode: 'sum', pts: 0, coins: 100 },
  { id: 'jump1', text: 'Use a special', stat: 'jumps', target: 1, mode: 'sum', pts: 0, coins: 150 },
  { id: 'rings6', text: 'Fly through 6 energy rings', stat: 'rings', target: 6, mode: 'sum', pts: 0, coins: 100 },
  { id: 'bonus1', text: 'Finish a Bonus road', stat: 'finish', target: 1, mode: 'sum', pts: 0, coins: 300 },
];

/** Same 4 quests for everyone on a given day. */
export function questsFor(day: string): Quest[] {
  const r = rng(hashStr(`daily-${day}`));
  const pool = [...POOL];
  const out: Quest[] = [pool.splice(0, 1)[0]]; // "Play 3 runs" is always there
  while (out.length < 4) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

/** v2: no points / chests any more (Daily pays coins per mission) */
export const CHESTS: { pts: number; reward: Reward }[] = [];

export const rewardText = (r: Reward) => {
  const parts: string[] = [];
  if (r.coins) parts.push(`${r.coins.toLocaleString('en-US')} coins`);
  const names: Record<ItemKey, string> = { super: 'Roadster Jump', hyper: 'HYPER JUMP', shield: 'Start Shield', escape: 'Sky Escape', turbo: 'Turbo Start', magnet: 'Coin Magnet', double: '×2 Coins', life: 'Extra Life' };
  for (const [k, n] of Object.entries(r.items ?? {})) if (n) parts.push(`${names[k as ItemKey]} ×${n}`);
  return parts.join(' + ');
};
