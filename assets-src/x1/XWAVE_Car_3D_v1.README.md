# XWAVE Car 3D v1 — procedural blockout

This is a **real 3D mesh GLB**, not a photorealistic reconstruction. Geometry is an editable first-pass blockout inspired by the authoritative rear reference. Details are approximate and need an artist/Blender refinement pass.

## Coordinates
- Units: meters; +Y up; front points toward -Z; rear toward +Z.
- Length ~4.8m, body width ~2.1m, wheels ~0.8m diameter.
- Meshes: separately named body, roof, glass, lights, wheels, rims, diffuser fins, mirrors, Nitro sockets.
- Wheels are separate meshes; animate them as rotating subassemblies in Three.js.
- LED material is emissive; visible bloom needs separate post-processing.
- Badge is a placeholder illuminated block, **not a faithful XWAVE wordmark**. Replace with official vector/texture.

## Important
- Texture PNGs are **material references**, NOT production UV atlases. Model currently uses glTF PBR material factors. Proper UV unwrapping, texturing, accurate wheel geometry, and vehicle design reconstruction remain to be done.
- Original rear photograph is the authoritative source; generated other views are secondary and may conflict.
- GLB not yet validated in the user's TikTok runtime.

## Claude instructions
Import GLB with GLTFLoader. Preserve game physics and lane mechanics. Attach wheel rotations and Nitro to named nodes. First render a rear camera screenshot for review. Do not substitute placeholder quality for a final production model.
