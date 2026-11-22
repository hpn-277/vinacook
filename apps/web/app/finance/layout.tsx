import { AdminShell } from "@/components/AdminShell";

export default function FinanceLayout({ children }: LayoutProps<"/finance">) {
  return <AdminShell>{children}</AdminShell>;
}
