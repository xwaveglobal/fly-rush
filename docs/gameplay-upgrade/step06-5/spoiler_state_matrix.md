# Active rear spoiler — state matrix (Step 06.5)

Rule (authoritative): the spoiler follows the **gameplay flight state** only —
`airborne = Player.vmode === 'up' || Player.y > HEIGHT.NORMAL + 0.05` (`carMotion.isAirborne`).
Turbo / nitro, Shield and Phase Ghost are **not inputs** any more. Opening: quick ease-out
(`RENDER.spoilerUp`). Closing: starts at ground contact (`RENDER.spoilerHold` = 0), a steady stroke of
1 / `RENDER.spoilerDown` s (hinge angle = ease(k), so it starts and stops softly) that ends **exactly
flush** (k = 0, no residual gap). Geometry / pivot of the spoiler unchanged.

| State | Spoiler | Test (`tests/carMotion.test.ts`) | Real game (`scripts/qa/step065.mjs`) |
|---|---|---|---|
| Normal driving | fully closed | ✓ k = 0 | ✓ `15_spoiler_ground_closed.png` |
| Turbo on road | fully closed | ✓ k = 0 | ✓ `18_spoiler_turbo_ground_closed.png` |
| Shield on road | fully closed | (not an input) | ✓ k = 0 |
| Phase Ghost on road | fully closed | (not an input) | — |
| Jump take-off | opening | ✓ k 0.56 after 0.12 s | — |
| Jump airborne | open | ✓ | ✓ `16_spoiler_jump_open.png` |
| Descending while airborne | open | ✓ (y 2.0 m, k ≈ 1) | — |
| Air Dash take-off | opening | ✓ | ✓ (`07_…takeoff`) |
| Air Dash barrel roll | open | ✓ hinge ≥ 90 % of full angle | ✓ `17_spoiler_air_dash_open.png` |
| Air Dash descent | open | ✓ | — |
| Landing | closes completely after ground contact | ✓ k = 0, only closes after contact | ✓ `19_spoiler_landing_closed.png` |
| Turbo + jump | open (airborne) | ✓ | — |
| Turbo + grounded / landing with Turbo active | fully closed | ✓ k = 0 | ✓ |

No flicker: one open → close cycle per hop (direction changes ≤ 1), never re-opens on the road.
