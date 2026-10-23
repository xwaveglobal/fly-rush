/**
 * Visual check of the in-game 3D car with the REAL game code (Vehicle + MeshCar + CameraRig + Player),
 * stepped frame by frame so poses are exact. Bundled and driven by scripts/car/preview-x1.mjs.
 * Output is 9:16 (720 × 1280).
 *
 * URL params:
 *   view    = chase | rear0 | rl45 | rr45 | side90 | diff (low rear close-up) | deck (spoiler close-up)
 *   pose    = drive | lane | jump | land | nitro
 *   cam     = low | balanced | high (chase preset; default = CAMERA.chase)
 *   spoiler = 0 | 1 (force closed / raised)
 *   blocks  = 1 (obstacle blocks on the road, to judge readability)
 *   car     = mesh | sprite (config RENDER override)
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Vehicle, SKINS } from '../../src/render/Vehicle.ts';
import { CameraRig } from '../../src/render/CameraRig.ts';
import { Player } from '../../src/gameplay/Player.ts';
import { CAMERA, LANES } from '../../src/config.ts';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') ?? 720);
const H = +(q.get('h') ?? 1280);
const view = q.get('view') ?? 'chase';
const studio = view !== 'chase' && view !== 'home';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H);
r.outputColorSpace = THREE.SRGBColorSpace;
r.toneMapping = THREE.ACESFilmicToneMapping;
r.toneMappingExposure = 1.05;
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(r);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
(scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = studio ? 0.8 : 0.6;
scene.background = new THREE.Color(studio ? 0xe9eaee : 0x2a1846);
if (!studio) scene.fog = new THREE.Fog(0x8c6aa8, 60, 330);
// game-like light rig (city world: hemisphere + warm sun + cool rim)
scene.add(new THREE.HemisphereLight(0xbfd4ff, studio ? 0xcfd2d8 : 0x5a3d6e, studio ? 0.8 : 1.1));
const sun = new THREE.DirectionalLight(studio ? 0xffffff : 0xffc59a, studio ? 1.6 : 2.2);
sun.position.set(-6, 10, -8);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9fdcff, 1.0);
rim.position.set(5, 4, 8);
scene.add(rim);
// road
const road = new THREE.Mesh(new THREE.PlaneGeometry(studio ? 40 : 8.6, 400), new THREE.MeshStandardMaterial({ color: studio ? 0xdfe1e5 : 0x3a3d48, roughness: 0.6, metalness: studio ? 0 : 0.4 }));
road.rotation.x = -Math.PI / 2;
road.position.z = -160;
scene.add(road);
if (!studio) {
  for (const x of [-1.3, 1.3])
    for (let z = 20; z > -300; z -= 6) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.6), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 0.01, z);
      scene.add(d);
    }
  for (const x of [-4.3, 4.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 400), new THREE.MeshStandardMaterial({ color: 0x24305a, emissive: 0x39b6ff, emissiveIntensity: 0.15 }));
    rail.position.set(x, 0.6, -160);
    scene.add(rail);
  }
}
if (q.get('blocks')) {
  // crates (1.7 m) and an overhead beam at typical reaction distances, in different lanes
  const mat = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0x7a2a00, emissiveIntensity: 0.4 });
  for (const [lane, z] of [[1, -22], [0, -34], [2, -34], [1, -52], [0, -70]] as [number, number][]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), mat);
    b.position.set(LANES[lane], 0.85, z);
    scene.add(b);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0xd04dff, emissive: 0x5a0a7a, emissiveIntensity: 0.5 }));
  beam.position.set(LANES[2], 2.1, -46);
  scene.add(beam);
}

const v = new Vehicle();
scene.add(v.root);
const rig = new CameraRig();
rig.resize(W / H);
v.camera = rig.camera;
rig.mode = 'run';
const camQ = q.get('cam') as 'low' | 'balanced' | 'high' | null;
if (camQ) rig.presetOverride = CAMERA.presets[camQ];
const p = new Player();
p.reset(1);

function meshLoaded() {
  let found = false;
  v.root.traverse((o) => {
    if (o.name === 'X1') found = true;
  });
  return q.get('car') === 'sprite' ? true : found;
}

(window as unknown as { __go: () => Promise<unknown> }).__go = async () => {
  for (let i = 0; i < 200 && !meshLoaded(); i++) await new Promise((res) => setTimeout(res, 50));
  v.setSkin(SKINS.find((s) => s.id === (q.get('skin') ?? 'zenith'))!);
  rig.car3d = !v.usesSprite;
  const mesh = (v as unknown as { mesh: { spoilerForce: number | null; spoilerK: number } | null }).mesh;
  if (mesh && q.get('spoiler') !== null) mesh.spoilerForce = +q.get('spoiler')!;
  const pose = q.get('pose') ?? 'drive';
  const dt = 1 / 60;
  const speed = 30;
  let turbo = 0;
  const step = (n: number) => {
    for (let i = 0; i < n; i++) {
      p.update(dt);
      v.update(p, dt, speed, turbo);
      rig.update(dt, p, 0.4, turbo);
    }
  };
  step(60);
  rig.snap();
  if (pose === 'lane') {
    p.input('right');
    step(7); // mid lane change: body rolls and yaws, front wheels steer
  } else if (pose === 'jump') {
    p.input('up');
    step(9); // rising: nose up
  } else if (pose === 'land') {
    p.input('up');
    let prevAir = 0;
    for (let i = 0; i < 200; i++) {
      step(1);
      if (prevAir > 0.3 && p.air < 0.05) break;
      prevAir = p.air;
    }
    step(4); // just after touch-down: body dips
  } else if (pose === 'nitro') {
    turbo = 1;
    v.boostTarget = 1;
    step(40);
  }
  if (view === 'home') {
    // home screen camera: orbit phase t (seconds) — the game steps the rig in 'menu' mode
    rig.mode = 'menu';
    const t = +(q.get('t') ?? 0);
    for (let i = 0; i < Math.round(t * 60) + 120; i++) {
      v.update(p, dt, 0, 0);
      rig.update(dt, p, 0, 0);
    }
  }
  // the car's on-screen bounds (fractions of width / height, 0 = left / top)
  const bounds = () => {
    const car = v.root.getObjectByName('X1') ?? v.root;
    car.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(car);
    const cam = rig.camera;
    cam.updateMatrixWorld(true);
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
      x0 = Math.min(x0, (c.x + 1) / 2); x1 = Math.max(x1, (c.x + 1) / 2);
      y0 = Math.min(y0, (1 - c.y) / 2); y1 = Math.max(y1, (1 - c.y) / 2);
    }
    return [x0, x1, y0, y1].map((n) => +n.toFixed(3));
  };
  if (studio && view !== 'home') {
    const shots: Record<string, [number, number, number, number, number]> = {
      // yaw (deg), distance, camera height, look height, fov
      rear0: [0, 10.5, 1.35, 0.45, 16],
      rl45: [-45, 24, 2.4, 0.42, 16],
      rr45: [45, 24, 2.4, 0.42, 16],
      side90: [-90, 19, 0.9, 0.45, 16],
      diff: [-18, 5.6, 0.42, 0.24, 22],
      deck: [-62, 4.6, 1.0, 0.62, 24],
    };
    const [yd, dist, ch, ly, fov] = shots[view] ?? shots.rear0;
    const yaw = THREE.MathUtils.degToRad(yd);
    const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 300);
    // studio shots look at the rear half of the car (the subject of Step 03)
    const zc = view === 'side90' || view === 'rl45' || view === 'rr45' ? 0 : view === 'deck' ? 1.45 : 0.9;
    cam.position.set(p.x + Math.sin(yaw) * dist, ch, zc + Math.cos(yaw) * dist);
    cam.lookAt(p.x, ly, zc);
    v.camera = cam;
    v.update(p, 0, speed, turbo);
    r.render(scene, cam);
  } else {
    r.render(scene, rig.camera);
    // the old rear image lives on the overlay layer (drawn last by the game's Renderer)
    r.autoClear = false;
    r.clearDepth();
    const bg = scene.background;
    scene.background = null;
    rig.camera.layers.set(1);
    r.render(scene, rig.camera);
    rig.camera.layers.set(0);
    scene.background = bg;
    r.autoClear = true;
  }
  return { box: view === 'chase' || view === 'home' ? bounds() : null, air: +p.air.toFixed(3), x: +p.x.toFixed(3), y: +p.y.toFixed(3), spoiler: mesh ? +mesh.spoilerK.toFixed(3) : null, cam: rig.camera.position.toArray().map((n) => +n.toFixed(2)), fov: +rig.camera.fov.toFixed(1) };
};
