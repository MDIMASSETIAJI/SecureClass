import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.factor1Password) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau Faktor 1 (Password) belum terpenuhi." },
        { status: 401 }
      );
    }

    // Check if user has an active registered dongle
    const activeDongle = await prisma.dongle.findFirst({
      where: { userId: session.userId, status: "ACTIVE" },
    });

    if (!activeDongle) {
      return NextResponse.json(
        {
          error: "Akun ini belum mendaftarkan USB Dongle. Silakan lakukan registrasi kunci dongle terlebih dahulu.",
          needsEnrollment: true,
        },
        { status: 404 }
      );
    }

    // Invalidate any old pending challenges for this user
    await prisma.dongleChallenge.updateMany({
      where: { userId: session.userId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    // Generate fresh 32-byte challenge nonce
    const challenge = EcdsaDongleService.generateChallenge();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry

    // Persist challenge in database (as required)
    await prisma.dongleChallenge.create({
      data: {
        userId: session.userId,
        challenge,
        status: "PENDING",
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      challenge,
      dongleId: activeDongle.dongleId,
      expiresAt,
      message: "Challenge kriptografi berhasil dibuat. Silakan tandatangani dengan berkas dongle.key Anda.",
    });
  } catch (error: any) {
    console.error("Dongle challenge error:", error);
    return NextResponse.json(
      { error: "Gagal membuat challenge autentikasi dongle." },
      { status: 500 }
    );
  }
}

