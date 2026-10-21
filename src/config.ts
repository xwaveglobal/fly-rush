/**
 * Central gameplay tuning. Everything that affects feel or fairness lives here so
 * the spawner's fairness model and the player controller always agree.
 */
export const LANES = [-2.6, 0, 2.6] as const;
export const LANE_WIDTH = 2.6;

/** Car centre heights for the three vertical states. */
export const HEIGHT = {
  LOW: 0.48,
  NORMAL: 1.0,
  HIGH: 3.05,
  /** Roadster Jump apex */
  SUPER: 5.6,
  /** Mythic HYPER JUMP apex (event prize / shop item) */
  HYPER: 7.4,
  /** SKY ESCAPE (emergency item) cruising height */
  ESCAPE: 9.6,
} as const;

/** Car hitbox half-extents (already slightly forgiving vs. the visual model). */
export const CAR_HALF = { x: 0.7, y: 0.36, z: 1.0 } as const;
/** In the LOW state the car is compressed, so its hitbox is shorter. */
export const CAR_HALF_Y_LOW = 0.28;

export const TIMING = {
  laneChange: 0.22, // seconds to slide one lane (ease-in-out: smooth start and stop)
  laneBuffer: 0.12, // queued lane input lifetime
  // FLY UP phases
  upAntic: 0.06,
  upExec: 0.2,
  upHold: 0.52,
  upRecover: 0.3,
  // FLY DOWN phases
  downAntic: 0.05,
  downExec: 0.14,
  downHold: 0.52,
  downRecover: 0.24,
  verticalBuffer: 0.16,
  /** an UP swipe made just before touching down is kept this long and fires on landing */
  landBuffer: 0.34,
  jumpRest: 0.03, // seconds on the ground after landing before the next jump
  // ROADSTER JUMP (power-up): a rocket hop over two beats with a 360° roll
  superAntic: 0.1,
  superExec: 0.36,
  superHold: 1.0,
  superRecover: 0.5,
  // HYPER JUMP (mythic item): higher, longer, double roll, golden trail
  hyperExec: 0.42,
  hyperHold: 1.7,
  hyperRecover: 0.55,
  // SKY ESCAPE: straight up, cruise above everything, slow glide down
  escExec: 0.7,
  escHold: 3.2,
  escRecover: 2.1,
  // AIR DASH: 2-lane hop sideways while airborne, with a flip
  dashDur: 0.34,
};

/** Player speed levels chosen on the home screen (3 audiences: new, regular, expert). */
export type SpeedLevel = 'easy' | 'normal' | 'hard';

/**
 * v2 EXP (docs/GAME-DESIGN.md §1). Run EXP = metres × rate[level]; the player's EXP = best run (never summed).
 * Rates are calibrated (tests/exp.test.ts) so a non-stop run reaches C / B / A / AA / AAA at
 * 3 / 7 / 12 / 20 / 30 min on HARD, ×2 that time on NORMAL and ×3 on EASY.
 */
export const EXP = {
  rate: { easy: 0.2, normal: 0.23, hard: 0.4 } as Record<SpeedLevel, number>,
  /** EXP needed for each rank */
  rank: { D: 0, C: 3000, B: 8000, A: 15000, AA: 26000, AAA: 40000, S: 65000, SS: 85000, SSS: 110000 },
  /** design targets (minutes of non-stop HARD; S tiers on Track 2) — shown in the rank guide, checked by the test */
  hardMinutes: { D: 0, C: 3, B: 7, A: 12, AA: 20, AAA: 30, S: 35, SS: 45, SSS: 58 },
  /** Track 2 (unlocks at AAA): starts two difficulty phases ahead, pays more EXP and is the only road to S / SS / SSS */
  track2: { rateMul: 1.25, phaseShift: 2, sSpeedStep: 0.03 },
  timeMul: { easy: 3, normal: 2, hard: 1 } as Record<SpeedLevel, number>,
};
/**
 * Speed levels. Harder = faster AND better paid (tiered rewards):
 *  `reward` multiplies the coin bonus, the track reward and the rank X-Points of a run.
 */
export const LEVELS: Record<SpeedLevel, { label: string; speed: number; gap: number; score: number; reward: number; desc: string }> = {
  easy: { label: 'EASY', speed: 0.78, gap: 1.2, score: 0.8, reward: 1, desc: 'Slower road · EXP ×1 (ranks take 3× longer)' },
  normal: { label: 'NORMAL', speed: 1, gap: 1, score: 1, reward: 1.25, desc: 'Regular speed · EXP ×1.15 · coins ×1.25' },
  hard: { label: 'HARD', speed: 1.18, gap: 0.92, score: 1.3, reward: 1.6, desc: 'Fast & tight · EXP ×2 · coins ×1.6' },
};

/** big-reward tracks also pay items when finished with enough stars (all matching rules apply) */
export const TRACK_ITEM_BONUS: { minReward: number; stars: number; items: Partial<Record<'super' | 'hyper' | 'escape' | 'shield', number>> }[] = [
  { minReward: 500, stars: 2, items: { super: 1 } },
  { minReward: 800, stars: 2, items: { escape: 1 } },
  { minReward: 900, stars: 3, items: { hyper: 1 } },
  { minReward: 1200, stars: 3, items: { shield: 1 } },
];

/** points per unused boost charge still held when a track is finished (× the run's score multiplier) */
export const LEFTOVER_POINTS = { super: 1500, hyper: 3000, escape: 1000 };

/**
 * Rolling tyres (rear render) + tyre spray. The tread may advance at most `maxStep` of a block per
 * frame (< 0.5 or it strobes backwards); higher speed reads through blur, streaks and spray instead.
 */
export const TYRE = {
  blocksPerMetre: 0.55,
  streaksPerMetre: 0.14,
  maxStep: 0.36,
  /** speed (m/s) where the extra blur starts / is full */
  blurFrom: 18,
  blurFull: 50,
  /** rear tyre contact point on the sprite plane (plane units, centre = 0) */
  spriteX: 0.43,
  spriteY: -0.48,
  /** grit kicked up by the rear tyres while driving fast */
  sprayFrom: 22,
  sprayRate: 0, // tyre grit off: no smoke / dust on the tyres (owner's brief)
  spraySize: 0.07,
  sprayLife: 0.3,
  sprayColor: 0xb9c6e6,
  /** wheel radius (m) — drives how fast the light trails circle the tyres */
  radius: 0.36,
  /** rear tyres on the X1 rear render (uv): x < maskX (and > 1 − maskX), y < maskY */
  maskX: 0.17,
  maskY: 0.5,
  /** rear tread layer: tread rect on the render (uv x), image height px, tile height px / metres */
  treadX0: 14 / 1024,
  treadX1: 136 / 1024,
  treadImgH: 588,
  treadTilePx: 120,
  treadTileM: 0.33,
  /** max tread scroll per frame (fraction of a tile) — more would strobe */
  treadMaxStep: 0.4,
  treadGain: 1.0,
  /** blur length (fraction of a tile) per speed tier, km/h: idle → run → fast → very fast */
  treadTiers: [
    { kmh: 0, blur: 0 },
    { kmh: 60, blur: 0.06 },
    { kmh: 150, blur: 0.22 },
    { kmh: 250, blur: 0.45 },
    { kmh: 400, blur: 0.7 },
  ],
  /** extra blur while Turbo runs */
  treadTurboBlur: 0.3,
  /** body suspension spring (metres; ~0.009 m ≈ 1 px on a phone) */
  susp: { k: 260, damp: 16, max: 0.03, bumpEvery: 0.35, bumpKick: 0.16, laneKick: 0.22, landKick: 0.55, pitchK: 0.0016, pitchMax: 0.012 },
  /** tyre effects (tread motion, hot streaks, orbit trails, sparks). Off = tyres look exactly like the render */
  effects: false,
  /** speed (m/s) where the hot-tyre glow starts / is full */
  hotFrom: 14,
  hotFull: 40,
  /** orbit trail speed relative to the wheel's real spin */
  orbitSpeed: 0.35,
  /** orbit glow placement on the sprite plane, diameter (m), horizontal squash */
  glowX: 0.43,
  glowY: -0.26,
  glowD: 0.66,
  glowSquash: 0.5,
  /** boost render height relative to the normal rear render (same width, same top edge) */
  boostImgH: 954 / 740,
  /** boost look envelope rates (1/s): attack when it starts, release when it ends */
  boostAttack: 9,
  boostRelease: 3,
  /** at speed the tyre spray turns into orange sparks */
  sparkColor: 0xff8a2a,
};

export const SPEED = {
  start: 21,
  max: 46,
  /** distance (m) at which ~63% of the extra speed has been added */
  rampDistance: 3200,
  turboMul: 1.55,
};

/**
 * Fairness model. A "row" is a set of obstacles the car reaches at the same moment.
 * The spawner only accepts a row if, from at least one lane the player could be in at
 * the previous row, a lane of the new row is reachable in the available time.
 */
export const FAIRNESS = {
  /** time budget per lane step (slightly more than TIMING.laneChange for human reaction) */
  laneStepTime: 0.27,
  /** time needed to reach HIGH / LOW from NORMAL including anticipation */
  verticalTime: 0.3,
  /** minimum reaction time to any row (seconds) */
  minRowTime: 0.5,
};

export const SCORE = {
  perMeter: 1,
  coin: 10,
  nearMiss: 50,
  ringPass: 100,
  dodge: 5,
  comboStep: 10, // every N dodges the multiplier grows by 0.5
  comboMax: 4,
};

export const POWERUP_DURATION = {
  shield: 0, // shield lasts until hit (upgrades add a timed safety bubble after break)
  magnet: 8,
  turbo: 4,
  double: 10,
};

export const WORLD_LENGTH = 1000; // metres per themed world

export const DEBUG = typeof location !== 'undefined' && /[?&]debug/.test(location.search);
export const AUTOPILOT = typeof location !== 'undefined' && /[?&]autopilot/.test(location.search);
