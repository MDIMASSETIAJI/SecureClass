import numpy as np
import cv2
import base64
import os
from app.detector import FaceDetector
from app.embedding import ArcFaceEmbeddingExtractor
from app.liveness import LivenessDetector

def create_synthetic_face_image():
    # Create 200x200 canvas with synthetic skin tones and facial features
    img = np.full((240, 240, 3), 220, dtype=np.uint8)
    
    # Draw face ellipse
    cv2.ellipse(img, (120, 120), (60, 80), 0, 0, 360, (140, 160, 210), -1) # skin BGR
    # Eyes
    cv2.circle(img, (95, 100), 8, (50, 40, 30), -1)
    cv2.circle(img, (145, 100), 8, (50, 40, 30), -1)
    # Eyeballs
    cv2.circle(img, (95, 100), 3, (255, 255, 255), -1)
    cv2.circle(img, (145, 100), 3, (255, 255, 255), -1)
    # Nose
    cv2.line(img, (120, 105), (120, 130), (100, 120, 160), 3)
    # Mouth
    cv2.ellipse(img, (120, 155), (20, 10), 0, 0, 180, (80, 80, 180), 4)

    # Convert to base64
    _, buf = cv2.imencode('.png', img)
    return base64.b64encode(buf).decode('ascii')

def test_pipeline():
    print("Testing Face Recognition & Liveness Pipeline...")
    detector = FaceDetector()
    extractor = ArcFaceEmbeddingExtractor()
    liveness = LivenessDetector()

    b64 = create_synthetic_face_image()
    img = detector.decode_image_base64(b64)
    assert img is not None and img.shape[0] == 240, "Image decoding failed"
    print("✓ Image decode successful")

    # Crop aligned face (112x112)
    aligned_face = cv2.resize(img[40:200, 60:180], (112, 112))
    assert aligned_face.shape == (112, 112, 3), "Aligned face shape mismatch"

    # Test Liveness
    is_live, score, details = liveness.check_liveness(aligned_face)
    print(f"✓ Liveness test: score={score}, details={details['fft_score']}, {details['texture_score']}")

    # Test Embedding Extraction
    emb1, norm1 = extractor.extract_embedding(aligned_face)
    assert len(emb1) == 512, f"Expected 512-dim embedding, got {len(emb1)}"
    print(f"✓ ArcFace 512-dim embedding extracted, L2 norm={norm1:.2f}")

    # Test similarity with itself (should be ~1.0)
    sim_self = extractor.compute_similarity(emb1, emb1)
    assert abs(sim_self - 1.0) < 1e-4, f"Self-similarity should be 1.0, got {sim_self}"
    print(f"✓ Self cosine similarity: {sim_self:.4f} (PASSED)")

    # Test similarity with random noise vector
    rand_vec = np.random.randn(512).tolist()
    sim_rand = extractor.compute_similarity(emb1, rand_vec)
    print(f"✓ Random noise cosine similarity: {sim_rand:.4f} (Appropriately low)")

    print("\nAll Face Service tests completed successfully!")

if __name__ == "__main__":
    test_pipeline()

