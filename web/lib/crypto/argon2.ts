import { argon2id as wasmArgon2id } from "hash-wasm";
import crypto from "crypto";

export interface Argon2Options {
  memoryCost?: number;   // default 19456 KB (19 MB)
  timeCost?: number;     // default 2 iterations
  parallelism?: number;  // default 1 thread
}

let nativeArgon2: any = null;
try {
  // Only attempt native require on server side
  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeArgon2 = require("@node-rs/argon2");
  }
} catch {
  nativeArgon2 = null;
}

/**
 * Hash password using Argon2id
 * Argon2id is the hybrid version of Argon2, providing state-of-the-art protection against
 * both GPU cracking (memory-hard) and side-channel timing attacks.
 */
export async function hashPassword(password: string, opts?: Argon2Options): Promise<string> {
  const memoryCost = opts?.memoryCost ?? 19456;
  const timeCost = opts?.timeCost ?? 2;
  const parallelism = opts?.parallelism ?? 1;

  if (nativeArgon2) {
    try {
      return await nativeArgon2.hash(password, {
        algorithm: nativeArgon2.Algorithm.Argon2id,
        memoryCost,
        timeCost,
        parallelism,
      });
    } catch {
      // Fallback to WebAssembly
    }
  }

  // Guaranteed fallback: WebAssembly Argon2id
  const salt = crypto.randomBytes(16);
  return await wasmArgon2id({
    password,
    salt,
    iterations: timeCost,
    memorySize: memoryCost,
    parallelism,
    hashLength: 32,
    outputType: "encoded",
  });
}

/**
 * Verify plaintext password against Argon2id hash string
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash || !password) return false;

  if (nativeArgon2) {
    try {
      return await nativeArgon2.verify(hash, password);
    } catch {
      // Fallback to wasm or verify manually
    }
  }

  try {
    // Parse Argon2 hash parameters: $argon2id$v=19$m=19456,t=2,p=1$<salt_b64>$<hash_b64>
    const parts = hash.split("$");
    if (parts.length >= 6) {
      const paramStr = parts[3]; // m=...,t=...,p=...
      const mMatch = paramStr.match(/m=(\d+)/);
      const tMatch = paramStr.match(/t=(\d+)/);
      const pMatch = paramStr.match(/p=(\d+)/);

      const memorySize = mMatch ? parseInt(mMatch[1], 10) : 19456;
      const iterations = tMatch ? parseInt(tMatch[1], 10) : 2;
      const parallelism = pMatch ? parseInt(pMatch[1], 10) : 1;

      // Base64 unpadded URL safe decode for salt
      let saltB64 = parts[4].replace(/-/g, "+").replace(/_/g, "/");
      while (saltB64.length % 4 !== 0) saltB64 += "=";
      const salt = Buffer.from(saltB64, "base64");

      const recomputed = await wasmArgon2id({
        password,
        salt,
        iterations,
        memorySize,
        parallelism,
        hashLength: 32,
        outputType: "encoded",
      });

      return recomputed === hash;
    }
  } catch (err) {
    console.error("Argon2 verify fallback error:", err);
  }

  return false;
}

/**
 * Validate password strength against academic cybersecurity standards
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Password minimal 8 karakter.");
  if (!/[A-Z]/.test(password)) errors.push("Password harus mengandung minimal satu huruf besar (A-Z).");
  if (!/[a-z]/.test(password)) errors.push("Password harus mengandung minimal satu huruf kecil (a-z).");
  if (!/[0-9]/.test(password)) errors.push("Password harus mengandung minimal satu angka (0-9).");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password harus mengandung minimal satu karakter simbol khusus.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
