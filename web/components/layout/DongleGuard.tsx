"use client";

import React, { useEffect, useState } from "react";
import { Usb, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";

export const DongleGuard: React.FC = () => {
  const [isPluggedIn, setIsPluggedIn] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkHeartbeat = async () => {
    try {
      setChecking(true);
      const res = await fetch("/api/auth/dongle/heartbeat");
      const data = await res.json();
      if (res.ok) {
        setIsPluggedIn(data.pluggedIn);
      }
    } catch {
      // Ignore network blips
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkHeartbeat();

    // Poll every 2 seconds
    const interval = setInterval(checkHeartbeat, 2000);
    return () => clearInterval(interval);
  }, []);

  // If dongle is currently plugged in, render nothing (app is unlocked)
  if (isPluggedIn) {
    return null;
  }

  // Dongle unplugged lock screen overlay
  return (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-4 border-red-500 rounded-3xl p-8 max-w-lg w-full text-center space-y-5 shadow-2xl animate-in fade-in duration-200">
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-red-500 text-white flex items-center justify-center border-b-4 border-red-700 shadow-lg">
            <Usb className="w-8 h-8" />
          </div>
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 tracking-wider uppercase mb-2">
            HARDWARE DONGLE LOCK
          </span>
          <h2 className="text-xl font-black text-[#3C3C3C]">
            Flashdisk USB Tidak Terdeteksi!
          </h2>
          <p className="text-xs text-[#777777] font-semibold mt-1 leading-relaxed">
            Aplikasi SecureClass terkunci. Sesuai kebijakan keamanan, aplikasi <strong>tidak dapat dijalankan</strong> jika Flashdisk USB fisik Anda belum dicolokkan ke port komputer.
          </p>
        </div>

        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xs font-semibold text-[#777777] leading-relaxed">
          <p>
            Pastikan Flashdisk fisik Anda yang memuat berkas <code className="text-[#58CC02] font-mono font-bold">dongle.key</code> telah terhubung ke port USB komputer.
          </p>
        </div>

        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#777777]">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
            <span>Memindai port Flashdisk USB fisik secara otomatis setiap 2 detik...</span>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={checkHeartbeat}
            isLoading={checking}
            className="w-full shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Periksa Ulang Port USB Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
};
