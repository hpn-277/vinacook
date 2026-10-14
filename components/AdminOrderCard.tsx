import { moveOrder, setPaid, editOrder } from "@/app/admin/orders/actions";
import { ActionForm } from "@/components/ActionForm";
import { Button, Card, inputClass } from "@/components/ui";
import { OrderBadge } from "@/components/status-badge";
import { DISTRICTS } from "@/lib/domain/districts";
import { formatKg, formatVnd } from "@/lib/domain/money";
import { MANAGER_ORDER_MOVES, MOVE_LABEL, ORDER_EDITABLE, type OrderStatus } from "@/lib/domain/status";

export type AdminOrder = {
  id: number;
  code: string;
  status: OrderStatus;
  payment_status: "paid" | "unpaid";
  total: number;
  phone: string;
  address: string;
  district: string;
  note: string | null;
  fail_reason: string | null;
  production_date: string;
  customers: { name: string } | null;
  sale: { name: string } | null;
  driver: { name: string } | null;
  order_items: { product_id: number; qty_kg: number; unit_price: number; products: { name: string } | null }[];
};

export const ADMIN_ORDER_SELECT =
  "id, code, status, payment_status, total, phone, address, district, note, fail_reason, production_date, customers(name), sale:staff!orders_sale_id_fkey(name), driver:staff!orders_driver_id_fkey(name), order_items(product_id, qty_kg, unit_price, products(name))";

export function AdminOrderCard({ order }: { order: AdminOrder }) {
  const moves = MANAGER_ORDER_MOVES[order.status] ?? [];
  return (
    <Card className="space-y-2 text-sm" data-order-code={order.code}>
      <div className="flex flex-wrap items-center gap-2">
        <b>{order.code}</b>
        <OrderBadge status={order.status} />
        <span className={order.payment_status === "paid" ? "text-green-700" : "text-gray-500"}>
          {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
        </span>
        <span className="ml-auto font-semibold">{formatVnd(order.total)}</span>
      </div>
      <div>
        {order.customers?.name} · <a href={`tel:${order.phone}`}>{order.phone}</a> · {order.address}, {order.district}
      </div>
      <div className="text-gray-500">
        NVKD: {order.sale?.name ?? "—"} · Ngày SX {order.production_date}
        {order.driver && ` · Tài xế: ${order.driver.name}`}
      </div>
      {order.note && <div className="text-gray-500">Ghi chú: {order.note}</div>}
      {order.fail_reason && <div className="text-red-700">Lý do thất bại: {order.fail_reason}</div>}
      <ul className="text-gray-700">
        {order.order_items.map((i) => (
          <li key={i.product_id}>
            {i.products?.name} × {formatKg(i.qty_kg)} @ {formatVnd(i.unit_price)}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {moves.map((to) => (
          <ActionForm key={to} action={moveOrder} confirm={to === "cancelled" ? `Hủy đơn ${order.code}?` : undefined}>
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="to" value={to} />
            <Button tone={to === "cancelled" ? "danger" : "primary"}>{MOVE_LABEL[to]}</Button>
          </ActionForm>
        ))}
        {order.status !== "cancelled" && (
          <ActionForm action={setPaid}>
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="paid" value={order.payment_status === "paid" ? "unpaid" : "paid"} />
            <Button tone="secondary">{order.payment_status === "paid" ? "Bỏ đánh dấu đã trả" : "Đánh dấu đã trả"}</Button>
          </ActionForm>
        )}
      </div>
      {ORDER_EDITABLE.has(order.status) && (
        <details>
          <summary className="cursor-pointer text-orange-700">Sửa đơn</summary>
          <ActionForm action={editOrder} className="mt-2 space-y-2">
            <input type="hidden" name="order_id" value={order.id} />
            {order.order_items.map((i) => (
              <label key={i.product_id} className="flex items-center justify-between gap-2">
                <span>{i.products?.name} (kg, 0 = bỏ)</span>
                <input
                  name={`qty_${i.product_id}`}
                  type="number"
                  step={0.5}
                  min={0}
                  defaultValue={i.qty_kg}
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right"
                />
              </label>
            ))}
            <input name="address" defaultValue={order.address} className={inputClass} />
            <select name="district" defaultValue={order.district} className={inputClass}>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input name="note" defaultValue={order.note ?? ""} placeholder="Ghi chú" className={inputClass} />
            <Button tone="secondary">Lưu</Button>
          </ActionForm>
        </details>
      )}
    </Card>
  );
}
