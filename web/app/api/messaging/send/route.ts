import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { AesGcmCipher } from "@/lib/crypto/aes-gcm";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const AES_KEY = process.env.AES_MESSAGE_KEY || "8f2a1b9c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const body = await req.json();
    const { receiverId, plaintext, vigenereKey, isImportant } = body;

    if (!receiverId || !plaintext) {
      return NextResponse.json(
        { error: "Penerima dan isi pesan teks wajib diisi." },
        { status: 400 }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true, fullName: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Penerima pesan tidak ditemukan di sistem." },
        { status: 404 }
      );
    }

    if (!vigenereKey || typeof vigenereKey !== "string" || !vigenereKey.trim()) {
      return NextResponse.json(
        { error: "Kunci enkripsi (Vigenère Key) wajib dimasukkan oleh pengguna." },
        { status: 400 }
      );
    }

    const keyToUse = vigenereKey.trim().toUpperCase();

    // Perform Super Encryption (Layer 1: Vigenère -> Layer 2: AES-256-GCM)
    const encrypted = AesGcmCipher.superEncrypt(plaintext, keyToUse, AES_KEY, 1);

    // Encrypt the key itself into a secure authenticated envelope & store hash for verification
    const keyHash = crypto.createHash("sha256").update(keyToUse).digest("hex");
    const keyEnvelope = AesGcmCipher.encrypt(keyToUse, AES_KEY);
    const vigenereKeyHint = JSON.stringify({
      hash: keyHash,
      envelope: keyEnvelope,
    });

    const message = await prisma.secureMessage.create({
      data: {
        senderId: session.userId,
        receiverId: receiver.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        algorithm: encrypted.algorithm,
        vigenereKeyHint,
        isImportant: Boolean(isImportant),
        isEncrypted: true,
      },
    });

    // Record to Blockchain Tamper-Evident Hash Chain
    await BlockchainService.appendBlock(
      "SECURE_MESSAGE_SENT",
      {
        messageId: message.id,
        senderUsername: session.user.username,
        receiverUsername: receiver.username,
        isImportant: Boolean(isImportant),
        algorithm: "VIGENERE+AES-256-GCM",
      },
      session.userId,
      message.id
    );

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "SECURE_MESSAGE_SENT",
        category: "CRYPTO",
        details: JSON.stringify({
          messageId: message.id,
          receiver: receiver.username,
          isImportant: Boolean(isImportant),
          algorithm: "Super Encryption (Vigenère + AES-256-GCM)",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: message.id,
      message: "Pesan terenkripsi ganda (Super Encryption) berhasil dikirim.",
    });
  } catch (error: any) {
    console.error("Messaging send error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengirim pesan aman." },
      { status: error.message?.startsWith("UNAUTHORIZED") ? 401 : 500 }
    );
  }
}

