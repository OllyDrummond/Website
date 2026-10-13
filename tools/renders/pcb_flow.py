"""Trace map for the homepage hero's WebGL pulses (assets/js/pcb-gl.js).

Finds the thin bright copper traces in the hero photo and writes a PNG the
shader reads per pixel:
  R = trace mask (0..1)
  G = distance from the main chip, measured along the traces (0..1)
  B = a timing seed per connected trace (so they don't all fire together)

    python3 tools/renders/pcb_flow.py photo.png assets/img/renders/pcb-hd-data.png

Needs numpy, scipy, scikit-image and Pillow. The chip box below is in
fractions of the image, so it works at any resolution of the same photo.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import filters, graph, morphology, measure

src, dst = sys.argv[1], sys.argv[2]
OUT_W = int(sys.argv[3]) if len(sys.argv) > 3 else 1536
im = Image.open(src).convert("RGB")
im = im.resize((OUT_W, round(OUT_W * im.height / im.width)), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
H, W, _ = a.shape
L = a @ np.array([0.25, 0.35, 0.4], np.float32)        # bias towards blue: traces are blue-white

# Thin bright lines: ridge filter plus a small top-hat, so big shiny parts don't count
s = W / 1536
ridge = filters.sato(L, sigmas=[0.8 * s, 1.4 * s, 2.2 * s], black_ridges=False)
top = morphology.white_tophat(L, morphology.disk(max(2, round(3 * s))))
resp = ridge / (np.percentile(ridge, 99.5) + 1e-6) * 0.6 + top / (np.percentile(top, 99.5) + 1e-6) * 0.4

# Only the board (below the glowing horizon), and not on large bright parts (capacitor cans)
yy = np.arange(H)[:, None] / H
board = np.clip((yy - 0.37) / 0.05, 0, 1)
blob = ndi.gaussian_filter(L, 6 * s)
bright_blob = np.clip((blob - 0.42) / 0.12, 0, 1)
resp = resp * board * (1 - bright_blob)

mask = np.clip((resp - 0.28) / 0.45, 0, 1)
keep = morphology.remove_small_objects(mask > 0.15, max(30, round(40 * s * s)))
mask = mask * keep
mask = ndi.gaussian_filter(mask, 0.6 * s)

# Distance along the traces from the main chip. Off-trace steps are expensive but
# allowed, so small gaps in the detection don't strand a trace.
chip = np.zeros((H, W), bool)
x0, x1, y0, y1 = 0.56, 0.90, 0.52, 0.66          # the big QFP and its legs
chip[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
cost = np.where(mask > 0.2, 1.0, 14.0).astype(np.float64)
mcp = graph.MCP_Geometric(cost)
dist, _ = mcp.find_costs(np.argwhere(chip))
dist = np.clip(dist / (1.6 * W), 0, 1)

# One seed per connected trace
lab = measure.label(mask > 0.15, connectivity=2)
rng = np.random.default_rng(7)
seeds = np.concatenate([[0], rng.uniform(0.05, 1.0, lab.max())])
seed = seeds[lab]
seed = np.where(mask > 0.02, ndi.grey_dilation(seed, size=3), 0)

out = np.dstack([mask, dist, seed])
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, optimize=True)
print(W, H, "trace px:", int((mask > 0.2).sum()), "traces:", lab.max())
