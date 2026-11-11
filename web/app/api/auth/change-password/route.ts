import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/crypto/argon2";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const body = await req.json();
    const { currentPassword, newPassword, confirmNewPassword } = body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return NextResponse.json(
        { error: "Password saat ini, password baru, dan konfirmasi password wajib diisi." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { error: "Password baru dan konfirmasi password tidak cocok." },
        { status: 400 }
      );
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Password saat ini salah." },
        { status: 400 }
      );
    }

    // Check if new password is same as current password
    const isSamePassword = await verifyPassword(user.passwordHash, newPassword);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "Password baru tidak boleh sama dengan password saat ini." },
        { status: 400 }
      );
    }

    // Validate strength of new password
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.errors.join(" ") },
        { status: 400 }
      );
    }

    // Hash new password using Argon2id
    const newPasswordHash = await hashPassword(newPassword);

    // Update in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_CHANGED",
        category: "AUTH",
        details: JSON.stringify({
          message: "Password pengguna berhasil diperbarui dengan hash Argon2id (Memory-hardened).",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password Anda berhasil diperbarui dengan enkripsi hash Argon2id yang aman!",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengubah password." },
      { status: 500 }
    );
  }
}

