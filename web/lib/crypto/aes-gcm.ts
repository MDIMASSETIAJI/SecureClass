import crypto from "crypto";
import { VigenereCipher } from "./vigenere";

export interface EncryptedPayload {
  ciphertext: string;    // Base64 encoded ciphertext
  iv: string;            // Hex 12-byte IV (96 bits)
  authTag: string;       // Hex 16-byte Auth Tag (128 bits)
  keyVersion: number;
  algorithm: string;
}

export class AesGcmCipher {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH = 12; // 96-bit recommended standard for GCM
  private static readonly AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

  /**
   * Derives or validates a 32-byte (256-bit) buffer key
   */
  public static getKeyBuffer(keyHexOrSecret: string): Buffer {
    if (/^[0-9a-fA-F]{64}$/.test(keyHexOrSecret)) {
      return Buffer.from(keyHexOrSecret, "hex");
    }
    // If not 64 hex chars, hash with SHA-256 to ensure exact 32-byte key
    return crypto.createHash("sha256").update(keyHexOrSecret).digest();
  }

  /**
   * Standard AES-256-GCM Encryption
   */
  public static encrypt(
    plaintext: string | Buffer,
    keyHexOrSecret: string,
    keyVersion: number = 1
  ): EncryptedPayload {
    const key = this.getKeyBuffer(keyHexOrSecret);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });

    const dataBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      keyVersion,
      algorithm: "AES-256-GCM",
    };
  }

  /**
   * Standard AES-256-GCM Decryption with Authentication Tag Verification
   * Throws Error if the ciphertext, IV, or auth tag was tampered with.
   */
  public static decrypt(
    payload: { ciphertext: string; iv: string; authTag: string },
    keyHexOrSecret: string
  ): string {
    const key = this.getKeyBuffer(keyHexOrSecret);
    const iv = Buffer.from(payload.iv, "hex");
    const authTag = Buffer.from(payload.authTag, "hex");
    const encrypted = Buffer.from(payload.ciphertext, "base64");

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  }

  /**
   * SUPER ENCRYPTION (Vigenère + AES-256-GCM)
   * Layer 1: Vigenère Cipher (Classical Polyalphabetic Substitution)
   * Layer 2: AES-256-GCM (Modern Authenticated Encryption with Associated Data)
   */
  public static superEncrypt(
    plaintext: string,
    vigenereKey: string,
    aesKeyHexOrSecret: string,
    keyVersion: number = 1
  ): EncryptedPayload {
    if (!vigenereKey || !vigenereKey.trim()) {
      throw new Error("Kunci Vigenère harus diisi untuk Super Encryption.");
    }

    // Step 1: Classical layer
    const layer1Ciphertext = VigenereCipher.encrypt(plaintext, vigenereKey);

    // Step 2: Modern AES-256-GCM layer
    const result = this.encrypt(layer1Ciphertext, aesKeyHexOrSecret, keyVersion);
    result.algorithm = "VIGENERE+AES-256-GCM";
    return result;
  }

  /**
   * SUPER DECRYPTION (AES-256-GCM Decryption -> Vigenère Decryption)
   * Strictly validates integrity tag before executing Vigenère decoding.
   */
  public static superDecrypt(
    payload: { ciphertext: string; iv: string; authTag: string },
    vigenereKey: string,
    aesKeyHexOrSecret: string
  ): string {
    if (!vigenereKey || !vigenereKey.trim()) {
      throw new Error("Kunci Vigenère harus diisi untuk Super Decryption.");
    }

    // Step 1: Authenticated decryption
    const layer1Ciphertext = this.decrypt(payload, aesKeyHexOrSecret);

    // Step 2: Classical decryption
    const plaintext = VigenereCipher.decrypt(layer1Ciphertext, vigenereKey);
    return plaintext;
  }

  /**
   * Biometric Vector Encryption (Encrypts 512-dim Float array into AES-256-GCM)
   */
  public static encryptEmbedding(
    embedding: number[],
    biometricKeyHex: string
  ): { encryptedEmbedding: string; iv: string; authTag: string } {
    const jsonStr = JSON.stringify(embedding);
    const encrypted = this.encrypt(jsonStr, biometricKeyHex);
    return {
      encryptedEmbedding: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    };
  }

  /**
   * Biometric Vector Decryption
   */
  public static decryptEmbedding(
    encryptedEmbedding: string,
    iv: string,
    authTag: string,
    biometricKeyHex: string
  ): number[] {
    const jsonStr = this.decrypt({ ciphertext: encryptedEmbedding, iv, authTag }, biometricKeyHex);
    return JSON.parse(jsonStr) as number[];
  }
}

