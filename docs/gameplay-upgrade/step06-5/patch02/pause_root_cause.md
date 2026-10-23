# Pause → automatic Game Over — root cause (Patch 02)

`Game.tick()` (the per-frame state machine) handled two states in one branch:

```ts
case 'paused':
case 'continue': {
  …
  const left = ADS.continueSeconds - this.stateT;   // the revive-offer countdown
  this.ui.continueTick(…);
  if (left <= 0) this.gameOver();                   // ← also fired while PAUSED
}
```

`stateT` keeps counting while paused (`tick` adds `dt` before the switch), so `ADS.continueSeconds` after
pressing Pause the run was ended and the result screen opened — exactly the reported bug. Nothing else
stopped either: `this.time`, slow-motion timers and the tutorial time-scale kept advancing in `tick`.

Fix (one authoritative paused state, `src/Game.ts`):
* `tick()` returns at its top while `state === 'paused'` (after the ad check) — no game time, no state
  timer, no physics / collisions / spawns / pickups, no power-up or difficulty timers, no visuals update.
  The `'continue'` branch is only for the revive offer.
* The render loop keeps drawing the frozen frame, the DOM menu stays responsive.
* `resume()` resets the frame clock (`clock.getDelta()`); `frame()` also caps a step at 1/20 s, so a long
  pause is never applied as one big step.
* No timer can end the run while paused: the only DOM timers in a run are toasts / particles.
* Background tab: `visibilitychange` → `pause()` (as before) and the audio context is suspended; coming
  back keeps the game paused until Resume.
