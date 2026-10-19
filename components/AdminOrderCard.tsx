import Link from "next/link";
import { setPayment } from "@/app/finance/actions";
import { moveOrder } from "@/app/admin/orders/actions";
import { ActionForm } from "@/components/ActionForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PriceTier } from "@/lib/domain/pricing";
import { cn } from "@/lib/utils";
import { MANAGER_ORDER_MOVES, moveLabel, type OrderStatus } from "@/lib/domain/status";

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
  return_reason: string | null;
  returner: { name: string } | null;
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
  "id, code, status, payment_status, total, price_tier, phone, address, district, note, fail_reason, return_reason, returner:staff!orders_returned_by_fkey(name), departed_at, production_date, created_at, customers(name), sale:staff!orders_sale_id_fkey(name), driver:staff!orders_driver_id_fkey(id, name), order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, line_total, products(name))";

const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

/** "Đã rời kho · HH:mm" while the driver is on the road. */
export function Departed({ order, className }: { order: AdminOrder; className?: string }) {
  if (order.status !== "out_for_delivery" || !order.departed_at) return null;
  return <span className={cn("text-blue-800", className)}>Đã rời kho · {clock.format(new Date(order.departed_at))}</span>;
}

export function OrderActions({ order, size }: { order: AdminOrder; size?: "sm" }) {
  return (MANAGER_ORDER_MOVES[order.status] ?? []).map((to) => (
    <ActionForm key={to} action={moveOrder} confirm={to === "cancelled" ? `Hủy đơn ${order.code}?` : undefined}>
      <input type="hidden" name="order_id" value={order.id} />
      <input type="hidden" name="to" value={to} />
      <Button size={size} variant={to === "cancelled" ? "destructive" : order.status === "assigned" ? "outline" : "default"}>
        {moveLabel(order.status, to)}
      </Button>
    </ActionForm>
  ));
}

/** "Tài xế X trả: lý do" until the order is assigned again. */
export function Returned({ order, className }: { order: AdminOrder; className?: string }) {
  if (order.status !== "ready" || !order.return_reason) return null;
  return (
    <div className={cn("text-amber-700", className)}>
      {order.returner?.name ?? "Tài xế"} trả: {order.return_reason}
    </div>
  );
}

/** Payment state for tables. Read-only: only the cashier settles debt, from /finance. */
/** Unpaid: one click marks it paid (logged). Paid: links to the order, where undo asks for a reason. */
export function PaidPill({ order }: { order: AdminOrder }) {
  if (order.status === "cancelled") return <span className="text-xs text-muted-foreground">—</span>;
  if (order.payment_status === "paid")
    return (
      <Badge asChild variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100">
        <Link href={`/admin/orders/${order.code}#thanh-toan`} title="Mở đơn để bỏ đánh dấu (cần lý do)">
          ✓ Đã trả
        </Link>
      </Badge>
    );
  return (
    <ActionForm action={setPayment}>
      <input type="hidden" name="order_id" value={order.id} />
      <input type="hidden" name="paid" value="paid" />
      <Button size="xs" variant="outline" aria-label="Đánh dấu đã trả" title="Bấm để đánh dấu đã trả" className="text-muted-foreground">
        Chưa trả
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
