/**
 * XWAVE X1 — procedural 3D model builder (v2 refinement of the XWAVE_Car_3D_v1 blockout).
 *
 * Runs in a browser page (needs <canvas> for the textures and GLTFExporter's Blob path):
 *   node scripts/car/build-x1.mjs     → src/assets/models/xwave-x1.glb
 *
 * Reference priority: 01_authoritative/XWAVE_REAR_0_MASTER_DO_NOT_OVERRIDE.png (rear view). Every rear
 * measurement below was taken from that image (car height 1.165 m ↔ 635 px → 1.835 mm / px, centre
 * x = 603 px, ground y = 870 px on the 1200 px copy). Side / top proportions come from the secondary
 * views, which are AI-generated and not orthographic — treat them as loose.
 *
 * Conventions (same as src/assets/manifest.ts): metres, +Y up, front toward −Z, rear toward +Z,
 * ground at y = 0, origin on the ground between the axles.
 *
 * Node layout (the game drives these by name):
 *   X1
 *   ├─ Body                     everything sprung (paint, glass, lights, diffuser, interior…)
 *   ├─ Wheel_FL / FR / RL / RR  hub pivot (front ones steer around Y)
 *   │   ├─ Spin_xx              rotates around X with road speed: Tyre_xx, Rim_xx, Disc_xx
 *   │   └─ Caliper_xx           does not spin
 *   └─ NitroSocket_L / _R       empties at the nitro exits (+Z = flame direction)
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { x1BadgeCanvas, x1CarbonCanvas, x1TreadCanvas } from '../../src/render/car/x1Textures.ts';

// ------------------------------------------------------------------ dimensions
const Z_NOSE = -2.3;
const Z_TAIL = 2.2;
const AX_F = { z: -1.36, r: 0.355, w: 0.27, x: 0.825, arch: 0.4, xin: 0.64 };
const AX_R = { z: 1.3, r: 0.37, w: 0.38, x: 0.855, arch: 0.42, xin: 0.62 };

// ------------------------------------------------------------------ curve helpers
/** monotone cubic interpolation through [x, y] keys (no overshoot, C1) */
function curve(keys: [number, number][]) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const ramp = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// ------------------------------------------------------------------ body section functions (of z)
const hw = curve([[-2.3, 0.74], [-2.12, 0.86], [-1.8, 0.94], [-1.36, 0.975], [-0.9, 0.955], [-0.3, 0.925], [0.25, 0.93], [0.8, 0.985], [1.3, 1.02], [1.8, 1.005], [2.05, 0.975], [2.2, 0.94]]);
const yMaxW = curve([[-2.3, 0.36], [-1.36, 0.5], [0, 0.52], [1.3, 0.58], [2.2, 0.58]]);
const shY = curve([[-2.3, 0.46], [-2.0, 0.62], [-1.36, 0.745], [-0.9, 0.72], [-0.3, 0.76], [0.3, 0.79], [1.0, 0.83], [1.4, 0.835], [1.9, 0.79], [2.2, 0.76]]);
const deck = curve([[-2.3, 0.44], [-2.05, 0.56], [-1.6, 0.635], [-1.1, 0.7], [-0.95, 0.71], [1.7, 0.71], [1.9, 0.745], [2.2, 0.745]]);
const sill = curve([[-2.3, 0.2], [-2.0, 0.165], [0, 0.165], [0.8, 0.175], [1.85, 0.3], [2.2, 0.4]]);
const under = curve([[-2.3, 0.2], [-2.0, 0.13], [1.55, 0.13], [1.95, 0.27], [2.2, 0.36]]);
// greenhouse (glass canopy)
const gTop = curve([[-1.05, 0.73], [-0.75, 0.95], [-0.45, 1.12], [-0.15, 1.165], [0.3, 1.15], [0.8, 1.07], [1.3, 0.95], [1.7, 0.84], [1.88, 0.785]]);
const gHalfTop = curve([[-1.05, 0.66], [-0.75, 0.5], [-0.45, 0.405], [-0.15, 0.4], [0.5, 0.39], [1.3, 0.4], [1.88, 0.44]]);
const gHalfBase = curve([[-1.05, 0.68], [-0.6, 0.73], [-0.15, 0.72], [0.25, 0.5], [1.88, 0.48]]);
const gBaseY = curve([[-1.05, 0.72], [-0.6, 0.78], [-0.15, 0.8], [0.25, 1.0], [1.88, 0.76]]);
const G_Z0 = -1.05;
const G_Z1 = 1.88;

/** REAR_OPEN: behind the rear axle the wheel well stays open to the tail (the master shows the whole
 *  lower half of the rear tyres from behind; the body only covers them above this height) */
const REAR_OPEN = 0.44;
function archTop(z: number): { y: number; xin: number } | null {
  for (const a of [AX_F, AX_R]) {
    const dz = Math.abs(z - a.z);
    const y = dz < a.arch ? a.r + Math.sqrt(a.arch * a.arch - dz * dz) * 0.98 : 0;
    if (a === AX_R && z > a.z) return { y: Math.max(y, REAR_OPEN), xin: a.xin };
    if (dz < a.arch) return { y, xin: a.xin };
  }
  return null;
}

/** the top-of-side point where the body meets the hood / glass / buttress / rear deck */
function sideTop(z: number): [number, number] {
  const a = ramp(-1.12, -0.98, z);
  const b = ramp(-0.2, 0.25, z);
  const c = ramp(1.75, 1.95, z);
  const hood: [number, number] = [mix(0.4, 0.5, ramp(-2.3, -1.6, z)), deck(z)];
  const cab: [number, number] = [gHalfBase(z) - 0.02, gBaseY(z) - 0.01];
  const but: [number, number] = [gHalfTop(z) + 0.045, gTop(z) - 0.04];
  const rear: [number, number] = [0.6, 0.745];
  const w = [1 - a, a * (1 - b), a * b * (1 - c), a * b * c];
  const pts = [hood, cab, but, rear];
  return [pts.reduce((s, p, i) => s + p[0] * w[i], 0), pts.reduce((s, p, i) => s + p[1] * w[i], 0)];
}

/** Chaikin corner cutting on an open polyline, endpoints kept */
function chaikin(p: [number, number][], it = 2): [number, number][] {
  let pts = p;
  for (let k = 0; k < it; k++) {
    const o: [number, number][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      if (i > 0) o.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]);
      if (i < pts.length - 2) o.push([0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    o.push(pts[pts.length - 1]);
    pts = o;
  }
  return pts;
}

/** side of the body at z, from the top-of-side point down to the bottom centre (x ≥ 0) */
function sideHalf(z: number): [number, number][] {
  const W = hw(z);
  const arch = archTop(z);
  const bot = Math.max(sill(z), arch?.y ?? 0);
  const xin = arch ? arch.xin : W * 0.86;
  const ub = under(z);
  const sh = shY(z);
  const ym = yMaxW(z);
  const side: [number, number][] = [sideTop(z), [W - 0.13, sh], [W - 0.035, (sh + ym) / 2 + 0.03], [W, ym], [W - 0.01, bot + 0.07], [W - 0.05, bot]];
  return [...chaikin(side, 2), [xin, bot], [xin, ub], [0, ub]];
}
/** top strip between the two top-of-side points (hood / deck, or the inner faces under the glass) */
function topRow(z: number): [number, number][] {
  const [x, y] = sideTop(z);
  const c = deck(z);
  const row: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8; // −x … +x
    const u = Math.abs(t * 2 - 1); // 1 at the edges, 0 at the centre
    row.push([(t * 2 - 1) * x, c + (y - c) * Math.pow(u, 1.6)]);
  }
  return row;
}
/** body side row: left top-of-side → down → bottom centre → up → right top-of-side */
function sideRow(z: number): [number, number][] {
  const h = sideHalf(z);
  return [...h.map(([x, y]) => [-x, y] as [number, number]), ...h.slice(0, -1).reverse()];
}

/** loft rows of (x, y) points along z. flip = which side the triangles face */
function loftRows(zs: number[], row: (z: number) => [number, number][], flip: boolean) {
  const pos: number[] = [];
  const idx: number[] = [];
  let n = 0;
  for (const z of zs) {
    const r = row(z);
    n = r.length;
    for (const [x, y] of r) pos.push(x, y, z);
  }
  for (let k = 0; k < zs.length - 1; k++)
    for (let i = 0; i < n - 1; i++) {
      const a = k * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      if (flip) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** flat end cap (fan) closing the body at z; front = faces −z */
function bodyCap(z: number, front: boolean) {
  const top = topRow(z);
  const side = sideRow(z).slice(1, -1).reverse();
  const loop = [...top, ...side];
  const pos: number[] = [];
  const idx: number[] = [];
  let cx = 0;
  let cy = 0;
  for (const [x, y] of loop) {
    pos.push(x, y, z);
    cx += x;
    cy += y;
  }
  const ci = loop.length;
  pos.push(cx / ci, cy / ci, z);
  for (let i = 0; i < ci; i++) {
    const a = i;
    const b = (i + 1) % ci;
    if (front) idx.push(ci, a, b);
    else idx.push(ci, b, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function stations(z0: number, z1: number, step: number, extra: number[] = []) {
  const s = new Set<number>();
  for (let z = z0; z < z1 - 1e-6; z += step) s.add(+z.toFixed(4));
  s.add(z1);
  for (const e of extra) if (e > z0 && e < z1) s.add(+e.toFixed(4));
  return [...s].sort((a, b) => a - b);
}

// ------------------------------------------------------------------ materials
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const badgeTex = tex(x1BadgeCanvas());
badgeTex.wrapS = badgeTex.wrapT = THREE.ClampToEdgeWrapping;
const M = {
  paint: new THREE.MeshPhysicalMaterial({ name: 'X1_Paint', color: 0xf2f4f8, metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
  black: new THREE.MeshPhysicalMaterial({ name: 'X1_GlossBlack', color: 0x0b0c0f, metalness: 0.3, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
  satin: new THREE.MeshPhysicalMaterial({ name: 'X1_SatinBlack', color: 0x0c0d10, metalness: 0.15, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
  carbon: new THREE.MeshStandardMaterial({ name: 'X1_Carbon', color: 0x3a3a3a, map: tex(x1CarbonCanvas()), metalness: 0.35, roughness: 0.42, side: THREE.DoubleSide }),
  chrome: new THREE.MeshStandardMaterial({ name: 'X1_Chrome', color: 0xc8ccd2, metalness: 1, roughness: 0.22 }),
  glass: new THREE.MeshPhysicalMaterial({ name: 'X1_Glass', color: 0x010204, metalness: 0.0, roughness: 0.32, transparent: true, opacity: 0.84, envMapIntensity: 0.12 }),
  led: new THREE.MeshStandardMaterial({ name: 'X1_RearLED', color: 0xff0010, emissive: 0xff0010, emissiveIntensity: 1.5, roughness: 0.3 }),
  ledCore: new THREE.MeshStandardMaterial({ name: 'X1_RearLEDCore', color: 0xffc0c0, emissive: 0xff5050, emissiveIntensity: 1.8, roughness: 0.3 }),
  ledSoft: new THREE.MeshStandardMaterial({ name: 'X1_RedMarker', color: 0xff0018, emissive: 0xff0018, emissiveIntensity: 1.3, roughness: 0.3 }),
  ledHousing: new THREE.MeshPhysicalMaterial({ name: 'X1_LEDHousing', color: 0x1a0507, metalness: 0.2, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
  badge: new THREE.MeshStandardMaterial({ name: 'X1_Badge', color: 0xffffff, map: badgeTex, emissive: 0xffffff, emissiveMap: badgeTex, emissiveIntensity: 1.6, transparent: true, alphaTest: 0.05 }),
  head: new THREE.MeshStandardMaterial({ name: 'X1_Headlight', color: 0x9fd8ff, emissive: 0x6cc4ff, emissiveIntensity: 2.4, roughness: 0.2 }),
  interior: new THREE.MeshStandardMaterial({ name: 'X1_Interior', color: 0x07080a, metalness: 0.1, roughness: 0.75, envMapIntensity: 0.3 }),
  seatTrim: new THREE.MeshStandardMaterial({ name: 'X1_SeatTrim', color: 0xff3a2a, emissive: 0xff2a1a, emissiveIntensity: 1.2, roughness: 0.5 }),
  tyre: new THREE.MeshStandardMaterial({ name: 'X1_Tyre', color: 0xffffff, map: tex(x1TreadCanvas()), metalness: 0, roughness: 0.88 }),
  rim: new THREE.MeshStandardMaterial({ name: 'X1_Rim', color: 0x24272c, metalness: 0.85, roughness: 0.32 }),
  disc: new THREE.MeshStandardMaterial({ name: 'X1_Disc', color: 0x6b6f76, metalness: 0.9, roughness: 0.45 }),
  brake: new THREE.MeshStandardMaterial({ name: 'X1_Brake', color: 0xd0141f, metalness: 0.3, roughness: 0.35 }),
};

// ------------------------------------------------------------------ geometry helpers
/** bring a geometry to a common layout (indexed, position + normal + uv) so parts can be merged */
function norm(g: THREE.BufferGeometry, m?: THREE.Matrix4) {
  if (m) g.applyMatrix4(m);
  if (!g.index) {
    const n = g.getAttribute('position').count;
    g.setIndex([...Array(n).keys()]);
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}
const T = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(...s));

/** extrude a 2D outline (x, y) along +z by depth, front face at z0 */
function slab(outline: [number, number][], z0: number, depth: number, bevel = 0) {
  const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, z0);
  return g;
}
/** extrude an outline drawn in the (z, y) side plane across x (thickness centred on x0) */
function finYZ(outline: [number, number][], x0: number, thick: number) {
  const sh = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false });
  // shape x → world z, shape y → world y, extrude z → world x
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  g.translate(x0 - thick / 2, 0, 0);
  return g;
}
const mirrorX = (pts: [number, number][]): [number, number][] => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y] as [number, number])];
function planarUV(g: THREE.BufferGeometry, axisA: 'x' | 'y' | 'z', axisB: 'x' | 'y' | 'z', scale: number) {
  const p = g.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  const get = (i: number, a: string) => (a === 'x' ? p.getX(i) : a === 'y' ? p.getY(i) : p.getZ(i));
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = get(i, axisA) * scale;
    uv[i * 2 + 1] = get(i, axisB) * scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

class Parts {
  map = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
  add(name: string, mat: THREE.Material, g: THREE.BufferGeometry, m?: THREE.Matrix4) {
    if (!this.map.has(name)) this.map.set(name, { mat, geos: [] });
    this.map.get(name)!.geos.push(norm(g, m));
  }
  meshes() {
    return [...this.map].map(([name, { mat, geos }]) => {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false)!, mat);
      mesh.name = name;
      return mesh;
    });
  }
}

// ------------------------------------------------------------------ the body
function buildBody(P: Parts) {
  const extra: number[] = [];
  for (const a of [AX_F, AX_R]) for (let k = -1; k <= 1; k += 0.1) extra.push(a.z + a.arch * k, a.z + a.arch * (k > 0 ? 0.999 : -0.999));
  const zs = stations(Z_NOSE, Z_TAIL, 0.03, extra);
  P.add('Body_Paint', M.paint, loftRows(zs, sideRow, true));
  // top strip: painted on the hood and the rear deck, dark interior under the glass
  P.add('Body_Paint', M.paint, loftRows(zs.filter((z) => z <= -0.98), topRow, false));
  P.add('Interior', M.interior, loftRows(zs.filter((z) => z >= -0.99 && z <= 1.93), topRow, false));
  P.add('Body_Paint', M.paint, loftRows(zs.filter((z) => z >= 1.92), topRow, false));
  P.add('Body_Paint', M.paint, bodyCap(Z_NOSE, true));
  P.add('Body_Paint', M.paint, bodyCap(Z_TAIL, false));

  // greenhouse: glass canopy (windscreen, side windows, roof, fastback glass)
  const gHalf = (z: number): [number, number][] => {
    const b = ramp(-0.2, 0.25, z);
    const top = gTop(z);
    const ht = gHalfTop(z);
    const base: [number, number] = [mix(gHalfBase(z), ht + 0.055, b), mix(gBaseY(z), top - 0.03, b)];
    const pts: [number, number][] = [[0, top + 0.012], [ht - 0.05, top - 0.004], [ht + 0.06, top - 0.05], base];
    return chaikin(pts, 2);
  };
  const gz = stations(G_Z0, G_Z1, 0.03);
  const glassGeo = (() => {
    const pos: number[] = [];
    const idx: number[] = [];
    let n = 0;
    for (const z of gz) {
      const h = gHalf(z);
      const row: [number, number][] = [...h.slice().reverse().map(([x, y]) => [-x, y] as [number, number]), ...h.slice(1)];
      n = row.length;
      for (const [x, y] of row) pos.push(x, y, z);
    }
    for (let k = 0; k < gz.length - 1; k++)
      for (let i = 0; i < n - 1; i++) {
        const a = k * n + i;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();
  P.add('Glass_Canopy', M.glass, glassGeo);
  // glass end at the rear deck (small vertical face) — closes the canopy
  {
    const h = gHalf(G_Z1);
    const out = mirrorX(h.map(([x, y]) => [x, y] as [number, number]).reverse());
    const sh = out.map(([x, y]) => [x, Math.max(y, 0.745)] as [number, number]);
    P.add('Glass_Canopy', M.glass, new THREE.ShapeGeometry(new THREE.Shape(sh.map(([x, y]) => new THREE.Vector2(x, y)))), T(0, 0, G_Z1));
  }

  // ---- rear face (z = Z_TAIL), measured from the master
  const zf = Z_TAIL + 0.003;
  // deck well between the buttresses: the active spoiler (separate node, see buildSpoiler) lies flush
  // in it; when the spoiler rises the well shows black, never body paint
  P.add('Body_GlossBlack', M.black, new THREE.BoxGeometry(0.94, 0.012, 0.36), T(0, 0.742, 2.03));
  // LED housing: smoked long hexagon around the light blade
  P.add('Rear_LEDHousing', M.ledHousing, slab([[-0.88, 0.632], [0.88, 0.632], [0.945, 0.596], [0.92, 0.566], [-0.92, 0.566], [-0.945, 0.596]], zf - 0.02, 0.025, 0.003));
  // continuous LED blade: top line with chevron ends + thin lower return line
  const blade: [number, number][] = [[0.0, 0.621], [0.866, 0.621], [0.938, 0.588], [0.925, 0.573], [0.856, 0.599], [0.0, 0.599]];
  const bl = (pts: [number, number][]) => {
    const right = pts;
    const left = right.map(([x, y]) => [-x, y] as [number, number]);
    // outline: right top → right tip → right bottom → centre → left bottom → left tip → left top
    return [right[1], right[2], right[3], right[4], left[4], left[3], left[2], left[1]];
  };
  P.add('Rear_LED', M.led, slab(bl(blade), zf + 0.006, 0.006));
  // hot inner line along the blade (the master's near-white core)
  P.add('Rear_LEDCore', M.ledCore, slab([[-0.85, 0.6085], [0.85, 0.6085], [0.85, 0.6125], [-0.85, 0.6125]], zf + 0.0125, 0.002));
  P.add('Rear_LED', M.led, slab([[-0.83, 0.5735], [0.83, 0.5735], [0.83, 0.5795], [-0.83, 0.5795]], zf + 0.006, 0.004));
  // black badge panel (trapezoid under the light), XWAVE badge centred on it
  P.add('Rear_BadgePanel', M.black, slab([[-0.56, 0.566], [0.56, 0.566], [0.47, 0.485], [-0.47, 0.485]], zf, 0.012, 0.004));
  const badge = new THREE.PlaneGeometry(0.29, 0.0725);
  P.add('Badge_XWAVE', M.badge, badge, T(0, 0.528, zf + 0.022));
  // ---- lower rear bumper (v3, Tesla-Roadster-inspired integration, XWAVE layout):
  // one solid satin-black body from the white bumper band down, wrapping between the rear tyres,
  // with a recessed diffuser opening. No rods, rails, tubes or fins hanging below it.
  {
    const BUMPER_FACE = Z_TAIL + 0.035;
    const BUMPER_FRONT = 1.8;
    const right: [number, number][] = [[0.84, 0.405], [0.862, 0.39], [0.85, 0.36], [0.8, 0.325], [0.7, 0.26], [0.655, 0.2], [0.635, 0.145], [0.6, 0.12]];
    const outline = [...right.map(([x, y]) => new THREE.Vector2(x, y)), ...right.slice().reverse().map(([x, y]) => new THREE.Vector2(-x, y))];
    const shape = new THREE.Shape(outline);
    // diffuser opening: rounded rectangle, the recess goes 0.1 m into the bumper
    const hole = new THREE.Path();
    const hx = 0.52;
    const y0 = 0.155;
    const y1 = 0.3;
    const rr = 0.035;
    hole.moveTo(-hx + rr, y0);
    hole.lineTo(hx - rr, y0);
    hole.quadraticCurveTo(hx, y0, hx, y0 + rr);
    hole.lineTo(hx, y1 - rr);
    hole.quadraticCurveTo(hx, y1, hx - rr, y1);
    hole.lineTo(-hx + rr, y1);
    hole.quadraticCurveTo(-hx, y1, -hx, y1 - rr);
    hole.lineTo(-hx, y0 + rr);
    hole.quadraticCurveTo(-hx, y0, -hx + rr, y0);
    shape.holes.push(hole);
    const depth = BUMPER_FACE - BUMPER_FRONT;
    const bumper = new THREE.ExtrudeGeometry(shape, { depth: depth - 0.024, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 6 });
    bumper.translate(0, 0, BUMPER_FRONT + 0.012);
    P.add('Rear_LowerBumper', M.satin, bumper);
    // recess back wall + three restrained fins joined to the wall, floor and ceiling of the recess
    const back = BUMPER_FACE - 0.1;
    P.add('Diffuser', M.carbon, planarUV(new THREE.PlaneGeometry(hx * 2, y1 - y0), 'x', 'y', 5), T(0, (y0 + y1) / 2, back));
    for (const x of [-0.26, 0, 0.26]) P.add('Diffuser', M.satin, new THREE.BoxGeometry(0.012, y1 - y0, 0.09), T(x, (y0 + y1) / 2, back + 0.045));
    // red markers and the centre brake light on the bumper face
    for (const s of [-1, 1]) P.add('Rear_Markers', M.ledSoft, slab([[0.57 * s, 0.355], [0.77 * s, 0.352], [0.76 * s, 0.37], [0.575 * s, 0.374]], BUMPER_FACE + 0.001, 0.004));
    P.add('Rear_Markers', M.ledSoft, new THREE.BoxGeometry(0.22, 0.014, 0.006), T(0, 0.33, BUMPER_FACE + 0.004));
  }

  // ---- roof stop light (top of the rear glass)
  {
    const z = 0.32;
    const y = gTop(z) + 0.012;
    const slope = Math.atan2(gTop(z + 0.05) - gTop(z - 0.05), 0.1);
    P.add('Body_GlossBlack', M.black, new THREE.BoxGeometry(0.32, 0.016, 0.07), T(0, y, z, -slope));
    P.add('Light_RoofStop', M.led, new THREE.BoxGeometry(0.2, 0.006, 0.035), T(0, y + 0.009, z + 0.005, -slope));
  }

  // ---- front: splitter, intake, headlights
  P.add('Body_GlossBlack', M.black, slab([[-0.78, 0.11], [0.78, 0.11], [0.8, 0.14], [-0.8, 0.14]], -2.36, 0.5));
  P.add('Body_GlossBlack', M.black, slab([[-0.5, 0.2], [0.5, 0.2], [0.42, 0.29], [-0.42, 0.29]], Z_NOSE - 0.004, 0.01));
  for (const s of [-1, 1]) {
    const hz = -2.1;
    const hy = deck(hz) + 0.015;
    P.add('Light_Head', M.head, slab([[0, 0], [0.34, 0.035], [0.34, 0.05], [0, 0.022]].map(([x, y]) => [x * s, y] as [number, number]), 0, 0.012), T(0.36 * s, hy - 0.02, hz, -0.35, 0, 0));
  }

  // ---- sides: intakes ahead of the rear wheels, skirts
  for (const s of [-1, 1]) {
    const x = hw(0.5) + 0.003;
    const intake = finYZ([[0.2, 0.42], [0.82, 0.46], [0.86, 0.7], [0.45, 0.62]], 0, 0.01);
    P.add('Body_GlossBlack', M.black, intake, T(x * s, 0, 0));
    P.add('Body_GlossBlack', M.black, finYZ([[-1.0, 0.15], [0.86, 0.17], [0.86, 0.24], [-1.0, 0.22]], 0, 0.03), T((hw(-0.1) - 0.005) * s, 0, 0));
    // (v4.1.2: no side mirrors — mirrorless body, as in the Step 03.1 reference)
  }

  // ---- interior (seen through the glass): dark tub, two seats with red trim, dash
  P.add('Interior', M.interior, new THREE.BoxGeometry(1.24, 0.12, 2.5), T(0, 0.66, 0.45));
  P.add('Interior', M.interior, new THREE.BoxGeometry(1.1, 0.08, 0.26), T(0, 0.76, -0.62));
  for (const s of [-1, 1]) {
    const back = new THREE.BoxGeometry(0.4, 0.42, 0.09, 1, 1, 1);
    P.add('Interior', M.interior, back, T(0.29 * s, 0.87, 0.2, -0.3));
    P.add('Interior', M.interior, new THREE.BoxGeometry(0.42, 0.08, 0.45), T(0.29 * s, 0.72, -0.05));
    // red trim outline on the seat back (follows its edges)
    const e = 0.012;
    for (const [w, h, x, y] of [[e, 0.38, -0.19, 0], [e, 0.38, 0.19, 0], [0.38, e, 0, 0.195]] as [number, number, number, number][]) {
      const m = T(0.29 * s, 0.87, 0.2, -0.3).multiply(T(x, y, 0.05));
      P.add('Interior_Trim', M.seatTrim, new THREE.BoxGeometry(w, h, 0.012), m);
    }
  }
}

// ------------------------------------------------------------------ wheels
function wheel(name: string, ax: typeof AX_F, side: -1 | 1, front: boolean) {
  const hub = new THREE.Group();
  hub.name = `Wheel_${name}`;
  hub.position.set(ax.x * side, ax.r, ax.z);
  const spin = new THREE.Group();
  spin.name = `Spin_${name}`;
  hub.add(spin);
  const R = ax.r;
  const w = ax.w;
  const rimR = R - 0.115;
  // tyre: lathe profile (radius, axial), around Y → turned to the X axle
  const prof: THREE.Vector2[] = [];
  const h = w / 2;
  const pts: [number, number][] = [
    [rimR - 0.005, -h + 0.02], [R - 0.07, -h], [R - 0.03, -h + 0.008], [R - 0.008, -h + 0.03], [R, -h + 0.06],
    [R, h - 0.06], [R - 0.008, h - 0.03], [R - 0.03, h - 0.008], [R - 0.07, h], [rimR - 0.005, h - 0.02],
  ];
  for (const [r, a] of pts) prof.push(new THREE.Vector2(r, a));
  const tyre = new THREE.LatheGeometry(prof, 56);
  // UVs: u around the tyre (tread repeats 28×), v across the width
  {
    const uv = tyre.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 28);
  }
  tyre.rotateZ(Math.PI / 2);
  const tm = new THREE.Mesh(norm(tyre), M.tyre);
  tm.name = `Tyre_${name}`;
  spin.add(tm);
  // rim: barrel + lip + 10 split spokes + hub, the face toward the outside
  const out = side; // +x for right wheels
  const parts: THREE.BufferGeometry[] = [];
  parts.push(norm(new THREE.CylinderGeometry(rimR, rimR, w * 0.86, 40, 1, true), T(0, 0, 0, 0, 0, Math.PI / 2)));
  parts.push(norm(new THREE.TorusGeometry(rimR, 0.012, 6, 40), T(out * w * 0.42, 0, 0, 0, Math.PI / 2)));
  parts.push(norm(new THREE.CylinderGeometry(0.065, 0.075, 0.08, 16), T(out * w * 0.32, 0, 0, 0, 0, Math.PI / 2)));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    for (const d of [-0.05, 0.05]) {
      const len = rimR - 0.07;
      const sp = new THREE.BoxGeometry(0.03, len, 0.016);
      sp.translate(0, 0.07 + len / 2, 0);
      parts.push(norm(sp, T(out * (w * 0.33), 0, 0, a + d, 0, 0).multiply(T(0, 0, 0, 0, Math.PI / 2, 0))));
    }
  }
  const rim = new THREE.Mesh(mergeGeometries(parts)!, M.rim);
  rim.name = `Rim_${name}`;
  spin.add(rim);
  const disc = new THREE.Mesh(norm(new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.028, 32), T(out * 0.02, 0, 0, 0, 0, Math.PI / 2)), M.disc);
  disc.name = `Disc_${name}`;
  spin.add(disc);
  const cal = new THREE.Mesh(norm(new THREE.BoxGeometry(0.07, 0.14, 0.09), T(out * 0.05, rimR * 0.62, front ? 0.07 : -0.07, front ? 0.45 : -0.45)), M.brake);
  cal.name = `Caliper_${name}`;
  hub.add(cal);
  return hub;
}

// ------------------------------------------------------------------ active spoiler
/** hinge line of the rear-deck spoiler (front edge, flush with the deck) */
export const SPOILER_HINGE = { y: 0.752, z: 1.9 };
/**
 * XWAVE active spoiler: the black rear-deck lip between the buttresses is a flap hinged at its front
 * edge. Closed it is flush with the deck; the game rotates `Spoiler_Pivot` around X (negative =
 * trailing edge up) while nitro runs. No struts: the hinge is the only connection.
 */
function buildSpoiler() {
  const pivot = new THREE.Group();
  pivot.name = 'Spoiler_Pivot';
  pivot.position.set(0, SPOILER_HINGE.y, SPOILER_HINGE.z);
  // aerofoil section in the (z, y) side plane, relative to the hinge
  const sec: [number, number][] = [[0, -0.003], [0.15, 0.011], [0.3, 0.02], [0.335, 0.027], [0.335, 0.013], [0.2, 0.0], [0.02, -0.009]];
  const g = finYZ(sec, 0, 0.92);
  const m = new THREE.Mesh(norm(g), M.black);
  m.name = 'Spoiler';
  pivot.add(m);
  return pivot;
}

// ------------------------------------------------------------------ body length (v4.1.2)
/**
 * Visual length cut as a fraction of the 4.60 m design length. Only the front half is shortened:
 * 60 % from the nose overhang, 40 % between the front arch and the cabin (shorter hood / wheelbase).
 * The front wheel-arch zone keeps scale 1 so the arches stay round, and everything behind
 * WARP_FIX (the cabin, buttresses, rear end, bumper, spoiler, sockets) is untouched.
 */
export const LENGTH_CUT = 0.08;
const DESIGN_LEN = 4.6;
const WARP_NOSE = -2.4;
const WARP_FIX = 0.0;
const ARCH_A = AX_F.z - 0.45;
const ARCH_B = AX_F.z + 0.45;
function warpFn(cut: number) {
  const c = cut * DESIGN_LEN;
  const lenA = ARCH_A - WARP_NOSE;
  const lenC = WARP_FIX - ARCH_B;
  const kA = (lenA - 0.6 * c) / lenA;
  const kC = (lenC - 0.4 * c) / lenC;
  const bC = WARP_FIX - lenC * kC; // world z of ARCH_B
  const shiftB = bC - ARCH_B; // the arch zone just moves
  const aA = ARCH_A + shiftB; // world z of ARCH_A
  /** world z of a design z, and the local z scale there */
  return (z: number): [number, number] => {
    if (z >= WARP_FIX) return [z, 1];
    if (z >= ARCH_B) return [WARP_FIX - (WARP_FIX - z) * kC, kC];
    if (z >= ARCH_A) return [z + shiftB, 1];
    return [aA - (ARCH_A - z) * kA, kA];
  };
}
/** apply the length warp to a geometry (positions; normals follow the local z scale) */
function warpGeometry(g: THREE.BufferGeometry, W: (z: number) => [number, number]) {
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const [z, k] = W(p.getZ(i));
    p.setZ(i, z);
    if (n && k !== 1) {
      v.set(n.getX(i), n.getY(i), n.getZ(i) / k).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
  }
  p.needsUpdate = true;
  if (n) n.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
}

// ------------------------------------------------------------------ assemble + export
export function buildX1(opts: { cut?: number } = {}): THREE.Group {
  const W = warpFn(opts.cut ?? LENGTH_CUT);
  const root = new THREE.Group();
  root.name = 'X1';
  const body = new THREE.Group();
  body.name = 'Body';
  root.add(body);
  const P = new Parts();
  buildBody(P);
  for (const m of P.meshes()) {
    warpGeometry(m.geometry, W);
    body.add(m);
  }
  const front = { ...AX_F, z: W(AX_F.z)[0] };
  root.add(wheel('FL', front, -1, true), wheel('FR', front, 1, true), wheel('RL', AX_R, -1, false), wheel('RR', AX_R, 1, false));
  body.add(buildSpoiler());
  for (const s of [-1, 1] as const) {
    const n = new THREE.Object3D();
    n.name = s < 0 ? 'NitroSocket_L' : 'NitroSocket_R';
    n.position.set(0.38 * s, 0.2, Z_TAIL + 0.03);
    root.add(n);
  }
  return root;
}

export async function exportX1(opts: { cut?: number } = {}): Promise<ArrayBuffer> {
  const root = buildX1(opts);
  const ex = new GLTFExporter();
  const glb = await ex.parseAsync(root, { binary: true, onlyVisible: false, includeCustomExtensions: false });
  return glb as ArrayBuffer;
}

(window as unknown as { __x1: unknown }).__x1 = { buildX1, exportX1, THREE };
