# Step 03.1 — Shorter body, mirrorless, jump-active spoiler (v4.1.2)

Branch `feature/sky-roadster-3d-v4.1`. Focused refinement of Step 03; Step 04 not started.

**Inputs**: the new Tesla Roadster reference image (compact, mirrorless, integrated rear aero), the XWAVE rear master (`assets-src/x1/`), and the Step 03 report and screenshots in `docs/3d-upgrade/step03/`. *Downloads.zip did not arrive in this session (only the image did); the Step 03 screenshots it contains are the ones already in `step03/`, which were used instead.*

## Audit (measured before any change)

| Item | Measured |
|---|---|
| Gameplay hitbox | `CAR_HALF` = 0.70 × 0.36 × 1.00 half-extents → **1.40 × 0.72 × 2.00 m**, centred on the car (z −1.00 … +1.00), `Player.hitbox()` |
| v4.1.1 model | 2.19 × 1.18 × **4.60 m** (z −2.36 … +2.24), mirrors included in the width |
| In game (× `RENDER.carScale` 0.76) | **3.50 m** long, z −1.79 … +1.70 → nose **0.79 m** ahead of the hitbox front, tail 0.70 m behind; visual centre −0.05 m (centres match) |
| Why obstacles sink into the hood | collision registers when an obstacle reaches the hitbox front (z −1.00), by which point it has already passed 0.79 m of visible nose |
| Mirrors | 3 generator calls (black stalk, housing, blue glow strip) + material `X1_MirrorGlow` |
| Spoiler | driven by nitro only (`spoilerStep(nitro)`) |
| Jump state | `Player.vmode === 'up'` from take-off anticipation to the end of the landing recovery |

## Changes

| | What | Where |
|---|---|---|
| Length | `LENGTH_CUT` 0.08 of the 4.60 m design length, **front half only**: 60 % from the nose overhang, 40 % from hood / front-arch-to-cabin (wheelbase 2.66 → **2.51 m**). The front arch zone keeps scale 1 (arches and tyres stay round); everything behind the cabin start — buttresses, rear glass, LED, badge, bumper, diffuser, spoiler, sockets — is unchanged. Normals are corrected for the stretch. Result **4.25 m (−7.7 %)**, 2.09 m wide, 1.18 m high | `scripts/car/x1-builder.ts` (`warpFn`, `warpGeometry`); `build-x1.mjs --cut=` for comparisons |
| Mirrors | stalks, housings, glow strips and the `X1_MirrorGlow` material deleted from the generator (not hidden). Width now = rear tyres | builder |
| Spoiler | `spoilerOpen = jumping ‖ nitro`, with **jumping from the gameplay jump state** (`Player.vmode === 'up'`, covers take-off, airborne and landing recovery) and nitro from the existing boost envelope / Turbo. After both end it holds **0.25 s**, then retracts (no flicker on landing or between effects). Exact exponential smoothing, state mutated in place (no per-frame allocation) | `carMotion.ts` (`spoilerUpdate`), `MeshCar.ts`, `Vehicle.ts`, `RENDER.spoilerHold` |
| Crash presentation | visual only: at a crash the 3D body is set back by its measured nose overhang (0.525 m) so the nose meets the obstacle face instead of sinking into it; cleared on respawn / new race. Collision rules, timing and hitbox untouched | `Vehicle.crashRecoil()`, one call in `Game.onCrash` |
| Version | v4.1.2; v4.1.1 GLB kept as `assets-src/x1/xwave-x1_v4.1.1.glb` | — |

### Length options (02, extra_length_rear45)

| Cut | Length | Wheelbase | Look |
|---|---|---|---|
| 0 % | 4.60 m | 2.66 m | long hood and overhang |
| −6 % | 4.34 m | 2.55 m | better, still a long nose |
| **−8 % (chosen)** | **4.25 m** | **2.51 m** | short Tesla-like overhang, cabin still sleek, believable wheel spacing |
| −10 % | 4.16 m | 2.48 m | nose starts to look stubby; front wheel close to the windscreen |

### Collision vs visual (after)

| | Front | Rear | Length |
|---|---|---|---|
| Hitbox | −1.00 | +1.00 | 2.00 m |
| v4.1.1 visual | −1.79 | +1.70 | 3.50 m |
| v4.1.2 visual | **−1.53** | +1.70 | **3.23 m** |

The nose now reaches 0.53 m ahead of the hitbox (was 0.79 m); with the crash setback it touches the obstacle face at the moment of impact (`14_collision_visual_check.png`). The remaining length difference is inherent (a 2 m hitbox for a 3.2 m car) and was kept, since changing the hitbox would change gameplay.

### Cameras

Re-checked with the shorter car (`npm run test:camera` + real screenshots): Home stays centred and clear of the difficulty panel at 9:16 and 390 × 844, the orbit distance is constant, and the BALANCED chase shows the LED, bumper and diffuser, with the obstacle at reaction distance visible above the car. No offsets needed changing; LOW / BALANCED / HIGH are unchanged.

## Screenshots and captures (this folder)

All rendered from the actual Three.js code. 04–10, 13 and the sequences use `npm run preview:car` (the game's own `Vehicle`, `MeshCar`, `CameraRig`, `Player`, stepped at 60 Hz); 11, 12 and the `_real` extras are the real game build in headless Chromium (software WebGL); 01–03 render the GLBs with identical cameras.

| File | |
|---|---|
| `01_original_vs_shortened_side.png` | v4.1.1 vs v4.1.2, same camera |
| `02_length_comparison_0_6_10.png` | side views at 0 / −6 / −8 / −10 % |
| `03_rear_original_vs_new.png` | rear: identical except the mirrors |
| `04_rear_45_mirrorless.png`, `05_front_45_mirrorless.png` | clean flanks where the mirrors were |
| `06`–`10_spoiler_*.png` | closed · jump (airborne) · nitro · jump + nitro · 0.45 s after landing (retracting) |
| `11_home_camera.png` | real Home, 360 × 640 @2× |
| `12_gameplay_balanced.png` | real race, BALANCED, 248 m |
| `13_gameplay_jump.png` | chase camera mid-jump, spoiler up (+ `extra_13_gameplay_jump_real.png` from a real race) |
| `14_collision_visual_check.png` | moment of impact, without / with the crash setback (green = hitbox) |
| `seq_jump.mp4`, `seq_jump_sheet.png` | Normal → Jump → Airborne → Landing → Normal (64 frames, labelled with t / spoiler / jump / nitro) |
| `seq_nitrojump.mp4`, `seq_nitrojump_sheet.png` | Normal → Nitro → Jump → Landing → Nitro end → Normal (85 frames) |
| `extra_crash_real_208m.png` | real crash without autopilot — car visible |
| `extra_colourways_lane_change.png` | Volt, Inferno, mid lane change |

## Tests (2026-10-23, Node 22.22.0)

| Command | Result |
|---|---|
| `npm run build:car` | pass — 948 KB, 32 meshes, 30,591 tris; output identical to the rendered GLB |
| `npx tsc --noEmit` | pass |
| `npm test` (10 suites) | **pass — 175 checks, 0 failures** |
| ↳ spoiler transitions (`test:motion`, real `Player` jump) | normal = closed · take-off = opening (0.44 after 0.12 s) · airborne = open · touch-down = still up, then retracts smoothly · nitro = open · jump + nitro = open, no re-animation · landing with nitro = open · nitro ends while airborne = open · both off = closed · one open/close cycle, no flicker · fading boost tail closes |
| ↳ bounds / GLB integrity (`test:car`) | no mirror meshes or materials · length 4.249 m (−7.6 %) · wheelbase 2.513 m · width 2.090 m · rear unchanged (tail 2.242, LED 2.21) · front tyre round · spoiler flush / +9.2 cm / no struts · sockets in the recess · nothing below 0.108 m · budgets |
| ↳ `test:camera` | presets × aspects × lanes, Home band — all pass with the new size |
| ↳ gameplay suites | pass — `git diff src/gameplay src/core` is empty |
| H5 build (`build-esbuild.mjs`) | pass — JS 4,205 KB |
| Single file (`--single`) | pass — 4,430 KB; loads with no page errors |
| Vite build | not run (registry blocked in this workspace) |
| TikTok native | not tested |

**Regression coverage**: lane switching, jump, descend logic, nitro, collision rules (gameplay tests unchanged and passing; real races with autopilot and a real crash); spoiler, lane-change roll and colourways (renders); Game Over visibility (unchanged from v4.1.1, crash frame re-checked); Home UI (real screenshot + test). Shield and Phase Ghost code paths were not changed in this step and were not re-rendered.

## Remaining issues

- The car is still longer than the hitbox (3.23 m vs 2.0 m); the crash setback hides it at impact, but during near-misses an obstacle can visually brush the nose or tail while not colliding.
- The front splitter now shows as a thin plate a little ahead of the shorter nose at front three-quarter angles.
- Front-end surfacing is procedural and simple (no vents, panel lines); glass still reads greyish under studio light.
- No 3D crash shatter / damage; aura outline still only for the old rear image.
- Vite build and TikTok device testing not done here.
