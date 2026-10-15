import { OrderDetail } from "@/components/OrderDetail";
import { requireRole } from "@/lib/auth";

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[code]">) {
  await requireRole("manager");
  return <OrderDetail code={(await params).code} viewer={{ role: "manager" }} />;
}
