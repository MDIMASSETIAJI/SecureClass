/**
 * Vigenère Cipher Implementation & Educational Documentation
 * 
 * KRITIK KEAMANAN:
 * Vigenère Cipher merupakan cipher substitusi polialfabetik klasik (diciptakan abad ke-16).
 * Algoritma ini TIDAK AMAN jika digunakan secara mandiri pada era komputasi modern karena rentan
 * terhadap:
 * 1. Kasiski Examination: Mencari pengulangan segmen teks untuk menentukan panjang kunci.
 * 2. Friedman Test (Indeks Koinsidensi): Menghitung frekuensi huruf untuk mengekstrak kunci.
 * 3. Serangan Known-Plaintext & Brute-force: Panjang kunci pendek dapat dipecahkan dalam hitungan milidetik.
 * 
 * Dalam arsitektur SecureClass, Vigenère digunakan secara eksplisit sebagai LAPISAN PERTAMA
 * dalam skema "Super Encryption" (Vigenère -> AES-256-GCM), di mana lapisan kedua AES-256-GCM
 * memberikan kerahasiaan modern berbasis difusi-konfusi kuat dan integritas data melalui AEAD authentication tag.
 */

export class VigenereCipher {
  /**
   * Sanitizes and expands the key
   */
  private static sanitizeKey(key: string): string {
    const cleaned = key.trim();
    if (!cleaned) throw new Error("Kunci Vigenère tidak boleh kosong.");
    return cleaned;
  }

  /**
   * Encrypts plaintext using Vigenère Cipher
   * Supports standard alphabetic shift (case-preserving) and handles non-alphabetic characters safely.
   */
  public static encrypt(plaintext: string, key: string): string {
    const cleanKey = this.sanitizeKey(key);
    let keyIdx = 0;
    const result: string[] = [];

    for (let i = 0; i < plaintext.length; i++) {
      const char = plaintext[i];
      const charCode = plaintext.charCodeAt(i);

      // Uppercase letters (A-Z: 65-90)
      if (charCode >= 65 && charCode <= 90) {
        const kChar = cleanKey[keyIdx % cleanKey.length].toUpperCase();
        const shift = kChar.charCodeAt(0) - 65;
        const encryptedChar = String.fromCharCode(((charCode - 65 + shift) % 26) + 65);
        result.push(encryptedChar);
        keyIdx++;
      }
      // Lowercase letters (a-z: 97-122)
      else if (charCode >= 97 && charCode <= 122) {
        const kChar = cleanKey[keyIdx % cleanKey.length].toLowerCase();
        const shift = kChar.charCodeAt(0) - 97;
        const encryptedChar = String.fromCharCode(((charCode - 97 + shift) % 26) + 97);
        result.push(encryptedChar);
        keyIdx++;
      }
      // Non-alphabetic characters (digits, whitespace, punctuation, UTF-8 symbols)
      else {
        result.push(char);
      }
    }

    return result.join("");
  }

  /**
   * Decrypts ciphertext using Vigenère Cipher
   */
  public static decrypt(ciphertext: string, key: string): string {
    const cleanKey = this.sanitizeKey(key);
    let keyIdx = 0;
    const result: string[] = [];

    for (let i = 0; i < ciphertext.length; i++) {
      const char = ciphertext[i];
      const charCode = ciphertext.charCodeAt(i);

      // Uppercase letters (A-Z)
      if (charCode >= 65 && charCode <= 90) {
        const kChar = cleanKey[keyIdx % cleanKey.length].toUpperCase();
        const shift = kChar.charCodeAt(0) - 65;
        const decryptedChar = String.fromCharCode(((charCode - 65 - shift + 26) % 26) + 65);
        result.push(decryptedChar);
        keyIdx++;
      }
      // Lowercase letters (a-z)
      else if (charCode >= 97 && charCode <= 122) {
        const kChar = cleanKey[keyIdx % cleanKey.length].toLowerCase();
        const shift = kChar.charCodeAt(0) - 97;
        const decryptedChar = String.fromCharCode(((charCode - 97 - shift + 26) % 26) + 97);
        result.push(decryptedChar);
        keyIdx++;
      }
      // Non-alphabetic characters preserved as-is
      else {
        result.push(char);
      }
    }

    return result.join("");
  }

  /**
   * Full byte-level Polyalphabetic Vigenère variant for arbitrary binary / unicode payloads
   */
  public static encryptBytes(data: Uint8Array, key: string): Uint8Array {
    const keyBytes = Buffer.from(key, "utf8");
    const output = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      output[i] = (data[i] + keyBytes[i % keyBytes.length]) % 256;
    }
    return output;
  }

  public static decryptBytes(data: Uint8Array, key: string): Uint8Array {
    const keyBytes = Buffer.from(key, "utf8");
    const output = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      output[i] = (data[i] - keyBytes[i % keyBytes.length] + 256) % 256;
    }
    return output;
  }
}

