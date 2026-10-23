/** v4 3D car: the bundled X1 model parses with the game's own GLB reader and has what the game drives. */
declare const process: { exit(code: number): never };
// @ts-expect-error node built-in (no @types/node in this project)
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseGlb } from '../src/render/car/glbParse.ts';
import { CAR_HALF, RENDER } from '../src/config.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

const bytes: Uint8Array = readFileSync(new URL('../src/assets/models/xwave-x1.glb', import.meta.url));
const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const scene = parseGlb(buf);
const car = scene.getObjectByName('X1');
check(!!car, 'GLB parses; root node X1');
const need = ['Body', 'Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR', 'Spin_FL', 'Spin_FR', 'Spin_RL', 'Spin_RR', 'Tyre_RL', 'Rim_RL', 'Caliper_RL', 'NitroSocket_L', 'NitroSocket_R', 'Rear_LED', 'Badge_XWAVE', 'Glass_Canopy', 'Diffuser', 'Rear_LowerBumper', 'Spoiler_Pivot', 'Spoiler'];
const missing = need.filter((n) => !scene.getObjectByName(n));
check(missing.length === 0, `named nodes present (${need.length})${missing.length ? ' — missing ' + missing.join(', ') : ''}`);

// wheel assemblies: spin groups sit under hub pivots at the axle, the caliper does not spin
const rl = scene.getObjectByName('Wheel_RL')!;
check(scene.getObjectByName('Spin_RL')!.parent === rl && scene.getObjectByName('Caliper_RL')!.parent === rl, 'wheel hierarchy: Wheel → Spin (tyre, rim, disc) + Caliper');
check(rl.position.y > 0.3 && rl.position.y < 0.45 && rl.position.z > 0, `rear-left hub at axle height behind the centre (y ${rl.position.y.toFixed(2)}, z ${rl.position.z.toFixed(2)})`);

// size, orientation, budgets
scene.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(scene);
const size = box.getSize(new THREE.Vector3());
check(Math.abs(box.min.y) < 0.01, `stands on the ground (min y ${box.min.y.toFixed(3)})`);
check(size.z > 4 && size.z < 5.2 && size.x > 1.9 && size.x < 2.4 && size.y > 1.0 && size.y < 1.3, `real-car size ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`);
const led = scene.getObjectByName('Rear_LED')!;
const ledZ = new THREE.Box3().setFromObject(led).getCenter(new THREE.Vector3()).z;
check(ledZ > 2, `rear lights face +Z (front toward −Z) — LED at z ${ledZ.toFixed(2)}`);
let tris = 0;
let meshes = 0;
const mats = new Set<string>();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  meshes++;
  tris += (m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count) / 3;
  mats.add((m.material as THREE.Material).name);
  if (!m.geometry.getAttribute('normal')) fails++;
});
check(tris <= 40000, `triangle budget: ${tris} ≤ 40,000`);
check(meshes <= 40, `draw calls (meshes): ${meshes} ≤ 40`);
for (const n of ['X1_Paint', 'X1_RearLED', 'X1_Glass', 'X1_Tyre', 'X1_Badge', 'X1_Carbon']) check(mats.has(n), `material ${n}`);
const ledMat = (led as THREE.Mesh).material as THREE.MeshStandardMaterial;
check(ledMat.emissive.r > 0.5 && ledMat.emissive.g < 0.1, 'rear LED material is emissive red');

// ---- v4.1.1 rear: no hanging rods / rails / tubes; parts other than wheels stay ≥ 10 cm off the road
check(!scene.getObjectByName('Diffuser_Rail') && !scene.getObjectByName('NitroSocket_Housing'), 'no chrome rail / exposed nitro tubes');
{
  let lowest = Infinity;
  let who = '';
  const v = new THREE.Vector3();
  const body = scene.getObjectByName('Body')!;
  body.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.y < lowest) {
        lowest = v.y;
        who = m.name;
      }
    }
  });
  check(lowest >= 0.1, `nothing hangs below the body: lowest body point ${lowest.toFixed(3)} m (${who})`);
  const bumper = new THREE.Box3().setFromObject(scene.getObjectByName('Rear_LowerBumper')!);
  const diff = new THREE.Box3().setFromObject(scene.getObjectByName('Diffuser')!);
  check(diff.min.y >= bumper.min.y - 0.001 && diff.max.z <= bumper.max.z + 0.001 && diff.min.x >= bumper.min.x, 'diffuser sits inside the lower bumper (recessed, fins attached)');
  for (const id of ['NitroSocket_L', 'NitroSocket_R']) {
    const so = scene.getObjectByName(id)!.getWorldPosition(new THREE.Vector3());
    check(Math.abs(so.x) < 0.52 && so.y > 0.155 && so.y < 0.3 && so.z > bumper.max.z - 0.12 && so.z <= bumper.max.z + 0.01, `${id} hidden in the diffuser recess (${so.toArray().map((n) => n.toFixed(2)).join(', ')})`);
  }
}
// ---- active spoiler: flush when closed, hinged at its front edge, trailing edge lifts a few cm
{
  const pivot = scene.getObjectByName('Spoiler_Pivot')!;
  const sp = scene.getObjectByName('Spoiler')!;
  const closed = new THREE.Box3().setFromObject(sp);
  check(closed.max.y < 0.79 && closed.min.y > 0.73, `closed spoiler flush with the deck (y ${closed.min.y.toFixed(3)}–${closed.max.y.toFixed(3)})`);
  pivot.rotation.x = -RENDER.spoilerAngle;
  scene.updateMatrixWorld(true);
  const raised = new THREE.Box3().setFromObject(sp);
  const lift = raised.max.y - closed.max.y;
  check(lift > 0.04 && lift < 0.12, `raised spoiler: trailing edge up ${(lift * 100).toFixed(1)} cm, no struts (hinge only)`);
  check(raised.max.z <= closed.max.z + 0.01, 'raised spoiler does not swing past the tail');
  pivot.rotation.x = 0;
  scene.updateMatrixWorld(true);
  check(sp.children.length === 0 && pivot.children.length === 1, 'spoiler is a single mesh on its pivot (nothing hangs off it)');
}

// in game: the visual width stays close to the hitbox (fair dodges)
const gameW = size.x * RENDER.carScale;
check(gameW < CAR_HALF.x * 2 * 1.35, `in-game width ${gameW.toFixed(2)} m vs hitbox ${(CAR_HALF.x * 2).toFixed(2)} m (≤ +35 %, mirrors included)`);

console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
