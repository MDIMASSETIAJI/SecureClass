import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/lib/session";
import { FaceServiceClient } from "@/lib/face-client";
import { AesGcmCipher } from "@/lib/crypto/aes-gcm";
import { prisma } from "@/lib/prisma";

const BIOMETRIC_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || "f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221100";

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
    const { imageBase64, imagesBase64, userConsent } = body;

    // Requirement: Minta persetujuan pengguna sebelum enrollment
    if (!userConsent) {
      return NextResponse.json(
        { error: "Persetujuan pemrosesan data biometrik (Privacy Consent) wajib disetujui pengguna." },
        { status: 400 }
      );
    }

    // Determine whether request is multi-sample or single-sample
    const sampleList: string[] = Array.isArray(imagesBase64) && imagesBase64.length > 0
      ? imagesBase64.filter((img: any) => typeof img === "string" && img.trim().length > 0)
      : imageBase64 ? [imageBase64] : [];

    if (sampleList.length === 0) {
      return NextResponse.json(
        { error: "Sampel citra webcam tidak boleh kosong. Harap ambil setidaknya satu sampel pose wajah." },
        { status: 400 }
      );
    }

    let biometricDataToEncrypt: any;
    let livenessScore = 0.95;
    let sampleCount = 1;

    if (sampleList.length > 1) {
      // Process multi-sample capture across multiple angles/poses
      const multiResult = await FaceServiceClient.runMultiPipeline(sampleList, true, 0.48);

      if (!multiResult.success || !multiResult.centroid_embedding || multiResult.embeddings.length === 0) {
        return NextResponse.json(
          {
            error: multiResult.message || "Gagal memproses sampel pose wajah.",
            errorCode: multiResult.error_code || "MULTI_SAMPLE_FAILED",
            failedIndices: multiResult.failed_indices,
          },
          { status: 400 }
        );
      }

      biometricDataToEncrypt = {
        centroid: multiResult.centroid_embedding,
        templates: multiResult.embeddings,
        sampleCount: multiResult.valid_samples,
        enrolledAt: new Date().toISOString(),
      };
      livenessScore = multiResult.average_liveness;
      sampleCount = multiResult.valid_samples;
    } else {
      // Single sample fallback
      const singleResult = await FaceServiceClient.runPipeline(sampleList[0], true, 0.50);

      if (!singleResult.success || !singleResult.embedding) {
        return NextResponse.json(
          {
            error: singleResult.message,
            errorCode: singleResult.error_code,
            livenessScore: singleResult.liveness_score,
          },
          { status: 400 }
        );
      }

      biometricDataToEncrypt = {
        centroid: singleResult.embedding,
        templates: [singleResult.embedding],
        sampleCount: 1,
        enrolledAt: new Date().toISOString(),
      };
      livenessScore = singleResult.liveness_score;
      sampleCount = 1;
    }

    // Encrypt embedding bundle with AES-256-GCM before saving to database
    // (Raw image is NOT stored anywhere, satisfying biometrics zero-raw-storage privacy mandate)
    const encrypted = AesGcmCipher.encryptEmbedding(biometricDataToEncrypt, BIOMETRIC_KEY);

    // Upsert face profile
    await prisma.faceProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        encryptedEmbedding: encrypted.encryptedEmbedding,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        livenessConfidence: livenessScore,
        status: "ACTIVE",
      },
      update: {
        encryptedEmbedding: encrypted.encryptedEmbedding,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        livenessConfidence: livenessScore,
        status: "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "FACE_ENROLLED",
        category: "AUTH",
        details: JSON.stringify({
          message: `Pendaftaran biometrik multi-pose berhasil (${sampleCount} sampel sudut). Disimpan terenkripsi AES-256-GCM.`,
          sampleCount,
          livenessScore,
        }),
      },
    });

    // Mark factor 3 (Face Biometrics) passed so the session is fully authenticated
    const updatedSession = await SessionService.markFactorPassed(session.token, "FACE");

    return NextResponse.json({
      success: true,
      factor3Face: true,
      isFullyAuthenticated: updatedSession.isFullyAuthenticated,
      sampleCount,
      message: `Profil biometrik wajah multi-pose (${sampleCount} sudut) berhasil didaftarkan secara aman (Terenkripsi AES-256-GCM).`,
      livenessScore,
    });
  } catch (error: any) {
    console.error("Face enroll error:", error);
    return NextResponse.json(
      { error: "Gagal mendaftarkan profil biometrik wajah." },
      { status: 500 }
    );
  }
}

