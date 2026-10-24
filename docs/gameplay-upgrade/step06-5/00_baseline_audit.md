# Step 06.5 — Phase 0 baseline audit (before any Step 06.5 change)

Branch `feature/sky-roadster-3d-v4.1`, HEAD before the work: `c3023e8` (v4.4.1). The paused Step 07 FINAL
work in the tree was protected first as commit `a9e1476` (the defaults were left unchanged: BALANCED
camera, the approved GLB's own material factors; the PBR pass is opt-in with `?pbr=1`). Native / `main`
were not opened. No Native code or adapter was touched.

| # | Area | What the code did before Step 06.5 | Where |
|---|---|---|---|
| 1 | Class ladder | `D → C → B → A → AA → AAA` on Endless (EXP thresholds `EXP.rank`: 0 / 3k / 8k / 15k / 26k / 40k), `S / SS / SSS` from Track 2 (65k / 85k / 110k). | `src/meta/Rank.ts`, `src/config.ts` |
| 2 | Garage unlocks | One car per class: Zenith D, Vega C, Volt B, Phantom A, Inferno AA, Nexus AAA (`SKINS[].need`). Only the rank-C car was shown in colour before it was earned; all others black silhouettes. | `src/render/Vehicle.ts` (`SKINS`, `carVisibility`), `Game.syncCarUnlocks` |
| 3 | Ownership / save | `save.unlocked` (ids), `save.vehicle`; a one-time v2 migration (`carsRelocked`) took back v1-bought cars above the rank and refunded them. | `src/core/Save.ts`, `Game.migrateV2` |
| 4 | Road items | Endless / Track 2 power-up slot weights: magnet 3, shield 3, turbo 0.7, mystery 0.5, double 2 (same on every speed level). Hearts: one every `HEARTS.everyExp` (1,000) EXP. A `dash` pickup existed only on the retired v1 courses: it gave 2 charges of a MANUAL booster (jump from an edge lane, swipe twice). | `src/gameplay/Spawner.ts`, `Run.applyPower` |
| 5 | Pre-race special | ONE special (Roadster Jump / HYPER JUMP / SOS) picked before the race (`save.special`, from the Magic Bag `save.items`), carried as `Game.carried`; leaves the bag only when used (`spendCarried`). | `Game.openSpecialPick`, `chooseSpecial`, `startRun` |
| 6 | Lower-right button | ROADSTER / SOS fire on `pointerdown` → `useRocket()` / `useEscape()`. Roadster needs the wheels on the road (in the air the tap is queued to touch-down); SOS works from any state. Both grant flight-long invulnerability. | `UI.bind`, `Game.useRocket`, `useEscape`, `launchSuperJump` |
| 7 | Death / revive | A hit: Shield soaks it, else `lives--`; last life → `'gameover'` crash → `dying` 1.6 s → `offerContinue()` (rewarded-ad or coin continue, `ADS.maxContinues` = 3 per run) → `gameOver()`. | `Run.handle`, `Game.onCrash`, `offerContinue`, `continueByAd/Coins` |
| 8 | Crash visuals | 3D car: jolt + impact flash + 12 pooled shards; the car stays whole. While `dying` / `gameover` the car's pose is frozen (`Vehicle.update` not called) → a crash in the air left the car **floating** at its crash height. | `Vehicle.crashBreak`, `crashUpdate` |
| 9 | Jump / spoiler | Spoiler opened while `Player.vmode === 'up'` **or nitro / Turbo ran** (also on the road), held 0.25 s after both ended, closed with an exponential ease (never exactly flush in finite time). | `carMotion.spoilerUpdate`, `MeshCar.update` |
| 10 | Audio | Procedural Web Audio. The context was created on the FIRST `pointerdown` / `touchstart` / `keydown` only (`{ once: true }`) and only `'suspended'` was resumed later. WebKit (iOS Safari, in-app WebViews) does not treat `touchstart` / `pointerdown` as a user activation for audio → the context stays suspended, the one-shot listeners are gone, and nothing retried until a handler that happened to call `unlock()` again (the Settings Sound / Music switches do) — matches "audio only works after opening Settings". The iOS `'interrupted'` state was never resumed. Impact SFX: `play('crash')` after the crash visuals were built in the same frame, the explosion layer on `setTimeout(60)` (pushed back by heavy frames). | `src/audio/Audio.ts`, `Game` constructor, `Game.onCrash` |
| 11 | Pause | `tick()` treated `'paused'` exactly like `'continue'`: the continue-offer countdown (`ADS.continueSeconds`) ran while paused and called `gameOver()` → **Pause ended the run by itself**. | `Game.tick` |
| 12 | Magic Bag | = the special inventory (`save.items.super/hyper/escape`) with ONE equipment slot (`save.special`); the bag screen and the pre-race pick screen use it. No auto-equip. | `UI.bagSync`, `Game.openSpecialPick` |
| 13 | Buttons | Shared `.btn` (gradient + 3D edge `box-shadow` + gloss `::before / ::after`), many screen-specific glows (`.on` rings, HUD pulses). Home = `#start`. | `src/ui/ui.css` |
| 14 | Tests / builds | `npm test` (11 suites), `npm run typecheck`, `node scripts/build-esbuild.mjs [--single]`; WebGL self-tests `test:vfx` / `test:envshots`. | `package.json` |

Not present in the code base: an AA-specific car other than the configured Inferno; a Class "congratulations"
screen (only a toast + RANK UP on the result card).
