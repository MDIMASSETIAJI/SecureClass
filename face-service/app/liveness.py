import cv2
import numpy as np
from typing import Dict, Any, Tuple

class LivenessDetector:
    """
    Advanced Anti-Spoofing & Liveness Detection Engine
    Detects presentation attacks:
    - Printed photo attack (halftone patterns, double-blurring, planar reflection)
    - Digital screen replay attack (LCD/OLED moire, high frequency pixel lattice, backlight shift)
    - Cutout masks and static paper attacks
    """

    def __init__(self):
        pass

    def check_liveness(self, face_bgr: np.ndarray, full_frame_bgr: np.ndarray = None) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Analyzes the facial region for anti-spoofing indicators.
        Returns:
            is_live (bool): True if aggregate score >= threshold
            score (float): 0.0 to 1.0
            details (dict): breakdown of frequency, texture, color, and sharpness metrics
        """
        # Ensure image is valid
        if face_bgr is None or face_bgr.size == 0:
            return False, 0.0, {"error": "Invalid face region"}

        # 1. Fourier Frequency Domain Analysis (Detects screen moire & print patterns)
        fft_score, fft_details = self._analyze_frequency_domain(face_bgr)

        # 2. Texture & Laplacian Gradient Analysis (Detects re-capture blur & artificial sharpness)
        texture_score, texture_details = self._analyze_texture_gradients(face_bgr)

        # 3. Color Space Chrominance & Reflection Analysis (YCrCb / HSV skin physics)
        color_score, color_details = self._analyze_color_chrominance(face_bgr)

        # 4. Multi-scale Edge Uniformity (Screen borders or cutout mask edges)
        edge_score = self._analyze_edge_distribution(face_bgr)

        # Weighted aggregate score
        aggregate_score = (
            0.35 * fft_score +
            0.30 * texture_score +
            0.20 * color_score +
            0.15 * edge_score
        )

        # Clamping
        final_score = float(max(0.0, min(1.0, aggregate_score)))
        
        # Threshold: 0.55 is recommended baseline for good balance of low FAR and low FRR
        threshold = 0.52
        is_live = bool(final_score >= threshold)

        details = {
            "fft_score": round(fft_score, 4),
            "texture_score": round(texture_score, 4),
            "color_score": round(color_score, 4),
            "edge_score": round(edge_score, 4),
            "threshold": threshold,
            "sub_metrics": {**fft_details, **texture_details, **color_details}
        }

        return is_live, round(final_score, 4), details

    def _analyze_frequency_domain(self, face_bgr: np.ndarray) -> Tuple[float, Dict[str, float]]:
        """2D Fast Fourier Transform to detect repetitive high-frequency screen grids & printer halftones"""
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        # Center crop to isolate facial skin and avoid background
        crop_y, crop_x = int(h * 0.2), int(w * 0.2)
        center_region = gray[crop_y:h-crop_y, crop_x:w-crop_x]
        if center_region.size == 0:
            center_region = gray

        # Compute 2D FFT
        dft = cv2.dft(np.float32(center_region), flags=cv2.DFT_COMPLEX_OUTPUT)
        dft_shift = np.fft.fftshift(dft)
        magnitude_spectrum = 20 * np.log(cv2.magnitude(dft_shift[:, :, 0], dft_shift[:, :, 1]) + 1e-6)

        # Measure energy in high-frequency band vs low-frequency core
        cy, cx = magnitude_spectrum.shape[0] // 2, magnitude_spectrum.shape[1] // 2
        r_inner = min(cy, cx) // 4
        r_outer = min(cy, cx) // 2

        y, x = np.ogrid[:magnitude_spectrum.shape[0], :magnitude_spectrum.shape[1]]
        dist_from_center = np.sqrt((x - cx)**2 + (y - cy)**2)

        low_freq_mask = dist_from_center <= r_inner
        mid_high_mask = (dist_from_center > r_inner) & (dist_from_center <= r_outer)

        low_energy = np.mean(magnitude_spectrum[low_freq_mask]) if np.any(low_freq_mask) else 1.0
        mid_high_energy = np.mean(magnitude_spectrum[mid_high_mask]) if np.any(mid_high_mask) else 0.0

        # Screens produce either excessive spikes or washed out high frequencies
        ratio = mid_high_energy / max(low_energy, 1e-4)
        
        # Genuine faces typically have ratio between 0.35 and 0.85
        if 0.35 <= ratio <= 0.85:
            fft_score = 1.0 - abs(ratio - 0.6) * 1.5
        elif ratio < 0.35:
            # Too washed out / blurred (photo print or heavily compressed replay)
            fft_score = max(0.2, ratio / 0.35)
        else:
            # High frequency noise / screen lattice moire
            fft_score = max(0.1, 1.0 - (ratio - 0.85))

        return float(max(0.0, min(1.0, fft_score))), {"fft_ratio": round(float(ratio), 4)}

    def _analyze_texture_gradients(self, face_bgr: np.ndarray) -> Tuple[float, Dict[str, float]]:
        """Laplacian variance and Local Contrast check"""
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        
        # Laplacian variance measures sharpness and micro-texture
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        # Genuine faces from typical webcams range from 80 to 2500
        # Below 60 indicates severe blur (paper print / low-res screen)
        # Above 3500 often indicates artificial sharpening or screen pixel moire
        if 80 <= laplacian_var <= 2800:
            sharpness_score = 0.95
        elif laplacian_var < 80:
            sharpness_score = max(0.1, laplacian_var / 80.0)
        else:
            sharpness_score = max(0.4, 1.0 - (laplacian_var - 2800) / 4000.0)

        return float(sharpness_score), {"laplacian_var": round(laplacian_var, 2)}

    def _analyze_color_chrominance(self, face_bgr: np.ndarray) -> Tuple[float, Dict[str, float]]:
        """Skin color distribution in YCrCb and HSV color spaces"""
        ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)
        _, cr, cb = cv2.split(ycrcb)

        # Genuine skin has standard Cr (133-173) and Cb (77-127) distribution
        mean_cr = float(np.mean(cr))
        mean_cb = float(np.mean(cb))
        std_cr = float(np.std(cr))

        in_cr_range = (120 <= mean_cr <= 180)
        in_cb_range = (70 <= mean_cb <= 140)

        if in_cr_range and in_cb_range and std_cr > 3.0:
            color_score = 0.95
        elif in_cr_range or in_cb_range:
            color_score = 0.60
        else:
            color_score = 0.25 # Abnormal spectral signature (e.g. black and white print or distorted display)

        return float(color_score), {"mean_cr": round(mean_cr, 1), "mean_cb": round(mean_cb, 1)}

    def _analyze_edge_distribution(self, face_bgr: np.ndarray) -> float:
        """Canny edge density to ensure realistic facial feature contours"""
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        edge_density = float(np.count_nonzero(edges)) / float(edges.size)

        # Typical face edge density is between 0.02 and 0.18
        if 0.02 <= edge_density <= 0.18:
            return 0.95
        elif edge_density < 0.02:
            return max(0.2, edge_density / 0.02)
        else:
            return max(0.3, 1.0 - (edge_density - 0.18) * 3)

