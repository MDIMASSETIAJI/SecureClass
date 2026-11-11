import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();

    // Fetch messages where user is receiver or sender
    const messages = await prisma.secureMessage.findMany({
      where: {
        OR: [{ receiverId: session.userId }, { senderId: session.userId }],
      },
      include: {
        sender: { select: { id: true, username: true, fullName: true, role: true } },
        receiver: { select: { id: true, username: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Strip raw ciphertext in list or provide preview metadata
    const safeList = messages.map((m) => ({
      id: m.id,
      isSender: m.senderId === session.userId,
      sender: m.sender,
      receiver: m.receiver,
      algorithm: m.algorithm,
      isImportant: m.isImportant,
      isEncrypted: m.isEncrypted,
      createdAt: m.createdAt,
      readAt: m.readAt,
      ciphertext: m.ciphertext,
      iv: m.iv,
      authTag: m.authTag,
      ciphertextLength: m.ciphertext.length,
    }));

    // Also get contact list of other users
    const users = await prisma.user.findMany({
      where: { id: { not: session.userId } },
      select: { id: true, username: true, fullName: true, role: true },
    });

    return NextResponse.json({
      success: true,
      messages: safeList,
      contacts: users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat kotak pesan." },
      { status: error.message?.startsWith("UNAUTHORIZED") ? 401 : 500 }
    );
  }
}

