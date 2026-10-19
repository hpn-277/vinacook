import { StaffShell } from "@/components/StaffShell";

const LINKS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/commission", label: "Hoa hồng" },
  { href: "/admin/drivers", label: "Tài xế" },
  { href: "/admin/factories", label: "Xưởng" },
  { href: "/admin/staff", label: "Nhân viên" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/sale/orders/new", label: "Tạo đơn" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <StaffShell links={LINKS}>{children}</StaffShell>;
}
