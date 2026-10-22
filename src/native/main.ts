/**
 * v3 — native TikTok mini game entry (bundled to tiktok/game.js by scripts/build-tiktok.mjs).
 *
 *   adapter (window/document shim) → HS SDK (profile, ads, share, shop) → the Game on the screen
 *   canvas → the canvas UI drawn on top (Renderer.uiPass) → tt touch routed to UI or steering.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DPR, NATIVE, emitWindow, makeImage, safeArea, screenCanvas, sizeScreen, viewH, viewW } from './adapter.ts';
import { hs, profile } from './hs.ts';
import './save.ts';
import * as THREE from 'three';
import { setAdProvider, type RewardPlacement } from '../ads/Ads.ts';
import { platform } from '../platform.ts';
import { Game } from '../Game.ts';
import type { UI } from './ui/NativeUI.ts';
import { Gfx } from './ui/gfx.ts';
import { SAFE } from './ui/layout.ts';

declare const GameGlobal: any;
const G: any = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
const T: any = G.tt;

// ---------------------------------------------------------------- platform services (HS SDK)
platform.native = true;
platform.canvas = screenCanvas;
platform.share = (text) => hs.share('Sky Roadster', text).then((r) => r === 'shared');
platform.buy = (sku) => hs.buy(sku);
setAdProvider({
  name: 'hs',
  rewarded: (p: RewardPlacement) => hs.rewarded(p),
  interstitial: () => hs.interstitial(),
});

// ---------------------------------------------------------------- safe area (status bar, TikTok capsule)
function measureSafe() {
  SAFE.top = Math.max(0, safeArea?.top ?? 0);
  SAFE.bottom = Math.max(0, viewH - (safeArea?.bottom ?? viewH));
  try {
    const m = T.getMenuButtonBoundingClientRect?.();
    if (m && m.bottom > 0 && m.bottom < viewH / 3) SAFE.menuBottom = m.bottom + 4;
  } catch {
    /* no capsule */
  }
}
measureSafe();

// ---------------------------------------------------------------- the game
const container: any = {
  get clientWidth() {
    return viewW;
  },
  get clientHeight() {
    return viewH;
  },
  appendChild: (x: any) => x,
  removeChild: (x: any) => x,
  addEventListener() {},
  removeEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: viewW, height: viewH, right: viewW, bottom: viewH }),
  style: {},
};

let game: Game | null = null;
let ui: UI | null = null;
try {
  game = new Game(container);
  ui = (game as any).ui as UI;
} catch (e) {
  console.error('[sky-roadster] could not start the 3D view', e);
}

// ---------------------------------------------------------------- canvas UI layer over the 3D view
const uiCanvas: any = G.document?.createElement ? G.document.createElement('canvas') : T.createCanvas();
const gfx = new Gfx(uiCanvas);
gfx.makeImage = makeImage;
const uiScale = Math.min(DPR, 2);
gfx.resize(viewW, viewH, uiScale);
let uiTex: THREE.CanvasTexture | null = null;
let uiScene: THREE.Scene | null = null;
let uiCam: THREE.OrthographicCamera | null = null;
if (ui && game) {
  ui.attach(gfx);
  uiTex = new THREE.CanvasTexture(uiCanvas);
  uiTex.colorSpace = THREE.SRGBColorSpace;
  uiTex.minFilter = THREE.LinearFilter;
  uiTex.generateMipmaps = false;
  uiScene = new THREE.Scene();
  uiCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: uiTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  quad.frustumCulled = false;
  uiScene.add(quad);
  const renderer = (game as any).renderer;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  renderer.uiPass = (r: THREE.WebGLRenderer) => {
    if (ui!.frame(now())) uiTex!.needsUpdate = true;
    const tm = r.toneMapping;
    r.toneMapping = THREE.NoToneMapping;
    r.render(uiScene!, uiCam!);
    r.toneMapping = tm;
  };
  // until the game loop starts (boot: shaders, key art), draw the UI alone — no blank screen
  let booted = false;
  const r3: THREE.WebGLRenderer = renderer.renderer;
  const orig = r3.setAnimationLoop.bind(r3);
  r3.setAnimationLoop = (cb: any) => {
    booted = true;
    orig(cb);
  };
  const raf = G.requestAnimationFrame ?? ((cb: () => void) => setTimeout(cb, 16));
  const pre = () => {
    if (booted) return;
    try {
      r3.setRenderTarget(null);
      r3.setClearColor(0x04071a, 1);
      r3.clear();
      renderer.uiPass(r3);
    } catch {
      /* not ready */
    }
    raf(pre);
  };
  pre();
}

// ---------------------------------------------------------------- touch: UI first, else steering
let owner: 'ui' | 'input' | null = null;
let touchId: number | null = null;
let firstTouch = true;
const input = () => (game as any)?.input as { touchBegin(x: number, y: number): void; touchMove(x: number, y: number): void; touchEnd(): void } | undefined;
function pt(e: any): { id: number; x: number; y: number } | null {
  const list = e?.changedTouches ?? e?.touches ?? [];
  const t = list[0];
  if (!t) return null;
  return { id: t.identifier ?? 0, ...xy(t) };
}
/** a touch point in CSS pixels (a runtime reporting device pixels is scaled back) */
function xy(t: any): { x: number; y: number } {
  let x = Number(t.clientX ?? t.x ?? t.pageX ?? 0),
    y = Number(t.clientY ?? t.y ?? t.pageY ?? 0);
  if (x > viewW * 1.25 || y > viewH * 1.25) {
    x /= DPR;
    y /= DPR;
  }
  return { x, y };
}
/** web preview (browser / artifact frame): the shim cancels pointerdown, so the page never takes
 *  keyboard focus by itself — focus it on every tap so the arrow keys / WASD steer */
function takeFocus() {
  if (NATIVE) return;
  try {
    G.focus?.();
    const c = screenCanvas as any;
    if (c && typeof c.focus === 'function') {
      if (!(c.tabIndex >= 0)) c.tabIndex = 0;
      c.style.outline = 'none';
      c.focus({ preventScroll: true });
    }
  } catch {
    /* ignore */
  }
}
function onStart(e: any) {
  takeFocus();
  const p = pt(e);
  if (!p) return;
  if (firstTouch) {
    firstTouch = false;
    emitWindow('pointerdown');
    emitWindow('touchstart');
  }
  if (touchId !== null) {
    // a second finger: only UI taps (ROADSTER / SOS while steering)
    ui?.touchStart(p.x, p.y);
    ui?.touchEnd();
    return;
  }
  touchId = p.id;
  if (ui && ui.touchStart(p.x, p.y)) owner = 'ui';
  else {
    owner = 'input';
    input()?.touchBegin(p.x, p.y);
  }
}
function onMove(e: any) {
  const list = e?.changedTouches ?? e?.touches ?? [];
  for (const t of list) {
    if ((t.identifier ?? 0) !== touchId) continue;
    const { x, y } = xy(t);
    if (owner === 'ui') ui?.touchMove(x, y);
    else if (owner === 'input') input()?.touchMove(x, y);
  }
}
function onEnd(e: any) {
  const list = e?.changedTouches ?? [];
  let mine = !list.length;
  for (const t of list) if ((t.identifier ?? 0) === touchId) mine = true;
  if (!mine) return;
  if (owner === 'ui') ui?.touchEnd();
  else if (owner === 'input') input()?.touchEnd();
  owner = null;
  touchId = null;
}
T.onTouchStart?.(onStart);
T.onTouchMove?.(onMove);
T.onTouchEnd?.(onEnd);
T.onTouchCancel?.(onEnd);

// ---------------------------------------------------------------- resize
G.addEventListener?.('resize', () => {
  sizeScreen();
  measureSafe();
  gfx.resize(viewW, viewH, uiScale);
  if (ui) ui.dirty = true;
});

// ---------------------------------------------------------------- HS events
hs.onPause(() => {
  const gm: any = game;
  if (!gm) return;
  gm.audio?.duck(true);
  if (gm.state === 'run') gm.pause();
});
hs.onResume(() => {
  (game as any)?.audio?.duck(false);
});
hs.onGiven((items) => {
  const gm: any = game;
  const parts: string[] = [];
  for (const [k, n] of Object.entries(items)) if (n) parts.push(k === 'coins' ? `+${n} coins` : `${hs.itemName(k)} ×${n}`);
  if (parts.length) ui?.toast(`🎁 <b>${parts.join(' · ')}</b>`, 'var(--gold)');
  if (gm) {
    gm.persist?.();
    ui?.refreshProfile(gm.save);
    gm.perkBadges?.();
  }
});
for (const k of ['coins', 'super', 'hyper', 'escape', 'no_ads'])
  profile.on(k, () => {
    if (ui) ui.dirty = true;
  });

// ---------------------------------------------------------------- go
if (game) {
  T.setKeepScreenOn?.({ keepScreenOn: true });
  game.boot().catch((e: unknown) => console.error('[sky-roadster] boot failed', e));
}
void NATIVE;
