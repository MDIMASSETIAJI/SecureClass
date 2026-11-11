"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Image as ImageIcon,
  Lock,
  Unlock,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";

export default function SteganographyPage() {
  const [activeTab, setActiveTab] = useState<"encode" | "decode">("encode");

  // Encode state
  const [carrierImage, setCarrierImage] = useState<File | null>(null);
  const [carrierPreview, setCarrierPreview] = useState<string | null>(null);
  const [secretMessage, setSecretMessage] = useState("");
  const [customPassphrase, setCustomPassphrase] = useState("");
  const [encoding, setEncoding] = useState(false);
  const [encodeSuccess, setEncodeSuccess] = useState(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);

  // Decode state
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [stegoPreview, setStegoPreview] = useState<string | null>(null);
  const [decodePassphrase, setDecodePassphrase] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const handleCarrierSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("png") && !file.name.toLowerCase().endsWith(".png")) {
      alert("Peringatan: Steganografi LSB mewajibkan format PNG tanpa kompresi lossy agar bit tidak rusak.");
      return;
    }

    setCarrierImage(file);
    setCarrierPreview(URL.createObjectURL(file));
    setEncodeSuccess(false);
    setEncodeError(null);
  };

  const handleStegoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStegoImage(file);
    setStegoPreview(URL.createObjectURL(file));
    setDecodedMessage(null);
    setDecodeError(null);
  };

  const handleEncode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrierImage || !secretMessage) return;

    setEncoding(true);
    setEncodeError(null);

    try {
      const formData = new FormData();
      formData.append("image", carrierImage);
      formData.append("secretMessage", secretMessage);
      if (customPassphrase) formData.append("passphrase", customPassphrase);

      const res = await fetch("/api/stego/encode", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyisipkan pesan ke dalam gambar.");
      }

      // Download stego image
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stego_${carrierImage.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setEncodeSuccess(true);
    } catch (err: any) {
      setEncodeError(err.message);
    } finally {
      setEncoding(false);
    }
  };

  const handleDecode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stegoImage) return;

    setDecoding(true);
    setDecodeError(null);
    setDecodedMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", stegoImage);
      if (decodePassphrase) formData.append("passphrase", decodePassphrase);

      const res = await fetch("/api/stego/decode", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengekstraksi pesan dari gambar stego.");

      setDecodedMessage(data.plaintext);
    } catch (err: any) {
      setDecodeError(err.message);
    } finally {
      setDecoding(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
            Steganografi — Least Significant Bit (LSB)
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
            Menyembunyikan pesan rahasia yang telah dienkripsi dengan <strong>AES-256-GCM</strong> ke dalam saluran warna RGB citra PNG tanpa perbedaan visual.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 border-b-2 border-gray-200 pb-2">
          <Button
            variant={activeTab === "encode" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("encode")}
          >
            <Lock className="w-4 h-4 mr-1.5" />
            Sisipkan Pesan (Encode LSB)
          </Button>
          <Button
            variant={activeTab === "decode" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("decode")}
          >
            <Unlock className="w-4 h-4 mr-1.5" />
            Ekstraksi Pesan (Decode LSB)
          </Button>
        </div>

        {/* TAB 1: ENCODE */}
        {activeTab === "encode" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Card className="md:col-span-7 p-6">
              <h2 className="text-base font-black text-[#3C3C3C] mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#58CC02]" />
                Penyisipan Pesan Rahasia ke Citra PNG
              </h2>

              {encodeSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-[#D7FFB8] border border-[#58CC02] text-[#46A302] text-xs font-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Citra stego berhasil diproses dan diunduh secara otomatis!
                </div>
              )}

              {encodeError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {encodeError}
                </div>
              )}

              <form onSubmit={handleEncode} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Pilih Citra Pembawa (Carrier PNG)
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/png"
                    onChange={handleCarrierSelect}
                    className="text-xs font-semibold text-[#3C3C3C]"
                  />
                  <p className="text-[10px] text-[#777777] mt-1 font-semibold">
                    * Format wajib PNG (lossless). Kompresi JPEG akan merusak bit LSB.
                  </p>
                  <p className="text-[10px] text-[#58CC02] mt-0.5 font-bold">
                    💡 Rekomendasi Steganalisis: Gunakan foto bertekstur alami (pemandangan, dedaunan) agar variasi bit LSB menyatu alami dan ukuran file tetap konsisten.
                  </p>
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Pesan Rahasia yang Ingin Disembunyikan
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={secretMessage}
                    onChange={(e) => setSecretMessage(e.target.value)}
                    placeholder="Tuliskan pesan akademik rahasia di sini..."
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Passphrase Tambahan (Opsional)
                  </label>
                  <input
                    type="password"
                    value={customPassphrase}
                    onChange={(e) => setCustomPassphrase(e.target.value)}
                    placeholder="Biarkan kosong untuk menggunakan Kunci Master Stego"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={encoding}
                  disabled={!carrierImage || !secretMessage}
                  className="w-full shadow-md pt-2"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Enkripsi AES-256-GCM & Sisipkan ke Bit LSB
                </Button>
              </form>
            </Card>

            <Card className="md:col-span-5 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-[#3C3C3C] mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#58CC02]" />
                  Pratinjau Citra Pembawa
                </h3>

                {carrierPreview ? (
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                    <img
                      src={carrierPreview}
                      alt="Carrier Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 bg-[#F7F7F7] aspect-video flex items-center justify-center text-xs text-[#777777] italic">
                    Belum ada gambar yang dipilih
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-[#F7F7F7] rounded-xl border border-gray-200 text-[11px] text-[#777777] space-y-1">
                <p className="font-extrabold text-[#3C3C3C]">Mekanisme LSB:</p>
                <p>1 byte payload membutuhkan 8 piksel (1 bit per saluran warna).</p>
                <p>Pesan dienkripsi AES-256-GCM terlebih dahulu sebelum bit-nya disisipkan.</p>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: DECODE */}
        {activeTab === "decode" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Card className="md:col-span-7 p-6">
              <h2 className="text-base font-black text-[#3C3C3C] mb-4 flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#58CC02]" />
                Ekstraksi & Dekripsi Pesan Steganografi
              </h2>

              {decodeError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {decodeError}
                </div>
              )}

              <form onSubmit={handleDecode} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Pilih Citra Stego (PNG)
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/png"
                    onChange={handleStegoSelect}
                    className="text-xs font-semibold text-[#3C3C3C]"
                  />
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Passphrase Dekripsi (Jika diset saat encoding)
                  </label>
                  <input
                    type="password"
                    value={decodePassphrase}
                    onChange={(e) => setDecodePassphrase(e.target.value)}
                    placeholder="Kosongkan jika menggunakan Kunci Master Stego"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={decoding}
                  disabled={!stegoImage}
                  className="w-full shadow-md"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Ekstrak Bit LSB & Dekripsi Pesan
                </Button>
              </form>
            </Card>

            <Card className="md:col-span-5 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-[#3C3C3C] mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#58CC02]" />
                  Hasil Ekstraksi Pesan
                </h3>

                {decodedMessage ? (
                  <div className="p-4 rounded-xl bg-[#D7FFB8] border-2 border-[#58CC02] space-y-2">
                    <p className="text-xs font-black text-[#46A302] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Magic Header 'SCST' Valid & Tag Terverifikasi:
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs font-bold text-[#3C3C3C] whitespace-pre-wrap">
                      {decodedMessage}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 bg-[#F7F7F7] p-8 text-center text-xs text-[#777777] italic">
                    Hasil ekstraksi pesan rahasia akan muncul di sini setelah pemindaian bit LSB selesai.
                  </div>
                )}
              </div>

              {stegoPreview && (
                <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                  <img
                    src={stegoPreview}
                    alt="Stego Image"
                    className="max-h-24 mx-auto rounded border border-gray-200 object-contain"
                  />
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
