const { PrismaClient } = require("@prisma/client");
const argon2 = require("@node-rs/argon2");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const BIOMETRIC_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || "f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221100";

function encryptBiometricEmbedding(embeddingArray, keyHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const data = Buffer.from(JSON.stringify(embeddingArray), "utf8");
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedEmbedding: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

function generateDongleForUser(userId, username) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const dongleId = `DGL-${username.toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const dongleKeyFile = {
    format: "SECURECLASS_DONGLE_KEY",
    version: "1.0",
    dongleId,
    userId,
    username,
    createdAt: new Date().toISOString(),
    keyMaterial: {
      curve: "P-256",
      algorithm: "ECDSA",
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
    },
    securityNotice:
      "PEMBERITAHUAN KEAMANAN KRIPTOGRAFI: Flashdisk FAT32 bertindak sebagai media penyimpan berkas fisik. Keamanan menyeluruh SecureClass dijaga melalui Defense-in-Depth (Password Argon2id + USB Dongle ECDSA + ArcFace Biometrics).",
  };

  return { dongleId, publicKeyPem: publicKey, dongleKeyFile };
}

async function main() {
  console.log("Seeding SecureClass database with 3FA credentials...");

  // Clean old records
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

  // Create Users with Argon2id Password Hashing
  const adminPassHash = await argon2.hash("Admin123!", { algorithm: argon2.Algorithm.Argon2id });
  const dosenPassHash = await argon2.hash("DosenPassword123!", { algorithm: argon2.Algorithm.Argon2id });
  const mhsPassHash = await argon2.hash("MhsPassword123!", { algorithm: argon2.Algorithm.Argon2id });

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@secureclass.ac.id",
      fullName: "Administrator Keamanan Siber",
      role: "ADMIN",
      passwordHash: adminPassHash,
      avatar: "shield",
    },
  });

  const dosen = await prisma.user.create({
    data: {
      username: "dosen_budi",
      email: "budi@secureclass.ac.id",
      fullName: "Dr. Ir. Budi Santoso, M.Kom.",
      role: "DOSEN",
      passwordHash: dosenPassHash,
      avatar: "book-open",
    },
  });

  const mhs = await prisma.user.create({
    data: {
      username: "mhs_ahmad",
      email: "ahmad@secureclass.ac.id",
      fullName: "Ahmad Fauzi (NIM: 13522001)",
      role: "MAHASISWA",
      passwordHash: mhsPassHash,
      avatar: "graduation-cap",
    },
  });

  console.log("Created users: Admin, Dosen, Mahasiswa");

  // Create Dongles and write demo-dongles files
  const demoDonglesDir = path.join(__dirname, "..", "..", "demo-dongles");
  if (!fs.existsSync(demoDonglesDir)) {
    fs.mkdirSync(demoDonglesDir, { recursive: true });
  }

  const users = [admin, dosen, mhs];
  for (const u of users) {
    const dongleData = generateDongleForUser(u.id, u.username);

    // Save active dongle in SQLite
    await prisma.dongle.create({
      data: {
        userId: u.id,
        dongleId: dongleData.dongleId,
        publicKeyPem: dongleData.publicKeyPem,
        label: `Flashdisk ${u.username}`,
        status: "ACTIVE",
      },
    });

    // Write file to demo-dongles/{username}/dongle.key
    const userDongleDir = path.join(demoDonglesDir, u.username);
    if (!fs.existsSync(userDongleDir)) fs.mkdirSync(userDongleDir, { recursive: true });
    fs.writeFileSync(
      path.join(userDongleDir, "dongle.key"),
      JSON.stringify(dongleData.dongleKeyFile, null, 2),
      "utf8"
    );

    // Also register an encrypted Face Profile baseline
    // 512-dim normalized vector
    const syntheticEmbedding = Array.from({ length: 512 }, () => (Math.random() - 0.5) / 10);
    const norm = Math.sqrt(syntheticEmbedding.reduce((sum, v) => sum + v * v, 0));
    const normalized = syntheticEmbedding.map((v) => v / norm);

    const encryptedBio = encryptBiometricEmbedding(normalized, BIOMETRIC_KEY);
    await prisma.faceProfile.create({
      data: {
        userId: u.id,
        encryptedEmbedding: encryptedBio.encryptedEmbedding,
        iv: encryptedBio.iv,
        authTag: encryptedBio.authTag,
        livenessConfidence: 0.95,
        status: "ACTIVE",
      },
    });
  }

  console.log("Generated & registered Dongles and Face Profiles. Exported to demo-dongles/");

  // Create Course
  const course = await prisma.course.create({
    data: {
      code: "IF301",
      name: "Kriptografi dan Keamanan Informasi",
      description: "Eksplorasi mendalam tentang Super Encryption, ChaCha20-Poly1305, Biometrik AI, dan Hash Chains.",
      lecturerId: dosen.id,
    },
  });

  // Enroll Student
  await prisma.courseEnrollment.create({
    data: {
      courseId: course.id,
      studentId: mhs.id,
    },
  });

  // Create Academic Task
  const task = await prisma.academicTask.create({
    data: {
      courseId: course.id,
      createdById: dosen.id,
      title: "Tugas 1: Desain dan Implementasi Autentikasi Tiga Faktor (3FA)",
      description: "Rancang laporan komprehensif mengenai mitigasi serangan replay pada biometrik dan kelemahan USB flash drive FAT32 biasa. Kumpulkan dokumen dalam format terenkripsi ChaCha20-Poly1305.",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  });

  // Initialize Genesis Block for Tamper-Evident Hash Chain
  const genesisTimestamp = new Date("2026-01-01T00:00:00.000Z");
  const genesisPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  const genesisData = JSON.stringify({
    action: "GENESIS",
    description: "SecureClass Tamper-Evident Hash Chain Genesis Block",
    version: "1.0",
    author: "SecureClass Core Cryptography",
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
      dataJson: genesisData,
      previousHash: genesisPrevHash,
      currentHash: genesisHash,
    },
  });

  // Block 1: Academic Task Published
  const block1Timestamp = new Date();
  const block1Data = JSON.stringify({
    action: "TASK_PUBLISHED",
    taskId: task.id,
    courseCode: course.code,
    lecturer: dosen.username,
  });
  const block1Hash = crypto
    .createHash("sha256")
    .update(`1:${block1Timestamp.toISOString()}:${genesisHash}:${block1Data}`)
    .digest("hex");

  await prisma.blockchainBlock.create({
    data: {
      index: 1,
      timestamp: block1Timestamp,
      action: "TASK_PUBLISHED",
      userId: dosen.id,
      targetId: task.id,
      dataJson: block1Data,
      previousHash: genesisHash,
      currentHash: block1Hash,
    },
  });

  console.log("Seeded Course, Task, and Genesis Tamper-Evident Hash Chain!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
