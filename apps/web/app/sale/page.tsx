import { headers } from "next/headers";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { OrderRowMenu } from "@/components/OrderRowMenu";
import { OrderBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { itemLabel } from "@noodle/core/domain/catalog";
import { deliveryArea, dialable } from "@noodle/core/domain/destination";
import { formatVnd } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";
import { today } from "@noodle/core/period";
import { saleDayOrders } from "@noodle/core/queries/sale";

const departedAt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default async function SaleDashboard({ searchParams }: PageProps<"/sale">) {
  const me = await requireRole("sale");
  const sp = await searchParams;
  const date = parseIsoDate(typeof sp.date === "string" ? sp.date : null) ?? today();
  const isToday = date === today();
  const host = (await headers()).get("host");
  const refLink = `http://${host}/r/${me.ref_code}`;
  const orders = await saleDayOrders(me.id, date);
  const needsReview = (o: (typeof orders)[number]) => o.status === "pending_review";
  const toReview = orders.filter(needsReview);
  const sorted = [...toReview, ...orders.filter((o) => !needsReview(o))];
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
            {toReview.length > 0 && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400" data-testid="to-review-count">
                {toReview.length} đơn cần duyệt · gọi khách kiểm tra trước khi gửi xưởng
              </p>
            )}
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
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Hàng</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-10 text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((o) => (
                  <TableRow key={o.id} data-order-code={o.code} className={`relative cursor-pointer ${o.status === "cancelled" ? "opacity-60" : ""}`}>
                    <TableCell>
                      <Link href={`/sale/orders/${o.code}`} aria-label={o.code} className="font-medium text-primary after:absolute after:inset-0 hover:underline">
                        {o.customers?.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        <a href={`tel:${dialable(o.phone, o.country)}`} className="relative z-10 hover:underline">
                          {o.phone}
                        </a>{" "}
                        · {deliveryArea(o)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-72 min-w-44 text-xs whitespace-normal">
                      {o.order_items.map(itemLabel).join(", ")}
                      {o.note && <div className="mt-0.5 text-muted-foreground">Ghi chú: {o.note}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium tabular-nums">{formatVnd(o.total)}</div>
                      {o.status !== "cancelled" && (
                        <div className={`mt-0.5 text-xs ${o.payment_status === "paid" ? "text-green-700" : "text-muted-foreground"}`}>
                          {o.payment_status === "paid" ? "Đã trả" : "Chưa trả"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <OrderBadge status={o.status} />
                      {o.ship_carrier ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">Ship ngoài · {o.ship_carrier}</div>
                      ) : o.driver ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {o.driver.name}
                          {o.driver.phone && ` · ${o.driver.phone}`}
                          {o.departed_at && <div>Đã rời kho · {departedAt.format(new Date(o.departed_at))}</div>}
                        </div>
                      ) : (
                        o.status !== "cancelled" && <div className="mt-0.5 text-xs text-muted-foreground">Chưa có tài xế</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="relative z-10 flex justify-center">
                        <OrderRowMenu order={o} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {live.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Tổng {live.length} đơn (không tính đơn hủy)</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(live.reduce((t, o) => t + o.total, 0))}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

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
