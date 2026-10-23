/**
 * v4.2 environment (3D upgrade Step 04): seamless road tile, markings aligned with the gameplay
 * lanes, recycled scenery that never pops, graphics presets, save migration. Render-only code —
 * the gameplay constants are checked unchanged.
 */
declare const process: { exit(code: number): never };
declare const globalThis: { localStorage?: unknown };
import { CAR_HALF, GRAPHICS, GRAPHICS_ORDER, HEIGHT, LANES, LANE_WIDTH, ROAD, SPEED, nextGraphics } from '../src/config.ts';
import { DIVIDERS, EDGES, roadPixels, roadSample, columnX } from '../src/render/roadSurface.ts';
import { farFadeAt, wrapZ } from '../src/render/envFx.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

// ---- the road tile repeats exactly (scrolling never shows a seam)
{
  let worst = 0;
  for (let i = 0; i < 4000; i++) {
    const x = (Math.random() * 2 - 1) * ROAD.half;
    const z = Math.random() * ROAD.tile;
    const a = roadSample(x, z);
    const b = roadSample(x, z + ROAD.tile);
    const c = roadSample(x, z - ROAD.tile);
    worst = Math.max(worst, Math.abs(a.r - b.r), Math.abs(a.rough - b.rough), Math.abs(a.er - b.er), Math.abs(a.r - c.r));
  }
  check(worst < 1e-9, `road is periodic with the ${ROAD.tile} m tile (max difference ${worst.toExponential(1)})`);
  for (const [name, p] of [['divider dash cycle', ROAD.tile], ['studs', ROAD.studEvery], ['shoulder grooves', 0.3], ['grain 0.5 m', 0.5], ['grain 0.12 m', 0.12], ['grain 0.03 m', 0.03]] as [string, number][])
    check(Math.abs(ROAD.tile / p - Math.round(ROAD.tile / p)) < 1e-9, `${name}: ${(ROAD.tile / p).toFixed(0)} whole periods per tile`);
  // rasterised: the wrap step (last row → first row) of the asphalt is no bigger than an ordinary
  // row-to-row step (divider columns left out: a dash legitimately starts at the tile edge)
  const px = roadPixels(256, 512);
  const cols = [...Array(px.w).keys()].filter((i) => DIVIDERS.every((d) => Math.abs(columnX(i, px.w) - d) > 0.15));
  const rowDiff = (j0: number, j1: number) => {
    let d = 0;
    for (const i of cols) d += Math.abs(px.color[(j0 * px.w + i) * 4] - px.color[(j1 * px.w + i) * 4]);
    return d / cols.length;
  };
  const diffs: number[] = [];
  for (let j = 0; j < px.h - 1; j++) diffs.push(rowDiff(j, j + 1));
  diffs.sort((a, b) => a - b);
  const wrap = rowDiff(px.h - 1, 0);
  check(wrap <= diffs[Math.floor(diffs.length * 0.99)], `texture wrap row step ${wrap.toFixed(2)} ≤ 99th percentile of normal row steps (${diffs[Math.floor(diffs.length * 0.99)].toFixed(2)})`);
}

// ---- markings line up with the gameplay lanes
{
  check(DIVIDERS.length === LANES.length - 1 && DIVIDERS.every((d, i) => Math.abs(d - (LANES[i] + LANES[i + 1]) / 2) < 1e-9), `dividers halfway between lanes (${DIVIDERS.join(', ')})`);
  check(EDGES.every((e) => Math.abs(e) > Math.max(...LANES) + LANE_WIDTH / 2 - 0.01 && Math.abs(e) + ROAD.edgeW / 2 < ROAD.half), `edge lines just outside the outer lanes, on the deck (±${ROAD.edgeX})`);
  // nothing painted where the car drives: ±0.9 m around each lane centre is bare asphalt everywhere
  let painted = 0;
  for (const lx of LANES)
    for (let x = lx - 0.9; x <= lx + 0.9; x += 0.02)
      for (let z = 0; z < ROAD.tile; z += 0.05) if (roadSample(x, z).er > 0) painted++;
  check(painted === 0, 'lane centres (±0.9 m) never painted');
  // the painted dividers are where they should be in the texture
  const W = 512;
  for (const d of DIVIDERS) {
    let col = 0;
    for (let i = 0; i < W; i++) if (Math.abs(columnX(i, W) - d) < Math.abs(columnX(col, W) - d)) col = i;
    const px = roadSample(columnX(col, W), 1);
    check(px.r > 0.5, `divider at x ${d} is paint in texture column ${col}`);
  }
}

// ---- recycled scenery: positions move continuously and re-enter only at the far end, fully hazed
{
  const range = 312;
  const near = 30;
  let jumps = 0;
  let prev = wrapZ(0, 0, range, near);
  for (let d = 0.05; d < 3000; d += 0.05) {
    const z = wrapZ(0, d, range, near);
    if (Math.abs(z - prev) > 0.1) {
      jumps++;
      if (!(prev > near - 0.2 && Math.abs(z - (near - range)) < 0.2)) fails++;
    }
    prev = z;
  }
  check(jumps === Math.floor(3000 / range), `wrapZ: smooth scroll, ${jumps} wraps over 3 km, each from behind the camera to the far end`);
  const spawn = near - range;
  check(farFadeAt(spawn + 0.5, spawn) > 0.999 && farFadeAt(spawn + 60, spawn) === 0, 'a prop re-entering at its spawn point is fully hazed, clear 60 m later (no popping)');
  let mono = true;
  for (let z = spawn; z < spawn + 60; z += 0.5) if (farFadeAt(z + 0.5, spawn) > farFadeAt(z, spawn)) mono = false;
  check(mono, 'fade clears monotonically as the prop approaches');
}

// ---- graphics presets
{
  const [lo, me, hi] = GRAPHICS_ORDER.map((q) => GRAPHICS[q]);
  check(GRAPHICS_ORDER.join() === 'low,medium,high', 'three presets: LOW, MEDIUM, HIGH');
  check(lo.dprCap <= me.dprCap && me.dprCap <= hi.dprCap && lo.cityDensity <= me.cityDensity && me.cityDensity <= hi.cityDensity && lo.anisotropy <= me.anisotropy && me.anisotropy <= hi.anisotropy, 'cost rises LOW → MEDIUM → HIGH (pixel ratio, city density, anisotropy)');
  check(!lo.bloom && !lo.speedBlur && me.bloom && !me.speedBlur && hi.bloom && hi.speedBlur, 'post-processing: LOW none, MEDIUM bloom, HIGH bloom + speed blur');
  check(nextGraphics('low') === 'medium' && nextGraphics('medium') === 'high' && nextGraphics('high') === 'low', 'settings cycle LOW → MEDIUM → HIGH → LOW');
}

// ---- saves: new players start on MEDIUM; the old default HIGH becomes MEDIUM once, LOW stays LOW
{
  const store: Record<string, string> = {};
  globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
  const { loadSave } = await import('../src/core/Save.ts');
  check(loadSave().settings.quality === 'medium', 'new save: MEDIUM');
  const old = (q: string) => JSON.stringify({ settingsRev: 3, settings: { sound: true, music: true, quality: q, speed: 'normal' } });
  store['xwave-sky-rush-v1'] = old('high');
  const a = loadSave();
  check(a.settings.quality === 'medium' && a.settings.gfx3 === true, 'old save on HIGH → MEDIUM (once)');
  store['xwave-sky-rush-v1'] = old('low');
  check(loadSave().settings.quality === 'low', 'old save on LOW stays LOW');
  store['xwave-sky-rush-v1'] = JSON.stringify({ settingsRev: 3, settings: { sound: true, music: true, quality: 'high', speed: 'normal', gfx3: true } });
  check(loadSave().settings.quality === 'high', 'a player who picked HIGH after the update keeps HIGH');
}

// ---- gameplay constants untouched by the environment work (lanes, heights, hitbox, speeds)
check(LANES.join() === '-2.6,0,2.6' && LANE_WIDTH === 2.6, 'lanes unchanged');
check(HEIGHT.LOW === 0.48 && HEIGHT.NORMAL === 1 && HEIGHT.HIGH === 3.05 && CAR_HALF.x === 0.7 && CAR_HALF.y === 0.36 && CAR_HALF.z === 1, 'heights and hitbox unchanged');
check(typeof SPEED.start === 'number' && typeof SPEED.max === 'number' && SPEED.max > SPEED.start, `speeds read from gameplay config (start ${SPEED.start}, max ${SPEED.max}) — render code only reads them`);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
