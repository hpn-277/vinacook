"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const activeHref = links
    .map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  return links.map((l) => {
    const active = l.href === activeHref;
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`whitespace-nowrap rounded px-3 py-2 font-medium hover:bg-orange-50 ${active ? "bg-orange-100 text-orange-900" : ""}`}
      >
        {l.label}
      </Link>
    );
  });
}
