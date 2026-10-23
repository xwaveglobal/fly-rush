/** v4 3D car motion helpers: frame-rate independent, spoiler deploys with nitro and retracts after. */
declare const process: { exit(code: number): never };
import { approach, carHeight, ease, spoilerStep, spoilerUpdate, wheelStep, type SpoilerState } from '../src/render/car/carMotion.ts';
import { Player } from '../src/gameplay/Player.ts';
import { CAR_HALF, HEIGHT, RENDER } from '../src/config.ts';

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
// the hinge angle is angle × ease(k) (MeshCar): fast opening, yet no snap on any frame
const maxStep = Math.max(...trace.slice(1).map((v, i) => Math.abs(ease(v) - ease(trace[i]))));
check(maxStep < 0.125, `smooth deployment (no frame moves more than 1/8 of the travel, ${(maxStep * 100).toFixed(1)} %): ≤ ${(maxStep * RENDER.spoilerAngle).toFixed(4)} rad (${((maxStep * RENDER.spoilerAngle * 180) / Math.PI).toFixed(2)}°) per frame`);
check(spoilerStep(0.5, 0.01, dt) < 0.5 && spoilerStep(0.5, 0.2, dt) > 0.5, 'a faint boost tail does not hold the spoiler up');
check(RENDER.spoilerAngle >= 0.26 && RENDER.spoilerAngle <= 0.39 && RENDER.spoilerUp > RENDER.spoilerDown, `spoiler: ${((RENDER.spoilerAngle * 180) / Math.PI).toFixed(1)}° max (15–22°), opens faster (${RENDER.spoilerUp}/s) than it closes (${RENDER.spoilerDown}/s)`);

// wheels: real speed / radius, capped against strobing
check(Math.abs(wheelStep(10, 0.28, dt, 1) - 10 / 0.28 / 60) < 1e-12, 'wheelStep(): speed / radius per frame');
check(wheelStep(69, 0.28, dt, RENDER.wheelMaxStep) === RENDER.wheelMaxStep, `wheelStep(): capped at ${RENDER.wheelMaxStep} rad / frame at top speed`);
check(RENDER.wheelMaxStep < Math.PI / 10, 'cap below half a spoke gap (10 spokes) → never rolls backwards');
check(wheelStep(-5, 0.28, dt, 1) === 0, 'wheelStep(): never negative');

// ---- v4.1.2 spoiler state machine, driven by the REAL gameplay jump (Player.vmode === 'up')
{
  const R = RENDER;
  const sim = () => {
    const p = new Player();
    p.reset(1);
    const st: SpoilerState = { k: 0, hold: 0 };
    let nitro = 0;
    let t = 0;
    const log: { t: number; k: number; jumping: boolean; nitro: number }[] = [];
    const step = (sec: number) => {
      for (let i = 0; i < Math.round(sec * 60); i++) {
        p.update(dt);
        t += dt;
        const jumping = p.vmode === 'up';
        spoilerUpdate(st, jumping, nitro, dt, R.spoilerUp, R.spoilerDown, R.spoilerHold);
        log.push({ t, k: st.k, jumping, nitro });
      }
    };
    const untilLanded = () => {
      let n = 0;
      while (p.vmode === 'up' && n++ < 600) step(1 / 60);
    };
    return { p, st, step, untilLanded, setNitro: (v: number) => (nitro = v), log };
  };
  const flips = (log: { k: number }[]) => {
    let dir = 0;
    let n = 0;
    for (let i = 1; i < log.length; i++) {
      const d = Math.sign(Math.round((log[i].k - log[i - 1].k) * 1e6));
      if (d && dir && d !== dir) n++;
      if (d) dir = d;
    }
    return n;
  };

  // 1–4: normal → jump → airborne → landing → normal
  {
    const s = sim();
    s.step(2);
    check(s.st.k < 0.001, `normal driving: closed (k ${s.st.k.toFixed(3)})`);
    s.p.input('up');
    s.step(0.12);
    check(s.p.vmode === 'up' && s.st.k > 0.2, `jump take-off: opening as the car leaves the ground (k ${s.st.k.toFixed(2)} after 0.12 s)`);
    s.step(0.4);
    check(s.p.air > 0.5 && s.st.k > 0.9, `airborne: open (k ${s.st.k.toFixed(3)}, air ${s.p.air.toFixed(2)})`);
    s.untilLanded();
    check(s.st.k > 0.9, `touch-down: still up (k ${s.st.k.toFixed(3)}) — holds ${R.spoilerHold} s, no snap`);
    s.step(0.4);
    const mid = s.st.k;
    s.step(1.6);
    check(mid < 0.99 && s.st.k < 0.03, `after landing (no nitro): retracts smoothly (k ${mid.toFixed(2)} → ${s.st.k.toFixed(3)})`);
    check(flips(s.log) <= 1, `one open → close cycle, no flicker (${flips(s.log)} direction change)`);
  }
  // 5: nitro alone
  {
    const s = sim();
    s.step(1);
    s.setNitro(1);
    s.step(1);
    check(s.st.k > 0.99, `nitro: open (k ${s.st.k.toFixed(3)})`);
    s.setNitro(0);
    s.step(2.5);
    check(s.st.k < 0.03, `nitro end: closes (k ${s.st.k.toFixed(3)} after 2.5 s — slower, smooth close)`);
  }
  // 6–9: nitro → jump → land while nitro → nitro ends while airborne on a second jump → both off
  {
    const s = sim();
    s.setNitro(1);
    s.step(1);
    s.p.input('up');
    let minK = 1;
    for (let i = 0; i < 40; i++) {
      s.step(1 / 60);
      minK = Math.min(minK, s.st.k);
    }
    check(minK > 0.98, `jump + nitro: stays open, no re-animation (min k ${minK.toFixed(3)})`);
    s.untilLanded();
    s.step(0.6);
    check(s.st.k > 0.98, `landing while nitro is active: stays open (k ${s.st.k.toFixed(3)})`);
    s.p.input('up');
    s.step(0.3);
    s.setNitro(0);
    s.step(0.2);
    check(s.p.vmode === 'up' && s.st.k > 0.98, `nitro ends while airborne: stays open (k ${s.st.k.toFixed(3)})`);
    s.untilLanded();
    s.step(2.2);
    check(s.st.k < 0.03, `both inactive: closed (k ${s.st.k.toFixed(3)})`);
    check(flips(s.log) <= 1, `jump / nitro overlaps cause no flicker (${flips(s.log)} direction change)`);
  }
  // a faint boost tail (envelope fading out) does not hold the spoiler up
  {
    const st: SpoilerState = { k: 1, hold: 0 };
    for (let i = 0; i < 180; i++) spoilerUpdate(st, false, 0.03, dt, R.spoilerUp, R.spoilerDown, R.spoilerHold);
    check(st.k < 0.03, 'nitro below threshold (fading boost light) → closes');
  }
}

// ---- v4.1.3 airborne alignment (visual only): the 3D car's underside never hangs below the hitbox
{
  const H = HEIGHT;
  const vis = (y: number) => carHeight(y, H.LOW, H.NORMAL, H.HIGH, CAR_HALF.y, true, RENDER.airAlignRamp) - 0.51; // underside
  const old = (y: number) => carHeight(y, H.LOW, H.NORMAL, H.HIGH, CAR_HALF.y, false) - 0.51;
  check(carHeight(H.NORMAL, H.LOW, H.NORMAL, H.HIGH, CAR_HALF.y, true) === 0.51 && carHeight(H.LOW, H.LOW, H.NORMAL, H.HIGH, CAR_HALF.y, true) === 0.3, 'on the road / diving: same pose as before (wheels on the asphalt)');
  let worst = 0;
  let jump = 0;
  for (let y = H.NORMAL + RENDER.airAlignRamp; y <= H.HIGH + 0.5; y += 0.01) worst = Math.min(worst, vis(y) - (y - CAR_HALF.y));
  for (let y = H.LOW; y < H.HIGH + 0.5; y += 0.001) jump = Math.max(jump, Math.abs(vis(y + 0.001) - vis(y)));
  check(worst > -1e-9, `airborne: visual underside ≥ hitbox underside (worst ${(worst * 100).toFixed(1)} cm)`);
  check(jump < 0.01, `continuous height curve (largest step ${(jump * 1000).toFixed(2)} mm per mm)`);
  // jumped obstacles: how far the body used to sink into a 1.7 m crate / 1.35 m barrier when the hitbox just cleared it
  for (const [name, top] of [['crate', 1.7], ['barrier', 1.35], ['platform', 1.1]] as [string, number][]) {
    const y = top + CAR_HALF.y; // hitbox underside exactly on the obstacle top
    check(vis(y) >= top - 1e-9, `${name} (${top} m) just cleared: body underside ${vis(y).toFixed(2)} m (was ${old(y).toFixed(2)} m — ${((top - old(y)) * 100).toFixed(0)} cm inside it)`);
  }
}

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
