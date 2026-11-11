"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  KeyRound,
  ScanFace,
  Lock,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  UserPlus,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import confetti from "canvas-confetti";

interface EnrollmentPose {
  id: string;
  title: string;
  shortLabel: string;
  instruction: string;
  icon: string;
  angle: string;
}

const ENROLLMENT_POSES: EnrollmentPose[] = [
  {
    id: "center",
    title: "1. Hadap Lurus ke Depan",
    shortLabel: "Depan",
    instruction: "Posisikan wajah tepat di tengah bingkai oval dan tatap kamera.",
    icon: "🎯",
    angle: "Center (0°)",
  },
  {
    id: "left",
    title: "2. Menoleh Sedikit ke Kiri",
    shortLabel: "Kiri",
    instruction: "Putar kepala Anda sedikit ke arah kiri (~15°).",
    icon: "⬅️",
    angle: "Kiri (~15°)",
  },
  {
    id: "right",
    title: "3. Menoleh Sedikit ke Kanan",
    shortLabel: "Kanan",
    instruction: "Putar kepala Anda sedikit ke arah kanan (~15°).",
    icon: "➡️",
    angle: "Kanan (~15°)",
  },
  {
    id: "up",
    title: "4. Sedikit Menengadah",
    shortLabel: "Atas",
    instruction: "Angkat dagu Anda sedikit ke arah atas (~10°).",
    icon: "⬆️",
    angle: "Atas (~10°)",
  },
  {
    id: "down",
    title: "5. Sedikit Menunduk",
    shortLabel: "Bawah",
    instruction: "Tundukkan kepala sedikit ke arah bawah (~10°) dengan rileks.",
    icon: "⬇️",
    angle: "Bawah (~10°)",
  },
];

export default function LoginPage() {
  const router = useRouter();

  // 2-Step Login: 1 (Password), 2 (Biometrik Wajah), 3 (Selesai)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);

  // Status & error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Face Biometrics State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasFaceEnrolled, setHasFaceEnrolled] = useState(true);
  const [enrollConsent, setEnrollConsent] = useState(false);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [isMirrored, setIsMirrored] = useState(false); // Default: Jangan Mirror (Kamera Nyata)

  // Multi-Sample Pose Enrollment State
  const [capturedSamples, setCapturedSamples] = useState<(string | null)[]>([null, null, null, null, null]);
  const [activePoseIdx, setActivePoseIdx] = useState(0);
  const [captureFlash, setCaptureFlash] = useState(false);

  // Check if session already active on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          if (data.session.isFullyAuthenticated) {
            router.push("/dashboard");
          } else if (data.session.factor1Password && !data.session.factor3Face) {
            setUser(data.user);
            setHasFaceEnrolled(data.hasFaceEnrolled);
            setCurrentStep(2);
          }
        }
      })
      .catch(() => {});
  }, [router]);

  // Handle camera start/stop when entering Step 2
  useEffect(() => {
    if (currentStep === 2) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [currentStep]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan pada peramban.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#58CC02", "#46A302", "#FFFFFF", "#3C3C3C"],
      });
    } catch {}
  };

  // ==========================================
  // FACTOR 1: Password (Argon2id)
  // ==========================================
  const handleFactor1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/login-factor1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memverifikasi faktor password.");
      }

      setUser(data.user);
      setHasFaceEnrolled(data.hasFaceEnrolled);
      if (!data.hasFaceEnrolled) {
        setStatusMessage("Akun baru terdeteksi! Silakan selesaikan pendaftaran biometrik wajah pertama kali.");
      } else {
        setStatusMessage("Password valid! Silakan verifikasi biometrik wajah Anda.");
      }
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FACTOR 2: Face Biometrics (ArcFace & Liveness)
  // ==========================================
  const captureFrameBase64 = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleCaptureSample = () => {
    const frameBase64 = captureFrameBase64();
    if (!frameBase64) {
      setError("Gagal mengambil tangkapan layar dari kamera webcam.");
      return;
    }

    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 200);

    const updated = [...capturedSamples];
    updated[activePoseIdx] = frameBase64;
    setCapturedSamples(updated);

    // Auto-advance to next empty slot if any
    const nextUnfilled = updated.findIndex((s, idx) => s === null && idx > activePoseIdx);
    if (nextUnfilled !== -1) {
      setActivePoseIdx(nextUnfilled);
    } else {
      const anyUnfilled = updated.findIndex((s) => s === null);
      if (anyUnfilled !== -1) {
        setActivePoseIdx(anyUnfilled);
      }
    }
  };

  const handleRetakePose = (idx: number) => {
    setActivePoseIdx(idx);
  };

  const handleResetAllSamples = () => {
    setCapturedSamples([null, null, null, null, null]);
    setActivePoseIdx(0);
  };

  const validSamples = capturedSamples.filter((s): s is string => typeof s === "string" && s.length > 0);

  const handleEnrollFace = async () => {
    if (!enrollConsent) {
      setError("Persetujuan privasi biometrik wajib dicentang sebelum pendaftaran.");
      return;
    }

    if (validSamples.length < 3) {
      setError("Harap kumpulkan minimal 3 sampel pose wajah (disarankan 5 pose) agar model mengenali wajah dari segala sudut secara akurat.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/face/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagesBase64: validSamples,
          userConsent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftarkan biometrik wajah.");
      }

      setHasFaceEnrolled(true);
      setStatusMessage(`Biometrik wajah multi-pose (${data.sampleCount || validSamples.length} sudut) berhasil didaftarkan secara aman (Terenkripsi AES-256-GCM)!`);
      setCurrentStep(3);
      triggerCelebration();

      setTimeout(() => {
        router.push("/dashboard?new_account=true");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFace = async () => {
    setLoading(true);
    setError(null);
    setSimilarityScore(null);
    setLivenessScore(null);

    const frameBase64 = captureFrameBase64();
    if (!frameBase64) {
      setError("Gagal mengambil citra dari kamera webcam.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: frameBase64 }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needsEnrollment) setHasFaceEnrolled(false);
        throw new Error(data.error || "Verifikasi biometrik wajah gagal.");
      }

      setSimilarityScore(data.similarity);
      setLivenessScore(data.livenessScore);

      setCurrentStep(3);
      triggerCelebration();

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] flex items-center justify-center text-white shadow-sm">
            <Shield className="w-6 h-6 fill-white" />
          </div>
          <div className="text-left">
            <span className="text-2xl font-black tracking-tight text-[#3C3C3C] block leading-none">
              SECURE<span className="text-[#58CC02]">CLASS</span>
            </span>
            <span className="text-[10px] font-extrabold text-[#777777] tracking-wider uppercase">
              Zero-Trust Authentication Gate
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Header Title */}
        <div className="bg-white border-2 border-b-4 border-gray-200 rounded-2xl p-4 mb-4 text-center shadow-sm">
          <Badge variant="green" className="mb-1.5 text-[10px]">
            PORTAL MASUK AKADEMIK RESMI
          </Badge>
          <h2 className="text-base font-black text-[#3C3C3C]">
            Masuk ke Akun SecureClass
          </h2>
          <p className="text-[11px] font-semibold text-[#777777] mt-0.5">
            Gunakan kredensial (Username & Password) yang diterbitkan oleh Administrator
          </p>
        </div>

        <Card className="p-8">
          {/* Progress Tracker */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-[#777777] tracking-wider">
                Verifikasi Pengguna ({currentStep === 3 ? 2 : currentStep}/2)
              </span>
              <Badge variant={currentStep === 3 ? "green" : "blue"}>
                {currentStep === 1
                  ? "FAKTOR 1: PASSWORD"
                  : currentStep === 2
                  ? "FAKTOR 2: BIOMETRIK WAJAH"
                  : "TERVERIFIKASI!"}
              </Badge>
            </div>
            {/* Chunky progress bar */}
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden border border-gray-300">
              <div
                className="bg-[#58CC02] h-full transition-all duration-300 rounded-full"
                style={{
                  width: currentStep === 1 ? "50%" : "100%",
                }}
              ></div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-xs font-bold flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-extrabold">Verifikasi Gagal</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border-2 border-[#58CC02] text-[#46A302] text-xs font-bold flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#58CC02] mt-0.5" />
              <div>
                <p className="font-extrabold">Status Keamanan</p>
                <p className="mt-0.5 leading-relaxed">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: PASSWORD (ARGON2ID) */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-[#58CC02] flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#3C3C3C]">Faktor 1: Password</h2>
                  <p className="text-xs text-[#777777] font-semibold">
                    Argon2id Memory-Hardened Hashing
                  </p>
                </div>
              </div>

              <form onSubmit={handleFactor1Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-[#3C3C3C] tracking-wider mb-1.5">
                    Username atau Email
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Masukkan username atau email Anda"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 font-bold text-sm text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#3C3C3C] tracking-wider mb-1.5">
                    Password Akun
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 font-bold text-sm text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loading}
                    className="w-full shadow-md"
                  >
                    Verifikasi Password & Lanjut ke Biometrik Wajah
                  </Button>
                </div>
              </form>

              {/* Centralized Admin Notice */}
              <div className="mt-6 pt-5 border-t border-gray-200 text-center">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-[11px] font-bold text-[#777777] leading-relaxed">
                    💡 <span className="text-[#3C3C3C] font-black">Informasi Akun:</span> Seluruh akun Dosen & Mahasiswa diterbitkan langsung oleh Administrator Institusi. Silakan hubungi Administrator untuk mendapatkan kredensial akun Anda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: FACE BIOMETRICS & LIVENESS (ARCFACE) */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-[#46A302] flex items-center justify-center font-black">
                  <ScanFace className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#3C3C3C]">
                    {!hasFaceEnrolled ? "Portal Pendaftaran Biometrik Wajah" : "Faktor 2: Biometrik Wajah"}
                  </h2>
                  <p className="text-xs text-[#777777] font-semibold">
                    {!hasFaceEnrolled
                      ? "Aktivasi Akun Baru: Daftarkan citra wajah Anda untuk pengamanan login mandiri"
                      : "ArcFace Deep Learning & Liveness Anti-Spoofing"}
                  </p>
                </div>
              </div>

              {cameraError ? (
                <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-xs font-bold mb-4">
                  <p>{cameraError}</p>
                  <Button variant="secondary" size="sm" onClick={startCamera} className="mt-3">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Coba Akses Kamera Lagi
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Webcam Preview with Target Oval Guide (JANGAN MIRROR: Non-Mirror Real Camera by default) */}
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-4 border-gray-200 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        transform: isMirrored ? "scaleX(-1)" : "none",
                        WebkitTransform: isMirrored ? "scaleX(-1)" : "none",
                      }}
                    />

                    {/* Shutter flash animation on capture */}
                    {captureFlash && (
                      <div className="absolute inset-0 bg-white/70 pointer-events-none transition-opacity duration-200 z-20"></div>
                    )}

                    {/* Face Target Alignment Frame */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-64 border-4 border-[#58CC02] border-dashed rounded-[50%] opacity-80"></div>
                    </div>

                    {/* Live Status Badge */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                      <span>
                        {isMirrored ? "Mode Cermin (Mirror)" : "Kamera Nyata (Non-Mirror)"} • Anti-Spoofing 2D FFT
                      </span>
                    </div>

                    {/* Camera Orientation Switcher Button */}
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        type="button"
                        onClick={() => setIsMirrored(!isMirrored)}
                        className="bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-white flex items-center gap-1.5 transition-colors border border-white/20 shadow-md"
                        title="Klik untuk membalik tampilan kamera"
                      >
                        <RefreshCw className="w-3 h-3 text-[#58CC02]" />
                        <span>{isMirrored ? "Ganti ke Non-Mirror" : "Balik Kamera (Flip)"}</span>
                      </button>
                    </div>
                  </div>

                  {hasFaceEnrolled ? (
                    <div className="space-y-3 pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        onClick={handleVerifyFace}
                        isLoading={loading}
                        className="w-full shadow-md"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Verifikasi Biometrik Wajah
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-bold text-[#777777] hover:underline"
                        >
                          ← Kembali ke Faktor 1 (Password)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-[#F4FBEF] border-2 border-[#58CC02] rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant="green" className="text-[10px]">
                          PORTAL PENDAFTARAN MULTI-POSE WAJAH
                        </Badge>
                        <span className="text-xs font-black text-[#46A302]">
                          {validSamples.length}/5 Sampel Terkumpul
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-black text-[#3C3C3C]">
                          Selamat datang, {user?.fullName || "Pengguna Baru"}!
                        </p>
                        <p className="text-[11px] font-semibold text-[#777777] mt-0.5 leading-relaxed">
                          Agar model AI dapat mengenali wajah Anda dari berbagai posisi dan sudut saat login, ambil 5 sampel pose berikut:
                        </p>
                      </div>

                      {/* Active Pose Instruction Banner */}
                      <div className="p-3 bg-white border-2 border-[#58CC02] rounded-xl flex items-center gap-3 shadow-xs">
                        <span className="text-2xl flex-shrink-0">{ENROLLMENT_POSES[activePoseIdx].icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#3C3C3C]">
                              Pose {activePoseIdx + 1}/5: {ENROLLMENT_POSES[activePoseIdx].title}
                            </span>
                            <Badge variant={capturedSamples[activePoseIdx] ? "green" : "yellow"} className="text-[9px]">
                              {capturedSamples[activePoseIdx] ? "Sudah Diambil" : "Target Aktif"}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-semibold text-[#555555] mt-0.5">
                            {ENROLLMENT_POSES[activePoseIdx].instruction}
                          </p>
                        </div>
                      </div>

                      {/* 5 Pose Slots Grid */}
                      <div className="grid grid-cols-5 gap-2">
                        {ENROLLMENT_POSES.map((pose, idx) => {
                          const isCaptured = Boolean(capturedSamples[idx]);
                          const isActive = activePoseIdx === idx;
                          return (
                            <button
                              key={pose.id}
                              type="button"
                              onClick={() => handleRetakePose(idx)}
                              className={`p-2 rounded-xl border-2 text-center transition-all relative overflow-hidden flex flex-col items-center justify-center cursor-pointer ${
                                isActive
                                  ? "border-[#58CC02] bg-white ring-2 ring-[#58CC02]/40 shadow-sm"
                                  : isCaptured
                                  ? "border-green-300 bg-white"
                                  : "border-gray-200 bg-gray-50/80 hover:bg-white"
                              }`}
                            >
                              {isCaptured && capturedSamples[idx] ? (
                                <img
                                  src={capturedSamples[idx]!}
                                  alt={pose.shortLabel}
                                  className="w-9 h-9 rounded-full object-cover border-2 border-[#58CC02] mb-1"
                                />
                              ) : (
                                <span className="text-lg mb-0.5">{pose.icon}</span>
                              )}
                              <span className="text-[10px] font-black text-[#3C3C3C] block leading-tight">
                                {pose.shortLabel}
                              </span>
                              <span
                                className={`text-[9px] font-black mt-0.5 ${
                                  isCaptured ? "text-[#46A302]" : isActive ? "text-amber-600" : "text-gray-400"
                                }`}
                              >
                                {isCaptured ? "✓ OK" : isActive ? "Pilih" : "Kosong"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Pose Capture Controls */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="lg"
                          onClick={handleCaptureSample}
                          className="flex-1 shadow-md text-xs sm:text-sm"
                        >
                          <Camera className="w-4 h-4 mr-1.5" />
                          {capturedSamples[activePoseIdx]
                            ? `Ambil Ulang: ${ENROLLMENT_POSES[activePoseIdx].title}`
                            : `Ambil Pose ${activePoseIdx + 1}/5: ${ENROLLMENT_POSES[activePoseIdx].title}`}
                        </Button>

                        {validSamples.length > 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={handleResetAllSamples}
                            className="px-3"
                            title="Reset ulang semua sampel"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Ready to Register Section */}
                      {validSamples.length >= 3 ? (
                        <div className="p-3 bg-white border border-[#58CC02] rounded-xl space-y-3">
                          <label className="flex items-start gap-2.5 text-xs font-bold text-[#3C3C3C] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={enrollConsent}
                              onChange={(e) => setEnrollConsent(e.target.checked)}
                              className="mt-0.5 rounded border-gray-300 text-[#58CC02] w-4 h-4"
                            />
                            <span>
                              Saya menyetujui pemindaian multi-sudut biometrik wajah terenkripsi AES-256-GCM sesuai kebijakan privasi Zero-Trust.
                            </span>
                          </label>

                          <Button
                            type="button"
                            variant="primary"
                            size="lg"
                            onClick={handleEnrollFace}
                            isLoading={loading}
                            disabled={!enrollConsent}
                            className="w-full shadow-md text-sm bg-[#58CC02] hover:bg-[#46A302]"
                          >
                            <Check className="w-5 h-5 mr-2" />
                            Daftarkan {validSamples.length} Sampel Wajah & Masuk ke Sistem
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-center text-[#777777]">
                          💡 Ambil minimal 3 pose (disarankan 5 lengkap: Depan, Kiri, Kanan, Atas, Bawah) agar tombol simpan aktif.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: LOGIN SUKSES */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#D7FFB8] text-[#46A302] flex items-center justify-center mx-auto border-4 border-[#58CC02] animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-black text-[#3C3C3C]">Autentikasi Berhasil!</h2>
                <p className="text-xs text-[#777777] font-semibold mt-1">
                  Selamat datang kembali, <strong>{user?.fullName || user?.username}</strong>.
                </p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono inline-block">
                Tingkat Kemiripan Wajah: <span className="font-bold text-green-600">{(similarityScore! * 100).toFixed(1)}%</span> | Liveness: <span className="font-bold text-green-600">Lolos Anti-Spoofing</span>
              </div>

              <p className="text-xs font-bold text-[#58CC02] animate-pulse">
                Membuka Dashboard SecureClass...
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
