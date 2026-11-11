import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
import { RateLimiter } from "@/lib/rate-limit";
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
    const { challenge, signature, dongleId } = body;

    if (!challenge || !signature) {
      return NextResponse.json(
        { error: "Challenge dan Signature wajib disertakan." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 1. Verify Challenge in Database (must be PENDING and not expired)
    const challengeRecord = await prisma.dongleChallenge.findUnique({
      where: { challenge },
    });

    if (!challengeRecord || challengeRecord.userId !== session.userId) {
      await RateLimiter.recordAttempt(session.user.username, "DONGLE", false, ip, userAgent, "Challenge not found for user");
      return NextResponse.json(
        { error: "Challenge tidak dikenali atau milik sesi lain." },
        { status: 400 }
      );
    }

    if (challengeRecord.status !== "PENDING") {
      await RateLimiter.recordAttempt(session.user.username, "DONGLE", false, ip, userAgent, "Challenge already used or expired");
      return NextResponse.json(
        { error: `Challenge tidak valid (status: ${challengeRecord.status}). Mohon buat challenge baru.` },
        { status: 400 }
      );
    }

    if (challengeRecord.expiresAt < new Date()) {
      await prisma.dongleChallenge.update({
        where: { id: challengeRecord.id },
        data: { status: "EXPIRED" },
      });
      await RateLimiter.recordAttempt(session.user.username, "DONGLE", false, ip, userAgent, "Challenge expired");
      return NextResponse.json(
        { error: "Challenge telah kedaluwarsa. Silakan muat ulang challenge baru." },
        { status: 400 }
      );
    }

    // 2. Fetch User's Registered Dongle Public Key
    const dongle = await prisma.dongle.findFirst({
      where: {
        userId: session.userId,
        status: "ACTIVE",
        ...(dongleId ? { dongleId } : {}),
      },
    });

    if (!dongle) {
      return NextResponse.json(
        { error: "Kunci publik USB Dongle tidak ditemukan di database." },
        { status: 404 }
      );
    }

    // 3. Verify ECDSA P-256 Signature
    const isValidSignature = EcdsaDongleService.verifySignature(
      challenge,
      signature,
      dongle.publicKeyPem
    );

    if (!isValidSignature) {
      await RateLimiter.recordAttempt(session.user.username, "DONGLE", false, ip, userAgent, "Invalid ECDSA signature");
      return NextResponse.json(
        { error: "Tanda tangan digital ECDSA tidak valid. Pastikan Anda memilih berkas dongle.key yang benar." },
        { status: 401 }
      );
    }

    // 4. Mark Challenge as USED (One-time use strictly enforced)
    await prisma.dongleChallenge.update({
      where: { id: challengeRecord.id },
      data: {
        status: "USED",
        verifiedAt: new Date(),
      },
    });

    // Update dongle lastUsedAt
    await prisma.dongle.update({
      where: { id: dongle.id },
      data: { lastUsedAt: new Date() },
    });

    // 5. Update session factor 2
    const updatedSession = await SessionService.markFactorPassed(session.token, "DONGLE");

    await RateLimiter.recordAttempt(session.user.username, "DONGLE", true, ip, userAgent);

    return NextResponse.json({
      success: true,
      factor2Dongle: true,
      factor3Face: updatedSession.factor3Face,
      isFullyAuthenticated: updatedSession.isFullyAuthenticated,
      message: "Faktor 2 (USB Dongle ECDSA P-256 Challenge-Response) berhasil diverifikasi!",
    });
  } catch (error: any) {
    console.error("Dongle verify error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat verifikasi USB dongle." },
      { status: 500 }
    );
  }
}

