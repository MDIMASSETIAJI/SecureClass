"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, AlertTriangle, ArrowRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function RegisterPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="p-8 text-center space-y-5 border-2 border-b-4 border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>

          <div>
            <Badge variant="blue" className="mb-2">
              KEBIJAKAN MANAJEMEN AKUN TERPUSAT
            </Badge>
            <h1 className="text-xl font-black text-[#3C3C3C]">
              Pendaftaran Mandiri Ditutup
            </h1>
            <p className="text-xs font-semibold text-[#777777] mt-2 leading-relaxed">
              Sesuai standar keamanan sistem SecureClass, seluruh akun <span className="text-[#3C3C3C] font-black">Dosen dan Mahasiswa</span> diterbitkan secara resmi dan terpusat oleh <span className="text-[#58CC02] font-black">Administrator Institusi</span>.
            </p>
          </div>

          <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-left space-y-2 text-xs font-semibold text-[#3C3C3C]">
            <p className="font-black text-[#3C3C3C] flex items-center gap-1.5">
              <span>📋</span> Alur Pengguna Baru:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#777777]">
              <li>
                Hubungi Administrator untuk memperoleh <strong className="text-[#3C3C3C]">Username</strong> dan <strong className="text-[#3C3C3C]">Password</strong> awal Anda.
              </li>
              <li>
                Masuk melalui halaman <strong className="text-[#58CC02]">Login</strong> menggunakan kredensial tersebut.
              </li>
              <li>
                Sistem akan secara otomatis melempar Anda ke <strong className="text-[#3C3C3C]">Portal Pendaftaran Biometrik Wajah</strong> untuk aktivasi login mandiri.
              </li>
            </ol>
          </div>

          <div className="pt-2">
            <Link href="/login" className="block w-full">
              <Button variant="primary" size="lg" className="w-full shadow-md text-sm">
                <Lock className="w-4 h-4 mr-2" />
                Lanjut ke Halaman Login ({countdown}s)
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
