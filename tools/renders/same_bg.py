"""Give the three service images (gears, PCB, PLC) exactly the same background.

Each finished render is laid over one shared background plate: the empty
gears studio (scene `gears` with ?empty=1, run through finish.py). Wherever a
render differs from the plate (the object and its shadow) its own pixels are
kept; everywhere else the plate's pixels are used, so the backgrounds are
pixel-for-pixel identical. Saved as lossless WebP at 1200 x 750 so compression
can't shift them either.

    python3 same_bg.py plate.jpg gears.jpg pcb.jpg plc.jpg ../../assets/img/renders
Needs numpy, scipy, Pillow.
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

plate, *srcs, outdir = sys.argv[1:]
P = np.asarray(Image.open(plate).convert("RGB")).astype(float)
for src, name in zip(srcs, ("gears", "pcb", "plc")):
    I = np.asarray(Image.open(src).convert("RGB")).astype(float)
    d = ndi.gaussian_filter(np.abs(I - P).sum(2), 2)
    M = ndi.binary_dilation(d > 7, iterations=10)
    M = np.clip(ndi.gaussian_filter(M.astype(float), 6) * 1.2, 0, 1)[..., None]
    out = Image.fromarray(np.clip(I * M + P * (1 - M) + 0.5, 0, 255).astype(np.uint8))
    out.resize((1200, 750), Image.LANCZOS).save(os.path.join(outdir, name + ".webp"), lossless=True, quality=100, method=6)
    print(name, "done")
