# 03 — Implementation roadmap

Staged plan. Each step is one reviewable chunk on `feature/sky-roadster-3d-v4.1`, ends with a playable build, and needs the owner's approval before the next one starts.

**Gate for every step** (unless the step says otherwise):
- `npm test` green (gameplay/fairness unchanged) and `npm run typecheck` + `npm run build` green.
- The old look is still reachable (`?car=sprite`, or the step's own switch).
- A playable single-file build or artifact link for the owner to check on the phone.
- `docs/PROGRESS.md` updated; version bumped (`v4.1.x`) with a README changelog entry.

| Step | Scope | Main files | Done when |
|---|---|---|---|
| **02** | **Genuine XWAVE 3D vehicle** (+ the car abstraction) | `render/Vehicle.ts` → façade, `render/car/SpriteCar.ts`, `render/car/MeshCar.ts`, `render/car/carPose.ts`, `config.ts RENDER`, `assets/AssetLoader.ts` | 3D X1 drives with the same feel (lean, bounce, rolls, jumps); colourways work; sprite mode identical to v4.0.1; car ≤ 40k tris / ≤ 8 draw calls |
| 03 | Rear chase camera | `render/CameraRig.ts`, `config.ts RENDER.camera` | Lower, closer, speed-reactive camera; 3 lanes readable on 375×640; obstacles visible ≥ `FAIRNESS.minRowTime` at max speed; menu/garage orbit the 3D car |
| 04 | Body & wheel animation polish | `render/car/MeshCar.ts`, `carPose.ts` | Wheel spin synced to road speed, front-wheel steer on lane change, suspension compression on landing / LOW, body roll, wheel→thruster transform when flying |
| 05 | Procedural 3D road | `render/Track.ts`, new `render/worldBend.ts` | Segmented deck with geometry lane lines, kerbs, rails; visual curve/hill bend (0 at the car); collision and spawner untouched (tests) |
| 06 | 3D city environment | `render/Scenery.ts`, `render/textures.ts` | Better building materials, near/mid/far LOD rings, skyline, per-world fog/light tuning; within draw-call budget |
| 07 | Traffic & roadside movement | new `render/Traffic.ts`, `Scenery.ts` | Ambient cars outside the playable lanes and in the sky; roadside parallax props; never overlap lanes x ∈ [−3.9, 3.9] |
| 08 | Nitro & speed effects | `render/Effects.ts`, `Renderer.ts`, `MeshCar.ts` | Turbo = exhaust flames, heat-haze/radial pulse, wind streaks, FOV punch, sparks; HIGH and LOW variants. (Manual nitro button only if the owner approves a gameplay change.) |
| 09 | Mobile optimisation | `Renderer.ts`, all render modules | Measured on the owner's phones: 60 fps target, budgets in `02-architecture.md`, auto-degrade order revised (shadows → post → resolution), memory check |
| 10 | TikTok Native validation | new branch `feat/v4-native` from `main` | v4 render merged onto `main`'s native layer; GLB via `GLTFLoader.parse` on a bundled binary; `build:tiktok` + `check:tiktok` 0 FAIL; tested on Android + iPhone in TikTok |

## Step 02 — exact plan (waiting for approval)

**Before coding, one decision from the owner (blocker):** the X1 exists only as 2D studio images. A faithful 3D car needs one of:
- **A. A 3D model file of the X1** (GLB/glTF, FBX or OBJ from whoever made the renders) — best result, fastest. I convert it to an optimised GLB (≤ 40k tris, no Draco).
- **B. Model it from the images** — I build a procedural replica in code from the 8 views (rear 1024×588 is the main reference; the side/front views are only ~450×180, so side details will be approximate). Slower, less exact.
- **C. AI image-to-3D** from the renders (external tool, owner's account) → I clean up and optimise. Quality varies; needs owner review.

**Work items (same for A/B/C):**
1. `config.ts`: add a render-only `RENDER` block (`car: 'mesh' | 'sprite'`, car budgets) + `?car=` URL override. No gameplay numbers touched.
2. Move today's sprite code unchanged into `render/car/SpriteCar.ts`; `Vehicle.ts` becomes a façade with the exact public API listed in `02-architecture.md`. Verify sprite mode looks identical (side-by-side screenshots at the same frame).
3. Extract the pose springs (roll, yaw, pitch, suspension, barrel roll, showcase specials) into `render/car/carPose.ts`, used by both cars — no number changes.
4. `MeshCar.ts`: load the X1 (GLB via `AssetLoader` with `GLTFLoader.parse` from a bundled file, or the procedural replica), PBR materials (clear-coat paint, glass, emissive light strips), named wheel nodes spinning with road speed, exhaust anchor points for later nitro, colourways via material colours, locked-car dark silhouette, contact shadow.
5. Draw the mesh car in the main pass (lit, tone-mapped, bloom on its lights); the overlay pass stays for sprite mode only.
6. Hook-ups Game.ts relies on: `jetWorld` / `rearTyreWorld` / `contactWorld` / `shatterSource` return points on the 3D car; `usesSprite` false; `rig.rearOnly` false for the mesh car.
7. Check: `npm test`, `npm run typecheck`, `npm run build`, debug overlay numbers (calls/tris) before vs after, a playable build for the owner. Bump to `v4.1.0`.

**Not in Step 02:** camera changes (Step 03), road/city (05–06), new effects (08).
