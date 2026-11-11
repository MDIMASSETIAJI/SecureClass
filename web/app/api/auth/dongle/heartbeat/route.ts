import { NextRequest, NextResponse } from "next/server";
import { UsbDetectorService } from "@/lib/crypto/usb-detector";

export async function GET(req: NextRequest) {
  try {
    // Scan all mounted drives on the system for physical USB dongle key
    const detected = UsbDetectorService.scanConnectedDongle();
    const availableDrives = UsbDetectorService.listAvailableDrives();

    if (detected.connected) {
      return NextResponse.json({
        pluggedIn: true,
        enforced: true,
        drive: detected.drive,
        dongleId: detected.dongleId || "DGL-SYS-CORE",
        systemId: detected.systemId || "SECURECLASS-CORE-SYSTEM",
        availableDrives,
        message: `Flashdisk USB terdeteksi pada drive ${detected.drive}.`,
      });
    }

    return NextResponse.json({
      pluggedIn: false,
      enforced: true,
      availableDrives,
      error: "Flashdisk USB fisik tidak terdeteksi pada port komputer!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { pluggedIn: false, enforced: true, error: error.message },
      { status: 500 }
    );
  }
}

