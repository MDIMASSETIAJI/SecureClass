"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Activity,
  ShieldAlert,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = () => {
    setLoading(true);
    fetch("/api/audit/logs")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.logs || []);
          setAttempts(data.loginAttempts || []);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  return (
    <AppLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
              Audit Log Forensik & Monitoring Percobaan Login
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Pencatatan aktivitas sistem, pemanggilan kriptografi, dan deteksi proteksi brute-force login.
            </p>
          </div>

          <Button variant="primary" size="md" onClick={loadAudit} isLoading={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Muat Ulang Log
          </Button>
        </div>

        {/* Login Attempts Tracker */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Monitoring Percobaan Autentikasi (Proteksi Brute-Force)
            </h2>
            <Badge variant="gray">{attempts.length} Percobaan Terakhir</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-gray-200 text-[#777777] uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Target Akun</th>
                  <th className="py-2.5 px-3">Faktor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Alasan Gagal / Catatan</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.slice(0, 15).map((att) => (
                  <tr key={att.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#3C3C3C]">
                      {att.usernameOrEmail}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="gray">{att.factor}</Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      {att.success ? (
                        <span className="flex items-center gap-1 text-[#46A302] font-black">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Sukses
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-black">
                          <XCircle className="w-3.5 h-3.5" />
                          Gagal
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#777777]">
                      {att.failureReason || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-500 text-[11px]">
                      {att.ipAddress}
                    </td>
                    <td className="py-2.5 px-3 text-[#777777]">
                      {new Date(att.timestamp).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* System Audit Log */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#58CC02]" />
              Catatan Aktivitas Sistem (Audit Trail)
            </h2>
            <Badge variant="green">{logs.length} Entri</Badge>
          </div>

          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-gray-200 bg-[#F7F7F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.category === "AUTH" ? "green" : log.category === "CRYPTO" ? "blue" : "gray"}>
                      {log.category}
                    </Badge>
                    <span className="font-mono font-bold text-[#3C3C3C]">{log.action}</span>
                  </div>
                  <p className="text-[11px] text-[#777777] font-mono break-all">
                    {log.details}
                  </p>
                </div>

                <div className="text-right text-[11px] text-[#777777] flex-shrink-0">
                  <p>{new Date(log.timestamp).toLocaleString("id-ID")}</p>
                  {log.user && <p className="font-bold text-[#3C3C3C]">Aktor: {log.user.fullName}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

