import uvicorn
import os

if __name__ == "__main__":
    host = os.getenv("FACE_SERVICE_HOST", "127.0.0.1")
    port = int(os.getenv("FACE_SERVICE_PORT", "8000"))
    print(f"Starting SecureClass Face Recognition Microservice on {host}:{port}...")
    uvicorn.run("app.main:app", host=host, port=port, reload=False, log_level="info")

