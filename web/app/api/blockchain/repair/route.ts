import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { BlockchainService } from "@/lib/crypto/blockchain";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["ADMIN"]);
    await BlockchainService.recalculateAndFixChain();

    return NextResponse.json({
      success: true,
      message: "Seluruh hash dalam rantai audit berhasil dihitung ulang dan dipulihkan.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memulihkan rantai hash." },
      { status: 500 }
    );
  }
}

