import crypto from "crypto";

export interface DongleKeyItem {
  dongleId: string;
  userId: string;
  username: string;
  createdAt: string;
  keyMaterial: {
    curve: string;
    algorithm: string;
    publicKeyPem: string;
    privateKeyPem: string;
  };
}

export interface MultiDongleKeyFile {
  format: string;
  version: string;
  description: string;
  keys: DongleKeyItem[];
  securityNotice: string;
  // Backward compatibility with legacy single key format
  dongleId?: string;
  userId?: string;
  username?: string;
  createdAt?: string;
  keyMaterial?: {
    curve: string;
    algorithm: string;
    publicKeyPem: string;
    privateKeyPem: string;
  };
}

export class EcdsaDongleService {
  public static readonly SECURITY_NOTICE =
    "PEMBERITAHUAN KEAMANAN KRIPTOGRAFI: Flashdisk FAT32 bertindak sebagai wadah berkas kunci fisik konvensional, BUKAN tamper-resistant hardware enclave (seperti YubiKey HSM). Berkas dongle.key ini secara teoritis dapat disalin apabila flashdisk jatuh ke tangan penyerang. Oleh karena itu, SecureClass mengandalkan arsitektur Pertahanan Berlapis (Defense-in-Depth), di mana kepemilikan dongle wajib dilengkapi dengan pengetahuan Password Argon2id dan kehadiran fisik Biometrik Wajah Liveness.";

  /**
   * Generates a new ECDSA P-256 Keypair for a user and packages it as DongleKeyItem
   */
  public static generateDongleKey(userId: string, username: string): {
    dongleId: string;
    publicKeyPem: string;
    keyItem: DongleKeyItem;
    dongleKeyFile: MultiDongleKeyFile;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1", // NIST P-256
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const dongleId = `DGL-${username.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const keyItem: DongleKeyItem = {
      dongleId,
      userId,
      username,
      createdAt: new Date().toISOString(),
      keyMaterial: {
        curve: "P-256",
        algorithm: "ECDSA",
        publicKeyPem: publicKey,
        privateKeyPem: privateKey,
      },
    };

    const dongleKeyFile: MultiDongleKeyFile & { systemId?: string } = {
      format: "SECURECLASS_DONGLE_KEY",
      version: "1.0",
      systemId: "SECURECLASS-CORE-SYSTEM",
      description: "SecureClass 1-Dongle 1-System Dedicated Key",
      keys: [keyItem],
      dongleId: keyItem.dongleId,
      userId: keyItem.userId,
      username: keyItem.username,
      createdAt: keyItem.createdAt,
      keyMaterial: keyItem.keyMaterial,
      securityNotice: this.SECURITY_NOTICE,
    };

    return {
      dongleId,
      publicKeyPem: publicKey,
      keyItem,
      dongleKeyFile,
    };
  }

  /**
   * Appends or updates a user key inside a multi-key dongle file
   * If user 1, 2, 3 register on the same dongle, all 3 keys are preserved!
   */
  public static appendOrUpdateKey(
    existingFileContent: string | null | undefined,
    newKeyItem: DongleKeyItem
  ): MultiDongleKeyFile {
    let existingKeys: DongleKeyItem[] = [];

    if (existingFileContent && existingFileContent.trim()) {
      try {
        const parsed = JSON.parse(existingFileContent);
        if (Array.isArray(parsed.keys)) {
          existingKeys = parsed.keys;
        } else if (parsed.keyMaterial && parsed.username) {
          // Legacy single key format -> convert to item
          existingKeys = [
            {
              dongleId: parsed.dongleId,
              userId: parsed.userId,
              username: parsed.username,
              createdAt: parsed.createdAt || new Date().toISOString(),
              keyMaterial: parsed.keyMaterial,
            },
          ];
        }
      } catch (e) {
        console.warn("Could not parse existing dongle.key, starting fresh key list:", e);
      }
    }

    // Filter out previous key for this user if re-registering
    const filteredKeys = existingKeys.filter(
      (k) => k.username !== newKeyItem.username && k.userId !== newKeyItem.userId
    );

    // Append new user's key
    filteredKeys.push(newKeyItem);

    return {
      format: "SECURECLASS_DONGLE_KEY",
      version: "2.0",
      description: "SecureClass Multi-User USB Dongle Key Store",
      keys: filteredKeys,
      dongleId: newKeyItem.dongleId,
      userId: newKeyItem.userId,
      username: newKeyItem.username,
      createdAt: newKeyItem.createdAt,
      keyMaterial: newKeyItem.keyMaterial,
      securityNotice: this.SECURITY_NOTICE,
    };
  }

  /**
   * Extracts the matching key for a specific user from a dongle key file object
   */
  public static findKeyForUser(
    dongleData: any,
    identifier: string // username, userId, or dongleId
  ): DongleKeyItem | null {
    if (!dongleData) return null;

    // 1. Search in keys array
    if (Array.isArray(dongleData.keys)) {
      const match = dongleData.keys.find(
        (k: DongleKeyItem) =>
          k.username?.toLowerCase() === identifier.toLowerCase() ||
          k.userId === identifier ||
          k.dongleId === identifier
      );
      if (match && match.keyMaterial?.privateKeyPem) return match;
    }

    // 2. Check root level single key format
    if (
      (dongleData.username?.toLowerCase() === identifier.toLowerCase() ||
        dongleData.userId === identifier ||
        dongleData.dongleId === identifier) &&
      dongleData.keyMaterial?.privateKeyPem
    ) {
      return {
        dongleId: dongleData.dongleId,
        userId: dongleData.userId,
        username: dongleData.username,
        createdAt: dongleData.createdAt,
        keyMaterial: dongleData.keyMaterial,
      };
    }

    return null;
  }

  /**
   * Generates a 32-byte cryptographic challenge nonce
   */
  public static generateChallenge(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Verifies an ECDSA P-256 signature against a challenge
   */
  public static verifySignature(
    challengeData: string,
    signatureHexOrBase64: string,
    publicKeyPem: string
  ): boolean {
    try {
      const dataBuffer = Buffer.from(challengeData, "utf8");

      let signatureBuffer: Buffer;
      if (/^[0-9a-fA-F]+$/.test(signatureHexOrBase64)) {
        signatureBuffer = Buffer.from(signatureHexOrBase64, "hex");
      } else {
        signatureBuffer = Buffer.from(signatureHexOrBase64, "base64");
      }

      // If signature is 64 bytes (raw R + S from Web Crypto API), convert to DER format
      if (signatureBuffer.length === 64) {
        signatureBuffer = this.rawP1363ToDer(signatureBuffer);
      }

      const verify = crypto.createVerify("SHA256");
      verify.update(dataBuffer);
      return verify.verify(publicKeyPem, signatureBuffer);
    } catch (err) {
      console.error("ECDSA verification error:", err);
      return false;
    }
  }

  /**
   * Helper to convert 64-byte raw WebCrypto signature (r [32] || s [32]) into ASN.1 DER sequence
   */
  private static rawP1363ToDer(rawSig: Buffer): Buffer {
    let r = rawSig.subarray(0, 32);
    let s = rawSig.subarray(32, 64);

    if (r[0] & 0x80) r = Buffer.concat([Buffer.from([0x00]), r]);
    if (s[0] & 0x80) s = Buffer.concat([Buffer.from([0x00]), s]);

    const rLen = r.length;
    const sLen = s.length;
    const totalLen = 4 + rLen + sLen;

    return Buffer.concat([
      Buffer.from([0x30, totalLen, 0x02, rLen]),
      r,
      Buffer.from([0x02, sLen]),
      s,
    ]);
  }
}
