# Step 06.5 — test results

Node suites (`npm test`, 12 suites incl. the new `tests/airdash.test.ts`): **12 passed, 0 failed** — 271 checks ✓, 0 ✗. `npm run typecheck`: clean.

Real H5 build (`node scripts/qa/step065.mjs dist-esbuild …`, Chromium + SwiftShader, 360 × 640 @2, real browser autoplay policy, real taps for Play / GO / Pause / Resume / special button / Continue): **68 / 68 checks passed**.

Not available in this environment: a phone, the TikTok Native runtime, audible output latency, real-device FPS (nothing here is claimed for them).


## Audio (fresh session, Settings never opened)

| | Check | Data |
|---|---|---|
| ✅ | fresh load: no AudioContext before any gesture (autoplay policy respected) | `{"ctx": "none", "settingsOpened": false}` |
| ✅ | after real taps Play → Endless → GO (Settings never opened): audio running, music playing | `{"ctx": "running", "music": true, "settingsEverShown": false}` |
| ✅ | pickup SFX requested on collecting a Shield, context running | `{"played": true, "ctx": "running", "sfxOn": true}` |
| ✅ | impact SFX triggered 0.20 ms after the authoritative collision event (same frame, before the crash visuals); explosion layer on the audio clock (+60 ms, no timer) | `{"state": "dying", "collisionT": 91709, "crashT": 91709.19999999995, "explodeT": 91709.39999999997, "fresh": true}` |
| ✅ | restart: same AudioContext, still running, SFX play (no duplicate context) | `{"sameCtx": true, "ctx": "running", "state": "run", "coinAfterRestart": true}` |
| ✅ | Sound / Music switches mute and restore their bus (no re-initialisation) | `{"sfxOffGain": 0, "sfxOnGain": 0.8999999761581421, "musicOffGain": 0, "hidden": "suspended", "visible": "running"}` |
| ✅ | background → suspended, foreground → running again | `{"sfxOffGain": 0, "sfxOnGain": 0.8999999761581421, "musicOffGain": 0, "hidden": "suspended", "visible": "running"}` |


## Spoiler

| | Check | Data |
|---|---|---|
| ✅ | normal driving: spoiler fully closed | `0` |
| ✅ | Turbo on the road: spoiler fully closed | `0` |
| ✅ | Shield on the road: spoiler fully closed | `0` |
| ✅ | jump airborne: spoiler open | `0.9391899373747821` |
| ✅ | landing (Turbo still active): spoiler fully closed again | `0` |
| ✅ | after landing: upright, spoiler flush, normal driving | `{"roll": 0, "spoiler": 0, "state": "run"}` |
| ✅ | after landing: upright, spoiler flush, normal driving | `{"roll": 0, "spoiler": 0, "state": "run"}` |


## Air Dash

| | Check | Data |
|---|---|---|
| ✅ | Air Dash fires on pickup (lane 0) | |
| ✅ | take-off: spoiler opening (k 0.61) | |
| ✅ | roll 90° / 180° / 270° / 360° reached in order (100 / 184 / 281 / 360) | |
| ✅ | lands in the opposite outer lane 2 (x 2.6) | |
| ✅ | after landing: upright, spoiler flush, normal driving | `{"roll": 0, "spoiler": 0, "state": "run"}` |
| ✅ | Air Dash fires on pickup (lane 2) | |
| ✅ | take-off: spoiler opening (k 0.61) | |
| ✅ | roll 90° / 180° / 270° / 360° reached in order (100 / 184 / 281 / 360) | |
| ✅ | lands in the opposite outer lane 0 (x -2.6) | |
| ✅ | after landing: upright, spoiler flush, normal driving | `{"roll": 0, "spoiler": 0, "state": "run"}` |
| ✅ | Air Dash roll: spoiler open | `0.8910282567573686` |
| ✅ | centre lane: Air Dash does not start | `{"started": false, "lane": 1}` |


## Specials (manual + last-chance auto)

| | Check | Data |
|---|---|---|
| ✅ | manual special button: Roadster Jump fires (MANUAL), one charge used | `{"isSuper": true, "src": "MANUAL", "charges": 0, "items": 1}` |
| ✅ | ROADSTER: lethal hit with no revive left → auto-activated through the same pathway, exactly one charge, run continues | `{"state": "run", "src": "AUTO_LAST_CHANCE", "lives": 1, "carried": null, "items": 0, "items0": 1, "isSuper": true, "isEscape": false, "toast": "ROADSTER AUTO…` |
| ✅ | notification "ROADSTER AUTO ACTIVATED!" shown (non-blocking toast) | `"ROADSTER AUTO ACTIVATED!"` |
| ✅ | HYPER: lethal hit with no revive left → auto-activated through the same pathway, exactly one charge, run continues | `{"state": "run", "src": "AUTO_LAST_CHANCE", "lives": 1, "carried": null, "items": 0, "items0": 1, "isSuper": true, "isEscape": false, "toast": "HYPER AUTO AC…` |
| ✅ | SOS: lethal hit with no revive left → auto-activated through the same pathway, exactly one charge, run continues | `{"state": "run", "src": "AUTO_LAST_CHANCE", "lives": 1, "carried": null, "items": 0, "items0": 1, "isSuper": true, "isEscape": true, "toast": "SOS AUTO ACTIV…` |
| ✅ | revive offer still available → existing death / continue flow, special kept | `{"state": "dying", "charges": 1, "src": null}` |
| ✅ | continue (revive) offer shown as before | `"continue"` |
| ✅ | no special left → normal crash / Game Over, no rescue message | `{"afterRevive": "run", "noSpecial": {"state": "dying", "falseMsg": false}}` |
| ✅ | first-time Class B: +500 coins, +1 HYPER JUMP, once | `{"shown": true, "title": "Class B", "car": null, "reward": "Promotion reward\n    \n    \n    \n    +500+1 HYPER JUMP", "paid": {"coins": 500, "items": {"hyp…` |
| ✅ | first-time Class A: celebration, no car, +800 coins, +1 SOS | `{"shown": true, "title": "Class A", "car": null, "reward": "Promotion reward\n    \n    \n    \n    +800+1 SOS Escape", "paid": {"coins": 800, "items": {"esc…` |


## Crash

| | Check | Data |
|---|---|---|
| ✅ | run-ending crash in the air: 3 real parts break off (car was 3.36 m up) | `{"y0": 3.36, "yFalling": 3.12, "parts": 3, "state": "dying"}` |
| ✅ | car falls and settles on the road (height above road 0 m) — no floating | `{"air": 0, "parts": 3, "partsY": [0.04, 0.12, 0.33], "state": "dying"}` |


## Class / Garage

| | Check | Data |
|---|---|---|
| ✅ | SOS: lethal hit with no revive left → auto-activated through the same pathway, exactly one charge, run continues | `{"state": "run", "src": "AUTO_LAST_CHANCE", "lives": 1, "carried": null, "items": 0, "items0": 1, "isSuper": true, "isEscape": true, "toast": "SOS AUTO ACTIV…` |
| ✅ | C / B / A: no new car (only the starter) | `{"C": ["zenith"], "B": ["zenith"], "A": ["zenith"]}` |
| ✅ | AA: exactly ONE new car (XWAVE Inferno) | `["inferno"]` |
| ✅ | AAA: exactly ONE new car (XWAVE Nexus, v4.6) | `["nexus"]` |
| ✅ | S: exactly ONE new car (XWAVE Vega) | `["vega"]` |
| ✅ | every car not owned yet is a dark silhouette | `[["zenith", false], ["inferno", false], ["nexus", true], ["vega", true], ["volt", true], ["phantom", true]]` |
| ✅ | cars already owned stay owned, no duplicate unlocks | `["zenith", "vega", "volt", "phantom", "inferno"]` |
| ✅ | locked S+ car cannot become the race car | `{"vehicle": "zenith", "before": "zenith"}` |
| ✅ | first-time Class AA: celebration + the one unlocked car (XWAVE Inferno), no coin reward | `{"shown": true, "title": "Class AA", "car": "XWAVE Inferno", "reward": null, "paid": {"coins": 0, "items": {}}, "again": {"shown": false, "saved": ["C", "B",…` |
| ✅ | first-time Class AAA: celebration + the one unlocked car (XWAVE Nexus) | `{"shown": true, "title": "Class AAA", "car": "XWAVE Nexus", "reward": null, "paid": {"coins": 0, "items": {}}, "again": {"shown": false, "saved": ["C", "B", …` |
| ✅ | first-time Class S: celebration (only rewards really unlocked) | `{"shown": true, "title": "Class S", "car": "XWAVE Vega", "reward": null, "paid": {"coins": 0, "items": {}}, "again": {"shown": false, "saved": ["C", "B", "A"…` |


## Congratulations

| | Check | Data |
|---|---|---|
| ✅ | first-time Class C: celebration + reward shown (+300 coins, +1 Roadster Jump) | `{"shown": true, "title": "Class C", "car": null, "reward": "Promotion reward\n    \n    \n    \n    +300+1 Roadster Jump", "paid": {"coins": 300, "items": {"…` |
| ✅ | Class C acknowledged: not shown or paid again | `{"shown": false, "saved": ["B", "A", "AA", "AAA", "S", "SS", "SSS", "C"], "paidAgain": 0}` |
| ✅ | first-time Class B: +500 coins, +1 HYPER JUMP, once | `{"shown": true, "title": "Class B", "car": null, "reward": "Promotion reward\n    \n    \n    \n    +500+1 HYPER JUMP", "paid": {"coins": 500, "items": {"hyp…` |
| ✅ | first-time Class A: celebration, no car, +800 coins, +1 SOS | `{"shown": true, "title": "Class A", "car": null, "reward": "Promotion reward\n    \n    \n    \n    +800+1 SOS Escape", "paid": {"coins": 800, "items": {"esc…` |
| ✅ | acknowledged: not shown again | `{"shown": false, "saved": ["C", "B", "AA", "AAA", "S", "SS", "SSS", "A"], "paidAgain": 0}` |
| ✅ | first-time Class AA: celebration + the one unlocked car (XWAVE Inferno), no coin reward | `{"shown": true, "title": "Class AA", "car": "XWAVE Inferno", "reward": null, "paid": {"coins": 0, "items": {}}, "again": {"shown": false, "saved": ["C", "B",…` |
| ✅ | first-time Class AAA: celebration + the one unlocked car (XWAVE Nexus) | `{"shown": true, "title": "Class AAA", "car": "XWAVE Nexus", "reward": null, "paid": {"coins": 0, "items": {}}, "again": {"shown": false, "saved": ["C", "B", …` |
| ✅ | first-time Class S: celebration (only rewards really unlocked) | `{"shown": true, "title": "Class S", "car": "XWAVE Vega", "reward": null, "paid": {"coins": 0, "items": {}}, "again": {"shown": false, "saved": ["C", "B", "A"…` |


## Non-Home buttons

| | Check | Data |
|---|---|---|
| ✅ | 29_garage_flat_buttons: no glow / shadow / text-shadow / pulsing on non-Home buttons | `[]` |
| ✅ | 30_settings_flat_buttons: no glow / shadow / text-shadow / pulsing on non-Home buttons | `[]` |
| ✅ | 31_pause_flat_buttons: no glow / shadow / text-shadow / pulsing on non-Home buttons | `[]` |
| ✅ | 32_game_over_flat_buttons: no glow / shadow / text-shadow / pulsing on non-Home buttons | `[]` |


## General

| | Check | Data |
|---|---|---|
| ✅ | no page errors (network-blocked font / geo lookups excluded) | `[]` |


Audio trigger latency (collision event → SFX request, main thread): **0.2 ms**. AudioContext `baseLatency`: 0.01 s (desktop Chromium; device-dependent).


Node suite log excerpt: see `npm test` (CI-equivalent); Air Dash suite: `tests/airdash.test.ts`, spoiler matrix: `tests/carMotion.test.ts`.
