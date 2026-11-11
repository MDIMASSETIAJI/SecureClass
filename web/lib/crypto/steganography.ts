import { PNG } from "pngjs";
import { AesGcmCipher } from "./aes-gcm";

export interface StegoEncodeResult {
  stegoPngBuffer: Buffer;
  width: number;
  height: number;
  capacityBytes: number;
  usedBytes: number;
  payloadLength: number;
  iv: string;
  authTag: string;
}

export interface StegoDecodeResult {
  plaintext: string;
  payloadLength: number;
  iv: string;
  authTag: string;
}

export class SteganographyService {
  private static readonly MAGIC = Buffer.from("SCST", "ascii"); // 4 bytes 'SecureClass Stego'
  private static readonly HEADER_OVERHEAD = 4 + 12 + 16 + 4; // 36 bytes (MAGIC + IV + TAG + LEN)

  /**
   * Embeds an encrypted message into a PNG image using LSB (Least Significant Bit)
   */
  public static async encode(
    imageBuffer: Buffer,
    plaintext: string,
    encryptionKeyHex: string
  ): Promise<StegoEncodeResult> {
    // 1. Encrypt plaintext using AES-256-GCM
    const encrypted = AesGcmCipher.encrypt(plaintext, encryptionKeyHex);
    const ciphertextBytes = Buffer.from(encrypted.ciphertext, "base64");
    const ivBytes = Buffer.from(encrypted.iv, "hex");
    const authTagBytes = Buffer.from(encrypted.authTag, "hex");

    // 2. Build full payload: MAGIC (4) + IV (12) + AUTH_TAG (16) + LEN (4) + CIPHERTEXT (N)
    const payloadBuffer = Buffer.alloc(this.HEADER_OVERHEAD + ciphertextBytes.length);
    let offset = 0;

    this.MAGIC.copy(payloadBuffer, offset);
    offset += 4;

    ivBytes.copy(payloadBuffer, offset);
    offset += 12;

    authTagBytes.copy(payloadBuffer, offset);
    offset += 16;

    payloadBuffer.writeUInt32BE(ciphertextBytes.length, offset);
    offset += 4;

    ciphertextBytes.copy(payloadBuffer, offset);

    // 3. Parse input PNG
    const png = await this.parsePng(imageBuffer);
    const totalPixels = png.width * png.height;
    // 3 color channels available per pixel (R, G, B) - Alpha channel (A) is untouched
    const maxCapacityBytes = Math.floor((totalPixels * 3) / 8);

    if (payloadBuffer.length > maxCapacityBytes) {
      throw new Error(
        `Kapasitas gambar tidak mencukupi! Dimensi ${png.width}x${png.height} hanya mampu menampung ` +
        `${maxCapacityBytes - this.HEADER_OVERHEAD} bytes pesan rahasia, sedangkan payload membutuhkan ${ciphertextBytes.length} bytes.`
      );
    }

    // 4. Inject payload bits into LSB of R, G, B channels
    let bitIndex = 0;
    const totalBitsToEmbed = payloadBuffer.length * 8;

    for (let i = 0; i < png.data.length && bitIndex < totalBitsToEmbed; i++) {
      // Skip Alpha channel (every 4th byte: index % 4 === 3)
      if (i % 4 === 3) continue;

      const byteIdx = Math.floor(bitIndex / 8);
      const bitOffset = 7 - (bitIndex % 8); // Most significant bit to least
      const bitValue = (payloadBuffer[byteIdx] >> bitOffset) & 1;

      // Clear LSB and write new bit
      png.data[i] = (png.data[i] & 0xfe) | bitValue;
      bitIndex++;
    }

    // 5. Serialize modified PNG with steganographic optimizations:
    // - Preserve original colorType (2 for RGB without alpha, 6 for RGBA) to prevent 33% byte inflation
    // - Set DEFLATE compression to maximum level 9
    const isRgba = Boolean((png as any).alpha) || (png as any).colorType === 6;
    const targetColorType = isRgba ? 6 : 2;

    let stegoPngBuffer = (PNG.sync.write as any)(png, {
      colorType: targetColorType,
      inputHasAlpha: true,
      deflateLevel: 9,
    });

    // 6. Re-insert preserved ancillary chunks (ICC profile, EXIF, pHYs, metadata)
    // so the file size, header structure, and forensic footprint match the original cover image
    const ancillaryChunks = this.extractAncillaryChunks(imageBuffer);
    if (ancillaryChunks.length > 0) {
      stegoPngBuffer = this.insertAncillaryChunks(stegoPngBuffer, ancillaryChunks);
    }

    return {
      stegoPngBuffer,
      width: png.width,
      height: png.height,
      capacityBytes: maxCapacityBytes - this.HEADER_OVERHEAD,
      usedBytes: payloadBuffer.length,
      payloadLength: ciphertextBytes.length,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    };
  }

  /**
   * Extracts and decrypts an embedded message from a stego PNG image
   */
  public static async decode(
    stegoPngBuffer: Buffer,
    encryptionKeyHex: string
  ): Promise<StegoDecodeResult> {
    const png = await this.parsePng(stegoPngBuffer);

    // Read bits sequentially
    const extractedBits: number[] = [];
    const maxBitsToRead = png.width * png.height * 3;

    for (let i = 0; i < png.data.length && extractedBits.length < maxBitsToRead; i++) {
      if (i % 4 === 3) continue; // Skip alpha
      extractedBits.push(png.data[i] & 1);
    }

    const readBytes = (numBytes: number, startBit: number): Buffer => {
      const buf = Buffer.alloc(numBytes);
      for (let b = 0; b < numBytes; b++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const bitIdx = startBit + b * 8 + bit;
          if (bitIdx < extractedBits.length) {
            byteVal = (byteVal << 1) | extractedBits[bitIdx];
          }
        }
        buf[b] = byteVal;
      }
      return buf;
    };

    // 1. Verify Magic Header
    const magic = readBytes(4, 0);
    if (!magic.equals(this.MAGIC)) {
      throw new Error(
        "Gambar tidak memuat penanda steganografi SecureClass (Magic Header 'SCST' tidak ditemukan atau gambar rusak/bukan format PNG asli)."
      );
    }

    // 2. Extract IV (12 bytes) and Auth Tag (16 bytes)
    const ivBytes = readBytes(12, 4 * 8);
    const authTagBytes = readBytes(16, (4 + 12) * 8);

    // 3. Extract Ciphertext Length (4 bytes)
    const lenBuffer = readBytes(4, (4 + 12 + 16) * 8);
    const ciphertextLength = lenBuffer.readUInt32BE(0);

    const maxPayloadAllowed = Math.floor((maxBitsToRead - this.HEADER_OVERHEAD * 8) / 8);
    if (ciphertextLength <= 0 || ciphertextLength > maxPayloadAllowed) {
      throw new Error(`Panjang payload steganografi (${ciphertextLength} bytes) tidak valid atau melebihi kapasitas gambar.`);
    }

    // 4. Extract Ciphertext
    const ciphertextBytes = readBytes(ciphertextLength, this.HEADER_OVERHEAD * 8);

    // 5. Decrypt using AES-256-GCM and verify Auth Tag
    const plaintext = AesGcmCipher.decrypt(
      {
        ciphertext: ciphertextBytes.toString("base64"),
        iv: ivBytes.toString("hex"),
        authTag: authTagBytes.toString("hex"),
      },
      encryptionKeyHex
    );

    return {
      plaintext,
      payloadLength: ciphertextLength,
      iv: ivBytes.toString("hex"),
      authTag: authTagBytes.toString("hex"),
    };
  }

  private static parsePng(buffer: Buffer): Promise<PNG> {
    return new Promise((resolve, reject) => {
      const png = new PNG();
      png.parse(buffer, (err, data) => {
        if (err) return reject(new Error(`Gagal memproses berkas PNG: ${err.message}`));
        resolve(data);
      });
    });
  }

  /**
   * Extracts non-critical (ancillary) chunks from a PNG buffer (e.g. iCCP, pHYs, eXIf, tEXt).
   * Critical chunks (IHDR, PLTE, IDAT, IEND) are omitted because they are regenerated by the PNG encoder.
   */
  private static extractAncillaryChunks(buffer: Buffer): Buffer[] {
    const ancillary: Buffer[] = [];
    if (buffer.length < 8) return ancillary;

    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!buffer.subarray(0, 8).equals(signature)) return ancillary;

    let offset = 8;
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      const totalChunkLength = 12 + length;

      if (offset + totalChunkLength > buffer.length) break;

      if (!["IHDR", "PLTE", "IDAT", "IEND"].includes(type)) {
        ancillary.push(buffer.subarray(offset, offset + totalChunkLength));
      }
      offset += totalChunkLength;
    }
    return ancillary;
  }

  /**
   * Re-inserts preserved ancillary chunks between IHDR and IDAT to maintain original metadata footprint.
   */
  private static insertAncillaryChunks(stegoBuffer: Buffer, ancillaryChunks: Buffer[]): Buffer {
    if (!ancillaryChunks || ancillaryChunks.length === 0) return stegoBuffer;
    if (stegoBuffer.length < 8 + 12) return stegoBuffer;

    const ihdrLength = stegoBuffer.readUInt32BE(8);
    const ihdrEnd = 8 + 12 + ihdrLength;
    if (ihdrEnd > stegoBuffer.length) return stegoBuffer;

    const preIhdr = stegoBuffer.subarray(0, ihdrEnd);
    const postIhdr = stegoBuffer.subarray(ihdrEnd);

    return Buffer.concat([preIhdr, ...ancillaryChunks, postIhdr]);
  }
}

