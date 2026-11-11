import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { BlockchainService } from "@/lib/crypto/blockchain";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated();

    // Fetch all blocks
    await BlockchainService.ensureGenesisBlock();
    const blocks = await prisma.blockchainBlock.findMany({
      orderBy: { index: "asc" },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
    });

    // Run full cryptographic validation
    const validation = await BlockchainService.validateChain();

    return NextResponse.json({
      success: true,
      chainType: "Tamper-Evident Hash Chain (SHA-256)",
      validation,
      blocks,
      summary: {
        totalBlocks: blocks.length,
        isValid: validation.isValid,
        genesisHash: blocks[0]?.currentHash,
        latestHash: blocks[blocks.length - 1]?.currentHash,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memuat status blockchain audit." },
      { status: 500 }
    );
  }
}

