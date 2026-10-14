import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { NavLinks } from "@/components/NavLinks";
import { currentStaff } from "@/lib/auth";

export async function StaffShell({ links, children }: { links: { href: string; label: string }[]; children: ReactNode }) {
  const staff = await currentStaff();
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-10 border-b border-gray-200 bg-white md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center gap-x-1 overflow-x-auto px-3 py-2 text-sm md:h-full md:flex-col md:items-stretch md:gap-y-1 md:overflow-visible md:py-4">
          <NavLinks links={links} />
          <div className="ml-auto flex items-center gap-3 pl-2 md:ml-0 md:mt-auto md:flex-col md:items-start md:gap-1 md:border-t md:border-gray-200 md:px-3 md:pl-3 md:pt-3">
            <span className="whitespace-nowrap text-gray-500">{staff?.name}</span>
            <form action={logout}>
              <button className="whitespace-nowrap text-gray-500 underline">Đăng xuất</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
