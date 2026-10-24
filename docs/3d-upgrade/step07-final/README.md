# Step 07 FINAL — closed (v4.6.1, owner decision 2026-10-24)

The owner closed Step 07 instead of finishing the paused work: the approved car and the v4.6 camera are final.

## Locked
| What | State | Guard |
|---|---|---|
| X1 car model | the approved v4.2.0 GLB (`src/assets/models/xwave-x1.glb`, 33,383 tris, 40 meshes, bbox 2.09 × 1.177 × 4.218 m) | immutable copy `assets-src/x1/approved/xwave-x1-approved-v4.2.0.glb` + `…fingerprint.json`; `tests/car.test.ts` fails if the game GLB's sha256 (`316678ba…`) changes |
| Car height | +15 % at runtime (`RENDER.carHeightScale` 1.15, wheels kept round) — visual only, the GLB is not edited | `tests/car.test.ts`, `tests/camera.test.ts` |
| Car size | `RENDER.carScale` 0.76 (Camera motion ON), `RENDER.carScaleFixed` 0.82 (fixed view, default) | `tests/camera.test.ts` (car fully framed in every lane) |
| Materials | the approved GLB's own factors + the existing paint flake, LED / headlight glow, dark glass | — |
| Camera | Settings → Camera motion, default OFF = fixed, screen-adaptive view (`CAMERA.fixed`); ON = the BALANCED chase camera | `tests/camera.test.ts` |
| Colourways | runtime paint per car (`SKINS` in `src/render/Vehicle.ts`); Zenith ice blue since v4.6.1 | UI pictures rendered from the same model (`scripts/car/thumbs-x1.mjs`) |

## Removed (experimental Step 07 FINAL work, never default)
- Camera candidates `premium` / `arcade` (`?cam=premium|arcade`). The fixed view replaced the camera question. `?cam=low|balanced|high` stays for the Camera motion ON mode.
- Automotive PBR pass (`?pbr=1`, `RENDER.pbr`, `RENDER.x1Pbr`). Players never saw it.

The WIP is kept in history: commit `a9e1476`. The rolled-back Step 06 / 07 models are in `assets-src/x1/rollback/`.

## Not measured
Real-phone FPS and the TikTok Native build were not tested in this step (cloud SwiftShader only).
