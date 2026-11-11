import { NextRequest, NextResponse } from "next/server";
import { SessionService, SESSION_COOKIE_NAME } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, session: null }, { status: 200 });
    }

    // Check credentials readiness
    const userDetail = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        dongles: { where: { status: "ACTIVE" } },
        faceProfile: { where: { status: "ACTIVE" } },
      },
    });

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      session: {
        id: session.id,
        factor1Password: session.factor1Password,
        factor2Dongle: session.factor2Dongle,
        factor3Face: session.factor3Face,
        isFullyAuthenticated: session.isFullyAuthenticated,
        expiresAt: session.expiresAt,
      },
      hasDongleRegistered: (userDetail?.dongles.length ?? 0) > 0,
      hasFaceEnrolled: userDetail?.faceProfile !== null,
      hasChangedPassword: userDetail?.passwordChangedAt !== null,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, session: null }, { status: 200 });
  }
}

