const { PrismaClient } = require("@prisma/client");
const argon2 = require("@node-rs/argon2");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function resetToSingleAdmin() {
  console.log("=== MEMULAI RESET DATABASE KE 1 AKUN ADMIN TUNGGAL ===");

  // 1. Bersihkan seluruh data relasi & user
  console.log("1. Membersihkan seluruh data transaksi dan user lama...");
  await prisma.auditLog.deleteMany();
  await prisma.blockchainBlock.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.academicDocument.deleteMany();
  await prisma.academicTask.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.secureMessage.deleteMany();
  await prisma.encryptedFile.deleteMany();
  await prisma.steganographyRecord.deleteMany();
  await prisma.faceProfile.deleteMany();
  await prisma.dongleChallenge.deleteMany();
  await prisma.dongle.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash password 'Admin123!' menggunakan Argon2id
  console.log("2. Menghasilkan hash Argon2id untuk password 'Admin123!'...");
  const adminPasswordHash = await argon2.hash("Admin123!", {
    algorithm: argon2.Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // 3. Buat 1 akun Admin tunggal
  console.log("3. Membuat akun Admin tunggal di database...");
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@secureclass.ac.id",
      fullName: "Administrator Institusi",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      passwordChangedAt: null, // Password bawaan awal
      avatar: "shield",
    },
  });

  // 4. Inisialisasi Genesis Block (#0) di Blockchain
  console.log("4. Menginisialisasi Genesis Block (#0) pada rantai blockchain...");
  const genesisTimestamp = new Date();
  const genesisPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  const genesisData = JSON.stringify({
    message: "GENESIS BLOCK: SecureClass Academic Ledger Initialized",
    version: "1.0",
    author: "SecureClass Core Cryptography",
    adminCreated: admin.username,
  });
  const genesisHash = crypto
    .createHash("sha256")
    .update(`0:${genesisTimestamp.toISOString()}:${genesisPrevHash}:${genesisData}`)
    .digest("hex");

  await prisma.blockchainBlock.create({
    data: {
      index: 0,
      timestamp: genesisTimestamp,
      action: "GENESIS",
      userId: admin.id,
      dataJson: genesisData,
      previousHash: genesisPrevHash,
      currentHash: genesisHash,
    },
  });

  // 5. Catat audit log inisialisasi
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SYSTEM_INITIALIZED",
      category: "AUTH",
      details: JSON.stringify({
        message: "Sistem diinisialisasi ulang dengan 1 akun Administrator tunggal.",
        username: admin.username,
        role: admin.role,
        algorithm: "Argon2id + SHA-256 Genesis",
      }),
    },
  });

  console.log("\n=======================================================");
  console.log("   BERHASIL: Database berhasil direset!");
  console.log(`   ID        : ${admin.id}`);
  console.log(`   Username  : ${admin.username}`);
  console.log(`   Email     : ${admin.email}`);
  console.log(`   Role      : ${admin.role}`);
  console.log(`   Password  : Admin123!`);
  console.log(`   Hash      : ${adminPasswordHash}`);
  console.log(`   Genesis   : ${genesisHash}`);
  console.log("=======================================================\n");
}

resetToSingleAdmin()
  .catch((e) => {
    console.error("Gagal mereset database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

