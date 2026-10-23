# Step 05 — Visual readability, mobile performance & TikTok Native validation (v4.2.1)

Branch `feature/sky-roadster-3d-v4.1` (base v4.2.0 `d222b92`). Gameplay, hitboxes, lanes, speeds,
obstacle timing, item mechanics, coin multipliers and the server are unchanged
(`git diff d222b92 -- src/gameplay src/core/Rng.ts server` is empty; all gameplay suites pass).

## 0 — Baseline (v4.2.0, `d222b92`)

| | v4.2.0 |
|---|---|
| Working tree | clean at `d222b92` |
| H5 JS / single file | 4,344 KB / 4,568 KB |
| Draw calls at 140 m (one render, real build, 360 × 640 @2) | LOW 134 · MEDIUM 158 · HIGH 159 |
| Road textures | 3 × 512 × 1024 RGBA + mips on every preset (≈ 8 MB) |
| FPS on a phone | never measured |
| Problems seen in the Step 04 screenshots | Ring Coins: thick blue tube + glowing disc filling the ring — covers the car and the lane ahead; jumps: the car rises to ~0.36–0.46 of the screen height and the lane ahead is hidden behind it; sparks / smoke particles large and dense |

The v4.2.0 build was kept as a worktree for the before / after shots.

## 1 — Ring Coins

`src/render/ObstacleViews.ts`: thin gold ring (tube 5.5 cm instead of 15 cm), a fine inner ring and
three slow outer arcs; **no disc and no glow sprite** — the centre is open, so the car, the road and the
obstacles behind it stay visible. Gold = coins; Shield is cyan, Turbo lime. Flying through it plays a
0.35 s collect animation (expands × 1.45 and fades out) — `Game` calls `ObstacleViews.collect(o)` on
the existing `ring` world event, and the old full-screen ring burst became 10 small gold sparks.
The ring's hitbox, points, coin multiplier and gift logic are unchanged (`ObstacleRules` / `Run`
untouched).

## 2 — Airborne camera

Cause: the chase camera followed only ~28 % of the car's height (`lift 0.28`) and looked up with it
(`lookLift 0.32`), so on a jump the car climbed to the top half of the screen and covered the road
ahead. BALANCED (default) and LOW now rise with the car like a drone (`lift 1.7`, `lookLift 0.1`) with
a quicker vertical follow (`vDamp 8`, still damped: no snapping); HIGH is unchanged. Jump physics,
`Player`, heights and hitboxes are unchanged. New camera test (`npm run test:camera`): through whole
jumps on 9:16 and 9:19.5 the car's top stays below 38 % from the top and its bottom above 85 %, the
camera never moves more per frame than the car itself, and on BALANCED at most 30 % of a crate
24–44 m ahead is hidden by the car (measured 11–26 %). The pop-up spoiler stays in
view (see `02_jump_camera_before_after.png`).

## 3 — VFX cleanup

| Effect | Change |
|---|---|
| Ring Coins | see 1 |
| Shield break | 30 → 18 sparks, size 0.3 → 0.2 (the aura flash carries the hit) |
| Turbo smash | 46 + 24 sparks → 30 + 14, size 0.4 / 0.3 → 0.28 / 0.22; smoke puff 0.6 → 0.38, growth 2 → 1.4 (no cloud) |
| Respawn | 60 → 36 sparks, size 0.35 → 0.25 |
| Sky Escape / launch | 80 → 50 and 60 / 110 → 40 / 70 particles, size 0.35 → 0.26 |
| Landing dust | size 0.32 / 0.5 → 0.22 / 0.34, growth 1.6 → 1.3 |
| Ring pickup | full-screen ring burst → 10 small gold sparks |
| All bursts | scaled per preset: LOW 50 %, MEDIUM 80 %, HIGH 100 % |
| Shield, Turbo auras, Phase Ghost, dive, crash | already reworked in Steps 03.2 / 04; materials restored after Ghost (VFX self-test) |

## 4 — City

`src/render/Scenery.ts`, deterministic (seeded `Rng`), no new draw calls beyond one crown mesh per
building field: slim towers (18 %), low wide blocks (14 %), set-back crowns on ~45 % of roofs; every
building gets its own window pattern offset and share of lit windows (hashed from its position and
size in the shader); the far field's windows are dimmer (depth into the haze); billboards never repeat
the previous design, six palettes. Buildings stay outside the barriers — nothing over the road.

## 5 — Performance (desktop measurements — NOT phone FPS)

`scripts/perf/profile.mjs` on the v4.2.1 build, headless Chromium + **SwiftShader** (software WebGL on 2
desktop CPU cores), 360 × 640 @2, fixed 1/60 s steps (JS update and render + `gl.finish` timed per frame).
Raw data: `perf_desktop_swiftshader.json`.

**Only the LOW run is clean.** The MEDIUM and HIGH runs overlapped with other heavy jobs on the same
2-core machine (Step 06 model renders): their render times (seconds per frame) are contention, not the
presets — they are kept in the JSON but must not be read as measurements. The draw-call, triangle,
memory and leak figures are not timing-dependent and are valid for all three.

| LOW (clean run) | CPU frame avg / p50 / p95 | JS update avg / p95 | draw calls | triangles |
|---|---|---|---|---|
| Normal | 141 / 17.8 / 31.3 ms (avg inflated by 1st-frame shader compile, max 3.7 s) | 3.7 / 8.6 ms | 139 | 65 k |
| Nitro | — / 13.8 / 26.3 ms | 2.7 / 6.5 ms | 151 | 67 k |
| Shield | — / 10.3 / 31.2 ms | 2.7 / 5.2 ms | 151 | 69 k |
| Nitro + Shield | — / 11.1 / 486 ms (p95 = compile spike of the combined effect) | 1.7 / 4.8 ms | 151 | 69 k |
| Jump | — / 8.2 / 18.5 ms | 1.6 / 5.2 ms | 148 | 69 k |
| Heavy (most obstacles) | 11.6 / 8.8 / 18.9 ms | 0.2 / 0.3 ms | 143 | 66 k |
| Extended (60 s) | — / 8.3 / 24.6 ms | 0.5 / 1.7 ms | 138–154 | 64 k |

| All presets (valid) | LOW | MEDIUM | HIGH |
|---|---|---|---|
| Draw calls, race (avg) | 139 | 163 | 162 |
| Draw calls, Home | 99 | 118 | 114 |
| Canvas (CSS 360 × 640) | 450 × 800 | 540 × 960 | 720 × 1280 |
| JS heap start → end of 60 s | 33 → 35 MB | 32 → 33 MB | 32 → 33 MB |
| Load to Home | 16.2 s | 9.5 s | 20.0 s (software GL, contended) |
| Single-file HTML | 4,776 KB (v4.2.1 + Step 06 car) | | |

**Effect activation spikes**: the first frame with a new effect compiles its shader (up to seconds on
software GL; on a phone typically tens of ms). The game prewarms the car effects (`MeshCar.prewarm`) but
not every combination — Nitro + Shield together compiled on first use here. Follow-up: prewarm the
combined auras.

**Leak found and fixed**: switching presets grew GPU textures by ~12 per switch into MEDIUM / HIGH
(41 → 53 → 65 …): `EffectComposer.dispose()` does not dispose its passes (UnrealBloomPass holds 11 render
targets). `Renderer.disposeComposer()` now disposes every pass. Geometries / programs were stable.

**Why no phone numbers:** no phone or GPU is available in this environment; headless Chromium renders
with SwiftShader (software WebGL on 2 CPU cores). These numbers compare presets and builds; they do not
predict phone FPS.

### How to profile on a phone (reproducible)

1. `npm run build` (or `node scripts/build-esbuild.mjs`), serve `dist/` on the LAN (`npm run dev` also
   works: `http://<pc-ip>:5173`).
2. Open `…/?perf=1` on the phone. A small readout appears bottom-left: FPS, p95 frame time, JS ms,
   render-submit ms, draw calls, triangles, preset @ pixel ratio, JS heap (Chrome only).
3. Settings → Graphics → LO / MED / HI. Play 60 s per preset: normal, then Turbo, Shield, both, jumps.
4. For exact numbers use remote debugging (Chrome `chrome://inspect`, Safari Web Inspector) and run
   `__perf()` in the console (all frames since the last `__game.perfReset()`), or `__perf(600)` for the
   last 600 frames.
5. Desktop / CI baseline: `node scripts/perf/profile.mjs out.json` (needs Playwright + Chromium).

## 6 — Presets

| | LOW | MEDIUM (default) | HIGH |
|---|---|---|---|
| Max pixel ratio | 1.25 | 1.5 | 2 |
| Post-processing | none | half-res bloom | bloom + edge speed blur |
| Road texture | **256 × 512** (new) | 512 × 1024 | 512 × 1024 |
| Burst particles | **50 %** (new) | **80 %** (new) | 100 % |
| City density / extras | 55 % / off | 80 % / on | 100 % / on |

Switching presets swaps the road textures (old ones disposed) and particle density at run time.
MEDIUM stays the default until phone measurements exist (not proven by device data).

## 7 — TikTok Native

Not tested on a device. See [NATIVE_COMPATIBILITY.md](NATIVE_COMPATIBILITY.md): audit of the adapter
on `main` against the v4 code, a **no-DOM smoke test** (`node scripts/native/no-dom-smoke.mjs`), the
test-package steps and the device checklist. New in this step: WebGL context loss / restore handling
in `Renderer` (browser); on native the adapter does not forward those events (open item).

SMOKE_RESULT

## 8 — Screenshots (this folder)

SHOTS_TABLE

## 9 — Tests

TESTS_TABLE

## Known limitations

- No phone FPS / thermal data; desktop SwiftShader numbers only.
- TikTok Native: not run; v4 is not ported to the native build; native context loss not handled.
- The jump camera is a camera change; the take-off itself is as fast as before (physics untouched).
- City crowns use the building material (no new texture); variety is in silhouettes and windows only.
