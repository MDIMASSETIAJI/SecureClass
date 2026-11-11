import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();

    const courses = await prisma.course.findMany({
      include: {
        lecturer: { select: { id: true, username: true, fullName: true, email: true } },
        _count: { select: { enrollments: true, tasks: true } },
      },
      orderBy: { code: "asc" },
    });

    const lecturers = await prisma.user.findMany({
      where: { role: { in: ["DOSEN", "ADMIN"] } },
      select: { id: true, username: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ success: true, courses, lecturers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat mata kuliah." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["ADMIN"]);
    const body = await req.json();
    const { code, name, description, lecturerId } = body;

    if (!code || !name || !lecturerId) {
      return NextResponse.json(
        { error: "Kode mata kuliah, nama, dan dosen pengampu wajib diisi." },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        code: code.toUpperCase().trim(),
        name,
        description: description || null,
        lecturerId,
      },
    });

    return NextResponse.json({
      success: true,
      course,
      message: "Mata kuliah berhasil ditambahkan.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal membuat mata kuliah." },
      { status: 500 }
    );
  }
}

