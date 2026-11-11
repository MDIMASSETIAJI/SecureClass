import os
import numpy as np
from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from .schemas import (
    DetectRequest, DetectResponse,
    EmbeddingRequest, EmbeddingResponse,
    VerifyRequest, VerifyResponse,
    LivenessRequest, LivenessResponse,
    PipelineRequest, PipelineResponse,
    MultiSamplePipelineRequest, MultiSamplePipelineResponse
)
from .detector import FaceDetector
from .embedding import ArcFaceEmbeddingExtractor
from .liveness import LivenessDetector

# Secret token required to communicate with this microservice
INTERNAL_SECRET = os.getenv("FACE_SERVICE_SECRET", "secureclass-internal-face-secret-2026")

app = FastAPI(
    title="SecureClass Face Recognition Microservice",
    description="Internal machine learning microservice for Face Biometrics and Anti-Spoofing",
    version="1.0.0",
    docs_url=None, # Disable public Swagger documentation for security
    redoc_url=None
)

# Only allow localhost communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Initialize engines
detector = FaceDetector()
extractor = ArcFaceEmbeddingExtractor()
liveness_engine = LivenessDetector()

def verify_internal_token(x_internal_token: Optional[str] = Header(None)):
    """Verifies that the request comes from the internal Next.js backend proxy"""
    if not x_internal_token or x_internal_token != INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Internal microservice access restricted."
        )

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "secureclass-face-recognition",
        "model": "ArcFace-w600k-MobileFaceNet",
        "detector": "OpenCV-Haar-and-DNN",
        "liveness": "FFT-Laplacian-Chrominance-MultiModal"
    }

@app.post("/detect", response_model=DetectResponse, dependencies=[Depends(verify_internal_token)])
def detect(req: DetectRequest):
    try:
        img = detector.decode_image_base64(req.image_base64)
        boxes = detector.detect_faces(img)
        return DetectResponse(
            success=True,
            faces_found=len(boxes),
            faces=boxes,
            message=f"Detected {len(boxes)} face(s)."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Detection failed: {str(e)}")

@app.post("/extract", response_model=EmbeddingResponse, dependencies=[Depends(verify_internal_token)])
def extract(req: EmbeddingRequest):
    try:
        img = detector.decode_image_base64(req.image_base64)
        boxes = detector.detect_faces(img)

        if len(boxes) == 0:
            return EmbeddingResponse(
                success=False,
                faces_found=0,
                message="No face detected in the image. Please position your face clearly inside the frame."
            )
        if len(boxes) > 1:
            return EmbeddingResponse(
                success=False,
                faces_found=len(boxes),
                message="Multiple faces detected. For biometric security, only one face is permitted."
            )

        # Single face detected -> align and extract
        face_aligned = detector.crop_and_align_face(img, boxes[0])
        embedding, norm = extractor.extract_embedding(face_aligned)

        return EmbeddingResponse(
            success=True,
            faces_found=1,
            embedding=embedding,
            embedding_dim=len(embedding),
            norm=norm,
            message="Face embedding extracted successfully."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Embedding extraction failed: {str(e)}")

@app.post("/verify", response_model=VerifyResponse, dependencies=[Depends(verify_internal_token)])
def verify(req: VerifyRequest):
    try:
        similarity = extractor.compute_similarity(req.embedding1, req.embedding2)
        matched = bool(similarity >= req.threshold)
        return VerifyResponse(
            matched=matched,
            similarity=round(similarity, 4),
            threshold=req.threshold,
            message="Biometric match verified." if matched else "Biometric verification failed: similarity below threshold."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

@app.post("/liveness", response_model=LivenessResponse, dependencies=[Depends(verify_internal_token)])
def liveness(req: LivenessRequest):
    try:
        img = detector.decode_image_base64(req.image_base64)
        boxes = detector.detect_faces(img)

        if len(boxes) == 0:
            return LivenessResponse(
                is_live=False,
                liveness_score=0.0,
                details={"error": "NO_FACE_DETECTED"},
                message="No face detected for liveness check."
            )
        if len(boxes) > 1:
            return LivenessResponse(
                is_live=False,
                liveness_score=0.0,
                details={"error": "MULTIPLE_FACES_DETECTED"},
                message="Multiple faces detected during liveness check."
            )

        face_crop = detector.crop_and_align_face(img, boxes[0])
        is_live, score, details = liveness_engine.check_liveness(face_crop, img)

        return LivenessResponse(
            is_live=is_live,
            liveness_score=score,
            details=details,
            message="Live face confirmed." if is_live else "Potential presentation or spoof attack detected."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Liveness evaluation failed: {str(e)}")

@app.post("/pipeline", response_model=PipelineResponse, dependencies=[Depends(verify_internal_token)])
def pipeline(req: PipelineRequest):
    """
    Combined production pipeline:
    1. Decode & detect face count
    2. Enforce exactly 1 face constraint
    3. Evaluate anti-spoofing liveness
    4. Extract 512-dim ArcFace embedding
    """
    try:
        img = detector.decode_image_base64(req.image_base64)
        boxes = detector.detect_faces(img)

        if len(boxes) == 0:
            return PipelineResponse(
                success=False,
                faces_found=0,
                is_live=False,
                liveness_score=0.0,
                details={},
                error_code="NO_FACE_DETECTED",
                message="Tidak ada wajah yang terdeteksi. Posisikan wajah Anda tepat di depan kamera."
            )

        if len(boxes) > 1:
            return PipelineResponse(
                success=False,
                faces_found=len(boxes),
                is_live=False,
                liveness_score=0.0,
                details={},
                error_code="MULTIPLE_FACES_DETECTED",
                message=f"Terdeteksi {len(boxes)} wajah. Hanya satu wajah yang diizinkan untuk keamanan biometrik."
            )

        face_crop = detector.crop_and_align_face(img, boxes[0])
        is_live, liveness_score, liveness_details = liveness_engine.check_liveness(face_crop, img)

        if req.require_liveness and not is_live:
            return PipelineResponse(
                success=False,
                faces_found=1,
                is_live=False,
                liveness_score=liveness_score,
                details=liveness_details,
                error_code="LIVENESS_FAILED",
                message="Pemeriksaan liveness gagal. Sistem mendeteksi kemungkinan foto/layar digital (anti-spoofing)."
            )

        # Extract embedding
        embedding, norm = extractor.extract_embedding(face_crop)

        return PipelineResponse(
            success=True,
            faces_found=1,
            is_live=is_live,
            liveness_score=liveness_score,
            embedding=embedding,
            details=liveness_details,
            message="Wajah terverifikasi hidup dan fitur biometrik berhasil diekstraksi."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Pipeline error: {str(e)}")

@app.post("/pipeline/multi-sample", response_model=MultiSamplePipelineResponse, dependencies=[Depends(verify_internal_token)])
def pipeline_multi_sample(req: MultiSamplePipelineRequest):
    """
    Multi-sample enrollment pipeline:
    Receives an array of face captures across various angles/poses.
    Processes each sample (detect face, check liveness, extract 512-dim embedding),
    then aggregates embeddings into a unit-normalized centroid vector.
    """
    try:
        if not req.images_base64 or len(req.images_base64) == 0:
            return MultiSamplePipelineResponse(
                success=False,
                samples_processed=0,
                valid_samples=0,
                message="Daftar sampel citra wajah tidak boleh kosong.",
                error_code="EMPTY_SAMPLES"
            )

        valid_embeddings: List[List[float]] = []
        liveness_scores: List[float] = []
        failed_indices: List[int] = []

        for idx, img_b64 in enumerate(req.images_base64):
            try:
                img = detector.decode_image_base64(img_b64)
                boxes = detector.detect_faces(img)

                if len(boxes) != 1:
                    failed_indices.append(idx)
                    continue

                face_crop = detector.crop_and_align_face(img, boxes[0])
                is_live, liveness_score, _ = liveness_engine.check_liveness(face_crop, img)

                if req.require_liveness and liveness_score < req.liveness_threshold:
                    failed_indices.append(idx)
                    continue

                embedding, _ = extractor.extract_embedding(face_crop)
                valid_embeddings.append(embedding)
                liveness_scores.append(liveness_score)
            except Exception:
                failed_indices.append(idx)

        if len(valid_embeddings) == 0:
            return MultiSamplePipelineResponse(
                success=False,
                samples_processed=len(req.images_base64),
                valid_samples=0,
                failed_indices=failed_indices,
                error_code="NO_VALID_SAMPLES",
                message="Tidak ada sampel wajah yang valid atau lolos uji anti-spoofing. Pastikan wajah terlihat jelas di setiap sudut."
            )

        # Compute normalized centroid vector across all valid sample embeddings
        emb_matrix = np.array(valid_embeddings, dtype=np.float32)
        mean_vec = np.mean(emb_matrix, axis=0)
        norm = float(np.linalg.norm(mean_vec))
        if norm > 0:
            centroid_vec = (mean_vec / norm).tolist()
        else:
            centroid_vec = mean_vec.tolist()

        avg_liveness = float(np.mean(liveness_scores)) if liveness_scores else 0.0

        return MultiSamplePipelineResponse(
            success=True,
            samples_processed=len(req.images_base64),
            valid_samples=len(valid_embeddings),
            embeddings=valid_embeddings,
            centroid_embedding=centroid_vec,
            average_liveness=round(avg_liveness, 4),
            failed_indices=failed_indices,
            message=f"Berhasil memproses {len(valid_embeddings)} dari {len(req.images_base64)} sampel pose wajah."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Multi-sample pipeline error: {str(e)}")


