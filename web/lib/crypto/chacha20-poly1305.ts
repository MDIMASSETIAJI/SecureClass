import crypto from "crypto";

export interface EncryptedFileResult {
  encryptedBuffer: Buffer;
  nonce: string;         // 12-byte hex (96-bit nonce)
  authTag: string;       // 16-byte hex (128-bit Poly1305 tag)
  checksumSha256: string; // SHA-256 of encrypted data
  keyVersion: number;
  algorithm: string;
}

export class ChaChaFileCipher {
  private static readonly ALGORITHM = "chacha20-poly1305";
  private static readonly NONCE_LENGTH = 12; // 96-bit IETF RFC 8439 standard nonce
  private static readonly AUTH_TAG_LENGTH = 16; // 128-bit Poly1305 MAC

  /**
   * Derives 32-byte key from string
   */
  public static getKeyBuffer(keyHexOrSecret: string): Buffer {
    if (/^[0-9a-fA-F]{64}$/.test(keyHexOrSecret)) {
      return Buffer.from(keyHexOrSecret, "hex");
    }
    return crypto.createHash("sha256").update(keyHexOrSecret).digest();
  }

  /**
   * Derives key from user password and salt
   */
  public static deriveKeyFromPassword(password: string, salt: string, masterKey: string): string {
    return crypto.createHash("sha256").update(`${password}:${salt}:${masterKey}`).digest("hex");
  }

  /**
   * Encrypt file buffer with ChaCha20-Poly1305
   * Generates a fresh unique 96-bit nonce for every single file.
   */
  public static encryptFile(
    fileBuffer: Buffer,
    keyHexOrSecret: string,
    keyVersion: number = 1
  ): EncryptedFileResult {
    const key = this.getKeyBuffer(keyHexOrSecret);
    const nonce = crypto.randomBytes(this.NONCE_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, nonce, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const checksumSha256 = crypto.createHash("sha256").update(encrypted).digest("hex");

    return {
      encryptedBuffer: encrypted,
      nonce: nonce.toString("hex"),
      authTag: authTag.toString("hex"),
      checksumSha256,
      keyVersion,
      algorithm: "ChaCha20-Poly1305",
    };
  }

  /**
   * Decrypt file buffer with ChaCha20-Poly1305
   * Strictly validates Poly1305 authentication tag.
   * Throws Error if file is corrupt or tampered with.
   */
  public static decryptFile(
    encryptedBuffer: Buffer,
    nonceHex: string,
    authTagHex: string,
    keyHexOrSecret: string
  ): Buffer {
    const key = this.getKeyBuffer(keyHexOrSecret);
    const nonce = Buffer.from(nonceHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    if (nonce.length !== this.NONCE_LENGTH) {
      throw new Error(`Invalid ChaCha20 nonce length: expected ${this.NONCE_LENGTH} bytes.`);
    }
    if (authTag.length !== this.AUTH_TAG_LENGTH) {
      throw new Error(`Invalid Poly1305 auth tag length: expected ${this.AUTH_TAG_LENGTH} bytes.`);
    }

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, nonce, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted;
  }
}

