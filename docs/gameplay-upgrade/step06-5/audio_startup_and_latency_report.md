# Audio — startup and collision latency (Step 06.5)

## Bug A — sound only after opening Settings

**Root cause (code audit; the bug itself was not reproducible in desktop Chromium):** the AudioContext was
created on the first `pointerdown` / `touchstart` / `keydown` only (`{ once: true }`), and later calls only
resumed a `'suspended'` context. WebKit (iOS Safari, in-app WebViews) does not accept `touchstart` /
`pointerdown` as a user activation for audio, so the context could stay locked. The one-shot listeners
were then gone, and nothing retried. The Settings Sound / Music switches call `unlock()` again from a
`click`, which is why opening Settings "fixed" it. The iOS `'interrupted'` state was never resumed either.

**Fix** (`src/audio/Audio.ts`, `src/Game.ts`):
- One `Audio` manager, created at startup. The context is created once, on the first real gesture.
- Persistent capture-phase listeners on `pointerdown`, `pointerup`, `touchend`, `click` and `keydown`.
  Every real tap calls `unlock()` until the context is `'running'`, then the listeners do nothing.
  `touchend`, `click` and `pointerup` are the events WebKit accepts.
- `unlock()` resumes from any non-running state, including `'interrupted'`. It also starts a 1-sample
  silent buffer inside the gesture, which is WebKit's own output unlock. There are no synthetic clicks
  and no autoplay workaround: nothing happens before the player's first real tap.
- Music starts when the context actually reaches `'running'` (`statechange` event), and only if Music
  is on in the save.
- The app going to the background suspends the context, and coming back resumes it. If the browser
  refuses to resume, the next tap resumes it.
- Settings only configures. The switches change the bus gains and never create a second context.
- The procedural buffers (noise) are built once at context creation, so nothing is decoded on a hit.

**Regression in the real build** (`scripts/qa/step065.mjs` section A, plus `audio-startup.mjs`).
Setup: Chromium with `--autoplay-policy=user-gesture-required`, a fresh session, and Settings never opened.

| Step | Result |
|---|---|
| After load, before any tap | no AudioContext (policy respected) ✅ |
| Real taps Play → Endless → GO | context `running`, music playing ✅ |
| Collect a Shield | pickup SFX requested while running ✅ |
| Crash | impact SFX at the collision ✅ (below) |
| Restart | same context, still running, SFX play ✅ |
| Sound off / on, Music off / on | buses muted / restored, no re-init ✅ |
| Background → foreground | `suspended` → `running` ✅ |

## Bug B — collision sound late

**Root cause:** `onCrash()` built the crash visuals first (shards, flash, particles, camera, vibration)
and requested the impact sound after them in the same frame. The explosion layer waited on
`setTimeout(60)`, which a heavy crash frame could push back further. Web Audio applies a frame's
node changes when the frame's JS task ends, so a long crash frame delays the sound by that frame.

**Fix:** the impact sound is requested first, inside the authoritative collision handling (`Run.handle`
→ `onCrash`), before any crash visuals. The explosion layer is scheduled on the **audio clock**
(`play('explode', { delay: 0.06 })`, sample-accurate, no timer). Neither sound waits for the
animation or for the Game Over UI. Each crash is handled once, so there is no duplicate SFX. No timer
can play an old run's crash sound after a restart. Mute and volume buses apply as before.

**Measured (instrumented: `Game.lastCrashEventT` → `Audio.lastPlayed.crash`, `performance.now()`):**
- Collision event → impact SFX request: **0.2–0.4 ms** on the main thread (three runs: 2.8, 0.4 and
  0.2 ms; the first included JIT warm-up). It happens in the same frame, before the crash visuals.
- AudioContext `baseLatency` on desktop Chromium: 0.01 s. The audible output latency (`baseLatency` +
  `outputLatency` + the device) **was not measured**. It depends on the phone and needs a device test,
  so no zero-latency claim is made.
