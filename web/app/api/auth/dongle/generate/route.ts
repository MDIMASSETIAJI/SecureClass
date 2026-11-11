import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
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

    const body = await req.json().catch(() => ({}));
    const label = body.label || "SecureClass FAT32 Flash Drive";

    // Revoke any previous active dongles for this user to ensure 1 primary active dongle
    await prisma.dongle.updateMany({
      where: { userId: session.userId, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });

    // Generate new ECDSA P-256 Keypair
    const { dongleId, publicKeyPem, dongleKeyFile } = EcdsaDongleService.generateDongleKey(
      session.userId,
      session.user.username
    );

    // Save public key to database (Private key is NEVER stored on server!)
    await prisma.dongle.create({
      data: {
        userId: session.userId,
        dongleId,
        publicKeyPem,
        label,
        status: "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "DONGLE_REGISTERED",
        category: "AUTH",
        details: JSON.stringify({
          dongleId,
          label,
          algorithm: "ECDSA-P256",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kunci USB Dongle ECDSA P-256 berhasil diterbitkan.",
      dongleId,
      dongleKeyFile, // Sent to browser so user can save it to their USB flashdisk
    });
  } catch (error: any) {
    console.error("Dongle generate error:", error);
    return NextResponse.json(
      { error: "Gagal membuat berkas kunci USB dongle." },
      { status: 500 }
    );
  }
}

