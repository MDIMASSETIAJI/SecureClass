import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["ADMIN"]);
    const category = req.nextUrl.searchParams.get("category");

    const logs = await prisma.auditLog.findMany({
      where: category ? { category } : undefined,
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    const loginAttempts = await prisma.loginAttempt.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      logs,
      loginAttempts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat log audit." },
      { status: 500 }
    );
  }
}

