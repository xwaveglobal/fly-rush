# Step 03 — Integrated rear bumper, active spoiler, Home and chase cameras (v4.1.1)

Branch `feature/sky-roadster-3d-v4.1`. References used, in priority order: the XWAVE rear master (`assets-src/x1/XWAVE_REAR_0_MASTER_DO_NOT_OVERRIDE.png`), the three Tesla Roadster rear references (aero integration and flush spoiler only — no Tesla lights, badges or plates), the Step 02 GLB as the starting point, then the AI views.

## What changed

| Phase | Change | Where |
|---|---|---|
| 1 Remove the cage | Deleted the chrome rail, the fin trailing bars, the three hanging fins, the two outer flared fins, the tunnel side walls, the exposed nitro tubes, the old black valance and the fixed deck lip — the geometry is gone from the generator, not recoloured | `scripts/car/x1-builder.ts` |
| 2 Rear bumper | One solid **satin-black lower bumper** (bevelled extrusion) from the white band down, wrapping between the rear tyres, 3.5 cm proud of the body; a **recessed diffuser** (rounded opening, 10 cm deep, carbon back wall) with **three short fins** joined to its floor, ceiling and back wall; red markers and centre brake light on the bumper face; XWAVE LED blade (slightly thicker) and XWAVE badge unchanged in position | builder |
| 2F Nitro | `NitroSocket_L/R` moved inside the diffuser recess (no housing geometry); flames come out of the recess | builder, `MeshCar.ts` |
| 3 Active spoiler | The black deck lip between the buttresses is now `Spoiler_Pivot` → `Spoiler`: a flap hinged at its front edge, **flush when closed**, rotates up to 0.28 rad (trailing edge **+9.2 cm**) while nitro runs and retracts after; a black well under it so the gap never shows body paint; no struts | builder, `MeshCar.ts`, `carMotion.ts`, `RENDER.spoiler*` |
| 4 Refinement | Darker, rougher rear glass (no sun glare blob, lower env reflection); satin vs gloss black separation; rear tyres visible outside the narrower lower bumper | builder, `MeshCar.ts` |
| 5 Home camera | New independent home setup for the 3D car (`CAMERA.home`): slow three-quarter orbit behind the car at **constant distance**, framed between the side buttons and above the difficulty panel; UI unchanged | `CameraRig.ts`, `config.ts` |
| 6 Chase cameras | `CAMERA.presets` **low / balanced / high**, default **balanced**; `?cam=low|balanced|high` to compare. HIGH = the previous camera exactly (the old rear image always uses it) | `CameraRig.ts`, `config.ts` |
| 7 Animation | Sprung-body yaw on lane changes (added), roll, landing dip + pitch kick, front-wheel steer, capped wheel spin, spoiler deployment; all smoothing is exact exponential decay (frame-rate independent, no per-frame allocation); cosmetic only — the car's gameplay position / hitbox are untouched | `MeshCar.ts`, `carMotion.ts` |
| 8 Effects | **Game Over disappearance fixed**: the car is no longer hidden while dying when the 3D car is on screen (the old rear image is still replaced by shatter pieces). Phase Ghost now makes the 3D car translucent (0.35 opacity) and restores it exactly. Shield bubble and nitro work as before | `Game.ts` (1 line), `Vehicle.ts`, `MeshCar.ts` |
| 9 Model | New GLB `src/assets/models/xwave-x1.glb` (copy: `xwave-x1_step03.glb` here): 976 KB, 34 meshes, 31,519 triangles; Step 02 GLB kept as `assets-src/x1/xwave-x1_step02.glb` | — |

### Camera presets (`src/config.ts → CAMERA.presets`)

| | height | back | look Y / Z | follow X / look X | lift / look lift | damping h / v / look | FOV |
|---|---|---|---|---|---|---|---|
| LOW | 1.6 | 5.3 | 1.05 / −16 | 0.80 / 0.60 | 0.35 / 0.35 | 6 / 5 / 6.5 | −3° |
| **BALANCED** (default) | 2.25 | 5.9 | 1.0 / −13 | 0.76 / 0.58 | 0.28 / 0.32 | 6.5 / 5.5 / 7 | −1° |
| HIGH (= pre-v4) | 3.25 | 6.6 | 1.15 / −9 | 0.72 / 0.55 | 0.22 / 0.30 | 6.5 / 6 / 7 | 0° |

Speed still pulls the camera in (`speedBack`), widens the FOV (+7° at top speed) and Turbo / nitro adds +9° FOV, a kick and a light rumble (unchanged nitro camera response).

**Why BALANCED** (from real game screenshots, `extra_race_*_real.png`): LOW gives the biggest car but compresses the road ahead into a thin band; HIGH (the old camera) shows mostly the roof and hides the LED and bumper; BALANCED keeps the rear LED, the bumper, the diffuser and both rear tyres in view while the next obstacle sits clearly above the car.

Home (`CAMERA.home`): yaw 0.5 ± 0.26 rad, height 2.3 m, distance 8.3 m (constant), aim (0, 0.98, +0.5), FOV × 0.82.

## Validation screenshots (this folder)

All are real Three.js renders at 9:16 (720 × 1280) unless noted. 02–06 and 08–13 come from `npm run preview:car`, which runs the game's own `Vehicle`, `MeshCar`, `CameraRig` and `Player` classes frame by frame (studio light or a simple road with orange obstacle blocks — not the city scenery). 07 and 14 are the real game build in headless Chromium (software WebGL).

| File | Shows |
|---|---|
| `01_rear_original_vs_new.png` | rear, Step 02 vs Step 03 (same camera) |
| `02_rear_45_left.png`, `03_rear_45_right.png` | rear three-quarters |
| `04_diffuser_closeup.png` | low close-up: solid bumper, recessed diffuser, three attached fins |
| `05_spoiler_closed.png`, `06_spoiler_raised.png` | spoiler flush / raised (hinge only) |
| `07_home_camera.png` | real Home screen, 360 × 640 @2× |
| `08` / `09` / `10_gameplay_camera_*.png` | LOW / BALANCED / HIGH with obstacles |
| `11_lane_change.png` | mid lane change (roll, yaw, steer) |
| `12_jump.png` | rising jump (nose up, flight jets) |
| `13_nitro_spoiler_active.png` | nitro: flames from the recess, spoiler raised, FOV push |
| `14_game_over.png` | real Game Over screen — the car is still on the road |
| `extra_rear_bumper_before_after.png` | bumper close-up before / after |
| `extra_home_390x844_real.png` | real Home on a tall phone (390 × 844) |
| `extra_race_low/balanced/high_real.png` | real race at 261 m with each preset (390 × 844) |
| `extra_crash_real.png` | real crash frame (see limitations) |

## Tests (run on 2026-10-23, Linux workspace, Node 22.22.0)

| Command | Result |
|---|---|
| `npm run build:car` | pass — 976 KB, 34 meshes, 31,519 tris |
| `npx tsc --noEmit` | pass |
| `npm test` (10 suites) | **pass — 155 checks, 0 failures** |
| ↳ `test:car` (model) | names incl. bumper / spoiler; **no body point below 0.108 m**; no rail / socket tubes; diffuser inside the bumper; both nitro sockets inside the recess; spoiler flush (0.743–0.779 m), raises 9.2 cm without passing the tail, single mesh on its pivot; budgets |
| ↳ `test:camera` (new) | HIGH = pre-v4 camera; old rear image always on HIGH; each preset × aspect (9:16, 390 × 844) × lane: car fully in frame, a crate at reaction distance (53 m) visible above the roof, horizon 0.44–0.49; car size LOW > BALANCED > HIGH; Home: car clear of the difficulty panel and side buttons at both aspects, orbit distance constant |
| ↳ `test:motion` (new) | frame-rate independence (30 / 60 / 144 fps identical); spoiler up during nitro, down after, monotonic, ≤ 0.016 rad / frame; wheel step cap |
| ↳ fairness, difficulty, air, exp, phases, bonus, server | pass (gameplay unchanged — `git diff src/gameplay src/core` is empty) |
| `node scripts/build-esbuild.mjs` (H5) | pass — JS 4,242 KB |
| `node scripts/build-esbuild.mjs --single` | pass — 4,466 KB; loads with no page errors, 3D car on Home |
| Real game smoke (headless) | Home, countdown, race, lane changes (autopilot), crash, revive screen, Game Over — car visible throughout (`vehicle.root.visible = true` in `gameover`) |
| `npm run build` (Vite) | not run — Vite cannot be installed in this workspace (npm registry blocked) |
| TikTok native | **not tested** — the native adapter on `main` is untouched |

## Acceptance criteria

| | Criterion | Status |
|---|---|---|
| P0 | No hanging rods or wire-frame geometry | done — geometry removed; test: lowest body point 0.108 m, no rail / tubes |
| P0 | Smooth, integrated black rear bumper | done — one solid bevelled bumper with a recessed diffuser |
| P0 | XWAVE identity preserved | done — LED blade, badge, rear glass, buttresses, markers kept; no Tesla elements |
| P0 | Vehicle visible in all gameplay states | done — driving, shield, Phase Ghost (translucent), nitro, crash, revive, Game Over |
| P0 | Gameplay and collision unchanged | done — no gameplay file changed; fairness tests pass |
| P1 | Flush active spoiler | done (hinge-only flap, 9.2 cm) |
| P1 | Smooth deployment during nitro | done (tested) |
| P1 | Better chase framing | done — BALANCED default, tested |
| P1 | Stable vehicle motion | done — exact exponential smoothing |
| P1 | Correct Home framing | done — tested at 9:16 and 390 × 844, verified on real screenshots |
| P2 | PBR / reflections | partly — darker rougher glass, satin vs gloss black; see limitations |

## Remaining limitations

- **Crash frame**: the 3D car (3.5 m in game) is longer than the 2.0 m hitbox, so at the moment of a hit the obstacle overlaps the hood and can hide the car (`extra_crash_real.png`). Collisions are correct; fixing it is visual only (shorter car or a crash pose) and would change the look — needs your call.
- No crash shatter / damage for the 3D car (it stays whole on the road); the power-up aura outline still exists only for the old rear image.
- The bumper is a bevelled extrusion, not a sculpted surface; a small step remains where it meets the white body at the rear wheel opening.
- Rear glass still reads grey under bright studio light; the seats are only faintly visible.
- The 45° home orbit changes the car's on-screen width with the angle (perspective of a long car); the distance and height stay constant.
- Camera presets are chosen by `CAMERA.chase` or the URL; there is no in-game setting (UI unchanged).
- 08–13 use a simplified scene (no city); the real-race comparisons are the `extra_race_*` files.
- Vite build and TikTok device testing not done here; JS bundle is 4.2 MB (the model is 1.3 MB of it as a data URL).
