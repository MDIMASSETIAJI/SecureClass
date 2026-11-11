"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Usb,
  ScanFace,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("MAHASISWA");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUsers(data.users || []);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          fullName,
          role,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pengguna baru.");

      setShowCreateModal(false);
      setUsername("");
      setEmail("");
      setFullName("");
      setPassword("");
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <AppLayout allowedRoles={["ADMIN"]}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
              Manajemen Pengguna & Kredensial 3FA
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Kelola akun Dosen, Mahasiswa, dan Administrator beserta status kepemilikan faktor autentikasi.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Pengguna Baru
          </Button>
        </div>

        {/* User Table Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#58CC02]" />
              Daftar Pengguna Terdaftar ({users.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-gray-200 text-[#777777] uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Password Hash</th>
                  <th className="py-3 px-4">USB Dongle</th>
                  <th className="py-3 px-4">Biometrik Wajah</th>
                  <th className="py-3 px-4">Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <p className="font-black text-[#3C3C3C]">{u.fullName}</p>
                      <p className="text-[#777777] font-mono text-[11px]">@{u.username} • {u.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.role === "ADMIN" ? "red" : u.role === "DOSEN" ? "blue" : "green"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-[#46A302] font-bold">
                        Argon2id (PHC)
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.hasActiveDongle ? (
                        <span className="flex items-center gap-1.5 text-[#46A302] font-black text-[11px]">
                          <CheckCircle2 className="w-4 h-4" />
                          ECDSA P-256
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[#777777] text-[11px]">
                          <XCircle className="w-4 h-4 text-gray-300" />
                          Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.hasFaceEnrolled ? (
                        <span className="flex items-center gap-1.5 text-[#46A302] font-black text-[11px]">
                          <CheckCircle2 className="w-4 h-4" />
                          AES-256-GCM
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[#777777] text-[11px]">
                          <XCircle className="w-4 h-4 text-gray-300" />
                          Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#777777]">
                      {new Date(u.createdAt).toLocaleDateString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>

    {/* MODAL: Create User */}
    {showCreateModal && (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <h2 className="text-lg font-black text-[#3C3C3C] mb-4">
                Tambah Pengguna Baru
              </h2>

              {createError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block uppercase text-[#777777] mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="misal: Siti Nurhaliza, M.Cs."
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block uppercase text-[#777777] mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="siti_nur"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-[#777777] mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="siti@secureclass.ac.id"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">Peran (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  >
                    <option value="MAHASISWA">MAHASISWA</option>
                    <option value="DOSEN">DOSEN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-[#777777] mb-1">
                    Password Awal (Min. 8 karakter, simbol, huruf besar/kecil, angka)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PasswordAman123!"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-[#3C3C3C] focus:border-[#58CC02] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={creating}>
                    Buat Pengguna
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </>
    );
  }

