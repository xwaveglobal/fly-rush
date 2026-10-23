/**
 * Visual check of the in-game 3D car with the REAL game code (Vehicle + MeshCar + CameraRig + Player),
 * stepped frame by frame so poses are exact. Bundled and driven by scripts/car/preview-x1.mjs.
 *
 * URL params: view = rear0 | rl45 | rr45 | side90 | chase ; pose = drive | lane | jump | land | nitro
 *             car = mesh | sprite (config RENDER override)
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Vehicle, SKINS } from '../../src/render/Vehicle.ts';
import { CameraRig } from '../../src/render/CameraRig.ts';
import { Player } from '../../src/gameplay/Player.ts';

const q = new URLSearchParams(location.search);
const W = 390 * 2;
const H = 844 * 2;
const view = q.get('view') ?? 'chase';
const studio = view !== 'chase';
const size = studio ? [1024, 936] : [W, H];
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(size[0], size[1]);
r.outputColorSpace = THREE.SRGBColorSpace;
r.toneMapping = THREE.ACESFilmicToneMapping;
r.toneMappingExposure = 1.05;
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(r);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
(scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = studio ? 1 : 0.6;
scene.background = new THREE.Color(studio ? 0xffffff : 0x6a3d92);
// game-like light rig (city world: hemisphere + warm sun + cool rim)
scene.add(new THREE.HemisphereLight(0xbfd4ff, studio ? 0xdddddd : 0x5a3d6e, studio ? 0.8 : 1.1));
const sun = new THREE.DirectionalLight(studio ? 0xffffff : 0xffc59a, studio ? 1.6 : 2.2);
sun.position.set(-6, 10, -8);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9fdcff, 1.0);
rim.position.set(5, 4, 8);
scene.add(rim);
// road
const road = new THREE.Mesh(new THREE.PlaneGeometry(studio ? 40 : 8.6, 300), new THREE.MeshStandardMaterial({ color: studio ? 0xf4f4f4 : 0x3a3d48, roughness: 0.6, metalness: studio ? 0 : 0.4 }));
road.rotation.x = -Math.PI / 2;
road.position.z = -120;
scene.add(road);
if (!studio)
  for (const x of [-1.3, 1.3])
    for (let z = 20; z > -200; z -= 6) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.6), new THREE.MeshBasicMaterial({ color: 0xe8ecff }));
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 0.01, z);
      scene.add(d);
    }

const v = new Vehicle();
scene.add(v.root);
const rig = new CameraRig();
rig.resize(W / H);
v.camera = rig.camera;
rig.mode = 'run';
const p = new Player();
p.reset(1);

(window as unknown as { __go: () => Promise<unknown> }).__go = async () => {
  // wait for the GLB
  for (let i = 0; i < 200 && RENDERED_MESH() === false; i++) await new Promise((res) => setTimeout(res, 50));
  v.setSkin(SKINS.find((s) => s.id === (q.get('skin') ?? 'zenith'))!);
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
    step(7); // mid lane change: body rolls, front wheels steer
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
    step(30);
  }
  if (studio) {
    const yaw = THREE.MathUtils.degToRad({ rear0: 0, rl45: -45, rr45: 45, side90: -90 }[view] ?? 0);
    const cam = new THREE.PerspectiveCamera(16, size[0] / size[1], 0.1, 300);
    const dist = +(q.get('dist') ?? 13);
    cam.position.set(p.x + Math.sin(yaw) * dist, +(q.get('ch') ?? 1.7), Math.cos(yaw) * dist);
    cam.lookAt(p.x, 0.42, 0);
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
  return { air: p.air, x: p.x, y: p.y };
};
function RENDERED_MESH() {
  let found = false;
  v.root.traverse((o) => {
    if (o.name === 'X1') found = true;
  });
  return q.get('car') === 'sprite' ? true : found;
}
