import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
          <Link href="/" className="mr-auto text-lg font-bold text-primary">
            Mì Tươi
          </Link>
          <Button asChild variant="ghost">
            <Link href="/checkout">Giỏ hàng</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/orders">Tra cứu đơn</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
