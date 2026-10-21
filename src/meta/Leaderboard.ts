/**
 * Leaderboards with a built-in SAMPLE field of rival pilots.
 *
 * Until a backend exists, rival rows are generated deterministically from a seed
 * (same for every player on the same week / event), and the local player's real
 * best score is ranked against them. Replace `sampleBoard()` with a fetch to your
 * leaderboard service to go live — the UI only needs `Board`.
 */

export interface LbRow {
  rank: number;
  name: string;
  flag: string;
  score: number;
  color: string;
  /** avatar index */
  av?: number;
  you?: boolean;
  pass?: boolean;
}

export interface Board {
  rows: LbRow[];
  /** total pilots on this board */
  total: number;
  you: LbRow;
  /** score needed for the next milestone rank (null at #1) */
  next: { rank: number; score: number } | null;
}

const NAMES = [
  'NeoDrift', 'SkyKnight', 'ZeroGrav', 'AeroViper', 'Hyperion', 'Lumen', 'VoltRider', 'NovaX', 'Kairo', 'StratoAce',
  'TurboMinh', 'LinhSky', 'DuyPro', 'KhanhRacer', 'HuyNeon', 'TrangFly', 'Bao_GT', 'QuanXwave', 'AnhTuan99', 'MaiBlue',
  'Sakura_Jet', 'Ryu', 'KenjiDrive', 'Haruto', 'YukiWave', 'MinSeo', 'JiHoon', 'Taeyang', 'ChenLong', 'WeiSpeed',
  'Aria', 'Leon', 'Mateo', 'Sofia_R', 'Lucas.V', 'Emma_GT', 'Noah', 'Mia', 'Elias', 'Zoe',
  'RaviBoost', 'Arjun', 'Priya', 'Dimas', 'Putri', 'Rizky', 'Somchai', 'Nattapong', 'Marco', 'Giulia',
  'Pedro', 'Camila', 'Joao', 'Ivan', 'Olga', 'Dmitri', 'Lena', 'Felix', 'Hugo', 'Chloe',
  'PixelPilot', 'GhostLap', 'Overclock', 'RedLine', 'ApexHunter', 'Quantum', 'Comet', 'Zenith', 'Orbit', 'Flux',
  'Blaze', 'Vortex', 'Echo', 'Nitro', 'Rogue', 'Spectre', 'Titan', 'Raven', 'Cyrus', 'Atlas',
];
const FLAGS = ['🇻🇳', '🇻🇳', '🇻🇳', '🇺🇸', '🇯🇵', '🇰🇷', '🇹🇭', '🇮🇩', '🇵🇭', '🇧🇷', '🇩🇪', '🇫🇷', '🇬🇧', '🇮🇳', '🇸🇬', '🇲🇾', '🇪🇸', '🇮🇹', '🇨🇦', '🇦🇺'];
const COLORS = ['#4fc3ff', '#9b6bff', '#ffc21a', '#2fd36b', '#ff4fd8', '#ff7a5c', '#5ee6ff', '#b6ff2e'];

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const avatarColor = (seed: number) => COLORS[seed % COLORS.length];

/**
 * Score curve of a board: score(rank) = top · (rank)^-k. Generated rows follow
 * the curve with jitter; ranks below the materialised rows come from inverting it.
 */
interface Curve {
  top: number;
  k: number;
  total: number;
}
const scoreAt = (c: Curve, r: number) => c.top * Math.pow(r, -c.k);
const rankFor = (c: Curve, s: number) => Math.min(c.total, Math.max(1, Math.round(Math.pow(c.top / Math.max(1, s), 1 / c.k))));

export function sampleBoard(seedKey: string, curve: Curve, rows = 100): Omit<LbRow, 'rank'>[] {
  const r = rng(hashStr(seedKey));
  const used = new Set<string>();
  const out: Omit<LbRow, 'rank'>[] = [];
  for (let i = 1; i <= rows; i++) {
    let name = NAMES[Math.floor(r() * NAMES.length)];
    if (used.has(name)) name = `${name}${Math.floor(r() * 90 + 10)}`;
    used.add(name);
    const jitter = 1 + (r() - 0.5) * 0.06;
    out.push({
      name,
      flag: FLAGS[Math.floor(r() * FLAGS.length)],
      score: Math.round(scoreAt(curve, i) * jitter),
      color: COLORS[Math.floor(r() * COLORS.length)],
      pass: r() < 0.12,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

const MILESTONES = [1, 3, 10, 50, 100, 500, 1000, 5000, 10000];

export function rankBoard(sample: Omit<LbRow, 'rank'>[], curve: Curve, you: { name: string; score: number; color: string; pass?: boolean; av?: number }): Board {
  const all = sample.map((r) => ({ ...r }));
  let yourRank: number;
  const idx = all.findIndex((r) => you.score > r.score);
  if (idx >= 0) yourRank = idx + 1;
  else yourRank = you.score > 0 ? Math.max(all.length + 1, rankFor(curve, you.score)) : curve.total;
  const me: LbRow = { rank: yourRank, name: you.name, flag: '⭐', score: you.score, color: you.color, you: true, pass: you.pass, av: you.av };
  const rows: LbRow[] = all.map((r, i) => ({ ...r, rank: i + 1 + (idx >= 0 && i >= idx ? 1 : 0) }));
  if (idx >= 0) rows.splice(idx, 0, me);
  const target = [...MILESTONES].reverse().find((m) => m < yourRank);
  const next = target ? { rank: target, score: (rows.find((r) => r.rank === target && !r.you)?.score ?? Math.round(scoreAt(curve, target))) + 1 } : null;
  return { rows: rows.slice(0, 100), total: Math.max(curve.total, yourRank), you: me, next };
}

/** Fraction of the current week elapsed (Monday 00:00 → Sunday 24:00). */
export function weekProgress(now = new Date()) {
  const d = (now.getDay() + 6) % 7;
  return (d * 24 + now.getHours() + now.getMinutes() / 60) / (7 * 24);
}

export function allTimeBoard(you: { name: string; score: number; color: string; pass?: boolean; av?: number }): Board {
  const curve: Curve = { top: 61850, k: 0.27, total: 248_316 };
  return rankBoard(sampleBoard('xwave-all-time-v1', curve), curve, you);
}

export function weeklyBoard(week: string, you: { name: string; score: number; color: string; pass?: boolean; av?: number }, now = new Date()): Board {
  // rivals keep playing through the week: scores and field size grow over time
  const f = 0.35 + 0.65 * Math.min(1, weekProgress(now) * 1.4);
  const curve: Curve = { top: 38400 * f, k: 0.31, total: Math.round(9000 + 31000 * f) };
  return rankBoard(sampleBoard(`xwave-week-${week}`, curve), curve, you);
}
