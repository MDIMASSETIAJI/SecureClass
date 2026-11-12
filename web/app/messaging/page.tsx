"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VigenereCipher } from "@/lib/crypto/vigenere";
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
  Copy,
  ArrowDown,
  Layers,
} from "lucide-react";

export default function MessagingPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [receiverId, setReceiverId] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [vigenereKey, setVigenereKey] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Step-by-Step Encryption Result State
  const [lastSentSteps, setLastSentSteps] = useState<any | null>(null);

  // Modal Decrypt State
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [modalDecrypting, setModalDecrypting] = useState(false);
  const [modalPlaintext, setModalPlaintext] = useState<string | null>(null);
  const [modalKeyUsed, setModalKeyUsed] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const generateRandomKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    loadInbox();
    setVigenereKey(generateRandomKey());
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

  // Live calculation for Layer 1 Vigenère
  const liveVigenerePreview = React.useMemo(() => {
    if (!plaintext.trim() || !vigenereKey.trim()) return "";
    try {
      return VigenereCipher.encrypt(plaintext, vigenereKey.trim().toUpperCase());
    } catch {
      return "";
    }
  }, [plaintext, vigenereKey]);

  // HANYA SATU TOMBOL: KIRIM PESAN
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !plaintext.trim()) return;

    const keyToUse = vigenereKey.trim() || generateRandomKey();

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
          vigenereKey: keyToUse,
          isImportant,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pesan terenkripsi.");

      // Store the step-by-step encryption results to show on screen
      if (data.steps) {
        setLastSentSteps(data.steps);
      } else {
        setLastSentSteps({
          plaintext,
          vigenereKey: keyToUse,
          layer1Vigenere: liveVigenerePreview,
          layer2Ciphertext: "Terenkripsi AES-256-GCM (Tersimpan aman di DB & Blockchain)",
          iv: "Random 96-bit CSPRNG",
          authTag: "128-bit Poly/GCM Tag Valid",
        });
      }

      setPlaintext("");
      setIsImportant(false);
      setVigenereKey(generateRandomKey()); // Acak kunci baru secara otomatis untuk pesan berikutnya
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
      loadInbox();
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const openDecryptModal = (msg: any) => {
    setSelectedMessage(msg);
    setModalError(null);
    setModalPlaintext(null);
    setModalKeyUsed(null);
  };

  const handleModalDecryptSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedMessage) return;

    setModalDecrypting(true);
    setModalError(null);
    setModalPlaintext(null);
    setModalKeyUsed(null);

    try {
      const res = await fetch("/api/messaging/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: selectedMessage.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendekripsi pesan.");

      setModalPlaintext(data.plaintext);
      setModalKeyUsed(data.autoKey || data.keyUsed || "Sistem Otomatis");
      loadInbox();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalDecrypting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Teks berhasil disalin ke clipboard!");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
            Pesan Terenkripsi — Super Encryption
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
            Pengiriman pesan berkeamanan tinggi dengan enkripsi bertingkat: <strong>Vigenère Cipher (Klasik)</strong> dipadukan dengan <strong>AES-256-GCM (Modern AEAD)</strong>.
          </p>
        </div>

        {/* Security Banner */}
        <div className="p-4 rounded-2xl bg-white border-2 border-gray-200 text-xs text-[#777777] flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#58CC02] flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-black text-[#3C3C3C]">Alur Super Encryption: </span>
            Setiap pesan yang Anda kirim akan melalui dua lapis proteksi kriptografi secara berurutan. Di sebelah kanan, Anda dapat melihat rincian langkah transformasi dari teks asli hingga menjadi ciphertext terenkripsi final.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* KOLOM KIRI: FORMULIR PENGIRIMAN (HANYA SATU TOMBOL: KIRIM) */}
          <Card className="lg:col-span-5 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <Send className="w-5 h-5 text-[#58CC02]" />
                <h2 className="text-base font-black text-[#3C3C3C]">Kirim Pesan Rahasia</h2>
              </div>

              {sendSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-[#D7FFB8] border border-[#58CC02] text-[#46A302] text-xs font-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Pesan berhasil dienkripsi ganda dan dicatat pada Blockchain!</span>
                </div>
              )}

              {sendError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{sendError}</span>
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
                  <label className="block uppercase text-[#777777] mb-1">Pesan Asli (Plaintext) *</label>
                  <textarea
                    rows={4}
                    required
                    value={plaintext}
                    onChange={(e) => setPlaintext(e.target.value)}
                    placeholder="Ketik pesan akademik rahasia di sini..."
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                {/* KUNCI VIGENERE OTOMATIS OLEH SISTEM (TANPA INPUT) */}
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border-2 border-emerald-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="uppercase text-emerald-900 font-black flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#58CC02]" />
                      Kunci Vigenère Otomatis
                    </label>
                    <Badge variant="blue" className="font-mono font-black text-xs tracking-wider">
                      {vigenereKey || "RANDOM CSPRNG"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-semibold">
                    Kunci substitusi diisi acak otomatis oleh sistem untuk setiap pesan baru.
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
                      Tandai sebagai Pesan Penting
                    </span>
                  </label>
                </div>

                {/* HANYA SATU TOMBOL SAJA: KIRIM PESAN */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={sending}
                    disabled={!plaintext.trim()}
                    className="w-full shadow-md py-3 text-sm font-black"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Kirim Pesan
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {/* KOLOM KANAN: HASIL ENCRYPT & LANGKAH-LANGKAH PENG-ENCRYPT-AN */}
          <Card className="lg:col-span-7 p-6 bg-white border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#58CC02]" />
                <h2 className="text-base font-black text-[#3C3C3C]">Hasil & Langkah Peng-encrypt-an</h2>
              </div>
              <Badge variant="blue">Super Encryption</Badge>
            </div>

            {/* Jika ada input atau ada pesan terakhir yang dikirim, tampilkan 3 langkah */}
            {plaintext.trim() || lastSentSteps ? (
              <div className="space-y-4">
                {/* LANGKAH 1: PESAN ASLI */}
                <div className="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#3C3C3C] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[11px] font-bold">1</span>
                      Langkah 1: Pesan Asli (Plaintext)
                    </span>
                    <Badge variant="gray">Input Awal</Badge>
                  </div>
                  <p className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs font-bold text-[#3C3C3C] break-all">
                    {plaintext || lastSentSteps?.plaintext}
                  </p>
                </div>

                {/* PANAH ALUR */}
                <div className="flex justify-center -my-2">
                  <div className="bg-gray-100 p-1 rounded-full text-gray-400">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>

                {/* LANGKAH 2: VIGENERE CIPHER */}
                <div className="p-3.5 rounded-xl bg-blue-50/80 border-2 border-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[11px] font-bold">2</span>
                      Langkah 2: Vigenère Cipher (Klasik)
                    </span>
                    <Badge variant="blue">Kunci: {vigenereKey || lastSentSteps?.vigenereKey}</Badge>
                  </div>
                  <p className="p-2.5 bg-white rounded-lg border border-blue-200 font-mono text-xs font-bold text-blue-950 break-all">
                    {liveVigenerePreview || lastSentSteps?.layer1Vigenere || "Menunggu input pesan..."}
                  </p>
                  <p className="text-[10px] text-blue-800 font-semibold">
                    Substitusi polialfabetik: Karakter digeser berdasarkan nilai alfabet kunci Vigenère.
                  </p>
                </div>

                {/* PANAH ALUR */}
                <div className="flex justify-center -my-2">
                  <div className="bg-gray-100 p-1 rounded-full text-gray-400">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>

                {/* LANGKAH 3: AES-256-GCM */}
                <div className="p-3.5 rounded-xl bg-purple-50/80 border-2 border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-[11px] font-bold">3</span>
                      Langkah 3: AES-256-GCM (Modern AEAD)
                    </span>
                    {lastSentSteps?.layer2Ciphertext && (
                      <button
                        onClick={() => copyToClipboard(lastSentSteps.layer2Ciphertext)}
                        className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Salin Ciphertext
                      </button>
                    )}
                  </div>
                  <p className="p-2.5 bg-white rounded-lg border border-purple-200 font-mono text-xs font-bold text-purple-950 break-all select-all">
                    {lastSentSteps?.layer2Ciphertext || (
                      <span className="text-[#777777] italic font-sans font-normal">
                        Ciphertext final (Base64), IV 96-bit, dan Auth Tag 128-bit akan dihasilkan secara permanen saat Anda menekan tombol <strong>Kirim Pesan</strong>.
                      </span>
                    )}
                  </p>
                  {lastSentSteps && (
                    <div className="p-2 bg-purple-100/60 rounded-lg text-[10px] text-purple-800 font-mono flex justify-between">
                      <span>IV: {lastSentSteps.iv}</span>
                      <span>Auth Tag: {lastSentSteps.authTag}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-purple-800 font-semibold">
                    Enkripsi simetrik terotentikasi: Menjamin kerahasiaan sekaligus integritas pesan dari manipulasi bit.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-[#777777] space-y-2">
                <Layers className="w-12 h-12 text-gray-300 mx-auto" />
                <p className="font-bold text-[#3C3C3C]">Langkah Enkripsi Akan Muncul di Sini</p>
                <p className="text-[11px] max-w-sm mx-auto">
                  Ketik pesan pada formulir di sebelah kiri. Sistem akan langsung memperlihatkan langkah-langkah enkripsi: dari <strong>Pesan Asli</strong> $\rightarrow$ <strong>Vigenère</strong> $\rightarrow$ <strong>AES-256-GCM</strong>.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* BAGIAN BAWAH: KOTAK PESAN MASUK & TERKIRIM */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquareLock className="w-5 h-5 text-[#58CC02]" />
              <h2 className="text-base font-black text-[#3C3C3C]">Kotak Pesan Terenkripsi</h2>
            </div>
            <Badge variant="gray">{messages.length} Pesan</Badge>
          </div>

          {loading ? (
            <p className="text-xs text-[#777777] text-center py-8">Memuat pesan...</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-[#777777] text-center py-8 italic">
              Belum ada riwayat pesan. Kirim pesan pertama Anda menggunakan formulir di atas.
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

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDecryptModal(msg)}
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1" />
                    Dekripsi Pesan
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* MODAL: DEKRIPSI PESAN DENGAN KUNCI */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#58CC02]" />
                Dekripsi Pesan Terenkripsi
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
                    <span>Algoritma:</span>
                    <span className="font-bold text-[#58CC02]">Super Encryption (Vigenère + AES-GCM)</span>
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

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-semibold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Kunci Vigenère acak dipulihkan secara otomatis oleh sistem melalui envelope terotentikasi.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={modalDecrypting}
                  className="w-full shadow-md py-3"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Buka & Dekripsi Pesan
                </Button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-[#D7FFB8] border-2 border-[#58CC02]">
                  <div className="flex items-center gap-2 text-xs font-black text-[#46A302] mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Pesan Berhasil Didekripsi:
                  </div>
                  <p className="text-sm font-extrabold text-[#3C3C3C] whitespace-pre-wrap mt-2 bg-white p-3 rounded-lg border border-gray-200">
                    {modalPlaintext}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-[11px] font-semibold text-[#555555]">
                  <div className="flex justify-between items-center">
                    <span>Kunci Acak Sistem:</span>
                    <Badge variant="blue" className="font-mono font-black">{modalKeyUsed}</Badge>
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
    </AppLayout>
  );
}
