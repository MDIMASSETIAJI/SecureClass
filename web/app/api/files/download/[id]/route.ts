import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { ChaChaFileCipher } from "@/lib/crypto/chacha20-poly1305";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const CHACHA_KEY = process.env.CHACHA_FILE_KEY || "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "encrypted");

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const fileId = params.id;

    const fileRecord = await prisma.encryptedFile.findUnique({
      where: { id: fileId },
      include: {
        documents: true,
        submissions: true,
      },
    });

    if (!fileRecord) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }

    // Role and ownership check
    const isOwner = fileRecord.uploadedById === session.userId;
    const isAdmin = session.user.role === "ADMIN";
    const isLecturer = session.user.role === "DOSEN";
    // Check if user is lecturer of course or authorized student
    if (!isOwner && !isAdmin && !isLecturer) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mengunduh berkas ini." },
        { status: 403 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, fileRecord.storagePath);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Berkas fisik terenkripsi tidak ditemukan di server penyimpanan." },
        { status: 404 }
      );
    }

    // Check query params
    const mode = req.nextUrl.searchParams.get("mode"); // "raw" / "encrypted"
    const infoOnly = req.nextUrl.searchParams.get("info") === "true";
    const password = req.nextUrl.searchParams.get("password")?.trim() || "";

    // If client just wants metadata check
    if (infoOnly) {
      return NextResponse.json({
        success: true,
        fileId: fileRecord.id,
        originalName: fileRecord.originalName,
        originalSize: fileRecord.originalSize,
        encryptedSize: fileRecord.encryptedSize,
        isPasswordProtected: fileRecord.isPasswordProtected,
        algorithm: fileRecord.algorithm,
        checksumSha256: fileRecord.checksumSha256,
      });
    }

    // Read encrypted ciphertext buffer
    const encryptedBuffer = fs.readFileSync(filePath);

    // MODE 2: DOWNLOAD AMBURADUL (RAW CIPHERTEXT)
    // Unduh berkas terenkripsi langsung (.enc) yang isinya acak / amburadul jika dibuka di text editor
    if (mode === "raw" || mode === "encrypted") {
      const encFileName = fileRecord.originalName.endsWith(".enc")
        ? fileRecord.originalName
        : `${fileRecord.originalName}.enc`;

      return new NextResponse(new Uint8Array(encryptedBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(encFileName)}"`,
          "Content-Length": encryptedBuffer.length.toString(),
        },
      });
    }

    // MODE 1: DECRYPT & OPEN FILE (PAS MAU BUKA FILE DIPASSWORD)
    let decryptionKey = CHACHA_KEY;

    if (fileRecord.isPasswordProtected) {
      if (!password) {
        return NextResponse.json(
          {
            error: "PASSWORD_REQUIRED",
            message: "Berkas ini diproteksi password. Masukkan password berkas untuk membuka dan mendekripsi.",
            isPasswordProtected: true,
            fileId: fileRecord.id,
            originalName: fileRecord.originalName,
          },
          { status: 401 }
        );
      }

      decryptionKey = ChaChaFileCipher.deriveKeyFromPassword(
        password,
        fileRecord.passwordSalt || "",
        CHACHA_KEY
      );
    }

    // Decrypt using ChaCha20-Poly1305 and strictly verify Poly1305 tag
    let decryptedBuffer: Buffer;
    try {
      decryptedBuffer = ChaChaFileCipher.decryptFile(
        encryptedBuffer,
        fileRecord.nonce,
        fileRecord.authTag,
        decryptionKey
      );
    } catch (cryptoErr: any) {
      console.error("ChaCha20-Poly1305 decryption error:", cryptoErr);
      const isPassError = fileRecord.isPasswordProtected;
      return NextResponse.json(
        {
          error: isPassError ? "INVALID_PASSWORD" : "TAG_VERIFICATION_FAILED",
          message: isPassError
            ? "Password salah! Autentikasi tag Poly1305 gagal (berkas tidak dapat dibuka dengan password ini)."
            : "Integritas berkas terkompromi! Validasi authentication tag Poly1305 gagal (berkas rusak atau telah dimodifikasi oleh pihak ketiga).",
        },
        { status: 400 }
      );
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FILE_DECRYPTED_DOWNLOAD",
        category: "CRYPTO",
        details: JSON.stringify({
          fileId: fileRecord.id,
          originalName: fileRecord.originalName,
          algorithm: "ChaCha20-Poly1305",
        }),
      },
    });

    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": fileRecord.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`,
        "Content-Length": decryptedBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunduh berkas." },
      { status: 500 }
    );
  }
}
