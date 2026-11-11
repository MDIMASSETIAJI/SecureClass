import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { FaceServiceClient } from "@/lib/face-client";
import { AesGcmCipher } from "@/lib/crypto/aes-gcm";
import { RateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const BIOMETRIC_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || "f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221100";
// 0.58 is the recommended threshold for ArcFace MobileFaceNet with multi-angle template matching
const VERIFICATION_THRESHOLD = parseFloat(process.env.FACE_VERIFICATION_THRESHOLD || "0.58");

export async function POST(req: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.factor1Password) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau Faktor 1 belum terpenuhi." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Citra webcam tidak boleh kosong." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 1. Fetch user's registered Face Profile from database
    const faceProfile = await prisma.faceProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!faceProfile || faceProfile.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Profil biometrik wajah belum terdaftar untuk akun ini. Silakan lakukan enrollment biometrik terlebih dahulu.",
          needsEnrollment: true,
        },
        { status: 404 }
      );
    }

    // 2. Call internal Python FastAPI microservice (Pipeline: Face Detection + Liveness + Feature Extraction)
    const pipelineResult = await FaceServiceClient.runPipeline(imageBase64, true, 0.52);

    if (!pipelineResult.success || !pipelineResult.embedding) {
      await RateLimiter.recordAttempt(session.user.username, "FACE", false, ip, userAgent, pipelineResult.message);
      return NextResponse.json(
        {
          error: pipelineResult.message,
          errorCode: pipelineResult.error_code,
          livenessScore: pipelineResult.liveness_score,
        },
        { status: 400 }
      );
    }

    // 3. Decrypt stored face embedding bundle using AES-256-GCM
    let decryptedData: any;
    try {
      decryptedData = AesGcmCipher.decryptEmbedding(
        faceProfile.encryptedEmbedding,
        faceProfile.iv,
        faceProfile.authTag,
        BIOMETRIC_KEY
      );
    } catch (decryptErr) {
      console.error("Biometric decryption error:", decryptErr);
      return NextResponse.json(
        { error: "Integritas data biometrik terenkripsi di database rusak atau kunci tidak valid." },
        { status: 500 }
      );
    }

    // Extract all candidate templates (multi-pose templates + centroid)
    const candidateTemplates: number[][] = [];
    if (Array.isArray(decryptedData)) {
      if (decryptedData.length > 0 && typeof decryptedData[0] === "number") {
        // Legacy single 512-dim embedding
        candidateTemplates.push(decryptedData as number[]);
      } else if (decryptedData.length > 0 && Array.isArray(decryptedData[0])) {
        // Array of embeddings
        for (const t of decryptedData) {
          if (Array.isArray(t) && t.length > 0) candidateTemplates.push(t);
        }
      }
    } else if (decryptedData && typeof decryptedData === "object") {
      // StoredFaceBiometric object { centroid, templates, sampleCount }
      if (Array.isArray(decryptedData.centroid) && decryptedData.centroid.length > 0) {
        candidateTemplates.push(decryptedData.centroid);
      }
      if (Array.isArray(decryptedData.templates)) {
        for (const t of decryptedData.templates) {
          if (Array.isArray(t) && t.length > 0) {
            candidateTemplates.push(t);
          }
        }
      }
    }

    if (candidateTemplates.length === 0) {
      return NextResponse.json(
        { error: "Format data biometrik terenkripsi tidak valid atau kosong." },
        { status: 500 }
      );
    }

    // 4. Verify similarity between candidate templates and current live embedding
    // Multi-template matching: finds the maximum cosine similarity across all registered poses & centroid
    const verifyResult = FaceServiceClient.verifyMultiTemplate(
      candidateTemplates,
      pipelineResult.embedding,
      VERIFICATION_THRESHOLD
    );

    if (!verifyResult.matched) {
      await RateLimiter.recordAttempt(
        session.user.username,
        "FACE",
        false,
        ip,
        userAgent,
        `Similarity ${verifyResult.similarity} below threshold ${VERIFICATION_THRESHOLD}`
      );
      return NextResponse.json(
        {
          error: `Verifikasi biometrik wajah gagal. Tingkat kemiripan (${verifyResult.similarity}) berada di bawah ambang batas aman (${VERIFICATION_THRESHOLD}).`,
          similarity: verifyResult.similarity,
          threshold: VERIFICATION_THRESHOLD,
        },
        { status: 401 }
      );
    }

    // 5. Update session factor 3 (Face Biometrics)
    const updatedSession = await SessionService.markFactorPassed(session.token, "FACE");

    await RateLimiter.recordAttempt(session.user.username, "FACE", true, ip, userAgent);

    return NextResponse.json({
      success: true,
      factor3Face: true,
      factor2Dongle: updatedSession.factor2Dongle,
      isFullyAuthenticated: updatedSession.isFullyAuthenticated,
      similarity: verifyResult.similarity,
      livenessScore: pipelineResult.liveness_score,
      message: "Faktor 3 (Biometrik Wajah ArcFace & Liveness Anti-Spoofing) berhasil diverifikasi!",
    });
  } catch (error: any) {
    console.error("Face verify error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat verifikasi biometrik wajah." },
      { status: 500 }
    );
  }
}

