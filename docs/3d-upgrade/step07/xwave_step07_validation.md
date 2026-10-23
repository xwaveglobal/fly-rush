# Step 07 — validation (XWAVE X1 v4.4)

Branch `feature/sky-roadster-3d-v4.1`. Baseline: the Step 06 GLB, kept as rollback in
`assets-src/x1/rollback/xwave-x1-v4.3-step06.glb` (+ master). Game model: `src/assets/models/xwave-x1.glb`
(copy: `xwave_roadster_v4_4_step07.glb`); high-detail master: `assets-src/x1/xwave-x1-master.glb`.
Gameplay, physics, hitboxes (`CAR_HALF`), `RENDER.carScale` and the camera presets are unchanged.

## Phase 1 — audit

- Requirements recovered from `docs/3d-upgrade/step02…step06` and the comparison tooling of Step 06.
  The master rear stays authoritative; mirrorless (Step 03.1); no exposed rods (Step 03), etc.
- **Real gameplay camera** (`scripts/car/game-camera.ts` runs the game's own `CameraRig` + `Player`;
  `gameplay_camera.json` / `gameplay_camera_step07.json`): BALANCED preset, perspective. Camera at
  (0.15, 2.25, 7.4) m, look-at (0, 1.0, −13), pitch 3.5° down, vertical FOV 79–86° (rises with speed),
  9:16 portrait. The car is ≈ 120 × 97 px on a 390 × 844 phone (207 × 174 px of 720 × 1280), centred at
  ~62 % of the screen height. Lane changes: the camera follows 76 % of the lane offset and yaws up to 1.7°.
  Jumps: it rises with the car (lift 1.7; pitch 8° rising, 12.1° at the apex). Turbo: FOV 95° (+9° over top speed).
- Blender: not available (no binary, PyPI unreachable). Geometry is edited in the procedural generator
  `scripts/car/x1-builder.ts` (reproducible: `node scripts/car/build-x1.mjs [--detail=master]`).

## Phase 2 — rear length (model metres, same coordinate system)

| | Step 06 | Step 07 |
|---|---|---|
| Total length | 4.217 | **4.107** |
| Wheelbase | 2.513 | 2.513 (unchanged) |
| Front overhang | 0.762 | 0.759 |
| Rear overhang (rear axle → bumper end) | 0.942 | **0.835** |
| Rear overhang / wheelbase | 0.375 | **0.332** |
| Rear deck (glass end → tail) | 0.362 | **0.286** |
| Rear body / cabin length | 0.338 | 0.303 |

Method: everything behind the rear wheel arch (z > rear axle + arch radius) is compressed along z
(`REAR_K` 0.805) — tail, deck, LED, bumper, diffuser, spoiler (hinge + flap), nitro sockets. The rear
wheels, arch, cabin, wheelbase and front are untouched; nothing else is scaled.
Target: ≈ 0.33 × wheelbase is a **visual estimate** (concept 05 top view length / width with the
master's width / height; the side reference is cropped at the tail). Sweep, same frozen cameras:

| REAR_K | rear overhang | rear 0° IoU | rear-3/4 IoU |
|---|---|---|---|
| 1.0 (Step 06) | 0.942 m | 0.946 | 0.856 |
| **0.805 (chosen)** | 0.835 m | 0.949 | 0.858 |
| 0.70 | 0.785 m | 0.949 | 0.844 |
| 0.60 | 0.733 m | 0.947 | 0.839 |

A shorter rear is not supported by the rear-3/4 reference (its score drops), so ×0.805 is kept.
Also: the lower bumper no longer juts 3 cm past the tail, and its underside ramps up toward the
wheels (a diffuser ramp, not a block hanging behind the tyres).

## Phase 3 — gameplay camera

Causes found in the real game frames (`xwave_step07_gameplay_comparison.png`, Step 06 column):
the canopy, rear glass, black closed spoiler and deck well read as ONE long black block from 3.5°
above; the cabin looked like an opaque box; the rear lower block looked heavy. Changes:
- body-colour roof frame: A-pillars / roof rails along both glass edges into the buttresses + a
  windscreen header (concepts 01 / 05 / 16): the black roof becomes a framed glass roof;
- closed spoiler in body colour (concept 14 "flush with body"); raised, its black skirt and the black
  deck well still show the pop-up;
- glass: black tinted, nothing visible through it (owner: "kính đen") — opacity 0.9 → 0.94, no seats
  modelled behind it (a first try with seats / lit seat trims read as red lines on the roof);
- pearl iridescence 0.22 → 0.10 (gold sheen on the buttresses under the city light);
- diffuser ramp and shorter rear (Phase 2).
Camera, car scale and lighting were not changed.

## Phase 4 — multi-view (frozen cameras, same reference masks for both models)

| View | IoU S06 | IoU S07 | Edge S06 | Edge S07 | p95 S06 | p95 S07 | Aspect S06 → S07 (ref) |
|---|---|---|---|---|---|---|---|
| Rear 0° — master | 0.946 | **0.949** | 1.63 % | **1.51 %** | 5.6 % | 5.3 % | 1.786 → 1.803 (1.807) |
| Rear-left 3/4 — concept 01 | 0.856 | 0.858 | 4.39 % | 4.18 % | 14.1 % | 12.3 % | 2.479 → 2.423 (2.258) |
| Rear-right 3/4 — 01 mirrored | 0.855 | 0.854 | 4.39 % | 4.29 % | 14.0 % | 12.3 % | 2.491 → 2.417 (2.258) |
| Side 90° — concept 04 | 0.857 | 0.845 | 5.14 % | 5.62 % | 10.6 % | 11.1 % | — |
| Front 0° — concept 03 | 0.854 | 0.864 | 4.37 % | 4.06 % | 10.1 % | 10.0 % | 1.713 → 1.722 (1.896) |
| Front 3/4 — concept 02 | 0.843 | 0.841 | 5.69 % | 5.78 % | 21.7 % | 21.9 % | 2.378 → 2.350 (2.343) |
| Top — concept 05 | 0.905 | 0.901 | 1.47 % | 1.57 % | 3.3 % | 3.7 % | 0.505 → 0.519 (0.505) |

**Rear-3/4 transparency.** In Step 06 the rear-3/4 camera was fitted only on the aspect ratio
(az 30°, elev 8°, lens 26°): both models score ≈ 0.79 there. For Step 07 it was re-calibrated by a grid
search (`scripts/car/compare/calibrate.py`) **on the fixed Step 06 model** → az 34°, elev 3°, lens 38°,
then frozen. With it, Step 06 itself scores 0.856: the ≥ 0.85 target is reached through a better camera
fit, **not** through Step 07 geometry (S07 is +0.002 / −0.001). The night-concept masks were also
corrected with documented GrabCut seeds (wet-road reflections, dark roof against the sky) in
`scripts/car/compare/refs.json` — applied identically to both models.

## Phase 5–6 — details and materials

Front intake smaller (±0.40–0.50 m × 0.115 m, was ±0.47–0.575 × 0.15) with a fine horizontal grille
(the owner noted it was too large and plain; the master shows no front, so the concepts 02 / 03 / 08
guided it). Diffuser ramp, flush bumper face. Materials: black glass (0.94 opacity), iridescence 0.10, body-colour
spoiler; LED / paint flake / clearcoat from Step 06 kept.

## Phase 7–8 — export, reimport, in game

| Check | Result |
|---|---|
| `npm run test:car` (GLB parsed in Node by the game parser; names, hierarchy, pivots, sockets, spoiler, budgets, overhang) | pass — 41 checks |
| `scripts/car/check-mesh.ts` | 40 meshes, 39,767 tris; 0 degenerate, 0 zero / non-unit normals, 0 meshes without UVs |
| VFX / animation self-test (real `Vehicle` + `MeshCar`: wheels, steering, roll, jump, dive, landing, spoiler, nitro, shield, turbo, ghost restore, crash) | see `vfx_selftest.json` |
| Real game build, 9 states (normal, lane left / right, take-off, airborne, landing, Turbo, Shield, top speed) | `xwave_step07_gameplay_comparison.png` — all states in `run`, no page errors |
| `npx tsc --noEmit`, `npm test` (11 suites) | pass |
| Single-file H5 build | loads to Home, no page errors (artifact updated) |

## Gates

| Gate | Status | Evidence |
|---|---|---|
| A — rear geometry | rear overhang / deck corrected; rear 0° 0.949 ≥ 0.945; aspect 1.803 in range; rear-3/4 0.858 / 0.854 ≥ 0.85 and edge 4.18 / 4.29 % ≤ 4.5 % — **met through the re-calibrated camera, not geometry** (see above) | tables above |
| B — gameplay | **owner review** — no reference mask exists for the gameplay view; judged visually | gameplay comparison |
| C — consistency | wheelbase unchanged; side −0.012, top −0.004, front +0.010, front-3/4 −0.002 | table above |
| D — technical | pass | tests above |

## Unresolved

- Rear-3/4 concept vs master: the concept has a narrower, longer roof; following it would break the master.
- The rear-length target is an estimate; the references give no exact rear overhang.
- Side −0.012 IoU vs concept 04.
- No .blend (no Blender); software WebGL captures (colours / bloom differ from a phone GPU).
- The gameplay captures show the `?perf=1` readout at the bottom (used to drive the game); not part of the game UI.
