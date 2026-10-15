import { moveOrder, setPaid } from "@/app/admin/orders/actions";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import type { PriceTier } from "@/lib/domain/pricing";
import { cn } from "@/lib/utils";
import { MANAGER_ORDER_MOVES, MOVE_LABEL, type OrderStatus } from "@/lib/domain/status";

export type AdminOrder = {
  id: number;
  code: string;
  status: OrderStatus;
  payment_status: "paid" | "unpaid";
  total: number;
  price_tier: PriceTier;
  phone: string;
  address: string;
  district: string;
  note: string | null;
  fail_reason: string | null;
  departed_at: string | null;
  production_date: string;
  created_at: string;
  customers: { name: string } | null;
  sale: { name: string } | null;
  driver: { id: number; name: string } | null;
  order_items: {
    id: number;
    pack_name: string;
    pack_qty: number;
    qty_kg: number;
    price_per_kg: number;
    line_total: number;
    products: { name: string } | null;
  }[];
};

export const ADMIN_ORDER_SELECT =
  "id, code, status, payment_status, total, price_tier, phone, address, district, note, fail_reason, departed_at, production_date, created_at, customers(name), sale:staff!orders_sale_id_fkey(name), driver:staff!orders_driver_id_fkey(id, name), order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, line_total, products(name))";

const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

/** "Đã rời kho · HH:mm" while the driver is on the road. */
export function Departed({ order, className }: { order: AdminOrder; className?: string }) {
  if (order.status !== "out_for_delivery" || !order.departed_at) return null;
  return <span className={cn("text-blue-800", className)}>Đã rời kho · {clock.format(new Date(order.departed_at))}</span>;
}

export function OrderActions({ order, size, withPaid = true }: { order: AdminOrder; size?: "sm"; withPaid?: boolean }) {
  const moves = MANAGER_ORDER_MOVES[order.status] ?? [];
  return (
    <>
      {moves.map((to) => (
        <ActionForm key={to} action={moveOrder} confirm={to === "cancelled" ? `Hủy đơn ${order.code}?` : undefined}>
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="to" value={to} />
          <Button size={size} variant={to === "cancelled" ? "destructive" : "default"}>
            {MOVE_LABEL[to]}
          </Button>
        </ActionForm>
      ))}
      {withPaid && <PaidToggle order={order} size={size} />}
    </>
  );
}

export function PaidToggle({ order, size }: { order: AdminOrder; size?: "sm" }) {
  if (order.status === "cancelled") return null;
  return (
    <ActionForm action={setPaid}>
      <input type="hidden" name="order_id" value={order.id} />
      <input type="hidden" name="paid" value={order.payment_status === "paid" ? "unpaid" : "paid"} />
      <Button size={size} variant="outline">
        {order.payment_status === "paid" ? "Bỏ đánh dấu đã trả" : "Đánh dấu đã trả"}
      </Button>
    </ActionForm>
  );
}

/** One-click pill for tables: shows the payment state and toggles it. */
export function PaidPill({ order }: { order: AdminOrder }) {
  const paid = order.payment_status === "paid";
  if (order.status === "cancelled") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <ActionForm action={setPaid}>
      <input type="hidden" name="order_id" value={order.id} />
      <input type="hidden" name="paid" value={paid ? "unpaid" : "paid"} />
      <Button
        size="xs"
        variant="outline"
        aria-label={paid ? "Bỏ đánh dấu đã trả" : "Đánh dấu đã trả"}
        title={paid ? "Bấm để bỏ đánh dấu đã trả" : "Bấm để đánh dấu đã trả"}
        className={paid ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800" : "text-muted-foreground"}
      >
        {paid ? "✓ Đã trả" : "Chưa trả"}
      </Button>
    </ActionForm>
  );
}

export function PaymentLabel({ order }: { order: AdminOrder }) {
  return (
    <span className={order.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}>
      {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
    </span>
  );
}
