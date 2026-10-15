import { headers } from "next/headers";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { SaleMonthReport } from "@/components/SaleMonthReport";
import { OrderBadge, TierBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { itemLabel } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";

const departedAt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default async function SaleDashboard({ searchParams }: PageProps<"/sale">) {
  const me = await requireRole("sale");
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const host = (await headers()).get("host");
  const refLink = `http://${host}/r/${me.ref_code}`;

  const active = unwrap(
    await db()
      .from("orders")
      .select("id, code, production_date, status, total, price_tier, departed_at, customers(name, phone), driver:staff!orders_driver_id_fkey(name, phone), order_items(id, pack_name, pack_qty, qty_kg, products(name))")
      .eq("sale_id", me.id)
      .not("status", "in", "(delivered,cancelled)")
      .order("created_at", { ascending: false })
      .order("id", { referencedTable: "order_items" }),
  );

  return (
    <>
      <PageTitle>Xin chào {me.name}</PageTitle>
      <Card size="sm" className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Link giới thiệu (khách đặt qua link sẽ thuộc về bạn)</div>
            <div className="mt-1 font-mono break-all" data-testid="ref-link">
              {refLink}
            </div>
          </div>
          <Button asChild>
            <Link href="/sale/orders/new">Tạo đơn</Link>
          </Button>
        </CardContent>
      </Card>

      <Card size="sm" className="mb-4">
        <CardHeader>
          <CardTitle>
            <h2>Đơn đang xử lý ({active.length})</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có đơn đang xử lý.</p>
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
                {active.map((o) => (
                  <TableRow key={o.id} data-order-code={o.code} className="relative cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/sale/orders/${o.code}`} className="text-primary after:absolute after:inset-0 hover:underline">
                        {o.code}
                      </Link>
                      <div className="text-xs font-normal text-muted-foreground">Ngày SX {o.production_date}</div>
                    </TableCell>
                    <TableCell>
                      {o.customers?.name}
                      <div className="text-xs text-muted-foreground">{o.customers?.phone}</div>
                    </TableCell>
                    <TableCell className="max-w-64 min-w-40 text-xs whitespace-normal">{o.order_items.map(itemLabel).join(", ")}</TableCell>
                    <TableCell className="text-right">
                      <div className="tabular-nums">{formatVnd(o.total)}</div>
                      <TierBadge tier={o.price_tier} />
                    </TableCell>
                    <TableCell>
                      <OrderBadge status={o.status} />
                      {o.driver ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {o.driver.name}
                          {o.driver.phone && ` · ${o.driver.phone}`}
                          {o.departed_at && <div>Đã rời kho · {departedAt.format(new Date(o.departed_at))}</div>}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-muted-foreground">Chưa có tài xế</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Hoa hồng tháng {month}</h2>
        <AutoSubmitForm action="/sale">
          <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
        </AutoSubmitForm>
      </div>
      <SaleMonthReport sale={me} month={month} orderLinks={false} />
    </>
  );
}
