from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    confidence: float

class DetectRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string (JPEG/PNG, with or without data URI prefix)")

class DetectResponse(BaseModel):
    success: bool
    faces_found: int
    faces: List[BoundingBox] = []
    message: str

class EmbeddingRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string containing a single face")

class EmbeddingResponse(BaseModel):
    success: bool
    faces_found: int
    embedding: Optional[List[float]] = None
    embedding_dim: Optional[int] = None
    norm: Optional[float] = None
    message: str

class VerifyRequest(BaseModel):
    embedding1: List[float] = Field(..., description="First face embedding (512-dim)")
    embedding2: List[float] = Field(..., description="Second face embedding (512-dim)")
    threshold: float = Field(0.65, description="Cosine similarity threshold (default 0.65 for ArcFace)")

class VerifyResponse(BaseModel):
    matched: bool
    similarity: float
    threshold: float
    message: str

class LivenessRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string")

class LivenessResponse(BaseModel):
    is_live: bool
    liveness_score: float
    details: Dict[str, Any]
    message: str

class PipelineRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded face image")
    require_liveness: bool = Field(True, description="Whether to reject if liveness check fails")
    liveness_threshold: float = Field(0.55, description="Minimum anti-spoofing score")

class PipelineResponse(BaseModel):
    success: bool
    faces_found: int
    is_live: bool
    liveness_score: float
    embedding: Optional[List[float]] = None
    details: Dict[str, Any]
    error_code: Optional[str] = None
    message: str

class MultiSamplePipelineRequest(BaseModel):
    images_base64: List[str] = Field(..., description="List of base64 encoded face images from multiple angles/poses")
    require_liveness: bool = Field(True, description="Whether to reject if liveness check fails")
    liveness_threshold: float = Field(0.50, description="Minimum anti-spoofing score")

class MultiSamplePipelineResponse(BaseModel):
    success: bool
    samples_processed: int
    valid_samples: int
    embeddings: List[List[float]] = []
    centroid_embedding: Optional[List[float]] = None
    average_liveness: float = 0.0
    failed_indices: List[int] = []
    error_code: Optional[str] = None
    message: str


