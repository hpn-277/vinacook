import Link from "next/link";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
          <Link href="/" className="text-lg font-bold text-orange-700">
            Mì Tươi
          </Link>
          <Link href="/checkout" className="ml-auto font-medium">
            Giỏ hàng
          </Link>
          <Link href="/orders" className="font-medium">
            Tra cứu đơn
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
