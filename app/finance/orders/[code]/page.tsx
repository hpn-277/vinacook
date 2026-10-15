import { OrderDetail } from "@/components/OrderDetail";
import { requireRole } from "@/lib/auth";

export default async function FinanceOrderDetailPage({ params }: PageProps<"/finance/orders/[code]">) {
  const me = await requireRole("cashier", "accountant");
  return <OrderDetail code={(await params).code} viewer={{ role: me.role }} />;
}
