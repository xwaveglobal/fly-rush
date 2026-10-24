# Road items — balance before / after (Step 06.5)

Config: `ITEM_BALANCE` in `src/config.ts` (one place; the spawner reads it). Monetisation, special-item
prices and the economy are unchanged. Simulation: `scripts/qa/item-balance.ts` — the real `Spawner`,
24 seeds × 30 km of Endless per speed level, same seeds before / after. Raw numbers: `item_balance.json`.

| Items per 10 km | EASY before → after | NORMAL before → after | HARD before → after |
|---|---|---|---|
| Shield | 9.38 → **10.81** | 10.14 → 9.49 | 8.76 → **7.07** |
| Turbo | 2.11 → 1.61 | 1.97 → 2.07 | 2.38 → 2.29 |
| Life (hearts) | 1.67 → **2.00** | 1.67 → 1.67 | 3.00 → **2.33** |
| Air Dash | — → 0.72 | — → 0.88 | — → 0.94 |
| Magnet | 9.71 → 8.47 | 9.26 → 9.31 | 9.58 → 9.68 |
| Double | 6.50 → 6.24 | 5.92 → 5.74 | 5.79 → 6.46 |
| Mystery box | 4.97 → 4.44 | 4.42 → 4.35 | 4.86 → 4.58 |

* Weights per power-up slot: magnet 3, shield 3, turbo 0.7, mystery 0.5, double 2, **air dash 0.45**
  (< Turbo). Level factors: EASY shield × 1.3, air dash × 1.1, hearts every 0.8 × 1,000 EXP; HARD shield
  × 0.75, mystery × 0.8, hearts every 1.25 × 1,000 EXP; NORMAL unchanged.
* Survival impact (survival items = Shield + Life per 10 km): EASY 11.05 → 12.81 (+16 %), NORMAL 11.81 →
  11.16 (−5 %, Air Dash added), HARD 11.76 → 9.40 (−20 %). Life stays rare (≈ 1 per 5 km).
* Hearts are spaced in EXP, and EXP / metre differs per level (EASY 0.184, HARD 0.318), so HARD always
  shows more hearts per km than EASY; the factor moves each level in the intended direction.
* Air Dash spawns only where its landing is safe; in these runs 183 / 183 were on an outer lane.
* Obstacle patterns, fairness and speed are untouched (`npm test` fairness: 0 crashes on 990 km of bot runs).
