# Progress log

## 2026-10-24 — new-main v3.2.0

**Done**: merged the newest `feature/sky-roadster-v4.6-big-update` (training, Bonus 3 plays, post-race rank board, cleanup / perf, promotion rewards, rarity by class) into `new-main`, car / road / camera files kept as `main` (pre-3D car images restored after the v4.6 cleanup deleted them). Native: `runRank` overlay (climb animation + glow), classUp reward, Bonus plays left. `CAR_VIEW` (config) = bigger car + closer camera. Removed 3D-only QA scripts and the native paywall popup.

**Verified**: typecheck, 9/9 suites, build:tiktok, check:tiktok 0 FAIL, ES2017, web bundle resolves (bun), simulator: race (bigger car, special under the hearts) and the rank board after a forced game over.

---

## 2026-10-24 — new-main (v3.1.0): v4.6 changes on the v3 game, car / road / camera unchanged

**Done**: branch `new-main` from `main`, merged `feature/sky-roadster-v4.6-big-update`, then restored to `main`'s version: `render/Vehicle.ts` (only the SKINS unlock matrix + `carsForRank` + all-dark `carVisibility` ported), `Track.ts`, `Scenery.ts`, `CameraRig.ts`, `textures.ts`, `Readability.ts`, car pictures, manifest; removed `render/car/`, `roadSurface.ts`, `envFx.ts`, the GLB, `scripts/car`, `scripts/env`, car / camera / env tests, the Camera motion setting. Game.ts: 3D-car calls removed (model ready, crash FX, pickup sweep, turbo aura, camera dynamic / car size, scenery / track quality). Audio / Renderer = the resolved versions from `feat/v4-native`. Native UI: classUp, exchange panel + shopToExchange, loading %, Restart, flat buttons (`g.flat`), Home without shadows, special under the hearts, LO / MED / HI, future-car labels.

**Verified**: typecheck, 9/9 test suites, build:tiktok, check:tiktok 0 FAIL, ES2017 parse, simulator (see report). Web build not run here (vite not installed in this workspace).

**Next**: owner reviews; if good, `new-main` can replace `main`.

---

Newest entry on top. Every AI session adds a short entry: what was done, what is unfinished, what's next.

---

## 2026-10-23 — v3.0.11

**Done**: owner's addendum (reward button visibility + auto layout + Reward Claimed!) — `src/meta/Perks.ts` (pure), `hs.perkState()/perkVisible()`, home rail in `screens.ts` (railY glide), `NativeUI.rewardClaimed`, `main.ts` given → notice, popup tap guards, web `UI.perkBadges` + CSS. Revive ad fix (`Game.continueByAd` freezes the countdown; `popups.ts continueOv` canShowAd), ad waits capped (`Ads.ts capped`). Android launch: renderer context fallback (`Renderer.makeRenderer`), MSAA 2× on Android. In-game log `src/native/log.ts` (corner 5 taps / Settings diag / boot error screen).

**Note**: the addendum refers to "previous" Android-launch / notification task texts this session never received — implemented from the addendum itself. vConsole: TikTok only shows it for a debug build opened from the developer tool; on some Android versions it does not open — the in-game log covers that.

**Next**: owner tests on Android + iPhone: reward buttons after claiming, Revive ad, offline start.

---

## 2026-10-23 — v3.0.10

**Done**: Training button in the track page header (`screens.ts tracks`, `UI.ts head`), card alignment, home chip flag removed. First Play → `openTutorialIntro` while `tutorialDone` is false (unchanged, verified in the sim).

---

## 2026-10-22 — v3.0.9

**Done**: Android jank (owner: home + race start) → compile hidden pooled meshes at load (Game.ts), `platform.android` + `scaleCap 1.5`, home UI redraw throttle (NativeUI.frame), audio baking sliced (Audio.ts). SVG flags `src/meta/Flags.ts` used by native gfx.rich (emoji → SVG) and pickers. Rank guide rows wrap (popups.ts rankguideOv).

**Next**: web UI still shows emoji flags (fine on iOS/macOS, letters on Windows) — could switch to `flagSvg` too.

---

## 2026-10-22 — v3.0.8

**Done**: `layout.ts capRow()/belowCap()` + capsule rect in `SAFE` (main.ts) → first row beside the capsule (home, pageHead, HUD). Native shop rewritten (`screens.ts shop`): Remove Ads, free coins, pack tiles. New products in `tiktok.hs-dashboard.json` (owner must paste into the HS dashboard — the game reads products from there). `ITEM_PRICE` specials raised. Shield 2 hits, timer ×0.7 (`SHIELD` in config). Owner confirmed sound OK on iPhone.

**Note**: HS reports `has('shop')` off on Android → the shop shows "open soon" there; packs appear where HS enables the shop.

---

## 2026-10-22 — v3.0.7

**Done**: Android now loads (v3.0.6 regex fix confirmed by owner screenshot). Top inset fix in `src/native/main.ts measureSafe()` (px → layout units, clamps) + smaller offsets in `screens.ts` (home, pageHead) and `hud.ts`.

**Next**: owner checks the top spacing on Android + iPhone, and the sound on iPhone.

---

## 2026-10-22 — v3.0.6

**Done**: Android load failure found from the owner's screenshot — `/[^\p{L}\p{N} _.\-]/u` in `Game.setName` is a SyntaxError on the Android engine → `cleanName()` without `\p{}`; build guard in `scripts/build-tiktok.mjs` rejects post-ES2017 regex features. Baked audio for native (`Audio.ts`: `baked`, `bakeSfx`, `bakeLoopAsync`, synth helpers at the end of the file) to stop the iPhone crackle. Bonus: every 1 h, open 30 min, random place per opening (`meta/Bonus.ts` `themeIdx`), replayable (Game.startBonus / retry); tests in `tests/bonus.test.ts`.

**Next**: owner tests v3.0.6 on the two Android phones and the iPhone (sound). If Android shows another engine error, the boot error screen prints it.

---

## 2026-10-22 — v3.0.5

**Done**: HUD coin card (race + total) and cleaner score box (`hud.ts`); Audio compat layer + resume (`src/audio/Audio.ts`, `main.ts`); Colour row removed (auto calibration kept, diag = tap version ×5); `src/ui/shared.ts` so the native bundle skips UI.ts and its images.

**Android 1007 ERROR_CANNOT_OPEN_MINIS**: shown by TikTok before the game loads (FPS 0 on the debug panel), same zip works on iPhone → not the game code. TikTok's troubleshooting page: the scanning account must be a test user, in the same region; latest package uploaded. Owner to check tester list / account region on the Android phones.

---

## 2026-10-22 — v3.0.4: colour calibration + Android "Couldn't open TikTok Minis"

**Owner report**: iPhone still washed out (menus much worse than home); 2 Android phones show "Couldn't open TikTok Minis".

**Colour**: the v3.0.3 alpha theory did not fix it. Dark navy → slate grey everywhere points at an extra sRGB encode (screen surface) or sRGB textures not decoded. `src/native/color.ts` measures both at start (render target + screen readback of a 50 % grey) and fixes only what it finds; Settings → Colour lets the owner force Normal / Screen fix / Texture fix and shows `out` / `tex` readings (browser: 55 / 55). UI quad = RawShaderMaterial copying the canvas raw (decode only when the screen encodes).

**Android**: removed `tiktok/package.json` (tools now run on a temp copy), ES2017 downlevel of game.js via TypeScript (build script), `put()` for read-only runtime globals, boot error screen. Also to check on the owner side: the Android TikTok accounts must be testers of the app in the TikTok developer portal, TikTok app up to date.

**Next**: owner sends a Settings screenshot from the iPhone (the colour line) → confirms which fix applied.

---

## 2026-10-22 — v3.0.3: native fidelity (owner screenshots: H5 vs TikTok native)

**Cause of the faded look**: the canvas UI quad blended its alpha into the framebuffer (and post passes can leave alpha < 1); TikTok composites the game canvas with alpha, so the page showed through everything. Fix in `src/native/main.ts`: UI material keeps destination alpha (CustomBlending, alpha Zero/One) + `opaque()` clears alpha to 1 after the UI pass.

**HUD** (`src/native/ui/hud.ts`) redrawn to the H5 layout; `shieldBadge()`; pause menu sizes up (`popups.ts`). Capsule safe area re-measured at 0.8 s / 3 s with a fallback.

**Not verifiable here**: the alpha fix (desktop Chrome honours `alpha:false`) — check on the phone.

---

## 2026-10-22 — v3.0.2: buttons dead on the TikTok device

**Cause (reproduced)**: `Audio.unlock()` on the first tap built the Web Audio graph with chained `connect()` and `createDynamicsCompressor` — a mini-game Web Audio without them threw halfway, leaving `ctx` set but buses undefined → every `audio.play('click')` (first line of most button handlers) threw → nothing happened; the music timer threw 40×/s. Also: Three's ImageLoader waits on `addEventListener('load')`, which a runtime image may not fire → no car sprite.

**Fix**: fail-safe Audio (no chained connect, unlock/play/schedule in try/catch, off on failure); makeImage always installs its own listeners; `Gfx.guard()` per screen; touch device-pixel guard; handler errors toast once.

**Test rig** (scratch, not in repo): Chromium Web Worker = TikTok-like runtime (no window/document), OffscreenCanvas screen, strict tt (partial Web Audio, onload-only images), touches forwarded from the page. Flow home → settings → garage → play → tracks → special → countdown all respond.

---

## 2026-10-22 — v3.0.1 release package

**Done**: HS Game ID = TikTok App ID `7698594517263403028` (in `src/native/hs.ts` and `tiktok/project.config.json`), SDK key set, real TikTok ad unit ids for the 5 places in `tiktok.hs-dashboard.json`. `npm run check:tiktok` → 0 fail, 0 warn. `npm run pack:tiktok` → `tiktok-tiktok.zip` (git-ignored).

**Next**: paste `tiktok.hs-dashboard.json` (iaa_config → Ads Config raw JSON, products → Products import) in the HS dashboard; upload the zip; test on a phone (WebGL 2, ads, Beans shop).

---

## 2026-10-22 — v3.0.1

**Done**: pause never times out (Game.tick: `paused` no longer shares the `continue` 7 s countdown → it used to end the race); ad places renamed `rw_revive` / `rw_end_bonus` / `rw_free_coins` / `rw_head_start` (rewarded) and `int_race_end` (interstitial) in `src/native/hs.ts` + `tiktok.hs-dashboard.json`; home right rail always has Share / Entry / Launch (live where `HSGame.has`, else a tap explains; claimed = ✓); web preview takes keyboard focus on tap (the HS web shim cancels pointerdown, so arrows/WASD did nothing in a frame).

---

## 2026-10-22 — v3.0.0: native TikTok mini game (main) · v2 kept on branch `v2`

**Owner asked**: release as a native game for TikTok Minis with the HS SDK kit (hs-sdk 1.1.2); "clone thành native version 3.0, giữ bản 2.0 ở GitHub, 3.0 làm main". HS answers: SAVE local · no Game ID / SDK key yet · shop + ads at revive / end bonus / free coins / head start · no sign-in button.

**Done**
- `v2` branch = v2.3.0 (untouched). `main` = v3.
- `src/native/`: `adapter.ts` (window/document/localStorage/Image/AudioContext over `tt`, first `tt.createCanvas()` = screen), `hs.ts` (HSGame.profile local + DEFAULTS + literal showAd / share / tiktokMission / shop / buy), `save.ts` (SaveData → profile; wallet / super / hyper / escape / noAds are accessors on profile fields; other data via `src/core/kv.ts` → profile `kv`), `main.ts` (Game on the screen canvas, canvas UI layer via `Renderer.uiPass`, tt touch → UI first, else `Input.touchBegin/Move/End`, HS pause/resume/given), `text.ts` (name entry via tt.showModal editable).
- Canvas UI (`src/native/ui/`): `gfx.ts` (painter, hit regions, scroll areas, rich text for the game's HTML strings, rank badges, buttons), `svg.ts` (SVG → canvas for every inline icon/avatar/art), `NativeUI.ts` (same 69-member API as the DOM UI; the build aliases `src/ui/UI.ts` to it), `screens.ts`, `popups.ts`, `hud.ts`. All screens ported.
- Hooks in shared code: `src/platform.ts`, `setAdProvider` (Ads.ts), `setSaveBackend` (Save.ts), `kv.ts`, Renderer optional canvas + `uiPass`, Input touch methods, `setLangCode` (i18n).
- `scripts/build-tiktok.mjs` (esbuild or Bun) → `tiktok/game.js` 1.27 MB + assets (folder 2.5 MB of 4 MB). `tiktok/package.json` = `{"type":"commonjs"}` so Node's hs-check loads the kit inside this ESM repo.
- `tiktok.hs-dashboard.json`: 5 ad places (placeholder ad ids), share / tiktok_profile / tiktok_shortcut rewards, items, 5 Beans products (coin packs + Remove Ads, prices = guesses to adjust).
- `npm run check:tiktok`: **0 FAIL** (warns: App ID not set, placeholder ad ids). Headless preview (hs-web build + Chromium): home, tutorial, tracks, special pick, race HUD + countdown all render and respond to taps.

**Not tested here / risks**
- Real TikTok device: Three r169 needs **WebGL 2** in the TikTok runtime; audio via `tt.createWebAudioContext`. Test on a phone with the TikTok developer tool before review.
- v2.3 cloud accounts are off in native (profile is the save). Missions / daily quests / check-in stay game-side rewards (not HS claim keys yet).

**Next**: owner gets App ID + HS Game ID / SDK key → put App ID in `tiktok/project.config.json`, keys in `src/native/hs.ts`, real ad unit ids + products in the HS dashboard, then `npm run pack:tiktok`. Possible: map daily check-in / missions to `HSGame.claim` keys so the dashboard can tune them.


## 2026-10-24 — v4.6.1: owner decisions (same branch `feature/sky-roadster-v4.6-big-update`)

**Decided by the owner**:
- Zenith is now ice blue.
- Rarity labels follow the unlock class.
- C / B / A promotions give coins plus one special (`CLASS_REWARD`).
- Step 07 FINAL is closed: the experimental premium / arcade cameras and the PBR pass were removed (`docs/3d-upgrade/step07-final/README.md`).
- `feature/sky-roadster-3d-v4.1` is kept as it is (no reset).

**Step 06.5**: the QA (`scripts/qa/step065.mjs`) was rerun on v4.6 with the v4.6 / v4.6.1 garage and promotion expectations. Results and evidence are in `docs/gameplay-upgrade/step06-5/`. The class matrix doc was updated.

**Next**: the owner approves Step 06.5 (v4.6.1). Native / TikTok sync and the merge to `main` happen only after approval. Phone FPS is still not measured.

---

## 2026-10-23 — v4.6.0 on NEW branch `feature/sky-roadster-v4.6-big-update` (owner requests)

**Done**: 3D car 15 % taller (runtime Y scale, wheels compensated, GLB untouched — fingerprint test still green); home orbit kept inside the road (`CAMERA.home` yaw 0.24 ± 0.14); UI car pictures = renders of the 3D X1 per colourway (`src/assets/images/cars/*.webp`, `rear-*.webp`); ad revive adds no heart, shows only "REVIVED!"; Settings → Camera motion (default OFF: fixed view — lanes, jumps, dives never move / tilt the camera; Roadster / HYPER / SOS flights still lift it); flat-button rule no longer un-blackens locked car silhouettes. npm test 12 / 12. Shots: `docs/gameplay-upgrade/v4.6/`.

**Done 2026-10-24 (owner list of 11)**: special button under the hearts + smaller; bigger car in the fixed view (screen-adaptive camera distance, `RENDER.carScaleFixed`); Home / Play no shadows; Garage AA + AAA dark (Nexus = AAA); Restart label; NORMAL on launch; Shop exchange at the top (item tap → exchange popup); running loading bar; post-race weekly rank board (`#runrank`, `aroundYou`); Bonus hourly / 30 min / 3 plays; training fixes (`scripts/qa/training.mjs`: 7 lessons, 0 obstacles driven through); cleanup (pre-3D sprite images, dead exports, needRocket paywall) + per-frame allocation fixes. Bundle 4.59 → 3.56 MB.

**Note**: `feature/sky-roadster-3d-v4.1` still holds v4.5.0 (Step 06.5) — this branch starts from it. Vega and Zenith render identically (same white paint; Vega's red only lived in the old 2-D picture).

**Next**: owner review; Step 06.5 approval still pending. No merge to `main`.

---

## 2026-10-23 — v4.5.0: Step 06.5 + Patch 02 (H5 gameplay) — STOP, waiting for approval

**Done** (details, screenshots, test results: `docs/gameplay-upgrade/step06-5/`):
- Audio starts from the first real tap (no Settings needed), resumed on every tap until running, suspended in background; crash SFX at the collision event (trigger ≈ 0.4 ms after it on the main thread; audible device latency not measured).
- Pause: one frozen state, never auto Game Over (root cause: `'paused'` shared the revive countdown in `tick`).
- Air Dash road item (outer lanes, safe-landing spawner guard, runtime `AirDashGuard`), airborne-only spoiler, item balance per level (`ITEM_BALANCE`), last-chance auto Roadster / HYPER / SOS (`Run.lastChance` → `Game.activateSpecial('AUTO_LAST_CHANCE')`), Magic Bag auto-equip (fills an empty special slot only), class unlock matrix (AA = Inferno only; S / SS / SSS future cars), first-time class celebration (A+), flat non-Home buttons, crash: car falls to the road + 3 real parts break off on the final crash.
- Tests: new `tests/airdash.test.ts`, spoiler matrix in `tests/carMotion.test.ts` (npm test 12 / 12); real-build QA `scripts/qa/step065.mjs` 59 / 59 (+ `h5.mjs`, `audio-startup.mjs`, `item-balance.ts`). Artifact "Sky Roadster v4" republished (Version 10).
- Step 07 FINAL was paused by the owner before it finished: WIP commit `a9e1476` (approved GLB lock + fingerprint test, camera candidates `?cam=premium|arcade`, PBR pass opt-in `?pbr=1`); defaults unchanged.

**Open decisions for the owner**: where the old C / B / A / AAA cars go (mapped by rarity to S / SS / SSS; Nexus = future car without a condition) — `SKINS` in `src/render/Vehicle.ts`.

**Known**: no phone / Native test (H5 only, SwiftShader in the cloud); audible audio latency and real-device FPS not measured.

**Next**: owner reviews Step 06.5 → approval. Do not start Step 07 / Native sync before that.

---

## 2026-10-23 — v4.4.1: X1 car model restored to v4.2.0 (owner request)

**Done**: owner preferred the v4.2.0 car (Step 04 screenshots). Restored the game GLB, `scripts/car/x1-builder.ts` and `tests/car.test.ts` from `d222b92`; other v4.2.1–v4.4.0 work kept. Step 06 / 07 models saved in `assets-src/x1/rollback/` (+ masters); their builder lives in commit `d00b71c`. Step 05 finished: screenshots 01–13, no-DOM smoke 10/11 (context restore fails without canvas events — native open item), env self-test 6/6. The clean MEDIUM / HIGH re-profile was dropped by the owner ("bỏ đo hiệu năng step 05"); MEDIUM / HIGH timings stay marked invalid.

**Known**: Step 06/07 reports describe the rolled-back car; the studio / compare tools now build the v4.2.0 car by default. Phone FPS still not measured; TikTok native not ported.

**Next**: owner decides the next step.


## 2026-10-23 — v4.4.0: 3D upgrade Steps 05 → 07 (readability / perf, X1 reconstruction, shorter rear)

**Done**:
- Step 05 (v4.2.1): thin gold Ring Coins + collect fade; airborne camera (BALANCED / LOW rise with the car); particle density per preset, LOW 256 road texture; city silhouettes / window variety; `?perf=1` (`src/core/perf.ts`); context-loss handling; `scripts/perf/profile.mjs`; no-DOM smoke test (`scripts/native/`); preset-switch texture leak fixed (`Renderer.disposeComposer`). Report: `docs/3d-upgrade/step05/` (MEDIUM / HIGH timings invalid — contended run).
- Step 06 (v4.3.0): X1 matched to the rear master with studio renders + automated silhouette comparison (`scripts/car/x1-studio.ts`, `studio-x1.mjs`, `compare/*.py`); master model `--detail=master`; mesh fixes. Report: `docs/3d-upgrade/step06/reconstruction/`.
- Step 07 (v4.4.0): rear overhang 0.94 → 0.84 m (`REAR_K`), roof frame, body-colour closed spoiler, black glass (owner), smaller intake, diffuser ramp; real gameplay camera (`scripts/car/game-camera.ts`), real-game state captures (`scripts/car/gameplay-states.mjs`). Rollback GLBs in `assets-src/x1/rollback/`. Report: `docs/3d-upgrade/step07/`.

**Known**: rear-3/4 ≥ 0.85 is met through a re-calibrated camera, not geometry (documented); Step 05 MEDIUM / HIGH timings need a clean rerun; Step 05 screenshot set 01–12 not produced; TikTok native not tested (v4 not ported); no Blender in the cloud session.

**Next**: owner reviews Step 07 → Step 08. Do not merge to `main` / submit to TikTok without approval.

---

## 2026-10-23 — v4.2.0: 3D upgrade Step 04 — procedural road, night city, graphics presets, Turbo aura

**Done**: `roadSurface.ts` (pure, tested) → road DataTextures in `Track` (asphalt grain, tyre tracks, shoulders, dashed dividers / edge lines / studs from LANES; joints + lamp light pools in the road shader), steel rails, LED lamp streaks, roadside XWAVE signs, `envFx.addFarFade` (recycled props fade in from the haze — no popping). City: night palette, neon on the near buildings, XWAVE boards, distant city lights, shared billboard materials. Graphics LOW / MEDIUM / HIGH (`GRAPHICS` in config, default MEDIUM, save migration HIGH → MEDIUM once, Settings LO / MED / HI). Turbo aura (owner note). Tests: 11 suites / 217 checks; `test:envshots` 4/4, `test:vfx` 24/24 in real WebGL. Report: `docs/3d-upgrade/step04/README.md`.

**Known**: phone FPS not measured; Home draws ~20–30 more calls on MEDIUM / HIGH (city extras); only Future City got the night palette; Vite + TikTok native not run here.

**Next**: owner reviews Step 04 → Step 05. Do not start before approval.

---

## 2026-10-23 — v4.1.3: 3D upgrade Step 03.2 — front end, pop-up spoiler, premium VFX, dive pose

**Done**: generator front rework (rounded nose, tucked splitter, intake + air curtains, LED headlights draped on the paint by ray cast, seams, pearl paint, darker glass) and the front-wheel fix (side profile cut at the arch line — it used to fold around the tyre; 0.34 m front tyre, elliptical arch, black liners). Pop-up spoiler (rise 6 cm + 22°, wedge skirt). `CarFx.ts`: shield aura shell (old grey mote cloud removed for the 3D car), ghost / pickup edge light compiled into the car materials, pooled crash shards + flash; `MeshCar`: soft 3-layer nitro, DOWN press-down pose, settle on game over, prewarm. `carMotion.carHeight`: in the air the 3D underside never hangs below the hitbox (visual only). Traffic hover pods tucked inside their collision width. Countdown shake fixed (car + camera were stepped twice per frame with two speeds). `?debug=collision` overlay. Tests: 10 suites / 190 checks; `npm run test:vfx` 21/21 in real WebGL. Report: `docs/3d-upgrade/step03-2/README.md`.

**Known**: car still longer / wider than the hitbox (inherent, documented); thin seams can shimmer at distance on low-DPI screens; front nose fillet shows a faint shading crease (hidden under the bumper seam); FPS not measured on a phone; Vite + TikTok native not run here.

**Next**: owner reviews Step 03.2 → Step 04. Do not start before approval.

---

## 2026-10-23 — v4.1.2: 3D upgrade Step 03.1 — shorter, mirrorless, jump spoiler

**Done**: builder `LENGTH_CUT` 0.08 (front-half z-warp, arches kept round; `build-x1.mjs --cut=`), mirrors deleted, `spoilerUpdate()` (jumping = `Player.vmode === 'up'` ‖ nitro, 0.25 s hold), `Vehicle.crashRecoil()` (visual nose setback at crash). Tests: spoiler transitions with the real Player, mirror / length / wheelbase / rear-unchanged checks. 10 suites / 175 checks pass; esbuild builds pass. Report: `docs/3d-upgrade/step03-1/README.md`.

**Known**: car (3.23 m) still longer than the 2 m hitbox — near-misses can visually brush; splitter shows a little ahead of the nose; Vite + TikTok not run here.

**Next**: owner reviews Step 03.1 → Step 04. Do not start before approval.

---

## 2026-10-23 — v4.1.1: 3D upgrade Step 03 — rear bumper, active spoiler, cameras

**Done**: builder rear rebuilt (solid `Rear_LowerBumper` + recessed `Diffuser`, `Spoiler_Pivot`/`Spoiler`, sockets in the recess, rail/rods/tubes deleted); `carMotion.ts` (pure, tested); `MeshCar` spoiler / yaw / ghost fade; `CAMERA` presets + `CAMERA.home` in `config.ts`, `CameraRig.car3d` / `presetOverride`; `Game.ts`: 3D car stays visible while dying, `rig.car3d` set on skin / model ready. New tests `test:camera`, `test:motion`; `test:car` extended. 10 suites / 155 checks pass; esbuild builds pass; Vite + TikTok not run. Report: `docs/3d-upgrade/step03/README.md`.

**Known**: crash frame — car longer than hitbox, obstacle overlaps the hood; no 3D crash shatter / aura; glass still greyish in studio light.

**Next**: owner reviews Step 03 → Step 04. Do not start before approval.

---

## 2026-10-23 — v4.1.0: 3D upgrade Step 02 — 3D XWAVE X1

**Done**: refined X1 model (scripted builder `scripts/car/x1-builder.ts` → `src/assets/models/xwave-x1.glb`, 31.9k tris), own GLB reader `src/render/car/glbParse.ts` (no GLTFLoader / fetch / TextDecoder for bundled data), `src/render/car/MeshCar.ts` wired into `Vehicle.ts` (rear image = fallback until loaded, `?car=sprite` to compare), `RENDER` block in `config.ts`, `tests/car.test.ts`. Typecheck, 8 test suites, esbuild builds pass; Vite build and TikTok native not run here. Report + screenshots: `docs/3d-upgrade/05-step02-vehicle.md`, `docs/3d-upgrade/step02/`.

**Half-done / known**: glass too light + seats barely visible, rear tyres partly hidden, diffuser too light, no Phase Ghost / aura / crash shatter for the 3D car, nose extends ~0.8 m past the hitbox (visual only), GLB 949 KB unoptimised. Tag `v4.0.1` still needs pushing from the PC.

**Next**: owner reviews Step 02 → Step 03 (rear chase camera). Do not start before approval.

---

## 2026-10-23 — 3D upgrade Step 01: audit (no game code changed)

**Done**: branch `feature/sky-roadster-3d-v4.1` (from `v4.0.1`), audit docs in `docs/3d-upgrade/` (01 source audit, 02 architecture, 03 roadmap, 04 baseline tests). Key finding: the car on screen is a 2D studio image (billboard in an overlay pass, `render/Vehicle.ts`), not a 3D model; a hidden procedural car and a GLB hook exist. `npm test` passes; typecheck/build could not run here (npm registry blocked in the cloud session).

**Half-done**: tag `v4.0.1` exists only in the cloud clone (tag push refused) — create + push it from the PC (`04-baseline-test-results.md`).

**Next**: owner approves the plan and chooses the X1 3D source (model file / model from images / AI image-to-3D) → Step 02 (3D vehicle). Do not start Step 02 before that.

---

## 2026-10-23 — v4.0.1: branch `v4.0.1` for the 3D upgrade

**Done**: new branch `v4.0.1`, started from the H5 web game v2.3.0 (branch `v2`), not from `main` (v3 native) — owner chose H5 as the base because it is easier to upgrade to better 3D. VERSION → v4.0.1, AGENTS.md workflow lists all four branches.

**Next**: the 3D upgrade itself (render/ — lighting, shadows, models, road, city, effects), keeping gameplay/fairness unchanged.

---

## 2026-10-22 — v2.3.0: accounts & cloud save (owner chose "cách 2", server coming)

**Done**: `src/net/Cloud.ts` (guest token, email code, Google/Apple via server-side OAuth popup/redirect, GET/PUT /save with rev + 409 conflict, run queue), Game: `cloudSync` / `resolveCloud` / `applyCloud` (writes the cloud save then reloads) / `cloudAction` / `reportRun`; UI: Settings → Account popup, "Which progress?" chooser. Server rewritten: `server/index.mjs` + `server/core.mjs` + `schema.sql` + README (env vars, go-live). Tested end-to-end headless with a local server: device A (4,600 EXP, 7,054 coins) signs in by email → device B fresh install signs in → same progress restored.

**To go live**: host the server (HTTPS), set env (README), put the address in `CLOUD.api` (src/config.ts), rebuild. Google needs an OAuth Web client; Apple needs a Services ID + key; email needs a mail key (Resend) or another mailer in `sendCode()`.

**Next**: switch the leaderboards to the server boards when the server is live (PlayerStore already has `RemotePlayerStore`).

---

## 2026-10-22 — v2.2.8: Home = owner mock-up

**Done**: CSS block "v2.2.8 — Home exactly like the owner's mock-up" at the end of `ui.css`; stars in the speed selector, `ROCKET_W` / `CAR_LINE` icons, `.pchev` on PLAY.

---

## 2026-10-22 — v2.2.7

**Done**: removed the v2.2.5 Home button overrides (owner wants Home exactly as his 08:50 screenshot); glossy icon-button rule now skips `#start`.

---

## 2026-10-22 — v2.2.6: glossy buttons everywhere

**Done**: one CSS block at the end of `ui.css` (`#ui .screen .btn:not(.mbtn)` + `.icon-btn`) restyles every button.

---

## 2026-10-22 — v2.2.5: Home polish

**Done**: all-time #rank badge on the Home avatar (`homeSync.allRank`), glossy mini buttons, animated PLAY.

---

## 2026-10-22 — v2.2.4: owner round AA

**Done**: AA1–AA5 (see README). Root cause of the dead Retry: `#specialpick` was stacked under `#gameover` / `#pause` (same z-index, earlier in the DOM). Pause → Home now calls `gameOver()`. Difficulty: `PHASES` D/C/B and `PHASE_UNLOCK` shifted one step earlier (v1 rhythm); `COIN_LINES.endless` = v1 values. All tests pass (hard-row shares still rise phase by phase).

---

## 2026-10-22 — v2.2.3: owner round Z

**Done**: FIXLIST Z1–Z12. `World.step` eases speed; `UI.hudLevel/hudTop` + `.hnext`; `ADS.endBonus`; COIN_LINES endless 0.545 / bonus 0.5; `GIFTS.boxChance` 0.15, `boxGap` 600; Bonus power slots 240–380 m; `BONUS.finishCoins` 300.

**Speed check**: Easy / Normal / Hard = 62 / 91 / 113 km/h at the start → 124 / 184 / 228 km/h at 6 km (plus rank-phase bumps).

---

## 2026-10-22 — v2.2.2: owner round Y

**Done**: FIXLIST Y1–Y6 (see README). `Run.coin2T` (ring double coins), `Game.shareGameLink`, `carRear` for the share card, speeds Normal 1.21 / Hard 1.5 with EXP rates 0.184 / 0.19 / 0.318, Bonus special chance 0.065.

---

## 2026-10-22 — v2.2.1: hotfix

**Done**: Tutorial card opened from Home → close → Home had no buttons (it was shown alone, not over Home). Fixed in `openTutorialIntro` + close goes through `closeModal`.

---

## 2026-10-22 — v2.2.0: owner rounds H–X done

**Done**: all of `docs/FIXLIST.md` H–X (see README "v2.2.0"). New code: `meta/Career.ts` (career missions), `ui/ShareCard.ts` (share image), `render/BonusTunnels.ts`, `Spawner.setPieces / buildSetPiece / tunnels`, `World.injectRows`, `GIFTS` + `BONUS_SET` in config, `tests/bonus.test.ts`.

**Notes**: double EXP can push the run's EXP ahead of the distance-based rank gates (by design request). Base road speed still rises slowly with distance / rank phase on Endless (turbo itself now eases back to that base). Headless checks only — feel of slow-mo swing, set pieces and tunnels needs a phone test.

**Next**: owner playtest; rear renders for Volt / Phantom / Inferno / Nexus; delete dead v1 code (cups, courses, MissionTracker, upgrades, pass).

---

## 2026-10-22 — v2.1.0: owner fix list done

**Done**: everything in `docs/FIXLIST.md` (A–G) — see README "v2.1.0". New: `ENDLESS_LADDER` / `ladderAt` / `nextWorldAt` (Spawner), 7 ladder sceneries (`buildLadder` in Scenery), themed obstacle props per place (`buildThemed` / `buildLadderProp` in ObstacleViews, keyed pools), `HEARTS`, XWAVE Vega (`rear` skin field), emblem avatars, `docs/assets-inbox/` (owner's original logo + car image).

**Notes**: F1 (home buttons missing after training) could not be reproduced headless; Home now force-resets training overlays/state. Tests: `tests/phases.test.ts` also checks the 12-world order.

**Next**: owner playtest on phone; rear renders for Volt / Phantom / Inferno / Nexus; remove dead v1 code (cups, courses, MissionTracker, upgrades, pass).

---

## 2026-10-22 — v2.0.3 → v2.0.8: v2 steps 3–8 done (owner: "auto làm đủ hết")

**Done** (details in README per version):
- 3 Tracks & cars: Endless + Mega Rush (Track 2, opens at AAA, ranks S/SS/SSS) + 3 "coming soon"; cars unlock by rank only; Endless uses the chosen speed level.
- 4 Specials & coins: one special per race (popup on track tap), buy with coins, Magic Bag rules, AAA teaser specials, coin-only shop, v1 refunds (`save.v2`).
- 5 Revive by rewarded ad (max 2), interstitial after each race unless Remove Ads.
- 6 New ~60 s training on first Play.
- 7 Bonus events every 2 h (desert / forest / country / sea scenery, 30-min road with finish, coins only, auto-firing specials incl. Wall Run / Tunnel Rider / Sky Rail / Phase Ghost) — replaces cups.
- 8 Daily + Missions merged (coins), coin balance.

**Still in the code but unused** (safe to delete later): old cups (`meta/Events.ts`, events screen), 20 courses (`gameplay/Courses.ts` except the Course type), `MissionTracker`, garage upgrades, XWAVE Pass / bundle code paths.

**Notes / next**
- Owner to send rear PNGs of Volt / Phantom / Inferno / Nexus (cars are still tints of Zenith).
- Bonus obstacles still use the neon city props; themed props (rocks, logs, buoys…) would make the places feel more real.
- All checks were headless (0.5 fps); test feel on a phone: `?rank=A` etc. on localhost.

---

## 2026-10-22 — v2.0.2: v2 step 2 (difficulty phases & rank gates)

**Done**: GAME-DESIGN §8 step 2 — see README "v2.0.2". Code: `PHASES`/`PHASE_UNLOCK`/`GATE`/`phaseAt`/`rankDist` in `gameplay/Difficulty.ts`; `Spawner.zoneAt`/`phaseSpeed`/`phaseCfg` (Endless only — old courses still use `MAPS`); `World.reset(..., startDist)`; HUD gate strip `UI.gateHud`; `tests/phases.test.ts` in `npm test`.

**Notes**: tune difficulty in `PHASES` / `GATE`; if phase speeds change, re-run the calibration (tests/exp.test.ts shows the minutes) and adjust `EXP.rank`. Verified with headless autopilot only — owner should try `?rank=A` etc. on a phone.

**Next**: step 3 — tracks & cars (Endless + track 2 at AAA + 3 "coming soon"; cars unlock by rank).

---

## 2026-10-22 — v2.0.1: v2 step 1 (EXP & rank)

**Done**: GAME-DESIGN.md §8 step 1 — see README "v2.0.1". New: `EXP` config, `expFor`/`rankMinutes` in `meta/Rank.ts`, `Run.exp`, `save.expBest`/`expWeek`, `tests/exp.test.ts` (in `npm test`).

**Interim (removed in later steps)**: cups, track stars, 20 courses, upgrades, old items still exist; cups no longer give rank points. Track 2's S/SS/SSS ranks are not in `CLASSES` yet (step 3).

**Links**: v2 test build = NEW artifact https://claude.ai/artifact/ENuX27c3FrNtRSEYtkXETG (publish `builds/sky-roadster-v2.html`). The old artifact QFASRhp6EQAWvJdu7Djwxr stays v1.

**Next**: step 2 — difficulty phases by distance + rank gates.

---

## 2026-10-22 — v2 game design locked (no code yet)

**Done**: owner and Claude locked the v2 design in `docs/GAME-DESIGN.md`: EXP = skill rating (best run), D→AAA (+S/SS/SSS on track 2), Coin is the only currency (special items only), Endless + 1 AAA track, Bonus events every 2 h, revive max 2× by ads only. `ECONOMY.md` is now marked superseded.

**Branches**: `v1` = old game frozen at v1.19.1 (commit 51c08a9), still maintainable. `main` = v2 development.

**Next**: implement GAME-DESIGN.md §8 step by step (1: EXP & rank).

---

## 2026-10-21 — v1.19 / v1.19.1: speed feel + tyre rotation per owner's reference

**Done**: speed blur post pass + side streaks (v1.19); v1.19.1 = bag only in Profile, stale glow after death fixed, side walls in `Track.ts`, tread scroll synced to ground speed (`TYRE.treadTileM`), air free-spin, pitch. See README.

**Notes**: tyre/blur tuning lives in `TYRE` (config.ts). Verified only in headless 0.5 fps — get real-device feedback. Artifact: https://claude.ai/artifact/QFASRhp6EQAWvJdu7Djwxr (file `builds/sky-roadster-v1.18.html`).

---

## 2026-10-21 — v1.18: big UI/meta pass (owner's 13-point list + popup/daily/car mock-ups)

**Done**: see README "v1.18 changes". New modules: `src/ui/art.ts` (popup illustrations), `src/meta/Country.ts`, `docs/ECONOMY.md`. Car art in `src/assets/images/cars/` was cropped from the owner's line-up sheet.

**Pending / notes**
- Car-specific skills (Ion Burst, Phase Shift, Fire Trail…) are shown as "SOON". They are not implemented.
- In-race car sprite is still the X1 render, tinted per car. The owner will send high-res transparent rear renders of the 5 cars; swap them into `X1_VIEWS` / per-skin textures.
- Daily Day 4 / Day 7 in the mock-up show cars. The rewards stay items/coins (cars are class-gated); revisit if cars become daily prizes.
- Mega Gate aiming was typechecked + unit-tested, but not played through in a browser (the 0.5 fps headless run was stopped).
- The old artifact link stopped accepting updates (validator false positive), so v1.18 was published as a NEW artifact: https://claude.ai/artifact/QFASRhp6EQAWvJdu7Djwxr. Update that one from now on.
- Emoji flags render as letters on Windows Chrome (OS limitation).

---

## 2026-10-21 — v1.17: ROADSTER button, leftover points, wheel speed

**Done**
- Training: early ROADSTER tap → nudge + toast instead of silent ignore (`Game.useRocket`, `UI.rocketWait`).
- ROADSTER button glows + "TAP!" when the danger hint says a jump is needed (`UI.danger` → `.ready`), same look as the training `.call` state.
- Bug fix: ROADSTER/SOS count badges never updated (`data-h` was missing on the badges).
- Track finish: unused Roadster/HYPER/SOS charges converted to points (`Game.cashLeftovers`, `LEFTOVER_POINTS`), and shown on the result screen.
- Tyres: per-frame capped tread step (no wagon-wheel strobing), longer blur and streaks, tyre spray particles (`TYRE` config, `Game.tyreSpray`, `Vehicle.rearTyreWorld`).
- `builds/sky-roadster-v1.17.html` (single file) replaces v1.16 and is published to the Claude artifact link.

**Notes for the next session**
- The cloud workspace has no npm registry access. Builds there use bun with three.js r169 fetched from GitHub, so they are not byte-identical to `vite build`. The owner's PC runs the real `npm run dev`.
- Wheel feel was checked only in a 0.5 fps headless browser. Get the owner's feedback on real devices and tune with `TYRE.*`.

**Next**
- (owner to fill in)

---

## 2026-10-21 — Moved to GitHub (v1.16)

**Done**
- Imported the project from a Claude chat (zip of the source + single-file HTML build).
- Verified the HTML build matches this source (both `v1.16`); kept it as `builds/sky-roadster-v1.16.html`.
- Added `AGENTS.md`, `CLAUDE.md`, this file. GitHub is used only for version control (no CI / Pages).
- Added `SkyRoadster-Dev.bat` + `scripts/dev-autopull.ps1`: owner double-clicks once on Windows; it runs `npm run dev` and pulls `main` every 20 s so localhost follows every push.
- Online test link = Claude artifact (republished from `builds/` single-file HTML on each release).

**Known gaps**
- `README.md` changelog stops at v1.14; code is at v1.16 (CSS notes mention v1.15.x changes: "+" next to coins opens Watch-Ad reward, big pickup title, collect flyers). Write the v1.15 / v1.16 changelog sections when known.
- No `package-lock.json` (the auto-pull script installs with `--no-package-lock` so a local lockfile never blocks `git pull`). If a lockfile is committed later, drop that flag.
- `package.json` name is still `xwave-flying-run` (old name). Harmless; rename if wanted.
- `server/` is a reference implementation only (JSON file storage, no auth).

**Next**
- (owner to fill in: next features / bugs)
