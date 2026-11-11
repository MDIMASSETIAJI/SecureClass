import os
import urllib.request
import zipfile
import shutil

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET_MODEL = os.path.join(MODELS_DIR, "arcface_w600k_mbf.onnx")

def download_models():
    if os.path.exists(TARGET_MODEL) and os.path.getsize(TARGET_MODEL) > 1000000:
        print(f"Model already exists at {TARGET_MODEL} ({os.path.getsize(TARGET_MODEL)} bytes)")
        return True

    zip_path = os.path.join(MODELS_DIR, "buffalo_sc.zip")
    urls = [
        "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_sc.zip",
        "https://huggingface.co/public-data/insightface/resolve/main/models/buffalo_sc.zip"
    ]

    for url in urls:
        try:
            print(f"Trying to download from {url}...")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as response, open(zip_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
            print(f"Downloaded zip: {os.path.getsize(zip_path)} bytes")

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(MODELS_DIR)
            print("Extracted models successfully!")

            # Look for w600k_mbf.onnx or similar
            for f in os.listdir(MODELS_DIR):
                if "w600k_mbf" in f or "arcface" in f or "mbf" in f:
                    src = os.path.join(MODELS_DIR, f)
                    if f != "arcface_w600k_mbf.onnx":
                        shutil.copyfile(src, TARGET_MODEL)
                    print(f"Found recognition model: {src} -> {TARGET_MODEL}")
                    break
            
            if os.path.exists(zip_path):
                os.remove(zip_path)
            return True
        except Exception as e:
            print(f"Failed from {url}: {e}")

    return False

if __name__ == "__main__":
    success = download_models()
    if not success:
        print("Could not download buffalo_sc. Will generate/fallback ArcFace MobileFaceNet ONNX model directly.")

