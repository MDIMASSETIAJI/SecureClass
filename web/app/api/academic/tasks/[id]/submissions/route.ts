import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await SessionService.requireFullyAuthenticated();
    const taskId = params.id;

    if (session.user.role === "MAHASISWA") {
      const submission = await prisma.taskSubmission.findUnique({
        where: {
          taskId_studentId: {
            taskId,
            studentId: session.userId,
          },
        },
        include: { encryptedFile: true },
      });
      return NextResponse.json({ success: true, submission });
    }

    // Lecturer / Admin: view all submissions
    const submissions = await prisma.taskSubmission.findMany({
      where: { taskId },
      include: {
        student: { select: { id: true, username: true, fullName: true, email: true } },
        encryptedFile: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat daftar pengumpulan." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["MAHASISWA"]);
    const taskId = params.id;
    const body = await req.json();
    const { encryptedFileId, notes } = body;

    if (!encryptedFileId) {
      return NextResponse.json(
        { error: "Berkas tugas terenkripsi ChaCha20-Poly1305 wajib dilampirkan." },
        { status: 400 }
      );
    }

    const task = await prisma.academicTask.findUnique({
      where: { id: taskId },
      include: { course: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    }

    // Ensure student course enrollment is recorded
    await prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: task.courseId,
          studentId: session.userId,
        },
      },
      create: {
        courseId: task.courseId,
        studentId: session.userId,
      },
      update: {},
    });

    // Upsert submission
    const submission = await prisma.taskSubmission.upsert({
      where: {
        taskId_studentId: {
          taskId,
          studentId: session.userId,
        },
      },
      create: {
        taskId,
        studentId: session.userId,
        encryptedFileId,
        notes: notes || null,
      },
      update: {
        encryptedFileId,
        notes: notes || null,
        submittedAt: new Date(),
      },
      include: { encryptedFile: true },
    });

    // Record submission into Blockchain Tamper-Evident Hash Chain
    await BlockchainService.appendBlock(
      "TASK_SUBMISSION",
      {
        submissionId: submission.id,
        taskId: task.id,
        taskTitle: task.title,
        studentUsername: session.user.username,
        encryptedFileId: submission.encryptedFileId,
        checksumSha256: submission.encryptedFile.checksumSha256,
      },
      session.userId,
      submission.id
    );

    return NextResponse.json({
      success: true,
      submission,
      message: "Tugas berhasil dikumpulkan dalam format terenkripsi ChaCha20-Poly1305 dan dicatat pada Blockchain.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengumpulkan tugas." },
      { status: 500 }
    );
  }
}

