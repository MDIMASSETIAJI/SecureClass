import { NextRequest, NextResponse } from "next/server";
import { UsbDetectorService } from "@/lib/crypto/usb-detector";
import { SessionService } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    let targetUsername = req.nextUrl.searchParams.get("username") || undefined;
    
    // Fallback: check active session if username query wasn't explicitly passed
    if (!targetUsername) {
      const session = await SessionService.getCurrentSession();
      if (session?.user?.username) {
        targetUsername = session.user.username;
      }
    }

    const detected = UsbDetectorService.scanConnectedDongle(targetUsername);
    const availableDrives = UsbDetectorService.listAvailableDrives();

    if (detected.connected) {
      return NextResponse.json({
        connected: true,
        drive: detected.drive,
        systemId: detected.systemId || "SECURECLASS-CORE-SYSTEM",
        dongleId: detected.dongleId,
        username: detected.username,
        createdAt: detected.createdAt,
        storedUsernames: detected.storedUsernames || [],
        keyCount: detected.allKeys?.length || 1,
        hasTargetUserKey: !!detected.privateKeyPem,
        availableDrives,
        message: `Flashdisk USB terdeteksi pada drive ${detected.drive} (1 Kunci Sistem untuk @${detected.username || "user"}).`,
      });
    }

    return NextResponse.json({
      connected: false,
      availableDrives,
      message: "Tidak ada flashdisk USB yang memuat berkas 'dongle.key' terdeteksi pada port komputer.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { connected: false, error: error.message || "Gagal memindai port USB." },
      { status: 500 }
    );
  }
}

