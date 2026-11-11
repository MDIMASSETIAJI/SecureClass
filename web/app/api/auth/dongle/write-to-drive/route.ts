import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
import { UsbDetectorService } from "@/lib/crypto/usb-detector";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.factor1Password) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau Faktor 1 belum terpenuhi." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const driveLetter = body.driveLetter || "E:\\";

    // 1. Generate fresh ECDSA P-256 keypair for this USB flash drive
    const { dongleId, publicKeyPem, keyItem, dongleKeyFile } = EcdsaDongleService.generateDongleKey(
      session.userId,
      session.user.username
    );

    // 2. Revoke older dongles
    await prisma.dongle.updateMany({
      where: { userId: session.userId, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    // 3. Register public key in database
    await prisma.dongle.create({
      data: {
        userId: session.userId,
        dongleId,
        publicKeyPem,
        label: `USB Flashdisk (${driveLetter})`,
        status: "ACTIVE",
      },
    });

    // 4. Append dongle key into dongle.key on the specified USB drive (preserves other registered users' keys!)
    const writeResult = UsbDetectorService.appendDongleKeyToDrive(driveLetter, keyItem);

    return NextResponse.json({
      success: true,
      dongleId,
      writtenToDrive: writeResult.success,
      drivePath: writeResult.path,
      writeError: writeResult.error,
      dongleKeyFile,
      message: writeResult.success
        ? `Kunci USB Dongle berhasil ditulis langsung ke flashdisk Anda di ${writeResult.path}!`
        : `Kunci terdaftar di sistem. Unduh berkas dongle.key dan simpan ke flashdisk Anda.`,
    });
  } catch (error: any) {
    console.error("Write to drive error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memasangkan kunci ke flashdisk." },
      { status: 500 }
    );
  }
}

