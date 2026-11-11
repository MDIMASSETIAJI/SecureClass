"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  KeyRound,
  Usb,
  ScanFace,
  Lock,
  FileCheck2,
  Image as ImageIcon,
  Blocks,
  ArrowRight,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Top banner */}
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#58CC02] border-b-4 border-[#46A302] flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-[#3C3C3C] block leading-none">
                SECURE<span className="text-[#58CC02]">CLASS</span>
              </span>
              <span className="text-[10px] font-extrabold text-[#777777] tracking-wider uppercase">
                Zero-Trust Academic Shield
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="primary" size="md">
                <Lock className="w-4 h-4 mr-2" />
                Masuk (Login)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge variant="green">
          <Shield className="w-3.5 h-3.5" />
          SISTEM KEAMANAN SIBER BERLAPIS (DEFENSE-IN-DEPTH)
        </Badge>
        <h1 className="mt-4 text-4xl sm:text-5xl font-black text-[#3C3C3C] tracking-tight leading-tight">
          Platform Pengelolaan Dokumen Akademik dengan{" "}
          <span className="text-[#58CC02]">Autentikasi 3-Faktor & Kriptografi Modern</span>
        </h1>
        <p className="mt-4 text-lg text-[#777777] font-semibold max-w-2xl mx-auto">
          Menerapkan kombinasi proteksi Password Argon2id, USB Dongle ECDSA P-256, Biometrik Wajah ArcFace dengan Anti-Spoofing, Super Encryption, ChaCha20-Poly1305, Steganografi LSB, dan Tamper-Evident Hash Chain.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto px-10 shadow-md text-base">
              <Lock className="w-5 h-5 mr-2" />
              Masuk ke Sistem (Login)
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 3FA Authentication Flow Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-[#3C3C3C]">
            Autentikasi Tiga Faktor Wajib (Zero-Trust 3FA)
          </h2>
          <p className="text-sm font-bold text-[#777777] mt-1">
            Pengguna tidak dapat mengakses dashboard sebelum ketiga faktor berhasil divalidasi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[#3C3C3C] font-black text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-black text-[#3C3C3C]">Password Argon2id</h3>
              <p className="text-xs text-[#777777] font-semibold mt-2 leading-relaxed">
                Faktor pertama mengandalkan password yang diproteksi dengan Argon2id (hybrid), memberikan ketahanan optimal terhadap serangan ASIC, GPU cracker, dan side-channel attacks.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-[#46A302]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Brute-force Rate Limited</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[#3C3C3C] font-black text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-black text-[#3C3C3C]">USB Dongle (ECDSA P-256)</h3>
              <p className="text-xs text-[#777777] font-semibold mt-2 leading-relaxed">
                Flashdisk FAT32 biasa berfungsi sebagai dongle pembawa berkas kunci. Backend membuat 32-byte challenge nonce sekali-pakai yang ditandatangani di peramban menggunakan Web Crypto API.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-[#46A302]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Challenge-Response Persisten</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[#3C3C3C] font-black text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-black text-[#3C3C3C]">Biometrik Wajah & Liveness</h3>
              <p className="text-xs text-[#777777] font-semibold mt-2 leading-relaxed">
                Model Deep Learning ArcFace mengekstrak 512-dimensi face embedding. Dilengkapi deteksi anti-spoofing berbasis analisis frekuensi 2D FFT, varians Laplacian, dan krominansi YCrCb.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-[#46A302]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Embedding Terenkripsi AES-256</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Cryptography Modules Grid */}
      <section className="max-w-6xl mx-auto px-4 py-8 mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-[#3C3C3C]">
            Arsitektur Kriptografi & Fitur Keamanan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <Lock className="w-8 h-8 text-[#58CC02] mb-3" />
            <h4 className="font-extrabold text-[#3C3C3C]">Super Encryption</h4>
            <p className="text-xs text-[#777777] mt-1">
              Kombinasi substitusi polialfabetik Vigenère sebagai lapisan klasik dan AES-256-GCM sebagai lapisan modern dengan authentication tag.
            </p>
          </Card>

          <Card className="p-4">
            <FileCheck2 className="w-8 h-8 text-[#58CC02] mb-3" />
            <h4 className="font-extrabold text-[#3C3C3C]">ChaCha20-Poly1305</h4>
            <p className="text-xs text-[#777777] mt-1">
              Enkripsi dokumen dan tugas akademik terpisah dari pesan teks dengan nonce 96-bit unik dan verifikasi integritas MAC 128-bit.
            </p>
          </Card>

          <Card className="p-4">
            <ImageIcon className="w-8 h-8 text-[#58CC02] mb-3" />
            <h4 className="font-extrabold text-[#3C3C3C]">Steganografi LSB</h4>
            <p className="text-xs text-[#777777] mt-1">
              Penyisipan ciphertext terenkripsi ke dalam Least Significant Bit saluran warna RGB citra PNG tanpa degradasi visual.
            </p>
          </Card>

          <Card className="p-4">
            <Blocks className="w-8 h-8 text-[#58CC02] mb-3" />
            <h4 className="font-extrabold text-[#3C3C3C]">Tamper-Evident Hash Chain</h4>
            <p className="text-xs text-[#777777] mt-1">
              Rantai audit SHA-256 yang mencatat riwayat login, publikasi tugas, dan pengumpulan berkas dengan deteksi manipulasi instan.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

