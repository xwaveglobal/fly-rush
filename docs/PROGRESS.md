# Progress log

Newest entry on top. Every AI session adds a short entry: what was done, what is unfinished, what's next.

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
