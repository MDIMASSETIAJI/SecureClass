"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  MessageSquareLock,
  Send,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Star,
  Sparkles,
  RefreshCw,
  Copy,
} from "lucide-react";

export default function MessagingPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt" | "inbox">("encrypt");

  // Compose / Encrypt State
  const [receiverId, setReceiverId] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [vigenereKey, setVigenereKey] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [encryptPreview, setEncryptPreview] = useState<any | null>(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Manual Decrypt Tool State
  const [manualCiphertext, setManualCiphertext] = useState("");
  const [manualIv, setManualIv] = useState("");
  const [manualAuthTag, setManualAuthTag] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [manualDecrypting, setManualDecrypting] = useState(false);
  const [manualPlaintext, setManualPlaintext] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // Modal Decrypt Message State
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [modalKey, setModalKey] = useState("");
  const [modalDecrypting, setModalDecrypting] = useState(false);
  const [modalPlaintext, setModalPlaintext] = useState<string | null>(null);
  const [modalMeta, setModalMeta] = useState<any | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = () => {
    fetch("/api/messaging/inbox")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMessages(data.messages || []);
          setContacts(data.contacts || []);
          if (data.contacts?.length > 0 && !receiverId) {
            setReceiverId(data.contacts[0].id);
          }
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  const generateRandomKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVigenereKey(result);
  };

  // TOMBOL 1: ENCRYPT (Uji / Pratinjau Kriptografi)
  const handleTestEncrypt = async () => {
    if (!plaintext.trim()) {
      alert("Masukkan teks pesan (plaintext) terlebih dahulu!");
      return;
    }
    if (!vigenereKey.trim()) {
      alert("Masukkan Kunci Enkripsi (Vigenère Key) terlebih dahulu!");
      return;
    }

    setEncrypting(true);
    setEncryptPreview(null);
    setSendError(null);

    try {
      const res = await fetch("/api/messaging/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plaintext,
          vigenereKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengenkripsi pesan.");

      setEncryptPreview(data);
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setEncrypting(false);
    }
  };

  // TOMBOL 1B: ENCRYPT & KIRIM
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !plaintext.trim()) return;

    if (!vigenereKey.trim()) {
      alert("Kunci enkripsi wajib dimasukkan sebelum mengirim pesan!");
      return;
    }

    setSending(true);
    setSendSuccess(false);
    setSendError(null);

    try {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          plaintext,
          vigenereKey,
          isImportant,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pesan terenkripsi.");

      setPlaintext("");
      setIsImportant(false);
      setEncryptPreview(null);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
      loadInbox();
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  // TOMBOL 2: DECRYPT (Alat Dekripsi Manual)
  const handleManualDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCiphertext.trim() || !manualKey.trim()) {
      alert("Masukkan Ciphertext dan Kunci Dekripsi!");
      return;
    }

    setManualDecrypting(true);
    setManualPlaintext(null);
    setManualError(null);

    try {
      const res = await fetch("/api/messaging/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: manualCiphertext.trim(),
          iv: manualIv.trim(),
          authTag: manualAuthTag.trim(),
          vigenereKey: manualKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendekripsi ciphertext.");

      setManualPlaintext(data.plaintext);
    } catch (err: any) {
      setManualError(err.message);
    } finally {
      setManualDecrypting(false);
    }
  };

  // Buka Modal Dekripsi Pesan Masuk
  const openModalDecrypt = (msg: any) => {
    setSelectedMessage(msg);
    setModalKey("");
    setModalError(null);
    setModalPlaintext(null);
    setModalMeta(null);
  };

  // TOMBOL 2B: DECRYPT (Di dalam Modal Pesan Masuk)
  const handleModalDecryptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;

    if (!modalKey.trim()) {
      setModalError("Kunci dekripsi wajib dimasukkan untuk membuka pesan ini!");
      return;
    }

    setModalDecrypting(true);
    setModalError(null);
    setModalPlaintext(null);

    try {
      const res = await fetch("/api/messaging/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: selectedMessage.id,
          vigenereKey: modalKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendekripsi pesan.");

      setModalPlaintext(data.plaintext);
      setModalMeta({
        keyUsed: modalKey.trim().toUpperCase(),
        algorithm: data.algorithm,
        sender: data.sender,
        createdAt: data.createdAt,
      });
      loadInbox();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalDecrypting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Berhasil disalin ke clipboard!");
  };

  return (
    <>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
              Pesan Terenkripsi — Super Encryption
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Sistem kriptografi ganda: <strong>Vigenère Cipher (Klasik)</strong> +{" "}
              <strong>AES-256-GCM (Modern AEAD)</strong> dengan tombol mandiri <strong>ENCRYPT</strong> dan <strong>DECRYPT</strong>.
            </p>
          </div>

          {/* Security Alert Banner */}
          <div className="p-4 rounded-2xl bg-white border-2 border-gray-200 text-xs text-[#777777] flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#58CC02] flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-black text-[#3C3C3C]">Mekanisme Kunci Pengguna: </span>
              Pengirim wajib memasukkan <strong>Kunci Enkripsi (Vigenère Key)</strong> untuk mengunci pesan. Penerima pesan tidak dapat membaca isi pesan tanpa memasukkan <strong>Kunci Dekripsi</strong> yang cocok dan menekan tombol <strong>DECRYPT</strong>.
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
              Tombol 1: Enkripsi Pesan (Encrypt)
            </Button>
            <Button
              variant={activeTab === "decrypt" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("decrypt")}
            >
              <Unlock className="w-4 h-4 mr-1.5" />
              Tombol 2: Dekripsi Pesan (Decrypt)
            </Button>
            <Button
              variant={activeTab === "inbox" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("inbox")}
            >
              <MessageSquareLock className="w-4 h-4 mr-1.5" />
              Kotak Pesan ({messages.length})
            </Button>
          </div>

          {/* TAB 1: ENCRYPT SECTION */}
          {activeTab === "encrypt" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input */}
              <Card className="lg:col-span-6 p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <Lock className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Operasi 1: Enkripsi Pesan (Encrypt)</h2>
                </div>

                {sendSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-[#D7FFB8] border border-[#58CC02] text-[#46A302] text-xs font-black flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Pesan terenkripsi berhasil dikirim dan dicatat pada Blockchain!
                  </div>
                )}

                {sendError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    {sendError}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="space-y-4 text-xs font-bold">
                  <div>
                    <label className="block uppercase text-[#777777] mb-1">Penerima Pesan</label>
                    <select
                      value={receiverId}
                      onChange={(e) => setReceiverId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    >
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.role} — @{c.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block uppercase text-[#777777] mb-1">Isi Pesan (Plaintext)</label>
                    <textarea
                      rows={4}
                      required
                      value={plaintext}
                      onChange={(e) => setPlaintext(e.target.value)}
                      placeholder="Ketik pesan akademik rahasia di sini..."
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    />
                  </div>

                  {/* KUNCI ENKRIPSI YANG WAJIB DIMASUKKAN USER */}
                  <div className="p-4 rounded-xl bg-emerald-50/80 border-2 border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="uppercase text-emerald-900 font-black flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#58CC02]" />
                        Kunci Enkripsi (Vigenère Key) *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomKey}
                        className="text-[11px] text-[#58CC02] hover:underline font-bold flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Acak Kunci
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      value={vigenereKey}
                      onChange={(e) => setVigenereKey(e.target.value.toUpperCase())}
                      placeholder="Contoh: KRIPTO2026 atau KUNCI123"
                      className="w-full px-3 py-2 rounded-lg border-2 border-emerald-400 font-mono font-black text-[#3C3C3C] tracking-wider uppercase focus:border-[#58CC02] focus:outline-none"
                    />
                    <p className="text-[11px] text-emerald-800 font-semibold">
                      Kunci ini wajib diingat atau dibagikan ke penerima agar penerima bisa mendekripsi pesan Anda.
                    </p>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isImportant}
                        onChange={(e) => setIsImportant(e.target.checked)}
                        className="rounded border-gray-300 text-[#58CC02] focus:ring-[#58CC02]"
                      />
                      <span className="text-[#3C3C3C] flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        Tandai sebagai Pesan Penting / Rahasia Khusus
                      </span>
                    </label>
                  </div>

                  {/* DUA TOMBOL AKSI ENKRIPSI */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      isLoading={encrypting}
                      onClick={handleTestEncrypt}
                      className="w-full shadow-sm"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Tombol: ENCRYPT (Uji)
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={sending}
                      className="w-full shadow-md"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      ENCRYPT & Kirim
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Preview Hasil Enkripsi */}
              <Card className="lg:col-span-6 p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <Sparkles className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Hasil Lapisan Enkripsi (Preview)</h2>
                </div>

                {encryptPreview ? (
                  <div className="space-y-4 text-xs font-semibold">
                    <div className="p-3 bg-[#D7FFB8] rounded-xl border border-[#58CC02] text-[#46A302] font-black flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Super Encryption Berhasil Dihasilkan!
                    </div>

                    <div className="space-y-3 font-mono text-[11px]">
                      <div className="p-3 bg-[#F7F7F7] rounded-xl border border-gray-200">
                        <span className="font-sans font-bold text-[#777777] block text-[10px] uppercase mb-1">
                          Plaintext Asli
                        </span>
                        <p className="text-[#3C3C3C] break-all font-sans">{encryptPreview.plaintext}</p>
                      </div>

                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-sans font-bold text-blue-800 text-[10px] uppercase">
                            Lapisan 1: Vigenère Cipher (Substitusi Polialfabetik)
                          </span>
                          <Badge variant="blue">Kunci: {encryptPreview.vigenereKey}</Badge>
                        </div>
                        <p className="text-blue-950 break-all">{encryptPreview.layer1Ciphertext}</p>
                      </div>

                      <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-sans font-bold text-purple-800 text-[10px] uppercase">
                            Lapisan 2: AES-256-GCM (Final Ciphertext Base64)
                          </span>
                          <button
                            onClick={() => copyToClipboard(encryptPreview.ciphertext)}
                            className="text-purple-700 hover:text-purple-900 flex items-center gap-1 font-sans text-[10px]"
                          >
                            <Copy className="w-3 h-3" /> Salin
                          </button>
                        </div>
                        <p className="text-purple-950 break-all">{encryptPreview.ciphertext}</p>
                        <div className="mt-2 pt-2 border-t border-purple-200 flex justify-between text-[10px] text-purple-700">
                          <span>IV: {encryptPreview.iv}</span>
                          <span>Tag: {encryptPreview.authTag}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-xs text-[#777777] space-y-2">
                    <KeyRound className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-bold">Belum ada pratinjau enkripsi.</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Ketik pesan dan kunci di sebelah kiri, lalu klik tombol <strong>ENCRYPT</strong> untuk melihat transformasi matematis dari plaintext menjadi ciphertext.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: DECRYPT SECTION (ALAT DEKRIPSI DENGAN TOMBOL DECRYPT) */}
          {activeTab === "decrypt" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-7 p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <Unlock className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Operasi 2: Dekripsi Pesan (Decrypt)</h2>
                </div>

                <p className="text-xs text-[#777777] mb-4 font-semibold">
                  Alat dekripsi manual: Masukkan ciphertext terenkripsi beserta <strong>Kunci Dekripsi</strong> yang tepat untuk membuka kembali plaintext asli.
                </p>

                {manualError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}

                <form onSubmit={handleManualDecrypt} className="space-y-4 text-xs font-bold">
                  <div>
                    <label className="block uppercase text-[#777777] mb-1">Ciphertext (Base64) *</label>
                    <textarea
                      rows={3}
                      required
                      value={manualCiphertext}
                      onChange={(e) => setManualCiphertext(e.target.value)}
                      placeholder="Tempelkan ciphertext Base64 di sini..."
                      className="w-full px-3 py-2 rounded-xl border-2 border-gray-300 font-mono text-[11px] text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block uppercase text-[#777777] mb-1">IV (12-Byte Hex) *</label>
                      <input
                        type="text"
                        required
                        value={manualIv}
                        onChange={(e) => setManualIv(e.target.value)}
                        placeholder="misal: 1a2b3c4d5e6f7a8b9c0d1e2f"
                        className="w-full px-3 py-2 rounded-xl border-2 border-gray-300 font-mono text-[11px] text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block uppercase text-[#777777] mb-1">Auth Tag (16-Byte Hex) *</label>
                      <input
                        type="text"
                        required
                        value={manualAuthTag}
                        onChange={(e) => setManualAuthTag(e.target.value)}
                        placeholder="misal: 9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c"
                        className="w-full px-3 py-2 rounded-xl border-2 border-gray-300 font-mono text-[11px] text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* INPUT KUNCI DEKRIPSI */}
                  <div className="p-4 rounded-xl bg-amber-50/90 border-2 border-amber-300 space-y-1.5">
                    <label className="uppercase text-amber-900 font-black flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      Kunci Dekripsi (Vigenère Key) *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value.toUpperCase())}
                      placeholder="Masukkan kunci yang digunakan saat enkripsi..."
                      className="w-full px-3 py-2 rounded-lg border-2 border-amber-400 font-mono font-black text-[#3C3C3C] tracking-wider uppercase focus:border-[#58CC02] focus:outline-none"
                    />
                    <p className="text-[11px] text-amber-800 font-semibold">
                      Jika kunci salah, dekripsi akan ditolak oleh verifikasi otentikasi tag AES-GCM atau menghasilkan teks substitusi yang tidak valid.
                    </p>
                  </div>

                  {/* TOMBOL DECRYPT */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={manualDecrypting}
                    className="w-full shadow-md py-3 text-sm"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Tombol: DECRYPT (Buka Plaintext)
                  </Button>
                </form>
              </Card>

              {/* Hasil Dekripsi Manual */}
              <Card className="lg:col-span-5 p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Hasil Dekripsi (Plaintext)</h2>
                </div>

                {manualPlaintext ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#D7FFB8] border-2 border-[#58CC02]">
                      <div className="flex items-center gap-2 text-xs font-black text-[#46A302] mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Plaintext Berhasil Didekripsi:
                      </div>
                      <div className="mt-2 bg-white p-3 rounded-lg border border-gray-200 text-sm font-black text-[#3C3C3C] whitespace-pre-wrap">
                        {manualPlaintext}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] font-semibold text-[#555555] space-y-1">
                      <div className="flex justify-between">
                        <span>Kunci yang Digunakan:</span>
                        <span className="font-mono font-bold text-[#3C3C3C]">{manualKey}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Verifikasi Integritas:</span>
                        <span className="font-bold text-[#46A302]">100% Lolos Auth Tag</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-xs text-[#777777] space-y-2">
                    <Unlock className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-bold">Belum ada hasil dekripsi.</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Masukkan ciphertext dan kunci di sebelah kiri, kemudian klik tombol <strong>DECRYPT</strong>.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3 / INBOX LIST */}
          {activeTab === "inbox" && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <MessageSquareLock className="w-5 h-5 text-[#58CC02]" />
                  <h2 className="text-base font-black text-[#3C3C3C]">Kotak Pesan Terenkripsi</h2>
                </div>
                <Badge variant="gray">{messages.length} Pesan Tersimpan</Badge>
              </div>

              {loading ? (
                <p className="text-xs text-[#777777] text-center py-8">Memuat pesan...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-8 italic">
                  Belum ada pesan terenkripsi. Buka tab Enkripsi untuk mengirim pesan baru.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 rounded-xl border border-gray-200 bg-[#F7F7F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={msg.isSender ? "gray" : "blue"}>
                            {msg.isSender ? "Terkirim" : "Diterima"}
                          </Badge>
                          {msg.isImportant && (
                            <Badge variant="yellow">
                              <Star className="w-3 h-3 fill-yellow-600 mr-1" />
                              Penting
                            </Badge>
                          )}
                          <span className="text-xs font-black text-[#3C3C3C]">
                            {msg.isSender ? `Ke: ${msg.receiver.fullName}` : `Dari: ${msg.sender.fullName}`}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#777777]">
                          Waktu: {new Date(msg.createdAt).toLocaleString("id-ID")}
                        </p>
                        <p className="text-[10px] text-[#777777] font-mono">
                          Ciphertext: {msg.ciphertextLength} bytes • {msg.algorithm}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Tombol isi otomatis ke alat dekripsi manual */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setManualCiphertext(msg.ciphertext);
                            setManualIv(msg.iv);
                            setManualAuthTag(msg.authTag);
                            setActiveTab("decrypt");
                          }}
                        >
                          Salin ke Tool
                        </Button>

                        {/* Tombol DECRYPT dengan prompt input kunci */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openModalDecrypt(msg)}
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Tombol: DECRYPT
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

      {/* MODAL: DECRYPT PESAN MASUK DENGAN INPUT KUNCI */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#58CC02]" />
                Dekripsi Pesan: Masukkan Kunci
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMessage(null)}
              >
                Tutup
              </Button>
            </div>

            {!modalPlaintext ? (
              <form onSubmit={handleModalDecryptSubmit} className="space-y-4 py-2 text-xs font-bold">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-[#555555] space-y-1">
                  <div className="flex justify-between">
                    <span>Pengirim:</span>
                    <span className="font-bold text-[#3C3C3C]">{selectedMessage.sender.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-bold text-[#58CC02]">Terenkripsi Super (Vigenère + AES-GCM)</span>
                  </div>
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Ciphertext Terenkripsi
                  </label>
                  <p className="p-2.5 bg-gray-100 rounded-lg font-mono text-[10px] text-[#555555] break-all max-h-16 overflow-y-auto">
                    {selectedMessage.ciphertext}
                  </p>
                </div>

                {modalError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* INPUT KUNCI DEKRIPSI YANG DIWAJIBKAN */}
                <div className="p-3.5 bg-emerald-50 rounded-xl border-2 border-emerald-300 space-y-1.5">
                  <label className="uppercase text-emerald-900 font-black flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#58CC02]" />
                    Kunci Dekripsi (Vigenère Key) *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={modalKey}
                    onChange={(e) => setModalKey(e.target.value.toUpperCase())}
                    placeholder="Masukkan kunci rahasia pengirim..."
                    className="w-full px-3 py-2 rounded-lg border-2 border-emerald-400 font-mono font-black text-[#3C3C3C] uppercase tracking-wider focus:border-[#58CC02] focus:outline-none"
                  />
                  <p className="text-[11px] text-emerald-800 font-semibold">
                    Kunci dibutuhkan untuk membalikkan substitusi Vigenère dan membuka amplop enkripsi.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={modalDecrypting}
                  className="w-full shadow-md py-3"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Tombol: DECRYPT
                </Button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-[#D7FFB8] border-2 border-[#58CC02]">
                  <div className="flex items-center gap-2 text-xs font-black text-[#46A302] mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Integritas Data Sah & Pesan Terbuka:
                  </div>
                  <p className="text-sm font-extrabold text-[#3C3C3C] whitespace-pre-wrap mt-2 bg-white p-3 rounded-lg border border-gray-200">
                    {modalPlaintext}
                  </p>
                </div>

                {modalMeta && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-[11px] font-semibold text-[#555555]">
                    <div className="flex justify-between items-center">
                      <span>Kunci yang Berhasil:</span>
                      <span className="font-mono font-bold text-[#3C3C3C] bg-white px-2 py-0.5 rounded border border-gray-300">
                        {modalMeta.keyUsed}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Metode:</span>
                      <span className="font-bold text-[#3C3C3C]">Vigenère + AES-256-GCM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Integritas:</span>
                      <span className="font-bold text-[#46A302]">AEAD Auth Tag 128-bit Valid</span>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                  className="w-full"
                >
                  Selesai Membaca
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
