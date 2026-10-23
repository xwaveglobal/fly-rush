/**
 * Step 05 no-DOM smoke test (runs in a Web Worker: no window / document). Builds the v4 3D stack —
 * Renderer (bloom + speed blur), Scenery (night city), Track (procedural road), the 3D X1 (MeshCar)
 * with every CarFx effect — on an OffscreenCanvas through no-dom-shim.ts, renders frames on every
 * graphics preset and reports errors, GL errors and whether pixels were drawn.
 */
import './no-dom-shim.ts';
import { shimLog } from './no-dom-shim.ts';
import * as THREE from 'three';
/* eslint-disable @typescript-eslint/no-explicit-any */
const post = (m: any) => (self as any).postMessage(m);
const errors: string[] = [];
(self as any).addEventListener?.('error', (e: any) => errors.push(String(e.message ?? e)));
(self as any).onunhandledrejection = (e: any) => errors.push('rejection: ' + String(e.reason?.message ?? e.reason));
const origErr = console.error;
console.error = (...a: any[]) => {
  errors.push('console.error: ' + a.map(String).join(' ').slice(0, 200));
  origErr(...a);
};

(async () => {
  const steps: { name: string; ok: boolean; info: string }[] = [];
  const step = async (name: string, f: () => any) => {
    try {
      const info = await f();
      steps.push({ name, ok: true, info: info ? String(info) : '' });
    } catch (e: any) {
      steps.push({ name, ok: false, info: String(e?.stack ?? e).slice(0, 400) });
    }
  };
  const { Renderer } = await import('../../src/render/Renderer.ts');
  const { Scenery } = await import('../../src/render/Scenery.ts');
  const { Track } = await import('../../src/render/Track.ts');
  const { Vehicle, SKINS } = await import('../../src/render/Vehicle.ts');
  const { CameraRig } = await import('../../src/render/CameraRig.ts');
  const { ObstacleViews } = await import('../../src/render/ObstacleViews.ts');
  const { Player } = await import('../../src/gameplay/Player.ts');
  const { hitboxes, rowMasks } = await import('../../src/gameplay/ObstacleRules.ts');
  const { GRAPHICS, LANES } = await import('../../src/config.ts');
  const container: any = (globalThis as any).document.createElement('div');
  const rig = new CameraRig();
  let renderer: any;
  await step('WebGL2 renderer on a runtime canvas (no DOM)', () => {
    renderer = new Renderer(container, 'medium', rig.camera);
    rig.resize(renderer.resize());
    const gl = renderer.renderer.getContext();
    return `${gl.getParameter(gl.VERSION)} · maxTex ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`;
  });
  const scene = renderer.scene;
  let scenery: any, track: any, vehicle: any, views: any;
  const p = new Player();
  p.reset(1);
  const live: any[] = [];
  await step('night city (Scenery: instanced buildings, crowns, neon, far lights, canvas textures)', () => {
    scenery = new Scenery(scene);
    scene.add(scenery.group);
    scenery.setWorld('city', true);
  });
  await step('procedural road (Track: DataTextures, road shader with fwidth)', () => {
    track = new Track();
    scene.add(track.group);
  });
  await step('obstacles + Ring Coins (ObstacleViews, canvas hazard textures)', () => {
    const worldRoot = new THREE.Group();
    scene.add(worldRoot);
    views = new ObstacleViews(worldRoot);
    let id = 1;
    for (const [type, lane, z] of [['crate', 0, -30], ['ring', 1, -18], ['barrier', 2, -45]] as const) {
      const spec: any = { type, lane, lane2: lane, door: 1, variant: 0 };
      const o: any = { id: id++, spec, row: { dist: 0, dt: 1, masks: rowMasks([spec]), obstacles: [spec], tier: 0 }, z, sx: LANES[lane], boxes: [], hit: false, smashed: false, passed: false, minGap: 0, vz: 0 };
      hitboxes(spec, o.sx, o.boxes);
      views.spawn(o);
      live.push(o);
    }
    return `${live.length} spawned`;
  });
  await step('3D XWAVE X1 (GLB from a data URL through the own parser, canvas textures)', async () => {
    vehicle = new Vehicle();
    scene.add(vehicle.root);
    scene.add(vehicle.crash.group);
    vehicle.camera = rig.camera;
    let found = false;
    for (let i = 0; i < 300 && !found; i++) {
      vehicle.root.traverse((o: any) => o.name === 'X1' && (found = true));
      if (!found) await new Promise((r) => setTimeout(r, 25));
    }
    if (!found) throw new Error('X1 model not loaded');
    vehicle.setSkin(SKINS.find((s: any) => s.id === 'zenith')!);
    rig.car3d = !vehicle.usesSprite;
    rig.mode = 'run';
    return 'loaded';
  });
  const gl = renderer.renderer.getContext();
  let dist = 400;
  let turbo = 0;
  const frame = (n: number) => {
    for (let i = 0; i < n; i++) {
      const dt = 1 / 60;
      dist += 40 * dt;
      p.update(dt);
      vehicle.update(p, dt, 40, turbo);
      scenery.update(dist, i * dt, dt);
      track.update(dist, 0.6, turbo);
      views.update(live, i * dt, dt);
      rig.update(dt, p, 0.6, turbo);
      renderer.render();
    }
    const e = gl.getError();
    if (e) throw new Error('GL error 0x' + e.toString(16));
  };
  for (const q of ['low', 'medium', 'high'] as const) {
    await step(`render on ${q.toUpperCase()} (post-processing per preset)`, () => {
      renderer.setQuality(q);
      scenery.setQuality(GRAPHICS[q]);
      track.setQuality(GRAPHICS[q]);
      frame(8);
      return `${renderer.renderer.info.render.calls} calls · dpr ${renderer.pixelRatio} · ${renderer.renderer.info.programs?.length} programs`;
    });
  }
  await step('effects: shield, turbo, shield + turbo, pickup sweep, jump, dive, ring collect, phase ghost, crash', () => {
    vehicle.shieldTarget = 1;
    frame(20);
    vehicle.turboTarget = vehicle.boostTarget = turbo = 1;
    frame(20);
    vehicle.shieldTarget = 0;
    vehicle.pickupSweep(0xffd24a);
    views.collect(live[1]);
    frame(20);
    vehicle.turboTarget = vehicle.boostTarget = turbo = 0;
    p.input('up');
    frame(40);
    p.input('down');
    frame(40);
    vehicle.showcase = { kind: 'ghost', e: 1 };
    frame(10);
    vehicle.showcase = null;
    frame(4);
    vehicle.crashBreak();
    for (let i = 0; i < 30; i++) vehicle.crashUpdate(1 / 60);
    frame(2);
    vehicle.resetFx();
    vehicle.resetPose();
    frame(2);
  });
  let drawn = 0;
  await step('pixels were drawn (read back the frame)', () => {
    const r = renderer.renderer;
    const w = r.domElement.width;
    const h = r.domElement.height;
    const px = new Uint8Array(4 * 64);
    r.setRenderTarget(null);
    r.autoClear = true;
    r.render(scene, rig.camera);
    gl.readPixels(Math.floor(w / 2) - 32, Math.floor(h / 2), 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let i = 0; i < 64; i++) if (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2] > 30) drawn++;
    if (!drawn) throw new Error('blank frame');
    return `${drawn}/64 lit pixels on the centre row (${w}×${h})`;
  });
  await step('context loss → restore (WEBGL_lose_context)', async () => {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return 'extension not available — skipped';
    ext.loseContext();
    await new Promise((r) => setTimeout(r, 50));
    renderer.render(); // must not throw while lost
    ext.restoreContext();
    await new Promise((r) => setTimeout(r, 200));
    frame(3);
    return `restored, lost flag ${renderer.lost}`;
  });
  post({ steps, errors, images: shimLog.length });
})();
