/** v4 3D car motion helpers: frame-rate independent, spoiler deploys with nitro and retracts after. */
declare const process: { exit(code: number): never };
import { approach, ease, spoilerStep, wheelStep } from '../src/render/car/carMotion.ts';
import { RENDER } from '../src/config.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

// frame-rate independence: 1 s of smoothing at 30, 60 and 144 fps lands on the same value
const run = (fps: number) => {
  let v = 0;
  for (let i = 0; i < fps; i++) v = approach(v, 1, 5, 2, 1 / fps);
  return v;
};
check(Math.abs(run(30) - run(60)) < 1e-9 && Math.abs(run(60) - run(144)) < 1e-9, `approach(): same result at 30 / 60 / 144 fps (${run(60).toFixed(6)})`);
check(ease(-1) === 0 && ease(2) === 1 && ease(0.5) === 0.5, 'ease(): clamped smoothstep');

// spoiler: nitro on for 1.5 s, then off
let k = 0;
const dt = 1 / 60;
const trace: number[] = [];
for (let i = 0; i < 90; i++) trace.push((k = spoilerStep(k, 1, dt, RENDER.spoilerUp, RENDER.spoilerDown)));
const up = k;
for (let i = 0; i < 180; i++) trace.push((k = spoilerStep(k, 0, dt, RENDER.spoilerUp, RENDER.spoilerDown)));
check(up > 0.99, `spoiler fully raised during nitro (k ${up.toFixed(3)} after 1.5 s)`);
check(k < 0.02, `spoiler retracts after nitro ends (k ${k.toFixed(3)} after 3 s)`);
let mono = true;
for (let i = 1; i < 90; i++) if (trace[i] < trace[i - 1]) mono = false;
for (let i = 91; i < trace.length; i++) if (trace[i] > trace[i - 1]) mono = false;
check(mono, 'spoiler moves monotonically (no bounce, no flicker)');
const maxStep = Math.max(...trace.slice(1).map((v, i) => Math.abs(v - trace[i])));
check(maxStep * RENDER.spoilerAngle < 0.03, `smooth deployment: ≤ ${(maxStep * RENDER.spoilerAngle).toFixed(4)} rad per frame`);
check(spoilerStep(0.5, 0.01, dt) < 0.5 && spoilerStep(0.5, 0.2, dt) > 0.5, 'a faint boost tail does not hold the spoiler up');
check(RENDER.spoilerAngle > 0.1 && RENDER.spoilerAngle < 0.35, `spoiler range is subtle (${RENDER.spoilerAngle} rad max)`);

// wheels: real speed / radius, capped against strobing
check(Math.abs(wheelStep(10, 0.28, dt, 1) - 10 / 0.28 / 60) < 1e-12, 'wheelStep(): speed / radius per frame');
check(wheelStep(69, 0.28, dt, RENDER.wheelMaxStep) === RENDER.wheelMaxStep, `wheelStep(): capped at ${RENDER.wheelMaxStep} rad / frame at top speed`);
check(RENDER.wheelMaxStep < Math.PI / 10, 'cap below half a spoke gap (10 spokes) → never rolls backwards');
check(wheelStep(-5, 0.28, dt, 1) === 0, 'wheelStep(): never negative');

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
