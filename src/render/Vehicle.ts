import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Spring, clamp, clamp01, lerp } from '../core/math.ts';
import { HEIGHT, TYRE } from '../config.ts';
import { glowTexture, logoTexture, rearBadgeTexture, treadTexture, wheelBlurTexture, wheelFaceTexture } from './textures.ts';
import { mergeByMaterial } from './merge.ts';
import type { Player } from '../gameplay/Player.ts';
import x1Back from '../assets/images/car/x1-back.webp';
import x1BackLeft from '../assets/images/car/x1-backleft.webp';
import x1BackRight from '../assets/images/car/x1-backright.webp';
import x1Left from '../assets/images/car/x1-left.webp';
import x1Right from '../assets/images/car/x1-right.webp';
import x1Front from '../assets/images/car/x1-front.webp';
import x1FrontLeft from '../assets/images/car/x1-frontleft.webp';
import x1FrontRight from '../assets/images/car/x1-frontright.webp';
import x1Aura from '../assets/images/car/x1-aura.webp';

/**
 * XWAVE X1 rendered from the studio renders: 8 views around the car (45° apart).
 * index 0 = seen from behind, going clockwise seen from above (behind-right, right, …).
 * h = on-screen height of that view in metres (the car is ~1.1 m tall).
 */
const X1_VIEWS: { url: string; h: number }[] = [
  { url: x1Back, h: 1.12 },
  { url: x1BackRight, h: 1.22 },
  { url: x1Right, h: 1.15 },
  { url: x1FrontRight, h: 1.22 },
  { url: x1Front, h: 1.12 },
  { url: x1FrontLeft, h: 1.22 },
  { url: x1Left, h: 1.15 },
  { url: x1BackLeft, h: 1.22 },
];

export type CarShape = 'gt' | 'wedge' | 'muscle' | 'bubble' | 'cyber';

export interface VehicleSkin {
  id: string;
  name: string;
  /** body style (silhouette); colourways share a shape */
  shape: CarShape;
  /** short class label shown in the garage */
  cls: string;
  body: number;
  trim: number;
  glass: number;
  glow: number;
  accent: number;
  price: number;
}

export const SKINS: VehicleSkin[] = [
  { id: 'pearl', name: 'XWAVE Pearl', shape: 'gt', cls: 'GT Coupe', body: 0xf3f5fa, trim: 0xb9c2d3, glass: 0x0a0d16, glow: 0x39b6ff, accent: 0x1c64ff, price: 0 },
  { id: 'midnight', name: 'Midnight Volt', shape: 'gt', cls: 'GT Coupe', body: 0x1b1f2b, trim: 0x9aa6bd, glass: 0x05060a, glow: 0x3cf2ff, accent: 0x00d0ff, price: 750 },
  { id: 'aurora', name: 'Aurora Bloom', shape: 'gt', cls: 'GT Coupe', body: 0xb98cff, trim: 0xd6c6f2, glass: 0x140a24, glow: 0xc45bff, accent: 0xff4fd8, price: 1500 },
  { id: 'solar', name: 'Solar Flare', shape: 'gt', cls: 'GT Coupe', body: 0xff9a2e, trim: 0xe0b46a, glass: 0x1a0d05, glow: 0xffa21a, accent: 0xff5a1f, price: 2500 },
  { id: 'wedge', name: 'Hyper Wedge', shape: 'wedge', cls: 'Hypercar', body: 0xe8203a, trim: 0x2a2d36, glass: 0x07080c, glow: 0xff6a2a, accent: 0xffd23d, price: 4000 },
  { id: 'muscle', name: 'Thunder Muscle', shape: 'muscle', cls: 'Muscle', body: 0x1f5bff, trim: 0xc9d2e6, glass: 0x05070d, glow: 0xffffff, accent: 0xffffff, price: 6000 },
  { id: 'bubble', name: 'Orbit Pod', shape: 'bubble', cls: 'Pod Racer', body: 0xffd23d, trim: 0x30343f, glass: 0x0b1830, glow: 0x3dff8b, accent: 0x3dff8b, price: 8000 },
  { id: 'cyber', name: 'Cyber Blade', shape: 'cyber', cls: 'Cyber Truck', body: 0xaeb6c4, trim: 0x5d6575, glass: 0x05060a, glow: 0xff2ad4, accent: 0x3cf2ff, price: 12000 },
  { id: 'legend', name: 'Gold Legend', shape: 'wedge', cls: 'Hypercar · Legend', body: 0xffc21a, trim: 0x1a1a1a, glass: 0x140c00, glow: 0xfff3a0, accent: 0xffffff, price: 20000 },
];

const BLUE = new THREE.Color(0x39b6ff);

/** glowing blue XWAVE lettering for the rear fascia (canvas texture) */
let xwaveTex: THREE.CanvasTexture | null = null;
function xwaveGlowText() {
  if (xwaveTex) return xwaveTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.font = 'italic 900 80px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#3aa8ff';
  g.shadowBlur = 22;
  g.fillStyle = '#7fd0ff';
  g.fillText('XWAVE', 256, 66);
  g.shadowBlur = 0;
  g.fillStyle = '#e8f6ff';
  g.fillText('XWAVE', 256, 66);
  xwaveTex = new THREE.CanvasTexture(c);
  xwaveTex.colorSpace = THREE.SRGBColorSpace;
  xwaveTex.anisotropy = 8;
  return xwaveTex;
}
const ORANGE = new THREE.Color(0xff8a1f);

interface Pod {
  pivot: THREE.Group;
  /** stands the pod up as a wheel (driving) or lays it flat as a thruster (flying) */
  orient: THREE.Group;
  /** wheel rotation */
  spin: THREE.Group;
  /** thruster flame + glow, always pointing at the ground */
  fx: THREE.Group;
  ring: THREE.Mesh;
  flame: THREE.Mesh;
  flameMat: THREE.MeshBasicMaterial;
  glow: THREE.Sprite;
  side: -1 | 1;
  front: boolean;
}

/**
 * Procedural XWAVE flying car — compact, rounded, glossy "premium toy".
 * Hierarchy: root (position) → bank (roll/yaw) → pitch → squash → parts.
 * Pose is driven entirely by the gameplay Player state each frame.
 */
interface Station {
  z: number;
  /** half width */
  hw: number;
  /** bottom / top y */
  yb: number;
  yt: number;
  /** superellipse exponent (2 = ellipse, higher = boxier) */
  n: number;
}

/** Smooth body: cross-sections (superellipses) lofted along z, with end caps. */
function loft(st: Station[], mat: THREE.Material, seg = 28) {
  const pos: number[] = [];
  const idx: number[] = [];
  const ring = (s: Station) => {
    const out: [number, number, number][] = [];
    const mid = (s.yb + s.yt) / 2;
    const hh = (s.yt - s.yb) / 2;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const e = 2 / s.n;
      // flatter belly, rounder shoulders
      const x = Math.sign(c) * Math.pow(Math.abs(c), e) * s.hw;
      const y = mid + Math.sign(sn) * Math.pow(Math.abs(sn), sn > 0 ? e * 1.15 : e * 0.6) * hh;
      out.push([x, y, s.z]);
    }
    return out;
  };
  const rings = st.map(ring);
  for (const r of rings) for (const v of r) pos.push(...v);
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a = k * seg + i;
      const b = k * seg + ((i + 1) % seg);
      const c = (k + 1) * seg + i;
      const d = (k + 1) * seg + ((i + 1) % seg);
      idx.push(a, b, c, b, d, c);
    }
  }
  // caps
  for (const [k, flip] of [[0, true], [rings.length - 1, false]] as const) {
    const s = st[k];
    const ci = pos.length / 3;
    pos.push(0, (s.yb + s.yt) / 2, s.z);
    for (let i = 0; i < seg; i++) {
      const a = k * seg + i;
      const b = k * seg + ((i + 1) % seg);
      if (flip) idx.push(ci, b, a);
      else idx.push(ci, a, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

export class Vehicle {
  root = new THREE.Group();
  private bank = new THREE.Group();
  private pitch = new THREE.Group();
  private squashG = new THREE.Group();
  private pods: Pod[] = [];
  private wings: THREE.Group[] = [];
  private shellParts: THREE.Object3D[] = [];
  /** alternative body styles (built once, toggled per skin) */
  private shapes: Partial<Record<CarShape, THREE.Group>> = {};
  private redMat!: THREE.MeshBasicMaterial;
  private fasciaMat!: THREE.MeshPhysicalMaterial;
  private headlights: THREE.MeshBasicMaterial;
  private tailbar: THREE.MeshBasicMaterial;
  private underglow: THREE.Mesh;
  private bodyMat: THREE.MeshPhysicalMaterial;
  private trimMat: THREE.MeshStandardMaterial;
  private glassMat: THREE.MeshPhysicalMaterial;
  private glowMat: THREE.MeshBasicMaterial;
  // softer, near-critically-damped springs: smooth lean in and out of lane changes
  private roll = new Spring(0, 110, 17);
  private yaw = new Spring(0, 110, 18);
  private pitchS = new Spring(0, 90, 16);
  private time = 0;
  private lastY = 1;
  private skin: VehicleSkin = SKINS[0];
  /** extra spin for celebration barrel roll (radians remaining) */
  private celebrate = 0;
  private flameColor = new THREE.Color();
  private wheelAngle = 0;
  private wheelBlurMat!: THREE.MeshBasicMaterial;
  visibleBlink = true;
  /** dark silhouette preview (garage, not owned) */
  locked = false;
  /** camera the X1 sprite turns to face (set by the game) */
  camera: THREE.Camera | null = null;
  /** always show the high-res rear render (cameras stay behind the car) */
  rearOnly = true;
  private sprite!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private spriteTex: THREE.Texture[] = [];
  private spriteAspect: number[] = [];
  private spriteView = -1;
  private spriteOn = false;
  private contactShadow!: THREE.Mesh;
  /** energy jets under the X1 (only while airborne) */
  private jetG = new THREE.Group();
  private jets: THREE.Mesh[] = [];
  private jetMat!: THREE.MeshBasicMaterial;
  /** calm energy outline hugging the car while a power-up is active (no flicker, no glare) */
  private aura!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private auraK = 0;
  auraTarget = 0;
  /** how far above the road the car is (0 on the road → 1 well above the obstacles) */
  private airK = 0;
  private tmpQ = new THREE.Quaternion();
  private tmpQ2 = new THREE.Quaternion();
  private tmpV3 = new THREE.Vector3();

  constructor() {
    this.root.add(this.bank);
    this.bank.add(this.pitch);
    this.pitch.add(this.squashG);
    const g = this.squashG;

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xf3f5fa,
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    this.trimMat = new THREE.MeshStandardMaterial({ color: 0xb9c2d3, roughness: 0.25, metalness: 0.95 });
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0d16,
      roughness: 0.04,
      metalness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x39b6ff, toneMapped: false });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.5, metalness: 0.6 });

    // Sports-coupe body modelled on the XWAVE reference car: low and wide, broad rear
    // haunches, fastback roof, dark rear fascia with a full-width red light blade.
    const fasciaMat = new THREE.MeshPhysicalMaterial({ color: 0x15171e, roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.1 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff1f38 }); // tone-mapped: a deep red bar, not a pink bloom smear
    this.redMat = redMat;
    this.fasciaMat = fasciaMat;

    // Proportions from the XWAVE reference sheet: long, low GT coupe (≈2.9 m × 1.6 m),
    // long sloping hood, dark panoramic cabin with white A/C-pillars, pods at the four arches.
    const L = 1.43; // half length

    // ---- lower body + arches
    const lower = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.32, L * 2, 4, 0.12), this.bodyMat);
    lower.position.y = -0.1;
    g.add(lower);
    for (const s of [-1, 1]) {
      const haunch = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), this.bodyMat);
      haunch.scale.set(0.26, 0.18, 0.86);
      haunch.position.set(0.6 * s, -0.03, 0.6);
      g.add(haunch);
      const fender = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), this.bodyMat);
      fender.scale.set(0.24, 0.15, 0.72);
      fender.position.set(0.58 * s, -0.05, -0.86);
      g.add(fender);
    }
    // long hood sloping down to a low nose, with a small X emblem
    const hood = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.1, 1.2, 3, 0.05), this.bodyMat);
    hood.position.set(0, 0.02, -0.86);
    hood.rotation.x = 0.13;
    g.add(hood);
    for (const r of [0.785, -0.785]) {
      const xs = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.02), darkMat);
      xs.position.set(0, 0.105, -0.82);
      xs.rotation.set(0.13, r, 0);
      g.add(xs);
    }

    // ---- front: dark lower bumper with silver XWAVE, swept blue LED headlights
    const bumper = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.15, 0.12, 2, 0.05), fasciaMat);
    bumper.position.set(0, -0.17, -L + 0.02);
    g.add(bumper);
    const frontBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.095),
      new THREE.MeshBasicMaterial({ map: logoTexture(null), transparent: true, depthWrite: false }),
    );
    frontBadge.position.set(0, -0.17, -L - 0.045);
    frontBadge.rotation.y = Math.PI;
    g.add(frontBadge);
    this.headlights = new THREE.MeshBasicMaterial({ color: 0x63c5ff, toneMapped: false });
    for (const s of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.028, 0.04), this.headlights);
      hl.position.set(0.46 * s, -0.01, -L + 0.07);
      hl.rotation.set(0, 0.32 * s, 0.16 * s); // sweeps up and back toward the fenders
      g.add(hl);
    }

    // ---- dark panoramic cabin with white A-pillars and C-pillars
    const glassGeo = new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const cabin = new THREE.Mesh(glassGeo, this.glassMat);
    cabin.scale.set(0.58, 0.36, 1.42);
    cabin.position.set(0, 0.05, 0.06);
    g.add(cabin);
    for (const s of [-1, 1]) {
      // white C-pillar buttress flowing from the roofline down onto the rear deck
      const cPillar = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.05, 0.5, 2, 0.022), this.bodyMat);
      cPillar.position.set(0.42 * s, 0.17, 1.02);
      cPillar.rotation.set(0.32, 0.1 * s, -0.5 * s);
      g.add(cPillar);
      for (let k = 0; k < 4; k++) {
        const louvre = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.035), fasciaMat);
        louvre.position.set(0.22 * s, 0.31 - k * 0.038, 0.92 + k * 0.07);
        louvre.rotation.x = 0.55;
        g.add(louvre);
      }
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.05), fasciaMat);
      stalk.position.set(0.63 * s, 0.17, -0.46);
      g.add(stalk);
      const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.08, 0.15, 2, 0.03), fasciaMat);
      mirror.position.set(0.71 * s, 0.19, -0.44);
      g.add(mirror);
      // door lettering: XWAVE + INNOVATE BEYOND LIMITS
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.18),
        new THREE.MeshBasicMaterial({ map: rearBadgeTexture('#1b2a4a'), transparent: true, depthWrite: false }),
      );
      door.position.set(0.802 * s, -0.06, 0.05);
      door.rotation.y = (Math.PI / 2) * s;
      g.add(door);
    }

    // ---- rear: ducktail lip, dark fascia, red light blade, diffuser
    const lip = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.05, 0.2, 2, 0.02), this.bodyMat);
    lip.position.set(0, 0.15, L - 0.12);
    lip.rotation.x = -0.14;
    g.add(lip);
    const fascia = new THREE.Mesh(new RoundedBoxGeometry(1.58, 0.3, 0.14, 3, 0.06), fasciaMat);
    fascia.position.set(0, -0.09, L - 0.06);
    g.add(fascia);
    this.tailbar = redMat;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.032, 0.04), redMat);
    blade.position.set(0, 0.07, L + 0.01);
    g.add(blade);
    for (const s of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.045, 0.05), redMat);
      end.position.set(0.74 * s, 0.1, L - 0.01);
      end.rotation.z = 0.28 * s;
      g.add(end);
    }
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), redMat);
    brake.position.set(0, -0.265, L + 0.03);
    g.add(brake);
    for (let k = -2; k <= 2; k++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.22), fasciaMat);
      fin.position.set(k * 0.2, -0.28, L - 0.12);
      g.add(fin);
    }
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.18),
      new THREE.MeshBasicMaterial({ map: rearBadgeTexture(), transparent: true, depthWrite: false }),
    );
    badge.position.set(0, -0.08, L + 0.012);
    g.add(badge);

    // ---- side skirts with a blue accent line
    for (const s of [-1, 1]) {
      const skirt = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.08, 2.1, 2, 0.03), fasciaMat);
      skirt.position.set(0.8 * s, -0.22, 0.0);
      g.add(skirt);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 1.7), this.glowMat);
      stripe.position.set(0.82 * s, -0.17, 0.0);
      g.add(stripe);
    }

    // ---- deployable wings (folded flat along the body, swing out for FLY UP)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.62, 0.18);
    wingShape.lineTo(0.66, 0.32);
    wingShape.lineTo(0, 0.5);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    wingGeo.rotateX(Math.PI / 2);
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.78 * s, -0.04, 0.1);
      const w = new THREE.Mesh(wingGeo, this.bodyMat);
      w.scale.x = s;
      pivot.add(w);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.2), this.glowMat);
      edge.position.set(0.64 * s, 0, 0.25);
      pivot.add(edge);
      g.add(pivot);
      this.wings.push(pivot);
    }


    // ---- four anti-gravity thruster pods
    const podGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.2, 28, 1);
    const ringGeo = new THREE.TorusGeometry(0.27, 0.045, 10, 36);
    const fanGeo = new THREE.CircleGeometry(0.23, 24);
    // wide end at the nozzle, tip pointing away; alpha fades toward the tip
    const flameGeo = new THREE.ConeGeometry(0.17, 1, 18, 1, true);
    flameGeo.rotateX(Math.PI);
    flameGeo.translate(0, -0.5, 0);
    const fc = document.createElement('canvas');
    fc.width = 4;
    fc.height = 64;
    const fg = fc.getContext('2d')!;
    const grad = fg.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.55, '#555');
    grad.addColorStop(1, '#fff');
    fg.fillStyle = grad;
    fg.fillRect(0, 0, 4, 64);
    const flameAlpha = new THREE.CanvasTexture(fc);
    const armGeo = new THREE.BoxGeometry(0.28, 0.07, 0.16);
    const fanMat = new THREE.MeshStandardMaterial({ color: 0x0d1220, roughness: 0.4, metalness: 0.8 });
    const podMat = new THREE.MeshPhysicalMaterial({ color: 0x14161d, roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1 });
    const glowTex = glowTexture();
    const tireGeo = new THREE.TorusGeometry(0.33, 0.075, 12, 40);
    tireGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: treadTexture(), roughness: 0.7, metalness: 0.2 });
    const faceGeo = new THREE.CircleGeometry(0.29, 40);
    faceGeo.rotateX(-Math.PI / 2);
    const faceMat = new THREE.MeshStandardMaterial({ map: wheelFaceTexture(), roughness: 0.3, metalness: 0.7, emissive: 0xffffff, emissiveMap: wheelFaceTexture(), emissiveIntensity: 0.25 });
    const blurMat = new THREE.MeshBasicMaterial({ map: wheelBlurTexture(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    this.wheelBlurMat = blurMat;
    for (const front of [true, false]) {
      for (const side of [-1, 1] as const) {
        const pivot = new THREE.Group();
        pivot.position.set(0.86 * side, -0.12, front ? -0.92 : 0.95);
        const orient = new THREE.Group();
        const spin = new THREE.Group();
        orient.add(spin);
        pivot.add(orient);
        // pod body = wheel hub; black tyre ring = tread when driving, nozzle rim when flying
        spin.add(new THREE.Mesh(podGeo, podMat));
        spin.add(new THREE.Mesh(tireGeo, tireMat));
        // outer wheel face (rim + spokes) and a motion-blur disc that fades in with speed
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.y = 0.112;
        spin.add(face);
        const blur = new THREE.Mesh(faceGeo, blurMat);
        blur.position.y = 0.118;
        spin.add(blur);
        const fan = new THREE.Mesh(fanGeo, fanMat);
        fan.rotation.x = Math.PI / 2;
        fan.position.y = -0.105;
        spin.add(fan);
        const ring = new THREE.Mesh(ringGeo, this.glowMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.11;
        spin.add(ring);
        const fx = new THREE.Group();
        pivot.add(fx);
        const flameMat = new THREE.MeshBasicMaterial({
          color: BLUE,
          transparent: true,
          opacity: 0.75,
          alphaMap: flameAlpha,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = -0.12;
        fx.add(flame);
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glowTex, color: BLUE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
        );
        glow.scale.setScalar(0.9);
        glow.position.y = -0.18;
        fx.add(glow);
        g.add(pivot);
        const arm = new THREE.Mesh(armGeo, this.trimMat);
        arm.position.set(0.74 * side, -0.14, front ? -0.92 : 0.95);
        g.add(arm);
        this.pods.push({ pivot, orient, spin, fx, ring, flame, flameMat, glow, side, front });
      }
    }

    // ---- underglow
    this.underglow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 3.4),
      new THREE.MeshBasicMaterial({ map: glowTex, color: BLUE, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.underglow.rotation.x = -Math.PI / 2;
    this.root.add(this.underglow);

    // draw-call optimisation: fuse every static body part into one mesh per material
    const keep = new Set<THREE.Object3D>([...this.wings, ...this.pods.map((q) => q.pivot)]);
    this.shellParts = mergeByMaterial(g, keep);

    // alternative bodies share the materials, pods and wings
    for (const shape of ['gt', 'wedge', 'muscle', 'bubble', 'cyber'] as CarShape[]) {
      const sg = this.buildShape(shape);
      mergeByMaterial(sg);
      sg.visible = false;
      g.add(sg);
      this.shapes[shape] = sg;
    }
    // after the static parts are merged (merging would swallow the jet meshes)
    this.buildSprite();

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    // remember every material's look so a locked (dark) preview can be undone
    this.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
        if (this.orig.has(mat)) continue;
        const a = mat as THREE.MeshStandardMaterial;
        this.orig.set(mat, { color: a.color?.getHex(), emissive: a.emissiveIntensity, opacity: mat.opacity, env: a.envMapIntensity, cc: (mat as THREE.MeshPhysicalMaterial).clearcoat, rough: a.roughness, metal: a.metalness });
      }
    });
  }

  /** the X1 drawn from its studio renders (body-colour tint for the other GT colourways) */
  private buildSprite() {
    const loader = new THREE.TextureLoader();
    X1_VIEWS.forEach((v, i) => {
      this.spriteAspect[i] = 2;
      const t = loader.load(v.url, (tex) => {
        const img = tex.image as HTMLImageElement;
        this.spriteAspect[i] = img.width / img.height;
        if (this.spriteView === i) this.spriteView = -1; // re-apply size
      });
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      this.spriteTex[i] = t;
    });
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.spriteTex[0] }, tint: { value: new THREE.Color(0xffffff) }, tintAmt: { value: 0 }, dim: { value: 1 }, gain: { value: 1.05 }, spin: { value: 0 }, streak: { value: 0 }, spinAmt: { value: 0 }, speedK: { value: 0 }, rearView: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 tint; uniform float tintAmt; uniform float dim; uniform float gain;
        uniform float spin; uniform float streak; uniform float spinAmt; uniform float speedK; uniform float rearView; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(map, vUv);
          if (c.a < 0.02) discard;
          // rolling tyres (rear view): tread bands scroll down the two rear tyres so the wheels visibly spin
          float lt = step(vUv.x, 0.175) * step(vUv.y, 0.44);
          float rt = step(0.825, vUv.x) * step(vUv.y, 0.44);
          float tyre = (lt + rt) * rearView;
          // vertical motion blur over the spinning tyres (5 taps) — longer smear the faster the car goes
          if (tyre > 0.5 && spinAmt > 0.01) {
            float o = 0.012 * spinAmt * (1.0 + 2.2 * speedK);
            vec3 b1 = texture2D(map, vUv + vec2(0.0, o)).rgb;
            vec3 b2 = texture2D(map, vUv - vec2(0.0, o)).rgb;
            vec3 b3 = texture2D(map, vUv + vec2(0.0, 2.0 * o)).rgb;
            vec3 b4 = texture2D(map, vUv - vec2(0.0, 2.0 * o)).rgb;
            c.rgb = mix(c.rgb, (c.rgb + b1 + b2 + b3 + b4) / 5.0, 0.8 * spinAmt);
          }
          float lum = dot(c.rgb, vec3(0.333));
          float rub = smoothstep(0.62, 0.25, lum);
          // tread blocks racing down the tyre (bigger blocks, softened as the smear grows)
          float f = fract(vUv.y * 14.0 + spin);
          float band = smoothstep(0.0, 0.22, f) * smoothstep(0.66, 0.44, f);
          c.rgb = mix(c.rgb, c.rgb * (0.3 + 1.3 * band), tyre * rub * spinAmt * (1.0 - 0.3 * speedK));
          // long motion streaks sliding over the rubber (racing tyre at speed), brighter when fast
          float g = fract(vUv.y * 5.0 + streak);
          c.rgb += vec3(0.34, 0.2, 0.1) * (0.6 + 0.8 * speedK) * tyre * rub * spinAmt * smoothstep(0.7, 0.96, g) * smoothstep(1.0, 0.97, g);
          // lateral blur hint at the tyre edge
          c.rgb += vec3(0.05) * tyre * spinAmt * (1.0 - rub);
          float mx = max(c.r, max(c.g, c.b)); float mn = min(c.r, min(c.g, c.b));
          float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          // body paint = bright, unsaturated pixels → recolour for the other colourways
          float body = smoothstep(0.34, 0.12, (mx - mn) / max(mx, 0.01)) * smoothstep(0.16, 0.42, l);
          vec3 col = mix(c.rgb, tint * (0.18 + l * 1.25) + vec3(0.06) * l, body * tintAmt);
          gl_FragColor = vec4(col * gain * dim, c.a);
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.sprite.renderOrder = 2;
    this.sprite.visible = false;
    this.squashG.add(this.sprite);
    // soft contact shadow so the car sits on the road
    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const g2 = sc.getContext('2d')!;
    const gr = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = gr;
    g2.fillRect(0, 0, 128, 128);
    const st = new THREE.CanvasTexture(sc);
    this.contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.6), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.6 }));
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.visible = false;
    this.root.add(this.contactShadow);
    // energy jets: soft blue plasma pointing down from the hidden fans behind the rear wheels
    const jc = document.createElement('canvas');
    jc.width = 64;
    jc.height = 256;
    const jg = jc.getContext('2d')!;
    for (let y = 0; y < 256; y++) {
      const k = y / 255;
      const a = Math.min(1, 1.25 * Math.pow(1 - k, 1.3));
      const lin = jg.createLinearGradient(0, 0, 64, 0);
      const core = `rgba(${Math.round(235 - 120 * k)},${Math.round(250 - 60 * k)},255,${a})`;
      const edge = `rgba(60,150,255,0)`;
      lin.addColorStop(0, edge);
      lin.addColorStop(0.5 - 0.22 * (1 - k * 0.5), `rgba(70,170,255,${a * 0.55})`);
      lin.addColorStop(0.5, core);
      lin.addColorStop(0.5 + 0.22 * (1 - k * 0.5), `rgba(70,170,255,${a * 0.55})`);
      lin.addColorStop(1, edge);
      jg.fillStyle = lin;
      jg.fillRect(0, y, 64, 1);
    }
    const jt = new THREE.CanvasTexture(jc);
    jt.colorSpace = THREE.SRGBColorSpace;
    this.jetMat = new THREE.MeshBasicMaterial({ map: jt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false });
    for (const sx of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.62, 1);
      geo.translate(0, -0.5, 0); // hangs down from the nozzle
      const m = new THREE.Mesh(geo, this.jetMat);
      m.position.set(sx * 0.52, 0, 0.05);
      m.renderOrder = 3;
      this.jets.push(m);
      this.jetG.add(m);
    }
    this.jetG.visible = false;
    this.squashG.add(this.jetG);
    // power-up aura: rim light + soft halo + a few energy wisps, generated from the rear render's outline
    const at = new THREE.TextureLoader().load(x1Aura);
    at.colorSpace = THREE.SRGBColorSpace;
    this.aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: at, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
    this.aura.renderOrder = 4;
    this.aura.visible = false;
    this.squashG.add(this.aura);
  }

  get usesSprite() {
    return this.spriteOn;
  }

  /** world position of jet i's nozzle (for energy particles) */
  jetWorld(i: number, out: THREE.Vector3) {
    const j = this.jets[i % this.jets.length];
    out.set(0, -0.05, 0);
    return j.localToWorld(out);
  }

  /** face the camera, pick the studio view for the viewing angle, follow bank / barrel roll */
  private updateSprite(vy: number, roll: number) {
    const cam = this.camera;
    if (!cam || !this.spriteOn) return;
    // viewing angle in the car's frame: 0 = from behind
    this.root.updateWorldMatrix(true, false);
    const local = this.tmpV3.setFromMatrixPosition(cam.matrixWorld);
    this.root.worldToLocal(local);
    const az = Math.atan2(local.x, local.z);
    let view = Math.round(az / (Math.PI / 4));
    view = ((view % 8) + 8) % 8;
    // only the full-resolution rear render is used (the side views from the sheet are too small)
    if (this.rearOnly) view = 0;
    // index order: back, back-right, right, front-right, front, front-left, left, back-left
    if (view !== this.spriteView) {
      this.spriteView = view;
      this.sprite.material.uniforms.map.value = this.spriteTex[view];
      this.sprite.material.uniforms.rearView.value = view === 0 ? 1 : 0;
      const h = X1_VIEWS[view].h;
      this.sprite.scale.set(h * this.spriteAspect[view], h, 1);
    }
    const h = this.sprite.scale.y;
    // wheels on the road at driving height; the sprite rises with the car when it flies,
    // and when it ducks the wheels stay on the asphalt (the body squashes instead of sinking)
    const ground = vy < 0.51 ? -vy : -0.51;
    this.sprite.position.set(0, ground + h / 2 - 0.02, 0);
    // airborne: the car is above everything below it — draw it over the obstacles it clears
    const over = this.airK > 0.55;
    if (this.sprite.material.depthTest === over) {
      this.sprite.material.depthTest = !over;
      this.aura.material.depthTest = !over;
      this.jetMat.depthTest = !over;
    }
    this.sprite.renderOrder = over ? 10 : 2;
    this.aura.renderOrder = over ? 11 : 4;
    // billboard: world orientation = camera orientation, rolled with the car's bank / barrel roll
    this.squashG.updateWorldMatrix(true, false);
    this.squashG.getWorldQuaternion(this.tmpQ).invert();
    this.tmpQ2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);
    this.sprite.quaternion.copy(this.tmpQ).multiply(cam.quaternion).multiply(this.tmpQ2);
    // aura: same billboard, slightly larger than the car (texture has 12% padding around the render)
    if (this.aura.visible) {
      const pw = 1268 / 1024;
      const ph = 814 / 570;
      this.aura.scale.set(this.sprite.scale.x * pw * 1.05, this.sprite.scale.y * ph * 1.05, 1);
      this.aura.position.copy(this.sprite.position);
      this.aura.position.z += 0.01;
      this.aura.quaternion.copy(this.sprite.quaternion);
    }
    // jets follow the billboard (and its barrel roll) under the rear bumper
    this.jetG.position.set(0, -0.51 + 0.2, 0);
    this.jetG.quaternion.copy(this.sprite.quaternion);
    this.contactShadow.position.y = -vy + 0.025;
    const sm = this.contactShadow.material as THREE.MeshBasicMaterial;
    sm.opacity = clamp(0.62 - (vy - 0.51) * 0.25, 0.12, 0.62);
    this.contactShadow.scale.setScalar(1 + Math.max(0, vy - 0.51) * 0.15);
  }

  private orig = new Map<THREE.Material, { color?: number; emissive?: number; opacity: number; env?: number; cc?: number; rough?: number; metal?: number }>();

  /** Locked garage preview: the whole car (body, wheels, lights, glow) turns into a dark silhouette. */
  private dim(on: boolean) {
    for (const [mat, o] of this.orig) {
      const a = mat as THREE.MeshStandardMaterial;
      if (!on) {
        if (o.emissive !== undefined) a.emissiveIntensity = o.emissive;
        if (o.env !== undefined) a.envMapIntensity = o.env;
        mat.opacity = o.opacity;
        if (o.cc !== undefined) (mat as THREE.MeshPhysicalMaterial).clearcoat = o.cc;
        if (o.rough !== undefined) a.roughness = o.rough;
        if (o.metal !== undefined) a.metalness = o.metal;
        continue;
      }
      a.color?.multiplyScalar(0.07);
      if (o.emissive !== undefined) a.emissiveIntensity = o.emissive * 0.05;
      if (o.env !== undefined) a.envMapIntensity = 0.08;
      if (o.cc !== undefined) (mat as THREE.MeshPhysicalMaterial).clearcoat = 0;
      if (o.rough !== undefined) a.roughness = 0.85;
      if (o.metal !== undefined) a.metalness = 0.1;
      if (mat.transparent) mat.opacity = o.opacity * 0.15;
    }
  }

  /** @param locked garage preview of a car not owned yet: dark silhouette */
  setSkin(skin: VehicleSkin, locked = false) {
    this.skin = skin;
    // restore every material, apply the colourway, then darken everything if locked
    for (const [mat, o] of this.orig) if (o.color !== undefined) (mat as THREE.MeshStandardMaterial).color.setHex(o.color);
    this.dim(false);
    this.bodyMat.color.setHex(skin.body);
    this.trimMat.color.setHex(skin.trim);
    this.glassMat.color.setHex(skin.glass);
    this.glowMat.color.setHex(skin.glow);
    (this.underglow.material as THREE.MeshBasicMaterial).color.setHex(skin.glow);
    this.locked = locked;
    if (locked) this.dim(true);
    // the original coupe shell is retired: the XWAVE X1 body ('gt') is built in buildShape()
    for (const p of this.shellParts) p.visible = false;
    for (const [k2, sg] of Object.entries(this.shapes)) sg!.visible = k2 === skin.shape;
    // the GT colourways are drawn from the X1 studio renders (pearl = original paint)
    this.spriteOn = skin.shape === 'gt';
    this.sprite.visible = this.spriteOn;
    this.contactShadow.visible = this.spriteOn;
    if (this.spriteOn) {
      this.shapes.gt!.visible = false;
      const u = this.sprite.material.uniforms;
      u.tint.value.setHex(skin.body);
      u.tintAmt.value = skin.id === 'pearl' ? 0 : 0.92;
      u.dim.value = locked ? 0.06 : 1;
    }
    for (const pod of this.pods) pod.pivot.visible = !this.spriteOn;
    for (const w of this.wings) w.visible = !this.spriteOn;
    this.underglow.visible = !this.spriteOn;
  }

  /** Procedural alternative bodies (same footprint, pods at the four corners). */
  private buildShape(shape: CarShape): THREE.Group {
    const g = new THREE.Group();
    const body = this.bodyMat;
    const glass = this.glassMat;
    const glow = this.glowMat;
    const red = this.redMat;
    const dark = this.fasciaMat;
    // side profile (z = length, y = height) extruded across the car's width
    const profile = (pts: [number, number][], width: number, mat: THREE.Material, bevel = 0.04) => {
      const sh = new THREE.Shape();
      sh.moveTo(-pts[0][0], pts[0][1]);
      for (const [z, y] of pts.slice(1)) sh.lineTo(-z, y);
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
      geo.translate(0, 0, -(width - bevel * 2) / 2);
      geo.rotateY(Math.PI / 2);
      return new THREE.Mesh(geo, mat);
    };
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0) => {
      const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    // pod arms (the GT shell carries its own)
    for (const z of [-0.92, 0.95]) for (const sx of [-1, 1]) box(0.3, 0.07, 0.16, this.trimMat, 0.76 * sx, -0.14, z);

    switch (shape) {
      case 'gt': {
        // XWAVE X1 v2 (reference renders): smooth pearl-white supercar lofted from cross-sections —
        // low nose, muscular front fenders, pinched doors, wide rear haunches; black glass canopy,
        // full-width red light bar, glowing XWAVE on a black rear panel, finned diffuser
        const S = (z: number, hw: number, yb: number, yt: number, n = 3.6): Station => ({ z, hw, yb, yt, n });
        g.add(loft([
          S(-1.6, 0.5, -0.2, -0.06, 3),
          S(-1.5, 0.66, -0.25, 0.0),
          S(-1.25, 0.8, -0.26, 0.09),
          S(-0.92, 0.84, -0.26, 0.13),
          S(-0.6, 0.79, -0.26, 0.15),
          S(-0.2, 0.73, -0.26, 0.18),
          S(0.3, 0.76, -0.26, 0.2),
          S(0.75, 0.86, -0.26, 0.21),
          S(1.05, 0.87, -0.26, 0.2),
          S(1.38, 0.83, -0.26, 0.16),
          S(1.58, 0.76, -0.24, 0.1, 4.4),
        ], body));
        // black glass canopy: teardrop from the windscreen to the engine cover
        g.add(loft([
          S(-0.78, 0.5, 0.1, 0.11, 2.4),
          S(-0.5, 0.56, 0.12, 0.3, 2.6),
          S(-0.15, 0.58, 0.14, 0.43, 2.8),
          S(0.25, 0.58, 0.15, 0.45, 2.8),
          S(0.7, 0.55, 0.16, 0.36, 2.8),
          S(1.1, 0.5, 0.15, 0.24, 3),
          S(1.36, 0.44, 0.13, 0.17, 3),
        ], glass));
        // rear spoiler lip (body colour) on the engine cover
        box(1.12, 0.03, 0.16, body, 0, 0.205, 1.4, 0.012);
        // black lower body + side skirts with a thin blue LED line
        box(1.5, 0.08, 2.9, dark, 0, -0.27, 0, 0.03);
        for (const sx of [-1, 1]) {
          box(0.02, 0.018, 1.2, glow, 0.79 * sx, -0.21, 0.02);
          // side scoop behind the door
          const sc = box(0.06, 0.12, 0.42, dark, 0.74 * sx, -0.02, 0.48, 0.03);
          sc.rotation.y = -0.12 * sx;
          // thin V LED headlight sweeping up the fender
          const hl = box(0.42, 0.028, 0.04, this.headlights, 0.42 * sx, 0.01, -1.47);
          hl.rotation.set(0, 0.42 * sx, 0.18 * sx);
          // mirrors on stalks
          box(0.04, 0.03, 0.06, dark, 0.62 * sx, 0.2, -0.36);
          box(0.14, 0.07, 0.13, body, 0.7 * sx, 0.22, -0.38, 0.03);
          // lower rear red marker lights
          box(0.2, 0.025, 0.03, red, 0.5 * sx, -0.17, 1.585);
        }
        // front: dark intake + small X emblem
        box(0.9, 0.09, 0.06, dark, 0, -0.17, -1.56, 0.03);
        for (const r of [0.785, -0.785]) {
          const xs = box(0.11, 0.008, 0.02, dark, 0, 0.0, -1.47);
          xs.rotation.set(0.35, r, 0);
        }
        // rear: black panel across the tail, full-width red bar with a bright inner line
        box(1.42, 0.17, 0.06, dark, 0, 0.0, 1.56, 0.03);
        box(1.46, 0.05, 0.05, red, 0, 0.085, 1.575);
        box(1.3, 0.012, 0.02, this.tailbar, 0, 0.086, 1.602);
        for (const sx of [-1, 1]) {
          const end = box(0.16, 0.04, 0.05, red, 0.71 * sx, 0.06, 1.55);
          end.rotation.z = -0.32 * sx;
        }
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: xwaveGlowText(), transparent: true, depthWrite: false, toneMapped: false }));
        plate.position.set(0, -0.005, 1.592);
        g.add(plate);
        // diffuser: black, with vertical fins
        box(1.24, 0.1, 0.26, dark, 0, -0.21, 1.44, 0.02);
        for (let k = -3; k <= 3; k++) box(0.018, 0.1, 0.24, this.trimMat, k * 0.16, -0.24, 1.47);
        break;
      }
      case 'wedge': {
        // razor-sharp hypercar: knife nose, cab-forward canopy, huge rear wing
        g.add(profile([[-1.5, -0.27], [-1.5, -0.14], [-0.35, 0.1], [1.1, 0.18], [1.48, 0.14], [1.48, -0.27]], 1.62, body));
        g.add(profile([[-0.62, 0.08], [-0.05, 0.38], [0.55, 0.36], [0.98, 0.16]], 1.04, glass, 0.03));
        box(1.3, 0.03, 0.05, glow, 0, -0.12, -1.53);
        box(1.52, 0.3, 0.06, dark, 0, -0.1, 1.5, 0.03);
        box(1.4, 0.05, 0.05, red, 0, 0.0, 1.535);
        for (const sx of [-1, 1]) box(0.3, 0.07, 0.05, red, 0.58 * sx, -0.1, 1.535);
        box(1.86, 0.05, 0.34, body, 0, 0.6, 1.22, 0.02);
        for (const sx of [-1, 1]) {
          box(0.05, 0.42, 0.1, dark, 0.5 * sx, 0.38, 1.2);
          box(0.04, 0.24, 0.4, glow, 0.93 * sx, 0.6, 1.22);
          box(0.03, 0.06, 1.9, glow, 0.83 * sx, -0.08, 0);
        }
        box(1.4, 0.06, 0.3, dark, 0, -0.27, 1.32);
        break;
      }
      case 'muscle': {
        // broad-shouldered muscle car: tall flanks, hood scoop, square cabin, twin stripes
        box(1.68, 0.4, 3.0, body, 0, -0.07, 0, 0.1);
        box(0.42, 0.12, 0.62, dark, 0, 0.17, -0.72, 0.04);
        box(1.24, 0.34, 1.15, glass, 0, 0.29, 0.22, 0.12);
        box(1.26, 0.06, 0.82, body, 0, 0.47, 0.28, 0.03);
        for (const sx of [-1, 1]) {
          box(0.16, 0.012, 3.02, glow, 0.16 * sx, 0.135, 0);
          box(0.16, 0.012, 0.84, glow, 0.16 * sx, 0.505, 0.28);
          box(0.16, 0.16, 0.05, this.headlights, 0.5 * sx, -0.01, -1.51, 0.06);
          box(0.38, 0.09, 0.05, red, 0.48 * sx, 0.02, 1.51);
          box(0.05, 0.2, 0.08, dark, 0.55 * sx, 0.24, 1.34);
        }
        box(1.6, 0.05, 0.28, body, 0, 0.35, 1.36, 0.02);
        box(1.5, 0.14, 0.08, dark, 0, -0.2, -1.5, 0.04);
        box(1.4, 0.1, 0.1, dark, 0, -0.24, 1.48, 0.04);
        break;
      }
      case 'bubble': {
        // pod racer: rounded capsule, big bubble canopy, dorsal fin, glowing equator ring
        const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 20), body);
        hull.scale.set(0.84, 0.36, 1.42);
        hull.position.y = -0.04;
        g.add(hull);
        const can = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
        can.scale.set(0.56, 0.46, 0.82);
        can.position.set(0, 0.12, -0.1);
        g.add(can);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), glow);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(0.86, 1.44, 1);
        ring.position.y = -0.05;
        g.add(ring);
        g.add(profile([[0.55, 0.2], [1.2, 0.62], [1.36, 0.62], [1.25, 0.18]], 0.06, body, 0.01));
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), this.headlights);
        eye.position.set(0, -0.04, -1.42);
        g.add(eye);
        box(0.6, 0.05, 0.04, red, 0, 0.0, 1.43);
        break;
      }
      case 'cyber': {
        // angular steel wedge with a single roof apex and full-width light bars
        box(1.66, 0.3, 2.96, body, 0, -0.12, 0, 0.02);
        g.add(profile([[-1.48, 0.03], [-0.15, 0.52], [1.48, 0.14], [1.48, 0.03]], 1.6, body, 0.01));
        const ws = box(1.36, 0.02, 0.86, glass, 0, 0.3, -0.62);
        ws.rotation.x = 0.35;
        const rw = box(1.36, 0.02, 0.9, glass, 0, 0.36, 0.42);
        rw.rotation.x = -0.24;
        box(1.62, 0.035, 0.05, glow, 0, 0.06, -1.5);
        box(1.62, 0.04, 0.05, red, 0, 0.1, 1.5);
        for (const sx of [-1, 1]) box(0.03, 0.04, 2.6, glow, 0.84 * sx, -0.16, 0);
        box(1.5, 0.08, 0.2, dark, 0, -0.27, 0);
        break;
      }
    }
    return g;
  }

  /**
   * Replace the procedural shell with an imported GLB (see assets/manifest.ts).
   * Thruster pods, wings' animation pivots and VFX stay procedural.
   */
  useModel(obj: THREE.Object3D) {
    for (const p of this.shellParts) p.visible = false;
    this.squashG.add(obj);
  }

  /** last airborne amount (rolls only happen in the air) */
  private lastAir = 0;
  barrelRoll(turns = 1, dir: 1 | -1 = 1, speed = 9) {
    if (this.lastAir < 0.5) return; // never roll on the ground
    this.celebrateDir = dir;
    this.celebrateSpeed = speed;
    this.celebrateTotal = Math.PI * 2 * turns;
    this.celebrate = this.celebrateTotal;
  }
  private celebrateTotal = Math.PI * 2;
  private celebrateDir = 1;
  private celebrateSpeed = 9;

  /** Snap animation springs (after respawn / menu). */
  resetPose() {
    this.roll.snap(0);
    this.yaw.snap(0);
    this.pitchS.snap(0);
    this.celebrate = 0;
    this.bank.rotation.set(0, 0, 0);
    this.pitch.rotation.set(0, 0, 0);
    this.squashG.scale.set(1, 1, 1);
  }

  /**
   * @param turbo 0..1 turbo intensity
   * @param roadY height of the road under the car (for underglow placement)
   */
  update(p: Player, dt: number, speed: number, turbo: number) {
    this.time += dt;
    const t = this.time;
    // gameplay height -> visual height: on the road the wheels touch the asphalt,
    // tucked (LOW) the belly skims it, airborne it rises with the hitbox
    const vy =
      p.y <= HEIGHT.NORMAL
        ? lerp(0.3, 0.51, clamp01((p.y - HEIGHT.LOW) / (HEIGHT.NORMAL - HEIGHT.LOW)))
        : p.y <= HEIGHT.HIGH
          ? lerp(0.51, 3.35, clamp01((p.y - HEIGHT.NORMAL) / (HEIGHT.HIGH - HEIGHT.NORMAL)))
          : 3.35 + (p.y - HEIGHT.HIGH);
    this.root.position.set(p.x, vy, 0);

    // ---- bank / yaw from lateral velocity (springs give natural overshoot on recovery)
    const laneSpeed = 2.6 / 0.19;
    const lat = clamp(p.vx / laneSpeed, -1.4, 1.4);
    // on the road: a car-like lean and steer; in the air: the full 15° bank
    // the car stays upright and points straight down the road; only a light bank on lane changes
    this.roll.target = lat * lerp(0.07, 0.11, p.air) + Math.sin(t * 1.7) * 0.008 * p.air;
    this.yaw.target = -lat * 0.035;
    const vVel = dt > 0 ? (p.y - this.lastY) / dt : 0;
    this.lastY = p.y;
    // nose lifts gently on take-off and dips on landing; slight squat under turbo
    this.pitchS.target = clamp(vVel * 0.028, -0.18, 0.24) - turbo * 0.05;
    this.roll.update(dt);
    this.yaw.update(dt);
    this.pitchS.update(dt);
    let extraRoll = 0;
    if (this.celebrate > 0) {
      const step = Math.min(this.celebrate, dt * this.celebrateSpeed);
      this.celebrate -= step;
      extraRoll = (this.celebrateTotal - this.celebrate) * this.celebrateDir;
    }
    this.bank.rotation.set(0, this.yaw.value, this.roll.value + extraRoll);
    this.pitch.rotation.x = this.pitchS.value;

    // ---- suspension: fine road vibration when driving, slow float when airborne
    // fine high-frequency road buzz: the car feels planted at racing speed
    const road = (Math.sin(t * 43) * 0.5 + Math.sin(t * 67.3) * 0.35 + Math.sin(t * 13.1) * 0.15) * 0.016 * clamp01(speed / 28) * (1 - p.air);
    this.pitch.position.y = road + Math.sin(t * 3.2) * 0.04 * p.air;

    // ---- squash & stretch
    const sq = p.squash;
    const sy = 1 - sq * 0.55;
    const sxz = 1 + sq * 0.18;
    this.squashG.scale.set(sxz, sy, sxz * (1 + turbo * 0.06));

    // ---- wings
    const w = p.wings;
    for (let i = 0; i < this.wings.length; i++) {
      const s = i === 0 ? -1 : 1;
      const wing = this.wings[i];
      wing.rotation.y = lerp(1.25 * -s, 0, w); // folded back along the body → out
      wing.rotation.z = lerp(0, 0.12 * s, w);
      wing.scale.setScalar(lerp(0.55, 1, w));
    }

    // ---- pods: wheels on the road, thrusters in the air, tucked away when diving
    this.flameColor.copy(BLUE).lerp(ORANGE, p.orange);
    if (this.skin.id !== 'pearl') this.flameColor.lerp(new THREE.Color(this.skin.glow), 0.35 * (1 - p.orange));
    if (this.locked) this.flameColor.multiplyScalar(0.1);
    const air = p.air;
    const wheel = 1 - air;
    this.lastAir = air;
    const tuck = p.retract;
    // visible spin is capped so the spokes read as turning (no strobing backwards);
    // a blur disc fades in with speed to sell the real rotation rate
    // a readable ~2.5 rev/s spin (never strobes backwards) + a light blur disc: the wheels clearly roll
    this.wheelAngle += Math.min(speed / 0.41, 16) * dt * wheel;
    this.wheelBlurMat.opacity = clamp((speed - 8) / 32, 0, 0.5) * wheel;
    const tilt = p.thrusterTilt;
    const thrustAngle = tilt >= 0 ? lerp(-0.35, 0, tilt) : -0.35;
    for (const pod of this.pods) {
      const zBase = pod.front ? -0.92 : 0.95;
      pod.pivot.position.set(
        lerp(0.86, 0.62, tuck) * pod.side,
        lerp(lerp(-0.12, -0.1, air), 0.02, tuck),
        lerp(zBase, zBase * 0.92, tuck),
      );
      pod.pivot.scale.setScalar(lerp(1, 0.72, tuck));
      // stand up as a wheel (axis sideways) or lie flat as a thruster
      pod.orient.rotation.set(thrustAngle * air, 0, -pod.side * (Math.PI / 2) * wheel);
      pod.spin.rotation.y = this.wheelAngle * pod.side + air * Math.sin(t * 6 + (pod.front ? 0 : 1)) * 0.03;
      // thruster flames only exist while flying — no air columns on the road
      const sideBoost = Math.max(0, -p.sideThrust * pod.side) * 0.6;
      const intensity = 0.55 + p.engine * 0.5 + turbo * 0.15 + sideBoost * 0.4 + (p.isSuper ? 0.3 : 0); // steady: boosts don't light the car up
      const show = air * air;
      pod.fx.visible = show > 0.02;
      pod.fx.rotation.x = thrustAngle * air;
      pod.flame.scale.set(0.8 + p.engine * 0.3, (0.25 + intensity * 0.5) * show, 0.8 + p.engine * 0.3);
      pod.flameMat.color.copy(this.flameColor);
      pod.flameMat.opacity = clamp(0.12 + intensity * 0.14, 0, 0.4) * show; // soft air from the hidden fans
      const gm = pod.glow.material as THREE.SpriteMaterial;
      gm.color.copy(this.flameColor);
      gm.opacity = show * 0.35;
      pod.glow.scale.setScalar((0.7 + intensity * 0.45) * show + 0.01);
      pod.ring.scale.setScalar(1 + p.engine * 0.08);
    }
    const lk = this.locked ? 0.07 : 1;
    this.glowMat.color.setHex(this.skin.glow).multiplyScalar((1 + p.engine * 0.3 + turbo * 0.1) * lk);

    // tail lights flare like brake lights when the car tucks down
    this.tailbar.color.setRGB(1, 0.12, 0.22).multiplyScalar((1 + p.retract * 0.9) * lk);

    // headlights: gentle scan pulse
    const hl = 0.9; // steady headlights
    this.headlights.color.setRGB(0.35 * hl + 0.05, 0.72 * hl + 0.08, 1).multiplyScalar(lk);

    // underglow sits on the road under the car
    this.underglow.position.y = -vy + 0.03;
    const ug = this.underglow.material as THREE.MeshBasicMaterial;
    ug.opacity = clamp(0.45 - (vy - 0.5) * 0.15, 0.1, 0.55);
    this.underglow.scale.setScalar(1 + (vy - 0.5) * 0.12);
    ug.color.copy(this.flameColor);

    // energy jets: only in the air (take-off → landing), stronger on rocket flights; steady, no flicker
    const jetK = this.spriteOn ? Math.max(clamp01((p.air - 0.08) / 0.5), turbo > 0 ? clamp01(turbo * 2) : 0) : 0;
    this.jetG.visible = jetK > 0.01 && !this.locked;
    if (this.jetG.visible) {
      const len = (1.15 + p.engine * 0.6 + (p.isSuper ? 0.9 : 0) + (turbo > 0 && p.air < 0.4 ? 0.5 : 0)) * jetK;
      for (const j of this.jets) j.scale.set(0.8 + 0.4 * jetK, len, 1);
      this.jetMat.opacity = jetK;
    }
    // aura fades in / out smoothly (≈0.4 s) — never blinks
    this.auraK += (this.auraTarget - this.auraK) * (1 - Math.exp(-6 * dt));
    this.aura.visible = this.spriteOn && this.auraK > 0.02 && !this.locked;
    this.aura.material.opacity = Math.min(1, 1.15 * this.auraK); // thicker, still steady
    this.airK = p.air * clamp01((vy - 1.2) / 0.8);
    // tyre roll for the rear render. The tread pattern may move at most TYRE.maxStep of a block per
    // FRAME: above ~half a block per frame the eye reads it as standing still or rolling backwards
    // (wagon-wheel effect), which is why fast wheels used to look slow. The extra speed is sold with
    // a longer blur smear + streaks (speedK) and tyre spray particles (Game.tyreSpray).
    {
      const u = this.sprite.material.uniforms;
      u.spin.value = (u.spin.value + Math.min(speed * dt * TYRE.blocksPerMetre, TYRE.maxStep)) % 1000;
      u.streak.value = (u.streak.value + Math.min(speed * dt * TYRE.streaksPerMetre, TYRE.maxStep)) % 1000;
      u.spinAmt.value = clamp01(speed / 8) * (1 - p.air);
      u.speedK.value = clamp01((speed - TYRE.blurFrom) / (TYRE.blurFull - TYRE.blurFrom)) * (1 - p.air);
    }
    this.updateSprite(vy, this.bank.rotation.z);
    this.root.visible = this.visibleBlink;
  }

  /** World positions of the four thruster nozzles (for trail particles). */
  nozzleWorld(i: number, out: THREE.Vector3) {
    const pod = this.pods[i];
    out.set(0, -0.2, 0);
    return pod.fx.localToWorld(out);
  }
  /** World position where a rear tyre (side −1 left / +1 right) meets the road — for tyre spray. */
  rearTyreWorld(side: -1 | 1, out: THREE.Vector3) {
    if (this.spriteOn) {
      out.set(side * TYRE.spriteX, TYRE.spriteY, 0);
      this.sprite.localToWorld(out);
    } else {
      const pod = this.pods.find((q) => !q.front && q.side === side) ?? this.pods[0];
      pod.pivot.getWorldPosition(out);
    }
    out.y = 0.05;
    return out;
  }

  /** World position where wheel i touches the road. */
  contactWorld(i: number, out: THREE.Vector3) {
    this.pods[i].pivot.getWorldPosition(out);
    out.y = 0.03;
    return out;
  }
  get podCount() {
    return this.pods.length;
  }
}
