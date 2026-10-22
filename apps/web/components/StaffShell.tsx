import type { ReactNode } from "react";
import { ActionForm } from "@/components/ActionForm";
import { NavLinks } from "@/components/NavLinks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { currentStaff } from "@/lib/auth";

export async function StaffShell({ links, children }: { links: { href: string; label: string }[]; children: ReactNode }) {
  const staff = await currentStaff();
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-10 border-b bg-card md:static md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <nav className="flex items-center gap-1 overflow-x-auto px-2 py-2 md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:overflow-visible md:px-3 md:py-4">
          <div className="hidden px-2.5 pb-3 text-lg font-bold text-primary md:block">VinaCook</div>
          <NavLinks links={links} />
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-2 md:mt-auto md:ml-0 md:flex-col md:items-stretch md:pl-0">
            <Separator className="mb-2 hidden md:block" />
            <span className="hidden px-2.5 text-sm whitespace-nowrap text-muted-foreground sm:inline md:block">{staff?.name}</span>
            <ActionForm action="logout">
              <Button variant="ghost" size="lg" className="text-muted-foreground md:w-full md:justify-start">
                Đăng xuất
              </Button>
            </ActionForm>
          </div>
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-5xl min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
