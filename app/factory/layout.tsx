import { StaffShell } from "@/components/StaffShell";

const LINKS = [
  { href: "/factory", label: "Hôm nay" },
  { href: "/factory/overview", label: "Tổng quan tháng" },
];

export default function FactoryLayout({ children }: LayoutProps<"/factory">) {
  return <StaffShell links={LINKS}>{children}</StaffShell>;
}
