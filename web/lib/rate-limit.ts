import { prisma } from "./prisma";

interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowSeconds: 60, // Cukup 60 detik (1 menit)
};

export class RateLimiter {
  /**
   * Checks if an IP or username is currently rate-limited due to brute-force attempts.
   * Lockout is strictly capped at 60 seconds.
   */
  public static async isRateLimited(
    identifier: string,
    config: RateLimitConfig = DEFAULT_CONFIG
  ): Promise<{ limited: boolean; remainingAttempts: number; retryAfterSeconds: number }> {
    const windowStart = new Date(Date.now() - config.windowSeconds * 1000);

    const failedCount = await prisma.loginAttempt.count({
      where: {
        usernameOrEmail: identifier,
        success: false,
        timestamp: { gte: windowStart },
      },
    });

    if (failedCount >= config.maxAttempts) {
      // Find oldest failure in window to calculate retry after
      const oldestAttempt = await prisma.loginAttempt.findFirst({
        where: {
          usernameOrEmail: identifier,
          success: false,
          timestamp: { gte: windowStart },
        },
        orderBy: { timestamp: "asc" },
      });

      const elapsedMs = oldestAttempt ? Date.now() - oldestAttempt.timestamp.getTime() : 0;
      const retryAfterSeconds = Math.max(
        1,
        Math.min(config.windowSeconds, Math.ceil((config.windowSeconds * 1000 - elapsedMs) / 1000))
      );

      return {
        limited: true,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    }

    return {
      limited: false,
      remainingAttempts: config.maxAttempts - failedCount,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Resets failed login attempts for a user after a successful login
   */
  public static async resetAttempts(identifier: string): Promise<void> {
    try {
      await prisma.loginAttempt.deleteMany({
        where: {
          usernameOrEmail: identifier,
          success: false,
        },
      });
    } catch (e) {
      console.warn("Could not reset login attempts:", e);
    }
  }

  /**
   * Clears all failed login attempts across the system (utility / recovery)
   */
  public static async clearAllFailedAttempts(): Promise<void> {
    try {
      await prisma.loginAttempt.deleteMany({
        where: {
          success: false,
        },
      });
    } catch (e) {
      console.warn("Could not clear failed attempts:", e);
    }
  }

  /**
   * Records a login attempt (success or failure)
   */
  public static async recordAttempt(
    identifier: string,
    factor: "PASSWORD" | "DONGLE" | "FACE",
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    await prisma.loginAttempt.create({
      data: {
        usernameOrEmail: identifier,
        factor,
        success,
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "Unknown",
        failureReason: failureReason || null,
      },
    });
  }
}
