# AIR DASH — lane transition (Step 06.5)

Road collectible, fires the moment it is picked up (no charge, no button, not part of Roadster / HYPER / SOS).
Only on the two OUTER lanes; destination = the opposite outer lane (exactly two lanes, 5.2 m).

```
 lanes:   LEFT (0) x = −2.6        CENTRE (1) x = 0        RIGHT (2) x = +2.6
                                                                                     time (s)
 pickup   [◆]─────────┐                                                               0.00
 lift-off  car ▲ spoiler opens                                                         0.00–0.26  (exec → HIGH 3.05 m)
 slide          ╲  roll 0° → 90° → 180° → 270° → 360°  (around the length axis)        0.06–0.68  (lateral, eased)
                  ╲─────────────────────────────╲
 hover                                           ▲ upright, hold                       0.26–0.76  (+ ≤ 0.45 if the landing spot is briefly blocked)
 landing                                         ▼ spoiler closes flush                0.76–1.06  (recover)
 control                                         ● normal driving, swipes act again    1.06
 RIGHT → LEFT is the mirror image.  CENTRE: never spawns, never starts.
```

Code: `Player.airDash()` (fixed trajectory; swipes during it are absorbed, never replayed),
`Vehicle` (roll angle = 360° × smoothstep(progress), ends exactly upright), `AIR_DASH` in `config.ts`.

Safety
* **Spawner** (`Spawner.dashPlaceable` / `dashRowOk`): outer lane, road height, ≥ 8 m from the row it
  precedes; predicted touch-down `L = dist + v · 1.06 s`; every row in `[L − 4 m, L + v · (0.45 + 0.6) s]`
  must leave the destination lane drivable at NORMAL height, and the next rows must be passable starting
  from the destination lane (a second reachability track next to the normal one). Otherwise the slot is
  deferred (a coin now, a new try 40 m later).
* **Runtime** (`AirDashGuard`): collisions ignored only while the dash is in the air + 0.25 s after
  touch-down; while hovering, a bounded hover extension (≤ 0.45 s) if a moving obstacle briefly blocks
  the landing spot. No permanent invulnerability (`tests/airdash.test.ts`: 0 protected frames after the grace).
