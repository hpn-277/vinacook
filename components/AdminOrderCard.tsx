import { moveOrder, setPaid, editOrder } from "@/app/admin/orders/actions";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { OrderBadge, TierBadge } from "@/components/status-badge";
import { DISTRICTS } from "@/lib/domain/districts";
import { itemLabel } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import type { PriceTier } from "@/lib/domain/pricing";
import { MANAGER_ORDER_MOVES, MOVE_LABEL, ORDER_EDITABLE, type OrderStatus } from "@/lib/domain/status";

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
  production_date: string;
  customers: { name: string } | null;
  sale: { name: string } | null;
  driver: { name: string } | null;
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
  "id, code, status, payment_status, total, price_tier, phone, address, district, note, fail_reason, production_date, customers(name), sale:staff!orders_sale_id_fkey(name), driver:staff!orders_driver_id_fkey(name), order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, line_total, products(name))";

export function AdminOrderCard({ order }: { order: AdminOrder }) {
  const moves = MANAGER_ORDER_MOVES[order.status] ?? [];
  return (
    <Card size="sm" data-order-code={order.code}>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-base">{order.code}</b>
          <OrderBadge status={order.status} />
          <TierBadge tier={order.price_tier} />
          <span className={order.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}>
            {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
          </span>
          <span className="ml-auto text-base font-semibold">{formatVnd(order.total)}</span>
        </div>
        <div>
          {order.customers?.name} · <a href={`tel:${order.phone}`}>{order.phone}</a> · {order.address}, {order.district}
        </div>
        <div className="text-muted-foreground">
          NVKD: {order.sale?.name ?? "—"} · Ngày SX {order.production_date}
          {order.driver && ` · Tài xế: ${order.driver.name}`}
        </div>
        {order.note && <div className="text-muted-foreground">Ghi chú: {order.note}</div>}
        {order.fail_reason && <div className="text-destructive">Lý do thất bại: {order.fail_reason}</div>}
        <ul>
          {order.order_items.map((i) => (
            <li key={i.id}>
              {itemLabel(i)} <span className="text-muted-foreground">@ {formatVnd(i.price_per_kg)}/kg = {formatVnd(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          {moves.map((to) => (
            <ActionForm key={to} action={moveOrder} confirm={to === "cancelled" ? `Hủy đơn ${order.code}?` : undefined}>
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="to" value={to} />
              <Button variant={to === "cancelled" ? "destructive" : "default"}>{MOVE_LABEL[to]}</Button>
            </ActionForm>
          ))}
          {order.status !== "cancelled" && (
            <ActionForm action={setPaid}>
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="paid" value={order.payment_status === "paid" ? "unpaid" : "paid"} />
              <Button variant="outline">{order.payment_status === "paid" ? "Bỏ đánh dấu đã trả" : "Đánh dấu đã trả"}</Button>
            </ActionForm>
          )}
        </div>
        {ORDER_EDITABLE.has(order.status) && (
          <details className="group">
            <summary className="w-fit cursor-pointer font-medium text-primary">Sửa đơn</summary>
            <ActionForm action={editOrder} className="mt-2 max-w-md space-y-2 rounded-lg border bg-muted/40 p-3">
              <input type="hidden" name="order_id" value={order.id} />
              <p className="text-xs text-muted-foreground">Số lượng theo quy cách, 0 = bỏ. Giá sỉ/lẻ được tính lại theo tổng đơn.</p>
              {order.order_items.map((i) => (
                <label key={i.id} className="flex items-center justify-between gap-2">
                  <span>
                    {i.products?.name} · {i.pack_name}
                  </span>
                  <Input
                    name={`qty_${i.id}`}
                    aria-label={`Sửa ${i.products?.name} - ${i.pack_name}`}
                    type="number"
                    step={1}
                    min={0}
                    defaultValue={i.pack_qty}
                    className="w-24 text-right"
                  />
                </label>
              ))}
              <Input name="address" defaultValue={order.address} />
              <NativeSelect name="district" defaultValue={order.district} className="w-full">
                {DISTRICTS.map((d) => (
                  <NativeSelectOption key={d}>{d}</NativeSelectOption>
                ))}
              </NativeSelect>
              <Input name="note" defaultValue={order.note ?? ""} placeholder="Ghi chú" />
              <Button variant="outline">Lưu</Button>
            </ActionForm>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
