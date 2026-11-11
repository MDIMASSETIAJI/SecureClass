import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { SteganographyService } from "@/lib/crypto/steganography";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";

const DEFAULT_STEGO_KEY = process.env.STEGO_ENCRYPTION_KEY || "5566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const secretMessage = formData.get("secretMessage") as string | null;
    const customPassphrase = (formData.get("passphrase") as string) || null;

    if (!image || !secretMessage) {
      return NextResponse.json(
        { error: "Gambar PNG pembawa dan pesan rahasia wajib diisi." },
        { status: 400 }
      );
    }

    if (!image.type.includes("png") && !image.name.toLowerCase().endsWith(".png")) {
      return NextResponse.json(
        { error: "Format berkas harus PNG murni. Format JPEG atau kompresi lossy lainnya merusak data bit LSB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const encryptionKey = customPassphrase || DEFAULT_STEGO_KEY;

    // Execute LSB Steganography Encoding with AES-256-GCM
    const result = await SteganographyService.encode(imageBuffer, secretMessage, encryptionKey);

    // Record metadata in database
    const record = await prisma.steganographyRecord.create({
      data: {
        userId: session.userId,
        originalFileName: image.name,
        stegoFileName: `stego_${image.name}`,
        messageLength: secretMessage.length,
        algorithm: "AES-256-GCM+LSB",
        iv: result.iv,
        authTag: result.authTag,
      },
    });

    // Record to Blockchain
    await BlockchainService.appendBlock(
      "STEGANOGRAPHY_EMBED",
      {
        recordId: record.id,
        imageName: image.name,
        messageLength: secretMessage.length,
        capacityBytes: result.capacityBytes,
        usedBytes: result.usedBytes,
      },
      session.userId,
      record.id
    );

    // Return the generated stego PNG as downloadable response
    return new NextResponse(new Uint8Array(result.stegoPngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="stego_${encodeURIComponent(image.name)}"`,
        "X-Stego-Capacity": result.capacityBytes.toString(),
        "X-Stego-Used": result.usedBytes.toString(),
        "X-Stego-Dimensions": `${result.width}x${result.height}`,
      },
    });
  } catch (error: any) {
    console.error("Stego encode error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyisipkan pesan ke dalam gambar." },
      { status: 400 }
    );
  }
}
