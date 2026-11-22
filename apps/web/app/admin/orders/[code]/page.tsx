import { OrderDetail } from "@/components/OrderDetail";
import { requireRole } from "@/lib/auth";

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[code]">) {
  const me = await requireRole("admin", "manager");
  return <OrderDetail code={(await params).code} viewer={{ role: me.role }} />;
}
