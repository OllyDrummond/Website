# 3D renders

The product and engineering images in `assets/img/renders/` are rendered from the three.js scenes in this folder.

```bash
cd tools/renders
npm install three@0.169 playwright   # node_modules is git-ignored
python3 -m http.server 8790 &      # serve this folder
mkdir -p out && node render.mjs hero   # writes out/hero.png (scene name = file in scenes/)
```

Then convert to WebP into `assets/img/renders/`. Edit a scene file to change models, colours, camera or lighting.


## Current scenes

| Scene | Output | What it shows |
|---|---|---|
| `tankset` (`?p=3`) | `tank-monitor.webp` | Homepage card: tank unit, coiled cable and probe, receiver and phone. Run `finish.py` on the PNG first |
| `plc3` | `plc.webp` | Compact dark-grey PLC with ladder-logic LCD (PLC programming service), dark studio. Run `finish.py` on the PNG first |
| `pcb` | `pcb.webp` | Green board (Electronics & PCB design service). `pcb2` is an unused blue alternative |
| `pcb2` | (unused) | Blue PCB close-up (Electronics & PCB design service), dark studio. Run `finish.py` on the PNG first |
| `dosing2` | `dosing.webp` | Acid dosing skid concept. Run `finish.py` on the PNG first |
| `pcbhero` | (retired) | Previous homepage hero render; the hero now uses the WebGL image (see below) |
| `nzhero` | `tank-top.webp` | Monitor on the lid of a green poly tank, NZ farmland and ranges behind |
| `nzwide` | `nz-farm.webp` | Poly tank in a paddock with fence, cabbage trees and ranges |
| `unit3` | `unit.webp` | Studio shot of the tank unit, cable and probe |
| `receiver2` | `receiver.webp` | The in-house receiver (white case, screen, two buttons) |
| `controller` | `controller.webp` | The pump controller (black die-cast box, gland, antenna) |
| `kit` | `kit.webp` | All three parts together |
| `installed2` | `installed.webp` | Cut-away poly tank with the probe on the floor |
| `exploded2` | `exploded.webp` | Exploded view of the unit |

`unit.js` (`unit2`, `probe2`) models the tank unit and probe from the product photos; `devices.js` has `receiver()` and `pumpController()`; `nz.js` holds the landscape, cabbage trees, fence and poly tank.

```bash
mkdir -p out && node render.mjs nzhero "w=2400&h=1300&n=32"   # n = samples per pixel
```

### Homepage hero (WebGL)

The homepage hero is no longer a render. It is the owner's circuit-board image (`pcb-hd.webp`, 3072 x 2048) shown as a live WebGL surface by `assets/js/pcb-gl.js`: it tilts with the cursor, bends as the page scrolls, pulls focus on load, carries a cursor light, and sends light pulses out from the main chip along the traces (a click sends a ring of signal).

- `pcb-hd.webp` / `pcb-hd-1600.webp`: the source image upscaled 4x with Real-ESRGAN (x4plus, ONNX, run on CPU in 128 px tiles), then resized down.
- `pcb-hd-data.png`: the trace map the shader reads (R = trace mask, G = distance from the chip along the traces, B = per-trace timing seed), made from the HD image:

```bash
python3 pcb_flow.py pcb-hd-3072.png ../../assets/img/renders/pcb-hd-data.png 2048   # needs numpy, scipy, scikit-image
```

If the hero image changes, re-run `pcb_flow.py` on it and adjust the chip box at the top of the script. The `pcbhero` scene and `pcb_traces.py` are the previous rendered hero, kept for reference.

`finish.py in.png out.png` adds the subtle vignette and grain used on the product shots.
