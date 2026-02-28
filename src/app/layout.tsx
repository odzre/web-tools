import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/siteSettings";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: settings.siteTitle || "MyCash - Payment Gateway",
    description: "Platform payment gateway QRIS terintegrasi GoBiz. Terima pembayaran QRIS otomatis dengan API yang mudah digunakan.",
    keywords: ["payment gateway", "QRIS", "GoBiz", "GoPay", "merchant", "pembayaran online"],
    icons: settings.favicon ? { icon: settings.favicon } : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
