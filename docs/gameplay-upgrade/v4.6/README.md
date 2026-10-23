# v4.6.0 — owner requests (2026-10-23)

| Request | Change | Evidence |
|---|---|---|
| "xe 3d cao lên 15% để cảm giác lúc bấm down rõ ràng hơn" | `RENDER.carHeightScale = 1.15`: the model is scaled 1.15 in height at runtime; the wheels undo it (round, hub at the same height), so only the body grows. The DOWN dive scales from this taller pose. Hitboxes / timings / GLB unchanged; at NORMAL the roof (≈ 1.03 m) stays below the hitbox top (1.36 m). | `car_height_before_after.png` (top = before, bottom = after: chase, DOWN, rear 3/4) |
| Home camera: no guard rail across the view | `CAMERA.home` yaw 0.5 ± 0.26 → 0.24 ± 0.14 rad, height 2.45: the camera stays within ±3.1 m (rails at ±4.3 m) | `home_camera_before.png` / `home_camera_after.png` (4 phases of the orbit, real build 390 × 844) |
| All car pictures in the panels = the 3D car | `scripts/car/thumbs-x1.mjs` renders the in-game X1 (Vehicle.setSkin + MeshCar) per colourway, `thumbs-pack.py` crops → `src/assets/images/cars/<id>.webp` (cards, celebration, tips) and `rear-<id>.webp` (share card, result) | `garage_cards_3d.png` |
| Ad revive: no Life item, only "revived" | `doContinue`: lives 0 (no heart added, next hit ends the run as before), no heart notice, toast "REVIVED!" | code |
