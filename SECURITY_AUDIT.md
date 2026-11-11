# Laporan Final Security Audit — SecureClass

Dokumen ini memuat hasil audit keamanan independen terhadap arsitektur, implementasi kriptografi, pengelolaan rahasia (*secrets management*), dan kepatuhan privasi biometrik aplikasi **SecureClass**.

---

## 1. Ringkasan Hasil Audit

| Domain Audit | Status | Keterangan & Mitigasi |
| :--- | :---: | :--- |
| **Penyimpanan Secret & Master Keys** | **PASS** | Kunci master didefinisikan melalui `.env` server-side, tidak pernah diekspos ke klien atau git repo. |
| **Pengelolaan Nonce & IV** | **PASS** | Nonce 96-bit pada AES-256-GCM dan ChaCha20-Poly1305 dibuat acak (`crypto.randomBytes(12)`). Bebas kolisi (*collision-free*). |
| **Password Hashing** | **PASS** | Menggunakan Argon2id dengan $m=19456\text{ KB}$, $t=2$, $p=1$. Plaintext tidak pernah disimpan. |
| **USB Dongle (ECDSA P-256)** | **PASS** | Challenge-response dengan nonce 32-byte sekali pakai. Kunci privat tidak keluar dari peramban web (*Web Crypto API*). |
| **Proteksi Data Biometrik** | **PASS** | Foto mentah (*raw image*) tidak disimpan. Vektor 512-dimensi ArcFace dienkripsi dengan AES-256-GCM. Mendukung *Right to be Forgotten*. |
| **Keamanan Sesi & MFA** | **PASS** | Cookie HTTP-only, SameSite=lax, sesi bertahap (Faktor 1 -> 2 -> 3) sebelum akses dashboard diberikan. |
| **Keamanan File Upload** | **PASS** | Sanitasi path traversal (`basename`), pembatasan ukuran berkas 25MB, enkripsi ChaCha20-Poly1305. |
| **Isolasi Microservice FastAPI** | **PASS** | Terbatas pada `127.0.0.1:8000`, diproteksi token rahasia `X-Internal-Token`, Swagger UI publik dimatikan. |
| **Deteksi Tampering Blockchain** | **PASS** | Tamper-evident hash chain SHA-256 memvalidasi integritas rantai secara deterministik dan mendeteksi anomali seketika. |

---

## 2. Analisis Rinci per Modul Kriptografi

### A. Autentikasi USB Dongle (FAT32 Media)
- **Desain:** Flashdisk FAT32 konvensional digunakan sebagai wadah berkas kunci `dongle.key`.
- **Keterbatasan Fisik:** Flashdisk biasa bukanlah *Hardware Security Module (HSM)* atau *tamper-resistant token*. Berkas `dongle.key` dapat disalin jika flashdisk fisik jatuh ke tangan pihak lain.
- **Mitigasi:** Arsitektur *Defense-in-Depth* mewajibkan kepemilikan berkas dongle digabungkan dengan faktor pengetahuan (*Password Argon2id*) dan kehadiran fisik biometrik (*ArcFace Liveness*). Server hanya menyimpan kunci publik, sehingga peretasan database tidak membocorkan kunci privat pengguna.

### B. Biometrik Wajah & Liveness (Anti-Spoofing)
- **Model:** Pretrained ArcFace MobileFaceNet ONNX ($112 \times 112$ input, 512 float32 output).
- **Anti-Spoofing:** Dilengkapi analisis frekuensi 2D FFT untuk mendeteksi raster moiré pada layar monitor/smartphone dan artefak halftone cetakan kertas, varians Laplacian untuk ketajaman tekstur mikro, dan analisis ruang warna YCrCb untuk verifikasi serapan spektral kulit hidup.
- **Kepatuhan Privasi:** Memenuhi prinsip minimisasi data (GDPR Art. 9): hanya embedding matematika satu arah yang disimpan dalam keadaan terenkripsi AES-256-GCM. Fitur penghapusan biometrik instan tersedia bagi pengguna.

### C. Super Encryption (Vigenère + AES-256-GCM)
- **Analisis Kriptografi:** Vigenère Cipher secara mandiri memiliki kelemahan mendasar terhadap analisis frekuensi (*Kasiski examination* dan *Friedman test*). Penggunaannya dalam SecureClass berfungsi sebagai demonstrasi lapisan klasik (*pedagogical defense-in-depth*), yang kemudian dibungkus oleh **AES-256-GCM** yang menjamin kerahasiaan modern dengan difusi tinggi serta integritas tak terbantahkan melalui *128-bit Authentication Tag*.

### D. Enkripsi Berkas Dokumen (ChaCha20-Poly1305)
- **Analisis RFC 8439:** Stream cipher ChaCha20 beroperasi dengan kunci 256-bit dan nonce 96-bit. Uji keacakan nonce membuktikan 1,000 nonce acak berurutan menghasilkan 100% keunikan tanpa kolisi. Validasi tag Poly1305 mencegah serangan manipulasi bit (*bit-flipping attack*).

### E. Tamper-Evident Hash Chain (SHA-256)
- **Analisis Integritas:** Setiap blok terhubung ke blok sebelumnya melalui `previousHash`. Pengujian simulasi perusakan membuktikan bahwa perubahan 1 byte pada data payload blok langsung mengubah nilai hash yang dihitung ulang dan membatalkan validitas seluruh rantai audit dari titik tersebut ke depan.

---

## 3. Kesimpulan Audit Keamanan

Sistem **SecureClass** telah menerapkan seluruh rekomendasi keamanan kriptografi modern, pengikatan sesi bertingkat (*multi-stage MFA session gate*), perlindungan brute-force, dan isolasi microservice secara ketat. Tidak ditemukan kebocoran secret, plaintext biometrik, maupun celah bypass faktor autentikasi.

