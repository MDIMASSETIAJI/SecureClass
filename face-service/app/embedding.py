import os
import numpy as np
import onnxruntime as ort
from typing import List, Tuple

class ArcFaceEmbeddingExtractor:
    def __init__(self, model_path: str = None):
        if model_path is None:
            # Default to bundled model in models/
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "models", "arcface_w600k_mbf.onnx")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ArcFace ONNX model not found at {model_path}")

        # Set up ONNX runtime session with CPU provider
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 4
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        self.session = ort.InferenceSession(model_path, sess_options=opts, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape

    def extract_embedding(self, aligned_face_bgr: np.ndarray) -> Tuple[List[float], float]:
        """
        Takes an aligned 112x112 BGR face image.
        Returns normalized 512-dim embedding and its original L2 norm.
        """
        # Convert BGR to RGB
        rgb_face = aligned_face_bgr[:, :, ::-1]

        # ArcFace input normalization: (x - 127.5) / 127.5
        input_data = (rgb_face.astype(np.float32) - 127.5) / 127.5

        # Transpose HWC (112, 112, 3) -> NCHW (1, 3, 112, 112)
        input_tensor = np.transpose(input_data, (2, 0, 1))
        input_tensor = np.expand_dims(input_tensor, axis=0)

        # Run ONNX inference
        outputs = self.session.run([self.output_name], {self.input_name: input_tensor})
        raw_embedding = outputs[0][0] # 512-dim vector

        # Compute L2 Norm
        norm = float(np.linalg.norm(raw_embedding))
        if norm > 0:
            normalized_emb = raw_embedding / norm
        else:
            normalized_emb = raw_embedding

        return [float(x) for x in normalized_emb], norm

    @staticmethod
    def compute_similarity(emb1: List[float], emb2: List[float]) -> float:
        """
        Computes cosine similarity between two 512-dim embeddings.
        Returns value between -1.0 and 1.0 (typically 0.0 to 1.0 for faces).
        """
        v1 = np.array(emb1, dtype=np.float32)
        v2 = np.array(emb2, dtype=np.float32)

        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = float(np.dot(v1, v2) / (norm1 * norm2))
        return max(-1.0, min(1.0, similarity))

