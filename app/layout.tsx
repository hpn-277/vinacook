import type { Metadata, Viewport } from "next";
import "./globals.css";

// Every page reads live stock, orders or session state; nothing is safe to prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mì Tươi - Đặt hàng",
  description: "Đặt mì, bún, phở tươi giao tận nơi",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
