"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldCheck,
  KeyRound,
  Usb,
  ScanFace,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [hasDongle, setHasDongle] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [detectedUsb, setDetectedUsb] = useState<any>(null);
  const [selectedDrive, setSelectedDrive] = useState("E:\\");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkUsb();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "change-password") {
        setShowPasswordModal(true);
      }
    }

    const interval = setInterval(checkUsb, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkUsb = () => {
    fetch("/api/auth/dongle/detect")
      .then((r) => r.json())
      .then((d) => {
        setDetectedUsb(d);
        if (d.availableDrives?.length > 0 && !selectedDrive) {
          setSelectedDrive(d.availableDrives[0]);
        }
      })
      .catch(() => {});
  };

  const loadSettings = () => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setHasDongle(data.hasDongleRegistered);
          setHasFace(data.hasFaceEnrolled);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  const handleGenerateDongle = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/dongle/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Flashdisk ${user?.username}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat kunci dongle.");

      // Download dongle.key
      const blob = new Blob([JSON.stringify(data.dongleKeyFile, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dongle.key";
      a.click();
      URL.revokeObjectURL(url);

      setMessage("Kunci USB Dongle baru berhasil diterbitkan dan diunduh sebagai 'dongle.key'. Simpan berkas ini pada Flashdisk Anda.");
      loadSettings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBiometric = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus data biometrik wajah Anda? Data biometrik terenkripsi di server akan dimusnahkan secara permanen (Right to be Forgotten).")) {
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/face/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus biometrik.");

      setMessage(data.message);
      loadSettings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Password baru dan konfirmasi password tidak cocok.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah password.");
      }

      setPasswordSuccess(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <AppLayout>
        <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
            Pusat Pengaturan Keamanan & 3FA
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
            Kelola kredensial Password Argon2id, USB Dongle ECDSA P-256, dan privasi biometrik wajah Anda.
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-[#D7FFB8] border-2 border-[#58CC02] text-[#46A302] text-xs font-black flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* FACTOR 1 CARD */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[#3C3C3C] flex-shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#3C3C3C]">Faktor 1: Password Akun</h3>
                  <Badge variant="green">AKTIF</Badge>
                </div>
                <p className="text-xs text-[#777777] font-semibold mt-1">
                  Algoritma: <strong>Argon2id (Memory-hardened, hybrid resistant)</strong>
                </p>
                <p className="text-xs text-[#777777] mt-2 leading-relaxed">
                  Password Anda tersimpan dalam format hash satu arah yang memenuhi rekomendasi OWASP dan Password Hashing Competition (PHC).
                </p>
              </div>
            </div>

            <div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setShowPasswordModal(true);
                }}
                className="whitespace-nowrap shadow-sm w-full sm:w-auto"
              >
                <KeyRound className="w-4 h-4 mr-1.5" />
                Ubah Password Akun
              </Button>
            </div>
          </div>
        </Card>

        {/* FACTOR 2 CARD */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Usb className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#3C3C3C]">Faktor 2: Kunci USB Dongle</h3>
                  <Badge variant={hasDongle ? "green" : "yellow"}>
                    {hasDongle ? "TERDAFTAR" : "BELUM AKTIF"}
                  </Badge>
                </div>
                <p className="text-xs text-[#777777] font-semibold mt-1">
                  Algoritma: <strong>ECDSA P-256 (NIST Curve prime256v1)</strong>
                </p>
                
                {/* Real-time Hardware USB Status */}
                <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        detectedUsb?.connected ? "bg-[#58CC02] animate-pulse" : "bg-red-500"
                      }`}
                    ></span>
                    <span className="text-xs font-black text-[#3C3C3C]">
                      {detectedUsb?.connected
                        ? `Flashdisk Terhubung di Drive: ${detectedUsb.drive}`
                        : "Flashdisk Fisik Belum Dicolokkan ke Port Komputer"}
                    </span>
                  </div>
                  {detectedUsb?.connected && (
                    <p className="text-[11px] font-mono text-[#777777] mt-1">
                      Dongle ID Terbaca: {detectedUsb.dongleId}
                    </p>
                  )}
                </div>

                <p className="text-xs text-[#777777] mt-2 leading-relaxed">
                  Flashdisk FAT32 bertindak sebagai media penyimpan berkas <code>dongle.key</code>. Sistem mengunci aplikasi jika flashdisk dicabut selama penggunaan.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateDongle}
                isLoading={actionLoading}
                className="whitespace-nowrap w-full"
              >
                <Download className="w-4 h-4 mr-1.5" />
                {hasDongle ? "Perbarui & Unduh dongle.key" : "Buat dongle.key Baru"}
              </Button>
            </div>
          </div>
        </Card>

        {/* FACTOR 3 CARD */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-[#46A302] flex items-center justify-center flex-shrink-0">
                <ScanFace className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#3C3C3C]">Faktor 3: Biometrik Wajah AI</h3>
                  <Badge variant={hasFace ? "green" : "yellow"}>
                    {hasFace ? "TERDAFTAR" : "BELUM AKTIF"}
                  </Badge>
                </div>
                <p className="text-xs text-[#777777] font-semibold mt-1">
                  Model: <strong>ArcFace Multi-Pose Aggregation (5 Posisi Sudut) + Liveness Anti-Spoofing</strong>
                </p>
                <p className="text-xs text-[#777777] mt-2 leading-relaxed">
                  Fitur biometrik 512-dimensi disimpan dalam bentuk bundle terenkripsi <strong>AES-256-GCM</strong>. Sistem menyimpan template pose multi-sudut (Depan, Kiri, Kanan, Atas, Bawah) sehingga akurasi verifikasi tetap tinggi saat kepala menoleh atau sedikit miring. Citra mentah kamera tidak pernah disimpan di database.
                </p>
              </div>
            </div>

            {hasFace ? (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteBiometric}
                isLoading={actionLoading}
                className="whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Hapus / Reset Data Biometrik
              </Button>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-[11px] font-bold text-amber-800">
                  ⚠️ Biometrik Belum Aktif — Anda akan diarahkan ke Portal Pendaftaran Multi-Pose saat login berikutnya.
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>

    {/* MODAL: Portal Ubah Password Akun */}
    {showPasswordModal && (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#3C3C3C]">
                      Portal Ubah Password Akun
                    </h2>
                    <p className="text-[11px] font-bold text-[#777777]">
                      Proteksi Enkripsi Hash Argon2id
                    </p>
                  </div>
                </div>
                <Badge variant="green">ARGON2ID</Badge>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border-2 border-[#58CC02] rounded-xl text-[#46A302] text-xs font-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Password Saat Ini <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password saat ini (dari Admin)"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Password Baru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 8 karakter (huruf besar, kecil, angka, simbol)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Konfirmasi Password Baru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password baru Anda"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-[11px] font-semibold text-[#777777]">
                  <p className="font-bold text-[#3C3C3C]">Standar Keamanan Password:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Minimal 8 karakter</li>
                    <li>Mengandung huruf besar (A-Z) dan huruf kecil (a-z)</li>
                    <li>Mengandung angka (0-9) dan simbol karakter khusus (!@#$ dll.)</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmNewPassword}
                    isLoading={passwordLoading}
                  >
                    Simpan Password Baru
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </>
    );
  }

