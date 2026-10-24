# Class / Garage unlock matrix (Step 06.5)

Class ladder and EXP thresholds unchanged (`src/meta/Rank.ts`, `EXP.rank`). Cars (`SKINS` in
`src/render/Vehicle.ts`, garage order = unlock order):

**Updated v4.6.1 (owner decisions 2026-10-24).** Every car not owned yet is a black silhouette (`???`);
rarity follows the unlock class; C / B / A give a one-time promotion reward instead of a car (`CLASS_REWARD`
in `src/config.ts`).

| Class | Reward | Car | Rarity | Garage before it is earned |
|---|---|---|---|---|
| D | starter car | XWAVE Zenith (ice blue) | Common | owned |
| C | +300 coins, +1 Roadster Jump | — | | |
| B | +500 coins, +1 HYPER JUMP | — | | |
| A | +800 coins, +1 SOS Escape | — | | |
| **AA** | new car | **XWAVE Inferno** | Rare | black silhouette |
| **AAA** | new car | **XWAVE Nexus** | Epic | black silhouette |
| S | new car | XWAVE Vega | Legendary | black silhouette |
| SS | new car | XWAVE Volt | Mythic | black silhouette |
| SSS | new car | XWAVE Phantom | Ultimate | black silhouette |

Rewards are paid once, when the first-time celebration's Continue is tapped (`Game.classOk`). Classes C / B
already passed before v4.6.1 are marked as seen on load (`save.classLowSeen`) — no back-pay, no extra pop-up.

* Unlocks only ever **add** (`syncCarUnlocks`): cars a player already owns (e.g. Vega / Volt / Phantom /
  Nexus earned under the old one-car-per-class rule) stay owned; each car is added once (no duplicate
  reward). The old v2 refund migration now uses the v2 table it was written for, so it can't take a car back.
* Locked cars can't become the race car (existing `applySkin` / `buySkin` guards, dark preview).
* The old open decision (where the C / B / A / AAA cars go) is closed: the owner chose the table above.

Verified in the real build (`scripts/qa/step065.mjs`, section H) and shown in
`01_garage_class_c.png` … `05_garage_class_s_locked.png`.
