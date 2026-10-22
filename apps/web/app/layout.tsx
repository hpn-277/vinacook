import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

// Every page reads live stock, orders or session state; nothing is safe to prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VinaCook - Đặt hàng",
  description: "Đặt mì, bún, phở tươi giao tận nơi",
  appleWebApp: { title: "VinaCook", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f54a00" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
