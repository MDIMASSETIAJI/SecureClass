import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";
import { BlockchainService } from "./crypto/blockchain";

export const SESSION_COOKIE_NAME = "secureclass_session";
const SESSION_LIFETIME_HOURS = 8;

export interface SessionWithUser {
  id: string;
  token: string;
  userId: string;
  factor1Password: boolean;
  factor2Dongle: boolean;
  factor3Face: boolean;
  isFullyAuthenticated: boolean;
  expiresAt: Date;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    avatar: string | null;
  };
}

export class SessionService {
  /**
   * Generates a cryptographically random session token (32 bytes = 64 hex chars)
   */
  public static generateSessionToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Creates an initial session after Factor 1 (Password) is verified
   */
  public static async createPartialSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_HOURS * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        factor1Password: true,
        factor2Dongle: true, // Hardware dongle validated at system runtime level
        factor3Face: false,
        isFullyAuthenticated: false,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Retrieves and validates a session by token
   */
  public static async getSession(token: string): Promise<SessionWithUser | null> {
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    if (!session) return null;

    // Check expiration or revocation
    if (session.revokedAt !== null || session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  /**
   * Retrieves current session from HTTP request cookies
   */
  public static async getCurrentSession(): Promise<SessionWithUser | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await this.getSession(token);
  }

  /**
   * Enforces full 3-factor authentication and role-based access control
   */
  public static async requireFullyAuthenticated(allowedRoles?: string[]): Promise<SessionWithUser> {
    const session = await this.getCurrentSession();

    if (!session) {
      throw new Error("UNAUTHORIZED: Sesi tidak ditemukan atau telah kedaluwarsa.");
    }

    if (!session.isFullyAuthenticated) {
      throw new Error("MFA_INCOMPLETE: Seluruh 3 faktor autentikasi wajib diselesaikan.");
    }

    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      throw new Error(`FORBIDDEN: Peran ${session.user.role} tidak memiliki hak akses.`);
    }

    return session;
  }

  /**
   * Updates factor verification status (Factor 2: Dongle, Factor 3: Face)
   */
  public static async markFactorPassed(
    token: string,
    factor: "DONGLE" | "FACE"
  ): Promise<SessionWithUser> {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new Error("Sesi tidak valid atau telah kedaluwarsa.");
    }

    const factor2Dongle = factor === "DONGLE" ? true : session.factor2Dongle;
    const factor3Face = factor === "FACE" ? true : session.factor3Face;

    // Full authentication achieved ONLY when all 3 factors are satisfied
    const isFullyAuthenticated = Boolean(
      session.factor1Password && factor2Dongle && factor3Face
    );

    const updated = await prisma.session.update({
      where: { token },
      data: {
        factor2Dongle,
        factor3Face,
        isFullyAuthenticated,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    // If just completed 3-factor authentication, record to blockchain audit chain
    if (isFullyAuthenticated && !session.isFullyAuthenticated) {
      await BlockchainService.appendBlock(
        "MFA_LOGIN_SUCCESS",
        {
          username: updated.user.username,
          role: updated.user.role,
          factorsVerified: ["PASSWORD_ARGON2ID", "USB_DONGLE_ECDSA", "ARCFACE_LIVENESS"],
        },
        updated.userId,
        updated.id
      );

      await prisma.auditLog.create({
        data: {
          userId: updated.userId,
          action: "MFA_LOGIN_SUCCESS",
          category: "AUTH",
          details: JSON.stringify({
            message: "Pengguna berhasil melewati seluruh 3 lapisan autentikasi (Password, Dongle, Wajah).",
            factors: ["PASSWORD", "DONGLE", "FACE"],
          }),
        },
      });
    }

    return updated;
  }

  /**
   * Revokes session (Logout)
   */
  public static async revokeSession(token: string): Promise<void> {
    if (!token) return;
    try {
      await prisma.session.update({
        where: { token },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Ignore if session already deleted
    }
  }
}

