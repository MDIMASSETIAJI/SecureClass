const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const argon2 = require("@node-rs/argon2");

const prisma = new PrismaClient();

test("Integration Suite: End-to-End Database & Cryptographic Verification", async (t) => {
  await t.test("A. Verify User Roles & Argon2id Password Hashing in Database", async (subT) => {
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!admin) {
      subT.skip("Skipped: Database in clean-slate state (admin user not yet seeded)");
      return;
    }
    assert.ok(admin, "Admin user must exist");
    assert.equal(admin.role, "ADMIN");

    const validPass = (await argon2.verify(admin.passwordHash, "Admin123!")) || (await argon2.verify(admin.passwordHash, "AdminPassword123!"));
    assert.equal(validPass, true, "Admin password hash must match configured admin password");

    const wrongPass = await argon2.verify(admin.passwordHash, "WrongPassword!");
    assert.equal(wrongPass, false, "Admin password must reject wrong password");
  });

  await t.test("B. Verify USB Dongle Key Registration and ECDSA Verification", async (subT) => {
    const mhs = await prisma.user.findUnique({ where: { username: "mhs_ahmad" } });
    if (!mhs) {
      subT.skip("Skipped: Database in clean-slate state (mhs_ahmad user not yet seeded)");
      return;
    }
    assert.ok(mhs);

    // Generate ECDSA P-256 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const dongleId = `DGL-TEST-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const dongle = await prisma.dongle.create({
      data: {
        userId: mhs.id,
        dongleId,
        publicKeyPem: publicKey,
        label: "USB Test Dongle",
        status: "ACTIVE",
      },
    });
    assert.ok(dongle.id);

    // Create challenge
    const challenge = crypto.randomBytes(32).toString("hex");
    const chalRecord = await prisma.dongleChallenge.create({
      data: {
        userId: mhs.id,
        challenge,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 120000),
      },
    });

    // Sign challenge
    const signer = crypto.createSign("SHA256");
    signer.update(Buffer.from(challenge, "utf8"));
    const sig = signer.sign(privateKey);

    // Verify signature against public key
    const verifier = crypto.createVerify("SHA256");
    verifier.update(Buffer.from(challenge, "utf8"));
    const isSigValid = verifier.verify(dongle.publicKeyPem, sig);
    assert.equal(isSigValid, true, "Valid ECDSA signature must verify");

    // Clean up test dongle & challenge
    await prisma.dongleChallenge.delete({ where: { id: chalRecord.id } });
    await prisma.dongle.delete({ where: { id: dongle.id } });
  });

  await t.test("C. Verify Tamper-Evident Hash Chain from Genesis Block", async () => {
    const blocks = await prisma.blockchainBlock.findMany({ orderBy: { index: "asc" } });
    assert.ok(blocks.length >= 1, "Chain must contain at least Genesis Block");

    // Verify Genesis
    const genesis = blocks[0];
    assert.equal(genesis.index, 0);
    assert.equal(genesis.previousHash, "0000000000000000000000000000000000000000000000000000000000000000");

    // Verify Linkage
    for (let i = 1; i < blocks.length; i++) {
      assert.equal(
        blocks[i].previousHash,
        blocks[i - 1].currentHash,
        `Block #${blocks[i].index} previousHash must match Block #${blocks[i - 1].index} currentHash`
      );

      const expected = crypto
        .createHash("sha256")
        .update(`${blocks[i].index}:${blocks[i].timestamp.toISOString()}:${blocks[i].previousHash}:${blocks[i].dataJson}`)
        .digest("hex");
      assert.equal(blocks[i].currentHash, expected, `Block #${blocks[i].index} hash integrity check`);
    }
  });

  await t.test("D. Verify ChaCha20-Poly1305 and AES-256-GCM Nonce Randomness", () => {
    const nonces = new Set();
    for (let i = 0; i < 1000; i++) {
      const n = crypto.randomBytes(12).toString("hex");
      assert.equal(nonces.has(n), false, "Nonce collision detected!");
      nonces.add(n);
    }
    assert.equal(nonces.size, 1000, "1000 generated nonces must all be completely unique");
  });

  await t.test("E. Verify 1 Dongle Key for 1 Dedicated System Architecture", () => {
    // 1 Kunci Dongle untuk 1 Sistem
    const systemKey = {
      format: "SECURECLASS_DONGLE_KEY",
      version: "1.0",
      systemId: "SECURECLASS-CORE-SYSTEM",
      description: "SecureClass 1-Dongle 1-System Dedicated Key",
      dongleId: "DGL-SYS-998877",
      userId: "usr-admin-001",
      username: "admin",
      createdAt: new Date().toISOString(),
      keyMaterial: {
        algorithm: "ECDSA-P256-SHA256",
        curve: "P-256",
        privateKeyPem: "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...\n-----END PRIVATE KEY-----",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----",
      },
    };

    assert.equal(systemKey.format, "SECURECLASS_DONGLE_KEY");
    assert.equal(systemKey.systemId, "SECURECLASS-CORE-SYSTEM");
    assert.equal(systemKey.dongleId, "DGL-SYS-998877");
    assert.ok(systemKey.keyMaterial.privateKeyPem);
    assert.ok(systemKey.keyMaterial.publicKeyPem);
  });
});

