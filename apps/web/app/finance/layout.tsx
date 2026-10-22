import { StaffShell } from "@/components/StaffShell";

const LINKS = [
  { href: "/finance", label: "Công nợ" },
  { href: "/finance/payments", label: "Lịch sử thu" },
];

export default function FinanceLayout({ children }: LayoutProps<"/finance">) {
  return <StaffShell links={LINKS}>{children}</StaffShell>;
}
