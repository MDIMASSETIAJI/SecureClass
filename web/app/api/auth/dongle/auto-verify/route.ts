import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { UsbDetectorService } from "@/lib/crypto/usb-detector";
import { EcdsaDongleService } from "@/lib/crypto/ecdsa-dongle";
import { RateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.factor1Password) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau Faktor 1 (Password) belum terpenuhi." },
        { status: 401 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 1. Fetch user's registered Dongle record in database
    const registeredDongle = await prisma.dongle.findFirst({
      where: {
        userId: session.userId,
        status: "ACTIVE",
      },
    });

    if (!registeredDongle) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun ini belum mendaftarkan kunci USB Dongle pada sistem.",
          needsEnrollment: true,
        },
        { status: 404 }
      );
    }

    // 2. Scan physical drives on computer for plugged-in USB flash drive matching this user
    const detected = UsbDetectorService.scanConnectedDongle(session.user.username);

    if (!detected.connected) {
      await RateLimiter.recordAttempt(
        session.user.username,
        "DONGLE",
        false,
        ip,
        userAgent,
        "Physical USB flash drive not plugged in"
      );
      return NextResponse.json(
        {
          success: false,
          pluggedIn: false,
          error: "Aplikasi tidak dapat dijalankan / diverifikasi! Colokkan USB Flashdisk fisik yang memuat kunci akun Anda ke port komputer.",
        },
        { status: 400 }
      );
    }

    // 3. Find key for this user inside the dongle (supports multi-user dongles)
    const userKeyItem = EcdsaDongleService.findKeyForUser(detected.rawParsed, session.user.username);
    const privateKeyPem = userKeyItem?.keyMaterial?.privateKeyPem || detected.privateKeyPem;

    if (!privateKeyPem) {
      const stored = detected.storedUsernames?.length ? detected.storedUsernames.join(", ") : "Tidak ada";
      await RateLimiter.recordAttempt(
        session.user.username,
        "DONGLE",
        false,
        ip,
        userAgent,
        `Dongle does not contain key for @${session.user.username}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Flashdisk terhubung di drive ${detected.drive}, namun tidak memuat kunci untuk akun @${session.user.username}. Kunci yang ada pada flashdisk ini: [${stored}].`,
        },
        { status: 403 }
      );
    }

    // 4. Create fresh cryptographic challenge
    const challenge = EcdsaDongleService.generateChallenge();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    const challengeRecord = await prisma.dongleChallenge.create({
      data: {
        userId: session.userId,
        challenge,
        status: "PENDING",
        expiresAt,
      },
    });

    // 5. Sign challenge using the user's private key extracted from the physical flash drive
    const signer = crypto.createSign("SHA256");
    signer.update(Buffer.from(challenge, "utf8"));
    const signatureBuffer = signer.sign(privateKeyPem);
    const signatureHex = signatureBuffer.toString("hex");

    // 6. Verify signature against public key stored in database
    const isValidSignature = EcdsaDongleService.verifySignature(
      challenge,
      signatureHex,
      registeredDongle.publicKeyPem
    );

    if (!isValidSignature) {
      await RateLimiter.recordAttempt(
        session.user.username,
        "DONGLE",
        false,
        ip,
        userAgent,
        "Invalid signature from connected flash drive"
      );
      return NextResponse.json(
        { error: "Tanda tangan digital kunci flashdisk gagal diverifikasi oleh server." },
        { status: 401 }
      );
    }

    // 7. Mark challenge as USED
    await prisma.dongleChallenge.update({
      where: { id: challengeRecord.id },
      data: { status: "USED", verifiedAt: new Date() },
    });

    await prisma.dongle.update({
      where: { id: registeredDongle.id },
      data: { lastUsedAt: new Date() },
    });

    // 8. Mark Factor 2 passed in session
    const updatedSession = await SessionService.markFactorPassed(session.token, "DONGLE");
    await RateLimiter.recordAttempt(session.user.username, "DONGLE", true, ip, userAgent);

    return NextResponse.json({
      success: true,
      pluggedIn: true,
      drive: detected.drive,
      dongleId: userKeyItem?.dongleId || registeredDongle.dongleId,
      username: session.user.username,
      totalKeysOnDongle: detected.allKeys?.length || 1,
      factor2Dongle: true,
      factor3Face: updatedSession.factor3Face,
      isFullyAuthenticated: updatedSession.isFullyAuthenticated,
      message: `Flashdisk USB terdeteksi di drive ${detected.drive} dan kunci untuk @${session.user.username} berhasil diverifikasi secara otomatis!`,
    });
  } catch (error: any) {
    console.error("Auto verify dongle error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memverifikasi USB dongle secara otomatis." },
      { status: 500 }
    );
  }
}
