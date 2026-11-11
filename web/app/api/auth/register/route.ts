import { NextRequest, NextResponse } from "next/server";
import { hashPassword, validatePasswordStrength } from "@/lib/crypto/argon2";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
import { UsbDetectorService } from "@/lib/crypto/usb-detector";
import { FaceServiceClient } from "@/lib/face-client";
import { AesGcmCipher } from "@/lib/crypto/aes-gcm";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const BIOMETRIC_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || "f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221100";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      username,
      email,
      role = "MAHASISWA",
      password,
      imageBase64,
      driveLetter,
      existingDongleContent,
    } = body;

    // 1. Input validations
    if (!fullName || !username || !email || !password) {
      return NextResponse.json(
        { error: "Nama lengkap, username, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Perekaman biometrik wajah dari kamera webcam wajib dilakukan saat registrasi akun." },
        { status: 400 }
      );
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: cleanEmail }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username atau email sudah digunakan oleh pengguna lain." },
        { status: 400 }
      );
    }

    // Password strength check
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.errors.join(" ") },
        { status: 400 }
      );
    }

    // 2. Face Biometrics extraction & liveness verification
    const faceResult = await FaceServiceClient.runPipeline(imageBase64, true, 0.52);

    if (!faceResult.success || !faceResult.embedding) {
      return NextResponse.json(
        {
          error: `Pendaftaran biometrik gagal: ${faceResult.message}`,
          errorCode: faceResult.error_code,
          livenessScore: faceResult.liveness_score,
        },
        { status: 400 }
      );
    }

    // Encrypt 512-dim face embedding with AES-256-GCM
    const encryptedBio = AesGcmCipher.encryptEmbedding(faceResult.embedding, BIOMETRIC_KEY);

    // 3. Argon2id password hash
    const passwordHash = await hashPassword(password);

    // 4. Generate unique user ID and ECDSA P-256 Dongle Keypair for this user
    const userId = crypto.randomUUID();
    const { dongleId, publicKeyPem, keyItem, dongleKeyFile } = EcdsaDongleService.generateDongleKey(
      userId,
      cleanUsername
    );

    // 5. If USB flash drive is connected, write/sync system dongle key silently
    try {
      const targetDrive = driveLetter || UsbDetectorService.scanConnectedDongle().drive;
      if (targetDrive) {
        UsbDetectorService.appendDongleKeyToDrive(targetDrive, keyItem);
      }
    } catch (usbErr) {
      console.warn("Drive write skipped during registration:", usbErr);
    }

    // 6. Save in SQLite Database via Transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Create user
      const createdUser = await tx.user.create({
        data: {
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          fullName: fullName.trim(),
          role: role.toUpperCase(),
          passwordHash,
        },
      });

      // Create active dongle credential
      await tx.dongle.create({
        data: {
          userId: createdUser.id,
          dongleId,
          publicKeyPem,
          label: `USB Dongle (@${cleanUsername})`,
          status: "ACTIVE",
        },
      });

      // Create encrypted face profile
      await tx.faceProfile.create({
        data: {
          userId: createdUser.id,
          encryptedEmbedding: encryptedBio.encryptedEmbedding,
          iv: encryptedBio.iv,
          authTag: encryptedBio.authTag,
          livenessConfidence: faceResult.liveness_score,
          status: "ACTIVE",
        },
      });

      return createdUser;
    });

    // 7. Record to Blockchain Tamper-Evident Hash Chain
    await BlockchainService.appendBlock(
      "USER_REGISTERED_3FA",
      {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        dongleId,
        faceLivenessScore: faceResult.liveness_score,
      },
      newUser.id,
      newUser.id
    );

    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: "USER_REGISTERED_3FA",
        category: "AUTH",
        details: JSON.stringify({
          message: "Pengguna baru berhasil mendaftar lengkap dengan Password Argon2id, USB Dongle ECDSA P-256, dan Biometrik Wajah ArcFace terenkripsi AES-256-GCM.",
          dongleId,
          livenessScore: faceResult.liveness_score,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
      dongleId,
      dongleKeyFile,
      message: "Registrasi berhasil! Akun Anda telah terdaftar secara aman dengan Password Argon2id dan Biometrik Wajah AI ArcFace.",
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses pendaftaran akun." },
      { status: 500 }
    );
  }
}

