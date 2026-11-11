const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspectDatabase() {
  console.log("\n=======================================================");
  console.log("   SECURECLASS DATABASE CRYPTOGRAPHIC INSPECTION");
  console.log("   Lokasi Berkas DB: web/prisma/dev.db (SQLite)");
  console.log("=======================================================\n");

  // 1. User & Password Hash (Argon2id)
  console.log("1. TABEL USER: HASH PASSWORD (ARGON2ID)");
  console.log("-------------------------------------------------------");
  const users = await prisma.user.findMany({
    select: {
      username: true,
      fullName: true,
      role: true,
      passwordHash: true,
      passwordChangedAt: true,
    },
  });

  if (users.length === 0) {
    console.log("   (Belum ada data user)");
  } else {
    users.forEach((u, i) => {
      console.log(`[#${i + 1}] Username : ${u.username} (${u.fullName})`);
      console.log(`     Role     : ${u.role}`);
      console.log(`     Algoritma: Argon2id (Memory-Hardened)`);
      console.log(`     Hash     : ${u.passwordHash}`);
      console.log(`     Ganti Pwd: ${u.passwordChangedAt ? u.passwordChangedAt.toISOString() : "Belum diubah (Password Default Admin)"}`);
      console.log("");
    });
  }

  // 2. Face Biometrics (AES-256-GCM)
  console.log("2. TABEL FACE PROFILE: BIOMETRIK WAJAH (AES-256-GCM)");
  console.log("-------------------------------------------------------");
  const faces = await prisma.faceProfile.findMany({
    include: {
      user: {
        select: { username: true, fullName: true },
      },
    },
  });

  if (faces.length === 0) {
    console.log("   (Belum ada data biometrik yang didaftarkan)");
  } else {
    faces.forEach((f, i) => {
      console.log(`[#${i + 1}] User      : ${f.user?.username} (${f.user?.fullName})`);
      console.log(`     Algoritma : AES-256-GCM (Authenticated Encryption)`);
      console.log(`     IV (12-B) : ${f.iv}`);
      console.log(`     Auth Tag  : ${f.authTag}`);
      console.log(`     Liveness  : ${f.livenessConfidence}`);
      console.log(`     Ciphertext: ${f.encryptedEmbedding.substring(0, 60)}... [Total: ${f.encryptedEmbedding.length} karakter Base64]`);
      console.log(`     Status    : ${f.status} (Citra mentah tidak pernah disimpan)`);
      console.log("");
    });
  }

  // 3. Encrypted Files (ChaCha20-Poly1305)
  console.log("3. TABEL ENCRYPTED FILES: BERKAS AKADEMIK (CHACHA20-POLY1305)");
  console.log("-------------------------------------------------------");
  const files = await prisma.encryptedFile.findMany({
    include: {
      uploader: { select: { username: true } },
    },
  });

  if (files.length === 0) {
    console.log("   (Belum ada berkas terenkripsi)");
  } else {
    files.forEach((file, i) => {
      console.log(`[#${i + 1}] Berkas    : ${file.originalName} (${file.mimeType})`);
      console.log(`     Uploader  : ${file.uploader?.username}`);
      console.log(`     Algoritma : ${file.algorithm}`);
      console.log(`     Nonce/IV  : ${file.nonce}`);
      console.log(`     Auth Tag  : ${file.authTag}`);
      console.log(`     Ukuran    : Original ${file.originalSize} B -> Encrypted ${file.encryptedSize} B`);
      console.log(`     Checksum  : SHA-256 ${file.checksumSha256}`);
      console.log("");
    });
  }

  // 4. Secure Messages (Super Encryption: Vigenère + AES-256-GCM)
  console.log("4. TABEL SECURE MESSAGES: PESAN RAHASIA (VIGENÈRE + AES-256-GCM)");
  console.log("-------------------------------------------------------");
  const messages = await prisma.secureMessage.findMany({
    include: {
      sender: { select: { username: true } },
      receiver: { select: { username: true } },
    },
  });

  if (messages.length === 0) {
    console.log("   (Belum ada pesan terenkripsi)");
  } else {
    messages.forEach((m, i) => {
      console.log(`[#${i + 1}] Dari -> Ke: ${m.sender?.username} -> ${m.receiver?.username}`);
      console.log(`     Algoritma : ${m.algorithm}`);
      console.log(`     IV (Hex)  : ${m.iv}`);
      console.log(`     Auth Tag  : ${m.authTag}`);
      console.log(`     Ciphertext: ${m.ciphertext.substring(0, 60)}...`);
      console.log("");
    });
  }

  // 5. USB Dongle Keys (ECDSA P-256)
  console.log("5. TABEL DONGLE: KUNCI USB FISIK (ECDSA P-256)");
  console.log("-------------------------------------------------------");
  const dongles = await prisma.dongle.findMany({
    include: {
      user: { select: { username: true } },
    },
  });

  if (dongles.length === 0) {
    console.log("   (Belum ada kunci dongle USB terdaftar)");
  } else {
    dongles.forEach((d, i) => {
      console.log(`[#${i + 1}] Dongle ID : ${d.dongleId}`);
      console.log(`     Pemilik   : ${d.user?.username}`);
      console.log(`     Public Key: ${d.publicKeyPem.replace(/\r?\n|\r/g, " ").substring(0, 60)}...`);
      console.log(`     Status    : ${d.status}`);
      console.log("");
    });
  }

  // 6. Blockchain Audit Trail (SHA-256 Hash Chain)
  console.log("6. TABEL BLOCKCHAIN: LOG AUDIT INTEGRITAS (SHA-256 HASH CHAIN)");
  console.log("-------------------------------------------------------");
  const blocks = await prisma.blockchainBlock.findMany({
    take: 5,
    orderBy: { index: "asc" },
  });

  if (blocks.length === 0) {
    console.log("   (Belum ada blok audit chain)");
  } else {
    blocks.forEach((b) => {
      console.log(`[Blok #${b.index}] Hash     : ${b.currentHash}`);
      console.log(`          Prev Hash: ${b.previousHash}`);
      console.log(`          Action   : ${b.action} | Waktu: ${b.timestamp.toISOString()}`);
    });
    const totalBlocks = await prisma.blockchainBlock.count();
    if (totalBlocks > 5) {
      console.log(`   ... dan ${totalBlocks - 5} blok lainnya.`);
    }
  }

  console.log("\n=======================================================\n");
}

inspectDatabase()
  .catch((err) => {
    console.error("Gagal memeriksa database:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
