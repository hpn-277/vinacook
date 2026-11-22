import type { ReactNode } from "react";
import { StaffShell } from "@/components/StaffShell";
import { currentStaff } from "@/lib/auth";

const MANAGER_LINKS = [
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/staff", label: "Nhân viên" },
];

const ADMIN_LINKS = [
  ...MANAGER_LINKS,
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/finance", label: "Công nợ" },
  { href: "/finance/payments", label: "Lịch sử thu" },
];

/** Shell for /admin and /finance. The manager sees only the read-only pages. */
export async function AdminShell({ children }: { children: ReactNode }) {
  const staff = await currentStaff();
  return <StaffShell links={staff?.role === "admin" ? ADMIN_LINKS : MANAGER_LINKS}>{children}</StaffShell>;
}
