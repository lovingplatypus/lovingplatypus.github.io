# Squishy plug-ins

Each file here default-exports one squishy. `squishy-models.js` appends it to
`SQUISHY_TYPES`; the scene, physics, and UI read everything else from it, so a
new toy needs no edits to shared files.

| Field | Used by | Notes |
|---|---|---|
| `id`, `name`, `description` | everywhere | `id` is unique, lowercase. |
| `color`, `coreColor` | scene | Wax shell colour and the soft filling seen through cracks. Texture maps are multiplied by `color`. |
| `size`, `shape`, `roundness` | scene, physics, camera | Half extents. `shape` is `'ellipsoid'` or `'roundedBox'` (`roundness` = corner radius). The wax shell and core follow this shape; everything else is an accessory. |
| `stamp` | scene | `true` maps `textures().top` onto the top (+y) face with UVs `u=(x/sx+1)/2`, `v=(1-z/sz)/2`. |
| `wax`, `core` | scene | `MeshPhysicalMaterial` overrides (hex strings for colours). |
| `profile` | physics | Squish profile, same fields as `SQUISH_PROFILES` in `wax-physics.js` (`mode: 'radial'` or `'pinch'`). |
| `sound` | audio | Optional `{pitch, crunch, snap, squish, tone}` overrides for the toy's voice (see `TOY_SOUNDS` in `sound.js`). |
| `wobble` | scene | `{omega, zeta, gain}` release jiggle spring. |
| `ui` | shelf, stage | `detail` (shelf caption), `colors` (CSS vars `--toy/--toy-soft/--toy-edge/--toy-ink`), `icon` (24x24 crisp pixel-art SVG paths), `glow`/`glowTint` (stage light). |
| `accessories(root, size)` | scene | Add meshes to `root` in shell space. Same rules as `createAccessories`: all materials owned by the group, `userData.role = 'eye'` + `pivot` blinks. Geometry is re-deformed on the CPU each frame, so stay under ~25k vertices. |
| `displace(point, normal)` | scene | Optional. Returns an offset along `normal` for the shell and core surface. Shell plates are coarse triangle fans (~0.085 boundary spacing, one centre vertex), so only broad shape changes read; use textures for fine detail. |
| `textures()` | scene | Optional. Returns `{map, bumpMap, bumpScale, top?, core?}`; `top` and `core` are `{map, bumpMap, bumpScale}`. Every face of the shell gets per-face 0..1 UVs; `core` is used on the sphere/box UVs when the wax is off; with `core.topOnly` a rounded-box core shows it on the top face only and uses the main `map`/`bumpMap` on the other faces. The scene disposes all returned textures on switch. |
