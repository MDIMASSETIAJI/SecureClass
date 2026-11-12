import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { ChaChaFileCipher } from "@/lib/crypto/chacha20-poly1305";
import { prisma } from "@/lib/prisma";

const CHACHA_KEY = process.env.CHACHA_FILE_KEY || "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Pilih berkas terenkripsi (.enc) yang ingin didekripsi." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let unpacked: {
      originalName: string;
      nonceHex: string;
      authTagHex: string;
      encryptedBuffer: Buffer;
    };

    try {
      unpacked = ChaChaFileCipher.unpackContainer(fileBuffer);
    } catch (e: any) {
      return NextResponse.json(
        { error: "Format berkas tidak valid atau bukan berkas terenkripsi SecureClass (.enc)." },
        { status: 400 }
      );
    }

    // Decrypt using ChaCha20-Poly1305 (System Key, no password needed)
    let decryptedBuffer: Buffer;
    try {
      decryptedBuffer = ChaChaFileCipher.decryptFile(
        unpacked.encryptedBuffer,
        unpacked.nonceHex,
        unpacked.authTagHex,
        CHACHA_KEY
      );
    } catch (cryptoErr: any) {
      return NextResponse.json(
        {
          error: "Dekripsi gagal! Integritas berkas rusak atau Poly1305 authentication tag gagal diverifikasi.",
        },
        { status: 400 }
      );
    }

    // Log the decryption activity
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FILE_EXTERNAL_DECRYPT",
        category: "CRYPTO",
        details: JSON.stringify({
          originalName: unpacked.originalName,
          decryptedSize: decryptedBuffer.length,
          algorithm: "ChaCha20-Poly1305",
        }),
      },
    });

    const isPreview = req.nextUrl.searchParams.get("preview") === "true";
    if (isPreview) {
      return NextResponse.json({
        success: true,
        originalName: unpacked.originalName,
        size: decryptedBuffer.length,
        message: "Berkas berhasil didekripsi!",
      });
    }

    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(unpacked.originalName)}"`,
        "Content-Length": decryptedBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("External file decryption error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mendekripsi berkas." },
      { status: 500 }
    );
  }
}
