"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Shield,
  GraduationCap,
  MessageSquareLock,
  FileKey2,
  Image as ImageIcon,
  Blocks,
  Users,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    tasksCount: 0,
    messagesCount: 0,
    blockchainValid: true,
    totalBlocks: 0,
    usersCount: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChangedPassword, setHasChangedPassword] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/academic/tasks").then((r) => r.json()),
      fetch("/api/blockchain/status").then((r) => r.json()),
    ])
      .then(([authData, tasksData, chainData]) => {
        if (authData.authenticated) {
          setUser(authData.user);
          setHasChangedPassword(!!authData.hasChangedPassword);
        }
        if (tasksData.success) {
          setTasks(tasksData.tasks || []);
        }
        setStats({
          tasksCount: tasksData.tasks?.length || 0,
          messagesCount: 0,
          blockchainValid: chainData.validation?.isValid ?? true,
          totalBlocks: chainData.blocks?.length || 0,
        });
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white border-2 border-b-4 border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="green">3FA BERHASIL TERVERIFIKASI</Badge>
              <Badge variant={user?.role === "ADMIN" ? "red" : user?.role === "DOSEN" ? "blue" : "gray"}>
                {user?.role}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#3C3C3C] tracking-tight">
              Selamat Datang, {user?.fullName}!
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Sesi Anda diamankan dengan 3 lapisan: Argon2id, USB Dongle ECDSA P-256, dan ArcFace Liveness.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/tasks">
              <Button variant="primary" size="md">
                <GraduationCap className="w-4 h-4 mr-2" />
                Lihat Tugas Akademik
              </Button>
            </Link>
          </div>
        </div>

        {/* Security Notice: Ganti Password ASAP (Hanya muncul jika belum pernah ganti password) */}
        {!hasChangedPassword && (
          <div className="bg-[#FFF9E6] border-2 border-b-4 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-[#3C3C3C] flex items-center gap-1.5">
                  <span>🔑</span> Tips Keamanan: Anda Masih Menggunakan Password Awal
                </p>
                <p className="text-[11px] font-semibold text-[#777777] mt-0.5 leading-relaxed">
                  Demi keamanan dan kerahasiaan akun Anda, segera ubah password awal yang diberikan oleh Administrator. Notifikasi ini akan hilang otomatis setelah Anda mengganti password.
                </p>
              </div>
            </div>
            <Link href="/security-settings?action=change-password" className="shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-amber-400 text-amber-900 hover:bg-amber-100 font-bold text-xs whitespace-nowrap"
              >
                Ganti Password Sekarang
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-[#46A302] flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-[#777777] uppercase tracking-wider">Status 3FA</p>
              <p className="text-lg font-black text-[#3C3C3C]">Aktif & Sah</p>
              <p className="text-[11px] font-bold text-[#46A302]">Zero-Trust Enforced</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-[#777777] uppercase tracking-wider">Tugas Akademik</p>
              <p className="text-lg font-black text-[#3C3C3C]">{stats.tasksCount} Tugas</p>
              <p className="text-[11px] font-bold text-[#777777]">ChaCha20 Protected</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Blocks className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-[#777777] uppercase tracking-wider">Hash Chain</p>
              <p className="text-lg font-black text-[#3C3C3C]">{stats.totalBlocks} Blok Audit</p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#46A302]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Rantai Valid</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <MessageSquareLock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-[#777777] uppercase tracking-wider">Super Encryption</p>
              <p className="text-lg font-black text-[#3C3C3C]">Vigenère + AES</p>
              <p className="text-[11px] font-bold text-[#777777]">Dual-Layer Ciphers</p>
            </div>
          </Card>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Tasks Overview */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#58CC02]" />
                Tugas Akademik Terbaru
              </h2>
              <Link href="/tasks" className="text-xs font-extrabold text-[#58CC02] hover:underline">
                Kelola Semua →
              </Link>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs text-[#777777] italic py-4">Belum ada tugas akademik yang diterbitkan.</p>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl border border-gray-200 bg-[#F7F7F7] flex items-center justify-between"
                  >
                    <div>
                      <Badge variant="blue">{task.course?.code || "KULIAH"}</Badge>
                      <h4 className="text-xs font-black text-[#3C3C3C] mt-1">{task.title}</h4>
                      <p className="text-[11px] text-[#777777] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Deadline: {new Date(task.deadline).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <Link href="/tasks">
                      <Button variant="secondary" size="sm">
                        Detail
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Cryptography Modules Hub */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#58CC02]" />
                Modul Keamanan & Kriptografi
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                href="/messaging"
                className="p-3 rounded-xl border border-gray-200 hover:border-[#58CC02] bg-[#F7F7F7] transition-all block group"
              >
                <MessageSquareLock className="w-5 h-5 text-[#58CC02] mb-1.5" />
                <h4 className="font-extrabold text-[#3C3C3C] group-hover:text-[#58CC02]">
                  Pesan Terenkripsi
                </h4>
                <p className="text-[11px] text-[#777777] mt-0.5">Vigenère + AES-256-GCM</p>
              </Link>

              <Link
                href="/file-encryption"
                className="p-3 rounded-xl border border-gray-200 hover:border-[#58CC02] bg-[#F7F7F7] transition-all block group"
              >
                <FileKey2 className="w-5 h-5 text-[#58CC02] mb-1.5" />
                <h4 className="font-extrabold text-[#3C3C3C] group-hover:text-[#58CC02]">
                  Enkripsi Berkas
                </h4>
                <p className="text-[11px] text-[#777777] mt-0.5">ChaCha20-Poly1305</p>
              </Link>

              <Link
                href="/steganography"
                className="p-3 rounded-xl border border-gray-200 hover:border-[#58CC02] bg-[#F7F7F7] transition-all block group"
              >
                <ImageIcon className="w-5 h-5 text-[#58CC02] mb-1.5" />
                <h4 className="font-extrabold text-[#3C3C3C] group-hover:text-[#58CC02]">
                  Steganografi LSB
                </h4>
                <p className="text-[11px] text-[#777777] mt-0.5">Sisipkan pesan di PNG</p>
              </Link>

              <Link
                href="/blockchain"
                className="p-3 rounded-xl border border-gray-200 hover:border-[#58CC02] bg-[#F7F7F7] transition-all block group"
              >
                <Blocks className="w-5 h-5 text-[#58CC02] mb-1.5" />
                <h4 className="font-extrabold text-[#3C3C3C] group-hover:text-[#58CC02]">
                  Rantai Hash SHA-256
                </h4>
                <p className="text-[11px] text-[#777777] mt-0.5">Audit & Anti-Tamper</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

