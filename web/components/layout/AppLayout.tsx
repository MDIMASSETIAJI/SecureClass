"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { DongleGuard } from "./DongleGuard";
import { useRouter } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, allowedRoles }) => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || !data.session?.isFullyAuthenticated) {
          router.replace("/login");
          return;
        }

        if (allowedRoles && !allowedRoles.includes(data.user.role)) {
          alert(`Akses ditolak: Halaman ini memerlukan peran ${allowedRoles.join(", ")}`);
          router.replace("/dashboard");
          return;
        }

        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-extrabold text-[#777777] uppercase tracking-wider">
            Memverifikasi Kredensial 3FA...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <Navbar user={user} />
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar role={user?.role} />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

