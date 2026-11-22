import Link from "next/link";
import { deliveryArea } from "@noodle/core/domain/destination";
import { NO_DRIVER } from "./row-filters";
import { RowMenu } from "./RowMenu";
import { ReviewBadge } from "@/components/status-badge";
import { Returned, type AdminOrder } from "@/components/AdminOrderCard";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { itemLabel } from "@noodle/core/domain/catalog";
import { formatVnd } from "@noodle/core/domain/money";

export function AdminOrderTable({ orders, readOnly }: { orders: AdminOrder[]; readOnly: boolean }) {
  const live = orders.filter((o) => o.status !== "cancelled");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Khách hàng</TableHead>
          <TableHead>Hàng</TableHead>
          <TableHead className="text-right">Tổng</TableHead>
          <TableHead>NVKD</TableHead>
          <TableHead className="w-10 text-center">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id} data-order-code={o.code} data-district={deliveryArea(o)} data-driver={o.driver ? String(o.driver.id) : NO_DRIVER} className={`relative cursor-pointer ${o.status === "cancelled" ? "opacity-60" : ""}`}>
            <TableCell>
              <div className="flex items-start gap-2">
                {!readOnly && o.status === "ready" && (
                  <input
                    type="checkbox"
                    form="dispatch-form"
                    name="order_id"
                    value={o.id}
                    aria-label={`Chọn ${o.code}`}
                    className="relative z-10 mt-0.5 size-4 cursor-pointer accent-primary"
                  />
                )}
                <div>
                  <Link href={`/admin/orders/${o.code}`} aria-label={o.code} className="font-medium text-primary after:absolute after:inset-0 hover:underline">
                    {o.customers?.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {o.phone} · {deliveryArea(o)}
                  </div>
                  {o.review_status !== "approved" && (
                    <div className="mt-1 text-xs">
                      <ReviewBadge status={o.review_status} />
                      {o.review_status === "pending" && !o.sale && <span className="ml-1 text-muted-foreground">khách vãng lai</span>}
                      {o.review_note && <span className="ml-1 text-destructive">{o.review_note}</span>}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="max-w-72 min-w-44 text-xs whitespace-normal">
              {o.order_items.map((i) => itemLabel(i)).join(", ")}
              {o.note && <div className="mt-0.5 text-muted-foreground">Ghi chú: {o.note}</div>}
              {o.fail_reason && <div className="mt-0.5 text-destructive">Thất bại: {o.fail_reason}</div>}
              <Returned order={o} className="mt-0.5" />
            </TableCell>
            <TableCell className="text-right">
              <div className="font-medium tabular-nums">{formatVnd(o.total)}</div>
              {o.status !== "cancelled" && (
                <div className={`mt-0.5 text-xs ${o.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}`}>{o.payment_status === "paid" ? "Đã trả" : "Chưa trả"}</div>
              )}
            </TableCell>
            <TableCell>{o.sale?.name ?? "—"}</TableCell>
            <TableCell>
              <div className="relative z-10 flex justify-center">
                <RowMenu order={o} canMove={!readOnly} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {live.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Tổng {live.length} đơn (không tính đơn hủy)</TableCell>
            <TableCell className="text-right tabular-nums">{formatVnd(live.reduce((s, o) => s + o.total, 0))}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
