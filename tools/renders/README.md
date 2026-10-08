# 3D renders

The product and engineering images in `assets/img/renders/` are rendered from the three.js scenes in this folder.

```bash
cd tools/renders
npm install three@0.169 playwright
python3 -m http.server 8790 &      # serve this folder
mkdir -p out && node render.mjs hero   # writes out/hero.png (scene name = file in scenes/)
```

Then convert to WebP into `assets/img/renders/`. Edit a scene file to change models, colours, camera or lighting.

## Rotating views (turntables)

`unit.js` models the real tank monitor (enclosure, tilted solar panel, antenna, cable and pressure probe).
The scenes `tanksteel`, `tankpoly`, `kit` and `exploded` render frame sequences:

```bash
node render-seq.mjs tanksteel "frames=24&n=14" ../../assets/img/turntables/tanksteel
```

`frames` is the number of frames and `n` the samples per frame (higher is smoother but slower).
