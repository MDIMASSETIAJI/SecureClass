import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();

    const files = await prisma.encryptedFile.findMany({
      where: session.user.role === "ADMIN" ? {} : { uploadedById: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        originalSize: true,
        encryptedSize: true,
        algorithm: true,
        checksumSha256: true,
        isPasswordProtected: true,
        createdAt: true,
        uploader: {
          select: { username: true, fullName: true },
        },
      },
    });

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error("List files error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat daftar berkas." },
      { status: 500 }
    );
  }
}

