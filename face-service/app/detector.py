import cv2
import numpy as np
import base64
import os
from typing import Tuple, List, Optional
from .schemas import BoundingBox

class FaceDetector:
    def __init__(self):
        # Locate OpenCV cascade files
        cascade_dir = cv2.data.haarcascades
        self.face_cascade = cv2.CascadeClassifier(os.path.join(cascade_dir, 'haarcascade_frontalface_default.xml'))
        self.alt_cascade = cv2.CascadeClassifier(os.path.join(cascade_dir, 'haarcascade_frontalface_alt2.xml'))
        self.eye_cascade = cv2.CascadeClassifier(os.path.join(cascade_dir, 'haarcascade_eye.xml'))

    @staticmethod
    def decode_image_base64(image_base64: str) -> np.ndarray:
        """Decode base64 string (with or without data:image/png;base64 prefix) into OpenCV BGR image"""
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]
        
        image_bytes = base64.b64decode(image_base64.strip())
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image data from base64")
        return img

    def detect_faces(self, img: np.ndarray) -> List[BoundingBox]:
        """Detect all faces in the image, returning bounding boxes and confidences"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Apply histogram equalization to normalize lighting
        gray = cv2.equalizeHist(gray)

        # Primary detector
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        # Fallback to alt cascade if none detected
        if len(faces) == 0:
            faces = self.alt_cascade.detectMultiScale(
                gray,
                scaleFactor=1.08,
                minNeighbors=4,
                minSize=(50, 50)
            )

        boxes: List[BoundingBox] = []
        for (x, y, w, h) in faces:
            # Simple heuristic confidence based on size and face/eye verification
            roi_gray = gray[y:y+h, x:x+w]
            eyes = self.eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3)
            conf = 0.95 if len(eyes) >= 1 else 0.85
            boxes.append(BoundingBox(
                x=int(x),
                y=int(y),
                width=int(w),
                height=int(h),
                confidence=float(conf)
            ))

        return boxes

    def crop_and_align_face(self, img: np.ndarray, box: BoundingBox, target_size: Tuple[int, int] = (112, 112)) -> np.ndarray:
        """
        Crop face region with 15% margin and resize to target_size (default 112x112 for ArcFace)
        """
        h_img, w_img = img.shape[:2]
        x, y, w, h = box.x, box.y, box.width, box.height

        # Add 15% padding around the bounding box for full facial contour
        margin_x = int(w * 0.15)
        margin_y = int(h * 0.15)

        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(w_img, x + w + margin_x)
        y2 = min(h_img, y + h + margin_y)

        face_crop = img[y1:y2, x1:x2]
        if face_crop.size == 0:
            face_crop = img[y:y+h, x:x+w]

        # Resize to standard ArcFace 112x112
        aligned = cv2.resize(face_crop, target_size, interpolation=cv2.INTER_AREA)
        return aligned

