# Patch 02 — test results (real H5 build)

| | Check | Data |
|---|---|---|
| ✅ | Pause (real tap): PAUSED state | `{"state": "paused", "turbo": 2.6500000000000012, "shieldT": 4.649999999999983, "dist": 35.9925255511855, "y": 3.067398621364449, "stateT": 0, "time": 10.7092…` |
| ✅ | 10 s real time paused: still paused, world / Turbo / Shield / jump frozen | `{"state": "paused", "turbo": 2.6500000000000012, "shieldT": 4.649999999999983, "dist": 35.9925255511855, "y": 3.067398621364449, "time": 10.709266666667334}` |
| ✅ | 60 s real time paused: still paused | `{"state": "paused", "dist": 35.9925255511855}` |
| ✅ | 5 min of frames paused: still paused, no Game Over | `{"state": "paused", "dist": 35.9925255511855, "turbo": 2.6500000000000012, "shieldT": 4.649999999999983, "gameover": false}` |
| ✅ | background → foreground while paused: still paused | `"paused"` |
| ✅ | Resume: continues from the saved state (one frame of movement, Turbo timer resumes where it stopped) | `{"state": "run", "step": 0.576, "turbo": 2.633, "y": 3.071}` |
| ✅ | paused right before an obstacle: no collision, no damage | `{"state": "paused", "lives": 3, "after": 3}` |
| ✅ | Pause → Retry → pre-race pick (over the still-paused race) → GO: a new run starts only on the explicit taps | `{"state": "paused", "pick": true, "pauseMenu": true, "afterGo": "countdown"}` |
| ✅ | slot already filled → no re-roll (Resume / Retry) | `{"picked": null, "special": "hyper", "items": {"super": 0, "hyper": 2, "shield": 0, "escape": 0, "turbo": 0, "magnet": 0, "double": 0, "life": 0}}` |
| ✅ | 31_pause_flat_buttons: no glow / shadow / text-shadow / pulsing on non-Home buttons | `[]` |


## Magic Bag

| | Check | Data |
|---|---|---|
| ✅ | Pause → Retry → pre-race pick (over the still-paused race) → GO: a new run starts only on the explicit taps | `{"state": "paused", "pick": true, "pauseMenu": true, "afterGo": "countdown"}` |
| ✅ | empty Magic Bag → nothing equipped, no error | `{"picked": null, "special": null}` |
| ✅ | one eligible item → that item equipped, quantity unchanged (consumed only when used) | `{"picked": "hyper", "items": {"super": 0, "hyper": 2, "shield": 0, "escape": 0, "turbo": 0, "magnet": 0, "double": 0, "life": 0}}` |
| ✅ | slot already filled → no re-roll (Resume / Retry) | `{"picked": null, "special": "hyper", "items": {"super": 0, "hyper": 2, "shield": 0, "escape": 0, "turbo": 0, "magnet": 0, "double": 0, "life": 0}}` |
| ✅ | several eligible → one random pick, zero-quantity excluded ({"super":296,"hyper":0,"escape":304} of 600) | `{"super": 296, "hyper": 0, "escape": 304}` |
| ✅ | pre-race: "MAGIC BAG: … EQUIPPED" with the real item name | `{"special": "escape", "toast": "MAGIC BAG: HYPER JUMP EQUIPPED"}` |
