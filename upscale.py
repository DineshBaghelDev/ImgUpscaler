import argparse
import os
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from spandrel import ModelLoader

MODEL_PATH = os.environ.get("MODEL_PATH", r"E:\Models\RealESRGAN_x4plus_anime_6B.pth")
SIZES = {"2k": 2048, "4k": 3840, "8k": 7680}
TILE, PAD = 512, 16

device = "cuda" if torch.cuda.is_available() else "cpu"
model = ModelLoader().load_from_file(MODEL_PATH).model.eval().to(device)
if device == "cuda":
    model = model.half()
dtype = next(model.parameters()).dtype


@torch.inference_mode()
def _x4(img: Image.Image) -> Image.Image:
    x = torch.from_numpy(np.array(img.convert("RGB"))).permute(2, 0, 1)[None].to(device, dtype) / 255
    _, _, h, w = x.shape
    out = torch.zeros((1, 3, h * 4, w * 4), dtype=dtype, device=device)
    for y in range(0, h, TILE):
        for x0 in range(0, w, TILE):
            y1, x1 = min(y + TILE, h), min(x0 + TILE, w)
            py0, px0 = max(y - PAD, 0), max(x0 - PAD, 0)
            py1, px1 = min(y1 + PAD, h), min(x1 + PAD, w)
            t = model(x[:, :, py0:py1, px0:px1])
            oy, ox = (y - py0) * 4, (x0 - px0) * 4
            out[:, :, y * 4:y1 * 4, x0 * 4:x1 * 4] = t[:, :, oy:oy + (y1 - y) * 4, ox:ox + (x1 - x0) * 4]
    arr = (out[0].clamp(0, 1) * 255).round().byte().permute(1, 2, 0).cpu().numpy()
    return Image.fromarray(arr)


def upscale(img: Image.Image, size: str) -> Image.Image:
    target = SIZES[size]
    alpha = img.getchannel("A") if "A" in img.getbands() else None
    rgb = img.convert("RGB")
    for _ in range(2):
        if max(rgb.size) >= target:
            break
        rgb = _x4(rgb)
    scale = target / max(img.size)
    new = (round(img.width * scale), round(img.height * scale))
    rgb = rgb.resize(new, Image.LANCZOS)
    if alpha:
        rgb.putalpha(alpha.resize(new, Image.LANCZOS))
    return rgb


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("images", nargs="+")
    p.add_argument("--size", choices=SIZES, default="4k")
    p.add_argument("-o", "--out", default="outputs")
    a = p.parse_args()
    Path(a.out).mkdir(exist_ok=True)
    for f in a.images:
        res = upscale(Image.open(f), a.size)
        dst = Path(a.out) / f"{Path(f).stem}_{a.size}.png"
        res.save(dst)
        print(f"{f} -> {dst} {res.size}")
