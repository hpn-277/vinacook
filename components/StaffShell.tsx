import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { currentStaff } from "@/lib/auth";

export async function StaffShell({ links, children }: { links: { href: string; label: string }[]; children: ReactNode }) {
  const staff = await currentStaff();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded px-2 py-1 font-medium hover:bg-orange-50">
              {l.label}
            </Link>
          ))}
          <span className="ml-auto whitespace-nowrap text-gray-500">{staff?.name}</span>
          <form action={logout}>
            <button className="whitespace-nowrap text-gray-500 underline">Đăng xuất</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
