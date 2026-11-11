/**
 * Secure Internal Bridge to Face Recognition Microservice
 * Only accessible server-side within Next.js Route Handlers.
 */

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000";
const FACE_SERVICE_SECRET = process.env.FACE_SERVICE_SECRET || "secureclass-internal-face-secret-2026";

export interface FacePipelineResult {
  success: boolean;
  faces_found: number;
  is_live: boolean;
  liveness_score: number;
  embedding?: number[];
  details?: Record<string, any>;
  error_code?: string;
  message: string;
}

export interface MultiSamplePipelineResult {
  success: boolean;
  samples_processed: number;
  valid_samples: number;
  embeddings: number[][];
  centroid_embedding?: number[];
  average_liveness: number;
  message: string;
  error_code?: string;
  failed_indices?: number[];
}

export class FaceServiceClient {
  private static getHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Internal-Token": FACE_SERVICE_SECRET,
    };
  }

  public static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${FACE_SERVICE_URL}/health`, {
        method: "GET",
        headers: this.getHeaders(),
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async runPipeline(
    imageBase64: string,
    requireLiveness: boolean = true,
    livenessThreshold: number = 0.52
  ): Promise<FacePipelineResult> {
    try {
      const res = await fetch(`${FACE_SERVICE_URL}/pipeline`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          image_base64: imageBase64,
          require_liveness: requireLiveness,
          liveness_threshold: livenessThreshold,
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Face service returned error code ${res.status}`);
      }

      return (await res.json()) as FacePipelineResult;
    } catch (err: any) {
      return {
        success: false,
        faces_found: 0,
        is_live: false,
        liveness_score: 0.0,
        error_code: "MICROSERVICE_ERROR",
        message: err.message || "Gagal menghubungi layanan biometrik internal.",
      };
    }
  }

  public static async runMultiPipeline(
    imagesBase64: string[],
    requireLiveness: boolean = true,
    livenessThreshold: number = 0.50
  ): Promise<MultiSamplePipelineResult> {
    try {
      const res = await fetch(`${FACE_SERVICE_URL}/pipeline/multi-sample`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          images_base64: imagesBase64,
          require_liveness: requireLiveness,
          liveness_threshold: livenessThreshold,
        }),
        cache: "no-store",
      });

      if (res.ok) {
        return (await res.json()) as MultiSamplePipelineResult;
      }
    } catch {
      // If endpoint or connection fails, seamlessly fallback to local multi-processing via runPipeline
    }

    // Resilient fallback: sequentially execute runPipeline for each captured image
    const validEmbeddings: number[][] = [];
    const livenessScores: number[] = [];
    const failedIndices: number[] = [];

    for (let i = 0; i < imagesBase64.length; i++) {
      const singleRes = await this.runPipeline(imagesBase64[i], requireLiveness, livenessThreshold);
      if (singleRes.success && singleRes.embedding) {
        validEmbeddings.push(singleRes.embedding);
        livenessScores.push(singleRes.liveness_score);
      } else {
        failedIndices.push(i);
      }
    }

    if (validEmbeddings.length === 0) {
      return {
        success: false,
        samples_processed: imagesBase64.length,
        valid_samples: 0,
        embeddings: [],
        average_liveness: 0.0,
        failed_indices: failedIndices,
        error_code: "NO_VALID_SAMPLES",
        message: "Tidak ada sampel wajah yang valid atau lolos uji anti-spoofing.",
      };
    }

    // Compute unit-normalized centroid vector across valid embeddings
    const dim = validEmbeddings[0].length;
    const centroid: number[] = new Array(dim).fill(0);
    for (const emb of validEmbeddings) {
      for (let j = 0; j < dim; j++) {
        centroid[j] += emb[j];
      }
    }
    let normSq = 0;
    for (let j = 0; j < dim; j++) {
      centroid[j] /= validEmbeddings.length;
      normSq += centroid[j] * centroid[j];
    }
    const norm = Math.sqrt(normSq);
    const normalizedCentroid = norm > 0 ? centroid.map((v) => v / norm) : centroid;
    const avgLiveness = livenessScores.reduce((a, b) => a + b, 0) / livenessScores.length;

    return {
      success: true,
      samples_processed: imagesBase64.length,
      valid_samples: validEmbeddings.length,
      embeddings: validEmbeddings,
      centroid_embedding: normalizedCentroid,
      average_liveness: Math.round(avgLiveness * 10000) / 10000,
      failed_indices: failedIndices,
      message: `Berhasil memproses ${validEmbeddings.length} dari ${imagesBase64.length} sampel pose wajah.`,
    };
  }

  public static computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    let dot = 0;
    let n1 = 0;
    let n2 = 0;
    const len = Math.min(vec1.length, vec2.length);
    for (let i = 0; i < len; i++) {
      dot += vec1[i] * vec2[i];
      n1 += vec1[i] * vec1[i];
      n2 += vec2[i] * vec2[i];
    }
    if (n1 === 0 || n2 === 0) return 0;
    return dot / (Math.sqrt(n1) * Math.sqrt(n2));
  }

  public static verifyMultiTemplate(
    templates: number[][],
    liveEmbedding: number[],
    threshold: number = 0.58
  ): { matched: boolean; similarity: number; bestIndex: number; threshold: number; message: string } {
    let maxSim = -1.0;
    let bestIdx = 0;

    for (let i = 0; i < templates.length; i++) {
      const sim = this.computeCosineSimilarity(templates[i], liveEmbedding);
      if (sim > maxSim) {
        maxSim = sim;
        bestIdx = i;
      }
    }

    const similarity = Math.round(maxSim * 10000) / 10000;
    const matched = similarity >= threshold;

    return {
      matched,
      similarity,
      bestIndex: bestIdx,
      threshold,
      message: matched
        ? "Biometrik wajah cocok dengan salah satu template pose terdaftar."
        : `Tingkat kemiripan biometrik (${similarity}) di bawah ambang batas aman (${threshold}).`,
    };
  }

  public static async verifySimilarity(
    embedding1: number[],
    embedding2: number[],
    threshold: number = 0.58
  ): Promise<{ matched: boolean; similarity: number; threshold: number; message: string }> {
    try {
      const res = await fetch(`${FACE_SERVICE_URL}/verify`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          embedding1,
          embedding2,
          threshold,
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Verifikasi biometrik gagal.");
      }

      return await res.json();
    } catch (err: any) {
      // Local fallback calculation if microservice connection blips
      let dot = 0;
      let n1 = 0;
      let n2 = 0;
      for (let i = 0; i < Math.min(embedding1.length, embedding2.length); i++) {
        dot += embedding1[i] * embedding2[i];
        n1 += embedding1[i] * embedding1[i];
        n2 += embedding2[i] * embedding2[i];
      }
      const similarity = dot / (Math.sqrt(n1) * Math.sqrt(n2));
      const matched = similarity >= threshold;
      return {
        matched,
        similarity: Math.round(similarity * 10000) / 10000,
        threshold,
        message: matched ? "Biometrik wajah cocok." : "Tingkat kemiripan biometrik di bawah ambang batas.",
      };
    }
  }
}

