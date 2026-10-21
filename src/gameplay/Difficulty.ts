import type { PatternKey } from './Courses.ts';
import type { WorldId } from './Spawner.ts';
import type { SpeedLevel } from '../config.ts';

/**
 * OBSTACLE DIFFICULTY SYSTEM
 *
 * Every spawner pattern is a curated library entry with a tier, the actions it asks
 * for and its spacing needs. Each world (map) has a MapDifficultyConfig that decides
 * which patterns exist there and in what tier mix; the spawner picks a tier first
 * (by the map's distribution, shifted by progress through the map) and then a pattern
 * of that tier. All rows still pass the time-aware reachability validator (Fairness.ts).
 */

export type Tier = 1 | 2 | 3 | 4;
export const TIER_WEIGHT: Record<Tier, number> = { 1: 1, 2: 2, 3: 4, 4: 7 };
export const TIER_NAME: Record<Tier, string> = { 1: 'EASY', 2: 'NORMAL', 3: 'HARD', 4: 'EXPERT' };

export type Act = 'left' | 'right' | 'up' | 'down' | 'none';

export interface PatternDef {
  key: PatternKey;
  id: string;
  name: string;
  tier: Tier;
  /** actions that solve it (any one of them) */
  actions: Act[];
  /** minimum seconds since the previous row */
  minGap: number;
  /** recovery seconds required after it (on top of the normal gap) */
  recovery: number;
  /** hides what is behind it (tall wall / full-width) → never followed by a trap */
  occludes: boolean;
  /** worlds where it may appear */
  worlds: WorldId[];
}

const ALL: WorldId[] = ['city', 'cloud', 'tunnel', 'space', 'mega'];

export const PATTERNS: Record<PatternKey, PatternDef> = {
  crate: { key: 'crate', id: 'P01', name: 'Single blocker · 2 safe lanes', tier: 1, actions: ['left', 'right', 'up'], minGap: 0, recovery: 0, occludes: false, worlds: ['city', 'cloud', 'tunnel', 'space', 'mega'] },
  barrier: { key: 'barrier', id: 'P03', name: 'Low barrier · fly up or switch', tier: 1, actions: ['up', 'left', 'right'], minGap: 0, recovery: 0, occludes: false, worlds: ALL },
  ring: { key: 'ring', id: 'P06', name: 'Energy ring · coin route', tier: 1, actions: ['none'], minGap: 0, recovery: 0, occludes: false, worlds: ALL },
  asteroid: { key: 'asteroid', id: 'P11', name: 'Asteroid · switch lane', tier: 1, actions: ['left', 'right'], minGap: 0, recovery: 0, occludes: false, worlds: ['space'] },
  beam: { key: 'beam', id: 'P04', name: 'Overhead beam · fly down', tier: 2, actions: ['down', 'left', 'right'], minGap: 0, recovery: 0, occludes: false, worlds: ALL },
  low2: { key: 'low2', id: 'P02', name: 'Two blockers · 1 safe lane', tier: 2, actions: ['left', 'right', 'up'], minGap: 0.75, recovery: 0, occludes: false, worlds: ALL },
  traffic: { key: 'traffic', id: 'P12', name: 'Oncoming vehicle', tier: 2, actions: ['left', 'right'], minGap: 0.75, recovery: 0, occludes: false, worlds: ['city', 'cloud', 'space', 'mega'] },
  trafficMix: { key: 'trafficMix', id: 'P13', name: 'Vehicle + blocker', tier: 2, actions: ['left', 'right', 'up', 'down'], minGap: 0.8, recovery: 0.15, occludes: false, worlds: ['city', 'mega'] },
  crateBeam: { key: 'crateBeam', id: 'P05', name: 'Alternating blockers', tier: 2, actions: ['left', 'right', 'up', 'down'], minGap: 0.75, recovery: 0, occludes: false, worlds: ALL },
  asteroid2: { key: 'asteroid2', id: 'P14', name: 'Two asteroids · 1 safe lane', tier: 2, actions: ['left', 'right'], minGap: 0.8, recovery: 0.1, occludes: false, worlds: ['space'] },
  drone: { key: 'drone', id: 'P07', name: 'Moving drone · predictable sweep', tier: 2, actions: ['left', 'right', 'up'], minGap: 0.8, recovery: 0.1, occludes: false, worlds: [] }, // drone removed from the game (no spawns)
  platform: { key: 'platform', id: 'P15', name: 'Sliding platform', tier: 3, actions: ['up', 'left', 'right'], minGap: 0.95, recovery: 0.3, occludes: false, worlds: ['cloud', 'space', 'mega'] },
  wall3: { key: 'wall3', id: 'P09', name: 'Triple wall · jump/duck + recovery', tier: 3, actions: ['up', 'down'], minGap: 1.0, recovery: 0.45, occludes: false, worlds: [] }, // removed: a triple wall forced a jump/duck in every lane — too punishing
  laser: { key: 'laser', id: 'P08', name: 'Laser gate · highlighted opening', tier: 3, actions: ['up', 'down', 'left', 'right'], minGap: 1.0, recovery: 0.45, occludes: false, worlds: ['tunnel', 'space', 'mega'] },
  gate: { key: 'gate', id: 'P10', name: 'Mega gate · one door (expert)', tier: 4, actions: ['left', 'right'], minGap: 1.35, recovery: 0.9, occludes: true, worlds: ['space', 'mega'] },
};

export interface MapDifficultyConfig {
  world: WorldId;
  /** 1–10 */
  target: number;
  /** probability of each tier (sums to 1) */
  tiers: [number, number, number, number];
  /** at most this many lanes fully blocked (no height passes) in one row */
  maxBlockers: number;
  /** minimum seconds between rows (scaled by speed level) */
  minGap: number;
  /** reaction-time slack the validator must leave on every forced move (s) */
  slack: number;
  /** max tier-3+ rows in a row */
  maxConsecutiveHard: number;
  /** extra recovery seconds after tier 3 / tier 4 rows */
  recovery: number;
  /** obstacle density 0..1 (chance a row slot is used) */
  density: number;
  /** sweep speed multiplier for moving obstacles */
  movingSpeed: number;
  /** metres at the start of the map that only use tier 1–2 */
  warmup: number;
}

/** Initial balancing targets (tune through playtesting). */
export const MAPS: Record<WorldId, MapDifficultyConfig> = {
  city: { world: 'city', target: 2, tiers: [0.8, 0.2, 0, 0], maxBlockers: 1, minGap: 1.2, slack: 0.26, maxConsecutiveHard: 0, recovery: 0.5, density: 0.92, movingSpeed: 0.7, warmup: 250 },
  cloud: { world: 'cloud', target: 4, tiers: [0.62, 0.35, 0.03, 0], maxBlockers: 2, minGap: 1.08, slack: 0.22, maxConsecutiveHard: 1, recovery: 0.5, density: 0.95, movingSpeed: 0.8, warmup: 200 },
  tunnel: { world: 'tunnel', target: 5, tiers: [0.42, 0.43, 0.15, 0], maxBlockers: 2, minGap: 0.98, slack: 0.19, maxConsecutiveHard: 1, recovery: 0.45, density: 1, movingSpeed: 0.9, warmup: 150 },
  space: { world: 'space', target: 7, tiers: [0.3, 0.42, 0.23, 0.05], maxBlockers: 2, minGap: 0.9, slack: 0.15, maxConsecutiveHard: 2, recovery: 0.4, density: 1, movingSpeed: 1, warmup: 120 },
  mega: { world: 'mega', target: 8, tiers: [0.2, 0.37, 0.33, 0.1], maxBlockers: 2, minGap: 0.84, slack: 0.13, maxConsecutiveHard: 2, recovery: 0.4, density: 1, movingSpeed: 1.1, warmup: 120 },
};

/** Speed-level multipliers on the reaction rules (EASY gets more time, HARD less). */
export const LEVEL_RULES: Record<SpeedLevel, { gap: number; slack: number; tierShift: number }> = {
  easy: { gap: 1.18, slack: 0.12, tierShift: -1 },
  normal: { gap: 1, slack: 0, tierShift: 0 },
  hard: { gap: 0.92, slack: -0.04, tierShift: 1 },
};

/**
 * Tier probabilities at a point of the map:
 *  START (first 30 %): tier 3/4 damped, easy boosted — introduce mechanics
 *  MIDDLE: the map's distribution
 *  END (last 25 %): tier 3/4 slightly boosted — a final exciting stretch
 * `levelShift` (−1 easy / +1 hard) nudges the mix one step.
 */
export function tierWeights(cfg: MapDifficultyConfig, progress: number, inWarmup: boolean, levelShift: number): number[] {
  const w = [...cfg.tiers];
  // compensate for the recovery rules (a hard row is usually followed by an easier one),
  // so the observed mix lands near the map's target distribution
  const hard = cfg.tiers[2] + cfg.tiers[3];
  const comp = 1 / Math.max(0.35, 1 - hard * 0.85);
  w[2] *= comp;
  w[3] *= comp;
  if (inWarmup) {
    w[2] = 0;
    w[3] = 0;
  } else if (progress < 0.3) {
    w[0] *= 1.3;
    w[2] *= 0.45;
    w[3] *= 0.25;
  } else if (progress > 0.75) {
    w[2] *= 1.25;
    w[3] *= 1.3;
  }
  if (levelShift < 0) {
    w[0] *= 1.35;
    w[2] *= 0.6;
    w[3] *= 0.4;
  } else if (levelShift > 0) {
    w[0] *= 0.8;
    w[2] *= 1.25;
    w[3] *= 1.25;
  }
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => x / sum);
}

export const patternOf = (k: PatternKey) => PATTERNS[k];
