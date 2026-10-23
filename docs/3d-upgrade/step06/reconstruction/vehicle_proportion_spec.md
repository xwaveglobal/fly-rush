# XWAVE X1 — vehicle proportion specification (Step 06)

Normalised, image-space ratios. **No real-world dimensions are inferred from the perspective images.**
Metres below are the game model's own scale (height 1.177 m, set in Step 02 from the master), used
only to express the ratios.

Sources and authority:
1. **Rear master** `assets-src/x1/XWAVE_REAR_0_MASTER_DO_NOT_OVERRIDE.png` (1312 × 1199, near-orthographic
   rear view, white background) — authoritative. Measured on the silhouette mask from
   `scripts/car/compare/compare.py` (GrabCut, mirrors excluded) and on pixel colours (LED: red pixels,
   glass: dark pixels).
2. Approved Step 03 geometry and animation (pivots, spoiler, wheel nodes) — kept.
3. Step 06 concepts `assets-src/step06-pbr-references/01–05` — AI images, perspective, inconsistent with
   each other: used for side / top / front direction only, marked *estimate*.

| Ratio | Reference value | Source | Model before (v4.2) | Model after (v4.3) |
|---|---|---|---|---|
| Overall width / height (rear, incl. tyres) | **1.81** | master, 1274 / 704 px | 1.78 | **1.81** |
| Rear LED width / overall width | **0.885** | master, red pixels x 83–1211 | 0.88 | 0.88 |
| LED centre height / height | **0.51** | master, y 560–627 | 0.51 | 0.51 |
| Dark glass width just under the roof / overall width | 0.39 | master, dark pixels at y 290 | 0.39 | 0.43 * |
| Dark glass + C-pillar trims at the deck / overall width | 0.50 | master, dark pixels at y 480 | 0.65 (included the dark deck well) | 0.49 |
| Visible rear tyre width / overall width | **0.14** | master, row 900 | tyres largely behind a ±0.86 m black bumper | **0.15** (tyre 0.745–1.065 m outside a ±0.745 m bumper) |
| Rear wheel opening behind the axle ends at | ≈ 0.53 m (0.45 H) | master | 0.44 m | **0.53 m** (white bumper band 0.42–0.545 m between the tyres) |
| Cabin half-width at 0.82 / 0.88 / 0.94 / 0.99 / 1.04 / 1.08 / 1.12 m | 0.777 / 0.716 / 0.669 / 0.630 / 0.571 / 0.518 / 0.467 m | master mask, height-normalised | 0.814 / 0.684 / 0.591 / 0.534 / 0.482 / 0.435 / 0.407 | 0.803 / 0.709 / 0.662 / 0.625 / 0.575 / 0.516 / 0.460 |
| Haunch shelf height | ≈ 0.80 m (0.68 H) | master (width jumps 0.78 → 0.94 m between 0.82 and 0.77 m) | 0.83 m, sloped | 0.80 m, shelf |
| Length / width (incl. tyres) | 1.98 *estimate* | concept 05 top | 2.02 | **1.98** |
| Wheelbase / height | 2.29 *estimate* | concept 04 side (252 / 110 px) | 2.14 | 2.14 (kept: length and wheelbase are approved Step 03.1 values) |
| Wheel diameter / height | 0.62 *estimate* | concept 04 | 0.63 | 0.63 |
| Front overhang / wheelbase | 0.31 *estimate* | concept 04 | 0.30 | 0.30 |
| Roof crown position (0 = front axle, 1 = rear axle) | 0.55–0.68 *estimate* | concept 04 | 0.43 | **0.56–0.68** |
| Roof height over the rear axle / roof height | 0.87 *estimate* | concept 04 | 0.82 | **0.88** |
| Front fender height over the front axle / roof height | 0.70 *estimate* | concept 04 | 0.64 | **0.70** |
| Windscreen base position (axle units) | 0.14 *estimate* | concept 04 | 0.12 | 0.12 |
| Side glass ends at (axle units) | ≈ 0.85 *estimate* | concept 04 | 0.40–0.58 | **0.80–0.95** |
| Nose top / chin height | 0.40 H / ≈ 0.12 H *estimate* | concept 04 | 0.39 H / 0.17 H | 0.39 H / 0.12 H |
| Fender line slope, nose → front axle | ≈ 25° *estimate* | concept 04 | 21° | 25° |
| Fastback angle, 0.88 → 1.09 axle units | ≈ 15° *estimate* | concept 04 | 14° (but 6 cm lower) | 15° |
| Roof taper (plan view) | not measurable reliably (concept 05 has mirrors and glare over the canopy) | — | — | — |

\* The concept 3/4 views show a narrower roof; the master shows a full, rounded cabin. The cabin follows
the master's silhouette (priority 1); its dark glass band under the roof is 4 % wider than the master's.
Model values in the cabin rows are measured on the rendered silhouette with the same tool as the reference.

Gameplay scale is unchanged: hitbox `CAR_HALF` (config) and `RENDER.carScale 0.76` untouched; the
visual width grew 2.09 → 2.13 m (in game 1.59 → 1.62 m against a 1.40 m hitbox; the test limit is +35 %).
