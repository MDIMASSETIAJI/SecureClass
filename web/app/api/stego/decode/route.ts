import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { SteganographyService } from "@/lib/crypto/steganography";

const DEFAULT_STEGO_KEY = process.env.STEGO_ENCRYPTION_KEY || "5566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const customPassphrase = (formData.get("passphrase") as string) || null;

    if (!image) {
      return NextResponse.json({ error: "Berkas gambar steganografi wajib diunggah." }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const encryptionKey = customPassphrase || DEFAULT_STEGO_KEY;

    // Decode and decrypt payload
    const result = await SteganographyService.decode(imageBuffer, encryptionKey);

    return NextResponse.json({
      success: true,
      plaintext: result.plaintext,
      payloadLength: result.payloadLength,
      algorithm: "AES-256-GCM + LSB Extraction",
      message: "Pesan rahasia berhasil diekstraksi dan didekripsi dengan validasi integritas.",
    });
  } catch (error: any) {
    console.error("Stego decode error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengekstraksi pesan dari gambar stego." },
      { status: 400 }
    );
  }
}

