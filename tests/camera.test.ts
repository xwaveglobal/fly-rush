/**
 * v4 cameras (render-only): the 3D car stays fully in frame, obstacles at reaction distance are
 * visible above it, the horizon sits in a sane band, and the home orbit keeps the car in the free
 * band above the difficulty panel. HIGH must stay identical to the pre-v4 camera (old rear image).
 */
declare const process: { exit(code: number): never };
import * as THREE from 'three';
import { CameraRig } from '../src/render/CameraRig.ts';
import { Player } from '../src/gameplay/Player.ts';
import { CAMERA, FAIRNESS, LANES, LEVELS, RENDER, SPEED } from '../src/config.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

// the 3D car's in-game box (model 2.19 × 1.18 × 4.69 m, rear at +2.24, front at −2.36) × scale
const s = RENDER.carScale;
const car = new THREE.Box3(new THREE.Vector3(-1.095 * s, 0, -2.36 * s), new THREE.Vector3(1.095 * s, 1.18 * s, 2.24 * s));
const ASPECTS: [string, number][] = [['9:16', 9 / 16], ['390×844', 390 / 844]];

function rigFor(aspect: number, mode: 'run' | 'menu', preset: 'low' | 'balanced' | 'high' | null) {
  const rig = new CameraRig();
  rig.resize(aspect);
  rig.car3d = true;
  rig.mode = mode;
  if (preset) rig.presetOverride = CAMERA.presets[preset];
  return rig;
}
function screenBox(cam: THREE.PerspectiveCamera, b: THREE.Box3) {
  cam.updateMatrixWorld(true);
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(cam);
    x0 = Math.min(x0, (c.x + 1) / 2);
    x1 = Math.max(x1, (c.x + 1) / 2);
    y0 = Math.min(y0, (1 - c.y) / 2);
    y1 = Math.max(y1, (1 - c.y) / 2);
  }
  return { x0, x1, y0, y1 };
}
const f = (n: number) => n.toFixed(2);

// ---- HIGH == the pre-v4 chase camera (the old rear image keeps its exact framing)
const hi = CAMERA.presets.high;
check(hi.height === 3.25 && hi.back === 6.6 && hi.speedBack === 0.6 && hi.lookY === 1.15 && hi.lookZ === -9 && hi.followX === 0.72 && hi.lookX === 0.55 && hi.fov === 0, 'HIGH preset = the v1–v4.1.0 camera');
{
  const rig = new CameraRig();
  rig.resize(9 / 16);
  rig.car3d = false;
  check(rig.preset === CAMERA.presets.high, 'old rear image always uses HIGH, whatever CAMERA.chase is');
}
check(['low', 'balanced', 'high'].includes(CAMERA.chase), `default chase preset: ${CAMERA.chase}`);

// ---- chase presets
const reactDist = SPEED.max * SPEED.turboMul * LEVELS.hard.speed * FAIRNESS.minRowTime; // metres covered in the minimum reaction time at top speed
for (const name of ['low', 'balanced', 'high'] as const) {
  for (const [label, aspect] of ASPECTS) {
    for (const lane of [0, 1, 2]) {
      const rig = rigFor(aspect, 'run', name);
      const p = new Player();
      p.reset(lane);
      rig.update(1 / 60, p, 1, 0, true);
      const cam = rig.camera;
      const box = car.clone().translate(new THREE.Vector3(LANES[lane], 0, 0));
      const b = screenBox(cam, box);
      const inFrame = b.x0 > 0 && b.x1 < 1 && b.y0 > 0.05 && b.y1 < 0.97;
      // an obstacle (1.7 m crate) in the same lane at reaction distance: some of it above the car's roof
      const crate = new THREE.Box3(new THREE.Vector3(LANES[lane] - 0.85, 0, -reactDist - 0.85), new THREE.Vector3(LANES[lane] + 0.85, 1.7, -reactDist + 0.85));
      const o = screenBox(cam, crate);
      const visible = o.y0 < b.y0 - 0.005;
      const tall = (o.y1 - o.y0) * 844 >= 10; // at least ~10 px tall on a 844 px phone screen
      const horizon = new THREE.Vector3(LANES[lane], 0, -400).project(cam);
      const hy = (1 - horizon.y) / 2;
      if (lane === 1 || !inFrame || !visible || !tall)
        check(inFrame && visible && tall && hy > 0.2 && hy < 0.62, `${name} ${label} lane ${lane}: car in frame [${f(b.x0)}–${f(b.x1)}, ${f(b.y0)}–${f(b.y1)}], crate at ${reactDist.toFixed(0)} m visible above the roof (${f(o.y0)} < ${f(b.y0)}, ${((o.y1 - o.y0) * 844).toFixed(0)} px), horizon ${f(hy)}`);
    }
  }
}
// balanced is the recommended setup: the car reads bigger than on HIGH, with the rear in view
{
  const size = (name: 'balanced' | 'high' | 'low') => {
    const rig = rigFor(390 / 844, 'run', name);
    const p = new Player();
    p.reset(1);
    rig.update(1 / 60, p, 1, 0, true);
    const b = screenBox(rig.camera, car);
    return b.x1 - b.x0;
  };
  check(size('low') > size('balanced') && size('balanced') > size('high'), `car width on screen: low ${f(size('low'))} > balanced ${f(size('balanced'))} > high ${f(size('high'))}`);
}

// ---- home orbit: constant distance, car inside the free band above the difficulty panel.
// The home UI has fixed CSS sizes, measured on real screenshots: difficulty panel top at 0.676 H
// (360×640, 9:16) / 0.754 H (390×844); side buttons end at 0.50 / 0.40 H and cover x < 0.19, x > 0.81.
const PANEL: Record<string, number> = { '9:16': 0.676, '390×844': 0.754 };
const SIDE: Record<string, number> = { '9:16': 0.5, '390×844': 0.4 };
for (const [label, aspect] of ASPECTS) {
  const rig = rigFor(aspect, 'menu', null);
  const p = new Player();
  p.reset(1);
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  const dists: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 30; i++) {
    rig.update(dt, p, 0, 0);
    if (i > 240 && i % 30 === 0) {
      const b = screenBox(rig.camera, car);
      x0 = Math.min(x0, b.x0);
      x1 = Math.max(x1, b.x1);
      y0 = Math.min(y0, b.y0);
      y1 = Math.max(y1, b.y1);
      dists.push(rig.camera.position.distanceTo(new THREE.Vector3(0, rig.camera.position.y, 0)));
    }
  }
  const spread = Math.max(...dists) - Math.min(...dists);
  // the box is the car's 3D bounding box projected (larger than the visible car)
  check(y1 < PANEL[label] - 0.02 && y0 > 0.3, `home ${label}: car between ${f(y0)} and ${f(y1)} of the height — clear of the difficulty panel at ${PANEL[label]}`);
  check(x0 > 0.03 && x1 < 0.97 && (y0 > SIDE[label] || (x0 > 0.12 && x1 < 0.88)), `home ${label}: car x ${f(x0)}–${f(x1)} stays clear of the side buttons`);
  check(spread < 0.05, `home ${label}: orbit distance constant (spread ${spread.toFixed(3)} m)`);
}

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
