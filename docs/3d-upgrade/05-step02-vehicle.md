# 05 — Step 02: XWAVE 3D vehicle (v4.1.0)

Branch `feature/sky-roadster-3d-v4.1`. Gameplay code untouched (`src/gameplay/`, hitboxes, lanes, timings, input). All tests pass.

## Phase A — asset validation

**Packages received**: `XWAVE_Car_3D_v1.zip` (GLB + README + manifest + 2 reference swatches) and `XWAVE_3D_Reference_Kit_v1.zip` (master rear image, 9 AI-generated views, 8 component close-ups, 4 environment moods, 2 boards).

**XWAVE_Car_3D_v1.glb** (generator: trimesh), checked by parsing the file and rendering it:

| Check | Result |
|---|---|
| Orientation / units | +Y up, front −Z, metres — as documented |
| Size | 2.37 × 1.42 × 4.97 m (incl. mirrors and nitro sockets) |
| Geometry | 44 meshes, **1,432 triangles** — mostly boxes; body shell is 32 vertices |
| Normals / UVs | **none** on any mesh (renders faceted); no UVs, so no texture can be applied |
| Hierarchy | flat: 44 meshes under one `world` node, all baked in world space; wheels have **no pivots** (cannot spin as-is) |
| Named parts | body, roof glass/frame, rear window, `Rear_ContinuousLED`, badge panel + mount, spoiler, bumper, `Diffuser_Main` + 7 fins, markers, mirrors, intakes, headlamps, 4 × wheel / rim / caliper, seats, `NitroSocket_L/R`, underbody |
| Materials | 10 PBR factor materials (pearl, tinted glass, emissive LED, gloss black, badge, carbon, tyre, gunmetal, brake red, seat) — no textures |

**Differences from the master rear image** (the authoritative reference): tall boxy cabin instead of a low glasshouse with buttresses; narrow, inset wheels instead of very wide tyres at the outer edge; LED is a flat bar without the chevron ends; badge is a plain block (no wordmark); seven equal box fins instead of the 3-fin + rail diffuser; no lower black valance, red markers in the wrong place; no wheel-well opening behind the rear tyres.

## Phase B — refinement

Blender is not available in this environment, so the refinement is a **scripted three.js model builder** (`scripts/car/x1-builder.ts`, run with `npm run build:car`), which makes it reproducible and editable. The v1 GLB is kept unchanged in `assets-src/x1/`, together with the master image and the kit READMEs.

- Rear layout measured from the master (1.835 mm / px): roof 1.165 m, LED blade at 0.60 m spanning ±0.93 m with chevron ends, badge panel 0.49–0.57 m, white bumper band, black valance with markers at 0.37 m and a centre brake light, 3-fin diffuser with a chrome rail, roof stop light, tyres 0.38 m wide at ±0.86 m with the wells open behind them.
- Body: smooth loft of 185 cross-sections (wheel arches cut in, haunches, buttresses rising to the roof, low nose); glasshouse as its own mesh; interior tub, two seats with red trim.
- Wheels: lathe tyres with tread UVs, 10 split-spoke rims, discs, red calipers; each wheel is `Wheel_xx` (pivot) → `Spin_xx` (tyre, rim, disc) + `Caliper_xx` (does not spin).
- `NitroSocket_L/R` empties at the rear exits; UVs on the badge, carbon and tyres; textures (badge wordmark, carbon weave, tread) are canvas-drawn and embedded.
- Output `src/assets/models/xwave-x1.glb`: 949 KB, 34 meshes, **31,907 triangles**, 2.19 × 1.18 × 4.69 m.

**This is a cleaner procedural model, not a photorealistic one.** See the remaining issues below.

## Phase C — integration

| File | Change |
|---|---|
| `src/render/car/glbParse.ts` | new: minimal GLB reader (geometry, node TRS, PBR factors, clearcoat, emissive strength). No GLTFLoader, no image decoding, no `fetch`/`TextDecoder` for bundled data URLs → same code path in the web, single-file and TikTok native builds |
| `src/render/car/MeshCar.ts` | new: loads the X1, applies textures / LED glow by material name, wheels, sprung body, nitro flames, colourways, locked silhouette |
| `src/render/car/x1Textures.ts` | new: canvas textures shared by builder and game |
| `src/render/Vehicle.ts` | creates `MeshCar` inside the existing pose groups (position, bank, pitch, barrel roll, squash still apply); shows it once loaded (the rear image stays until then, and is the fallback if loading fails); hides the old pods / wings / underglow; flight jets and contact shadow follow the 3D car; `jetWorld()` returns the nitro sockets; less whole-car bank on the road (the body rolls instead) |
| `src/config.ts` | new `RENDER` block (render-only: car mode, scale 0.76, wheel / roll / landing / glow / nitro values). `?car=sprite` shows the old image for comparison |
| `vite.config.ts`, `scripts/build-esbuild.mjs`, `src/env.d.ts` | `.glb` import support |
| `tests/car.test.ts` | new rendering test: parses the GLB with the game reader, checks names, hierarchy, orientation, size, triangle and mesh budgets, LED material, in-game width vs hitbox |

Requirements check:
1. Gameplay logic unchanged — no file in `src/gameplay/` or `Input.ts` touched; fairness tests pass.
2. Lane switching, jump, landing, Turbo (the game's nitro) — preserved; driven by the same `Player` state.
3. Vehicle selection and progression — unchanged; all six colourways render (paint colour from the skin, glow colour on mirrors / headlights), locked cars show as a dark silhouette.
4. Wheels animate as separate assemblies — spin from road speed (capped against strobing, blur disc at speed), front wheels steer on lane changes, free-wheel and slow down in the air.
5. Body roll on lane changes — sprung body roll (± 0.06 rad max) + a light whole-car bank.
6. Pitch on jumps / landings — the existing nose-up on take-off still applies; landing adds a dip and a nose-down kick on the sprung body.
7. PBR — clear-coat pearl paint, gloss black, carbon, tinted glass, rubber, gunmetal rims, brake discs.
8. Emissive rear LED — blade, hot core line, markers, centre brake and roof stop light; drawn without tone mapping so they stay red and bloom on HIGH.
9. Nitro at the rear sockets — additive flames grow with the existing boost envelope (Turbo, launch kicks); trail particles also come from the sockets.
10. 9:16 UI — untouched (screenshots at 390 × 844).
11. Native — loader path written to avoid `fetch`, `TextDecoder`, `atob`, image decoding and GLTFLoader. **Not tested in TikTok.**

Camera behaviour, road, city and the Turbo visual system were not changed beyond the above.

## Phase D — visual validation

Screenshots are in `docs/3d-upgrade/step02/`. Shots 01–04 and the pose / colourway boards were rendered with the real game classes (`Vehicle`, `MeshCar`, `CameraRig`, `Player`) by `npm run preview:car`, under a white studio light. Shot 05 is the real game build running an Endless race in a 390 × 844 viewport.

| File | View |
|---|---|
| `01_rear_0.jpg` | rear 0° |
| `02_rear_left_45.jpg` | rear-left 45° |
| `03_rear_right_45.jpg` | rear-right 45° |
| `04_side_90.jpg` | side 90° |
| `05_ingame_chase.jpg` | in-game chase camera (game build, Endless) |
| `rear_vs_master.jpg` | rear 0° next to the master |
| `poses_chase.jpg` | chase camera: drive, lane change, jump (rising), landing, nitro, old rear image (`?car=sprite`) |
| `colourways.jpg` | Zenith (pearl), Volt, Inferno |

**Remaining visual differences vs the master (rear view):**
1. Rear glass reads grey under studio light; the master shows near-black glass with the seats' red outlines clearly visible. In the game's darker scenes it reads dark, but the seats are barely visible.
2. Tyres are only partly visible from behind (the black valance and diffuser walls cover their inner half); the master shows the full tread face below the haunches.
3. Diffuser looks light grey and flat (lit from above); the master's is dark and deep, with long fins and chrome edges. The two nitro sockets are visible; the master shows no exhaust.
4. The LED blade is thinner and flatter than the master's thick glowing bar (bloom on HIGH helps in game; no light-guide shape).
5. Haunches are less rounded and the upper rear body is a little taller and flatter; no panel lines, vents or carbon inserts on the sides.
6. Mirrors are simple black ellipsoids; the master has sculpted pearl housings with a blue glow strip.
7. Badge wordmark is drawn with a system font, not the official XWAVE vector.

**In-game observation:** the unchanged chase camera sits 3.25 m high, so the 3D car is seen mostly from above (roof and glass), while the old image always showed the rear face. The rear design will read much better after Step 03 lowers / tunes the camera.

## Phase E — build & test results

Environment: Linux cloud workspace, Node 22.22.0. The npm registry is blocked here, so `three` and `@types/three` were taken from their GitHub `r169` tags (same versions as `package.json`); TypeScript 6.0.3 and esbuild come from the workspace tools (project pins TypeScript ^5.6.3 and gets esbuild through Vite).

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **pass** (exit 0) |
| `npm test` (8 suites incl. new `test:car`) | **pass** — 118 checks, 0 failures |
| `node scripts/build-esbuild.mjs` (H5 production build, esbuild fallback) | **pass** — JS 4,203 KB (was 2,927 KB; +1.27 MB = the model as a data URL) |
| `node scripts/build-esbuild.mjs --single` | **pass** — one file, 4,428 KB; loads and shows the 3D car |
| `npm run build` (Vite) | **not run** — Vite cannot be installed in this workspace |
| game smoke test (headless Chromium, software WebGL) | menu, countdown and an Endless run render with the 3D car, no page errors |
| TikTok native | **not tested** |

## TikTok native — smoke test plan (Step 10, prepared, not run)

1. Branch `feat/v4-native` from `main`; merge `src/render/car/`, the `Vehicle.ts` / `config.ts` changes and `src/assets/models/xwave-x1.glb`.
2. `scripts/build-tiktok.mjs`: add `loader: { '.glb': 'dataurl' }` (the model is then decoded in memory by `assetBytes()` — no file system, no fetch).
3. `npm run build:tiktok && npm run check:tiktok` (must stay at 0 FAIL); check `game.js` size against TikTok's package limit (+~1.3 MB).
4. Phone test (Android + iPhone): car appears (not the rear image), wheels spin, LED red, nitro at sockets, fps vs v3.0.10 with `scaleCap 1.5` on Android.

## Remaining model-quality issues

- Procedural body: no panel gaps, door lines, vents, carbon inserts or real surface curvature continuity; some flat-shaded seams at the wheel arches and a white lip ahead of the front wheels.
- Rear tyre visibility, glass darkness / interior visibility, diffuser depth (see Phase D, items 1–3).
- Front end is approximate (the secondary views are AI-generated and inconsistent); headlights are simple strips.
- No LODs; 31.9k triangles and 34 meshes for one car (the scene budget allows it, but Step 09 should add a LOW-quality mesh).
- GLB is 949 KB uncompressed (float positions / normals / UVs + embedded PNGs the game does not read); quantising and dropping the embedded images would roughly halve it.
- The car is 4.69 m × 0.76 = 3.6 m long in game; the hitbox is 2.0 m, so the nose extends ~0.8 m beyond the front of the hitbox (visual only — collisions are unchanged).
- Three effects were built for the old rear image and have no 3D version yet: Bonus "Phase Ghost" (the 3D car stays solid), the power-up aura outline (not shown; the 3D shield bubble still shows), and the crash shatter (on the final crash the 3D car disappears without flying pieces).
- An artist pass in Blender (or a supplied production model) is still needed for a premium look; the node names and material names above are the contract the game code expects.
