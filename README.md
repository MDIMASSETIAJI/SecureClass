# SecureClass — Platform Akademik Berkeamanan Berlapis

**SecureClass** adalah platform pengelolaan tugas dan dokumen akademik dengan sistem keamanan berlapis (*defense-in-depth*) yang mengintegrasikan autentikasi biometrik wajah berbasis kecerdasan buatan (*Deep Learning ArcFace*), *USB Dongle Challenge-Response* (ECDSA P-256), *Super Encryption* (Vigenère + AES-256-GCM), enkripsi berkas *ChaCha20-Poly1305*, steganografi *Least Significant Bit* (LSB), dan rantai audit *tamper-evident hash chain* (SHA-256).

---

## 1. Arsitektur Sistem & Diagram Alur

### A. Diagram Arsitektur Sistem

```mermaid
flowchart TD
    subgraph Browser ["Peramban Web Klien"]
        UI["Antarmuka Pengguna (Next.js & Tailwind CSS)"]
        WebCrypto["Web Crypto API (ECDSA P-256 Signer)"]
        Cam["Webcam Video Stream"]
    end

    subgraph BackendGateway ["Backend Utama (Next.js Server)"]
        RouteHandlers["Next.js Route Handlers (REST API)"]
        SessionMFA["Session MFA Controller (3-Factor Gate)"]
        CryptoCore["Crypto Core (AES-GCM, ChaCha20, Argon2id, Hash Chain)"]
    end

    subgraph InternalMicroservice ["Layanan Biometrik Internal (Python FastAPI)"]
        Detector["Face Detector & Aligner (OpenCV)"]
        Liveness["Anti-Spoofing Engine (2D FFT, Laplacian, YCrCb)"]
        ArcFace["ArcFace Embedding Extractor (ONNX Runtime)"]
    end

    subgraph StorageLayer ["Lapisan Penyimpanan Aman"]
        SQLite[("Database SQLite (dev.db) - Prisma ORM")]
        FileStorage["Storage Berkas Terenkripsi (uploads/encrypted/)"]
    end

    UI -->|"HTTP Cookies & Requests"| RouteHandlers
    WebCrypto -->|"Signature (r || s)"| RouteHandlers
    Cam -->|"Citra Bingkai Webcam (Base64)"| RouteHandlers

    RouteHandlers --> SessionMFA
    RouteHandlers --> CryptoCore
    CryptoCore -->|"Embedding Terenkripsi AES-256-GCM"| SQLite
    CryptoCore -->|"Ciphertext Berkas ChaCha20"| FileStorage
    CryptoCore -->|"Hash Chain SHA-256"| SQLite

    RouteHandlers -->|"Proxy Internal (Token X-Internal-Token, 127.0.0.1:8000)"| InternalMicroservice
    InternalMicroservice --> Detector --> Liveness --> ArcFace
```

---

### B. Diagram Alur Autentikasi Tiga Faktor (Zero-Trust 3FA)

Pengguna **tidak dapat mengakses dashboard** sebelum ketiga lapisan verifikasi berhasil divalidasi secara berurutan.

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna
    participant Client as Web Browser
    participant NextServer as Next.js Backend
    participant FastAPIService as Python Face Microservice
    participant DB as Database SQLite

    Note over User,DB: FAKTOR 1: PASSWORD (ARGON2ID)
    User->>Client: Masukkan Username & Password
    Client->>NextServer: POST /api/auth/login-factor1
    NextServer->>DB: Ambil Argon2id Password Hash
    NextServer->>NextServer: Verifikasi Argon2id (Memory-Hardened)
    NextServer-->>Client: Sesi Parsial (Faktor 1 Lolos, Cookie HttpOnly)

    Note over User,DB: FAKTOR 2: USB DONGLE (ECDSA P-256)
    User->>Client: Hubungkan Flashdisk & Buka dongle.key
    Client->>NextServer: POST /api/auth/dongle/challenge
    NextServer->>DB: Simpan Challenge Nonce 32-Byte (Status PENDING)
    NextServer-->>Client: Challenge Nonce
    Client->>Client: Tandatangani Challenge dengan Private Key via Web Crypto API
    Client->>NextServer: POST /api/auth/dongle/verify (Challenge, Signature, dongleId)
    NextServer->>DB: Ambil Public Key Pemilik dari Tabel Dongle
    NextServer->>NextServer: Verifikasi Signature ECDSA P-256
    NextServer->>DB: Ubah Status Challenge Menjadi USED (Sekali Pakai)
    NextServer-->>Client: Sesi Terbarukan (Faktor 1 & 2 Lolos)

    Note over User,DB: FAKTOR 3: BIOMETRIK WAJAH & LIVENESS (ARCFACE)
    User->>Client: Arahkan Wajah ke Kamera Webcam
    Client->>NextServer: POST /api/auth/face/verify (Citra Base64)
    NextServer->>FastAPIService: POST /pipeline (X-Internal-Token)
    FastAPIService->>FastAPIService: Deteksi Jumlah Wajah == 1
    FastAPIService->>FastAPIService: Analisis Anti-Spoofing (2D FFT, Laplacian, YCrCb)
    FastAPIService->>FastAPIService: Ekstraksi Embedding 512-Dimensi (ArcFace ONNX)
    FastAPIService-->>NextServer: Live Embedding (512 float32, Liveness Score)
    NextServer->>DB: Ambil Embedding Terdaftar (Terenkripsi AES-256-GCM)
    NextServer->>NextServer: Dekripsi Embedding Terdaftar & Hitung Cosine Similarity >= 0.65
    NextServer->>DB: Catat Entri MFA_LOGIN_SUCCESS ke Tamper-Evident Hash Chain
    NextServer-->>Client: 3/3 Faktor Terverifikasi! Akses Dashboard Dibuka
```

---

### C. Diagram Alur Kriptografi

#### 1. Pesan Teks — Super Encryption (Vigenère + AES-256-GCM)
```mermaid
flowchart LR
    P[Plaintext] --> V[Vigenère Substitution]
    V --> L1[Layer 1 Ciphertext]
    L1 --> AES[AES-256-GCM Encryption]
    AES --> C[Final Ciphertext + 12-byte IV + 16-byte Auth Tag]

    C --> DecAES[AES-256-GCM Decryption & Tag Verification]
    DecAES -->|Tag Valid| DecVig[Vigenère Decryption]
    DecAES -->|Tag Rusak| Err[Gagal: Integritas Terkompromi!]
    DecVig --> Org[Plaintext Asli]
```

#### 2. Berkas Akademik — ChaCha20-Poly1305 (RFC 8439)
```mermaid
flowchart LR
    F[Berkas Asli] --> CC[ChaCha20-Poly1305]
    K[Master File Key 256-bit] --> CC
    N[Unique Random Nonce 96-bit] --> CC
    CC --> EF[Ciphertext Berkas (.enc)]
    CC --> AT[Poly1305 MAC 128-bit]
    CC --> SHA[SHA-256 Checksum]
```

---

## 2. Rincian Implementasi Kriptografi

| Komponen | Algoritma | Parameter / Standar | Fungsi & Kebijakan Keamanan |
| :--- | :--- | :--- | :--- |
| **Password Hashing** | **Argon2id** | $m=19456\text{ KB}$, $t=2$, $p=1$ | Perlindungan tahan memori (*memory-hard*) terhadap ASIC/GPU cracking dan serangan *side-channel cache-timing*. |
| **USB Dongle Auth** | **ECDSA P-256** | Kurva NIST prime256v1, SHA-256 | Autentikasi *challenge-response*. Kunci privat tidak pernah keluar dari peramban web (*Web Crypto API*). |
| **Pesan Akademik** | **Super Encryption** | Vigenère + AES-256-GCM | Lapisan substitusi polialfabetik klasik diperkuat enkripsi modern dengan otentikasi data terikat (AEAD). |
| **Enkripsi Berkas** | **ChaCha20-Poly1305** | IETF RFC 8439, 96-bit Nonce, 128-bit Tag | Enkripsi berkas dokumen dipisahkan dari pesan teks. Nonce unik dibuat acak per berkas; penggunaan ulang nonce dicegah secara mutlak. |
| **Data Biometrik** | **AES-256-GCM** | Kunci master biometrik 256-bit, IV 96-bit | Vektor fitur 512-dimensi disimpan dalam keadaan terenkripsi. Foto mentah tidak disimpan. |
| **Pesan Database** | **AES-256-GCM** | IV 12-byte acak, Tag 16-byte | Pesan penting/rahasia dienkripsi sebelum persistensi ke SQLite. |
| **Steganografi** | **LSB + AES-256-GCM** | Format PNG, Magic header `SCST`, RGB bit-0 | Pesan dienkripsi AES-256-GCM terlebih dahulu sebelum disisipkan ke LSB kanal warna citra PNG. |
| **Rantai Audit** | **Tamper-Evident Hash Chain** | SHA-256 | Rantai hash kriptografis `SHA256(index + timestamp + prevHash + dataJson)`. Setiap modifikasi ilegal terdeteksi seketika. |

---

## 3. Akun Evaluasi Bawaan & Berkas Demo Dongle

Database telah dilengkapi tiga akun demonstrasi beserta berkas kunci dongle yang telah terpasangkan dan siap disalin ke flashdisk fisik Anda di folder `demo-dongles/`:

| Role | Username | Email | Password | Berkas Kunci Flashdisk Siap Pakai |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin@secureclass.ac.id` | `AdminPassword123!` | `demo-dongles/admin/dongle.key` |
| **Dosen** | `dosen_budi` | `budi@secureclass.ac.id` | `DosenPassword123!` | `demo-dongles/dosen_budi/dongle.key` |
| **Mahasiswa** | `mhs_ahmad` | `ahmad@secureclass.ac.id` | `MhsPassword123!` | `demo-dongles/mhs_ahmad/dongle.key` |

> **Tips Cepat:** Anda cukup menyalin berkas `dongle.key` dari folder `demo-dongles/mhs_ahmad/` langsung ke root flashdisk USB Anda (misal ke `E:\dongle.key`). Begitu dicolokkan ke port USB, SecureClass akan otomatis mendeteksi flashdisk Anda!

---

## 4. Panduan Menjalankan Aplikasi

### Kebutuhan Sistem
- **Node.js**: v18+ (Direkomendasikan v20+)
- **Python**: v3.10+ (Direkomendasikan v3.11 - v3.13)
- **Webcam**: Kamera aktif pada peramban untuk verifikasi biometrik wajah.

### Langkah 1: Menjalankan Layanan Python Face Recognition
Buka terminal pertama:
```bash
cd face-service
python run.py
```
Layanan akan aktif pada `http://127.0.0.1:8000`. Layanan ini dilindungi token `X-Internal-Token` dan hanya dapat dipanggil oleh backend Next.js.

### Langkah 2: Menyiapkan Database & Menjalankan Next.js Web
Buka terminal kedua:
```bash
cd web

# 1. Pastikan dependensi telah terpasang
npm install

# 2. Sinkronisasi database SQLite
npx prisma db push

# 3. Jalankan seed data akun bawaan
node prisma/seed.js

# 4. Jalankan server pengembangan Next.js
npm run dev
```
Buka peramban di: `http://localhost:3000`.

### Langkah 3: Menjalankan Pengujian Otomatis (Unit & Integration Tests)
```bash
cd web
npm test
```
Seluruh 14 rangkaian pengujian kriptografi dan integrasi database (Argon2id, Vigenère, AES-256-GCM, Super Encryption, ChaCha20-Poly1305, ECDSA P-256, Multi-User Dongle Appending, LSB Steganography, dan Hash Chain Linkage) akan divalidasi dengan status 100% lulus.

---

## 5. Cara Penggunaan Fitur

### A. Pendaftaran Akun Baru 3-Factor Auth (`/register`)
1. **Langkah 1 (Kredensial Akun):** Masukkan Username, Email, Nama Lengkap, Role, dan Password yang kuat. Password di-hash menggunakan Argon2id.
2. **Langkah 2 (Pemasangan Dongle):** Colokkan flashdisk USB Anda. Sistem mendeteksi drive USB secara otomatis dan menyematkan pasangan kunci ECDSA P-256 ke dalam berkas `dongle.key`.
3. **Langkah 3 (Perekaman Biometrik Wajah):** Webcam nyata (un-mirrored) mendeteksi liveness wajah dan mengekstraksi vektor embedding 512 dimensi via ArcFace, yang kemudian dienkripsi menggunakan AES-256-GCM ke database SQLite.

### B. Dukungan Multi-User Dongle (Banyak Pengguna dalam 1 Flashdisk)
- Format berkas `dongle.key` menggunakan arsitektur **Version 2.0 Multi-Key Store**.
- Setiap kali pengguna baru mendaftar atau menulis kunci ke flashdisk yang sama, sistem **tidak menimpa kunci lama**, melainkan menambahkan kunci baru ke dalam daftar `keys`.
- Contoh: Jika 3 orang mendaftar menggunakan flashdisk yang sama, maka `dongle.key` memuat 3 kunci privat independen untuk masing-masing akun. Saat login, sistem otomatis mencocokkan kunci akun yang sedang login.

### C. Perekaman Webcam Nyata (Un-Mirrored Orientation)
- Tampilan webcam pada halaman Login maupun Registrasi telah disesuaikan dengan orientasi spasial dunia nyata (tidak dicerminkan/un-mirrored).
- Frame citra yang diambil untuk ekstraksi liveness FFT dan embedding ArcFace memiliki keselarasan orientasi yang identik dengan tampilan layar pengguna.

### D. Penegakan Hardware USB Dongle (FAT32)
1. **Pemasangan Kunci ke Flashdisk Fisik:**
   - Masuk ke halaman **Pengaturan Keamanan & 3FA** (`/security-settings`) atau buka formulir pada login Faktor 2.
   - Pilih drive flashdisk Anda (misal `E:\`) lalu klik **"Tulis dongle.key ke Flashdisk"** (atau unduh berkas `dongle.key` dan salin ke root direktori flashdisk USB Anda).
   - Sistem menghasilkan kunci kriptografi ECDSA P-256 baru. Kunci publik disimpan di database SQLite, sedangkan materi kunci privat disimpan eksklusif di dalam flashdisk USB.
2. **Penegakan Hardware Lock (Aplikasi Tidak Bisa Dijalankan Tanpa Flashdisk):**
   - **Saat Login Faktor 2:** Sistem secara otomatis memindai seluruh drive komputer (`D:\` s/d `Z:\`) mencari flashdisk fisik yang memuat `dongle.key`. Jika flashdisk tidak dicolokkan, login **terkunci rapat** dan menampilkan status: *"Flashdisk USB Belum Dicolokkan!"*. Begitu flashdisk Anda dicolokkan, sistem mendeteksi drive secara *real-time* dan melakukan verifikasi challenge-response otomatis.
   - **Saat Menggunakan Aplikasi (Hardware Heartbeat Guard):** Jika flashdisk Anda dicabut dari port USB saat Anda sedang berada di dashboard atau halaman manapun, layar aplikasi seketika terkunci dengan tampilan layar penuh: *"⚠️ FLASHDISK USB TERCABUT! Akses dikunci hingga flashdisk dicolokkan kembali"*. Segera setelah flashdisk dicolokkan kembali, aplikasi otomatis terbuka kembali.

### B. Enrollment & Verifikasi Biometrik Wajah
1. Pada login Faktor 3 (atau halaman pengaturan), berikan izin kamera webcam.
2. Centang persetujuan privasi biometrik (*Privacy Consent*).
3. Posisikan wajah tepat di dalam lingkaran panduan oval.
4. Sistem memeriksa liveness (anti-spoofing) dan mengekstrak embedding ArcFace 512-dimensi.
5. Embedding dienkripsi dengan AES-256-GCM ke database. Citra foto mentah langsung dimusnahkan dari memori.

### C. Pengiriman Pesan Terenkripsi (Super Encryption: Dua Tombol Encrypt & Decrypt)
1. Buka menu **Pesan Terenkripsi (Super)** (`/messaging`).
2. **Operasi 1 — Tombol ENCRYPT:**
   - Masukkan isi pesan dan tentukan **Kunci Enkripsi (Vigenère Key)** Anda (misal: `KRIPTO2026`).
   - Klik tombol **"ENCRYPT (Uji)"** untuk melihat pratinjau transformasi matematis (Layer 1 Vigenère dan Layer 2 AES-256-GCM) atau klik **"ENCRYPT & Kirim"** untuk mengirim pesan ke kontak.
3. **Operasi 2 — Tombol DECRYPT:**
   - Pada kotak masuk (atau tab alat dekripsi), klik tombol **"DECRYPT"**.
   - Pengguna **wajib memasukkan kunci dekripsi** yang cocok. Jika kunci salah, dekripsi ditolak; jika benar, plaintext asli terbuka dengan status integritas Auth Tag valid.

### D. Enkripsi Berkas Dokumen (ChaCha20-Poly1305: Dua Opsi Pembuktian)
1. Buka menu **Enkripsi Berkas (ChaCha20)** (`/file-encryption`).
2. Unggah dokumen apa saja (PDF, DOCX, ZIP, TXT).
3. **Opsi 1 — Proteksi Password Berkas:** Anda dapat memasukkan password pengaman berkas. Saat berkas hendak dibuka/didekripsi kembali, sistem wajib meminta password ini. Jika password salah, validasi tag Poly1305 akan menolak dekripsi.
4. **Opsi 2 — Isi Berkas Amburadul:** Sistem menyediakan tombol **"Unduh File .enc (Isi Amburadul)"**. Jika berkas ini dibuka langsung di Notepad atau aplikasi pembaca teks, isinya 100% berupa karakter acak tak terbaca / ciphertext biner ChaCha20 murni sebagai bukti nyata enkripsi.
5. Pada tab **Daftar & Dekripsi**, pengguna dapat memasukkan password untuk memulihkan berkas kembali ke kondisi semula.

### E. Steganografi LSB (Penyisipan Pesan ke PNG)
1. Buka menu **Steganografi LSB** (`/steganography`).
2. Masukkan citra pembawa PNG dan pesan rahasia.
3. Pesan dienkripsi dengan AES-256-GCM, lalu bit payload disisipkan ke LSB kanal warna RGB.
4. Unduh citra stego yang dihasilkan.
5. Pada tab **Ekstraksi**, unggah citra stego untuk memulihkan pesan rahasia.

### F. Inspeksi & Simulasi Perusakan Blockchain (Tamper-Evidence)
1. Buka menu **Blockchain (Hash Chain)** (`/blockchain`).
2. Klik **"Validasi Rantai Hash"** untuk memverifikasi seluruh blok audit.
3. Sebagai admin, klik tombol **"Simulasikan Modifikasi Blok #1"** untuk menyuntikkan muatan ilegal.
4. Rantai seketika berubah merah dan menunjukkan titik manipulasi yang terdeteksi secara presisi.
5. Klik **"Pulihkan Rantai"** untuk menghitung ulang hash yang sah.

---

## 6. Keterbatasan Keamanan & Catatan Etika Privasi

1. **USB Flashdisk FAT32:** Flashdisk biasa bukanlah *Hardware Security Module (HSM)* atau *Secure Enclave* bersertifikasi FIPS. Berkas `dongle.key` pada flashdisk secara fisik dapat disalin jika flashdisk dipinjamkan atau dicuri. Oleh sebab itu, SecureClass menerapkan *Defense-in-Depth*: kepemilikan dongle wajib digabungkan dengan pengetahuan Password Argon2id dan keberadaan fisik Biometrik Wajah Liveness.
2. **Tamper-Evident Hash Chain:** Rantai hash dalam satu database SQLite dapat dihitung ulang oleh pengguna dengan hak akses DBA/root. Hash chain menjamin *tamper-evidence* (pendeteksian manipulasi oleh aplikasi), bukan imutabilitas terdesentralisasi tanpa izin.
3. **Privasi Biometrik (Right to be Forgotten):** Pengguna dapat menghapus seluruh profil biometrik wajah terenkripsi mereka kapan saja melalui tombol *Hapus Data Biometrik* pada Pengaturan Keamanan.

#   S e c u r e C l a s s  
 