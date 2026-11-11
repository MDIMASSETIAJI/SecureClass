"use client";

import React from "react";
import Link from "next/link";
import { Shield, Lock, CheckCircle2, LogOut, User, UserPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface NavbarProps {
  user?: {
    username: string;
    fullName: string;
    role: string;
  } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  return (
    <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#58CC02] border-b-4 border-[#46A302] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
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
        </Link>

        {/* User & Security Status */}
        {user ? (
          <div className="flex items-center gap-4">
            {/* 3FA Security Streak */}
            <div className="hidden md:flex items-center gap-2 bg-[#F7F7F7] border border-gray-200 rounded-xl px-3 py-1.5">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#58CC02] animate-pulse"></span>
                <span className="text-xs font-black text-[#3C3C3C]">3/3 FAKTOR AKTIF</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-[11px] font-bold text-[#777777]">Password + Dongle + ArcFace</span>
            </div>

            {/* Role & Username */}
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-xs font-black text-[#3C3C3C] leading-tight">{user.fullName}</p>
                <div className="flex justify-end mt-0.5">
                  <Badge variant={user.role === "ADMIN" ? "red" : user.role === "DOSEN" ? "blue" : "green"}>
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="text-[#777777] hover:text-red-600 hover:border-red-300"
              title="Keluar dari sesi"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Keluar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link href="/login">
              <Button variant="primary" size="sm">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Masuk (Login)
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

