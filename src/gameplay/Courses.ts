import type { WorldId } from './Spawner.ts';

/** Pattern ids the spawner knows (see Spawner.choosePattern). */
export type PatternKey =
  | 'crate' | 'barrier' | 'beam' | 'low2' | 'crateBeam' | 'wall3' | 'drone' | 'platform'
  | 'traffic' | 'trafficMix' | 'ring' | 'laser' | 'gate' | 'asteroid' | 'asteroid2';

export interface Section {
  name: string;
  from: number;
  to: number;
  /** multiplies pattern weights inside this section */
  bias?: Partial<Record<PatternKey, number>>;
  /** 0 = no obstacles (start / finish straights) */
  density?: number;
}

export interface Course {
  id: string;
  name: string;
  world: WorldId;
  /** metres from START to FINISH */
  length: number;
  /** difficulty offset in metres of "endless" progress (speed + pattern mix) */
  diffOffset: number;
  /** 1–5, shown on the card */
  difficulty: number;
  /** coins needed for the third star */
  coinTarget: number;
  /** coin reward for finishing */
  reward: number;
  sections: Section[];
}

/**
 * Track mode: fixed-length courses with a START and FINISH gate, each set in one
 * world. Track 1 follows the "Level 1 — Full Track" plan (9 sections, 3,200 m).
 * Endless mode is `null` — the original rotating-world run.
 */
export const COURSES: Course[] = [
  {
    id: 'future-city',
    name: 'Future City',
    world: 'city',
    length: 3200,
    diffOffset: 0,
    difficulty: 1,
    coinTarget: 120,
    reward: 300,
    sections: [
      { name: 'Start Area', from: 0, to: 200, density: 0.6, bias: { crate: 2, barrier: 1.5 } },
      { name: 'City Highway', from: 200, to: 600, bias: { traffic: 3, trafficMix: 2, crate: 1.2 } },
      { name: 'Obstacle Zone', from: 600, to: 1000, bias: { low2: 2.5, crateBeam: 2, beam: 1.5 } },
      { name: 'Ring Tunnel', from: 1000, to: 1400, bias: { ring: 5, beam: 1.5 } },
      { name: 'Sky Bridge', from: 1400, to: 1800, bias: { ring: 2.5, low2: 2 } },
      { name: 'Beam Alley', from: 1800, to: 2200, bias: { beam: 3, crateBeam: 2 } },
      { name: 'Jump Section', from: 2200, to: 2600, bias: { barrier: 3, crate: 2, low2: 3 } },
      { name: 'Traffic Weave', from: 2600, to: 3000, bias: { traffic: 3, trafficMix: 2.5 } },
      { name: 'Final Sprint', from: 3000, to: 3200, density: 0.8, bias: { traffic: 2, ring: 2 } },
    ],
  },
  {
    id: 'cloud-city',
    name: 'Cloud City',
    world: 'cloud',
    length: 2800,
    diffOffset: 700,
    difficulty: 2,
    coinTarget: 110,
    reward: 400,
    sections: [
      { name: 'Cloud Gate', from: 0, to: 300, density: 0.7 },
      { name: 'Floating Platforms', from: 300, to: 1100, bias: { platform: 4, crateBeam: 2 } },
      { name: 'Sky Bridges', from: 1100, to: 1900, bias: { ring: 3, beam: 2, low2: 2 } },
      { name: 'Platform Run', from: 1900, to: 2800, bias: { platform: 3, beam: 2, low2: 2 } },
    ],
  },
  {
    id: 'neon-tunnel',
    name: 'Neon Tunnel',
    world: 'tunnel',
    length: 2400,
    diffOffset: 1300,
    difficulty: 3,
    coinTarget: 100,
    reward: 350,
    sections: [
      { name: 'Tunnel Entry', from: 0, to: 300, density: 0.7, bias: { ring: 3 } },
      { name: 'Laser Corridor', from: 300, to: 1000, bias: { laser: 4, beam: 2 } },
      { name: 'Ring Run', from: 1000, to: 1600, bias: { ring: 5, barrier: 2 } },
      { name: 'Overdrive', from: 1600, to: 2400, bias: { laser: 3, wall3: 2, crateBeam: 2 } },
    ],
  },
  {
    id: 'space-zone',
    name: 'Space Zone',
    world: 'space',
    length: 3000,
    diffOffset: 1900,
    difficulty: 4,
    coinTarget: 120,
    reward: 450,
    sections: [
      { name: 'Launch', from: 0, to: 300, density: 0.7 },
      { name: 'Asteroid Belt', from: 300, to: 1300, bias: { asteroid: 3, asteroid2: 3 } },
      { name: 'Orbital Highway', from: 1300, to: 2200, bias: { traffic: 3, ring: 2 } },
      { name: 'Meteor Storm', from: 2200, to: 3000, bias: { asteroid2: 5, laser: 1.5 } },
    ],
  },
  {
    id: 'mega-city',
    name: 'XWAVE Megacity',
    world: 'mega',
    length: 3600,
    diffOffset: 2700,
    difficulty: 5,
    coinTarget: 140,
    reward: 600,
    sections: [
      { name: 'HQ Approach', from: 0, to: 400, density: 0.8, bias: { traffic: 2 } },
      { name: 'Rush Hour', from: 400, to: 1300, bias: { traffic: 3, trafficMix: 3 } },
      { name: 'Security Gates', from: 1300, to: 2300, bias: { gate: 6, laser: 3 } },
      { name: 'Tower Run', from: 2300, to: 3100, bias: { wall3: 3, beam: 2, crateBeam: 2 } },
      { name: 'XWAVE Finale', from: 3100, to: 3600, bias: { ring: 3, laser: 2, gate: 2 } },
    ],
  },
];

export const courseById = (id: string | null | undefined) => COURSES.find((c) => c.id === id) ?? null;

export const sectionAt = (c: Course, d: number) => c.sections.find((s) => d >= s.from && d < s.to) ?? c.sections[c.sections.length - 1];
