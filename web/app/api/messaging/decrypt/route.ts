import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { AesGcmCipher } from "@/lib/crypto/aes-gcm";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const AES_KEY = process.env.AES_MESSAGE_KEY || "8f2a1b9c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const body = await req.json();
    const { messageId, vigenereKey, ciphertext, iv, authTag } = body;

    // Mode A: Manual direct decryption (Ciphertext + IV + AuthTag + Key)
    if (!messageId && ciphertext && iv && authTag) {
      if (!vigenereKey || typeof vigenereKey !== "string" || !vigenereKey.trim()) {
        return NextResponse.json(
          { error: "Kunci dekripsi (Vigenère Key) wajib dimasukkan untuk dekripsi manual." },
          { status: 400 }
        );
      }

      const keyToUse = vigenereKey.trim().toUpperCase();
      try {
        const plaintext = AesGcmCipher.superDecrypt(
          { ciphertext, iv, authTag },
          keyToUse,
          AES_KEY
        );
        return NextResponse.json({
          success: true,
          plaintext,
          keyUsed: keyToUse,
          algorithm: "VIGENERE+AES-256-GCM",
          message: "Dekripsi berhasil! Integritas ciphertext valid.",
        });
      } catch (cryptoErr: any) {
        return NextResponse.json(
          { error: "Dekripsi gagal! Kunci salah atau autentikasi data (Auth Tag) tidak cocok." },
          { status: 400 }
        );
      }
    }

    if (!messageId) {
      return NextResponse.json(
        { error: "ID Pesan wajib diisi." },
        { status: 400 }
      );
    }

    const message = await prisma.secureMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, username: true, fullName: true } },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
    }

    // Authorization check: only sender or receiver may decrypt
    if (message.senderId !== session.userId && message.receiverId !== session.userId) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki wewenang untuk mendekripsi pesan ini." },
        { status: 403 }
      );
    }

    // Determine Vigenère key: either provided or automatically recovered from secure hint envelope
    let keyToUse: string | null =
      typeof vigenereKey === "string" && vigenereKey.trim()
        ? vigenereKey.trim().toUpperCase()
        : null;

    if (!keyToUse && message.vigenereKeyHint) {
      try {
        const parsed = JSON.parse(message.vigenereKeyHint);
        if (parsed.envelope) {
          keyToUse = AesGcmCipher.decrypt(parsed.envelope, AES_KEY).toUpperCase();
        } else if (parsed.ciphertext && parsed.iv && parsed.authTag) {
          keyToUse = AesGcmCipher.decrypt(parsed, AES_KEY).toUpperCase();
        }
      } catch (err) {
        console.error("Failed to recover auto key from envelope:", err);
      }
    }

    // Verify key against stored hint/hash if key was manually provided
    if (vigenereKey && message.vigenereKeyHint) {
      try {
        const parsed = JSON.parse(message.vigenereKeyHint);
        if (parsed.hash) {
          const userKeyHash = crypto.createHash("sha256").update(vigenereKey.trim().toUpperCase()).digest("hex");
          if (userKeyHash !== parsed.hash) {
            return NextResponse.json(
              { error: "Kunci dekripsi salah! Kunci yang Anda masukkan tidak cocok dengan kunci pengirim." },
              { status: 400 }
            );
          }
        }
      } catch {
        // Fall through to cryptographic superDecrypt
      }
    }

    if (!keyToUse) {
      return NextResponse.json(
        { error: "Kunci enkripsi tidak dapat dipulihkan secara otomatis." },
        { status: 400 }
      );
    }

    // Execute Super Decryption:
    // 1. AES-256-GCM verification & decryption
    // 2. Vigenère decryption
    let plaintext: string;
    try {
      plaintext = AesGcmCipher.superDecrypt(
        {
          ciphertext: message.ciphertext,
          iv: message.iv,
          authTag: message.authTag,
        },
        keyToUse,
        AES_KEY
      );
    } catch (cryptoErr: any) {
      return NextResponse.json(
        {
          error: "Dekripsi gagal! Integritas ciphertext tidak valid atau kunci salah (GCM auth tag verification failure).",
        },
        { status: 400 }
      );
    }

    // Mark as read if user is receiver
    if (message.receiverId === session.userId && !message.readAt) {
      await prisma.secureMessage.update({
        where: { id: message.id },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      plaintext,
      autoKey: keyToUse,
      keyUsed: keyToUse,
      isImportant: message.isImportant,
      algorithm: message.algorithm,
      sender: message.sender,
      createdAt: message.createdAt,
    });
  } catch (error: any) {
    console.error("Messaging decrypt error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mendekripsi pesan." },
      { status: 500 }
    );
  }
}

