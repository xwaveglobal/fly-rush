import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LANES } from '../config.ts';
import { Pool } from '../core/Pool.ts';
import type { LiveObstacle } from '../gameplay/World.ts';
import type { ObstacleType } from '../gameplay/types.ts';
import { crateTexture, glowTexture, hazardTexture } from './textures.ts';
import { mergeByMaterial } from './merge.ts';
import { Guides } from './Guides.ts';

/** crisp bright outline so silhouettes read at speed */
const EDGE = new THREE.LineBasicMaterial({ color: 0xc8582a, transparent: true, opacity: 0.6 });
function outline(mesh: THREE.Mesh, color?: number) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), color === undefined ? EDGE : new THREE.LineBasicMaterial({ color }));
  l.position.copy(mesh.position);
  l.rotation.copy(mesh.rotation);
  l.scale.copy(mesh.scale);
  return l;
}

const CRATE_GLOW = [0xff2a3d, 0xff8a1f, 0x39b6ff, 0xffd23d];

/** Shared materials (created once — keeps program/texture count low). */
const M = (() => {
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4256, roughness: 0.45, metalness: 0.8 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1d2230, roughness: 0.5, metalness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8edf6, roughness: 0.3, metalness: 0.3 });
  const hazard = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.6, metalness: 0.2 });
  const red = new THREE.MeshBasicMaterial({ color: 0xc8202f });
  const redHot = new THREE.MeshBasicMaterial({ color: 0xd8303c });
  const orange = new THREE.MeshBasicMaterial({ color: 0xe0761a });
  const blue = new THREE.MeshBasicMaterial({ color: 0x2f8ad0 });
  const green = new THREE.MeshBasicMaterial({ color: 0x2fc46c });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xe0b030 });
  const field = new THREE.MeshBasicMaterial({
    color: 0xe06a2a,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glowCache = new Map<string, THREE.SpriteMaterial>();
  const glow = (color: number, opacity = 0.8) => {
    const key = color + ':' + opacity;
    let m = glowCache.get(key);
    if (!m) glowCache.set(key, (m = makeGlow(color, opacity)));
    return m;
  };
  const makeGlow = (color: number, opacity: number) =>
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
  const crate = [0xff2a3d, 0xff8a1f, 0x39b6ff, 0xffd23d].map((c) => {
    const hex = '#' + c.toString(16).padStart(6, '0');
    return new THREE.MeshStandardMaterial({
      map: crateTexture(hex),
      emissive: 0xffffff,
      emissiveMap: crateTexture(hex),
      emissiveIntensity: 0.12,
      roughness: 0.5,
      metalness: 0.5,
    });
  });
  const rock = new THREE.MeshStandardMaterial({ color: 0x5a4c44, roughness: 0.95, metalness: 0.05, flatShading: true, emissive: 0xff5a10, emissiveIntensity: 0.0 });
  const traffic = [0xd8dde8, 0xff4d6d, 0x2b3a67, 0xffb02e].map(
    (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, metalness: 0.4, clearcoat: 1 }),
  );
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.1, metalness: 0.7 });
  return { metal, darkMetal, white, hazard, red, redHot, orange, blue, green, yellow, field, glow, crate, rock, traffic, glass };
})();

/** world readability: hazard outline colour/opacity and dark-metal lift */
export function setObstacleContrast(edge: number, opacity: number, lift: number) {
  EDGE.color.setHex(edge);
  EDGE.opacity = opacity;
  for (const m of [M.metal, M.darkMetal]) {
    m.emissive.setHex(0x4a5266);
    m.emissiveIntensity = lift * 0.6;
  }
  M.rock.emissive.setHex(0x3a2a20);
  M.rock.emissiveIntensity = 0.2 + lift;
}

/** comfort: soften flicker/pulse animations */
export const OBSTACLE_FX = { pulse: 1 };

export interface ObstacleView {
  type: ObstacleType;
  group: THREE.Group;
  update(o: LiveObstacle, t: number, dt: number): void;
  setup(o: LiveObstacle): void;
}

const G = {
  crate: new RoundedBoxGeometry(1.7, 1.7, 1.7, 2, 0.08),
  post: new THREE.BoxGeometry(0.22, 1.5, 0.3),
  bar: new THREE.BoxGeometry(2.7, 0.12, 0.12),
  laserBeam: new THREE.CylinderGeometry(0.045, 0.045, 2.6, 8),
  laserPylon: new THREE.BoxGeometry(0.3, 6.2, 0.4),
  ring: new THREE.TorusGeometry(1.3, 0.15, 14, 48),
  ringOuter: new THREE.TorusGeometry(1.55, 0.06, 6, 48, Math.PI * 0.5),
};

function build(type: ObstacleType): ObstacleView {
  const group = new THREE.Group();
  let update: ObstacleView['update'] = () => {};
  let setup: ObstacleView['setup'] = () => {};
  /** animated / toggled parts that must stay separate; null = don't merge */
  let keep: THREE.Object3D[] | null = null;

  switch (type) {
    case 'crate': {
      const mesh = new THREE.Mesh(G.crate, M.crate[0]);
      mesh.position.y = 0.85;
      group.add(mesh);
      const edges = outline(mesh);
      group.add(edges);
      const g = new THREE.Sprite(M.glow(0xff3344, 0.35).clone());
      g.scale.set(3.2, 1.2, 1);
      g.position.y = 0.1;
      group.add(g);
      setup = (o) => {
        mesh.material = M.crate[(o.spec.variant ?? 0) % M.crate.length];
        mesh.rotation.y = ((o.spec.variant ?? 0) - 1.5) * 0.06;
        edges.rotation.y = mesh.rotation.y;
        (g.material as THREE.SpriteMaterial).color.setHex(CRATE_GLOW[(o.spec.variant ?? 0) % CRATE_GLOW.length]);
      };
      break;
    }
    case 'barrier': {
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(G.post, M.hazard);
        post.position.set(1.22 * s, 0.75, 0);
        group.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M.orange);
        cap.position.set(1.22 * s, 1.55, 0);
        group.add(cap);
      }
      const top = new THREE.Mesh(G.bar, M.orange);
      top.position.y = 1.32;
      group.add(top);
      const topGlow = new THREE.Sprite(M.glow(0xffa23a, 0.7));
      topGlow.scale.set(3.6, 0.6, 1);
      topGlow.position.y = 1.32;
      group.add(topGlow);
      const bottom = new THREE.Mesh(G.bar, M.metal);
      bottom.position.y = 0.08;
      group.add(bottom);
      const fieldMat = M.field.clone();
      const field = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2, 1, 1), fieldMat);
      field.position.y = 0.7;
      group.add(field);
      const glow = new THREE.Sprite(M.glow(0xff6a2a, 0.5));
      glow.scale.set(4, 2, 1);
      glow.position.y = 0.7;
      group.add(glow);
      keep = [field];
      update = () => {
        fieldMat.opacity = 0.26; // steady, no flicker
      };
      break;
    }
    case 'beam': {
      // gantry + heavy hanging block with a glowing red underside: "go under"
      for (const s of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.4, 0.5), M.darkMetal);
        pillar.position.set(1.38 * s, 3.2, 0);
        group.add(pillar);
      }
      const block = new THREE.Mesh(new RoundedBoxGeometry(2.5, 4.4, 0.9, 2, 0.08), M.metal);
      block.position.y = 3.55 + 0.4;
      group.add(block);
      group.add(outline(block, 0xff6a7a));
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.38, 0.92), M.hazard);
      stripe.position.y = 1.32;
      group.add(stripe);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.0), M.redHot);
      edge.position.y = 1.0;
      group.add(edge);
      const under = new THREE.Sprite(M.glow(0xff2a3d, 0.75));
      under.scale.set(4.2, 1.4, 1);
      under.position.y = 0.9;
      group.add(under);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.3, 0.6), M.darkMetal);
      top.position.y = 6.4;
      group.add(top);
      // down-arrow sign
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 3), M.red);
      arrow.rotation.z = Math.PI;
      arrow.position.set(0, 2.2, 0.47);
      group.add(arrow);
      keep = [arrow];
      update = (_o, t) => {
        arrow.position.y = 2.2 + Math.sin(t * 6) * 0.12;
      };
      break;
    }
    case 'drone': {
      // big, high-contrast hunter drone sized to its hitbox: white shell, red warning ring,
      // spinning cyan rotors, red searchlight and a red spot on the road under it
      const shell = new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.25, metalness: 0.3, emissive: 0x7088b0, emissiveIntensity: 0.35 });
      const body = new THREE.Group();
      body.position.y = 1.2;
      group.add(body);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), shell);
      core.scale.set(1.25, 0.75, 1.1);
      body.add(core);
      body.add(outline(core, 0x1a2440));
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 40), M.red);
      band.rotation.x = Math.PI / 2;
      body.add(band);
      const bandGlow = new THREE.Sprite(M.glow(0xff2a3d, 0.55));
      bandGlow.scale.set(3.4, 1.4, 1);
      body.add(bandGlow);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), M.redHot);
      eye.position.set(0, -0.02, 0.6);
      body.add(eye);
      const eyeGlow = new THREE.Sprite(M.glow(0xff2a3d, 1));
      eyeGlow.scale.setScalar(1.6);
      eyeGlow.position.copy(eye.position);
      body.add(eyeGlow);
      const rotors: THREE.Mesh[] = [];
      for (const [x, z] of [[-0.85, -0.62], [0.85, -0.62], [-0.85, 0.62], [0.85, 0.62]]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.1), M.darkMetal);
        arm.position.set(x / 2, 0.12, z / 2);
        arm.rotation.y = -Math.atan2(z, x);
        body.add(arm);
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 6, 24), M.blue);
        r.rotation.x = Math.PI / 2;
        r.position.set(x, 0.18, z);
        body.add(r);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(x, 0.2, z);
        body.add(disc);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.025, 0.08), M.darkMetal);
        blade.position.set(x, 0.21, z);
        body.add(blade);
        rotors.push(blade);
      }
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.redHot);
      beacon.position.y = 0.48;
      body.add(beacon);
      const scan = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 1.05, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff2a3d, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      );
      scan.position.y = 0.55;
      group.add(scan);
      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(1.25, 28).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xff2a3d, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }),
      );
      spot.position.y = 0.04;
      group.add(spot);
      keep = [body, scan, spot];
      update = (_o, t, dt) => {
        for (const b of rotors) b.rotation.y += dt * 40;
        body.position.y = 1.2 + Math.sin(t * 5) * 0.06;
        beacon.visible = Math.sin(t * 16) > 0;
        (spot.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 10) * 0.12;
      };
      break;
    }
    case 'platform': {
      const slab = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.9, 3.2, 2, 0.1), M.metal);
      slab.position.y = 0.6;
      group.add(slab);
      const slabEdge = outline(slab, 0xffd23d);
      group.add(slabEdge);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 3.1), M.hazard);
      deck.position.y = 1.07;
      group.add(deck);
      for (const s of [-1, 1]) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 2.9), M.yellow);
        light.position.set(1.21 * s, 0.75, 0);
        group.add(light);
      }
      const thr = new THREE.Sprite(M.glow(0x39b6ff, 0.7));
      thr.scale.set(3.4, 0.9, 1);
      thr.position.y = 0.12;
      group.add(thr);
      // directional arrows show which way it slides
      keep = [slab, slabEdge];
      update = (_o, t) => {
        slab.position.y = slabEdge.position.y = 0.6 + Math.sin(t * 4) * 0.04;
      };
      break;
    }
    case 'traffic': {
      const carG = new THREE.Group();
      group.add(carG);
      const bodyMesh = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.9, 3.6, 3, 0.35), M.traffic[0]);
      bodyMesh.position.y = 1.55;
      carG.add(bodyMesh);
      // red LED bar across the nose: reads as "oncoming" from far away
      const led = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.06), M.redHot);
      led.position.set(0, 1.42, 1.82);
      carG.add(led);
      const ledGlow = new THREE.Sprite(M.glow(0xff2a3d, 0.7));
      ledGlow.scale.set(3.2, 0.9, 1);
      ledGlow.position.set(0, 1.42, 1.95);
      carG.add(ledGlow);
      const wind = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.7, 0.1, 2, 0.05), M.glass);
      wind.position.set(0, 2.05, 1.78);
      wind.rotation.x = -0.25;
      carG.add(wind);
      const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false });
      for (const s of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.05), headMat);
        hl.position.set(0.5 * s, 1.15, 1.81);
        carG.add(hl);
        const glow = new THREE.Sprite(M.glow(0xfff2c0, 0.9));
        glow.scale.setScalar(1.6);
        glow.position.set(0.5 * s, 1.15, 1.95);
        carG.add(glow);
        for (const z of [-1.1, 1.1]) {
          const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.18, 16), M.darkMetal);
          pod.position.set(0.95 * s, 0.55, z);
          carG.add(pod);
          const pg = new THREE.Sprite(M.glow(0xff8a1f, 0.7));
          pg.scale.setScalar(0.9);
          pg.position.set(0.95 * s, 0.38, z);
          carG.add(pg);
        }
      }
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 3.4), M.orange);
      stripe.position.y = 0.95;
      carG.add(stripe);
      // warning beacon on the roof
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M.orange);
      beacon.position.y = 2.55;
      carG.add(beacon);
      const bodyEdge = outline(bodyMesh);
      carG.add(bodyEdge);
      mergeByMaterial(carG, new Set([bodyMesh, beacon, bodyEdge]));
      // white semi truck (variant 4+): box trailer + cab, same footprint as the hitbox
      const truck = new THREE.Group();
      const truckWhite = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.35, metalness: 0.2 });
      const cargo = new THREE.Mesh(new RoundedBoxGeometry(1.76, 2.15, 2.5, 2, 0.08), truckWhite);
      cargo.position.set(0, 1.78, -0.55);
      truck.add(cargo);
      const cab = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.75, 1.15, 3, 0.25), truckWhite);
      cab.position.set(0, 1.45, 1.22);
      truck.add(cab);
      const tw = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.6, 0.08, 2, 0.04), M.glass);
      tw.position.set(0, 1.95, 1.8);
      tw.rotation.x = -0.2;
      truck.add(tw);
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 3.5), M.darkMetal);
      chassis.position.set(0, 0.5, 0);
      truck.add(chassis);
      for (const sx of [-1, 1]) {
        for (const z of [-1.3, -0.4, 1.25]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16), M.darkMetal);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(0.78 * sx, 0.36, z);
          truck.add(wheel);
        }
        const hlT = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.05), headMat);
        hlT.position.set(0.55 * sx, 0.95, 1.81);
        truck.add(hlT);
        const gT = new THREE.Sprite(M.glow(0xfff2c0, 0.9));
        gT.scale.setScalar(1.7);
        gT.position.set(0.55 * sx, 0.95, 1.95);
        truck.add(gT);
      }
      const ledT = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.05), M.redHot);
      ledT.position.set(0, 2.3, 1.83);
      truck.add(ledT);
      truck.add(outline(cargo));
      truck.add(outline(cab));
      mergeByMaterial(truck);
      group.add(truck);
      keep = [carG, truck];
      setup = (o) => {
        const v = o.spec.variant ?? 0;
        const isTruck = v >= 4;
        carG.visible = !isTruck;
        truck.visible = isTruck;
        bodyMesh.material = M.traffic[v % M.traffic.length];
      };
      update = (_o, t) => {
        bodyMesh.position.y = bodyEdge.position.y = 1.55 + Math.sin(t * 3 + 1) * 0.05;
        beacon.visible = true; // steady (no blinking lights while racing)
      };
      break;
    }
    case 'ring': {
      const mat = new THREE.MeshBasicMaterial({ color: 0x2f8ad0 });
      const ring = new THREE.Mesh(G.ring, mat);
      ring.position.y = 1.25;
      group.add(ring);
      const outer = new THREE.Group();
      outer.position.y = 1.25;
      for (let i = 0; i < 3; i++) {
        const seg = new THREE.Mesh(G.ringOuter, M.white);
        seg.rotation.z = (i * Math.PI * 2) / 3;
        outer.add(seg);
      }
      group.add(outer);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 32),
        new THREE.MeshBasicMaterial({ color: 0x39b6ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      disc.position.y = 1.25;
      group.add(disc);
      const glow = new THREE.Sprite(M.glow(0x39b6ff, 0.5));
      glow.scale.setScalar(4.4);
      glow.position.y = 1.25;
      group.add(glow);
      keep = [outer, ring];
      update = (_o, _t, dt) => {
        outer.rotation.z += dt * 2.2;
        mat.color.setHSL(0.56, 0.6, 0.45);
      };
      break;
    }
    case 'asteroid': {
      const geo = new THREE.IcosahedronGeometry(1.25, 1);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = 0.82 + 0.3 * Math.abs(Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7));
        v.multiplyScalar(n);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      const rock = new THREE.Mesh(geo, M.rock);
      rock.position.y = 1.3;
      group.add(rock);
      // hazard rim so a dark rock never melts into the starfield
      rock.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), EDGE));
      const lava = new THREE.Sprite(M.glow(0xff6a1a, 0.55));
      lava.scale.setScalar(3.2);
      lava.position.y = 1.3;
      group.add(lava);
      update = (_o, _t, dt) => {
        rock.rotation.x += dt * 0.9;
        rock.rotation.y += dt * 0.6;
      };
      break;
    }
    case 'laser': {
      // pylons at the lane boundaries + per-lane beam sets toggled per config
      for (const x of [-3.95, -1.3, 1.3, 3.95]) {
        const p = new THREE.Mesh(G.laserPylon, M.darkMetal);
        p.position.set(x, 3.1, 0);
        group.add(p);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.44), M.red);
        tip.position.set(x, 6.2, 0);
        group.add(tip);
      }
      const sets: Record<string, THREE.Group>[] = [];
      // each lane set = 1 merged beam mesh + 1 stretched glow (2 draw calls)
      const beamSet = (ys: number[]) => {
        const g = new THREE.Group();
        for (const y of ys) {
          const b = new THREE.Mesh(G.laserBeam, M.redHot);
          b.rotation.z = Math.PI / 2;
          b.position.y = y;
          g.add(b);
        }
        mergeByMaterial(g);
        const lo = Math.min(...ys);
        const hi = Math.max(...ys);
        const gl = new THREE.Sprite(M.glow(0xff2a3d, 0.4));
        gl.scale.set(3.4, hi - lo + 1.2, 1);
        gl.position.y = (lo + hi) / 2;
        g.add(gl);
        return g;
      };
      for (let i = 0; i < 3; i++) {
        const low = beamSet([0.3, 0.75, 1.2]);
        const high = beamSet([1.05, 1.55, 2.1, 2.7, 3.4, 4.2, 5.1]);
        const block = beamSet([0.3, 0.75, 1.2, 1.7, 2.3, 3.0, 3.8, 4.7, 5.6]);
        const open = new THREE.Group();
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), M.green);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.set(0, 0.05, -1);
        arrow.scale.y = 0.3;
        open.add(arrow);
        const og = new THREE.Sprite(M.glow(0x3dff8b, 0.5));
        og.scale.set(2.4, 2.4, 1);
        og.position.y = 0.5;
        open.add(og);
        for (const g of [low, high, block, open]) {
          g.position.x = LANES[i];
          group.add(g);
        }
        sets.push({ low, high, block, open });
      }
      keep = sets.flatMap((s) => Object.values(s));
      setup = (o) => {
        for (let i = 0; i < 3; i++) {
          const m = o.spec.laser![i];
          for (const k of Object.keys(sets[i])) sets[i][k].visible = k === m;
        }
      };
      update = () => {
        M.redHot.color.setRGB(0.85, 0.2, 0.24);
      };
      break;
    }
    case 'gate': {
      // a fortress wall across the whole road with one opening (green frame)
      const panels: THREE.Mesh[] = [];
      const doors: { l: THREE.Mesh; r: THREE.Mesh }[] = [];
      const frames: THREE.Group[] = [];
      for (let i = 0; i < 3; i++) {
        const x = LANES[i];
        const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7, 0.8), M.metal);
        wall.position.set(x, 3.5, 0);
        group.add(wall);
        panels.push(wall);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.6, 0.8), M.metal);
        lintel.position.set(x, 4.7, 0);
        group.add(lintel);
        // sliding door leaves (open as the gate approaches)
        const l = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.5), M.hazard);
        const r = l.clone();
        l.position.set(x - 0.65, 1.2, 0);
        r.position.set(x + 0.65, 1.2, 0);
        group.add(l, r);
        doors.push({ l, r });
        const frame = new THREE.Group();
        for (const [w, h, fx, fy] of [[2.5, 0.12, 0, 2.4], [0.12, 2.4, -1.25, 1.2], [0.12, 2.4, 1.25, 1.2]]) {
          const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), M.green);
          f.position.set(fx, fy, 0);
          frame.add(f);
        }
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 3), M.green);
        arrow.rotation.z = Math.PI;
        arrow.position.set(0, 3.4, 0.45);
        frame.add(arrow);
        frame.position.x = x;
        group.add(frame);
        frames.push(frame);
        (lintel as THREE.Mesh).userData.lane = i;
        panels.push(lintel);
      }
      for (const s of [-1, 1]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9, 1.6), M.darkMetal);
        tower.position.set(4.8 * s, 4.5, 0);
        group.add(tower);
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7, 0.2), M.blue);
        light.position.set(4.0 * s, 4.5, 0.85);
        group.add(light);
      }
      const banner = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 0.9), M.darkMetal);
      banner.position.y = 7.25;
      group.add(banner);
      const bannerGlow = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.12, 0.95), M.blue);
      bannerGlow.position.y = 7.1;
      group.add(bannerGlow);
      keep = [...panels, ...frames, ...doors.flatMap((d) => [d.l, d.r])];
      setup = (o) => {
        for (let i = 0; i < 3; i++) {
          const isDoor = i === o.spec.door;
          panels[i * 2].visible = !isDoor; // full wall
          panels[i * 2 + 1].visible = isDoor; // lintel above the opening
          frames[i].visible = isDoor;
          doors[i].l.visible = doors[i].r.visible = isDoor;
        }
      };
      update = (o) => {
        const d = o.spec.door ?? 1;
        const open = Math.min(1, Math.max(0, (-o.z - 45) / -40 + 1)); // opens between 85 m and 45 m out
        const x = LANES[d];
        doors[d].l.position.x = x - 0.65 - open * 1.3;
        doors[d].r.position.x = x + 0.65 + open * 1.3;
      };
      break;
    }
  }
  // no neon halos on obstacles: drop glow sprites (solid, matte silhouettes read better)
  const sprites: THREE.Object3D[] = [];
  group.traverse((o) => {
    if ((o as THREE.Sprite).isSprite) sprites.push(o);
  });
  for (const sp of sprites) sp.parent?.remove(sp);
  if (keep) mergeByMaterial(group, new Set(keep));
  return { type, group, update, setup };
}

/** Pools one view type per obstacle type; attaches/detaches from the scene. */
export class ObstacleViews {
  private pools = new Map<ObstacleType, Pool<ObstacleView>>();
  private active = new Map<number, ObstacleView>();
  guides: Guides;

  constructor(private parent: THREE.Object3D) {
    this.guides = new Guides(parent);
  }

  private pool(type: ObstacleType) {
    let p = this.pools.get(type);
    if (!p) {
      p = new Pool(() => build(type));
      this.pools.set(type, p);
    }
    return p;
  }

  prewarm() {
    const counts: [ObstacleType, number][] = [
      ['crate', 8], ['barrier', 4], ['beam', 4], ['drone', 3], ['laser', 2], ['traffic', 3], ['ring', 3], ['platform', 2], ['asteroid', 4], ['gate', 1],
    ];
    for (const [t, n] of counts) this.pool(t).prewarm(n);
  }

  spawn(o: LiveObstacle) {
    const v = this.pool(o.spec.type).acquire();
    v.setup(o);
    v.group.visible = true;
    this.parent.add(v.group);
    this.active.set(o.id, v);
    this.place(o, v);
    this.guides.spawn(o);
  }

  despawn(o: LiveObstacle) {
    this.guides.despawn(o);
    const v = this.active.get(o.id);
    if (!v) return;
    this.parent.remove(v.group);
    this.active.delete(o.id);
    this.pool(o.spec.type).release(v);
  }

  hide(o: LiveObstacle) {
    const v = this.active.get(o.id);
    if (v) v.group.visible = false;
  }

  private place(o: LiveObstacle, v: ObstacleView) {
    const t = o.spec.type;
    const x = t === 'drone' || t === 'platform' ? o.sx : t === 'laser' || t === 'gate' ? 0 : LANES[o.spec.lane];
    v.group.position.set(x, 0, o.z);
    if (t === 'traffic') v.group.rotation.y = 0;
  }

  update(obstacles: LiveObstacle[], t: number, dt: number) {
    for (const o of obstacles) {
      const v = this.active.get(o.id);
      if (!v) continue;
      if (o.smashed) v.group.visible = false;
      this.place(o, v);
      v.update(o, t, dt);
    }
    this.guides.update(obstacles, t);
  }

  clear() {
    for (const [, v] of this.active) {
      this.parent.remove(v.group);
      this.pool(v.type).release(v);
    }
    this.active.clear();
    this.guides.clear();
  }
}
