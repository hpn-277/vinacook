import { StaffShell } from "@/components/StaffShell";

const LINKS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/dispatch", label: "Điều phối" },
  { href: "/admin/commission", label: "Hoa hồng" },
  { href: "/admin/settings", label: "Cài đặt" },
  { href: "/sale/orders/new", label: "Tạo đơn" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <StaffShell links={LINKS}>{children}</StaffShell>;
}
