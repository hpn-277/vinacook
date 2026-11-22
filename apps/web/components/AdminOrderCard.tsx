import { ActionForm } from "@/components/ActionForm";
import type { Country } from "@noodle/core/domain/destination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MANAGER_ORDER_MOVES, moveLabel, type OrderStatus, type ReviewStatus } from "@noodle/core/domain/status";

export type AdminOrder = {
  id: number;
  code: string;
  status: OrderStatus;
  review_status: ReviewStatus;
  review_note: string | null;
  payment_status: "paid" | "unpaid";
  total: number;
  phone: string;
  country: Country;
  region: string;
  district: string;
  postcode: string | null;
  address: string;
  company: string | null;
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
  "id, code, status, review_status, review_note, payment_status, total, phone, country, region, district, postcode, address, company, note, fail_reason, return_reason, returner:staff!orders_returned_by_fkey(name), departed_at, production_date, created_at, customers(name), sale:staff!orders_sale_id_fkey(name), driver:staff!orders_driver_id_fkey(id, name), order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, line_total, products(name))";

export function OrderActions({ order, size }: { order: AdminOrder; size?: "sm" }) {
  return (MANAGER_ORDER_MOVES[order.status] ?? []).map((to) => (
    <ActionForm key={to} action="moveOrder" confirm={to === "cancelled" ? `Hủy đơn ${order.code}?` : order.status === "cancelled" ? `Khôi phục đơn ${order.code}?` : undefined}>
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

export function PaymentLabel({ order }: { order: AdminOrder }) {
  return (
    <span className={order.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}>
      {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
    </span>
  );
}
