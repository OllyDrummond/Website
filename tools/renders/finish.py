"""Photographic finish for a render: subtle vignette and fine grain.

    python3 tools/renders/finish.py in.png out.webp
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
h, w, _ = im.shape
y, x = np.mgrid[0:h, 0:w]
r = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h * 0.48) / (h / 2)) ** 2)
im *= (1 - 0.1 * np.clip(r - 0.55, 0, None) ** 1.6)[..., None]
im += np.random.default_rng(3).normal(0, 0.006, (h, w, 1))
Image.fromarray((np.clip(im, 0, 1) * 255).astype(np.uint8)).save(dst, quality=90)
