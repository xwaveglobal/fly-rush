import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** objects on this layer skip post-processing and are drawn last, pixel-exact (the car render) */
export const OVERLAY_LAYER = 1;

export type Quality = 'high' | 'low';

/**
 * WebGL renderer + optional half-resolution bloom. "low" quality drops bloom,
 * MSAA and caps the pixel ratio — the game logic is identical either way.
 */
export class Renderer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private renderPass: RenderPass | null = null;
  quality: Quality;
  pixelRatio = 1;
  width = 1;
  height = 1;
  /**
   * Dynamic resolution: upper bound for the pixel ratio on HIGH. Starts at 2 and
   * steps down (1.75 → 1.5) on slow devices before bloom is dropped — keeps MSAA
   * and crisp silhouettes instead of jumping straight to LOW.
   */
  scaleCap = 2;
  /** bloom is the first effect to go on weak GPUs (step after the resolution steps) */
  bloomEnabled = true;
  /** max anisotropic filtering supported (road/lane textures stay sharp at grazing angles) */
  maxAniso = 4;

  constructor(private container: HTMLElement, quality: Quality, private camera: THREE.PerspectiveCamera) {
    this.quality = quality;
    this.renderer = this.makeRenderer(quality);
    container.appendChild(this.renderer.domElement);
    this.maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    (this.scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = 0.6;
    pmrem.dispose();
    this.setQuality(quality);
  }

  private makeRenderer(_q: Quality) {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.style.display = 'block';
    r.domElement.style.width = '100%';
    r.domElement.style.height = '100%';
    return r;
  }

  setQuality(q: Quality) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = q === 'high' ? Math.min(dpr, this.scaleCap) : Math.min(dpr, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
    if (q === 'high' && this.bloomEnabled) {
      if (!this.composer) {
        // the composer renders into its own target: give it MSAA, otherwise the canvas
        // antialias flag is silently ignored and every edge looks soft/jagged
        const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.renderer.capabilities.isWebGL2 ? 4 : 0 });
        this.composer = new EffectComposer(this.renderer, rt);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        // tight, high-threshold bloom: lights glow, silhouettes stay crisp
        this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.22, 1.0);
        this.composer.addPass(this.bloom);
        this.composer.addPass(new OutputPass());
      }
    } else if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloom = null;
    }
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.pixelRatio);
      this.composer.setSize(w, h);
      // bloom at half resolution — big win on mobile fill-rate
      this.bloom?.setSize((w * this.pixelRatio) / 2, (h * this.pixelRatio) / 2);
    }
    return w / h;
  }

  /** step dynamic resolution down; returns false when nothing is left to reduce */
  degrade(): boolean {
    if (this.quality !== 'high') return false;
    const dpr = window.devicePixelRatio || 1;
    if (this.scaleCap > 1.5 && dpr > 1.5) {
      this.scaleCap = this.scaleCap > 1.75 ? 1.75 : 1.5;
      this.setQuality('high');
      return true;
    }
    if (this.bloomEnabled) {
      this.bloomEnabled = false;
      this.setQuality('high');
      return true;
    }
    return false;
  }

  setBloom(strength: number) {
    if (this.bloom) this.bloom.strength = strength;
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    // overlay: the car render (layer OVERLAY_LAYER) is drawn last, straight onto the canvas,
    // so tone mapping, bloom and scene lighting never change its pixels (exact studio image)
    const r = this.renderer;
    const auto = r.autoClear;
    r.setRenderTarget(null);
    r.autoClear = false;
    r.clearDepth();
    const bg = this.scene.background;
    this.scene.background = null; // never repaint the sky over the finished frame
    this.camera.layers.set(OVERLAY_LAYER);
    r.render(this.scene, this.camera);
    this.camera.layers.set(0);
    this.scene.background = bg;
    r.autoClear = auto;
  }

  get info() {
    return this.renderer.info;
  }
}
