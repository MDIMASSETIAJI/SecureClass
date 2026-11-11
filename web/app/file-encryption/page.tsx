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
  KeyRound,
  FileText,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function FileEncryptionPage() {
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt">("encrypt");

  // Encrypt state
  const [encryptFile, setEncryptFile] = useState<File | null>(null);
  const [filePassword, setFilePassword] = useState("");
  const [encrypting, setEncrypting] = useState(false);
  const [encryptResult, setEncryptResult] = useState<any>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);

  // Decrypt state
  const [decryptFileId, setDecryptFileId] = useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // File list state
  const [myFiles, setMyFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Modal Password Prompt State
  const [promptFile, setPromptFile] = useState<any | null>(null);
  const [promptPasswordInput, setPromptPasswordInput] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [downloadingDecrypted, setDownloadingDecrypted] = useState(false);

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
      if (filePassword.trim()) {
        formData.append("password", filePassword.trim());
      }

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

  // Unduh Berkas Terenkripsi Mentah (.enc) — ISINYA AMBURADUL
  const downloadAmburadul = (fileId: string) => {
    window.open(`/api/files/download/${fileId}?mode=raw`, "_blank");
  };

  // Buka Modal Masukkan Password untuk Dekripsi
  const openPasswordPrompt = (file: any) => {
    setPromptFile(file);
    setPromptPasswordInput("");
    setPromptError(null);
  };

  // Eksekusi Dekripsi dengan Password
  const handleExecuteDecryptDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptFile) return;

    setDownloadingDecrypted(true);
    setPromptError(null);

    try {
      const passwordParam = encodeURIComponent(promptPasswordInput.trim());
      const res = await fetch(`/api/files/download/${promptFile.id}?password=${passwordParam}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || "Gagal mendekripsi berkas.");
      }

      // Download file blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = promptFile.originalName || "berkas-didekripsi";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setPromptFile(null);
    } catch (err: any) {
      setPromptError(err.message);
    } finally {
      setDownloadingDecrypted(false);
    }
  };

  return (
    <>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
              Enkripsi Berkas — ChaCha20-Poly1305
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Dua Opsi Kemanan: <strong>1. Proteksi Password saat membuka berkas</strong> dan{" "}
              <strong>2. Unduh berkas terenkripsi dengan isi amburadul (ciphertext biner)</strong>.
            </p>
          </div>

          {/* Banner Penjelasan Dua Opsi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-xs text-emerald-950 flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-[#58CC02] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-emerald-900 block mb-0.5">Opsi 1: Pas Mau Buka File Ada Password</span>
                Anda dapat menentukan password khusus saat enkripsi. Siapapun yang ingin mendekripsi atau membuka berkas asli wajib memasukkan password yang cocok.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-300 text-xs text-purple-950 flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-purple-900 block mb-0.5">Opsi 2: Nek Dibuka Isi File Amburadul</span>
                Tersedia tombol untuk mengunduh berkas terenkripsi langsung (<code>.enc</code>). Jika dibuka di Notepad atau teks editor, isinya 100% karakter acak tak terbaca (amburadul)!
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 border-b-2 border-gray-200 pb-2">
            <Button
              variant={activeTab === "encrypt" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("encrypt")}
            >
              <Lock className="w-4 h-4 mr-1.5" />
              Enkripsi Berkas Baru
            </Button>
            <Button
              variant={activeTab === "decrypt" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("decrypt")}
            >
              <Unlock className="w-4 h-4 mr-1.5" />
              Daftar & Dekripsi Berkas ({myFiles.length})
            </Button>
          </div>

          {/* TAB ENKRIPSI */}
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
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-[#F7F7F7] hover:border-[#58CC02] transition">
                    <Upload className="w-8 h-8 text-[#58CC02] mx-auto mb-2" />
                    <input
                      type="file"
                      required
                      onChange={(e) => {
                        setEncryptFile(e.target.files?.[0] || null);
                        setEncryptResult(null);
                      }}
                      className="text-xs font-semibold text-[#3C3C3C] cursor-pointer"
                    />
                    {encryptFile && (
                      <p className="mt-2 text-xs font-black text-[#46A302]">
                        {encryptFile.name} ({(encryptFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* INPUT PASSWORD PENGAMAN BERKAS (OPSI 1) */}
                  <div className="p-4 rounded-xl bg-emerald-50/80 border-2 border-emerald-300 space-y-1.5">
                    <label className="uppercase text-emerald-900 font-black flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#58CC02]" />
                      Password Pengaman Berkas (Opsi 1)
                    </label>
                    <input
                      type="password"
                      value={filePassword}
                      onChange={(e) => setFilePassword(e.target.value)}
                      placeholder="Contoh: PasswordBerkas123! (Opsional)"
                      className="w-full px-3 py-2 rounded-lg border-2 border-emerald-400 font-mono text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    />
                    <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">
                      Jika diisi, berkas hanya dapat dibuka dengan password ini. Jika dikosongkan, kunci master ChaCha20 server akan digunakan.
                    </p>
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
                    Enkripsi dengan ChaCha20-Poly1305
                  </Button>
                </form>
              </Card>

              {/* Hasil Enkripsi & Pembuktian Amburadul */}
              <Card className="lg:col-span-6 p-6">
                <h2 className="text-base font-black text-[#3C3C3C] mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <ShieldCheck className="w-5 h-5 text-[#58CC02]" />
                  Hasil Enkripsi & Pembuktian Berkas
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
                      <p><strong className="font-sans text-[#777777]">Proteksi Password:</strong> {encryptResult.isPasswordProtected ? "✅ YA (Diproteksi Password)" : "❌ Kunci Sistem"}</p>
                      <p className="break-all"><strong className="font-sans text-[#777777]">SHA-256 Checksum:</strong> {encryptResult.checksumSha256}</p>
                    </div>

                    {/* PRATINJAU ISI BERKAS AMBURADUL (BUKTI NYATA) */}
                    <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between text-purple-900 font-black">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-purple-600" />
                          Pratinjau Isi File Terenkripsi (Amburadul):
                        </span>
                        <Badge variant="blue">Ciphertext Biner</Badge>
                      </div>
                      <p className="text-[11px] text-purple-800 font-semibold leading-relaxed">
                        Berikut adalah wujud nyata isi berkas yang telah teracak oleh ChaCha20 sebelum didekripsi:
                      </p>
                      <div className="p-2.5 bg-black/90 text-green-400 font-mono text-[10px] rounded-lg break-all select-all leading-normal">
                        {encryptResult.amburadulHex || "4a 8f 3c 99 1b 7e 0a 44 df 81 29 ac..."}
                      </div>
                    </div>

                    {/* DUA TOMBOL AKSI PEMBUKTIAN */}
                    <div className="space-y-2 pt-2">
                      {/* OPSI 2: Unduh Berkas Amburadul (.enc) */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => downloadAmburadul(encryptResult.fileId)}
                        className="w-full text-xs font-black shadow-sm"
                      >
                        <Download className="w-4 h-4 mr-2 text-purple-600" />
                        Opsi 2: Unduh File .enc (Buka di Notepad = Isi Amburadul)
                      </Button>

                      {/* OPSI 1: Buka / Dekripsi dengan Password */}
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={() => openPasswordPrompt({
                          id: encryptResult.fileId,
                          originalName: encryptResult.originalName,
                          isPasswordProtected: encryptResult.isPasswordProtected,
                        })}
                        className="w-full text-xs font-black shadow-md"
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Opsi 1: Buka / Dekripsi File (Dengan Password)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-xs text-[#777777] space-y-2">
                    <FileKey2 className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-bold">Belum ada berkas yang dienkripsi.</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Pilih berkas di sebelah kiri untuk melihat hasil enkripsi ChaCha20 dan menguji pembuktian isi berkas amburadul maupun proteksi password.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB DEKRIPSI & DAFTAR BERKAS */}
          {activeTab === "decrypt" && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Daftar Berkas Terenkripsi & Dekripsi</h2>
                </div>
                <Badge variant="gray">{myFiles.length} Berkas Tersimpan</Badge>
              </div>

              {loadingFiles ? (
                <p className="text-xs text-[#777777] text-center py-8">Memuat berkas...</p>
              ) : myFiles.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-8 italic">
                  Belum ada berkas terenkripsi. Buka tab Enkripsi untuk mengenkripsi berkas pertama Anda.
                </p>
              ) : (
                <div className="space-y-3">
                  {myFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-xl border border-gray-200 bg-[#F7F7F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#3C3C3C]">
                            {f.originalName}
                          </span>
                          {f.isPasswordProtected ? (
                            <Badge variant="yellow">
                              <KeyRound className="w-3 h-3 mr-1" />
                              Diproteksi Password
                            </Badge>
                          ) : (
                            <Badge variant="gray">Kunci Master Sistem</Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-[#777777]">
                          Ukuran: {(f.encryptedSize / 1024).toFixed(1)} KB • Waktu:{" "}
                          {new Date(f.createdAt).toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] text-[#777777] font-mono break-all">
                          Checksum: {f.checksumSha256}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Tombol Unduh Amburadul */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadAmburadul(f.id)}
                          title="Unduh file .enc mentah (jika dibuka isinya amburadul)"
                        >
                          <Download className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Unduh .enc (Amburadul)
                        </Button>

                        {/* Tombol Buka File (Minta Password) */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openPasswordPrompt(f)}
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Buka / Dekripsi File
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </AppLayout>

      {/* MODAL: PROMPT PASSWORD UNTUK MEMBUKA BERKAS (OPSI 1) */}
      {promptFile && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#58CC02]" />
                Buka Berkas: Masukkan Password
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPromptFile(null)}
              >
                Tutup
              </Button>
            </div>

            <form onSubmit={handleExecuteDecryptDownload} className="space-y-4 py-2 text-xs font-bold">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-[#555555] space-y-1">
                <div className="flex justify-between">
                  <span>Nama Berkas:</span>
                  <span className="font-bold text-[#3C3C3C]">{promptFile.originalName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Proteksi:</span>
                  <span className="font-bold text-[#58CC02]">
                    {promptFile.isPasswordProtected ? "Wajib Password" : "Kunci Sistem (Password Opsional)"}
                  </span>
                </div>
              </div>

              {promptError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{promptError}</span>
                </div>
              )}

              <div className="p-3.5 bg-emerald-50 rounded-xl border-2 border-emerald-300 space-y-1.5">
                <label className="uppercase text-emerald-900 font-black flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#58CC02]" />
                  Password Berkas *
                </label>
                <input
                  type="password"
                  required={promptFile.isPasswordProtected}
                  autoFocus
                  value={promptPasswordInput}
                  onChange={(e) => setPromptPasswordInput(e.target.value)}
                  placeholder={promptFile.isPasswordProtected ? "Ketik password berkas..." : "Kosongkan jika memakai kunci master"}
                  className="w-full px-3 py-2 rounded-lg border-2 border-emerald-400 font-mono text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                />
                <p className="text-[11px] text-emerald-800 font-semibold">
                  Jika password benar, berkas akan terdekripsi dan terbuka normal. Jika salah, Poly1305 akan menolak dekripsi.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setPromptFile(null)}
                  className="w-1/2"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={downloadingDecrypted}
                  className="w-1/2 shadow-md"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Buka & Unduh
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
