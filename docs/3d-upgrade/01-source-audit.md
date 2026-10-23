# 01 — Source audit (Step 01, v4.0.1 baseline)

Audited on 2026-10-23 on branch `feature/sky-roadster-3d-v4.1` (= `v4.0.1`, commit `665fc30`).
Every statement below comes from reading the files named. Nothing was changed in the game code.

## A. Repository

| Item | Value |
|---|---|
| Project root | repo root (`package.json`, `index.html`, `vite.config.ts`, `src/`) |
| Branch / commit audited | `v4.0.1` @ `665fc30` → new branch `feature/sky-roadster-3d-v4.1` (same commit, pushed) |
| Code lineage | `v4.0.1` = H5 web game **v2.3.0** (`4063a94`) + version bump. `main` (v3 native) = the same v2.3.0 + the native layer, so `4063a94` is the merge base of both. |
| Game version | `const VERSION = 'v4.0.1'` in `src/Game.ts:60` |
| package.json | name `xwave-flying-run`, version field `1.0.0` (not used for the game version) |
| Engine | **Three.js 0.169.0** (pinned), `@types/three ^0.169.0` |
| Language / build | TypeScript ^5.6.3 (strict), Vite ^5.4.10, `vite-plugin-singlefile` ^2.0.3; fallback `scripts/build-esbuild.mjs` |
| Other rendering deps | none — post-processing, RoomEnvironment, RoundedBoxGeometry, GLTFLoader, BufferGeometryUtils all from `three/examples/jsm` |
| Scripts | `dev`, `build` (tsc + vite), `build:single`, `preview`, `typecheck`, `test` (7 suites: fairness, difficulty, air, exp, phases, bonus, server) |
| Uncommitted work | none (working tree clean) |
| Baseline tag | annotated tag `v4.0.1` → `665fc30` created **locally only**: tag pushes are refused by this session's git proxy (HTTP 403). Needs one push from the owner's PC: `git push origin v4.0.1` (or create it on GitHub → Releases). |
| Remote branches | `main` (v3.0.10), `v1`, `v2`, `v4.0.1`, `feature/sky-roadster-3d-v4.1`, `feat/v3-native`, `3.0.8-backup` |

## B. Rendering

### Renderer — `src/render/Renderer.ts`
- `THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false })`.
- `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, exposure `1.05`.
- Environment: `PMREMGenerator.fromScene(RoomEnvironment)` as `scene.environment`, intensity 0.6.
- **High** quality: `EffectComposer` on a HalfFloat target with 4× MSAA → `RenderPass` → `UnrealBloomPass` (strength 0.3, radius 0.22, threshold 1.0, half resolution) → custom `SpeedBlurShader` (radial edge blur, 8 taps) → `OutputPass`.
- **Low** quality: plain `renderer.render`, pixel ratio ≤ 1.5, no bloom/blur.
- Dynamic resolution: `scaleCap` 2 → 1.75 → 1.5, then bloom off (`degrade()`); `Game.ts:3353` drops to LOW for the session if a run averages < 42 fps.
- **Overlay pass**: after the main frame, depth is cleared and objects on `OVERLAY_LAYER = 1` are drawn straight to the canvas, untouched by tone mapping, bloom and scene light. This exists only for the car image.
- No shadow maps anywhere (`castShadow` is never set true; the car sets every mesh to false).

### Vehicle — `src/render/Vehicle.ts` (1,596 lines)
**What the player sees is a 2D image, not a 3D model.**
- Every skin in `SKINS` has `shape: 'gt'` → `spriteOn = true` → the car is a **billboard plane** (`PlaneGeometry(1,1)` + custom `ShaderMaterial`) showing a pre-rendered studio image.
- Images (`src/assets/images/car/`): `x1-back.webp` 1024×588 (main), `x1-back-boost.webp` 1024×758 (flames/smoke version, cross-faded during boost), `vega-back.webp` 1024×542 (Vega's own render), 7 other angles at ~450×180 (too small, unused), `x1-aura.webp` (power-up outline), `x1-tread.png` + `x1-tyrefx.png` (tyre tread scroll mask).
- `rearOnly = true`: only the rear view is ever shown (`updateSprite`, line 940). The plane is rotated to copy the camera's orientation, then rolled by the bank angle.
- Paint colourways = shader recolour of bright, unsaturated pixels (`tint`, `tintAmt`).
- Wheels: the tread texture scrolls inside a mask on the two rear tyres, speed-tiered blur (`TYRE` in `config.ts`).
- Suspension: spring on sprite Y (bumps, lane kick, landing kick, accel squat) — `TYRE.susp`.
- Shield dome, boost jets, aura, orbit trails, contact shadow = more textured planes around the sprite.
- Drawn in the overlay pass (`layers.set(OVERLAY_LAYER)`), `depthWrite: false`; depth test switches off when airborne so the car draws over obstacles it clears.
- **A full procedural 3D car also exists but is hidden**: lofted/extruded body, wheel/thruster "pods" that fold from wheels into thrusters, wings, underglow, 5 body shapes (`buildShape`). `setSkin` hides all of it when the sprite is on. It is a toy-like coupe, not a faithful copy of the X1 render.
- `useModel(obj)` (line 1253) and `AssetLoader` + `manifest.ts` (`vehicle.xwave`) support a GLB shell; no GLB file exists (`public/assets/vehicles/` is empty).

### Coordinate system, scale, orientation
- +Y up, **−Z forward**, 1 unit = 1 m (also stated in `src/assets/manifest.ts`).
- **The car never moves forward**: it stays at z = 0; the world scrolls toward +Z. Car x = lane position, y = height.
- Lanes x = −2.6 / 0 / +2.6 (`config.ts LANES`).
- Car hitbox half-extents 0.7 × 0.36 × 1.0 m (`CAR_HALF`). Sprite height 1.12 m on screen, width from image aspect (~1.95 m).
- Visual height mapping (Vehicle.update): gameplay `y` 0.48 / 1.0 / 3.05 → visual 0.3 / 0.51 / 3.35, then 1:1 above HIGH.

### Camera — `src/render/CameraRig.ts`
- `PerspectiveCamera(70, 9/16, 0.1, 1500)`.
- FOV: computed to keep ~**72° horizontal** in portrait, clamped 52–80° vertical; when clamped the camera pushes back.
- Run mode: position `(x·0.72 + sway, 3.25 + lift, 6.6 + pushBack − speed·0.6)`, look-at `(x·0.55, 1.15 + lift, −9)`. FOV + `speed·7` + `turbo·9` + kick.
- Smoothing: exponential `damp` (pos 6.5, height 6, look-x 7), trauma shake + Turbo rumble, roll from lateral velocity (±0.06 rad), cinematic swing for the Roadster roll.
- Modes: `menu` (5-shot showroom glide behind the car), `garage`, `run`, `crash`.

### Road — `src/render/Track.ts`
- One static `PlaneGeometry(8.6, 300)` road from z = +30 to −270 + a 9.4 × 0.9 deck box. **Nothing moves**: road, rail and wall textures scroll (`offset.y = dist / 12 % 1`).
- Material: `MeshStandardMaterial` with a canvas road texture (`textures.ts roadTexture`) used as map **and** emissive map (intensity 0.6), roughness 0.42, metalness 0.5.
- Rails with scrolling light dashes, side walls (4 m ribs, 1.25 m high), lamps and pylons as `InstancedMesh`, repositioned by modulo (`wrapZ`) — zero spawning.
- No curves, no hills, no lane markings as geometry.

### Environment — `src/render/Scenery.ts` (1,174 lines)
- `LOOKS` per world: sky gradient, linear `Fog` (near 30–100 m, far 190–460 m), hemisphere light, one sun `DirectionalLight`, one rim `DirectionalLight`, accent colour.
- Worlds: city, tunnel, cloud, space, mega + ladder worlds (harbor, solar, canyon, …) + bonus worlds.
- Buildings: `BuildingField` = `InstancedMesh` boxes with canvas window textures, recycled by `wrapZ`. Billboards, floating islands, cloud sea, starfield.
- `SkyTraffic`: instanced hover cars drifting in the sky (background only, no collision).
- Roadside props (`Scroller`) recycled by modulo.

### Lighting & shadows
- Hemisphere + sun + rim directional lights, RoomEnvironment IBL. **No shadow maps.** A blurred texture under the car (`contactShadow`) fakes contact.

### Effects — `src/render/Effects.ts` + Game.ts
- `Particles`: one `Points` buffer, 2,400 max (sparks, trails, smoke; locked-to-car option).
- `SpeedLines`: 140 additive line segments.
- `RingPulses`, `Debris`, `makeShield`, `makePortal`; `Shatter.ts` (car break-apart on crash).
- Turbo look: boost render cross-fade, boost jets, FOV +9, camera rumble, speed blur (High only), bloom strength.
- Air trails from jet points (`Game.updateTrails`), halved on LOW.

### Obstacles & pickups
- `ObstacleViews.ts` (873 lines): procedural meshes per type and theme, pooled, outlines for readability. Hitboxes are **not** here (they live in `gameplay/ObstacleRules.ts`).
- `PickupViews.ts`: instanced coins, extruded power-up icons.

### Mobile performance measures already in place
Instanced buildings / lamps / pylons / coins, `mergeByMaterial` + `bakeVertexColors` (draw-call merging), half-res bloom, dynamic resolution, auto LOW below 42 fps, `renderer.compile` at load (`Game.ts:575`), modulo recycling instead of spawning, debug overlay (`?debug`: fps, calls, tris, dpr).

## C. Gameplay (must stay unchanged)

| Topic | Implementation |
|---|---|
| Lanes | 3 lanes, x = −2.6 / 0 / 2.6, spacing 2.6 m (`config.ts`) |
| Swipe input | `src/core/Input.ts`: fires **during** the move once it passes `max(22 px, 4.5 % of the short screen side)`; one drag can chain gestures; keyboard ←/→/↑/↓, WASD, Space; E/Enter = Sky Escape; R/Shift = Roadster/Hyper jump; mouse-drag fallback |
| Lane change | `Player.ts`: 0.22 s ease-in-out cubic (× 0.55–1.6 by distance), input buffer 0.12 s; Air Dash crosses 2 lanes in 0.34 s while airborne |
| Jump (FLY UP) | phases antic 0.06 / exec 0.2 / hold 0.52 / recover 0.3 s to HIGH = 3.05 m; landing buffer 0.34 s; 0.03 s rest; Roadster jump 5.6 m, Hyper 7.4 m, Sky Escape 9.6 m |
| Down (FLY DOWN) | antic 0.05 / exec 0.14 / hold 0.52 / recover 0.24 s to LOW = 0.48 m, smaller hitbox (half-y 0.28) |
| "Nitro" | There is no manual nitro. **Turbo** is a road pickup (`POWERUP_DURATION.turbo` 4 s, ×1.55 speed, smashes obstacles) eased in by `Game.turboMulNow`. Roadster/Hyper jumps are charge items fired by button/key. |
| Collision | `World.ts:170`: car AABB vs obstacle boxes from `ObstacleRules.hitboxes`, swept along z; overlap → `hit` (or `smash` in Turbo); near misses from the min gap |
| Spawning | `Spawner.generateUntil(dist + SPAWN_AHEAD 175 + 60)`, fairness model (`Fairness.ts`, `FAIRNESS` budgets) guarantees every row is passable — covered by tests |
| Speed | `speedAt(d) = 21 + 25·(1 − e^(−d/3200))` m/s × level (0.82 / 1.21 / 1.5) × rank-phase multiplier; World eases toward it |
| HUD / UI | DOM overlay `src/ui/UI.ts` (2,382 lines) + `ui.css`; `ui.updateHud(run, speed, maxSpeed, mission)` from Game.ts |

## D. TikTok Native compatibility (read from `main`, not present on this branch)

`v4.0.1` contains **no** native code. The native layer lives on `main` (v3.0.10). Nothing was modified.

| Item | Where (on `main`) |
|---|---|
| Entry point | `src/native/main.ts` → bundled to `tiktok/game.js` |
| Build | `scripts/build-tiktok.mjs` (esbuild, IIFE, **es2018**, `__NATIVE__`); swaps `ui/UI` → `src/native/ui/NativeUI.ts`, stubs CSS, **stubs GLTFLoader** (`scripts/stubs/GLTFLoader.js` rejects every load), maps every `.webp` import to a PNG/JPG copy in `src/native/img/`; guard rejects post-ES2017 regex. Also `check:tiktok`, `pack:tiktok`, `preview:tiktok` (`hs-sdk/web/hs-web.mjs`). |
| Canvas | the first `tt.createCanvas()` is the screen canvas (`adapter.ts:32`); extra canvases via `tt.createCanvas()`; `Renderer` takes an optional `canvas` and skips its own sizing (`main` Renderer.ts diff) |
| WebGL | same `THREE.WebGLRenderer` on the screen canvas; r169 needs **WebGL 2** in the TikTok runtime |
| Assets | images bundled as files in `tiktok/assets/`; `makeImage()` wraps `tt.createImage` with `addEventListener` for Three's ImageLoader |
| Platform adapters | `adapter.ts` (window/document/localStorage/Image/rAF shims), `hs.ts` (HS SDK: profile, ads, share, shop), `save.ts` + `src/core/kv.ts` (save → HS profile), `src/platform.ts`, `setAdProvider` in `ads/Ads.ts` |
| UI | canvas UI (`src/native/ui/*`) drawn in `Renderer.uiPass` after the 3D frame |
| Runtime limits | no DOM/CSS; no GLB loading in the native build; ES2018 target and no `\p{}` regex (Android engine); WebGL2 required; one screen canvas |
| Known issues (from `main` docs/PROGRESS.md) | Android jank at home/race start → `scaleCap 1.5` on Android + pre-compile pooled meshes (v3.0.9); Android regex SyntaxError (fixed v3.0.6); Android safe-area in px (fixed v3.0.7); iPhone audio crackle → baked audio (v3.0.6); HS shop off on Android; `build-tiktok.mjs` asks for `scripts/native-images.py` to make PNG copies, but that script is **not in the repo** |

Shared files changed between v2.3.0 and `main` outside `src/native` (19 files, mostly Game/Audio/Input/Save/UI). In `src/render/` only `Renderer.ts` differs (+canvas param, +`uiPass`). So rendering work done on v4 can be carried to the native build with small merges.
