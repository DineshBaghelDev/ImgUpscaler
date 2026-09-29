import io
import threading
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image

from upscale import upscale

app = FastAPI()
lock = threading.Lock()


@app.post("/upscale")
def upscale_endpoint(file: UploadFile = File(...), size: str = Form("4k")):
    img = Image.open(file.file)
    with lock:
        out = upscale(img, size)
    buf = io.BytesIO()
    out.save(buf, "PNG")
    return Response(buf.getvalue(), media_type="image/png")


dist = Path(__file__).parent / "web" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=dist, html=True))

if __name__ == "__main__":
    uvicorn.run(app, port=8000)
