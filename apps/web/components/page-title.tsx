import type { ReactNode } from "react";

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-xl font-bold tracking-tight">{children}</h1>;
}
