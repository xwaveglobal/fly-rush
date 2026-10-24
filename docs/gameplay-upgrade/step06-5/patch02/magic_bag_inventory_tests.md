# Magic Bag — inventory tests (Patch 02)

Run in the real H5 build (`scripts/qa/step065.mjs`, section G) against `Game.magicBagAutoEquip()` and the
real pre-race pick screen. Results with numbers: `patch02_test_results.md`.

| # | Case | Expected | Covered by |
|---|---|---|---|
| 1 | Empty bag | nothing equipped, no message, no error | `empty` check + `05_magic_bag_empty.png` |
| 2 | One eligible item (HYPER ×2) | HYPER equipped, quantity still 2 | `one` check |
| 3 | Several eligible (Roadster ×1, SOS ×3, HYPER ×0) | one random pick each time, ≈ uniform over the eligible ones (600 draws) | `many` check |
| 4 | Zero-quantity items | never picked (HYPER = 0 draws) | `many` check |
| 5 | Incompatible items | only the three specials are bag items; road power-ups (`items.shield / turbo …`, legacy v1 fields) are never candidates | code (`SPECIALS` filter) |
| 6 | Existing rules | one slot, "1 special per race", pick screen can still change it / race without | pick screen |
| 7 | Quantities correct | nothing consumed by selection; consumed only on use (`spendCarried`) | `one` / `noReroll` checks |
| 8 | No duplicate consumption | selection never decrements; use decrements once | special section D (exactly one charge) |
| 9 | Pause → Resume | never re-rolls (no auto-equip on resume; slot filled) | `noReroll` check + pause section |
| 10 | Restart / new run | Retry opens the pick screen → fills only an empty slot | `noReroll` check |
| 11 | Roadster / HYPER / SOS selection | a player's pick is never replaced | `noReroll` check |
| 12 | Special auto-activation | still works with an auto-equipped special (it is an ordinary pre-race special) | section D |
| 13 | Save / load | `save.special` / `save.items` persisted through the existing `Save` (`persist()`), no new fields | code |
