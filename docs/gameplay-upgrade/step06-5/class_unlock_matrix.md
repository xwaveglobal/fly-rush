# Class / Garage unlock matrix (Step 06.5)

Class ladder and EXP thresholds unchanged (`src/meta/Rank.ts`, `EXP.rank`). Cars (`SKINS` in
`src/render/Vehicle.ts`, garage order = unlock order):

| Class | New car | Car | Garage before it is earned |
|---|---|---|---|
| D | starter | XWAVE Zenith | owned |
| C | — none | | |
| B | — none | | |
| A | — none (celebration only) | | |
| **AA** | **exactly one** | **XWAVE Inferno** (already configured for AA — not a substitute) | shown locked in colour ("next" car) |
| AAA | — none | | |
| S | future car | XWAVE Vega | black silhouette, `???`, no colours / materials |
| SS | future car | XWAVE Volt | black silhouette |
| SSS | future car | XWAVE Phantom | black silhouette |
| — | future car, **no unlock condition configured** | XWAVE Nexus | black silhouette, "Coming soon" — never auto-unlocks |

* Unlocks only ever **add** (`syncCarUnlocks`): cars a player already owns (e.g. Vega / Volt / Phantom /
  Nexus earned under the old one-car-per-class rule) stay owned; each car is added once (no duplicate
  reward). The old v2 refund migration now uses the v2 table it was written for, so it can't take a car back.
* Locked cars can't become the race car (existing `applySkin` / `buySkin` guards, dark preview).
* **Open decision for the owner:** the code base has exactly one car configured per class. AA → Inferno
  follows that configuration. The prompt removes the C / B / A / AAA cars without saying where they go;
  I mapped them by rarity to S / SS / SSS and left Nexus as a future car without a condition. Change
  `need` / `future` in `SKINS` to re-map — nothing else needs to change.

Verified in the real build (`scripts/qa/step065.mjs`, section H) and shown in
`01_garage_class_c.png` … `05_garage_class_s_locked.png`.
