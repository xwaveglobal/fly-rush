import * as THREE from 'three';
import { RENDER } from '../../config.ts';
import { Spring, clamp, clamp01 } from '../../core/math.ts';
import { glowTexture } from '../textures.ts';
import { assetBytes, parseGlb } from './glbParse.ts';
import { ease, spoilerStep, wheelStep } from './carMotion.ts';
import { x1BadgeCanvas, x1CarbonCanvas, x1TreadCanvas } from './x1Textures.ts';
import x1Url from '../../assets/models/xwave-x1.glb';

/** what the 3D car needs from a colourway (subset of VehicleSkin) */
export interface MeshSkin {
  body: number;
  glow: number;
  accent: number;
  tintAmt?: number;
}

interface WheelRig {
  hub: THREE.Object3D;
  spin: THREE.Object3D;
  front: boolean;
  /** wheel radius in game metres */
  r: number;
  blur: THREE.Mesh;
}

/**
 * The XWAVE X1 as a real 3D model (v4). Lives inside the Vehicle's pose groups, so it inherits the
 * car's position, bank, pitch, barrel rolls and squash exactly like the old rear image did; on top of
 * that it animates what an image could not: spinning wheel assemblies, front-wheel steer, a sprung
 * body (roll on lane changes, dip + pitch on landing) and nitro flames from the two rear sockets.
 *
 * Node names come from scripts/car/x1-builder.ts: Body, Wheel_FL/FR/RL/RR → Spin_xx, NitroSocket_L/R.
 */
export class MeshCar {
  /** placed by Vehicle (its y = ground offset under the car's pose origin) */
  root = new THREE.Group();
  ready = false;
  /** sprung part: pivot above the axles so roll / pitch turn around the car's centre, not the road */
  private bodyPivot = new THREE.Group();
  private wheels: WheelRig[] = [];
  private sockets: THREE.Object3D[] = [];
  private flames: THREE.Mesh[] = [];
  private flameMat: THREE.MeshBasicMaterial;
  private coreMat: THREE.MeshBasicMaterial;
  private mats = new Map<string, THREE.MeshStandardMaterial>();
  private orig = new Map<THREE.MeshStandardMaterial, { color: number; emissive: number; ei: number }>();
  private roll = new Spring(0, 140, 16);
  private pitch = new Spring(0, 160, 14);
  private dip = new Spring(0, 220, 16);
  private yaw = new Spring(0, 140, 16);
  /** active spoiler: pivot (hinge at the front edge) and 0..1 deployment */
  private spoiler: THREE.Object3D | null = null;
  spoilerK = 0;
  /** previews / tests: force the spoiler target (null = follow nitro) */
  spoilerForce: number | null = null;
  /** Phase Ghost: materials' own transparency, restored when the effect ends */
  private fadeState: { m: THREE.Material; transparent: boolean; opacity: number; depthWrite: boolean }[] = [];
  private fade = 1;
  private fadeSolid = true;
  private wheelV = 0;
  private prevAir = 0;
  private t = 0;
  /** 0..1 nitro look (set by Vehicle from the boost envelope) */
  nitro = 0;
  onReady: (() => void) | null = null;

  constructor() {
    this.root.visible = false;
    // nitro flame: an additive cone along +z (backwards), soft blue like the boost art, white core
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    void this.load();
  }

  private async load() {
    try {
      this.build(parseGlb(await assetBytes(x1Url)));
    } catch (e) {
      console.warn('[car] 3D model unavailable, keeping the rear image', e);
    }
  }

  private build(scene: THREE.Group) {
    const s = RENDER.carScale;
    const model = scene.getObjectByName('X1') ?? scene;
    model.scale.setScalar(s);
    // materials by name: procedural textures + in-game glow levels (the GLB's images are not decoded)
    model.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || this.mats.has(m.name)) return;
      this.mats.set(m.name, m);
      (o as THREE.Mesh).castShadow = false;
    });
    const tex = (c: HTMLCanvasElement, srgb = true) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    };
    const badge = this.mats.get('X1_Badge');
    if (badge) {
      const bt = tex(x1BadgeCanvas());
      bt.wrapS = bt.wrapT = THREE.ClampToEdgeWrapping;
      badge.map = bt;
      badge.emissiveMap = bt;
      badge.transparent = true;
      badge.alphaTest = 0.05;
      badge.emissiveIntensity = RENDER.badgeGlow;
    }
    const carbon = this.mats.get('X1_Carbon');
    if (carbon) carbon.map = tex(x1CarbonCanvas());
    const tyre = this.mats.get('X1_Tyre');
    if (tyre) tyre.map = tex(x1TreadCanvas());
    // lights: exact colours (no tone-map hue shift to orange) and strong enough to bloom
    for (const [name, k] of [['X1_RearLED', RENDER.ledGlow], ['X1_RearLEDCore', RENDER.ledGlow], ['X1_RedMarker', RENDER.markerGlow], ['X1_Headlight', 0], ['X1_MirrorGlow', 0], ['X1_SeatTrim', 0], ['X1_Badge', 0]] as const) {
      const m = this.mats.get(name);
      if (!m) continue;
      m.toneMapped = false;
      if (k) m.emissiveIntensity = k;
    }
    const glass = this.mats.get('X1_Glass');
    if (glass) glass.envMapIntensity = 0.18; // dark tint, soft highlight (no glare blob from the sun)
    this.spoiler = model.getObjectByName('Spoiler_Pivot') ?? null;
    for (const m of this.mats.values()) {
      this.orig.set(m, { color: m.color.getHex(), emissive: m.emissive.getHex(), ei: m.emissiveIntensity });
      this.fadeState.push({ m, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
    }

    // sprung body: re-parent under a pivot at axle height
    const body = model.getObjectByName('Body');
    if (body) {
      const py = 0.5;
      this.bodyPivot.position.set(0, py, 0);
      body.position.y -= py;
      model.add(this.bodyPivot);
      this.bodyPivot.add(body);
    }
    // wheels (radius from the tyre's bounds) + a speed blur disc on each rim face
    const blurTex = glowTexture();
    for (const id of ['FL', 'FR', 'RL', 'RR']) {
      const hub = model.getObjectByName(`Wheel_${id}`);
      const spin = model.getObjectByName(`Spin_${id}`);
      const tyreM = model.getObjectByName(`Tyre_${id}`) as THREE.Mesh | undefined;
      if (!hub || !spin || !tyreM) continue;
      tyreM.geometry.computeBoundingBox();
      const bb = tyreM.geometry.boundingBox!;
      const r = (bb.max.y - bb.min.y) / 2;
      const w = bb.max.x - bb.min.x;
      const side = hub.position.x < 0 ? -1 : 1;
      const blur = new THREE.Mesh(
        new THREE.CircleGeometry(r * 0.72, 24),
        new THREE.MeshBasicMaterial({ map: blurTex, color: 0x15171b, transparent: true, opacity: 0, depthWrite: false }),
      );
      blur.rotation.y = (side * Math.PI) / 2;
      blur.position.x = side * (w * 0.5 + 0.004);
      hub.add(blur);
      this.wheels.push({ hub, spin, front: id[0] === 'F', r: r * s, blur });
    }
    // nitro sockets → flames
    for (const id of ['NitroSocket_L', 'NitroSocket_R']) {
      const so = model.getObjectByName(id);
      if (!so) continue;
      this.sockets.push(so);
      for (const [mat, rad] of [[this.flameMat, 0.075], [this.coreMat, 0.035]] as const) {
        const geo = new THREE.ConeGeometry(rad, 1, 14, 1, true);
        geo.translate(0, -0.5, 0);
        geo.rotateX(-Math.PI / 2); // tip toward +z (out of the back)
        const f = new THREE.Mesh(geo, mat);
        f.visible = false;
        f.renderOrder = 5;
        so.add(f);
        this.flames.push(f);
      }
    }
    this.root.add(model);
    this.ready = true;
    this.onReady?.();
  }

  /** colourway + locked (dark silhouette) preview */
  applySkin(skin: MeshSkin, locked: boolean) {
    if (!this.ready) return;
    for (const [m, o] of this.orig) {
      m.color.setHex(o.color);
      m.emissive.setHex(o.emissive);
      m.emissiveIntensity = o.ei;
    }
    const paint = this.mats.get('X1_Paint');
    if (paint && (skin.tintAmt ?? 0) > 0) paint.color.setHex(skin.body);
    for (const n of ['X1_MirrorGlow', 'X1_Headlight']) {
      const m = this.mats.get(n);
      if (m) {
        m.color.setHex(skin.glow);
        m.emissive.setHex(skin.glow);
      }
    }
    if (locked) {
      for (const m of this.mats.values()) {
        m.color.multiplyScalar(0.06);
        m.emissiveIntensity = 0;
      }
    }
    this.flameMat.color.setHex(skin.glow === 0x39b6ff ? 0x3aa8ff : skin.glow);
  }

  /**
   * @param speed road speed (m/s)
   * @param lat lateral speed in lane-speeds (−1.4 … 1.4, + = moving right)
   * @param air 0 on the road … 1 airborne
   */
  update(dt: number, speed: number, lat: number, air: number, locked: boolean) {
    if (!this.ready) return;
    this.t += dt;
    // ---- wheels: spin with the road (free-wheel and slow down in the air), capped against strobing
    const onRoad = air < 0.05;
    this.wheelV = onRoad ? speed : this.wheelV * Math.exp(-0.45 * dt);
    const blurK = clamp01((this.wheelV - RENDER.wheelBlurFrom) / (RENDER.wheelBlurFull - RENDER.wheelBlurFrom));
    for (const w of this.wheels) {
      const step = wheelStep(this.wheelV, w.r, dt, RENDER.wheelMaxStep);
      w.spin.rotation.x -= step; // top of the wheel moves forward (−z)
      if (w.front) w.hub.rotation.y = -lat * RENDER.steer * (1 - air);
      (w.blur.material as THREE.MeshBasicMaterial).opacity = 0.75 * blurK;
    }
    // ---- sprung body: roll against the lane change, dip + nose-down kick on landing
    if (this.prevAir > 0.3 && onRoad) {
      this.dip.velocity -= RENDER.landDip * 9 * clamp01(this.prevAir);
      this.pitch.velocity += RENDER.landPitch * 9 * clamp01(this.prevAir);
    }
    this.prevAir = air;
    this.roll.target = lat * RENDER.bodyRoll * (1 - air);
    this.yaw.target = -lat * RENDER.bodyYaw;
    this.yaw.update(dt);
    this.pitch.target = 0;
    this.dip.target = 0;
    this.roll.update(dt);
    this.pitch.update(dt);
    this.dip.update(dt);
    // light road buzz at speed (sub-centimetre) so the body feels planted, not glued
    const buzz = (Math.sin(this.t * 41) * 0.5 + Math.sin(this.t * 67) * 0.3) * 0.004 * clamp01(speed / 30) * (1 - air);
    this.bodyPivot.rotation.set(clamp(this.pitch.value, -0.08, 0.08), clamp(this.yaw.value, -0.04, 0.04), clamp(this.roll.value, -0.06, 0.06));
    // ---- active spoiler: rises with nitro, retracts smoothly after (hinged at its front edge)
    this.spoilerK = this.spoilerForce ?? spoilerStep(this.spoilerK, locked ? 0 : this.nitro, dt, RENDER.spoilerUp, RENDER.spoilerDown);
    if (this.spoiler) this.spoiler.rotation.x = -RENDER.spoilerAngle * ease(this.spoilerK);
    this.bodyPivot.position.y = 0.5 + clamp(this.dip.value, -0.08, 0.04) + buzz;
    // ---- nitro flames from the sockets
    const k = locked ? 0 : clamp01(this.nitro);
    const show = k > 0.02;
    const fl = (0.25 + 0.75 * k) * RENDER.nitroLen / RENDER.carScale;
    const flick = 1 + Math.sin(this.t * 53) * 0.08 + Math.sin(this.t * 31) * 0.06;
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      f.visible = show;
      const core = i % 2 === 1;
      f.scale.set(1, 1, fl * (core ? 0.6 : 1) * flick);
    }
    this.flameMat.opacity = 0.75 * k;
    this.coreMat.opacity = 0.9 * k;
  }

  /** Phase Ghost: 1 = solid, lower = translucent (materials restored exactly at 1) */
  setFade(k: number) {
    if (Math.abs(k - this.fade) < 0.005) return;
    this.fade = k;
    const solid = k >= 0.995;
    const flip = solid !== this.fadeSolid;
    this.fadeSolid = solid;
    for (const f of this.fadeState) {
      f.m.transparent = solid ? f.transparent : true;
      f.m.opacity = solid ? f.opacity : f.opacity * k;
      f.m.depthWrite = solid ? f.depthWrite : false;
      if (flip) f.m.needsUpdate = true; // only when switching between solid and translucent
    }
  }

  /** settle the sprung body instantly (respawn / menu) */
  resetPose() {
    this.yaw.snap(0);
    this.spoilerK = 0;
    this.roll.snap(0);
    this.pitch.snap(0);
    this.dip.snap(0);
    this.prevAir = 0;
  }

  /** world position of nitro socket i (for trail particles) */
  socketWorld(i: number, out: THREE.Vector3) {
    const so = this.sockets[i % Math.max(1, this.sockets.length)];
    if (!so) return out.set(0, 0, 0);
    return so.getWorldPosition(out);
  }
}
