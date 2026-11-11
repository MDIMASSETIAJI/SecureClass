import crypto from "crypto";
import { prisma } from "../prisma";

export interface BlockData {
  action: string;
  userId?: string | null;
  targetId?: string | null;
  details: Record<string, any>;
}

export interface ChainValidationResult {
  isValid: boolean;
  totalBlocks: number;
  tamperedBlockIndex?: number;
  reason?: string;
  details?: {
    expectedHash?: string;
    actualHash?: string;
    expectedPrevHash?: string;
    actualPrevHash?: string;
  };
}

export class BlockchainService {
  public static readonly GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  /**
   * Deterministically calculates SHA-256 hash for a block
   * Formula: SHA-256(index + ":" + isoTimestamp + ":" + previousHash + ":" + canonicalJson(data))
   */
  public static calculateBlockHash(
    index: number,
    timestamp: Date | string,
    previousHash: string,
    dataJson: string
  ): string {
    const timeIso = typeof timestamp === "string" ? timestamp : timestamp.toISOString();
    const raw = `${index}:${timeIso}:${previousHash}:${dataJson}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Initializes Genesis Block if blockchain is empty
   */
  public static async ensureGenesisBlock(): Promise<void> {
    const count = await prisma.blockchainBlock.count();
    if (count === 0) {
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const genesisData = JSON.stringify({
        action: "GENESIS",
        description: "SecureClass Tamper-Evident Hash Chain Genesis Block",
        version: "1.0",
        author: "SecureClass Security Core",
      });

      const currentHash = this.calculateBlockHash(
        0,
        timestamp,
        this.GENESIS_PREV_HASH,
        genesisData
      );

      await prisma.blockchainBlock.create({
        data: {
          index: 0,
          timestamp,
          action: "GENESIS",
          dataJson: genesisData,
          previousHash: this.GENESIS_PREV_HASH,
          currentHash,
        },
      });
    }
  }

  /**
   * Appends a new block to the tamper-evident hash chain
   */
  public static async appendBlock(
    action: string,
    data: Record<string, any>,
    userId?: string | null,
    targetId?: string | null
  ): Promise<any> {
    await this.ensureGenesisBlock();

    // Fetch the latest block in chain
    const latestBlock = await prisma.blockchainBlock.findFirst({
      orderBy: { index: "desc" },
    });

    const newIndex = latestBlock ? latestBlock.index + 1 : 0;
    const prevHash = latestBlock ? latestBlock.currentHash : this.GENESIS_PREV_HASH;
    const now = new Date();
    const dataJson = JSON.stringify({
      action,
      userId: userId || null,
      targetId: targetId || null,
      payload: data,
    });

    const currentHash = this.calculateBlockHash(newIndex, now, prevHash, dataJson);

    return await prisma.blockchainBlock.create({
      data: {
        index: newIndex,
        timestamp: now,
        action,
        userId: userId || null,
        targetId: targetId || null,
        dataJson,
        previousHash: prevHash,
        currentHash,
      },
    });
  }

  /**
   * Validates the integrity of the whole chain from Genesis to tip
   * Returns whether the chain is authentic or detects the exact index of tampering.
   */
  public static async validateChain(): Promise<ChainValidationResult> {
    await this.ensureGenesisBlock();

    const blocks = await prisma.blockchainBlock.findMany({
      orderBy: { index: "asc" },
    });

    if (blocks.length === 0) {
      return { isValid: true, totalBlocks: 0 };
    }

    // Verify Genesis Block
    const genesis = blocks[0];
    if (genesis.index !== 0 || genesis.previousHash !== this.GENESIS_PREV_HASH) {
      return {
        isValid: false,
        totalBlocks: blocks.length,
        tamperedBlockIndex: 0,
        reason: "Genesis block header atau previous hash tidak sesuai standar.",
      };
    }

    const calculatedGenesisHash = this.calculateBlockHash(
      0,
      genesis.timestamp,
      genesis.previousHash,
      genesis.dataJson
    );

    if (genesis.currentHash !== calculatedGenesisHash) {
      return {
        isValid: false,
        totalBlocks: blocks.length,
        tamperedBlockIndex: 0,
        reason: "Hash Genesis block tidak cocok (data telah dimodifikasi).",
        details: { expectedHash: calculatedGenesisHash, actualHash: genesis.currentHash },
      };
    }

    // Verify each subsequent block
    for (let i = 1; i < blocks.length; i++) {
      const prevBlock = blocks[i - 1];
      const currentBlock = blocks[i];

      // Check index sequence
      if (currentBlock.index !== prevBlock.index + 1) {
        return {
          isValid: false,
          totalBlocks: blocks.length,
          tamperedBlockIndex: currentBlock.index,
          reason: `Urutan index terputus: block #${currentBlock.index} tidak mengikuti block #${prevBlock.index}.`,
        };
      }

      // Check hash chain link: currentBlock.previousHash must match prevBlock.currentHash
      if (currentBlock.previousHash !== prevBlock.currentHash) {
        return {
          isValid: false,
          totalBlocks: blocks.length,
          tamperedBlockIndex: currentBlock.index,
          reason: `Previous hash pada block #${currentBlock.index} tidak cocok dengan current hash block #${prevBlock.index}.`,
          details: {
            expectedPrevHash: prevBlock.currentHash,
            actualPrevHash: currentBlock.previousHash,
          },
        };
      }

      // Check current hash integrity against recomputed SHA-256
      const expectedHash = this.calculateBlockHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.previousHash,
        currentBlock.dataJson
      );

      if (currentBlock.currentHash !== expectedHash) {
        return {
          isValid: false,
          totalBlocks: blocks.length,
          tamperedBlockIndex: currentBlock.index,
          reason: `Integritas data block #${currentBlock.index} rusak. SHA-256 terhitung berbeda dengan hash yang tersimpan.`,
          details: {
            expectedHash,
            actualHash: currentBlock.currentHash,
          },
        };
      }
    }

    return {
      isValid: true,
      totalBlocks: blocks.length,
    };
  }

  /**
   * Security Testing / Simulation Helper:
   * Temporarily tampers with a block's data without updating hash to demonstrate tamper-evidence in UI
   */
  public static async simulateTampering(blockIndex: number, fakeDataJson: string): Promise<boolean> {
    const block = await prisma.blockchainBlock.findUnique({
      where: { index: blockIndex },
    });
    if (!block) return false;

    await prisma.blockchainBlock.update({
      where: { index: blockIndex },
      data: { dataJson: fakeDataJson },
    });
    return true;
  }

  /**
   * Repair / restore tampered block hash (for educational resetting)
   */
  public static async recalculateAndFixChain(): Promise<void> {
    const blocks = await prisma.blockchainBlock.findMany({
      orderBy: { index: "asc" },
    });

    let prevHash = this.GENESIS_PREV_HASH;
    for (const b of blocks) {
      const fixedHash = this.calculateBlockHash(b.index, b.timestamp, prevHash, b.dataJson);
      await prisma.blockchainBlock.update({
        where: { id: b.id },
        data: {
          previousHash: prevHash,
          currentHash: fixedHash,
        },
      });
      prevHash = fixedHash;
    }
  }
}

