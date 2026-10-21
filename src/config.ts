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
 * Speed levels. Harder = faster AND better paid (tiered rewards):
 *  `reward` multiplies the coin bonus, the track reward and the rank X-Points of a run.
 */
export const LEVELS: Record<SpeedLevel, { label: string; speed: number; gap: number; score: number; reward: number; desc: string }> = {
  easy: { label: 'EASY', speed: 0.78, gap: 1.2, score: 0.8, reward: 1, desc: 'Slower road, more time to react' },
  normal: { label: 'NORMAL', speed: 1, gap: 1, score: 1, reward: 1.25, desc: 'Regular speed · coins & stars ×1.25' },
  hard: { label: 'HARD', speed: 1.18, gap: 0.92, score: 1.3, reward: 1.6, desc: 'Fast & tight · score ×1.3 · coins & stars ×1.6' },
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
  spriteX: 0.36,
  spriteY: -0.47,
  /** grit kicked up by the rear tyres while driving fast */
  sprayFrom: 22,
  sprayRate: 28, // particles / s per tyre at full speed
  spraySize: 0.07,
  sprayLife: 0.3,
  sprayColor: 0xb9c6e6,
  /** spoked rims over the rear tyres: count, wheel radius (m), max spin step per frame (× spoke gap) */
  spokes: 24,
  radius: 0.36,
  rimMaxStep: 0.45,
  /** rim disc placement on the sprite plane (centre = 0), diameter in metres, horizontal squash */
  rimX: 0.41,
  rimY: -0.3,
  rimD: 0.42,
  rimSquash: 0.42,
  /** 'streaks' = hot glowing tyres with light trails orbiting them (owner's reference); 'spokes' = spoked rims */
  style: 'streaks' as 'streaks' | 'spokes',
  /** speed (m/s) where the hot-tyre glow starts / is full */
  hotFrom: 14,
  hotFull: 40,
  /** orbit trail speed relative to the wheel's real spin */
  orbitSpeed: 0.35,
  /** orbit glow placement on the sprite plane, diameter (m), horizontal squash */
  glowX: 0.42,
  glowY: -0.3,
  glowD: 0.62,
  glowSquash: 0.5,
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
