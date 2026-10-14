import { StaffShell } from "@/components/StaffShell";

const LINKS = [
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/receiving", label: "Nhận hàng" },
  { href: "/admin/dispatch", label: "Điều phối" },
  { href: "/admin/commission", label: "Hoa hồng" },
  { href: "/admin/settings", label: "Cài đặt" },
  { href: "/sale/orders/new", label: "Tạo đơn" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <StaffShell links={LINKS}>{children}</StaffShell>;
}
