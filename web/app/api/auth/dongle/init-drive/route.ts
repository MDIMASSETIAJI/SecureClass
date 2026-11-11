import { NextRequest, NextResponse } from "next/server";
import { UsbDetectorService } from "@/lib/crypto/usb-detector";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let targetDrive = body.driveLetter;

    // If no drive specified, find the first available drive or scanned drive
    if (!targetDrive) {
      const available = UsbDetectorService.listAvailableDrives();
      targetDrive = available.length > 0 ? available[0] : "E:\\";
    }

    // Generate Master System Dongle Key
    const { dongleId, publicKeyPem, keyItem } = EcdsaDongleService.generateDongleKey(
      "system-root",
      "secureclass_system"
    );

    // Write single system key to dongle.key on target drive
    const writeResult = UsbDetectorService.appendDongleKeyToDrive(targetDrive, keyItem);

    if (!writeResult.success) {
      return NextResponse.json(
        { error: writeResult.error || `Gagal menulis kunci ke drive ${targetDrive}` },
        { status: 400 }
      );
    }

    // Record or update system dongle in DB
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (adminUser) {
      await prisma.dongle.create({
        data: {
          userId: adminUser.id,
          dongleId,
          publicKeyPem,
          label: `System Hardware Dongle (${targetDrive})`,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      drive: targetDrive,
      path: writeResult.path,
      dongleId,
      message: `Berkas 'dongle.key' berhasil dibuat pada drive ${targetDrive}! Sistem terbuka otomatis.`,
    });
  } catch (error: any) {
    console.error("Init drive error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menginisialisasi flashdisk." },
      { status: 500 }
    );
  }
}

