import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();

    let tasks;
    if (session.user.role === "DOSEN") {
      // Tasks created by lecturer
      tasks = await prisma.academicTask.findMany({
        where: { createdById: session.userId },
        include: {
          course: true,
          submissions: {
            include: {
              student: { select: { id: true, username: true, fullName: true } },
              encryptedFile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (session.user.role === "MAHASISWA") {
      // Show all active academic tasks, including student's individual submission status
      tasks = await prisma.academicTask.findMany({
        include: {
          course: true,
          submissions: {
            where: { studentId: session.userId },
            include: { encryptedFile: true },
          },
        },
        orderBy: { deadline: "asc" },
      });
    } else {
      // ADMIN: all tasks
      tasks = await prisma.academicTask.findMany({
        include: {
          course: true,
          creator: { select: { id: true, username: true, fullName: true } },
          submissions: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat tugas akademik." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["DOSEN", "ADMIN"]);
    const body = await req.json();
    const { courseId, title, description, deadline } = body;

    if (!courseId || !title || !description || !deadline) {
      return NextResponse.json(
        { error: "Mata kuliah, judul, deskripsi, dan batas waktu pengumpulan wajib diisi." },
        { status: 400 }
      );
    }

    const task = await prisma.academicTask.create({
      data: {
        courseId,
        createdById: session.userId,
        title,
        description,
        deadline: new Date(deadline),
      },
      include: { course: true },
    });

    // Record to Blockchain
    await BlockchainService.appendBlock(
      "ACADEMIC_TASK_CREATED",
      {
        taskId: task.id,
        courseCode: task.course.code,
        title: task.title,
        deadline: task.deadline.toISOString(),
      },
      session.userId,
      task.id
    );

    return NextResponse.json({
      success: true,
      task,
      message: "Tugas akademik berhasil diterbitkan.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menerbitkan tugas." },
      { status: 500 }
    );
  }
}

