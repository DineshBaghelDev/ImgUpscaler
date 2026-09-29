# ImgUpscaler

Anime image upscaler (RealESRGAN_x4plus_anime_6B) to 2K / 4K / 8K (long edge 2048 / 3840 / 7680).

## Setup
```
curl -L -o E:\Models\RealESRGAN_x4plus_anime_6B.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
cd web && npm i && npm run build
```
Model path override: `MODEL_PATH` env var.

## Use
- CLI: `.venv\Scripts\python upscale.py a.png b.jpg --size 8k -o outputs`
- UI: `.venv\Scripts\python server.py` → http://localhost:8000
