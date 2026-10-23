/**
 * Pure, allocation-free motion helpers for the 3D car (no Three.js, no DOM — unit-tested in Node).
 * Every smoothing step is exact exponential decay, so the result after a given time does not
 * depend on the frame rate.
 */

/** move `cur` toward `target`; rate (1/s) differs for rising and falling */
export function approach(cur: number, target: number, rateUp: number, rateDown: number, dt: number) {
  const rate = target > cur ? rateUp : rateDown;
  return target + (cur - target) * Math.exp(-rate * dt);
}

/** smoothstep easing of a 0..1 value */
export function ease(k: number) {
  const t = k < 0 ? 0 : k > 1 ? 1 : k;
  return t * t * (3 - 2 * t);
}

/** active spoiler: 0 = flush, 1 = fully raised. Raised while nitro runs, retracts after it ends */
export function spoilerStep(k: number, nitro: number, dt: number, up = 5, down = 2.2, threshold = 0.05) {
  return approach(k, nitro > threshold ? 1 : 0, up, down, dt);
}

/** visible wheel rotation this frame (rad): road speed / radius, capped so 10 spokes never strobe */
export function wheelStep(speed: number, radius: number, dt: number, maxStep: number) {
  return Math.min((Math.max(0, speed) * dt) / radius, maxStep);
}

/** spoiler controller state (mutated in place — no per-frame allocation) */
export interface SpoilerState {
  /** 0 = flush … 1 = fully raised */
  k: number;
  /** seconds the spoiler stays up after jump and nitro both ended */
  hold: number;
}

/**
 * v4.1.2 active spoiler: open while the car is jumping (take-off → airborne → touch-down, from the
 * gameplay jump state) or nitro is running; once both have ended it holds `holdTime` before
 * retracting, so landing and short gaps between effects never make it flicker.
 */
export function spoilerUpdate(s: SpoilerState, jumping: boolean, nitro: number, dt: number, up = 5, down = 2.2, holdTime = 0.25, threshold = 0.05) {
  const open = jumping || nitro > threshold;
  s.hold = open ? holdTime : Math.max(0, s.hold - dt);
  s.k = approach(s.k, open || s.hold > 0 ? 1 : 0, up, down, dt);
  return s.k;
}
