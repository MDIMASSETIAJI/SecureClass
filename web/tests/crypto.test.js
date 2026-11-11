const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PNG } = require("pngjs");

// Load modules directly from compiled or JS equivalents for standalone testing
const argon2 = require("@node-rs/argon2");

// Vigenère Implementation Test
function vigenereEncrypt(plaintext, key) {
  let keyIdx = 0;
  const result = [];
  for (let i = 0; i < plaintext.length; i++) {
    const code = plaintext.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      const shift = key[keyIdx % key.length].toUpperCase().charCodeAt(0) - 65;
      result.push(String.fromCharCode(((code - 65 + shift) % 26) + 65));
      keyIdx++;
    } else if (code >= 97 && code <= 122) {
      const shift = key[keyIdx % key.length].toLowerCase().charCodeAt(0) - 97;
      result.push(String.fromCharCode(((code - 97 + shift) % 26) + 97));
      keyIdx++;
    } else {
      result.push(plaintext[i]);
    }
  }
  return result.join("");
}

function vigenereDecrypt(ciphertext, key) {
  let keyIdx = 0;
  const result = [];
  for (let i = 0; i < ciphertext.length; i++) {
    const code = ciphertext.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      const shift = key[keyIdx % key.length].toUpperCase().charCodeAt(0) - 65;
      result.push(String.fromCharCode(((code - 65 - shift + 26) % 26) + 65));
      keyIdx++;
    } else if (code >= 97 && code <= 122) {
      const shift = key[keyIdx % key.length].toLowerCase().charCodeAt(0) - 97;
      result.push(String.fromCharCode(((code - 97 - shift + 26) % 26) + 97));
      keyIdx++;
    } else {
      result.push(ciphertext[i]);
    }
  }
  return result.join("");
}

// AES-256-GCM Implementation Test
function aesGcmEncrypt(plaintext, keyBuffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext: encrypted.toString("base64"), iv: iv.toString("hex"), authTag: authTag.toString("hex") };
}

function aesGcmDecrypt(payload, keyBuffer) {
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const encrypted = Buffer.from(payload.ciphertext, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// ChaCha20-Poly1305 Implementation Test
function chachaEncrypt(fileBuffer, keyBuffer) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("chacha20-poly1305", keyBuffer, nonce, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted, nonce: nonce.toString("hex"), authTag: authTag.toString("hex") };
}

function chachaDecrypt(encryptedBuffer, nonceHex, authTagHex, keyBuffer) {
  const nonce = Buffer.from(nonceHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("chacha20-poly1305", keyBuffer, nonce, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

test("1. Argon2id Password Hashing & Verification", async () => {
  const password = "SecureClassPassword2026!";
  const hash = await argon2.hash(password, { algorithm: argon2.Algorithm.Argon2id });
  assert.ok(hash.startsWith("$argon2id$"), "Hash should start with $argon2id$");

  const isValid = await argon2.verify(hash, password);
  assert.equal(isValid, true, "Valid password should verify as true");

  const isInvalid = await argon2.verify(hash, "WrongPassword!");
  assert.equal(isInvalid, false, "Wrong password should verify as false");
});

test("2. Vigenère Cipher: Enkripsi, Dekripsi, & Penanganan Karakter", () => {
  const key = "KRIPTO";
  const plaintext = "Selamat Datang di SecureClass 2026! Tugas #1 Selesai.";

  const encrypted = vigenereEncrypt(plaintext, key);
  assert.notEqual(encrypted, plaintext, "Ciphertext should differ from plaintext");

  const decrypted = vigenereDecrypt(encrypted, key);
  assert.equal(decrypted, plaintext, "Decrypted text must match original plaintext exactly");

  // Non-alphabetic and numbers preserved
  assert.ok(decrypted.includes("2026!"), "Numbers and punctuation preserved");
  assert.ok(decrypted.includes("#1"), "Special characters preserved");
});

test("3. AES-256-GCM: Kerahasiaan & Deteksi Perusakan Integritas (Tamper-Resistance)", () => {
  const key = crypto.randomBytes(32);
  const message = "Dokumen Ujian Rahasia Universitas";

  const payload = aesGcmEncrypt(message, key);
  assert.ok(payload.ciphertext);
  assert.equal(payload.iv.length, 24, "IV should be 12 bytes = 24 hex chars");
  assert.equal(payload.authTag.length, 32, "Auth tag should be 16 bytes = 32 hex chars");

  const decrypted = aesGcmDecrypt(payload, key);
  assert.equal(decrypted, message, "Decrypted message must match original");

  // Tamper test: Modify 1 bit in ciphertext
  const rawBytes = Buffer.from(payload.ciphertext, "base64");
  rawBytes[0] ^= 0x01; // flip 1 bit
  const tamperedPayload = { ...payload, ciphertext: rawBytes.toString("base64") };

  assert.throws(
    () => aesGcmDecrypt(tamperedPayload, key),
    /Unsupported state or unable to authenticate data/,
    "Tampered ciphertext must be rejected by GCM authentication tag verification"
  );
});

test("4. Super Encryption (Vigenère + AES-256-GCM)", () => {
  const aesKey = crypto.randomBytes(32);
  const vigenereKey = "SUPERKEY";
  const plaintext = "Pesan Sangat Rahasia dari Dosen ke Mahasiswa";

  // Layer 1: Vigenere
  const layer1 = vigenereEncrypt(plaintext, vigenereKey);
  // Layer 2: AES-256-GCM
  const layer2 = aesGcmEncrypt(layer1, aesKey);

  // Decrypt Layer 2: AES-256-GCM
  const recoveredLayer1 = aesGcmDecrypt(layer2, aesKey);
  assert.equal(recoveredLayer1, layer1);

  // Decrypt Layer 1: Vigenere
  const recoveredPlaintext = vigenereDecrypt(recoveredLayer1, vigenereKey);
  assert.equal(recoveredPlaintext, plaintext);

  // Decrypt with wrong Vigenere key produces garbled text (defense-in-depth)
  const wrongKeyPlaintext = vigenereDecrypt(recoveredLayer1, "WRONGKEY");
  assert.notEqual(wrongKeyPlaintext, plaintext);
});

test("5. ChaCha20-Poly1305 File Encryption & Authentication", () => {
  const key = crypto.randomBytes(32);
  const originalFile = Buffer.from("Laporan_Praktikum_Kriptografi_Mahasiswa_Ahmad.pdf");

  const enc1 = chachaEncrypt(originalFile, key);
  const enc2 = chachaEncrypt(originalFile, key);

  // Verify fresh nonce per operation (nonce reuse prevented)
  assert.notEqual(enc1.nonce, enc2.nonce, "Nonce must be unique for each encryption operation");

  // Decrypt
  const decrypted = chachaDecrypt(enc1.encrypted, enc1.nonce, enc1.authTag, key);
  assert.deepEqual(decrypted, originalFile, "Decrypted file must match original byte-for-byte");

  // Tamper test on encrypted file
  const tamperedBuffer = Buffer.from(enc1.encrypted);
  tamperedBuffer[tamperedBuffer.length - 1] ^= 0xff;

  assert.throws(
    () => chachaDecrypt(tamperedBuffer, enc1.nonce, enc1.authTag, key),
    /Unsupported state or unable to authenticate data/,
    "Poly1305 MAC tag must immediately reject modified file bytes"
  );
});

test("6. USB Dongle ECDSA P-256 Challenge-Response", () => {
  // Generate EC keypair prime256v1 (P-256)
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const challengeNonce = crypto.randomBytes(32).toString("hex");

  // Sign challenge with private key
  const signer = crypto.createSign("SHA256");
  signer.update(Buffer.from(challengeNonce, "utf8"));
  const signature = signer.sign(privateKey);

  // Verify with registered public key
  const verifier = crypto.createVerify("SHA256");
  verifier.update(Buffer.from(challengeNonce, "utf8"));
  const isValid = verifier.verify(publicKey, signature);
  assert.equal(isValid, true, "Legitimate ECDSA signature must verify");

  // Forged challenge verification
  const verifierForged = crypto.createVerify("SHA256");
  verifierForged.update(Buffer.from("ForgedChallenge123", "utf8"));
  const isForgedValid = verifierForged.verify(publicKey, signature);
  assert.equal(isForgedValid, false, "Signature must not verify against a different challenge");
});

test("7. Tamper-Evident Hash Chain (SHA-256)", () => {
  function computeHash(index, timestamp, prevHash, data) {
    return crypto.createHash("sha256").update(`${index}:${timestamp}:${prevHash}:${data}`).digest("hex");
  }

  const prevGenesis = "0000000000000000000000000000000000000000000000000000000000000000";
  const t0 = "2026-01-01T00:00:00.000Z";
  const data0 = JSON.stringify({ action: "GENESIS" });
  const hash0 = computeHash(0, t0, prevGenesis, data0);

  const t1 = "2026-01-02T00:00:00.000Z";
  const data1 = JSON.stringify({ action: "TASK_CREATE", title: "Tugas 1" });
  const hash1 = computeHash(1, t1, hash0, data1);

  const t2 = "2026-01-03T00:00:00.000Z";
  const data2 = JSON.stringify({ action: "TASK_SUBMISSION", student: "ahmad" });
  const hash2 = computeHash(2, t2, hash1, data2);

  // Verify chain linkage
  assert.equal(computeHash(1, t1, hash0, data1), hash1, "Block 1 hash valid");
  assert.equal(computeHash(2, t2, hash1, data2), hash2, "Block 2 hash valid");

  // Tamper Block 1 data
  const tamperedData1 = JSON.stringify({ action: "TASK_CREATE", title: "Tugas 1 (MODIFIED)" });
  const recomputedHash1 = computeHash(1, t1, hash0, tamperedData1);
  assert.notEqual(recomputedHash1, hash1, "Altered data in Block 1 alters its hash!");

  // And breaks link to Block 2
  const recomputedHash2 = computeHash(2, t2, recomputedHash1, data2);
  assert.notEqual(recomputedHash2, hash2, "Tamper cascades and breaks all subsequent blocks in chain!");
});

test("8. LSB Steganography on PNG Carrier Image", async () => {
  // Create a 50x50 test PNG in memory (2500 pixels = 7500 color channel LSBs = 937 bytes capacity)
  const png = new PNG({ width: 50, height: 50 });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 120;     // R
      png.data[idx + 1] = 150; // G
      png.data[idx + 2] = 200; // B
      png.data[idx + 3] = 255; // A
    }
  }

  const secretPayload = "KunciRahasiaSecureClass_2026";
  const payloadBytes = Buffer.from(secretPayload, "utf8");

  // Embed length (4 bytes) + payload bytes
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payloadBytes.length, 0);
  const fullBytes = Buffer.concat([header, payloadBytes]);

  let bitIdx = 0;
  const totalBits = fullBytes.length * 8;
  for (let i = 0; i < png.data.length && bitIdx < totalBits; i++) {
    if (i % 4 === 3) continue; // skip alpha
    const bytePos = Math.floor(bitIdx / 8);
    const bitPos = 7 - (bitIdx % 8);
    const bit = (fullBytes[bytePos] >> bitPos) & 1;
    png.data[i] = (png.data[i] & 0xfe) | bit;
    bitIdx++;
  }

  // Extract bits
  const extractedBits = [];
  for (let i = 0; i < png.data.length; i++) {
    if (i % 4 === 3) continue;
    extractedBits.push(png.data[i] & 1);
  }

  const readLenBytes = Buffer.alloc(4);
  for (let b = 0; b < 4; b++) {
    let byteVal = 0;
    for (let bit = 0; bit < 8; bit++) {
      byteVal = (byteVal << 1) | extractedBits[b * 8 + bit];
    }
    readLenBytes[b] = byteVal;
  }
  const extractedLen = readLenBytes.readUInt32BE(0);
  assert.equal(extractedLen, payloadBytes.length, "Extracted length must match");

  const extractedPayload = Buffer.alloc(extractedLen);
  for (let b = 0; b < extractedLen; b++) {
    let byteVal = 0;
    for (let bit = 0; bit < 8; bit++) {
      byteVal = (byteVal << 1) | extractedBits[(4 + b) * 8 + bit];
    }
    extractedPayload[b] = byteVal;
  }

  assert.equal(extractedPayload.toString("utf8"), secretPayload, "Extracted secret message matches original");
});

test("9. Multi-Pose Biometric Vector Aggregation & Cosine Similarity Verification", () => {
  // Cosine similarity helper
  function cosineSimilarity(v1, v2) {
    let dot = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      n1 += v1[i] * v1[i];
      n2 += v2[i] * v2[i];
    }
    return dot / (Math.sqrt(n1) * Math.sqrt(n2));
  }

  // Create base 512-dim unit vector representing user's face
  const dim = 512;
  const baseVector = new Array(dim).fill(0).map((_, i) => Math.sin(i * 0.1));
  const baseNorm = Math.sqrt(baseVector.reduce((a, b) => a + b * b, 0));
  const normalizedBase = baseVector.map(x => x / baseNorm);

  // Simulate 5 poses with small perturbations (Center, Left, Right, Up, Down)
  const poses = [
    normalizedBase, // Center
    normalizedBase.map((x, i) => x + (i % 2 === 0 ? 0.03 : -0.02)), // Left
    normalizedBase.map((x, i) => x + (i % 2 === 1 ? 0.03 : -0.02)), // Right
    normalizedBase.map((x, i) => x + (i % 3 === 0 ? 0.02 : -0.01)), // Up
    normalizedBase.map((x, i) => x + (i % 4 === 0 ? 0.02 : -0.01)), // Down
  ].map(vec => {
    const n = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
    return vec.map(x => x / n);
  });

  // Compute centroid
  const centroid = new Array(dim).fill(0);
  for (const pose of poses) {
    for (let i = 0; i < dim; i++) centroid[i] += pose[i];
  }
  const cNorm = Math.sqrt(centroid.reduce((a, b) => a + b * b, 0));
  const normalizedCentroid = centroid.map(x => x / cNorm);

  // Check: Centroid similarity to each pose should be high (> 0.80)
  for (let i = 0; i < poses.length; i++) {
    const sim = cosineSimilarity(normalizedCentroid, poses[i]);
    assert.ok(sim > 0.80, `Centroid similarity to pose ${i} should exceed 0.80, got ${sim}`);
  }

  // Simulate live probe looking left
  const probeLeft = poses[1].map((x, i) => x + 0.005);
  const probeNorm = Math.sqrt(probeLeft.reduce((a, b) => a + b * b, 0));
  const normalizedProbe = probeLeft.map(x => x / probeNorm);

  // Multi-template match
  const maxSimilarity = Math.max(
    cosineSimilarity(normalizedCentroid, normalizedProbe),
    ...poses.map(p => cosineSimilarity(p, normalizedProbe))
  );
  assert.ok(maxSimilarity >= 0.58, `Multi-template match should easily exceed threshold 0.58, got ${maxSimilarity}`);

  // Test random impostor vector
  const impostor = new Array(dim).fill(0).map(() => Math.random() - 0.5);
  const impNorm = Math.sqrt(impostor.reduce((a, b) => a + b * b, 0));
  const normalizedImpostor = impostor.map(x => x / impNorm);

  const impostorSimilarity = Math.max(
    cosineSimilarity(normalizedCentroid, normalizedImpostor),
    ...poses.map(p => cosineSimilarity(p, normalizedImpostor))
  );
  assert.ok(impostorSimilarity < 0.58, `Impostor similarity should be well below 0.58, got ${impostorSimilarity}`);
});


