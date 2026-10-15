import { OrderDetail } from "@/components/OrderDetail";
import { requireRole } from "@/lib/auth";

export default async function SaleOrderDetailPage({ params }: PageProps<"/sale/orders/[code]">) {
  const me = await requireRole("sale");
  return <OrderDetail code={(await params).code} viewer={{ role: "sale", saleId: me.id }} />;
}
