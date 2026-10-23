# Step 06 — geometry changes (XWAVE X1 v4.2 → v4.3)

All changes are in the procedural generator `scripts/car/x1-builder.ts` (no Blender — see
`reference_matching_report.md`), rebuilt with `node scripts/car/build-x1.mjs` (game model) and
`--detail=master` (high-detail master). Node names, pivots, hierarchy and the active spoiler are those of
Step 03; the hitbox and gameplay code are untouched.

## The three review passes

Each pass was rendered from the reference cameras and scored with `scripts/car/compare/run.sh`
(silhouette IoU / edge error); numbers are for the builder output at that point.

| Pass | What changed | Rear (master) IoU | Side IoU | Front-3/4 IoU |
|---|---|---|---|---|
| start (v4.2) | — | 0.921 | 0.823 | 0.797 |
| 1 — proportions | roof crown moved back, longer raked windscreen, fuller fastback, higher front fenders, hood centre | 0.920 | 0.854 | 0.789 |
| 2 — silhouette (rear) | rear wheel opening raised, narrower lower bumper + white band (tyres visible), cabin side profile, full-width tail panel | 0.924 | 0.854 | 0.788 |
| 3 — detail + silhouette refinement | big trapezoid intake + vanes, air curtains, slimmer headlights, raked nose, lower chin, side glass to the C-pillar, side skirts, five twin-spoke wheels, five-fin diffuser with matte recess, roof stop light; then tumblehome glass, haunch shelf, wider roof, track + 2 cm; normals / winding / UV / degenerate-triangle fixes | **0.935** | **0.861** | **0.809** |

(Detail inside the silhouette shows in the renders (`09`), not in IoU. In practice the passes overlapped: each change was rendered and scored before the next.)

## Mismatch table

| # | Identified mismatch | Reference evidence | Geometry correction | Result | Remaining limitation |
|---|---|---|---|---|---|
| 1 | Cabin too narrow and chamfered from behind (5–10 cm per side between 0.94 and 1.12 m) | master: ±0.63 m at 0.99 m, ±0.57 m at 1.04 m (`01`, `02`) | convex tumblehome on the glass sections (2 extra control points), roof half-width +3.5 cm at the rear, cabin base +4 cm | widths within 1 cm of the master from 0.88 to 1.15 m; rear IoU 0.921 → 0.935, edge error 2.49 → 2.06 % | the concept 3/4 view has a narrower roof (rear-3/4 IoU 0.789 → 0.778) — master wins |
| 2 | Haunches too wide at 0.82–0.88 m, no shelf | master: width jumps 0.78 → 0.94 m between 0.82 and 0.77 m | shoulder line lowered to 0.80 m at the rear; concave control point between window line and shoulder | shelf at 0.80 m; +2.6 cm at 0.82 m remains | the shelf is softer than the master's crisp edge |
| 3 | Rear tyres hidden behind a ±0.86 m black bumper | master: tyres visible 0.14 W outside the diffuser from 0.53 m down | wheel opening behind the axle 0.44 → 0.53 m; lower bumper ±0.86 → ±0.745 m tapering to the ground; white bumper band 0.42–0.545 m between the tyres | tyres read as in the master (`01`) | the master's diffuser fins hang to the ground; ours stay inside the opening (Step 03 decision: no exposed parts — reference 12 agrees) |
| 4 | Overall rear width / height 1.78 vs 1.81 | master bbox | track +2 cm per side, body width +2 cm | 1.818 (ref 1.807) | — |
| 5 | Roof crown too far forward (0.43 of the wheelbase), short steep windscreen | concept 04: crown 0.55–0.68 | `gTop` re-keyed: longer raked windscreen, crown 0.56–0.68 | side IoU 0.823 → 0.861, edge 6.35 → 4.97 % | concept is cropped at the tail; side bottom band is a segmentation artefact (wet road) |
| 6 | Fastback too low over the rear axle (0.82 of roof height) | concept 04: 0.87 | fuller fastback (0.88) | matches; spoiler hinge / deck height unchanged | — |
| 7 | Van-like side: glass ended at the B-pillar, tall white C-pillar | concept 04 / 01: side glass to ~0.85 of the wheelbase | side glass (DLO) extended to 0.80–0.95, belt line kicks up toward the C-pillar | `09` side / 3/4 views | the C-pillar kick is simple (one curve) |
| 8 | Front fenders too low (0.64 of roof height over the axle), flat front | concept 04 / 03 / 02 | fender crowns 0.81 m above a lower hood centre | fenders read in front / 3/4 views (`06`, `07`) | concept front views are wide-angle with mirrors: front IoU limited (0.856) |
| 9 | Blunt vertical nose, thin slot intake | concepts 02 / 03 / 08 | raked face (top 8 cm behind the chin), chin 0.20 → 0.14 m, large trapezoid intake with two vanes, tall slanted air curtains | `06`, `07` | headlights stay slim slashes on the hood edge, not a separate lamp housing |
| 10 | No dark rocker — side reads tall | concepts 04 / 01 | satin-black side skirts between the arches | `05`, `09` | — |
| 11 | 20 thin spokes vs. five twin spokes | concepts 04 / 11 | five twin spokes (wider, flatter), gloss graphite | `09`, `13` | no concave dish; brake disc is a plain cylinder |
| 12 | Narrow black badge panel | master: black tail panel ±0.85 m under the LED | tail panel as wide as the light, tapering | `01` | LED housing depth is shallow |
| 13 | Diffuser floor caught the light (read as holes) | — (render artefact) | matte floor / roof in the opening, five fins | `09` rear 3/4 | — |
| 14 | Roof stop light mid-roof (a bump seen from the front) | master: at the top of the rear glass | moved to the rear end of the roof | `01` | — |
| 15 | Spoiler, splitter, skirt shaded inside-out (mirror transform reversed winding) | normals check: 100 % of their normals against the faces | `finYZ` restores the winding | normals against faces 1,792 → 204 (glass / body creases) | — |
| 16 | Seams / headlights speckled (two-sided strips shared vertices: normals summed to 0) | normals render | two-sided strips get their own back vertices | clean headlights and seams | — |
| 17 | 3,924 zero-area triangles; 6 meshes with all-zero UVs | `scripts/car/check-mesh.ts` | degenerate triangles dropped; box-projected UVs (metres) on every part | 0 / 0 (`11`, `12`) | box UVs are for tiling detail maps, not a unique bake |
| 18 | Mirrors in the master | master | **not added** — the approved X1 is mirrorless (Step 03.1, concept 04 says "no side mirrors") | excluded from the comparison mask | documented contradiction |
| 19 | Concept 05 (top) shows a white rear deck behind a shorter canopy | concept 05 | **not followed** — the master shows the rear glass down to the deck | top IoU unchanged (0.905) | documented contradiction |

## Integration checks

- Node names / hierarchy / pivots: `npm run test:car` (41 checks, incl. hub positions, spoiler pivot,
  nitro sockets, nothing below 10 cm, no mirrors, arch clearance) — pass.
- Animations and effects with the real `Vehicle` + `MeshCar`: `vfx_selftest.json` 24 / 24 (spoiler open /
  close, shield, turbo, shield + turbo, phase ghost and material restore, dive, crash shards, sweep).
- Colour variants: `applySkin` addresses `X1_Paint` by name — unchanged; the flake normal map works
  with every body colour.
