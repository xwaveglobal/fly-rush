# Step 05 — TikTok Native compatibility report (v4.2.1)

**Status: NOT validated on a TikTok device or the TikTok runtime.** No TikTok device, TikTok
developer tool or HS runtime is available in this environment. Nothing here claims a native pass.
What was done: a source audit of the native adapter on `main` against the v4 3D render code, and an
automated **no-DOM smoke test** (`scripts/native/no-dom-smoke.mjs`) that runs the v4 render stack in a
Web Worker without `window` / `document`, through a shim shaped like the native adapter. That smoke
test runs in desktop Chromium; it shows the render code has no hidden DOM dependency, **not** that the
TikTok runtime accepts it.

## Where things stand

| | `main` (v3 native) | this branch (v4 3D) |
|---|---|---|
| Native entry / build | `src/native/main.ts`, `scripts/build-tiktok.mjs` → `tiktok/game.js` | **none** — v4 has not been ported to the native build yet |
| UI | `NativeUI` (canvas) | DOM UI (`src/ui`) — the LO / MED / HI setting etc. are not in `NativeUI` |
| Car | sprite renders (PNG) | 3D X1 (`xwave-x1.glb` inlined as a data URL, own GLB parser) |
| three.js | 0.169 (WebGL2) | 0.169 (WebGL2) |

The adapter was **not modified** (instruction). The v4 → native port (entry, build loaders, NativeUI
settings) is a separate step that needs approval.

## Audit, item by item

| Area | Finding | Risk | Evidence |
|---|---|---|---|
| Canvas initialisation | The adapter makes the first `tt.createCanvas()` the screen canvas, every later `createElement('canvas')` an off-screen `tt.createCanvas()`. v4 creates extra 2D canvases at start-up for textures (windows, billboards, hazard stripes, X1 decals, glow sprites, logo). All go through `document.createElement('canvas')` → covered. | Low | smoke test: all canvas textures built on `OffscreenCanvas` with no DOM |
| WebGL context | three 0.169 requires WebGL2; `main` already ships 0.169 natively, so WebGL2 on the runtime is the existing assumption, not a new one. | Same as v3 | smoke test: WebGL2 context on a runtime canvas |
| Textures | New in v4: `DataTexture` (procedural road, 256 / 512 × 2 sizes, RGBA8 + mipmaps), `InstancedMesh` instance colours, canvas textures. No KTX / compressed textures, no `fetch`, no `TextDecoder` (GLB parsed from a data URL by `glbParse.ts`). The logo uses `new Image()` → adapter `makeImage()` (`tt.createImage`). | Low–medium: data-URL images on `tt.createImage` must be verified on device | smoke test loads the images through an `Image` shim |
| Shaders | `onBeforeCompile` chunk edits (road, buildings, CarFx, far fade). Uses `fwidth` (WebGL2 core), no `gl_InstanceID`, no float render targets beyond what bloom (`UnrealBloomPass`, HalfFloat) needs. Bloom / speed blur only on MEDIUM / HIGH. | Medium: half-float render targets on low-end Android GPUs; precision on Mali | smoke test compiles all programs on SwiftShader; device run needed |
| Audio | Unchanged from v3 (`AudioContext` → `tt.createWebAudioContext`). v4 adds no audio API. | Same as v3 | source |
| Lifecycle / resume | Adapter maps `tt.onHide` / `tt.onShow` to `document.hidden` + `visibilitychange`, `tt.onWindowResize` to `resize` — the events the game already uses. v4 adds no lifecycle code. | Same as v3 | source (`main:src/native/adapter.ts`) |
| Touch / swipe | `NativeUI` listens to `tt.onTouchStart/Move/End` and feeds the game's swipe input; v4 input code unchanged. | Same as v3 (needs the NativeUI port) | source (`main:src/native/ui/NativeUI.ts`) |
| Safe area | Adapter exports `safeArea` from `getSystemInfoSync`; used by `NativeUI`. The v4 DOM UI uses CSS `env(safe-area-inset-*)` — not available natively; the port must reuse `NativeUI`. | Port item | source |
| Memory | v4 GPU memory estimate (MEDIUM, phone viewport): road 3 × 512 × 1024 RGBA + mips ≈ 8 MB (LOW 256 × 512 ≈ 2 MB); city / car / FX canvases ≈ 6–8 MB; bloom targets at half res. JS heap ≈ 30–40 MB in desktop Chrome (see the performance report). No growth over a 60 s run or across preset switches. | Medium on 2 GB phones | `perf_desktop_swiftshader.json`, `env_selftest` |
| Context loss | New in v4.2.1: `Renderer` handles `webglcontextlost` (prevent default, stop drawing) / `webglcontextrestored` (rebuild post-processing). **On native the adapter's `addEventListener` on the canvas is a no-op**, so these events never arrive there; three.js would also need every texture re-uploaded (it does that itself on restore in the browser). | **Open**: native context loss is not handled | smoke test: `WEBGL_lose_context` lose → restore in the worker |
| Packaging | `build-tiktok.mjs` has no `.glb` loader (needs `'.glb': 'dataurl'` or `'binary'`) and stubs `GLTFLoader` (v4 does not use it). The native IIFE target is es2018 — v4 code builds at es2018 (the smoke test bundles with that target). | Port item | smoke test build at es2018 |

## Test package to run on a device (when approved)

1. Branch from this feature branch (not `main`): `feat/v4-native-port`.
2. Port: add `'.glb': 'dataurl'` to `scripts/build-tiktok.mjs` loaders; route the v4 Game through
   `NativeUI` (add the LO / MED / HI setting there); keep the adapter unchanged except — if needed —
   forwarding a runtime context-loss callback, if TikTok exposes one.
3. `npm run build:tiktok` → `tiktok/` folder; open it in the TikTok developer tool, then on devices.
4. Add `?perf=1`-equivalent: the `PerfRecorder` in `src/core/perf.ts` has no DOM and can feed the
   NativeUI overlay.

## Device checklist (each on a low-end Android, a mid Android and an iPhone)

| # | Check | Pass when |
|---|---|---|
| 1 | Launch | Home within 5 s, no red screen, logs show `WebGL2` |
| 2 | Canvas | full screen, correct DPR (LOW 1.25, MEDIUM 1.5, HIGH 2), no stretched UI |
| 3 | Textures | road markings, window lights, billboards, X1 decals and logo visible (no black / white squares) |
| 4 | Shaders | no shader compile error in the log on every preset; bloom on MEDIUM / HIGH |
| 5 | GLB car | the 3D X1 appears (not the sprite fallback), spoiler opens on a jump |
| 6 | Audio | music + SFX after the first touch; no audio after `onHide`, back after `onShow` |
| 7 | Lifecycle | background → foreground 10 times during a run: game pauses, resumes, no black frame |
| 8 | Touch | swipe left / right / up / down in < 150 ms each, no missed swipes near the screen edges |
| 9 | Safe area | HUD and buttons clear of the notch / home indicator |
| 10 | Effects | Shield, Turbo, Shield + Turbo, Ring Coins, Phase Ghost, Dive, Crash all render |
| 11 | Presets | switch LO → MED → HI → LO 5 times: no crash, no frame-time step that stays |
| 12 | Memory | 10-minute run: memory in the dev tool flat after the first minute |
| 13 | Context loss | lock the phone 2 min mid-run, unlock: picture comes back (known open item) |
| 14 | FPS | `PerfRecorder` p95 frame time per preset: target ≤ 20 ms MEDIUM on the mid device |

Results go in a table in this file, per device, with the build hash.
