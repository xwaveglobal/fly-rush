# XWAVE Sky Roadster — 3D Vehicle Reference Kit v1

## Source of truth
`01_authoritative/XWAVE_REAR_0_MASTER_DO_NOT_OVERRIDE.png` is the **original user-provided rear view**, and overrides every conflicting generated view. Preserve rear silhouette, taillight, centered XWAVE wordmark, rear glass, wheels, and diffuser.

## Secondary images
`02_vehicle_views/` contains nine individual cropped views from an AI-generated concept sheet. They are **not geometrically consistent orthographic projections** and must not be used as exact photogrammetric calibration. Names indicate intended viewpoints only. Some design details, proportions, and branding differ from the master.

`03_component_details/` contains component close-ups; `04_environment/` contains mood/environment references. `05_reference_boards/` preserves complete boards for context.

## Recommended workflow for Claude + Blender
1. Match rear silhouette and details to MASTER first.
2. Block out 3D proportions using secondary side/top/three-quarter images as loose references.
3. Use separate meshes for body, glass, lights, wheels, diffuser and interior.
4. Verify with a rendered rear camera against MASTER.
5. Export optimized GLB and inspect in Three.js; do not confuse image references with 3D assets.

## Asset limitations
These are cropped PNGs with original backgrounds, **not transparent cutouts**, UV textures, sprite sheets, or an actual GLB model. Some panels have limited resolution due to their source grid.
