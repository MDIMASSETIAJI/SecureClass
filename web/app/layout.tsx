import type { Metadata } from "next";
import "./globals.css";
import { DongleGuard } from "@/components/layout/DongleGuard";

export const metadata: Metadata = {
  title: "SecureClass — Platform Akademik Berkeamanan Berlapis",
  description: "Platform pengelolaan tugas akademik dengan Biometrik Wajah AI, USB Dongle ECDSA, Super Encryption, ChaCha20-Poly1305, Steganografi LSB, dan Tamper-Evident Hash Chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#F7F7F7] text-[#3C3C3C] antialiased min-h-screen selection:bg-[#D7FFB8]">
        {/* Hardware USB Dongle System Lock Guard */}
        <DongleGuard />
        {children}
      </body>
    </html>
  );
}

