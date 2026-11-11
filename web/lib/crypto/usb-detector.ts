import fs from "fs";
import path from "path";
import { DongleKeyItem, MultiDongleKeyFile, EcdsaDongleService } from "./ecdsa-dongle";

export interface DetectedUsbDongle {
  connected: boolean;
  drive?: string;
  filePath?: string;
  systemId?: string;
  dongleId?: string;
  userId?: string;
  username?: string;
  createdAt?: string;
  publicKeyPem?: string;
  privateKeyPem?: string;
  allKeys?: DongleKeyItem[];
  storedUsernames?: string[];
  rawParsed?: any;
  error?: string;
}

export class UsbDetectorService {
  // Hanya memindai drive USB fisik lepas-pasang (E:\ s/d Z:\).
  // Partisi harddisk internal C:\ dan D:\ secara tegas DIKECUALIKAN untuk mematuhi kriteria token hardware fisik.
  private static readonly DRIVE_LETTERS = "EFGHIJKLMNOPQRSTUVWXYZ".split("");
  private static readonly CANDIDATE_FILENAMES = ["dongle.key", "secureclass.key", "secureclass_dongle.key"];

  /**
   * Scans all mounted drive letters on Windows for a physical USB flash drive containing dongle.key
   * Supports both multi-key (version 2.0) and legacy single-key formats.
   */
  public static scanConnectedDongle(targetUsernameOrId?: string): DetectedUsbDongle {
    for (const letter of this.DRIVE_LETTERS) {
      const rootPath = `${letter}:\\`;

      for (const filename of this.CANDIDATE_FILENAMES) {
        const fullPath = path.join(rootPath, filename);

        try {
          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, "utf8");
            let parsed: any;
            try {
              parsed = JSON.parse(content);
            } catch {
              continue; // Not a valid JSON, keep searching
            }

            if (
              parsed &&
              parsed.format === "SECURECLASS_DONGLE_KEY"
            ) {
              // Extract all keys stored in the dongle
              let allKeys: DongleKeyItem[] = [];
              if (Array.isArray(parsed.keys)) {
                allKeys = parsed.keys;
              } else if (parsed.keyMaterial && parsed.username) {
                allKeys = [
                  {
                    dongleId: parsed.dongleId,
                    userId: parsed.userId,
                    username: parsed.username,
                    createdAt: parsed.createdAt,
                    keyMaterial: parsed.keyMaterial,
                  },
                ];
              }

              const storedUsernames = allKeys.map((k) => k.username).filter(Boolean);

              // If a specific target user was requested, find that key
              let activeKey: DongleKeyItem | null = null;
              if (targetUsernameOrId) {
                activeKey = EcdsaDongleService.findKeyForUser(parsed, targetUsernameOrId);
              } else if (allKeys.length > 0) {
                // Default to first or latest key
                activeKey = allKeys[allKeys.length - 1];
              }

              const systemId = parsed.systemId || "SECURECLASS-CORE-SYSTEM";

              return {
                connected: true,
                drive: rootPath,
                filePath: fullPath,
                systemId,
                dongleId: activeKey?.dongleId || parsed.dongleId,
                userId: activeKey?.userId || parsed.userId,
                username: activeKey?.username || parsed.username,
                createdAt: activeKey?.createdAt || parsed.createdAt,
                publicKeyPem: activeKey?.keyMaterial?.publicKeyPem || parsed.keyMaterial?.publicKeyPem,
                privateKeyPem: activeKey?.keyMaterial?.privateKeyPem || parsed.keyMaterial?.privateKeyPem,
                allKeys,
                storedUsernames,
                rawParsed: parsed,
              };
            }
          }
        } catch {
          // Drive not ready or permission denied, continue to next drive
        }
      }
    }

    return {
      connected: false,
      error: "USB Flashdisk fisik tidak terdeteksi. Pastikan flashdisk yang memuat 'dongle.key' telah dicolokkan ke port komputer.",
    };
  }

  /**
   * List all mounted drives on the system
   */
  public static listAvailableDrives(): string[] {
    const available: string[] = [];
    for (const letter of this.DRIVE_LETTERS) {
      const root = `${letter}:\\`;
      try {
        if (fs.existsSync(root)) {
          available.push(root);
        }
      } catch {}
    }
    return available;
  }

  /**
   * Writes dedicated single-system dongle key to dongle.key on a physical drive.
   * 1 Kunci Dongle untuk 1 Sistem.
   */
  public static appendDongleKeyToDrive(
    driveLetter: string,
    keyItem: DongleKeyItem
  ): { success: boolean; path: string; totalKeys: number; error?: string } {
    try {
      const cleanDrive = driveLetter.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1) + ":\\";
      
      // Keamanan Hardware: Tolak tegas partisi harddisk internal C:\ dan D:\
      if (cleanDrive.startsWith("C:") || cleanDrive.startsWith("D:")) {
        return {
          success: false,
          path: "",
          totalKeys: 0,
          error: "Dilarang keras menulis kunci dongle ke partisi harddisk internal (C:\\ atau D:\\). Dongle wajib berupa Flashdisk USB fisik.",
        };
      }

      const targetPath = path.join(cleanDrive, "dongle.key");

      // 1 Kunci Dongle untuk 1 Sistem
      const systemDongleFile = {
        format: "SECURECLASS_DONGLE_KEY",
        version: "1.0",
        systemId: "SECURECLASS-CORE-SYSTEM",
        description: "SecureClass 1-Dongle 1-System Dedicated Key",
        dongleId: keyItem.dongleId,
        userId: keyItem.userId,
        username: keyItem.username,
        createdAt: keyItem.createdAt,
        keyMaterial: keyItem.keyMaterial,
        securityNotice: EcdsaDongleService.SECURITY_NOTICE,
      };

      fs.writeFileSync(targetPath, JSON.stringify(systemDongleFile, null, 2), "utf8");

      return {
        success: true,
        path: targetPath,
        totalKeys: 1,
      };
    } catch (err: any) {
      return {
        success: false,
        path: "",
        totalKeys: 0,
        error: `Gagal menulis berkas ke drive: ${err.message}`,
      };
    }
  }
}
