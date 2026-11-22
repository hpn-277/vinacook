import { headers } from "next/headers";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { ReviewActions } from "@/components/ReviewActions";
import { OrderBadge, ReviewBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { itemLabel } from "@noodle/core/domain/catalog";
import { dialable, formatDestination } from "@noodle/core/domain/destination";
import { formatVnd } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";
import { today } from "@noodle/core/period";
import { saleDayOrders, saleToReview } from "@noodle/core/queries/sale";

const departedAt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default async function SaleDashboard({ searchParams }: PageProps<"/sale">) {
  const me = await requireRole("sale");
  const sp = await searchParams;
  const date = parseIsoDate(typeof sp.date === "string" ? sp.date : null) ?? today();
  const isToday = date === today();
  const host = (await headers()).get("host");
  const refLink = `http://${host}/r/${me.ref_code}`;
  const [orders, toReview] = await Promise.all([saleDayOrders(me.id, date), saleToReview(me.id)]);
  const live = orders.filter((o) => o.status !== "cancelled");

  return (
    <>
      <PageTitle>Xin chào {me.name}</PageTitle>
      <Card size="sm" className="mb-4">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              <h2>{isToday ? "Đơn hàng hôm nay" : `Đơn hàng ngày ${date}`} ({live.length})</h2>
            </CardTitle>
            <p className="text-sm text-muted-foreground" data-testid="day-summary">
              Ngày sản xuất {date} · Tổng {formatVnd(live.reduce((t, o) => t + o.total, 0))}
              {orders.length > live.length && ` · ${orders.length - live.length} đơn đã hủy`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AutoSubmitForm action="/sale">
              <Input type="date" name="date" defaultValue={date} aria-label="Chọn ngày" className="w-auto" />
            </AutoSubmitForm>
            <Button asChild>
              <Link href="/sale/orders/new">Tạo đơn</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn nào{isToday ? " hôm nay" : ""}.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Hàng</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} data-order-code={o.code} className={`relative cursor-pointer ${o.status === "cancelled" ? "opacity-60" : ""}`}>
                    <TableCell className="font-medium">
                      <Link href={`/sale/orders/${o.code}`} className="text-primary after:absolute after:inset-0 hover:underline">
                        {o.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {o.customers?.name}
                      <div className="text-xs text-muted-foreground">{o.customers?.phone}</div>
                    </TableCell>
                    <TableCell className="max-w-64 min-w-40 text-xs whitespace-normal">{o.order_items.map(itemLabel).join(", ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(o.total)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <OrderBadge status={o.status} />
                        {o.review_status !== "approved" && <ReviewBadge status={o.review_status} />}
                      </div>
                      {o.driver ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {o.driver.name}
                          {o.driver.phone && ` · ${o.driver.phone}`}
                          {o.departed_at && <div>Đã rời kho · {departedAt.format(new Date(o.departed_at))}</div>}
                        </div>
                      ) : (
                        o.status !== "cancelled" && <div className="mt-0.5 text-xs text-muted-foreground">Chưa có tài xế</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {toReview.length > 0 && (
        <Card size="sm" className="mb-4 ring-2 ring-amber-300" data-testid="to-review">
          <CardHeader>
            <CardTitle>
              <h2>Đơn cần duyệt ({toReview.length})</h2>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Khách đặt qua link của bạn. Gọi khách kiểm tra rồi duyệt; đơn chưa duyệt sẽ không được gửi xưởng.</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {toReview.map((o) => (
                <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0" data-review-order={o.code}>
                  <div className="min-w-0 space-y-0.5 text-sm">
                    <div>
                      <Link href={`/sale/orders/${o.code}`} className="font-medium text-primary hover:underline">
                        {o.code}
                      </Link>{" "}
                      · {o.customers?.name} ·{" "}
                      <a href={`tel:${dialable(o.phone, o.country)}`} className="text-primary">
                        {o.phone}
                      </a>
                    </div>
                    <div className="text-muted-foreground">
                      Ngày SX {o.production_date} · {formatDestination(o)}
                    </div>
                    <div>
                      {o.order_items.map(itemLabel).join(", ")} · <b className="tabular-nums">{formatVnd(o.total)}</b>
                    </div>
                    {o.note && <div className="text-muted-foreground">Ghi chú: {o.note}</div>}
                  </div>
                  <ReviewActions order={o} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card size="sm" className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Link giới thiệu (khách đặt qua link sẽ thuộc về bạn)</div>
            <div className="mt-1 font-mono break-all" data-testid="ref-link">
              {refLink}
            </div>
          </div>
        </CardContent>
      </Card>

    </>
  );
}
