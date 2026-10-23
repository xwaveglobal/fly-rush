# XWAVE Sky Roadster — Step 03.2 VFX Concept Reference Kit

19 individually cropped PNG concept panels, plus the original full storyboard and manifest.json.

## CRITICAL SOURCE HIERARCHY
1. Original user-provided XWAVE rear master image: authoritative for the real vehicle silhouette, taillights, branding, diffuser.
2. Actual project GLB and source code: authoritative for implementable geometry and gameplay.
3. Actual screenshots and videos of the running game: authoritative for existing defects.
4. THESE AI-generated concept panels: moodboards ONLY for VFX, animation and camera composition. They are NOT genuine screenshots, production textures, 3D assets or a replacement car design.

## Folder guide
- 01_vehicle: rear/front/side/top concept framing and spoiler closed/open examples. Do not reconstruct the car from these concepts.
- 02_nitro: clean twin thrust effect and active spoiler.
- 03_camera: portrait chase-camera composition.
- 04_spoiler: deploy during takeoff, stay open while airborne, retract after landing unless Nitro is active.
- 05_shield: thin cyan luminous contour/shell closely surrounding the car; no smoke, no oversized opaque bubble.
- 06_ghost: translucent vehicle with subtle cyan edge, without duplicate ghost vehicles.
- 07_collision: controlled impact flash, pooled lightweight debris, keep vehicle visible and restore on restart.
- 08_debug: length comparison and visual bounds versus gameplay hitbox; diagnostics only, not a request to change collision mechanics.

## Technical constraints
- Three.js + TypeScript, H5 and TikTok Native adapter compatibility; do not introduce untested browser-only APIs.
- Preserve gameplay/hitboxes/UI and the existing GLB generator.
- Render and test from the actual engine. Do not use these AI images as proof of completed work.
- Mobile-friendly: no per-frame mesh/material allocation, cap transparent overdraw, dispose or pool VFX.

## Image caveat
Crops are taken from one AI-generated composite and therefore have limited native resolution and may contain AI-imperfect labels/details. Do not upscale and claim extra geometric detail.
