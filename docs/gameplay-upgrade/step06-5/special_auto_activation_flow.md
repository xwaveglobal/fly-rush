# Roadster / HYPER / SOS — last-chance auto-activation (Step 06.5)

Nothing about the pre-race choice, the Magic Bag or the lower-right button changed: the same special,
the same charge, the same effect, the same HUD button. The button now enters through one shared entry
point `Game.activateSpecial(source, which)` with `source = 'MANUAL'`; the automatic path uses
`'AUTO_LAST_CHANCE'` and calls the very same `useRocket()` / `useEscape()`.

```
obstacle hit (World) ─► Run.handle('hit')
      │ Shield up?  ── yes ─► shield soaks it (unchanged)
      │ lives > 1?  ── yes ─► life lost, respawn (unchanged)            ← Life revive available
      ▼ (this hit would end the run)
  Run.lastChance() ─► Game.lastChance()
      │ tutorial / already used this run / run not in 'run'  ─► no
      │ continue offer still available (continuesUsed < 3)   ─► no ─► existing flow:
      │                                                         dying → rewarded-ad / coin continue
      │ no unused pre-race special (Game.carried)            ─► no ─► normal crash → Game Over
      │ Roadster / HYPER: wheels not on the road (button
      │   can't fire in the air either)                      ─► no ─► normal crash (no false message)
      ▼
  activateSpecial('AUTO_LAST_CHANCE') → useRocket() / useEscape()
      │ charge really consumed AND flight protection running? ─► no ─► normal crash
      ▼ yes
  hit absorbed (no life lost, no 'crash'), flight continues with its own invulnerability,
  toast "ROADSTER / HYPER / SOS AUTO ACTIVATED!" (top, short, non-blocking, no confirmation)
```

* Ordering: the decision is taken inside `Run.handle`, **before** `lives--`, the crash feedback, the
  `dying` state, the continue offer or Game Over — no parallel death system, no double damage.
* Exactly one charge (`spendCarried`), one rescue per run (`autoRescueUsed`), never after a manual use
  (`carried` is cleared when the special is used), no ad request, no reward.
* Verified in the real build (section D of `scripts/qa/step065.mjs`): `20_special_manual_activation.png`,
  `21_special_auto_roadster.png`, `22_special_auto_hyper.png`, `23_special_auto_sos.png`,
  `24_special_auto_notification.png`.
