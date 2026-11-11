# SecureClass Face Recognition Microservice

Microservice internal berbasis Python FastAPI untuk ekstraksi fitur biometrik wajah (ArcFace), deteksi liveness (anti-spoofing), dan verifikasi biometrik satu-ke-satu (*1:1 face verification*).

## Arsitektur & Teknologi

- **Model Recognition:** ArcFace (MobileFaceNet backbone, input $112 \times 112$, output 512-dimensi L2-normalized embedding).
- **Model Detection:** OpenCV Haar Cascade & Multi-Scale DNN Face Detector dengan penanganan wajah tunggal dan jamak.
- **Liveness Engine:** Analisis multi-domain:
  1. *2D Fast Fourier Transform (FFT)*: Deteksi raster moiré layar LCD/OLED dan pola *halftone* cetakan kertas.
  2. *Laplacian Gradient Variance*: Pengukuran ketajaman mikro-tekstur dan re-capture blurring.
  3. *Chrominance Physics (YCrCb)*: Analisis dispersi warna kulit alami manusia versus refleksi layar digital.
- **Inference Engine:** ONNX Runtime (CPU Optimized, 4 threads).

## Spesifikasi Biometrik

| Parameter | Nilai Default | Keterangan |
| :--- | :--- | :--- |
| **Embedding Dimension** | 512 float32 | Vektor ternormalisasi $L_2$ ($\|v\|_2 = 1.0$) |
| **Similarity Metric** | Cosine Similarity | $\cos(\theta) = \mathbf{u} \cdot \mathbf{v}$ |
| **Verification Threshold** | 0.65 | Titik operasi standar ArcFace |
| **False Acceptance Rate (FAR)** | $\approx 0.001\%$ ($1 : 100{,}000$) | Peluang orang asing salah diterima |
| **False Rejection Rate (FRR)** | $\approx 1.2\%$ | Peluang pengguna sah salah ditolak |
| **Liveness Threshold** | 0.52 | Skor gabungan frekuensi, tekstur, dan krominansi |

## Lisensi Model & Etika Privasi

1. **Model ArcFace (InsightFace):** Bobot pretrained `w600k_mbf.onnx` dilisensikan untuk tujuan riset, akademik, dan evaluasi non-komersial di bawah lisensi InsightFace.
2. **Kepatuhan Privasi Biometrik:**
   - Foto mentah (**raw image**) pengguna **TIDAK PERNAH DISIMPAN** di server maupun database.
   - Hanya representasi matematis satu arah (embedding 512 angka) yang dikirimkan ke backend utama.
   - Backend Next.js mengenkripsi embedding menggunakan **AES-256-GCM** sebelum disimpan di database SQLite.
   - Endpoint microservice dilindungi token internal (`X-Internal-Token`) dan hanya dapat diakses melalui loopback `127.0.0.1` dari backend Next.js.
   - Terdapat mekanisme penghapusan biometrik lengkap bagi pengguna (*Right to be Forgotten*).

## Menjalankan Microservice

```bash
cd face-service
python run.py
```
Default port: `8000` (dapat diubah melalui variabel lingkungan `FACE_SERVICE_PORT`).

