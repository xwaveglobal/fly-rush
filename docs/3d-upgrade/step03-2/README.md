# Step 03.2 — Front end, pop-up spoiler, premium VFX, dive pose (v4.1.3)

Branch `feature/sky-roadster-3d-v4.1`. Continuation of Step 03; Step 04 not started.

**Inputs**: Step 03.2 brief (two versions: the first text, then the reference-kit version, which supersedes it); `XWAVE_Step03_2_VFX_Reference_Kit.zip`, extracted to `assets-src/step03-2-vfx-references/`; owner notes during the step: *front wheel looks broken — redo the front bumper carefully*, *the DOWN button must make the car visibly go down*, *the car must not shake before the start*.

The kit's 19 panels are crops of one AI concept board (`00_original/full_concept_board.png`, viewed in full); the shield, ghost, nitro, front three-quarter, airborne spoiler and debris crops were also viewed one by one. They were used for **effect / animation direction only**. The car geometry still comes from the XWAVE rear master and the project's own generator; no concept car was copied, and no concept image is used as evidence below.

## Phase 0 — baseline audit (before any change)

| Area | Found in the source |
|---|---|
| Branch / base | `feature/sky-roadster-3d-v4.1` at `3f37ddd` (v4.1.2) |
| Car | `scripts/car/x1-builder.ts` → `src/assets/models/xwave-x1.glb` (32 meshes, 30.6 k tris), `MeshCar` inside `Vehicle`'s pose groups |
| Hitbox | `Player.hitbox()`: 1.40 × 0.72 × 2.00 m around the gameplay height (NORMAL centre y 1.0 → 0.64–1.36) |
| Jump / land state | `Player.vmode === 'up'` from take-off to the end of the landing recovery; `p.air` 0…1; DOWN = `vmode 'down'` with `p.squash` 0…0.32 |
| Shield | 3D car: `Effects.makeShield()` — 120 soft grey-blue point sprites around the car (the "smoke"), placed by `Game` each frame. Rear image: hexagon dome |
| Phase Ghost | `MeshCar.setFade()` — opacity only |
| Nitro / Turbo, rockets | `Vehicle.boostTarget / boostKick` → `MeshCar.nitro` → two additive cones per socket (flat colour, hard edges) |
| Crash / Game Over | `Game.onCrash`: `Debris.explode` (generic white boxes, cylinders, a torus) + 36 orange sparks + **30 grey smoke puffs**; final crash `CarShatter` only works for the rear image (nothing for 3D). During `dying` / `gameover` the car is not updated (frozen pose) |
| Other items | Magnet, ×2, Life: HUD only (v2.2 decision). Showcases (wall / rail / tunnel) move the car. Shield-break flashes the dome |
| Countdown | `updateCountdown` **and** `updateVisuals` both updated the car and the camera every frame, the first with speed 0, the second with road speed |
| Front wheels | in the arch zone the body side ran down to its widest point (y 0.50, below the 0.75 arch top) and folded back up — white flaps around the tyre |

### Reference → implementation checklist

| Reference | Implemented as | Where |
|---|---|---|
| 05 / 06 front | rounded nose, tucked splitter, slim intake + air curtains, LED blades in smoked housings, seams | builder |
| 01 / 02 / 10 / 11 spoiler | pop-up flap: rises 6 cm + tilts 22°, wedge skirt (no rods, no big wing) | builder, `MeshCar`, `RENDER.spoiler*` |
| 12 shield | thin luminous half-ellipsoid shell, Fresnel contour + base line, faint scan lines, slow pulse | `CarFx.ShieldAura` |
| 03 / 14 nitro | three nested soft cones per socket (white-blue core → cyan → violet veil) + nozzle glow | `MeshCar` |
| 13 ghost | translucent car + cyan Fresnel edge in the car's own shaders (no duplicate car) | `CarFx.installCarFx`, `MeshCar.setGhost` |
| 15 / 16 / 17 crash | flash, spark burst, body jolt, 12 pooled shards; car stays visible | `CarFx.CrashFx`, `Vehicle.crashBreak` |
| 18 / 19 debug | `?debug=collision` overlay | `src/render/DebugCollision.ts` |
| 09 camera | presets re-validated, unchanged | `tests/camera.test.ts` |

## Phase 1 — visual vs collision (measured on the real scene)

`bounds_after.json` / `baseline_bounds.json` (vertex-exact, solid meshes only, car at NORMAL in the middle lane):

| | x | y | z |
|---|---|---|---|
| Hitbox | ±0.70 | 0.64 – 1.36 | −1.00 – +1.00 |
| Car v4.1.2 | ±0.80 | 0 – 0.88 | −1.525 – +1.704 |
| Car v4.1.3 | ±0.80 | 0 – 0.88 | **−1.502** – +1.704 |

Causes, by axis:

- **Length (z)** — inherent: a 3.2 m car on a 2 m hitbox. The model origin is correct (car centred within 9 cm of the hitbox centre). Kept: no hitbox change, no 2 m car. The rounded nose / tucked splitter take 2.3 cm off the nose; the crash setback (v4.1.2) still puts the nose on the obstacle face at impact.
- **Height (y)** — the gameplay heights are the flying-car abstraction (hitbox 0.64–1.36 m while the wheels are on the road). On the road this is fine for every obstacle. **In the air it was not**: the old visual curve lagged the hitbox, so when the hitbox just cleared a jumped obstacle, the body was still inside it — 23 cm into a crate, 37 cm into a barrier, 46 cm into a platform. Fixed visually (`carMotion.carHeight`, `RENDER.airAlignRamp`): once the car leaves the road its underside is lifted to at least the hitbox underside within 0.45 m of climb; on the road and when diving nothing changes. Now 0 cm for all three (tested).
- **Width (x)** — the car's rear tyres reach 9.7 cm past the hitbox each side; inherent, kept.
- **Obstacles** — measured every type (`bounds_after.json`). One was objectively wrong: oncoming traffic's hover pods stood 0.40 m outside the 0.85 m collision half-width (a car changing lanes next to a truck clipped a pod without crashing). Pods moved under the body (now 3 cm outside). Other differences are glows, side posts outside the lanes, or parts above the car's height; collision unchanged everywhere.
- Depth sorting / perspective: not a cause (the overlay draws with depth test off; the overlaps are geometric).

**Debug overlay** `?debug=collision` (game URL): cyan car visual bounds, green hitbox, yellow obstacle visual bounds, red obstacle collision boxes. Built only when the parameter is present (`COLLISION_DEBUG`), otherwise no object, no cost.

## Phases 2–3 — front end (generator, not runtime)

- Rounded nose (`noseFillet`, 6.5 cm quarter-round, full radius on the hood edge, small at the chin) replaces the flat cap.
- Splitter: satin-black lip under the chin, front edge **3 cm behind** the nose (was a plate 6 cm ahead), following the underside, lowest point 11.8 cm (no road contact on landing).
- Lower intake (gloss frame, matte recess, one vane) and two slim corner air curtains.
- Headlights: smoked gloss housing, thin LED blade, white core and a short down-turned hook; strips are draped on the real paint surface by ray casting (no sinking into the hood); `RENDER.headGlow` 1.4 (no bloom blob).
- Seams: bumper cover (where the nose meets the hood and fenders, down both sides), hood edges and cowl, door lines.
- **Front wheel** (owner note): the side profile is now cut where it crosses the arch line on its way down from the shoulder (no fold, no white flaps), front tyre 0.355 → 0.34 m with a slightly elliptical arch (1.5 cm over the tyre, 4.4 cm fender lip), black wheel-well liners that follow the arch and stay inside the body sides.
- Materials: pearl white (clearcoat + faint thin-film shift, `KHR_materials_iridescence`, now read by `glbParse`), darker / glossier glass, satin black aero, matte liners, panel-gap grey, smoked light housings.
- Mirrorless silhouette and the whole rear (LED, badge, bumper, diffuser) unchanged (tested: tail 2.242 m, LED plane 2.21 m).
- Model: 4.22 m × 2.09 m × 1.18 m, 40 meshes, 33.4 k triangles (+9 %), 1,034 KB (+86 KB). v4.1.2 model kept in `docs/3d-upgrade/step03-1/xwave-x1_v4.1.2.glb`.

## Phase 4 — active spoiler

`shouldOpen = jumping ‖ nitro` from the authoritative states (`Player.vmode === 'up'` — take-off, airborne, descending, until the wheels are back on the road — and the existing boost envelope / Turbo). Pop-up: the flap rises 6 cm and tilts **22°** on its existing hinge (trailing edge +15 cm vs +9 cm before), opens fast (7/s, eased) and closes slower (2/s) after a 0.25 s hold. A wedge-shaped satin skirt under the flap fills exactly the gap above the deck, so there is no slot and no rod; closed, it sits inside the deck well. A thin satin-metal lip catches the light on the trailing edge. **Game Over**: the car is settled each frame (`MeshCar.settle`), so the spoiler retracts to its flush rest — a defined, stable pose.

## Phases 5–7 — effects (one visual language)

| Item | Activation → active → end | Before | Now | Cost |
|---|---|---|---|---|
| Shield | pickup / start shield → `run.shield` → break or timer | grey mote cloud | luminous shell around the car (follows the car pose), flashes on a blocked hit, timed shield dims over its last 2 s, fades out and hides | 1 mesh, 1 additive draw |
| Turbo / rockets | pickup / launch → `turboT` or rocket climb → envelope release | 2 flat cones | 3 soft cones per socket + nozzle glow, length follows boost and speed; spoiler up | 8 additive draws while active |
| Phase Ghost | bonus pickup → showcase 4.5 s | opacity only | opacity + cyan edge (shader uniform), materials restored exactly | 0 extra draws |
| Pickups (all power-ups) | pickup event | particles only | + short light sweep front → back in the item colour | 0 extra draws |
| Magnet, ×2, Life | pickup | HUD chip | unchanged (HUD) + sweep | — |
| Shield break | `shieldBreak` event | dome flash | shell flash | — |
| Crash | `onCrash` | boxes + grey smoke cloud (3D) | flash + jolt + 12 pooled shards (white / black / glass) + 22 sparks, no smoke; rear image path unchanged | 14 draws for ~1.4 s |
| DOWN (owner note) | swipe down → `vmode 'down'` | barely visible (−10 %) | car presses down to 72 % height, 6 % wider, small spring overshoot, light pool + sparks underneath | 1 additive draw |

Layering: car materials → edge light (inside the car shaders) → nitro (additive) → shield shell (additive) → crash flash. The GLB materials are never cloned or swapped: Phase Ghost only changes opacity / depth write (restored to the loaded values), the edge light rests at 0. Everything is built once and pooled; nothing is allocated per frame; every effect variant is compiled once when the model is ready (`Vehicle.prewarm`), so no shader compiles mid-race. Restart / respawn / new run clear the shards, shell, sweep and pose.

**Countdown shake (owner note)**: the car and the camera were stepped twice per frame during the countdown with two different speeds (0 and road speed); the speed jumping every frame drove the suspension. The countdown now steps them once, and the small camera kick at "GO!" was removed too (the phone's short haptic tap at GO stays). Measured in the real game build with its fixed-step hook (`Game.advance`, 60 Hz, 138 countdown frames):

| | 3D car height span | body direction changes | camera direction changes |
|---|---|---|---|
| v4.1.2 | 25.3 mm | 80 (shaking) | — |
| v4.1.3 | **0 mm** | **0** | 4 (the GO kick, since removed); otherwise a smooth glide into the chase position |

## Screenshots (this folder)

All from the actual Three.js code. 04–15 and the sheets use `npm run preview:car` (the game's own `Vehicle`, `MeshCar`, `CarFx`, `CameraRig`, `Player`, `ObstacleViews`, stepped at 60 Hz, 720 × 1280 = 9:16, BALANCED camera); 16 is the real game build in headless Chromium (software WebGL).

| File | |
|---|---|
| `01_front_splitter_before_after.png` | v4.1.2 vs v4.1.3, front three-quarter and front |
| `02_front_refinement.png` | front 3/4, front, front wheel close-up |
| `03_collision_bounds_debug.png` | `?debug=collision`: chase, top, side, jumping over a crate |
| `04`–`07_spoiler_*.png` | closed · airborne open · descending open · landed closed |
| `08`–`10_shield_*.png` | shield normal · jump · nitro |
| `11_nitro_active.png`, `12_phase_ghost.png` | |
| `13_collision_impact.png`, `14_collision_debris.png`, `15_game_over.png` | impact flash · shards · settled, car whole and visible |
| `16_gameplay_balanced.png` | real race, BALANCED |
| `spoiler_animation_sequence.png` | normal → take-off → airborne → descending → touch-down → retracting → closed |
| `shield_before_after.png` | grey mote cloud vs luminous shell |
| `special_items_vfx_comparison.png` | normal, nitro, shield, ghost, pickup sweep, DOWN, impact, debris |
| `baseline_bounds.json`, `bounds_after.json` | Phase 1 measurements |
| `vfx_selftest.json` | browser regression checks (below) |

## Tests

See the session report in `docs/PROGRESS.md` for the run date; results:

| Command | Result |
|---|---|
| `npm run build:car` | pass — 1,034 KB, 40 meshes, 33,383 tris |
| `npx tsc --noEmit` | pass |
| `npm test` (10 suites) | pass — 190 checks, 0 failures |
| ↳ new | spoiler 15–22°, opens faster than it closes, no frame > 1/8 of the travel · airborne underside ≥ hitbox underside, continuous, crate / barrier / platform cleared visibly · splitter behind the nose · arch clears the tyre · liners inside the body · pop-up skirt hidden when closed, fills the gap when open · nothing below the road |
| `npm run test:vfx` (real WebGL) | pass — 21 / 21: shield on / follows lane change / rises with a jump / + nitro / expires and hides · nitro end closes the spoiler · ghost on, + nitro, materials restored exactly · DOWN pressed and released · crash spawns flash + shards, car visible, transforms finite, debris cleans itself up, spoiler settles closed · restart mid-crash leaves nothing, intact car · hitbox unchanged |
| Gameplay | `git diff src/gameplay src/core server` empty |
| H5 build (`build-esbuild.mjs`) | pass — JS 4,333 KB (v4.1.2: 4,205 KB, **+128 KB**: model +86 KB as base64 ≈ +115 KB, code ≈ +13 KB) |
| Single file (`--single`) | pass — 4,557 KB (v4.1.2: 4,430 KB, +127 KB); loads with no page errors, Home with Play button |
| Real game build | race with autopilot, shield, DOWN, countdown measurement (above) — no page errors |
| Vite build | not run (npm registry blocked in this workspace) |
| TikTok native | not tested (no device here); no native-only API was added — the effects use plain Three.js meshes / shaders already used by the game |
| FPS | not measured on a phone (software WebGL here is not representative). Added cost while active: shield 1 draw, nitro 8, crash 14 for ~1.4 s, dive 1; ghost / sweep 0 |

## Remaining known issues

- The car is still longer (3.2 m) and a little wider (+9.7 cm per side) than the hitbox; inherent to the forgiving hitbox, documented, unchanged.
- The rounded nose shows a faint shading crease where it meets the hood (the bumper seam sits on it).
- Thin seams / headlight strips can shimmer slightly at distance on low-DPI phones.
- DOWN squashes the tyres slightly (arcade squash, 0.5 s); from the side they read oval for that moment.
- The rear-image (sprite) fallback keeps its old v2 effects (dome, smoke-render boost); only the 3D car got the new ones.
- Vite build, TikTok native and phone FPS still to be checked on the owner's machine / device.
