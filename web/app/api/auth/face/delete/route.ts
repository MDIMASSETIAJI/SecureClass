import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    // Delete face profile completely from database
    await prisma.faceProfile.deleteMany({
      where: { userId: session.userId },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FACE_PROFILE_DELETED",
        category: "AUTH",
        details: JSON.stringify({
          message: "Data biometrik pengguna telah dihapus secara permanen (Right to be Forgotten).",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data biometrik wajah Anda telah dihapus secara permanen dari sistem.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus profil biometrik." },
      { status: 500 }
    );
  }
}

