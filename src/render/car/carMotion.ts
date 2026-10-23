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
