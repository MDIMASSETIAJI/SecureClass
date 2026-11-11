import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { ChaChaFileCipher } from "@/lib/crypto/chacha20-poly1305";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CHACHA_KEY = process.env.CHACHA_FILE_KEY || "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "encrypted");

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = (formData.get("courseId") as string) || null;
    const title = (formData.get("title") as string) || file?.name || "Berkas Akademik";
    const password = (formData.get("password") as string)?.trim() || "";

    if (!file) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
    }

    // Explicit file size check (max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Ukuran berkas melebihi batas maksimum (${MAX_SIZE / (1024 * 1024)} MB).` },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Key derivation: if user specified password, derive key using salt + password
    let encryptionKey = CHACHA_KEY;
    let passwordSalt: string | null = null;
    const isPasswordProtected = Boolean(password);

    if (isPasswordProtected) {
      passwordSalt = crypto.randomBytes(16).toString("hex");
      encryptionKey = ChaChaFileCipher.deriveKeyFromPassword(password, passwordSalt, CHACHA_KEY);
    }

    // Encrypt with ChaCha20-Poly1305 (Fresh unique 96-bit nonce)
    const encryptedResult = ChaChaFileCipher.encryptFile(fileBuffer, encryptionKey, 1);

    // Save encrypted ciphertext to storage with random UUID
    const storageFileName = `${crypto.randomUUID()}.enc`;
    const storagePath = path.join(UPLOAD_DIR, storageFileName);
    fs.writeFileSync(storagePath, encryptedResult.encryptedBuffer);

    // Prepare preview of the "amburadul" scrambled ciphertext (first 128 bytes)
    const previewLength = Math.min(128, encryptedResult.encryptedBuffer.length);
    const amburadulSample = encryptedResult.encryptedBuffer
      .subarray(0, previewLength)
      .toString("binary")
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
    const amburadulHex = encryptedResult.encryptedBuffer
      .subarray(0, Math.min(64, encryptedResult.encryptedBuffer.length))
      .toString("hex")
      .match(/.{1,2}/g)
      ?.join(" ") || "";

    // Sanitize original filename to prevent path traversal
    const safeOriginalName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");

    // Save record to database
    const encryptedFile = await prisma.encryptedFile.create({
      data: {
        originalName: safeOriginalName,
        mimeType: file.type || "application/octet-stream",
        originalSize: file.size,
        encryptedSize: encryptedResult.encryptedBuffer.length,
        storagePath: storageFileName,
        algorithm: "ChaCha20-Poly1305",
        nonce: encryptedResult.nonce,
        authTag: encryptedResult.authTag,
        keyVersion: 1,
        checksumSha256: encryptedResult.checksumSha256,
        isPasswordProtected,
        passwordSalt,
        uploadedById: session.userId,
      },
    });

    // If attached to a course document, create AcademicDocument record
    if (courseId) {
      await prisma.academicDocument.create({
        data: {
          courseId,
          uploadedById: session.userId,
          title,
          encryptedFileId: encryptedFile.id,
          isProtected: true,
        },
      });
    }

    // Record to Blockchain Tamper-Evident Hash Chain
    await BlockchainService.appendBlock(
      "FILE_ENCRYPTED_UPLOAD",
      {
        fileId: encryptedFile.id,
        filename: safeOriginalName,
        algorithm: "ChaCha20-Poly1305",
        checksumSha256: encryptedResult.checksumSha256,
        uploadedBy: session.user.username,
      },
      session.userId,
      encryptedFile.id
    );

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FILE_ENCRYPTED_UPLOAD",
        category: "CRYPTO",
        details: JSON.stringify({
          fileId: encryptedFile.id,
          originalName: safeOriginalName,
          algorithm: "ChaCha20-Poly1305",
          originalSize: file.size,
          encryptedSize: encryptedResult.encryptedBuffer.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      fileId: encryptedFile.id,
      originalName: safeOriginalName,
      originalSize: file.size,
      encryptedSize: encryptedResult.encryptedBuffer.length,
      checksumSha256: encryptedResult.checksumSha256,
      algorithm: "ChaCha20-Poly1305",
      isPasswordProtected,
      amburadulHex,
      amburadulSample,
      message: "Berkas berhasil dienkripsi menggunakan ChaCha20-Poly1305 dan disimpan dengan aman.",
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengenkripsi dan mengunggah berkas." },
      { status: 500 }
    );
  }
}

