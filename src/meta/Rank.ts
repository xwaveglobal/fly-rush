/**
 * RANK CLASSES & X-POINTS (internally "bolts")
 *
 * Bolts are the ranking currency. Every pilot starts in class D; collecting bolts
 * promotes D → C → B → A → AA → AAA. Bolts are never lost (no demotion), so progress
 * always feels earned; a seasonal soft reset can be added later.
 *
 * How bolts are earned (recommended economy, tuned so class A takes ~2 weeks of daily play):
 *  - in every run: +1 ⚡ per 1,000 score, +1 ⚡ per 10 near misses
 *  - finishing a track: +2 ⚡ (+1 per star)
 *  - Cup races: run bolts ×2 while racing in your live cup
 *  - Cup results: placement bolts × division multiplier (see CUP_BOLTS / DIV_MULT)
 *  - (never purchasable: no shop item, pass or ad grants X-Points)
 */
export const CLASSES = ['D', 'C', 'B', 'A', 'AA', 'AAA'] as const;
export type RankClass = (typeof CLASSES)[number];

/** bolts needed to reach each class */
export const CLASS_MIN: Record<RankClass, number> = { D: 0, C: 150, B: 450, A: 1100, AA: 2400, AAA: 4800 };
export const CLASS_COLOR: Record<RankClass, string> = { D: '#9fb3dd', C: '#2fd36b', B: '#4fc3ff', A: '#9b6bff', AA: '#ffc21a', AAA: '#ff4fd8' };

export function classFor(bolts: number): RankClass {
  let c: RankClass = 'D';
  for (const k of CLASSES) if (bolts >= CLASS_MIN[k]) c = k;
  return c;
}

export function classProgress(bolts: number) {
  const c = classFor(bolts);
  const i = CLASSES.indexOf(c);
  const next = CLASSES[i + 1] ?? null;
  const from = CLASS_MIN[c];
  const to = next ? CLASS_MIN[next] : from;
  return { cls: c, next, k: next ? (bolts - from) / (to - from) : 1, need: next ? to - bolts : 0 };
}

/** sample rivals: class from their best score (keeps the ladder believable) */
export function classForScore(score: number): RankClass {
  if (score >= 40000) return 'AAA';
  if (score >= 26000) return 'AA';
  if (score >= 14000) return 'A';
  if (score >= 6000) return 'B';
  if (score >= 2000) return 'C';
  return 'D';
}

/** bolts earned by a run (before cup ×2 / finish bonus) */
export const runBolts = (score: number, nearMiss: number) => Math.floor(score / 1000) + Math.floor(nearMiss / 10);

/**
 * X-POINTS (shown with the XWAVE "X" badge) — the only way to climb classes.
 * They can NOT be bought: no shop product, ad or pass grants them. Earned only by racing.
 */
export const XP_RULES: { what: string; gain: string }[] = [
  { what: 'Every 1,000 score in a run', gain: '+1' },
  { what: 'Every 10 near misses', gain: '+1' },
  { what: 'Finish a track', gain: '+2' },
  { what: 'Each star on that finish', gain: '+1' },
  { what: 'Racing your live cup track', gain: '×2 run points' },
  { what: 'Speed level: EASY / NORMAL / HARD', gain: '×1 / ×1.25 / ×1.6' },
  { what: 'Cup final rank (×class multiplier)', gain: '+12 … +300' },
];

export interface XpGain {
  score: number;
  near: number;
  finish: number;
  stars: number;
  cupMul: number;
  /** speed-level reward tier (EASY ×1 · NORMAL ×1.25 · HARD ×1.6) */
  levelMul: number;
  total: number;
}

export function xpForRun(score: number, near: number, finished: boolean, stars: number, inCup: boolean, levelMul = 1): XpGain {
  const s = Math.floor(score / 1000);
  const n = Math.floor(near / 10);
  const mul = inCup ? 2 : 1;
  const finish = finished ? 2 : 0;
  const st = finished ? stars : 0;
  return { score: s, near: n, finish, stars: st, cupMul: mul, levelMul, total: Math.round(((s + n) * mul + finish + st) * levelMul) };
}

/** the rank-star badge (inline SVG) */
export const XPT = `<svg viewBox="0 0 24 24" class="xpt" aria-label="Rank stars"><path d="M12 1.8l3.05 6.3 6.9.95-5.03 4.83 1.24 6.86L12 17.47l-6.16 3.27 1.24-6.86L2.05 9.05l6.9-.95z" fill="#ffc21a" stroke="#8a5a00" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 5.2l1.9 3.95" stroke="#fff6c8" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;

/** small class badge (hex plate with the letters) */
export function classBadge(c: RankClass, size = 'sm') {
  return `<span class="clsb ${size}" style="--cc:${CLASS_COLOR[c]}">${c}</span>`;
}
