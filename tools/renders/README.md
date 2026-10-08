# 3D renders

The product and engineering images in `assets/img/renders/` are rendered from the three.js scenes in this folder.

```bash
cd tools/renders
npm install three@0.169 playwright
python3 -m http.server 8790 &      # serve this folder
mkdir -p out && node render.mjs hero   # writes out/hero.png (scene name = file in scenes/)
```

Then convert to WebP into `assets/img/renders/`. Edit a scene file to change models, colours, camera or lighting.


## Current scenes

| Scene | Output | What it shows |
|---|---|---|
| `nzhero` | `hero.webp` | Monitor on the lid of a green poly tank, NZ farmland and ranges behind |
| `nzwide` | `nz-farm.webp` | Poly tank in a paddock with fence, cabbage trees and ranges |
| `unit2` | `unit.webp` | Studio shot of the unit, cable and probe |
| `installed2` | `installed.webp` | Cut-away poly tank with the probe on the floor |
| `exploded2` | `exploded.webp` | Exploded view of the unit |

`unit.js` (`unit2`, `probe2`) models the prototype; `nz.js` holds the landscape, cabbage trees, fence and poly tank.

```bash
mkdir -p out && node render.mjs nzhero "w=2400&h=1300&n=32"   # n = samples per pixel
```
