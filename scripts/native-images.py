#!/usr/bin/env python3
"""Native (TikTok mini game) copies of the web art: every .webp the native bundle imports becomes a small
PNG (alpha, 8-bit palette) or JPG in src/native/img/<folder>-<name>.png|jpg — the mini-game runtime's
image decoder is not guaranteed to read WebP, and the main package must stay under 4 MB.
scripts/build-tiktok.mjs maps each `import x from '…/name.webp'` to that copy.

   python3 scripts/native-images.py
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'src/assets/images')
OUT = os.path.join(ROOT, 'src/native/img')
# longest side in pixels for each kind (the canvas UI draws at ≤ 2× its layout size)
MAX = {'cars': 320, 'images': 900}
REAR_MAX = 560

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
total = 0
for d, _, files in os.walk(SRC):
    folder = os.path.basename(d)
    for f in sorted(files):
        if not f.endswith('.webp'):
            continue
        base = f[:-5]
        name = base if folder == 'images' else f'{folder}-{base}'
        im = Image.open(os.path.join(d, f))
        lim = REAR_MAX if base.startswith('rear-') else MAX.get(folder, 900)
        k = min(1, lim / max(im.size))
        if k < 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getchannel('A').getextrema()[0] < 255
        if alpha:
            q = im.convert('RGBA').quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
            p = os.path.join(OUT, name + '.png')
            q.save(p, optimize=True)
        else:
            p = os.path.join(OUT, name + '.jpg')
            im.convert('RGB').save(p, quality=82, optimize=True, progressive=False)
        total += os.path.getsize(p)
        print(f'{os.path.relpath(p, ROOT)}  {im.size[0]}×{im.size[1]}  {os.path.getsize(p) // 1024} KB')
print(f'total {total / 1024:.0f} KB')
