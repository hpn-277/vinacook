import { StaffShell } from "@/components/StaffShell";

const LINKS = [
  { href: "/sale", label: "Đơn hàng" },
  { href: "/sale/month", label: "Tổng quan tháng" },
  { href: "/sale/orders/new", label: "Tạo đơn" },
  { href: "/sale/customers", label: "Khách hàng" },
];

export default function SaleLayout({ children }: LayoutProps<"/sale">) {
  return <StaffShell links={LINKS}>{children}</StaffShell>;
}
