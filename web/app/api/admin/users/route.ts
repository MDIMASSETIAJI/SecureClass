import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { hashPassword, validatePasswordStrength } from "@/lib/crypto/argon2";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["ADMIN"]);

    const users = await prisma.user.findMany({
      include: {
        dongles: { select: { id: true, dongleId: true, status: true, createdAt: true, lastUsedAt: true } },
        faceProfile: { select: { id: true, status: true, enrolledAt: true, livenessConfidence: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      avatar: u.avatar,
      createdAt: u.createdAt,
      dongleCount: u.dongles.length,
      hasActiveDongle: u.dongles.some((d) => d.status === "ACTIVE"),
      hasFaceEnrolled: u.faceProfile !== null && u.faceProfile.status === "ACTIVE",
    }));

    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat pengguna." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["ADMIN"]);
    const body = await req.json();
    const { username, email, fullName, role, password } = body;

    if (!username || !email || !fullName || !role || !password) {
      return NextResponse.json(
        { error: "Seluruh kolom wajib diisi." },
        { status: 400 }
      );
    }

    // Password strength validation
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.errors.join(" ") },
        { status: 400 }
      );
    }

    // Hash password using Argon2id
    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        fullName,
        role,
        passwordHash,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_CREATED",
        category: "SYSTEM",
        details: JSON.stringify({
          createdUserId: newUser.id,
          username: newUser.username,
          role: newUser.role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
      message: "Pengguna baru berhasil dibuat dengan hash Argon2id.",
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Username atau email sudah digunakan oleh akun lain." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Gagal membuat pengguna." },
      { status: 500 }
    );
  }
}

