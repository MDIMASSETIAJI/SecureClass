import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto/argon2";
import { RateLimiter } from "@/lib/rate-limit";
import { SessionService, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: "Username/Email dan Password wajib diisi." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 1. Rate Limiting / Brute-force protection
    const rateCheck = await RateLimiter.isRateLimited(usernameOrEmail);
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan gagal. Akun dibatasi sementara demi keamanan. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    // 2. Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
      include: {
        dongles: { where: { status: "ACTIVE" } },
        faceProfile: { where: { status: "ACTIVE" } },
      },
    });

    if (!user) {
      await RateLimiter.recordAttempt(usernameOrEmail, "PASSWORD", false, ip, userAgent, "User not found");
      return NextResponse.json(
        { error: "Kredensial login tidak valid." },
        { status: 401 }
      );
    }

    // 3. Verify Argon2id password hash
    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      await RateLimiter.recordAttempt(usernameOrEmail, "PASSWORD", false, ip, userAgent, "Invalid password");
      return NextResponse.json(
        { error: "Kredensial login tidak valid." },
        { status: 401 }
      );
    }

    // Record successful factor 1 attempt and clear any prior failures
    await RateLimiter.recordAttempt(usernameOrEmail, "PASSWORD", true, ip, userAgent);
    await RateLimiter.resetAttempts(usernameOrEmail);

    // 4. Create Partial Session (Factor 1 passed, Factors 2 and 3 pending)
    const { token, expiresAt } = await SessionService.createPartialSession(user.id, userAgent, ip);

    const hasDongleRegistered = user.dongles.length > 0;
    const hasFaceEnrolled = user.faceProfile !== null;

    const res = NextResponse.json({
      success: true,
      message: "Faktor 1 (Password Argon2id) berhasil diverifikasi.",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      factor1Passed: true,
      factor2Dongle: true,
      factor3Face: false,
      hasDongleRegistered,
      hasFaceEnrolled,
    });

    // Set secure HTTP-only cookie
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Login factor 1 error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server autentikasi." },
      { status: 500 }
    );
  }
}

