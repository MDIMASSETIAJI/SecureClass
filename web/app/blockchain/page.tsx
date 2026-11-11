"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Blocks,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Wrench,
  Clock,
  Hash,
  Link as LinkIcon,
} from "lucide-react";

export default function BlockchainPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [userRole, setUserRole] = useState("MAHASISWA");

  useEffect(() => {
    loadChain();
  }, []);

  const loadChain = () => {
    setValidating(true);
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/blockchain/status").then((r) => r.json()),
    ])
      .then(([authData, statusData]) => {
        if (authData.authenticated) {
          setUserRole(authData.user.role);
        }
        if (statusData.success) {
          setBlocks(statusData.blocks || []);
          setValidation(statusData.validation);
        }
        setLoading(false);
        setValidating(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
        setValidating(false);
      });
  };

  const handleSimulateTamper = async (index: number) => {
    if (!confirm(`Simulasikan perubahan data ilegal pada blok #${index}? Ini akan merusak rantai hash untuk mendemonstrasikan tamper-evidence.`)) {
      return;
    }

    try {
      const res = await fetch("/api/blockchain/simulate-tamper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockIndex: index,
          fakeDataJson: JSON.stringify({
            action: "TAMPERED_ILLEGAL_PAYLOAD",
            attacker: "Simulasi Injeksi Penyerang Siber",
            tamperedAt: new Date().toISOString(),
            forgedGrade: 100,
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melakukan manipulasi.");

      alert(data.message);
      loadChain();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRepairChain = async () => {
    try {
      const res = await fetch("/api/blockchain/repair", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbaiki rantai.");

      alert(data.message);
      loadChain();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#3C3C3C] tracking-tight">
              Tamper-Evident Hash Chain (SHA-256)
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#777777] mt-1">
              Pencatatan aktivitas bernilai tinggi secara berantai untuk menjamin integritas audit dan pendeteksian anomali data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={loadChain}
              isLoading={validating}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Validasi Rantai Hash
            </Button>

            {userRole === "ADMIN" && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleRepairChain}
                title="Hitung ulang hash secara sah untuk memulihkan status rantai"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Pulihkan Rantai
              </Button>
            )}
          </div>
        </div>

        {/* Security Architecture Clarification Notice */}
        <div className="p-4 rounded-2xl bg-white border-2 border-gray-200 text-xs text-[#777777] space-y-2">
          <p className="font-black text-[#3C3C3C]">
            Prinsip Tamper-Evident Hash Chain vs Blockchain Terdesentralisasi:
          </p>
          <p className="leading-relaxed">
            Sistem ini menggunakan struktur <strong>tamper-evident hash chain</strong> berbasis fungsi hash kriptografi SHA-256 (bukan blockchain terdesentralisasi berbasis Proof-of-Work/Proof-of-Stake antar simpul terdistribusi). Setiap blok mengikat secara matematis blok sebelumnya melalui formula: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[#3C3C3C]">SHA-256(index + timestamp + previousHash + dataJson)</code>.
          </p>
          <p className="italic text-[11px] text-gray-500">
            * Keterbatasan Keamanan: Hash chain di dalam satu database SQLite dapat ditulis ulang oleh pengguna dengan hak istimewa tingkat tinggi (misal: DBA atau root OS). Oleh karena itu, hash chain memberikan pendeteksian tamper (*tamper-evidence*), bukan imutabilitas absolut tanpa batas.
          </p>
        </div>

        {/* Validation Status Banner */}
        {validation && (
          <div
            className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${
              validation.isValid
                ? "bg-[#D7FFB8] border-[#58CC02] text-[#46A302]"
                : "bg-red-50 border-red-300 text-red-700"
            }`}
          >
            {validation.isValid ? (
              <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-[#46A302]" />
            ) : (
              <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-600" />
            )}

            <div className="space-y-1">
              <h3 className="text-base font-black">
                {validation.isValid
                  ? `Seluruh Rantai Hash Valid (${validation.totalBlocks} Blok)`
                  : `Integritas Terputus! Terdeteksi Modifikasi Data Ilegal pada Blok #${validation.tamperedBlockIndex}`}
              </h3>
              <p className="text-xs font-semibold">
                {validation.isValid
                  ? "Semua tautan hash SHA-256 dari blok Genesis hingga puncak rantai sinkron dan tidak ada rekaman yang dimanipulasi."
                  : validation.reason}
              </p>

              {validation.details && (
                <div className="mt-2 p-2.5 rounded-lg bg-white/80 font-mono text-[11px] space-y-1 border border-red-200">
                  {validation.details.expectedHash && (
                    <p className="break-all">
                      <strong>Expected Hash (Rekalkulasi):</strong> {validation.details.expectedHash}
                    </p>
                  )}
                  {validation.details.actualHash && (
                    <p className="break-all">
                      <strong>Stored Hash (Di Database):</strong> {validation.details.actualHash}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Adversary Simulator (for Evaluation) */}
        {userRole === "ADMIN" && (
          <Card className="bg-yellow-50 border-2 border-yellow-200 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-yellow-700 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-[#3C3C3C] uppercase tracking-wider">
                    Simulator Serangan Manipulasi Siber (Adversary Tamper Testing)
                  </h4>
                  <p className="text-xs text-[#777777] font-semibold mt-0.5">
                    Uji ketahanan tamper-evidence dengan menyuntikkan muatan palsu ke salah satu blok untuk membuktikan bahwa manipulasi 1 karakter sekalipun terdeteksi seketika.
                  </p>
                </div>
              </div>

              {blocks.length > 1 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleSimulateTamper(1)}
                  className="whitespace-nowrap"
                >
                  Simulasikan Modifikasi Blok #1
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Blocks Visual Chain */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-[#3C3C3C] flex items-center gap-2">
            <Blocks className="w-5 h-5 text-[#58CC02]" />
            Daftar Blok Audit Rantai Hash
          </h2>

          <div className="space-y-4">
            {blocks.map((block, idx) => {
              const isTampered =
                validation &&
                !validation.isValid &&
                validation.tamperedBlockIndex === block.index;

              return (
                <Card
                  key={block.id}
                  className={`p-5 transition-all ${
                    isTampered
                      ? "border-4 border-red-500 bg-red-50/50 shadow-md"
                      : "hover:border-gray-300"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={block.index === 0 ? "green" : isTampered ? "red" : "blue"}>
                          {block.index === 0 ? "GENESIS BLOCK" : `BLOK #${block.index}`}
                        </Badge>
                        <Badge variant="gray">{block.action}</Badge>
                        {isTampered && <Badge variant="red">TAMPERED / CORRUPTED</Badge>}
                      </div>

                      <div className="font-mono text-[11px] space-y-1 pt-1">
                        <p className="text-[#777777] break-all">
                          <strong className="font-sans text-[#3C3C3C]">Prev Hash:</strong>{" "}
                          <span className="text-gray-500">{block.previousHash}</span>
                        </p>
                        <p className="text-[#3C3C3C] break-all font-bold">
                          <strong className="font-sans text-[#3C3C3C]">Curr Hash:</strong>{" "}
                          <span className={isTampered ? "text-red-600" : "text-[#46A302]"}>
                            {block.currentHash}
                          </span>
                        </p>
                      </div>

                      {/* Payload preview */}
                      <div className="bg-[#F7F7F7] p-3 rounded-xl border border-gray-200 mt-2">
                        <p className="text-[10px] font-black uppercase text-[#777777] mb-1">
                          Data Payload (Canonical JSON):
                        </p>
                        <pre className="text-[11px] font-mono text-[#3C3C3C] whitespace-pre-wrap break-all">
                          {block.dataJson}
                        </pre>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#777777] pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Waktu Blok: {new Date(block.timestamp).toLocaleString("id-ID")}</span>
                        {block.user && (
                          <span>• Aktor: {block.user.fullName} (@{block.user.username})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

