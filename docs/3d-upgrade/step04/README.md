# Step 04 — Procedural road & night city environment (v4.2.0)

Branch `feature/sky-roadster-3d-v4.1`. Gameplay, hitboxes, lanes, speeds and obstacle timing unchanged (`git diff src/gameplay src/core/Rng.ts server` empty; the gameplay suites pass). Also in this version, from the owner's note during the step: **Turbo gets an aura like the Shield** (it smashes obstacles too).

## Phase 0 — audit (before any change, v4.1.3 at `6ae6e33`)

| Area | Found |
|---|---|
| Road | one fixed 8.6 × 300 m plane (`Track`), canvas texture tile 12 m scrolled by `dist` — already seamless, no segments to recycle. The whole road was emissive (texture × 0.6), markings cyan / amber, little asphalt detail |
| Props | rails + glass walls (full-length planes, scrolled textures), lamps + pylons (InstancedMesh, modulo `wrapZ`) |
| City (`Scenery.buildCity`) | 2 instanced building fields (near / far), 10 billboards (2 materials each), sky traffic (instanced), floating islands, side highways; dusk palette (orange horizon) |
| Re-entry | recycled props re-entered at the end of their range; for the lamps / signs / near buildings that point (−282 … −300 m) is inside the city fog (far 330 m), so they could appear faintly at the horizon |
| Lighting | hemisphere + warm sun + cool rim, ACES, PMREM room environment, half-res bloom on HIGH |
| Quality | `high` / `low` only (HIGH = bloom + speed blur + DPR 2, LOW = no post, DPR 1.5), auto step-down below ~42 fps |
| Gameplay coordinates | lanes −2.6 / 0 / +2.6, road speed 21 → 46 m/s (`SPEED`), obstacles positioned by `World` from `ObstacleRules` — the environment only reads them |
| Native | the game code here is the H5 build; the TikTok native adapter lives on `main` and was not touched |

Baseline measured in the real game build (one synchronous render at 140 m, 360 × 640 @2): LOW 148 draw calls · HIGH 163 draw calls · ≈ 64.5 k triangles. H5 JS 4,333 KB, single file 4,557 KB.

## What changed

### Road (Phases 1–3)
- `src/render/roadSurface.ts` — a **pure** generator (no Three.js / DOM, tested in Node) for one 12 m tile: dark blue-grey asphalt with three octaves of aggregate grain, sparse light stones and dark pits, slightly smoother **polished tyre tracks** in every lane, darker sealed **shoulders** with fine transverse grooves, **dashed dividers** (3 m dash / 12 m), **solid edge lines**, **reflective studs** (white in the divider gaps, amber inside the edge lines), lightly worn paint. Every pattern repeats a whole number of times per tile → no seam. Marking positions come from `LANES` (`ROAD` block in `config.ts`).
- `Track` uses it as three `DataTexture`s (colour 512 × 1024 sRGB, roughness, emissive — only markings and studs glow now, not the whole road), mipmapped, anisotropy per preset, no texture stretching (painted in metres).
- Road shader detail (no extra textures, uniforms only): **expansion joints** every 48 m and soft **light pools under the lamps**, both locked to the scrolling road and to the actual lamp phases.
- Guard rails in brushed steel (the near-white rail glared at night), lamp heads as cool-white LED bars that **stretch into light streaks** at speed and more in Turbo, **roadside signs** (XWAVE boards) outside the barrier — never over the road, so nothing can visually block or intersect the car (jumps / Sky Escape go high).
- **No popping** (`envFx.ts`): recycled props fade in from the fog colour over the last 45 m before their re-entry point (lamps, rails, pylons, signs, buildings, neon, billboards, sky traffic), whatever the world's fog distance.

### City (Phase 4) and lighting (Phase 5)
- Near layer: rails, lamps, signs, road supports (pylons). Mid layer: the near building field now carries **neon edges** on its road-facing side (roof line + corner strips, one InstancedMesh), billboards share materials and every third one is an **XWAVE brand board**. Far layer: the far building field as silhouettes in the haze plus **distant city lights** (one Points draw, beyond the fog, slow parallax, seamless repeating band).
- Future City is now a **night city**: deep blue-violet sky with stars, violet haze, a soft violet city glow at the horizon instead of a sun disc, cool moon key light + the existing rim. City readability profile retuned for the darker scene (full hazard outlines, lighter obstacle metal, slightly brighter markings). Other worlds keep their own looks (they get the new road).

### Speed feedback (Phase 6)
Road grain, studs and joints flowing past, lamp streaks (speed / Turbo), slow parallax of the far lights, the existing speed lines and Turbo rumble. No gameplay speed change.

### Graphics presets (Phase 9)
`GRAPHICS` in `config.ts`, applied by `Renderer.setQuality`, `Scenery.setQuality`, `Track.setQuality` (no recompile — counts, visibility and uniforms):

| | LOW | MEDIUM (default) | HIGH |
|---|---|---|---|
| Max pixel ratio | 1.25 | 1.5 | 2 |
| Bloom (half res) | – | ✓ | ✓ |
| Edge speed blur | – | – | ✓ |
| City density | 55 % | 80 % | 100 % |
| Neon, far lights, signs | – | ✓ | ✓ |
| Road joints / light pools | – | ✓ | ✓ |
| Road anisotropy | 2 | 4 | 8 |

Settings → Graphics is now **LO / MED / HI** (full-width tile so the label is not cut). Saves: new players start on MEDIUM; the old default HIGH becomes MEDIUM once, a stored LOW stays LOW, choosing HIGH again sticks. A slow device still steps down by itself (resolution → bloom → LOW, for the session).

### Turbo aura (owner note)
Turbo smashes obstacles, so it wears the same kind of shell as the Shield, in Turbo's lime, a little larger (outside the shield when both run), pulsing faster, dimming over its last second and fading out when Turbo ends.

## Performance and size (measured, not phone FPS)

One synchronous render in the real game build at the same run point (140 m), 360 × 640 @2:

| Preset | v4.1.3 calls | v4.2.0 calls | triangles | pixel ratio |
|---|---|---|---|---|
| LOW | 148 | **134** | 64.5 k → 62.6 k | 1.5 → **1.25** |
| MEDIUM | (did not exist) | 158 | 63.8 k | 1.5 |
| HIGH | 163 | **159** | 64.5 k → 64.2 k | 2 |

Home (same method): LOW 94 → 114, HIGH 109 → 138 — the Home camera sees more of the city, so the new neon / lights / boards add more there. In a race the totals went down slightly: the sign bodies are merged meshes, billboards share materials. LOW also fills ~31 % fewer pixels than the old LOW. GPU memory: road textures 3 × 512 × 1024 RGBA (≈ 8 MB with mipmaps). Long-run browser check: no geometry, texture or shader-program growth over 3.6 km, none across preset switches. FPS on a phone was **not** measured (software WebGL here is not representative).

Bundle: H5 JS 4,333 → 4,344 KB (+11 KB), single file 4,557 → 4,568 KB (+11 KB) — the road is generated at start-up, no image assets added.

## Screenshots (this folder)

Real game build (headless Chromium, software WebGL, 360 × 640 @2 = 720 × 1280, 9:16): `01`, `09`, `10`, `13`, `environment_before_after.png`, `extra_settings_graphics.png`. Environment harness (`npm run test:envshots` / `scripts/env/preview-env.mjs` — the game's own `Renderer`, `Scenery`, `Track`, `ObstacleViews`, `Vehicle`, `CameraRig`, `Player`, stepped at 60 Hz): `02`–`08`, `11`, `12`, `14`–`16`, `graphics_quality_comparison.png`.

| File | |
|---|---|
| `01_road_before_after.png` | v4.1.3 vs v4.2.0, same run point |
| `02_asphalt_closeup.png` | grain, tyre tracks, studs, edge line, shoulder |
| `03_lane_markings.png` | dividers, edge lines, studs, light pools |
| `04_guardrails.png` | steel rail, glass wall, LED lamps, sign |
| `05`–`07_city_*_layer.png` | near · mid (neon, XWAVE boards) · far (silhouettes, city lights) |
| `08_night_lighting.png` | HIGH, night palette |
| `09_gameplay_balanced.png`, `10_gameplay_nitro.png` | real race, BALANCED, MEDIUM; Turbo with its aura |
| `11_jump_obstacle_visibility.png`, `12_down_obstacle_visibility.png` | crates / barrier ahead and jumped · beams ahead and dived under |
| `13_home_environment.png` | real Home |
| `14`–`16_quality_*.png`, `graphics_quality_comparison.png` | same frame on LOW / MEDIUM / HIGH with draw calls |
| `environment_before_after.png` | Home and race, v4.1.3 vs v4.2.0 |
| `env_selftest.json` | browser checks below |

## Tests

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm test` (11 suites, new `test:env`) | pass — 217 checks, 0 failures |
| ↳ `test:env` | road periodic with the 12 m tile (exact), every pattern a whole number of periods, texture wrap step ≤ normal row steps · dividers halfway between lanes, edge lines outside the outer lanes, lane centres never painted, texture columns match · `wrapZ` scrolls smoothly and re-enters only at the far end, fully hazed (no popping) · presets LOW / MEDIUM / HIGH ordered, post-processing per preset, settings cycle · saves: new = MEDIUM, HIGH → MEDIUM once, LOW stays, HIGH re-picked stays · lanes / heights / hitbox unchanged |
| `npm run test:envshots` (real WebGL) | pass — 4/4: no geometry / texture growth over 3.6 km, no new shader programs, presets applied (pixel ratio 1.25 / 1.5 / 2), geometries stable across switches |
| `npm run test:vfx` | pass — 24/24 (incl. Turbo aura on / with shield / off) |
| Home rendering | real Home screenshot, no page errors |
| H5 build / single file (`build-esbuild.mjs`) | pass — 4,344 KB / 4,568 KB; single file loads with no page errors, Home + Play |
| Vite build | not run (npm registry blocked here) |
| TikTok native | not tested (no device); no native-only API added — DataTexture, InstancedMesh, Points and shader chunks already used by the game |

## Known limitations

- Phone FPS not measured; MEDIUM is a conservative default until device benchmarks.
- MEDIUM / HIGH draw ~16 more scene calls than before (city extras); LOW does not.
- The road texture is 512 × 1024 on every preset (≈ 8 MB GPU with mipmaps); a 256 × 512 LOW variant is possible if memory is tight.
- Only Future City got the night palette; Mega City and the ladder / bonus worlds keep their looks (with the new road).
- Obstacle models unchanged; only the city readability profile was retuned for the darker scene.
