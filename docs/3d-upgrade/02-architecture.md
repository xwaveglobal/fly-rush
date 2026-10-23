# 02 — Target architecture for the 3D upgrade

Goal: a premium third-person 3D arcade runner look (speed sensation in the spirit of Asphalt) **on top of the existing game**. Same engine (Three.js r169), same modules, same gameplay, same native pipeline. No Cocos, no rewrite.

## Principles

1. **Gameplay is frozen.** `src/gameplay/`, `ObstacleRules.ts`, `config.ts` gameplay numbers (`LANES`, `HEIGHT`, `CAR_HALF`, `TIMING`, `SPEED`, `FAIRNESS`, `SCORE`) and `Input.ts` do not change. Every 3D change is a *view* change in `src/render/` (+ render-only tuning in a new `RENDER` block of `config.ts`). `npm test` must stay green at every step.
2. **Logic space stays straight and flat.** The car stays at z = 0 and the world scrolls toward +Z, exactly as today. Curves and hills are a **visual bend applied in the vertex shader** (see Road), so hitboxes, spawner and fairness never see them.
3. **Everything behind a switch.** The current sprite car and current look remain available (`RENDER.car = 'sprite' | 'mesh'`, URL override `?car=sprite`), so every stage can be compared and rolled back instantly.
4. **The X1 design is not redesigned.** The 3D car must reproduce the existing studio renders (shape, paint, lights, XWAVE badge). Colourways keep their current colours.
5. **Native-ready from day one.** No new runtime dependencies, no CDN, no WASM decoders (Draco / KTX2 / Meshopt need workers or WASM the TikTok runtime may not allow), ES2018-safe code, WebGL2 features only where Three r169 already needs them.
6. **Two quality tiers stay.** HIGH and LOW (plus the existing dynamic-resolution steps). Each new effect states its LOW fallback.

## Module plan (incremental changes to existing files)

```
src/config.ts            + RENDER { car, camera, road, shadows, nitro, traffic, budgets }   (render-only numbers)
src/render/Renderer.ts   shadow map (HIGH only), overlay pass kept for sprite mode only, nitro/speed post pass
src/render/CameraRig.ts  'run' mode → chase profile read from RENDER.camera (sprite profile kept)
src/render/Vehicle.ts    becomes the façade: same public API Game.ts already uses, delegates to
  src/render/car/SpriteCar.ts   today's code, moved as-is (behaviour identical)
  src/render/car/MeshCar.ts     new: real 3D X1 (GLB or procedural replica), PBR, wheels, lights
  src/render/car/carPose.ts     shared springs: roll / yaw / pitch / suspension / barrel roll (extracted, not rewritten)
src/render/Track.ts      road deck as recycled segments with geometry lane markings, kerbs, rails; scroll stays modulo
src/render/worldBend.ts  new: one shared vertex-shader chunk (curve + hill), injected into all world materials
src/render/Scenery.ts    building fields with better materials / LOD tiers, roadside parallax props
src/render/Traffic.ts    new: visual-only ambient traffic outside the playable lanes
src/render/Effects.ts    nitro flames, heat haze / radial blur, sparks, wind streaks (pooled)
src/assets/AssetLoader.ts  GLB from a bundled ArrayBuffer via GLTFLoader.parse (works without XHR on native)
```

Game.ts only changes where it constructs the car / reads quality; the vehicle façade keeps every member used outside `Vehicle.ts` today (checked with grep): `update`, `setSkin`, `resetFx`, `resetPose`, `shieldHit`, `boostKick`, `barrelRoll`, `useModel`, `jetWorld`, `rearTyreWorld`, `contactWorld`, `usesSprite`, `shatterSource` (used by `Shatter.ts`), and the fields `root`, `camera`, `showcase`, `shieldTarget`, `boostTarget`, `auraTarget`, `visibleBlink`. `Game.ts:3236` sets `rig.rearOnly = shape === 'gt'`; with the mesh car this becomes `false` so menu/garage cameras can orbit again.

## Key designs

### Vehicle (MeshCar)
- Source: an X1 3D model (glTF 2.0 binary, +Y up, −Z forward, metres, origin at the visual centre — the convention already in `manifest.ts`). If no model exists, a procedural replica is modelled from the 8 studio views (see risks).
- Nodes: `body`, `glass`, `lights_front`, `lights_rear`, `wheel_FL/FR/RL/RR`, `exhaust_L/R`, `badge`. Materials: clear-coat paint (`MeshPhysicalMaterial`, colour = skin `body`), glass, emissive light strips (bloom picks them up), tyres, rims.
- Colourways = material colours (replaces the image recolour shader). Vega keeps its red identity via its own paint/emissive values.
- Pose: the same springs as today (roll from lateral velocity, yaw, pitch from vertical velocity, squash/stretch, suspension bumps, landing kick, barrel roll, showcase specials) → shared `carPose.ts`.
- Wheels spin with road speed; front wheels steer a few degrees on lane changes; in the air the wheels slow down (as the tread layer does today).
- Visual footprint matched to `CAR_HALF` (0.7 × 0.36 × 1.0 half-extents) so what the player sees still matches the hitbox.
- Drawn in the **main pass** (lit, tone-mapped, bloom on lights). The overlay pass is only kept for `sprite` mode.
- Budget: ≤ 40k triangles, ≤ 8 draw calls, ≤ 2 textures of 1024², no transparency sort issues except glass.

### Chase camera
- New `RENDER.camera.chase` profile: lower and closer than today (car larger on screen), slight look-ahead, speed pulls the camera back and widens FOV, Turbo/nitro adds kick + shake. Same damping functions.
- Keeps the 72° horizontal-FOV rule so all three lanes stay readable in portrait (readability is a fairness concern even though logic is untouched). Obstacle reaction time is checked on screen: an obstacle must be visible ≥ `FAIRNESS.minRowTime` before contact at max speed.

### Road
- Deck split into N recycled segments (same modulo idea as `wrapZ`), with real geometry: asphalt with normal-ish detail from the canvas texture, lane dividers and edge lines as thin meshes, kerbs, guard rails, light strips.
- **World bend**: `worldBend.ts` adds `x += curveX · z²`, `y += hillY · z²` in view space to every world material through `onBeforeCompile`. The bend is 0 at the car and grows with distance, so the road visibly curves and crests ahead while gameplay stays straight. Curve/hill values drift slowly per world and are 0 on tutorial and tunnels.
- Speed reads from texture detail + dashed lines passing under the camera.

### City environment
- Existing `BuildingField` / themes kept; upgrades are material quality (window emissive maps, roughness variation), a near/mid/far ring with LOD (near = detailed, far = merged silhouettes), skyline cards, and fog tuning per world.

### Traffic & roadside movement
- Visual-only cars in side lanes outside x = ±3.9 and in sky lanes; they never enter the playable lanes, so they can't be confused with obstacles. The gameplay `traffic` obstacle stays as it is (logic) and only gets the new car look.

### Nitro & speed effects
- Today's "nitro" is the **Turbo** pickup. The upgrade is visual only: exhaust flames on the mesh car, heat-haze/radial blur pulse, stronger speed lines, wind streaks, FOV punch, camera shake, sparks on landings.
- A manual NITRO button would be a gameplay change → only with the owner's approval.

### Lighting & shadows
- HIGH: one shadow-casting directional light whose small shadow camera follows the car (car + nearby obstacles only, 1024² map, PCF soft). LOW: the current blurred contact shadow.
- Light probes / environment: keep RoomEnvironment IBL; optionally a per-world tinted PMREM.

## Quality tiers & budgets (targets, to be measured on the owner's phones)

| | HIGH | LOW |
|---|---|---|
| Target | 60 fps mid-range phone | 60 fps low-end / Android native |
| Pixel ratio cap | 2 → 1.75 → 1.5 (existing) | 1.5 (Android native: 1.5 always) |
| Draw calls | ≤ 150 | ≤ 90 |
| Triangles | ≤ 350k | ≤ 150k |
| Shadows | car shadow map | contact shadow |
| Post | bloom + speed blur + nitro pass | none |
| Particles | 2,400 | ~half emit rate (existing) |

## Native carry-over

`v4.0.1` and `main` share the same base (v2.3.0), and `src/render/` differs only in `Renderer.ts`. Plan: when v4 is stable, create `feat/v4-native` from `main`, merge the v4 render work, keep `main`'s `Renderer` canvas/`uiPass` additions, enable GLB parsing in the native build (bundle the `.glb` as a binary asset and `GLTFLoader.parse` it — the current stub blocks GLB only because of single-file sharing), then `build:tiktok` + `check:tiktok` (0 FAIL) + phone test.
