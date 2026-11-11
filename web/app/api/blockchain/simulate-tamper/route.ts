import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { BlockchainService } from "@/lib/crypto/blockchain";

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.requireFullyAuthenticated(["ADMIN"]);
    const body = await req.json();
    const { blockIndex, fakeDataJson } = body;

    if (blockIndex === undefined || blockIndex === null) {
      return NextResponse.json({ error: "Indeks blok wajib disertakan." }, { status: 400 });
    }

    const dataToInject = fakeDataJson || JSON.stringify({
      action: "TAMPERED_ILLEGAL_ACCESS",
      hacked: true,
      attacker: "Adversary Injection Simulation",
      timestamp: new Date().toISOString(),
    });

    const success = await BlockchainService.simulateTampering(Number(blockIndex), dataToInject);

    if (!success) {
      return NextResponse.json({ error: `Blok #${blockIndex} tidak ditemukan.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Simulasi modifikasi ilegal pada blok #${blockIndex} berhasil dijalankan. Lakukan validasi rantai untuk mendeteksi anomali integritas data!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal melakukan simulasi perusakan data." },
      { status: 500 }
    );
  }
}

