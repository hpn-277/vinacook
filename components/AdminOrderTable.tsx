import Link from "next/link";
import { OrderActions, PaidPill, type AdminOrder } from "@/components/AdminOrderCard";
import { MANAGER_ORDER_MOVES } from "@/lib/domain/status";
import { OrderBadge, TierBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { itemLabel } from "@/lib/domain/catalog";
import { formatKg, formatVnd } from "@/lib/domain/money";

const bookedParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", hourCycle: "h23" });
const bookedAt = (iso: string) => {
  const p = Object.fromEntries(bookedParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute} ${p.day}/${p.month}`;
};

const orderKg = (o: AdminOrder) => o.order_items.reduce((s, i) => s + i.qty_kg, 0);

export function AdminOrderTable({ orders }: { orders: AdminOrder[] }) {
  const live = orders.filter((o) => o.status !== "cancelled");
  const hasActions = orders.some((o) => (MANAGER_ORDER_MOVES[o.status] ?? []).length > 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead>Hàng</TableHead>
          <TableHead className="text-right">Kg</TableHead>
          <TableHead className="text-right">Tổng</TableHead>
          <TableHead>NVKD</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Thanh toán</TableHead>
          {hasActions && <TableHead>Thao tác</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id} data-order-code={o.code} className={`relative cursor-pointer ${o.status === "cancelled" ? "opacity-60" : ""}`}>
            <TableCell className="font-semibold">
              <Link href={`/admin/orders/${o.code}`} className="text-primary after:absolute after:inset-0 hover:underline">
                {o.code}
              </Link>
            </TableCell>
            <TableCell>
              <div className="font-medium">{o.customers?.name}</div>
              <div className="text-xs text-muted-foreground">
                {o.phone} · {o.district}
              </div>
            </TableCell>
            <TableCell className="max-w-72 min-w-44 text-xs whitespace-normal">
              {o.order_items.map((i) => itemLabel(i)).join(", ")}
              {o.note && <div className="mt-0.5 text-muted-foreground">Ghi chú: {o.note}</div>}
              {o.fail_reason && <div className="mt-0.5 text-destructive">Thất bại: {o.fail_reason}</div>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(orderKg(o))}</TableCell>
            <TableCell className="text-right">
              <div className="font-medium tabular-nums">{formatVnd(o.total)}</div>
              <TierBadge tier={o.price_tier} />
            </TableCell>
            <TableCell>{o.sale?.name ?? "—"}</TableCell>
            <TableCell>
              {o.status !== "placed" && <OrderBadge status={o.status} />}
              <div className="mt-0.5 text-xs text-muted-foreground tabular-nums" title="Thời gian đặt hàng">
                Đặt {bookedAt(o.created_at)}
              </div>
              {o.driver && <div className="mt-0.5 text-xs text-muted-foreground">{o.driver.name}</div>}
            </TableCell>
            <TableCell>
              <div className="relative z-10 w-fit">
                <PaidPill order={o} />
              </div>
            </TableCell>
            {hasActions && (
              <TableCell>
                <div className="relative z-10 flex flex-wrap items-center gap-1.5">
                  <OrderActions order={o} size="sm" withPaid={false} />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
      {live.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Tổng {live.length} đơn (không tính đơn hủy)</TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(live.reduce((s, o) => s + orderKg(o), 0))}</TableCell>
            <TableCell className="text-right tabular-nums">{formatVnd(live.reduce((s, o) => s + o.total, 0))}</TableCell>
            <TableCell colSpan={hasActions ? 4 : 3} />
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
