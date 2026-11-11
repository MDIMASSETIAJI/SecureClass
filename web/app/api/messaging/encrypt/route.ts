import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { AesGcmCipher } from "@/lib/crypto/aes-gcm";
import { VigenereCipher } from "@/lib/crypto/vigenere";

const AES_KEY = process.env.AES_MESSAGE_KEY || "8f2a1b9c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4";

export async function POST(req: NextRequest) {
  try {
    await SessionService.requireFullyAuthenticated();
    const body = await req.json();
    const { plaintext, vigenereKey } = body;

    if (!plaintext || typeof plaintext !== "string" || !plaintext.trim()) {
      return NextResponse.json(
        { error: "Isi teks pesan (plaintext) wajib diisi untuk dienkripsi." },
        { status: 400 }
      );
    }

    if (!vigenereKey || typeof vigenereKey !== "string" || !vigenereKey.trim()) {
      return NextResponse.json(
        { error: "Kunci enkripsi (Vigenère Key) wajib dimasukkan oleh pengguna." },
        { status: 400 }
      );
    }

    const keyClean = vigenereKey.trim().toUpperCase();

    // Layer 1: Vigenère Cipher (Klasik)
    const layer1Ciphertext = VigenereCipher.encrypt(plaintext, keyClean);

    // Layer 2: AES-256-GCM (Modern AEAD)
    const layer2Result = AesGcmCipher.encrypt(layer1Ciphertext, AES_KEY, 1);

    return NextResponse.json({
      success: true,
      plaintext,
      vigenereKey: keyClean,
      layer1Ciphertext,
      ciphertext: layer2Result.ciphertext,
      iv: layer2Result.iv,
      authTag: layer2Result.authTag,
      algorithm: "VIGENERE+AES-256-GCM",
      message: "Enkripsi ganda (Super Encryption) berhasil dilakukan.",
    });
  } catch (error: any) {
    console.error("Manual Encrypt API Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal melakukan enkripsi." },
      { status: 500 }
    );
  }
}

