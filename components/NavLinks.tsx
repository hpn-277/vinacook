"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const activeHref = links
    .map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  return links.map((l) => {
    const active = l.href === activeHref;
    return (
      <Button
        key={l.href}
        asChild
        variant="ghost"
        size="lg"
        className={cn("md:justify-start", active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
      >
        <Link href={l.href} aria-current={active ? "page" : undefined}>
          {l.label}
        </Link>
      </Button>
    );
  });
}
