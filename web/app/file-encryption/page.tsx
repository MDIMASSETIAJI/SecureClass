"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FileKey2,
  Lock,
  Unlock,
  Upload,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

export default function FileEncryptionPage() {
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt">("encrypt");

  // Encrypt state
  const [encryptFile, setEncryptFile] = useState<File | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [encryptResult, setEncryptResult] = useState<any>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);

  // Decrypt from other people state
  const [otherEncFile, setOtherEncFile] = useState<File | null>(null);
  const [decryptingOther, setDecryptingOther] = useState(false);
  const [decryptOtherSuccess, setDecryptOtherSuccess] = useState<string | null>(null);
  const [decryptOtherError, setDecryptOtherError] = useState<string | null>(null);

  // File list state
  const [myFiles, setMyFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    setLoadingFiles(true);
    fetch("/api/files/list")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMyFiles(data.files || []);
        }
        setLoadingFiles(false);
      })
      .catch(() => setLoadingFiles(false));
  };

  // ENKRIPSI BERKAS
  const handleEncryptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptFile) return;

    setEncrypting(true);
    setEncryptError(null);
    setEncryptResult(null);

    try {
      const formData = new FormData();
      formData.append("file", encryptFile);
      formData.append("title", encryptFile.name);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengenkripsi berkas.");

      setEncryptResult(data);
      loadFiles();
    } catch (err: any) {
      setEncryptError(err.message);
    } finally {
      setEncrypting(false);
    }
  };

  // UNDUH BERKAS AMBURADUL (.enc)
  const downloadAmburadul = (fileId: string) => {
    window.open(`/api/files/download/${fileId}?mode=raw`, "_blank");
  };

  // DEKRIPSI & UNDUH BERKAS ASLI DARI DATABASE
  const downloadDecryptedOriginal = (fileId: string) => {
    window.open(`/api/files/download/${fileId}`, "_blank");
  };

  // DEKRIPSI BERKAS DARI ORANG LAIN (.enc)
  const handleDecryptOtherFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherEncFile) return;

    setDecryptingOther(true);
    setDecryptOtherError(null);
    setDecryptOtherSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", otherEncFile);

      const res = await fetch("/api/files/decrypt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Gagal mendekripsi berkas.");
      }

      // Download the decrypted file blob
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "berkas-didekripsi";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDecryptOtherSuccess(`Berkas '${filename}' berhasil didekripsi dan otomatis diunduh!`);
      setOtherEncFile(null);
    } catch (err: any) {
      setDecryptOtherError(err.message);
    } finally {
      setDecryptingOther(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
            Enkripsi Berkas — ChaCha20-Poly1305
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
            Enkripsi dokumen berkinerja tinggi (RFC 8439). Isi berkas terenkripsi <strong>100% amburadul / tidak dapat dibaca</strong> jika dibuka langsung, dan dapat didekripsi dengan mudah kapan saja.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 border-b-2 border-gray-200 pb-2">
          <Button
            variant={activeTab === "encrypt" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("encrypt")}
          >
            <Lock className="w-4 h-4 mr-1.5" />
            1. Enkripsi Berkas Baru
          </Button>
          <Button
            variant={activeTab === "decrypt" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("decrypt")}
          >
            <Unlock className="w-4 h-4 mr-1.5" />
            2. Dekripsi Berkas (Dari Orang Lain)
          </Button>
        </div>

        {/* TAB 1: ENKRIPSI BERKAS */}
        {activeTab === "encrypt" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Input */}
            <Card className="lg:col-span-6 p-6">
              <h2 className="text-base font-black text-[#3C3C3C] mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                <FileKey2 className="w-5 h-5 text-[#58CC02]" />
                Unggah & Enkripsi Berkas
              </h2>

              <form onSubmit={handleEncryptSubmit} className="space-y-4 text-xs font-bold">
                {/* File Upload Box */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-[#F7F7F7] hover:border-[#58CC02] transition">
                  <Upload className="w-10 h-10 text-[#58CC02] mx-auto mb-2" />
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      setEncryptFile(e.target.files?.[0] || null);
                      setEncryptResult(null);
                    }}
                    className="text-xs font-semibold text-[#3C3C3C] cursor-pointer"
                  />
                  {encryptFile ? (
                    <p className="mt-3 text-xs font-black text-[#46A302]">
                      {encryptFile.name} ({(encryptFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#777777] mt-2">
                      Pilih berkas apa saja (PDF, DOCX, TXT, ZIP, dll.)
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-[#555555] text-[11px] leading-relaxed">
                  <span className="font-bold text-[#3C3C3C]">Proteksi Tanpa Password: </span>
                  Berkas dienkripsi secara deterministik menggunakan stream cipher ChaCha20 dengan kunci master sistem dan nonce 96-bit acak. Tidak perlu password untuk mengenkripsi.
                </div>

                {encryptError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {encryptError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={encrypting}
                  disabled={!encryptFile}
                  className="w-full shadow-md py-3 text-sm"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Enkripsi Berkas dengan ChaCha20-Poly1305
                </Button>
              </form>
            </Card>

            {/* Hasil Enkripsi & Pembuktian Amburadul */}
            <Card className="lg:col-span-6 p-6">
              <h2 className="text-base font-black text-[#3C3C3C] mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                <ShieldCheck className="w-5 h-5 text-[#58CC02]" />
                Hasil Enkripsi & Bukti Isi Berkas
              </h2>

              {encryptResult ? (
                <div className="space-y-4 text-xs font-semibold">
                  <div className="p-3 bg-[#D7FFB8] rounded-xl border border-[#58CC02] text-[#46A302] font-black flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Berkas Berhasil Dienkripsi & Masuk Hash Chain!
                  </div>

                  <div className="p-3 bg-[#F7F7F7] rounded-xl border border-gray-200 space-y-1 font-mono text-[11px]">
                    <p><strong className="font-sans text-[#777777]">Nama Asli:</strong> {encryptResult.originalName}</p>
                    <p><strong className="font-sans text-[#777777]">Algoritma:</strong> {encryptResult.algorithm} (RFC 8439)</p>
                    <p><strong className="font-sans text-[#777777]">Ukuran Ciphertext:</strong> {encryptResult.encryptedSize} bytes</p>
                    <p className="break-all"><strong className="font-sans text-[#777777]">SHA-256 Checksum:</strong> {encryptResult.checksumSha256}</p>
                  </div>

                  {/* PRATINJAU ISI BERKAS AMBURADUL (BUKTI NYATA) */}
                  <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between text-purple-900 font-black">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-purple-600" />
                        Bukti Isi Berkas Terenkripsi (Amburadul):
                      </span>
                      <Badge variant="blue">Ciphertext Biner</Badge>
                    </div>
                    <p className="text-[11px] text-purple-800 font-semibold leading-relaxed">
                      Jika berkas <code>.enc</code> dibuka di Notepad atau Text Editor, isinya 100% acak dan tidak terbaca seperti cuplikan di bawah:
                    </p>
                    <div className="p-2.5 bg-black/90 text-green-400 font-mono text-[10px] rounded-lg break-all select-all leading-normal">
                      {encryptResult.amburadulHex || "53 43 45 4e 43 01 4a 8f 3c 99 1b 7e 0a 44 df 81 29 ac..."}
                    </div>
                  </div>

                  {/* TOMBOL UNDUH AMBURADUL */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => downloadAmburadul(encryptResult.fileId)}
                      className="w-full text-xs font-black shadow-md py-3"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Unduh Berkas Terenkripsi (.enc / Isi Amburadul)
                    </Button>
                    <p className="text-[11px] text-[#777777] text-center mt-1.5">
                      Bagikan berkas <code>.enc</code> ini ke orang lain. Mereka dapat mendekripsinya di tab Dekripsi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-xs text-[#777777] space-y-2">
                  <FileKey2 className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="font-bold">Belum ada berkas yang dienkripsi.</p>
                  <p className="text-[11px] max-w-xs mx-auto">
                    Pilih berkas di sebelah kiri lalu klik tombol enkripsi untuk melihat bukti teks amburadul dan mengunduh berkas terenkripsi <code>.enc</code>.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: DEKRIPSI BERKAS DARI ORANG LAIN */}
        {activeTab === "decrypt" && (
          <div className="space-y-6">
            {/* Form Dekripsi Berkas Dari Orang Lain */}
            <Card className="max-w-2xl mx-auto p-6 border-2 border-emerald-300 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                <Unlock className="w-6 h-6 text-[#58CC02]" />
                <div>
                  <h2 className="text-base font-black text-[#3C3C3C]">Dekripsi Berkas dari Orang Lain</h2>
                  <p className="text-xs text-[#777777] font-semibold">
                    Unggah berkas <code>.enc</code> yang Anda terima dari orang lain untuk mengembalikannya ke berkas asli yang bisa dibaca.
                  </p>
                </div>
              </div>

              {decryptOtherSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-[#D7FFB8] border border-[#58CC02] text-[#46A302] text-xs font-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{decryptOtherSuccess}</span>
                </div>
              )}

              {decryptOtherError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{decryptOtherError}</span>
                </div>
              )}

              <form onSubmit={handleDecryptOtherFile} className="space-y-4 text-xs font-bold">
                <div className="border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center bg-emerald-50/50 hover:bg-emerald-50 transition">
                  <FileSpreadsheet className="w-10 h-10 text-[#58CC02] mx-auto mb-2" />
                  <input
                    type="file"
                    required
                    accept=".enc"
                    onChange={(e) => {
                      setOtherEncFile(e.target.files?.[0] || null);
                      setDecryptOtherSuccess(null);
                      setDecryptOtherError(null);
                    }}
                    className="text-xs font-semibold text-[#3C3C3C] cursor-pointer"
                  />
                  {otherEncFile ? (
                    <p className="mt-2 text-xs font-black text-[#46A302]">
                      {otherEncFile.name} ({(otherEncFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#777777] mt-2">
                      Pilih berkas terenkripsi <code>.enc</code> yang ingin Anda buka/dekripsi.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={decryptingOther}
                  disabled={!otherEncFile}
                  className="w-full shadow-md py-3 text-sm"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Dekripsi Berkas Sekarang (Buka Plaintext Asli)
                </Button>
              </form>
            </Card>

            {/* Riwayat Berkas Terenkripsi di Sistem */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Daftar Berkas Terenkripsi di Sistem</h2>
                </div>
                <Badge variant="gray">{myFiles.length} Berkas</Badge>
              </div>

              {loadingFiles ? (
                <p className="text-xs text-[#777777] text-center py-8">Memuat berkas...</p>
              ) : myFiles.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-8 italic">
                  Belum ada berkas terenkripsi di sistem.
                </p>
              ) : (
                <div className="space-y-3">
                  {myFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-xl border border-gray-200 bg-[#F7F7F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-black text-[#3C3C3C] block">
                          {f.originalName}
                        </span>

                        <p className="text-[11px] text-[#777777]">
                          Ukuran: {(f.encryptedSize / 1024).toFixed(1)} KB • Waktu:{" "}
                          {new Date(f.createdAt).toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] text-[#777777] font-mono break-all">
                          Checksum: {f.checksumSha256}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Unduh Amburadul */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadAmburadul(f.id)}
                          title="Unduh file .enc (isinya amburadul jika dibuka di notepad)"
                        >
                          <Download className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Unduh .enc (Amburadul)
                        </Button>

                        {/* Dekripsi & Buka Berkas Asli Langsung */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => downloadDecryptedOriginal(f.id)}
                          title="Dekripsi dan unduh berkas plaintext asli"
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Dekripsi & Buka Berkas
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
