"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  MessageSquareLock,
  FileKey2,
  Image as ImageIcon,
  Blocks,
  ShieldCheck,
  Users,
  Activity,
} from "lucide-react";

interface SidebarProps {
  role?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role = "MAHASISWA" }) => {
  const pathname = usePathname();

  const links = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    {
      title: "Tugas Akademik",
      href: "/tasks",
      icon: GraduationCap,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    {
      title: "Pesan Terenkripsi (Super)",
      href: "/messaging",
      icon: MessageSquareLock,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    {
      title: "Enkripsi Berkas (ChaCha20)",
      href: "/file-encryption",
      icon: FileKey2,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    {
      title: "Steganografi LSB",
      href: "/steganography",
      icon: ImageIcon,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    {
      title: "Blockchain (Hash Chain)",
      href: "/blockchain",
      icon: Blocks,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    {
      title: "Pengaturan Keamanan & 3FA",
      href: "/security-settings",
      icon: ShieldCheck,
      roles: ["ADMIN", "DOSEN", "MAHASISWA"],
    },
    // Admin specific links
    {
      title: "Manajemen Pengguna",
      href: "/admin/users",
      icon: Users,
      roles: ["ADMIN"],
    },
    {
      title: "Audit Log & Forensik",
      href: "/admin/audit",
      icon: Activity,
      roles: ["ADMIN"],
    },
  ];

  const allowedLinks = links.filter((l) => l.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r-2 border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-black uppercase text-[#777777] tracking-wider">
          Navigasi Utama
        </div>
        {allowedLinks.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-sm transition-all duration-75 select-none ${
                isActive
                  ? "bg-[#D7FFB8] text-[#46A302] border-2 border-[#58CC02] border-b-4 shadow-sm"
                  : "text-[#3C3C3C] hover:bg-[#F7F7F7] active:translate-y-0.5"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-[#46A302] stroke-[2.5]" : "text-[#777777]"
                }`}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Security Info Card at bottom of sidebar */}
      <div className="bg-[#F7F7F7] border border-gray-200 rounded-xl p-3 text-center">
        <p className="text-[11px] font-extrabold text-[#3C3C3C]">SECURECLASS 3FA</p>
        <p className="text-[10px] text-[#777777] mt-0.5">
          Argon2id • ECDSA P-256 • ArcFace
        </p>
      </div>
    </aside>
  );
};

